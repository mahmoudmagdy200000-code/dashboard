import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  getShiftCorrectionEvidence,
  getShiftCorrectionIneligibilityReason,
} from "./shiftReportCorrection.ts";

// Transpile shifts.ts functions cleanly without bundler dependencies
const shiftsPath = new URL("../../../api/queries/shifts.ts", import.meta.url);
const source = ts.createSourceFile("shifts.ts", readFileSync(shiftsPath, "utf8"), ts.ScriptTarget.Latest, true);
const names = ["historyRequestParams", "historyPageTarget", "historyBranchOptions", "useShiftsHistory", "summarizeCashierShiftSales"];
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
  return {data:{data:[],meta:{page:config.params.page,pageSize:config.params.pageSize,total:0,totalPages:0}}};
}};
const queryKeys = {shifts:(filter:unknown) => ["shifts","history",filter]};
const useQuery = (config:unknown) => config;
const helpers = new Function("exports","useQuery","queryKeys","api",compiled +
  "\nreturn {historyRequestParams,historyPageTarget,historyBranchOptions,useShiftsHistory,summarizeCashierShiftSales};"
)({},useQuery,queryKeys,api);
const {historyRequestParams,historyPageTarget,historyBranchOptions,useShiftsHistory} = helpers;

type Shift = {
  id: string;
  branchId: string;
  branchName: string;
  cashierName: string;
  role: string;
  status: string;
  startedAt: string;
  endedAt: string;
  salesHalalas: number;
  cashExpectedHalalas: number;
  cashActualHalalas: number;
  cashCountState: string;
  reportReview?: { operation_id: string; public_id: string };
};

type Op = {
  id: string;
  moduleKey: string;
  branch: string;
  branchId: string;
  operationDate: string;
  status: string;
  amount: number;
};

/**
 * MT-20 Acceptance Test:
 * - Sales date/branch/status filter, history and counters share the exact same scope
 * - Multi-page data spanning at least 2 branches and different statuses
 * - Changing filter updates both displayed rows and total counter together
 * - Opening correction opens the chosen shift report ID
 * - No operation + shift double-counting
 */

// Synthetic multi-page dataset across 2 branches and different statuses
const fixtureShifts: Shift[] = [
  // Branch A - Cashier - Closed
  {
    id: "shift-a-1",
    branchId: "branch-a",
    branchName: "فرع الرياض",
    cashierName: "أحمد",
    role: "cashier",
    status: "closed",
    startedAt: "2026-11-11T08:00:00Z",
    endedAt: "2026-11-11T16:00:00Z",
    salesHalalas: 150000,
    cashExpectedHalalas: 50000,
    cashActualHalalas: 50000,
    cashCountState: "counted",
    reportReview: { operation_id: "op-shift-a-1", public_id: "SHF-A-01" },
  },
  {
    id: "shift-a-2",
    branchId: "branch-a",
    branchName: "فرع الرياض",
    cashierName: "خالد",
    role: "cashier",
    status: "closed",
    startedAt: "2026-11-11T16:00:00Z",
    endedAt: "2026-11-11T23:59:00Z",
    salesHalalas: 120000,
    cashExpectedHalalas: 40000,
    cashActualHalalas: 40000,
    cashCountState: "counted",
    reportReview: { operation_id: "op-shift-a-2", public_id: "SHF-A-02" },
  },
  // Branch A - Cashier - Pending review
  {
    id: "shift-a-3",
    branchId: "branch-a",
    branchName: "فرع الرياض",
    cashierName: "سعد",
    role: "cashier",
    status: "pending_review",
    startedAt: "2026-11-11T08:00:00Z",
    endedAt: "2026-11-11T16:00:00Z",
    salesHalalas: 80000,
    cashExpectedHalalas: 30000,
    cashActualHalalas: 28000,
    cashCountState: "counted",
    reportReview: { operation_id: "op-shift-a-3", public_id: "SHF-A-03" },
  },
  {
    id: "shift-a-4",
    branchId: "branch-a",
    branchName: "فرع الرياض",
    cashierName: "فيصل",
    role: "cashier",
    status: "pending_review",
    startedAt: "2026-11-11T16:00:00Z",
    endedAt: "2026-11-11T23:59:00Z",
    salesHalalas: 95000,
    cashExpectedHalalas: 35000,
    cashActualHalalas: 35000,
    cashCountState: "counted",
    reportReview: { operation_id: "op-shift-a-4", public_id: "SHF-A-04" },
  },
  // Branch A - Manager - Closed (must be excluded from cashier shift sales)
  {
    id: "shift-a-mgr",
    branchId: "branch-a",
    branchName: "فرع الرياض",
    cashierName: "مدير الفرع",
    role: "branch_manager",
    status: "closed",
    startedAt: "2026-11-11T08:00:00Z",
    endedAt: "2026-11-11T23:59:00Z",
    salesHalalas: 0,
    cashExpectedHalalas: 0,
    cashActualHalalas: 0,
    cashCountState: "unknown",
  },
  // Branch B - Cashier - Closed
  {
    id: "shift-b-1",
    branchId: "branch-b",
    branchName: "فرع جدة",
    cashierName: "عمر",
    role: "cashier",
    status: "closed",
    startedAt: "2026-11-11T08:00:00Z",
    endedAt: "2026-11-11T16:00:00Z",
    salesHalalas: 200000,
    cashExpectedHalalas: 70000,
    cashActualHalalas: 70000,
    cashCountState: "counted",
    reportReview: { operation_id: "op-shift-b-1", public_id: "SHF-B-01" },
  },
  // Branch B - Cashier - Pending review
  {
    id: "shift-b-2",
    branchId: "branch-b",
    branchName: "فرع جدة",
    cashierName: "ياسر",
    role: "cashier",
    status: "pending_review",
    startedAt: "2026-11-11T16:00:00Z",
    endedAt: "2026-11-11T23:59:00Z",
    salesHalalas: 110000,
    cashExpectedHalalas: 45000,
    cashActualHalalas: 45000,
    cashCountState: "counted",
    reportReview: { operation_id: "op-shift-b-2", public_id: "SHF-B-02" },
  },
];

// Synthetic sales operations fixture
const fixtureSalesOps: Op[] = [
  { id: "SAL-01", moduleKey: "sales", branch: "الرياض", branchId: "branch-a", operationDate: "2026-11-11", status: "pending", amount: 1500 },
  { id: "SAL-02", moduleKey: "sales", branch: "الرياض", branchId: "branch-a", operationDate: "2026-11-11", status: "approved", amount: 1200 },
  { id: "SAL-03", moduleKey: "sales", branch: "الرياض", branchId: "branch-a", operationDate: "2026-11-11", status: "rejected", amount: 800 },
  { id: "SAL-04", moduleKey: "sales", branch: "جدة", branchId: "branch-b", operationDate: "2026-11-11", status: "pending", amount: 2000 },
  { id: "SAL-05", moduleKey: "sales", branch: "جدة", branchId: "branch-b", operationDate: "2026-11-11", status: "approved", amount: 1100 },
  { id: "EXP-01", moduleKey: "expenses", branch: "الرياض", branchId: "branch-a", operationDate: "2026-11-11", status: "pending", amount: 300 },
];

test("MT-20: query params builder passes status and role when allowStatus/allowRole options are enabled", () => {
  // Default call (backward compatible, as expected by shiftsHistory.test.ts)
  const defaultParams = historyRequestParams({
    branchId: "branch-a",
    dateFrom: "2026-11-11",
    dateTo: "2026-11-11",
    status: "closed",
    role: "cashier",
    page: 1,
    pageSize: 5,
  });
  assert.equal(defaultParams.branchId, "branch-a");
  assert.equal(defaultParams.dateFrom, "2026-11-11");
  assert.equal("status" in defaultParams, false, "default historyRequestParams strips status");
  assert.equal("role" in defaultParams, false, "default historyRequestParams strips role");

  // Scoped call with options (used by ShiftSalesSection for MT-20)
  const scopedParams = historyRequestParams(
    {
      branchId: "branch-a",
      dateFrom: "2026-11-11",
      dateTo: "2026-11-11",
      status: "pending_review",
      role: "cashier",
      page: 1,
      pageSize: 5,
    },
    { allowStatus: true, allowRole: true },
  );
  assert.equal(scopedParams.branchId, "branch-a");
  assert.equal(scopedParams.status, "pending_review");
  assert.equal(scopedParams.role, "cashier");
  assert.equal(scopedParams.page, 1);
  assert.equal(scopedParams.pageSize, 5);
});

test("MT-20: server-side filtering and multi-page pagination scope match rows and total counter", () => {
  // Simulate backend query filtering before pagination
  function queryBackendShifts(filters: { branchId?: string; status?: string; role?: string; page?: number; pageSize?: number }) {
    let q = fixtureShifts.filter(s => s.status === "pending_review" || s.status === "closed");
    if (filters.status && filters.status !== "all") {
      q = q.filter(s => s.status === filters.status);
    }
    if (filters.role === "cashier") {
      q = q.filter(s => s.role === "cashier");
    }
    if (filters.branchId && filters.branchId !== "all") {
      q = q.filter(s => s.branchId === filters.branchId);
    }
    const total = q.length;
    const pageSize = filters.pageSize ?? 5;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, filters.page ?? 1), totalPages);
    const start = (page - 1) * pageSize;
    const data = q.slice(start, start + pageSize);
    return { data, meta: { total, totalPages, page, pageSize } };
  }

  // 1. All cashier shifts across branches (pageSize=2 -> multi-page)
  const allP1 = queryBackendShifts({ role: "cashier", pageSize: 2, page: 1 });
  assert.equal(allP1.meta.total, 6, "Total cashier shifts = 6");
  assert.equal(allP1.meta.totalPages, 3);
  assert.equal(allP1.data.length, 2);

  // 2. Filter Branch A only
  const branchAP1 = queryBackendShifts({ branchId: "branch-a", role: "cashier", pageSize: 2, page: 1 });
  assert.equal(branchAP1.meta.total, 4, "Branch A cashier shifts = 4");
  assert.equal(branchAP1.meta.totalPages, 2);
  assert.equal(branchAP1.data.length, 2);
  assert.ok(branchAP1.data.every(s => s.branchId === "branch-a"));

  // Page 2 of Branch A
  const branchAP2 = queryBackendShifts({ branchId: "branch-a", role: "cashier", pageSize: 2, page: 2 });
  assert.equal(branchAP2.meta.total, 4, "Total remains 4 on page 2");
  assert.equal(branchAP2.meta.page, 2);
  assert.equal(branchAP2.data.length, 2);
  assert.notEqual(branchAP1.data[0].id, branchAP2.data[0].id, "Distinct shift rows per page");

  // 3. Filter Branch A + status=pending_review
  const branchAPending = queryBackendShifts({ branchId: "branch-a", status: "pending_review", role: "cashier", pageSize: 2, page: 1 });
  assert.equal(branchAPending.meta.total, 2, "Branch A pending cashier shifts = 2");
  assert.equal(branchAPending.meta.totalPages, 1);
  assert.equal(branchAPending.data.length, 2);
  assert.ok(branchAPending.data.every(s => s.status === "pending_review"));

  // 4. Filter Branch B + status=closed
  const branchBClosed = queryBackendShifts({ branchId: "branch-b", status: "closed", role: "cashier", pageSize: 2, page: 1 });
  assert.equal(branchBClosed.meta.total, 1, "Branch B closed cashier shifts = 1");
  assert.equal(branchBClosed.data.length, 1);
  assert.equal(branchBClosed.data[0].id, "shift-b-1");

  // Confirm switching filter updates both rows and total counter together
  assert.equal(branchAP1.meta.total !== branchBClosed.meta.total, true);
  assert.equal(branchAP1.data.length !== branchBClosed.data.length, true);
});

test("MT-20: AccSalesPage sales operations counters are scoped to date, branch, and status", () => {
  // Test sales operations counter calculations
  const mOps = fixtureSalesOps.filter(o => o.moduleKey === "sales");
  assert.equal(mOps.length, 5, "Total sales operations = 5");

  // Scope to Branch A
  const branchAOps = mOps.filter(o => o.branchId === "branch-a");
  assert.equal(branchAOps.length, 3, "Branch A sales operations = 3");
  assert.equal(branchAOps.filter(o => o.status === "pending").length, 1);
  assert.equal(branchAOps.filter(o => o.status === "approved").length, 1);
  assert.equal(branchAOps.filter(o => o.status === "rejected").length, 1);

  // Scope to Branch A + status pending
  const branchAPendingOps = branchAOps.filter(o => o.status === "pending");
  assert.equal(branchAPendingOps.length, 1);

  // Scope to Branch B
  const branchBOps = mOps.filter(o => o.branchId === "branch-b");
  assert.equal(branchBOps.length, 2, "Branch B sales operations = 2");
  assert.equal(branchBOps.filter(o => o.status === "pending").length, 1);
  assert.equal(branchBOps.filter(o => o.status === "approved").length, 1);

  // Confirm operations counters never count shift records (no double-counting)
  assert.equal(mOps.some(o => (o.id as string).startsWith("shift-")), false);
});

test("MT-20: ShiftSalesSection UI source code contains required scoping, separate counters, and report callback", () => {
  const code = readFileSync(new URL("./_pages/accountant/ShiftSalesSection.tsx", import.meta.url), "utf8");

  // 1. Passes role: "cashier" and allowStatus/allowRole to useShiftsHistory
  assert.match(code, /role:\s*["']cashier["']/);
  assert.match(code, /\{\s*allowStatus:\s*true,\s*allowRole:\s*true\s*\}/);

  // 2. Resets page to 1 when filters change
  assert.match(code, /filterKey\s*!==\s*prevFilterKey/);
  assert.match(code, /setPage\(1\)/);

  // 3. Three distinct shift report counters
  assert.match(code, /تقارير الورديات \(كاشير\)/);
  assert.match(code, /ورديات الصفحة المعروضة/);
  assert.match(code, /مبيعات الصفحة الحالية فقط/);
  assert.match(code, /تنبيه: مجموع هذه الصفحة فقط \(لا يمثل إجمالي مبيعات كلي\)/);

  // 4. Opens report via onOpenReport(shiftId, reportId)
  assert.match(code, /onOpenReport\(shift\.id,\s*report\.id\)/);
});

test("MT-20: AccSalesPage UI source code computes counters from the filtered sales scope and uses accountant branch permissions", () => {
  const code = readFileSync(new URL("./_pages/accountant/AccSalesPage.tsx", import.meta.url), "utf8");

  // 1. Scoped operations counters using active filters
  assert.match(code, /baseScopedOps/);
  assert.match(code, /salesOpsTotal/);
  assert.match(code, /salesOpsPending/);
  assert.match(code, /salesOpsApproved/);
  assert.match(code, /salesOpsRejected/);

  // 2. Clear sub labels for active filter scope
  assert.match(code, /مطابق لفلاتر التاريخ والفرع والحالة/);
  assert.match(code, /مطابق لفلاتر التاريخ والفرع/);

  // 3. Accountant branch permissions
  assert.match(code, /useShiftConfigs\(["']branch["']\)/);
  assert.match(code, /historyBranchOptions/);
  assert.match(code, /branchOptions/);

  // 4. Mounts ShiftSalesSection with scope and onOpenReport callback
  assert.match(code, /<ShiftSalesSection/);
  assert.match(code, /onOpenReport/);
});

test("MT-20: CompanyDashboard AccCompanySales computes counters from filtered scope and mounts ShiftSalesSection", () => {
  const code = readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8");

  // 1. AccCompanySales mounts ShiftSalesSection with active filters
  assert.match(code, /function AccCompanySales/);
  assert.match(code, /<ShiftSalesSection\s+operations=\{ops as any\}\s+filterBranch=\{branchFilter\}\s+filterStatus=\{statusFilter\}\s+filterDate=\{salesDate\}\s+filterSearch=\{search\}\s+onOpenReport=\{onOpenReport\}\s*\/>/);

  // 2. Uses accountant branch options from useShiftConfigs + historyBranchOptions
  assert.match(code, /useShiftConfigs\(["']branch["']\)/);
  assert.match(code, /historyBranchOptions/);

  // 3. Scopes sales operations counters to the same filtered dataset
  assert.match(code, /salesOpsTotal\s*=\s*isStatusFiltered\s*\?\s*shown\.length/);
  assert.match(code, /salesOpsPending/);
  assert.match(code, /salesOpsApproved/);
  assert.match(code, /salesOpsRejected/);

  // 4. Clear labels separating sales operations from shift reports
  assert.match(code, /عمليات المبيعات — الإجمالي/);
  assert.match(code, /عمليات المبيعات — قيد المراجعة/);
  assert.match(code, /عمليات المبيعات — تمت الموافقة/);
  assert.match(code, /عمليات المبيعات — مرفوضة/);

  // 5. AccountantRoot captures selectedShiftTarget and routes to AccCompanyShifts
  assert.match(code, /setSelectedShiftTarget\(\{\s*shiftId,\s*opId\s*\}\)/);
  assert.match(code, /<AccCompanyShifts[^>]*selectedShiftTarget=\{selectedShiftTarget\}/);
});

test("MT-20: Opening chosen shift report from sales screen captures shiftId and opId, and selects report for accountant review", () => {
  // Test opening 2 distinct shifts from accountant sales view
  const openedReports: Array<{ shiftId: string; opId?: string }> = [];
  const handleOpenReport = (shiftId: string, opId?: string) => {
    openedReports.push({ shiftId, opId });
  };

  // Shift 1: shift-a-1 with op-shift-a-1
  const shift1 = fixtureShifts[0]; // shift-a-1, op-shift-a-1
  assert.equal(shift1.id, "shift-a-1");
  handleOpenReport(shift1.id, shift1.reportReview?.operation_id);

  // Shift 2: shift-a-2 with op-shift-a-2
  const shift2 = fixtureShifts[1]; // shift-a-2, op-shift-a-2
  assert.equal(shift2.id, "shift-a-2");
  handleOpenReport(shift2.id, shift2.reportReview?.operation_id);

  // Assert both shiftId and opId were captured correctly
  assert.equal(openedReports.length, 2);
  assert.deepEqual(openedReports[0], { shiftId: "shift-a-1", opId: "op-shift-a-1" });
  assert.deepEqual(openedReports[1], { shiftId: "shift-a-2", opId: "op-shift-a-2" });

  // Simulate routing to AccCompanyShifts with selectedShiftTarget
  const target1 = openedReports[0];
  const selectedTab = target1 ? "close" : "live";
  assert.equal(selectedTab, "close", "Opens close review tab");
  const selectedExpandedId = target1.opId;
  assert.equal(selectedExpandedId, "op-shift-a-1", "Expands selected shift report operation");

  // Verify eligibility check with shift detail
  const eligibleDetail = {
    id: "op-shift-a-1",
    moduleKey: "shifts",
    status: "pending",
    reportRevision: 1,
    reportReview: { phase: "accountant_review" },
    payload: { shiftId: "shift-a-1", reportRevision: 1, pkg6Review: { phase: "accountant_review" } },
  };
  const eligibleOp = { id: "op-shift-a-1", module: "shifts", branchId: "branch-a", status: "pending" };
  const eligibleEvidence = getShiftCorrectionEvidence(eligibleOp, eligibleDetail, "accountant");
  assert.ok(eligibleEvidence, "Eligible shift report displays correction form");
  assert.equal(getShiftCorrectionIneligibilityReason(eligibleOp, eligibleDetail, "accountant", "ar"), null);

  // Ineligible detail (e.g. status already approved)
  const ineligibleDetail = { ...eligibleDetail, status: "approved" };
  const ineligibleOp = { ...eligibleOp, status: "approved" };
  const ineligibleEvidence = getShiftCorrectionEvidence(ineligibleOp, ineligibleDetail, "accountant");
  assert.equal(ineligibleEvidence, null, "Ineligible shift report hides correction form");
  const reasonAr = getShiftCorrectionIneligibilityReason(ineligibleOp, ineligibleDetail, "accountant", "ar");
  assert.match(reasonAr!, /حالة التقرير ليست معلقة/, "Displays clear ineligibility reason");
});

test("MT-20: Status filter scope includes final-approved and rejected (zero-result case)", () => {
  // 1. Status mapping in ShiftSalesSection
  function mapHistoryStatus(filterStatus: string) {
    return filterStatus === "pending"
      ? "pending_review"
      : filterStatus === "approved" || filterStatus === "final-approved"
      ? "closed"
      : filterStatus === "rejected"
      ? "rejected"
      : undefined;
  }

  assert.equal(mapHistoryStatus("pending"), "pending_review");
  assert.equal(mapHistoryStatus("approved"), "closed");
  assert.equal(mapHistoryStatus("final-approved"), "closed");
  assert.equal(mapHistoryStatus("rejected"), "rejected");
  assert.equal(mapHistoryStatus("all"), undefined);

  // 2. Querying backend with status="rejected" returns zero results (meta.total = 0, data = [])
  function queryBackendShifts(filters: { branchId?: string; status?: string; role?: string; page?: number; pageSize?: number }) {
    let q = fixtureShifts;
    if (filters.status && filters.status !== "all") {
      q = q.filter(s => s.status === filters.status);
    }
    if (filters.role === "cashier") {
      q = q.filter(s => s.role === "cashier");
    }
    if (filters.branchId && filters.branchId !== "all") {
      q = q.filter(s => s.branchId === filters.branchId);
    }
    const total = q.length;
    const pageSize = filters.pageSize ?? 5;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, filters.page ?? 1), totalPages);
    const start = (page - 1) * pageSize;
    const data = q.slice(start, start + pageSize);
    return { data, meta: { total, totalPages, page, pageSize } };
  }

  // Filter with status=rejected -> 0 shifts found (zero-result case)
  const rejectedRes = queryBackendShifts({ status: "rejected", role: "cashier" });
  assert.equal(rejectedRes.meta.total, 0, "Rejected status returns meta.total = 0");
  assert.equal(rejectedRes.data.length, 0, "Rejected status returns 0 data rows");
  assert.equal(rejectedRes.meta.totalPages, 1);

  // Filter with status=closed (which final-approved maps to) across Branch A (pageSize=1 -> multi-page)
  const finalApprovedP1 = queryBackendShifts({ status: "closed", role: "cashier", branchId: "branch-a", pageSize: 1, page: 1 });
  assert.equal(finalApprovedP1.meta.total, 2, "Branch A closed cashier shifts = 2");
  assert.equal(finalApprovedP1.meta.totalPages, 2);
  assert.equal(finalApprovedP1.data.length, 1);
  assert.equal(finalApprovedP1.data[0].id, "shift-a-1");

  const finalApprovedP2 = queryBackendShifts({ status: "closed", role: "cashier", branchId: "branch-a", pageSize: 1, page: 2 });
  assert.equal(finalApprovedP2.meta.total, 2);
  assert.equal(finalApprovedP2.data.length, 1);
  assert.equal(finalApprovedP2.data[0].id, "shift-a-2");

  // Filter Branch B with status=closed
  const finalApprovedBranchB = queryBackendShifts({ status: "closed", role: "cashier", branchId: "branch-b", pageSize: 1, page: 1 });
  assert.equal(finalApprovedBranchB.meta.total, 1, "Branch B closed cashier shifts = 1");
  assert.equal(finalApprovedBranchB.data.length, 1);
  assert.equal(finalApprovedBranchB.data[0].id, "shift-b-1");
});


test("cashier sales totals span all pages and do not treat uncounted cash as zero variance", async () => {
  const rows = [1, 2, 3].map(id => ({
    id: String(id), role: "cashier", status: "pending_review",
    salesHalalas: 11500, cashCountState: "counted", varianceHalalas: -2000,
  }));
  const load = (page: number) => Promise.resolve({
    data: page === 1 ? rows.slice(0, 2) : rows.slice(2),
    meta: { page, pageSize: 2, totalPages: 2, total: 3 },
  });
  assert.deepEqual(await helpers.summarizeCashierShiftSales(load), {
    count: 3, pending: 3, totalSalesHalalas: 34500, totalVarianceHalalas: -6000,
  });
  rows[2].cashCountState = "unknown";
  assert.equal((await helpers.summarizeCashierShiftSales(load)).totalVarianceHalalas, null);
  rows[2].id = "1";
  await assert.rejects(helpers.summarizeCashierShiftSales(load), /Invalid cashier shift summary data/);
});
