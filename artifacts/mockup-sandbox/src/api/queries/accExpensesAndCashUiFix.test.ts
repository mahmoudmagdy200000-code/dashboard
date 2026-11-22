import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

test("UI-ACC-01: AccExpensesPage preserves exact VAT halalas and avoids INVOICES['default'] fallback", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "components/mockups/asab/_pages/accountant/AccExpensesPage.tsx"),
    "utf8",
  );
  assert.ok(src.includes("expKpis.vat15Halalas / 100"), "VAT KPI must divide halalas without Math.round");
  assert.ok(!src.includes("Math.round(expKpis.vat15Halalas / 100)"), "VAT KPI must not round away halalas");
  assert.ok(!src.includes('INVOICES[op.id] || INVOICES["default"]'), "Fixed-asset alert must not fall back to mock default invoices");
});

test("UI-I18N-01: AccCash uses useLang() for English and Arabic translations", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "components/mockups/asab/_pages/accountant/AccCash.tsx"),
    "utf8",
  );
  assert.ok(src.includes('useLang } from "../../_shared/LangContext"'), "AccCash must import useLang");
  assert.ok(src.includes('t("طلبات تغذية عهدة الفرع", "Branch Custody Funding Requests")'));
  assert.ok(src.includes('t("إدارة العهد النقدية", "Cash Custody Management")'));
  assert.ok(src.includes('t("لا توجد عهد", "No custodies found")'));
});

test("UI-RESP-01: LiveChatWidget places FAB on opposite corner from RTL sidebar", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "components/shared/LiveChatWidget.tsx"),
    "utf8",
  );
  assert.ok(!src.includes("insetInlineEnd: 24"), "Must not use insetInlineEnd which overlaps RTL sidebar");
  assert.ok(src.includes('left: dir === "rtl" ? 24 : undefined'));
  assert.ok(src.includes('right: dir === "rtl" ? undefined : 24'));
});
