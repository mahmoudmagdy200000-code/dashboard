import React from "react";
import { Paperclip, Lock, Eye, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "../components/Badge";
import { Btn } from "../components/Btn";
import { useLang } from "./LangContext";
import { fmtAmt } from "./formatters";
import { OpStagePill } from "./PipelineOverview";
import type { Op } from "./types";
import {
  MATCH_CFG,
  STATUS_CFG,
  ORIGIN_CFG,
  EN_MATCH_CFG,
  EN_STATUS_CFG,
  EN_ORIGIN,
} from "./displayConfig";
import { isPkg6SalesReport, SALES_RETURN_HINT } from "../salesActionGuards";

export interface OpRowProps {
  op: Op;
  onView?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function OpRow({ op, onView, onApprove, onReject }: OpRowProps) {
  const { lang, t } = useLang();
  const match = MATCH_CFG[op.match];
  const statusCfg = STATUS_CFG[op.status];
  const matchLabel = lang === "ar" ? match.label : (EN_MATCH_CFG[op.match] || match.label);
  const statusLabel = lang === "ar" ? statusCfg.label : (EN_STATUS_CFG[op.status] || statusCfg.label);
  const originLabel = lang === "ar" ? ORIGIN_CFG[op.origin].label : (EN_ORIGIN[op.origin] || ORIGIN_CFG[op.origin].label);
  const isPending = op.status === "pending";
  const isLocked = op.status === "final-approved";
  const isRejected = op.status === "rejected";
  return (
    <div className={`px-5 py-4 flex items-start gap-4 hover:bg-gray-50/60 transition-colors border-b border-gray-100 last:border-0
      ${op.match === "diff" ? "border-r-4 border-r-red-400" : op.match === "review" ? "border-r-4 border-r-amber-400" : ""}
      ${isLocked ? "bg-slate-50/60" : isRejected ? "opacity-55" : ""}`}>
      <span className="mt-0.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 flex-shrink-0">{op.moduleLabel}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-800 text-sm">{op.branch}</span>
          {op.brandName && op.brandName !== "—" && op.brandName !== op.branch && (
            <><span className="text-gray-200">·</span><span className="text-xs text-gray-500">{op.brandName}</span></>
          )}
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-400 font-mono tracking-tight">{op.id}</span>
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-400">⏰ {op.timeAgo}</span>
          <Badge className={`${ORIGIN_CFG[op.origin].cls} border text-[9px]`}>
            {ORIGIN_CFG[op.origin].icon} {originLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge className={`${match.cls} border`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${match.dot}`}></span>
            {matchLabel}
          </Badge>
          {op.diff && <span className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">⚠ {op.diff}</span>}
          <span className="flex items-center gap-1 text-xs text-gray-400"><Paperclip size={10} /> {op.attachments}</span>
          <Badge className={`${statusCfg.cls} border ${isLocked ? "border-slate-200" : ""}`}>
            {isLocked && <Lock size={10} />}
            {statusLabel}
          </Badge>
          <OpStagePill op={op} />
          {op.isCorrection && op.correctiveRef && (
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">{t("تعديل", "Correction")} ← {op.correctiveRef}</Badge>
          )}
          {isRejected && op.rejectReason && <span className="text-xs text-red-500 font-medium">{t("سبب:", "Reason:")} {op.rejectReason}</span>}
        </div>
        {/* Sales matching breakdown (T04 §8) — cash/card/apps + collected/variance */}
        {op.moduleKey === "sales" && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
            {op.salesBreakdown ? (<>
              <span className="text-gray-500">💵 {t("نقدي", "Cash")}: <span className="font-mono text-gray-700">{fmtAmt(op.salesBreakdown.cashHalalas / 100)}</span></span>
              <span className="text-gray-500">🏦 {t("كارت", "Card")}: <span className="font-mono text-gray-700">{fmtAmt(op.salesBreakdown.cardHalalas / 100)}</span></span>
              <span className="text-gray-500">🛵 {t("تطبيقات", "Apps")}: <span className="font-mono text-gray-700">{fmtAmt(op.salesBreakdown.appsHalalas / 100)}</span></span>
              <span className="text-gray-300">·</span>
              <span className="text-gray-500">{t("محصّل", "Collected")}: <span className="font-mono text-gray-700">{fmtAmt(op.salesBreakdown.collectedHalalas / 100)}</span></span>
              <span className={`font-mono font-bold ${op.salesBreakdown.varianceHalalas === 0 ? "text-emerald-600" : "text-red-600"}`}>
                {op.salesBreakdown.varianceHalalas === 0 ? "✓ 0" : `${op.salesBreakdown.varianceHalalas > 0 ? "+" : ""}${fmtAmt(op.salesBreakdown.varianceHalalas / 100)}`}
              </span>
            </>) : (
              <span className="text-gray-300">{t("لم تتم التسوية بعد — «—»", "Not reconciled — «—»")}</span>
            )}
          </div>
        )}
      </div>
      <div className="font-extrabold text-gray-800 font-mono text-sm flex-shrink-0 tabular-nums">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Btn size="sm" onClick={onView}><Eye size={12} /> {t("عرض", "View")}</Btn>
        {isPending && <>
          <Btn size="sm" variant="success" onClick={onApprove}><ThumbsUp size={12} /></Btn>
          {!isPkg6SalesReport(op) && <Btn size="sm" variant="danger" onClick={onReject}><ThumbsDown size={12} /></Btn>}
        </>}
        {isPkg6SalesReport(op) && <span className="text-xs text-amber-700">{t(SALES_RETURN_HINT.ar, SALES_RETURN_HINT.en)}</span>}
        {isLocked && (
          <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg">
            <Lock size={11} /> {t("مُغلق", "Locked")}
          </span>
        )}
      </div>
    </div>
  );
}
