import type { Op, Filters, ModuleKey, PageId } from "./types";

export function applyFilters(ops: Op[], f: Filters, moduleKey?: ModuleKey): Op[] {
  return ops.filter(op => {
    if (moduleKey && op.moduleKey !== moduleKey) return false;
    if (f.branch && op.branch !== f.branch) return false;
    if (f.status && op.status !== f.status) return false;
    if (f.match && op.match !== f.match) return false;
    if (f.search && !op.branch.includes(f.search) && !op.id.includes(f.search) && !op.moduleLabel.includes(f.search) && !(op.supplierName ?? "").includes(f.search) && !(op.brandName ?? "").includes(f.search)) return false;
    return true;
  });
}

// Branch list is derived from live operations at point of use; no static seed.
export const BRANCHES: string[] = [];

// derive the module key with the most matching ops, return a nav page
export function topModulePage(targetOps: Op[], prefix: string, fallback: string): PageId {
  const freq: Record<string, number> = {};
  targetOps.forEach(o => { freq[o.moduleKey] = (freq[o.moduleKey] || 0) + 1; });
  const top = Object.entries(freq).sort(([, a], [, b]) => b - a)[0];
  return (top ? `${prefix}${top[0]}` : fallback) as PageId;
}
