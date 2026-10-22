import { getErrorMessage } from "../../../api/errors.ts";
import type { CompanySettings } from "../../../api/queries/companyAdmin.ts";

export interface CompanySettingsFormState {
  name: string;
  city: string;
  crNumber: string;
  email: string;
}

export interface CompanySettingsValidationResult {
  valid: boolean;
  error: string | null;
  payload?: {
    name: string;
    city?: string;
    crNumber?: string;
    email?: string;
  };
}

export function initialCompanySettingsState(settings?: CompanySettings | null): CompanySettingsFormState {
  return {
    name: (settings?.name ?? (settings as any)?.legalName ?? "").toString(),
    city: (settings?.city ?? (settings as any)?.primaryCity ?? "").toString(),
    crNumber: (settings?.crNumber ?? "").toString(),
    email: (settings?.email ?? "").toString(),
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCompanySettings(
  state: CompanySettingsFormState,
  lang: "ar" | "en" = "ar"
): CompanySettingsValidationResult {
  const name = state.name.trim();
  const city = state.city.trim();
  const crNumber = state.crNumber.trim();
  const email = state.email.trim();

  if (!name) {
    return {
      valid: false,
      error: lang === "ar" ? "يرجى إدخال اسم المجموعة أو الشركة" : "Please enter company or group name",
    };
  }

  if (email && !EMAIL_REGEX.test(email)) {
    return {
      valid: false,
      error: lang === "ar" ? "صيغة البريد الإلكتروني غير صالحة" : "Invalid email address format",
    };
  }

  return {
    valid: true,
    error: null,
    payload: {
      name,
      ...(city ? { city } : {}),
      ...(crNumber ? { crNumber } : {}),
      ...(email ? { email } : {}),
    },
  };
}

export async function runCompanySettingsSave(
  state: CompanySettingsFormState,
  lang: "ar" | "en",
  mutateFn: (payload: Partial<CompanySettings>) => Promise<unknown>,
  lock: { current: boolean }
): Promise<{ success: boolean; error: string | null }> {
  if (lock.current) {
    return { success: false, error: lang === "ar" ? "الطلب قيد التنفيذ حالياً" : "Request is already in progress" };
  }

  const validation = validateCompanySettings(state, lang);
  if (!validation.valid || !validation.payload) {
    return { success: false, error: validation.error };
  }

  lock.current = true;
  try {
    await mutateFn(validation.payload);
    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        getErrorMessage(err, lang) ||
        (lang === "ar" ? "فشل حفظ إعدادات الشركة، يرجى المحاولة مرة أخرى" : "Failed to save company settings, please try again"),
    };
  } finally {
    lock.current = false;
  }
}
