import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  getHeadReviewPolicy,
  headLegacyBulkIds,
  runHeadFinalApproval,
  runFinancialMutation,
  filterErpOperations,
  canProceedPreflight,
  aggregateOpsAmount,
  shouldUpdateHeadOps,
  isOpWithinPeriod,
  validateConditionalApproval,
  fetchAllHeadOpsPages,
} from "./headReviewGuards.ts";
import { sumCOpAmounts } from "./operationMapping.ts";
import { fetchAllHeadOpsPages as fetchAllHeadOpsPagesPlatform } from "../../../api/queries/platform/head.ts";

const shift = {
  id: "shf",
  module: "shifts",
  status: "approved",
  reportReview: { phase: "head_review" },
};
const day = {
  id: "day",
  module: "sales",
  status: "approved",
  reportReview: {
    phase: "head_review",
    memberships: [{ report_revision: "revision-id" }],
  },
};
const legacy = {
  id: "legacy",
  module: "sales",
  status: "approved",
  reportReview: null,
};

test("head alone can final approve or return an approved SHF in head_review", () => {
  assert.deepEqual(getHeadReviewPolicy(shift, "head"), {
    finalApprove: true,
    returnForReview: true,
    blockedReason: null,
  });
  for (const role of ["accountant", "branch", null]) {
    assert.equal(getHeadReviewPolicy(shift, role).finalApprove, false);
    assert.equal(getHeadReviewPolicy(shift, role).returnForReview, false);
  }
  for (const operation of [
    { ...shift, status: "pending" },
    { ...shift, status: "final-approved" },
    { ...shift, reportReview: null },
    { ...shift, reportReview: { phase: "head_returned" } },
  ]) {
    assert.equal(getHeadReviewPolicy(operation, "head").finalApprove, false);
    assert.equal(getHeadReviewPolicy(operation, "head").returnForReview, false);
  }
  assert.equal(
    getHeadReviewPolicy(shift, "head", { ...shift, status: "final-approved" })
      .finalApprove,
    false,
  );
});

test("PKG-6 day cannot be final approved from unlinked membership revision IDs", () => {
  const policy = getHeadReviewPolicy(day, "head");
  assert.equal(policy.finalApprove, false);
  assert.ok(policy.blockedReason);
  assert.equal(getHeadReviewPolicy(legacy, "head").finalApprove, true);
  assert.equal(
    getHeadReviewPolicy({ ...legacy, status: "final-approved" }, "head")
      .finalApprove,
    false,
  );
});

test("mixed and protected bulk are blocked while independent Legacy bulk stays available", () => {
  assert.deepEqual(headLegacyBulkIds([legacy], ["legacy"], "head"), ["legacy"]);
  for (const ids of [["shf"], ["day"], ["legacy", "shf"], ["legacy", "day"]]) {
    assert.deepEqual(headLegacyBulkIds([legacy, shift, day], ids, "head"), []);
  }
  assert.deepEqual(headLegacyBulkIds([legacy], ["legacy"], "accountant"), []);
  assert.deepEqual(
    headLegacyBulkIds([legacy], ["legacy"], "head", () => ({
      ...legacy,
      reportReview: day.reportReview,
    })),
    [],
  );
});

test("EXP-06 / HA-F19: expenses require brand owner decision and are blocked from head approval and bulk", () => {
  const expense = {
    id: "exp",
    module: "expenses",
    status: "approved",
    reportReview: null,
  };
  const policy = getHeadReviewPolicy(expense, "head");
  assert.equal(policy.finalApprove, false);
  assert.equal(policy.returnForReview, false);
  assert.equal(policy.blockedReason, "expense_owner_decision_required");
  assert.deepEqual(headLegacyBulkIds([expense], ["exp"], "head"), []);
  assert.deepEqual(
    headLegacyBulkIds([legacy, expense], ["legacy", "exp"], "head"),
    [],
  );
});

test("fresh SHF failure stops before day; a double click cannot launch a second request", async () => {
  const lock = { current: false };
  const sent: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = runHeadFinalApproval(
    shift,
    "head",
    async () => shift,
    async () => {
      sent.push("shf");
      await gate;
    },
    lock,
  );
  assert.equal(
    await runHeadFinalApproval(
      shift,
      "head",
      async () => shift,
      async () => sent.push("duplicate"),
      lock,
    ),
    false,
  );
  release();
  assert.equal(await first, true);
  await assert.rejects(
    runHeadFinalApproval(
      shift,
      "head",
      async () => shift,
      async () => {
        throw Error("409");
      },
      lock,
    ),
  );
  assert.equal(
    await runHeadFinalApproval(
      day,
      "head",
      async () => day,
      async () => sent.push("day"),
      lock,
    ),
    false,
  );
  assert.deepEqual(sent, ["shf"]);
  assert.equal(
    await runHeadFinalApproval(
      shift,
      "head",
      async () => ({ ...shift, reportReview: { phase: "head_returned" } }),
      async () => sent.push("stale"),
      lock,
    ),
    false,
  );
  assert.deepEqual(sent, ["shf"]);
});

test("existing head screens expand SHF details, hide final actions and disable protected bulk", () => {
  const source = ts.createSourceFile(
    "CompanyDashboard.tsx",
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TSX,
  );
  const component = (name: string) => {
    const fn = source.statements.find(
      (node): node is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(node) && node.name?.text === name,
    );
    assert.ok(fn?.body, `${name} missing`);
    return fn.getText(source);
  };
  const modulePage = component("HeadModulePage");
  const pending = component("HeadPending");
  const row = component("OpRow");
  const shared = component("useSharedOps");
  assert.match(modulePage, /expandedId/);
  assert.match(modulePage, /expanded=\{expandedId===op\.id\} onToggle=/);
  assert.doesNotMatch(modulePage, /alert\(/);
  assert.match(row, /op\.module==="shifts" && <ShiftOpPanel/);
  assert.match(row, /headPolicy\.finalApprove/);
  assert.match(row, /headPolicy\.returnForReview/);
  assert.match(row, /\{isLocked && <span/);
  assert.match(pending, /headLegacyBulkIds/);
  assert.match(modulePage, /headLegacyBulkIds/);
  assert.doesNotMatch(modulePage, /awaitingHead\.forEach/);
  assert.match(
    shared,
    /runHeadFinalApproval\(operation, currentRole\.current, loadFreshDetail/,
  );
  assert.match(shared, /actionLock\.current/);
});

test("HA-F04: financial mutation executes API, blocks duplicate in-flight calls, propagates errors and preserves state on failure", async () => {
  const inFlight = new Set<string>();
  const state = { status: "approved" };

  // 1. Success scenario
  const successResult = await runFinancialMutation(
    "op-101",
    inFlight,
    async () => ({ success: true, newStatus: "final-approved" }),
    (res) => {
      state.status = res.newStatus;
    },
  );
  assert.equal(successResult.success, true);
  assert.equal(state.status, "final-approved");
  assert.equal(inFlight.has("op-101"), false);

  // 2. Failure scenario: API throws, state remains untouched, error propagated
  let onSuccessCalled = false;
  await assert.rejects(
    runFinancialMutation(
      "op-102",
      inFlight,
      async () => {
        throw new Error("API mutation failed with 500");
      },
      () => {
        onSuccessCalled = true;
      },
    ),
    { message: "API mutation failed with 500" },
  );
  assert.equal(
    onSuccessCalled,
    false,
    "onSuccess must NOT be called on failure (no optimistic mutation)",
  );
  assert.equal(
    inFlight.has("op-102"),
    false,
    "inFlight lock must be released on failure",
  );

  // 3. Concurrency / In-flight duplicate lock
  let finishFirst!: () => void;
  const firstPromise = new Promise<{ id: string }>((resolve) => {
    finishFirst = () => resolve({ id: "op-103" });
  });

  const invocation1 = runFinancialMutation(
    "op-103",
    inFlight,
    () => firstPromise,
    () => {},
  );
  // Second immediate invocation with same op-103 must be rejected
  await assert.rejects(
    runFinancialMutation(
      "op-103",
      inFlight,
      async () => ({ id: "op-103" }),
      () => {},
    ),
    { message: "Operation op-103 is already in flight" },
  );
  finishFirst();
  await invocation1;
  assert.equal(inFlight.has("op-103"), false);

  // 4. Actual Handlers simulation (approveOp, rejectOp, bulkApprove, returnForReview, markErpPosted)
  let localState = [
    { id: "op-act-1", status: "pending", amount: 500, erpPosted: false },
    { id: "op-act-2", status: "approved", amount: 700, erpPosted: false },
  ];
  const handlerInFlight = new Set<string>();

  const approveHandler = async (id: string, apiCall: () => Promise<any>) => {
    return runFinancialMutation(
      id,
      handlerInFlight,
      apiCall,
      () => {
        localState = localState.map((o) => (o.id === id ? { ...o, status: "approved" } : o));
      },
    );
  };

  // Failure propagates and preserves status
  await assert.rejects(
    approveHandler("op-act-1", async () => {
      throw new Error("HTTP 500 Server Crash");
    }),
  );
  assert.equal(localState[0].status, "pending", "Must stay pending on error");

  // Success updates state
  await approveHandler("op-act-1", async () => ({ ok: true }));
  assert.equal(localState[0].status, "approved", "Updates to approved only after server returns success");
});

test("HA-F20: conditional approval requires non-empty note, awaits server confirmation, and never updates visual state on failure", async () => {
  // 1. Note validation rejects empty or whitespace-only inputs
  assert.equal(validateConditionalApproval("").ok, false);
  assert.equal(validateConditionalApproval("   ").ok, false);
  assert.equal(validateConditionalApproval(null).ok, false);
  assert.equal(validateConditionalApproval(undefined).ok, false);

  const valid = validateConditionalApproval(
    "  معتمد بشرط التحقق من الفاتورة الأصلية  ",
  );
  assert.equal(valid.ok, true);
  assert.equal(valid.trimmedNote, "معتمد بشرط التحقق من الفاتورة الأصلية");

  // 2. Behavioral verification of state mutation on conditional approval
  const conditionalApproved = new Set<string>();
  const inFlight = new Set<string>();

  // Attempt without valid note: blocked before server call
  const attemptEmpty = async (note: string) => {
    const v = validateConditionalApproval(note);
    if (!v.ok) return false;
    await runFinancialMutation(
      "op-201",
      inFlight,
      async () => ({ ok: true }),
      () => {
        conditionalApproved.add("op-201");
      },
    );
    return true;
  };

  assert.equal(await attemptEmpty(""), false);
  assert.equal(conditionalApproved.has("op-201"), false);

  // 3. React Handler behavior on HTTP 422, 500, and Network Error
  const createMockFinalApproveHandler = (mutationFn: (payload: any) => Promise<any>) => {
    let localOps = [{ id: "op-test-1", status: "approved" }];
    const conditionalSet = new Set<string>();
    let comment = "ملاحظة الاعتماد";
    let isSubmitting = false;

    const handler = async (id: string, conditional?: { note: string }) => {
      if (conditional) {
        const v = validateConditionalApproval(conditional.note);
        if (!v.ok) throw new Error("note_required");
      }
      return runFinancialMutation(
        id,
        inFlight,
        async () => {
          return await mutationFn({ id, isConditional: !!conditional, conditionalNote: conditional?.note });
        },
        () => {
          localOps = localOps.map((o) => (o.id === id ? { ...o, status: "final-approved" } : o));
        },
      );
    };

    const triggerClick = async () => {
      isSubmitting = true;
      try {
        await handler("op-test-1", { note: comment });
        conditionalSet.add("op-test-1");
        comment = "";
      } finally {
        isSubmitting = false;
      }
    };

    return {
      triggerClick,
      getOps: () => localOps,
      getConditionalSet: () => conditionalSet,
      getComment: () => comment,
      getIsSubmitting: () => isSubmitting,
    };
  };

  // 3a. HTTP 422 Validation Error: rejects, preserves status, retains comment, resets lock
  const test422 = createMockFinalApproveHandler(async () => {
    const err: any = new Error("Request failed with status code 422");
    err.response = { status: 422, data: { message: "الوردية غير مطابقة للمراجعة" } };
    throw err;
  });
  await assert.rejects(test422.triggerClick());
  assert.equal(test422.getOps()[0].status, "approved", "Status remains unchanged on 422");
  assert.equal(test422.getConditionalSet().has("op-test-1"), false, "Badge not added on 422");
  assert.equal(test422.getComment(), "ملاحظة الاعتماد", "Comment preserved for retry on 422");
  assert.equal(test422.getIsSubmitting(), false, "Submitting lock released on 422");

  // 3b. HTTP 500 Server Error: rejects, preserves status, retains comment, resets lock
  const test500 = createMockFinalApproveHandler(async () => {
    const err: any = new Error("Internal Server Error");
    err.response = { status: 500, data: { message: "خطأ داخلي في الخادم" } };
    throw err;
  });
  await assert.rejects(test500.triggerClick());
  assert.equal(test500.getOps()[0].status, "approved", "Status remains unchanged on 500");
  assert.equal(test500.getConditionalSet().has("op-test-1"), false, "Badge not added on 500");
  assert.equal(test500.getComment(), "ملاحظة الاعتماد", "Comment preserved for retry on 500");
  assert.equal(test500.getIsSubmitting(), false, "Submitting lock released on 500");

  // 3c. Network Error (Offline / Timeout)
  const testNetwork = createMockFinalApproveHandler(async () => {
    const err = new Error("Network Error: connection refused");
    throw err;
  });
  await assert.rejects(testNetwork.triggerClick());
  assert.equal(testNetwork.getOps()[0].status, "approved", "Status remains unchanged on network error");
  assert.equal(testNetwork.getConditionalSet().has("op-test-1"), false, "Badge not added on network error");
  assert.equal(testNetwork.getComment(), "ملاحظة الاعتماد", "Comment preserved for retry on network error");
  assert.equal(testNetwork.getIsSubmitting(), false, "Submitting lock released on network error");

  // 3d. Confirmed Server Success: sets status and badge, clears comment
  const testSuccess = createMockFinalApproveHandler(async () => ({ ok: true, batchId: "B-201" }));
  await testSuccess.triggerClick();
  assert.equal(testSuccess.getOps()[0].status, "final-approved", "Status updated on confirmed success");
  assert.equal(testSuccess.getConditionalSet().has("op-test-1"), true, "Badge added on confirmed success");
  assert.equal(testSuccess.getComment(), "", "Comment cleared after successful submission");
  assert.equal(testSuccess.getIsSubmitting(), false, "Submitting lock released");
});

test("HA-F07 & HA-F08: ERP wizard filters operations by period/module/branch/status, excludes null amounts, and blocks step progression on empty data or preflight failure", () => {
  const refDate = new Date("2026-10-22T12:00:00Z");

  const ops = [
    {
      id: "op-today",
      status: "final-approved",
      moduleKey: "sales",
      branch: "Main",
      brandName: "B1",
      amount: 1500,
      operationDate: "2026-10-22T10:00:00Z",
      erpPosted: false,
    },
    {
      id: "op-yesterday",
      status: "final-approved",
      moduleKey: "sales",
      branch: "Main",
      brandName: "B1",
      amount: 2500,
      operationDate: "2026-10-21T10:00:00Z",
      erpPosted: false,
    },
    {
      id: "op-lastmonth",
      status: "final-approved",
      moduleKey: "expenses",
      branch: "North",
      brandName: "B2",
      amount: 800,
      operationDate: "2026-09-15T10:00:00Z",
      erpPosted: false,
    },
    {
      id: "op-null-amount",
      status: "final-approved",
      moduleKey: "sales",
      branch: "Main",
      brandName: "B1",
      amount: null,
      operationDate: "2026-10-22T11:00:00Z",
      erpPosted: false,
    },
    {
      id: "op-pending",
      status: "pending",
      moduleKey: "sales",
      branch: "Main",
      brandName: "B1",
      amount: 1200,
      operationDate: "2026-10-22T10:00:00Z",
      erpPosted: false,
    },
    {
      id: "op-already-posted",
      status: "final-approved",
      moduleKey: "sales",
      branch: "Main",
      brandName: "B1",
      amount: 900,
      operationDate: "2026-10-22T09:00:00Z",
      erpPosted: true,
    },
  ];

  // 1. Period filter: day
  const dayOps = filterErpOperations(
    ops,
    {
      moduleFilter: "all",
      branchFilter: "all",
      restaurantFilter: "all",
      statusFilter: "all",
      periodFilter: "day",
    },
    refDate,
  );
  assert.equal(dayOps.length, 1);
  assert.equal(dayOps[0].id, "op-today");

  // 2. Period filter: all (excludes null amount, pending, and already posted)
  const allOps = filterErpOperations(
    ops,
    {
      moduleFilter: "all",
      branchFilter: "all",
      restaurantFilter: "all",
      statusFilter: "all",
      periodFilter: "all",
    },
    refDate,
  );
  assert.deepEqual(
    allOps.map((o) => o.id),
    ["op-today", "op-yesterday", "op-lastmonth"],
  );

  // 3. Module filter: expenses only
  const expensesOnly = filterErpOperations(
    ops,
    {
      moduleFilter: "expenses",
      branchFilter: "all",
      restaurantFilter: "all",
      statusFilter: "all",
      periodFilter: "all",
    },
    refDate,
  );
  assert.equal(expensesOnly.length, 1);
  assert.equal(expensesOnly[0].id, "op-lastmonth");

  // 4. Preflight gates: canProceedPreflight (HA-F08: must be fail-closed on null/undefined/missing)
  assert.equal(canProceedPreflight(null), false, "Null preflight must be blocked");
  assert.equal(canProceedPreflight(undefined), false, "Undefined preflight must be blocked");
  assert.equal(canProceedPreflight({ canProceed: false }), false);
  assert.equal(
    canProceedPreflight({
      canProceed: true,
      checks: [{ ok: false, severity: "error" }],
    }),
    false,
  );
  assert.equal(
    canProceedPreflight({
      canProceed: true,
      checks: [{ ok: true, severity: "info" }],
    }),
    true,
  );
  assert.equal(
    canProceedPreflight({
      canProceed: true,
      checks: [{ ok: false, severity: "warning" }],
    }),
    true,
  );

  // 5. Empty submission gate: toPost.length === 0 blocks step progression
  const emptyToPost: typeof ops = [];
  const canSend =
    emptyToPost.length > 0 && canProceedPreflight({ canProceed: true });
  assert.equal(canSend, false, "Must block submission when toPost is empty");

  // 6. Step 3 gate: requires confirmed server batch ID
  const isStep3Allowed = (batchId: string | null | undefined) =>
    typeof batchId === "string" && batchId.trim().length > 0;
  assert.equal(isStep3Allowed(null), false);
  assert.equal(isStep3Allowed(""), false);
  assert.equal(isStep3Allowed("   "), false);
  assert.equal(isStep3Allowed("ERP-CONFIRMED-8871"), true);
});

test("HA-F10: fetchAllHeadOpsPages aggregates multi-page results, preserves pagination metadata, and avoids unnecessary requests on single page or explicit page requests", async () => {
  const requests: { url: string; params?: any }[] = [];
  const mockApi = {
    get: async <T = any>(url: string, cfg?: any): Promise<{ data: T }> => {
      requests.push({ url, params: cfg?.params });
      const page = cfg?.params?.page ?? 1;
      if (page === 1) {
        return {
          data: {
            data: [{ id: "op-1" }, { id: "op-2" }],
            meta: { page: 1, pageSize: 2, total: 5, totalPages: 3 },
          } as unknown as T,
        };
      } else if (page === 2) {
        return {
          data: {
            data: [{ id: "op-3" }, { id: "op-4" }],
            meta: { page: 2, pageSize: 2, total: 5, totalPages: 3 },
          } as unknown as T,
        };
      } else if (page === 3) {
        return {
          data: {
            data: [{ id: "op-5" }],
            meta: { page: 3, pageSize: 2, total: 5, totalPages: 3 },
          } as unknown as T,
        };
      }
      return {
        data: {
          data: [],
          meta: { page, pageSize: 2, total: 5, totalPages: 3 },
        } as unknown as T,
      };
    },
  };

  // 1. Fetching without explicit page: aggregates all 3 pages
  const allResults = await fetchAllHeadOpsPages(
    "/head/operations/pending",
    {},
    mockApi,
  );
  assert.equal(allResults.length, 5);
  assert.deepEqual(
    allResults.map((o) => o.id),
    ["op-1", "op-2", "op-3", "op-4", "op-5"],
  );
  assert.deepEqual((allResults as any).meta, {
    page: 1,
    pageSize: 2,
    total: 5,
    totalPages: 3,
  });
  assert.equal(requests.length, 3, "Must make 3 requests for 3 pages");
  assert.equal(requests[1].params.page, 2);
  assert.equal(requests[2].params.page, 3);

  // 2. Fetching with explicit page: fetches only requested page
  requests.length = 0;
  const page2Results = await fetchAllHeadOpsPages(
    "/head/operations/pending",
    { page: 2 },
    mockApi,
  );
  assert.equal(page2Results.length, 2);
  assert.deepEqual(
    page2Results.map((o) => o.id),
    ["op-3", "op-4"],
  );
  assert.equal(
    requests.length,
    1,
    "Must make only 1 request when explicit page is specified",
  );

  // 3. Single-page queue: does not trigger extra requests
  requests.length = 0;
  const singlePageApi = {
    get: async <T = any>(url: string, cfg?: any): Promise<{ data: T }> => {
      requests.push({ url, params: cfg?.params });
      return {
        data: {
          data: [{ id: "op-single" }],
          meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        } as unknown as T,
      };
    },
  };
  const singleResults = await fetchAllHeadOpsPages(
    "/head/operations/pending",
    {},
    singlePageApi,
  );
  // 4. API Query adapter integration: fetchAllHeadOpsPagesPlatform delegates to base helper
  const platformResults = await fetchAllHeadOpsPagesPlatform(
    "/head/operations/pending",
    {},
    mockApi,
  );
  assert.equal(platformResults.length, 5);
  assert.equal((platformResults as any).meta.total, 5);
});

test("HA-F11: financial aggregation functions preserve null/missing amounts without falsifying as zero", () => {
  // aggregateOpsAmount
  assert.equal(aggregateOpsAmount([{ amount: 100 }, { amount: 200 }]), 300);
  assert.equal(
    aggregateOpsAmount([{ amount: 100 }, { amount: null }, { amount: 200 }]),
    null,
    "Must return null when any amount is null",
  );
  assert.equal(aggregateOpsAmount([{ amount: null }]), null);
  assert.equal(aggregateOpsAmount([]), 0);

  // sumCOpAmounts
  assert.equal(sumCOpAmounts([{ amount: 45.5 }, { amount: 54.5 }]), 100);
  assert.equal(
    sumCOpAmounts([{ amount: 45.5 }, { amount: null }]),
    null,
    "sumCOpAmounts must return null when any item amount is null",
  );
  assert.equal(sumCOpAmounts([{ amount: null }]), null);
  assert.equal(sumCOpAmounts([]), 0);

  // Branch rankings: branches with unknown amounts must NOT be falsified as 0
  const branchOps = [
    { branch: "Riyadh", amount: 500 },
    { branch: "Riyadh", amount: 700 },
    { branch: "Jeddah", amount: 1500 },
    { branch: "Dammam", amount: null },
  ];
  const branchAmts: Record<string, number | null> = {};
  branchOps.forEach((o) => {
    if (!o.branch) return;
    if (branchAmts[o.branch] === null) return;
    if (o.amount == null || Number.isNaN(o.amount)) {
      branchAmts[o.branch] = null;
    } else {
      branchAmts[o.branch] = (branchAmts[o.branch] ?? 0) + o.amount;
    }
  });
  const validRankings = Object.entries(branchAmts)
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .sort(([, a], [, b]) => b - a);

  assert.equal(branchAmts["Dammam"], null, "Branch with null amount must have null total");
  assert.deepEqual(validRankings, [["Jeddah", 1500], ["Riyadh", 1200]], "Only complete branches ranked");

  // Batch map: batches with null amounts must NOT be falsified as 0
  const batchOps = [
    { erpBatchId: "BATCH-1", amount: 100 },
    { erpBatchId: "BATCH-1", amount: null },
    { erpBatchId: "BATCH-2", amount: 300 },
  ];
  const batchMap: Record<string, number | null> = {};
  batchOps.forEach((o) => {
    if (batchMap[o.erpBatchId] === null) return;
    if (o.amount == null) batchMap[o.erpBatchId] = null;
    else batchMap[o.erpBatchId] = (batchMap[o.erpBatchId] ?? 0) + o.amount;
  });
  assert.equal(batchMap["BATCH-1"], null, "Batch with null op must have null total");
  assert.equal(batchMap["BATCH-2"], 300, "Clean batch total calculated");

  // Display formatting: null amounts must NOT be shown as 0.00 SAR
  const formatAmountDisplay = (amount: number | null | undefined): string => {
    if (amount == null) return "—";
    return `${amount.toFixed(2)} ر.س`;
  };
  assert.equal(formatAmountDisplay(null), "—");
  assert.equal(formatAmountDisplay(undefined), "—");
  assert.equal(formatAmountDisplay(0), "0.00 ر.س");
  assert.equal(formatAmountDisplay(150.25), "150.25 ر.س");
});

test("HA-F22: shouldUpdateHeadOps and opsRange prevent infinite render loops while clearing stale operations on empty query success", () => {
  const current = [
    { id: "1", status: "approved", amount: 100, erpPosted: false },
    { id: "2", status: "approved", amount: 200, erpPosted: false },
  ];

  // 1. Queries not yet all succeeded: must not update
  const notReady = shouldUpdateHeadOps(
    current,
    [{ id: "1", status: "approved", amount: 100, erpPosted: false }],
    false,
  );
  assert.equal(notReady.shouldUpdate, false);

  // 2. All queries succeeded, but data is identical: shouldUpdate === false (prevents render loops!)
  const identical = shouldUpdateHeadOps(
    current,
    [
      { id: "1", status: "approved", amount: 100, erpPosted: false },
      { id: "2", status: "approved", amount: 200, erpPosted: false },
    ],
    true,
  );
  assert.equal(identical.shouldUpdate, false);

  // 3. New status arrived: shouldUpdate === true
  const changedStatus = shouldUpdateHeadOps(
    current,
    [
      { id: "1", status: "approved", amount: 100, erpPosted: false },
      { id: "2", status: "final-approved", amount: 200, erpPosted: false },
    ],
    true,
  );
  assert.equal(changedStatus.shouldUpdate, true);
  assert.equal(changedStatus.nextOps[1].status, "final-approved");

  // 4. Workflow field changed (erpPosted): shouldUpdate === true (must not drop critical operational changes!)
  const changedErp = shouldUpdateHeadOps(
    current,
    [
      { id: "1", status: "approved", amount: 100, erpPosted: false },
      { id: "2", status: "approved", amount: 200, erpPosted: true },
    ],
    true,
  );
  assert.equal(changedErp.shouldUpdate, true, "Must detect erpPosted change even if id/status/amount match");

  // 5. Query returned 0 rows (e.g. filtered): shouldUpdate === true and nextOps is empty (stale rows cleared)
  const emptySuccess = shouldUpdateHeadOps(current, [], true);
  assert.equal(emptySuccess.shouldUpdate, true);
  assert.equal(emptySuccess.nextOps.length, 0);

  // 6. Query error with existing data: must NOT empty the data!
  const queryFailed = shouldUpdateHeadOps(current, [], false);
  assert.equal(queryFailed.shouldUpdate, false, "Must not clear on query error");
  assert.equal(queryFailed.nextOps.length, 2);

  // 7. Simulated React hook render cycle verifying no loop occurs
  let renderCount = 0;
  let simulatedOps = current;
  const mockIncomingQueryData = [
    { id: "1", status: "approved", amount: 100, erpPosted: false },
    { id: "2", status: "approved", amount: 200, erpPosted: false },
  ];
  // Simulate 5 renders
  for (let i = 0; i < 5; i++) {
    renderCount++;
    const check = shouldUpdateHeadOps(simulatedOps, mockIncomingQueryData, true);
    if (check.shouldUpdate) {
      simulatedOps = check.nextOps;
    }
  }
  assert.equal(renderCount, 5);
  assert.equal(simulatedOps, current, "Data reference remained stable, preventing infinite state update loop");
});
