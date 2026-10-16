/**
 * Three error envelopes are accepted:
 *  - Legacy:   { error: { code, message, messageAr?, details? }, requestId? }
 *  - asab v1:  { success: false, message, errors: { code?, ...fieldErrors } }
 *  - HTTP conflict/forbidden: { message: "CODE" }
 * `isErrorBody` detects each; `ApiError` normalizes them.
 */
/** Backend may return Symfony conflicts as { message: "CODE" } (without an error envelope). */
const REVIEW_ERROR_AR: Record<string, string> = {
  "REPORT_REVIEW_ACTOR_REQUIRED": "هذا الإجراء يتطلب صلاحية مراجعة التقرير",
  "NOT_AN_ACCOUNTANT": "هذا الإجراء متاح للمحاسب فقط",
  "ACCOUNTANT_UNAUTHORIZED_FOR_BRANCH": "المحاسب غير مخوّل لهذا الفرع",
  "ACCOUNTANT_INACTIVE": "حساب المحاسب غير نشط",
  "DAY_REPORT_NOT_SUBMITTED": "يجب إرسال تقرير اليوم أولًا",
  "DAY_MEMBER_NOT_FINAL_CURRENT": "يجب اعتماد جميع ورديات اليوم أولًا وبالحالة الحالية",
  "DAY_MEMBER_EVIDENCE_REQUIRED": "بيانات اعتماد ورديات اليوم غير مكتملة",
  "DAY_REPORT_EVIDENCE_REQUIRED": "بيانات تقرير اليوم المطلوبة غير مكتملة",
  "RETURN_INDIVIDUAL_SHF_REQUIRED": "يجب إرجاع الوردية المعنية بدل إرجاع تقرير اليوم",
  "REPORT_RETURN_CYCLE_REQUIRED": "يجب إتمام دورة الإرجاع للتعديل أولًا",
  "REPORT_IN_HEAD_REVIEW": "التقرير قيد مراجعة رئيس الحسابات",
  "REPORT_FINAL_APPROVED": "التقرير مغلق نهائيًا ولا يمكن تعديله",
  "REPORT_CURRENT_EVIDENCE_REQUIRED": "بيانات المراجعة الحالية غير مكتملة",
  "REPORT_WORKDAY_MEMBERSHIP_REQUIRED": "تنقص بيانات ربط الوردية بيوم العمل؛ يلزم مراجعة الحالة التاريخية",
  "REPORT_SOURCE_MAPPING_REQUIRED": "تعذر ربط التقرير بمصدر الوردية",
  "REPORT_OPERATION_MAPPING_REQUIRED": "تعذر ربط التقرير بالعملية",
  "REPORT_SOURCE_CHANGED": "تغير مصدر التقرير؛ حدّث البيانات وأعد المراجعة",
  "REPORT_AFFECTED_SET_CHANGED": "تغيرت مجموعة الورديات المرتبطة بالتقرير؛ حدّث البيانات",
  "REPORT_REOPEN_REQUIRED": "يتطلب الإجراء إعادة فتح المراجعة بالطريقة المعتمدة",
  "STALE_APPROVED_REPORT": "تغير التقرير بعد اعتماده؛ يلزم إعادة المراجعة",
  "STALE_DAY_REPORT_SNAPSHOT": "تغيرت بيانات تقرير اليوم؛ حدّث الصفحة",
  "STALE_SHF_REPORT_SNAPSHOT": "تغيرت بيانات الوردية؛ حدّث الصفحة",
  "STALE_DAY_MEMBER_EVIDENCE": "بيانات اعتماد إحدى ورديات اليوم غير محدثة",
  "STALE_REPORT_COUNT_EVIDENCE": "بيانات الجرد تغيرت؛ حدّث الصفحة",
  "STALE_REPORT_REVISION": "نسخة التقرير قديمة؛ حدّث الصفحة قبل التصحيح",
  "STALE_RETURN_CYCLE": "دورة الإرجاع تغيرت؛ حدّث الصفحة",
  "STALE_ALLOCATION_VERSION": "إصدار توزيع العجز تغير؛ حدّث الصفحة",
  "PHYSICAL_RECOUNT_REQUIRED": "يجب إجراء جرد نقدي فعلي قبل المتابعة",
  "LIABILITY_ALLOCATION_REQUIRED": "يجب تحديد كامل المسؤولية عن العجز قبل المتابعة",
  "BRANCH_LIABILITY_APPROVAL_PENDING": "توزيع مسؤولية العجز بانتظار الاعتماد قبل الاعتماد النهائي للوردية"
};

const IS_ERROR_CODE = /^[A-Z][A-Z0-9_]+$/;

export interface ApiErrorBody {
  error?: {
    code: string;
    message: string;
    messageAr?: string;
    details?: Record<string, unknown>;
  };
  success?: false;
  message?: string;
  errors?: { code?: string } & Record<string, unknown>;
  requestId?: string;
}

/** True when the response body looks like either supported error envelope. */
export function isErrorBody(body: unknown): body is ApiErrorBody {
  if (!body || typeof body !== "object") return false;
  return ("error" in body || "errors" in body ||
    (body as { success?: unknown }).success === false ||
    typeof (body as { message?: unknown }).message === "string");
}

export class ApiError extends Error {
  code: string;
  messageAr: string;
  details?: Record<string, unknown>;
  requestId?: string;
  status: number;

  constructor(body: ApiErrorBody, status: number) {
    // Legacy envelope wins when present; otherwise read the asab v1 shape.
    const legacy = body.error;
    const message = legacy?.message ?? body.message ?? "حدث خطأ غير متوقع";
    super(message);
    // Preserve existing structured-envelope codes. For bare {message}, accept only code-shaped values.
    const bareCode = !legacy && !body.errors && IS_ERROR_CODE.test(message) ? message : null;
    this.code = legacy?.code ?? body.errors?.code ?? bareCode ?? "UNKNOWN";
    // Legacy messageAr takes priority; known bare codes receive an Arabic explanation.
    this.messageAr = legacy?.messageAr || (bareCode ? REVIEW_ERROR_AR[bareCode] : undefined) || message;
    this.details = legacy?.details ?? body.errors;
    this.requestId = body.requestId;
    this.status = status;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function getErrorMessage(e: unknown, lang: "ar" | "en" = "ar"): string {
  if (isApiError(e)) return lang === "ar" ? e.messageAr : e.message;
  if (e instanceof Error) return e.message;
  return lang === "ar" ? "حدث خطأ غير متوقع" : "An unexpected error occurred";
}
