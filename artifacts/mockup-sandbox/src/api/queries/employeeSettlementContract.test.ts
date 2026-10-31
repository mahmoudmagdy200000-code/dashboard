import test from "node:test";
import assert from "node:assert/strict";
import {
  requirePendingSettlement,
  settlementRequestPayload,
  assertCanReviewSettlement,
  validateSettlementRejectionReason,
  executeSettlementApprovalFlow,
  executeSettlementRejectionFlow,
  executeEmployeeSettlementFlow,
} from "./employeeSettlementContract.ts";
import { createFinancialIntent } from "../idempotencyIntent.ts";

test("D07: settlement request sends a required reason and optional amount", () => {
  assert.deepEqual(settlementRequestPayload("  Reconcile balance  "), { reason: "Reconcile balance" });
  assert.deepEqual(settlementRequestPayload("Partial payment", 30000), { reason: "Partial payment", amountHalalas: 30000 });
  assert.throws(() => settlementRequestPayload("  "), /reason/);
});

test("D07: settlement creation only accepts a pending request without financial posting", () => {
  const pending = { settlementId: "request-1", status: "pending", balanceModified: false };
  assert.equal(requirePendingSettlement(pending), pending);
  assert.throws(() => requirePendingSettlement({ status: "approved", balanceModified: true }));
  assert.throws(() => requirePendingSettlement({ status: "pending", balanceModified: true }));
});

test("D09: ordinary accountant cannot review or approve settlements", () => {
  const accountant = { id: "acc-1", roles: ["accountant"] };
  assert.throws(
    () => assertCanReviewSettlement(accountant),
    /FORBIDDEN_HEAD_ACCOUNTANT_REQUIRED/,
  );
});

test("D09: head accountant is authorized to review settlements", () => {
  const headAccountant = { id: "head-1", roles: ["head_accountant"] };
  assert.doesNotThrow(() => assertCanReviewSettlement(headAccountant));

  const head = { id: "head-2", roles: ["head"] };
  assert.doesNotThrow(() => assertCanReviewSettlement(head));
});

test("D09: head accountant cannot approve own settlement request (self-approval prohibited)", () => {
  const head = { id: "head-1", roles: ["head"] };
  const settlementCreatedByHead = { id: "settle-1", createdByUserId: "head-1" };

  assert.throws(
    () => assertCanReviewSettlement(head, settlementCreatedByHead),
    /FORBIDDEN_SELF_APPROVAL/,
  );
});

test("D09: rejection reason validation enforces 500 characters limit", () => {
  assert.strictEqual(validateSettlementRejectionReason("  Incorrect receipt  "), "Incorrect receipt");
  assert.strictEqual(validateSettlementRejectionReason(null), undefined);
  assert.strictEqual(validateSettlementRejectionReason(undefined), undefined);

  const tooLong = "x".repeat(501);
  assert.throws(() => validateSettlementRejectionReason(tooLong), /VALIDATION_ERROR/);
});

test("D09: execute settlement approval and rejection flows dispatch canonical endpoints", async () => {
  const head = { id: "head-1", roles: ["head_accountant"] };
  const calls: string[] = [];
  const fakeApi = {
    post: async (url: string, body?: any) => {
      calls.push(url);
      return { status: 200, url, body };
    },
  };

  await executeSettlementApprovalFlow("settle-99", head, fakeApi);
  assert.strictEqual(calls[0], "/company/me/employee-settlements/settle-99/approve");

  await executeSettlementRejectionFlow("settle-99", head, "Discrepancy in receipt", fakeApi);
  assert.strictEqual(calls[1], "/company/me/employee-settlements/settle-99/reject");
});

test("D07 / D17: executeEmployeeSettlementFlow binds full payload and transitions intent to resolved on pending response", async () => {
  const intent = createFinancialIntent<{ employeeId: string; reason: string }>(
    { employeeId: "emp-101", reason: "Annual balance settlement" },
    undefined,
    "user-1",
  );

  let capturedUrl = "";
  let capturedBody: any = null;
  let capturedHeaders: Record<string, string> | undefined = undefined;

  const result = await executeEmployeeSettlementFlow(
    {
      employeeId: "emp-101",
      reason: "Annual balance settlement",
      amountHalalas: 25000,
      currentActorId: "user-1",
      intent,
    },
    async (url, body, headers) => {
      capturedUrl = url;
      capturedBody = body;
      capturedHeaders = headers;
      return {
        settlementId: "settle-55",
        status: "pending",
        balanceModified: false,
        employeeId: "emp-101",
      };
    },
  );

  assert.equal(capturedUrl, "/company/me/employees/emp-101/settle-balance");
  assert.equal(capturedBody.reason, "Annual balance settlement");
  assert.equal(capturedBody.amountHalalas, 25000);
  assert.equal(capturedHeaders?.["Idempotency-Key"], intent.idempotencyKey);
  assert.equal(intent.status, "resolved");
  assert.equal(result.status, "pending");
  assert.equal(result.balanceModified, false);
});

test("D07 / D17: empty reason throws validation error without mutating balance (422 equivalent)", () => {
  assert.throws(
    () => {
      executeEmployeeSettlementFlow(
        {
          employeeId: "emp-101",
          reason: "   ",
          currentActorId: "user-1",
        },
        () => ({ ok: true }),
      );
    },
    /at least three characters/,
  );
});

test("D07 / D17: modifying reason under active intent triggers HTTP 409 IDEMPOTENCY_CONFLICT", async () => {
  const intent = createFinancialIntent(
    { employeeId: "emp-101", reason: "Advance reconciliation", actorId: "user-1" },
    undefined,
    "user-1",
  );

  await assert.rejects(
    async () => {
      await executeEmployeeSettlementFlow(
        {
          employeeId: "emp-101",
          reason: "Modified reason for loan",
          currentActorId: "user-1",
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

test("D07 / D17: switching employeeId under active intent triggers HTTP 409 IDEMPOTENCY_CONFLICT", async () => {
  const intent = createFinancialIntent(
    { employeeId: "emp-101", reason: "Advance reconciliation", actorId: "user-1" },
    undefined,
    "user-1",
  );

  await assert.rejects(
    async () => {
      await executeEmployeeSettlementFlow(
        {
          employeeId: "emp-999",
          reason: "Advance reconciliation",
          currentActorId: "user-1",
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

test("D07 / D17: rapid duplicate dispatch while intent is in_flight is blocked by concurrency guard", () => {
  const intent = createFinancialIntent(
    { employeeId: "emp-101", reason: "Advance reconciliation", actorId: "user-1" },
    undefined,
    "user-1",
  );
  intent.status = "in_flight";

  assert.throws(
    () => {
      executeEmployeeSettlementFlow(
        {
          employeeId: "emp-101",
          reason: "Advance reconciliation",
          currentActorId: "user-1",
          intent,
        },
        () => ({ ok: true }),
      );
    },
    /IDEMPOTENCY_CONCURRENT_DISPATCH/,
  );
});

test("D07 / D17: session mismatch rejects reusing intent originating from another actor", () => {
  const intent = createFinancialIntent(
    { employeeId: "emp-101", reason: "Advance reconciliation", actorId: "user-1" },
    undefined,
    "user-1",
  );

  assert.throws(
    () => {
      executeEmployeeSettlementFlow(
        {
          employeeId: "emp-101",
          reason: "Advance reconciliation",
          currentActorId: "user-2",
          intent,
        },
        () => ({ ok: true }),
      );
    },
    /IDEMPOTENCY_SESSION_MISMATCH/,
  );
});

test("D07 / D17: transport retry reuses exact same intent key and payload without dropping intent or double-settling", async () => {
  const intent = createFinancialIntent(
    { employeeId: "emp-101", reason: "Advance reconciliation", actorId: "user-1" },
    undefined,
    "user-1",
  );

  let attempts = 0;
  const dispatcher = async () => {
    attempts++;
    if (attempts === 1) {
      throw new Error("Connection reset by peer");
    }
    return {
      settlementId: "settle-101",
      status: "pending",
      balanceModified: false,
    };
  };

  // Attempt 1: Fails with network reset
  await assert.rejects(async () => {
    await executeEmployeeSettlementFlow(
      {
        employeeId: "emp-101",
        reason: "Advance reconciliation",
        currentActorId: "user-1",
        intent,
      },
      dispatcher,
    );
  });
  assert.equal(intent.status, "timed_out");

  // Attempt 2: Retry with exact same intent and reason
  const result = await executeEmployeeSettlementFlow(
    {
      employeeId: "emp-101",
      reason: "Advance reconciliation",
      currentActorId: "user-1",
      intent,
    },
    dispatcher,
  );

  assert.equal(intent.status, "resolved");
  assert.equal(result.status, "pending");
  assert.equal(result.balanceModified, false);
  assert.equal(attempts, 2);
});
