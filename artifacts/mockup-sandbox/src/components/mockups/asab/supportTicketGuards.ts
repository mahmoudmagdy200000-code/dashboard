import { getErrorMessage } from "../../../api/errors.ts";

export const SUPPORT_TICKET_CATEGORIES = [
  { key: "technical", ar: "مشكلة تقنية", en: "Technical issue" },
  { key: "subscription", ar: "مشكلة في الاشتراك", en: "Subscription issue" },
  { key: "billing", ar: "استفسار عن الفوترة", en: "Billing inquiry" },
  { key: "general_inquiry", ar: "استفسار عام", en: "General inquiry" },
  { key: "feature_request", ar: "طلب ميزة", en: "Feature request" },
  { key: "other", ar: "أخرى", en: "Other" },
] as const;

export type SupportCategoryKey = (typeof SUPPORT_TICKET_CATEGORIES)[number]["key"];

export interface SupportTicketFormState {
  category: string;
  subject?: string;
  body: string;
}

export interface SupportTicketValidationResult {
  valid: boolean;
  error: string | null;
  payload?: {
    category: SupportCategoryKey;
    subject: string;
    body: string;
  };
}

export function validateSupportTicket(
  state: SupportTicketFormState,
  lang: "ar" | "en" = "ar"
): SupportTicketValidationResult {
  const categoryKey = state.category.trim();
  const body = state.body.trim();

  const foundCategory = SUPPORT_TICKET_CATEGORIES.find((c) => c.key === categoryKey);
  if (!foundCategory) {
    return {
      valid: false,
      error: lang === "ar" ? "يرجى تحديد نوع المشكلة" : "Please select an issue type",
    };
  }

  if (body.length < 10) {
    return {
      valid: false,
      error:
        lang === "ar"
          ? "يرجى كتابة وصف تفصيلي للمشكلة (10 أحرف على الأقل)"
          : "Please describe the issue in detail (at least 10 characters)",
    };
  }

  const subject = state.subject?.trim() || (lang === "ar" ? foundCategory.ar : foundCategory.en);

  return {
    valid: true,
    error: null,
    payload: {
      category: foundCategory.key,
      subject,
      body,
    },
  };
}

export async function runSupportTicketSubmit(
  state: SupportTicketFormState,
  lang: "ar" | "en",
  mutateFn: (payload: { category: string; subject: string; body: string }) => Promise<unknown>,
  lock: { current: boolean }
): Promise<{ success: boolean; error: string | null }> {
  if (lock.current) {
    return { success: false, error: lang === "ar" ? "الطلب قيد التنفيذ حالياً" : "Request is already in progress" };
  }

  const validation = validateSupportTicket(state, lang);
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
        (lang === "ar" ? "فشل إرسال طلب الدعم، يرجى المحاولة مرة أخرى" : "Failed to submit support request, please try again"),
    };
  } finally {
    lock.current = false;
  }
}
