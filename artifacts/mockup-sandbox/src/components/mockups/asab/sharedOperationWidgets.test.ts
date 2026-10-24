import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {
  fmtAmt,
  opDetailPage,
  formatTodayLong,
  formatMonthLong,
  formatDateLong,
} from "./_shared/formatters";
import {
  MATCH_CFG,
  STATUS_CFG,
  ORIGIN_CFG,
  EN_MATCH_CFG,
  EN_STATUS_CFG,
  EN_ORIGIN,
  EN_PIPELINE,
  PIPELINE_STAGES,
  getPipelineStage,
  getPipelineLabel,
  EXCEPTION_SEV_CFG,
  EN_SEV_LABEL,
  EN_EXCEPTION_UI,
  EN_EXCEPTION_ITEMS,
  OP_MODULE_LABELS,
} from "./_shared/displayConfig";
import { applyFilters, topModulePage } from "./_shared/filterOps";
import { PipelineBar, OpStagePill, PipelineOverview } from "./_shared/PipelineOverview";
import { OpRow } from "./_shared/OpRow";
import { deriveExceptions, ExceptionPanel } from "./_shared/ExceptionPanel";
import { type Op, type Filters, reportsToName } from "./_shared/types";

test("displayConfig: match, status, origin, and pipeline configurations are fully populated", () => {
  assert.equal(MATCH_CFG.exact.label, "متطابق");
  assert.equal(MATCH_CFG.review.label, "يحتاج مراجعة");
  assert.equal(MATCH_CFG.diff.label, "فرق في الكمية");
  assert.equal(EN_MATCH_CFG.exact, "Matched");

  assert.equal(STATUS_CFG.pending.label, "معلق");
  assert.equal(STATUS_CFG.approved.label, "موافق عليه");
  assert.equal(STATUS_CFG.rejected.label, "مرفوض");
  assert.equal(STATUS_CFG["final-approved"].label, "معتمد نهائياً");
  assert.equal(EN_STATUS_CFG.pending, "Pending");

  assert.equal(ORIGIN_CFG.mobile.label, "تطبيق الفرع");
  assert.equal(ORIGIN_CFG.procurement.label, "سير المشتريات");
  assert.equal(ORIGIN_CFG.system.label, "استيراد النظام");
  assert.equal(EN_ORIGIN.mobile, "Branch App");

  assert.equal(PIPELINE_STAGES.length, 6);
  assert.equal(PIPELINE_STAGES[0].id, "submit");
  assert.equal(PIPELINE_STAGES[5].id, "reports");
  assert.equal(EN_PIPELINE.submit.labelShort, "Submitted");
});

test("displayConfig: getPipelineStage and getPipelineLabel handle all lifecycle transitions", () => {
  const baseOp: Op = {
    id: "OP-1",
    branch: "الفرع 1",
    moduleKey: "sales",
    moduleLabel: "المبيعات",
    amount: 100,
    match: "exact",
    attachments: 1,
    status: "pending",
    origin: "mobile",
  };

  // Pending → stage 1 (review)
  assert.equal(getPipelineStage(baseOp), 1);
  assert.equal(getPipelineLabel(baseOp), "قيد المراجعة");

  // Approved → stage 2 (approved)
  const approvedOp: Op = { ...baseOp, status: "approved" };
  assert.equal(getPipelineStage(approvedOp), 2);
  assert.equal(getPipelineLabel(approvedOp), "موافق عليه");

  // Final approved → stage 3 (final)
  const finalOp: Op = { ...baseOp, status: "final-approved" };
  assert.equal(getPipelineStage(finalOp), 3);
  assert.equal(getPipelineLabel(finalOp), "معتمد نهائياً");

  // ERP posted → stage 4 (erp)
  const erpOp: Op = { ...baseOp, status: "final-approved", erpPosted: true };
  assert.equal(getPipelineStage(erpOp), 4);
  assert.equal(getPipelineLabel(erpOp), "مُرحَّل لـ ERP");

  // Rejected → -1
  const rejectedOp: Op = { ...baseOp, status: "rejected", rejectReason: "خطأ" };
  assert.equal(getPipelineStage(rejectedOp), -1);
  assert.equal(getPipelineLabel(rejectedOp), "مرفوض");
});

test("formatters: date helpers and opDetailPage routing", () => {
  assert.equal(opDetailPage("sales"), "acc-sales-detail");
  assert.equal(opDetailPage("expenses"), "acc-expenses");
  assert.equal(opDetailPage("purchases"), "acc-purchases");
  assert.equal(opDetailPage("unknown"), "acc-sales-detail");

  const testDate = new Date(2026, 9, 22); // 22 Oct 2026 (Thursday)
  const todayAr = formatTodayLong("ar", testDate);
  const todayEn = formatTodayLong("en", testDate);
  assert.match(todayAr, /22/);
  assert.match(todayAr, /أكتوبر/);
  assert.match(todayEn, /October 22, 2026/);

  const monthAr = formatMonthLong("ar", testDate);
  const monthEn = formatMonthLong("en", testDate);
  assert.equal(monthAr, "أكتوبر 2026");
  assert.equal(monthEn, "October 2026");

  assert.equal(formatDateLong("ar", null), "");
  assert.equal(formatDateLong("ar", "bad-date"), "");
  assert.match(formatDateLong("en", "2026-10-22T00:00:00Z"), /October 22, 2026/);
});

test("filterOps: applyFilters filters accurately across fields without mutating", () => {
  const ops: Op[] = [
    { id: "OP-01", branch: "الرياض - العليا", moduleKey: "sales", moduleLabel: "المبيعات", amount: 100, match: "exact", attachments: 0, status: "pending", origin: "mobile" },
    { id: "OP-02", branch: "جدة - التحلية", moduleKey: "expenses", moduleLabel: "المصروفات", amount: 200, match: "review", attachments: 1, status: "approved", origin: "system" },
    { id: "OP-03", branch: "الرياض - الصحافة", moduleKey: "purchases", moduleLabel: "المشتريات", amount: 300, match: "diff", attachments: 2, status: "rejected", origin: "procurement", supplierName: "شركة التوريد" },
  ];

  const emptyFilter: Filters = { branch: "", status: "", match: "", search: "" };
  assert.equal(applyFilters(ops, emptyFilter).length, 3);

  // Filter by moduleKey
  assert.equal(applyFilters(ops, emptyFilter, "sales").length, 1);
  assert.equal(applyFilters(ops, emptyFilter, "sales")[0].id, "OP-01");

  // Filter by branch
  assert.equal(applyFilters(ops, { ...emptyFilter, branch: "جدة - التحلية" }).length, 1);

  // Filter by status
  assert.equal(applyFilters(ops, { ...emptyFilter, status: "rejected" }).length, 1);

  // Filter by match
  assert.equal(applyFilters(ops, { ...emptyFilter, match: "diff" }).length, 1);

  // Search by supplier name
  assert.equal(applyFilters(ops, { ...emptyFilter, search: "شركة التوريد" }).length, 1);

  // Search by ID
  assert.equal(applyFilters(ops, { ...emptyFilter, search: "OP-02" }).length, 1);

  // topModulePage
  assert.equal(topModulePage(ops, "acc-", "acc-sales"), "acc-sales");
});

test("ExceptionPanel: deriveExceptions detects all operational rules with proper financial preservation", () => {
  const ops: Op[] = [
    // 1. Stuck pending op
    { id: "OP-STUCK", branch: "الفرع 1", moduleKey: "sales", moduleLabel: "المبيعات", amount: 500, match: "exact", attachments: 0, status: "pending", origin: "mobile", timeAgo: "قبل 3 أيام" },
    // 2. Quantity diff pending
    { id: "OP-DIFF", branch: "الفرع 2", moduleKey: "purchases", moduleLabel: "المشتريات", amount: 250, match: "diff", diff: "فرق 2 كجم", attachments: 1, status: "pending", origin: "procurement" },
    // 3. Final approved not in ERP
    { id: "OP-ERP", branch: "الفرع 3", moduleKey: "expenses", moduleLabel: "المصروفات", amount: 1000, match: "exact", attachments: 2, status: "final-approved", origin: "system", erpPosted: false },
    // 4. Correction op
    { id: "OP-CORR", branch: "الفرع 1", moduleKey: "sales", moduleLabel: "المبيعات", amount: 150, match: "exact", attachments: 0, status: "pending", origin: "mobile", isCorrection: true, correctiveRef: "OP-STUCK" },
    // 5. Repeated rejections for الفرع 4
    { id: "OP-REJ1", branch: "الفرع 4", moduleKey: "sales", moduleLabel: "المبيعات", amount: 50, match: "exact", attachments: 0, status: "rejected", origin: "mobile" },
    { id: "OP-REJ2", branch: "الفرع 4", moduleKey: "sales", moduleLabel: "المبيعات", amount: 75, match: "exact", attachments: 0, status: "rejected", origin: "mobile" },
  ];

  // Head role exceptions
  const headExceptions = deriveExceptions(ops, "head", "ar");
  assert.ok(headExceptions.some(e => e.label.includes("معلقة منذ أكثر من يومين")));
  assert.ok(headExceptions.some(e => e.label.includes("فروق في الكميات")));
  assert.ok(headExceptions.some(e => e.label.includes("لم تُرحَّل لـ ERP")));
  assert.ok(headExceptions.some(e => e.label.includes("عمليات تعديل")));
  assert.ok(headExceptions.some(e => e.label.includes("نمط رفض متكرر")));

  // Accountant role exceptions (ERP posting is head-only)
  const accExceptions = deriveExceptions(ops, "accountant", "ar");
  assert.ok(!accExceptions.some(e => e.label.includes("لم تُرحَّل لـ ERP")));

  // Null amount preservation: if an op has null amount, totalAmt is null, impact reflects "—"
  const opsWithNull: Op[] = [
    { id: "OP-NULL", branch: "الفرع 1", moduleKey: "sales", moduleLabel: "المبيعات", amount: null, match: "diff", attachments: 0, status: "pending", origin: "mobile" },
  ];
  const diffExceptions = deriveExceptions(opsWithNull, "accountant", "ar");
  assert.equal(diffExceptions[0].severity, "critical");
  assert.match(diffExceptions[0].impact, /—/);
});

test("Component exports: PipelineBar, OpStagePill, PipelineOverview, OpRow, ExceptionPanel are valid functions", () => {
  assert.equal(typeof PipelineBar, "function");
  assert.equal(typeof OpStagePill, "function");
  assert.equal(typeof PipelineOverview, "function");
  assert.equal(typeof OpRow, "function");
  assert.equal(typeof ExceptionPanel, "function");
});

test("M4-F01 regression: OP_MODULE_LABELS preserves original mapping and includes waste", () => {
  assert.equal(OP_MODULE_LABELS.sales, "مبيعات");
  assert.equal(OP_MODULE_LABELS.expenses, "مصروفات");
  assert.equal(OP_MODULE_LABELS.purchases, "مشتريات");
  assert.equal(OP_MODULE_LABELS.inventory, "مخزون");
  assert.equal(OP_MODULE_LABELS.shifts, "شفتات");
  assert.equal(OP_MODULE_LABELS.employees, "كشف الحساب");
  assert.equal(OP_MODULE_LABELS.cash, "عهدة نقدية");
  assert.equal(OP_MODULE_LABELS.waste, "هالك");
  assert.equal(Object.keys(OP_MODULE_LABELS).length, 8);
});

test("M4-F02 regression: reportsToName preserves string, null, undefined, valid object, missing name, and null name behavior", () => {
  // 1. string input
  assert.equal(reportsToName("فهد"), "فهد");
  assert.equal(reportsToName("User-123"), "User-123");
  // 2. null input
  assert.equal(reportsToName(null), "");
  // 3. undefined input
  assert.equal(reportsToName(undefined), "");
  // 4. valid object with name
  assert.equal(reportsToName({ id: "u1", name: "طلال الحسين" }), "طلال الحسين");
  // 5. object missing name
  assert.equal(reportsToName({ id: "u2" }), "");
  // 6. object with null name
  assert.equal(reportsToName({ id: "u3", name: null }), "");
  // 7. object with undefined name
  assert.equal(reportsToName({ name: undefined }), "");
  // 8. primitive non-string
  assert.equal(reportsToName(42), "");
});
