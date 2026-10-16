import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { formatShiftHalalas } from "./shiftCountEvidence.ts";

const source = ts.createSourceFile("CompanyDashboard.tsx", readFileSync(new URL("CompanyDashboard.tsx", import.meta.url), "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const panel = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "ShiftOpPanel");
assert.ok(panel?.body, "SHF detail panel must be in the existing company screen");
const compiled = ts.transpileModule(panel.getText(source), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, module: ts.ModuleKind.None },
}).outputText;
const ShiftOpPanel = new Function("React", "useCLang", "formatShiftHalalas", `${compiled}\nreturn ShiftOpPanel;`)(
  React, () => ({ t: (ar: string) => ar, lang: "ar" }), formatShiftHalalas,
) as React.ComponentType<{ detail?: unknown; loading?: boolean; error?: boolean }>;
const render = (props: { detail?: unknown; loading?: boolean; error?: boolean }) =>
  renderToStaticMarkup(React.createElement(ShiftOpPanel, props));

test("existing OpRow fetches SHF detail only when expanded and renders the read-only panel", () => {
  const row = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "OpRow");
  assert.ok(row?.body);
  const body = row.getText(source);
  assert.match(body, /useOperation\(expanded && \(op\.module === "sales" \|\| op\.module === "shifts"\)/);
  assert.match(body, /op\.module==="shifts" && <ShiftOpPanel/);
  assert.doesNotMatch(panel.getText(source), /\.mutate\(|onApprove|onReject|<button/);
});

const fin01 = {
  moduleKey: "shifts",
  payload: {
    salesHalalas: 11500, cardTotalHalalas: 5000, aggregatorTotalsHalalas: 2500,
    aggregatorBreakdown: [{ aggregatorName: "API app", amountHalalas: 2500 }],
    openingFloatHalalas: 1000, cashExpectedHalalas: 5000,
    cashActualHalalas: 3000, varianceHalalas: -2000,
    cashCountState: "counted", pendingIncomingCountedHalalas: 300,
    pkg6Review: { phase: "accountant_review", return_reason: "API reason" },
  },
  auditTrail: [{ icon: "check", action: "API action", by: "API actor", time: "API time" }],
};

test("SHF detail handles loading, error and absent detail separately", () => {
  assert.match(render({ loading: true }), /جارٍ تحميل/);
  assert.match(render({ error: true }), /تعذر تحميل/);
  assert.match(render({}), /تفاصيل الوردية غير متاحة/);
  assert.match(render({ detail: { moduleKey: "shifts" } }), /تفاصيل الوردية غير متاحة/);
});

test("FIN-01 uses server halalas, and configured opening never becomes confirmed receipt", () => {
  const html = render({ detail: fin01 });
  for (const value of [11500, 5000, 2500, 1000, 3000, -2000, 300]) {
    assert.ok(html.includes(formatShiftHalalas(value, "ar")), `${value} halalas missing`);
  }
  assert.match(html, /مجرود فعلياً/);
  assert.match(html, /عجز/);
  assert.match(html, /API app/);
  assert.match(html, /عند المحاسب/);
  assert.match(html, /API reason/);
  assert.match(html, /API action/);
  assert.match(html, /الافتتاحي المهيأ/);
  assert.match(html, /<span>الافتتاحي المؤكد<\/span><bdi>—<\/bdi>/);
  assert.doesNotMatch(html, /ضريبة القيمة المضافة|صافي المبيعات|VAT|Net/);
});

test("unknown and null counts never assert a cash count, match or zero variance", () => {
  for (const cashCountState of ["unknown", null, undefined]) {
    const detail = { ...fin01, payload: { ...fin01.payload, cashCountState, cashActualHalalas: 0, varianceHalalas: 0 } };
    const html = render({ detail });
    assert.match(html, cashCountState === "unknown" ? /غير مجرود/ : /<span>حالة الجرد<\/span><strong>—<\/strong>/);
    assert.doesNotMatch(html, /مجرود فعلياً|متطابق/);
  }
});

test("missing and malformed financial evidence remains unavailable without calculated defaults", () => {
  const html = render({ detail: { ...fin01, payload: { cashCountState: "counted", salesHalalas: 1.5, varianceHalalas: null } } });
  assert.match(html, /قيمة غير صالحة/);
  assert.match(html, /—/);
  assert.doesNotMatch(html, /0\.00|متطابق|صافي/);
});

test("BD-2 liability preserves redacted identities and treats version as allocation version", () => {
  const detail = { ...fin01, liability: {
    version: 4, managerApprovalStatus: "pending", createdByType: "branch_manager",
    shares: [{ type: "employee", id: null, name: null, amountHalalas: 2000 }],
  } };
  const html = render({ detail });
  assert.match(html, /نسخة توزيع المسؤولية/);
  assert.match(html, /اعتماد المدير/);
  assert.match(html, /قيد الاعتماد/);
  assert.match(html, /employee/);
  assert.match(html, /هوية المسؤول غير متاحة/);
  assert.ok(html.includes(formatShiftHalalas(2000, "ar")));
  assert.doesNotMatch(html, /الموظف غير موجود|مراجعة التقرير|معتمد من المدير|undefined|null/);
  const noLiability = render({ detail: fin01 });
  assert.doesNotMatch(noLiability, /معتمد من المدير/);
  assert.match(render({ detail: { ...detail, liability: { ...detail.liability, managerApprovalStatus: "approved" } } }), /معتمد من المدير/);
});

test("operation variance allocations are shown only when the API supplies rows", () => {
  assert.doesNotMatch(render({ detail: fin01 }), /تخصيصات الفرق من العملية/);
  const detail = { ...fin01, payload: { ...fin01.payload, varianceAllocations: [{ amountHalalas: 500 }] } };
  const html = render({ detail });
  assert.match(html, /تخصيصات الفرق من العملية/);
  assert.ok(html.includes(formatShiftHalalas(500, "ar")));
});
