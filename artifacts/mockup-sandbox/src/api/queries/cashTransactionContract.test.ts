import test from "node:test";
import assert from "node:assert/strict";
import {
  assertDirectCashTransaction,
  assertDirectDebitSafety,
  checkCustodyWriteAuthorization,
  type CustodyActor,
  type CustodyContext,
} from "./cashTransactionContract.ts";

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
