import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { chooseGrantedRole } from "../../../auth/roleAccess.ts";

// Execute the real hook query/mutation functions against an in-memory transport.
// This proves frontend contracts, not Backend authorization or HTTP integration.
function supplierApi(response: unknown = {}) {
  const requests: Array<{ method: string; path: string; body?: any; options?: any }> = [];
  const api = Object.fromEntries(["get", "post", "patch", "delete"].map(method => [method,
    async (path: string, body?: any, options?: any) => {
      requests.push({ method, path, body, options }); return { data: response };
    }]));
  const exports: Record<string, any> = {};
  const text = readFileSync(new URL("../../../api/queries/platform/supplier.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const require = (name: string) => {
    if (name === "@tanstack/react-query") return { useQuery: (o: unknown) => o, useMutation: (o: unknown) => o, useQueryClient: () => ({ invalidateQueries() {} }) };
    if (name === "sonner") return { toast: { success() {}, error() {} } };
    if (name === "../../client") return { api, downloadBlob: async () => {} };
    if (name === "../../errors") return { getErrorMessage: () => "test error" };
    if (name === "../keys") return { queryKeys: { supplierOrders: (filter: unknown) => ["platform", "supplier", "orders", filter] } };
    throw new Error(`Unexpected dependency ${name}`);
  };
  new Function("require", "exports", js)(require, exports);
  return { hooks: exports, requests };
}

test("SUP-F04: orders retain Backend pagination and request the selected page", async () => {
  const page = { data: [{ id: "order-21", total: 2475 }], meta: { page: 2, pageSize: 20, total: 41, totalPages: 3 } };
  const { hooks, requests } = supplierApi(page);
  const result = await hooks.useSupplierOrders({ status: "pending", page: 2, pageSize: 20 }).queryFn({ signal: undefined });
  assert.deepEqual(result, page);
  assert.equal(requests[0].path, "/asab/supplier/orders");
  assert.equal(requests[0].body.params.page, 2);
});

test("SUP-F06: the synchronous mutation lock rejects a second click and releases on 403/409", async () => {
  const { hooks } = supplierApi();
  assert.equal(typeof hooks.runSupplierMutation, "function");
  for (const status of [403, 409]) {
    const lock = { current: false };
    let reject!: (error: unknown) => void, calls = 0;
    const first = hooks.runSupplierMutation(lock, () => { calls++; return new Promise((_, no) => { reject = no; }); });
    assert.equal(await hooks.runSupplierMutation(lock, async () => { calls++; }), undefined);
    reject({ status });
    await assert.rejects(first, (e: any) => e.status === status);
    assert.equal(calls, 1);
    assert.equal(lock.current, false);
  }
});

test("SUP-F11: import passes the explicit supplier record in multipart data", async () => {
  const { hooks, requests } = supplierApi({ itemCount: 1 });
  const file = new File(["synthetic"], "items.csv", { type: "text/csv" });
  await hooks.useImportSupplierItems().mutationFn({ file, supplierId: "owned-record" });
  assert.equal(requests[0].path, "/asab/supplier/items/import");
  assert.equal(requests[0].body.get("supplierId"), "owned-record");
  assert.equal(requests[0].body.get("file").name, "items.csv");
});

test("SUP-F09: ambiguous records use Backend supplierIds without inventing names", () => {
  const { hooks } = supplierApi();
  assert.equal(typeof hooks.supplierRecordChoices, "function");
  assert.deepEqual(hooks.supplierRecordChoices({ code: "SUPPLIER_RECORD_AMBIGUOUS", details: { supplierIds: ["one", "two", "one"] } }), ["one", "two"]);
  assert.deepEqual(hooks.supplierRecordChoices({ code: "OTHER", details: { supplierIds: ["one"] } }), []);
});

test("SUP-F20: actual item body preserves halalas and rejects malformed input", () => {
  const { hooks } = supplierApi();
  assert.equal(typeof hooks.buildSupplierItemBody, "function");
  const valid = { name: "Synthetic item", code: "", unit: "kg", price: "24.75", minQty: "1", maxQty: "3", leadTimeDays: "0", available: true };
  assert.equal(hooks.buildSupplierItemBody(valid).priceHalalas, 2475);
  assert.equal(hooks.buildSupplierItemBody({ ...valid, price: "0" }).priceHalalas, 0); // existing Backend contract permits zero
  for (const patch of [{ price: "1.005" }, { price: "NaN" }, { price: "-1" }, { minQty: "1.5" }, { minQty: "4", maxQty: "3" }, { leadTimeDays: "-1" }]) {
    assert.throws(() => hooks.buildSupplierItemBody({ ...valid, ...patch }));
  }
});

test("SUP-F01: a disabled supplier build gate denies direct role resolution", () => {
  const identity = { roles: [{ key: "supplier", scope: "all", brandIds: [], restaurantIds: [], branchIds: [], moduleKeys: [] }] };
  assert.equal(chooseGrantedRole(identity, ["supplier"], "supplier", false), null);
  assert.equal(chooseGrantedRole(identity, ["supplier"], "supplier", true), "supplier");
});

test("SUP-F06: a successful frontend mutation releases its lock without changing the result", async () => {
  const { hooks } = supplierApi();
  const lock = { current: false };
  assert.deepEqual(await hooks.runSupplierMutation(lock, async () => ({ id: "own", status: "accepted" })), { id: "own", status: "accepted" });
  assert.equal(lock.current, false);
});

test("SUP-F04: an existing legacy array response remains an explicitly single-page list", async () => {
  const { hooks } = supplierApi([{ id: "own" }]);
  const result = await hooks.useSupplierOrders().queryFn({ signal: undefined });
  assert.equal(result.data[0].id, "own");
  assert.deepEqual(result.meta, { page: 1, pageSize: 1, total: 1, totalPages: 1 });
});

test("SUP-F10: update passes an explicit record without dropping the item identity", async () => {
  const { hooks, requests } = supplierApi();
  await hooks.useUpdateSupplierItem().mutationFn({ id: "own-item", supplierId: "chosen-owned-record", priceHalalas: 2475 });
  assert.equal(requests[0].path, "/asab/supplier/items/own-item");
  assert.deepEqual(requests[0].body, { supplierId: "chosen-owned-record", priceHalalas: 2475 });
});

test("SUP-F13/F14/F16 source wiring: supplier cannot mount company search, notifications, chat or the unused period filter", () => {
  const source = readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8");
  assert.match(source, /role === "supplier" \? \([\s\S]*?Supplier search requires an approved Backend contract/);
  assert.match(source, /role === "supplier" \? \([\s\S]*?Supplier notifications require an approved Backend contract/);
  assert.ok(source.includes('currentRole !== "admin" && currentRole !== "supplier" && <LiveChatWidget'));
  assert.ok(source.includes('{role !== "supplier" && <select'));
});

test("SUP-F01/F15 source wiring: the active picker filters the build flag and no new-order badge is fabricated", () => {
  const source = readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('(r !== "supplier" || SUPPLIER_PORTAL_ENABLED)'));
  assert.doesNotMatch(source, /id: "sup-new"[^\n]*badge:/);
});

test("SUP-F17/F18 source wiring: supplier forms use the installed modal primitive and direction context", () => {
  for (const name of ["SupItems", "SupNewOrders"]) {
    const source = readFileSync(new URL(`./_pages/supplier/${name}.tsx`, import.meta.url), "utf8");
    assert.ok(source.includes("<DialogContent dir={dir}"));
    assert.ok(source.includes("onCloseAutoFocus="));
    assert.doesNotMatch(source, /dir="rtl"/);
  }
});

test("SUP-F04/F21 source wiring: all supplier order pages retain paging, loading and failure states", () => {
  for (const name of ["SupNewOrders", "SupAccepted", "SupRejected"]) {
    const source = readFileSync(new URL(`./_pages/supplier/${name}.tsx`, import.meta.url), "utf8");
    assert.ok(source.includes("<SupplierPagination"));
    assert.ok(source.includes("query.isPending || query.isError"));
    assert.ok(source.includes("?.data ?? []"));
  }
});
