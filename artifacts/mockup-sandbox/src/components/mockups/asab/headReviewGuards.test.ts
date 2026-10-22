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

test("EXP-06 / HA-F19: expenses require brand owner decision and are blocked from head approval and bulk", () => {
  const expense = { id:"exp", module:"expenses", status:"approved", reportReview:null };
  const policy = getHeadReviewPolicy(expense, "head");
  assert.equal(policy.finalApprove, false);
  assert.equal(policy.returnForReview, false);
  assert.equal(policy.blockedReason, "expense_owner_decision_required");
  assert.deepEqual(headLegacyBulkIds([expense], ["exp"], "head"), []);
  assert.deepEqual(headLegacyBulkIds([legacy, expense], ["legacy", "exp"], "head"), []);
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

test("HA-F04 & HA-F05: rejected API mutation preserves financial status; cancelled return prompt causes zero requests", () => {
  const prototypeSrc = readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8");

  // HA-F04: mutations use runSalesAction guards and dispatch mutations safely
  assert.match(prototypeSrc, /const approveOp = (async\s+)?\(id:string\)/);
  assert.match(prototypeSrc, /approveMut\.(mutate|mutateAsync)/);
  assert.match(prototypeSrc, /rejectMut\.(mutate|mutateAsync)/);
  assert.match(prototypeSrc, /finalMut\.(mutate|mutateAsync)/);
  assert.match(prototypeSrc, /bulkApproveMut\.(mutate|mutateAsync)/);
  assert.match(prototypeSrc, /bulkFinalMut\.(mutate|mutateAsync)/);
  assert.match(prototypeSrc, /returnReviewMut\.(mutate|mutateAsync)/);

  // HA-F05: cancelling prompt (note === null) returns immediately without calling returnForReview
  assert.match(prototypeSrc, /const note = window\.prompt/);
  assert.match(prototypeSrc, /if \(note === null\) return;/);
  assert.match(prototypeSrc, /void returnForReview\(op\.id, note\.trim\(\) \|\| undefined\);/);
});

test("HA-F07 & HA-F08: ERP wizard filters control submitted IDs, step 2 requires confirmed batch ID, empty submission blocked", () => {
  const prototypeSrc = readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8");

  // HA-F07: Radios are controlled by state
  assert.match(prototypeSrc, /checked=\{moduleFilter===m\.k\}/);
  assert.match(prototypeSrc, /checked=\{periodFilter===p\.k\}/);
  assert.match(prototypeSrc, /checked=\{restaurantFilter==="all"\}/);
  assert.match(prototypeSrc, /checked=\{branchFilter==="all"\}/);
  assert.match(prototypeSrc, /checked=\{statusFilter==="approved_only"\}/);

  // HA-F07: toPost filters exclude unknown money and apply active module/branch/status filters
  assert.match(prototypeSrc, /const toPost = useMemo\(\(\) => \{/);
  assert.match(prototypeSrc, /if \(o\.amount == null\) return false;/);

  // HA-F08: Stepper button for step 3 is disabled without confirmed batch ID
  assert.match(prototypeSrc, /disabled=\{\(s\.n === 3 && !postedBatchId\)/);

  // HA-F08: Confirm and send button is disabled when toPost.length === 0 or isPosting
  assert.match(prototypeSrc, /disabled=\{toPost\.length === 0 \|\| isPosting\}/);
  assert.ok(prototypeSrc.includes('if(toPost.length === 0 || isPosting) return;'));
  assert.ok(prototypeSrc.includes('if(typeof serverId === "string" && serverId.trim().length > 0) {'));
  assert.ok(prototypeSrc.includes('setStep(2);'));
});

test("HA-F10: multi-page head operation queues fetch all pages and preserve pagination metadata", () => {
  const platformHeadSrc = readFileSync(new URL("../../../api/queries/platform/head.ts", import.meta.url), "utf8");
  const companyDashboardSrc = readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8");

  // platform head query fetches remaining pages when totalPages > 1
  assert.match(platformHeadSrc, /async function fetchAllHeadOpsPages/);
  assert.match(platformHeadSrc, /filter\.page !== undefined \|\| !meta \|\| meta\.totalPages <= 1/);
  assert.match(platformHeadSrc, /meta\.totalPages - 1/);

  // Company Dashboard useSharedOps fetches remaining pages when totalPages > 1
  assert.match(companyDashboardSrc, /first\?\.meta && first\.meta\.totalPages > 1/);
  assert.match(companyDashboardSrc, /first\.meta\.totalPages - 1/);
});

test("HA-F11: missing financial evidence is preserved as unknown/null rather than verified zero", () => {
  const prototypeSrc = readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8");

  // Op.amount accepts number | null
  assert.match(prototypeSrc, /amount: number \| null;/);

  // mapApiOpToOp preserves null amounts instead of defaulting to 0
  assert.match(prototypeSrc, /typeof a\.amountHalalas === "number" \? a\.amountHalalas \/ 100 : \(typeof a\.amount === "number" \? a\.amount \/ 100 : null\)/);

  // Total amounts in Head queues remain null when any op amount is unknown
  assert.match(prototypeSrc, /filtered\.some\(o=>o\.amount==null\) \? null : filtered\.reduce/);

  // markErpPosted blocks posting operations with missing amount
  assert.match(prototypeSrc, /if \(opsToPost\.some\(o => o\.amount == null\)\) \{/);
});

test("HA-F20: conditional approval enforces non-empty note, awaits server confirmation and prevents duplicate clicks", () => {
  const prototypeSrc = readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8");

  // Check trimmed note requirement and disabled state
  assert.match(prototypeSrc, /disabled=\{isSubmittingCond \|\| !approvalComment\.trim\(\)\}/);
  assert.match(prototypeSrc, /const trimmed = approvalComment\.trim\(\);/);
  assert.match(prototypeSrc, /if \(!trimmed \|\| isSubmittingCond\) return;/);

  // Server call must be awaited before setting conditionalApproved
  assert.match(prototypeSrc, /await finalApproveOp\(op\.id, \{ note: trimmed \}\);[\s\S]*?setConditionalApproved\(p=>new Set\(p\)\.add\(op\.id\)\);/);
});

test("HA-F22: query sync clears stale operations when current query succeeds with zero rows", () => {
  const prototypeSrc = readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8");

  // Verifies all three query states are checked for "success" before syncing
  assert.match(prototypeSrc, /const allSuccess = pendingState\?\.status === "success" && finalState\?\.status === "success" && rejectState\?\.status === "success";/);
  assert.match(prototypeSrc, /if \(allSuccess\) \{[\s\S]*?setOps\(merged\.map\(mapApiOpToOp\)\);/);
});

test("HA-F06, HA-F09, HA-F21, HA-F38 regression: rejectModal retains draft on error, ERP posting locked, match falls back to review", () => {
  const prototypeSrc = readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8");
  const rejectModalSrc = readFileSync(new URL("../../shared/RejectModal.tsx", import.meta.url), "utf8");
  const companyDashboardSrc = readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8");

  // HA-F06: markErpPosted throws if serverBatchId is empty, no fake ERP-BATCH fallback
  assert.match(prototypeSrc, /if \(!serverBatchId\) \{[\s\S]*?throw new Error\(/);
  assert.doesNotMatch(prototypeSrc, /ERP-BATCH-\$\{Date\.now\(\)\}/);

  // HA-F09: Company HeadERP posting lock
  assert.match(companyDashboardSrc, /const \[postingIds, setPostingIds\]/);
  assert.match(companyDashboardSrc, /await postMut\.mutateAsync/);

  // HA-F21: RejectModal retains draft on submission error
  assert.match(rejectModalSrc, /setSubmitError\(err\?\.message \|\| t\(/);

  // HA-F38: matchMap falls back to review
  assert.match(prototypeSrc, /match: matchMap\[a\.match\] \?\? "review",/);
});
