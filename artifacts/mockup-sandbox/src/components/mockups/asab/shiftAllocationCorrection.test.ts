import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { ApiError, getErrorMessage } from "../../../api/errors.ts";
import {
  getShfAllocationEvidence, parsePositiveSarHalalas, prepareShfAllocations, remainingShfAllocationHalalas,
  runShfAllocationCorrection,
} from "./shiftAllocationCorrection.ts";

const list = { id:"op-fin01", module:"shifts", status:"pending", reportReview:{phase:"accountant_review"} };
const detail = { id:"op-fin01", moduleKey:"shifts", status:"pending", reportReview:{phase:"accountant_review"},
  payload:{ shiftId:"admin-shift-id", legacyShiftId:"cashier-shift-id", cashCountState:"counted", varianceHalalas:-2000 } };
const rows = [{empNumber:"3001", amountSar:"12.50"},{empNumber:"3002", amountSar:"7.50"}];

test("only an accountant with a pending counted shortage and current phase may correct", () => {
  assert.deepEqual(getShfAllocationEvidence(list, detail, "accountant"), {shiftId:"admin-shift-id", shortageHalalas:2000});
  assert.deepEqual(getShfAllocationEvidence({...list,reportReview:null}, {...detail,reportReview:null}, "accountant"),
    {shiftId:"admin-shift-id", shortageHalalas:2000}, "a null review falls back to the Backend accountant phase");
  const {reportReview: _listReview, ...listWithoutReview} = list;
  const {reportReview: _detailReview, ...detailWithoutReview} = detail;
  assert.deepEqual(getShfAllocationEvidence(listWithoutReview,detailWithoutReview,"accountant"),
    {shiftId:"admin-shift-id",shortageHalalas:2000}, "an absent phase is allowed by the Backend");
  assert.equal(getShfAllocationEvidence({...list,reportReview:{phase:"unknown"}},detail,"accountant"),null,
    "an explicit unknown phase is not absence");
  assert.equal(getShfAllocationEvidence(listWithoutReview,{...detailWithoutReview,
    payload:{...detail.payload,pkg6Review:{phase:"unknown"}}},"accountant"),null,
    "an unknown payload review phase also remains read-only");
  for (const role of ["head","branch",null]) assert.equal(getShfAllocationEvidence(list,detail,role),null);
  for (const status of ["approved","rejected","final-approved"]) {
    assert.equal(getShfAllocationEvidence({...list,status},detail,"accountant"),null);
    assert.equal(getShfAllocationEvidence(list,{...detail,status},"accountant"),null);
  }
  for (const phase of ["head_review","head_returned","manager_returned","future_phase"]) {
    assert.equal(getShfAllocationEvidence({...list,reportReview:{phase}},detail,"accountant"),null);
    assert.equal(getShfAllocationEvidence(list,{...detail,reportReview:{phase}},"accountant"),null);
  }
  assert.equal(getShfAllocationEvidence(list,{...detail,reportReview:{phase:"head_returned"},payload:{...detail.payload,pkg6Review:{phase:"accountant_review"}}},"accountant"),null,
    "conflicting review evidence must fail closed");
  assert.equal(getShfAllocationEvidence(list,{...detail,payload:{...detail.payload, cashCountState:"unknown"}},"accountant"),null);
  assert.equal(getShfAllocationEvidence(list,{...detail,payload:{...detail.payload, cashCountState:null}},"accountant"),null);
  for (const varianceHalalas of [0,100,null,1.5,Number.MAX_SAFE_INTEGER+1])
    assert.equal(getShfAllocationEvidence(list,{...detail,payload:{...detail.payload, varianceHalalas}},"accountant"),null);
  assert.equal(getShfAllocationEvidence(list,{...detail,payload:{...detail.payload, shiftId:null}},"accountant"),null,
    "legacyShiftId must never substitute for the Admin shiftId");
  assert.equal(getShfAllocationEvidence(list,{...detail,id:"another-op"},"accountant"),null);
  assert.equal(getShfAllocationEvidence(list,{...detail,moduleKey:"sales"},"accountant"),null);
});

test("review absence permits correction, but an explicitly null or undefined phase denies it", () => {
  const missingPhase = { return_reason: "existing review without phase" };
  assert.deepEqual(getShfAllocationEvidence(
    {...list,reportReview:missingPhase},
    {...detail,reportReview:missingPhase,payload:{...detail.payload,pkg6Review:missingPhase}},
    "accountant",
  ),{shiftId:"admin-shift-id",shortageHalalas:2000});
  assert.deepEqual(getShfAllocationEvidence({...list,reportReview:null},
    {...detail,reportReview:null,payload:{...detail.payload,pkg6Review:null}},"accountant"),
    {shiftId:"admin-shift-id",shortageHalalas:2000},"a null review is the API's absent-review fallback");
  for (const phase of [null,undefined]) {
    const review = {phase};
    assert.equal(getShfAllocationEvidence({...list,reportReview:review},detail,"accountant"),null,"list phase");
    assert.equal(getShfAllocationEvidence(list,{...detail,reportReview:review},"accountant"),null,"detail phase");
    assert.equal(getShfAllocationEvidence(list,{...detail,payload:{...detail.payload,pkg6Review:review}},"accountant"),
      null,"payload phase");
  }
});

test("an explicit null phase never starts the allocation POST", async () => {
  let posts = 0;
  const lock = {current:false};
  for (const invalid of [
    {list:{...list,reportReview:{phase:null}},detail},
    {list,detail:{...detail,reportReview:{phase:null}}},
    {list,detail:{...detail,payload:{...detail.payload,pkg6Review:{phase:null}}}},
  ]) {
    assert.equal(await runShfAllocationCorrection(invalid.list,"accountant",rows,async()=>invalid.detail,
      async()=>{posts++;},lock),false);
  }
  assert.equal(posts,0);
});

test("SAR inputs become exact positive integer halalas without rounding", () => {
  assert.equal(parsePositiveSarHalalas("12.50"),1250);
  assert.equal(parsePositiveSarHalalas("0.01"),1);
  assert.equal(parsePositiveSarHalalas("7.5"),750);
  for (const value of ["0","0.00","0.001","1.999","-1","1e2","1,000","abc","", "90071992547409.92"])
    assert.equal(parsePositiveSarHalalas(value),null,value);
  assert.deepEqual(prepareShfAllocations(rows,2000),[
    {empNumber:"3001",amountHalalas:1250},{empNumber:"3002",amountHalalas:750},
  ]);
  assert.deepEqual(prepareShfAllocations([{empNumber:"3001",amountSar:"20.00"}],2000),
    [{empNumber:"3001",amountHalalas:2000}], "FIN-01 assigns the full 2000 halalas to employee X");
  assert.deepEqual(prepareShfAllocations([{empNumber:"3001",amountSar:"0.01"}],1),
    [{empNumber:"3001",amountHalalas:1}], "a one-halala shortage needs an allocation");
  assert.equal(remainingShfAllocationHalalas([{empNumber:"3001",amountSar:"19.99"}],2000),1);
  assert.equal(remainingShfAllocationHalalas([{empNumber:"3001",amountSar:"20.01"}],2000),-1);
  assert.equal(remainingShfAllocationHalalas([{empNumber:"3001",amountSar:"20.00"}],2000),0);
  for (const candidate of [[], [{empNumber:"3001",amountSar:"19.99"}], [{empNumber:"",amountSar:"20.00"}],
    [{empNumber:"3001",amountSar:"20.01"}], [{empNumber:"3001",amountSar:"0.01"}],
    [{empNumber:"3001",amountSar:"20.001"}], [{empNumber:"3001",amountSar:""}]])
    assert.equal(prepareShfAllocations(candidate,2000),null);
  assert.equal(prepareShfAllocations([{empNumber:"3001",amountSar:"20.00"}],0),null);
});

test("fresh Backend evidence is rechecked before mutation and repeated clicks are locked", async () => {
  const lock = {current:false};
  const sent:unknown[] = [];
  const load = async () => detail;
  const send = async (shiftId:string, allocations:unknown) => {sent.push({shiftId,allocations});};
  assert.equal(await runShfAllocationCorrection(list,"accountant",rows,load,send,lock),true);
  assert.deepEqual(sent,[{shiftId:"admin-shift-id",allocations:[
    {empNumber:"3001",amountHalalas:1250},{empNumber:"3002",amountHalalas:750},
  ]}]);
  for (const stale of [
    {...detail,status:"approved"},
    {...detail,reportReview:{phase:"head_returned"}},
    {...detail,payload:{...detail.payload, varianceHalalas:-2100}},
  ]) assert.equal(await runShfAllocationCorrection(list,"accountant",rows,async()=>stale,send,lock),false);
  assert.equal(sent.length,1,"no forbidden or stale mutation");
  let release!:()=>void;
  const pending = new Promise<void>(resolve=>{release=resolve;});
  const first = runShfAllocationCorrection(list,"accountant",rows,load,async()=>{await pending;},lock);
  assert.equal(await runShfAllocationCorrection(list,"accountant",rows,load,send,lock),false);
  release();
  assert.equal(await first,true);
  assert.equal(sent.length,1,"double click does not send a second mutation");
  await assert.rejects(runShfAllocationCorrection(list,"accountant",rows,load,async()=>{throw new Error("HTTP 422");},lock),/HTTP 422/);
  assert.equal(lock.current,false,"failed response releases the local double-click lock");
  assert.equal(await runShfAllocationCorrection(list,"accountant",rows,load,send,lock),true);
  assert.equal(sent.length,2,"a deliberate retry after a failure sends once");
});

test("existing SHF panel wires only the accountant form and the existing variance endpoint", () => {
  const screen = readFileSync(new URL("./CompanyDashboard.tsx",import.meta.url),"utf8");
  const shifts = readFileSync(new URL("../../../api/queries/shifts.ts",import.meta.url),"utf8");
  assert.match(screen, /getShfAllocationEvidence\(op, detail, forHead \? "head" : "accountant"\)/);
  assert.match(screen, /<ShiftAllocationForm/);
  assert.match(screen, /<VarEmpRow key=\{i\} branchId=\{op\.branchId\}/, "reuse the existing employee lookup row");
  assert.doesNotMatch(screen, /function ShiftSplitRow\(/, "no substitute employee row is invented");
  assert.match(screen, /runShfAllocationCorrection\(/);
  assert.match(shifts, /\/company\/me\/shifts\/\$\{shiftId\}\/variance-allocations/);
  assert.match(shifts, /queryKeys\.operation\(vars\.operationId\)/);
  assert.doesNotMatch(shifts, /expected_revision|expected_allocation_version/);
});

test("variance hook posts only the allocation body and refreshes list, detail, and shifts", async () => {
  const source = ts.createSourceFile("shifts.ts",readFileSync(new URL("../../../api/queries/shifts.ts",import.meta.url),"utf8"),
    ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS);
  const hook = source.statements.find((node):node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === "useShiftVarianceAllocations");
  assert.ok(hook);
  const compiled = ts.transpileModule(hook.getText(source),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText;
  const posts:unknown[] = [];
  const invalidated:unknown[] = [];
  const errors:string[] = [];
  const result = {operationId:"op-fin01",allocations:[{employeeId:"employee-x",employeeName:"Employee X",amountHalalas:2000}]};
  const useHook = new Function("exports","useQueryClient","useMutation","api","queryKeys","toast","getErrorMessage",
    `${compiled}\nreturn useShiftVarianceAllocations;`)(
    {},
    () => ({invalidateQueries:async (value:unknown)=>{invalidated.push(value);}}),
    (config:unknown)=>config,
    {post:async (path:string,body:unknown)=>{posts.push({path,body});return {data:result};}},
    {operation:(id:string)=>["operations",id]},
    {success:()=>{},error:(message:string)=>{errors.push(message);}},
    getErrorMessage,
  ) as () => {
    mutationFn:(vars:{operationId:string;shiftId:string;allocations:Array<{empNumber:string;amountHalalas:number}>})=>Promise<typeof result>;
    onSuccess:(result:typeof result,vars:{operationId:string})=>void;
    onError:(error:Error)=>void;
  };
  const mutation = useHook();
  const vars = {operationId:"op-fin01",shiftId:"admin-shift-id",allocations:[{empNumber:"3001",amountHalalas:2000}]};
  assert.deepEqual(await mutation.mutationFn(vars),result);
  assert.deepEqual(posts,[{path:"/company/me/shifts/admin-shift-id/variance-allocations",
    body:{allocations:[{empNumber:"3001",amountHalalas:2000}]}}]);
  mutation.onSuccess(result,vars);
  assert.deepEqual(invalidated,[
    {queryKey:["shifts"]},{queryKey:["operations"]},{queryKey:["operations","op-fin01"]},
  ]);
  mutation.onError(new ApiError({message:"REPORT_RETURN_CYCLE_REQUIRED"},409));
  mutation.onError(new ApiError({error:{code:"INVALID_ALLOCATION",message:"Invalid",messageAr:"التوزيع غير صالح"}},422));
  assert.deepEqual(errors,["يجب إتمام دورة الإرجاع للتعديل أولًا","التوزيع غير صالح"]);
  assert.equal(posts.length,1,"error presentation does not retry the POST");
});
