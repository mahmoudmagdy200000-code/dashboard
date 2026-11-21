import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadModuleRecords } from "./_pages/head/HeadModuleRecords";
import { LangContext } from "./_shared/LangContext";
import { queryKeys } from "../../../api/queries/keys";

const cases = [
  { id: "day-1", publicId: "OPS-0010", branchName: "Demo branch 1120", status: "final-approved", operationDate: "2026-11-20", amountHalalas: 95000, erpPosted: true },
  { id: "day-2", publicId: "OPS-0011", branchName: "Demo branch 1120", status: "pending", operationDate: "2026-11-20", amountHalalas: null },
];

function renderHistory(moduleKey: "sales" | "shifts", lang: "ar" | "en", client: QueryClient) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client },
      React.createElement(LangContext.Provider, {
        value: { lang, dir: lang === "ar" ? "rtl" : "ltr", setLang: () => {}, t: (ar, en) => lang === "ar" ? ar : en },
      }, React.createElement(HeadModuleRecords, { moduleKey }))),
  );
}

test("Head module history renders final and pending operations when the approval queue is empty", () => {
  const client = new QueryClient();
  client.setQueryData(queryKeys.operations({ moduleKey: "sales", page: 1, pageSize: 20 }), {
    data: cases,
    meta: { page: 1, pageSize: 20, total: 21, totalPages: 2 },
  });
  const ar = renderHistory("sales", "ar", client);
  assert.match(ar, /OPS-0010/);
  assert.match(ar, /OPS-0011/);
  assert.match(ar, /مُرحّلة لـ ERP/);
  assert.match(ar, /قيد المراجعة/);
  assert.match(ar, /٩٥٠٫٠٠/);
  assert.match(ar, /٢١ عملية/);
  assert.match(ar, /١ \/ ٢/);
  assert.match(ar, /Demo branch 1120/);

  const en = renderHistory("sales", "en", client);
  assert.match(en, /Posted to ERP/);
  assert.match(en, /Pending review/);
  assert.match(en, /950\.00/);
  assert.match(en, /21 operations/);
  assert.match(en, /—/);
  assert.doesNotMatch(renderHistory("shifts", "ar", client), /OPS-0010/);
});

test("Head module history distinguishes loading from an empty server response", () => {
  const client = new QueryClient();
  assert.match(renderHistory("sales", "en", client), /Loading operations/);
  client.setQueryData(queryKeys.operations({ moduleKey: "sales", page: 1, pageSize: 20 }), {
    data: [],
    meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  });
  const empty = renderHistory("sales", "en", client);
  assert.match(empty, /No matching records in your scope/);
  assert.doesNotMatch(empty, /Loading operations/);
});
