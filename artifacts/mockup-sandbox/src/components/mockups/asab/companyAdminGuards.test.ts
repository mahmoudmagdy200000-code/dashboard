import test from "node:test";
import assert from "node:assert/strict";
import {
  validateBranchCreate,
  validateUserEdit,
  parseInvoice,
  calculateBillingKpis,
  parseSupportChannel,
  formatPlanPrice,
  formatQuota,
  attemptChatSend,
  canToggleModule,
} from "./companyAdminGuards.ts";

test("CA-F07: validateBranchCreate requires explicit restaurantId and at least 2 char name", () => {
  // Missing restaurantId
  const r1 = validateBranchCreate({ restaurantId: "", name: "فرع النخيل" }, "ar");
  assert.equal(r1.valid, false);
  assert.match(r1.error!, /المطعم/);

  // Short name
  const r2 = validateBranchCreate({ restaurantId: "rest_1", name: " " }, "ar");
  assert.equal(r2.valid, false);
  assert.match(r2.error!, /حرفين/);

  // Valid
  const r3 = validateBranchCreate({ restaurantId: "rest_1", name: "فرع النخيل", city: "الرياض" }, "ar");
  assert.equal(r3.valid, true);
  assert.equal(r3.error, undefined);
});

test("CA-F08: validateUserEdit ensures ID and valid name, only exposes name & phone", () => {
  // Empty ID
  const r1 = validateUserEdit({ id: "", name: "أحمد" });
  assert.equal(r1.valid, false);

  // Name too short
  const r2 = validateUserEdit({ id: "u_1", name: "أ" });
  assert.equal(r2.valid, false);

  // Valid edit
  const r3 = validateUserEdit({ id: "u_1", name: "أحمد المحاسب", phone: "0501234567" });
  assert.equal(r3.valid, true);
  assert.deepEqual(r3.payload, {
    name: "أحمد المحاسب",
    phone: "0501234567",
  });
});

test("CA-F03: parseInvoice and calculateBillingKpis compute totalPaid ONLY from paid invoices", () => {
  const rawInvoices = [
    { id: "inv_1", totalHalalas: 100000, status: "paid" },     // 1000 SAR paid
    { id: "inv_2", totalHalalas: 50000, status: "open" },       // 500 SAR open
    { id: "inv_3", totalHalalas: 25000, status: "overdue" },    // 250 SAR overdue
    { id: "inv_4", totalHalalas: 10000, status: "void" },       // 100 SAR void
  ];

  const parsed = rawInvoices.map(parseInvoice);
  assert.equal(parsed[0].amount, 1000);
  assert.equal(parsed[0].status, "paid");
  assert.equal(parsed[1].status, "open");
  assert.equal(parsed[2].status, "overdue");
  assert.equal(parsed[3].status, "void");

  const kpis = calculateBillingKpis(parsed);
  assert.equal(kpis.totalPaid, 1000, "totalPaid must ONLY include paid invoices");
  assert.equal(kpis.pageDue, 750, "pageDue must sum open and overdue invoices on current page");
  assert.equal(kpis.paidCount, 1);
  assert.equal(kpis.dueCount, 2);
  assert.equal(kpis.totalCount, 4);
});

test("CA-REV-01: parseInvoice separates internal id (for PDF download) and public displayId", () => {
  const invWithBoth = parseInvoice({
    id: "uuid-9876-internal",
    publicId: "INV-2026-0042",
    totalHalalas: 150000,
    status: "paid",
  });
  assert.equal(invWithBoth.id, "uuid-9876-internal", "Internal id must be preserved for backend PDF API");
  assert.equal(invWithBoth.displayId, "INV-2026-0042", "displayId must show publicId to user");

  const invFallback = parseInvoice({
    id: "uuid-fallback-only",
    totalHalalas: 50000,
    status: "open",
  });
  assert.equal(invFallback.id, "uuid-fallback-only");
  assert.equal(invFallback.displayId, "uuid-fallback-only", "Fallback to id when publicId is absent");
});

test("CA-REV-02: calculateBillingKpis handles backend reality when outstandingHalalas is absent and invoices are paginated", () => {
  // Page with only 2 invoices (e.g., current page of 150 total records)
  const pageInvoices = [
    parseInvoice({ id: "inv_1", totalHalalas: 10000, status: "paid" }),  // 100 SAR paid
    parseInvoice({ id: "inv_2", totalHalalas: 20000, status: "open" }),  // 200 SAR open
  ];

  // Scenario 1: Actual Backend Reality — GET /company/me/billing/summary only provides totalPaidHalalas (no outstandingHalalas)
  const actualBackendSummary = {
    totalPaidHalalas: 8500000, // 85,000 SAR total paid across company history
    // outstandingHalalas is NOT returned by backend controller
  };
  const totalCountFromMeta = 150; // Total invoices from Page.meta.total

  const kpisActual = calculateBillingKpis(pageInvoices, actualBackendSummary, totalCountFromMeta);

  assert.equal(kpisActual.totalPaid, 85000, "totalPaid must use company-wide summary");
  assert.equal(kpisActual.isSummaryBasedPaid, true);
  assert.equal(kpisActual.companyTotalDue, null, "companyTotalDue MUST be null because backend summary does not provide outstandingHalalas");
  assert.equal(kpisActual.pageDue, 200, "pageDue must accurately represent open/overdue on current page only");
  assert.equal(kpisActual.isMultiPage, true, "isMultiPage must be true when totalCountMeta (150) exceeds page invoices (2)");
  assert.equal(kpisActual.isSinglePageComplete, false);
  assert.equal(kpisActual.totalCount, 150);

  // Scenario 2: Single-page company (all invoices fit in current page)
  const kpisSinglePage = calculateBillingKpis(pageInvoices, actualBackendSummary, 2);
  assert.equal(kpisSinglePage.isMultiPage, false);
  assert.equal(kpisSinglePage.isSinglePageComplete, true);
  assert.equal(kpisSinglePage.pageDue, 200);

  // Scenario 3: Future-proof if backend adds outstandingHalalas to summary
  const futureSummary = {
    totalPaidHalalas: 8500000,
    outstandingHalalas: 450000, // 4,500 SAR
  };
  const kpisFuture = calculateBillingKpis(pageInvoices, futureSummary, 150);
  assert.equal(kpisFuture.companyTotalDue, 4500, "companyTotalDue should be parsed if backend ever returns it");

  // Scenario 4: Fallback behavior when summary is absent
  const fallbackKpis = calculateBillingKpis(pageInvoices);
  assert.equal(fallbackKpis.totalPaid, 100);
  assert.equal(fallbackKpis.isSummaryBasedPaid, false);
  assert.equal(fallbackKpis.companyTotalDue, null);
  assert.equal(fallbackKpis.pageDue, 200);
  assert.equal(fallbackKpis.totalCount, 2);
});

test("CA-REV-03: parseInvoice matches issueDate from Backend before falling back to issuedAt / createdAt", () => {
  // Case 1: Backend sends issueDate (standard billing field)
  const inv1 = parseInvoice({
    id: "inv_1",
    issueDate: "2026-10-22",
    issuedAt: "2026-10-21T00:00:00Z",
    createdAt: "2026-10-20T00:00:00Z",
  });
  assert.equal(inv1.date, "2026-10-22", "issueDate must take precedence over issuedAt and createdAt");

  // Case 2: issueDate missing, issuedAt present
  const inv2 = parseInvoice({
    id: "inv_2",
    issuedAt: "2026-10-21T00:00:00Z",
    createdAt: "2026-10-20T00:00:00Z",
  });
  assert.equal(inv2.date, "2026-10-21T00:00:00Z", "issuedAt must be used when issueDate is absent");

  // Case 3: only createdAt present
  const inv3 = parseInvoice({
    id: "inv_3",
    createdAt: "2026-10-20T00:00:00Z",
  });
  assert.equal(inv3.date, "2026-10-20T00:00:00Z", "createdAt must be used as final fallback");
});

test("CA-F09: parseSupportChannel maps backend fields and determines correct actionType", () => {
  const ch1 = parseSupportChannel({
    key: "phone",
    labelAr: "الهاتف المباشر",
    value: "+966112345678",
    hoursAr: "9ص - 5م",
    isAvailable: true,
  }, "ar");
  assert.equal(ch1.label, "الهاتف المباشر");
  assert.equal(ch1.actionType, "tel");
  assert.equal(ch1.isAvailable, true);

  const ch2 = parseSupportChannel({
    key: "email",
    labelEn: "Email Support",
    value: "support@assab.app",
    isAvailable: false,
  }, "en");
  assert.equal(ch2.label, "Email Support");
  assert.equal(ch2.actionType, "mailto");
  assert.equal(ch2.isAvailable, false);

  const ch3 = parseSupportChannel({
    key: "portal",
    value: "https://help.assab.app",
  });
  assert.equal(ch3.actionType, "url");
});

test("CA-F10: formatPlanPrice handles null and custom pricing without runtime exception", () => {
  const p1 = formatPlanPrice(480000);
  assert.equal(p1.formatted, "4,800");
  assert.equal(p1.isCustom, false);

  const p2 = formatPlanPrice(null, "ar");
  assert.equal(p2.formatted, "حسب الطلب");
  assert.equal(p2.isCustom, true);

  const p3 = formatPlanPrice(undefined, "en");
  assert.equal(p3.formatted, "Custom");
  assert.equal(p3.isCustom, true);
});

test("CA-F11: formatQuota displays unlimited quotas safely as infinity", () => {
  const q1 = formatQuota(3, 10);
  assert.equal(q1.label, "3 / 10");
  assert.equal(q1.percentage, 30);
  assert.equal(q1.isUnlimited, false);

  const q2 = formatQuota(5, null);
  assert.equal(q2.label, "5 / ∞");
  assert.equal(q2.isUnlimited, true);

  const q3 = formatQuota(2, -1);
  assert.equal(q3.label, "2 / ∞");
  assert.equal(q3.isUnlimited, true);
});

test("CA-F23: attemptChatSend preserves draft text on failure and prevents duplicate calls", async () => {
  // Empty text
  const r1 = await attemptChatSend("   ", "s_1", false, async () => {});
  assert.equal(r1.shouldClearDraft, false);

  // Missing session
  const r2 = await attemptChatSend("مرحبا", null, false, async () => {});
  assert.equal(r2.shouldClearDraft, false);
  assert.equal(r2.error, "No active session");

  // In pending state (duplicate send attempt)
  const r3 = await attemptChatSend("مرحبا", "s_1", true, async () => {});
  assert.equal(r3.shouldClearDraft, false);
  assert.equal(r3.error, "Send already in progress");

  // Network / server failure
  const r4 = await attemptChatSend("مرحبا", "s_1", false, async () => {
    throw new Error("Network error");
  });
  assert.equal(r4.success, false);
  assert.equal(r4.shouldClearDraft, false, "Draft MUST NOT be cleared on failure");

  // Successful send
  let sentPayload: any = null;
  const r5 = await attemptChatSend("مرحبا", "s_1", false, async (payload) => {
    sentPayload = payload;
  });
  assert.equal(r5.success, true);
  assert.equal(r5.shouldClearDraft, true);
  assert.deepEqual(sentPayload, { sessionId: "s_1", text: "مرحبا" });
});

test("CA-F16 / CA-F22: canToggleModule allows toggle only if module is in plan and not pending", () => {
  // Not in plan
  assert.equal(canToggleModule(false, false), false);
  // In plan but pending mutation
  assert.equal(canToggleModule(true, true), false);
  // Both not in plan and pending
  assert.equal(canToggleModule(false, true), false);
  // In plan and idle (allowed)
  assert.equal(canToggleModule(true, false), true);
});
