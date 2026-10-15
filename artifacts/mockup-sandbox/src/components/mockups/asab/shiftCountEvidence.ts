import type { Shift } from "../../../api/types/company.ts";

type Language = "ar" | "en";
// Runtime validation is intentional: API types alone cannot establish count evidence
// or prove that a received monetary value is an integer number of halalas.
type ShiftDisplaySource = Partial<Record<keyof Pick<Shift,
  "cashCountState" | "varianceHalalas" | "cashExpectedHalalas" | "salesHalalas" |
  "pendingIncomingCountedHalalas" | "ordersCount"
>, unknown>>;

const moneyOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const money = {
  ar: new Intl.NumberFormat("ar-SA", moneyOptions),
  en: new Intl.NumberFormat("en-US", moneyOptions),
};
const signedMoney = {
  ar: new Intl.NumberFormat("ar-SA", { ...moneyOptions, signDisplay: "always" }),
  en: new Intl.NumberFormat("en-US", { ...moneyOptions, signDisplay: "always" }),
};
const minorUnits = {
  ar: new Intl.NumberFormat("ar-SA", { useGrouping: false, minimumIntegerDigits: 2 }),
  en: new Intl.NumberFormat("en-US", { useGrouping: false, minimumIntegerDigits: 2 }),
};
const invalidAmount = (language: Language) => language === "ar" ? "قيمة غير صالحة" : "Invalid amount";
const isHalalas = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value);

/** SHF canonical *Halalas fields only. Never round fractional/unsafe source data. */
export function formatShiftHalalas(value: unknown, language: Language = "ar", signed = false): string {
  if (value == null) return "—";
  if (!isHalalas(value)) return invalidAmount(language);

  // Split integer minor units exactly; floating division can lose a halala near
  // MAX_SAFE_INTEGER. Keep a negative sign even for amounts smaller than one SAR.
  const whole = BigInt(value) / 100n;
  const major = value < 0 && whole === 0n ? -0 : whole;
  const fraction = minorUnits[language].format(Math.abs(value % 100));
  const formatter = signed ? signedMoney[language] : money[language];
  return formatter.formatToParts(major)
    .map(part => part.type === "fraction" ? fraction : part.value).join("");
}

type VarianceDisplay = {
  kind: "shortage" | "surplus" | "matched" | "unknown" | "missing" | "invalid";
  text: string;
  cls: string;
  rowCls: string;
};

function varianceDisplay(shift: ShiftDisplaySource, language: Language): VarianceDisplay {
  const missing: VarianceDisplay = { kind: "missing", text: "—", cls: "text-gray-400", rowCls: "" };
  if (shift.cashCountState === "unknown") {
    return { kind: "unknown", text: language === "ar" ? "غير مجرود" : "Not counted", cls: "text-gray-500", rowCls: "" };
  }
  if (shift.cashCountState !== "counted" || shift.varianceHalalas == null) return missing;
  if (!isHalalas(shift.varianceHalalas)) {
    return { kind: "invalid", text: invalidAmount(language), cls: "text-amber-700", rowCls: "" };
  }
  if (shift.varianceHalalas === 0) {
    return { kind: "matched", text: language === "ar" ? "✓ متطابق" : "✓ Matched", cls: "text-emerald-600", rowCls: "" };
  }
  const surplus = shift.varianceHalalas > 0;
  return {
    kind: surplus ? "surplus" : "shortage",
    text: `${formatShiftHalalas(shift.varianceHalalas, language, true)} ${language === "ar" ? "ر.س" : "SAR"}`,
    cls: surplus ? "text-blue-600" : "text-red-600",
    rowCls: surplus ? "bg-blue-50/30" : "bg-red-50/30",
  };
}

/** One display model used by both existing live/history surfaces. No cash arithmetic. */
export function getShiftCountEvidence(shift: ShiftDisplaySource, language: Language = "ar") {
  return {
    variance: varianceDisplay(shift, language),
    expectedCash: formatShiftHalalas(shift.cashExpectedHalalas, language),
    sales: formatShiftHalalas(shift.salesHalalas, language),
    pendingIncoming: formatShiftHalalas(shift.pendingIncomingCountedHalalas, language),
    // Handoff M-6 / F-6: the bridge writes placeholder zeroes and the Admin API
    // supplies no origin discriminator. Do not present these as actual orders.
    ordersCount: "—",
  };
}

/** Preserve the existing history sales total without inventing missing amounts. */
export function formatShiftSalesTotal(shifts: readonly ShiftDisplaySource[], language: Language = "ar"): string {
  if (shifts.length === 0) return "—";
  let total = 0;
  for (const shift of shifts) {
    if (shift.salesHalalas == null) return "—";
    if (!isHalalas(shift.salesHalalas)) return invalidAmount(language);
    total += shift.salesHalalas;
    if (!Number.isSafeInteger(total)) return invalidAmount(language);
  }
  return formatShiftHalalas(total, language);
}

// Existing company-screen status palette, shared with the Admin screen.
const CSHIFT_STATUS: Record<string, { cls: string; ar: string; en: string }> = {
  active: { cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", ar: "نشط", en: "Active" },
  late: { cls: "bg-red-50 text-red-700 border border-red-200", ar: "تأخير", en: "Late" },
  pending_review: { cls: "bg-amber-50 text-amber-700 border border-amber-200", ar: "بانتظار المراجعة", en: "Pending review" },
  closed: { cls: "bg-gray-100 text-gray-600 border border-gray-200", ar: "مغلق", en: "Closed" },
};

export function getShiftStatusDisplay(status: unknown, language: Language = "ar") {
  const entry = typeof status === "string" && Object.hasOwn(CSHIFT_STATUS, status) ? CSHIFT_STATUS[status] : undefined;
  return { cls: entry?.cls ?? "bg-gray-100 text-gray-600 border border-gray-200", label: entry?.[language] ?? "—" };
}
