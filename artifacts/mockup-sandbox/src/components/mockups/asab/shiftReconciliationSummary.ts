import { formatShiftHalalas } from "./shiftCountEvidence.ts";

export type Language = "ar" | "en";

export type ShiftReconciliationSource = {
  id?: string;
  salesHalalas?: unknown;
  cardTotalHalalas?: unknown;
  aggregatorTotalsHalalas?: unknown;
  confirmedOpeningHalalas?: unknown;
  confirmed_opening_halalas?: unknown;
  openingFloatHalalas?: unknown;
  cashExpectedHalalas?: unknown;
  cashActualHalalas?: unknown;
  cashCountState?: unknown;
  varianceHalalas?: unknown;
  reportRevision?: unknown;
  reportReview?: unknown;
  status?: string | null;
  payload?: {
    shiftId?: unknown;
    salesHalalas?: unknown;
    cardTotalHalalas?: unknown;
    aggregatorTotalsHalalas?: unknown;
    confirmedOpeningHalalas?: unknown;
    confirmed_opening_halalas?: unknown;
    openingFloatHalalas?: unknown;
    cashExpectedHalalas?: unknown;
    cashActualHalalas?: unknown;
    cashCountState?: unknown;
    varianceHalalas?: unknown;
    reportRevision?: unknown;
    pkg6Review?: unknown;
    liability?: unknown;
    varianceAllocations?: unknown;
  } | null;
  liability?: {
    version?: unknown;
    reportRevision?: unknown;
    managerApprovalStatus?: unknown;
    createdByType?: unknown;
    shares?: Array<{
      type?: string | null;
      id?: string | null;
      name?: string | null;
      amountHalalas?: unknown;
    }> | null;
  } | null;
};

export type ReconciliationItem = {
  amountHalalas: number | null;
  formatted: string;
  isAvailable: boolean;
};

export type ReconciliationVariance = {
  amountHalalas: number | null;
  kind: "matched" | "shortage" | "surplus" | "unavailable";
  formatted: string;
  isAvailable: boolean;
};

export type ReconciliationResponsibility = {
  assignedHalalas: number;
  formatted: string;
  status: "approved" | "pending" | "awaiting_allocation" | "stale_revision" | "none";
  label: string;
  isApplicable: boolean;
  isAvailable: boolean;
  shares: Array<{
    type: string;
    id: string;
    name?: string | null;
    amountHalalas: number;
  }>;
};

export type ShiftReconciliationSummary = {
  originalSales: ReconciliationItem;
  expectedCash: ReconciliationItem;
  countedCash: ReconciliationItem;
  originalVariance: ReconciliationVariance;
  currentResponsibility: ReconciliationResponsibility;
  unassignedAmount: ReconciliationItem;
  allocationCompleteIndicator: {
    isComplete: boolean;
    text: string;
    cls: string;
  };
  reviewStage: {
    phase: string;
    label: string;
    isDebtFinal: boolean;
  };
};

const isSafeHalalas = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function getShiftReconciliationSummary(
  source: ShiftReconciliationSource | null | undefined,
  language: Language = "ar"
): ShiftReconciliationSummary {
  const unavailableText = language === "ar" ? "غير متاح" : "Unavailable";
  const notCountedText = language === "ar" ? "غير مجرود" : "Not counted";
  const sarSuffix = language === "ar" ? "ر.س" : "SAR";

  if (!source) {
    return {
      originalSales: { amountHalalas: null, formatted: unavailableText, isAvailable: false },
      expectedCash: { amountHalalas: null, formatted: unavailableText, isAvailable: false },
      countedCash: { amountHalalas: null, formatted: unavailableText, isAvailable: false },
      originalVariance: { amountHalalas: null, kind: "unavailable", formatted: unavailableText, isAvailable: false },
      currentResponsibility: {
        assignedHalalas: 0,
        formatted: unavailableText,
        status: "none",
        label: unavailableText,
        isApplicable: false,
        isAvailable: false,
        shares: [],
      },
      unassignedAmount: { amountHalalas: null, formatted: unavailableText, isAvailable: false },
      allocationCompleteIndicator: { isComplete: false, text: "", cls: "" },
      reviewStage: {
        phase: "unknown",
        label: language === "ar" ? "تحت المراجعة" : "Under review",
        isDebtFinal: false,
      },
    };
  }

  // 1. Original Gross Sales
  const rawSales = source.salesHalalas ?? source.payload?.salesHalalas;
  const originalSales: ReconciliationItem = isSafeHalalas(rawSales)
    ? { amountHalalas: rawSales, formatted: `${formatShiftHalalas(rawSales, language)} ${sarSuffix}`, isAvailable: true }
    : { amountHalalas: null, formatted: unavailableText, isAvailable: false };

  // 2. Expected Cash
  const rawExpected = source.cashExpectedHalalas ?? source.payload?.cashExpectedHalalas;
  const expectedCash: ReconciliationItem = isSafeHalalas(rawExpected)
    ? { amountHalalas: rawExpected, formatted: `${formatShiftHalalas(rawExpected, language)} ${sarSuffix}`, isAvailable: true }
    : { amountHalalas: null, formatted: unavailableText, isAvailable: false };

  // 3. Counted Cash
  const rawCountState = source.cashCountState ?? source.payload?.cashCountState;
  const rawCounted = source.cashActualHalalas ?? source.payload?.cashActualHalalas;
  const isCounted = rawCountState === "counted" && isSafeHalalas(rawCounted);
  const countedCash: ReconciliationItem = isCounted
    ? { amountHalalas: rawCounted, formatted: `${formatShiftHalalas(rawCounted, language)} ${sarSuffix}`, isAvailable: true }
    : {
        amountHalalas: null,
        formatted: rawCountState === "unknown" ? notCountedText : unavailableText,
        isAvailable: false,
      };

  // 4. Original Physical Variance
  const rawVariance = source.varianceHalalas ?? source.payload?.varianceHalalas;
  let originalVariance: ReconciliationVariance;
  if (!isCounted || !isSafeHalalas(rawVariance)) {
    originalVariance = {
      amountHalalas: null,
      kind: "unavailable",
      formatted: unavailableText,
      isAvailable: false,
    };
  } else if (rawVariance === 0) {
    originalVariance = {
      amountHalalas: 0,
      kind: "matched",
      formatted: language === "ar" ? "✓ متطابق" : "✓ Matched",
      isAvailable: true,
    };
  } else if (rawVariance > 0) {
    originalVariance = {
      amountHalalas: rawVariance,
      kind: "surplus",
      formatted: `${formatShiftHalalas(rawVariance, language, true)} ${sarSuffix} ${language === "ar" ? "(فائض للفرع)" : "(Branch surplus)"}`,
      isAvailable: true,
    };
  } else {
    originalVariance = {
      amountHalalas: rawVariance,
      kind: "shortage",
      formatted: `${formatShiftHalalas(rawVariance, language, true)} ${sarSuffix}`,
      isAvailable: true,
    };
  }

  // 5. Current Responsibility (latest non-superseded allocation matching report revision)
  const reportRevision = source.reportRevision ?? source.payload?.reportRevision;
  const rawLiability = (source.liability ?? source.payload?.liability) as
    | ShiftReconciliationSource["liability"]
    | undefined;

  let currentResponsibility: ReconciliationResponsibility;
  if (originalVariance.kind === "unavailable" || !originalVariance.isAvailable) {
    currentResponsibility = {
      assignedHalalas: 0,
      formatted: unavailableText,
      status: "none",
      label: unavailableText,
      isApplicable: false,
      isAvailable: false,
      shares: [],
    };
  } else if (originalVariance.kind !== "shortage") {
    // No physical shortage => no responsibility allocation needed
    currentResponsibility = {
      assignedHalalas: 0,
      formatted: "—",
      status: "none",
      label: "—",
      isApplicable: false,
      isAvailable: true,
      shares: [],
    };
  } else if (!rawLiability || !Array.isArray(rawLiability.shares) || rawLiability.shares.length === 0) {
    currentResponsibility = {
      assignedHalalas: 0,
      formatted: language === "ar" ? "بانتظار الاعتماد" : "Awaiting approval",
      status: "awaiting_allocation",
      label: language === "ar" ? "غير مسند بعد" : "Not yet assigned",
      isApplicable: true,
      isAvailable: false,
      shares: [],
    };
  } else {
    // Check revision consistency: if liability specifies reportRevision, it must match
    const liabilityRevision = rawLiability.reportRevision;
    if (
      typeof liabilityRevision === "number" &&
      typeof reportRevision === "number" &&
      liabilityRevision !== reportRevision
    ) {
      currentResponsibility = {
        assignedHalalas: 0,
        formatted: language === "ar" ? "نسخة توزيع قديمة غير مطابقة للتقرير" : "Stale allocation revision",
        status: "stale_revision",
        label: language === "ar" ? "نسخة قديمة" : "Stale revision",
        isApplicable: true,
        isAvailable: false,
        shares: [],
      };
    } else {
      // Sum valid shares for the current allocation version. NEVER sum proposed + approved!
      let totalSharesHalalas = 0;
      const validShares: ReconciliationResponsibility["shares"] = [];
      for (const share of rawLiability.shares) {
        if (isRecord(share) && isSafeHalalas(share.amountHalalas) && (share.amountHalalas as number) > 0) {
          const amt = share.amountHalalas as number;
          totalSharesHalalas += amt;
          validShares.push({
            type: typeof share.type === "string" ? share.type : "employee",
            id: typeof share.id === "string" ? share.id : "",
            name: typeof share.name === "string" ? share.name : null,
            amountHalalas: amt,
          });
        }
      }

      const isManagerApproved = rawLiability.managerApprovalStatus === "approved";
      currentResponsibility = {
        assignedHalalas: totalSharesHalalas,
        formatted: `${formatShiftHalalas(totalSharesHalalas, language)} ${sarSuffix}`,
        status: isManagerApproved ? "approved" : "pending",
        label: isManagerApproved
          ? language === "ar"
            ? "معتمد من المدير — تحت المراجعة"
            : "Approved by manager — under review"
          : language === "ar"
            ? "مقترح من الكاشير — بانتظار اعتماد المدير"
            : "Proposed by cashier — awaiting manager review",
        isApplicable: true,
        isAvailable: true,
        shares: validShares,
      };
    }
  }

  // 6. UNASSIGNED Amount (MTG-REC-02 & MT-06)
  // When variance is unavailable or uncounted, unassigned must display "غير متاح", NEVER 0.
  // 0 is only displayed when verified by positive data (matched, surplus, or 100% assigned shortage).
  let unassignedAmount: ReconciliationItem;
  if (originalVariance.kind === "unavailable" || !originalVariance.isAvailable) {
    unassignedAmount = {
      amountHalalas: null,
      formatted: unavailableText,
      isAvailable: false,
    };
  } else if (originalVariance.kind === "matched" || originalVariance.kind === "surplus") {
    unassignedAmount = {
      amountHalalas: 0,
      formatted: `${formatShiftHalalas(0, language)} ${sarSuffix}`,
      isAvailable: true,
    };
  } else if (originalVariance.kind === "shortage") {
    const shortageHalalas = Math.abs(originalVariance.amountHalalas!);
    if (!currentResponsibility.isAvailable) {
      unassignedAmount = {
        amountHalalas: shortageHalalas,
        formatted: `${formatShiftHalalas(shortageHalalas, language)} ${sarSuffix}`,
        isAvailable: true,
      };
    } else {
      const unassignedHalalas = Math.max(0, shortageHalalas - currentResponsibility.assignedHalalas);
      unassignedAmount = {
        amountHalalas: unassignedHalalas,
        formatted: `${formatShiftHalalas(unassignedHalalas, language)} ${sarSuffix}`,
        isAvailable: true,
      };
    }
  } else {
    unassignedAmount = {
      amountHalalas: null,
      formatted: unavailableText,
      isAvailable: false,
    };
  }

  // 7. Allocation Complete Indicator ("التوزيع مكتمل — تحت المراجعة")
  // Shows when all shortage has been assigned (unassigned === 0), but debt is still under review
  const isAllocationComplete = Boolean(
    originalVariance.kind === "shortage" &&
    currentResponsibility.isAvailable &&
    currentResponsibility.assignedHalalas > 0 &&
    unassignedAmount.amountHalalas === 0
  );

  const allocationCompleteIndicator = {
    isComplete: isAllocationComplete,
    text: isAllocationComplete
      ? language === "ar"
        ? "التوزيع مكتمل — تحت المراجعة"
        : "Allocation complete — under review"
      : "",
    cls: isAllocationComplete
      ? "text-violet-700 bg-violet-50 border border-violet-200"
      : "",
  };

  // 8. Actual Review Stage (STMT-01: debt is under review until head approval; no "final" label earlier)
  const rawReview = (source.payload?.pkg6Review ?? source.reportReview) as Record<string, unknown> | undefined;
  const phase = typeof rawReview?.phase === "string" ? rawReview.phase : "";
  const isFinalDebtApproved = source.status === "final-approved" || rawReview?.status === "final-approved";

  let stageLabel = language === "ar" ? "تحت المراجعة" : "Under review";
  if (isFinalDebtApproved) {
    stageLabel = language === "ar" ? "معتمد نهائياً من رئيس الحسابات" : "Final-approved by head accountant";
  } else if (phase === "accountant_review") {
    stageLabel = language === "ar" ? "عند المحاسب (مراجعة وتصحيح)" : "With accountant (review & correction)";
  } else if (phase === "head_review") {
    stageLabel = language === "ar" ? "عند رئيس الحسابات (تحت مراجعة المديونية)" : "With head accountant (debt under review)";
  } else if (phase === "head_returned") {
    stageLabel = language === "ar" ? "أعادها رئيس الحسابات" : "Returned by head accountant";
  } else if (phase === "manager_returned") {
    stageLabel = language === "ar" ? "أُعيدت لمدير الفرع" : "Returned to branch manager";
  }

  return {
    originalSales,
    expectedCash,
    countedCash,
    originalVariance,
    currentResponsibility,
    unassignedAmount,
    allocationCompleteIndicator,
    reviewStage: {
      phase: phase || "under_review",
      label: stageLabel,
      isDebtFinal: isFinalDebtApproved,
    },
  };
}
