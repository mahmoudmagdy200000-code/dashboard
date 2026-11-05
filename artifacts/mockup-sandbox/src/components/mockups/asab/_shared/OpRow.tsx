import React from "react";
import { Paperclip, Lock, Eye, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "../components/Badge";
import { Btn } from "../components/Btn";
import { useLang } from "./LangContext";
import { fmtAmt } from "./formatters";
import { displayDigits } from "./displayDigits";
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
    <div
      data-testid="op-row"
      data-op-id={op.id}
      className={`px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-4 hover:bg-gray-50/60 transition-colors border-b border-gray-100 last:border-0
        ${op.match === "diff" ? "border-s-4 rtl:border-r-red-400 ltr:border-l-red-400" : op.match === "review" ? "border-s-4 rtl:border-r-amber-400 ltr:border-l-amber-400" : ""}
        ${isLocked ? "bg-slate-50/60" : isRejected ? "opacity-55" : ""}`}
    >
      {/* Mobile & Tablet Top Summary Row: Module + Branch + Amount */}
      <div className="flex items-start justify-between gap-2 lg:hidden w-full">
        <div className="flex items-center gap-2 min-w-0 flex-wrap flex-1">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 flex-shrink-0">
            {op.moduleLabel}
          </span>
          <span className="font-bold text-gray-800 text-sm break-words">{op.branch}</span>
          {op.brandName && op.brandName !== "—" && op.brandName !== op.branch && (
            <span className="text-xs text-gray-500 break-words">({op.brandName})</span>
          )}
        </div>
        <div className="font-extrabold text-gray-900 font-mono text-sm flex-shrink-0 tabular-nums pt-0.5">
          {fmtAmt(op.amount, lang)} <span className="text-xs font-sans font-normal text-gray-600">{t("ر.س", "SAR")}</span>
        </div>
      </div>

      {/* Desktop Module Tag */}
      <span className="hidden lg:inline-block mt-0.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 flex-shrink-0">
        {op.moduleLabel}
      </span>

      {/* Main Details Body */}
      <div className="flex-1 min-w-0 w-full lg:w-auto">
        {/* Identifiers and Meta: Branch (desktop only), brand, ID, timeAgo, origin */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
          <span className="hidden lg:inline font-bold text-gray-800 text-sm">{op.branch}</span>
          {op.brandName && op.brandName !== "—" && op.brandName !== op.branch && (
            <>
              <span className="hidden lg:inline text-gray-200">·</span>
              <span className="hidden lg:inline text-xs text-gray-500">{op.brandName}</span>
            </>
          )}
          <span className="hidden lg:inline text-gray-200">·</span>
          <span className="text-xs text-gray-500 font-mono tracking-tight break-all select-all">{op.id}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-500 whitespace-nowrap">⏰ {displayDigits(op.timeAgo, lang)}</span>
          <Badge className={`${ORIGIN_CFG[op.origin].cls} border text-[9px] whitespace-nowrap`}>
            {ORIGIN_CFG[op.origin].icon} {originLabel}
          </Badge>
        </div>

        {/* Status, Match, and Lifecycle Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
          <Badge className={`${match.cls} border`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${match.dot}`}></span>
            {matchLabel}
          </Badge>
          {op.diff && (
            <span className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap">
              ⚠ {displayDigits(op.diff, lang)}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
            <Paperclip size={10} /> {displayDigits(op.attachments, lang)}
          </span>
          <Badge className={`${statusCfg.cls} border ${isLocked ? "border-slate-200" : ""}`}>
            {isLocked && <Lock size={10} />}
            {statusLabel}
          </Badge>
          <OpStagePill op={op} />
          {op.isCorrection && op.correctiveRef && (
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] break-all">
              {t("تعديل", "Correction")} ← {op.correctiveRef}
            </Badge>
          )}
          {isRejected && op.rejectReason && (
            <span className="text-xs text-red-500 font-medium">
              {t("سبب:", "Reason:")} {op.rejectReason}
            </span>
          )}
        </div>

        {/* Sales matching breakdown (T04 §8) — cash/card/apps + collected/variance */}
        {op.moduleKey === "sales" && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
            {op.salesBreakdown ? (
              <>
                <span className="text-gray-500">💵 {t("نقدي", "Cash")}: <span className="font-mono text-gray-700">{fmtAmt(op.salesBreakdown.cashHalalas / 100, lang)}</span></span>
                <span className="text-gray-500">🏦 {t("كارت", "Card")}: <span className="font-mono text-gray-700">{fmtAmt(op.salesBreakdown.cardHalalas / 100, lang)}</span></span>
                <span className="text-gray-500">🛵 {t("تطبيقات", "Apps")}: <span className="font-mono text-gray-700">{fmtAmt(op.salesBreakdown.appsHalalas / 100, lang)}</span></span>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">{t("محصّل", "Collected")}: <span className="font-mono text-gray-700">{fmtAmt(op.salesBreakdown.collectedHalalas / 100, lang)}</span></span>
                <span className={`font-mono font-bold ${op.salesBreakdown.varianceHalalas === 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {op.salesBreakdown.varianceHalalas === 0 ? displayDigits("✓ 0", lang) : `${op.salesBreakdown.varianceHalalas > 0 ? "+" : ""}${fmtAmt(op.salesBreakdown.varianceHalalas / 100, lang)}`}
                </span>
              </>
            ) : (
              <span className="text-gray-300">{t("لم تتم التسوية بعد — «—»", "Not reconciled — «—»")}</span>
            )}
          </div>
        )}
      </div>

      {/* Desktop Amount */}
      <div className="hidden lg:block font-extrabold text-gray-800 font-mono text-sm flex-shrink-0 tabular-nums">
        {fmtAmt(op.amount, lang)} {t("ر.س", "SAR")}
      </div>

      {/* Action Buttons: Responsive touch targets, safe spacing */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100/80 lg:border-0 lg:pt-0 w-full lg:w-auto flex-shrink-0">
        <Btn size="sm" onClick={onView} className="min-h-[36px] px-3">
          <Eye size={12} /> {t("عرض", "View")}
        </Btn>
        {isPending && (
          <>
            <Btn size="sm" variant="success" onClick={onApprove} className="min-h-[36px] px-3.5">
              <ThumbsUp size={12} />
              <span className="lg:hidden text-xs">{t("موافقة", "Approve")}</span>
            </Btn>
            {!isPkg6SalesReport(op) && (
              <Btn size="sm" variant="danger" onClick={onReject} className="min-h-[36px] px-3.5">
                <ThumbsDown size={12} />
                <span className="lg:hidden text-xs">{t("رفض", "Reject")}</span>
              </Btn>
            )}
          </>
        )}
        {isPkg6SalesReport(op) && (
          <span className="text-xs text-amber-700">{t(SALES_RETURN_HINT.ar, SALES_RETURN_HINT.en)}</span>
        )}
        {isLocked && (
          <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg">
            <Lock size={11} /> {t("مُغلق", "Locked")}
          </span>
        )}
      </div>
    </div>
  );
}
