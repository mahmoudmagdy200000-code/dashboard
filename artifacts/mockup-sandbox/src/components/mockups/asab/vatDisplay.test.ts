import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("DB-4: AccExpensesPage does not use 1.15 division to fabricate missing VAT or pre-tax amounts", () => {
  const accExpSource = readFileSync(
    new URL("./_pages/accountant/AccExpensesPage.tsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(
    accExpSource,
    /\/\s*1\.15/,
    "AccExpensesPage must not divide by 1.15 to fabricate VAT"
  );
  assert.match(
    accExpSource,
    /amtBeforeVat != null \? `\$\{fmtAmt\(amtBeforeVat\)\} \$\{t\("ر\.س", "SAR"\)\}` : "—"/,
    "AccExpensesPage must show dash for missing pre-tax amount"
  );
  assert.match(
    accExpSource,
    /vatAmt != null \? `\$\{fmtAmt\(vatAmt\)\} \$\{t\("ر\.س", "SAR"\)\}` : "—"/,
    "AccExpensesPage must show dash for missing VAT amount"
  );
});

test("DB-4: CompanyDashboard does not use 1.15 division to fabricate missing pre-tax amounts", () => {
  const compDashSource = readFileSync(
    new URL("./CompanyDashboard.tsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(
    compDashSource,
    /\/\s*1\.15/,
    "CompanyDashboard must not divide by 1.15 to fabricate pre-tax amounts"
  );
});
