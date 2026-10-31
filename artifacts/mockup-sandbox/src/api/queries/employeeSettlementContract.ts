import { assertIntentNotConcurrent, assertIntentSessionValid } from "../idempotencyIntent.ts";

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

export function executeEmployeeSettlementFlow(
  params: {
    employeeId: string;
    reason: string;
    amountHalalas?: number;
    currentActorId?: string;
    intent?: {
      idempotencyKey: string;
      actorId?: string;
      status?: string;
      payload?: {
        employeeId?: string;
        reason?: string;
        amountHalalas?: number;
        actorId?: string;
      };
    };
    idempotencyKey?: string;
  },
  apiDispatcher?: (url: string, body: any, headers?: Record<string, string>) => any,
) {
  // Step 1: Concurrency guard
  assertIntentNotConcurrent(params.intent);

  // Step 2: Session guard
  assertIntentSessionValid(params.intent, params.currentActorId);

  // Step 3: Validate settlement payload (reason >= 3 chars, etc.)
  const payload = settlementRequestPayload(params.reason, params.amountHalalas);

  // Step 4: Payload alteration guard under active intent
  if (params.intent?.payload) {
    const p = params.intent.payload;
    const isEmployeeModified = p.employeeId !== undefined && p.employeeId !== params.employeeId;
    const isReasonModified = p.reason !== undefined && p.reason !== payload.reason;
    const isAmountModified = p.amountHalalas !== undefined && p.amountHalalas !== params.amountHalalas;
    const isActorModified =
      p.actorId !== undefined &&
      params.currentActorId !== undefined &&
      p.actorId !== params.currentActorId;

    if (isEmployeeModified || isReasonModified || isAmountModified || isActorModified) {
      const conflictError: any = new Error(
        "IDEMPOTENCY_CONFLICT_PAYLOAD_ALTERATION: Modifying employee, reason, amount, or actor under an active intent is forbidden",
      );
      conflictError.response = {
        status: 409,
        data: {
          error: {
            code: "IDEMPOTENCY_CONFLICT",
            message: "Employee settlement payload altered under active idempotency intent",
            messageAr: "لا يمكن تعديل سبب التسوية أو تبديل الموظف أثناء وجود معاملة غير محسومة",
          },
        },
      };
      throw conflictError;
    }
    if (p.reason === undefined) {
      p.reason = payload.reason;
    }
    if (p.amountHalalas === undefined && params.amountHalalas !== undefined) {
      p.amountHalalas = params.amountHalalas;
    }
    if (p.actorId === undefined && params.currentActorId) {
      p.actorId = params.currentActorId;
    }
  } else if (params.intent) {
    params.intent.payload = {
      employeeId: params.employeeId,
      reason: payload.reason,
      amountHalalas: params.amountHalalas,
      actorId: params.currentActorId,
    };
  }

  if (params.intent && !params.intent.actorId && params.currentActorId) {
    params.intent.actorId = params.currentActorId;
  }

  // Step 5: Transition intent to in_flight
  if (params.intent) {
    params.intent.status = "in_flight";
  }

  // Step 6: Bind stable idempotency key
  const effectiveKey = params.intent?.idempotencyKey ?? params.idempotencyKey;
  const headers: Record<string, string> = {};
  if (effectiveKey) {
    headers["Idempotency-Key"] = effectiveKey;
  }

  // Step 7: Dispatch
  if (apiDispatcher) {
    const dispatchResult = apiDispatcher(
      `/company/me/employees/${encodeURIComponent(params.employeeId)}/settle-balance`,
      payload,
      headers,
    );
    if (dispatchResult && typeof dispatchResult.then === "function") {
      return dispatchResult.then(
        (res: any) => {
          if (params.intent) {
            params.intent.status = "resolved";
          }
          return requirePendingSettlement(res);
        },
        (err: any) => {
          if (params.intent) {
            params.intent.status = "timed_out";
          }
          throw err;
        },
      );
    }
    if (params.intent) {
      params.intent.status = "resolved";
    }
    return requirePendingSettlement(dispatchResult);
  }

  if (params.intent) {
    params.intent.status = "resolved";
  }
  return requirePendingSettlement({
    status: "pending",
    balanceModified: false,
    employeeId: params.employeeId,
  } as any);
}
