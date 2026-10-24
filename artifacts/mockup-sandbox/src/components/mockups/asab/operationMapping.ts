import type { Operation as ApiOperation } from "../../../api/types/index.ts";

export type COpStatus = "pending"|"approved"|"rejected"|"final-approved";
export type CMatch = "exact"|"review"|"diff";
export type CModKey = "sales"|"expenses"|"purchases"|"inventory"|"assets"|"shifts"|"employees"|"cash";

export type COp = {
  id:string; branch:string; branchId?:string; brandName:string; brandColor:string;
  module:CModKey; moduleLabel:string;
  amount:number|null; timeAgo:string; status:COpStatus;
  attachments:number; match:CMatch; diff?:string;
  submittedBy:string; date:string; refNum:string;
  // ── T03/T04 additive labels + badges (bind these, don't hardcode maps) ──
  statusLabelAr?:string; matchLabelAr?:string;
  originLabelAr?:string; originIcon?:string;
  origin?:ApiOperation["origin"]; sourceId?:ApiOperation["sourceId"];
  reportReview?:ApiOperation["reportReview"];
  payload?:ApiOperation["payload"];
  stage?:{ key:string; step:number; icon:string; labelAr:string; labelShortAr:string };
  salesBreakdown?:{ cashHalalas:number; cardHalalas:number; appsHalalas:number; totalSalesHalalas:number; collectedHalalas:number; varianceHalalas:number } | null;
  invoices?:{ invNum:string; vendor:string; desc:string; amount:number; date:string; verified:boolean }[];
  channels?:{ name:string; icon:string; pos:number; actual:number }[];
  purchaseItems?:{ item:string; unit:string; ordQty:number; rcvQty:number; unitPrice:number }[];
};

/** Pure counterpart of the dashboard's existing mapper; no React/API side effects. */
export function apiOpToCOp(op: ApiOperation, brands: readonly { name:string; color:string }[] = []): COp {
  const brand = brands.find(b=>b.name===op.brandName);
  const moduleKey = (op.moduleKey as CModKey);
  const moduleLabel = (
    { sales:"مبيعات", expenses:"مصروفات", purchases:"مشتريات", inventory:"مخزون",
      assets:"أصول", shifts:"شفتات", employees:"موظفون", cash:"عهد",
      waste:"هدر" } as Record<string,string>
  )[moduleKey] ?? moduleKey;
  return {
    id: op.id,
    branch: op.branchName,
    branchId: op.branchId,
    brandName: op.brandName ?? brand?.name ?? "—",
    brandColor: brand?.color ?? "#7C3AED",
    module: moduleKey,
    moduleLabel,
    amount: op.amountHalalas == null ? null : op.amountHalalas / 100,
    timeAgo: op.createdAt,
    status: op.status as COpStatus,
    attachments: op.attachmentCount ?? 0,
    // HA-F38: missing/unknown match must NOT default to "exact". Default to "review".
    match: (op.match === "exact" ? "exact" : op.match === "diff" ? "diff" : "review") as CMatch,
    diff: op.diffNote ?? undefined,
    submittedBy: op.submittedBy?.name ?? "—",
    date: op.operationDate,
    refNum: op.publicId,
    statusLabelAr: op.statusLabelAr,
    matchLabelAr: op.matchLabelAr,
    originLabelAr: op.originLabelAr,
    originIcon: op.originIcon,
    origin: op.origin,
    sourceId: op.sourceId,
    reportReview: op.reportReview,
    // Keep server evidence as received: do not derive a count state or fill money.
    payload: op.payload,
    stage: op.stage,
    salesBreakdown: op.salesBreakdown ?? null,
  };
}

/** A partial total would misrepresent unavailable money as zero. */
export function sumCOpAmounts(ops: readonly Pick<COp, "amount">[]): number | null {
  return ops.reduce<number | null>(
    (sum, op) => sum == null || op.amount == null ? null : sum + op.amount,
    0,
  );
}
