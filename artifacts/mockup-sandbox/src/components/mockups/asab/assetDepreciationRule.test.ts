import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("T020: Enforce Rule ASSET-01 - Zero depreciation calculations or KPIs in CompanyDashboard.tsx", () => {
  const filePath = new URL("./CompanyDashboard.tsx", import.meta.url);
  const content = readFileSync(filePath, "utf8");

  // 1. Zero totalDep calculation or usage
  assert.equal(
    content.includes("totalDep"),
    false,
    "CompanyDashboard.tsx must not calculate or reference totalDep",
  );

  // 2. Zero 'الاستهلاك السنوي' or 'الاستهلاك الشهري'
  assert.equal(
    content.includes("الاستهلاك السنوي"),
    false,
    "CompanyDashboard.tsx must not display 'الاستهلاك السنوي'",
  );
  assert.equal(
    content.includes("الاستهلاك الشهري"),
    false,
    "CompanyDashboard.tsx must not display 'الاستهلاك الشهري'",
  );

  // 3. Zero 'الاستهلاك' or 'Depr.' labels in asset draft summary
  assert.equal(
    content.includes('t("الاستهلاك","Depr.")'),
    false,
    "CompanyDashboard.tsx must not display asset draft depreciation label",
  );

  // 4. Zero depreciation division formulas across all variable patterns (e.g. d.amount/(d.usefulLife/12) or cost/usefulLife)
  const deprFormulaRegex = /\/\s*\(?\s*(?:[a-zA-Z0-9_]+\.)?usefulLife/i;
  assert.equal(
    deprFormulaRegex.test(content),
    false,
    "CompanyDashboard.tsx must not contain any division by usefulLife formula",
  );

  // 5. Status retired must be labeled 'مستبعد' instead of 'مُهلك'
  assert.equal(
    content.includes('retired:"مُهلك"'),
    false,
    "retired status must not be labeled 'مُهلك'",
  );
  assert.ok(
    content.includes('retired:"مستبعد"'),
    "retired status must be labeled 'مستبعد'",
  );

  // 6. Disclaimer note on useful life field
  assert.ok(
    content.includes("لا يُستخدم لحساب إهلاك"),
    "Useful life field must contain explicit disclaimer 'لا يُستخدم لحساب إهلاك'",
  );
});

test("T020: Enforce Rule ASSET-01 - Zero depreciation calculations and mandatory disclaimer in AccAssets.tsx", () => {
  const filePath = new URL("./_pages/accountant/AccAssets.tsx", import.meta.url);
  const content = readFileSync(filePath, "utf8");

  // 1. Must contain explicit disclaimer note on useful life
  assert.ok(
    content.includes("لا يُستخدم لحساب إهلاك"),
    "AccAssets.tsx must contain explicit disclaimer 'لا يُستخدم لحساب إهلاك' on useful life",
  );

  // 2. Zero depreciation division formulas
  const deprFormulaRegex = /\/\s*\(?\s*(?:[a-zA-Z0-9_]+\.)?usefulLife\b/i;
  assert.equal(
    deprFormulaRegex.test(content),
    false,
    "AccAssets.tsx must not contain any division by usefulLife formula",
  );

  // 3. Zero 'الاستهلاك السنوي' or 'الاستهلاك الشهري'
  assert.equal(
    content.includes("الاستهلاك السنوي"),
    false,
    "AccAssets.tsx must not display 'الاستهلاك السنوي'",
  );
  assert.equal(
    content.includes("الاستهلاك الشهري"),
    false,
    "AccAssets.tsx must not display 'الاستهلاك الشهري'",
  );
});
