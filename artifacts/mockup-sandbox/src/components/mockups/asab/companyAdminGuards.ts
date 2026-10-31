/**
 * Company Admin Phase 1A Pure Guards & Formatting Utilities
 * Covers: CA-F03, CA-F07, CA-F08, CA-F09, CA-F10, CA-F11, CA-F20, CA-F22, CA-F23
 */

// ─── CA-F07: Branch Creation Validation ───────────────────────────────────────
export interface BranchCreateDraft {
  restaurantId: string;
  name: string;
  city?: string;
  managerUserId?: string;
}

export interface BranchValidationResult {
  valid: boolean;
  error?: string;
}

export function validateBranchCreate(
  draft: BranchCreateDraft,
  lang: "ar" | "en" = "ar"
): BranchValidationResult {
  if (!draft.restaurantId || !draft.restaurantId.trim()) {
    return {
      valid: false,
      error: lang === "ar" ? "يرجى تحديد المطعم التابع له الفرع صراحةً" : "Please select the restaurant explicitly",
    };
  }
  const trimmedName = draft.name ? draft.name.trim() : "";
  if (!trimmedName || trimmedName.length < 2) {
    return {
      valid: false,
      error: lang === "ar" ? "اسم الفرع يجب أن يحتوي على حرفين على الأقل" : "Branch name must be at least 2 characters",
    };
  }
  return { valid: true };
}

// ─── DB-R04: Brand & Restaurant Creation Validation & Role Guard ─────────────
/**
 * DB-R04 / W1-C: Role permission check for Brand and Restaurant creation.
 * Only Platform Admin is permitted to create Brands and Restaurants.
 * Company Admin is explicitly denied creation functionality.
 */
export function canRoleCreateBrandOrRestaurant(roleKey: string): boolean {
  return roleKey === "admin" || roleKey === "platform-admin" || roleKey === "super-admin";
}

export interface BrandCreateDraft {
  name: string;
  color?: string;
  abbr?: string;
}

export function validateBrandCreate(
  draft: BrandCreateDraft,
  lang: "ar" | "en" = "ar"
): { valid: boolean; error?: string; payload?: { name: string; color?: string; abbr?: string } } {
  const trimmedName = draft.name ? draft.name.trim() : "";
  if (!trimmedName || trimmedName.length < 2) {
    return {
      valid: false,
      error: lang === "ar" ? "اسم العلامة التجارية يجب أن يحتوي على حرفين على الأقل" : "Brand name must be at least 2 characters",
    };
  }

  let color = draft.color?.trim();
  if (color && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
    return {
      valid: false,
      error: lang === "ar" ? "رمز اللون غير صالح، يرجى استخدام صيغة Hex (مثل #7C3AED)" : "Invalid color code, please use Hex format (e.g. #7C3AED)",
    };
  }

  const abbr = draft.abbr?.trim() || trimmedName.slice(0, 2);

  return {
    valid: true,
    payload: {
      name: trimmedName,
      color: color || "#7C3AED",
      abbr,
    },
  };
}

export interface RestaurantCreateDraft {
  brandId: string;
  name: string;
}

export function validateRestaurantCreate(
  draft: RestaurantCreateDraft,
  lang: "ar" | "en" = "ar"
): { valid: boolean; error?: string; payload?: { brandId: string; name: string } } {
  if (!draft.brandId || !draft.brandId.trim()) {
    return {
      valid: false,
      error: lang === "ar" ? "يرجى تحديد العلامة التجارية التابع لها المطعم" : "Please select the parent brand for the restaurant",
    };
  }
  const trimmedName = draft.name ? draft.name.trim() : "";
  if (!trimmedName || trimmedName.length < 2) {
    return {
      valid: false,
      error: lang === "ar" ? "اسم المطعم يجب أن يحتوي على حرفين على الأقل" : "Restaurant name must be at least 2 characters",
    };
  }
  return {
    valid: true,
    payload: {
      brandId: draft.brandId.trim(),
      name: trimmedName,
    },
  };
}

// ─── CA-F08: User Edit Validation ─────────────────────────────────────────────
export interface UserEditDraft {
  id: string;
  name: string;
  phone?: string;
}

export function validateUserEdit(
  draft: UserEditDraft,
  lang: "ar" | "en" = "ar"
): { valid: boolean; error?: string; payload?: { name: string; phone?: string } } {
  if (!draft.id || !draft.id.trim()) {
    return { valid: false, error: lang === "ar" ? "معرف المستخدم مطلوب" : "User ID is required" };
  }
  const trimmedName = draft.name ? draft.name.trim() : "";
  if (!trimmedName || trimmedName.length < 2) {
    return {
      valid: false,
      error: lang === "ar" ? "اسم المستخدم يجب أن يحتوي على حرفين على الأقل" : "User name must be at least 2 characters",
    };
  }
  return {
    valid: true,
    payload: {
      name: trimmedName,
      phone: draft.phone && draft.phone.trim() ? draft.phone.trim() : undefined,
    },
  };
}

// ─── CA-F03: Truthful Billing & Invoices ──────────────────────────────────────
export type InvoiceStatus = "paid" | "open" | "overdue" | "void" | "unknown";

export interface RawInvoice {
  id?: string;
  publicId?: string;
  issueDate?: string;
  issuedAt?: string;
  createdAt?: string;
  date?: string;
  totalHalalas?: number | null;
  amount?: number | null;
  amountDueHalalas?: number | null;
  amountDue?: number | null;
  status?: string | null;
}

export interface ParsedInvoice {
  /** Internal ID used for API endpoints (e.g. GET /invoices/:id/pdf) */
  id: string;
  /** Public user-facing identifier (e.g. INV-2026-001) */
  displayId: string;
  date: string;
  amount: number;
  amountDue: number | null;
  status: InvoiceStatus;
}

export function parseInvoice(raw: RawInvoice): ParsedInvoice {
  const internalId = raw.id || raw.publicId || "";
  const displayId = raw.publicId || raw.id || "—";
  // Matches issueDate from Backend first, falling back to issuedAt / createdAt
  const date = raw.issueDate || raw.issuedAt || raw.createdAt || raw.date || "";
  const amount = raw.totalHalalas != null ? raw.totalHalalas / 100 : raw.amount != null ? Number(raw.amount) : 0;
  const amountDue = raw.amountDueHalalas != null
    ? raw.amountDueHalalas / 100
    : raw.amountDue != null
      ? Number(raw.amountDue)
      : null;
  let status: InvoiceStatus = "unknown";
  const s = (raw.status || "").toLowerCase().trim();
  if (s === "paid") status = "paid";
  else if (s === "open" || s === "pending") status = "open";
  else if (s === "overdue" || s === "late") status = "overdue";
  else if (s === "void" || s === "cancelled") status = "void";

  return { id: internalId, displayId, date, amount, amountDue, status };
}

export interface BillingSummaryKpiInput {
  totalPaidHalalas?: number | null;
  outstandingHalalas?: number | null;
  nextInvoiceDate?: string | null;
  nextInvoiceAmountHalalas?: number | null;
}

export const DESKTOP_BREAKPOINT_PX = 768;

/**
 * Traps Tab and Shift+Tab keyboard focus inside drawer dialog elements.
 * Returns the element that should receive focus, or null if natural interior tab order should proceed.
 */
export function trapDrawerFocus(
  focusableElements: HTMLElement[],
  activeElement: Element | null,
  isShiftTab: boolean
): HTMLElement | null {
  if (focusableElements.length === 0) return null;
  const firstEl = focusableElements[0];
  const lastEl = focusableElements[focusableElements.length - 1];

  if (isShiftTab) {
    if (activeElement === firstEl || !focusableElements.some((el) => el === activeElement)) {
      return lastEl;
    }
  } else {
    if (activeElement === lastEl || !focusableElements.some((el) => el === activeElement)) {
      return firstEl;
    }
  }
  return null;
}

export interface BillingKpisResult {
  totalPaid: number;
  isSummaryBasedPaid: boolean;
  companyTotalDue: number | null;
  pageDue: number;
  paidCount: number;
  dueCount: number;
  totalCount: number;
  hasPaginationTotal: boolean;
  isMultiPage: boolean;
  isSinglePageComplete: boolean;
}

export function calculateBillingKpis(
  invoices: ParsedInvoice[],
  summary?: BillingSummaryKpiInput | null,
  totalCountMeta?: number | null
): BillingKpisResult {
  const paid = invoices.filter((i) => i.status === "paid");
  const openOrOverdue = invoices.filter((i) => i.status === "open" || i.status === "overdue");

  // Prioritize company-wide totals from GET /company/me/billing/summary over single-page sum
  const totalPaid = summary?.totalPaidHalalas != null
    ? summary.totalPaidHalalas / 100
    : paid.reduce((sum, i) => sum + i.amount, 0);

  const isSummaryBasedPaid = summary?.totalPaidHalalas != null;

  // Sum of open/overdue invoice totals on current page, respecting amountDue = 0 when explicitly present
  const pageDue = openOrOverdue.reduce(
    (sum, i) => sum + (i.amountDue != null ? i.amountDue : i.amount),
    0
  );

  // If backend ever provides company-wide outstandingHalalas in summary, use it:
  const companyTotalDue = summary?.outstandingHalalas != null
    ? summary.outstandingHalalas / 100
    : null;

  const hasPaginationTotal = totalCountMeta != null;
  const totalCount = hasPaginationTotal ? totalCountMeta : invoices.length;
  const isMultiPage = hasPaginationTotal && totalCountMeta > invoices.length;
  const isSinglePageComplete = hasPaginationTotal && totalCountMeta <= invoices.length;

  return {
    totalPaid,
    isSummaryBasedPaid,
    companyTotalDue,
    pageDue,
    paidCount: paid.length,
    dueCount: openOrOverdue.length,
    totalCount,
    hasPaginationTotal,
    isMultiPage,
    isSinglePageComplete,
  };
}

// ─── CA-F09: Support Channels Contract ────────────────────────────────────────
export interface BackendSupportChannel {
  key: string;
  labelAr?: string;
  labelEn?: string;
  value?: string;
  hoursAr?: string;
  hoursEn?: string;
  isAvailable?: boolean;
  icon?: string;
}

export interface ParsedSupportChannel {
  key: string;
  label: string;
  value: string;
  hours: string;
  isAvailable: boolean;
  icon: string;
  actionType: "url" | "tel" | "mailto" | "none";
}

export function parseSupportChannel(
  raw: BackendSupportChannel,
  lang: "ar" | "en" = "ar"
): ParsedSupportChannel {
  const label = lang === "ar" ? (raw.labelAr || raw.labelEn || raw.key) : (raw.labelEn || raw.labelAr || raw.key);
  const hours = lang === "ar" ? (raw.hoursAr || "") : (raw.hoursEn || raw.hoursAr || "");
  const value = (raw.value || "").trim();
  const isAvailable = raw.isAvailable !== false;
  const icon = raw.icon || "📞";

  let actionType: "url" | "tel" | "mailto" | "none" = "none";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    actionType = "url";
  } else if (value.includes("@")) {
    actionType = "mailto";
  } else if (value.length > 0) {
    actionType = "tel";
  }

  return {
    key: raw.key,
    label,
    value,
    hours,
    isAvailable,
    icon,
    actionType,
  };
}

// ─── CA-F10: Nullable Plans & Safe Pricing ────────────────────────────────────
export function formatPlanPrice(
  priceHalalas: number | null | undefined,
  lang: "ar" | "en" = "ar"
): { formatted: string; isCustom: boolean } {
  if (priceHalalas == null || isNaN(priceHalalas)) {
    return {
      formatted: lang === "ar" ? "حسب الطلب" : "Custom",
      isCustom: true,
    };
  }
  const sar = priceHalalas / 100;
  return {
    formatted: sar.toLocaleString("en-US", {
      minimumFractionDigits: sar % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }),
    isCustom: false,
  };
}

// ─── CA-F11: Unlimited Quota Display ──────────────────────────────────────────
export function formatQuota(
  used: number,
  max: number | null | undefined,
  lang: "ar" | "en" = "ar"
): { label: string; percentage: number; isUnlimited: boolean } {
  if (max == null || max === -1) {
    return {
      label: `${used} / ∞`,
      percentage: 0,
      isUnlimited: true,
    };
  }
  if (max <= 0) {
    return {
      label: `${used} / —`,
      percentage: 0,
      isUnlimited: false,
    };
  }
  const pct = Math.min(100, Math.round((used / max) * 100));
  return {
    label: `${used} / ${max}`,
    percentage: pct,
    isUnlimited: false,
  };
}

// ─── CA-F23: Live Chat Draft & Mutation Safeguards ────────────────────────────
export interface ChatSendAttemptResult {
  success: boolean;
  error?: string;
  shouldClearDraft: boolean;
}

export async function attemptChatSend(
  text: string,
  sessionId: string | null,
  isPending: boolean,
  sendFn: (payload: { sessionId: string; text: string }) => Promise<void>
): Promise<ChatSendAttemptResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { success: false, shouldClearDraft: false };
  }
  if (!sessionId) {
    return { success: false, error: "No active session", shouldClearDraft: false };
  }
  if (isPending) {
    // Duplicate prevention
    return { success: false, error: "Send already in progress", shouldClearDraft: false };
  }
  try {
    await sendFn({ sessionId, text: trimmed });
    return { success: true, shouldClearDraft: true };
  } catch (err: any) {
    // Preserve draft on failure!
    return { success: false, error: err?.message || "Failed to send message", shouldClearDraft: false };
  }
}

// ─── CA-F16 / CA-F22: Module Switch Guard ──────────────────────────────────────
export function canToggleModule(inPlan: boolean, isPending: boolean): boolean {
  return inPlan && !isPending;
}
