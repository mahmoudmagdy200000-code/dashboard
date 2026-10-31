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
    intent?: { idempotencyKey: string; payload?: { requestId?: string; reference?: string } };
    idempotencyKey?: string;
  },
  apiDispatcher?: (url: string, form: FormData, headers?: Record<string, string>) => any,
) {
  const cleanReference = params.reference.trim();
  const form = fundingExecutionPayload(cleanReference, params.proof);

  // Payload alteration guard under active intent:
  // Prevents tampering with reference or request ID while reusing an old intent key
  if (params.intent?.payload) {
    if (
      (params.intent.payload.requestId && params.intent.payload.requestId !== params.id) ||
      (params.intent.payload.reference && params.intent.payload.reference !== cleanReference)
    ) {
      const conflictError: any = new Error(
        "IDEMPOTENCY_CONFLICT_PAYLOAD_ALTERATION: Modifying transfer reference or target request under an active intent is forbidden",
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
