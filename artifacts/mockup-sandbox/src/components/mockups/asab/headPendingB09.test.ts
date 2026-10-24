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

const summaryKpi = (() => {
  let found: import("typescript").JsxSelfClosingElement | undefined;
  const visit = (node: import("typescript").Node) => {
    if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) && node.tagName.text === "KpiCard") {
      const value = node.attributes.properties.find(property =>
        ts.isJsxAttribute(property) && property.name.getText(headFile) === "value",
      );
      if (value?.getText(headFile).includes("totalAmt / 1000")) found = node;
    }
    if (!found) ts.forEachChild(node, visit);
  };
  visit(headPending.body!);
  assert.ok(found, "HeadPending summary KPI must exist");
  return found;
})();

const getKpiExpression = (name: string) => {
  const attribute = summaryKpi.attributes.properties.find(property =>
    ts.isJsxAttribute(property) && property.name.getText(headFile) === name,
  );
  assert.ok(attribute && ts.isJsxAttribute(attribute) && attribute.initializer && ts.isJsxExpression(attribute.initializer));
  assert.ok(attribute.initializer.expression, `${name} must have an expression`);
  return attribute.initializer.expression.getText(headFile);
};

const valueExpression = getKpiExpression("value");
const valueLabelExpression = getKpiExpression("valueLabel");
const evaluateKpiExpression = (expression: string, totalAmt: number | null, t: (ar: string, en: string) => string) =>
  new Function("totalAmt", "t", `return (${expression});`)(totalAmt, t) as string | undefined;

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
  assert.match(valueExpression, /^totalAmt != null \? `\$\{\(totalAmt \/ 1000\)\.toFixed\(0\)\}K` : "—"$/,
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

test("B09 omits the approximation label for null while preserving the placeholder and unit", () => {
  for (const [title, label, unit] of [
    ["الإجمالي", "تقريبي", "ر.س"],
    ["Total", "Approximate", "SAR"],
  ] as const) {
    const t = (ar: string, en: string) => title === "الإجمالي" ? ar : en;
    const value = evaluateKpiExpression(valueExpression, null, t);
    const valueLabel = evaluateKpiExpression(valueLabelExpression, null, t);
    const markup = renderKpi(title, String(value), String(valueLabel ?? ""), unit);
    assert.match(markup, />—</, "null total keeps the existing unavailable marker");
    assert.doesNotMatch(markup, new RegExp(label), "null total must not be described as approximate");
    assert.match(markup, new RegExp(`>${unit}<`), "the existing unit remains unchanged");
  }
});

test("B09 shows the localized approximation label for zero and numeric boundary values", () => {
  assert.match(valueLabelExpression, /^totalAmt != null \? t\("تقريبي",\s*"Approximate"\) : undefined$/,
    "HeadPending labels only a present numeric total using the existing translation helper");

  for (const [title, label, unit] of [
    ["الإجمالي", "تقريبي", "ر.س"],
    ["Total", "Approximate", "SAR"],
  ] as const) {
    const t = (ar: string, en: string) => title === "الإجمالي" ? ar : en;
    const zeroValue = evaluateKpiExpression(valueExpression, 0, t);
    const zeroLabel = evaluateKpiExpression(valueLabelExpression, 0, t);
    const zeroMarkup = renderKpi(title, String(zeroValue), String(zeroLabel ?? ""), unit);
    assert.match(zeroMarkup, />0K</, "zero is a numeric value and retains its current K display");
    assert.match(zeroMarkup, new RegExp(`>${label}<`));
    assert.equal(zeroMarkup.split(label).length - 1, 1, "localized approximation text is visible once");
    assert.match(zeroMarkup, new RegExp(`>${unit}<`));
  }

  for (const amount of [499, 500, 999, 1000, 1499, 1500, 123456789]) {
    const value = evaluateKpiExpression(valueExpression, amount, (ar, en) => en);
    const valueLabel = evaluateKpiExpression(valueLabelExpression, amount, (ar, en) => en);
    assert.equal(value, legacyK(amount), `the existing K result remains unchanged for ${amount}`);
    assert.equal(valueLabel, "Approximate", `numeric value ${amount} retains the label`);
  }

  assert.ok(KpiCard, "render checks use the production KPI component");
});
