import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { ErrorBoundaryCore } from "./errorBoundaryCore.ts";

test("DB-R02: ErrorBoundaryCore captures error and provides derived state", () => {
  const err = new Error("Test render failure");
  const state = ErrorBoundaryCore.getDerivedStateFromError(err);
  assert.equal(state.hasError, true);
  assert.equal(state.error, err);
});

test("DB-R02: ErrorBoundaryCore reset resets state and invokes onReset callback", () => {
  let resetCalled = false;
  const core = new ErrorBoundaryCore(() => {
    resetCalled = true;
  });

  core.setError(new Error("Simulated crash"));
  assert.equal(core.hasError, true);
  assert.equal(core.error?.message, "Simulated crash");

  core.reset();
  assert.equal(resetCalled, true);
  assert.equal(core.hasError, false);
  assert.equal(core.error, null);
});

test("DB-R02: ErrorBoundary.tsx implements componentDidCatch and getDerivedStateFromError", () => {
  const filePath = new URL("./ErrorBoundary.tsx", import.meta.url);
  const content = readFileSync(filePath, "utf8");
  const source = ts.createSourceFile("ErrorBoundary.tsx", content, ts.ScriptTarget.Latest, true);

  const classNode = source.statements.find(
    (s): s is ts.ClassDeclaration => ts.isClassDeclaration(s) && s.name?.text === "ErrorBoundary",
  );
  assert.ok(classNode, "ErrorBoundary class must exist in ErrorBoundary.tsx");
  const text = classNode.getText(source);

  assert.ok(text.includes("getDerivedStateFromError"), "ErrorBoundary must implement getDerivedStateFromError");
  assert.ok(text.includes("componentDidCatch"), "ErrorBoundary must implement componentDidCatch");
  assert.ok(text.includes("role=\"alert\""), "ErrorBoundary must render accessible role=alert fallback");
  assert.ok(text.includes("إعادة المحاولة"), "ErrorBoundary must render retry button in fallback");
});
