/** SHF review permissions from the operation API, with no inferred phase. */
export type ShfReviewOperation = {
  module?: string;
  moduleKey?: string;
  status: string;
  reportReview?: Record<string, unknown> | null;
};

export type ShfReviewAction = "approve" | "returnToManager" | "clarify";

export type ShfReviewGroup = "accountant_review" | "head_returned" | "pending_unknown" |
  "head_review" | "final_approved" | "manager_returned" | "other";

export function getShfReviewGroup(op: ShfReviewOperation): ShfReviewGroup | null {
  if ((op.module ?? op.moduleKey) !== "shifts") return null;
  if (op.status === "pending") {
    if (op.reportReview?.phase === "accountant_review") return "accountant_review";
    if (op.reportReview?.phase === "head_returned") return "head_returned";
    return "pending_unknown";
  }
  if (op.status === "rejected" && op.reportReview?.phase === "manager_returned") return "manager_returned";
  if (op.status === "approved" && op.reportReview?.phase === "head_review") return "head_review";
  if (op.status === "final-approved") return "final_approved";
  return "other";
}

/** Only rows in the current, Backend-scoped API page are rendered. */
export function shfReviewRows<T extends ShfReviewOperation>(page?: { data: readonly T[] } | null): T[] {
  return Array.isArray(page?.data) ? page.data.filter(op => (op.module ?? op.moduleKey) === "shifts") : [];
}

export function shfReviewPageTarget(page:number, totalPages:number | undefined, direction:-1 | 1):number {
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(totalPages) || totalPages == null || totalPages < 1) return page;
  return Math.min(totalPages, Math.max(1, page + direction));
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
