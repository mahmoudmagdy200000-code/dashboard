import { assertIntentNotConcurrent, assertIntentSessionValid } from "../idempotencyIntent.ts";

export function computeBufferHash(bytes: Uint8Array): string {
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d;
  for (let i = 0; i < bytes.length; i++) {
    h1 = Math.imul(h1 ^ bytes[i], 2654435761);
    h2 = Math.imul(h2 ^ bytes[i], 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

export async function computeFileHash(file: File): Promise<string> {
  if (typeof file.arrayBuffer === "function") {
    try {
      const buffer = await file.arrayBuffer();
      return computeBufferHash(new Uint8Array(buffer));
    } catch {
      return `${file.name}:${file.size}`;
    }
  }
  return `${file.name}:${file.size}`;
}

/**
 * Reconciles execution status from backend before retry/restart.
 * Backend route POST /custody/requests/{id}/execute returns 422 if already executed,
 * so checking backend request status recovers the execution if response was lost.
 */
export function reconcileExecutionStatus(
  requestId: string,
  latestRequests: Array<{ id: string; executedAt?: string | null; transferReference?: string | null; status?: string }>,
): {
  alreadyExecuted: boolean;
  executedAt?: string | null;
  transferReference?: string | null;
} {
  const matching = latestRequests.find((r) => r.id === requestId);
  if (matching && (matching.executedAt || matching.status === "completed" || matching.status === "Completed")) {
    return {
      alreadyExecuted: true,
      executedAt: matching.executedAt ?? "already-executed",
      transferReference: matching.transferReference ?? null,
    };
  }
  return { alreadyExecuted: false };
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
    intent?: {
      idempotencyKey: string;
      actorId?: string;
      status?: string;
      payload?: {
        requestId?: string;
        reference?: string;
        proofName?: string;
        proofSize?: number;
        proofHash?: string;
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

  const effectiveKey = params.intent?.idempotencyKey ?? params.idempotencyKey;
  const headers: Record<string, string> = {};
  if (effectiveKey) {
    headers["Idempotency-Key"] = effectiveKey;
  }

  if (apiDispatcher) {
    return apiDispatcher(
      `/custody/requests/${encodeURIComponent(params.id)}/execute`,
      form,
      headers,
    );
  }
  return { status: 200, form, idempotencyKey: effectiveKey };
}
