import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatPlanPrice, calculateBillingKpis } from "./companyAdminGuards.ts";
import { formatHalalasAmount } from "../../../api/money.ts";

test("DB-1: formatHalalasAmount preserves exact fractions for negative and fractional halalas", () => {
  assert.equal(formatHalalasAmount(-40, "en"), "-0.40");
  assert.equal(formatHalalasAmount(-150, "en"), "-1.50");
  assert.equal(formatHalalasAmount(1999, "en"), "19.99");
  assert.equal(formatHalalasAmount(0, "en"), "0.00");
  assert.equal(formatHalalasAmount(null, "en"), "—");
  assert.equal(formatHalalasAmount(undefined, "en"), "—");
});

test("DB-1: formatPlanPrice preserves fractional halalas and does not round 1999 to 20", () => {
  const r1 = formatPlanPrice(1999, "en");
  assert.equal(r1.formatted, "19.99");
  assert.equal(r1.isCustom, false);

  const r2 = formatPlanPrice(2000, "en");
  assert.equal(r2.formatted, "20");

  const r3 = formatPlanPrice(null, "en");
  assert.equal(r3.formatted, "Custom");
  assert.equal(r3.isCustom, true);
});

test("DB-1: calculateBillingKpis preserves exact halalas without Math.round truncation", () => {
  const kpis = calculateBillingKpis(
    [],
    { totalPaidHalalas: 1999, outstandingHalalas: 150 },
    null
  );
  assert.equal(kpis.totalPaid, 19.99);
  assert.equal(kpis.companyTotalDue, 1.5);
});

test("DB-1: OpRow renders exact sales breakdown amounts without Math.round truncation", () => {
  const opRowSource = readFileSync(
    new URL("./_shared/OpRow.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    opRowSource,
    /Math\.round\(op\.salesBreakdown/,
    "OpRow must not use Math.round on salesBreakdown amounts"
  );
  assert.match(
    opRowSource,
    /fmtAmt\(op\.salesBreakdown\.varianceHalalas \/ 100\)/,
    "OpRow must format exact varianceHalalas / 100"
  );
});
