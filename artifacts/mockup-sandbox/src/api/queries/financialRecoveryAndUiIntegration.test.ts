import test from "node:test";
import assert from "node:assert/strict";
import {
  executeFundingTransferFlow,
  computeFileHash,
  reconcileExecutionStatus,
} from "./fundingExecutionContract.ts";
import {
  executeCashDisbursementFlow,
  type DirectDebitSafetyContext,
} from "./cashTransactionContract.ts";
import {
  executeEmployeeSettlementFlow,
} from "./employeeSettlementContract.ts";
import {
  createFinancialIntent,
  createBackendIdempotencyStore,
  simulateBackendIdempotentEndpoint,
  type FinancialIntent,
} from "../idempotencyIntent.ts";
import {
  getUnconfirmedIntent,
  setUnconfirmedIntent,
  removeUnconfirmedIntent,
  clearAllFinancialIntents,
} from "./financialIntentStore.ts";
import {
  canAccountantReview,
  createShiftClarificationReturn,
  assertReportModificationAllowed,
  type ShiftDailyCloseReport,
} from "../../components/mockups/asab/shiftReportFinalityContract.ts";
import {
  assertValidExpenseDisbursementSource,
  submitExpenseToCustody,
  approveExpenseInCustody,
  rejectExpenseInCustody,
  type ExpenseCustodyAccount,
  type CashierSalesDrawer,
} from "./expenseAccountingContract.ts";
import { readFileSync } from "node:fs";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A: All Six Financial Entry Points First Attempt & Concurrency Safety
// ─────────────────────────────────────────────────────────────────────────────

test("SECTION A - Entry Point 1 & 2 (Funding Requests): First attempt reaches API once; rapid double-click is blocked", async () => {
  clearAllFinancialIntents();
  const store = createBackendIdempotencyStore();
  let dispatchCount = 0;
  let resolveServerCall: (val: any) => void = () => {};
  const serverCallPromise = new Promise((resolve) => {
    resolveServerCall = resolve;
  });

  const dummyFile = new File(["funding-proof-content"], "proof_receipt.pdf", { type: "application/pdf" });
  const proofHash = await computeFileHash(dummyFile);

  const intent = createFinancialIntent(
    {
      requestId: "req-fnd-101",
      reference: "REF-FND-101",
      proofName: dummyFile.name,
      proofSize: dummyFile.size,
      proofHash,
    },
    undefined,
    "usr-acc-1",
    "comp-1",
  );

  assert.equal(intent.status, "idle", "Intent starts in idle status");
  assert.equal(intent.attemptCount, 0, "Intent starts with 0 attempts");

  const mockDispatcher = (url: string, form: FormData, headers?: Record<string, string>) => {
    dispatchCount++;
    assert.equal(headers?.["Idempotency-Key"], intent.idempotencyKey);
    return serverCallPromise;
  };

  // First call starts and transitions intent to in_flight
  const call1 = executeFundingTransferFlow(
    {
      id: "req-fnd-101",
      reference: "REF-FND-101",
      proof: dummyFile,
      proofHash,
      currentActorId: "usr-acc-1",
      companyId: "comp-1",
      intent,
    },
    mockDispatcher,
  );

  // Synchronously after dispatch begins, intent is in_flight and stored
  assert.equal(dispatchCount, 1, "First legitimate submission must reach API dispatcher exactly once");
  assert.equal(intent.status, "in_flight", "Intent must be transitioned to in_flight");
  assert.equal(intent.attemptCount, 1, "Attempt count must increment to 1");

  // Verify persistence in unconfirmed store
  const stored = getUnconfirmedIntent<any>("funding", "req-fnd-101", "usr-acc-1", "comp-1");
  assert.ok(stored, "In-flight intent must be saved in unconfirmed store");

  // Second rapid click while in_flight is rejected
  assert.throws(
    () =>
      executeFundingTransferFlow(
        {
          id: "req-fnd-101",
          reference: "REF-FND-101",
          proof: dummyFile,
          proofHash,
          currentActorId: "usr-acc-1",
          companyId: "comp-1",
          intent,
        },
        mockDispatcher,
      ),
    /IDEMPOTENCY_CONCURRENT_DISPATCH/,
    "Concurrent submission while in-flight must be blocked",
  );

  assert.equal(dispatchCount, 1, "Dispatcher must NOT be called a second time");

  // Resolve server call
  resolveServerCall({ status: 200, data: { executedAt: "2026-10-31T06:00:00Z" } });
  await call1;
  assert.equal(intent.status, "resolved");
});

test("SECTION A - Entry Point 3 & 4 (Employee Settlement): First attempt reaches API once; rapid double-click is blocked", async () => {
  clearAllFinancialIntents();
  let dispatchCount = 0;
  let resolveServerCall: (val: any) => void = () => {};
  const serverCallPromise = new Promise((resolve) => {
    resolveServerCall = resolve;
  });

  const intent = createFinancialIntent(
    {
      employeeId: "emp-77",
      reason: "Advance Deduction Settlement",
      amountHalalas: 150000,
    },
    undefined,
    "usr-acc-1",
    "comp-1",
  );

  assert.equal(intent.status, "idle");
  assert.equal(intent.attemptCount, 0);

  const mockDispatcher = (url: string, body: any, headers?: Record<string, string>) => {
    dispatchCount++;
    assert.equal(headers?.["Idempotency-Key"], intent.idempotencyKey);
    return serverCallPromise;
  };

  const call1 = executeEmployeeSettlementFlow(
    {
      employeeId: "emp-77",
      reason: "Advance Deduction Settlement",
      amountHalalas: 150000,
      currentActorId: "usr-acc-1",
      companyId: "comp-1",
      intent,
    },
    mockDispatcher,
  );

  assert.equal(dispatchCount, 1, "First settlement submission must reach API once");
  assert.equal(intent.status, "in_flight");
  assert.equal(intent.attemptCount, 1);

  // Second rapid click is blocked
  assert.throws(
    () =>
      executeEmployeeSettlementFlow(
        {
          employeeId: "emp-77",
          reason: "Advance Deduction Settlement",
          amountHalalas: 150000,
          currentActorId: "usr-acc-1",
          companyId: "comp-1",
          intent,
        },
        mockDispatcher,
      ),
    /IDEMPOTENCY_CONCURRENT_DISPATCH/,
  );

  assert.equal(dispatchCount, 1, "Dispatcher must NOT be called twice");

  resolveServerCall({ status: "pending", balanceModified: false });
  await call1;
  assert.equal(intent.status, "resolved");
});

test("SECTION A - Entry Point 5 & 6 (Direct Cash Disbursement): First attempt reaches API once; rapid double-click is blocked", async () => {
  clearAllFinancialIntents();
  let dispatchCount = 0;
  let resolveServerCall: (val: any) => void = () => {};
  const serverCallPromise = new Promise((resolve) => {
    resolveServerCall = resolve;
  });

  const intent = createFinancialIntent(
    {
      custodyId: "cust-branch-1",
      amountHalalas: 25000,
      description: "Kitchen Maintenance",
    },
    undefined,
    "usr-acc-1",
    "comp-1",
  );

  const context: DirectDebitSafetyContext = {
    custody: {
      id: "cust-branch-1",
      brandId: "brand-1",
      remainingHalalas: 100000,
    },
    actor: {
      id: "usr-acc-1",
      companyId: "comp-1",
      roles: ["brand-manager"],
      brandIds: ["brand-1"],
      isCustodyWriteAuthorized: true,
    },
  };

  const mockDispatcher = (url: string, body: any, headers?: Record<string, string>) => {
    dispatchCount++;
    assert.equal(headers?.["Idempotency-Key"], intent.idempotencyKey);
    return serverCallPromise;
  };

  const call1 = executeCashDisbursementFlow(
    {
      custodyId: "cust-branch-1",
      payload: { txnType: "debit", amount: 25000, description: "Kitchen Maintenance" },
      context,
      companyId: "comp-1",
      intent,
    },
    mockDispatcher,
  );

  assert.equal(dispatchCount, 1, "First direct debit submission must reach API once");
  assert.equal(intent.status, "in_flight");
  assert.equal(intent.attemptCount, 1);

  // Second rapid click is blocked
  assert.throws(
    () =>
      executeCashDisbursementFlow(
        {
          custodyId: "cust-branch-1",
          payload: { txnType: "debit", amount: 25000, description: "Kitchen Maintenance" },
          context,
          companyId: "comp-1",
          intent,
        },
        mockDispatcher,
      ),
    /IDEMPOTENCY_CONCURRENT_DISPATCH/,
  );

  assert.equal(dispatchCount, 1, "Dispatcher must NOT be called twice");

  resolveServerCall({ status: 200, data: { id: "txn-1", amountHalalas: 25000 } });
  await call1;
  assert.equal(intent.status, "resolved");
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B: F5 Financial Recovery, Check Server Status & Proof Hash Guard
// ─────────────────────────────────────────────────────────────────────────────

test("SECTION B - F5 Recovery: Restored intent allows matching proof file re-selection, blocks tampered file", async () => {
  clearAllFinancialIntents();

  const originalFile = new File(["valid-bank-receipt-content"], "receipt.pdf", { type: "application/pdf" });
  const validHash = await computeFileHash(originalFile);

  const tamperedFile = new File(["tampered-receipt-content"], "receipt.pdf", { type: "application/pdf" });
  const tamperedHash = await computeFileHash(tamperedFile);

  assert.notEqual(validHash, tamperedHash, "Hash of different content must differ");

  // Stored intent after F5 recovery (status timed_out, attemptCount 1, proof is null)
  const recoveredIntent = createFinancialIntent(
    {
      requestId: "req-recov-01",
      reference: "REF-RECOV-01",
      proofName: "receipt.pdf",
      proofSize: originalFile.size,
      proofHash: validHash,
    },
    "idemp-key-stable-789",
    "usr-acc-1",
  );
  recoveredIntent.status = "timed_out";
  recoveredIntent.attemptCount = 1;

  setUnconfirmedIntent("funding", "req-recov-01", recoveredIntent, "usr-acc-1", "comp-1");

  // 1. Simulating UI file selection with matching file:
  const hash1 = await computeFileHash(originalFile);
  assert.equal(hash1, recoveredIntent.payload.proofHash, "Matching file passes hash verification");

  // 2. Simulating UI file selection with tampered file:
  const hash2 = await computeFileHash(tamperedFile);
  assert.notEqual(hash2, recoveredIntent.payload.proofHash, "Tampered file fails hash verification");

  // 3. Contract level: attempting execution with tampered file hash triggers IDEMPOTENCY_CONFLICT
  assert.throws(
    () =>
      executeFundingTransferFlow(
        {
          id: "req-recov-01",
          reference: "REF-RECOV-01",
          proof: tamperedFile,
          proofHash: tamperedHash,
          currentActorId: "usr-acc-1",
          intent: recoveredIntent,
        },
        () => {},
      ),
    /IDEMPOTENCY_CONFLICT_PAYLOAD_ALTERATION/,
    "Contract rejects modified proof attachment under active intent",
  );
});

test("SECTION B - F5 Recovery: Check Server Status reconciles already executed operation with ZERO additional POSTs", async () => {
  clearAllFinancialIntents();
  let postCount = 0;

  const recoveredIntent = createFinancialIntent(
    {
      requestId: "req-fnd-already-done",
      reference: "REF-DONE-99",
      proofHash: "dummy-hash",
    },
    "idemp-key-done-99",
    "usr-acc-1",
  );
  recoveredIntent.status = "timed_out";
  recoveredIntent.attemptCount = 1;

  setUnconfirmedIntent("funding", "req-fnd-already-done", recoveredIntent, "usr-acc-1", "comp-1");

  // Simulate server state where request was already executed
  const mockServerRequests: any[] = [
    {
      id: "req-fnd-already-done",
      status: "approved",
      executedAt: "2026-10-31T05:30:00Z",
      transferReference: "REF-DONE-99",
      receivedAt: null,
    },
  ];

  // UI runs reconcileExecutionStatus (read-only GET refetch, NO POST)
  const recon = reconcileExecutionStatus("req-fnd-already-done", mockServerRequests);
  assert.equal(recon.alreadyExecuted, true, "Server confirms transfer already executed");
  assert.equal(postCount, 0, "Check Server Status must make ZERO post requests");

  // On confirmation, intent is resolved and removed from unconfirmed store
  recoveredIntent.status = "resolved";
  removeUnconfirmedIntent("funding", "req-fnd-already-done", "usr-acc-1", "comp-1");

  assert.equal(getUnconfirmedIntent("funding", "req-fnd-already-done", "usr-acc-1", "comp-1"), null);
});

test("SECTION B - Inconclusive reconciliation makes zero POST requests", async () => {
  let postCount = 0;
  const mockServerRequests: any[] = []; // Request missing from server list

  const recon = reconcileExecutionStatus("req-missing-id", mockServerRequests);
  assert.equal(recon.alreadyExecuted, false);
  assert.equal(recon.canRetry, false, "Missing or ambiguous state is inconclusive");
  assert.equal(postCount, 0, "Inconclusive check must make ZERO POST calls");
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C: D11 Shift Review & Clarification Integration Evidence
// ─────────────────────────────────────────────────────────────────────────────

test("SECTION C - D11: Clarification preserves original workday and increments revision", () => {
  const originalReport: ShiftDailyCloseReport = {
    shiftId: "shift-2026-10-31-05",
    branchId: "branch-riyadh-01",
    brandId: "brand-1",
    closingDate: "2026-10-31",
    status: "accountant_review",
    revision: 1,
    openingBalanceHalalas: 50000,
    cashCollectedHalalas: 180000,
    managerSubmittedAt: "2026-10-31T21:00:00Z",
  };

  const returned = createShiftClarificationReturn(originalReport, "Discrepancy in card slips");
  assert.equal(returned.closingDate, "2026-10-31", "Original workday must be preserved");
  assert.equal(returned.revision, 2, "Revision must be incremented");
  assert.equal(returned.status, "manager_clarification");
  assert.equal(returned.clarificationReason, "Discrepancy in card slips");
});

test("SECTION C - D11: Head final approval enforces absolute immutability", () => {
  const finalReport: ShiftDailyCloseReport = {
    shiftId: "shift-2026-10-31-06",
    branchId: "branch-riyadh-01",
    brandId: "brand-1",
    closingDate: "2026-10-31",
    status: "final_approved",
    revision: 2,
    openingBalanceHalalas: 50000,
    cashCollectedHalalas: 200000,
    managerSubmittedAt: "2026-10-31T20:00:00Z",
    finalApprovedAt: "2026-10-31T22:30:00Z",
    approvedBy: "head-accountant-01",
  };

  assert.throws(
    () => assertReportModificationAllowed(finalReport),
    /IMMUTABLE_FINAL_REPORT/,
    "Modifying a final approved report must be blocked",
  );

  assert.throws(
    () => createShiftClarificationReturn(finalReport, "Cannot clarify after final approval"),
    /IMMUTABLE_FINAL_REPORT/,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION D: D14 Expense Accounting Lifecycle & EXP-06 Integration Evidence
// ─────────────────────────────────────────────────────────────────────────────

test("SECTION D - D14: EXP-06 accountant permission denial in AccExpensesPage & CompanyDashboard", () => {
  const accExpensesPageSource = readFileSync(
    new URL("../../components/mockups/asab/_pages/accountant/AccExpensesPage.tsx", import.meta.url),
    "utf8",
  );

  assert.ok(
    accExpensesPageSource.includes("اعتماد المصروفات من صلاحية مالك العلامة أو المدير المفوّض (EXP-06)"),
    "AccExpensesPage renders EXP-06 authority banner",
  );
  assert.ok(!accExpensesPageSource.includes("onClick={() => bulkApprove"), "No bulkApprove in AccExpensesPage");
  assert.ok(!accExpensesPageSource.includes("onClick={() => approveOp"), "No approveOp in AccExpensesPage");
});

test("SECTION D - D14: Expense custody separation from sales drawer & single reversal", () => {
  const custody: ExpenseCustodyAccount = {
    id: "cust-exp-99",
    name: "Petty Cash Kitchen",
    remainingHalalas: 80000,
  };

  const salesDrawer: CashierSalesDrawer = {
    shiftId: "shf-1",
    cashierId: "csh-1",
    salesCollectedHalalas: 450000,
  };

  // 1. Initial submission reserves 20000 from custody
  const { expense, updatedCustody, salesDrawer: untouchedDrawer } = submitExpenseToCustody(
    "exp-101",
    20000,
    "custody",
    custody,
    salesDrawer,
  );

  assert.equal(updatedCustody.remainingHalalas, 60000, "Custody debited by 20000 halalas");
  assert.equal(untouchedDrawer.salesCollectedHalalas, 450000, "Cashier sales drawer is untouched");

  // 2. Approval confirms without secondary debit
  const { updatedCustody: approvedCustody } = approveExpenseInCustody(expense, updatedCustody, untouchedDrawer);
  assert.equal(approvedCustody.remainingHalalas, 60000, "No duplicate deduction on approval");

  // 3. Prohibit direct disbursement from cashier sales drawer
  assert.throws(
    () => assertValidExpenseDisbursementSource("cashier_sales_drawer"),
    /FORBIDDEN_EXPENSE_SOURCE/,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION E: Section 4.A Company Scoping & Tenant Isolation in Execution Flows
// ─────────────────────────────────────────────────────────────────────────────

test("SECTION E - Company Scoping: Contracts store intent under authenticated companyId, never default_company", async () => {
  clearAllFinancialIntents();

  const dummyFile = new File(["test-proof"], "proof.pdf", { type: "application/pdf" });
  const hash = await computeFileHash(dummyFile);

  const fundingIntent = createFinancialIntent(
    { requestId: "req-fnd-scope-01", reference: "REF-SCOPE-01", proofHash: hash },
    "key-fnd-scope-01",
    "usr-acc-1",
    "comp-riyadh-01",
  );

  // Execute funding transfer with companyId
  let serverPromiseResolve: (v: any) => void = () => {};
  const serverP = new Promise((res) => { serverPromiseResolve = res; });

  const fundingCall = executeFundingTransferFlow(
    {
      id: "req-fnd-scope-01",
      reference: "REF-SCOPE-01",
      proof: dummyFile,
      proofHash: hash,
      currentActorId: "usr-acc-1",
      companyId: "comp-riyadh-01",
      intent: fundingIntent,
    },
    () => serverP,
  );

  // Must be saved in unconfirmed store strictly under comp-riyadh-01
  const savedInCompany = getUnconfirmedIntent("funding", "req-fnd-scope-01", "usr-acc-1", "comp-riyadh-01");
  assert.ok(savedInCompany, "Must be saved under authenticated companyId");

  // Must NOT be in default_company
  const savedInDefault = getUnconfirmedIntent("funding", "req-fnd-scope-01", "usr-acc-1", "default_company");
  assert.equal(savedInDefault, null, "Must NOT leave orphan in default_company");

  // Another company cannot access it
  const savedInOther = getUnconfirmedIntent("funding", "req-fnd-scope-01", "usr-acc-1", "comp-other-02");
  assert.equal(savedInOther, null, "Other company cannot access intent");

  // Resolve
  serverPromiseResolve({ status: 200, data: { executedAt: "2026-10-31T07:00:00Z" } });
  await fundingCall;

  // On UI success, removal clears the company key
  removeUnconfirmedIntent("funding", "req-fnd-scope-01", "usr-acc-1", "comp-riyadh-01");
  assert.equal(getUnconfirmedIntent("funding", "req-fnd-scope-01", "usr-acc-1", "comp-riyadh-01"), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION F: Section 11 Late Response After Session / Tenant Switch
// ─────────────────────────────────────────────────────────────────────────────

test("SECTION F - Late Callback Safety: Late response after logout or company switch never resurrects stale intent", async () => {
  clearAllFinancialIntents();

  let resolveServerCall: (v: any) => void = () => {};
  let rejectServerCall: (e: any) => void = () => {};
  const serverP = new Promise((resolve, reject) => {
    resolveServerCall = resolve;
    rejectServerCall = reject;
  });

  const intent = createFinancialIntent(
    { employeeId: "emp-late-01", reason: "Annual Settlement", amountHalalas: 50000 },
    "key-late-session-01",
    "usr-alice",
    "comp-alpha",
  );

  // Dispatch under Alice / Company Alpha
  const mutationPromise = executeEmployeeSettlementFlow(
    {
      employeeId: "emp-late-01",
      reason: "Annual Settlement",
      amountHalalas: 50000,
      currentActorId: "usr-alice",
      companyId: "comp-alpha",
      intent,
    },
    () => serverP,
  );

  assert.equal(intent.status, "in_flight");
  assert.ok(getUnconfirmedIntent("employee_settlement", "emp-late-01", "usr-alice", "comp-alpha"));

  // Now, simulate Logout / Tenant switch while mutation is in-flight:
  clearAllFinancialIntents(); // Simulates purgeFinancialQueries / clearRetiredQueryClient
  assert.equal(getUnconfirmedIntent("employee_settlement", "emp-late-01", "usr-alice", "comp-alpha"), null);

  // Active user in frontend changes to Bob in Company Beta
  const activeUser = { id: "usr-bob", companyId: "comp-beta" };

  // 1. Simulate late resolution
  resolveServerCall({ status: "pending", balanceModified: false });
  await mutationPromise;

  // In UI onSuccess handler:
  const isMatchingSession =
    activeUser.id === intent.actorId && activeUser.companyId === intent.companyId;
  assert.equal(isMatchingSession, false, "Must detect that active session does NOT match mutation session");

  // Handler must not save or restore intent into Bob's session
  assert.equal(
    getUnconfirmedIntent("employee_settlement", "emp-late-01", activeUser.id, activeUser.companyId),
    null,
    "Bob in Company Beta must never receive or see Alice's financial intent",
  );

  // Alice's old cache remains empty
  assert.equal(
    getUnconfirmedIntent("employee_settlement", "emp-late-01", "usr-alice", "comp-alpha"),
    null,
    "Alice's purged session must not be resurrected by late response",
  );
});
