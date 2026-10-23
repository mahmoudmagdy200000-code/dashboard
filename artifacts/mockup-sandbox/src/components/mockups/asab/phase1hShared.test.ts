import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { QueryClient } from "@tanstack/react-query";
import { purgeFinancialQueries } from "../../../auth/roleAccess.ts";

test("S1H-F06: role change removes shared/supplier caches but retains auth identity", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
  const sensitive = [["search", { q: "old" }], ["notifications"], ["support", "chat", "old"], ["platform", "supplier", "items"]];
  for (const key of sensitive) client.setQueryData(key, "old role data");
  client.setQueryData(["auth", "me"], "current identity");
  await purgeFinancialQueries(client);
  for (const key of sensitive) assert.equal(client.getQueryData(key), undefined);
  assert.equal(client.getQueryData(["auth", "me"]), "current identity");
  client.clear();
});

test("S1H-F06: a shared query completing after role purge cannot restore old data", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
  let resolve!: (value: string) => void;
  const pending = client.fetchQuery({ queryKey: ["search", "old"], queryFn: () => new Promise<string>(yes => { resolve = yes; }) });
  const outcome = pending.catch(() => "cancelled");
  await purgeFinancialQueries(client);
  resolve("old result"); await outcome;
  assert.equal(client.getQueryData(["search", "old"]), undefined);
  client.clear();
});

// Execute the actual parent callback, not a hand-copied async submit simulation.
function clarification(allowed = true) {
  const source = readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  const clarifyModalProps = {");
  const end = source.indexOf("\n  };", start) + 5;
  assert.ok(start >= 0 && end > start);
  const js = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  let closed = false, calls = 0, resolve!: () => void, reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  const lock = { current: false };
  const props = new Function("clarifyingId", "clarifyingOp", "runOperationAction", "clarifyMut", "setClarifyingId", "actionLock", "setActionsPending", js + ";return clarifyModalProps;")(
    "own-operation", { refNum: "synthetic" }, (_id: string, _action: string, effect: () => void) => { if (!allowed) return false; effect(); return true; },
    { mutate: () => { calls++; }, mutateAsync: () => { calls++; return promise; } },
    () => { closed = true; }, lock, () => {},
  );
  return { props, resolve, reject, lock, closed: () => closed, calls: () => calls };
}

test("S1H-F20: clarification parent keeps the modal open until the real mutation promise resolves", async () => {
  const state = clarification();
  const pending = state.props.onSubmit({ message: "synthetic clarification" });
  assert.equal(state.closed(), false);
  assert.equal(state.calls(), 1);
  state.resolve(); await pending;
  assert.equal(state.closed(), true);
});

for (const status of [403, 409]) test(`S1H-F20: clarification propagates ${status}, retains the modal and releases its lock`, async () => {
  const state = clarification();
  const pending = state.props.onSubmit({ message: "synthetic clarification" });
  assert.equal(state.closed(), false);
  state.reject({ status });
  await assert.rejects(pending, (error: any) => error.status === status);
  assert.equal(state.closed(), false);
  assert.equal(state.lock.current, false);
});

test("S1H-F20: denied clarification sends no mutation and does not close as success", async () => {
  const state = clarification(false);
  await assert.rejects(Promise.resolve(state.props.onSubmit({ message: "synthetic clarification" })));
  assert.equal(state.calls(), 0);
  assert.equal(state.closed(), false);
  state.resolve();
});

test("S1H-F20: duplicate clarification cannot send a second request", async () => {
  const state = clarification();
  const first = state.props.onSubmit({ message: "synthetic clarification" });
  await assert.rejects(Promise.resolve(state.props.onSubmit({ message: "duplicate" })));
  assert.equal(state.calls(), 1);
  state.resolve(); await first;
});

test("S1H-F07 source invariant: shared widgets never assign arbitrary server links to window.location.hash", () => {
  for (const file of ["GlobalSearch", "NotificationBell"]) {
    const source = readFileSync(new URL(`../../shared/${file}.tsx`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /window\.location\.hash\s*=/);
  }
});

import { hasCompanySharedApi, sharedSearchPage, sharedNotificationPage } from "../../shared/sharedNavigation.ts";
import { normalizeSearchResponse } from "../../../api/queries/misc.ts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ClarifyModal } from "../../shared/ClarifyModal.tsx";
import { RejectModal } from "../../shared/RejectModal.tsx";

// The existing tsx runner preserves classic JSX in this repo's tsconfig.
Object.assign(globalThis, { React });

test("S1H-F03/F04 negative display capability: no company shared API for platform/supplier/unknown", () => {
  for (const role of ["admin", "supplier", "cashier", "owner", undefined, ""]) assert.equal(hasCompanySharedApi(role), false);
  for (const role of ["company-admin", "head", "accountant", "branch", "procurement"]) assert.equal(hasCompanySharedApi(role), true);
});

test("S1H-F07: list navigation respects role, module and the actual visible menu", () => {
  assert.equal(sharedSearchPage("accountant", { type: "ops", moduleKey: "sales" }, ["acc-sales"]), "acc-sales");
  assert.equal(sharedSearchPage("head", { type: "ops", moduleKey: "sales" }, ["head-sales"]), "head-sales");
  assert.equal(sharedSearchPage("accountant", { type: "ops", moduleKey: "sales" }, ["head-sales"]), null);
  assert.equal(sharedSearchPage("branch", { type: "ops", moduleKey: "sales" }, ["acc-sales"]), null);
  assert.equal(sharedSearchPage("supplier", { type: "users" }, ["ca-users"]), null);
  assert.equal(sharedSearchPage("accountant", { type: "ops", moduleKey: "../admin-users" }, ["admin-users"]), null);
  assert.equal(sharedSearchPage("company-admin", { type: "users" }, ["ca-users"]), "ca-users");
});

test("S1H-F07: notifications reject external, preview, encoded and out-of-role links", () => {
  assert.equal(sharedNotificationPage("/head-sales", ["head-sales"]), "head-sales");
  for (const link of ["https://external.invalid", "#/preview/asab/ASABPrototype", "/acc-sales", "/head-sales?grant=all", "//head-sales", "/%68ead-sales", null]) {
    assert.equal(sharedNotificationPage(link, ["head-sales"]), null);
  }
});

test("S1H-F07: accepted FE search rows expose only established display fields", () => {
  assert.deepEqual(normalizeSearchResponse({ results: [{ id: "own", type: "ops", title: "Synthetic", publicId: "OPS-SYNTHETIC", moduleKey: "sales", secret: "excluded", link: "https://external.invalid" }] }), {
    results: [{ id: "own", type: "ops", title: "Synthetic", publicId: "OPS-SYNTHETIC", subtitle: undefined, moduleKey: "sales" }],
  });
});

test("S1H-F07: raw Backend groups are blocked pending contract/scope verification, never silently empty or exposed", () => {
  for (const payload of [null, [], { error: "denied" }, { operations: [{ id: "unverified", publicId: "cross-scope" }], branches: [], users: [], suppliers: [], assets: [], total: 1 }, { results: [{ name: "missing identity" }] }]) assert.throws(() => normalizeSearchResponse(payload));
});

test("S1H-F12/F13: real shared dialogs render named, labelled LTR/RTL markup (SSR unit, not browser)", () => {
  for (const english of [true, false]) {
    const t = (ar: string, en: string) => english ? en : ar;
    for (const Component of [ClarifyModal, RejectModal]) {
      const markup = renderToStaticMarkup(React.createElement(Component as any, { open: true, onClose() {}, onSubmit: async () => {}, t }));
      assert.ok(markup.includes(`dir="${english ? "ltr" : "rtl"}"`));
      assert.ok(markup.includes('role="dialog"'));
      assert.ok(markup.includes('aria-modal="true"'));
      assert.match(markup, /aria-labelledby="[^"]+"/);
      const labelledBy = /aria-labelledby="([^"]+)"/.exec(markup)![1];
      assert.ok(markup.includes(`id="${labelledBy}"`));
      assert.match(markup, /<label[^>]*for="[^"]+"/);
    }
  }
});

function chatSend() {
  const source = readFileSync(new URL("../../shared/LiveChatWidget.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  const handleSend = async");
  const end = source.indexOf("\n  };", start) + 5;
  const js = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let draft = "sent draft", calls = 0, resolve!: () => void, reject!: (e: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  const lock = { current: false };
  const handler = new Function("text", "sessionId", "sendMut", "sendLock", "setText", js + ";return handleSend;")(
    draft, "synthetic-session", { isPending: false, mutateAsync: () => { calls++; return promise; } }, lock,
    (value: string | ((old: string) => string)) => { draft = typeof value === "function" ? value(draft) : value; },
  );
  return { handler, resolve, reject, lock, draft: () => draft, setDraft: (value: string) => { draft = value; }, calls: () => calls };
}

test("S1H-F19: actual chat handler retains failed and newer drafts and synchronously blocks duplicates", async () => {
  for (const fail of [false, true]) {
    const state = chatSend(), event = { preventDefault() {} };
    const first = state.handler(event);
    await state.handler(event);
    assert.equal(state.calls(), 1);
    if (fail) state.reject({ status: 403 });
    else { state.setDraft("newer draft"); state.resolve(); }
    await first;
    assert.equal(state.draft(), fail ? "sent draft" : "newer draft");
    assert.equal(state.lock.current, false);
  }
});

test("S1H-F16/F17 source reconciliation: former orphan routes already have navigation", () => {
  const prototype = readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8");
  const company = readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8");
  assert.match(prototype, /\{ id: "admin-branch-requests", label:/);
  for (const page of ["branch-shifts", "branch-requests"]) assert.ok(company.includes(`id:"${page}"`));
});

test("S1H-F06/F14 source wiring: role-keyed chat and an installed mobile Sheet remain on actual routes", () => {
  const prototype = readFileSync(new URL("./ASABPrototype.tsx", import.meta.url), "utf8");
  const company = readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8");
  for (const source of [prototype, company]) assert.ok(source.includes("<LiveChatWidget key={currentRole}"));
  assert.ok(prototype.includes("<Sheet open={mobileOpen}"));
  assert.ok(prototype.includes('className="hidden md:flex"'));
  assert.ok(prototype.includes('aria-label={tL("فتح القائمة", "Open menu")}'));
});
