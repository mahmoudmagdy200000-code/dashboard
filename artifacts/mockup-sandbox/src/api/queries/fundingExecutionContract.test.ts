import assert from "node:assert/strict";
import { test } from "node:test";
import { fundingExecutionPayload, requirePendingReceipt, executeFundingTransferFlow } from "./fundingExecutionContract.ts";

test("accountant execution sends reference and proof, then awaits receipt without a posting", () => {
  const proof = new File(["proof"], "transfer.pdf", { type: "application/pdf" });
  const form = fundingExecutionPayload("  TR-123  ", proof);
  assert.equal(form.get("transferReference"), "TR-123");
  assert.equal((form.get("proof") as File).name, "transfer.pdf");
  assert.throws(() => fundingExecutionPayload(" ", proof));
  assert.equal(requirePendingReceipt({ financiallyPosted: false, executedAt: "2026-10-29T10:00:00Z" }).financiallyPosted, false);
  assert.throws(() => requirePendingReceipt({ financiallyPosted: true, executedAt: "2026-10-29T10:00:00Z" }));
  assert.throws(() => requirePendingReceipt({ financiallyPosted: false, executedAt: null }));
});

test("D17 Idempotency: executeFundingTransferFlow enforces stable payload and rejects alteration under active intent", () => {
  const proof1 = new File(["file-data-one"], "receipt_v1.pdf", { type: "application/pdf" });
  const proof2 = new File(["file-data-two"], "receipt_v2.pdf", { type: "application/pdf" });
  const proofSameNameDifferentSize = new File(["file-data-one-extra-bytes"], "receipt_v1.pdf", { type: "application/pdf" });

  let capturedKey = "";
  let dispatchCount = 0;
  const mockDispatcher = (url: string, form: FormData, headers?: Record<string, string>) => {
    dispatchCount++;
    capturedKey = headers?.["Idempotency-Key"] ?? "";
    return { status: 200, data: { financiallyPosted: false, executedAt: "2026-10-31T01:00:00Z" } };
  };

  const intent = {
    idempotencyKey: "idem-key-prod-001",
    payload: {
      requestId: "req-123",
      reference: "REF-ALPHA",
      proofName: "receipt_v1.pdf",
      proofSize: proof1.size,
    },
  };

  // 1. Success on initial execution with exact matching intent payload
  const res1 = executeFundingTransferFlow(
    { id: "req-123", reference: "REF-ALPHA", proof: proof1, intent },
    mockDispatcher,
  );
  assert.equal(dispatchCount, 1);
  assert.equal(capturedKey, "idem-key-prod-001");
  assert.equal(res1.status, 200);

  // 2. Retry with exact same payload reuses the same Idempotency-Key
  const res2 = executeFundingTransferFlow(
    { id: "req-123", reference: "REF-ALPHA", proof: proof1, intent },
    mockDispatcher,
  );
  assert.equal(dispatchCount, 2);
  assert.equal(capturedKey, "idem-key-prod-001");
  assert.equal(res2.status, 200);

  // 3. Altering reference value under active intent throws HTTP 409
  assert.throws(
    () => executeFundingTransferFlow(
      { id: "req-123", reference: "REF-MODIFIED", proof: proof1, intent },
      mockDispatcher,
    ),
    (err: any) => {
      assert.equal(err.response?.status, 409);
      assert.equal(err.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );

  // 4. Altering reference from empty string under active intent throws HTTP 409
  const emptyRefIntent = {
    idempotencyKey: "idem-key-prod-002",
    payload: {
      requestId: "req-123",
      reference: "",
      proofName: "receipt_v1.pdf",
      proofSize: proof1.size,
    },
  };
  assert.throws(
    () => executeFundingTransferFlow(
      { id: "req-123", reference: "NEW-REF", proof: proof1, intent: emptyRefIntent },
      mockDispatcher,
    ),
    (err: any) => {
      assert.equal(err.response?.status, 409);
      assert.equal(err.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );

  // 5. Altering proof file name under active intent throws HTTP 409
  assert.throws(
    () => executeFundingTransferFlow(
      { id: "req-123", reference: "REF-ALPHA", proof: proof2, intent },
      mockDispatcher,
    ),
    (err: any) => {
      assert.equal(err.response?.status, 409);
      assert.equal(err.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );

  // 6. Altering proof file size under active intent throws HTTP 409
  assert.throws(
    () => executeFundingTransferFlow(
      { id: "req-123", reference: "REF-ALPHA", proof: proofSameNameDifferentSize, intent },
      mockDispatcher,
    ),
    (err: any) => {
      assert.equal(err.response?.status, 409);
      assert.equal(err.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );

  // 7. Altering target request ID under active intent throws HTTP 409
  assert.throws(
    () => executeFundingTransferFlow(
      { id: "req-TAMPERED-456", reference: "REF-ALPHA", proof: proof1, intent },
      mockDispatcher,
    ),
    (err: any) => {
      assert.equal(err.response?.status, 409);
      assert.equal(err.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );
});
