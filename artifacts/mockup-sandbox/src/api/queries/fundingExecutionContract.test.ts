import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fundingExecutionPayload,
  requirePendingReceipt,
  executeFundingTransferFlow,
  computeBufferHash,
  computeFileHash,
  reconcileExecutionStatus,
} from "./fundingExecutionContract.ts";

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

test("D17 Idempotency: proof content change with same file name and size triggers HTTP 409 conflict", async () => {
  // Two files with exact same name ("slip.pdf") and exact same size (10 bytes), but completely different bytes
  const bytesA = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const bytesB = new Uint8Array([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  const fileA = new File([bytesA], "slip.pdf", { type: "application/pdf" });
  const fileB = new File([bytesB], "slip.pdf", { type: "application/pdf" });

  const hashA = await computeFileHash(fileA);
  const hashB = await computeFileHash(fileB);
  assert.notEqual(hashA, hashB, "Different byte contents must produce distinct content hashes");

  const intent = {
    idempotencyKey: "idem-key-content-001",
    payload: {
      requestId: "req-555",
      reference: "REF-BANK-1",
      proofName: "slip.pdf",
      proofSize: 10,
      proofHash: hashA,
    },
  };

  // Attempting to submit fileB (tampered content) under the active intent for fileA
  assert.throws(
    () => executeFundingTransferFlow(
      {
        id: "req-555",
        reference: "REF-BANK-1",
        proof: fileB,
        proofHash: hashB,
        intent,
      },
    ),
    (err: any) => {
      assert.equal(err.response?.status, 409);
      assert.equal(err.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );
});

test("D17 Concurrency & Session Safety: rapid double-click and cross-session submission are blocked", () => {
  const dummyFile = new File(["dummy"], "receipt.pdf", { type: "application/pdf" });

  // 1. Rapid double-click while in-flight
  const inFlightIntent = {
    idempotencyKey: "idem-key-concurrent-001",
    status: "in_flight",
    payload: { requestId: "req-777", reference: "REF-777" },
  };

  assert.throws(
    () => executeFundingTransferFlow(
      { id: "req-777", reference: "REF-777", proof: dummyFile, intent: inFlightIntent },
    ),
    /IDEMPOTENCY_CONCURRENT_DISPATCH/,
  );

  // 2. Session switch guard: intent belonging to user-A cannot be dispatched by user-B
  const userAIntent = {
    idempotencyKey: "idem-key-session-001",
    actorId: "user-accountant-A",
    status: "idle",
    payload: { requestId: "req-777", reference: "REF-777" },
  };

  assert.throws(
    () => executeFundingTransferFlow(
      {
        id: "req-777",
        reference: "REF-777",
        proof: dummyFile,
        currentActorId: "user-accountant-B", // Session mismatch!
        intent: userAIntent,
      },
    ),
    /IDEMPOTENCY_SESSION_MISMATCH/,
  );
});

test("D17 Backend Status Reconciliation: recovers execution after timeout/lost response without duplicate 422 error", () => {
  const requestId = "req-funding-888";

  // Scenario 1: Request has not been executed yet on backend
  const unexecutedList = [
    { id: "req-funding-888", executedAt: null, transferReference: null, status: "Approved" },
  ];
  const recon1 = reconcileExecutionStatus(requestId, unexecutedList);
  assert.equal(recon1.alreadyExecuted, false);

  // Scenario 2: Request was already executed on backend (response was lost due to client timeout)
  const executedList = [
    {
      id: "req-funding-888",
      executedAt: "2026-10-31T03:30:00Z",
      transferReference: "TRX-ALRAJHI-LOST-RESP",
      status: "completed",
    },
  ];
  const recon2 = reconcileExecutionStatus(requestId, executedList);
  assert.equal(recon2.alreadyExecuted, true);
  assert.equal(recon2.executedAt, "2026-10-31T03:30:00Z");
  assert.equal(recon2.transferReference, "TRX-ALRAJHI-LOST-RESP");
});
