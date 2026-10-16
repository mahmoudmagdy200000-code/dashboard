import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { getHeadReviewPolicy, headLegacyBulkIds, runHeadFinalApproval } from "./headReviewGuards.ts";

const shift = { id:"shf", module:"shifts", status:"approved", reportReview:{phase:"head_review"} };
const day = { id:"day", module:"sales", status:"approved", reportReview:{phase:"head_review", memberships:[{report_revision:"revision-id"}]} };
const legacy = { id:"legacy", module:"sales", status:"approved", reportReview:null };

test("head alone can final approve or return an approved SHF in head_review", () => {
  assert.deepEqual(getHeadReviewPolicy(shift,"head"), { finalApprove:true, returnForReview:true, blockedReason:null });
  for (const role of ["accountant","branch",null]) {
    assert.equal(getHeadReviewPolicy(shift,role).finalApprove,false);
    assert.equal(getHeadReviewPolicy(shift,role).returnForReview,false);
  }
  for (const operation of [{...shift,status:"pending"},{...shift,status:"final-approved"},{...shift,reportReview:null},{...shift,reportReview:{phase:"head_returned"}}]) {
    assert.equal(getHeadReviewPolicy(operation,"head").finalApprove,false);
    assert.equal(getHeadReviewPolicy(operation,"head").returnForReview,false);
  }
  assert.equal(getHeadReviewPolicy(shift,"head",{...shift,status:"final-approved"}).finalApprove,false);
});

test("PKG-6 day cannot be final approved from unlinked membership revision IDs", () => {
  const policy = getHeadReviewPolicy(day,"head");
  assert.equal(policy.finalApprove,false);
  assert.ok(policy.blockedReason);
  assert.equal(getHeadReviewPolicy(legacy,"head").finalApprove,true);
  assert.equal(getHeadReviewPolicy({...legacy,status:"final-approved"},"head").finalApprove,false);
});

test("mixed and protected bulk are blocked while independent Legacy bulk stays available", () => {
  assert.deepEqual(headLegacyBulkIds([legacy], ["legacy"], "head"),["legacy"]);
  for (const ids of [["shf"],["day"],["legacy","shf"],["legacy","day"]]) {
    assert.deepEqual(headLegacyBulkIds([legacy,shift,day], ids, "head"),[]);
  }
  assert.deepEqual(headLegacyBulkIds([legacy], ["legacy"], "accountant"),[]);
  assert.deepEqual(headLegacyBulkIds([legacy], ["legacy"], "head", () => ({...legacy,reportReview:day.reportReview})),[]);
});

test("fresh SHF failure stops before day; a double click cannot launch a second request", async () => {
  const lock = { current:false };
  const sent:string[] = [];
  let release!:()=>void;
  const gate = new Promise<void>(resolve => { release=resolve; });
  const first = runHeadFinalApproval(shift,"head",async()=>shift,async()=>{ sent.push("shf"); await gate; },lock);
  assert.equal(await runHeadFinalApproval(shift,"head",async()=>shift,async()=>sent.push("duplicate"),lock),false);
  release();
  assert.equal(await first,true);
  await assert.rejects(runHeadFinalApproval(shift,"head",async()=>shift,async()=>{throw Error("409");},lock));
  assert.equal(await runHeadFinalApproval(day,"head",async()=>day,async()=>sent.push("day"),lock),false);
  assert.deepEqual(sent,["shf"]);
  assert.equal(await runHeadFinalApproval(shift,"head",async()=>({...shift,reportReview:{phase:"head_returned"}}),async()=>sent.push("stale"),lock),false);
  assert.deepEqual(sent,["shf"]);
});

test("existing head screens expand SHF details, hide final actions and disable protected bulk", () => {
  const source = ts.createSourceFile("CompanyDashboard.tsx", readFileSync(new URL("./CompanyDashboard.tsx",import.meta.url),"utf8"), ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
  const component = (name:string) => {
    const fn = source.statements.find((node):node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text===name);
    assert.ok(fn?.body, `${name} missing`);
    return fn.getText(source);
  };
  const modulePage = component("HeadModulePage");
  const pending = component("HeadPending");
  const row = component("OpRow");
  const shared = component("useSharedOps");
  assert.match(modulePage,/expandedId/);
  assert.match(modulePage,/expanded=\{expandedId===op\.id\} onToggle=/);
  assert.doesNotMatch(modulePage,/alert\(/);
  assert.match(row,/op\.module==="shifts" && <ShiftOpPanel/);
  assert.match(row,/headPolicy\.finalApprove/);
  assert.match(row,/headPolicy\.returnForReview/);
  assert.match(row,/\{isLocked && <span/);
  assert.match(pending,/headLegacyBulkIds/);
  assert.match(modulePage,/headLegacyBulkIds/);
  assert.doesNotMatch(modulePage,/awaitingHead\.forEach/);
  assert.match(shared,/runHeadFinalApproval\(operation, currentRole\.current, loadFreshDetail/);
  assert.match(shared,/actionLock\.current/);
});
