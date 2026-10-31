/**
 * D11 Report Review & Final Approval Chain Contract
 * Enforces:
 * 1. Daily close arrival in scoped accountant review queue (branch-isolated).
 * 2. Returned report for clarification remains linked to the original day with incremented revision.
 * 3. Final Head Accountant approval establishes absolute immutability.
 */

export interface ShiftDailyCloseReport {
  shiftId: string;
  branchId: string;
  brandId: string;
  closingDate: string;
  status: "manager_submitted" | "accountant_review" | "manager_clarification" | "final_approved";
  revision: number;
  openingBalanceHalalas: number;
  cashCollectedHalalas: number;
  managerSubmittedAt: string;
  clarificationReason?: string;
  finalApprovedAt?: string;
  approvedBy?: string;
}

export function canAccountantReview(
  actor: { roles?: string[]; branchIds?: string[] } | null | undefined,
  report: ShiftDailyCloseReport,
): boolean {
  if (!actor || !actor.roles || !actor.roles.includes("accountant")) return false;
  if (!actor.branchIds || !Array.isArray(actor.branchIds)) return false;
  return actor.branchIds.includes(report.branchId);
}

export function canHeadReview(
  actor: { roles?: string[] } | null | undefined,
): boolean {
  if (!actor || !actor.roles) return false;
  return actor.roles.includes("head") || actor.roles.includes("head_accountant");
}

export function createShiftClarificationReturn(
  report: ShiftDailyCloseReport,
  reason: string,
): ShiftDailyCloseReport {
  const cleanReason = reason.trim();
  if (cleanReason.length === 0) {
    throw new Error("REASON_REQUIRED: Clarification request requires a non-empty reason");
  }

  assertReportModificationAllowed(report);

  return {
    ...report,
    revision: report.revision + 1,
    status: "manager_clarification",
    clarificationReason: cleanReason,
  };
}

export function assertReportModificationAllowed(report: ShiftDailyCloseReport): void {
  if (report.status === "final_approved" || report.finalApprovedAt) {
    throw new Error("IMMUTABLE_FINAL_REPORT: Final approved daily close reports cannot be modified or re-opened");
  }
}
