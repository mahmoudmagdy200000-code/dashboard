import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// The pure logic specified by Rule DIFF-04
const hasEmployeeDebitWarning = (
  statement?: { hasDebitBalance?: boolean; autoDeductFromSalary?: boolean } | null
): boolean => {
  return Boolean(statement?.hasDebitBalance ?? statement?.autoDeductFromSalary);
};

test("T024: hasEmployeeDebitWarning returns true when hasDebitBalance is true (backend v3.5)", () => {
  assert.equal(hasEmployeeDebitWarning({ hasDebitBalance: true, autoDeductFromSalary: false }), true);
  assert.equal(hasEmployeeDebitWarning({ hasDebitBalance: true }), true);
});

test("T024: hasEmployeeDebitWarning returns false when hasDebitBalance is explicitly false, overriding autoDeductFromSalary", () => {
  assert.equal(hasEmployeeDebitWarning({ hasDebitBalance: false, autoDeductFromSalary: true }), false);
  assert.equal(hasEmployeeDebitWarning({ hasDebitBalance: false }), false);
});

test("T024: hasEmployeeDebitWarning falls back to autoDeductFromSalary when hasDebitBalance is undefined (legacy compatibility)", () => {
  assert.equal(hasEmployeeDebitWarning({ autoDeductFromSalary: true }), true);
  assert.equal(hasEmployeeDebitWarning({ autoDeductFromSalary: false }), false);
});

test("T024: hasEmployeeDebitWarning returns false when both are undefined or statement is nullish", () => {
  assert.equal(hasEmployeeDebitWarning({}), false);
  assert.equal(hasEmployeeDebitWarning(null), false);
  assert.equal(hasEmployeeDebitWarning(undefined), false);
});

test("T024: formatters.ts exports hasEmployeeDebitWarning implementing Rule DIFF-04 nullish coalescing", () => {
  const fileUrl = new URL("./_shared/formatters.ts", import.meta.url);
  const content = readFileSync(fileUrl, "utf8");
  const source = ts.createSourceFile("formatters.ts", content, ts.ScriptTarget.Latest, true);

  assert.ok(
    content.includes("export const hasEmployeeDebitWarning"),
    "formatters.ts must export hasEmployeeDebitWarning",
  );
  assert.ok(
    content.includes("statement?.hasDebitBalance ?? statement?.autoDeductFromSalary"),
    "hasEmployeeDebitWarning must evaluate statement?.hasDebitBalance ?? statement?.autoDeductFromSalary",
  );
});

test("T024: Static analysis - AccEmployees.tsx evaluates hasEmployeeDebitWarning without bare autoDeductFromSalary", () => {
  const fileUrl = new URL("./_pages/accountant/AccEmployees.tsx", import.meta.url);
  const content = readFileSync(fileUrl, "utf8");
  assert.equal(
    /statement\?\.autoDeductFromSalary\s*&&/.test(content),
    false,
    "AccEmployees.tsx must not use bare statement?.autoDeductFromSalary && without hasDebitBalance fallback",
  );
  assert.equal(
    content.includes("hasEmployeeDebitWarning"),
    true,
    "AccEmployees.tsx must evaluate hasEmployeeDebitWarning",
  );
});

test("T024: Static analysis - CompanyDashboard.tsx evaluates hasEmployeeDebitWarning without bare autoDeductFromSalary", () => {
  const fileUrl = new URL("./CompanyDashboard.tsx", import.meta.url);
  const content = readFileSync(fileUrl, "utf8");
  assert.equal(
    /statement\?\.autoDeductFromSalary\s*&&/.test(content),
    false,
    "CompanyDashboard.tsx must not use bare statement?.autoDeductFromSalary && without hasDebitBalance fallback",
  );
  assert.equal(
    content.includes("hasEmployeeDebitWarning"),
    true,
    "CompanyDashboard.tsx must evaluate hasEmployeeDebitWarning",
  );
});
