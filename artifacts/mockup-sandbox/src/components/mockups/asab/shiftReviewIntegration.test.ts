import test from "node:test";
import assert from "node:assert/strict";
import { getShfReviewGroup, getShfReviewPolicy, runShfReviewAction } from "./shiftReviewQueue.ts";
import {
  canAccountantReview,
  canHeadReview,
  createShiftClarificationReturn,
  assertReportModificationAllowed,
  type ShiftDailyCloseReport,
} from "./shiftReportFinalityContract.ts";

test("D11 Integration: Manager submitted shift report arrives in accountant review queue", () => {
  const managerSubmittedOp = {
    id: "op-shf-101",
    module: "shifts",
    status: "pending",
    reportReview: {
      phase: "accountant_review",
      branchId: "branch-riyadh-01",
      shiftId: "shift-2026-10-31-01",
      workday: "2026-10-31",
      revision: 1,
    },
  };

  const group = getShfReviewGroup(managerSubmittedOp);
  assert.equal(group, "accountant_review", "Manager submitted shift must be categorized into accountant_review group");

  // Verify accountant with matching branch can review
  const authorizedAccountant = { roles: ["accountant"], branchIds: ["branch-riyadh-01"] };
  const unauthorizedAccountant = { roles: ["accountant"], branchIds: ["branch-jeddah-02"] };

  const report: ShiftDailyCloseReport = {
    shiftId: "shift-2026-10-31-01",
    branchId: "branch-riyadh-01",
    brandId: "brand-1",
    closingDate: "2026-10-31",
    status: "accountant_review",
    revision: 1,
    openingBalanceHalalas: 50000,
    cashCollectedHalalas: 250000,
    managerSubmittedAt: "2026-10-31T20:00:00Z",
  };

  assert.equal(canAccountantReview(authorizedAccountant, report), true, "Authorized accountant can review matching branch");
  assert.equal(canAccountantReview(unauthorizedAccountant, report), false, "Accountant from another branch cannot review");
});

test("D11 Integration: Clarification return strictly preserves original workday/date and increments revision", () => {
  const originalReport: ShiftDailyCloseReport = {
    shiftId: "shift-2026-10-31-02",
    branchId: "branch-riyadh-01",
    brandId: "brand-1",
    closingDate: "2026-10-31",
    status: "accountant_review",
    revision: 1,
    openingBalanceHalalas: 50000,
    cashCollectedHalalas: 180000,
    managerSubmittedAt: "2026-10-31T21:00:00Z",
  };

  const returned = createShiftClarificationReturn(originalReport, "Discrepancy in counted cash vs drawer");
  assert.equal(returned.closingDate, "2026-10-31", "Original closing date must remain unchanged");
  assert.equal(returned.shiftId, "shift-2026-10-31-02", "Shift ID must remain unchanged");
  assert.equal(returned.revision, 2, "Revision must be incremented by 1");
  assert.equal(returned.status, "manager_clarification");
  assert.equal(returned.clarificationReason, "Discrepancy in counted cash vs drawer");

  // Empty reason must throw error
  assert.throws(
    () => createShiftClarificationReturn(originalReport, "   "),
    /REASON_REQUIRED/,
    "Clarification without reason must be refused"
  );
});

test("D11 Integration: Head Accountant final approval enforces hard immutability", () => {
  const approvedReport: ShiftDailyCloseReport = {
    shiftId: "shift-2026-10-31-03",
    branchId: "branch-riyadh-01",
    brandId: "brand-1",
    closingDate: "2026-10-31",
    status: "final_approved",
    revision: 2,
    openingBalanceHalalas: 50000,
    cashCollectedHalalas: 200000,
    managerSubmittedAt: "2026-10-31T20:00:00Z",
    finalApprovedAt: "2026-10-31T22:30:00Z",
    approvedBy: "head-accountant-01",
  };

  // Assert report modification allowed throws error on final_approved report
  assert.throws(
    () => assertReportModificationAllowed(approvedReport),
    /IMMUTABLE_FINAL_REPORT/,
    "Final approved shift report cannot be modified"
  );

  // Attempting clarification return on a final report must also be refused
  assert.throws(
    () => createShiftClarificationReturn(approvedReport, "Late correction"),
    /IMMUTABLE_FINAL_REPORT/,
    "Cannot return a final approved report for clarification"
  );
});
