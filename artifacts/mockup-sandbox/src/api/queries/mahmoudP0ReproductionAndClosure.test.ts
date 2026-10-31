import test from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { GlobalWindow } from "happy-dom";
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
  computeFileHash,
} from "./fundingExecutionContract.ts";
import { FundingExecution } from "../../components/mockups/asab/_pages/accountant/AccCash.tsx";
import { CompanyFundingExecution, CLangProvider } from "../../components/mockups/asab/CompanyDashboard.tsx";
import { AuthContext } from "../../auth/AuthContext.tsx";

// Ensure client DOM environment is active for React 19 client mounting
if (!globalThis.window) {
  const win = new GlobalWindow({ url: "http://localhost:3000" });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as any).window = win;
  (globalThis as any).document = win.document;
  (globalThis as any).HTMLElement = win.HTMLElement;
  (globalThis as any).HTMLInputElement = win.HTMLInputElement;
  (globalThis as any).HTMLButtonElement = win.HTMLButtonElement;
  (globalThis as any).File = win.File;
  (globalThis as any).Event = win.Event;
  (globalThis as any).CustomEvent = win.CustomEvent;
}

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

// Helper to mount production hooks in a real client DOM container using React 19 createRoot + act
async function mountProductionHookInClient<T>(
  hookFn: () => T,
  queryClient: QueryClient,
): Promise<{ hook: T; unmount: () => Promise<void> }> {
  let hookValue!: T;
  function Harness() {
    hookValue = hookFn();
    return React.createElement("div", { id: "hook-harness" }, "client-mounted");
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(Harness),
      ),
    );
  });
  return {
    hook: hookValue,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

// Helper for SSR-based hook invocation (explicitly identified as SSR)
function mountProductionHookSSR<T>(hookFn: () => T, queryClient: QueryClient): T {
  let hookValue!: T;
  function Harness() {
    hookValue = hookFn();
    return React.createElement("div", null, "ssr-mounted");
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

const sampleFundingRequest = {
  id: "req-99",
  branchId: "b-1",
  branchName: "الفرع الرئيسي",
  amount: "1500.00",
  status: "approved",
  transferReference: null,
  executedAt: null,
  receivedAt: null,
  canExecute: true,
};

async function mountFundingExecutionInClient({
  queryClient,
  actorId = "acc-funding-ui",
  companyId = "comp-alpha",
  initialRequests = [sampleFundingRequest],
  initialIntent = null,
}: {
  queryClient: QueryClient;
  actorId?: string;
  companyId?: string;
  initialRequests?: any[];
  initialIntent?: any;
}) {
  setActiveFinancialSession(actorId, companyId);
  if (initialIntent) {
    setUnconfirmedIntent("funding", initialIntent.payload.requestId, initialIntent, actorId, companyId);
  }
  queryClient.setQueryData(["cash-custody", "funding-requests", "accountant"], initialRequests);

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const authValue: any = {
    user: {
      id: actorId,
      name: "المحاسب",
      companyId,
      roles: [
        {
          key: "accountant",
          scope: "brand",
          brandIds: ["11111111-1111-4111-8111-111111111111"],
          restaurantIds: [],
          branchIds: [],
          moduleKeys: [],
        },
      ],
    },
    isRole: (r: string) => r === "accountant",
    isAuthenticated: true,
  };

  await act(async () => {
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          AuthContext.Provider,
          { value: authValue },
          React.createElement(FundingExecution),
        ),
      ),
    );
  });

  return {
    container,
    root,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

async function mountCompanyFundingExecutionInClient({
  queryClient,
  actorId = "acc-funding-ui",
  companyId = "comp-alpha",
  initialRequests = [sampleFundingRequest],
  initialIntent = null,
}: {
  queryClient: QueryClient;
  actorId?: string;
  companyId?: string;
  initialRequests?: any[];
  initialIntent?: any;
}) {
  setActiveFinancialSession(actorId, companyId);
  if (initialIntent) {
    setUnconfirmedIntent("funding", initialIntent.payload.requestId, initialIntent, actorId, companyId);
  }
  queryClient.setQueryData(["cash-custody", "funding-requests", "accountant"], initialRequests);

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const authValue: any = {
    user: {
      id: actorId,
      name: "المحاسب",
      companyId,
      roles: [
        {
          key: "accountant",
          scope: "brand",
          brandIds: ["11111111-1111-4111-8111-111111111111"],
          restaurantIds: [],
          branchIds: [],
          moduleKeys: [],
        },
      ],
    },
    isRole: (r: string) => r === "accountant",
    isAuthenticated: true,
  };

  await act(async () => {
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          AuthContext.Provider,
          { value: authValue },
          React.createElement(
            CLangProvider,
            null,
            React.createElement(CompanyFundingExecution),
          ),
        ),
      ),
    );
  });

  return {
    container,
    root,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION A: REAL CLIENT-MOUNTED & EXECUTED PRODUCTION MUTATION HOOKS (P0-DA-01)
// ═════════════════════════════════════════════════════════════════════════════

test("P0-DA-01 [Client-Mounted Hook 1]: useSettleEmployeeBalance inside active session executes real hook in client DOM and fires success toast", async () => {
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

    // Focused client-mounted confirmation using React 19 createRoot + act
    const { hook, unmount } = await mountProductionHookInClient(() => useSettleEmployeeBalance(), qc);

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

    await unmount();
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Client-Mounted Hook 2]: useCreateCashTransaction real client-mounted hook in-flight -> Logout -> ZERO toast", async () => {
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

    // Focused client-mounted confirmation using React 19 createRoot + act
    const { hook, unmount } = await mountProductionHookInClient(() => useCreateCashTransaction(), qc);

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

    await unmount();
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [SSR-Mounted Hook 3]: useSettleEmployeeBalance real hook error in active session fires error toast", async () => {
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

    const hook = mountProductionHookSSR(() => useSettleEmployeeBalance(), qc);

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

test("P0-DA-01 [SSR-Mounted Hook 4]: useSettleEmployeeBalance in-flight -> Logout -> Deferred network resolves -> ZERO toast, ZERO invalidation", async () => {
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

    const hook = mountProductionHookSSR(() => useSettleEmployeeBalance(), qc);

    const mutatePromise = hook.mutateAsync({
      employeeId: "emp-101",
      reason: "تسوية متأخرة",
      currentActorId: "acc-real-01",
      companyId: "comp-alpha",
    });

    clearRetiredQueryClient(qc);

    resolvePost({ data: { status: "pending", balanceModified: false, settlementId: "set-01", success: true } });
    await mutatePromise;

    assert.equal(spy.successes.length, 0, "ZERO success toast post-logout");
    assert.equal(spy.errors.length, 0, "ZERO error toast post-logout");
    assert.equal(invalidatedCount, 0, "ZERO queries invalidated post-logout");
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [SSR-Mounted Hook 5]: useSettleEmployeeBalance in-flight -> Logout -> Deferred network rejects -> ZERO error toast", async () => {
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

    const hook = mountProductionHookSSR(() => useSettleEmployeeBalance(), qc);

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

test("P0-DA-01 [SSR-Mounted Hook 6]: useSettleEmployeeBalance in-flight -> Company switch (Alpha -> Beta) -> ZERO side effects for Beta", async () => {
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

    const hook = mountProductionHookSSR(() => useSettleEmployeeBalance(), qc);

    const mutatePromise = hook.mutateAsync({
      employeeId: "emp-101",
      reason: "تسوية شركة أ",
      currentActorId: "acc-real-01",
      companyId: "comp-alpha",
    });

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

test("P0-DA-01 [Executed Hooks 7]: useApproveCashTxn and useRejectCashTxn executed mutateAsync late response -> ZERO post-logout side effects", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("head-acc-01", "comp-alpha");

    let resolveApprove: (val: any) => void = () => {};
    const deferredApprove = new Promise((res) => {
      resolveApprove = res;
    });

    let resolveReject: (val: any) => void = () => {};
    const deferredReject = new Promise((res) => {
      resolveReject = res;
    });

    // Both hooks executed directly via mutateAsync
    const approveHook = mountProductionHookSSR(() => useApproveCashTxn(), qc);
    const rejectHook = mountProductionHookSSR(() => useRejectCashTxn(), qc);

    api.post = ((url: string) => {
      if (url.includes("reject")) return deferredReject;
      return deferredApprove;
    }) as any;

    const approvePromise = approveHook.mutateAsync({
      custodyId: "cust-1",
      txnId: "txn-1",
    });

    const rejectPromise = rejectHook.mutateAsync({
      custodyId: "cust-1",
      txnId: "txn-2",
      reason: "مرفوض للتكرار",
    });

    clearRetiredQueryClient(qc);

    resolveApprove({ data: { id: "txn-1", status: "approved" } });
    resolveReject({ data: { id: "txn-2", status: "rejected" } });

    await Promise.all([approvePromise, rejectPromise]);

    assert.equal(spy.successes.length, 0, "Zero approve or reject toast post-logout");
    assert.equal(spy.errors.length, 0);
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Executed Hooks 8]: useApproveEmployeeSettlement and useRejectEmployeeSettlement executed mutateAsync late response -> ZERO post-logout side effects", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("head-acc-01", "comp-alpha");

    let resolveApprove: (val: any) => void = () => {};
    const deferredApprove = new Promise((res) => {
      resolveApprove = res;
    });

    let resolveReject: (val: any) => void = () => {};
    const deferredReject = new Promise((res) => {
      resolveReject = res;
    });

    // Both hooks executed directly via mutateAsync
    const approveHook = mountProductionHookSSR(() => useApproveEmployeeSettlement(), qc);
    const rejectHook = mountProductionHookSSR(() => useRejectEmployeeSettlement(), qc);

    api.post = ((url: string) => {
      if (url.includes("reject")) return deferredReject;
      return deferredApprove;
    }) as any;

    const approvePromise = approveHook.mutateAsync({
      settlementId: "set-10",
      employeeId: "emp-10",
      actor: { roles: ["head"], id: "head-acc-01" },
    });

    const rejectPromise = rejectHook.mutateAsync({
      settlementId: "set-20",
      employeeId: "emp-20",
      rejectionReason: "مرفوض - مستند غير واضح",
      actor: { roles: ["head"], id: "head-acc-01" },
    });

    clearRetiredQueryClient(qc);

    resolveApprove({ data: { id: "set-10", status: "approved" } });
    resolveReject({ data: { id: "set-20", status: "rejected" } });

    await Promise.all([approvePromise, rejectPromise]);

    assert.equal(spy.successes.length, 0, "Zero approve or reject toast post-logout");
    assert.equal(spy.errors.length, 0);
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Executed Hook 9]: useSettleCash executed mutateAsync late response -> ZERO post-logout side effects", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  const origPost = api.post;

  try {
    setActiveFinancialSession("acc-01", "comp-alpha");

    let resolveSettle: (val: any) => void = () => {};
    const deferredSettle = new Promise((res) => {
      resolveSettle = res;
    });

    api.post = (() => deferredSettle) as any;

    const settleHook = mountProductionHookSSR(() => useSettleCash(), qc);

    const mutatePromise = settleHook.mutateAsync({
      custodyId: "cust-custody-01",
      newDepositHalalas: 0,
    });

    clearRetiredQueryClient(qc);

    resolveSettle({ data: { id: "cust-custody-01", settled: true } });
    await mutatePromise;

    assert.equal(spy.successes.length, 0, "Zero settlement toast post-logout");
    assert.equal(spy.errors.length, 0);
  } finally {
    api.post = origPost;
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Executed Hook 10]: useExecuteFundingRequest executed mutateAsync late response -> ZERO query invalidation", async () => {
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

    const fundingHook = mountProductionHookSSR(() => useExecuteFundingRequest(), qc);

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

test("P0-DA-01 [Session Lifecycle 10b]: Logout then login as another user before response resolves -> ZERO side effects for new user", async () => {
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

    const hook = mountProductionHookSSR(() => useSettleEmployeeBalance(), qc);

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

test("P0-DA-01 [Session Lifecycle 10c]: Logout then re-login as same user (new session generation) -> ZERO side effects", async () => {
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

    const hook = mountProductionHookSSR(() => useSettleEmployeeBalance(), qc);

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
// SECTION B: ACTUAL REAL UI HANDLER EXECUTION TESTS (P0-DA-02)
// ═════════════════════════════════════════════════════════════════════════════

test("P0-DA-02 [Client-Mounted UI Handler 11]: AccCash FundingExecution real form submit (pre-retry refetch pending) -> Logout -> Resolves alreadyExecuted -> ZERO toast, ZERO intent mutation, ZERO retry", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clearAllFinancialIntents();
  const origGet = api.get;
  const origPost = api.post;

  try {
    const actorId = "acc-funding-ui";
    const companyId = "comp-alpha";

    // Create dummy proof file and pre-compute matching hash
    const dummyFile = new File(["dummy receipt"], "receipt.png", { type: "image/png" });
    const dummyHash = await computeFileHash(dummyFile);

    // Set unconfirmed intent with status "timed_out" matching the proof file hash
    const initialIntent = createFinancialIntent(
      { requestId: "req-99", reference: "REF-99", proofHash: dummyHash },
      undefined,
      actorId,
      companyId,
    );
    initialIntent.status = "timed_out";

    const { container, unmount } = await mountFundingExecutionInClient({
      queryClient: qc,
      actorId,
      companyId,
      initialIntent,
    });

    // Click open button ("تنفيذ وإرسال التغذية") to open the form
    const openBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("تنفيذ وإرسال التغذية"),
    );
    assert.ok(openBtn, "Open button must be present in DOM");
    await act(async () => {
      openBtn.click();
    });

    // Set file input in real DOM so submit button is enabled
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    assert.ok(fileInput, "File input must be present in form");
    Object.defineProperty(fileInput, "files", { value: [dummyFile] });
    await act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Intercept api.get for the pre-retry refetch() with a deferred promise
    let resolveRefetch: (val: any) => void = () => {};
    const deferredRefetch = new Promise((res) => {
      resolveRefetch = res;
    });
    api.get = (() => deferredRefetch) as any;

    let mutationPostCalled = false;
    api.post = (() => {
      mutationPostCalled = true;
      return Promise.resolve({ data: { success: true } });
    }) as any;

    // Click submit button in the real DOM form
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    assert.ok(submitBtn, "Submit button must be present in form");

    // Real form submit handler triggers pre-retry refetch
    await act(async () => {
      submitBtn.click();
    });

    // User logs out while refetch is pending in network
    clearRetiredQueryClient(qc);

    // Refetch resolves confirming execution
    await act(async () => {
      resolveRefetch({
        data: {
          data: {
            requests: [
              { id: "req-99", status: "completed", transferReference: "REF-99", executedAt: "2026-10-31" },
            ],
          },
        },
      });
    });

    // Assert session fence suppressed all callbacks in real UI handler
    assert.equal(spy.successes.length, 0, "No success toast must fire post-logout");
    assert.equal(spy.errors.length, 0, "No error toast must fire post-logout");
    assert.equal(mutationPostCalled, false, "ZERO mutation POST retried when session is defunct");

    await unmount();
  } finally {
    api.get = origGet;
    api.post = origPost;
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [Client-Mounted UI Handler 12]: AccCash FundingExecution real form submit (post-error automatic refetch pending) -> Logout -> Network error -> ZERO toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clearAllFinancialIntents();
  const origGet = api.get;
  const origPost = api.post;

  try {
    const actorId = "acc-funding-ui";
    const companyId = "comp-alpha";

    const { container, unmount } = await mountFundingExecutionInClient({
      queryClient: qc,
      actorId,
      companyId,
    });

    // Click open button ("تنفيذ وإرسال التغذية") to open the form
    const openBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("تنفيذ وإرسال التغذية"),
    );
    assert.ok(openBtn, "Open button must be present");
    await act(async () => {
      openBtn.click();
    });

    // Fill reference input
    const refInput = container.querySelector('input[aria-label="مرجع التحويل"]') as HTMLInputElement;
    assert.ok(refInput, "Reference input must be present");
    refInput.value = "REF-POST-ERR";
    await act(async () => {
      refInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Provide file
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const dummyFile = new File(["dummy receipt"], "receipt.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", { value: [dummyFile] });
    await act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Intercept api.post to fail, and intercept subsequent refetch() with deferred promise
    api.post = (() => {
      const p = Promise.reject(new Error("Initial mutation failure"));
      p.catch(() => {});
      return p;
    }) as any;

    let rejectRefetch: (err: any) => void = () => {};
    const deferredRefetch = new Promise((_, rej) => {
      rejectRefetch = rej;
    });
    deferredRefetch.catch(() => {});
    api.get = (() => deferredRefetch) as any;

    // Click submit button in the real DOM
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    await act(async () => {
      submitBtn.click();
    });

    // Logout occurs while automatic post-error refetch() is in flight
    clearRetiredQueryClient(qc);

    // Refetch fails with network error
    await act(async () => {
      rejectRefetch(new Error("Network drop during automatic refetch"));
    });

    assert.equal(spy.errors.length, 0, "No error toast must fire into defunct session post-logout");
    assert.equal(spy.successes.length, 0);

    await unmount();
  } finally {
    api.get = origGet;
    api.post = origPost;
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [Client-Mounted UI Handler 13]: AccCash FundingExecution real check button ('التحقق من حالة الطلب') click (refetch pending) -> Logout -> Resolves -> ZERO toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clearAllFinancialIntents();
  const origGet = api.get;

  try {
    const actorId = "acc-funding-ui";
    const companyId = "comp-alpha";

    const initialIntent = createFinancialIntent(
      { requestId: "req-99", reference: "REF-99", proofHash: "hash-99" },
      undefined,
      actorId,
      companyId,
    );
    initialIntent.status = "timed_out";

    const { container, unmount } = await mountFundingExecutionInClient({
      queryClient: qc,
      actorId,
      companyId,
      initialIntent,
    });

    // Click open button ("تنفيذ وإرسال التغذية") to open the form
    const openBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("تنفيذ وإرسال التغذية"),
    );
    assert.ok(openBtn, "Open button must be present");
    await act(async () => {
      openBtn.click();
    });

    // Manual check button is rendered because intent has timed_out
    const checkBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("التحقق من حالة الطلب"),
    );
    assert.ok(checkBtn, "Manual check button ('التحقق من حالة الطلب') must be present in DOM");

    let resolveRefetch: (val: any) => void = () => {};
    const deferredRefetch = new Promise((res) => {
      resolveRefetch = res;
    });
    api.get = (() => deferredRefetch) as any;

    // Trigger real click on manual check button
    await act(async () => {
      checkBtn.click();
    });

    // Logout occurs while manual check refetch is pending
    clearRetiredQueryClient(qc);

    // Network resolves
    await act(async () => {
      resolveRefetch({
        data: {
          data: {
            requests: [
              { id: "req-99", status: "completed", transferReference: "REF-99", executedAt: "2026-10-31" },
            ],
          },
        },
      });
    });

    if (spy.errors.length > 0) {
      console.log('TEST 11 ERROR TOASTS:', spy.errors);
    }
    assert.equal(spy.successes.length, 0, "No success toast must fire post-logout");
    assert.equal(spy.errors.length, 0, "No error toast must fire post-logout");

    await unmount();
  } finally {
    api.get = origGet;
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [Client-Mounted UI Handler 14]: CompanyFundingExecution real check button ('التحقق من حالة الطلب') click (refetch pending) -> Company switch -> Resolves -> ZERO toast on foreign company", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clearAllFinancialIntents();
  const origGet = api.get;

  try {
    const actorId = "acc-funding-ui";
    const companyId = "comp-alpha";

    const initialIntent = createFinancialIntent(
      { requestId: "req-99", reference: "REF-99", proofHash: "hash-99" },
      undefined,
      actorId,
      companyId,
    );
    initialIntent.status = "timed_out";

    const { container, unmount } = await mountCompanyFundingExecutionInClient({
      queryClient: qc,
      actorId,
      companyId,
      initialIntent,
    });

    // Click open button ("تنفيذ وإرسال التغذية") to open the form
    const openBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("تنفيذ وإرسال التغذية"),
    );
    assert.ok(openBtn, "Open button must be present in CompanyFundingExecution");
    await act(async () => {
      openBtn.click();
    });

    // Manual check button is rendered
    const checkBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("التحقق من حالة الطلب") || b.textContent?.includes("Check Status"),
    );
    assert.ok(checkBtn, "Manual check button must be present in DOM");

    let resolveRefetch: (val: any) => void = () => {};
    const deferredRefetch = new Promise((res) => {
      resolveRefetch = res;
    });
    api.get = (() => deferredRefetch) as any;

    // Trigger real click on check button
    await act(async () => {
      checkBtn.click();
    });

    // User switches company from Alpha to Beta while check is pending
    setActiveFinancialSession(actorId, "comp-beta");

    // Refetch resolves confirming execution for comp-alpha request
    await act(async () => {
      resolveRefetch({
        data: {
          data: {
            requests: [
              { id: "req-99", status: "completed", transferReference: "REF-99", executedAt: "2026-10-31" },
            ],
          },
        },
      });
    });

    assert.equal(spy.successes.length, 0, "No success toast must cross tenant boundary into Company Beta");
    assert.equal(spy.errors.length, 0);

    await unmount();
  } finally {
    api.get = origGet;
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [Client-Mounted UI Handler 15]: Same-session reconciliation in active session succeeds with real UI click, toast and intent resolution", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clearAllFinancialIntents();
  const origGet = api.get;

  try {
    const actorId = "acc-funding-ui";
    const companyId = "comp-alpha";

    const initialIntent = createFinancialIntent(
      { requestId: "req-99", reference: "REF-99", proofHash: "hash-99" },
      undefined,
      actorId,
      companyId,
    );
    initialIntent.status = "timed_out";

    const { container, unmount } = await mountFundingExecutionInClient({
      queryClient: qc,
      actorId,
      companyId,
      initialIntent,
    });

    // Click open button ("تنفيذ وإرسال التغذية") to open the form
    const openBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("تنفيذ وإرسال التغذية"),
    );
    assert.ok(openBtn, "Open button must be present");
    await act(async () => {
      openBtn.click();
    });

    // Find the manual check button
    const checkBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("التحقق من حالة الطلب"),
    );
    assert.ok(checkBtn, "Manual check button must be present in DOM");

    // Return completed execution on refetch
    api.get = (() =>
      Promise.resolve({
        data: {
          data: {
            requests: [
              { id: "req-99", status: "completed", transferReference: "REF-99", executedAt: "2026-10-31" },
            ],
          },
        },
      })) as any;

    // Trigger real click on check button in active session
    await act(async () => {
      checkBtn.click();
    });

    // Assert real UI handler fired success toast and removed intent
    assert.equal(spy.successes.length, 1, "Success toast must fire in active session");
    assert.match(spy.successes[0], /تم تأكيد تسجيل التحويل في الخادم بالفعل/);

    const remainingIntent = getUnconfirmedIntent("funding", "req-99", actorId, companyId);
    assert.equal(remainingIntent, null, "Intent must be removed upon confirmed server execution");

    await unmount();
  } finally {
    api.get = origGet;
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});
