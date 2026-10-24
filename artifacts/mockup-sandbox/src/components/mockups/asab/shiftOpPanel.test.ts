import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { formatShiftHalalas } from "./shiftCountEvidence.ts";
import { getShfAllocationEvidence } from "./shiftAllocationCorrection.ts";

const source = ts.createSourceFile("CompanyDashboard.tsx", readFileSync(new URL("CompanyDashboard.tsx", import.meta.url), "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const panel = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "ShiftOpPanel");
assert.ok(panel?.body, "SHF detail panel must be in the existing company screen");
const compiled = ts.transpileModule(panel.getText(source), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, module: ts.ModuleKind.None },
}).outputText;
const ShiftOpPanel = new Function("React", "useCLang", "formatShiftHalalas", "getShfAllocationEvidence", "ShiftAllocationForm", `${compiled}\nreturn ShiftOpPanel;`)(
  React, () => ({ t: (ar: string) => ar, lang: "ar" }), formatShiftHalalas, getShfAllocationEvidence,
  () => React.createElement("div", null, "allocation form"),
) as React.ComponentType<{ op?: unknown; forHead?: boolean; detail?: unknown; loading?: boolean; error?: boolean }>;
const render = (props: { op?: unknown; forHead?: boolean; detail?: unknown; loading?: boolean; error?: boolean }) =>
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
    aggregatorBreakdown: [{ aggregatorId: "private-app-id", amountHalalas: 2500, internalField: "hidden-app" }],
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

test("allocation form appears only to accountant for a pending counted shortage with shiftId", () => {
  const op = {id:"op-fin01",module:"shifts",status:"pending",reportReview:{phase:"accountant_review"}};
  const detail = {...fin01,id:"op-fin01",status:"pending",payload:{...fin01.payload,shiftId:"admin-shift-id"}};
  assert.match(render({op,detail}),/allocation form/);
  assert.doesNotMatch(render({op,detail,forHead:true}),/allocation form/);
  assert.doesNotMatch(render({op,detail:{...detail,payload:{...detail.payload,varianceHalalas:0}}}),/allocation form/);
  assert.doesNotMatch(render({op,detail:{...detail,payload:{...detail.payload,cashCountState:"unknown"}}}),/allocation form/);
  assert.doesNotMatch(render({op,detail:{...detail,reportReview:{phase:"head_returned"}}}),/allocation form/);
});

test("FIN-01 uses server halalas, and configured opening never becomes confirmed receipt", () => {
  const html = render({ detail: fin01 });
  for (const value of [11500, 5000, 2500, 1000, 3000, -2000, 300]) {
    assert.ok(html.includes(formatShiftHalalas(value, "ar")), `${value} halalas missing`);
  }
  assert.match(html, /مجرود فعلياً/);
  assert.match(html, /عجز/);
  assert.match(html, /تفاصيل التطبيق غير متاحة/);
  assert.doesNotMatch(html, /private-app-id|hidden-app|aggregatorId|internalField|amountHalalas/);
  assert.match(html, /عند المحاسب/);
  assert.match(html, /API reason/);
  assert.match(html, /API action/);
  assert.match(html, /الافتتاحي المهيأ/);
  assert.match(html, /<span>الافتتاحي المؤكد<\/span><bdi>—<\/bdi>/);
  assert.doesNotMatch(html, /ضريبة القيمة المضافة|صافي المبيعات|VAT|Net/);
});

test("pending incoming appears separately only for a positive safe integer halala amount", () => {
  const label = "نقدية واردة معلّقة (خارج الفرق)";
  const positive = render({ detail: fin01 });
  assert.match(positive, /نقدية واردة معلّقة/);
  assert.ok(positive.includes(formatShiftHalalas(300, "ar")));
  for (const value of [0, null, undefined, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "300"]) {
    const html = render({ detail: { ...fin01, payload: { ...fin01.payload, pendingIncomingCountedHalalas: value } } });
    assert.equal(html.includes(label), false, String(value));
    assert.match(html, /عجز/);
    assert.ok(html.includes(formatShiftHalalas(-2000, "ar")), "server variance must stay unchanged");
  }
  const { pendingIncomingCountedHalalas: _missing, ...withoutPending } = fin01.payload;
  assert.equal(render({ detail: { ...fin01, payload: withoutPending } }).includes(label), false);
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
  assert.doesNotMatch(render({ detail: fin01 }), /تخصيصات الفرق التاريخية من العملية/);
  const detail = { ...fin01, payload: { ...fin01.payload, varianceAllocations: [{ amountHalalas: 500, employeeId: "private-employee-id", internalField: "hidden-allocation" }] } };
  const html = render({ detail });
  assert.match(html, /تخصيصات الفرق التاريخية من العملية/);
  assert.match(html, /تفاصيل التخصيص غير متاحة/);
  assert.doesNotMatch(html, /private-employee-id|hidden-allocation|employeeId|internalField|amountHalalas/);
  assert.equal(html.includes(`>${formatShiftHalalas(500, "ar")}</bdi>`), false);
});

test("FIN-01 confirmed receipt of 10.00 SAR (1,000 halalas) is displayed correctly with no double counting in Expected Cash", () => {
  const withConfirmedReceipt = {
    ...fin01,
    payload: {
      ...fin01.payload,
      confirmedOpeningHalalas: 1000,
      openingFloatHalalas: 5000,
      cashExpectedHalalas: 5000,
    },
  };
  const html = render({ detail: withConfirmedReceipt });
  assert.match(html, /الافتتاحي المهيأ/);
  assert.ok(html.includes(formatShiftHalalas(5000, "ar")), "Configured opening 50.00 SAR (5000 halalas) displayed");
  assert.match(html, /الافتتاحي المؤكد/);
  assert.ok(html.includes(formatShiftHalalas(1000, "ar")), "Confirmed opening 10.00 SAR (1000 halalas) displayed");
  assert.ok(html.includes(formatShiftHalalas(5000, "ar")), "Expected cash remains exact server value (50.00 SAR)");
  assert.doesNotMatch(html, /60\.00|6,000/, "Opening cash is never double counted into Expected Cash in React");
});
