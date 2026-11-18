/** COR-05 report correction contract. Monetary report fields are SAR strings; shares are halalas. */
export type ShiftCorrectionOperation = {
  id?: string;
  moduleKey?: string | null;
  module?: string | null;
  status?: string | null;
  reportReview?: unknown;
  reportRevision?: unknown;
  allocationVersion?: unknown;
  payload?: {
    shiftId?: unknown;
    reportRevision?: unknown;
    allocationVersion?: unknown;
    cashCountState?: unknown;
    salesHalalas?: unknown;
    cardTotalHalalas?: unknown;
    cashActualHalalas?: unknown;
    aggregatorBreakdown?: unknown;
    pkg6Review?: unknown;
  } | null;
  liability?: {
    version?: unknown;
    shares?: unknown;
  } | null;
};

export type ShiftCorrectionAggregatorDraft = { aggregatorId: string; amountSar: string; notes?: string | null };
export type ShiftCorrectionShareDraft = {
  type: string;
  id: string;
  amountSar: string;
  name?: string | null;
  empNumber?: string;
};
export type ShiftCorrectionDraft = {
  cardPaymentsSar: string | null;
  countedCashSar: string | null;
  cashCollectedSar: string | null;
  handoverNotes: string | null;
  aggregators: ShiftCorrectionAggregatorDraft[] | null;
  shares: ShiftCorrectionShareDraft[] | null;
  reason: string;
};
export type ShiftCorrectionRequestOptions = {
  enforceCashConfirmation?: boolean;
  cashConfirmed?: boolean;
  allowNewShares?: boolean;
};
export type ShiftCorrectionRequest = {
  expected_revision: number;
  expected_allocation_version?: number;
  reason: string;
  changes: {
    card_payments?: string;
    counted_cash?: string;
    cash_collected?: string;
    handover_notes?: string | null;
    aggregators?: Array<{ aggregator_id: string; amount: string; notes?: string | null }>;
  };
  shortage_allocations?: Array<{ type: "cashier" | "employee" | "branch_manager"; id: string; amount: number }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isSafeHalalas = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const isPositiveVersion = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

function reviewAllowsCorrection(review: unknown): boolean {
  if (review == null) return true; // Backend's supported absent-review fallback.
  if (!isRecord(review)) return false;
  if (!Object.hasOwn(review, "phase")) return true; // Backend defaults a missing phase.
  return review.phase === "accountant_review";
}

function readConsistentVersion(values: unknown[], required: boolean): number | null | undefined {
  const supplied = values.filter((value) => value !== undefined);
  if (!supplied.length) return required ? undefined : null;
  if (!required && supplied.every((value) => value === null)) return null;
  if (supplied.some((value) => value === null) || supplied.some((value) => !isPositiveVersion(value))) return undefined;
  const versions = supplied as number[];
  if (versions.some((value) => value !== versions[0])) return undefined;
  return versions[0];
}

export function getShiftCorrectionEvidence(
  operation: ShiftCorrectionOperation | undefined,
  detail: ShiftCorrectionOperation | undefined,
  role: string | null | undefined,
): { shiftId: string; reportRevision: number; allocationVersion: number | null } | null {
  if (!operation || role !== "accountant" || !detail || !operation.id || detail.id !== operation.id) return null;
  if ((operation.moduleKey ?? operation.module) !== "shifts" || (detail.moduleKey ?? detail.module) !== "shifts") return null;
  if (operation.status !== "pending" || detail.status !== "pending") return null;
  if (!reviewAllowsCorrection(operation.reportReview) || !reviewAllowsCorrection(detail.reportReview)
    || !reviewAllowsCorrection(detail.payload?.pkg6Review)) return null;

  const payload = detail.payload;
  if (typeof payload?.shiftId !== "string" || !payload.shiftId.trim()) return null;
  const reportRevision = readConsistentVersion([detail.reportRevision, payload.reportRevision], true);
  if (!isPositiveVersion(reportRevision)) return null;

  const hasLiability = detail.liability != null;
  const allocationVersion = readConsistentVersion(
    [detail.allocationVersion, payload.allocationVersion, detail.liability?.version], hasLiability,
  );
  if (allocationVersion === undefined || (hasLiability && !isPositiveVersion(allocationVersion))
    || (!hasLiability && allocationVersion !== null)) return null;
  return { shiftId: payload.shiftId.trim(), reportRevision, allocationVersion };
}

export function getShiftCorrectionIneligibilityReason(
  operation: ShiftCorrectionOperation | undefined,
  detail: ShiftCorrectionOperation | undefined,
  role: string | null | undefined,
  language: "ar" | "en" = "ar"
): string | null {
  if (getShiftCorrectionEvidence(operation, detail, role)) return null;

  if (role !== "accountant") {
    return language === "ar"
      ? "التصحيح متاح فقط لحساب المحاسب المصرح له"
      : "Correction is only available to authorized accountants";
  }
  if (!operation || !detail || !operation.id || detail.id !== operation.id) {
    return language === "ar"
      ? "بيانات العملية غير مكتملة أو غير محملة"
      : "Operation data is incomplete or not loaded";
  }
  if ((operation.moduleKey ?? operation.module) !== "shifts" || (detail.moduleKey ?? detail.module) !== "shifts") {
    return language === "ar"
      ? "العملية ليست تقرير وردية شفت"
      : "Operation is not a shift report";
  }
  if (operation.status !== "pending" || detail.status !== "pending") {
    const st = operation.status ?? detail.status ?? "unknown";
    return language === "ar"
      ? `حالة التقرير ليست معلقة (الحالة الحالية: ${st})`
      : `Report status is not pending (current status: ${st})`;
  }
  if (!reviewAllowsCorrection(operation.reportReview) || !reviewAllowsCorrection(detail.reportReview)
    || !reviewAllowsCorrection(detail.payload?.pkg6Review)) {
    const rawRev = (detail.payload?.pkg6Review ?? detail.reportReview) as Record<string, unknown> | undefined;
    const phase = typeof rawRev?.phase === "string" ? rawRev.phase : "غير محدد";
    return language === "ar"
      ? `مرحلة مراجعة التقرير ليست عند المحاسب (المرحلة الحالية: ${phase})`
      : `Report review stage is not with accountant (current stage: ${phase})`;
  }
  const payload = detail.payload;
  if (typeof payload?.shiftId !== "string" || !payload.shiftId.trim()) {
    return language === "ar"
      ? "معرّف الوردية غير متاح في بيانات التقرير"
      : "Shift ID is unavailable in report data";
  }
  const reportRevision = readConsistentVersion([detail.reportRevision, payload.reportRevision], true);
  if (!isPositiveVersion(reportRevision)) {
    return language === "ar"
      ? "رقم نسخة التقرير (revision) غير متسق أو مفقود"
      : "Report revision is inconsistent or missing";
  }
  const hasLiability = detail.liability != null;
  const allocationVersion = readConsistentVersion(
    [detail.allocationVersion, payload.allocationVersion, detail.liability?.version], hasLiability,
  );
  if (allocationVersion === undefined || (hasLiability && !isPositiveVersion(allocationVersion))
    || (!hasLiability && allocationVersion !== null)) {
    return language === "ar"
      ? "نسخة توزيع المسؤولية (allocation version) غير متسقة أو مفقودة"
      : "Allocation version is inconsistent or missing";
  }
  return language === "ar" ? "التقرير غير مؤهل للتصحيح حالياً" : "Report is currently ineligible for correction";
}

export function getShiftCorrectionNextStep(
  operation: ShiftCorrectionOperation | undefined,
  detail: ShiftCorrectionOperation | undefined,
  role: string | null | undefined,
  language: "ar" | "en" = "ar",
): string | null {
  if (getShiftCorrectionEvidence(operation, detail, role)) return null;

  if (role !== "accountant") {
    return language === "ar"
      ? "الخطوة المتاحة: يمكنك استعراض تفاصيل الوردية للقراءة فقط أو تنفيذ المراجعة المصرحة لدورك."
      : "Available step: Review the shift details in read-only mode or perform actions authorized for your role.";
  }

  const status = detail?.status ?? operation?.status;
  const rawRev = (detail?.payload?.pkg6Review ?? detail?.reportReview ?? operation?.reportReview) as
    | Record<string, unknown>
    | undefined;
  const phase = typeof rawRev?.phase === "string" ? rawRev.phase : undefined;

  if (status === "final-approved") {
    return language === "ar"
      ? "الخطوة المتاحة: السجل معتمد نهائيًا ومُقفل؛ القراءة والمراجعة فقط."
      : "Available step: This report is final-approved and locked; read-only inspection only.";
  }

  if (status === "approved" || phase === "head_review") {
    return language === "ar"
      ? "الخطوة المتاحة: التقرير لدى رئيس الحسابات حاليًا؛ انتظر قراره أو اطلب توضيحًا، وإذا أُعيد لك فسيُفتح التعديل."
      : "Available step: Report is currently with the Head Accountant; await their decision or request clarification. Editing reopens only if returned to you.";
  }

  if (status === "rejected" || phase === "manager_returned") {
    return language === "ar"
      ? "الخطوة المتاحة: انتظر إعادة إرسال التقرير من مدير الفرع حتى يعود إلى مرحلة مراجعة المحاسب."
      : "Available step: Await Branch Manager resubmission so the shift report returns to accountant review.";
  }

  if (phase === "head_returned") {
    return language === "ar"
      ? "الخطوة المتاحة: التقرير مُعاد من رئيس الحسابات؛ راجع سبب الإرجاع وأعده لمدير الفرع عند اللزوم."
      : "Available step: Returned by the Head Accountant; inspect the return reason and return it to the Branch Manager if needed.";
  }

  return language === "ar"
    ? "الخطوة المتاحة: حدّث تفاصيل العملية لإعادة التحقق من رقم النسخة وبيانات المراجعة."
    : "Available step: Refresh operation details to re-verify report revision and review metadata.";
}

export const SHIFT_VARIANCE_REASONS: ReadonlyArray<{
  value: string;
  ar: string;
  en: string;
}> = [
  { value: "تأخر تحويل من تطبيقات التوصيل", ar: "تأخر تحويل من تطبيقات التوصيل", en: "Delayed transfer from delivery apps" },
  { value: "خطأ في جهاز نقطة البيع (POS)", ar: "خطأ في جهاز نقطة البيع (POS)", en: "POS terminal error" },
  { value: "عملية مبيعات ملغاة", ar: "عملية مبيعات ملغاة", en: "Cancelled sales transaction" },
  { value: "فارق في الصندوق النقدي", ar: "فارق في الصندوق النقدي", en: "Cash till discrepancy" },
  { value: "خطأ في إدخال البيانات", ar: "خطأ في إدخال البيانات", en: "Data entry error" },
  { value: "تسوية لاحقة — جارٍ المتابعة", ar: "تسوية لاحقة — جارٍ المتابعة", en: "Deferred reconciliation — under follow-up" },
  { value: "أخرى", ar: "أخرى", en: "Other" },
];

export type ShiftCorrectionPreview = {
  grossHalalas: number | null;
  cardPaymentsHalalas: number | null;
  appsHalalas: number | null;
  cashCollectedHalalas: number | null;
  countedCashHalalas: number | null;
  totalCollectionHalalas: number | null;
  collectionDiffHalalas: number | null;
  projectedDrawerVarianceHalalas: number | null;
  targetShortageHalalas: number;
  derivedCashSalesHalalas: number | null;
  postedCustodyCashHalalas: number | null;
  projectedCustodyCashHalalas: number | null;
  cashEdited: boolean;
  cardsPlusAppsExceedsGross: boolean;
  cashExceedsDerivedCap: boolean;
  requiresExplicitCashConfirmation: boolean;
  cashAboveDerivedWhileIncreasing: boolean;
};

function readHalalaNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

export function evaluateShiftCorrectionPreview(
  detail: ShiftCorrectionOperation,
  draft: ShiftCorrectionDraft,
): ShiftCorrectionPreview {
  const initial = initialShiftCorrectionDraft(detail);
  const p = (detail.payload ?? {}) as Record<string, unknown>;
  const grossHalalas = readHalalaNumber(p.salesHalalas);

  const initialCardsH = initial.cardPaymentsSar !== null ? parseCorrectionSar(initial.cardPaymentsSar)?.halalas ?? null : null;
  const cardPaymentsHalalas = draft.cardPaymentsSar !== null
    ? parseCorrectionSar(draft.cardPaymentsSar)?.halalas ?? null
    : initialCardsH;

  const sumAggs = (rows: ShiftCorrectionAggregatorDraft[] | null): number | null => {
    if (!rows) return null;
    let total = 0;
    for (const row of rows) {
      const parsed = parseCorrectionSar(row.amountSar);
      if (!parsed) return null;
      total += parsed.halalas;
    }
    return total;
  };
  const fallbackAppsH = readHalalaNumber(p.aggregatorTotalsHalalas) ?? 0;
  const initialAppsH = initial.aggregators ? (sumAggs(initial.aggregators) ?? fallbackAppsH) : fallbackAppsH;
  const appsHalalas = draft.aggregators ? sumAggs(draft.aggregators) : fallbackAppsH;

  const initialCashH = initial.cashCollectedSar !== null ? parseCorrectionSar(initial.cashCollectedSar)?.halalas ?? null : null;
  const cashCollectedHalalas = draft.cashCollectedSar !== null
    ? parseCorrectionSar(draft.cashCollectedSar)?.halalas ?? null
    : initialCashH;

  const countedCashHalalas = draft.countedCashSar !== null
    ? parseCorrectionSar(draft.countedCashSar)?.halalas ?? null
    : null;

  const cardsPlusAppsExceedsGross =
    grossHalalas !== null &&
    cardPaymentsHalalas !== null &&
    appsHalalas !== null &&
    cardPaymentsHalalas + appsHalalas > grossHalalas;

  const derivedCashSalesHalalas =
    grossHalalas !== null && cardPaymentsHalalas !== null && appsHalalas !== null
      ? Math.max(0, grossHalalas - cardPaymentsHalalas - appsHalalas)
      : null;

  const initialDerivedCashSalesH =
    grossHalalas !== null && initialCardsH !== null && initialAppsH !== null
      ? Math.max(0, grossHalalas - initialCardsH - initialAppsH)
      : null;

  const postedCustodyCashHalalas =
    initialCashH !== null && initialDerivedCashSalesH !== null
      ? Math.min(initialCashH, initialDerivedCashSalesH)
      : null;

  const projectedCustodyCashHalalas =
    cashCollectedHalalas !== null && derivedCashSalesHalalas !== null
      ? Math.min(cashCollectedHalalas, derivedCashSalesHalalas)
      : null;

  const cashEdited =
    initialCashH !== null &&
    cashCollectedHalalas !== null &&
    cashCollectedHalalas !== initialCashH;

  const custodyIncreases =
    postedCustodyCashHalalas !== null &&
    projectedCustodyCashHalalas !== null &&
    projectedCustodyCashHalalas > postedCustodyCashHalalas;

  const channelsChanged =
    (initialCardsH !== null && cardPaymentsHalalas !== null && cardPaymentsHalalas !== initialCardsH) ||
    (initialAppsH !== null && appsHalalas !== null && appsHalalas !== initialAppsH);

  // BE-01 Mahmoud decision: require explicit cash confirmation ONLY when channel edits without an
  // explicit cash change would actually raise capped cashier custody above previously posted custody.
  // Edits that keep custody equal (e.g. cash=custody=90, cards 110->100) or lower custody
  // (e.g. cards 90->110 with untouched old cash) follow BE-01 without extra confirmation or cap error.
  const requiresExplicitCashConfirmation =
    channelsChanged &&
    initial.cashCollectedSar !== null &&
    custodyIncreases &&
    !cashEdited;

  const cashExceedsDerivedCap =
    derivedCashSalesHalalas !== null &&
    cashCollectedHalalas !== null &&
    cashCollectedHalalas > derivedCashSalesHalalas &&
    (cashEdited || custodyIncreases);

  const cashAboveDerivedWhileIncreasing =
    requiresExplicitCashConfirmation &&
    derivedCashSalesHalalas !== null &&
    cashCollectedHalalas !== null &&
    cashCollectedHalalas > derivedCashSalesHalalas;

  const totalCollectionHalalas =
    cashCollectedHalalas !== null && cardPaymentsHalalas !== null && appsHalalas !== null
      ? cashCollectedHalalas + cardPaymentsHalalas + appsHalalas
      : null;

  const collectionDiffHalalas =
    grossHalalas !== null && totalCollectionHalalas !== null
      ? grossHalalas - totalCollectionHalalas
      : null;

  const confirmedOpeningH =
    readHalalaNumber(p.confirmedOpeningHalalas) ??
    readHalalaNumber(p.confirmed_opening_halalas) ??
    readHalalaNumber((detail as Record<string, unknown>).confirmedOpeningHalalas) ??
    0;

  const projectedDrawerVarianceHalalas =
    p.cashCountState === "counted" &&
    countedCashHalalas !== null &&
    grossHalalas !== null &&
    cardPaymentsHalalas !== null &&
    appsHalalas !== null
      ? countedCashHalalas - (confirmedOpeningH + Math.max(0, grossHalalas - cardPaymentsHalalas - appsHalalas))
      : null;

  const drawerShortageH =
    projectedDrawerVarianceHalalas !== null && projectedDrawerVarianceHalalas < 0
      ? Math.abs(projectedDrawerVarianceHalalas)
      : 0;
  const collectionDeficitH =
    collectionDiffHalalas !== null && collectionDiffHalalas > 0
      ? collectionDiffHalalas
      : 0;

  const targetShortageHalalas =
    p.cashCountState === "counted" && projectedDrawerVarianceHalalas !== null
      ? Math.max(drawerShortageH, collectionDeficitH)
      : collectionDeficitH;

  return {
    grossHalalas,
    cardPaymentsHalalas,
    appsHalalas,
    cashCollectedHalalas,
    countedCashHalalas,
    totalCollectionHalalas,
    collectionDiffHalalas,
    projectedDrawerVarianceHalalas,
    targetShortageHalalas,
    derivedCashSalesHalalas,
    postedCustodyCashHalalas,
    projectedCustodyCashHalalas,
    cashEdited,
    cardsPlusAppsExceedsGross,
    cashExceedsDerivedCap,
    requiresExplicitCashConfirmation,
    cashAboveDerivedWhileIncreasing,
  };
}

export type ShortageAllocationValidation = {
  valid: boolean;
  allocatedHalalas: number;
  remainingHalalas: number;
  hasInvalidAmount: boolean;
  hasUnresolvedEmployee: boolean;
  hasDuplicateEmployee: boolean;
};

export function validateShortageAllocations(
  shares: readonly ShiftCorrectionShareDraft[] | null | undefined,
  targetShortageHalalas: number,
): ShortageAllocationValidation {
  if (targetShortageHalalas <= 0) {
    return {
      valid: true,
      allocatedHalalas: 0,
      remainingHalalas: 0,
      hasInvalidAmount: false,
      hasUnresolvedEmployee: false,
      hasDuplicateEmployee: false,
    };
  }
  const rows = shares ?? [];
  if (rows.length === 0) {
    return {
      valid: false,
      allocatedHalalas: 0,
      remainingHalalas: targetShortageHalalas,
      hasInvalidAmount: false,
      hasUnresolvedEmployee: true,
      hasDuplicateEmployee: false,
    };
  }

  let allocatedHalalas = 0;
  let hasInvalidAmount = false;
  let hasUnresolvedEmployee = false;
  let hasDuplicateEmployee = false;
  const seenIds = new Set<string>();
  const seenEmpNumbers = new Set<string>();

  for (const row of rows) {
    const parsed = parseCorrectionSar(row.amountSar);
    if (!parsed || parsed.halalas <= 0) {
      hasInvalidAmount = true;
    } else {
      allocatedHalalas += parsed.halalas;
    }
    const validType = (["cashier", "employee", "branch_manager"] as string[]).includes(row.type);
    const validId = UUID.test(row.id);
    if (!validType || !validId) {
      hasUnresolvedEmployee = true;
    } else {
      const actorKey = `${row.type}:${row.id}`;
      if (seenIds.has(actorKey)) hasDuplicateEmployee = true;
      seenIds.add(actorKey);
    }
    const num = row.empNumber?.trim();
    if (num) {
      if (seenEmpNumbers.has(num)) hasDuplicateEmployee = true;
      seenEmpNumbers.add(num);
    }
  }

  const remainingHalalas = targetShortageHalalas - allocatedHalalas;
  const valid =
    !hasInvalidAmount &&
    !hasUnresolvedEmployee &&
    !hasDuplicateEmployee &&
    remainingHalalas === 0;

  return {
    valid,
    allocatedHalalas,
    remainingHalalas,
    hasInvalidAmount,
    hasUnresolvedEmployee,
    hasDuplicateEmployee,
  };
}

function halalasToSar(value: unknown): string | null {
  if (!isSafeHalalas(value)) return null;
  const amount = BigInt(value);
  return `${amount / 100n}.${String(amount % 100n).padStart(2, "0")}`;
}

/** Strict decimal input: no float conversion or rounding. */
export function parseCorrectionSar(value: string): { sar: string; halalas: number } | null {
  const normalized = value.trim()
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".");
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const halalas = BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  if (halalas > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return {
    sar: `${match[1]}.${(match[2] ?? "").padEnd(2, "0") || "00"}`,
    halalas: Number(halalas),
  };
}

function correctionAggregators(detail: ShiftCorrectionOperation): ShiftCorrectionAggregatorDraft[] | null {
  const raw = detail.payload?.aggregatorBreakdown;
  if (!Array.isArray(raw)) return null;
  const rows: ShiftCorrectionAggregatorDraft[] = [];
  for (const value of raw) {
    if (!isRecord(value) || typeof value.aggregator !== "string" || !UUID.test(value.aggregator)) return null;
    const amountSar = halalasToSar(value.amountHalalas);
    if (amountSar === null || (value.notes !== undefined && value.notes !== null && typeof value.notes !== "string")) return null;
    rows.push({ aggregatorId: value.aggregator, amountSar,
      ...(typeof value.notes === "string" || value.notes === null ? { notes: value.notes } : {}) });
  }
  return rows;
}

function correctionShares(detail: ShiftCorrectionOperation): ShiftCorrectionShareDraft[] | null {
  const raw = detail.liability?.shares;
  if (!Array.isArray(raw)) return null;
  return raw.map((value) => {
    if (!isRecord(value)) return { type: "", id: "", amountSar: "" };
    return {
      type: typeof value.type === "string" ? value.type : "",
      id: typeof value.id === "string" && UUID.test(value.id) ? value.id : "",
      amountSar: halalasToSar(value.amountHalalas) ?? "",
      name: typeof value.name === "string" || value.name === null ? value.name : undefined,
    };
  });
}

export function initialShiftCorrectionDraft(detail: ShiftCorrectionOperation): ShiftCorrectionDraft {
  const p = detail.payload as Record<string, unknown> | undefined;
  const rawCashCollected = p?.cashCollectedHalalas ?? p?.cash_collected_halalas;
  const cashCollectedSar = isSafeHalalas(rawCashCollected)
    ? halalasToSar(rawCashCollected)
    : (typeof p?.cash_collected === "string" && parseCorrectionSar(p.cash_collected) ? parseCorrectionSar(p.cash_collected)!.sar : null);

  const notesSupported = Boolean(
    (p && ("handoverNotes" in p || "handover_notes" in p || "notes" in p)) ||
    ("handoverNotes" in (detail as Record<string, unknown>) || "handover_notes" in (detail as Record<string, unknown>))
  );
  const rawNotes = p?.handoverNotes ?? p?.notes ?? p?.handover_notes ?? (detail as Record<string, unknown>).handoverNotes ?? (detail as Record<string, unknown>).handover_notes;
  const handoverNotes = notesSupported
    ? (typeof rawNotes === "string" ? rawNotes : "")
    : null;

  return {
    cardPaymentsSar: halalasToSar(detail.payload?.cardTotalHalalas),
    countedCashSar: detail.payload?.cashCountState === "counted" ? halalasToSar(detail.payload.cashActualHalalas) : null,
    cashCollectedSar,
    handoverNotes,
    aggregators: correctionAggregators(detail),
    shares: detail.liability ? correctionShares(detail) : null,
    reason: "",
  };
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function prepareShiftCorrectionRequest(
  detail: ShiftCorrectionOperation,
  draft: ShiftCorrectionDraft,
  options?: ShiftCorrectionRequestOptions,
): ShiftCorrectionRequest | null {
  const reportRevision = readConsistentVersion([detail.reportRevision, detail.payload?.reportRevision], true);
  if (!isPositiveVersion(reportRevision)) return null;
  const reason = draft.reason.trim();
  if (reason.length < 3) return null;

  if (options?.enforceCashConfirmation) {
    const preview = evaluateShiftCorrectionPreview(detail, draft);
    if (preview.cardsPlusAppsExceedsGross || preview.cashExceedsDerivedCap) return null;
    if (preview.requiresExplicitCashConfirmation && !options.cashConfirmed) return null;
  }

  const changes: ShiftCorrectionRequest["changes"] = {};
  const initial = initialShiftCorrectionDraft(detail);
  if (initial.cardPaymentsSar !== null && draft.cardPaymentsSar !== initial.cardPaymentsSar) {
    const before = parseCorrectionSar(initial.cardPaymentsSar);
    const value = draft.cardPaymentsSar === null ? null : parseCorrectionSar(draft.cardPaymentsSar);
    if (!before || !value) return null;
    if (value.halalas !== before.halalas) changes.card_payments = value.sar;
  }
  if (initial.countedCashSar !== null && draft.countedCashSar !== initial.countedCashSar) {
    const before = parseCorrectionSar(initial.countedCashSar);
    const value = draft.countedCashSar === null ? null : parseCorrectionSar(draft.countedCashSar);
    if (!before || !value) return null;
    if (value.halalas !== before.halalas) changes.counted_cash = value.sar;
  }
  if (initial.cashCollectedSar !== null) {
    const before = parseCorrectionSar(initial.cashCollectedSar);
    const value = draft.cashCollectedSar === null ? null : parseCorrectionSar(draft.cashCollectedSar);
    if (!before || !value) return null;
    const forceConfirmedCash = Boolean(
      options?.enforceCashConfirmation &&
      options?.cashConfirmed &&
      evaluateShiftCorrectionPreview(detail, draft).requiresExplicitCashConfirmation,
    );
    if (value.halalas !== before.halalas || forceConfirmedCash) {
      changes.cash_collected = value.sar;
    }
  }
  if (initial.handoverNotes !== null && draft.handoverNotes !== null) {
    const currentNotes = draft.handoverNotes.trim();
    const initialNotes = initial.handoverNotes.trim();
    if (currentNotes !== initialNotes) {
      changes.handover_notes = currentNotes || null;
    }
  }
  if (initial.aggregators && draft.aggregators) {
    const normalize = (rows: ShiftCorrectionAggregatorDraft[]) => {
      const ids = new Set<string>();
      const requestRows = [];
      const signature = [];
      for (const row of rows) {
        const amount = parseCorrectionSar(row.amountSar);
        if (!UUID.test(row.aggregatorId) || ids.has(row.aggregatorId) || !amount) return null;
        ids.add(row.aggregatorId);
        requestRows.push({ aggregator_id: row.aggregatorId, amount: amount.sar,
          ...(row.notes !== undefined ? { notes: row.notes?.trim() || null } : {}) });
        signature.push({ id: row.aggregatorId, amount: amount.halalas,
          ...(row.notes !== undefined ? { notes: row.notes?.trim() || null } : {}) });
      }
      return { requestRows, signature };
    };
    const before = normalize(initial.aggregators);
    const current = normalize(draft.aggregators);
    if (!before || !current) return null;
    if (!sameValue(before.signature, current.signature)) {
      changes.aggregators = current.requestRows;
    }
  }

  let shortageAllocations: ShiftCorrectionRequest["shortage_allocations"];
  const currentShares = correctionShares(detail);
  const normalizeShares = (rows: ShiftCorrectionShareDraft[]) => {
    const requestRows: NonNullable<ShiftCorrectionRequest["shortage_allocations"]> = [];
    const signature: Array<{ type: string; id: string; amount: number }> = [];
    const seenIds = new Set<string>();
    for (const row of rows) {
      const amount = parseCorrectionSar(row.amountSar);
      if (!(["cashier", "employee", "branch_manager"] as string[]).includes(row.type)
        || !UUID.test(row.id) || !amount || amount.halalas === 0) return null;
      const actorKey = `${row.type}:${row.id}`;
      if (seenIds.has(actorKey)) return null;
      seenIds.add(actorKey);
      requestRows.push({ type: row.type as "cashier" | "employee" | "branch_manager", id: row.id, amount: amount.halalas });
      signature.push({ type: row.type, id: row.id, amount: amount.halalas });
    }
    return { requestRows, signature };
  };
  if (currentShares && draft.shares && !sameValue(currentShares, draft.shares)) {
    const before = normalizeShares(currentShares);
    const current = normalizeShares(draft.shares);
    if (!before || !current) return null;
    if (!sameValue(before.signature, current.signature)) {
      if (!current.requestRows.length) return null;
      shortageAllocations = current.requestRows;
    }
  } else if (!currentShares && options?.allowNewShares && draft.shares && draft.shares.length > 0) {
    const current = normalizeShares(draft.shares);
    if (!current || !current.requestRows.length) return null;
    shortageAllocations = current.requestRows;
  }

  const hasChanges = Object.keys(changes).length > 0 || shortageAllocations !== undefined;
  if (!hasChanges) return null;
  const allocationVersion = readConsistentVersion(
    [detail.allocationVersion, detail.payload?.allocationVersion, detail.liability?.version], detail.liability != null,
  );
  if (allocationVersion === undefined || (detail.liability != null && !isPositiveVersion(allocationVersion))) return null;
  const request: ShiftCorrectionRequest = {
    expected_revision: reportRevision,
    ...(isPositiveVersion(allocationVersion) ? { expected_allocation_version: allocationVersion } : {}),
    reason,
    changes,
    ...(shortageAllocations ? { shortage_allocations: shortageAllocations } : {}),
  };
  return request;
}

/** Re-fetch and compare concurrency coordinates before allowing the write. */
export async function runShiftReportCorrection(
  operation: ShiftCorrectionOperation,
  initialDetail: ShiftCorrectionOperation,
  role: string | null | undefined,
  draft: ShiftCorrectionDraft,
  loadDetail: () => Promise<ShiftCorrectionOperation>,
  send: (shiftId: string, body: ShiftCorrectionRequest) => Promise<unknown>,
  lock: { current: boolean },
  options?: ShiftCorrectionRequestOptions,
): Promise<boolean> {
  if (lock.current) return false;
  const initialEvidence = getShiftCorrectionEvidence(operation, initialDetail, role);
  if (!initialEvidence) return false;
  const request = prepareShiftCorrectionRequest(initialDetail, draft, options);
  if (!request) return false;
  lock.current = true;
  try {
    const fresh = await loadDetail();
    const freshEvidence = getShiftCorrectionEvidence(operation, fresh, role);
    if (!freshEvidence || freshEvidence.shiftId !== initialEvidence.shiftId
      || freshEvidence.reportRevision !== initialEvidence.reportRevision
      || freshEvidence.allocationVersion !== initialEvidence.allocationVersion) return false;
    await send(freshEvidence.shiftId, request);
    return true;
  } finally {
    lock.current = false;
  }
}
