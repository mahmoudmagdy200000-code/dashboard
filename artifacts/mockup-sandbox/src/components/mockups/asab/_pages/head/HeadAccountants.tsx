import { useState } from "react";
import { Download, Star, Eye, ChevronUp, ChevronDown } from "lucide-react";
import {
  useAccountantsPerformancePlatform,
  useExportHeadOperations,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import type { PageProps } from "../../_shared/types";
import { Btn } from "../../components/Btn";

export function HeadAccountants({ }: PageProps) {
  const { data: apiPerf } = useAccountantsPerformancePlatform();
  const exportHeadOpsMut = useExportHeadOperations();
  const { t, dir } = useLang();
  const [expandedAcc, setExpandedAcc] = useState<number | null>(null);
  // B-H3: per-accountant performance from /head/accountants/performance.
  const accountants = ((apiPerf as any)?.length > 0 ? (apiPerf as any) : []) as any[];
  // B-H3: guard the summary average against an empty list (was NaN on divide-by-zero).
  const avgReviewTime = accountants.length
    ? (accountants.reduce((s, a) => s + (a.avgTime ?? 0), 0) / accountants.length).toFixed(1)
    : "0";

  return (
    <div className="space-y-4" dir={dir}>
      <div className="flex items-center justify-between">
        {/* HA-F23: Honest label - this exports accountant operations, not performance breakdown */}
        <Btn size="sm" onClick={() => exportHeadOpsMut.mutate({ format: "xlsx" })}><Download size={12} /> {t("تصدير عمليات المحاسبين", "Export Accountant Operations")}</Btn>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-gray-800">{accountants.reduce((s, a) => s + a.reviewed, 0)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t("إجمالي العمليات المراجعة", "Total Reviewed")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-emerald-700">{accountants.reduce((s, a) => s + a.approved, 0)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t("معتمدة", "Approved")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-amber-600">{accountants.reduce((s, a) => s + a.pending, 0)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t("معلقة", "Pending")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-purple-700">{avgReviewTime} {t("د", "m")}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t("متوسط وقت المراجعة", "Avg Review Time")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {accountants.map((acc, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold">{acc.name[0]}</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">{acc.name}</p>
                  <p className="text-xs text-gray-400">{acc.branches} {t("فرع مخصص", "branches assigned")}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${acc.levelCls}`}>{acc.levelLabelAr ?? acc.level}</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} fill={s <= Math.round(acc.rating) ? "#F59E0B" : "none"} className={s <= Math.round(acc.rating) ? "text-amber-400" : "text-gray-200"} />)}
                    <span className="text-[10px] text-gray-500 mr-0.5">{acc.rating}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center mb-3">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">{t("المراجَعة", "Reviewed")}</p>
                  <p className="font-bold text-gray-700 text-sm">{acc.reviewed}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">{t("معتمدة", "Approved")}</p>
                  <p className="font-bold text-emerald-700 text-sm">{acc.approved}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">{t("معلقة", "Pending")}</p>
                  <p className={`font-bold text-sm ${acc.pending > 5 ? "text-red-600" : "text-amber-600"}`}>{acc.pending}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">{t("معدل", "Rate")}</p>
                  <p className={`font-bold text-sm ${acc.rate >= 90 ? "text-emerald-600" : acc.rate >= 70 ? "text-amber-600" : "text-red-600"}`}>{acc.rate}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-blue-50 rounded-lg px-3 py-2 mb-3">
                <span className="text-blue-600 font-medium">⏱ {t("متوسط وقت المراجعة", "Avg Review Time")}</span>
                <span className="font-bold text-blue-700 font-mono">{acc.avgTime} {t("دقيقة", "min")}</span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                <div className={`h-1.5 rounded-full ${acc.rate >= 90 ? "bg-emerald-500" : acc.rate >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${acc.rate}%` }}></div>
              </div>

              {(() => {
                const diff = acc.rate - acc.prevRate; return (
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`flex items-center gap-0.5 text-[11px] font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-gray-500"}`}>
                      {diff > 0 ? "↑" : diff < 0 ? "↓" : "→"} {Math.abs(diff)}% {t("مقارنة بالشهر الماضي", "vs last month")}
                    </span>
                    <span className="text-[10px] text-gray-400">({t("كان", "was")} {acc.prevRate}%)</span>
                  </div>
                );
              })()}

              <button onClick={() => setExpandedAcc(expandedAcc === i ? null : i)}
                className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-gray-200 text-purple-600 hover:bg-purple-50 font-medium transition-colors">
                <Eye size={12} />
                {expandedAcc === i ? t("إخفاء التفاصيل", "Hide Details") : t("عرض التفاصيل", "Show Details")}
                {expandedAcc === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {expandedAcc === i && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-3">
                <p className="text-[10px] font-bold text-gray-500 mb-2">{t("آخر النشاطات", "Recent Activities")}</p>
                <div className="space-y-1.5">
                  {/* B-H3: recentMovements is now per-accountant. Tolerate tuple or object shape. */}
                  {((acc.recentMovements ?? []) as any[]).map((mv: any, j: number) => {
                    // B-H3 contract: { id, actionAr, timeAr, module, moduleLabelAr } (tuple-tolerant).
                    const mtext = Array.isArray(mv) ? mv[0] : (mv.actionAr ?? mv.text ?? mv.label ?? mv.descriptionAr ?? "");
                    const mtime = Array.isArray(mv) ? mv[1] : (mv.timeAr ?? mv.time ?? mv.at ?? "");
                    const mtype = Array.isArray(mv) ? mv[2] : (mv.moduleLabelAr ?? mv.module ?? mv.type ?? mv.kind ?? "");
                    return (
                      <div key={j} className="flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0"></span>
                        <span className="text-gray-700 flex-1">{mtext}</span>
                        <span className="text-gray-400 text-[10px]">{mtime}</span>
                        <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">{mtype}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h4 className="font-bold text-gray-800 text-sm mb-3">📊 {t("مقارنة الأداء — معدل الاعتماد هذا الشهر", "Performance Comparison — Approval Rate This Month")}</h4>
        <div className="space-y-2.5">
          {[...accountants].sort((a, b) => b.rate - a.rate).map((acc, rank) => {
            const diff = acc.rate - acc.prevRate;
            return (
              <div key={acc.name} className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${rank === 0 ? "bg-amber-400 text-white" : rank === 1 ? "bg-gray-300 text-gray-700" : rank === 2 ? "bg-orange-300 text-white" : "bg-gray-100 text-gray-500"}`}>{rank + 1}</span>
                <span className="text-xs font-medium text-gray-700 w-28 truncate flex-shrink-0">{acc.name.split(" ")[0]} {acc.name.split(" ")[1]}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                  <div className={`h-3 rounded-full ${acc.rate >= 90 ? "bg-emerald-500" : acc.rate >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${acc.rate}%` }} />
                </div>
                <span className="font-mono font-bold text-sm text-gray-800 w-10 text-center flex-shrink-0">{acc.rate}%</span>
                <span className={`text-[11px] font-bold w-14 flex-shrink-0 ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-gray-400"}`}>
                  {diff > 0 ? "↑" : diff < 0 ? "↓" : "→"}{Math.abs(diff)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
