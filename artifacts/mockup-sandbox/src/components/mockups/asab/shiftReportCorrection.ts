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
export type ShiftCorrectionShareDraft = { type: string; id: string; amountSar: string; name?: string | null };
export type ShiftCorrectionDraft = {
  cardPaymentsSar: string | null;
  countedCashSar: string | null;
  cashCollectedSar: string | null;
  handoverNotes: string | null;
  aggregators: ShiftCorrectionAggregatorDraft[] | null;
  shares: ShiftCorrectionShareDraft[] | null;
  reason: string;
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

function halalasToSar(value: unknown): string | null {
  if (!isSafeHalalas(value)) return null;
  const amount = BigInt(value);
  return `${amount / 100n}.${String(amount % 100n).padStart(2, "0")}`;
}

/** Strict decimal input: no float conversion or rounding. */
export function parseCorrectionSar(value: string): { sar: string; halalas: number } | null {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
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
): ShiftCorrectionRequest | null {
  const reportRevision = readConsistentVersion([detail.reportRevision, detail.payload?.reportRevision], true);
  if (!isPositiveVersion(reportRevision)) return null;
  const reason = draft.reason.trim();
  if (reason.length < 3) return null;

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
  if (initial.cashCollectedSar !== null && draft.cashCollectedSar !== initial.cashCollectedSar) {
    const before = parseCorrectionSar(initial.cashCollectedSar);
    const value = draft.cashCollectedSar === null ? null : parseCorrectionSar(draft.cashCollectedSar);
    if (!before || !value) return null;
    if (value.halalas !== before.halalas) changes.cash_collected = value.sar;
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
  if (currentShares && draft.shares && !sameValue(currentShares, draft.shares)) {
    const normalize = (rows: ShiftCorrectionShareDraft[]) => {
      const requestRows = [];
      const signature = [];
      for (const row of rows) {
        const amount = parseCorrectionSar(row.amountSar);
        if (!(["cashier", "employee", "branch_manager"] as string[]).includes(row.type)
          || !UUID.test(row.id) || !amount || amount.halalas === 0) return null;
        requestRows.push({ type: row.type as "cashier" | "employee" | "branch_manager", id: row.id, amount: amount.halalas });
        signature.push({ type: row.type, id: row.id, amount: amount.halalas });
      }
      return { requestRows, signature };
    };
    const before = normalize(currentShares);
    const current = normalize(draft.shares);
    if (!before || !current) return null;
    if (!sameValue(before.signature, current.signature)) {
      if (!current.requestRows.length) return null;
      shortageAllocations = current.requestRows;
    }
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
): Promise<boolean> {
  if (lock.current) return false;
  const initialEvidence = getShiftCorrectionEvidence(operation, initialDetail, role);
  if (!initialEvidence) return false;
  const request = prepareShiftCorrectionRequest(initialDetail, draft);
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
