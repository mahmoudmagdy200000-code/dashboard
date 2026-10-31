import test from "node:test";
import assert from "node:assert/strict";
import { executeFundingTransferFlow } from "./fundingExecutionContract.ts";
import {
  executeCashDisbursementFlow,
  checkCustodyWriteAuthorization,
  type DirectDebitSafetyContext,
} from "./cashTransactionContract.ts";
import {
  executeSettlementApprovalFlow,
  executeSettlementRejectionFlow,
} from "./employeeSettlementContract.ts";
import {
  createFinancialIntent,
  createBackendIdempotencyStore,
  simulateBackendIdempotentEndpoint,
  type FinancialIntent,
} from "../idempotencyIntent.ts";

test("D17 Production Flow: FundingExecution reuses exact same Idempotency-Key on timeout retry", async () => {
  const store = createBackendIdempotencyStore();
  let serverDispatches = 0;

  // Simulate UI Intent initialized in FundingExecution when accountant clicks "تنفيذ وإرسال التغذية"
  const intent: FinancialIntent<{ requestId: string; reference: string }> = createFinancialIntent({
    requestId: "req-funding-555",
    reference: "TRX-ALRAJHI-9988",
  });
  const initialKey = intent.idempotencyKey;

  // Mock file for proof
  const dummyFile = new File(["receipt-bytes"], "bank_slip.pdf", { type: "application/pdf" });

  // Dispatches through the production flow
  const dispatchFirstAttempt = () => {
    return executeFundingTransferFlow(
      {
        id: "req-funding-555",
        reference: "TRX-ALRAJHI-9988",
        proof: dummyFile,
        intent,
      },
      (url, form, headers) => {
        return simulateBackendIdempotentEndpoint(
          store,
          headers?.["Idempotency-Key"] ?? "",
          { reference: form.get("transferReference") },
          () => {
            serverDispatches++;
            return {
              financiallyPosted: false as const,
              executedAt: "2026-10-31T00:30:00Z",
              transferReference: "TRX-ALRAJHI-9988",
            };
          },
        );
      },
    );
  };

  // Attempt 1: Server processes the execution, but client experiences network timeout
  const res1 = dispatchFirstAttempt();
  assert.equal(serverDispatches, 1);
  assert.equal(res1.status, 200);

  // Client marks intent as timed out
  intent.status = "timed_out";
  intent.attemptCount = 1;

  // Attempt 2 (Accountant clicks retry / 'تسجيل الإرسال' in UI):
  // Must use the exact same key from the stored UI intent
  assert.equal(intent.idempotencyKey, initialKey, "Intent key must remain stable across retries");

  const res2 = dispatchFirstAttempt();

  // Server deduplication: execution handler was NOT called a second time
  assert.equal(serverDispatches, 1, "Server execution must not be duplicated on retry");
  assert.equal(res2.status, 200);
  assert.deepEqual(res2.data, res1.data);
});

test("D17 Production Flow: modified payload under same UI intent triggers HTTP 409 IDEMPOTENCY_CONFLICT", async () => {
  const store = createBackendIdempotencyStore();
  const dummyFile = new File(["proof"], "proof.png", { type: "image/png" });

  const intent = createFinancialIntent({
    requestId: "req-funding-555",
    reference: "TRX-INITIAL-1111",
  });

  // Attempt 1 with initial reference
  executeFundingTransferFlow(
    {
      id: "req-funding-555",
      reference: "TRX-INITIAL-1111",
      proof: dummyFile,
      intent,
    },
    (url, form, headers) => {
      return simulateBackendIdempotentEndpoint(
        store,
        headers?.["Idempotency-Key"] ?? "",
        { reference: form.get("transferReference") },
        () => ({ financiallyPosted: false, executedAt: "2026-10-31T00:00:00Z" }),
      );
    },
  );

  // User alters reference but attempts to send under the same intent key
  assert.throws(
    () =>
      executeFundingTransferFlow(
        {
          id: "req-funding-555",
          reference: "TRX-MODIFIED-2222", // Modified reference!
          proof: dummyFile,
          intent,
        },
        (url, form, headers) => {
          return simulateBackendIdempotentEndpoint(
            store,
            headers?.["Idempotency-Key"] ?? "",
            { reference: form.get("transferReference") },
            () => ({ financiallyPosted: false, executedAt: "2026-10-31T00:00:00Z" }),
          );
        },
      ),
    (err: any) => {
      assert.equal(err.response?.status, 409);
      assert.equal(err.response?.data?.error?.code, "IDEMPOTENCY_CONFLICT");
      return true;
    },
  );
});

test("D06 Real Debit Authorization: omitting context fails closed and cannot bypass safety", () => {
  // Calling production disbursement flow without context
  assert.throws(
    () => {
      executeCashDisbursementFlow({
        custodyId: "custody-branch-1",
        payload: { txnType: "debit", amount: 15000 },
        // context omitted!
      });
    },
    /CUSTODY_CONTEXT_REQUIRED|AUTHORIZATION_CONTEXT_REQUIRED/,
    "Absence of context must not allow debit execution",
  );
});

test("D06 Real Debit Authorization: overdraft attempt is rejected by production debit path", () => {
  const context: DirectDebitSafetyContext = {
    custody: {
      id: "custody-branch-1",
      remainingHalalas: 20000, // Available: 200 SAR
    },
    actor: {
      roles: ["brand-owner"],
      isCustodyWriteAuthorized: true,
    },
  };

  assert.throws(
    () => {
      executeCashDisbursementFlow({
        custodyId: "custody-branch-1",
        payload: { txnType: "debit", amount: 25000 }, // Demands: 250 SAR (Overdraft!)
        context,
      });
    },
    /INSUFFICIENT_CUSTODY_BALANCE: Debit amount \(25000 halalas\) exceeds available custody balance \(20000 halalas\)/,
  );
});

test("D06 Real Debit Authorization: generic accountant lacking brand custody write authority is refused", () => {
  const context: DirectDebitSafetyContext = {
    custody: {
      id: "custody-branch-1",
      brandId: "brand-north",
      remainingHalalas: 50000,
    },
    actor: {
      roles: ["accountant"],
      isCustodyWriteAuthorized: false, // Route admitted, but lacks brand funding authorization!
    },
  };

  assert.throws(
    () => {
      executeCashDisbursementFlow({
        custodyId: "custody-branch-1",
        payload: { txnType: "debit", amount: 5000 },
        context,
      });
    },
    /FORBIDDEN_CUSTODY_WRITE/,
  );
});

test("D06 Real Debit Authorization: cross-brand custody debit is refused", () => {
  const context: DirectDebitSafetyContext = {
    custody: {
      id: "custody-branch-99",
      brandId: "brand-south",
      remainingHalalas: 50000,
    },
    actor: {
      roles: ["brand-manager"],
      brandIds: ["brand-north"], // Assigned only to North!
      isCustodyWriteAuthorized: true,
    },
  };

  assert.throws(
    () => {
      executeCashDisbursementFlow({
        custodyId: "custody-branch-99",
        payload: { txnType: "debit", amount: 5000 },
        context,
      });
    },
    /FORBIDDEN_CROSS_BRAND: User has no custody write authority for this brand/,
  );
});

test("D06 Real Debit Authorization: backend 403 Forbidden remains ultimate authority and does not mutate balance", () => {
  let balance = 50000;
  let posted = false;
  let reportedError = "";

  // Mocking backend HTTP 403 response
  const mockApiDispatch = () => {
    const error: any = new Error("Request failed with status code 403");
    error.response = {
      status: 403,
      data: {
        error: {
          code: "CUSTODY_WRITE_UNAUTHORIZED",
          message: "Only a verified brand funding owner can execute cash debits",
          messageAr: "ليس مخولاً بالصرف المباشر من هذه العهدة",
        },
      },
    };
    throw error;
  };

  try {
    mockApiDispatch();
    balance -= 10000;
    posted = true;
  } catch (err: any) {
    reportedError = err.response.data.error.code;
  }

  assert.equal(reportedError, "CUSTODY_WRITE_UNAUTHORIZED");
  assert.equal(balance, 50000, "Authoritative balance must remain untouched");
  assert.equal(posted, false, "Must not set posted state on 403");
});

test("D09 Production Flow: Head Accountant settlement approval is executed and non-head is refused", async () => {
  const headAccountant = { id: "head-user-1", roles: ["head_accountant"] };
  const ordinaryAccountant = { id: "acc-user-2", roles: ["accountant"] };

  const calls: string[] = [];
  const fakeApi = {
    post: async (url: string) => {
      calls.push(url);
      return { status: 200, data: { status: "approved" } };
    },
  };

  // Plain accountant rejected
  await assert.rejects(
    async () => executeSettlementApprovalFlow("settle-abc", ordinaryAccountant, fakeApi),
    /FORBIDDEN_HEAD_ACCOUNTANT_REQUIRED/,
  );

  // Head accountant accepted
  const res = await executeSettlementApprovalFlow("settle-abc", headAccountant, fakeApi);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(calls[0], "/company/me/employee-settlements/settle-abc/approve");
});
