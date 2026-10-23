import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { fmtAmt } from "./_shared/formatters.ts";

const headSource = readFileSync(new URL("./_pages/head/HeadPending.tsx", import.meta.url), "utf8");
const headFile = ts.createSourceFile("HeadPending.tsx", headSource, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const headPending = headFile.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === "HeadPending",
);
assert.ok(headPending?.body, "HeadPending source must be present");

const kpiSource = readFileSync(new URL("./components/KpiCard.tsx", import.meta.url), "utf8");
const kpiFile = ts.createSourceFile("KpiCard.tsx", kpiSource, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const kpiFunction = kpiFile.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === "KpiCard",
);
assert.ok(kpiFunction, "KpiCard source must be present");
const compiledKpi = ts.transpileModule(kpiFunction.getText(kpiFile).replace(/^export\s+/, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, module: ts.ModuleKind.None },
}).outputText;
const KpiCard = new Function("React", `${compiledKpi}\nreturn KpiCard;`)(React) as React.ComponentType<{
  label: string; value: string; valueLabel?: string; sub?: string; icon: React.ReactNode;
}>;

const summary = (totalAmt: number | null) => fmtAmt(totalAmt);
const renderKpi = (title: string, value: string, valueLabel: string, unit: string) => renderToStaticMarkup(
  React.createElement(KpiCard, {
    label: title,
    value,
    valueLabel,
    sub: unit,
    icon: React.createElement("span", null, "icon"),
  }),
);

const legacyK = (amount: number) => (amount / 1000).toFixed(0) + "K";

test("B09 preserves the exact summary and existing K calculation for financial boundary fixtures", () => {
  const body = headPending.body!.getText(headFile);
  assert.match(body, /fmtAmt\(totalAmt\)/, "exact formatted total summary remains present");
  assert.match(body, /value=\{totalAmt != null \? `\$\{\(totalAmt \/ 1000\)\.toFixed\(0\)\}K` : "—"\}/,
    "the existing rounded-K expression and null fallback remain unchanged");

  const fixtures = [0, 499, 500, 999, 1000, 1499, 1500, 123456789];
  const before = ["0K", "0K", "1K", "1K", "1K", "1K", "2K", "123457K"];
  assert.deepEqual(fixtures.map(legacyK), before);
  assert.deepEqual(fixtures.map(amount => (amount / 1000).toFixed(0) + "K"), before,
    "the current display must match the pre-change calculation exactly");
  assert.deepEqual(fixtures.map(summary), [
    "٠٫٠٠", "٤٩٩٫٠٠", "٥٠٠٫٠٠", "٩٩٩٫٠٠", "١٬٠٠٠٫٠٠", "١٬٤٩٩٫٠٠", "١٬٥٠٠٫٠٠", "١٢٣٬٤٥٦٬٧٨٩٫٠٠",
  ], "exact formatted totals and precision remain unchanged for the same fixtures");
});

test("B09 renders one visible localized approximation label beside the unchanged KPI value", () => {
  const body = headPending.body!.getText(headFile);
  assert.match(body, /valueLabel=\{t\("تقريبي",\s*"Approximate"\)\}/,
    "HeadPending must use the existing AR/EN translation helper");

  for (const [title, label, unit] of [
    ["الإجمالي", "تقريبي", "ر.س"],
    ["Total", "Approximate", "SAR"],
  ] as const) {
    const markup = renderKpi(title, "2K", label, unit);
    assert.match(markup, />2K</);
    assert.match(markup, new RegExp(`>${label}<`));
    assert.equal(markup.split(label).length - 1, 1, "label is exposed once without duplicate screen-reader text");
    assert.match(markup, new RegExp(`>${unit}<`), "the existing unit remains unchanged");
    assert.match(markup, /flex-wrap/, "value and label can wrap without clipping a narrow card");
  }
});
