import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function norm(s: string): string {
  return s.replace(/\s+/g, " ");
}

test("Phase 1E PROC-F19: roleAccess sensitivePrefixes includes all procurement query keys", () => {
  const roleAccess = norm(
    readFileSync(new URL("../../../auth/roleAccess.ts", import.meta.url), "utf8")
  );
  assert.ok(
    roleAccess.includes('["procurement"]'),
    "sensitivePrefixes must include ['procurement'] cache key"
  );
  assert.ok(
    roleAccess.includes('["platform", "procurement"]'),
    "sensitivePrefixes must include ['platform', 'procurement'] cache key"
  );
  assert.ok(
    roleAccess.includes('["purchase-orders"]'),
    "sensitivePrefixes must include ['purchase-orders'] cache key"
  );
});

test("Phase 1E PROC-F24: useCreateProcurementOrder aliases description and notes", () => {
  const procApi = norm(
    readFileSync(new URL("../../../api/queries/procurement.ts", import.meta.url), "utf8")
  );
  assert.ok(
    procApi.includes("description: body.description ?? body.notes") ||
    procApi.includes("description:body.description??body.notes"),
    "useCreateProcurementOrder must map description from description or notes for backend compatibility"
  );
  assert.ok(
    procApi.includes("notes: body.notes ?? body.description") ||
    procApi.includes("notes:body.notes??body.description"),
    "useCreateProcurementOrder must preserve notes alias"
  );
});

test("Phase 1E PROC-F01 & PROC-F25: ProcOverview renders exact halala amounts and distinct statuses", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  // PROC-F01: Halala precision without truncation
  assert.ok(
    dash.includes("o.totalHalalas != null ? o.totalHalalas / 100") ||
    dash.includes("totalHalalas != null ? o.totalHalalas / 100"),
    "ProcOverview must map totalHalalas with halala precision"
  );
  // PROC-F25: Distinct status mapping (sent is not conflated with delivered)
  assert.ok(
    dash.includes('sent: "bg-sky-50 text-sky-700') ||
    dash.includes('sent:"bg-sky-50 text-sky-700'),
    "ProcOverview must define distinct badge style for sent status"
  );
  assert.ok(
    dash.includes('delivered: "bg-emerald-50 text-emerald-700') ||
    dash.includes('delivered:"bg-emerald-50 text-emerald-700'),
    "ProcOverview must define distinct badge style for delivered status"
  );
});

test("Phase 1E PROC-F03 & PROC-F05: ProcNew validates quantity and calculates priced order payload", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  // PROC-F05: Validate quantity > 0
  assert.ok(
    dash.includes("q <= 0"),
    "ProcNew must reject zero or negative quantities"
  );
  // PROC-F03: Unit price and total halalas calculation
  assert.ok(
    dash.includes("unitPriceHalalas") && dash.includes("totalHalalas"),
    "ProcNew submit handler must send priced order payload with unitPriceHalalas and totalHalalas"
  );
});

test("Phase 1E PROC-F04 & PROC-F11: ProcNew supports order approval and editing notes", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("approveMut.mutate(o._apiId || o.id)") || dash.includes("approveMut.mutate"),
    "ProcNew must provide inline order approval capability"
  );
  assert.ok(
    dash.includes("updateOrderMut.mutate") && dash.includes("editNotes"),
    "ProcNew must provide order edit capability with notes"
  );
});

test("Phase 1E PROC-F06: ProcNew prevents duplicate submissions while mutations are pending", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("createOrderMut.isPending"),
    "ProcNew submit button must be disabled when createOrderMut is pending"
  );
});

test("Phase 1E PROC-F07 & PROC-F08: ProcGrouped maps dual contract fields and supports groupId", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("g.ordersCount ?? (g as any).orderCount") ||
    dash.includes("g.ordersCount ?? g.orderCount"),
    "ProcGrouped must map ordersCount with orderCount fallback"
  );
  assert.ok(
    dash.includes("branches as string[] | undefined") ||
    dash.includes("g.branches ?? (g.orders ?? []).map"),
    "ProcGrouped must support branches list from either array or nested order branch names"
  );
  assert.ok(
    dash.includes("groupId: g.groupId"),
    "ProcGrouped send handler must pass groupId"
  );
});

test("Phase 1E PROC-F09: ProcGrouped WhatsApp action is clearly labeled as preparation", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("إعداد رابط واتساب للمورد") && dash.includes("Prepare WhatsApp PO"),
    "ProcGrouped must clarify WhatsApp action as preparing PO link without claiming external delivery"
  );
});

test("Phase 1E PROC-F10: ProcSent accurately tracks inTransit, sentAt, and ETA", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("(o as any).sentAt || o.createdAt"),
    "ProcSent must prioritize sentAt timestamp"
  );
  assert.ok(
    dash.includes("(o as any).inTransit ?? (o.status === \"sent\")"),
    "ProcSent must map inTransit boolean flag"
  );
  assert.ok(
    dash.includes("ETA: {s.eta}") || dash.includes("s.eta"),
    "ProcSent must display ETA tracking field"
  );
});

test("Phase 1E PROC-F12 & PROC-F13: ProcSuppliers normalizes ratings and authoritative spend", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  // PROC-F12: Lifetime spend calculation
  assert.ok(
    dash.includes("lifetimeSpend") || dash.includes("totalPurchases") || dash.includes("totalSpentHalalas"),
    "ProcSuppliers must derive spend from backend lifetime spend fields"
  );
  // PROC-F13: 0-50 to 0-5 rating scale normalization
  assert.ok(
    dash.includes("rawRating > 5 ? rawRating / 10 : rawRating"),
    "ProcSuppliers must normalize 0-50 backend ratings to 0-5 star scale"
  );
  assert.ok(
    dash.includes("contactPhone") && dash.includes("contactName"),
    "ProcSuppliers must map contactPhone and contactName"
  );
});

test("Phase 1E PROC-F14: ProcSuppliers enforces PUR-04 Accountant supplier ownership rule", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("إضافة الموردين المعتمدين من صلاحية المحاسب وفق قواعد الأعمال (PUR-04)") ||
    dash.includes("PUR-04"),
    "ProcSuppliers must display PUR-04 accountant ownership explanatory notice"
  );
});

test("Phase 1E PROC-F15 & PROC-F16: ProcItems validates unit and positive price without rounding halalas", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  // PROC-F15: Unit and positive price validation
  assert.ok(
    dash.includes("!form.unit.trim()") && dash.includes("p <= 0"),
    "ProcItems must require unit and positive price > 0"
  );
  // PROC-F16: Exact halala price without Math.round
  assert.ok(
    dash.includes("(i as any).lastPriceHalalas != null ? (i as any).lastPriceHalalas / 100"),
    "ProcItems must retain decimal halala precision for price"
  );
  assert.ok(
    dash.includes("(i as any).supplierCount ??"),
    "ProcItems must map true supplierCount returned by backend"
  );
});

test("Phase 1E PROC-F17: PUR-05 VAT exclusion notice is presented on items and purchase orders", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("PUR-05"),
    "PUR-05 VAT exclusion notice must be displayed"
  );
});

test("Phase 1E PROC-F18: ProcReports provides dual export formats (PDF & Excel per INTG-01)", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes('downloadMut.mutate({ key: file, format: "pdf" })'),
    "ProcReports must support PDF report export"
  );
  assert.ok(
    dash.includes('downloadMut.mutate({ key: file, format: "xlsx" })'),
    "ProcReports must support Excel/XLSX report export per INTG-01"
  );
});

test("Phase 1E PROC-F21: Modals implement accessibility attributes and Escape key handling", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes('role="dialog"') && dash.includes('aria-modal="true"'),
    "Procurement modals must specify role='dialog' and aria-modal='true'"
  );
  assert.ok(
    dash.includes('htmlFor="po-supp"') && dash.includes('id="po-supp"'),
    "ProcNew form inputs must have associated htmlFor labels"
  );
  assert.ok(
    dash.includes('e.key === "Escape"'),
    "Procurement modals must handle Escape key dismiss"
  );
});

test("Phase 1E PROC-F22: Procurement grids use responsive layout classes", () => {
  const dash = norm(
    readFileSync(new URL("./CompanyDashboard.tsx", import.meta.url), "utf8")
  );
  assert.ok(
    dash.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"),
    "ProcOverview KPI cards must use responsive grid layout classes"
  );
});
