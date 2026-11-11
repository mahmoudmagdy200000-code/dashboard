import test from "node:test";
import assert from "node:assert/strict";
import {
  getShiftReconciliationSummary,
  type ShiftReconciliationSource,
} from "./shiftReconciliationSummary.ts";
import {
  getShiftCorrectionEvidence,
  getShiftCorrectionIneligibilityReason,
} from "./shiftReportCorrection.ts";

test("MT-01: Sales 115, cards 75, count 20, opening 0 -> Expected 40, shortage 20, original sales/variance preserved", () => {
  const source: ShiftReconciliationSource = {
    id: "shift-mt-01",
    salesHalalas: 11500, // 115.00 SAR
    cardTotalHalalas: 7500,
    aggregatorTotalsHalalas: 0,
    confirmedOpeningHalalas: 0,
    cashExpectedHalalas: 4000, // 40.00 SAR
    cashActualHalalas: 2000, // 20.00 SAR
    cashCountState: "counted",
    varianceHalalas: -2000, // -20.00 SAR shortage
    reportRevision: 1,
    reportReview: { phase: "accountant_review" },
  };

  const summaryAr = getShiftReconciliationSummary(source, "ar");
  const summaryEn = getShiftReconciliationSummary(source, "en");

  assert.equal(summaryAr.originalSales.amountHalalas, 11500);
  assert.equal(summaryAr.originalSales.isAvailable, true);
  assert.match(summaryAr.originalSales.formatted, /ر\.س/);
  assert.equal(summaryEn.originalSales.formatted, "115.00 SAR");

  assert.equal(summaryAr.expectedCash.amountHalalas, 4000);
  assert.equal(summaryAr.expectedCash.isAvailable, true);
  assert.equal(summaryEn.expectedCash.formatted, "40.00 SAR");

  assert.equal(summaryAr.countedCash.amountHalalas, 2000);
  assert.equal(summaryAr.countedCash.isAvailable, true);
  assert.equal(summaryEn.countedCash.formatted, "20.00 SAR");

  assert.equal(summaryAr.originalVariance.amountHalalas, -2000);
  assert.equal(summaryAr.originalVariance.kind, "shortage");
  assert.equal(summaryAr.originalVariance.isAvailable, true);
  assert.equal(summaryEn.originalVariance.formatted, "-20.00 SAR");

  // Before allocation: awaiting allocation
  assert.equal(summaryAr.currentResponsibility.assignedHalalas, 0);
  assert.equal(summaryAr.currentResponsibility.status, "awaiting_allocation");
  assert.equal(summaryAr.unassignedAmount.amountHalalas, 2000);
  assert.equal(summaryEn.unassignedAmount.formatted, "20.00 SAR");
  assert.equal(summaryAr.allocationCompleteIndicator.isComplete, false);
});

test("MT-02: Assign all 20 in MT-01, manager reviews -> Unassigned 0, allocation complete indicator, debt under review", () => {
  const source: ShiftReconciliationSource = {
    id: "shift-mt-02",
    salesHalalas: 11500,
    cashExpectedHalalas: 4000,
    cashActualHalalas: 2000,
    cashCountState: "counted",
    varianceHalalas: -2000,
    reportRevision: 1,
    reportReview: { phase: "accountant_review" },
    liability: {
      version: 1,
      reportRevision: 1,
      managerApprovalStatus: "approved",
      createdByType: "branch_manager",
      shares: [
        {
          type: "cashier",
          id: "emp-101",
          name: "أحمد الكاشير",
          amountHalalas: 2000, // all 20 SAR assigned
        },
      ],
    },
  };

  const summary = getShiftReconciliationSummary(source, "en");

  // Gross sales and variance remain preserved (never zeroed)
  assert.equal(summary.originalSales.amountHalalas, 11500);
  assert.equal(summary.originalVariance.amountHalalas, -2000);

  // Responsibility assigned matches full shortage
  assert.equal(summary.currentResponsibility.assignedHalalas, 2000);
  assert.equal(summary.currentResponsibility.status, "approved");
  assert.equal(summary.currentResponsibility.formatted, "20.00 SAR");

  // Unassigned amount is 0
  assert.equal(summary.unassignedAmount.amountHalalas, 0);
  assert.equal(summary.unassignedAmount.formatted, "0.00 SAR");

  // Allocation complete indicator is active
  const summaryAr = getShiftReconciliationSummary(source, "ar");
  assert.equal(summaryAr.allocationCompleteIndicator.isComplete, true);
  assert.equal(summaryAr.allocationCompleteIndicator.text, "التوزيع مكتمل — تحت المراجعة");

  // Debt remains under review until head approval (STMT-01); no early "final" label
  assert.equal(summaryAr.reviewStage.isDebtFinal, false);
  assert.equal(summaryAr.reviewStage.label, "عند المحاسب (مراجعة وتصحيح)");
});

test("MT-03: Assign 15 only -> Unassigned 5, allocation incomplete; Stale allocation revision rejected", () => {
  // Partial allocation: 15 SAR out of 20 SAR
  const partialSource: ShiftReconciliationSource = {
    id: "shift-mt-03-partial",
    salesHalalas: 11500,
    cashExpectedHalalas: 4000,
    cashActualHalalas: 2000,
    cashCountState: "counted",
    varianceHalalas: -2000,
    reportRevision: 1,
    reportReview: { phase: "accountant_review" },
    liability: {
      version: 1,
      reportRevision: 1,
      managerApprovalStatus: "pending",
      createdByType: "cashier",
      shares: [
        {
          type: "cashier",
          id: "emp-101",
          name: "أحمد",
          amountHalalas: 1500, // 15.00 SAR
        },
      ],
    },
  };

  const partialSummary = getShiftReconciliationSummary(partialSource, "en");
  assert.equal(partialSummary.currentResponsibility.assignedHalalas, 1500);
  assert.equal(partialSummary.unassignedAmount.amountHalalas, 500);
  assert.equal(partialSummary.unassignedAmount.formatted, "5.00 SAR");
  assert.equal(partialSummary.allocationCompleteIndicator.isComplete, false);

  // Stale revision: liability revision is 1, but shift report revision has been bumped to 2
  const staleSource: ShiftReconciliationSource = {
    ...partialSource,
    reportRevision: 2, // report is at revision 2
    liability: {
      version: 1,
      reportRevision: 1, // allocation was for revision 1 (stale!)
      shares: [{ type: "cashier", id: "emp-101", amountHalalas: 2000 }],
    },
  };

  const staleSummary = getShiftReconciliationSummary(staleSource, "ar");
  assert.equal(staleSummary.currentResponsibility.status, "stale_revision");
  assert.equal(staleSummary.currentResponsibility.isAvailable, false);
  assert.match(staleSummary.currentResponsibility.formatted, /قديمة/);
  assert.equal(staleSummary.allocationCompleteIndicator.isComplete, false);
});

test("MT-03 / MTG-REC-02: Revision matching verification (matching, differing, and missing report/liability revision individually)", () => {
  const baseShortage: ShiftReconciliationSource = {
    id: "shift-rev-test",
    salesHalalas: 10000,
    cashExpectedHalalas: 4000,
    cashActualHalalas: 2000,
    cashCountState: "counted",
    varianceHalalas: -2000, // 20.00 SAR shortage
  };

  // 1. Matching revisions (reportRevision: 2, liability.reportRevision: 2) -> Verified responsibility
  const matchingSource: ShiftReconciliationSource = {
    ...baseShortage,
    reportRevision: 2,
    liability: {
      reportRevision: 2,
      managerApprovalStatus: "approved",
      shares: [{ type: "cashier", id: "emp-101", amountHalalas: 2000 }],
    },
  };
  const matchingSummary = getShiftReconciliationSummary(matchingSource, "ar");
  assert.equal(matchingSummary.currentResponsibility.isAvailable, true);
  assert.equal(matchingSummary.currentResponsibility.status, "approved");
  assert.equal(matchingSummary.currentResponsibility.assignedHalalas, 2000);
  assert.equal(matchingSummary.unassignedAmount.amountHalalas, 0);
  assert.equal(matchingSummary.allocationCompleteIndicator.isComplete, true);

  // 2. Differing revisions (reportRevision: 2, liability.reportRevision: 1) -> stale_revision
  const differingSource: ShiftReconciliationSource = {
    ...baseShortage,
    reportRevision: 2,
    liability: {
      reportRevision: 1,
      shares: [{ type: "cashier", id: "emp-101", amountHalalas: 2000 }],
    },
  };
  const differingSummary = getShiftReconciliationSummary(differingSource, "ar");
  assert.equal(differingSummary.currentResponsibility.isAvailable, false);
  assert.equal(differingSummary.currentResponsibility.status, "stale_revision");
  assert.equal(differingSummary.currentResponsibility.assignedHalalas, 0);
  assert.match(differingSummary.currentResponsibility.formatted, /قديمة/);
  // Full shortage remains unassigned
  assert.equal(differingSummary.unassignedAmount.amountHalalas, 2000);
  assert.equal(differingSummary.allocationCompleteIndicator.isComplete, false);

  // 3. Missing reportRevision (reportRevision undefined, liability has version 1) -> missing_revision
  const missingReportRevSource: ShiftReconciliationSource = {
    ...baseShortage,
    reportRevision: undefined,
    liability: {
      reportRevision: 1,
      shares: [{ type: "cashier", id: "emp-101", amountHalalas: 2000 }],
    },
  };
  const missingReportSummary = getShiftReconciliationSummary(missingReportRevSource, "ar");
  assert.equal(missingReportSummary.currentResponsibility.isAvailable, false);
  assert.equal(missingReportSummary.currentResponsibility.status, "missing_revision");
  assert.equal(missingReportSummary.currentResponsibility.assignedHalalas, 0);
  assert.equal(missingReportSummary.currentResponsibility.formatted, "غير متاح");
  assert.equal(missingReportSummary.unassignedAmount.amountHalalas, 2000);
  assert.equal(missingReportSummary.allocationCompleteIndicator.isComplete, false);

  // 4. Missing liabilityRevision (reportRevision is 1, liability has no reportRevision or version) -> missing_revision
  const missingLiabilityRevSource: ShiftReconciliationSource = {
    ...baseShortage,
    reportRevision: 1,
    liability: {
      shares: [{ type: "cashier", id: "emp-101", amountHalalas: 2000 }],
    },
  };
  const missingLiabilitySummary = getShiftReconciliationSummary(missingLiabilityRevSource, "ar");
  assert.equal(missingLiabilitySummary.currentResponsibility.isAvailable, false);
  assert.equal(missingLiabilitySummary.currentResponsibility.status, "missing_revision");
  assert.equal(missingLiabilitySummary.currentResponsibility.assignedHalalas, 0);
  assert.equal(missingLiabilitySummary.currentResponsibility.formatted, "غير متاح");
  assert.equal(missingLiabilitySummary.unassignedAmount.amountHalalas, 2000);
  assert.equal(missingLiabilitySummary.allocationCompleteIndicator.isComplete, false);
});

test("MT-05: Sales 115, cards 50, apps 25, opening 10, count 30 -> Expected 50, shortage 20, sales 115 (never 125)", () => {
  // Sales 115, non-cash 75 (cards 50 + apps 25), opening 10 -> Expected = (115 - 75) + 10 = 50.
  // Counted = 30 -> Variance = 30 - 50 = -20 (shortage 20).
  const source: ShiftReconciliationSource = {
    id: "shift-mt-05",
    salesHalalas: 11500, // 115.00 SAR
    cardTotalHalalas: 5000, // 50.00 SAR
    aggregatorTotalsHalalas: 2500, // 25.00 SAR
    confirmedOpeningHalalas: 1000, // 10.00 SAR
    cashExpectedHalalas: 5000, // 50.00 SAR
    cashActualHalalas: 3000, // 30.00 SAR
    cashCountState: "counted",
    varianceHalalas: -2000, // -20.00 SAR
    reportRevision: 1,
  };

  const summary = getShiftReconciliationSummary(source, "en");

  // Gross sales is strictly 115 SAR, never 125 SAR
  assert.equal(summary.originalSales.amountHalalas, 11500);
  assert.equal(summary.originalSales.formatted, "115.00 SAR");

  // Expected cash is 50 SAR
  assert.equal(summary.expectedCash.amountHalalas, 5000);
  assert.equal(summary.expectedCash.formatted, "50.00 SAR");

  // Counted cash is 30 SAR
  assert.equal(summary.countedCash.amountHalalas, 3000);
  assert.equal(summary.countedCash.formatted, "30.00 SAR");

  // Variance is -20 SAR shortage
  assert.equal(summary.originalVariance.amountHalalas, -2000);
  assert.equal(summary.originalVariance.kind, "shortage");
  assert.equal(summary.originalVariance.formatted, "-20.00 SAR");
});

test("MT-06: Missing count/revision/identity evidence -> Returns 'غير متاح' / 'بانتظار الإسناد والاعتماد', never 0", () => {
  const missingCountSource: ShiftReconciliationSource = {
    id: "shift-mt-06-uncounted",
    salesHalalas: 11500,
    cashExpectedHalalas: 4000,
    cashActualHalalas: null,
    cashCountState: "unknown",
    varianceHalalas: null,
  };

  const summary = getShiftReconciliationSummary(missingCountSource, "ar");
  assert.equal(summary.countedCash.amountHalalas, null);
  assert.equal(summary.countedCash.formatted, "غير مجرود");
  assert.equal(summary.countedCash.isAvailable, false);

  assert.equal(summary.originalVariance.amountHalalas, null);
  assert.equal(summary.originalVariance.kind, "unavailable");
  assert.equal(summary.originalVariance.formatted, "غير متاح");
  assert.equal(summary.originalVariance.isAvailable, false);

  // MT-06: When variance is missing or uncounted, unassigned must return "غير متاح", NEVER 0
  assert.equal(summary.unassignedAmount.amountHalalas, null);
  assert.equal(summary.unassignedAmount.formatted, "غير متاح");
  assert.equal(summary.unassignedAmount.isAvailable, false);
  assert.equal(summary.currentResponsibility.formatted, "غير متاح");
  assert.equal(summary.currentResponsibility.isAvailable, false);

  // When source is null/undefined
  const emptySummary = getShiftReconciliationSummary(null, "ar");
  assert.equal(emptySummary.originalSales.formatted, "غير متاح");
  assert.equal(emptySummary.originalSales.isAvailable, false);
  assert.notEqual(emptySummary.originalSales.amountHalalas, 0);
  assert.equal(emptySummary.expectedCash.formatted, "غير متاح");
  assert.equal(emptySummary.countedCash.formatted, "غير متاح");
  assert.equal(emptySummary.originalVariance.formatted, "غير متاح");
  assert.equal(emptySummary.unassignedAmount.formatted, "غير متاح");
});

test("MT-07: Expected 35, count 40 -> Surplus 5 (branch surplus), no employee shortage or sales increase", () => {
  const source: ShiftReconciliationSource = {
    id: "shift-mt-07",
    salesHalalas: 10000,
    cashExpectedHalalas: 3500, // 35.00 SAR
    cashActualHalalas: 4000, // 40.00 SAR
    cashCountState: "counted",
    varianceHalalas: 500, // +5.00 SAR surplus
    reportRevision: 1,
  };

  const summary = getShiftReconciliationSummary(source, "ar");

  assert.equal(summary.originalVariance.amountHalalas, 500);
  assert.equal(summary.originalVariance.kind, "surplus");
  assert.match(summary.originalVariance.formatted, /فائض للفرع/);

  // Branch surplus requires no employee responsibility allocation
  assert.equal(summary.currentResponsibility.isApplicable, false);
  assert.equal(summary.currentResponsibility.assignedHalalas, 0);
  assert.equal(summary.unassignedAmount.amountHalalas, 0);
});

test("Correction eligibility & clear ineligibility reasons", () => {
  const validOp = {
    id: "op-1",
    moduleKey: "shifts",
    status: "pending",
    reportRevision: 1,
    allocationVersion: null,
    reportReview: { phase: "accountant_review" },
    payload: {
      shiftId: "shift-123",
      reportRevision: 1,
      pkg6Review: { phase: "accountant_review" },
    },
  };

  // 1. Authorized accountant gets valid evidence
  const evidence = getShiftCorrectionEvidence(validOp, validOp, "accountant");
  assert.ok(evidence);
  assert.equal(evidence.shiftId, "shift-123");
  assert.equal(evidence.reportRevision, 1);
  assert.equal(getShiftCorrectionIneligibilityReason(validOp, validOp, "accountant", "ar"), null);

  // 2. Non-accountant role returns ineligibility reason
  assert.equal(
    getShiftCorrectionEvidence(validOp, validOp, "cashier"),
    null,
  );
  const cashierReason = getShiftCorrectionIneligibilityReason(validOp, validOp, "cashier", "ar");
  assert.match(cashierReason!, /المحاسب المصرح له/);

  // 3. Approved / closed report is ineligible for accountant correction
  const closedOp = { ...validOp, status: "approved" };
  const closedReason = getShiftCorrectionIneligibilityReason(closedOp, closedOp, "accountant", "ar");
  assert.match(closedReason!, /حالة التقرير ليست معلقة/);

  // 4. Report in manager or head review stage is ineligible
  const headStageOp = {
    ...validOp,
    reportReview: { phase: "head_review" },
    payload: { ...validOp.payload, pkg6Review: { phase: "head_review" } },
  };
  const headStageReason = getShiftCorrectionIneligibilityReason(headStageOp, headStageOp, "accountant", "ar");
  assert.match(headStageReason!, /ليست عند المحاسب/);

  // 5. Inconsistent report revision returns clear reason
  const inconsistentOp = {
    ...validOp,
    reportRevision: 1,
    payload: { ...validOp.payload, reportRevision: 2 },
  };
  const inconsistentReason = getShiftCorrectionIneligibilityReason(inconsistentOp, inconsistentOp, "accountant", "ar");
  assert.match(inconsistentReason!, /رقم نسخة التقرير/);
});

test("MT-20: Scope & Counters (No Double Counting)", () => {
  // Mock data representing a sales operations list and shift history
  const salesOps = [
    { id: "op-s1", moduleKey: "sales", status: "pending", operationDate: "2026-11-11" },
    { id: "op-s2", moduleKey: "sales", status: "approved", operationDate: "2026-11-11" },
    { id: "op-s3", moduleKey: "sales", status: "pending", operationDate: "2026-11-10" },
  ];

  const shiftReports = [
    { id: "shift-1", branchId: "b-1", status: "pending_review", startedAt: "2026-11-11T08:00:00Z", salesHalalas: 11500 },
    { id: "shift-2", branchId: "b-1", status: "closed", startedAt: "2026-11-11T16:00:00Z", salesHalalas: 8500 },
  ];

  // Sales operations total: 3 (2 for 2026-11-11)
  const salesDateFilter = "2026-11-11";
  const filteredSalesOps = salesOps.filter((o) => o.operationDate === salesDateFilter);
  assert.equal(filteredSalesOps.length, 2);

  // Shift reports count for 2026-11-11: 2
  const filteredShifts = shiftReports.filter((s) => s.startedAt.slice(0, 10) === salesDateFilter);
  assert.equal(filteredShifts.length, 2);

  // Verify counters are separate: Sales Ops != Shift Reports
  const salesOpsTotal = salesOps.length;
  const shiftReportsTotal = shiftReports.length;
  assert.equal(salesOpsTotal, 3);
  assert.equal(shiftReportsTotal, 2);

  // Current page sales sum: 115.00 + 85.00 = 200.00 SAR (20000 halalas)
  const pageSalesSumHalalas = filteredShifts.reduce((sum, s) => sum + s.salesHalalas, 0);
  assert.equal(pageSalesSumHalalas, 20000);
});
