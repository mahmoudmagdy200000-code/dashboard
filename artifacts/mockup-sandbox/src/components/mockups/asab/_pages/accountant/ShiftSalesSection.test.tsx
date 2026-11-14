import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalWindow } from "happy-dom";
import { queryKeys } from "../../../../../api/queries/keys";
import type { Shift } from "../../../../../api/types/company";
import { LangContext, type Lang } from "../../_shared/LangContext";
import type { Op, PageProps } from "../../_shared/types";
import { AccSalesPage } from "./AccSalesPage";
import { ShiftSalesSection } from "./ShiftSalesSection";

const window = new GlobalWindow();
Object.assign(globalThis, {
  window,
  document: window.document,
  React,
  IS_REACT_ACT_ENVIRONMENT: true,
});

const first: Shift = {
  id: "shift-6",
  branchId: "branch-1",
  branchName: "فرع الاختبار",
  cashierEmployeeId: "cashier-1",
  cashierName: "Cashier",
  role: "cashier",
  shiftType: "first",
  shiftNo: 1,
  startedAt: "2026-11-05T21:30:00Z",
  endedAt: "2026-11-06T08:30:00Z",
  status: "pending_review",
  isLate: false,
  ordersCount: null,
  salesHalalas: 11500,
  openingFloatHalalas: 0,
  cashActualHalalas: 2000,
  cashExpectedHalalas: 4000,
  varianceHalalas: -2000,
  cashCountState: "counted",
  reportReview: { operation_id: "op-6", public_id: "SHF-0006" },
};

const second: Shift = {
  ...first,
  id: "shift-5",
  startedAt: "2026-11-02T08:00:00Z",
  salesHalalas: 11000,
  cashActualHalalas: 4000,
  cashExpectedHalalas: 6000,
  reportReview: null,
};
const secondOp: Op = {
  id: "SHF-0005",
  sourceId: second.id,
  branchId: second.branchId,
  branch: second.branchName,
  moduleKey: "shifts",
  moduleLabel: "Shift",
  amount: 110,
  timeAgo: "",
  match: "review",
  attachments: 0,
  status: "pending",
  origin: "mobile",
};
const salesOp: Op = {
  ...secondOp,
  id: "SAL-0001",
  sourceId: "sale-1",
  moduleKey: "sales",
  moduleLabel: "Sales",
  amount: 25,
};
const historyKey = (page = 1) => queryKeys.shifts({ page, pageSize: 5, role: "cashier" } as Parameters<typeof queryKeys.shifts>[0]);
const client = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
const language = (lang: Lang) => ({
  lang,
  dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
  setLang: () => {},
  t: <T,>(ar: T, en: T): T => (lang === "ar" ? ar : en),
});
const props: PageProps = {
  role: "accountant",
  ops: [secondOp, salesOp],
  detailId: null,
  navigate: () => {},
  setDetailId: () => {},
  setModal: () => {},
  approveOp: () => {},
  rejectOp: () => {},
  finalApproveOp: () => {},
  bulkApprove: () => {},
};
function button(container: Element, label: string) {
  const result = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent === label,
  );
  assert.ok(result, label);
  return result;
}

test("Sales shows both cashier shifts separately and expands each linked report with Saudi times and precise values", async () => {
  const qc = client();
  qc.setQueryData(historyKey(), {
    data: [
      first,
      second,
      { ...first, id: "manager-1", role: "branch_manager" },
    ],
    meta: { page: 1, totalPages: 2 },
  });
  qc.setQueryData(historyKey(2), {
    data: [
      { ...first, id: "older", cashCountState: "unknown", reportReview: null },
    ],
    meta: { page: 2, totalPages: 2 },
  });
  qc.setQueryData(queryKeys.operation("op-6"), {
    id: "op-6",
    publicId: "SHF-0006",
    branchId: first.branchId,
    moduleKey: "shifts",
    submittedAt: "2026-11-06T09:14:00Z",
    handoverNotes: "Count checked",
    cashCollectedHalalas: 4000,
    payload: { cardTotalHalalas: 7500, aggregatorTotalsHalalas: 0 },
    auditTrail: [
      {
        action: "Report uploaded",
        by: "Manager",
        time: "2026-11-06T09:14:00Z",
      },
    ],
  });
  qc.setQueryData(queryKeys.operation(secondOp.id), {
    id: "op-5",
    publicId: secondOp.id,
    branchId: second.branchId,
    moduleKey: "shifts",
    payload: { cardTotalHalalas: 5000 },
    handoverNotes: "Earlier shift",
  });
  qc.setQueryData(queryKeys.salesKpis(), null);
  qc.setQueryData(["shifts", "sales-summary", { role: "cashier", page: 1, pageSize: 100 }], {
    count: 3, pending: 3, totalSalesHalalas: 34500, totalVarianceHalalas: null,
  });
  qc.setQueryDefaults(["sales", "day-completeness"], { enabled: false });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={qc}>
          <LangContext.Provider value={language("en")}>
            <AccSalesPage {...props} />
          </LangContext.Provider>
        </QueryClientProvider>,
      ),
    );
    assert.match(container.textContent ?? "", /Shift sales/);
    const overview = container.querySelector('[aria-label="Shift Sales Totals"]');
    assert.match(overview?.textContent ?? "", /Total Shift Sales345\.00 SAR/);
    assert.match(overview?.textContent ?? "", /Cash counts incomplete/);
    assert.ok(container.querySelector('[data-op-id="SAL-0001"]'));
    assert.equal(container.querySelector('[data-op-id="SHF-0005"]'), null);
    assert.equal(
      container.querySelector('[data-shift-sales-id="manager-1"]'),
      null,
    );
    const row = container.querySelector('[data-shift-sales-id="shift-6"]')!;
    const olderRow = container.querySelector(
      '[data-shift-sales-id="shift-5"]',
    )!;
    assert.match(row.textContent ?? "", /115\.00 SAR/);
    assert.match(row.textContent ?? "", /-20\.00 SAR/);
    assert.match(row.textContent ?? "", /6 Nov 2026/);
    assert.match(olderRow.textContent ?? "", /110\.00 SAR/);
    assert.match(olderRow.textContent ?? "", /2 Nov 2026/);
    const view = button(row, "View details");
    await act(async () => view.click());
    assert.equal(view.getAttribute("aria-expanded"), "true");
    assert.match(row.textContent ?? "", /Counted cash20\.00 SAR/);
    assert.match(row.textContent ?? "", /Card payments75\.00 SAR/);
    assert.match(
      row.textContent ?? "",
      /Report submitted for review6 Nov 2026, 12:14/,
    );
    assert.match(row.textContent ?? "", /Count checked/);
    assert.match(row.textContent ?? "", /Report uploadedManager/);

    await act(async () => button(olderRow, "View details").click());
    assert.equal(view.getAttribute("aria-expanded"), "false");
    assert.match(olderRow.textContent ?? "", /Counted cash40\.00 SAR/);
    assert.match(olderRow.textContent ?? "", /Earlier shift/);
    assert.doesNotMatch(olderRow.textContent ?? "", /Count checked/);

    await act(async () => button(container, "Next").click());
    const unknown = container.querySelector('[data-shift-sales-id="older"]')!;
    await act(async () => button(unknown, "View details").click());
    assert.match(unknown.textContent ?? "", /Counted cashNot counted/);
    assert.doesNotMatch(unknown.textContent ?? "", /20\.00 SAR/);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});

test("Arabic shift detail preserves Arabic money and keeps a mismatched report out", async () => {
  const qc = client();
  qc.setQueryData(historyKey(), {
    data: [first],
    meta: { page: 1, totalPages: 1 },
  });
  qc.setQueryData(queryKeys.operation("op-6"), {
    id: "op-6",
    publicId: "SHF-0006",
    branchId: "other-branch",
    moduleKey: "shifts",
    handoverNotes: "Other branch note",
  });
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={qc}>
          <LangContext.Provider value={language("ar")}>
            <ShiftSalesSection operations={[]} />
          </LangContext.Provider>
        </QueryClientProvider>,
      ),
    );
    await act(async () => button(container, "عرض التفاصيل").click());
    assert.match(container.textContent ?? "", /١١٥٫٠٠/);
    assert.match(container.textContent ?? "", /النقد المجرود٢٠٫٠٠/);
    assert.match(container.textContent ?? "", /تقرير المراجعة غير متاح/);
    assert.doesNotMatch(container.textContent ?? "", /Other branch note/);
  } finally {
    await act(async () => root.unmount());
    qc.clear();
  }
});
