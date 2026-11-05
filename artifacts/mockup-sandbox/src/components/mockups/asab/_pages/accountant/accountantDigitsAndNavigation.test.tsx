import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalWindow } from "happy-dom";
import { LangContext, type Lang } from "../../_shared/LangContext";
import { queryKeys } from "../../../../../api/queries/keys";
import { AccDashboard } from "./AccDashboard";
import { AccShifts } from "./AccShifts";
import { opDetailPage, fmtAmt, formatTodayLong } from "../../_shared/formatters";
import type { Op, PageProps } from "../../_shared/types";

const win = new GlobalWindow({ url: "http://localhost:3000/?page=acc-dashboard" });
Object.assign(globalThis, { window: win, document: win.document, HTMLElement: win.HTMLElement, Event: win.Event, React, IS_REACT_ACT_ENVIRONMENT: true });

const op = (moduleKey: Op["moduleKey"], id: string, sourceId?: string): Op => ({
  id, sourceId, branch: "فرع الاختبار", moduleKey, moduleLabel: moduleKey,
  amount: -20.25, timeAgo: "قبل 2 أيام", match: "review", attachments: 3,
  status: "pending", origin: "mobile",
});
const language = (lang: Lang) => ({ lang, dir: lang === "ar" ? "rtl" as const : "ltr" as const,
  setLang: () => {}, t: <T,>(ar: T, en: T): T => lang === "ar" ? ar : en });
const props = (ops: Op[], extras: Partial<PageProps> = {}): PageProps => ({
  role: "accountant", ops, detailId: null, navigate: () => {}, setDetailId: () => {}, setModal: () => {},
  approveOp: () => {}, rejectOp: () => {}, finalApproveOp: () => {}, bulkApprove: () => {}, ...extras,
});
const client = () => new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });

test("Arabic and English dashboard digits change without changing IDs or signed SAR", () => {
  const source = [op("shifts", "SHF-0006", "shift-42")];
  for (const lang of ["ar", "en"] as const) {
    const qc = client();
    qc.setQueryData(queryKeys.platformAccountantDashboard, { kpis: { awaitingReview: 9, iApproved: 3, finalApproved: 1, approvalRate: 75 } });
    const html = renderToStaticMarkup(<QueryClientProvider client={qc}><LangContext.Provider value={language(lang)}><AccDashboard {...props(source)} /></LangContext.Provider></QueryClientProvider>);
    assert.match(html, /SHF-0006/);
    assert.match(html, lang === "ar" ? /٧٥%/ : /75%/);
    assert.match(html, lang === "ar" ? /٩/ : /9/);
    assert.match(html, lang === "ar" ? /٢ أيام/ : /2 أيام/);
    assert.ok(html.includes(fmtAmt(-20.25, lang)));
    assert.match(formatTodayLong(lang, new Date(2026, 10, 5)), lang === "ar" ? /٢٠٢٦/ : /2026/);
    qc.clear();
  }
});

test("View click routes shift operations to accountant shifts and keeps other modules on their pages", async () => {
  const qc = client();
  qc.setQueryData(queryKeys.platformAccountantDashboard, { kpis: {} });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const routes: string[] = [];
  const details: Array<string | null> = [];
  await act(async () => root.render(<QueryClientProvider client={qc}><LangContext.Provider value={language("ar")}>
    <AccDashboard {...props([op("shifts", "SHF-0006", "shift-42"), op("expenses", "EXP-0002")], {
      navigate: page => routes.push(page), setDetailId: id => details.push(id),
    })} />
  </LangContext.Provider></QueryClientProvider>));
  for (const id of ["SHF-0006", "EXP-0002"]) {
    const row = container.querySelector(`[data-op-id="${id}"]`);
    const button = Array.from(row?.querySelectorAll("button") ?? []).find(item => item.textContent?.includes("عرض"));
    assert.ok(button, `View action for ${id}`);
    await act(async () => button.click());
  }
  assert.deepEqual(routes, ["acc-shifts", "acc-expenses"]);
  assert.deepEqual(details, ["shift-42", "EXP-0002"]);
  assert.equal(opDetailPage("sales"), "acc-sales-detail");
  assert.equal(opDetailPage("purchases"), "acc-purchases");
  await act(async () => root.unmount());
  container.remove();
  qc.clear();
});

test("selected shift opens history, highlights matching row, and keeps history data unchanged", () => {
  const record = { id: "shift-42", branchName: "فرع الاختبار", cashierName: "Cashier", shiftType: "الأول",
    startedAt: "2026-11-05T08:00:00Z", endedAt: "2026-11-05T12:00:00Z", status: "pending_review",
    salesHalalas: 11500, cashExpectedHalalas: 11500, varianceHalalas: -2000,
    cashCountState: "counted", pendingIncomingCountedHalalas: 0, reportReview: { public_id: "SHF-0006" } };
  for (const lang of ["ar", "en"] as const) {
    const qc = client();
    qc.setQueryData(queryKeys.shiftsLive, { active: [], overdue: [], kpis: { openNow: 5, closedToday: 2, todaySalesHalalas: 11500, cashGapsPendingReview: 1 } });
    qc.setQueryData(queryKeys.shifts({ page: 1, pageSize: 20 }), { data: [record], meta: { page: 1, totalPages: 1 } });
    qc.setQueryData([...queryKeys.shiftConfigs, "brand"], []);
    qc.setQueryData([...queryKeys.shiftConfigs, "branch"], []);
    const original = JSON.stringify(record);
    const html = renderToStaticMarkup(<QueryClientProvider client={qc}><LangContext.Provider value={language(lang)}><AccShifts {...props([op("shifts", "SHF-0006", "shift-42")], { detailId: "shift-42" })} /></LangContext.Provider></QueryClientProvider>);
    assert.match(html, /data-selected-shift="true"/);
    assert.match(html, /SHF-0006/);
    assert.match(html, lang === "ar" ? /الصفحة ١ \/ ١/ : /الصفحة 1 \/ 1/);
    assert.match(html, lang === "ar" ? /٢٠٫٠٠/ : /20\.00/);
    assert.equal(JSON.stringify(record), original);
    qc.clear();
  }
});

test("unrelated detail ID does not select or open shift history", () => {
  const qc = client();
  qc.setQueryData(queryKeys.shiftsLive, { active: [], overdue: [], kpis: {} });
  const html = renderToStaticMarkup(<QueryClientProvider client={qc}><LangContext.Provider value={language("ar")}>
    <AccShifts {...props([op("expenses", "EXP-0002")], { detailId: "EXP-0002" })} />
  </LangContext.Provider></QueryClientProvider>);
  assert.doesNotMatch(html, /data-testid="selected-shift-operation"/);
  assert.doesNotMatch(html, /data-testid="shift-history-cards"/);
  qc.clear();
});

test("empty shift history keeps filters and export available without fake rows", () => {
  const qc = client();
  qc.setQueryData(queryKeys.shiftsLive, { active: [], overdue: [], kpis: {} });
  qc.setQueryData(queryKeys.shifts({ page: 1, pageSize: 20 }), { data: [], meta: { page: 1, totalPages: 1 } });
  const html = renderToStaticMarkup(<QueryClientProvider client={qc}><LangContext.Provider value={language("ar")}>
    <AccShifts {...props([op("shifts", "SHF-0006", "shift-42")], { detailId: "shift-42" })} />
  </LangContext.Provider></QueryClientProvider>);
  assert.match(html, /لا يوجد سجل لهذه المرشحات/);
  assert.match(html, /تصدير Excel/);
  assert.match(html, /type="date"/);
  assert.doesNotMatch(html, /data-testid="shift-history-cards"/);
  qc.clear();
});

test("mobile history cards open only the selected first, middle or last shift and close in place", async () => {
  const qc = client();
  const rows = ["first", "middle", "last"].map((id, index) => ({
    id, branchName: `Very long branch name ${id} with a second descriptive segment`, cashierName: `Cashier ${id}`,
    shiftType: "الأول", startedAt: "2026-11-05T08:00:00Z", endedAt: "2026-11-05T12:00:00Z",
    status: "pending_review", salesHalalas: 11500 + index * 100,
    cashExpectedHalalas: 11500, varianceHalalas: index === 0 ? -2000 : index === 1 ? 0 : 1500,
    cashCountState: "counted", pendingIncomingCountedHalalas: 0,
  }));
  qc.setQueryData(queryKeys.shiftsLive, { active: [], overdue: [], kpis: { openNow: 0, closedToday: 3, todaySalesHalalas: 34800, cashGapsPendingReview: 2 } });
  qc.setQueryData(queryKeys.shifts({ page: 1, pageSize: 20 }), { data: rows, meta: { page: 1, totalPages: 1 } });
  qc.setQueryData([...queryKeys.shiftConfigs, "brand"], []);
  qc.setQueryData([...queryKeys.shiftConfigs, "branch"], []);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<QueryClientProvider client={qc}><LangContext.Provider value={language("ar")}>
    <AccShifts {...props([op("shifts", "SHF-first", "first")], { detailId: "first" })} />
  </LangContext.Provider></QueryClientProvider>));
  const cards = Array.from(container.querySelectorAll('[data-testid="shift-history-cards"] article'));
  assert.equal(cards.length, 3);
  assert.match(container.firstElementChild?.className ?? "", /pb-24/);
  assert.match(container.querySelector('[data-testid="shift-history-table"]')?.className ?? "", /hidden.*lg:block/);
  for (const index of [0, 1, 2]) {
    const button = cards[index].querySelector("button")!;
    await act(async () => button.click());
    assert.equal(button.getAttribute("aria-expanded"), "true");
    assert.equal(container.querySelectorAll('[data-testid="shift-history-cards"] button[aria-expanded="true"]').length, 1);
    assert.ok(cards[index].textContent?.includes("نقد وارد معلق"));
    assert.ok(cards[index].textContent?.includes(`Cashier ${rows[index].id}`));
    await act(async () => button.click());
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.equal(container.querySelectorAll('[data-testid="shift-history-cards"] button[aria-expanded="true"]').length, 0);
  }
  assert.equal(container.querySelectorAll('input[type="date"]').length, 2);
  assert.ok(container.textContent?.includes("تصدير Excel"));
  await act(async () => root.unmount());
  container.remove();
  qc.clear();
});
