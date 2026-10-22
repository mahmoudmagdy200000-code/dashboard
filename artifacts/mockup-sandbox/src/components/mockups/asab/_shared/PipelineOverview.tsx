import React from "react";
import { Badge } from "../components/Badge";
import { useLang } from "./LangContext";
import type { Op, PageId } from "./types";
import {
  PIPELINE_STAGES,
  getPipelineStage,
  ORIGIN_CFG,
  EN_ORIGIN,
  EN_PIPELINE,
} from "./displayConfig";

// Horizontal 6-step pipeline indicator — used in detail pages
export function PipelineBar({ op }: { op: Op }) {
  const { lang, t } = useLang();
  const stage = getPipelineStage(op);
  const isRejected = op.status === "rejected";
  const origin = ORIGIN_CFG[op.origin];
  const originLabel = lang === "ar" ? origin.label : (EN_ORIGIN[op.origin] || origin.label);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("دورة حياة العملية", "Operation Lifecycle")}</span>
          <Badge className={`${origin.cls} border text-[10px] font-semibold`}>
            {origin.icon} {originLabel}
          </Badge>
        </div>
        {isRejected
          ? <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">✕ {t("مرفوض", "Rejected")}{op.rejectReason ? ` — ${op.rejectReason}` : ""}</Badge>
          : <Badge className={`${PIPELINE_STAGES[stage]?.bg} ${PIPELINE_STAGES[stage]?.text} border ${PIPELINE_STAGES[stage]?.border} text-xs font-bold`}>
            {t(`المرحلة ${stage + 1}/6 · ${PIPELINE_STAGES[stage]?.label}`, `Stage ${stage + 1}/6 · ${EN_PIPELINE[PIPELINE_STAGES[stage]?.id]?.label || PIPELINE_STAGES[stage]?.label}`)}
          </Badge>
        }
      </div>
      <div className="flex items-center gap-0">
        {PIPELINE_STAGES.map((s, i) => {
          const isComplete = !isRejected && i < stage;
          const isCurrent = !isRejected && i === stage;
          const shortLabel = lang === "ar" ? s.labelShort : (EN_PIPELINE[s.id]?.labelShort || s.labelShort);
          return (
            <div key={s.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-all
                  ${isComplete ? `${s.fill} border-transparent text-white` :
                    isCurrent ? `bg-white ${s.border} ${s.text} shadow-sm font-bold` :
                      "bg-gray-50 border-gray-200 text-gray-300"}`}>
                  {isComplete ? "✓" : s.icon}
                </div>
                <span className={`text-[9px] font-medium leading-tight text-center max-w-[44px] truncate
                  ${isComplete ? "text-gray-600" : isCurrent ? `${s.text} font-bold` : "text-gray-300"}`}>
                  {shortLabel}
                </span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mt-[-10px] ${isComplete ? s.fill : "bg-gray-150"}`}
                  style={{ backgroundColor: isComplete ? "" : "#e5e7eb" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact inline pill — used in OpRow and lists
export function OpStagePill({ op }: { op: Op }) {
  const { lang, t } = useLang();
  if (op.status === "rejected") {
    return <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px]">✕ {t("مرفوض", "Rejected")}</Badge>;
  }
  const idx = getPipelineStage(op);
  const s = PIPELINE_STAGES[idx];
  const shortLabel = lang === "ar" ? s.labelShort : (EN_PIPELINE[s.id]?.labelShort || s.labelShort);
  return (
    <Badge className={`${s.bg} ${s.text} border ${s.border} text-[10px] font-semibold`}>
      {s.icon} {lang === "ar" ? `م${idx + 1}` : `S${idx + 1}`} · {shortLabel}
    </Badge>
  );
}

// Pipeline overview widget — summary counts by stage
export function PipelineOverview({ ops, navigate }: { ops: Op[]; navigate: (p: PageId) => void }) {
  const { lang, t } = useLang();
  const stageCounts = PIPELINE_STAGES.map((s, i) => ({
    ...s,
    count: ops.filter(o => getPipelineStage(o) === i).length,
    shortLabel: lang === "ar" ? s.labelShort : (EN_PIPELINE[s.id]?.labelShort || s.labelShort),
  }));
  const rejected = ops.filter(o => o.status === "rejected").length;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm tracking-tight">{t("مسار العمليات — رؤية شاملة للخط الزمني", "Operations Pipeline — Full Timeline View")}</h3>
        <span className="text-xs text-gray-400">{ops.length} {t("عملية إجمالاً", "operations total")}</span>
      </div>
      <div className="grid grid-cols-6 divide-x divide-x-reverse divide-gray-100">
        {stageCounts.map((s, i) => {
          const isAspirational = i === 5; // stage-6: ERP Reports — future state, never set by getPipelineStage
          return (
            <div key={s.id} className={`px-3 py-4 text-center transition-colors
              ${isAspirational ? "bg-slate-50/60" : "hover:bg-gray-50/80"}`}>
              <div className="text-lg mb-1">{s.icon}</div>
              {isAspirational ? (
                <>
                  <p className="text-[10px] font-bold text-slate-400 font-mono">—</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{s.shortLabel}</p>
                  <p className="text-[8px] text-slate-300 mt-1 leading-tight">{t("مرحلة مستقبلية", "Future Stage")}</p>
                </>
              ) : (
                <>
                  <p className={`text-2xl font-extrabold font-mono ${s.count > 0 ? s.text : "text-gray-200"}`}>{s.count}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.shortLabel}</p>
                  {i < 4 && (
                    <div className={`mx-auto mt-2 h-1 w-6 rounded-full ${s.count > 0 ? s.fill : "bg-gray-100"}`} />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="px-5 py-2 border-t border-gray-100 bg-slate-50/30 flex items-center justify-between flex-wrap gap-2">
        {rejected > 0 && (
          <span className="text-xs text-red-500 font-medium">✕ {rejected} {t("مرفوضة — خارج المسار", "rejected — off pipeline")}</span>
        )}
        <span className="text-[10px] text-slate-400 mr-auto">
          {t("م1–م5: مدارة بواسطة آلة الحالة · م6 (تقارير ERP): بيانات مرجعية مُستوردة — مرحلة مستقبلية", "S1–S5: Managed by state machine · S6 (ERP Reports): Imported reference data — Future stage")}
        </span>
      </div>
    </div>
  );
}
