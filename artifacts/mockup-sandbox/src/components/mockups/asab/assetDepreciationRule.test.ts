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

  // 3. Zero depreciation division formulas
  assert.equal(
    content.includes("/(usefulLife/12)"),
    false,
    "CompanyDashboard.tsx must not compute annual depreciation division",
  );
  assert.equal(
    content.includes("/usefulLife)"),
    false,
    "CompanyDashboard.tsx must not compute monthly depreciation division",
  );

  // 4. Status retired must be labeled 'مستبعد' instead of 'مُهلك'
  assert.equal(
    content.includes('retired:"مُهلك"'),
    false,
    "retired status must not be labeled 'مُهلك'",
  );
  assert.ok(
    content.includes('retired:"مستبعد"'),
    "retired status must be labeled 'مستبعد'",
  );

  // 5. Disclaimer note on useful life field
  assert.ok(
    content.includes("لا يُستخدم لحساب إهلاك"),
    "Useful life field must contain explicit disclaimer 'لا يُستخدم لحساب إهلاك'",
  );
});
