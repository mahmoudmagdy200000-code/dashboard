import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("DB-6: CompanyDashboard does not contain unused INITIAL_OPS mock array", () => {
  const compDashSource = readFileSync(
    new URL("./CompanyDashboard.tsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(
    compDashSource,
    /const\s+INITIAL_OPS\s*:\s*COp\[\]/,
    "CompanyDashboard must not declare unused INITIAL_OPS mock array"
  );
});
