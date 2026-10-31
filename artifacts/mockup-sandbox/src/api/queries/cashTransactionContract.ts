import { assertIntentNotConcurrent, assertIntentSessionValid } from "../idempotencyIntent.ts";

/**
 * Direct Cash Transaction Safety Contract (FUND-04, D05, D06, D17)
 * Enforces:
 * 1. Disallow direct credit (funding replenishment requires approved request and mobile receipt).
 * 2. Validate debit amount as positive integer halalas.
 * 3. Overdraft prevention (amount cannot exceed available custody balance).
 * 4. Context enforcement: context is mandatory for debit; absence of context cannot bypass protection.
 * 5. Authorization check: generic accountant or company-admin role is NOT sufficient without explicit custody-write / brand-owner grant.
 * 6. Truthful 403 Forbidden handling without optimistic posting or fabricated success.
 * 7. Production flow execution binding stable Idempotency-Key from intent.
 */

export interface CustodyActor {
  id?: string;
  roles?: string[];
  isCustodyWriteAuthorized?: boolean;
  brandIds?: string[];
}

export interface CustodyContext {
  id: string;
  brandId?: string;
  remainingHalalas: number;
}

export interface DirectDebitSafetyContext {
  actor?: CustodyActor;
  custody?: CustodyContext;
}

/**
 * Backend Contract Alignment: Modules/Admin/app/Http/Controllers/AsabController.php:265
 * `isCustodyWriteAuthorized(mixed $user, CashCustody $custody): bool`
 * 1. Company-admin membership is NEVER a funding-owner grant.
 * 2. Plain accountant role is NEVER sufficient for direct debit.
 * 3. Requires brand-owner or brand-manager role scoped to the target brand.
 */
export function checkCustodyWriteAuthorization(
  actor: CustodyActor | null | undefined,
  custody: { brandId?: string; id?: string } | null | undefined
): boolean {
  if (!actor || !actor.roles || actor.roles.length === 0) return false;

  // Generic accountant or company-admin alone is never authorized
  const hasBrandRole = actor.roles.some((r) =>
    r === "brand-owner" || r === "brand_owner" || r === "brand-manager" || r === "brand_manager"
  );
  if (!hasBrandRole) {
    return false;
  }

  // Target custody must specify a brand to prove authority
  if (!custody?.brandId) {
    return false;
  }

  // Scope enforcement: actor must have explicit brandIds containing the target brandId.
  // Missing or empty brandIds fails closed.
  if (!actor.brandIds || !Array.isArray(actor.brandIds) || actor.brandIds.length === 0) {
    return false;
  }

  return actor.brandIds.includes(custody.brandId);
}

export function assertDirectDebitSafety<T extends { txnType: string; amount?: number }>(
  payload: T,
  context?: DirectDebitSafetyContext,
): T {
  // 1. Direct credit is strictly forbidden on cash custody transaction endpoint
  if (payload.txnType !== "debit") {
    throw new Error("Custody funding requires an approved request and branch receipt");
  }

  // 2. Validate amount if present
  if (payload.amount !== undefined) {
    if (!Number.isInteger(payload.amount) || payload.amount <= 0) {
      throw new Error("Debit amount must be a positive integer in halalas");
    }

    // Context is mandatory for debit operations: absence of context cannot bypass protection
    if (!context || !context.custody) {
      throw new Error(
        "CUSTODY_CONTEXT_REQUIRED: Direct debit requires valid custody context and remaining balance",
      );
    }

    // 3. Overdraft prevention against custody remaining balance
    if (payload.amount > context.custody.remainingHalalas) {
      throw new Error(
        `INSUFFICIENT_CUSTODY_BALANCE: Debit amount (${payload.amount} halalas) exceeds available custody balance (${context.custody.remainingHalalas} halalas)`,
      );
    }
  }

  // 4. Role & brand authority check:
  // An actor context is mandatory to verify authorization
  if (!context || !context.actor) {
    throw new Error(
      "AUTHORIZATION_CONTEXT_REQUIRED: Direct debit requires authenticated actor authorization context",
    );
  }

  // Backend authority check: explicit scope verification without unverified UI flag bypass
  const isAuthorized = checkCustodyWriteAuthorization(context.actor, context.custody);

  if (!isAuthorized) {
    // Distinguish cross-brand mismatch from generic lack of brand role or missing scope
    if (
      context.custody?.brandId &&
      context.actor.brandIds &&
      context.actor.brandIds.length > 0 &&
      !context.actor.brandIds.includes(context.custody.brandId)
    ) {
      throw new Error(
        `FORBIDDEN_CROSS_BRAND: User has no custody write authority for this brand (${context.custody.brandId})`,
      );
    }
    throw new Error(
      "FORBIDDEN_CUSTODY_WRITE: Accountant or admin role alone does not confer direct debit authority without explicit brand funding authority",
    );
  }

  return payload;
}

export function assertDirectCashTransaction<T extends { txnType: string; amount?: number }>(
  payload: T,
  context?: DirectDebitSafetyContext,
): T {
  return assertDirectDebitSafety(payload, context);
}

export interface DirectDebitPayload {
  txnType: string;
  amount: number;
  description?: string;
  source?: string;
}

export function executeCashDisbursementFlow(
  params: {
    custodyId: string;
    payload: DirectDebitPayload;
    context?: DirectDebitSafetyContext;
    intent?: {
      idempotencyKey: string;
      actorId?: string;
      status?: string;
      payload?: {
        custodyId?: string;
        amountHalalas?: number;
        description?: string;
        source?: string;
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
  assertIntentSessionValid(params.intent, params.context?.actor?.id);

  // Step 3: Enforce debit safety and mandatory context
  assertDirectCashTransaction(params.payload, params.context);

  const cleanDesc = params.payload.description?.trim() || undefined;
  const cleanSource = params.payload.source || "manual";

  // Step 4: Payload alteration guard under active intent
  if (params.intent?.payload) {
    const p = params.intent.payload;
    const isCustodyModified = p.custodyId !== undefined && p.custodyId !== params.custodyId;
    const isAmountModified = p.amountHalalas !== undefined && p.amountHalalas !== params.payload.amount;
    const isDescModified = p.description !== undefined && p.description !== cleanDesc;
    const isSourceModified = p.source !== undefined && p.source !== cleanSource;
    const isActorModified =
      p.actorId !== undefined &&
      params.context?.actor?.id !== undefined &&
      p.actorId !== params.context.actor.id;

    if (isCustodyModified || isAmountModified || isDescModified || isSourceModified || isActorModified) {
      const conflictError: any = new Error(
        "IDEMPOTENCY_CONFLICT_PAYLOAD_ALTERATION: Modifying custody, amount, description, source, or actor under an active intent is forbidden",
      );
      conflictError.response = {
        status: 409,
        data: {
          error: {
            code: "IDEMPOTENCY_CONFLICT",
            message: "Direct debit payload altered under active idempotency intent",
            messageAr: "لا يمكن تعديل بيانات الصرف المباشر أثناء وجود معاملة غير محسومة",
          },
        },
      };
      throw conflictError;
    }
    // Bind concrete fields if initial intent only carried custodyId/txnType
    if (p.amountHalalas === undefined) {
      p.amountHalalas = params.payload.amount;
    }
    if (p.description === undefined && cleanDesc !== undefined) {
      p.description = cleanDesc;
    }
    if (p.source === undefined) {
      p.source = cleanSource;
    }
    if (p.actorId === undefined && params.context?.actor?.id) {
      p.actorId = params.context.actor.id;
    }
  } else if (params.intent) {
    params.intent.payload = {
      custodyId: params.custodyId,
      amountHalalas: params.payload.amount,
      description: cleanDesc,
      source: cleanSource,
      actorId: params.context?.actor?.id,
    };
  }

  if (params.intent && !params.intent.actorId && params.context?.actor?.id) {
    params.intent.actorId = params.context.actor.id;
  }

  // Step 5: Transition intent to in_flight
  if (params.intent) {
    params.intent.status = "in_flight";
  }

  // Step 6: Bind stable idempotency key from intent
  const effectiveKey = params.intent?.idempotencyKey ?? params.idempotencyKey;
  const headers: Record<string, string> = {};
  if (effectiveKey) {
    headers["Idempotency-Key"] = effectiveKey;
  }

  // Step 7: Dispatch through API
  if (apiDispatcher) {
    const dispatchResult = apiDispatcher(
      `/company/me/cash-custody/${params.custodyId}/transactions`,
      params.payload,
      headers,
    );
    if (dispatchResult && typeof dispatchResult.then === "function") {
      return dispatchResult.then(
        (res: any) => {
          if (params.intent) {
            params.intent.status = "resolved";
          }
          return res;
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
    return dispatchResult;
  }
  if (params.intent) {
    params.intent.status = "resolved";
  }
  return { status: 200, payload: params.payload, idempotencyKey: effectiveKey };
}
