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
  assert.equal(kpis.totalDue, 750, "totalDue must sum open and overdue invoices");
  assert.equal(kpis.paidCount, 1);
  assert.equal(kpis.dueCount, 2);
  assert.equal(kpis.totalCount, 4);
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
