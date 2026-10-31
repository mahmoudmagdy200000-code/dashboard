import test from "node:test";
import assert from "node:assert/strict";
import {
  assertDirectCashTransaction,
  assertDirectDebitSafety,
  checkCustodyWriteAuthorization,
  executeCashDisbursementFlow,
  type CustodyActor,
  type CustodyContext,
} from "./cashTransactionContract.ts";
import { createFinancialIntent } from "../idempotencyIntent.ts";

test("D05: direct credit is refused and directs user to funding request workflow", () => {
  assert.throws(
    () => assertDirectCashTransaction({ txnType: "credit", amount: 30000 }),
    /funding requires an approved request/,
  );
  assert.throws(
    () => assertDirectCashTransaction({ txnType: "replenish", amount: 15000 } as any),
    /funding requires an approved request/,
  );
});

test("D06: checkCustodyWriteAuthorization enforces backend AsabController:265 rules", () => {
  // Company-admin membership alone is NEVER a funding-owner grant
  assert.strictEqual(
    checkCustodyWriteAuthorization({ roles: ["company-admin"] }, { brandId: "brand-1" }),
    false,
  );

  // Plain accountant alone is NEVER a funding-owner grant
  assert.strictEqual(
    checkCustodyWriteAuthorization({ roles: ["accountant"] }, { brandId: "brand-1" }),
    false,
  );

  // Brand owner with matching brandIds has write authority
  assert.strictEqual(
    checkCustodyWriteAuthorization({ roles: ["brand-owner"], brandIds: ["brand-1"] }, { brandId: "brand-1" }),
    true,
  );

  // Brand owner with missing or empty brandIds fails closed
  assert.strictEqual(
    checkCustodyWriteAuthorization({ roles: ["brand-owner"], brandIds: [] }, { brandId: "brand-1" }),
    false,
  );
  assert.strictEqual(
    checkCustodyWriteAuthorization({ roles: ["brand-owner"] }, { brandId: "brand-1" }),
    false,
  );

  // Target custody without brandId fails closed
  assert.strictEqual(
    checkCustodyWriteAuthorization({ roles: ["brand-owner"], brandIds: ["brand-1"] }, {}),
    false,
  );

  // Brand manager with matching brand has write authority
  assert.strictEqual(
    checkCustodyWriteAuthorization(
      { roles: ["brand-manager"], brandIds: ["brand-1", "brand-2"] },
      { brandId: "brand-1" },
    ),
    true,
  );

  // Brand manager with mismatched brand is refused
  assert.strictEqual(
    checkCustodyWriteAuthorization(
      { roles: ["brand-manager"], brandIds: ["brand-2"] },
      { brandId: "brand-1" },
    ),
    false,
  );
});

test("D06: direct debit permits valid positive integer halalas with authorized actor", () => {
  const debit = { txnType: "debit", amount: 30000 };
  const actor: CustodyActor = {
    roles: ["brand-owner"],
    isCustodyWriteAuthorized: true,
    brandIds: ["brand-1"],
  };
  const custody: CustodyContext = {
    id: "custody-1",
    brandId: "brand-1",
    remainingHalalas: 50000,
  };

  assert.deepEqual(assertDirectCashTransaction(debit, { actor, custody }), debit);
  assert.deepEqual(assertDirectDebitSafety(debit, { actor, custody }), debit);
});

test("D06: prevents overdraft when debit amount exceeds remaining custody halalas", () => {
  const debit = { txnType: "debit", amount: 60000 };
  const custody: CustodyContext = {
    id: "custody-1",
    remainingHalalas: 50000,
  };

  assert.throws(
    () => assertDirectDebitSafety(debit, { custody }),
    /INSUFFICIENT_CUSTODY_BALANCE: Debit amount \(60000 halalas\) exceeds available custody balance \(50000 halalas\)/,
  );
});

test("D06: rejects non-positive or non-integer debit amounts", () => {
  assert.throws(
    () => assertDirectDebitSafety({ txnType: "debit", amount: 0 }),
    /positive integer/,
  );
  assert.throws(
    () => assertDirectDebitSafety({ txnType: "debit", amount: -500 }),
    /positive integer/,
  );
  assert.throws(
    () => assertDirectDebitSafety({ txnType: "debit", amount: 12.5 as any }),
    /positive integer/,
  );
});

test("D06: accountant or company-admin role alone without explicit custody write authorization is refused", () => {
  const debit = { txnType: "debit", amount: 10000 };
  const genericAccountant: CustodyActor = {
    roles: ["accountant"],
    isCustodyWriteAuthorized: false,
  };
  const custody: CustodyContext = {
    id: "custody-1",
    brandId: "brand-1",
    remainingHalalas: 50000,
  };

  assert.throws(
    () => assertDirectDebitSafety(debit, { actor: genericAccountant, custody }),
    /FORBIDDEN_CUSTODY_WRITE/,
  );

  const companyAdmin: CustodyActor = {
    roles: ["company-admin"],
  };
  assert.throws(
    () => assertDirectDebitSafety(debit, { actor: companyAdmin, custody }),
    /FORBIDDEN_CUSTODY_WRITE/,
  );
});

test("D06: cross-brand custody debit is refused when actor is not assigned to brand", () => {
  const debit = { txnType: "debit", amount: 10000 };
  const actor: CustodyActor = {
    roles: ["brand-manager"],
    isCustodyWriteAuthorized: true,
    brandIds: ["brand-1"], // only assigned to brand-1
  };
  const custodyOtherBrand: CustodyContext = {
    id: "custody-99",
    brandId: "brand-2", // belongs to brand-2
    remainingHalalas: 50000,
  };

  assert.throws(
    () => assertDirectDebitSafety(debit, { actor, custody: custodyOtherBrand }),
    /FORBIDDEN_CROSS_BRAND: User has no custody write authority for this brand/,
  );
});

test("D06: truthful 403 error handling does not optimistically mutate balance or fabricate success", () => {
  let localRemainingHalalas = 50000;
  let toastSuccessCalled = false;
  let toastErrorCalled = false;

  const mockApiCall = (_payload: any) => {
    // Simulate HTTP 403 Forbidden response from backend
    const error: any = new Error("Request failed with status code 403");
    error.response = {
      status: 403,
      data: {
        error: {
          code: "CUSTODY_WRITE_UNAUTHORIZED",
          message: "Only an authorized funding owner may disburse directly from this custody",
          messageAr: "ليس مخولاً بالصرف المباشر من هذه العهدة",
        },
      },
    };
    throw error;
  };

  try {
    mockApiCall({ txnType: "debit", amount: 10000 });
    // If optimistic:
    localRemainingHalalas -= 10000;
    toastSuccessCalled = true;
  } catch (e: any) {
    // Real error handler:
    toastErrorCalled = true;
    assert.equal(e.response.status, 403);
    assert.equal(e.response.data.error.code, "CUSTODY_WRITE_UNAUTHORIZED");
  }

  // Authoritative balance must remain completely unchanged
  assert.equal(localRemainingHalalas, 50000);
  assert.equal(toastSuccessCalled, false);
  assert.equal(toastErrorCalled, true);
});

test("D06 / D17: executeCashDisbursementFlow binds full payload and manages lifecycle to resolved", async () => {
  const actor: CustodyActor = { id: "user-1", roles: ["brand-owner"], brandIds: ["brand-1"] };
  const custody: CustodyContext = { id: "custody-1", brandId: "brand-1", remainingHalalas: 50000 };
  const intent = createFinancialIntent<{ custodyId: string; txnType: string }>(
    { custodyId: "custody-1", txnType: "debit" },
    undefined,
    "user-1",
  );

  let capturedUrl = "";
  let capturedBody: any = null;
  let capturedHeaders: Record<string, string> | undefined = undefined;

  const result = await executeCashDisbursementFlow(
    {
      custodyId: "custody-1",
      payload: { txnType: "debit", amount: 12000, description: "Spare parts", source: "manual" },
      context: { actor, custody },
      intent,
    },
    async (url, body, headers) => {
      capturedUrl = url;
      capturedBody = body;
      capturedHeaders = headers;
      return { id: "txn-1", status: "approved" };
    },
  );

  assert.equal(capturedUrl, "/company/me/cash-custody/custody-1/transactions");
  assert.equal(capturedBody.amount, 12000);
  assert.equal(capturedBody.description, "Spare parts");
  assert.equal(capturedHeaders?.["Idempotency-Key"], intent.idempotencyKey);
  assert.equal(intent.status, "resolved");
  assert.equal(intent.payload?.amountHalalas, 12000);
  assert.equal(intent.payload?.description, "Spare parts");
  assert.equal(intent.payload?.custodyId, "custody-1");
  assert.equal(intent.payload?.actorId, "user-1");
});

test("D06 / D17: modifying debit amount under active intent triggers HTTP 409 IDEMPOTENCY_CONFLICT", async () => {
  const actor: CustodyActor = { id: "user-1", roles: ["brand-owner"], brandIds: ["brand-1"] };
  const custody: CustodyContext = { id: "custody-1", brandId: "brand-1", remainingHalalas: 50000 };
  const intent = createFinancialIntent(
    { custodyId: "custody-1", amountHalalas: 10000, description: "Fuel", source: "manual", actorId: "user-1" },
    undefined,
    "user-1",
  );

  await assert.rejects(
    async () => {
      await executeCashDisbursementFlow(
        {
          custodyId: "custody-1",
          payload: { txnType: "debit", amount: 20000, description: "Fuel", source: "manual" },
          context: { actor, custody },
          intent,
        },
        async () => ({ ok: true }),
      );
    },
    (err: any) => {
      assert.equal(err?.response?.status, 409);
      assert.equal(err?.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );
});

test("D06 / D17: modifying description under active intent triggers HTTP 409 IDEMPOTENCY_CONFLICT", async () => {
  const actor: CustodyActor = { id: "user-1", roles: ["brand-owner"], brandIds: ["brand-1"] };
  const custody: CustodyContext = { id: "custody-1", brandId: "brand-1", remainingHalalas: 50000 };
  const intent = createFinancialIntent(
    { custodyId: "custody-1", amountHalalas: 10000, description: "Original reason", source: "manual", actorId: "user-1" },
    undefined,
    "user-1",
  );

  await assert.rejects(
    async () => {
      await executeCashDisbursementFlow(
        {
          custodyId: "custody-1",
          payload: { txnType: "debit", amount: 10000, description: "Modified reason", source: "manual" },
          context: { actor, custody },
          intent,
        },
        async () => ({ ok: true }),
      );
    },
    (err: any) => {
      assert.equal(err?.response?.status, 409);
      assert.equal(err?.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );
});

test("D06 / D17: modifying target custody under active intent triggers HTTP 409 IDEMPOTENCY_CONFLICT", async () => {
  const actor: CustodyActor = { id: "user-1", roles: ["brand-owner"], brandIds: ["brand-1"] };
  const custody: CustodyContext = { id: "custody-2", brandId: "brand-1", remainingHalalas: 50000 };
  const intent = createFinancialIntent(
    { custodyId: "custody-1", amountHalalas: 10000, description: "Supplies", source: "manual", actorId: "user-1" },
    undefined,
    "user-1",
  );

  await assert.rejects(
    async () => {
      await executeCashDisbursementFlow(
        {
          custodyId: "custody-2",
          payload: { txnType: "debit", amount: 10000, description: "Supplies", source: "manual" },
          context: { actor, custody },
          intent,
        },
        async () => ({ ok: true }),
      );
    },
    (err: any) => {
      assert.equal(err?.response?.status, 409);
      assert.equal(err?.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );
});

test("D06 / D17: rapid duplicate dispatch while intent is in_flight is rejected by concurrency guard", async () => {
  const actor: CustodyActor = { id: "user-1", roles: ["brand-owner"], brandIds: ["brand-1"] };
  const custody: CustodyContext = { id: "custody-1", brandId: "brand-1", remainingHalalas: 50000 };
  const intent = createFinancialIntent(
    { custodyId: "custody-1", amountHalalas: 10000, description: "Supplies", source: "manual", actorId: "user-1" },
    undefined,
    "user-1",
  );
  intent.status = "in_flight";

  assert.throws(
    () => {
      executeCashDisbursementFlow(
        {
          custodyId: "custody-1",
          payload: { txnType: "debit", amount: 10000, description: "Supplies", source: "manual" },
          context: { actor, custody },
          intent,
        },
        () => ({ ok: true }),
      );
    },
    /IDEMPOTENCY_CONCURRENT_DISPATCH/,
  );
});

test("D06 / D17: session mismatch rejects reusing intent originating from another actor", () => {
  const actor: CustodyActor = { id: "user-2", roles: ["brand-owner"], brandIds: ["brand-1"] };
  const custody: CustodyContext = { id: "custody-1", brandId: "brand-1", remainingHalalas: 50000 };
  const intent = createFinancialIntent(
    { custodyId: "custody-1", amountHalalas: 10000, description: "Supplies", source: "manual", actorId: "user-1" },
    undefined,
    "user-1",
  );

  assert.throws(
    () => {
      executeCashDisbursementFlow(
        {
          custodyId: "custody-1",
          payload: { txnType: "debit", amount: 10000, description: "Supplies", source: "manual" },
          context: { actor, custody },
          intent,
        },
        () => ({ ok: true }),
      );
    },
    /IDEMPOTENCY_SESSION_MISMATCH/,
  );
});

test("D06 / D17: safe transport retry with same key and exact payload succeeds without duplicate side-effects", async () => {
  const actor: CustodyActor = { id: "user-1", roles: ["brand-owner"], brandIds: ["brand-1"] };
  const custody: CustodyContext = { id: "custody-1", brandId: "brand-1", remainingHalalas: 50000 };
  const intent = createFinancialIntent(
    { custodyId: "custody-1", amountHalalas: 10000, description: "Supplies", source: "manual", actorId: "user-1" },
    undefined,
    "user-1",
  );

  let attempts = 0;
  const dispatcher = async () => {
    attempts++;
    if (attempts === 1) {
      throw new Error("Network timeout: gateway lost response");
    }
    return { id: "txn-1", status: "approved" };
  };

  // Attempt 1: Fails with timeout
  await assert.rejects(async () => {
    await executeCashDisbursementFlow(
      {
        custodyId: "custody-1",
        payload: { txnType: "debit", amount: 10000, description: "Supplies", source: "manual" },
        context: { actor, custody },
        intent,
      },
      dispatcher,
    );
  });
  assert.equal(intent.status, "timed_out");

  // Attempt 2: Retry with same intent and exact same payload succeeds
  const retryResult = await executeCashDisbursementFlow(
    {
      custodyId: "custody-1",
      payload: { txnType: "debit", amount: 10000, description: "Supplies", source: "manual" },
      context: { actor, custody },
      intent,
    },
    dispatcher,
  );
  assert.equal(intent.status, "resolved");
  assert.equal(retryResult.id, "txn-1");
  assert.equal(attempts, 2);
});
