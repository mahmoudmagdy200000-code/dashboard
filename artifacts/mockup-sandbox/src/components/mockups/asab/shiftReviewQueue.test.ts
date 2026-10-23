import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { getShfReviewGroup, getShfReviewPolicy, runShfReviewAction, shfReviewRows, shfReviewPageTarget } from "./shiftReviewQueue.ts";
import { getHeadReviewPolicy } from "./headReviewGuards.ts";

const shift = (status: string, phase?: string) => ({
  id: "shf-1", module: "shifts", status,
  reportReview: phase === undefined ? null : { phase },
});

test("accountant SHF queue groups actual phases and keeps unknown phase visible without actions", () => {
  assert.equal(getShfReviewGroup(shift("pending", "accountant_review")), "accountant_review");
  assert.equal(getShfReviewGroup(shift("pending", "head_returned")), "head_returned");
  assert.equal(getShfReviewGroup(shift("rejected", "manager_returned")), "manager_returned");
  assert.equal(getShfReviewGroup(shift("approved", "head_review")), "head_review");
  assert.equal(getShfReviewGroup(shift("final-approved", "final")), "final_approved");
  assert.equal(getShfReviewGroup(shift("pending")), "pending_unknown");
  assert.equal(getShfReviewGroup(shift("pending", "future_phase")), "pending_unknown");
  assert.equal(getShfReviewGroup(shift("approved", "future_phase")), "other");
  assert.equal(getShfReviewGroup(shift("rejected")), "other");
});

test("more than 100 SHF operations stay on their API page and pagination uses real meta", () => {
  const rows = Array.from({length:120}, (_,index) => ({ id:`shf-${index+1}`, moduleKey:"shifts", status:"pending", reportReview:{phase:"accountant_review"} }));
  const page1 = { data:rows.slice(0,100), meta:{page:1,pageSize:100,total:120,totalPages:2} };
  const page2 = { data:[...rows.slice(100), {id:"unrelated",moduleKey:"sales",status:"pending",reportReview:null}], meta:{page:2,pageSize:100,total:120,totalPages:2} };
  assert.equal(shfReviewRows(page1).length,100);
  assert.deepEqual(shfReviewRows(page2).map(row=>row.id),rows.slice(100).map(row=>row.id));
  assert.equal(shfReviewPageTarget(1,page1.meta.totalPages,1),2);
  assert.equal(shfReviewPageTarget(2,page2.meta.totalPages,1),2);
  assert.equal(shfReviewPageTarget(2,page2.meta.totalPages,-1),1);
  assert.equal(shfReviewPageTarget(1,page1.meta.totalPages,-1),1);
  assert.equal(shfReviewPageTarget(1,undefined,1),1);
});

test("only accountant review can approve or clarify; head_returned can be returned to manager", () => {
  assert.deepEqual(getShfReviewPolicy(shift("pending", "accountant_review"), "accountant"),
    { approve: true, returnToManager: true, clarify: true });
  assert.deepEqual(getShfReviewPolicy(shift("pending", "head_returned"), "accountant"),
    { approve: false, returnToManager: true, clarify: false });
  for (const role of ["head", "branch", null]) {
    assert.deepEqual(getShfReviewPolicy(shift("pending", "accountant_review"), role),
      { approve: false, returnToManager: false, clarify: false });
  }
  for (const row of [shift("pending"), shift("pending", "future_phase"), shift("rejected", "manager_returned"), shift("approved", "head_review")]) {
    assert.deepEqual(getShfReviewPolicy(row, "accountant"),
      { approve: false, returnToManager: false, clarify: false });
  }
});

test("SHF effects are blocked when fresh detail withdraws approval or row is final", () => {
  const requests: string[] = [];
  const row = shift("pending", "accountant_review");
  assert.equal(runShfReviewAction(row, "accountant", "approve", () => requests.push("approve")), true);
  assert.equal(runShfReviewAction(shift("pending", "head_returned"), "accountant", "returnToManager", () => requests.push("return"), shift("pending", "head_returned")), true);
  assert.equal(runShfReviewAction(row, "accountant", "approve", () => requests.push("forbidden"), shift("pending", "head_returned")), false);
  assert.equal(runShfReviewAction(row, "accountant", "clarify", () => requests.push("forbidden"), shift("pending", "head_returned")), false);
  assert.equal(runShfReviewAction(shift("pending", "head_returned"), "accountant", "approve", () => requests.push("forbidden"), row), false);
  assert.equal(runShfReviewAction(row, "accountant", "returnToManager", () => requests.push("forbidden"), shift("rejected", "manager_returned")), false);
  assert.deepEqual(requests, ["approve", "return"]);
});

const screenSource = readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8");
const source = ts.createSourceFile("CompanyDashboard.tsx", screenSource, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
function component(name: string): ts.FunctionDeclaration {
  const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration?.body, `${name} missing`);
  return declaration;
}

test("accountant tab lists SHF rows, expands the existing operation panel, and has no bulk action", () => {
  const queue = component("AccCompanyShifts").getText(source);
  const row = component("OpRow").getText(source);
  const root = component("AccountantRoot").getText(source);
  assert.match(queue, /useOperations\(\{ moduleKey:"shifts", pageSize:100, page \}\)/);
  assert.match(queue, /shfReviewRows\(operationsQuery\.data\)/);
  assert.match(queue, /operationsQuery\.data\?\.meta/);
  assert.match(queue, /shfReviewPageTarget/);
  assert.match(queue, /reviewLoading && <p role="status"/);
  assert.match(queue, /operationsQuery\.isError && <p role="alert"/);
  assert.match(queue, /shiftOps\.length===0 && <p/);
  assert.match(queue, /onClick=\{\(\)=>changeReviewPage\(-1\)\}/);
  assert.match(queue, /onClick=\{\(\)=>changeReviewPage\(1\)\}/);
  assert.match(queue, /rows\.length\} \{t\("في هذه الصفحة"/);
  assert.match(queue, /reviewGroups\.map/);
  assert.match(queue, /<OpRow op=\{op\}/);
  assert.match(queue, /expanded=\{expandedId===op\.id\} onToggle=/);
  assert.match(row, /<ShiftOpPanel detail=\{detailQ\.data\}/);
  assert.match(root, /<AccCompanyShifts approve=\{approve\} reject=\{reject\} requestClarification=\{requestClarification\} page=\{shiftReviewPage\} setPage=\{setShiftReviewPage\}/);
  assert.doesNotMatch(queue, /bulkApprove|bulkFinalApprove/);
});

test("SHF action lookup uses the selected API page, not only the initial operations page", () => {
  const hook = component("useSharedOps").getText(source);
  assert.match(hook, /queryKeys\.operations\(\{ moduleKey:"shifts", pageSize:100, page:shiftReviewPage \}\)/);
  const router = component("PageRouter").getText(source);
  assert.match(router, /<AccountantRoot[^>]*shiftReviewPage=\{shiftReviewPage\} setShiftReviewPage=\{setShiftReviewPage\}/);
});

test("actual shared handlers recheck SHF policy before approve, return, or clarification effects", () => {
  const hook = component("useSharedOps");
  const declarations = ["runOperationAction", "approve", "reject", "requestClarification"].map(name => {
    const statement = hook.body!.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(source) === name));
    assert.ok(statement && ts.isVariableStatement(statement), `${name} missing`);
    return statement.getText(source);
  });
  const js = ts.transpileModule(`${declarations.join("\n")}\nreturn {approve, reject, requestClarification};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  for (const [role, op] of [
    ["accountant", shift("pending", "accountant_review")],
    ["accountant", shift("pending", "head_returned")],
    ["accountant", shift("rejected", "manager_returned")],
    ["head", shift("pending", "accountant_review")],
    ["accountant", shift("pending")],
  ] as const) {
    const requests: string[] = [];
    const handlers = new Function("runShfReviewAction", "operationFor", "currentRole", "detailFor", "approveMut", "runSalesAction", "salesContextFor", "setRejectingId", "setClarifyingId", "actionLock", "getHeadReviewPolicy", js)(
      runShfReviewAction, () => op, { current: role }, () => undefined,
      { mutate: () => requests.push("approve") }, (_context: unknown, _action: unknown, effect: () => void) => effect(),
      () => ({ operation: op, role }), () => requests.push("return"), () => requests.push("clarify"), {current:false}, getHeadReviewPolicy,
    ) as { approve:(id:string)=>void; reject:(id:string)=>void; requestClarification:(id:string)=>void };
    handlers.approve("shf-1"); handlers.reject("shf-1"); handlers.requestClarification("shf-1");
    assert.deepEqual(requests, role === "accountant" && op.reportReview?.phase === "accountant_review" && op.status === "pending"
      ? ["approve", "return", "clarify"] : role === "accountant" && op.reportReview?.phase === "head_returned"
        ? ["return"] : [], `${role}/${op.status}/${op.reportReview?.phase}`);
  }
});

test("SHF return confirmation sends only an API reason in a still-returnable phase", async () => {
  const hook = component("useSharedOps");
  const modal = hook.body!.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(source) === "rejectModalProps"));
  assert.ok(modal && ts.isVariableStatement(modal));
  const initial = modal.declarationList.declarations[0].initializer;
  assert.ok(initial && ts.isObjectLiteralExpression(initial));
  const submit = initial.properties.find(node => ts.isPropertyAssignment(node) && node.name.getText(source) === "onSubmit");
  assert.ok(submit && ts.isPropertyAssignment(submit));
  const js = ts.transpileModule(`return ${submit.initializer.getText(source)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  for (const [phase, reason, expected] of [
    ["accountant_review", "valid", true], ["head_returned", "valid", true],
    ["manager_returned", "valid", false], ["head_returned", "invalid", false],
  ] as const) {
    const requests: string[] = [];
    const row = shift(phase === "manager_returned" ? "rejected" : "pending", phase);
    const lock = { current:false };
    const onSubmit = new Function("rejectingId", "rejectingModule", "rejectReasons", "runOperationAction", "runSalesAction", "salesContextFor", "rejectMut", "setRejectingId", "currentRole", "actionLock", "setActionsPending", js)(
      "shf-1", "shifts", [{ key: "valid" }],
      (_id: string, action: "returnToManager", effect: () => void) => runShfReviewAction(row, "accountant", action, effect),
      (_context: unknown, _action: unknown, effect: () => void) => effect(), () => ({ operation: row, role: "accountant" }),
      { mutateAsync: async () => { requests.push("POST reject"); } }, () => {}, {current:"accountant"}, lock, () => {},
    ) as (payload: { reason: string }) => Promise<void>;
    if (expected) await onSubmit({ reason });
    else await assert.rejects(onSubmit({ reason }));
    assert.deepEqual(requests, expected ? ["POST reject"] : [], `${phase}/${reason}`);
    assert.equal(lock.current, false);
  }
});
