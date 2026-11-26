import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

test("T4.1–T4.3: AccPurchases wires server filters, filtered export, halala precision, real attachment verify, and responsive RTL/LTR", () => {
  const accSrc = readFileSync(
    new URL("./_pages/accountant/AccPurchases.tsx", import.meta.url),
    "utf8",
  );
  const procGroupedSrc = readFileSync(
    new URL("./_pages/procurement/ProcGrouped.tsx", import.meta.url),
    "utf8",
  );
  const purchasesQueriesSrc = readFileSync(
    new URL("../../../api/queries/purchases.ts", import.meta.url),
    "utf8",
  );
  const mockupMapSrc = readFileSync(
    new URL("../../../.generated/mockup-components.ts", import.meta.url),
    "utf8",
  );

  // T4.1: Server-side filters + pagination + filtered export
  assert.match(accSrc, /serverFilterParams/, "AccPurchases must build serverFilterParams");
  assert.match(accSrc, /useAccountantPurchases\(\s*\{\s*\.\.\.serverFilterParams,\s*page,\s*pageSize:\s*20\s*\}/, "AccPurchases must pass serverFilterParams and pagination to useAccountantPurchases");
  assert.match(accSrc, /exportPurMut\.mutate\(\s*\{\s*\.\.\.serverFilterParams,\s*format:\s*"xlsx"\s*\}/, "Excel export must pass active serverFilterParams");

  // T4.1: Halala precision preserved in returns and daily average
  assert.doesNotMatch(accSrc, /Math\.round\(r\.totalReturnAmountHalalas\s*\/\s*100\)/, "Returns must not round halalas to whole riyals");
  assert.match(accSrc, /fmtAmt\(r\.totalReturnAmountHalalas\s*\/\s*100/, "Returns must preserve halala precision");
  assert.match(accSrc, /dailyAverageHalalas\s*!=\s*null\s*\?\s*g\.dailyAverageHalalas\s*\/\s*100/, "Daily average must use server dailyAverageHalalas / 100");

  // T4.1: Real attachment verification wired
  assert.match(accSrc, /useVerifyAttachment\(/, "PurchaseAttachmentModal must wire useVerifyAttachment");

  // T4.2: No hardcoded dir="rtl" in AccPurchases or ProcGrouped
  assert.doesNotMatch(accSrc, /dir="rtl"/, "AccPurchases must not hardcode dir=\"rtl\"");
  assert.doesNotMatch(procGroupedSrc, /dir="rtl"/, "ProcGrouped must not hardcode dir=\"rtl\"");
  assert.match(procGroupedSrc, /<div className="space-y-5" dir=\{dir\}>/, "ProcGrouped root must bind dir={dir}");
  assert.match(purchasesQueriesSrc, /getSiteLang\(\)/, "Purchase query toasts must respect active site language");

  // T4.3: Legacy mockup files removed cleanly
  assert.equal(existsSync(new URL("./PurchasesModule.tsx", import.meta.url)), false, "PurchasesModule.tsx must be removed");
  assert.equal(existsSync(new URL("./ProcurementDashboard.tsx", import.meta.url)), false, "ProcurementDashboard.tsx must be removed");
  assert.doesNotMatch(mockupMapSrc, /PurchasesModule|ProcurementDashboard/, "mockup-components.ts must not reference removed mockups");
});

test("Stage 4 localization: all fmtAmt calls in AccPurchases and ProcNewOrders pass lang for Western/Arabic digits", async () => {
  const { fmtAmt } = await import("./_shared/formatters.ts");
  assert.equal(fmtAmt(1234.5, "en"), "1,234.50");
  assert.match(fmtAmt(1234.5, "ar"), /[\u0660-\u0669]/);

  for (const rel of [
    "./_pages/accountant/AccPurchases.tsx",
    "./_pages/procurement/ProcNewOrders.tsx",
    "./_pages/procurement/ProcGrouped.tsx",
    "./_pages/procurement/ProcOverview.tsx",
    "./_pages/procurement/ProcSent.tsx",
    "./_pages/procurement/ProcItems.tsx",
    "./_pages/procurement/ProcSuppliers.tsx",
    "./_pages/head/HeadModulePage.tsx",
  ]) {
    const src = readFileSync(new URL(rel, import.meta.url), "utf8");
    const calls: string[] = [];
    for (let idx = src.indexOf("fmtAmt("); idx !== -1; idx = src.indexOf("fmtAmt(", idx + 7)) {
      let depth = 1;
      let i = idx + 7;
      while (i < src.length && depth > 0) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")") depth--;
        i++;
      }
      calls.push(src.slice(idx + 7, i - 1));
    }
    assert.ok(calls.length > 0, `${rel} should have fmtAmt calls`);
    for (const args of calls) {
      assert.match(args, /,\s*lang\s*$/, `${rel}: fmtAmt(${args}) must pass lang`);
    }
  }
});
