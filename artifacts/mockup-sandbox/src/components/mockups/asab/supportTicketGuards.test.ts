import test from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORT_TICKET_CATEGORIES,
  validateSupportTicket,
  runSupportTicketSubmit,
  type SupportTicketFormState,
} from "./supportTicketGuards.ts";
import { ApiError } from "../../../api/errors.ts";

test("SUPPORT_TICKET_CATEGORIES contains all valid backend category keys", () => {
  const keys = SUPPORT_TICKET_CATEGORIES.map((c) => c.key);
  assert.deepEqual(keys, [
    "technical",
    "subscription",
    "billing",
    "general_inquiry",
    "feature_request",
    "other",
  ]);
});

test("validateSupportTicket rejects missing, empty, or unknown category", () => {
  const emptyRes = validateSupportTicket({
    category: "",
    body: "لدي مشكلة في إقفال الوردية في فرع العليا",
  }, "ar");
  assert.equal(emptyRes.valid, false);
  assert.equal(emptyRes.error, "يرجى تحديد نوع المشكلة");

  const unknownRes = validateSupportTicket({
    category: "unknown_category_key",
    body: "لدي مشكلة في إقفال الوردية في فرع العليا",
  }, "en");
  assert.equal(unknownRes.valid, false);
  assert.equal(unknownRes.error, "Please select an issue type");
});

test("validateSupportTicket rejects body shorter than 10 characters", () => {
  const shortRes = validateSupportTicket({
    category: "technical",
    body: "عطل بسيط",
  }, "ar");
  assert.equal(shortRes.valid, false);
  assert.equal(shortRes.error, "يرجى كتابة وصف تفصيلي للمشكلة (10 أحرف على الأقل)");

  const shortResEn = validateSupportTicket({
    category: "technical",
    body: "short",
  }, "en");
  assert.equal(shortResEn.valid, false);
  assert.equal(shortResEn.error, "Please describe the issue in detail (at least 10 characters)");
});

test("validateSupportTicket accepts valid category and body, assigning default subject", () => {
  const resAr = validateSupportTicket({
    category: "technical",
    body: "الشاشة تتوقف عند محاولة تصدير ملفات المبيعات",
  }, "ar");
  assert.equal(resAr.valid, true);
  assert.deepEqual(resAr.payload, {
    category: "technical",
    subject: "مشكلة تقنية",
    body: "الشاشة تتوقف عند محاولة تصدير ملفات المبيعات",
  });

  const resEn = validateSupportTicket({
    category: "subscription",
    subject: "Custom renewal question",
    body: "We need to upgrade our branch subscription for next quarter.",
  }, "en");
  assert.equal(resEn.valid, true);
  assert.deepEqual(resEn.payload, {
    category: "subscription",
    subject: "Custom renewal question",
    body: "We need to upgrade our branch subscription for next quarter.",
  });
});

test("runSupportTicketSubmit successfully sends payload and confirms completion", async () => {
  const formState: SupportTicketFormState = {
    category: "general_inquiry",
    body: "نحتاج إلى توضيح حول آلية ربط الفروع المتعددة بحساب المالك.",
  };

  let submittedPayload: unknown = null;
  const mutateFn = async (payload: unknown) => {
    submittedPayload = payload;
  };

  const lock = { current: false };
  const result = await runSupportTicketSubmit(formState, "ar", mutateFn, lock);

  assert.equal(result.success, true);
  assert.equal(result.error, null);
  assert.deepEqual(submittedPayload, {
    category: "general_inquiry",
    subject: "استفسار عام",
    body: "نحتاج إلى توضيح حول آلية ربط الفروع المتعددة بحساب المالك.",
  });
  assert.equal(lock.current, false, "Lock must be released on success");
});

test("runSupportTicketSubmit prevents duplicate submission when lock is held", async () => {
  const formState: SupportTicketFormState = {
    category: "technical",
    body: "رسالة خطأ عند الضغط على زر الاعتماد النهائي.",
  };

  let calls = 0;
  const mutateFn = async () => {
    calls++;
  };

  const lock = { current: true };
  const result = await runSupportTicketSubmit(formState, "ar", mutateFn, lock);

  assert.equal(result.success, false);
  assert.equal(result.error, "الطلب قيد التنفيذ حالياً");
  assert.equal(calls, 0, "Mutate must not be called when locked");
});

test("runSupportTicketSubmit preserves form draft on HTTP 422 error", async () => {
  const formState: SupportTicketFormState = {
    category: "feature_request",
    body: "نطلب إضافة ميزة التصدير التلقائي لملفات PDF كل نهاية أسبوع.",
  };

  const mutateFn = async () => {
    throw new ApiError(
      {
        message: "The given data was invalid.",
        errors: { body: ["The body must be at least 10 characters."] },
      },
      422
    );
  };

  const lock = { current: false };
  const result = await runSupportTicketSubmit(formState, "ar", mutateFn, lock);

  assert.equal(result.success, false);
  assert.equal(lock.current, false, "Lock must be released on 422 error");
  // Form draft remains intact
  assert.equal(formState.category, "feature_request");
  assert.equal(formState.body, "نطلب إضافة ميزة التصدير التلقائي لملفات PDF كل نهاية أسبوع.");
});

test("runSupportTicketSubmit preserves form draft on HTTP 403 Forbidden", async () => {
  const formState: SupportTicketFormState = {
    category: "billing",
    body: "استفسار عن الفاتورة رقم INV-2026-0012 المرفقة.",
  };

  const mutateFn = async () => {
    throw new ApiError({ message: "FORBIDDEN" }, 403);
  };

  const lock = { current: false };
  const result = await runSupportTicketSubmit(formState, "ar", mutateFn, lock);

  assert.equal(result.success, false);
  assert.equal(lock.current, false, "Lock must be released on 403");
  assert.equal(formState.body, "استفسار عن الفاتورة رقم INV-2026-0012 المرفقة.");
});

test("runSupportTicketSubmit preserves form draft on Network Failure", async () => {
  const formState: SupportTicketFormState = {
    category: "technical",
    body: "انقطاع الاتصال أثناء إرسال تذكرة الدعم الفني.",
  };

  const mutateFn = async () => {
    const netErr = new Error("Network Error");
    (netErr as any).isAxiosError = true;
    throw netErr;
  };

  const lock = { current: false };
  const result = await runSupportTicketSubmit(formState, "ar", mutateFn, lock);

  assert.equal(result.success, false);
  assert.equal(lock.current, false, "Lock must be released on network error");
  assert.equal(formState.body, "انقطاع الاتصال أثناء إرسال تذكرة الدعم الفني.");
});
