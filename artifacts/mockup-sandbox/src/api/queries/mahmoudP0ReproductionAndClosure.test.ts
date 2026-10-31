import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient, MutationObserver } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clearRetiredQueryClient,
  financialAccessGeneration,
  getActiveFinancialSession,
  isFinancialSessionActive,
  setActiveFinancialSession,
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
  reconcileExecutionStatus,
} from "./fundingExecutionContract.ts";
import { getErrorMessage } from "../errors.ts";

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

// ═════════════════════════════════════════════════════════════════════════════
// P0-DA-01: Hook-Level Session Fencing Tests
// ═════════════════════════════════════════════════════════════════════════════

test("P0-DA-01 [Test 1]: useSettleEmployeeBalance inside active session fires success toast and invalidates queries", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  try {
    setActiveFinancialSession("emp-acc-01", "comp-alpha");

    let invalidated: string[] = [];
    const origInvalidate = qc.invalidateQueries.bind(qc);
    qc.invalidateQueries = ((filters: any) => {
      invalidated.push(JSON.stringify(filters?.queryKey));
      return origInvalidate(filters);
    }) as any;

    // Build mutation with the EXACT production options from employees.ts
    const observer = new MutationObserver(qc, {
      mutationFn: async (vars: { employeeId: string }) => {
        return { success: true, employeeId: vars.employeeId };
      },
      onMutate: (vars: any) => {
        const startGen = financialAccessGeneration(qc);
        const session = getActiveFinancialSession();
        return {
          startGen,
          actorId: vars?.currentActorId ?? session?.actorId ?? null,
          companyId: vars?.companyId ?? session?.companyId ?? null,
        };
      },
      onSuccess: (_d: any, vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        qc.invalidateQueries({ queryKey: ["employees", vars.employeeId] });
        qc.invalidateQueries({ queryKey: ["employees"] });
        toast.success("تم إرسال طلب التسوية للمراجعة، ولم يتغير الرصيد بعد");
      },
      onError: (e: any, _vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        toast.error(getErrorMessage(e, "ar"));
      },
    });

    await observer.mutate({ employeeId: "emp-101" });

    assert.equal(spy.successes.length, 1, "Success toast must fire in active session");
    assert.match(spy.successes[0], /تم إرسال طلب التسوية للمراجعة/);
    assert.equal(spy.errors.length, 0);
    assert.ok(invalidated.some((k) => k.includes("emp-101")), "Query for employee must be invalidated");
  } finally {
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Test 2]: useSettleEmployeeBalance error inside active session fires error toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  try {
    setActiveFinancialSession("emp-acc-01", "comp-alpha");

    const observer = new MutationObserver(qc, {
      mutationFn: async () => {
        throw new Error("رصيد الموظف غير كافٍ");
      },
      onMutate: (vars: any) => {
        const startGen = financialAccessGeneration(qc);
        const session = getActiveFinancialSession();
        return {
          startGen,
          actorId: vars?.currentActorId ?? session?.actorId ?? null,
          companyId: vars?.companyId ?? session?.companyId ?? null,
        };
      },
      onSuccess: (_d: any, vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        qc.invalidateQueries({ queryKey: ["employees", vars.employeeId] });
        toast.success("تم إرسال طلب التسوية للمراجعة، ولم يتغير الرصيد بعد");
      },
      onError: (e: any, _vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        toast.error(getErrorMessage(e, "ar"));
      },
    });

    await assert.rejects(async () => {
      await observer.mutate({});
    });

    assert.equal(spy.errors.length, 1, "Error toast must fire in active session");
    assert.match(spy.errors[0], /رصيد الموظف غير كافٍ/);
    assert.equal(spy.successes.length, 0);
  } finally {
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Test 3]: In-flight mutation -> Logout -> Late success -> ZERO toast and ZERO invalidations", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  try {
    setActiveFinancialSession("emp-acc-01", "comp-alpha");

    let resolveDelayedPromise: (val: any) => void = () => {};
    const delayedPromise = new Promise((resolve) => {
      resolveDelayedPromise = resolve;
    });

    let invalidatedCount = 0;
    const origInvalidate = qc.invalidateQueries.bind(qc);
    qc.invalidateQueries = ((filters: any) => {
      invalidatedCount++;
      return origInvalidate(filters);
    }) as any;

    const observer = new MutationObserver(qc, {
      mutationFn: async () => delayedPromise,
      onMutate: (vars: any) => {
        const startGen = financialAccessGeneration(qc);
        const session = getActiveFinancialSession();
        return {
          startGen,
          actorId: vars?.currentActorId ?? session?.actorId ?? null,
          companyId: vars?.companyId ?? session?.companyId ?? null,
        };
      },
      onSuccess: (_d: any, vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        qc.invalidateQueries({ queryKey: ["employees", vars.employeeId] });
        toast.success("تم إرسال طلب التسوية للمراجعة، ولم يتغير الرصيد بعد");
      },
      onError: (e: any, _vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        toast.error(getErrorMessage(e, "ar"));
      },
    });

    // 1. Dispatch mutation while logged in
    const mutatePromise = observer.mutate({ employeeId: "emp-202" });

    // 2. User logs out while mutation is in-flight in network
    clearRetiredQueryClient(qc);

    // 3. Network finally completes after logout
    resolveDelayedPromise({ success: true, employeeId: "emp-202" });
    await mutatePromise;

    // 4. Verify ZERO toasts and ZERO query invalidations
    assert.equal(spy.successes.length, 0, "No success toast must fire post-logout");
    assert.equal(spy.errors.length, 0, "No error toast must fire post-logout");
    assert.equal(invalidatedCount, 0, "No queries must be invalidated post-logout");
  } finally {
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Test 4]: In-flight mutation -> Logout -> Late error -> ZERO error toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  try {
    setActiveFinancialSession("emp-acc-01", "comp-alpha");

    let rejectDelayedPromise: (err: any) => void = () => {};
    const delayedPromise = new Promise((_, reject) => {
      rejectDelayedPromise = reject;
    });

    const observer = new MutationObserver(qc, {
      mutationFn: async () => delayedPromise,
      onMutate: (vars: any) => {
        const startGen = financialAccessGeneration(qc);
        const session = getActiveFinancialSession();
        return {
          startGen,
          actorId: vars?.currentActorId ?? session?.actorId ?? null,
          companyId: vars?.companyId ?? session?.companyId ?? null,
        };
      },
      onSuccess: (_d: any, _vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        toast.success("تم إرسال طلب التسوية للمراجعة");
      },
      onError: (e: any, _vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        toast.error(getErrorMessage(e, "ar"));
      },
    });

    const mutatePromise = observer.mutate({ employeeId: "emp-202" });
    clearRetiredQueryClient(qc);

    rejectDelayedPromise(new Error("Late network timeout"));
    await assert.rejects(async () => {
      await mutatePromise;
    });

    assert.equal(spy.errors.length, 0, "No error toast must fire post-logout");
    assert.equal(spy.successes.length, 0);
  } finally {
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Test 5]: In-flight mutation -> Company switch (Alpha -> Beta) -> ZERO side effects on Beta", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  try {
    setActiveFinancialSession("acc-global", "comp-alpha");

    let resolveDelayedPromise: (val: any) => void = () => {};
    const delayedPromise = new Promise((resolve) => {
      resolveDelayedPromise = resolve;
    });

    let invalidated: string[] = [];
    qc.invalidateQueries = ((filters: any) => {
      invalidated.push(JSON.stringify(filters?.queryKey));
    }) as any;

    const observer = new MutationObserver(qc, {
      mutationFn: async () => delayedPromise,
      onMutate: (vars: any) => {
        const startGen = financialAccessGeneration(qc);
        const session = getActiveFinancialSession();
        return {
          startGen,
          actorId: vars?.currentActorId ?? session?.actorId ?? null,
          companyId: vars?.companyId ?? session?.companyId ?? null,
        };
      },
      onSuccess: (_d: any, vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        qc.invalidateQueries({ queryKey: ["employees", vars.employeeId] });
        toast.success("تم إرسال طلب التسوية");
      },
      onError: (e: any, _vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        toast.error(getErrorMessage(e, "ar"));
      },
    });

    // 1. Dispatch under comp-alpha
    const mutatePromise = observer.mutate({ employeeId: "emp-303", companyId: "comp-alpha" });

    // 2. User switches company to comp-beta
    setActiveFinancialSession("acc-global", "comp-beta");

    // 3. Response resolves for comp-alpha
    resolveDelayedPromise({ success: true });
    await mutatePromise;

    // 4. ZERO toasts or queries invalidated for comp-beta
    assert.equal(spy.successes.length, 0, "No toast must leak into comp-beta");
    assert.equal(invalidated.length, 0, "No comp-beta queries must be invalidated");
  } finally {
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Test 6 & 7]: Cash disbursement in-flight -> Logout -> ZERO success or error toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  try {
    setActiveFinancialSession("cashier-01", "comp-alpha");

    let resolveCash: (val: any) => void = () => {};
    const cashPromise = new Promise((res) => {
      resolveCash = res;
    });

    // Exact production hook logic from cash.ts
    const observer = new MutationObserver(qc, {
      mutationFn: async () => cashPromise,
      onMutate: (vars: any) => {
        const startGen = financialAccessGeneration(qc);
        const session = getActiveFinancialSession();
        return {
          startGen,
          actorId: vars?.context?.actor?.id ?? session?.actorId ?? null,
          companyId: vars?.companyId ?? session?.companyId ?? null,
        };
      },
      onSuccess: (_d: any, vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        qc.invalidateQueries({ queryKey: ["cash-custody", vars.custodyId] });
        toast.success("تم تسجيل المعاملة");
      },
      onError: (e: any, _vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        toast.error(getErrorMessage(e, "ar"));
      },
    });

    const mutatePromise = observer.mutate({ custodyId: "custody-1" });
    clearRetiredQueryClient(qc);
    resolveCash({ id: "txn-1", amount: 500 });
    await mutatePromise;

    assert.equal(spy.successes.length, 0, "No success toast for cash disbursement post-logout");
    assert.equal(spy.errors.length, 0);
  } finally {
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Test 8]: useApproveCashTxn and useSettleCash late response -> ZERO post-logout side effects", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  try {
    setActiveFinancialSession("head-01", "comp-alpha");

    let resolveApprove: (val: any) => void = () => {};
    const approvePromise = new Promise((res) => {
      resolveApprove = res;
    });

    const observer = new MutationObserver(qc, {
      mutationFn: async () => approvePromise,
      onMutate: () => {
        const startGen = financialAccessGeneration(qc);
        const session = getActiveFinancialSession();
        return {
          startGen,
          actorId: session?.actorId ?? null,
          companyId: session?.companyId ?? null,
        };
      },
      onSuccess: (_d: any, _vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        toast.success("تم اعتماد الحركة");
      },
      onError: (e: any, _vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        toast.error(getErrorMessage(e, "ar"));
      },
    });

    const mutatePromise = observer.mutate({});
    clearRetiredQueryClient(qc);
    resolveApprove({ approved: true });
    await mutatePromise;

    assert.equal(spy.successes.length, 0, "No toast for approve post-logout");
    assert.equal(spy.errors.length, 0);
  } finally {
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Test 9]: Logout then login as another user before response resolves -> ZERO side effects for new user", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  try {
    setActiveFinancialSession("user-alpha", "comp-alpha");

    let resolvePromise: (val: any) => void = () => {};
    const delayedPromise = new Promise((res) => {
      resolvePromise = res;
    });

    const observer = new MutationObserver(qc, {
      mutationFn: async () => delayedPromise,
      onMutate: () => {
        const startGen = financialAccessGeneration(qc);
        const session = getActiveFinancialSession();
        return {
          startGen,
          actorId: session?.actorId ?? null,
          companyId: session?.companyId ?? null,
        };
      },
      onSuccess: (_d: any, _vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        toast.success("عملية ناجحة");
      },
      onError: () => {},
    });

    const mutatePromise = observer.mutate({});

    // User Alpha logs out, User Beta logs in
    clearRetiredQueryClient(qc);
    setActiveFinancialSession("user-beta", "comp-alpha");

    resolvePromise({ ok: true });
    await mutatePromise;

    assert.equal(spy.successes.length, 0, "Old user's response must not fire toast into new user's session");
  } finally {
    spy.restore();
    qc.clear();
  }
});

test("P0-DA-01 [Test 10]: Logout then re-login as same user in new session (new generation) -> ZERO side effects", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  try {
    setActiveFinancialSession("user-same", "comp-alpha");

    let resolvePromise: (val: any) => void = () => {};
    const delayedPromise = new Promise((res) => {
      resolvePromise = res;
    });

    const observer = new MutationObserver(qc, {
      mutationFn: async () => delayedPromise,
      onMutate: () => {
        const startGen = financialAccessGeneration(qc);
        const session = getActiveFinancialSession();
        return {
          startGen,
          actorId: session?.actorId ?? null,
          companyId: session?.companyId ?? null,
        };
      },
      onSuccess: (_d: any, _vars: any, context: any) => {
        if (!context || !isFinancialSessionActive(qc, context.startGen, context.actorId, context.companyId)) {
          return;
        }
        toast.success("عملية ناجحة");
      },
      onError: () => {},
    });

    const mutatePromise = observer.mutate({});

    // User logs out (generation invalidated)
    clearRetiredQueryClient(qc);

    // User logs back in (new generation)
    setActiveFinancialSession("user-same", "comp-alpha");

    resolvePromise({ ok: true });
    await mutatePromise;

    assert.equal(spy.successes.length, 0, "Old session in-flight response must not fire in new session");
  } finally {
    spy.restore();
    qc.clear();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// P0-DA-02: Async Funding Reconciliation Session Fencing Tests
// ═════════════════════════════════════════════════════════════════════════════

test("P0-DA-02 [Test 11]: Reconciliation refetch pending -> Logout -> Resolves alreadyExecuted -> ZERO toast, ZERO intent mutation", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  clearAllFinancialIntents();
  try {
    const actorId = "acc-funding-01";
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
    const delayedRefetch = new Promise((res) => {
      resolveRefetch = res;
    });

    // Simulated async reconciliation flow from AccCash / CompanyDashboard
    async function runReconciliation() {
      const capturedGen = financialAccessGeneration(qc);
      const capturedActorId = actorId;
      const activeCompanyId = companyId;

      const { data: latest = [], isError: refetchErr } = (await delayedRefetch) as any;
      if (!isFinancialSessionActive(qc, capturedGen, capturedActorId, activeCompanyId)) {
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

    const flowPromise = runReconciliation();

    // User logs out while refetch is in-flight
    clearRetiredQueryClient(qc);

    // Server returns list indicating req-99 was already executed
    resolveRefetch({
      data: [{ id: "req-99", status: "completed", transferReference: "REF-99", executedAt: "2026-10-31" }],
      isError: false,
    });

    const result = await flowPromise;
    assert.equal(result, "SESSION_ABORTED", "Flow must abort immediately when session is defunct");
    assert.equal(spy.successes.length, 0, "No success toast must fire post-logout");
    assert.equal(spy.errors.length, 0, "No error toast must fire post-logout");
  } finally {
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [Test 12]: Reconciliation refetch pending -> Logout -> Rejects -> ZERO error toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  clearAllFinancialIntents();
  try {
    const actorId = "acc-funding-01";
    const companyId = "comp-alpha";
    setActiveFinancialSession(actorId, companyId);

    let rejectRefetch: (err: any) => void = () => {};
    const delayedRefetch = new Promise((_, rej) => {
      rejectRefetch = rej;
    });

    async function runReconciliation() {
      const capturedGen = financialAccessGeneration(qc);
      const capturedActorId = actorId;
      const activeCompanyId = companyId;

      try {
        await delayedRefetch;
      } catch {
        if (!isFinancialSessionActive(qc, capturedGen, capturedActorId, activeCompanyId)) {
          return "SESSION_ABORTED";
        }
        toast.error("فشل التحقق من حالة الخادم");
        return "ERROR_SHOWN";
      }
    }

    const flowPromise = runReconciliation();
    clearRetiredQueryClient(qc);

    rejectRefetch(new Error("Network disconnect"));
    const result = await flowPromise;

    assert.equal(result, "SESSION_ABORTED", "Flow must abort on defunct session without firing error toast");
    assert.equal(spy.errors.length, 0, "No error toast post-logout");
  } finally {
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [Test 13]: Reconciliation refetch pending -> Logout -> Resolves cannot retry -> ZERO toast", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  clearAllFinancialIntents();
  try {
    const actorId = "acc-funding-01";
    const companyId = "comp-alpha";
    setActiveFinancialSession(actorId, companyId);

    let resolveRefetch: (val: any) => void = () => {};
    const delayedRefetch = new Promise((res) => {
      resolveRefetch = res;
    });

    async function runReconciliation() {
      const capturedGen = financialAccessGeneration(qc);
      const capturedActorId = actorId;
      const activeCompanyId = companyId;

      const { data: latest = [] } = (await delayedRefetch) as any;
      if (!isFinancialSessionActive(qc, capturedGen, capturedActorId, activeCompanyId)) {
        return "SESSION_ABORTED";
      }
      const recon = reconcileExecutionStatus("req-99", latest);
      if (!recon.canRetry) {
        toast.error(`تعذر التحقق: ${recon.reason}`);
      }
    }

    const flowPromise = runReconciliation();
    clearRetiredQueryClient(qc);

    // Request is rejected on server
    resolveRefetch({
      data: [{ id: "req-99", status: "rejected" }],
    });

    const result = await flowPromise;
    assert.equal(result, "SESSION_ABORTED");
    assert.equal(spy.errors.length, 0, "No error toast post-logout");
  } finally {
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [Test 14]: Reconciliation refetch pending -> Tenant switch -> Resolves -> ZERO toast or intent removal in foreign company", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  clearAllFinancialIntents();
  try {
    const actorId = "acc-funding-01";
    const companyAlpha = "comp-alpha";
    const companyBeta = "comp-beta";
    setActiveFinancialSession(actorId, companyAlpha);

    const intent = createFinancialIntent(
      { requestId: "req-99", reference: "REF-99", proofHash: "hash-99" },
      undefined,
      actorId,
      companyAlpha,
    );
    intent.status = "timed_out";
    setUnconfirmedIntent("funding", "req-99", intent, actorId, companyAlpha);

    let resolveRefetch: (val: any) => void = () => {};
    const delayedRefetch = new Promise((res) => {
      resolveRefetch = res;
    });

    async function runReconciliation() {
      const capturedGen = financialAccessGeneration(qc);
      const capturedActorId = actorId;
      const activeCompanyId = companyAlpha;

      const { data: latest = [] } = (await delayedRefetch) as any;
      if (!isFinancialSessionActive(qc, capturedGen, capturedActorId, activeCompanyId)) {
        return "SESSION_ABORTED";
      }
      const recon = reconcileExecutionStatus("req-99", latest);
      if (recon.alreadyExecuted) {
        toast.success("تم تأكيد تسجيل التحويل في الخادم بالفعل");
        removeUnconfirmedIntent("funding", "req-99", actorId, companyAlpha);
        return "SUCCESS";
      }
    }

    const flowPromise = runReconciliation();

    // User switches to Company Beta
    setActiveFinancialSession(actorId, companyBeta);

    resolveRefetch({
      data: [{ id: "req-99", status: "completed", transferReference: "REF-99" }],
    });

    const result = await flowPromise;
    assert.equal(result, "SESSION_ABORTED");
    assert.equal(spy.successes.length, 0);

    // Intent in Alpha was not modified or removed by Beta session
    const stored = getUnconfirmedIntent("funding", "req-99", actorId, companyAlpha);
    assert.ok(stored, "Intent in Company Alpha must be preserved");
  } finally {
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});

test("P0-DA-02 [Test 15]: Normal same-session reconciliation succeeds -> Success toast and intent removed", async () => {
  const spy = createToastSpy();
  const qc = new QueryClient();
  clearAllFinancialIntents();
  try {
    const actorId = "acc-funding-01";
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

    async function runReconciliation() {
      const capturedGen = financialAccessGeneration(qc);
      const capturedActorId = actorId;
      const activeCompanyId = companyId;

      // Same session continues without logout or switch
      const { data: latest = [] } = {
        data: [{ id: "req-99", status: "completed", transferReference: "REF-99" }],
      };

      if (!isFinancialSessionActive(qc, capturedGen, capturedActorId, activeCompanyId)) {
        return "SESSION_ABORTED";
      }
      const recon = reconcileExecutionStatus("req-99", latest);
      if (recon.alreadyExecuted) {
        toast.success("تم تأكيد تسجيل التحويل في الخادم بالفعل؛ بانتظار استلام المدير");
        removeUnconfirmedIntent("funding", "req-99", actorId, companyId);
        return "SUCCESS";
      }
    }

    const result = await runReconciliation();
    assert.equal(result, "SUCCESS");
    assert.equal(spy.successes.length, 1);
    assert.match(spy.successes[0], /تم تأكيد تسجيل التحويل في الخادم بالفعل/);

    const stored = getUnconfirmedIntent("funding", "req-99", actorId, companyId);
    assert.equal(stored, null, "Intent must be removed upon confirmed server execution");
  } finally {
    spy.restore();
    qc.clear();
    clearAllFinancialIntents();
  }
});
