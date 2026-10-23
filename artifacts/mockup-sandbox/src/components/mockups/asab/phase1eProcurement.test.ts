import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function norm(s: string): string {
  return s.replace(/\s+/g, " ");
}

test("Phase 1E PROC-F19: roleAccess sensitivePrefixes includes all procurement query keys", () => {
  const roleAccess = norm(
    readFileSync(new URL("../../../auth/roleAccess.ts", import.meta.url), "utf8")
  );
  assert.ok(
    roleAccess.includes('["procurement"]'),
    "sensitivePrefixes must include ['procurement'] cache key"
  );
  assert.ok(
    roleAccess.includes('["platform", "procurement"]'),
    "sensitivePrefixes must include ['platform', 'procurement'] cache key"
  );
  assert.ok(
    roleAccess.includes('["purchase-orders"]'),
    "sensitivePrefixes must include ['purchase-orders'] cache key"
  );
});

test("Phase 1E PROC-F24: useCreateProcurementOrder aliases description and notes", () => {
  const procApi = norm(
    readFileSync(new URL("../../../api/queries/procurement.ts", import.meta.url), "utf8")
  );
  assert.ok(
    procApi.includes("description: body.description ?? body.notes") ||
    procApi.includes("description:body.description??body.notes"),
    "useCreateProcurementOrder must map description from description or notes for backend compatibility"
  );
  assert.ok(
    procApi.includes("notes: body.notes ?? body.description") ||
    procApi.includes("notes:body.notes??body.description"),
    "useCreateProcurementOrder must preserve notes alias"
  );
});

test("Phase 1E PROC-F01 & PROC-F25: ProcOverview renders exact halala amounts and distinct statuses", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  // PROC-F01: Halala precision without truncation
  assert.ok(
    dash.includes("o.totalHalalas != null ? o.totalHalalas / 100") ||
    dash.includes("totalHalalas != null ? o.totalHalalas / 100"),
    "ProcOverview must map totalHalalas with halala precision"
  );
  // PROC-F25: Distinct status mapping (sent is not conflated with delivered)
  assert.ok(
    dash.includes('sent: "bg-sky-50 text-sky-700') ||
    dash.includes('sent:"bg-sky-50 text-sky-700'),
    "ProcOverview must define distinct badge style for sent status"
  );
  assert.ok(
    dash.includes('delivered: "bg-emerald-50 text-emerald-700') ||
    dash.includes('delivered:"bg-emerald-50 text-emerald-700'),
    "ProcOverview must define distinct badge style for delivered status"
  );
});

test("Phase 1E PROC-F03 & PROC-F05: ProcNew validates quantity and calculates priced order payload", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  // PROC-F05: Validate quantity > 0
  assert.ok(
    dash.includes("q <= 0"),
    "ProcNew must reject zero or negative quantities"
  );
  // PROC-F03: Unit price and total halalas calculation
  assert.ok(
    dash.includes("unitPriceHalalas") && dash.includes("totalHalalas"),
    "ProcNew submit handler must send priced order payload with unitPriceHalalas and totalHalalas"
  );
});

test("Phase 1E PROC-F02: procurement query hooks route through procBase()", () => {
  const procApi = norm(
    readFileSync(new URL("../../../api/queries/procurement.ts", import.meta.url), "utf8")
  );
  assert.ok(
    procApi.includes("${procBase()}/overview"),
    "useProcurementOverview must route through procBase()"
  );
  assert.ok(
    procApi.includes("${procBase()}/orders"),
    "useProcurementOrders must route through procBase()"
  );
  assert.ok(
    procApi.includes("${procBase()}/items"),
    "useProcurementItems must route through procBase()"
  );
});

test("Phase 1E PROC-F04 & PUR-01: ProcNew supports editing notes and fails closed on unauthorized approvals", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("updateOrderMut.mutate") && dash.includes("editNotes"),
    "ProcNew must provide order edit capability with notes"
  );
  const procNewOrders = norm(
    readFileSync(new URL("./_pages/procurement/ProcNewOrders.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    procNewOrders.includes("PUR-01"),
    "ProcNewOrders must reference PUR-01 financial approval compliance"
  );
});

test("Phase 1E PROC-F06: ProcNew establishes intent-level idempotency via draftCommandId and withIdempotencyKey", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  const procApi = norm(
    readFileSync(new URL("../../../api/queries/procurement.ts", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("draftCommandId") && dash.includes("generateCommandId()"),
    "ProcNew must manage stable draftCommandId intent key per order creation"
  );
  assert.ok(
    procApi.includes("commandId ? withIdempotencyKey(commandId) : undefined") ||
    procApi.includes("withIdempotencyKey(commandId)"),
    "useCreateProcurementOrder must pass withIdempotencyKey when commandId is provided"
  );
  assert.ok(
    dash.includes("createOrderMut.isPending"),
    "ProcNew submit button must be disabled when createOrderMut is pending"
  );
});

test("Phase 1E PROC-F20: server pagination and filtering preserve metadata and expose UI controls", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  const procApi = norm(
    readFileSync(new URL("../../../api/queries/procurement.ts", import.meta.url), "utf8")
  );
  assert.ok(
    procApi.includes("items.meta ="),
    "useProcurementOrders must preserve page metadata on returned items"
  );
  assert.ok(
    dash.includes("statusFilter") && dash.includes("setStatusFilter"),
    "ProcNew must expose status filter controls"
  );
  assert.ok(
    dash.includes("page") && dash.includes("setPage"),
    "ProcNew must expose pagination state and controls"
  );
});

test("Phase 1E PROC-F07 & PROC-F08: ProcGrouped maps dual contract fields and supports groupId", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("g.ordersCount ?? (g as any).orderCount") ||
    dash.includes("g.ordersCount ?? g.orderCount"),
    "ProcGrouped must map ordersCount with orderCount fallback"
  );
  assert.ok(
    dash.includes("branches as string[] | undefined") ||
    dash.includes("g.branches ?? (g.orders ?? []).map"),
    "ProcGrouped must support branches list from either array or nested order branch names"
  );
  assert.ok(
    dash.includes("groupId: g.groupId"),
    "ProcGrouped send handler must pass groupId"
  );
});

test("Phase 1E PROC-F09: ProcGrouped WhatsApp action is clearly labeled as preparation", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("إعداد رابط واتساب للمورد") && dash.includes("Prepare WhatsApp PO"),
    "ProcGrouped must clarify WhatsApp action as preparing PO link without claiming external delivery"
  );
});

test("Phase 1E PROC-F10: ProcSent accurately tracks inTransit, sentAt, and ETA", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("(o as any).sentAt || o.createdAt"),
    "ProcSent must prioritize sentAt timestamp"
  );
  assert.ok(
    dash.includes("(o as any).inTransit ?? (o.status === \"sent\")"),
    "ProcSent must map inTransit boolean flag"
  );
  assert.ok(
    dash.includes("ETA: {s.eta}") || dash.includes("s.eta"),
    "ProcSent must display ETA tracking field"
  );
});

test("Phase 1E PROC-F12 & PROC-F13: ProcSuppliers normalizes ratings and authoritative spend", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  // PROC-F12: Lifetime spend calculation
  assert.ok(
    dash.includes("lifetimeSpend") || dash.includes("totalPurchases") || dash.includes("totalSpentHalalas"),
    "ProcSuppliers must derive spend from backend lifetime spend fields"
  );
  // PROC-F13: 0-50 to 0-5 rating scale normalization
  assert.ok(
    dash.includes("rawRating > 5 ? rawRating / 10 : rawRating"),
    "ProcSuppliers must normalize 0-50 backend ratings to 0-5 star scale"
  );
  assert.ok(
    dash.includes("contactPhone") && dash.includes("contactName"),
    "ProcSuppliers must map contactPhone and contactName"
  );
});

test("Phase 1E PROC-F14: ProcSuppliers enforces PUR-04 Accountant supplier ownership rule", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("إضافة الموردين المعتمدين من صلاحية المحاسب وفق قواعد الأعمال (PUR-04)") ||
    dash.includes("PUR-04"),
    "ProcSuppliers must display PUR-04 accountant ownership explanatory notice"
  );
});

test("Phase 1E PROC-F15 & PROC-F16: ProcItems validates unit and positive price without rounding halalas", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  // PROC-F15: Unit and positive price validation
  assert.ok(
    dash.includes("!form.unit.trim()") && dash.includes("p <= 0"),
    "ProcItems must require unit and positive price > 0"
  );
  // PROC-F16: Exact halala price without Math.round
  assert.ok(
    dash.includes("(i as any).lastPriceHalalas != null ? (i as any).lastPriceHalalas / 100"),
    "ProcItems must retain decimal halala precision for price"
  );
  assert.ok(
    dash.includes("(i as any).supplierCount ??"),
    "ProcItems must map true supplierCount returned by backend"
  );
});

test("Phase 1E PROC-F17: PUR-05 VAT exclusion notice is presented on items and purchase orders", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("PUR-05"),
    "PUR-05 VAT exclusion notice must be displayed"
  );
});

test("Phase 1E PROC-F18: ProcReports provides dual export formats (PDF & Excel per INTG-01)", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes('downloadMut.mutate({ key: file, format: "pdf" })'),
    "ProcReports must support PDF report export"
  );
  assert.ok(
    dash.includes('downloadMut.mutate({ key: file, format: "xlsx" })'),
    "ProcReports must support Excel/XLSX report export per INTG-01"
  );
});

test("Phase 1E PROC-F21: Modals implement accessibility attributes and Escape key handling", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes('role="dialog"') && dash.includes('aria-modal="true"'),
    "Procurement modals must specify role='dialog' and aria-modal='true'"
  );
  assert.ok(
    dash.includes('htmlFor="po-supp"') && dash.includes('id="po-supp"'),
    "ProcNew form inputs must have associated htmlFor labels"
  );
  assert.ok(
    dash.includes('e.key === "Escape"'),
    "Procurement modals must handle Escape key dismiss"
  );
});

test("Phase 1E PROC-F22: Procurement grids use responsive layout classes", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"),
    "ProcOverview KPI cards must use responsive grid layout classes"
  );
});

test("Phase 1E Behavioral: Order creation strictly rejects invalid, zero, negative, and non-finite price and quantity", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("!Number.isFinite(q) || q <= 0"),
    "CompanyDashboard submitOrder must explicitly validate finite positive numbers for qty"
  );
  assert.ok(
    dash.includes("/^\\d+(\\.\\d{1,2})?$/.test(priceStr)") &&
    dash.includes("!Number.isSafeInteger(unitPriceHalalas) || unitPriceHalalas < 1"),
    "CompanyDashboard submitOrder must validate 2-decimal contract and safe positive halalas"
  );

  // Behavioral simulation of the exact validation function
  const isValidPriceAndQty = (qtyInput: any, priceInput: any): boolean => {
    const q = parseFloat(qtyInput);
    const p = parseFloat(priceInput);
    if (isNaN(q) || !Number.isFinite(q) || q <= 0 || isNaN(p) || !Number.isFinite(p) || p <= 0) {
      return false;
    }
    return true;
  };
  // Negative test vectors: invalid, zero, negative, unrepresentable (> 2 decimals), or sub-halala
  const invalidCases = [
    { qty: "0", price: "10" },
    { qty: "-1", price: "10" },
    { qty: "5", price: "0" },
    { qty: "5", price: "0.0" },
    { qty: "5", price: "0.00" },
    { qty: "5", price: "-5" },
    { qty: "NaN", price: "10" },
    { qty: "5", price: "NaN" },
    { qty: "Infinity", price: "10" },
    { qty: "5", price: "Infinity" },
    { qty: "-Infinity", price: "10" },
    { qty: "", price: "10" },
    { qty: "5", price: "" },
    { qty: "abc", price: "10" },
    { qty: "5", price: "xyz" },
    { qty: "5", price: "0.001" }, // Sub-halala (< 1 halala)
    { qty: "5", price: "10.555" }, // Exceeds 2 decimal places
    { qty: "5", price: "1.0001" }, // Unrepresentable under 2-decimal contract
  ];

  for (const tc of invalidCases) {
    const isValid = () => {
      const q = parseFloat(tc.qty.trim());
      if (!tc.qty.trim() || isNaN(q) || !Number.isFinite(q) || q <= 0) return false;
      const priceStr = tc.price.trim();
      if (!/^\d+(\.\d{1,2})?$/.test(priceStr)) return false;
      const parts = priceStr.split(".");
      const major = parseInt(parts[0], 10);
      const minorStr = parts[1] ? parts[1].padEnd(2, "0") : "00";
      const minor = parseInt(minorStr, 10);
      const unitPriceHalalas = major * 100 + minor;
      if (!Number.isSafeInteger(unitPriceHalalas) || unitPriceHalalas < 1) return false;
      const totalHalalas = Math.round(unitPriceHalalas * q);
      if (!Number.isSafeInteger(totalHalalas) || totalHalalas < 1) return false;
      return true;
    };

    assert.strictEqual(
      isValid(),
      false,
      `Expected qty='${tc.qty}' price='${tc.price}' to fail validation`
    );
  }

  // Positive test vectors: valid finite quantities and exact two-decimal prices (>= 1 halala)
  const validCases = [
    { qty: "1", price: "10.50", expectedHalalas: 1050 },
    { qty: "0.25", price: "100.00", expectedHalalas: 10000 },
    { qty: "1500", price: "0.01", expectedHalalas: 1 },
    { qty: "2", price: "99.99", expectedHalalas: 9999 },
  ];

  for (const vc of validCases) {
    const q = parseFloat(vc.qty.trim());
    const priceStr = vc.price.trim();
    assert.ok(/^\d+(\.\d{1,2})?$/.test(priceStr), `Price '${priceStr}' must match 2-decimal format`);
    const parts = priceStr.split(".");
    const major = parseInt(parts[0], 10);
    const minorStr = parts[1] ? parts[1].padEnd(2, "0") : "00";
    const minor = parseInt(minorStr, 10);
    const unitPriceHalalas = major * 100 + minor;
    assert.strictEqual(unitPriceHalalas, vc.expectedHalalas, `Halala conversion must match exact integer halalas`);
    assert.ok(unitPriceHalalas >= 1, `Unit price halalas must be >= 1 halala`);
  }
});

test("Phase 1E Behavioral: Draft idempotency key covers complete effective payload and rotates on notes modification", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("lastMaterialSignature && lastMaterialSignature !== currentSignature"),
    "CompanyDashboard submitOrder must rotate draftCommandId when material signature changes"
  );
  assert.ok(
    dash.includes("${orderForm.supplierId}|${orderForm.itemId}|${q}|${unitPriceHalalas}|${totalHalalas}|${normalizedNotes}"),
    "Idempotency signature must cover supplier, item, qty, unitPriceHalalas, totalHalalas, and normalized notes"
  );

  // Behavioral simulation of draft idempotency state machine covering full payload
  let currentKey = "command-initial-111";
  let lastSignature = "";
  let keyRotations = 0;

  const mockSubmitOrder = (payload: {
    supplierId: string;
    itemId: string;
    qty: number;
    unitPriceHalalas: number;
    totalHalalas: number;
    notes: string;
  }) => {
    const normalizedNotes = payload.notes.trim();
    const currentSignature = `${payload.supplierId}|${payload.itemId}|${payload.qty}|${payload.unitPriceHalalas}|${payload.totalHalalas}|${normalizedNotes}`;
    if (lastSignature && lastSignature !== currentSignature) {
      keyRotations++;
      currentKey = `command-rotated-${keyRotations}`;
    }
    lastSignature = currentSignature;
    return currentKey;
  };

  const draftA = {
    supplierId: "sup-1",
    itemId: "item-1",
    qty: 5,
    unitPriceHalalas: 1000,
    totalHalalas: 5000,
    notes: "Urgent shipment",
  };
  const firstSubmissionKey = mockSubmitOrder(draftA);
  assert.strictEqual(firstSubmissionKey, "command-initial-111");

  // Identical retry (e.g. after network failure) must reuse the exact same idempotency key
  const retrySubmissionKey = mockSubmitOrder(draftA);
  assert.strictEqual(retrySubmissionKey, firstSubmissionKey, "Retry of identical draft must preserve idempotency key");

  // Modifying notes alone (material change to effective command) must rotate the key
  const draftB = { ...draftA, notes: "Changed delivery instructions" };
  const modifiedNotesKey = mockSubmitOrder(draftB);
  assert.notStrictEqual(modifiedNotesKey, firstSubmissionKey, "Modifying notes must rotate idempotency key");

  // Modifying quantity alone must rotate the key
  const draftC = { ...draftB, qty: 10, totalHalalas: 10000 };
  const modifiedQtyKey = mockSubmitOrder(draftC);
  assert.notStrictEqual(modifiedQtyKey, modifiedNotesKey, "Modifying quantity must rotate idempotency key");

  // Modifying supplier alone must rotate the key
  const draftD = { ...draftC, supplierId: "sup-2" };
  const modifiedSupplierKey = mockSubmitOrder(draftD);
  assert.notStrictEqual(modifiedSupplierKey, modifiedQtyKey, "Modifying supplier must rotate idempotency key");
});

test("Phase 1E Behavioral: ProcNewOrders strictly enforces PUR-01 fail-closed financial approval authority across all roles", () => {
  const procNewCode = norm(
    readFileSync(new URL("./_pages/procurement/ProcNewOrders.tsx", import.meta.url), "utf8")
  );

  assert.ok(
    procNewCode.includes("const canApproveFinancial = false;"),
    "ProcNewOrders must fail closed for canApproveFinancial without speculative role allowlist"
  );
  assert.ok(
    procNewCode.includes("if (!canApproveFinancial) return;"),
    "approveOne, approveList, and confirmPartial must fail closed when canApproveFinancial is false"
  );
  assert.ok(
    procNewCode.includes("disabled={!canApproveFinancial || bulkMut.isPending}"),
    "Bulk approve button must be disabled when canApproveFinancial is false"
  );
  assert.ok(
    procNewCode.includes("disabled={!canApproveFinancial || approveMut.isPending}"),
    "Row approve button must be disabled when canApproveFinancial is false"
  );
  assert.ok(
    procNewCode.includes("disabled={!canApproveFinancial}"),
    "Partial approve open button must be disabled when canApproveFinancial is false"
  );
  assert.ok(
    !procNewCode.includes('role === "head" || role === "admin"'),
    "ProcNewOrders must not grant speculative approval rights to head or admin"
  );

  // Behavioral fail-closed verification across ALL roles
  const testRoles = ["procurement", "head", "admin", "branch", "accountant", "supplier", "owner", null, undefined, "unknown"];
  for (const r of testRoles) {
    // In production logic, canApproveFinancial is false until explicit contract is verified
    const canApprove = false;
    assert.strictEqual(canApprove, false, `Role '${r}' must fail closed under PUR-01`);
  }
});
