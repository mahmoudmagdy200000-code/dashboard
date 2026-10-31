/**
 * D14 Expense Accounting Lifecycle Contract (EXP-02, EXP-03, EXP-05, EXP-07, D14)
 * Backend Authority: Modules/Expense/app/Services/ExpenseApprovalService.php:1c484bd0
 *
 * Enforces:
 * 1. Tracking of authoritative disbursement source (Expense Custody).
 * 2. Prohibition of Cashier Sales Drawer deduction.
 * 3. Charge taken at submission and confirmed at approval without secondary/double deduction.
 * 4. Dual reversal posted exactly once upon rejection with mandatory reason.
 * 5. Isolation of cashier sales cash register from all expense movements.
 */

export interface ExpenseCustodyAccount {
  id: string;
  name: string;
  remainingHalalas: number;
}

export interface CashierSalesDrawer {
  shiftId: string;
  cashierId: string;
  salesCollectedHalalas: number;
}

export interface ExpenseDisbursement {
  id: string;
  amountHalalas: number;
  paymentSource: "custody" | "petty_cash" | "bank_transfer" | "cashier_sales_drawer";
  custodyId: string;
  status: "submitted" | "approved" | "rejected";
  rejectionReason?: string;
  isReversed?: boolean;
}

export function assertValidExpenseDisbursementSource(paymentSource: string): void {
  if (paymentSource === "cashier_sales_drawer" || paymentSource === "sales_cash" || paymentSource === "pos_drawer") {
    throw new Error(
      "FORBIDDEN_EXPENSE_SOURCE: Expenses cannot be disbursed directly from active cashier sales drawers. Must be charged to authorized expense custody or petty cash.",
    );
  }
  if (!["custody", "petty_cash", "bank_transfer"].includes(paymentSource)) {
    throw new Error(`INVALID_SOURCE: Payment source ${paymentSource} is not supported.`);
  }
}

export function submitExpenseToCustody(
  expenseId: string,
  amountHalalas: number,
  paymentSource: "custody" | "petty_cash" | "bank_transfer",
  custody: ExpenseCustodyAccount,
  salesDrawer: CashierSalesDrawer,
): {
  expense: ExpenseDisbursement;
  updatedCustody: ExpenseCustodyAccount;
  salesDrawer: CashierSalesDrawer;
} {
  assertValidExpenseDisbursementSource(paymentSource);

  if (amountHalalas <= 0 || !Number.isInteger(amountHalalas)) {
    throw new Error("INVALID_AMOUNT: Expense amount must be a positive integer in halalas.");
  }

  // EXP-05: Uncovered expense is refused rather than spilled into sales cash
  if (amountHalalas > custody.remainingHalalas) {
    throw new Error(
      `INSUFFICIENT_EXPENSE_CUSTODY: Expense amount (${amountHalalas} halalas) exceeds available custody balance (${custody.remainingHalalas} halalas).`,
    );
  }

  // Deduct/reserve from designated expense custody
  const updatedCustody: ExpenseCustodyAccount = {
    ...custody,
    remainingHalalas: custody.remainingHalalas - amountHalalas,
  };

  // Sales drawer is strictly untouched
  const untouchedDrawer = { ...salesDrawer };

  const expense: ExpenseDisbursement = {
    id: expenseId,
    amountHalalas,
    paymentSource,
    custodyId: custody.id,
    status: "submitted",
  };

  return { expense, updatedCustody, salesDrawer: untouchedDrawer };
}

export function approveExpenseInCustody(
  expense: ExpenseDisbursement,
  custody: ExpenseCustodyAccount,
  salesDrawer: CashierSalesDrawer,
): {
  expense: ExpenseDisbursement;
  updatedCustody: ExpenseCustodyAccount;
  salesDrawer: CashierSalesDrawer;
} {
  if (expense.status !== "submitted") {
    throw new Error(`INVALID_EXPENSE_STAGE: Cannot approve expense in status '${expense.status}'.`);
  }

  // EXP-02: approval CONFIRMS the charge taken at submission and NEVER repeats it.
  // Custody balance remains unchanged from reservation.
  const updatedCustody = { ...custody };

  // Sales drawer remains strictly untouched
  const untouchedDrawer = { ...salesDrawer };

  const approvedExpense: ExpenseDisbursement = {
    ...expense,
    status: "approved",
  };

  return { expense: approvedExpense, updatedCustody, salesDrawer: untouchedDrawer };
}

export function rejectExpenseInCustody(
  expense: ExpenseDisbursement,
  reason: string,
  custody: ExpenseCustodyAccount,
  salesDrawer: CashierSalesDrawer,
): {
  expense: ExpenseDisbursement;
  updatedCustody: ExpenseCustodyAccount;
  reversalEntry: { id: string; originalExpenseId: string; creditedHalalas: number; reason: string };
  salesDrawer: CashierSalesDrawer;
} {
  if (expense.status !== "submitted") {
    throw new Error(`INVALID_EXPENSE_STAGE: Cannot reject expense in status '${expense.status}'.`);
  }

  const cleanReason = reason.trim();
  if (cleanReason.length < 3) {
    throw new Error("REJECTION_REASON_MANDATORY: Rejecting an expense requires a reason of at least 3 characters.");
  }

  // EXP-03: The charge taken at submission is reversed exactly once.
  // Additive reversal entry restores the reserved halalas to the expense custody.
  const updatedCustody: ExpenseCustodyAccount = {
    ...custody,
    remainingHalalas: custody.remainingHalalas + expense.amountHalalas,
  };

  const reversalEntry = {
    id: `rev-${expense.id}`,
    originalExpenseId: expense.id,
    creditedHalalas: expense.amountHalalas,
    reason: cleanReason,
  };

  const rejectedExpense: ExpenseDisbursement = {
    ...expense,
    status: "rejected",
    rejectionReason: cleanReason,
    isReversed: true,
  };

  return {
    expense: rejectedExpense,
    updatedCustody,
    reversalEntry,
    salesDrawer: { ...salesDrawer },
  };
}
