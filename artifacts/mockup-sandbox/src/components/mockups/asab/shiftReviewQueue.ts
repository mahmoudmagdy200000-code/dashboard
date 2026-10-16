/** SHF review permissions from the operation API, with no inferred phase. */
export type ShfReviewOperation = {
  module?: string;
  moduleKey?: string;
  status: string;
  reportReview?: Record<string, unknown> | null;
};

export type ShfReviewAction = "approve" | "returnToManager" | "clarify";

export function getShfReviewGroup(op: ShfReviewOperation): "pending" | "returned" | "final" | "other" | null {
  if ((op.module ?? op.moduleKey) !== "shifts") return null;
  if (op.status === "pending") return "pending";
  if (op.status === "rejected" && op.reportReview?.phase === "manager_returned") return "returned";
  if (op.status === "approved" || op.status === "final-approved") return "final";
  return "other";
}

export function getShfReviewPolicy(op: ShfReviewOperation | undefined, role: string | null | undefined,
  detail?: ShfReviewOperation): Record<ShfReviewAction, boolean> {
  const denied = { approve: false, returnToManager: false, clarify: false };
  if (!op || role !== "accountant" || (op.module ?? op.moduleKey) !== "shifts" || op.status !== "pending") return denied;
  if (detail && (detail.module ?? detail.moduleKey) !== "shifts") return denied;
  if (detail && detail.status !== "pending") return denied;
  if (detail && detail.reportReview?.phase !== op.reportReview?.phase) return denied;
  const phase = (detail ?? op).reportReview?.phase;
  if (phase === "accountant_review") return { approve: true, returnToManager: true, clarify: true };
  if (phase === "head_returned") return { approve: false, returnToManager: true, clarify: false };
  return denied;
}

export function runShfReviewAction(op: ShfReviewOperation | undefined, role: string | null | undefined,
  action: ShfReviewAction, effect: () => void, detail?: ShfReviewOperation): boolean {
  if (!getShfReviewPolicy(op, role, detail)[action]) return false;
  effect();
  return true;
}
