export const fmtAmt = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Destination for the "View" action on an inbox row — routed by the op's module so a
// purchase/inventory/shift row lands on ITS screen, not the sales-reconciliation view.
export const opDetailPage = (mk: string): string => {
  if (mk === "sales") return "acc-sales-detail";
  const map: Record<string, string> = {
    expenses: "acc-expenses", purchases: "acc-purchases", inventory: "acc-inventory",
    shifts: "acc-shifts", waste: "acc-waste", cash: "acc-cash", employees: "acc-employees",
  };
  return map[mk] ?? "acc-sales-detail";
};

// Gregorian month/day names — used to render the REAL system date (the prototype
// used to pin "today" to 14 Oct 2025, which hid live data behind month filters).
export const AR_MONTHS_LONG = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const EN_MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const AR_WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const EN_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "الاثنين، 14 أكتوبر 2025" / "Monday, October 14, 2025" from the real clock. */
export const formatTodayLong = (lang: "ar" | "en", d: Date = new Date()) =>
  lang === "ar"
    ? `${AR_WEEKDAYS[d.getDay()]}، ${d.getDate()} ${AR_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
    : `${EN_WEEKDAYS[d.getDay()]}, ${EN_MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

/** "أكتوبر 2025" / "October 2025" for the current month. */
export const formatMonthLong = (lang: "ar" | "en", d: Date = new Date()) =>
  lang === "ar" ? `${AR_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}` : `${EN_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;

/** "14 أكتوبر 2025" / "October 14, 2025" — no weekday. Returns "" for a bad/empty date. */
export const formatDateLong = (lang: "ar" | "en", iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return lang === "ar"
    ? `${d.getDate()} ${AR_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
    : `${EN_MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

export const isImageFile = (name: string) => /\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?)$/i.test(name || "");

import { APP_BASE_URL } from "../../../../api/client";

export const resolveAssetUrl = (u?: string | null): string => {
  const s = String(u ?? "");
  if (!s) return "";
  if (/^(data:|blob:)/i.test(s)) return s;
  const abs = /^https?:/i.test(s) ? s : `${APP_BASE_URL}${s.startsWith("/") ? "" : "/"}${s}`;
  return abs.replace(/(^https?:\/\/)|\/{2,}/gi, (_m, proto) => proto || "/");
};

/** Evaluates statement debit warning banner with fallback per Rule DIFF-04. */
export const hasEmployeeDebitWarning = (
  statement?: { hasDebitBalance?: boolean; autoDeductFromSalary?: boolean } | null
): boolean => {
  return Boolean(statement?.hasDebitBalance ?? statement?.autoDeductFromSalary);
};
