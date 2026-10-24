import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSalesActionPolicy, salesBulkApprovalIds } from "./salesActionGuards.ts";
import { fmtAmt } from "./_shared/formatters.ts";

function norm(s: string): string {
  return s.replace(/\s+/g, " ");
}

test("Phase 1C ACC-F39: ClarifyModal retains input on failure and manages submission state", () => {
  const content = norm(
    readFileSync(new URL("../../shared/ClarifyModal.tsx", import.meta.url), "utf8")
  );
  assert.ok(content.includes("isSubmitting"), "ClarifyModal must track isSubmitting state");
  assert.ok(content.includes("submitError"), "ClarifyModal must track submitError state");
  assert.ok(content.includes("await onSubmit"), "ClarifyModal must await onSubmit before closing");
  assert.ok(content.includes('setMessage("")'), "ClarifyModal must clear message only after success");
  assert.ok(content.includes("onClose()"), "ClarifyModal must close only after success");
});

test("Phase 1C ACC-F35: Employee account note aligns with Business Rules v3.5 (no automatic payroll deduction)", () => {
  const empModule = norm(
    readFileSync(new URL("./EmployeeAccountModule.tsx", import.meta.url), "utf8")
  );
  const accEmployees = norm(
    readFileSync(new URL("./_pages/accountant/AccEmployees.tsx", import.meta.url), "utf8")
  );
  const companyDash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );

  assert.ok(!empModule.includes("سيتم خصمه تلقائياً من الراتب القادم"), "EmployeeAccountModule must not promise automatic salary deduction");
  assert.ok(!accEmployees.includes("سيتم خصمه تلقائياً من الراتب القادم"), "AccEmployees must not promise automatic salary deduction");
  assert.ok(!companyDash.includes("سيتم خصمه تلقائياً من الراتب القادم"), "CompanyDashboard must not promise automatic salary deduction");

  assert.ok(empModule.includes("مسجل في كشف الحساب للتسوية وفق سياسة المنشأة"), "EmployeeAccountModule has compliant settlement notice");
  assert.ok(accEmployees.includes("مسجل في كشف الحساب للتسوية وفق سياسة المنشأة"), "AccEmployees has compliant settlement notice");
});

test("Phase 1C ACC-F04: Sales variance allocation is restricted to shortages (surplus cannot create employee debit)", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(dash.includes("totals.varianceHalalas >= 0"), "confirmAssign must reject non-negative or surplus variance");
  assert.ok(dash.includes("isShortage"), "SalesReconPanel must check isShortage");
  assert.ok(dash.includes("isSurplus"), "SalesReconPanel must check isSurplus");
  assert.ok(dash.includes("فائض في المبيعات — لا يتم تحميله كمديونية على الموظفين وفق القواعد"), "Surplus shows informative notice");
});

test("Phase 1C ACC-F07: Bulk sales approval is scoped to active filtered pending entries", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  const accSales = norm(
    readFileSync(new URL("./_pages/accountant/AccSalesPage.tsx", import.meta.url), "utf8")
  );

  assert.ok(dash.includes('shownPending = shown.filter((o) => o.status === "pending")') || dash.includes('shownPending = shown.filter(o=>o.status==="pending")'), "CompanyDashboard filters bulkSalesIds to shown pending");
  assert.ok(accSales.includes('filteredPending = filtered.filter((o) => o.status === "pending")') || accSales.includes('filteredPending = filtered.filter(o => o.status === "pending")'), "AccSalesPage filters bulkSalesIds to filtered pending");
});

test("Phase 1C ACC-F12: Expense approval decisions are restricted from Accountant view per EXP-06", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(dash.includes("اعتماد المصروفات من صلاحية مالك العلامة (EXP-06)"), "AccCompanyExpenses renders EXP-06 notice instead of Approve All button");
  assert.ok(dash.includes("اعتماد/رفض المصروفات من صلاحية مالك العلامة وفق سياسة EXP-06"), "AccExpenseDetailPanel renders EXP-06 policy notice");
});

test("Phase 1C ACC-F14 & ACC-F15: Asset draft conversion preserves invoiceIndex and handles async outcome", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(dash.includes("invoiceIndex: (d as any).invoiceIndex ?? 0"), "CAssetDraftProvider preserves invoiceIndex");
  assert.ok(dash.includes("return convertMut.mutateAsync"), "addDraft returns async mutation promise");
  assert.ok(dash.includes("await addDraft"), "ConvertToAssetModalCD awaits addDraft before closing");
  assert.ok(dash.includes("setErrorMsg"), "ConvertToAssetModalCD retains form and sets errorMsg on failure");
});

test("Phase 1C ACC-F20: Asset book value preserves exact halalas on edit open", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(dash.includes("bookValue: ((a.bookValueHalalas ?? 0) / 100).toFixed(2)") || dash.includes("bookValue:((a.bookValueHalalas??0)/100).toFixed(2)"), "openEdit preserves two decimal places for halalas");
});

test("Phase 1C ACC-F28 & ACC-F29: Waste allocations avoid stale state and bulk approve preserves non-pending entries", () => {
  const waste = norm(
    readFileSync(new URL("./_pages/accountant/AccWaste.tsx", import.meta.url), "utf8")
  );
  assert.ok(waste.includes("nextAllocs = p.empAllocs.filter"), "removeAlloc computes nextAllocs directly");
  assert.ok(waste.includes("putAllocsMut.mutate") && waste.includes("empAllocs: nextAllocs"), "putAllocsMut receives freshly computed allocations");
  assert.ok(waste.includes('idSet.has(e.id) ? { ...e, status: "approved" as const } : e'), "approveAllDisplayed only flips matching pending IDs");
});

test("Phase 1C ACC-F26: Daily inventory variance allocation button is wired to mutation", () => {
  const inv = norm(
    readFileSync(new URL("./_pages/accountant/AccInventory.tsx", import.meta.url), "utf8")
  );
  assert.ok(inv.includes("useSaveDailyVarianceAllocation"), "AccInventory imports useSaveDailyVarianceAllocation");
  assert.ok(inv.includes("saveDailyVarMut.mutate"), "Confirm Allocation button calls saveDailyVarMut.mutate");
  assert.ok(inv.includes("remaining !== 0"), "Confirm Allocation button enforces remaining balance is zero");
});

test("Phase 1C EXP-06: Negative authorization ensures Accountant and Head Accountant cannot approve or reject expenses", () => {
  const expenseOp = { id: "exp-1", module: "expenses", status: "pending" };
  const expenseDetail = { id: "exp-1", moduleKey: "expenses", status: "pending" };

  // 1. Behavioral policy check
  const accountantPolicy = getSalesActionPolicy({ operation: expenseOp, role: "accountant" });
  assert.equal(accountantPolicy.bulkApprove, false, "Accountant must not have bulkApprove for expenses");
  assert.equal(accountantPolicy.return, false, "Accountant must not have return for expenses");
  assert.equal(accountantPolicy.returnForReview, false, "Accountant must not have returnForReview for expenses");

  const headPolicy = getSalesActionPolicy({ operation: expenseOp, role: "head" });
  assert.equal(headPolicy.bulkApprove, false, "Head Accountant must not have bulkApprove for expenses");
  assert.equal(headPolicy.return, false, "Head Accountant must not have return for expenses");
  assert.equal(headPolicy.returnForReview, false, "Head Accountant must not have returnForReview for expenses");

  // 2. salesBulkApprovalIds filtering
  const bulkResult = salesBulkApprovalIds([expenseOp], ["exp-1"], "accountant");
  assert.deepEqual(bulkResult, [], "salesBulkApprovalIds must exclude expense IDs");

  // 3. UI surface check: AccExpensesPage.tsx must not have approve/reject/bulk buttons
  const accExpPage = norm(
    readFileSync(new URL("./_pages/accountant/AccExpensesPage.tsx", import.meta.url), "utf8")
  );
  assert.ok(!accExpPage.includes("onClick={() => bulkApprove"), "AccExpensesPage must not render bulkApprove button");
  assert.ok(!accExpPage.includes("onClick={() => approveOp"), "AccExpensesPage must not render approveOp button");
  assert.ok(!accExpPage.includes('onClick={() => { setDetailId(op.id); setModal("reject")'), "AccExpensesPage must not render reject button");
  assert.ok(accExpPage.includes("اعتماد المصروفات من صلاحية مالك العلامة أو المدير المفوّض (EXP-06)"), "AccExpensesPage renders EXP-06 banner");

  // 4. CompanyDashboard surface check
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(dash.includes('op.module === "expenses" ?'), "CompanyDashboard OpRow guards expenses from approval/rejection");
  assert.ok(dash.includes('moduleKey === "expenses" ?'), "CompanyDashboard HeadModulePage guards expense module from bulkFinalApprove");
  assert.ok(dash.includes('if (op && ("module" in op ? op.module : op.moduleKey) === "expenses") return;'), "CompanyDashboard approve mutation guards expenses fail-closed");
});

test("Phase 1C ACC-F02: Halala precision preserves exact two decimals without integer-SAR rounding", () => {
  // Test precision for edge amounts: 0.01, 0.49, 1.01, negative difference, and legitimate zero
  const testAmounts = [
    { halalas: 1, expectedNum: 0.01, formattedExpected: (0.01).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { halalas: 49, expectedNum: 0.49, formattedExpected: (0.49).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { halalas: 101, expectedNum: 1.01, formattedExpected: (1.01).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { halalas: -49, expectedNum: -0.49, formattedExpected: (-0.49).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { halalas: 0, expectedNum: 0, formattedExpected: (0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  ];

  for (const t of testAmounts) {
    const sar = t.halalas / 100;
    assert.equal(sar, t.expectedNum, `SAR conversion for ${t.halalas} halalas must be exact`);
    const formatted = fmtAmt(sar);
    assert.equal(formatted, t.formattedExpected, `fmtAmt formatting for ${sar} must match exact ar-SA decimal precision`);
  }

  // Source code inspection in AccSalesDetail.tsx: verify absence of Math.round on halala divisions
  const detail = norm(
    readFileSync(new URL("./_pages/accountant/AccSalesDetail.tsx", import.meta.url), "utf8")
  );
  assert.ok(detail.includes("totalSales = detail?.amountHalalas == null ? null : detail.amountHalalas / 100;"), "totalSales uses exact halalas without Math.round");
  assert.ok(detail.includes("totalCollection = recon?.totals?.totalCollectionHalalas == null ? null : recon.totals.totalCollectionHalalas / 100;"), "totalCollection uses exact halalas without Math.round");
  assert.ok(detail.includes("variance = recon?.totals?.varianceHalalas == null ? null : recon.totals.varianceHalalas / 100;"), "variance uses exact halalas without Math.round");
  assert.ok(!detail.includes("Math.round(recon.totals.expectedTotalHalalas / 100)"), "expectedTotalHalalas display does not round to integer SAR");
  assert.ok(!detail.includes("Math.round(c.actualAmountHalalas / 100)"), "channel actualAmountHalalas display does not round to integer SAR");
  assert.ok(!detail.includes("Math.round(c.diffHalalas / 100)"), "channel diffHalalas display does not round to integer SAR");
  assert.ok(detail.includes("isShortage"), "AccSalesDetail checks isShortage for variance assignment");
  assert.ok(detail.includes("isSurplus"), "AccSalesDetail checks isSurplus to credit branch rather than debit employee");
});
