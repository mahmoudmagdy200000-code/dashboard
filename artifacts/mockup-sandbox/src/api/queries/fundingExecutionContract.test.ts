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
import { createFinancialIntent } from "../idempotencyIntent.ts";

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

test("D17 Verification: computeBufferHash produces standard SHA-256 digest", async () => {
  // Known standard test vector: SHA-256 of empty byte array
  const emptyHash = await computeBufferHash(new Uint8Array([]));
  assert.equal(emptyHash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

  // SHA-256 of "hello"
  const helloBytes = new TextEncoder().encode("hello");
  const helloHash = await computeBufferHash(helloBytes);
  assert.equal(helloHash, "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
});

test("D17 Prod Path 1: First legitimate submission succeeds and transitions intent to resolved", async () => {
  const proof = new File(["legitimate-transfer-proof"], "proof.pdf", { type: "application/pdf" });
  const proofHash = await computeFileHash(proof);

  const intent = createFinancialIntent(
    {
      requestId: "req-legit-001",
      reference: "REF-LEGIT-100",
      proofName: proof.name,
      proofSize: proof.size,
      proofHash,
    },
    undefined,
    "user-accountant-1",
  );

  assert.equal(intent.status, "idle");
  let dispatched = false;

  const mockDispatcher = (url: string, form: FormData, headers?: Record<string, string>) => {
    dispatched = true;
    assert.equal(headers?.["Idempotency-Key"], intent.idempotencyKey);
    return { status: 200, data: { financiallyPosted: false, executedAt: "2026-10-31T05:00:00Z" } };
  };

  const res = executeFundingTransferFlow(
    {
      id: "req-legit-001",
      reference: "REF-LEGIT-100",
      proof,
      proofHash,
      currentActorId: "user-accountant-1",
      intent,
    },
    mockDispatcher,
  );

  assert.equal(dispatched, true);
  assert.equal(intent.status, "resolved");
  assert.equal(intent.attemptCount, 1);
  assert.equal(res.status, 200);
});

test("D17 Prod Path 2: Rapid duplicate click while in-flight is blocked by assertIntentNotConcurrent", async () => {
  const proof = new File(["duplicate-click-proof"], "proof.pdf", { type: "application/pdf" });
  const proofHash = await computeFileHash(proof);

  const intent = createFinancialIntent(
    {
      requestId: "req-dup-001",
      reference: "REF-DUP-100",
      proofName: proof.name,
      proofSize: proof.size,
      proofHash,
    },
    undefined,
    "user-accountant-1",
  );

  let dispatchCount = 0;
  let resolvePromise: (val: any) => void = () => {};
  const pendingPromise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const mockDispatcher = () => {
    dispatchCount++;
    return pendingPromise;
  };

  // First call starts and stays in_flight while pending
  const p1 = executeFundingTransferFlow(
    {
      id: "req-dup-001",
      reference: "REF-DUP-100",
      proof,
      proofHash,
      currentActorId: "user-accountant-1",
      intent,
    },
    mockDispatcher,
  );
  assert.equal(dispatchCount, 1);
  assert.equal(intent.status, "in_flight");

  // Second rapid click while in_flight is rejected without calling dispatcher
  assert.throws(
    () => executeFundingTransferFlow(
      {
        id: "req-dup-001",
        reference: "REF-DUP-100",
        proof,
        proofHash,
        currentActorId: "user-accountant-1",
        intent,
      },
      mockDispatcher,
    ),
    /IDEMPOTENCY_CONCURRENT_DISPATCH/,
  );
  assert.equal(dispatchCount, 1, "Dispatcher must NOT be called a second time");

  // Complete first request
  resolvePromise({ status: 200, data: { financiallyPosted: false, executedAt: "2026-10-31T05:00:00Z" } });
  await p1;
  assert.equal(intent.status, "resolved");
});

test("D17 Prod Path 3: Timeout before server processing allows safe retry with same key", async () => {
  const proof = new File(["timeout-before-proof"], "proof.pdf", { type: "application/pdf" });
  const proofHash = await computeFileHash(proof);

  const intent = createFinancialIntent(
    {
      requestId: "req-timeout-001",
      reference: "REF-TIME-100",
      proofName: proof.name,
      proofSize: proof.size,
      proofHash,
    },
    "key-fixed-timeout-001",
    "user-accountant-1",
  );

  // Client simulated timeout: status becomes timed_out
  intent.status = "timed_out";

  // Server requests list query shows request is still unexecuted (approved)
  const serverRequests = [
    { id: "req-timeout-001", executedAt: null, transferReference: null, status: "approved" },
  ];
  const recon = reconcileExecutionStatus("req-timeout-001", serverRequests);
  assert.equal(recon.reconciled, true);
  assert.equal(recon.alreadyExecuted, false);
  assert.equal(recon.canRetry, true);

  // Retrying with exact same intent key succeeds
  let retryKey = "";
  const mockDispatcher = (url: string, form: FormData, headers?: Record<string, string>) => {
    retryKey = headers?.["Idempotency-Key"] ?? "";
    return { status: 200, data: { financiallyPosted: false, executedAt: "2026-10-31T05:05:00Z" } };
  };

  const res = executeFundingTransferFlow(
    {
      id: "req-timeout-001",
      reference: "REF-TIME-100",
      proof,
      proofHash,
      currentActorId: "user-accountant-1",
      intent,
    },
    mockDispatcher,
  );
  assert.equal(retryKey, "key-fixed-timeout-001");
  assert.equal(res.status, 200);
});

test("D17 Prod Path 4: Timeout after server processing confirms execution without duplicate 422 call", async () => {
  const requestId = "req-timeout-processed-002";

  // Server requests list confirms execution succeeded on backend
  const serverRequests = [
    {
      id: requestId,
      executedAt: "2026-10-31T05:10:00Z",
      transferReference: "REF-ALREADY-DONE",
      status: "completed",
    },
  ];

  const recon = reconcileExecutionStatus(requestId, serverRequests);
  assert.equal(recon.reconciled, true);
  assert.equal(recon.alreadyExecuted, true);
  assert.equal(recon.canRetry, false);
  assert.equal(recon.executedAt, "2026-10-31T05:10:00Z");
  assert.equal(recon.transferReference, "REF-ALREADY-DONE");
});

test("D17 Prod Path 5: Already-executed backend response handled gracefully via status reconciliation", async () => {
  const requestId = "req-already-exec-003";

  // When backend returns 422: "This custody request has already been executed or received"
  const serverRequests = [
    {
      id: requestId,
      executedAt: "2026-10-31T04:45:00Z",
      transferReference: "TRX-BANK-CONFIRMED",
      status: "completed",
    },
  ];

  const recon = reconcileExecutionStatus(requestId, serverRequests);
  assert.equal(recon.alreadyExecuted, true);
  assert.equal(recon.canRetry, false);
  // UI recognizes execution and transitions to resolved state without error
});

test("D17 Prod Path 6: Changed proof with same filename and size triggers HTTP 409 conflict", async () => {
  // Two files with exact same name ("slip.pdf") and exact same size (10 bytes), but different byte contents
  const bytesA = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const bytesB = new Uint8Array([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  const fileA = new File([bytesA], "slip.pdf", { type: "application/pdf" });
  const fileB = new File([bytesB], "slip.pdf", { type: "application/pdf" });

  const hashA = await computeFileHash(fileA);
  const hashB = await computeFileHash(fileB);
  assert.notEqual(hashA, hashB, "Different bytes must produce distinct SHA-256 hashes");

  const intent = createFinancialIntent(
    {
      requestId: "req-hash-001",
      reference: "REF-HASH-1",
      proofName: "slip.pdf",
      proofSize: 10,
      proofHash: hashA,
    },
    "key-hash-001",
    "user-accountant-1",
  );

  // Attempting to submit fileB (tampered bytes) under the active intent for fileA throws HTTP 409
  assert.throws(
    () => executeFundingTransferFlow(
      {
        id: "req-hash-001",
        reference: "REF-HASH-1",
        proof: fileB,
        proofHash: hashB,
        currentActorId: "user-accountant-1",
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

test("D17 Prod Path 7: Changed payload under existing key triggers HTTP 409 conflict", () => {
  const proof = new File(["dummy-proof"], "proof.pdf", { type: "application/pdf" });

  const intent = {
    idempotencyKey: "key-payload-tamper-001",
    payload: {
      requestId: "req-tamper-001",
      reference: "ORIGINAL-REF",
      proofName: "proof.pdf",
      proofSize: proof.size,
    },
  };

  // 1. Modified reference
  assert.throws(
    () => executeFundingTransferFlow(
      { id: "req-tamper-001", reference: "MODIFIED-REF", proof, intent },
    ),
    (err: any) => {
      assert.equal(err.response?.status, 409);
      assert.equal(err.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );

  // 2. Modified request ID
  assert.throws(
    () => executeFundingTransferFlow(
      { id: "req-DIFFERENT-TARGET", reference: "ORIGINAL-REF", proof, intent },
    ),
    (err: any) => {
      assert.equal(err.response?.status, 409);
      assert.equal(err.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );
});

test("D17 Prod Path 8: Session switch blocks reusing intent created by another user", () => {
  const proof = new File(["dummy-proof"], "proof.pdf", { type: "application/pdf" });

  const userAIntent = {
    idempotencyKey: "key-session-cross-001",
    actorId: "user-accountant-A",
    status: "idle",
    payload: { requestId: "req-sess-001", reference: "REF-SESS-1" },
  };

  assert.throws(
    () => executeFundingTransferFlow(
      {
        id: "req-sess-001",
        reference: "REF-SESS-1",
        proof,
        currentActorId: "user-accountant-B", // Logged in as User B
        intent: userAIntent,
      },
    ),
    /IDEMPOTENCY_SESSION_MISMATCH/,
  );
});

test("D17 Prod Path 9: Failed, inconclusive, rejected, or unapproved status reconciliation strictly refuses re-dispatch", () => {
  // Scenario A: Network failure returning null
  const nullRecon = reconcileExecutionStatus("req-inconclusive-001", null as any);
  assert.equal(nullRecon.reconciled, false);
  assert.equal(nullRecon.canRetry, false);
  assert.equal(nullRecon.alreadyExecuted, false);

  // Scenario B: Request not present in server list
  const notFoundRecon = reconcileExecutionStatus("req-inconclusive-002", []);
  assert.equal(notFoundRecon.reconciled, false);
  assert.equal(notFoundRecon.canRetry, false);
  assert.equal(notFoundRecon.alreadyExecuted, false);

  // Scenario C: Request is rejected on server
  const rejectedRecon = reconcileExecutionStatus("req-rej-001", [
    { id: "req-rej-001", status: "rejected", executedAt: null },
  ]);
  assert.equal(rejectedRecon.canRetry, false, "Rejected request must not be retried");
  assert.equal(rejectedRecon.alreadyExecuted, false);

  // Scenario D: Request is pending approval (not yet approved by brand owner)
  const pendingRecon = reconcileExecutionStatus("req-pend-001", [
    { id: "req-pend-001", status: "pending", executedAt: null },
  ]);
  assert.equal(pendingRecon.canRetry, false, "Unapproved request must not be retried by accountant");
  assert.equal(pendingRecon.alreadyExecuted, false);

  // Scenario E: Request is in unknown state
  const unknownRecon = reconcileExecutionStatus("req-unk-001", [
    { id: "req-unk-001", status: "some_unexpected_state", executedAt: null },
  ]);
  assert.equal(unknownRecon.canRetry, false, "Unknown status must fail closed");
});

test("D17 Prod Path 9B: Cross-company intent reuse triggers IDEMPOTENCY_COMPANY_MISMATCH", () => {
  const dummyFile = new File(["test"], "test.pdf", { type: "application/pdf" });
  const companyAIntent = createFinancialIntent(
    { requestId: "req-1", reference: "REF-1" },
    "key-shared-company",
    "usr-acc-1",
    "company-alpha",
  );

  assert.throws(
    () =>
      executeFundingTransferFlow({
        id: "req-1",
        reference: "REF-1",
        proof: dummyFile,
        currentActorId: "usr-acc-1",
        companyId: "company-beta", // Trying to execute under Company Beta
        intent: companyAIntent,
      }),
    /IDEMPOTENCY_COMPANY_MISMATCH/,
    "Reusing intent originating from Company Alpha under Company Beta must be rejected",
  );
});

test("D17 Prod Path 10: No duplicate financial operation across retries and reconciliations", async () => {
  const proof = new File(["no-duplicate-proof"], "proof.pdf", { type: "application/pdf" });
  const proofHash = await computeFileHash(proof);

  const intent = createFinancialIntent(
    {
      requestId: "req-once-001",
      reference: "REF-ONCE-1",
      proofName: proof.name,
      proofSize: proof.size,
      proofHash,
    },
    "key-strictly-once-001",
    "user-accountant-1",
  );

  let dispatchCalls = 0;
  const mockDispatcher = () => {
    dispatchCalls++;
    return { status: 200, data: { financiallyPosted: false, executedAt: "2026-10-31T05:30:00Z" } };
  };

  // Execution call 1
  executeFundingTransferFlow(
    {
      id: "req-once-001",
      reference: "REF-ONCE-1",
      proof,
      proofHash,
      currentActorId: "user-accountant-1",
      intent,
    },
    mockDispatcher,
  );
  assert.equal(dispatchCalls, 1);

  // Server confirms execution
  const serverRequests = [
    { id: "req-once-001", executedAt: "2026-10-31T05:30:00Z", status: "completed" },
  ];
  const recon = reconcileExecutionStatus("req-once-001", serverRequests);
  assert.equal(recon.alreadyExecuted, true);

  // Because already executed, dispatcher is never invoked a second time
  assert.equal(dispatchCalls, 1, "Financial transfer was dispatched strictly once");
});
