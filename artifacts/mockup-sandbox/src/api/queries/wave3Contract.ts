/**
 * Wave 3 Contract & Invariant Safety (CASH-14, CASH-16, BE-13, BE-16, D13)
 *
 * Backend Contract Authority:
 * Modules/Shift/app/Http/Controllers/HandoverSettlementController.php:1c484bd0
 *
 * Invariants:
 * 1. Physical cash debt repayment submission (POST /shifts/repayments) is STRICTLY
 *    restricted to mobile Cashier actor. Web Dashboard accountant/admin cannot submit physical cash repayment.
 * 2. Physical cash debt repayment confirmation (POST /shifts/repayments/{id}/confirm) is STRICTLY
 *    restricted to mobile Branch Manager actor.
 * 3. Two-party handover reversal dispute initiation (POST /shifts/handovers/{handover}/reversal-disputes)
 *    and confirmation (POST /shifts/handovers/reversals/{reversal}/confirm) belong to the original two handover parties.
 * 4. Additive post-receipt settlements (GET /handover-receipts/{receipt}/settlements) provide
 *    the authoritative audit trail and effective amount calculation without mutating finalized sales records.
 */

export interface ShiftHandoverSettlementItem {
  id: string;
  original_receipt_id: string;
  settlement_type: "overpayment_return" | "underpayment_supplement";
  amount_halalas: number;
  signed_delta_halalas: number;
  reason: string;
  expected_settlement_version: number;
  created_at: string;
}

export interface ReceiptSettlementsData {
  original_receipt_id: string;
  original_amount: string;
  original_amount_halalas: number;
  settlement_version: number;
  settlements: ShiftHandoverSettlementItem[];
  total_delta_halalas: number;
  effective_amount_halalas: number;
  effective_amount: string;
}

export interface ActorIdentity {
  id?: string;
  roleKey?: string;
  actorType?: "cashier" | "branch_manager" | "asab_user";
  roles?: string[];
}

/**
 * CASH-16 / BE-16: Cashier debt repayment guard.
 * Only mobile Cashier can submit physical cash repayment.
 */
export function assertCashierRepaymentSubmission(actor: ActorIdentity | null | undefined): void {
  if (!actor || (actor.actorType !== "cashier" && actor.roleKey !== "cashier")) {
    throw new Error(
      "ONLY_CASHIER_MAY_SUBMIT_REPAYMENT: Physical cash debt repayment submission is restricted to the mobile Cashier role.",
    );
  }
}

/**
 * CASH-16 / BE-16: Branch manager confirmation guard.
 */
export function assertBranchManagerRepaymentConfirmation(actor: ActorIdentity | null | undefined): void {
  if (!actor || (actor.actorType !== "branch_manager" && actor.roleKey !== "branch_manager" && !actor.roles?.includes("branch"))) {
    throw new Error(
      "UNAUTHORIZED_ACTOR: Physical cash debt repayment confirmation is restricted to the receiving Branch Manager.",
    );
  }
}

/**
 * CASH-14 / BE-13: Two-party reversal dispute guard.
 * Initiator must be the recipient party of the original handover.
 */
export function assertReversalDisputeInitiation(
  actor: { id?: string },
  handover: { recipient_id?: string; status?: string },
): void {
  if (!actor.id || !handover.recipient_id || actor.id !== handover.recipient_id) {
    throw new Error(
      "FORBIDDEN_REVERSAL_PARTY: Reversal dispute can only be initiated by the original handover recipient.",
    );
  }
  if (handover.status === "reversed") {
    throw new Error("HANDOVER_ALREADY_REVERSED: Handover has already been reversed.");
  }
}

/**
 * Precise halalas calculation of effective handover amount without floating point drift:
 * effective = originalHalalas + sum(signed_delta_halalas)
 */
export function calculateEffectiveHandoverAmount(
  originalHalalas: number,
  settlements: Array<{ signed_delta_halalas: number }>,
): {
  totalDeltaHalalas: number;
  effectiveHalalas: number;
  effectiveFormatted: string;
} {
  const totalDeltaHalalas = settlements.reduce((acc, s) => acc + s.signed_delta_halalas, 0);
  const effectiveHalalas = originalHalalas + totalDeltaHalalas;
  const units = Math.trunc(effectiveHalalas / 100);
  const cents = Math.abs(effectiveHalalas % 100);
  const effectiveFormatted = `${units}.${cents.toString().padStart(2, "0")}`;

  return {
    totalDeltaHalalas,
    effectiveHalalas,
    effectiveFormatted,
  };
}

/**
 * Route Permission Boundary (Backend Authority: Modules/Shift/routes/api.php:278)
 * Verifies that route `GET /branch-manager/handover-receipts/{receipt}/settlements`
 * is gated behind `branch.manager.or.cashier` middleware. An Accountant cannot call it.
 */
export function assertAccountantHandoverReadAuthority(actorRole: string): void {
  if (actorRole === "accountant" || actorRole === "head") {
    throw new Error(
      "FORBIDDEN_ROUTE_SCOPE: Route /branch-manager/* is guarded by branch.manager.or.cashier middleware. Dashboard accountant has no backend read route for handover settlements.",
    );
  }
}

export interface LinkedWave3Transaction {
  originalReceipt: {
    receiptId: string;
    shiftId: string;
    amountHalalas: number;
    timestamp: string;
    isFinalSalesImmutable: boolean;
  };
  reversal?: {
    reversalId: string;
    reason: string;
    signedDeltaHalalas: number;
    timestamp: string;
  };
  repayments: Array<{
    repaymentId: string;
    cashierId: string;
    amountHalalas: number;
    status: "submitted" | "confirmed";
    timestamp: string;
  }>;
}

/**
 * Builds the additive audit view linking original receipt, reversal, and repayment
 * without erasing historical records or re-opening finalized shift sales.
 */
export function buildLinkedWave3HistoryView(tx: LinkedWave3Transaction) {
  // Sales finality invariant: finalized sales cannot be reopened
  if (!tx.originalReceipt.isFinalSalesImmutable) {
    throw new Error("SALES_FINALITY_VIOLATION: Original sales record must remain permanently immutable");
  }

  const reversalDelta = tx.reversal ? tx.reversal.signedDeltaHalalas : 0;
  const totalRepayments = tx.repayments
    .filter((r) => r.status === "confirmed")
    .reduce((sum, r) => sum + r.amountHalalas, 0);

  const netEffectiveHalalas = tx.originalReceipt.amountHalalas + reversalDelta + totalRepayments;

  return {
    receiptId: tx.originalReceipt.receiptId,
    shiftId: tx.originalReceipt.shiftId,
    originalAmountHalalas: tx.originalReceipt.amountHalalas,
    hasReversal: !!tx.reversal,
    reversalReason: tx.reversal?.reason,
    confirmedRepaymentsCount: tx.repayments.filter((r) => r.status === "confirmed").length,
    netEffectiveHalalas,
    historyPreserved: true,
  };
}
