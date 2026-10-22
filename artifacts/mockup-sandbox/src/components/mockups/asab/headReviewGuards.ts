/** Head permissions from current operation evidence. Membership revision IDs are not member statuses. */
export type HeadOperation = {
  id: string;
  module?: string | null;
  moduleKey?: string | null;
  status: string;
  reportReview?: unknown;
};

const moduleOf = (op: HeadOperation) => op.moduleKey ?? op.module;
const phaseOf = (op: HeadOperation) =>
  typeof op.reportReview === "object" &&
  op.reportReview !== null &&
  "phase" in op.reportReview
    ? op.reportReview.phase
    : undefined;
const isDay = (op: HeadOperation) =>
  moduleOf(op) === "sales" && op.reportReview != null;
export const HEAD_DAY_EVIDENCE_HINT = {
  ar: "دليل حالات جميع ورديات التقرير الحالي غير متاح؛ يجب اعتماد الورديات نهائيًا أولًا",
  en: "Current member shift statuses are unavailable; final approve the shifts first",
};
export const HEAD_EXPENSE_EVIDENCE_HINT = {
  ar: "قرار اعتماد المصروف محجوز للمالك أو مدير العلامة التجارية وفق القاعدة EXP-06",
  en: "Expense approval decision is reserved for the brand owner or manager per rule EXP-06",
};

export function getHeadReviewPolicy(
  op: HeadOperation | undefined,
  role: string | null | undefined,
  detail?: HeadOperation,
) {
  const denied = {
    finalApprove: false,
    returnForReview: false,
    blockedReason: null as string | null,
  };
  if (!op || role !== "head" || op.status !== "approved") return denied;
  if (
    detail &&
    (detail.id !== op.id ||
      detail.status !== "approved" ||
      moduleOf(detail) !== moduleOf(op))
  )
    return denied;
  if (
    moduleOf(op) === "expenses" ||
    (detail && moduleOf(detail) === "expenses")
  ) {
    return {
      ...denied,
      blockedReason: "expense_owner_decision_required",
    };
  }
  if (moduleOf(op) === "shifts") {
    if (
      phaseOf(op) !== "head_review" ||
      (detail && phaseOf(detail) !== "head_review")
    )
      return denied;
    return { finalApprove: true, returnForReview: true, blockedReason: null };
  }
  if (isDay(op) || (detail && isDay(detail)))
    return {
      ...denied,
      blockedReason: "day_evidence_missing",
    };
  return { finalApprove: true, returnForReview: true, blockedReason: null };
}

/** A protected row disables the entire selected bulk, never just silently drops that row. */
export function headLegacyBulkIds(
  ops: readonly HeadOperation[],
  ids: readonly string[],
  role: string | null | undefined,
  detailFor?: (op: HeadOperation) => HeadOperation | undefined,
): string[] {
  if (role !== "head" || ids.length === 0) return [];
  const byId = new Map(ops.map((op) => [op.id, op]));
  const unique = [...new Set(ids)];
  return unique.every((id) => {
    const op = byId.get(id);
    return (
      op &&
      moduleOf(op) !== "shifts" &&
      moduleOf(op) !== "expenses" &&
      getHeadReviewPolicy(op, role, detailFor?.(op)).finalApprove
    );
  })
    ? unique
    : [];
}

/** Locks synchronously, refetches the operation, then sends at most one mutation. */
export async function runHeadFinalApproval(
  op: HeadOperation | undefined,
  role: string | null | undefined,
  loadDetail: (id: string) => Promise<HeadOperation>,
  send: (id: string) => Promise<unknown>,
  lock: { current: boolean },
): Promise<boolean> {
  if (lock.current || !op || !getHeadReviewPolicy(op, role).finalApprove)
    return false;
  lock.current = true;
  try {
    const detail = await loadDetail(op.id);
    if (!getHeadReviewPolicy(op, role, detail).finalApprove) return false;
    await send(op.id);
    return true;
  } finally {
    lock.current = false;
  }
}

/**
 * Executes a financial mutation with in-flight lock, confirmed server response requirement,
 * and zero optimistic state changes on error.
 */
export async function runFinancialMutation<T>(
  opId: string,
  inFlight: Set<string>,
  mutationFn: () => Promise<T>,
  onSuccess: (result: T) => void,
): Promise<T> {
  if (inFlight.has(opId)) {
    throw new Error(`Operation ${opId} is already in flight`);
  }
  inFlight.add(opId);
  try {
    const result = await mutationFn();
    onSuccess(result);
    return result;
  } finally {
    inFlight.delete(opId);
  }
}

export interface ErpFilterCriteria {
  moduleFilter: string;
  branchFilter: string;
  restaurantFilter: string;
  statusFilter: string;
  periodFilter: string;
}

export function isOpWithinPeriod(
  opDateStr: string | null | undefined,
  period: string,
  now: Date = new Date(),
): boolean {
  if (period === "all" || !period) return true;
  if (!opDateStr) return false;
  const opDate = new Date(opDateStr);
  if (isNaN(opDate.getTime())) return false;
  const isoDayStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (period === "day") {
    return isoDayStr(opDate) === isoDayStr(now);
  }
  if (period === "week") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return opDate >= startOfWeek && opDate <= now;
  }
  if (period === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    return opDate >= startOfMonth && opDate <= now;
  }
  return true;
}

export interface HeadOpsApiClient {
  get: <T = any>(url: string, config?: any) => Promise<{ data: T }>;
}

export async function fetchAllHeadOpsPages<T = any>(
  url: string,
  filter: Record<string, any> = {},
  apiClient?: HeadOpsApiClient,
): Promise<T[]> {
  if (!apiClient) {
    throw new Error("apiClient must be provided to fetchAllHeadOpsPages");
  }
  const res = await apiClient.get<any>(url, { params: filter });
  const d = res.data;
  if (Array.isArray(d)) return d;
  const firstData = (d.data ?? []) as T[];
  const meta = d.meta;
  if (filter.page !== undefined || !meta || meta.totalPages <= 1) {
    return Object.assign(firstData, { meta });
  }
  const remaining = await Promise.all(
    Array.from({ length: meta.totalPages - 1 }, (_, i) =>
      apiClient
        .get<any>(url, {
          params: { ...filter, page: i + 2 },
        })
        .then((r) => (Array.isArray(r.data) ? (r.data as T[]) : ((r.data.data ?? []) as T[]))),
    ),
  );
  const all = [firstData, ...remaining].flat();
  return Object.assign(all, {
    meta: { ...meta, total: meta.total ?? all.length },
  });
}

export function filterErpOperations<
  T extends {
    id: string;
    status: string;
    moduleKey?: string | null;
    branch?: string | null;
    brandName?: string | null;
    amount: number | null;
    operationDate?: string | null;
    finalApprovedAt?: string | null;
    approvedAt?: string | null;
    erpPosted?: boolean;
  },
>(ops: readonly T[], criteria: ErpFilterCriteria, now: Date = new Date()): T[] {
  return ops.filter((o) => {
    // Only pending ERP items (final-approved and not yet posted)
    if (o.erpPosted || o.status !== "final-approved") return false;
    if (
      criteria.statusFilter === "approved_only" &&
      o.status !== "final-approved"
    )
      return false;
    if (
      criteria.moduleFilter !== "all" &&
      o.moduleKey !== criteria.moduleFilter
    )
      return false;
    if (criteria.branchFilter !== "all" && o.branch !== criteria.branchFilter)
      return false;
    if (
      criteria.restaurantFilter !== "all" &&
      o.brandName !== criteria.restaurantFilter &&
      o.branch !== criteria.restaurantFilter
    )
      return false;
    const dateStr = o.operationDate || o.finalApprovedAt || o.approvedAt;
    if (!isOpWithinPeriod(dateStr, criteria.periodFilter, now)) return false;
    // HA-F11: Exclude unknown money from posting
    if (o.amount == null) return false;
    return true;
  });
}

export function canProceedPreflight(
  erpPreflight:
    | { canProceed?: boolean; checks?: { ok: boolean; severity?: string }[] }
    | null
    | undefined,
): boolean {
  if (!erpPreflight) return true;
  if (erpPreflight.canProceed === false) return false;
  const checks = erpPreflight.checks ?? [];
  return !checks.some((c) => !c.ok && c.severity === "error");
}

export function aggregateOpsAmount(
  ops: readonly { amount: number | null }[],
): number | null {
  if (ops.some((o) => o.amount == null)) return null;
  return ops.reduce((s, o) => s + (o.amount ?? 0), 0);
}

export function shouldUpdateHeadOps<
  T extends { id: string; status: string; amount: number | null },
>(
  currentOps: readonly T[],
  nextOps: readonly T[],
  allQueriesSucceeded: boolean,
): { shouldUpdate: boolean; nextOps: T[] } {
  if (!allQueriesSucceeded) {
    return { shouldUpdate: false, nextOps: currentOps as T[] };
  }
  // Compare contents to prevent render loop
  if (
    currentOps.length === nextOps.length &&
    currentOps.every(
      (o, i) =>
        o.id === nextOps[i].id &&
        o.status === nextOps[i].status &&
        o.amount === nextOps[i].amount,
    )
  ) {
    return { shouldUpdate: false, nextOps: currentOps as T[] };
  }
  return { shouldUpdate: true, nextOps: nextOps as T[] };
}

export function validateConditionalApproval(note: string | null | undefined): {
  ok: boolean;
  trimmedNote?: string;
  error?: string;
} {
  if (typeof note !== "string" || !note.trim()) {
    return { ok: false, error: "note_required" };
  }
  return { ok: true, trimmedNote: note.trim() };
}
