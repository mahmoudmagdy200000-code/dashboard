/** Accountant SHF shortage correction: use only current operation evidence. */
export type ShfAllocationOperation = {
  id?: string;
  module?: string | null;
  moduleKey?: string | null;
  status?: string | null;
  reportReview?: unknown;
  payload?: {
    shiftId?: unknown;
    cashCountState?: unknown;
    varianceHalalas?: unknown;
    pkg6Review?: unknown;
  } | null;
};

export type ShfAllocationRow = { empNumber: string; amountSar: string };
export type ShfAllocation = { empNumber: string; amountHalalas: number };

const isShift = (op: ShfAllocationOperation) =>
  (op.module ?? op.moduleKey) === "shifts" && (op.moduleKey == null || op.moduleKey === "shifts");

function phaseAllowsCorrection(review: unknown): boolean {
  if (review == null) return true; // Backend defaults an absent phase to accountant_review.
  if (typeof review !== "object" || Array.isArray(review)) return false;
  if (!Object.hasOwn(review, "phase")) return true;
  const phase = (review as { phase?: unknown }).phase;
  return phase === "accountant_review";
}

function listAllowsCorrection(op: ShfAllocationOperation | undefined, role: string | null | undefined): op is ShfAllocationOperation {
  return !!op && role === "accountant" && isShift(op) && op.status === "pending" && phaseAllowsCorrection(op.reportReview);
}

export function getShfAllocationEvidence(op: ShfAllocationOperation | undefined, detail: ShfAllocationOperation | undefined,
  role: string | null | undefined): { shiftId: string; shortageHalalas: number } | null {
  if (!listAllowsCorrection(op, role) || !detail || detail.id !== op.id || !isShift(detail) || detail.status !== "pending") return null;
  if (!phaseAllowsCorrection(detail.reportReview) || !phaseAllowsCorrection(detail.payload?.pkg6Review)) return null;
  const payload = detail.payload;
  if (typeof payload?.shiftId !== "string" || !payload.shiftId.trim() || payload.cashCountState !== "counted") return null;
  const variance = payload.varianceHalalas;
  if (typeof variance !== "number" || !Number.isSafeInteger(variance) || variance >= 0) return null;
  return { shiftId: payload.shiftId, shortageHalalas: -variance };
}

/** Exact SAR decimal input to positive safe-integer halalas. No rounding or coercion. */
export function parsePositiveSarHalalas(value: string): number | null {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const halalas = BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  return halalas > 0n && halalas <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(halalas) : null;
}

export function prepareShfAllocations(rows: readonly ShfAllocationRow[], shortageHalalas: number): ShfAllocation[] | null {
  if (remainingShfAllocationHalalas(rows, shortageHalalas) !== 0) return null;
  const allocations: ShfAllocation[] = [];
  for (const row of rows) {
    const empNumber = row.empNumber.trim();
    const amountHalalas = parsePositiveSarHalalas(row.amountSar);
    if (!empNumber || amountHalalas === null) return null;
    allocations.push({ empNumber, amountHalalas });
  }
  return allocations;
}

/** Input-only remainder for the form; never used as report variance. */
export function remainingShfAllocationHalalas(rows: readonly ShfAllocationRow[], shortageHalalas: number): number | null {
  if (!Number.isSafeInteger(shortageHalalas) || shortageHalalas <= 0 || rows.length === 0) return null;
  let sum = 0n;
  for (const row of rows) {
    if (!row.empNumber.trim()) return null;
    const amount = parsePositiveSarHalalas(row.amountSar);
    if (amount === null) return null;
    sum += BigInt(amount);
  }
  const remaining = BigInt(shortageHalalas) - sum;
  return remaining >= BigInt(Number.MIN_SAFE_INTEGER) && remaining <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(remaining) : null;
}

/** Re-fetch before the mutation so an old form cannot send for a changed phase or amount. */
export async function runShfAllocationCorrection(
  op: ShfAllocationOperation, role: string | null | undefined, rows: readonly ShfAllocationRow[],
  loadDetail: () => Promise<ShfAllocationOperation>,
  send: (shiftId: string, allocations: ShfAllocation[]) => Promise<unknown>,
  lock: { current: boolean },
): Promise<boolean> {
  if (lock.current || !listAllowsCorrection(op, role)) return false;
  lock.current = true;
  try {
    const evidence = getShfAllocationEvidence(op, await loadDetail(), role);
    const allocations = evidence && prepareShfAllocations(rows, evidence.shortageHalalas);
    if (!evidence || !allocations) return false;
    await send(evidence.shiftId, allocations);
    return true;
  } finally {
    lock.current = false;
  }
}
