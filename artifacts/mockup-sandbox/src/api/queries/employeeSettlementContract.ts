export function settlementRequestPayload(reason: string, amountHalalas?: number) {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3) {
    throw new Error("Settlement reason must contain at least three characters");
  }
  return amountHalalas === undefined
    ? { reason: trimmedReason }
    : { reason: trimmedReason, amountHalalas };
}

export function requirePendingSettlement<T extends { status: string; balanceModified: boolean }>(result: T): T {
  if (result.status !== "pending" || result.balanceModified !== false) {
    throw new Error("Settlement request did not return a pending, unposted state");
  }
  return result;
}

/**
 * Head Accountant Review Guard (BE-09, D09):
 * Only Head Accountant ('head' | 'head_accountant') can approve or reject employee settlement requests.
 * Ordinary accountants are strictly forbidden from reviewing settlements.
 * Self-approval (reviewer == requester) is also strictly prohibited.
 */
export function assertCanReviewSettlement(
  actor: { roles?: string[]; id?: string } | null | undefined,
  settlement?: { createdByUserId?: string; id?: string }
): void {
  if (!actor || !actor.roles || actor.roles.length === 0) {
    throw new Error("FORBIDDEN_HEAD_ACCOUNTANT_REQUIRED: Authentication and roles required for settlement review.");
  }
  const isHead = actor.roles.includes("head") || actor.roles.includes("head_accountant");
  if (!isHead) {
    throw new Error("FORBIDDEN_HEAD_ACCOUNTANT_REQUIRED: Only head accountant can review settlements.");
  }
  if (settlement?.createdByUserId && actor.id && settlement.createdByUserId === actor.id) {
    throw new Error("FORBIDDEN_SELF_APPROVAL: Self-approval is prohibited; requester cannot approve own settlement.");
  }
}

export function validateSettlementRejectionReason(reason?: string | null): string | undefined {
  if (reason === undefined || reason === null) return undefined;
  const trimmed = reason.trim();
  if (trimmed.length > 500) {
    throw new Error("VALIDATION_ERROR: Rejection reason cannot exceed 500 characters.");
  }
  return trimmed || undefined;
}

export async function executeSettlementApprovalFlow(
  settlementId: string,
  actor: { roles?: string[]; id?: string },
  apiClient: { post: (url: string, body?: any) => Promise<any> },
  settlementMeta?: { createdByUserId?: string }
) {
  assertCanReviewSettlement(actor, settlementMeta);
  return apiClient.post(`/company/me/employee-settlements/${encodeURIComponent(settlementId)}/approve`);
}

export async function executeSettlementRejectionFlow(
  settlementId: string,
  actor: { roles?: string[]; id?: string },
  rejectionReason: string | undefined,
  apiClient: { post: (url: string, body?: any) => Promise<any> },
  settlementMeta?: { createdByUserId?: string }
) {
  assertCanReviewSettlement(actor, settlementMeta);
  const validatedReason = validateSettlementRejectionReason(rejectionReason);
  return apiClient.post(`/company/me/employee-settlements/${encodeURIComponent(settlementId)}/reject`, {
    rejectionReason: validatedReason,
    reason: validatedReason,
  });
}
