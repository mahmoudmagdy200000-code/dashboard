/**
 * Financial Mutation Intent & Idempotency Manager (AUD-04, D17)
 *
 * Requirements:
 * 1. A financial mutation intent is bound to a stable RFC 4122 v4 UUID Idempotency-Key.
 * 2. On transport retry, network timeout, or unknown outcome, the retry MUST reuse
 *    the EXACT SAME Idempotency-Key and EXACT SAME payload.
 * 3. Never generate a fresh UUID on retry, as that would bypass idempotency and
 *    cause duplicate financial transactions if the first request succeeded server-side.
 * 4. Detect and properly handle HTTP 409 Conflict (IDEMPOTENCY_CONFLICT) when
 *    a key is reused with a modified payload or conflicting parameters.
 * 5. Rotate/clear the intent key only upon definitive outcome (200/201 success)
 *    or explicit form reset for a distinct action.
 */

export function generateCommandId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type IntentStatus = "idle" | "in_flight" | "timed_out" | "resolved" | "conflict";

export interface FinancialIntent<TPayload> {
  idempotencyKey: string;
  actorId?: string;
  companyId?: string;
  payload: TPayload;
  serializedPayload: string;
  status: IntentStatus;
  attemptCount: number;
  lastError?: Error;
}

export function createFinancialIntent<TPayload>(
  payload: TPayload,
  explicitKey?: string,
  actorId?: string,
  companyId?: string,
): FinancialIntent<TPayload> {
  const idempotencyKey = explicitKey || generateCommandId();
  return {
    idempotencyKey,
    actorId,
    companyId,
    payload,
    serializedPayload: JSON.stringify(payload),
    status: "idle",
    attemptCount: 0,
  };
}

export function assertIntentSessionValid(
  intent: { actorId?: string; companyId?: string } | null | undefined,
  currentActorId?: string | null,
  currentCompanyId?: string | null,
): void {
  if (intent?.actorId && currentActorId && intent.actorId !== currentActorId) {
    throw new Error(
      "IDEMPOTENCY_SESSION_MISMATCH: Stale intent originating from another user session cannot be reused.",
    );
  }
  if (intent?.companyId && currentCompanyId && intent.companyId !== currentCompanyId) {
    throw new Error(
      "IDEMPOTENCY_COMPANY_MISMATCH: Stale intent originating from another company context cannot be reused.",
    );
  }
}

export function assertIntentNotConcurrent(intent: { status?: string } | null | undefined): void {
  if (intent?.status === "in_flight") {
    throw new Error(
      "IDEMPOTENCY_CONCURRENT_DISPATCH: Operation is already in flight. Rapid duplicate submission is blocked.",
    );
  }
}

export function prepareRetryIntent<TPayload>(intent: FinancialIntent<TPayload>, updatedPayload?: TPayload): {
  idempotencyKey: string;
  payload: TPayload;
  isPayloadModified: boolean;
} {
  const currentSerialized = JSON.stringify(updatedPayload ?? intent.payload);
  const isPayloadModified = currentSerialized !== intent.serializedPayload;

  return {
    idempotencyKey: intent.idempotencyKey,
    payload: (updatedPayload ?? intent.payload),
    isPayloadModified,
  };
}

export interface MockHttpResponse<T> {
  status: number;
  data: T;
}

export interface BackendIdempotencyStore {
  records: Map<string, { serializedPayload: string; response: any; status: number }>;
}

export function createBackendIdempotencyStore(): BackendIdempotencyStore {
  return { records: new Map() };
}

/**
 * Simulates backend IdempotencyKey middleware behavior (Modules/Admin/app/Http/Middleware/IdempotencyKey.php:41)
 * to test client retry safety, deduplication, and 409 conflict handling.
 */
export function simulateBackendIdempotentEndpoint<TPayload, TResponse>(
  store: BackendIdempotencyStore,
  idempotencyKey: string,
  payload: TPayload,
  executeHandler: () => TResponse,
): MockHttpResponse<TResponse> {
  const serialized = JSON.stringify(payload);
  const existing = store.records.get(idempotencyKey);

  if (existing) {
    if (existing.serializedPayload !== serialized) {
      // Backend returns 409 Conflict when the same key is sent with different body
      const error: any = new Error("Idempotency conflict: key already used with different payload");
      error.response = {
        status: 409,
        data: {
          error: {
            code: "IDEMPOTENCY_CONFLICT",
            message: "This idempotency key was previously submitted with a different request payload",
            messageAr: "تم استخدام مفتاح المطابقة مسبقًا ببيانات مختلفة",
          },
        },
      };
      throw error;
    }
    // Same key and same payload: return identical cached response without executing again
    return {
      status: existing.status,
      data: existing.response,
    };
  }

  // First execution
  const responseData = executeHandler();
  store.records.set(idempotencyKey, {
    serializedPayload: serialized,
    response: responseData,
    status: 200,
  });

  return {
    status: 200,
    data: responseData,
  };
}
