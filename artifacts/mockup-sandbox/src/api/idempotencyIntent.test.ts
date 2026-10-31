import test from "node:test";
import assert from "node:assert/strict";
import {
  createFinancialIntent,
  prepareRetryIntent,
  createBackendIdempotencyStore,
  simulateBackendIdempotentEndpoint,
} from "./idempotencyIntent.ts";

test("D17: intent retains stable UUID idempotency key across creation", () => {
  const payload = { requestId: "req-1", amountHalalas: 50000 };
  const intent = createFinancialIntent(payload);

  assert.ok(intent.idempotencyKey);
  // Must match standard UUID v4 format
  assert.match(
    intent.idempotencyKey,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  assert.equal(intent.status, "idle");
  assert.equal(intent.attemptCount, 0);
  assert.deepEqual(intent.payload, payload);
});

test("D17: transport retry reuses exact same Idempotency-Key and exact same payload without duplicate execution", () => {
  const store = createBackendIdempotencyStore();
  let executionCount = 0;

  const payload = {
    requestId: "funding-req-123",
    transferReference: "TRX-BANK-778899",
    amountHalalas: 100000,
  };

  const intent = createFinancialIntent(payload);
  const initialKey = intent.idempotencyKey;

  const executeDisbursement = () => {
    executionCount++;
    return {
      transactionId: "txn-999",
      amountHalalas: 100000,
      financiallyPosted: false,
      executedAt: "2026-10-31T00:00:00Z",
    };
  };

  // Attempt 1: succeeds on backend, but client transport encounters timeout before receiving response
  const firstRes = simulateBackendIdempotentEndpoint(
    store,
    intent.idempotencyKey,
    intent.payload,
    executeDisbursement,
  );
  assert.equal(executionCount, 1);
  assert.equal(firstRes.status, 200);

  // Client detects timeout/unknown outcome -> Prepares retry for the same intent
  intent.status = "timed_out";
  intent.attemptCount++;

  const retry = prepareRetryIntent(intent);

  // Verification 1: Key must NOT be freshly regenerated on retry
  assert.equal(retry.idempotencyKey, initialKey);
  // Verification 2: Payload must be identical
  assert.equal(retry.isPayloadModified, false);
  assert.deepEqual(retry.payload, payload);

  // Attempt 2 (Retry): Re-sends same key and same payload
  const retryRes = simulateBackendIdempotentEndpoint(
    store,
    retry.idempotencyKey,
    retry.payload,
    executeDisbursement,
  );

  // Verification 3: Backend handler was NOT executed a second time (deduplicated!)
  assert.equal(executionCount, 1, "Financial mutation must not execute twice on retry");
  assert.equal(retryRes.status, 200);
  assert.deepEqual(retryRes.data, firstRes.data);
});

test("D17: generating fresh UUID on retry defeats idempotency and would duplicate transactions (negative proof)", () => {
  const store = createBackendIdempotencyStore();
  let executionCount = 0;

  const payload = { requestId: "req-abc", amountHalalas: 25000 };
  const executeDisbursement = () => {
    executionCount++;
    return { txnId: `txn-${executionCount}` };
  };

  const intent1 = createFinancialIntent(payload);
  simulateBackendIdempotentEndpoint(store, intent1.idempotencyKey, payload, executeDisbursement);
  assert.equal(executionCount, 1);

  // Buggy behavior: generating a new UUID on retry instead of reusing the intent key
  const faultyRetryIntent = createFinancialIntent(payload);
  assert.notEqual(faultyRetryIntent.idempotencyKey, intent1.idempotencyKey);

  simulateBackendIdempotentEndpoint(store, faultyRetryIntent.idempotencyKey, payload, executeDisbursement);

  // This demonstrates why fresh UUIDs on retry are prohibited:
  assert.equal(executionCount, 2, "Fresh UUID caused duplicate financial execution");
});

test("D17: sending modified payload under same Idempotency-Key triggers 409 IDEMPOTENCY_CONFLICT", () => {
  const store = createBackendIdempotencyStore();
  let executionCount = 0;

  const originalPayload = {
    employeeId: "emp-1",
    amountHalalas: 10000,
    reason: "Monthly advance settlement",
  };

  const intent = createFinancialIntent(originalPayload);

  // First request passes
  simulateBackendIdempotentEndpoint(
    store,
    intent.idempotencyKey,
    intent.payload,
    () => {
      executionCount++;
      return { status: "pending", requestId: "settle-1" };
    },
  );
  assert.equal(executionCount, 1);

  // User alters the payload but sends under the same idempotency key
  const modifiedPayload = {
    employeeId: "emp-1",
    amountHalalas: 20000, // Modified amount!
    reason: "Monthly advance settlement",
  };

  const retryWithModification = prepareRetryIntent(intent, modifiedPayload);
  assert.equal(retryWithModification.isPayloadModified, true);

  // Backend should reject with 409 Conflict
  assert.throws(
    () =>
      simulateBackendIdempotentEndpoint(
        store,
        retryWithModification.idempotencyKey,
        retryWithModification.payload,
        () => {
          executionCount++;
          return { status: "pending" };
        },
      ),
    (err: any) => {
      assert.equal(err.response.status, 409);
      assert.equal(err.response.data.error.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );

  // Backend handler was not run for the conflicting request
  assert.equal(executionCount, 1);
});

test("D17: intent key is reset only after definitive resolution, allowing subsequent distinct actions", () => {
  let activeIntent = createFinancialIntent({ action: "transfer", amount: 5000 });
  const firstKey = activeIntent.idempotencyKey;

  // Once definitive 200 OK is received:
  activeIntent.status = "resolved";

  // When user begins a new operation:
  activeIntent = createFinancialIntent({ action: "transfer", amount: 7000 });
  const secondKey = activeIntent.idempotencyKey;

  assert.notEqual(firstKey, secondKey, "Subsequent distinct action must have a new distinct key");
});
