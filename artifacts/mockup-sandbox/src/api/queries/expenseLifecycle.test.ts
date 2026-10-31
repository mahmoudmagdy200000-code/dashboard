import test from "node:test";
import assert from "node:assert/strict";
import {
  assertValidExpenseDisbursementSource,
  submitExpenseToCustody,
  approveExpenseInCustody,
  rejectExpenseInCustody,
  type ExpenseCustodyAccount,
  type CashierSalesDrawer,
} from "./expenseAccountingContract.ts";

test("D14: expense submission deducts from designated expense custody and isolates cashier sales drawer", () => {
  const custody: ExpenseCustodyAccount = {
    id: "custody-exp-01",
    name: "عهدة مصروفات التشغيل",
    remainingHalalas: 100000, // 1,000.00 SAR
  };

  const salesDrawer: CashierSalesDrawer = {
    shiftId: "shift-77",
    cashierId: "cashier-10",
    salesCollectedHalalas: 450000, // 4,500.00 SAR
  };

  const result = submitExpenseToCustody(
    "exp-101",
    25000, // 250.00 SAR
    "custody",
    custody,
    salesDrawer,
  );

  // Custody is reserved/deducted by 250.00 SAR
  assert.equal(result.updatedCustody.remainingHalalas, 75000);
  // Sales drawer is untouched (4,500.00 SAR preserved)
  assert.equal(result.salesDrawer.salesCollectedHalalas, 450000);
  assert.equal(result.expense.status, "submitted");
});

test("D14: uncovered expense is refused and cannot spill into cashier sales drawer", () => {
  const custody: ExpenseCustodyAccount = {
    id: "custody-exp-01",
    name: "عهدة مصروفات التشغيل",
    remainingHalalas: 10000, // 100.00 SAR
  };

  const salesDrawer: CashierSalesDrawer = {
    shiftId: "shift-77",
    cashierId: "cashier-10",
    salesCollectedHalalas: 450000, // 4,500.00 SAR
  };

  // Attempting to spend 200.00 SAR when custody has 100.00 SAR
  assert.throws(
    () => submitExpenseToCustody("exp-102", 20000, "custody", custody, salesDrawer),
    /INSUFFICIENT_EXPENSE_CUSTODY/,
  );
  // Sales drawer remains completely unaffected
  assert.equal(salesDrawer.salesCollectedHalalas, 450000);
});

test("D14: expense approval confirms reservation without secondary or duplicate deduction", () => {
  const custodyReserved: ExpenseCustodyAccount = {
    id: "custody-exp-01",
    name: "عهدة مصروفات التشغيل",
    remainingHalalas: 75000, // already deducted at submission
  };

  const salesDrawer: CashierSalesDrawer = {
    shiftId: "shift-77",
    cashierId: "cashier-10",
    salesCollectedHalalas: 450000,
  };

  const submittedExpense = {
    id: "exp-101",
    amountHalalas: 25000,
    paymentSource: "custody" as const,
    custodyId: "custody-exp-01",
    status: "submitted" as const,
  };

  const result = approveExpenseInCustody(submittedExpense, custodyReserved, salesDrawer);

  // Invariant: Approval does NOT repeat the deduction
  assert.equal(result.updatedCustody.remainingHalalas, 75000);
  assert.equal(result.salesDrawer.salesCollectedHalalas, 450000);
  assert.equal(result.expense.status, "approved");
});

test("D14: expense rejection creates dual reversal entry and restores custody balance", () => {
  const custodyReserved: ExpenseCustodyAccount = {
    id: "custody-exp-01",
    name: "عهدة مصروفات التشغيل",
    remainingHalalas: 75000,
  };

  const salesDrawer: CashierSalesDrawer = {
    shiftId: "shift-77",
    cashierId: "cashier-10",
    salesCollectedHalalas: 450000,
  };

  const submittedExpense = {
    id: "exp-101",
    amountHalalas: 25000,
    paymentSource: "custody" as const,
    custodyId: "custody-exp-01",
    status: "submitted" as const,
  };

  // Rejection requires reason
  assert.throws(
    () => rejectExpenseInCustody(submittedExpense, "", custodyReserved, salesDrawer),
    /REJECTION_REASON_MANDATORY/,
  );

  const result = rejectExpenseInCustody(
    submittedExpense,
    "فاتورة غير مطابقة للمواصفات",
    custodyReserved,
    salesDrawer,
  );

  // Custody balance restored: 75000 + 25000 = 100000
  assert.equal(result.updatedCustody.remainingHalalas, 100000);
  // Additive reversal entry created
  assert.equal(result.reversalEntry.originalExpenseId, "exp-101");
  assert.equal(result.reversalEntry.creditedHalalas, 25000);
  assert.equal(result.reversalEntry.reason, "فاتورة غير مطابقة للمواصفات");
  assert.equal(result.expense.status, "rejected");
  assert.equal(result.expense.isReversed, true);
  // Sales drawer is untouched
  assert.equal(result.salesDrawer.salesCollectedHalalas, 450000);
});

test("D14 Invariant: direct cashier sales drawer disbursement is prohibited", () => {
  assert.throws(
    () => assertValidExpenseDisbursementSource("cashier_sales_drawer"),
    /FORBIDDEN_EXPENSE_SOURCE/,
  );
  assert.throws(
    () => assertValidExpenseDisbursementSource("sales_cash"),
    /FORBIDDEN_EXPENSE_SOURCE/,
  );
  assert.doesNotThrow(() => assertValidExpenseDisbursementSource("custody"));
  assert.doesNotThrow(() => assertValidExpenseDisbursementSource("petty_cash"));
});
