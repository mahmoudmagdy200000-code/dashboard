import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const shiftsPath = new URL("./shifts.ts", import.meta.url);
const source = ts.createSourceFile("shifts.ts", readFileSync(shiftsPath, "utf8"), ts.ScriptTarget.Latest, true);
const names = ["historyRequestParams", "historyPageTarget", "historyBranchOptions", "useShiftsHistory"];
const declarations = source.statements.filter(node =>
  ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text),
);
assert.equal(declarations.length, names.length, "history functions must exist");
const compiled = ts.transpileModule(declarations.map(node => node.getText(source)).join("\n"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const calls: Array<{url:string; params:Record<string,unknown>}> = [];
const api = {get: async (url:string, config:{params:Record<string,unknown>}) => {
  calls.push({url, params:config.params});
  const hasFin01 = config.params.dateFrom === "2026-10-15" && config.params.branchId !== "branch-b";
  return {data:{data:hasFin01?[{id:"FIN-01"}]:[],meta:{page:config.params.page,pageSize:config.params.pageSize,total:hasFin01?1:0,totalPages:hasFin01?1:0}}};
}};
const queryKeys = {shifts:(filter:unknown) => ["shifts","history",filter]};
const useQuery = (config:unknown) => config;
const helpers = new Function("exports","useQuery","queryKeys","api",compiled +
  "\nreturn {historyRequestParams,historyPageTarget,historyBranchOptions,useShiftsHistory};"
)({},useQuery,queryKeys,api);
const {historyRequestParams,historyPageTarget,historyBranchOptions,useShiftsHistory} = helpers;

test("history request sends only supported filters, a valid page and at most 100 rows", () => {
  assert.deepEqual(historyRequestParams({
    dateFrom:"2026-10-15",dateTo:"2026-10-16",branchId:"branch-a",
    page:2,pageSize:150,status:"closed",unsupported:"internal",
  }),{dateFrom:"2026-10-15",dateTo:"2026-10-16",branchId:"branch-a",page:2,pageSize:100});
  assert.deepEqual(historyRequestParams({page:-1,pageSize:0,status:"all"}),{page:1,pageSize:20});
  assert.deepEqual(historyRequestParams({page:1.5,pageSize:Number.NaN,branchId:"all"}),{page:1,pageSize:20});
});

test("history hook keys and GET parameters track the date and branch; FIN-01 follows the server result", async () => {
  const first = useShiftsHistory({dateFrom:"2026-10-15",branchId:"branch-a",page:1,pageSize:20});
  const later = useShiftsHistory({dateFrom:"2026-10-16",branchId:"branch-a",page:1,pageSize:20});
  const otherBranch = useShiftsHistory({dateFrom:"2026-10-15",branchId:"branch-b",page:1,pageSize:20});
  const nextPage = useShiftsHistory({dateFrom:"2026-10-15",branchId:"branch-a",page:2,pageSize:20});
  assert.notDeepEqual(first.queryKey,later.queryKey);
  assert.notDeepEqual(first.queryKey,otherBranch.queryKey);
  assert.notDeepEqual(first.queryKey,nextPage.queryKey);
  assert.deepEqual((await first.queryFn()).data.map((row:{id:string})=>row.id),["FIN-01"]);
  assert.deepEqual((await later.queryFn()).data,[]);
  assert.deepEqual((await otherBranch.queryFn()).data,[]);
  assert.equal((await nextPage.queryFn()).meta.page,2);
  assert.equal(calls.length,4);
  assert.ok(calls.every(call => call.url === "/accountant/shifts/history" && !("status" in call.params)));
});

test("pagination uses server page and totalPages at both edges", () => {
  assert.equal(historyPageTarget({page:1,totalPages:3},1,-1),1);
  assert.equal(historyPageTarget({page:1,totalPages:3},1,1),2);
  assert.equal(historyPageTarget({page:2,totalPages:3},2,1),3);
  assert.equal(historyPageTarget({page:3,totalPages:3},3,1),3);
  assert.equal(historyPageTarget({page:1,totalPages:0},1,1),1);
  assert.equal(historyPageTarget(undefined,1,1),1);
});

test("branch options use only branch-scoped API rows, never brand or malformed rows", () => {
  assert.deepEqual(historyBranchOptions([
    {scope:"branch",branchId:"branch-a",branchName:"A"},
    {scope:"branch",branchId:"branch-b",branchName:"B"},
    {scope:"brand",branchId:null,branchName:"Brand"},
    {scope:"branch",branchId:null,branchName:"Missing"},
  ]),[{id:"branch-a",name:"A"},{id:"branch-b",name:"B"}]);
});

test("both existing history screens reset pages and hide stale rows while fetching", () => {
  const company = readFileSync(new URL("../../components/mockups/asab/CompanyDashboard.tsx", import.meta.url), "utf8");
  const accShifts = readFileSync(new URL("../../components/mockups/asab/_pages/accountant/AccShifts.tsx", import.meta.url), "utf8");
  const headShift = readFileSync(new URL("../../components/mockups/asab/_pages/head/HeadShiftHistory.tsx", import.meta.url), "utf8");
  const prototype = readFileSync(new URL("../../components/mockups/asab/ASABPrototype.tsx", import.meta.url), "utf8");

  assert.match(prototype, /import\s*\{[^}]*AccShifts[^}]*\}\s*from\s*["']\.\/_pages\/accountant\/AccShifts["']/);
  assert.match(prototype, /import\s*\{[^}]*HeadShiftHistory[^}]*\}\s*from\s*["']\.\/_pages\/head\/HeadShiftHistory["']/);

  for (const screen of [company, accShifts]) {
    assert.match(screen, /useShiftsHistory\(\{\s*dateFrom:\s*historyDateFrom,\s*dateTo:\s*historyDateTo,\s*branchId:\s*historyBranchId,\s*page:\s*historyPageNum,\s*pageSize:\s*20\s*\}\)/);
    assert.match(screen, /setHistoryDateFrom\(e\.target\.value\);\s*setHistoryPageNum\(1\)/);
    assert.match(screen, /setHistoryDateTo\(e\.target\.value\);\s*setHistoryPageNum\(1\)/);
    assert.match(screen, /setHistoryBranchId\(e\.target\.value\);\s*setHistoryPageNum\(1\)/);
    assert.match(screen, /historyQuery\.isFetching/);
    assert.match(screen, /historyPageTarget\(/);
    assert.match(screen, /historyQuery\.isError/);
    assert.match(screen, /history\.length===0|shiftHistory\.length\s*===\s*0/);
    assert.match(screen, /historyBusy\s*\|\|\s*historyQuery\.isError\s*\?\s*\[\]\s*:/);
    assert.match(screen, /useShiftConfigs\("branch"\)/);
  }

  // Head Shift History verification
  assert.match(headShift, /useShiftsHistory\(\{\s*dateFrom,\s*dateTo,\s*branchId,\s*page,\s*pageSize:\s*20\s*\}\)/);
  assert.match(headShift, /setDateFrom\(e\.target\.value\);\s*setPage\(1\)/);
  assert.match(headShift, /setDateTo\(e\.target\.value\);\s*setPage\(1\)/);
  assert.match(headShift, /setBranchId\(e\.target\.value\);\s*setPage\(1\)/);
  assert.match(headShift, /query\.isFetching/);
  assert.match(headShift, /historyPageTarget\(/);
  assert.match(headShift, /query\.isError/);
  assert.match(headShift, /rows\.length\s*===\s*0/);
  assert.match(headShift, /busy\s*\|\|\s*query\.isError\s*\?\s*\[\]\s*:/);
});
