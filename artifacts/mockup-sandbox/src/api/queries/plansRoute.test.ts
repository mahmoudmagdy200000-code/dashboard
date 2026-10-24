import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("T016: useCompanyPlans queries active backend endpoint GET /plans instead of /company/plans", () => {
  const filePath = new URL("./companyAdmin.ts", import.meta.url);
  const content = readFileSync(filePath, "utf8");
  const source = ts.createSourceFile("companyAdmin.ts", content, ts.ScriptTarget.Latest, true);

  const fnNode = source.statements.find(
    (s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && s.name?.text === "useCompanyPlans",
  );
  assert.ok(fnNode, "useCompanyPlans function must exist in companyAdmin.ts");
  const text = fnNode.getText(source);

  assert.equal(
    text.includes('"/company/plans"'),
    false,
    "useCompanyPlans must not query non-existent /company/plans",
  );
  assert.ok(
    text.includes('"/plans"'),
    "useCompanyPlans must query active backend route /plans",
  );
});
