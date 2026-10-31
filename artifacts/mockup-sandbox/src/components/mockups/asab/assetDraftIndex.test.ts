import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("DB-2: assetDraft addDraft preserves invoiceIndex and does not hardcode invoiceIndex: 0", () => {
  const assetDraftSource = readFileSync(
    new URL("./_shared/assetDraft.tsx", import.meta.url),
    "utf8"
  );

  // Assert that addDraft doesn't unconditionally hardcode invoiceIndex: 0
  assert.doesNotMatch(
    assetDraftSource,
    /invoiceIndex:\s*0\s*,/,
    "_shared/assetDraft.tsx must not hardcode invoiceIndex: 0"
  );
  assert.match(
    assetDraftSource,
    /invoiceIndex:\s*d\.invoiceIndex/,
    "_shared/assetDraft.tsx must pass d.invoiceIndex"
  );
});

test("DB-2: AccExpensesPage binds invoice index to convert modal and ConvertToAssetModal", () => {
  const accExpSource = readFileSync(
    new URL("./_pages/accountant/AccExpensesPage.tsx", import.meta.url),
    "utf8"
  );

  assert.match(
    accExpSource,
    /invoiceIndex:\s*(?:invIndex|inv\.index)/,
    "AccExpensesPage must pass invoiceIndex from mapped invoice to convertModal"
  );
  assert.match(
    accExpSource,
    /<ConvertToAssetModal[\s\S]*?invoiceIndex=/,
    "AccExpensesPage must pass invoiceIndex prop to ConvertToAssetModal"
  );
});
