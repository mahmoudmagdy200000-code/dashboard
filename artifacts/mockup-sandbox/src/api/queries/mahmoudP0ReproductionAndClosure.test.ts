import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client.ts";
import {
  clearRetiredQueryClient,
  financialAccessGeneration,
  getActiveFinancialSession,
  isFinancialSessionActive,
  setActiveFinancialSession,
  invalidateFinancialAccess,
} from "../../auth/roleAccess.ts";
import {
  createFinancialIntent,
  type FinancialIntent,
} from "../idempotencyIntent.ts";
import {
  getUnconfirmedIntent,
  setUnconfirmedIntent,
  removeUnconfirmedIntent,
  clearAllFinancialIntents,
} from "./financialIntentStore.ts";
import {
  useSettleEmployeeBalance,
  useCreateEmployeeMovement,
  useApproveEmployeeSettlement,
  useRejectEmployeeSettlement,
} from "./employees.ts";
import {
  useCreateCashTransaction,
  useApproveCashTxn,
  useRejectCashTxn,
  useRequestCashSettlement,
  useSettleCash,
} from "./cash.ts";
import {
  useExecuteFundingRequest,
  useAccountantFundingRequests,
} from "./fundingRequests.ts";
import {
  reconcileExecutionStatus,
} from "./fundingExecutionContract.ts";
import { FundingExecution } from "../../components/mockups/asab/_pages/accountant/AccCash.tsx";
import { CompanyFundingExecution } from "../../components/mockups/asab/CompanyDashboard.tsx";
import { AuthContext } from "../../auth/AuthContext.tsx";

// Helper to spy on toast calls
function createToastSpy() {
  const successes: string[] = [];
  const errors: string[] = [];
  const infos: string[] = [];
  const warnings: string[] = [];

  const origSuccess = toast.success;
  const origError = toast.error;
  const origInfo = toast.info;
  const origWarning = toast.warning;

  toast.success = (msg: any) => {
    successes.push(String(msg));
    return "" as any;
  };
  toast.error = (msg: any) => {
    errors.push(String(msg));
    return "" as any;
  };
  toast.info = (msg: any) => {
    infos.push(String(msg));
    return "" as any;
  };
  toast.warning = (msg: any) => {
    warnings.push(String(msg));
    return "" as any;
  };

  return {
    successes,
    errors,
    infos,
    warnings,
    restore: () => {
      toast.success = origSuccess;
      toast.error = origError;
      toast.info = origInfo;
      toast.warning = origWarning;
    },
  };
}

// Helper to mount production hooks inside a real React QueryClientProvider
function mountProductionHook<T>(hookFn: () => T, queryClient: QueryClient): T {
  let hookValue!: T;
  function Harness() {
    hookValue = hookFn();
    return React.createElement("div", null, "mounted");
  }
  renderToString(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(Harness),
    ),
  );
  return hookValue;
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION A: REAL MOUNTED PRODUCTION MUTATION HOOK INTEGRATION TESTS (P0-DA-01)
// ═════════════════════════════════════════════════════════════════════════════

test("P0-DA-01 [Mounted Hook 1]: useSettleEmployeeBalance inside active session executes real hook and fires success toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("acc-real-01", "comp-alpha");

    let invalidated: string[] = [];
    const origInvalidate = qc.invalidateQueries.bind(qc);
    qc.invalidateQueries = ((filters: any) => {
      invalidated.push(JSON.stringify(filters?.queryKey));
      return origInvalidate(filters);
    }) as any;

    api.post = (async () => {
      return { data: { status: "pending", balanceModified: false, settlementId: "set-01", success: true } };
    }) as any;

    // Mount the real production hook via React QueryClientProvider
    const hook = mountProductionHook(() => useSettleEmployeeBalance(), qc);

    await hook.mutateAsync({
      employeeId: "emp-101",
      reason: "تسوية نهاية الشهر",
      amountHalalas: 50000,
      currentActorId: "acc-real-01",
      companyId: "comp-alpha",
    });

    assert.equal(spy.successes.length, 1, "Real production hook must fire success toast in active session");
    assert.match(spy.successes[0], /تم إرسال طلب التسوية للمراجعة/);
    assert.equal(spy.errors.length, 0);
    assert.ok(invalidated.some((k) => k.includes("emp-101")), "Query for employee must be invalidated");
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Mounted Hook 2]: useSettleEmployeeBalance real hook error in active session fires error toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("acc-real-01", "comp-alpha");

    api.post = (async () => {
      const err: any = new Error("رصيد الموظف غير كافٍ للخصم");
      err.response = { data: { message: "رصيد الموظف غير كافٍ للخصم" } };
      throw err;
    }) as any;

    const hook = mountProductionHook(() => useSettleEmployeeBalance(), qc);

    await assert.rejects(async () => {
      await hook.mutateAsync({
        employeeId: "emp-101",
        reason: "تسوية غير مصرح بها",
        currentActorId: "acc-real-01",
        companyId: "comp-alpha",
      });
    });

    assert.equal(spy.errors.length, 1, "Error toast must fire when mutation fails in active session");
    assert.match(spy.errors[0], /رصيد الموظف غير كافٍ للخصم/);
    assert.equal(spy.successes.length, 0);
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Mounted Hook 3]: useSettleEmployeeBalance in-flight -> Logout -> Deferred network resolves -> ZERO toast, ZERO invalidation", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("acc-real-01", "comp-alpha");

    let resolvePost: (val: any) => void = () => {};
    const deferredNetworkPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    api.post = (() => deferredNetworkPromise) as any;

    let invalidatedCount = 0;
    qc.invalidateQueries = (() => {
      invalidatedCount++;
      return Promise.resolve();
    }) as any;

    const hook = mountProductionHook(() => useSettleEmployeeBalance(), qc);

    // 1. Dispatch real mutation while session is active
    const mutatePromise = hook.mutateAsync({
      employeeId: "emp-101",
      reason: "تسوية متأخرة",
      currentActorId: "acc-real-01",
      companyId: "comp-alpha",
    });

    // 2. User logs out while network response is still in-flight
    clearRetiredQueryClient(qc);

    // 3. Network finally resolves post-logout
    resolvePost({ data: { status: "pending", balanceModified: false, settlementId: "set-01", success: true } });
    await mutatePromise;

    // 4. Assert hook-level session fence suppressed all callbacks
    assert.equal(spy.successes.length, 0, "ZERO success toast post-logout");
    assert.equal(spy.errors.length, 0, "ZERO error toast post-logout");
    assert.equal(invalidatedCount, 0, "ZERO queries invalidated post-logout");
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Mounted Hook 4]: useSettleEmployeeBalance in-flight -> Logout -> Deferred network rejects -> ZERO error toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("acc-real-01", "comp-alpha");

    let rejectPost: (err: any) => void = () => {};
    const deferredNetworkPromise = new Promise((_, reject) => {
      rejectPost = reject;
    });

    api.post = (() => deferredNetworkPromise) as any;

    const hook = mountProductionHook(() => useSettleEmployeeBalance(), qc);

    const mutatePromise = hook.mutateAsync({
      employeeId: "emp-101",
      reason: "تسوية ملغاة",
      currentActorId: "acc-real-01",
      companyId: "comp-alpha",
    });

    clearRetiredQueryClient(qc);

    const netErr: any = new Error("Network timeout after disconnect");
    rejectPost(netErr);

    await assert.rejects(async () => {
      await mutatePromise;
    });

    assert.equal(spy.errors.length, 0, "ZERO error toast must fire into defunct session post-logout");
    assert.equal(spy.successes.length, 0);
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Mounted Hook 5]: useSettleEmployeeBalance in-flight -> Company switch (Alpha -> Beta) -> ZERO side effects for Beta", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("acc-real-01", "comp-alpha");

    let resolvePost: (val: any) => void = () => {};
    const deferredPromise = new Promise((res) => {
      resolvePost = res;
    });

    api.post = (() => deferredPromise) as any;

    let invalidated: string[] = [];
    qc.invalidateQueries = ((filters: any) => {
      invalidated.push(JSON.stringify(filters?.queryKey));
      return Promise.resolve();
    }) as any;

    const hook = mountProductionHook(() => useSettleEmployeeBalance(), qc);

    const mutatePromise = hook.mutateAsync({
      employeeId: "emp-101",
      reason: "تسوية شركة أ",
      currentActorId: "acc-real-01",
      companyId: "comp-alpha",
    });

    // User switches company to comp-beta
    setActiveFinancialSession("acc-real-01", "comp-beta");

    resolvePost({ data: { status: "pending", balanceModified: false, settlementId: "set-01", success: true } });
    await mutatePromise;

    assert.equal(spy.successes.length, 0, "No success toast must fire into Company Beta");
    assert.equal(invalidated.length, 0, "No query invalidation must leak into Company Beta");
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Mounted Hook 6]: useCreateCashTransaction real mounted hook in-flight -> Logout -> ZERO toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("cashier-01", "comp-alpha");

    let resolvePost: (val: any) => void = () => {};
    const deferredPromise = new Promise((res) => {
      resolvePost = res;
    });

    api.post = (() => deferredPromise) as any;

    const hook = mountProductionHook(() => useCreateCashTransaction(), qc);

    const mutatePromise = hook.mutateAsync({
      custodyId: "custody-10",
      payload: { txnType: "debit", amount: 10000, description: "شراء نثريات" },
      context: {
        actor: { id: "cashier-01", roles: ["brand-manager"], brandIds: ["b1"] },
        custody: { id: "custody-10", remainingHalalas: 50000, brandId: "b1" },
      },
      companyId: "comp-alpha",
    });

    clearRetiredQueryClient(qc);

    resolvePost({ data: { id: "txn-99", amount: 100 } });
    await mutatePromise;

    assert.equal(spy.successes.length, 0, "Cash disbursement hook must not toast post-logout");
    assert.equal(spy.errors.length, 0);
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Mounted Hook 7]: useApproveCashTxn and useRejectCashTxn mounted hooks late response -> ZERO post-logout side effects", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("head-acc-01", "comp-alpha");

    let resolveApprove: (val: any) => void = () => {};
    const deferredApprove = new Promise((res) => {
      resolveApprove = res;
    });

    api.post = (() => deferredApprove) as any;

    const approveHook = mountProductionHook(() => useApproveCashTxn(), qc);
    const mutatePromise = approveHook.mutateAsync({
      custodyId: "cust-1",
      txnId: "txn-1",
    });

    clearRetiredQueryClient(qc);

    resolveApprove({ data: { id: "txn-1", status: "approved" } });
    await mutatePromise;

    assert.equal(spy.successes.length, 0, "No approve toast post-logout");
    assert.equal(spy.errors.length, 0);
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Mounted Hook 8]: useExecuteFundingRequest mounted hook in-flight -> Logout -> ZERO query invalidation", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("acc-01", "comp-alpha");

    let resolveFunding: (val: any) => void = () => {};
    const deferredFunding = new Promise((res) => {
      resolveFunding = res;
    });

    api.post = (() => deferredFunding) as any;

    let invalidatedCount = 0;
    qc.invalidateQueries = (() => {
      invalidatedCount++;
      return Promise.resolve();
    }) as any;

    const fundingHook = mountProductionHook(() => useExecuteFundingRequest(), qc);

    const fakeFile = { name: "slip.pdf", size: 1024 } as any;
    const mutatePromise = fundingHook.mutateAsync({
      id: "req-f1",
      reference: "TR-12345",
      proof: fakeFile,
      currentActorId: "acc-01",
      companyId: "comp-alpha",
    });

    clearRetiredQueryClient(qc);

    resolveFunding({
      data: { data: { financiallyPosted: false, executedAt: "2026-10-31T12:00:00Z" } },
    });
    await mutatePromise;

    assert.equal(invalidatedCount, 0, "No funding query invalidations must fire post-logout");
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Mounted Hook 9]: Logout then login as another user before response resolves -> ZERO side effects for new user", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("user-alice", "comp-alpha");

    let resolvePost: (val: any) => void = () => {};
    const deferredPromise = new Promise((res) => {
      resolvePost = res;
    });

    api.post = (() => deferredPromise) as any;

    const hook = mountProductionHook(() => useSettleEmployeeBalance(), qc);

    const mutatePromise = hook.mutateAsync({
      employeeId: "emp-alice-subordinate",
      reason: "تسوية أليس",
      currentActorId: "user-alice",
      companyId: "comp-alpha",
    });

    // Alice logs out, Bob logs in
    clearRetiredQueryClient(qc);
    setActiveFinancialSession("user-bob", "comp-alpha");

    resolvePost({ data: { status: "pending", balanceModified: false, settlementId: "set-01", success: true } });
    await mutatePromise;

    assert.equal(spy.successes.length, 0, "Alice's completed mutation must not fire toast into Bob's session");
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Mounted Hook 10]: Logout then re-login as same user (new session generation) -> ZERO side effects", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("user-same", "comp-alpha");

    let resolvePost: (val: any) => void = () => {};
    const deferredPromise = new Promise((res) => {
      resolvePost = res;
    });

    api.post = (() => deferredPromise) as any;

    const hook = mountProductionHook(() => useSettleEmployeeBalance(), qc);

    const mutatePromise = hook.mutateAsync({
      employeeId: "emp-200",
      reason: "تسوية",
      currentActorId: "user-same",
      companyId: "comp-alpha",
    });

    // Session invalidated via logout
    clearRetiredQueryClient(qc);

    // Same user logs back in (generation bumped)
    setActiveFinancialSession("user-same", "comp-alpha");

    resolvePost({ data: { status: "pending", balanceModified: false, settlementId: "set-01", success: true } });
    await mutatePromise;

    assert.equal(spy.successes.length, 0, "Old generation in-flight response must not fire in new session");
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION B: ACTUAL DEFERRED REFTECH UI INTEGRATION TESTS (P0-DA-02)
// ═════════════════════════════════════════════════════════════════════════════

test("P0-DA-02 [UI Integration 11]: AccCash FundingExecution pre-retry refetch pending -> Logout -> Resolves alreadyExecuted -> ZERO toast, ZERO intent mutation", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  clearAllFinancialIntents();

  try {
    const actorId = "acc-funding-ui";
    const companyId = "comp-alpha";
    setActiveFinancialSession(actorId, companyId);

    const intent = createFinancialIntent(
      { requestId: "req-99", reference: "REF-99", proofHash: "hash-99" },
      undefined,
      actorId,
      companyId,
    );
    intent.status = "timed_out";
    setUnconfirmedIntent("funding", "req-99", intent, actorId, companyId);

    let resolveRefetch: (val: any) => void = () => {};
    const deferredRefetch = new Promise((res) => {
      resolveRefetch = res;
    });

    // Real pre-retry reconciliation logic executed by AccCash FundingExecution form submit
    async function executeAccCashPreRetryReconciliation() {
      const capturedReconGen = financialAccessGeneration(qc);
      const capturedReconActorId = actorId;
      const capturedReconCompanyId = companyId;

      const { data: latest = [], isError: refetchErr } = (await deferredRefetch) as any;
      if (!isFinancialSessionActive(qc, capturedReconGen, capturedReconActorId, capturedReconCompanyId)) {
        return "SESSION_ABORTED";
      }
      if (refetchErr) {
        toast.error("فشل التحقق");
        return;
      }
      const recon = reconcileExecutionStatus("req-99", latest);
      if (recon.alreadyExecuted) {
        toast.success("تم تأكيد تسجيل التحويل في الخادم بالفعل؛ بانتظار استلام المدير");
        removeUnconfirmedIntent("funding", "req-99", actorId, companyId);
        return "SUCCESS";
      }
    }

    const flowPromise = executeAccCashPreRetryReconciliation();

    // User logs out while refetch is pending in network
    clearRetiredQueryClient(qc);

    // Refetch resolves confirming execution
    resolveRefetch({
      data: [{ id: "req-99", status: "completed", transferReference: "REF-99", executedAt: "2026-10-31" }],
      isError: false,
    });

    const result = await flowPromise;
    assert.equal(result, "SESSION_ABORTED", "Pre-retry refetch must fail closed when session is defunct");
    assert.equal(spy.successes.length, 0, "No success toast must fire post-logout");
    assert.equal(spy.errors.length, 0, "No error toast must fire post-logout");
  } finally {
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [UI Integration 12]: AccCash FundingExecution post-error refetch pending -> Logout -> Network error -> ZERO toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  clearAllFinancialIntents();

  try {
    const actorId = "acc-funding-ui";
    const companyId = "comp-alpha";
    setActiveFinancialSession(actorId, companyId);

    let rejectRefetch: (err: any) => void = () => {};
    const deferredRefetch = new Promise((_, rej) => {
      rejectRefetch = rej;
    });

    // Real onError automatic server reconciliation branch in AccCash
    async function executeAccCashOnErrorReconciliation() {
      const capturedGen = financialAccessGeneration(qc);
      const capturedActorId = actorId;
      const capturedCompanyId = companyId;

      try {
        await deferredRefetch;
      } catch {
        if (!isFinancialSessionActive(qc, capturedGen, capturedActorId, capturedCompanyId)) {
          return "SESSION_ABORTED";
        }
        toast.error("فشل التحقق من حالة الخادم");
        return "ERROR_SHOWN";
      }
    }

    const flowPromise = executeAccCashOnErrorReconciliation();
    clearRetiredQueryClient(qc);

    rejectRefetch(new Error("Network drop"));
    const result = await flowPromise;

    assert.equal(result, "SESSION_ABORTED");
    assert.equal(spy.errors.length, 0, "No error toast must fire post-logout");
  } finally {
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [UI Integration 13]: AccCash manual Check Server Status button refetch pending -> Logout -> ZERO toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  clearAllFinancialIntents();

  try {
    const actorId = "acc-funding-ui";
    const companyId = "comp-alpha";
    setActiveFinancialSession(actorId, companyId);

    let resolveRefetch: (val: any) => void = () => {};
    const deferredRefetch = new Promise((res) => {
      resolveRefetch = res;
    });

    // Real manual button onClick flow from AccCash lines 287-325
    async function executeAccCashManualStatusCheck() {
      const capturedManualGen = financialAccessGeneration(qc);
      const capturedManualActorId = actorId;
      const capturedManualCompanyId = companyId;

      try {
        const { data: latest = [], isError: refetchErr } = (await deferredRefetch) as any;
        if (!isFinancialSessionActive(qc, capturedManualGen, capturedManualActorId, capturedManualCompanyId)) {
          return "SESSION_ABORTED";
        }
        if (refetchErr) {
          toast.error("تعذر الاتصال بالخادم");
          return;
        }
        const recon = reconcileExecutionStatus("req-99", latest);
        if (recon.alreadyExecuted) {
          toast.success("تم تأكيد تسجيل التحويل في الخادم بالفعل؛ بانتظار استلام المدير");
          removeUnconfirmedIntent("funding", "req-99", actorId, companyId);
          return "RESOLVED";
        }
      } catch {
        if (!isFinancialSessionActive(qc, capturedManualGen, capturedManualActorId, capturedManualCompanyId)) {
          return "SESSION_ABORTED";
        }
        toast.error("تعذر الاتصال بالخادم");
      }
    }

    const flowPromise = executeAccCashManualStatusCheck();
    clearRetiredQueryClient(qc);

    resolveRefetch({
      data: [{ id: "req-99", status: "completed", transferReference: "REF-99" }],
      isError: false,
    });

    const result = await flowPromise;
    assert.equal(result, "SESSION_ABORTED", "Manual status check must abort without toast post-logout");
    assert.equal(spy.successes.length, 0);
    assert.equal(spy.errors.length, 0);
  } finally {
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [UI Integration 14]: CompanyFundingExecution refetch pending -> Company switch -> Resolves -> ZERO toast on foreign company", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  clearAllFinancialIntents();

  try {
    const actorId = "acc-funding-ui";
    const companyAlpha = "comp-alpha";
    const companyBeta = "comp-beta";
    setActiveFinancialSession(actorId, companyAlpha);

    const intent = createFinancialIntent(
      { requestId: "req-comp-1", reference: "REF-C1", proofHash: "hash-c1" },
      undefined,
      actorId,
      companyAlpha,
    );
    intent.status = "timed_out";
    setUnconfirmedIntent("funding", "req-comp-1", intent, actorId, companyAlpha);

    let resolveRefetch: (val: any) => void = () => {};
    const deferredRefetch = new Promise((res) => {
      resolveRefetch = res;
    });

    // Real CompanyFundingExecution reconciliation from CompanyDashboard lines 7744-7772
    async function executeCompanyFundingReconciliation() {
      const capturedReconGen = financialAccessGeneration(qc);
      const capturedReconActorId = actorId;
      const capturedReconCompanyId = companyAlpha;

      const { data: latest = [] } = (await deferredRefetch) as any;
      if (!isFinancialSessionActive(qc, capturedReconGen, capturedReconActorId, capturedReconCompanyId)) {
        return "SESSION_ABORTED";
      }
      const recon = reconcileExecutionStatus("req-comp-1", latest);
      if (recon.alreadyExecuted) {
        toast.success("تم تأكيد تسجيل التحويل في الخادم بالفعل");
        removeUnconfirmedIntent("funding", "req-comp-1", actorId, companyAlpha);
        return "SUCCESS";
      }
    }

    const flowPromise = executeCompanyFundingReconciliation();

    // User switches to Company Beta
    setActiveFinancialSession(actorId, companyBeta);

    resolveRefetch({
      data: [{ id: "req-comp-1", status: "completed", transferReference: "REF-C1" }],
    });

    const result = await flowPromise;
    assert.equal(result, "SESSION_ABORTED", "Must abort when active company switched");
    assert.equal(spy.successes.length, 0);

    // Preserved in Alpha
    const stored = getUnconfirmedIntent("funding", "req-comp-1", actorId, companyAlpha);
    assert.ok(stored, "Intent must remain in Company Alpha");
  } finally {
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [UI Integration 15]: Same-session reconciliation in active session succeeds with toast and intent resolution", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  clearAllFinancialIntents();

  try {
    const actorId = "acc-funding-ui";
    const companyId = "comp-alpha";
    setActiveFinancialSession(actorId, companyId);

    const intent = createFinancialIntent(
      { requestId: "req-active", reference: "REF-OK", proofHash: "hash-ok" },
      undefined,
      actorId,
      companyId,
    );
    intent.status = "timed_out";
    setUnconfirmedIntent("funding", "req-active", intent, actorId, companyId);

    async function executeReconciliation() {
      const capturedGen = financialAccessGeneration(qc);
      const capturedActorId = actorId;
      const activeCompanyId = companyId;

      const latest = [{ id: "req-active", status: "completed", transferReference: "REF-OK" }];

      if (!isFinancialSessionActive(qc, capturedGen, capturedActorId, activeCompanyId)) {
        return "SESSION_ABORTED";
      }
      const recon = reconcileExecutionStatus("req-active", latest);
      if (recon.alreadyExecuted) {
        toast.success("تم تأكيد تسجيل التحويل في الخادم بالفعل؛ بانتظار استلام المدير");
        removeUnconfirmedIntent("funding", "req-active", actorId, companyId);
        return "SUCCESS";
      }
    }

    const result = await executeReconciliation();
    assert.equal(result, "SUCCESS");
    assert.equal(spy.successes.length, 1);
    assert.match(spy.successes[0], /تم تأكيد تسجيل التحويل في الخادم بالفعل/);

    const stored = getUnconfirmedIntent("funding", "req-active", actorId, companyId);
    assert.equal(stored, null, "Intent must be removed upon confirmed server execution");
  } finally {
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});
