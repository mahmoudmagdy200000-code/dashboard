import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalWindow } from "happy-dom";
import { api } from "../../../../../api/client";
import type { Operation } from "../../../../../api/types";
import { LangContext } from "../../_shared/LangContext";
import { DailySalesWorkdays } from "./DailySalesWorkdays";

const window = new GlobalWindow();
Object.assign(globalThis, { window, document: window.document, React, IS_REACT_ACT_ENVIRONMENT: true });

function dayOperation(id: string, amountHalalas: number, cashHalalas: number): Operation {
  return {
    id, publicId: `OPS-${id}`, moduleKey: "sales", workflowKind: "sal_day",
    branchId: "branch-1", branchName: "Assab Demo Branch 1116",
    amountHalalas, operationDate: "2026-11-19T20:00:00Z",
    createdAt: "2026-11-19T20:00:00Z", updatedAt: "2026-11-19T20:00:00Z",
    status: "pending", origin: "mobile", brandName: "Assab",
    payload: {
      date: "2026-11-17", managerShiftId: `manager-${id}`,
      managerName: "Demo Manager", cashHalalas,
      cardHalalas: amountHalalas - cashHalalas, appsHalalas: 0,
      varianceHalalas: 500,
      pkg6Review: { member_source_ids: [`shift-${id}`] },
    } as Operation["payload"],
  };
}

test("renders a single branch workday card, drills into manager figures, and ignores legacy sales", async () => {
  const originalGet = api.get.bind(api);
  const a = dayOperation("one", 20000, 9500);
  const b = dayOperation("two", 40000, 18300);
  const requests: string[] = [];
  api.get = (async (url: string) => {
    requests.push(url);
    if (url.endsWith("OPS-one")) return { data: a };
    if (url.endsWith("OPS-two")) return { data: b };
    throw new Error(`Should not fetch legacy operation: ${url}`);
  }) as typeof api.get;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootNode = document.createElement("div");
  document.body.appendChild(rootNode);
  const root = createRoot(rootNode);
  try {
    await act(async () => root.render(
      <QueryClientProvider client={qc}>
        <LangContext.Provider value={{ lang: "en", dir: "ltr", setLang: () => {}, t: (_ar, en) => en }}>
          <DailySalesWorkdays
            references={[
              { id: "OPS-one", status: "pending", workflowKind: "sal_day" },
              { id: "OPS-two", status: "pending", workflowKind: "sal_day" },
              { id: "OPS-legacy", status: "pending", workflowKind: "legacy_sales" },
            ]}
            filters={{ date: "2026-11-17", branchId: "branch-1" }}
          />
        </LangContext.Provider>
      </QueryClientProvider>
    ));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    assert.deepEqual(requests.sort(), ["/operations/OPS-one", "/operations/OPS-two"]);
    const cards = rootNode.querySelectorAll('[data-testid="daily-sales-workday-card"]');
    assert.equal(cards.length, 1);
    assert.match(cards[0].textContent ?? "", /Sales for November 17, 2026/);
    assert.match(cards[0].textContent ?? "", /Assab Demo Branch 1116/);
    assert.match(cards[0].textContent ?? "", /600\.00/);
    const expand = cards[0].querySelector("button")!;
    await act(async () => expand.click());
    assert.equal(expand.getAttribute("aria-expanded"), "true");
    assert.match(cards[0].textContent ?? "", /Cash collected/);
    assert.match(cards[0].textContent ?? "", /278\.00/);
    assert.match(cards[0].textContent ?? "", /OPS-one/);
    assert.match(cards[0].textContent ?? "", /OPS-two/);
  } finally {
    api.get = originalGet;
    await act(async () => root.unmount());
    rootNode.remove();
    qc.clear();
  }
});

test("unclassified mobile/PKG-6 reports are inspected but legacy records are not treated as daily closes", async () => {
  const originalGet = api.get.bind(api);
  const day = dayOperation("unknown", 100000, 37800);
  day.workflowKind = "unknown";
  day.reportReview = { phase: "accountant_review" };
  const requests: string[] = [];
  api.get = (async (url: string) => {
    requests.push(url);
    if (url.endsWith("OPS-unknown")) return { data: day };
    throw new Error(`Unexpected detail lookup: ${url}`);
  }) as typeof api.get;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootNode = document.createElement("div");
  document.body.appendChild(rootNode);
  const root = createRoot(rootNode);
  try {
    await act(async () => root.render(
      <QueryClientProvider client={qc}>
        <LangContext.Provider value={{ lang: "ar", dir: "rtl", setLang: () => {}, t: (ar) => ar }}>
          <DailySalesWorkdays references={[
            { id: "OPS-unknown", status: "pending", workflowKind: "unknown", reportReview: { phase: "accountant_review" }, origin: "mobile" },
            { id: "OPS-legacy", status: "pending", workflowKind: "legacy_sales", origin: "mobile" },
            { id: "OPS-browser", status: "pending", workflowKind: "unknown", origin: "system" },
          ]} />
        </LangContext.Provider>
      </QueryClientProvider>
    ));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
    assert.deepEqual(requests, ["/operations/OPS-unknown"]);
    assert.equal(rootNode.querySelectorAll('[data-testid="daily-sales-workday-card"]').length, 1);
    assert.match(rootNode.textContent ?? "", /1,000|١٬٠٠٠|1000/);
    assert.match(rootNode.textContent ?? "", /المصدر بانتظار التحقق/);
  } finally {
    api.get = originalGet;
    await act(async () => root.unmount());
    rootNode.remove();
    qc.clear();
  }
});
