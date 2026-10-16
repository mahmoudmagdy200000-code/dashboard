export type SalesAction = "edit" | "save" | "assign" | "return" | "returnForReview" | "correct" | "bulkApprove";
export type SalesGuardOperation = {
  id: string;
  module?: string | null;
  moduleKey?: string | null;
  status?: string | null;
  reportReview?: unknown;
  reconciliation?: { isLocked?: boolean } | null;
};
export type SalesActionContext = {
  operation?: SalesGuardOperation | null;
  detail?: SalesGuardOperation | null;
  role?: string | null;
  locked?: boolean;
  financialDataReady?: boolean;
};

export const SALES_RETURN_HINT = {
  ar: "للتعديل أرجِع وردية الكاشير المعنية",
  en: "Return the relevant cashier shift for changes",
};

const isSales = (op?: SalesGuardOperation | null) => (op?.moduleKey ?? op?.module) === "sales";
const isShf = (op?: SalesGuardOperation | null) => op?.moduleKey === "shifts" || op?.module === "shifts";

/** Use only the API's review evidence, never an origin, ID prefix or money value. */
export function isPkg6SalesReport(op?: SalesGuardOperation | null): boolean {
  return isSales(op) && op?.reportReview != null;
}

export function getSalesActionPolicy({ operation, detail, role, locked, financialDataReady }: SalesActionContext) {
  const sales = isSales(operation) || isSales(detail);
  const shf = isShf(operation) || isShf(detail);
  // A null/absent detail review must not erase positive list evidence.
  const pkg6 = isPkg6SalesReport(operation) || isPkg6SalesReport(detail);
  const status = detail?.status ?? operation?.status;
  const isLocked = locked || detail?.reconciliation?.isLocked ||
    operation?.status === "final-approved" || detail?.status === "final-approved";
  const editable = !!operation && sales && !pkg6 && !isLocked && financialDataReady !== false && role === "accountant" &&
    (status === "pending" || status === "approved");
  const review = detail?.reportReview ?? operation?.reportReview;
  const stale = typeof review === "object" && review !== null && "stale_members" in review
    ? review.stale_members : undefined;
  return {
    pkg6,
    staleMembers: Array.isArray(stale) ? stale : [],
    edit: editable,
    save: editable,
    assign: editable,
    // Other modules keep their existing handlers and permission rules.
    return: !!operation && (!sales || (!pkg6 && !isLocked &&
      ((role === "accountant" && status === "pending") || (role === "head" && status === "approved")))),
    returnForReview: !!operation && (!sales || (!pkg6 && !isLocked && role === "head" && status === "approved")),
    correct: !!operation && (!sales || (!pkg6 && status === "final-approved" &&
      (role === "accountant" || role === "head"))),
    bulkApprove: !!operation && !shf && (!sales || (!pkg6 && role === "accountant" && status === "pending")),
  };
}

/** Missing/malformed API amounts must not be converted into a zero-valued patch. */
export function hasSalesReconciliationEvidence(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const recon = value as Record<string, unknown>;
  if (!Array.isArray(recon.channels) || recon.channels.length === 0 || typeof recon.totals !== "object" || recon.totals === null) return false;
  const totals = recon.totals as Record<string, unknown>;
  const amount = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v);
  return ["expectedTotalHalalas", "totalCollectionHalalas", "varianceHalalas"].every(key => amount(totals[key])) &&
    recon.channels.every(channel => typeof channel === "object" && channel !== null &&
      amount(channel.actualAmountHalalas) &&
      // Backend may explicitly omit POS evidence with null; actuals and totals remain required.
      ["posAmountHalalas", "diffHalalas"].every(key => channel[key] === null || amount(channel[key])));
}

/** Re-evaluate immediately at the effect boundary, including modal confirmation. */
export function runSalesAction(
  context: SalesActionContext | (() => SalesActionContext), action: SalesAction, effect: () => void,
): boolean {
  if (!getSalesActionPolicy(typeof context === "function" ? context() : context)[action]) return false;
  effect();
  return true;
}

export function salesBulkApprovalIds(
  operations: readonly SalesGuardOperation[], ids: readonly string[], role?: string | null,
  detailFor?: (op: SalesGuardOperation) => SalesGuardOperation | undefined,
): string[] {
  const byId = new Map(operations.map(op => [op.id, op]));
  return [...new Set(ids)].filter(id => {
    const operation = byId.get(id);
    return operation && getSalesActionPolicy({ operation, detail: detailFor?.(operation), role }).bulkApprove;
  });
}

export function runSalesBulkApproval(
  operations: readonly SalesGuardOperation[], ids: readonly string[], role: string | null | undefined,
  effect: (eligibleIds: string[]) => void,
  detailFor?: (op: SalesGuardOperation) => SalesGuardOperation | undefined,
): string[] {
  const eligible = salesBulkApprovalIds(operations, ids, role, detailFor);
  if (eligible.length > 0) effect(eligible);
  return eligible;
}
