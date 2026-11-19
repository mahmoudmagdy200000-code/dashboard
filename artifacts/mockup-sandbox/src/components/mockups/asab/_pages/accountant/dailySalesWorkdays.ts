import type { Operation } from "../../../../../api/types";

type DailyClosePayload = {
  date?: unknown;
  managerShiftId?: unknown;
  managerName?: unknown;
  cashHalalas?: unknown;
  cardHalalas?: unknown;
  appsHalalas?: unknown;
  varianceHalalas?: unknown;
  pkg6Review?: { member_source_ids?: unknown } | null;
};

export interface DailySalesReport {
  operation: Operation;
  workday: string;
  managerShiftId: string;
  managerName: string | null;
  cashHalalas: number | null;
  cardHalalas: number | null;
  appsHalalas: number | null;
  varianceHalalas: number | null;
  memberShiftIds: string[];
}

export interface DailySalesWorkday {
  key: string;
  branchId: string;
  branchName: string;
  date: string;
  reports: DailySalesReport[];
  totalSalesHalalas: number | null;
  cashHalalas: number | null;
  cardHalalas: number | null;
  appsHalalas: number | null;
  varianceHalalas: number | null;
  memberShiftIds: string[];
}

function verifiedMoney(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function sumVerified(values: Array<number | null>): number | null {
  if (values.some((v) => v === null)) return null;
  const sum = (values as number[]).reduce((total, value) => total + value, 0);
  return Number.isSafeInteger(sum) ? sum : null;
}

/**
 * The operations list's operationDate is the submission timestamp, NOT the
 * financial workday. BridgeManagerDailyClose stores the canonical date and
 * managerShiftId in the detail payload only. Never group by operationDate.
 */
export function dailySalesReportFromOperation(operation: Operation): DailySalesReport | null {
  if (operation.moduleKey !== "sales" || operation.isCorrection) return null;
  const payload = operation.payload as DailyClosePayload | undefined;
  const date = payload?.date;
  const managerShiftId = payload?.managerShiftId;
  if (!operation.branchId || typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      typeof managerShiftId !== "string" || !managerShiftId) return null;

  const members = payload?.pkg6Review?.member_source_ids;
  return {
    operation,
    workday: date,
    managerShiftId,
    managerName: typeof payload?.managerName === "string" ? payload.managerName : null,
    cashHalalas: verifiedMoney(payload?.cashHalalas),
    cardHalalas: verifiedMoney(payload?.cardHalalas),
    appsHalalas: verifiedMoney(payload?.appsHalalas),
    varianceHalalas: verifiedMoney(payload?.varianceHalalas),
    memberShiftIds: Array.isArray(members) ? members.filter((id): id is string => typeof id === "string") : [],
  };
}

/** One displayed report per branch + canonical workday, without double-counting revisions. */
export function groupDailySalesWorkdays(operations: readonly Operation[]): DailySalesWorkday[] {
  const uniqueReports = new Map<string, DailySalesReport>();
  for (const operation of operations) {
    const report = dailySalesReportFromOperation(operation);
    if (!report) continue;
    const identity = `${operation.branchId}|${report.managerShiftId}`;
    const previous = uniqueReports.get(identity);
    if (!previous || (operation.updatedAt || operation.submittedAt || operation.createdAt || "") >
      (previous.operation.updatedAt || previous.operation.submittedAt || previous.operation.createdAt || "")) {
      uniqueReports.set(identity, report);
    }
  }

  const groups = new Map<string, DailySalesReport[]>();
  for (const report of uniqueReports.values()) {
    const key = `${report.operation.branchId}|${report.workday}`;
    groups.set(key, [...(groups.get(key) ?? []), report]);
  }

  return Array.from(groups.entries()).map(([key, reports]) => {
    const first = reports[0].operation;
    const memberShiftIds = Array.from(new Set(reports.flatMap((report) => report.memberShiftIds)));
    return {
      key,
      branchId: first.branchId,
      branchName: first.branchName || first.branchId,
      date: reports[0].workday,
      reports: [...reports].sort((a, b) => b.operation.createdAt.localeCompare(a.operation.createdAt)),
      totalSalesHalalas: sumVerified(reports.map((r) => verifiedMoney(r.operation.amountHalalas))),
      cashHalalas: sumVerified(reports.map((r) => r.cashHalalas)),
      cardHalalas: sumVerified(reports.map((r) => r.cardHalalas)),
      appsHalalas: sumVerified(reports.map((r) => r.appsHalalas)),
      varianceHalalas: sumVerified(reports.map((r) => r.varianceHalalas)),
      memberShiftIds,
    };
  }).sort((a, b) => b.date.localeCompare(a.date) || a.branchName.localeCompare(b.branchName));
}
