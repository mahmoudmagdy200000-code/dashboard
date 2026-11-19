import type { Operation } from "../../../../../api/types";
import type { ShiftCustodyStatement } from "../../../../../api/queries/employees";
import type { Employee, Shift } from "../../../../../api/types/company";

type CustodyEntry = ShiftCustodyStatement["entries"][number];
type PendingHandoverRequest = ShiftCustodyStatement["pending"][number];
type ShiftCustodyIdentity = ShiftCustodyStatement["identity"];

type OperationWithManagerPayload = Operation & {
  payload?: (Operation["payload"] & {
    managerName?: string | null;
    managerShiftId?: string | null;
  }) | null;
};

export interface ManagerDaySalesGroup {
  date: string;
  totalHalalas: number | null;
  items: OperationWithManagerPayload[];
}

export interface ManagerCustodyHandoversSummary {
  confirmedEntries: CustodyEntry[];
  pendingRequests: PendingHandoverRequest[];
  confirmedTotalHalalas: number;
  pendingTotalHalalas: number;
}

export interface ShiftCustodyCreditDebitSummary {
  isAvailable: boolean;
  openingBalanceHalalas: number;
  /** Cash handed over / settled to manager or next cashier (cash_out). */
  creditDeliveredHalalas: number;
  /** Cash received into employee custody from shift sales / incoming handovers (cash_in). */
  debitReceivedHalalas: number;
  closingBalanceHalalas: number;
  pendingDeliveredHalalas: number;
  pendingReceivedHalalas: number;
}

const CASHIER_ROLES = new Set([
  "cashier",
  "head cashier",
  "senior cashier",
  "كاشير",
  "كاشير رئيسي",
  "أمين صندوق",
  "امين صندوق",
]);

const BRANCH_MANAGER_ROLES = new Set([
  "branch manager",
  "branch",
  "manager",
  "store manager",
  "مدير فرع",
  "مدير الفرع",
  "مشرف فرع",
]);

function normalizeText(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/** True when an employee's DB role or custody identity identifies a cashier. */
export function isCashierEmployeeRole(
  role?: string | null,
  linkedType?: string | null,
): boolean {
  if (linkedType === "cashier") return true;
  const norm = normalizeText(role);
  if (!norm) return false;
  return (
    CASHIER_ROLES.has(norm) ||
    norm.startsWith("cashier ") ||
    norm.startsWith("كاشير ")
  );
}

/** True when an employee's DB role or custody identity identifies a branch manager. */
export function isBranchManagerEmployeeRole(
  role?: string | null,
  linkedType?: string | null,
): boolean {
  if (linkedType === "branch_manager") return true;
  const norm = normalizeText(role);
  if (!norm) return false;
  return BRANCH_MANAGER_ROLES.has(norm);
}

/** Normalizes Arabic/variant cashier roles to "cashier" for shared shift UI widgets. */
export function withNormalizedCashierRole<T extends { role?: string }>(
  employee: T,
  linkedType?: string | null,
): T {
  if (!isCashierEmployeeRole(employee.role, linkedType)) return employee;
  if (employee.role === "cashier") return employee;
  return { ...employee, role: "cashier" };
}

function shiftSortTimestamp(shift: Pick<Shift, "endedAt" | "startedAt">): number {
  const iso = shift.endedAt || shift.startedAt;
  if (!iso) return 0;
  const ts = Date.parse(iso);
  return Number.isNaN(ts) ? 0 : ts;
}

/**
 * Resolves closed/pending_review shifts assigned strictly to `employee`,
 * bridging employee.id and custody identity.linked_id when linked as a cashier.
 */
export function resolveCashierShifts(
  byEmployee: Readonly<Record<string, Shift[]>> | undefined,
  employee: Pick<Employee, "id">,
  identity?: Pick<
    ShiftCustodyIdentity,
    "employee_id" | "linked_type" | "linked_id"
  > | null,
): Shift[] | undefined {
  if (!byEmployee) return undefined;
  const primary = byEmployee[employee.id] ?? [];
  const linkedId =
    identity?.employee_id === employee.id &&
    identity.linked_type === "cashier" &&
    identity.linked_id &&
    identity.linked_id !== employee.id
      ? identity.linked_id
      : null;
  const secondary = linkedId ? (byEmployee[linkedId] ?? []) : [];

  if (secondary.length === 0) {
    return [...primary].sort(
      (a, b) => shiftSortTimestamp(b) - shiftSortTimestamp(a),
    );
  }

  const seen = new Set<string>();
  const combined: Shift[] = [];
  for (const s of [...primary, ...secondary]) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    combined.push(s);
  }
  return combined.sort((a, b) => shiftSortTimestamp(b) - shiftSortTimestamp(a));
}

export function getOperationManagerName(
  op: Pick<OperationWithManagerPayload, "payload" | "submittedBy">,
): string | null {
  const fromPayload =
    typeof op.payload?.managerName === "string"
      ? op.payload.managerName.trim()
      : "";
  if (fromPayload) return fromPayload;
  const fromSubmitter =
    typeof op.submittedBy?.name === "string" ? op.submittedBy.name.trim() : "";
  if (fromSubmitter && fromSubmitter !== "—") return fromSubmitter;
  return null;
}

/** Counts listed branch managers per branch so attribution stays strict in multi-manager branches. */
export function countBranchManagersByBranch(
  employees: readonly Pick<Employee, "branchId" | "role">[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const emp of employees) {
    if (!emp.branchId || !isBranchManagerEmployeeRole(emp.role)) continue;
    counts[emp.branchId] = (counts[emp.branchId] ?? 0) + 1;
  }
  return counts;
}

/**
 * Matches a daily sales report operation to a specific branch manager.
 * When actor identity is unavailable on list items, attributes only if the branch has a single manager.
 */
export function isManagerDailySalesOperation(
  op: Pick<
    OperationWithManagerPayload,
    "moduleKey" | "status" | "branchId" | "payload" | "submittedBy"
  >,
  manager: Pick<Employee, "name" | "branchId">,
  managersInBranchCount: number,
): boolean {
  if (op.moduleKey !== "sales") return false;
  if (op.status === "rejected") return false;
  if (op.branchId !== manager.branchId) return false;

  const actorName = getOperationManagerName(op);
  if (actorName) {
    return normalizeText(actorName) === normalizeText(manager.name);
  }
  return managersInBranchCount <= 1;
}

export function filterManagerDailySalesOperations(
  branchSalesOps: readonly OperationWithManagerPayload[] | undefined,
  manager: Pick<Employee, "name" | "branchId">,
  managersInBranchCount: number,
): OperationWithManagerPayload[] | undefined {
  if (!branchSalesOps) return undefined;
  return branchSalesOps.filter((op) =>
    isManagerDailySalesOperation(op, manager, managersInBranchCount),
  );
}

/** Sum of non-rejected daily sales reports in halalas; null if unavailable or incomplete. */
export function totalManagerDailySalesHalalas(
  ops: readonly Pick<Operation, "amountHalalas" | "status">[] | undefined,
): number | null {
  if (!ops) return null;
  let total = 0;
  for (const op of ops) {
    if (op.status === "rejected") continue;
    if (typeof op.amountHalalas !== "number" || !Number.isFinite(op.amountHalalas)) {
      return null;
    }
    total += op.amountHalalas;
  }
  return total;
}

function operationDateKey(
  op: Pick<Operation, "operationDate" | "submittedAt" | "createdAt">,
): string {
  const raw = op.operationDate || op.submittedAt || op.createdAt || "";
  return raw ? raw.slice(0, 10) : "unknown";
}

function operationSortTime(
  op: Pick<Operation, "operationDate" | "submittedAt" | "createdAt">,
): number {
  const raw = op.submittedAt || op.createdAt || op.operationDate || "";
  if (!raw) return 0;
  const ts = Date.parse(raw);
  return Number.isNaN(ts) ? 0 : ts;
}

/** Groups non-rejected daily sales reports by workday date, sorted newest day first. */
export function groupManagerDailySalesByDay(
  ops: readonly OperationWithManagerPayload[],
): ManagerDaySalesGroup[] {
  const byDay = new Map<string, OperationWithManagerPayload[]>();
  for (const op of ops) {
    if (op.status === "rejected") continue;
    const key = operationDateKey(op);
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.push(op);
    } else {
      byDay.set(key, [op]);
    }
  }

  return Array.from(byDay.entries())
    .map(([date, items]) => {
      const sortedItems = [...items].sort(
        (a, b) => operationSortTime(b) - operationSortTime(a),
      );
      return {
        date,
        totalHalalas: totalManagerDailySalesHalalas(sortedItems),
        items: sortedItems,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function entryDateSortKey(date?: string | null, iso?: string | null): string {
  return (date || iso || "").slice(0, 19);
}

/** Extracts outgoing manager cash custody deliveries and pending handovers from shift custody statement. */
export function extractManagerCustodyHandovers(
  statement?: ShiftCustodyStatement | null,
): ManagerCustodyHandoversSummary {
  if (!statement) {
    return {
      confirmedEntries: [],
      pendingRequests: [],
      confirmedTotalHalalas: 0,
      pendingTotalHalalas: 0,
    };
  }

  const confirmedEntries = (statement.entries ?? [])
    .filter(
      (e) =>
        (e.cash_out ?? 0) > 0 &&
        (e.classification === "handover_sent" ||
          e.classification === "transfer_to_custody"),
    )
    .sort((a, b) =>
      entryDateSortKey(b.business_date, b.event_at).localeCompare(
        entryDateSortKey(a.business_date, a.event_at),
      ),
    );

  const pendingRequests = (statement.pending ?? [])
    .filter(
      (p) =>
        p.status === "pending" && p.request_type !== "handover_received",
    )
    .sort((a, b) =>
      entryDateSortKey(b.business_date, b.created_at).localeCompare(
        entryDateSortKey(a.business_date, a.created_at),
      ),
    );

  const confirmedTotalHalalas = confirmedEntries.reduce(
    (sum, e) => sum + (e.cash_out ?? 0),
    0,
  );
  const pendingTotalHalalas = pendingRequests.reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0,
  );

  return {
    confirmedEntries,
    pendingRequests,
    confirmedTotalHalalas,
    pendingTotalHalalas,
  };
}

/**
 * Summarizes an employee's shift cash custody statement in employee-account Credit/Debit terms:
 * - Credit (دائن): cash handed over / settled by the employee to the manager or next cashier (`total_cash_out`).
 * - Debit (مدين): cash received into custody from shift sales or incoming transfers (`total_cash_in`).
 */
export function summarizeShiftCustodyCreditDebit(
  custody?: ShiftCustodyStatement | null,
): ShiftCustodyCreditDebitSummary {
  const balances = custody?.balances;
  const isAvailable = Boolean(balances?.is_available);

  let pendingDeliveredHalalas = 0;
  let pendingReceivedHalalas = 0;
  for (const item of custody?.pending ?? []) {
    if (item.status && item.status !== "pending") continue;
    const amt = typeof item.amount === "number" && Number.isFinite(item.amount) ? item.amount : 0;
    if (item.request_type === "handover_sent" || item.request_type === "manager_transfer_sent") {
      pendingDeliveredHalalas += amt;
    } else if (
      item.request_type === "handover_received" ||
      item.request_type === "manager_transfer_received"
    ) {
      pendingReceivedHalalas += amt;
    }
  }

  return {
    isAvailable,
    openingBalanceHalalas: isAvailable ? (balances?.opening_balance ?? 0) : 0,
    creditDeliveredHalalas: isAvailable ? (balances?.total_cash_out ?? 0) : 0,
    debitReceivedHalalas: isAvailable ? (balances?.total_cash_in ?? 0) : 0,
    closingBalanceHalalas: isAvailable ? (balances?.closing_balance ?? 0) : 0,
    pendingDeliveredHalalas,
    pendingReceivedHalalas,
  };
}

/** True when employee statement should open directly on Shift Cash Custody instead of payroll Dues. */
export function shouldDefaultToCustodyTab(
  employee?: Pick<Employee, "role"> | null,
  custody?: ShiftCustodyStatement | null,
): boolean {
  const linkedType = custody?.identity?.linked_type;
  return (
    isCashierEmployeeRole(employee?.role, linkedType) ||
    isBranchManagerEmployeeRole(employee?.role, linkedType) ||
    custody?.identity_link_state === "linked"
  );
}
