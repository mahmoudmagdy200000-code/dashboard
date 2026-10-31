import test from "node:test";
import assert from "node:assert/strict";
import {
  assertValidExpenseDisbursementSource,
  submitExpenseToCustody,
  approveExpenseInCustody,
  rejectExpenseInCustody,
  type ExpenseCustodyAccount,
  type CashierSalesDrawer,
} from "../../../api/queries/expenseAccountingContract.ts";
import { readFileSync } from "node:fs";

test("D14 Integration: AccExpensesPage enforces EXP-06 (accountant cannot approve/reject expenses)", () => {
  const source = readFileSync(
    new URL("./_pages/accountant/AccExpensesPage.tsx", import.meta.url),
    "utf8"
  );

  // AccExpensesPage must not render approve, reject or bulk buttons for accountant
  assert.ok(!source.includes("onClick={() => bulkApprove"), "AccExpensesPage must not render bulkApprove button");
  assert.ok(!source.includes("onClick={() => approveOp"), "AccExpensesPage must not render approveOp button");
  assert.ok(!source.includes('setModal("reject")'), "AccExpensesPage must not render reject button");
  assert.ok(
    source.includes("اعتماد المصروفات من صلاحية مالك العلامة أو المدير المفوّض (EXP-06)"),
    "AccExpensesPage must render EXP-06 authority banner"
  );
});

test("D14 Integration: Expense custody separation from cashier sales drawer", () => {
  const expenseCustody: ExpenseCustodyAccount = {
    id: "cust-exp-01",
    brandId: "brand-1",
    totalAmountHalalas: 500000,
    remainingHalalas: 500000,
  };

  const cashierDrawer: CashierSalesDrawer = {
    shiftId: "shift-1",
    branchId: "branch-1",
    cashierSalesCollectedHalalas: 300000,
  };

  // 1. Initial submission deducts from designated expense custody only
  const { expense, updatedCustody, salesDrawer } = submitExpenseToCustody(
    "exp-inv-001",
    15000,
    "custody",
    expenseCustody,
    cashierDrawer
  );

  assert.equal(expense.status, "submitted");
  assert.equal(updatedCustody.remainingHalalas, 485000);
  // Cashier sales drawer is strictly untouched
  assert.equal(salesDrawer.cashierSalesCollectedHalalas, 300000);

  // 2. Prohibit dispatching expense against cashier sales drawer
  assert.throws(
    () => assertValidExpenseDisbursementSource("cashier_sales_drawer"),
    /FORBIDDEN_EXPENSE_SOURCE/,
    "Disbursement from cashier sales drawer is strictly prohibited"
  );
});

test("D14 Integration: Approval confirms reservation without duplicate debit; rejection reverses once", () => {
  const initialCustody: ExpenseCustodyAccount = {
    id: "cust-exp-02",
    brandId: "brand-1",
    totalAmountHalalas: 100000,
    remainingHalalas: 100000,
  };

  const salesDrawer: CashierSalesDrawer = {
    shiftId: "shift-2",
    branchId: "branch-1",
    cashierSalesCollectedHalalas: 250000,
  };

  // Submission reserves 25000 from custody
  const { expense: submitted, updatedCustody: reservedCustody } = submitExpenseToCustody(
    "exp-002",
    25000,
    "custody",
    initialCustody,
    salesDrawer
  );
  assert.equal(reservedCustody.remainingHalalas, 75000);

  // Approval confirms without second deduction
  const { expense: approved, updatedCustody: approvedCustody } = approveExpenseInCustody(
    submitted,
    reservedCustody,
    salesDrawer
  );
  assert.equal(approved.status, "approved");
  assert.equal(approvedCustody.remainingHalalas, 75000, "Custody balance must not be debited a second time on approval");

  // Rejection restores balance via reversal
  const { expense: forRejection, updatedCustody: custodyBeforeRejection } = submitExpenseToCustody(
    "exp-003",
    20000,
    "custody",
    initialCustody,
    salesDrawer
  );
  const { expense: rejected, updatedCustody: restoredCustody, reversalEntry } = rejectExpenseInCustody(
    forRejection,
    "Missing receipt attachment",
    custodyBeforeRejection,
    salesDrawer
  );

  assert.equal(rejected.status, "rejected");
  assert.equal(restoredCustody.remainingHalalas, 100000, "Custody balance must be restored on rejection");
  assert.ok(reversalEntry, "Must create a reversal credit entry");
  assert.equal(reversalEntry.creditedHalalas, 20000);

  // Note: Actual database ledger journal postings occur backend-side and require live staging environment (NOT_RUN_EXTERNAL)
});
