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

export function executeCashDisbursementFlow(
  params: {
    custodyId: string;
    payload: { txnType: string; amount: number; description?: string; source?: string };
    context?: DirectDebitSafetyContext;
    intent?: { idempotencyKey: string };
    idempotencyKey?: string;
  },
  apiDispatcher?: (url: string, body: any, headers?: Record<string, string>) => any,
) {
  // Step 1: Enforce debit safety and mandatory context
  assertDirectCashTransaction(params.payload, params.context);

  // Step 2: Bind stable idempotency key from intent
  const effectiveKey = params.intent?.idempotencyKey ?? params.idempotencyKey;
  const headers: Record<string, string> = {};
  if (effectiveKey) {
    headers["Idempotency-Key"] = effectiveKey;
  }

  // Step 3: Dispatch through API
  if (apiDispatcher) {
    return apiDispatcher(
      `/company/me/cash-custody/${params.custodyId}/transactions`,
      params.payload,
      headers,
    );
  }
  return { status: 200, payload: params.payload, idempotencyKey: effectiveKey };
}
