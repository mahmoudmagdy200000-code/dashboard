import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccountantReview,
  canHeadReview,
  assertReportModificationAllowed,
  createShiftClarificationReturn,
  type ShiftDailyCloseReport,
} from "./shiftReportFinalityContract.ts";

test("D11 Scenario 1: Manager daily close arrives in scoped accountant review queue with source IDs", () => {
  const report: ShiftDailyCloseReport = {
    shiftId: "shift-20261031-01",
    branchId: "branch-north-1",
    brandId: "brand-north",
    closingDate: "2026-10-31",
    status: "manager_submitted",
    revision: 1,
    openingBalanceHalalas: 50000,
    cashCollectedHalalas: 125000,
    managerSubmittedAt: "2026-10-31T22:30:00Z",
  };

  // 1. Accountant assigned to North branch is permitted to review
  const accountantNorth = { id: "acc-1", roles: ["accountant"], branchIds: ["branch-north-1"] };
  assert.equal(canAccountantReview(accountantNorth, report), true);

  // 2. Cross-branch accountant is forbidden from reviewing
  const accountantSouth = { id: "acc-2", roles: ["accountant"], branchIds: ["branch-south-1"] };
  assert.equal(canAccountantReview(accountantSouth, report), false);

  // 3. Source IDs and financial counts remain intact
  assert.equal(report.shiftId, "shift-20261031-01");
  assert.equal(report.closingDate, "2026-10-31");
  assert.equal(report.cashCollectedHalalas, 125000);
});

test("D11 Scenario 2: Returned report for clarification remains linked to the original date with incremented revision", () => {
  const originalReport: ShiftDailyCloseReport = {
    shiftId: "shift-20261031-01",
    branchId: "branch-north-1",
    brandId: "brand-north",
    closingDate: "2026-10-31",
    status: "manager_submitted",
    revision: 1,
    openingBalanceHalalas: 50000,
    cashCollectedHalalas: 125000,
    managerSubmittedAt: "2026-10-31T22:30:00Z",
  };

  // Clarification return requires mandatory reason
  assert.throws(
    () => createShiftClarificationReturn(originalReport, ""),
    /REASON_REQUIRED: Clarification request requires a non-empty reason/,
  );

  const returnedReport = createShiftClarificationReturn(
    originalReport,
    "يرجى إعادة إرفاق إيصال إيداع شبكة الراجحي المفقود",
  );

  // Must remain strictly bound to the original closing day
  assert.equal(returnedReport.closingDate, originalReport.closingDate);
  assert.equal(returnedReport.shiftId, originalReport.shiftId);
  // Revision counter must increment
  assert.equal(returnedReport.revision, 2);
  // Status transitions to head_returned / manager_clarification
  assert.equal(returnedReport.status, "manager_clarification");
  assert.equal(returnedReport.clarificationReason, "يرجى إعادة إرفاق إيصال إيداع شبكة الراجحي المفقود");
});

test("D11 Scenario 3: Final Head Accountant approval establishes absolute immutability and blocks post-approval edits", () => {
  const finalReport: ShiftDailyCloseReport = {
    shiftId: "shift-20261031-01",
    branchId: "branch-north-1",
    brandId: "brand-north",
    closingDate: "2026-10-31",
    status: "final_approved",
    revision: 2,
    openingBalanceHalalas: 50000,
    cashCollectedHalalas: 125000,
    managerSubmittedAt: "2026-10-31T22:30:00Z",
    finalApprovedAt: "2026-10-31T23:45:00Z",
    approvedBy: "head-acc-1",
  };

  // Only Head Accountant can perform final review
  const headAccountant = { id: "head-1", roles: ["head"] };
  const genericAccountant = { id: "acc-1", roles: ["accountant"] };
  assert.equal(canHeadReview(headAccountant), true);
  assert.equal(canHeadReview(genericAccountant), false);

  // Post-final approval modification must fail closed
  assert.throws(
    () => assertReportModificationAllowed(finalReport),
    /IMMUTABLE_FINAL_REPORT: Final approved daily close reports cannot be modified or re-opened/,
  );
});
