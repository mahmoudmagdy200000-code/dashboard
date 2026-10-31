import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCashierRepaymentSubmission,
  assertBranchManagerRepaymentConfirmation,
  assertReversalDisputeInitiation,
  calculateEffectiveHandoverAmount,
  assertAccountantHandoverReadAuthority,
  buildLinkedWave3HistoryView,
} from "./wave3Contract.ts";

test("D13 Wave 3: Dashboard accountant cannot submit physical cash debt repayment", () => {
  const dashboardAccountant = {
    id: "user-acc-01",
    roleKey: "accountant",
    roles: ["accountant"],
    actorType: "asab_user" as const,
  };

  assert.throws(
    () => assertCashierRepaymentSubmission(dashboardAccountant),
    /ONLY_CASHIER_MAY_SUBMIT_REPAYMENT/,
  );
});

test("D13 Wave 3: Mobile Cashier actor is permitted to submit debt repayment", () => {
  const cashierActor = {
    id: "cashier-01",
    roleKey: "cashier",
    actorType: "cashier" as const,
  };

  assert.doesNotThrow(() => assertCashierRepaymentSubmission(cashierActor));
});

test("D13 Wave 3: Non-manager cannot confirm debt repayment", () => {
  const genericUser = {
    id: "user-gen-01",
    roleKey: "accountant",
    roles: ["accountant"],
  };

  assert.throws(
    () => assertBranchManagerRepaymentConfirmation(genericUser),
    /UNAUTHORIZED_ACTOR/,
  );
});

test("D13 Wave 3: Reversal dispute requires original recipient identity and rejects third parties", () => {
  const recipientActor = { id: "emp-mgr-100" };
  const thirdPartyActor = { id: "emp-other-200" };
  const handover = { recipient_id: "emp-mgr-100", status: "confirmed" };

  assert.doesNotThrow(() => assertReversalDisputeInitiation(recipientActor, handover));

  assert.throws(
    () => assertReversalDisputeInitiation(thirdPartyActor, handover),
    /FORBIDDEN_REVERSAL_PARTY/,
  );
});

test("D13 Wave 3: Handover effective amount preserves halalas precision across additive adjustments", () => {
  const originalHalalas = 50000; // 500.00 SAR
  const settlements = [
    { signed_delta_halalas: -5000 }, // -50.00 SAR return
    { signed_delta_halalas: 2550 },  // +25.50 SAR supplement
  ];

  const result = calculateEffectiveHandoverAmount(originalHalalas, settlements);

  assert.strictEqual(result.totalDeltaHalalas, -2450);
  assert.strictEqual(result.effectiveHalalas, 47550);
  assert.strictEqual(result.effectiveFormatted, "475.50");
});

test("D13 Wave 3: Accountant role is blocked from calling /branch-manager handover settlements route", () => {
  assert.throws(
    () => assertAccountantHandoverReadAuthority("accountant"),
    /FORBIDDEN_ROUTE_SCOPE: Route \/branch-manager\/\* is guarded by branch\.manager\.or\.cashier middleware/,
  );
  assert.throws(
    () => assertAccountantHandoverReadAuthority("head"),
    /FORBIDDEN_ROUTE_SCOPE/,
  );
  assert.doesNotThrow(() => assertAccountantHandoverReadAuthority("branch_manager"));
});

test("D13 Wave 3: Linked original, reversal and repayment are visible without reopening final sales", () => {
  const linkedTx = {
    originalReceipt: {
      receiptId: "rcpt-1001",
      shiftId: "shift-501",
      amountHalalas: 50000, // 500.00 SAR
      timestamp: "2026-10-31T14:00:00Z",
      isFinalSalesImmutable: true,
    },
    reversal: {
      reversalId: "rev-2001",
      reason: "Handover discrepancy audit deduction",
      signedDeltaHalalas: -10000, // -100.00 SAR deduction
      timestamp: "2026-10-31T15:00:00Z",
    },
    repayments: [
      {
        repaymentId: "repay-3001",
        cashierId: "cashier-99",
        amountHalalas: 10000, // +100.00 SAR debt repaid
        status: "confirmed" as const,
        timestamp: "2026-10-31T16:30:00Z",
      },
    ],
  };

  const view = buildLinkedWave3HistoryView(linkedTx);

  // Original amount is kept, reversal is recorded, repayment is linked
  assert.equal(view.receiptId, "rcpt-1001");
  assert.equal(view.originalAmountHalalas, 50000);
  assert.equal(view.hasReversal, true);
  assert.equal(view.reversalReason, "Handover discrepancy audit deduction");
  assert.equal(view.confirmedRepaymentsCount, 1);
  // Net effective is preserved: 50000 - 10000 + 10000 = 50000
  assert.equal(view.netEffectiveHalalas, 50000);
  assert.equal(view.historyPreserved, true);

  // If final sales are mutable (reopened), it must throw
  assert.throws(
    () =>
      buildLinkedWave3HistoryView({
        ...linkedTx,
        originalReceipt: { ...linkedTx.originalReceipt, isFinalSalesImmutable: false },
      }),
    /SALES_FINALITY_VIOLATION/,
  );
});
