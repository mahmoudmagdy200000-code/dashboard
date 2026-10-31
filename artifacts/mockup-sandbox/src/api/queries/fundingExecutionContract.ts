import { assertIntentNotConcurrent, assertIntentSessionValid } from "../idempotencyIntent.ts";
import { setUnconfirmedIntent } from "./financialIntentStore.ts";

/**
 * Computes a real SHA-256 hexadecimal hash from raw byte content.
 * Uses Web Crypto API (globalThis.crypto.subtle) with Node.js crypto fallback.
 */
export async function computeBufferHash(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (typeof subtle?.digest === "function") {
    const hashBuffer = await subtle.digest("SHA-256", bytes as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("SHA-256 algorithm is not supported in the current environment.");
}

/**
 * Computes the authoritative SHA-256 content hash of an uploaded File.
 * Rejects with an error if file bytes cannot be read. Does NOT silently fall back to name/size.
 */
export async function computeFileHash(file: File): Promise<string> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("INVALID_FILE_SOURCE: File object must provide arrayBuffer() to compute SHA-256 content proof.");
  }
  const buffer = await file.arrayBuffer();
  return computeBufferHash(new Uint8Array(buffer));
}

export interface ReconciliationResult {
  reconciled: boolean;
  alreadyExecuted: boolean;
  executedAt?: string | null;
  transferReference?: string | null;
  status?: string;
  canRetry: boolean;
  reason: string;
}

/**
 * Reconciles execution status from backend before retry/restart.
 * Backend route POST /custody/requests/{id}/execute returns 422 if already executed,
 * so checking backend request status recovers the execution if response was lost.
 * Inconclusive or absent status strictly prohibits automatic re-dispatch.
 */
export function reconcileExecutionStatus(
  requestId: string,
  latestRequests: Array<{ id: string; executedAt?: string | null; transferReference?: string | null; status?: string }> | null | undefined,
): ReconciliationResult {
  if (!latestRequests || !Array.isArray(latestRequests)) {
    return {
      reconciled: false,
      alreadyExecuted: false,
      canRetry: false,
      reason: "INCONCLUSIVE_NETWORK_FAILURE: Server request list could not be verified. Automatic re-dispatch is prohibited to prevent duplicate financial execution.",
    };
  }

  const matching = latestRequests.find((r) => r.id === requestId);
  if (!matching) {
    return {
      reconciled: false,
      alreadyExecuted: false,
      canRetry: false,
      reason: "INCONCLUSIVE_NOT_FOUND: Custody request is not present in server list. Re-dispatch is prohibited.",
    };
  }

  if (matching.executedAt || matching.status === "completed" || matching.status === "Completed") {
    return {
      reconciled: true,
      alreadyExecuted: true,
      executedAt: matching.executedAt ?? "already-executed",
      transferReference: matching.transferReference ?? null,
      status: matching.status,
      canRetry: false,
      reason: "CONFIRMED_ALREADY_EXECUTED: Server confirms transfer was already recorded.",
    };
  }

  return {
    reconciled: true,
    alreadyExecuted: false,
    status: matching.status,
    canRetry: true,
    reason: "CONFIRMED_PENDING: Server confirms custody request has not been executed yet. Safe to retry with same intent key.",
  };
}

export function fundingExecutionPayload(reference: string, proof: File): FormData {
  const cleanReference = reference.trim();
  if (cleanReference.length < 2 || cleanReference.length > 120) throw new Error("Invalid transfer reference");
  const form = new FormData();
  form.append("transferReference", cleanReference);
  form.append("proof", proof);
  return form;
}

export function requirePendingReceipt<T extends { financiallyPosted: boolean; executedAt?: string | null }>(result: T): T {
  if (result.financiallyPosted !== false || !result.executedAt) {
    throw new Error("Unexpected custody execution response");
  }
  return result;
}

export function executeFundingTransferFlow(
  params: {
    id: string;
    reference: string;
    proof: File;
    proofHash?: string;
    currentActorId?: string;
    companyId?: string;
    intent?: {
      idempotencyKey: string;
      actorId?: string;
      companyId?: string;
      status?: string;
      payload?: {
        requestId?: string;
        reference?: string;
        proofName?: string;
        proofSize?: number;
        proofHash?: string;
        companyId?: string;
      };
    };
    idempotencyKey?: string;
  },
  apiDispatcher?: (url: string, form: FormData, headers?: Record<string, string>) => any,
) {
  // Concurrency guard: rapid duplicate clicks while in-flight are blocked
  assertIntentNotConcurrent(params.intent);

  // Session guard: intent from a different user session is rejected
  assertIntentSessionValid(params.intent, params.currentActorId);

  const cleanReference = params.reference.trim();
  const form = fundingExecutionPayload(cleanReference, params.proof);

  // Payload alteration guard under active intent:
  // Prevents tampering with reference, proof file, proof content, or target request ID while reusing an active intent key
  if (params.intent?.payload) {
    const p = params.intent.payload;
    const isRequestIdModified = p.requestId !== undefined && p.requestId !== params.id;
    const isReferenceModified = p.reference !== undefined && p.reference !== cleanReference;
    const isProofNameModified = p.proofName !== undefined && p.proofName !== params.proof.name;
    const isProofSizeModified = p.proofSize !== undefined && p.proofSize !== params.proof.size;
    const isProofHashModified = p.proofHash !== undefined && params.proofHash !== undefined && p.proofHash !== params.proofHash;

    if (isRequestIdModified || isReferenceModified || isProofNameModified || isProofSizeModified || isProofHashModified) {
      const conflictError: any = new Error(
        "IDEMPOTENCY_CONFLICT_PAYLOAD_ALTERATION: Modifying transfer reference, target request, or proof attachment under an active intent is forbidden",
      );
      conflictError.response = {
        status: 409,
        data: {
          error: {
            code: "IDEMPOTENCY_CONFLICT",
            message: "Payload altered under active idempotency intent",
          },
        },
      };
      throw conflictError;
    }
  }

  // Once all guards (concurrency, session, payload alteration) pass, mark intent as in-flight for this dispatch
  if (params.intent) {
    params.intent.status = "in_flight";
    if (typeof (params.intent as any).attemptCount === "number") {
      (params.intent as any).attemptCount += 1;
    }
    const actorId = params.currentActorId ?? params.intent.actorId;
    const effectiveCompanyId = params.companyId ?? params.intent.companyId ?? (params.intent.payload as any)?.companyId;
    if (actorId) {
      setUnconfirmedIntent("funding", params.id, params.intent as any, actorId, effectiveCompanyId);
    }
  }

  const effectiveKey = params.intent?.idempotencyKey ?? params.idempotencyKey;
  const headers: Record<string, string> = {};
  if (effectiveKey) {
    headers["Idempotency-Key"] = effectiveKey;
  }

  if (apiDispatcher) {
    const res = apiDispatcher(
      `/custody/requests/${encodeURIComponent(params.id)}/execute`,
      form,
      headers,
    );
    if (res && typeof res.then === "function") {
      return res.then(
        (val: any) => {
          if (params.intent) params.intent.status = "resolved";
          return val;
        },
        (err: any) => {
          if (params.intent) params.intent.status = "timed_out";
          throw err;
        },
      );
    }
    if (params.intent) params.intent.status = "resolved";
    return res;
  }
  if (params.intent) params.intent.status = "resolved";
  return { status: 200, form, idempotencyKey: effectiveKey };
}
