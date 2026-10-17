import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { ApiError, getErrorMessage } from "../../../api/errors.ts";
import {
  getShiftCorrectionEvidence,
  initialShiftCorrectionDraft,
  prepareShiftCorrectionRequest,
  runShiftReportCorrection,
} from "./shiftReportCorrection.ts";

const list = { id:"shf-op-1", moduleKey:"shifts", status:"pending", reportReview:{phase:"accountant_review"} };
const detail = {
  id:"shf-op-1", moduleKey:"shifts", status:"pending", reportReview:{phase:"accountant_review"},
  reportRevision:4, allocationVersion:2,
  payload:{
    shiftId:"admin-shift-1", reportRevision:4, allocationVersion:2,
    cashCountState:"counted", salesHalalas:11500, cardTotalHalalas:5000,
    cashActualHalalas:3000, varianceHalalas:-2000,
    aggregatorBreakdown:[{aggregator:"550e8400-e29b-41d4-a716-446655440000",amountHalalas:2500}],
    pkg6Review:{phase:"accountant_review"},
  },
  liability:{version:2,managerApprovalStatus:"approved",shares:[
    {type:"employee",id:"550e8400-e29b-41d4-a716-446655440001",name:"Employee A",amountHalalas:2000},
  ]},
};

test("COR-05 is available only for the accountant's current pending report-review phase with actual revisions", () => {
  assert.deepEqual(getShiftCorrectionEvidence(list,detail,"accountant"),{
    shiftId:"admin-shift-1",reportRevision:4,allocationVersion:2,
  });
  for (const role of ["head","branch",null]) assert.equal(getShiftCorrectionEvidence(list,detail,role),null);
  for (const status of ["approved","rejected","final-approved"])
    assert.equal(getShiftCorrectionEvidence(list,{...detail,status},"accountant"),null);
  for (const phase of ["head_review","head_returned","manager_returned","unknown",null,undefined]) {
    const review={phase};
    assert.equal(getShiftCorrectionEvidence({...list,reportReview:review},detail,"accountant"),null);
    assert.equal(getShiftCorrectionEvidence(list,{...detail,reportReview:review},"accountant"),null);
    assert.equal(getShiftCorrectionEvidence(list,{...detail,payload:{...detail.payload,pkg6Review:review}},"accountant"),null);
  }
  assert.equal(getShiftCorrectionEvidence(list,{...detail,id:"other-op"},"accountant"),null);
  assert.equal(getShiftCorrectionEvidence(list,{...detail,payload:{...detail.payload,shiftId:null}},"accountant"),null);
  assert.equal(getShiftCorrectionEvidence(list,{...detail,reportRevision:null},"accountant"),null);
  assert.equal(getShiftCorrectionEvidence(list,{...detail,reportRevision:4,payload:{...detail.payload,reportRevision:5}},"accountant"),null);
});

test("supported review absence follows Backend fallback, while missing or inconsistent versions fail closed", () => {
  const {reportReview:_lr,...listWithoutReview}=list;
  const {reportReview:_dr,...detailWithoutReview}=detail;
  assert.deepEqual(getShiftCorrectionEvidence(listWithoutReview,detailWithoutReview,"accountant"),{
    shiftId:"admin-shift-1",reportRevision:4,allocationVersion:2,
  });
  assert.deepEqual(getShiftCorrectionEvidence({...list,reportReview:null},{...detail,reportReview:null},"accountant"),{
    shiftId:"admin-shift-1",reportRevision:4,allocationVersion:2,
  });
  assert.equal(getShiftCorrectionEvidence(list,{...detail,allocationVersion:null},"accountant"),null);
  assert.equal(getShiftCorrectionEvidence(list,{...detail,liability:{...detail.liability,version:3}},"accountant"),null);
  assert.equal(getShiftCorrectionEvidence(list,{...detail,payload:{...detail.payload,allocationVersion:null}},"accountant"),null);
  const noAllocation={...detail,allocationVersion:null,payload:{...detail.payload,allocationVersion:null},liability:null};
  assert.deepEqual(getShiftCorrectionEvidence(list,noAllocation,"accountant"),{
    shiftId:"admin-shift-1",reportRevision:4,allocationVersion:null,
  });
});

test("draft exposes only present valid money and preserves separate SAR and halala units", () => {
  const draft=initialShiftCorrectionDraft(detail);
  assert.equal(draft.cardPaymentsSar,"50.00");
  assert.equal(draft.countedCashSar,"30.00");
  assert.equal(draft.aggregators?.[0].amountSar,"25.00");
  assert.equal(draft.shares?.[0].amountSar,"20.00");
  assert.equal(initialShiftCorrectionDraft({payload:{cashCountState:"unknown",cardTotalHalalas:null}}).cardPaymentsSar,null);
  assert.equal(initialShiftCorrectionDraft({payload:{cashCountState:"counted",cashActualHalalas:4.5}}).countedCashSar,null);
});

test("correction payload uses exact decimal strings, expected versions, and excludes gross sales", () => {
  const draft={...initialShiftCorrectionDraft(detail),cardPaymentsSar:"45.25",countedCashSar:"28.00",reason:"Verified with source receipts"};
  const request=prepareShiftCorrectionRequest(detail,draft);
  assert.deepEqual(request,{
    expected_revision:4,
    expected_allocation_version:2,
    reason:"Verified with source receipts",
    changes:{card_payments:"45.25",counted_cash:"28.00"},
  });
  assert.equal("total_sales" in request!.changes,false);
  assert.equal(prepareShiftCorrectionRequest(detail,{...draft,cardPaymentsSar:"45.259"}),null);
  assert.equal(prepareShiftCorrectionRequest(detail,{...draft,reason:"  "}),null);
  assert.equal(prepareShiftCorrectionRequest(detail,{...initialShiftCorrectionDraft(detail),reason:"reason"}),null,"no-op is not posted");
  assert.equal(prepareShiftCorrectionRequest(detail,{...draft,cardPaymentsSar:"50",countedCashSar:"30"}),null,
    "equivalent decimal formatting does not create a financial correction");
});

test("allocation changes use integer halalas and require the current allocation version", () => {
  const draft={...initialShiftCorrectionDraft(detail),reason:"Correct responsibility",shares:[
    {type:"employee",id:"550e8400-e29b-41d4-a716-446655440001",amountSar:"12.50"},
    {type:"employee",id:"550e8400-e29b-41d4-a716-446655440002",amountSar:"7.50"},
  ]};
  const request=prepareShiftCorrectionRequest(detail,draft);
  assert.deepEqual(request?.shortage_allocations,[
    {type:"employee",id:"550e8400-e29b-41d4-a716-446655440001",amount:1250},
    {type:"employee",id:"550e8400-e29b-41d4-a716-446655440002",amount:750},
  ]);
  assert.equal(request?.expected_allocation_version,2);
  assert.equal(prepareShiftCorrectionRequest(detail,{...draft,shares:[{type:"employee",id:"bad-id",amountSar:"20.00"}]}),null);
  const noVersion={...detail,allocationVersion:null,liability:null,payload:{...detail.payload,allocationVersion:null}};
  assert.equal(prepareShiftCorrectionRequest(noVersion,{...initialShiftCorrectionDraft(noVersion),reason:"Correct allocation",shares:[
    {type:"employee",id:"550e8400-e29b-41d4-a716-446655440001",amountSar:"20.00"},
  ]}),null);
});

test("aggregator correction maps only the contract id and SAR amount without inventing labels or fields", () => {
  const initial=initialShiftCorrectionDraft(detail);
  const draft={...initial,reason:"Verified aggregator statement",aggregators:[
    {...initial.aggregators![0],amountSar:"24.99"},
  ]};
  assert.deepEqual(prepareShiftCorrectionRequest(detail,draft),{
    expected_revision:4,expected_allocation_version:2,reason:"Verified aggregator statement",
    changes:{aggregators:[{aggregator_id:"550e8400-e29b-41d4-a716-446655440000",amount:"24.99"}]},
  });
  const malformed=initialShiftCorrectionDraft({payload:{aggregatorBreakdown:[{aggregator:"not-a-uuid",amountHalalas:100}]}});
  assert.equal(malformed.aggregators,null,
    "malformed app identity is not exposed as an editable application name");
});

test("fresh detail, role, phase and revisions are rechecked before a single mutation", async () => {
  let posts=0;
  const lock={current:false};
  const draft={...initialShiftCorrectionDraft(detail),cardPaymentsSar:"45.00",reason:"Verified receipts"};
  const send=async (_shiftId:string,_body:unknown)=>{posts++;};
  assert.equal(await runShiftReportCorrection(list,detail,"accountant",draft,async()=>detail,send,lock),true);
  assert.equal(posts,1);
  for(const fresh of [
    {...detail,reportRevision:5,payload:{...detail.payload,reportRevision:5}},
    {...detail,status:"final-approved"},
    {...detail,reportReview:{phase:"head_review"}},
    {...detail,allocationVersion:3,liability:{...detail.liability,version:3},payload:{...detail.payload,allocationVersion:3}},
  ]) assert.equal(await runShiftReportCorrection(list,detail,"accountant",draft,async()=>fresh,send,lock),false);
  assert.equal(await runShiftReportCorrection(list,detail,"head",draft,async()=>detail,send,lock),false);
  assert.equal(posts,1,"stale, final, unauthorized and non-accountant attempts never POST");
  let release!:()=>void;
  const pending=new Promise<void>(resolve=>{release=resolve;});
  const first=runShiftReportCorrection(list,detail,"accountant",draft,async()=>detail,async()=>{await pending;posts++;},lock);
  assert.equal(await runShiftReportCorrection(list,detail,"accountant",draft,async()=>detail,send,lock),false);
  release();
  assert.equal(await first,true);
  assert.equal(posts,2,"double click sends once");
});

test("correction mutation hook posts to the dedicated endpoint and invalidates shift and review data", async () => {
  const source=readFileSync(new URL("../../../api/queries/shifts.ts",import.meta.url),"utf8");
  const parsed=ts.createSourceFile("shifts.ts",source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS);
  const hook=parsed.statements.find((node):node is ts.FunctionDeclaration=>
    ts.isFunctionDeclaration(node)&&node.name?.text==="useAccountantShiftReportCorrection");
  assert.ok(hook);
  const compiled=ts.transpileModule(hook.getText(parsed),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  const posts:unknown[]=[]; const invalidated:unknown[]=[]; const errors:string[]=[];
  const useHook=new Function("exports","useQueryClient","useMutation","api","queryKeys","toast","getErrorMessage",
    `${compiled}\nreturn useAccountantShiftReportCorrection;`)(
    {},
    ()=>({invalidateQueries:async(value:unknown)=>{invalidated.push(value);}}),
    (config:unknown)=>config,
    {post:async(path:string,body:unknown)=>{posts.push({path,body});return {data:{revision_number:5,allocation_version:3}};}},
    {operation:(id:string)=>["operations",id],accDashboard:["accountant","dashboard"]},
    {success:()=>{},error:(message:string)=>errors.push(message)},getErrorMessage,
  ) as ()=>{mutationFn:(vars:{operationId:string;shiftId:string;body:unknown})=>Promise<unknown>;onSuccess:(result:unknown,vars:{operationId:string})=>void;onError:(e:Error)=>void};
  const mutation=useHook();
  const body={expected_revision:4,expected_allocation_version:2,reason:"Verified",changes:{card_payments:"45.00"}};
  assert.deepEqual(await mutation.mutationFn({operationId:"shf-op-1",shiftId:"admin-shift-1",body}),{revision_number:5,allocation_version:3});
  assert.deepEqual(posts,[{path:"/accountant/shifts/admin-shift-1/corrections",body}]);
  mutation.onSuccess({}, {operationId:"shf-op-1"});
  assert.ok(invalidated.some(x=>JSON.stringify(x)==='{"queryKey":["operations","shf-op-1"]}'));
  assert.ok(invalidated.some(x=>JSON.stringify(x)==='{"queryKey":["operations"]}'));
  assert.ok(invalidated.some(x=>JSON.stringify(x)==='{"queryKey":["shifts"]}'));
  mutation.onError(new ApiError({message:"STALE_REPORT_REVISION"},409));
  mutation.onError(new ApiError({error:{code:"GROSS_SALES_MODIFICATION_PROHIBITED",message:"forbidden",messageAr:"إجمالي المبيعات محظور"}},422));
  const forbidden=new ApiError({message:"NOT_AN_ACCOUNTANT"},403);
  mutation.onError(forbidden);
  mutation.onError(new Error("Network Error"));
  assert.deepEqual(errors,[getErrorMessage(new ApiError({message:"STALE_REPORT_REVISION"},409),"ar"),
    "إجمالي المبيعات محظور",getErrorMessage(forbidden,"ar"),"Network Error"]);
});

test("the existing SHF detail panel mounts COR-05 only through the accountant evidence gate", () => {
  const screen=readFileSync(new URL("./CompanyDashboard.tsx",import.meta.url),"utf8");
  const panelFile=ts.createSourceFile("CompanyDashboard.tsx",screen,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
  const panel=panelFile.statements.find((node):node is ts.FunctionDeclaration=>
    ts.isFunctionDeclaration(node)&&node.name?.text==="ShiftOpPanel");
  const form=panelFile.statements.find((node):node is ts.FunctionDeclaration=>
    ts.isFunctionDeclaration(node)&&node.name?.text==="ShiftReportCorrectionForm");
  assert.ok(panel?.body&&form?.body);
  assert.match(panel.getText(panelFile),/!forHead && op\?\.branchId && getShiftCorrectionEvidence\(op,detail,"accountant"\)/);
  assert.match(form.getText(panelFile),/hasRoleGrant\(user,"accountant"\)/);
  assert.match(form.getText(panelFile),/financialAccessGeneration\(queryClient\)/);
  assert.match(form.getText(panelFile),/completed \|\| submitLock\.current/,
    "a successful form cannot submit twice while its invalidations are refreshing");
  assert.match(form.getText(panelFile),/detail\.payload\?\.salesHalalas/);
  assert.doesNotMatch(form.getText(panelFile),/name.*aggregatorId|aggregatorId.*name/,
    "the API aggregator identifier is never presented as an application name");
  assert.match(screen,/useShiftVarianceAllocations, useAccountantShiftReportCorrection/,
    "COR-05 uses its own hook and does not replace M-8's allocation mutation");
});
