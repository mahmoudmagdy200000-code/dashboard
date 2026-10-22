/** Head permissions from current operation evidence. Membership revision IDs are not member statuses. */
export type HeadOperation = {
  id:string;
  module?:string | null;
  moduleKey?:string | null;
  status:string;
  reportReview?:unknown;
};

const moduleOf = (op:HeadOperation) => op.moduleKey ?? op.module;
const phaseOf = (op:HeadOperation) => typeof op.reportReview === "object" && op.reportReview !== null &&
  "phase" in op.reportReview ? op.reportReview.phase : undefined;
const isDay = (op:HeadOperation) => moduleOf(op) === "sales" && op.reportReview != null;
export const HEAD_DAY_EVIDENCE_HINT = {
  ar:"دليل حالات جميع ورديات التقرير الحالي غير متاح؛ يجب اعتماد الورديات نهائيًا أولًا",
  en:"Current member shift statuses are unavailable; final approve the shifts first",
};
export const HEAD_EXPENSE_EVIDENCE_HINT = {
  ar:"قرار اعتماد المصروف محجوز للمالك أو مدير العلامة التجارية وفق القاعدة EXP-06",
  en:"Expense approval decision is reserved for the brand owner or manager per rule EXP-06",
};

export function getHeadReviewPolicy(op:HeadOperation | undefined, role:string | null | undefined, detail?:HeadOperation) {
  const denied = { finalApprove:false, returnForReview:false, blockedReason:null as string | null };
  if (!op || role !== "head" || op.status !== "approved") return denied;
  if (detail && (detail.id !== op.id || detail.status !== "approved" || moduleOf(detail) !== moduleOf(op))) return denied;
  if (moduleOf(op) === "expenses" || (detail && moduleOf(detail) === "expenses")) {
    return {
      ...denied,
      blockedReason:"expense_owner_decision_required",
    };
  }
  if (moduleOf(op) === "shifts") {
    if (phaseOf(op) !== "head_review" || (detail && phaseOf(detail) !== "head_review")) return denied;
    return { finalApprove:true, returnForReview:true, blockedReason:null };
  }
  if (isDay(op) || (detail && isDay(detail))) return {
    ...denied,
    blockedReason:"day_evidence_missing",
  };
  return { finalApprove:true, returnForReview:true, blockedReason:null };
}

/** A protected row disables the entire selected bulk, never just silently drops that row. */
export function headLegacyBulkIds(ops:readonly HeadOperation[], ids:readonly string[], role:string | null | undefined,
  detailFor?: (op:HeadOperation)=>HeadOperation | undefined):string[] {
  if (role !== "head" || ids.length === 0) return [];
  const byId = new Map(ops.map(op => [op.id,op]));
  const unique = [...new Set(ids)];
  return unique.every(id => {
    const op = byId.get(id);
    return op && moduleOf(op) !== "shifts" && moduleOf(op) !== "expenses" && getHeadReviewPolicy(op, role, detailFor?.(op)).finalApprove;
  }) ? unique : [];
}

/** Locks synchronously, refetches the operation, then sends at most one mutation. */
export async function runHeadFinalApproval(op:HeadOperation | undefined, role:string | null | undefined,
  loadDetail:(id:string)=>Promise<HeadOperation>, send:(id:string)=>Promise<unknown>, lock:{current:boolean}):Promise<boolean> {
  if (lock.current || !op || !getHeadReviewPolicy(op,role).finalApprove) return false;
  lock.current = true;
  try {
    const detail = await loadDetail(op.id);
    if (!getHeadReviewPolicy(op,role,detail).finalApprove) return false;
    await send(op.id);
    return true;
  } finally { lock.current = false; }
}
