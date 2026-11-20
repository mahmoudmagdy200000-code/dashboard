import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalWindow } from "happy-dom";
import { api } from "../../../../../api/client";
import type { Operation } from "../../../../../api/types";
import type { Shift } from "../../../../../api/types/company";
import { AuthContext } from "../../../../../auth/AuthContext";
import { LangContext } from "../../_shared/LangContext";
import { DailySalesShiftDetails, loadDailyReportMemberShifts } from "./DailySalesShiftDetails";
import { dailySalesReportFromOperation } from "./workdaySalesReport";

const window = new GlobalWindow();
Object.assign(globalThis, { window, document: window.document, React, IS_REACT_ACT_ENVIRONMENT: true });

const operation = {
  id: "op-manager-day-1", publicId: "OPS-0008", moduleKey: "sales", workflowKind: "sal_day",
  branchId: "branch-1", branchName: "Assab Demo Branch 1116", status: "pending",
  operationDate: "2026-11-19T03:00:00Z", createdAt: "2026-11-19T03:00:00Z", updatedAt: "2026-11-19T03:00:00Z",
  amountHalalas: 100000,
  reportReview: { phase: "accountant_review" },
  reconciliation: null,
  payload: {
    date: "2026-11-19", managerShiftId: "manager-day-1", managerName: "Demo Manager",
    totalSalesHalalas: 100000, cashHalalas: 37800, cardHalalas: 60000,
    appsHalalas: 2200, varianceHalalas: -1800,
    pkg6Review: { member_source_ids: ["cashier-one"] },
  },
} as Operation;
const report = dailySalesReportFromOperation(operation)!;

const shift: Shift = {
  id: "admin-mirrored-cashier-one", branchId: "branch-1", branchName: "Assab Demo Branch 1116",
  cashierEmployeeId: "emp-1", cashierName: "Demo Cashier A", shiftNo: 1,
  shiftType: "first", startedAt: "2026-11-19T08:00:00Z", endedAt: "2026-11-19T12:00:00Z",
  status: "closed", isLate: false, ordersCount: 2, salesHalalas: 60000,
  openingFloatHalalas: 50000, cashExpectedHalalas: 25000, cashActualHalalas: 23000,
  varianceHalalas: -2000, cashCountState: "counted", role: "cashier",
  reportReview: { phase: "accountant_review", memberships: [{ day_id: "manager-day-1" }] },
};

function wrapper(node: React.ReactNode, qc: QueryClient) {
  return <QueryClientProvider client={qc}>
    <LangContext.Provider value={{ lang: "en", dir: "ltr", setLang: () => {}, t: (_ar, en) => en }}>
      {node}
    </LangContext.Provider>
  </QueryClientProvider>;
}

test("daily report shows submitted channels and real shift figures instead of the empty legacy reconciliation", async () => {
  const originalGet = api.get.bind(api);
  const requests: string[] = [];
  api.get = (async (url: string, options?: { params?: Record<string, unknown> }) => {
    requests.push(url);
    assert.equal(options?.params?.branchId, "branch-1");
    assert.equal(options?.params?.submittedWithWorkday, true);
    return { data: { data: [shift], meta: { page: 1, pageSize: 100, total: 1, totalPages: 1, submittedWithWorkday: true } } };
  }) as typeof api.get;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootNode = document.createElement("div");
  document.body.appendChild(rootNode);
  const root = createRoot(rootNode);
  try {
    await act(async () => root.render(
      <QueryClientProvider client={qc}>
        <LangContext.Provider value={{ lang: "en", dir: "ltr", setLang: () => {}, t: (_ar, en) => en }}>
          <DailySalesShiftDetails report={report} />
        </LangContext.Provider>
      </QueryClientProvider>
    ));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    assert.deepEqual(requests, ["/accountant/shifts/history"]);
    const content = rootNode.textContent ?? "";
    assert.match(content, /Daily sales breakdown/);
    assert.match(content, /1,000\.00/);
    assert.match(content, /378\.00/);
    assert.match(content, /600\.00/);
    assert.match(content, /22\.00/);
    assert.match(content, /-18\.00/);
    assert.match(content, /Demo Cashier A/);
    assert.match(content, /500\.00/);
    assert.match(content, /Edit figures/);
    assert.doesNotMatch(content, /not been reconciled/);
  } finally {
    api.get = originalGet;
    await act(async () => root.unmount());
    rootNode.remove();
    qc.clear();
  }
});

test("daily report edit action reveals linked shift correction scope but does not invent an edit route", async () => {
  const originalGet = api.get.bind(api);
  const requests: string[] = [];
  api.get = (async (url: string) => {
    requests.push(url);
    return { data: { data: [shift], meta: { page: 1, total: 1, totalPages: 1, submittedWithWorkday: true } } };
  }) as typeof api.get;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(wrapper(<DailySalesShiftDetails report={report} />, qc)));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    const toggle = container.querySelector<HTMLButtonElement>('[data-testid="daily-sales-edit-toggle"]');
    assert.ok(toggle);
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    await act(async () => toggle.click());
    assert.equal(toggle.getAttribute("aria-expanded"), "true");
    assert.match(container.textContent ?? "", /manager's consolidated close cannot be edited directly/);
    assert.match(container.textContent ?? "", /No verified review operation is linked/);
    assert.deepEqual(requests, ["/accountant/shifts/history"]);
    assert.equal(container.querySelector('[aria-label="تصحيح تقرير الوردية"]'), null);
  } finally {
    api.get = originalGet;
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});

test("approved daily report keeps the edit control explanatory and never opens a financial form", async () => {
  const originalGet = api.get.bind(api);
  api.get = (async () => ({ data: {
    data: [{ ...shift, reportReview: { ...shift.reportReview, operation_id: "cashier-operation-1" } }],
    meta: { page: 1, total: 1, totalPages: 1, submittedWithWorkday: true },
  } })) as typeof api.get;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(wrapper(<DailySalesShiftDetails report={{
      ...report, operation: { ...report.operation, status: "final-approved" },
    }} />, qc)));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="daily-sales-edit-toggle"]')?.click());
    assert.match(container.textContent ?? "", /Direct editing is unavailable/);
    assert.equal(container.querySelector('[aria-label="تصحيح تقرير الوردية"]'), null);
  } finally {
    api.get = originalGet;
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});

test("embedded reconciliation matches the reference layout without duplicate headings or totals", async () => {
  const originalGet = api.get.bind(api);
  api.get = (async () => ({ data: {
    data: [shift], meta: { page: 1, total: 1, totalPages: 1, submittedWithWorkday: true },
  } })) as typeof api.get;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(wrapper(<DailySalesShiftDetails report={report} embedded editOpen />, qc)));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
    assert.equal(container.querySelector('[data-testid="daily-sales-edit-toggle"]'), null, "parent reconciliation header owns edit button");
    assert.doesNotMatch(container.textContent ?? "", /Daily sales breakdown/, "nested heading is removed");
    assert.equal(container.querySelectorAll('[class*="bg-indigo-50/"]').length, 1, "one manager-locked total row");
    assert.match(container.textContent ?? "", /Delivery apps total/);
    assert.match(container.textContent ?? "", /Total collected matches submitted sales exactly/);
    assert.ok(container.querySelector('[aria-label="Edit daily shift details"]'), "editor appears directly below the reconciliation");
  } finally {
    api.get = originalGet;
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});

test("pending accountant-review cashier report opens the real COR-05 correction form from the daily report", async () => {
  const linkedShift = { ...shift, reportReview: {
    ...shift.reportReview, operation_id: "shift-op-edit-1",
  } };
  const linkedOp = {
    ...operation, id: "shift-op-edit-1", publicId: "OPS-SHIFT-1", moduleKey: "shifts",
    reportRevision: 1, reportReview: { phase: "accountant_review" },
    payload: {
      shiftId: linkedShift.id, reportRevision: 1, allocationVersion: null,
      salesHalalas: 60000, cardTotalHalalas: 22000, aggregatorTotalsHalalas: 0,
      cashActualHalalas: 23000, cashCollectedHalalas: 38000,
      cashCountState: "counted", aggregatorBreakdown: [],
      pkg6Review: { phase: "accountant_review" },
    },
  } as Operation;
  const originalGet = api.get.bind(api);
  const requested: string[] = [];
  api.get = (async (url: string) => {
    requested.push(url);
    if (url === "/accountant/shifts/history") return { data: {
      data: [linkedShift], meta: { page: 1, total: 1, totalPages: 1, submittedWithWorkday: true },
    } };
    if (url === "/operations/shift-op-edit-1") return { data: linkedOp };
    return { data: { data: [], meta: { page: 1, total: 0, totalPages: 1 } } };
  }) as typeof api.get;
  const auth = {
    user: { id: "accountant-1", companyId: "company-1", status: "active", roles: [{
      key: "accountant", scope: "brand", brandIds: ["550e8400-e29b-41d4-a716-446655440090"],
      restaurantIds: [], branchIds: [], moduleKeys: ["sales", "shifts"],
    }] },
    financialTransition: false, hasPermission: () => true, isRole: () => true,
  } as unknown as React.ContextType<typeof AuthContext>;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(wrapper(<AuthContext.Provider value={auth}>
      <DailySalesShiftDetails report={report} />
    </AuthContext.Provider>, qc)));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="daily-sales-edit-toggle"]')?.click());
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    assert.ok(container.querySelector('[data-testid="daily-sales-member-edit-form"]'), "eligible shift gets correction form");
    assert.ok(container.querySelector('[aria-label="Shift report correction"], [aria-label="تصحيح تقرير الوردية"]'), "existing COR-05 form is reused");
    assert.ok(requested.includes("/operations/shift-op-edit-1"), "the server report is fetched by linked operation ID");
  } finally {
    api.get = originalGet;
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});

test("only includes shifts with the same signed manager-day membership", async () => {
  const originalGet = api.get.bind(api);
  api.get = (async () => ({ data: {
    data: [shift, { ...shift, id: "unrelated-admin-shift", cashierName: "Unrelated Cashier", reportReview: { phase: "accountant_review", memberships: [{ day_id: "another-day" }] } }],
    meta: { page: 1, total: 2, totalPages: 1, submittedWithWorkday: true },
  } })) as typeof api.get;
  try {
    const result = await loadDailyReportMemberShifts(report);
    assert.deepEqual(result.shifts.map(s => s.id), ["admin-mirrored-cashier-one"]);
    assert.equal(result.missingCount, 0);
  } finally {
    api.get = originalGet;
  }
});

test("rejects shift history outside the authoritative branch", async () => {
  const originalGet = api.get.bind(api);
  api.get = (async () => ({ data: {
    data: [{ ...shift, branchId: "other-branch" }],
    meta: { page: 1, total: 1, totalPages: 1, submittedWithWorkday: true },
  } })) as typeof api.get;
  try {
    await assert.rejects(loadDailyReportMemberShifts(report), /PROVENANCE_MISMATCH/);
  } finally {
    api.get = originalGet;
  }
});

test("paginates fully, preserves the manager-day link, and reports missing members without inventing numbers", async () => {
  const originalGet = api.get.bind(api);
  const extended = { ...report, memberShiftIds: ["cashier-one", "cashier-two"] };
  const pages: number[] = [];
  api.get = (async (_url: string, options?: { params?: { page?: number } }) => {
    const page = options?.params?.page ?? 0;
    pages.push(page);
    return { data: {
      data: page === 1 ? [shift] : [{ ...shift, id: "another-day-admin-shift", reportReview: { memberships: [{ day_id: "another-day" }] } }],
      meta: { page, total: 2, totalPages: 2, submittedWithWorkday: true },
    } };
  }) as typeof api.get;
  try {
    const result = await loadDailyReportMemberShifts(extended);
    assert.deepEqual(pages, [1, 2]);
    assert.deepEqual(result.shifts.map(s => s.id), ["admin-mirrored-cashier-one"]);
    assert.equal(result.missingCount, 1);
  } finally {
    api.get = originalGet;
  }
});
