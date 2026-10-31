import test from "node:test";
import assert from "node:assert/strict";
import {
  requirePendingSettlement,
  settlementRequestPayload,
  assertCanReviewSettlement,
  validateSettlementRejectionReason,
  executeSettlementApprovalFlow,
  executeSettlementRejectionFlow,
} from "./employeeSettlementContract.ts";

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
