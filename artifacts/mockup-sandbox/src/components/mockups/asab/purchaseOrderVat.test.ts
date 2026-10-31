import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("DB-5: Purchase order creation does not hardcode 15% VAT assumption", () => {
  const compDashSource = readFileSync(
    new URL("./CompanyDashboard.tsx", import.meta.url),
    "utf8"
  );

  // Must not calculate estimated VAT using 0.15 on subtotalSar
  assert.doesNotMatch(
    compDashSource,
    /subtotalSar\s*\*\s*0\.15/,
    "Purchase order must not calculate estimated VAT with hardcoded 0.15"
  );

  // Must retain PUR-05 compliance notice
  assert.match(
    compDashSource,
    /PUR-05/,
    "PUR-05 notice must remain in CompanyDashboard"
  );
});
