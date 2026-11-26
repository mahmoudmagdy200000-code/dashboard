export interface PurchaseMatchCheckInput {
  match?: string | null;
  attachmentsCount?: number;
  attachments?: unknown[];
  lines?: unknown[];
  items?: unknown[];
}

/**
 * Fail-closed check: returns true when a purchase record lacks a known server match
 * status or has zero lines and zero supporting attachments ("مطابقة غير متاحة").
 */
export function hasUnavailablePurchaseMatch(rec: PurchaseMatchCheckInput): boolean {
  const knownMatch = rec.match === "exact" || rec.match === "diff";
  const attCount =
    rec.attachmentsCount ?? (Array.isArray(rec.attachments) ? rec.attachments.length : 0);
  const lineCount =
    (Array.isArray(rec.lines) ? rec.lines.length : 0) ||
    (Array.isArray(rec.items) ? rec.items.length : 0);
  return !knownMatch || (attCount === 0 && lineCount === 0);
}

/**
 * Filter a list of pending purchase records to those eligible for bulk approval.
 */
export function filterApprovablePurchaseIds<T extends PurchaseMatchCheckInput & { id?: string; status?: string }>(
  records: T[],
): string[] {
  return records
    .filter((r) => Boolean(r.id) && r.status === "pending" && !hasUnavailablePurchaseMatch(r))
    .map((r) => String(r.id));
}
