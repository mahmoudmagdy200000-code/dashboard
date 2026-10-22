import test from "node:test";
import assert from "node:assert/strict";
import {
  initialCompanySettingsState,
  validateCompanySettings,
  runCompanySettingsSave,
  type CompanySettingsFormState,
} from "./companySettingsGuards.ts";
import { ApiError } from "../../../api/errors.ts";

test("initialCompanySettingsState populates fields from settings data with aliases", () => {
  const empty = initialCompanySettingsState(null);
  assert.deepEqual(empty, {
    name: "",
    city: "",
    crNumber: "",
    email: "",
  });

  const full = initialCompanySettingsState({
    name: "مجموعة التاج",
    city: "الرياض",
    crNumber: "1010123456",
    email: "admin@altaj.com",
  });
  assert.deepEqual(full, {
    name: "مجموعة التاج",
    city: "الرياض",
    crNumber: "1010123456",
    email: "admin@altaj.com",
  });

  // Doc-conformance aliases legalName / primaryCity
  const aliased = initialCompanySettingsState({
    legalName: "شركة الأطعمة المتميزة",
    primaryCity: "جدة",
    crNumber: "4030999999",
    email: "info@foods.sa",
  } as any);
  assert.equal(aliased.name, "شركة الأطعمة المتميزة");
  assert.equal(aliased.city, "جدة");
});

test("validateCompanySettings rejects empty or whitespace-only name", () => {
  const emptyRes = validateCompanySettings({
    name: "",
    city: "الرياض",
    crNumber: "",
    email: "",
  }, "ar");
  assert.equal(emptyRes.valid, false);
  assert.equal(emptyRes.error, "يرجى إدخال اسم المجموعة أو الشركة");

  const whitespaceRes = validateCompanySettings({
    name: "   \t\n  ",
    city: "الرياض",
    crNumber: "",
    email: "",
  }, "en");
  assert.equal(whitespaceRes.valid, false);
  assert.equal(whitespaceRes.error, "Please enter company or group name");
});

test("validateCompanySettings validates email format when provided", () => {
  const invalidEmailRes = validateCompanySettings({
    name: "مجموعة الصفا",
    city: "الدمام",
    crNumber: "2050111111",
    email: "invalid-email-format",
  }, "ar");
  assert.equal(invalidEmailRes.valid, false);
  assert.equal(invalidEmailRes.error, "صيغة البريد الإلكتروني غير صالحة");

  const validEmailRes = validateCompanySettings({
    name: "مجموعة الصفا",
    city: "الدمام",
    crNumber: "2050111111",
    email: "finance@alsafa.com",
  }, "en");
  assert.equal(validEmailRes.valid, true);
  assert.deepEqual(validEmailRes.payload, {
    name: "مجموعة الصفا",
    city: "الدمام",
    crNumber: "2050111111",
    email: "finance@alsafa.com",
  });
});

test("validateCompanySettings trims values and omits empty optional fields", () => {
  const res = validateCompanySettings({
    name: "  مطاعم الريان  ",
    city: "  الرياض  ",
    crNumber: "   ",
    email: "   ",
  }, "ar");
  assert.equal(res.valid, true);
  assert.deepEqual(res.payload, {
    name: "مطاعم الريان",
    city: "الرياض",
  });
});

test("runCompanySettingsSave sends validated payload and confirms success", async () => {
  const formState: CompanySettingsFormState = {
    name: "مطاعم الفردوس",
    city: "مكة المكرمة",
    crNumber: "4031222222",
    email: "contact@alfardous.sa",
  };

  let receivedPayload: unknown = null;
  const mutateFn = async (payload: unknown) => {
    receivedPayload = payload;
  };

  const lock = { current: false };
  const result = await runCompanySettingsSave(formState, "ar", mutateFn, lock);

  assert.equal(result.success, true);
  assert.equal(result.error, null);
  assert.deepEqual(receivedPayload, {
    name: "مطاعم الفردوس",
    city: "مكة المكرمة",
    crNumber: "4031222222",
    email: "contact@alfardous.sa",
  });
  assert.equal(lock.current, false, "Lock must be released on success");
});

test("runCompanySettingsSave prevents duplicate submissions while lock is active", async () => {
  const formState: CompanySettingsFormState = {
    name: "شركة النخيل",
    city: "المدينة المنورة",
    crNumber: "",
    email: "",
  };

  let callCount = 0;
  const mutateFn = async () => {
    callCount++;
  };

  const lock = { current: true }; // Already pending
  const result = await runCompanySettingsSave(formState, "ar", mutateFn, lock);

  assert.equal(result.success, false);
  assert.equal(result.error, "الطلب قيد التنفيذ حالياً");
  assert.equal(callCount, 0, "Mutate function must NOT be called when locked");
});

test("runCompanySettingsSave handles HTTP 422 validation failure gracefully", async () => {
  const formState: CompanySettingsFormState = {
    name: "شركة التوزيع",
    city: "الجبيل",
    crNumber: "123",
    email: "wrong@test",
  };

  const mutateFn = async () => {
    throw new ApiError(
      {
        message: "The email must be a valid email address.",
        errors: { email: ["The email must be a valid email address."] },
      },
      422
    );
  };

  const lock = { current: false };
  const result = await runCompanySettingsSave(formState, "ar", mutateFn, lock);

  assert.equal(result.success, false);
  assert.equal(result.error, "صيغة البريد الإلكتروني غير صالحة");
  assert.equal(lock.current, false, "Lock must be released on 422 error so user can retry");
  // Form state remains unchanged
  assert.equal(formState.name, "شركة التوزيع");
  assert.equal(formState.city, "الجبيل");
});

test("runCompanySettingsSave handles HTTP 403 Forbidden failure gracefully", async () => {
  const formState: CompanySettingsFormState = {
    name: "شركة مقفلة",
    city: "جدة",
    crNumber: "",
    email: "",
  };

  const mutateFn = async () => {
    throw new ApiError({ message: "FORBIDDEN" }, 403);
  };

  const lock = { current: false };
  const result = await runCompanySettingsSave(formState, "ar", mutateFn, lock);

  assert.equal(result.success, false);
  assert.equal(lock.current, false, "Lock must be released on 403 error");
});

test("runCompanySettingsSave handles Network Failure gracefully", async () => {
  const formState: CompanySettingsFormState = {
    name: "شركة بلا شبكة",
    city: "تبوك",
    crNumber: "",
    email: "",
  };

  const mutateFn = async () => {
    const netErr = new Error("Network Error");
    (netErr as any).isAxiosError = true;
    throw netErr;
  };

  const lock = { current: false };
  const result = await runCompanySettingsSave(formState, "ar", mutateFn, lock);

  assert.equal(result.success, false);
  assert.equal(lock.current, false, "Lock must be released on network failure");
});
