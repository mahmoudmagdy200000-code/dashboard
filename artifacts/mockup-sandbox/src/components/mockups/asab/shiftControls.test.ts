import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { formatShiftHalalas } from "./shiftCountEvidence.ts";

function screen(file: string) {
  return ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
}

function component(source: ts.SourceFile, name: string) {
  const node = source.statements.find((item): item is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node?.body, `${name} is missing`);
  return node.getText(source);
}

test("company and accountant shift screens retain a review slot with no legacy close request path", () => {
  const company = screen("CompanyDashboard.tsx");
  const accShifts = screen("_pages/accountant/AccShifts.tsx");
  const prototypeRaw = readFileSync(new URL("ASABPrototype.tsx", import.meta.url), "utf8");
  assert.match(prototypeRaw, /import\s*\{[^}]*AccShifts[^}]*\}\s*from\s*["']\.\/_pages\/accountant\/AccShifts["']/);
  assert.equal(company.statements.some(node => ts.isFunctionDeclaration(node) && node.name?.text === "ShiftCloseCard"), false);
  assert.equal(accShifts.statements.some(node => ts.isFunctionDeclaration(node) && node.name?.text === "ShiftCloseCard"), false);
  for (const [source, name] of [[company, "AccCompanyShifts"], [accShifts, "AccShifts"]] as const) {
    const body = component(source, name);
    assert.match(body, /مراجعة الورديات/);
    assert.match(body, /tab ===? "close"|tab==="close"/);
    assert.doesNotMatch(body, /useCloseShift|closeShiftMut|submitClose|setTab\("close"\)|ShiftCloseCard|cashActualHalalas/);
    assert.doesNotMatch(body, /تأكيد إغلاق الشفت|onClick=\{doClose\}/);
  }
});

test("branch shift view renders API loading, error, empty and present states without mutation controls or sample data", () => {
  const body = component(screen("CompanyDashboard.tsx"), "BranchShifts");
  assert.doesNotMatch(body, /useBranchOpenShift|useBranchCloseShift|\.mutate\(|onClick=|<button|<Btn|<select|<input/);
  assert.doesNotMatch(body, /ليلى سالم|أنس محمد|registerOpeningHalalas:\s*50000|defaultValue="500"/);
  const js = ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, module: ts.ModuleKind.None } }).outputText;
  let response: Record<string, unknown> = {};
  const BranchShifts = new Function("React", "useCLang", "useBranchActiveShift", "formatShiftHalalas", `${js}\nreturn BranchShifts;`)(
    React,
    () => ({ t: (ar: string) => ar, dir: "rtl", lang: "ar" }),
    () => response,
    formatShiftHalalas,
  ) as React.ComponentType;
  const render = () => renderToStaticMarkup(React.createElement(BranchShifts));

  response = { isLoading: true };
  assert.match(render(), /جارٍ التحميل/);
  response = { isError: true };
  assert.match(render(), /تعذر تحميل/);
  response = { data: null };
  assert.match(render(), /لا يوجد شفت نشط/);
  response = { data: { id: "api-shift-id", supervisorName: "API supervisor", startedAt: "2026-10-16T08:00:00Z", registerOpeningHalalas: 1234 } };
  const present = render();
  assert.match(present, /api-shift-id/);
  assert.match(present, /API supervisor/);
  assert.ok(present.includes(formatShiftHalalas(1234, "ar")));
  assert.doesNotMatch(present, /ليلى سالم|أنس محمد|500 ر.س|<button|<input|<select/);
  response = { data: { id: "api-shift-id" } };
  assert.match(render(), /—/);
});
