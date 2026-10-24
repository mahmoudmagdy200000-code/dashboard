import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import ts from "typescript";
import {
  getSalesActionPolicy, isPkg6SalesReport, runSalesAction,
  salesBulkApprovalIds, runSalesBulkApproval,
  hasSalesReconciliationEvidence,
  type SalesAction, type SalesActionContext,
} from "./salesActionGuards.ts";
import { getHeadReviewPolicy, headLegacyBulkIds } from "./headReviewGuards.ts";

const legacy = { id: "legacy", moduleKey: "sales", status: "pending" };
const day = { ...legacy, id: "day", reportReview: { phase: "accountant_review" } };
const shf = { id: "shf", moduleKey: "shifts", status: "pending", reportReview: { phase: "accountant_review" } };
const nullableLegacyRecon = {
  channels: [{ key: "cash", actualAmountHalalas: 0, posAmountHalalas: null, diffHalalas: null }],
  totals: { expectedTotalHalalas: 100, totalCollectionHalalas: 0, varianceHalalas: -100 },
  varianceReason: null,
};
const forbidden: SalesAction[] = ["edit", "save", "assign", "return", "returnForReview", "correct", "bulkApprove"];

test("PKG-6 sales guards prevent legacy effects for accountant and head", () => {
  const requests: string[] = [];
  for (const role of ["accountant", "head"]) {
    for (const status of ["pending", "approved", "final-approved"]) {
      for (const action of forbidden) {
        assert.equal(runSalesAction({ operation: { ...day, status }, role }, action, () => requests.push(action)), false);
      }
    }
  }
  assert.deepEqual(requests, [], "no legacy mutation or return request may be sent");
});

test("legacy accountant edit/save/assign/return and pending bulk approval remain active", () => {
  const requests: string[] = [];
  for (const action of ["edit", "save", "assign", "return", "bulkApprove"] as const) {
    assert.equal(runSalesAction({ operation: legacy, role: "accountant" }, action, () => requests.push(action)), true);
  }
  assert.deepEqual(requests, ["edit", "save", "assign", "return", "bulkApprove"]);
});

test("absent and null reportReview permit legacy actions without inferring a mobile review", () => {
  for (const reportReview of [undefined, null]) {
    const operation = { ...legacy, origin: "mobile", publicId: "DAY-looking-id", reportReview };
    assert.equal(isPkg6SalesReport(operation), false);
    const policy = getSalesActionPolicy({ operation, role: "accountant" });
    assert.equal(policy.save, true);
    assert.equal(policy.assign, true);
    assert.equal(policy.return, true);
  }
});

test("any non-null API review protects a sales day; SHF review does not trigger sales guards", () => {
  assert.equal(isPkg6SalesReport({ ...legacy, reportReview: {} }), true);
  assert.equal(isPkg6SalesReport({ ...legacy, reportReview: false }), true);
  assert.equal(isPkg6SalesReport({ ...day, moduleKey: "shifts" }), false);
  assert.equal(isPkg6SalesReport({ id: "day", module: "sales", reportReview: day.reportReview }), true);
});

test("head may return approved legacy sales, but cannot edit or assign its figures", () => {
  const requests: string[] = [];
  const context = { operation: { ...legacy, status: "approved" }, role: "head" };
  for (const action of ["edit", "save", "assign", "bulkApprove"] as const) {
    assert.equal(runSalesAction(context, action, () => requests.push(action)), false);
  }
  assert.equal(runSalesAction(context, "return", () => requests.push("return")), true);
  assert.deepEqual(requests, ["return"]);
  assert.equal(getSalesActionPolicy({ operation: legacy, role: "head" }).return, false);
  assert.equal(getSalesActionPolicy(context).returnForReview, true);
  assert.equal(getSalesActionPolicy({ operation: legacy, role: "accountant" }).returnForReview, false);
});

test("unrelated roles and missing operation never gain legacy sales mutation permissions", () => {
  for (const role of ["admin", "branch", "procurement", null, undefined]) {
    for (const action of forbidden) {
      assert.equal(runSalesAction({ operation: legacy, role }, action, () => assert.fail("unexpected request")), false);
    }
  }
  assert.equal(runSalesAction({ role: "accountant" }, "save", () => assert.fail("unknown operation")), false);
});

test("locked or final legacy rows cannot save or assign; linked legacy correction stays available", () => {
  for (const context of [
    { operation: legacy, role: "accountant", locked: true },
    { operation: { ...legacy, status: "final-approved" }, role: "accountant" },
    { operation: legacy, detail: { ...legacy, status: "final-approved" }, role: "accountant" },
    { operation: { ...legacy, status: "final-approved" }, detail: legacy, role: "accountant" },
  ]) {
    assert.equal(getSalesActionPolicy(context).save, false);
    assert.equal(getSalesActionPolicy(context).assign, false);
  }
  assert.equal(getSalesActionPolicy({ operation: { ...legacy, status: "final-approved" }, role: "accountant" }).correct, true);
});

// Execute the actual handlers without importing the monolithic screens and their
// browser/auth side effects. TypeScript is already a workspace dev dependency.
function uiHandlers(file: string, container: string, names: string[], scope: Record<string, unknown>) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const component = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === container);
  assert.ok(component?.body, `${container} missing`);
  const snippets = names.map((name, index) => {
    const [declarationName, propertyName] = name.split(".");
    const fn = component.body!.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === declarationName);
    if (fn) return `${fn.getText(source)}\nconst handler${index} = ${declarationName};`;
    const statement = component.body!.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(source) === declarationName));
    assert.ok(statement && ts.isVariableStatement(statement), `${name} missing`);
    let value = statement.declarationList.declarations.find(d => d.name.getText(source) === declarationName)!.initializer!;
    if (propertyName) {
      assert.ok(ts.isObjectLiteralExpression(value));
      const property = value.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(source) === propertyName);
      assert.ok(property && ts.isPropertyAssignment(property));
      value = property.initializer;
    }
    return `const handler${index} = ${value.getText(source)};`;
  });
  const js = ts.transpileModule(snippets.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return new Function(...Object.keys(scope), `${js}\nreturn [${names.map((_, i) => `handler${i}`).join(",")}];`)(...Object.values(scope)) as Array<(...args: unknown[]) => void>;
}

test("actual sales edit/save/assign handlers send no forbidden requests in either screen", () => {
  const recon = {
    channels: [{ key: "cash", actualAmountHalalas: 0, posAmountHalalas: 100, diffHalalas: -100 }],
    totals: { expectedTotalHalalas: 100, totalCollectionHalalas: 0, varianceHalalas: -100 },
    varianceReason: null,
  };
  for (const [file, component, assign] of [
    ["CompanyDashboard.tsx", "SalesReconPanel", "confirmAssign"],
    [existsSync(new URL("_pages/accountant/AccSalesDetail.tsx", import.meta.url)) ? "_pages/accountant/AccSalesDetail.tsx" : "ASABPrototype.tsx", "AccSalesDetail", "confirmVarianceAssign"],
  ]) {
    for (const role of ["accountant", "head"]) {
      for (const operation of [legacy, day]) {
        const requests: string[] = [];
        const edits: unknown[] = [];
        const context = { operation, role, financialDataReady: true };
        const handlers = uiHandlers(file, component, ["beginEdit", "saveEdit", assign], {
          runSalesAction, salesContext: () => context, op: operation, recon, channels: recon.channels,
          totals: recon.totals, draft: { cash: "0" }, varReason: "", reconVarReason: "", assignNotes: "",
          varEmps: [{ empId: "employee", amount: "1" }],
          setDraft: (value: unknown) => edits.push(value), setVarReason: () => {}, setEditMode: () => {},
          setReconVarReason: () => {}, setReconEditMode: () => {},
          patchMut: { mutate: () => requests.push("PATCH sales-details") },
          assignMut: { mutate: () => requests.push("POST sales-variance/assign") },
        });
        handlers.forEach(handler => handler());
        const allowed = role === "accountant" && operation === legacy;
        assert.deepEqual(requests, allowed ? ["PATCH sales-details", "POST sales-variance/assign"] : [], `${file}: ${role}, ${operation.id}`);
        assert.equal(edits.length, allowed ? 1 : 0);
      }
    }
  }
});

test("actual reject confirmation and return handlers recheck review before HTTP or optimistic updates", async () => {
  for (const role of ["accountant", "head"]) {
    for (const pkg6 of [false, true]) {
      const operation = { ...legacy, status: role === "head" ? "approved" : "pending", reportReview: pkg6 ? day.reportReview : undefined };
      const requests: string[] = [];
      const changes: unknown[] = [];
      const scope = {
        runSalesAction, salesContextFor: () => ({ operation, role }), rejectingId: "legacy",
        rejectingModule: "sales", rejectReasons: undefined,
        currentRole: { current:role }, operationFor: () => operation, detailFor: () => undefined,
        actionLock: { current:false }, setActionsPending: () => {},
        loadFreshDetail: async () => operation, getHeadReviewPolicy, getSalesActionPolicy,
        runOperationAction: (_id: string, _action: string, effect: () => void) => { effect(); return true; },
        setRejectingId: () => {}, now: () => "now", appState: { role },
        setOps: (update: unknown) => changes.push(update),
        rejectMut: { mutate: () => requests.push("POST reject"), mutateAsync: async () => { requests.push("POST reject"); } },
        returnReviewMut: { mutate: () => requests.push("POST return-for-review") },
      };
      const [confirm] = uiHandlers("CompanyDashboard.tsx", "useSharedOps", ["rejectModalProps.onSubmit"], scope);
      if (pkg6) await assert.rejects(async () => { await confirm({ reason: "reason" }); });
      else await confirm({ reason: "reason" });
      const [reject, returnForReview] = uiHandlers("ASABPrototype.tsx", "ASABPrototype", ["rejectOp", "returnForReview"], scope);
      reject("legacy", "reason");
      returnForReview("legacy");
      await Promise.resolve();
      assert.deepEqual(requests, pkg6 ? [] : role === "head" ? ["POST reject", "POST reject", "POST return-for-review"] : ["POST reject", "POST reject"]);
      assert.equal(changes.length, pkg6 ? 0 : role === "head" ? 2 : 1);
    }
  }
});

test("nullable Backend legacy evidence permits actual edit/save/assign only for allowed roles and states", () => {
  const recon = nullableLegacyRecon;
  for (const [file, component, assign] of [
    ["CompanyDashboard.tsx", "SalesReconPanel", "confirmAssign"],
    [existsSync(new URL("_pages/accountant/AccSalesDetail.tsx", import.meta.url)) ? "_pages/accountant/AccSalesDetail.tsx" : "ASABPrototype.tsx", "AccSalesDetail", "confirmVarianceAssign"],
  ]) {
    for (const role of ["accountant", "head"]) {
      for (const status of ["pending", "approved", "final-approved"]) {
        for (const reportReview of [undefined, null, day.reportReview]) {
          const operation = { ...legacy, status, reportReview };
          const requests: string[] = [];
          const edits: unknown[] = [];
          const handlers = uiHandlers(file, component, ["beginEdit", "saveEdit", assign], {
            runSalesAction,
            salesContext: () => ({ operation, role, financialDataReady: hasSalesReconciliationEvidence(recon) }),
            op: operation, recon, channels: recon.channels, totals: recon.totals,
            draft: { cash: "0" }, varReason: "", reconVarReason: "", assignNotes: "",
            varEmps: [{ empId: "employee", amount: "1" }],
            setDraft: (value: unknown) => edits.push(value), setVarReason: () => {}, setEditMode: () => {},
            setReconVarReason: () => {}, setReconEditMode: () => {},
            patchMut: { mutate: (request: { payload: { channels: unknown[] } }) => {
              assert.deepEqual(request.payload.channels, [{ key: "cash", actualAmountHalalas: 0, posAmountHalalas: null }]);
              requests.push("PATCH sales-details");
            } },
            assignMut: { mutate: () => requests.push("POST sales-variance/assign") },
          });
          handlers.forEach(handler => handler());
          const allowed = role === "accountant" && status !== "final-approved" && reportReview == null;
          assert.deepEqual(requests, allowed ? ["PATCH sales-details", "POST sales-variance/assign"] : [], `${file}: ${role}, ${status}, ${reportReview == null ? "Legacy" : "PKG-6"}`);
          assert.deepEqual(edits, allowed ? [{ cash: "0" }] : []);
        }
      }
    }
  }
});

test("actual bulk handlers exclude PKG-6 before requests and optimistic state changes", () => {
  const expense = { id: "expense", moduleKey: "expenses", status: "pending" };
  for (const [file, container] of [["CompanyDashboard.tsx", "useSharedOps"], ["ASABPrototype.tsx", "ASABPrototype"]]) {
    let state = [legacy, day, expense];
    const sent: string[][] = [];
    const mutate = ({ operationIds }: { operationIds: string[] }) => sent.push(operationIds);
    const [bulk] = uiHandlers(file, container, ["bulkApprove"], {
      runSalesBulkApproval, salesBulkApprovalIds, headLegacyBulkIds,
      currentOps: { current: state }, currentRole: { current: "accountant" },
      currentSalesOps: { current: state }, currentSalesRole: { current: "accountant" },
      ops: state, detailFor: () => undefined, salesDetailFor: () => undefined,
      now: () => "now", setOps: (update: (ops: typeof state) => typeof state) => { state = update(state); },
      bulkMut: { mutate }, bulkApproveMut: { mutate }, bulkFinalMut: { mutate: () => assert.fail("unexpected final approval") },
    });
    bulk(["day"]);
    assert.deepEqual(sent, []);
    bulk(["day", "legacy", "expense"]);
    assert.deepEqual(sent, [["legacy"]]);
    assert.equal(state.find(op => op.id === "day")?.status, "pending");
  }
});

test("accountant bulk selection excludes SHF across mixed selections and detail evidence", () => {
  const expense = { id: "expense", moduleKey: "expenses", status: "pending" };
  const operations = [shf, day, legacy, expense];
  for (const [requested, expected] of [
    [["shf"], []],
    [["shf", "legacy"], ["legacy"]],
    [["shf", "day", "legacy"], ["legacy"]],
    [["shf", "expense"], []],
    [["day"], []],
    [["legacy"], ["legacy"]],
  ] as const) {
    const sent: string[][] = [];
    const eligible = runSalesBulkApproval(operations, requested, "accountant", payload => sent.push(payload));
    assert.deepEqual(eligible, expected, requested.join(","));
    assert.deepEqual(sent, expected.length ? [expected] : [], requested.join(","));
  }
  const detailShf = { ...shf, id: "legacy" };
  assert.deepEqual(salesBulkApprovalIds([legacy], ["legacy"], "accountant", () => detailShf), []);
  assert.deepEqual(runSalesBulkApproval([legacy], ["legacy"], "accountant", () => assert.fail("detail SHF entered bulk"), () => detailShf), []);
});

test("Dashboard and ASABPrototype shared bulk handlers never emit SHF or PKG-6 IDs", () => {
  const expense = { id: "expense", moduleKey: "expenses", status: "pending" };
  const operations = [shf, day, legacy, expense];
  const cases = [
    { requested:["shf"], expected:[] },
    { requested:["shf","legacy"], expected:["legacy"] },
    { requested:["shf","day","legacy"], expected:["legacy"] },
    { requested:["shf","expense"], expected:[] },
    { requested:["day"], expected:[] },
    { requested:["legacy"], expected:["legacy"] },
  ];
  for (const [file, container] of [["CompanyDashboard.tsx", "useSharedOps"], ["ASABPrototype.tsx", "ASABPrototype"]]) {
    for (const {requested, expected} of cases) {
      let state = [...operations];
      const sent: string[][] = [];
      const mutate = ({ operationIds }: { operationIds: string[] }) => sent.push(operationIds);
      const [bulk] = uiHandlers(file, container, ["bulkApprove"], {
        runSalesBulkApproval, salesBulkApprovalIds, headLegacyBulkIds,
        currentOps: { current: state }, currentRole: { current: "accountant" },
        currentSalesOps: { current: state }, currentSalesRole: { current: "accountant" },
        ops: state, detailFor: () => undefined, salesDetailFor: () => undefined,
        now: () => "now", setOps: (update: (ops: typeof state) => typeof state) => { state = update(state); },
        bulkMut: { mutate }, bulkApproveMut: { mutate }, bulkFinalMut: { mutate: () => assert.fail("unexpected final approval") },
      });
      bulk(requested);
      assert.deepEqual(sent, expected.length ? [expected] : [], `${file}: ${requested.join(",")}`);
    }
    const sent: string[][] = [];
    const [bulk] = uiHandlers(file, container, ["bulkApprove"], {
      runSalesBulkApproval, salesBulkApprovalIds, headLegacyBulkIds,
      currentOps: { current: [legacy] }, currentRole: { current: "accountant" },
      currentSalesOps: { current: [legacy] }, currentSalesRole: { current: "accountant" },
      ops: [legacy], detailFor: () => ({ ...shf, id:"legacy" }), salesDetailFor: () => ({ ...shf, id:"legacy" }),
      now: () => "now", setOps: () => {},
      bulkMut: { mutate: ({operationIds}: {operationIds:string[]}) => sent.push(operationIds) },
      bulkApproveMut: { mutate: ({operationIds}: {operationIds:string[]}) => sent.push(operationIds) },
      bulkFinalMut: { mutate: () => assert.fail("unexpected final approval") },
    });
    bulk(["legacy"]);
    assert.deepEqual(sent, [], `${file}: SHF in detail`);
  }
});

test("ASABPrototype blocks protected approved rows while preserving head Legacy bulk", () => {
  const approvedShf = { ...shf, status:"approved" };
  const approvedDay = { ...day, status:"approved" };
  const approvedLegacy = { ...legacy, status:"approved" };
  const operations = [approvedShf, approvedDay, approvedLegacy];
  for (const [role, requested, expected] of [
    ["accountant", ["shf","day"], []],
    ["head", ["shf","day","legacy"], []],
    ["head", ["legacy"], ["legacy"]],
  ] as const) {
    const sent: string[][] = [];
    const [bulk] = uiHandlers("ASABPrototype.tsx", "ASABPrototype", ["bulkApprove"], {
      runSalesBulkApproval, salesBulkApprovalIds, headLegacyBulkIds,
      currentSalesOps: { current: operations }, currentSalesRole: { current: role },
      ops: operations, salesDetailFor: () => undefined,
      now: () => "now", setOps: () => {},
      bulkApproveMut: { mutate: () => assert.fail("unexpected accountant bulk approval") },
      bulkFinalMut: { mutate: ({ operationIds }: { operationIds:string[] }) => sent.push(operationIds) },
    });
    bulk(requested);
    assert.deepEqual(sent, expected.length ? [expected] : [], `${role}: ${requested.join(",")}`);
  }
});

test("review arriving from detail blocks a legacy-looking list row, and null detail cannot erase list review", () => {
  assert.equal(getSalesActionPolicy({ operation: legacy, detail: day, role: "accountant" }).save, false);
  assert.equal(getSalesActionPolicy({ operation: day, detail: { ...legacy, reportReview: null }, role: "accountant" }).return, false);
});

test("a modal opened as legacy rechecks current API evidence before sending", () => {
  let current: SalesActionContext = { operation: legacy, role: "accountant" };
  const context = () => current;
  assert.equal(getSalesActionPolicy(current).return, true);
  current = { ...current, detail: day };
  const requests: string[] = [];
  assert.equal(runSalesAction(context, "return", () => requests.push("POST reject")), false);
  assert.equal(runSalesAction(context, "save", () => requests.push("PATCH sales-details")), false);
  assert.equal(runSalesAction(context, "assign", () => requests.push("POST sales-variance/assign")), false);
  assert.deepEqual(requests, []);
});

test("sales bulk approval sends only loaded eligible legacy IDs; expense and PKG-6 are excluded", () => {
  const expense = { id: "expense", moduleKey: "expenses", status: "pending", reportReview: {} };
  const operations = [legacy, day, expense, { ...legacy, id: "approved", status: "approved" }];
  const requested = ["day", "legacy", "expense", "missing", "approved", "legacy"];
  const before = structuredClone(operations);
  const sent: string[][] = [];
  const ids = runSalesBulkApproval(operations, requested, "accountant", payload => sent.push(payload));
  assert.deepEqual(ids, ["legacy"]);
  assert.deepEqual(sent, [["legacy"]]);
  assert.deepEqual(operations, before);
  assert.deepEqual(salesBulkApprovalIds(operations, ["day", "legacy"], "head"), []);
});

test("an all-PKG-6 or empty selection sends no bulk request, including detail-only review", () => {
  for (const requested of [[], ["day"], ["missing"]]) {
    runSalesBulkApproval([day], requested, "accountant", () => assert.fail("empty bulk request"));
  }
  const details = () => day;
  assert.deepEqual(runSalesBulkApproval([legacy], ["legacy"], "accountant", () => assert.fail("detail review bypass"), details), []);
});

test("stale member evidence is preserved without inventing review or financial defaults", () => {
  const staleMembers = [{ report_revision: "evidence-id" }];
  const operation = { ...day, reportReview: { phase: "accountant_review", stale_members: staleMembers } };
  const before = structuredClone(operation);
  const policy = getSalesActionPolicy({ operation, role: "accountant" });
  assert.strictEqual(policy.staleMembers, staleMembers);
  assert.equal(policy.pkg6, true);
  assert.deepEqual(operation, before);
  assert.deepEqual(getSalesActionPolicy({ operation: legacy, role: "accountant" }).staleMembers, []);
});

test("missing financial evidence prevents editing, saving and assigning without blocking a legacy return", () => {
  const context = { operation: legacy, role: "accountant", financialDataReady: false };
  for (const action of ["edit", "save", "assign"] as const) {
    assert.equal(runSalesAction(context, action, () => assert.fail("missing money request")), false);
  }
  assert.equal(getSalesActionPolicy(context).return, true);
});

test("reconciliation evidence requires the API's actual integer amounts, including genuine zero", () => {
  const valid = {
    channels: [{ key: "cash", actualAmountHalalas: 0, posAmountHalalas: 100, diffHalalas: -100 }],
    totals: { expectedTotalHalalas: 100, totalCollectionHalalas: 0, varianceHalalas: -100 },
  };
  assert.equal(hasSalesReconciliationEvidence(valid), true);
  for (const value of [null, undefined, {}, { channels: [] }, { ...valid, totals: {} },
    { ...valid, channels: [{ key: "cash", actualAmountHalalas: null }] },
    { ...valid, totals: { ...valid.totals, varianceHalalas: null } },
    { ...valid, channels: [{ ...valid.channels[0], actualAmountHalalas: "0" }] }]) {
    assert.equal(hasSalesReconciliationEvidence(value), false);
  }
});

test("channel POS and difference accept explicit null independently without changing evidence", () => {
  for (const posAmountHalalas of [null, 0, 100]) {
    for (const diffHalalas of [null, 0, -100]) {
      const recon = { ...nullableLegacyRecon, channels: [{ ...nullableLegacyRecon.channels[0], posAmountHalalas, diffHalalas }] };
      const before = structuredClone(recon);
      assert.equal(hasSalesReconciliationEvidence(recon), true);
      assert.deepEqual(recon, before, "validation must preserve null and real amounts");
    }
  }
});

test("nullable channels still reject malformed amounts and missing required evidence", () => {
  const malformed = [undefined, "0", false, NaN, Infinity, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1];
  for (const key of ["actualAmountHalalas", "posAmountHalalas", "diffHalalas"]) {
    for (const value of [...malformed, ...(key === "actualAmountHalalas" ? [null] : [])]) {
      const channel: Record<string, unknown> = { ...nullableLegacyRecon.channels[0], [key]: value };
      assert.equal(hasSalesReconciliationEvidence({ ...nullableLegacyRecon, channels: [channel] }), false, key);
    }
    const channel: Record<string, unknown> = { ...nullableLegacyRecon.channels[0] };
    delete channel[key];
    assert.equal(hasSalesReconciliationEvidence({ ...nullableLegacyRecon, channels: [channel] }), false, `missing ${key}`);
  }
  for (const key of ["expectedTotalHalalas", "totalCollectionHalalas", "varianceHalalas"]) {
    for (const value of [...malformed, null]) {
      assert.equal(hasSalesReconciliationEvidence({ ...nullableLegacyRecon, totals: { ...nullableLegacyRecon.totals, [key]: value } }), false, key);
    }
    const totals: Record<string, unknown> = { ...nullableLegacyRecon.totals };
    delete totals[key];
    assert.equal(hasSalesReconciliationEvidence({ ...nullableLegacyRecon, totals }), false, `missing ${key}`);
  }
  for (const channels of [[], [null], [nullableLegacyRecon.channels[0], { actualAmountHalalas: null }]]) {
    assert.equal(hasSalesReconciliationEvidence({ ...nullableLegacyRecon, channels }), false);
  }
});
