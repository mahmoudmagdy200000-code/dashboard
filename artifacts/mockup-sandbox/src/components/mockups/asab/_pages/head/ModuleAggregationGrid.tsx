import { useEffect, useRef, useState } from "react";
import { ChevronsRight } from "lucide-react";
import { displayDigits } from "../../_shared/displayDigits";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import { aggregateOpsAmount } from "../../headReviewGuards";
import type { Op, PageId, ModuleKey } from "../../_shared/types";

export type ModuleAggState =
  | "empty"               // no operations uploaded yet
  | "incomplete"          // has pending operations — needs accountant review
  | "ready_consolidation" // all ops reviewed by accountant — ready for head approval
  | "consolidated"        // all approved/final-approved — accounting entry locked
  | "ready_erp"           // consolidated + no ERP batch yet — ready to export
  | "exported"            // all final-approved ops are ERP-posted
  | "erp_imported";       // ★ aspirational — ERP acknowledged receipt (not in state machine)

export interface ModuleAggCfg { label: string; sublabel: string; step: number; cls: string; dot: string; headerCls: string }
export const MODULE_AGG_CFG: Record<ModuleAggState, ModuleAggCfg> = {
  empty: { label: "لا بيانات", sublabel: "لم يُرفع أي بيان", step: 0, cls: "bg-gray-50 text-gray-400 border-gray-200", dot: "bg-gray-300", headerCls: "text-gray-400" },
  incomplete: { label: "غير مكتمل", sublabel: "توجد عمليات بحاجة إلى مراجعة", step: 1, cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", headerCls: "text-red-700" },
  ready_consolidation: { label: "جاهز للتجميع", sublabel: "كل البيانات راجعة — ابدأ التجميع", step: 2, cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", headerCls: "text-amber-700" },
  consolidated: { label: "مُجمَّع", sublabel: "قيد محاسبي مُغلق — جاهز للدفعة", step: 3, cls: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", headerCls: "text-sky-700" },
  ready_erp: { label: "جاهز لـ ERP", sublabel: "دفعة جاهزة للإرسال", step: 4, cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", headerCls: "text-emerald-700" },
  exported: { label: "مُصدَّر", sublabel: "مُرحَّل في ERP — انتظار التأكيد", step: 5, cls: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500", headerCls: "text-indigo-700" },
  erp_imported: { label: "مُستورَد في ERP ★", sublabel: "ERP أكّد الاستلام — مرحلة مستقبلية", step: 6, cls: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500", headerCls: "text-purple-700" },
};

export function getModuleAggState(moduleOps: Op[]): ModuleAggState {
  if (moduleOps.length === 0) return "empty";
  const hasPending = moduleOps.some(o => o.status === "pending");
  const hasApproved = moduleOps.some(o => o.status === "approved");
  const hasFinal = moduleOps.some(o => o.status === "final-approved");
  const allFinalPosted = hasFinal && moduleOps.filter(o => o.status === "final-approved").every(o => o.erpPosted);

  if (allFinalPosted && !hasPending && !hasApproved) return "exported";
  if (hasFinal && !hasPending && !hasApproved) return "ready_erp";
  if (!hasPending && !hasFinal && hasApproved) return "ready_consolidation";
  if (!hasPending && hasFinal && hasApproved) return "consolidated";
  if (hasPending && (hasApproved || hasFinal)) return "incomplete";
  if (hasPending) return "incomplete";
  return "consolidated";
}

function getModuleAggStateFromCounts(summary: ModuleSummary): ModuleAggState {
  const pending = summary.pending ?? summary.counts?.pending ?? 0;
  const approved = summary.approved ?? summary.counts?.approved ?? 0;
  const final = summary.final ?? summary.counts?.final ?? 0;
  const rejected = summary.rejected ?? 0;
  const erp = summary.erp ?? summary.counts?.erp ?? 0;
  if ((summary.total ?? 0) === 0) return "empty";
  if (pending > 0 || rejected > 0) return "incomplete";
  if (final > 0 && erp >= final && approved === 0) return "exported";
  if (final > 0 && approved === 0) return "ready_erp";
  if (final === 0 && approved > 0) return "ready_consolidation";
  if (final > 0 && approved > 0) return "consolidated";
  return "incomplete";
}

// ── English for MODULE_META labels ───────────────────────────────────────────
export const EN_MODULE_META: Record<string, string> = {
  "المبيعات": "Sales", "المصروفات": "Expenses", "المشتريات": "Purchases",
  "المخزون": "Inventory", "الشفتات": "Shifts", "كشف الحساب": "Employee Accounts",
  "العهد النقدية": "Cash Custody", "الأصول الثابتة": "Fixed Assets",
};

// ── English for MODULE_AGG_CFG ───────────────────────────────────────────────
export const EN_MODULE_AGG: Record<string, { label: string; sublabel: string }> = {
  empty: { label: "No Data", sublabel: "No entries uploaded" },
  incomplete: { label: "Needs Review", sublabel: "Entries need review" },
  ready_consolidation: { label: "Ready to Consolidate", sublabel: "All entries reviewed — start consolidation" },
  consolidated: { label: "Consolidated", sublabel: "Accounting entry locked — ready to batch" },
  ready_erp: { label: "Ready for ERP", sublabel: "Batch ready to send" },
  exported: { label: "Exported", sublabel: "Posted to ERP — awaiting confirmation" },
  erp_imported: { label: "Imported in ERP ★", sublabel: "ERP acknowledged receipt — future stage" },
};

export const MODULE_META = [
  { key: "sales" as ModuleKey, label: "المبيعات", icon: "💰" },
  { key: "expenses" as ModuleKey, label: "المصروفات", icon: "💸" },
  { key: "purchases" as ModuleKey, label: "المشتريات", icon: "🛒" },
  { key: "inventory" as ModuleKey, label: "المخزون", icon: "📦" },
  { key: "shifts" as ModuleKey, label: "الشفتات", icon: "⏰" },
  { key: "employees" as ModuleKey, label: "كشف الحساب", icon: "👥" },
  { key: "cash" as ModuleKey, label: "العهد النقدية", icon: "💼" },
  { key: null, label: "الأصول الثابتة", icon: "🏢" },
];

// Pipeline step labels shown in the legend
export const EXPORT_PIPELINE_STEPS: ModuleAggState[] = ["incomplete", "ready_consolidation", "consolidated", "ready_erp", "exported", "erp_imported"];

type ModuleSummary = {
  moduleKey: string;
  pending?: number;
  approved?: number;
  final?: number;
  rejected?: number;
  erp?: number;
  total?: number;
  totalAmount?: number;
  recentOperations?: Array<{
    id: string;
    branch: string;
    status: "pending" | "approved" | "final-approved" | "rejected";
    amountHalalas: number;
    operationDate?: string | null;
    erpPosted: boolean;
  }>;
  counts?: { pending: number; approved: number; final: number; erp: number };
};

export function ModuleAggregationGrid({ ops, moduleAggregation = [], navigate }: { ops: Op[]; moduleAggregation?: ModuleSummary[]; navigate: (p: PageId) => void }) {
  const { lang, dir, t } = useLang();
  const en = lang === "en";
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedKey) detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedKey]);
  const selectedMeta = selectedKey ? MODULE_META.find(m => (m.key || m.label) === selectedKey) : null;
  const selectedOps = selectedMeta?.key ? ops.filter(o => o.moduleKey === selectedMeta.key) : [];
  const selectedSummary = selectedMeta?.key ? moduleAggregation.find(item => item.moduleKey === selectedMeta.key) : undefined;
  const recentOperations = selectedSummary?.recentOperations ?? [];
  const statusLabel = (status: string) => ({
    pending: t("معلق", "Pending"),
    approved: t("مراجع", "Reviewed"),
    "final-approved": t("معتمد نهائياً", "Final approved"),
    rejected: t("مرفوض", "Rejected"),
  }[status] ?? status);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" dir={dir}>
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{t("جاهزية التجميع المحاسبي — مسار التصدير لـ ERP", "Accounting Consolidation Readiness — ERP Export Pipeline")}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">{t("كل موديول يمثل حزمة قيود محاسبية · اضغط على موديول لفحص محتوى الحزمة", "Each module represents an accounting entry package · Click a module to inspect its package contents")}</p>
          </div>
        </div>
        <div className="flex items-center gap-0 overflow-x-auto">
          {EXPORT_PIPELINE_STEPS.map((s, i) => {
            const cfg = MODULE_AGG_CFG[s];
            const label = en ? (EN_MODULE_AGG[s]?.label || cfg.label) : cfg.label;
            const isLast = i === EXPORT_PIPELINE_STEPS.length - 1;
            return (
              <div key={s} className="flex items-center gap-0 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}></span>
                  <span className="text-[10px] font-semibold text-gray-600">{label}</span>
                  {s === "erp_imported" && <span className="text-[9px] text-purple-400 font-bold">★</span>}
                </div>
                {!isLast && <span className="text-gray-300 text-xs flex-shrink-0">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MODULE_META.map(m => {
          const cardKey = m.key || m.label;
          const mLabel = en ? (EN_MODULE_META[m.label] || m.label) : m.label;
          const mOps = m.key ? ops.filter(o => o.moduleKey === m.key) : [];
          const summary = moduleAggregation.find(item => item.moduleKey === m.key);
          const state = summary
            ? getModuleAggStateFromCounts(summary)
            : getModuleAggState(mOps);
          const cfg = MODULE_AGG_CFG[state];
          const cfgLabel = en ? (EN_MODULE_AGG[state]?.label || cfg.label) : cfg.label;
          const cfgSublabel = en ? (EN_MODULE_AGG[state]?.sublabel || cfg.sublabel) : cfg.sublabel;
          const counts = {
            pending: summary?.pending ?? summary?.counts?.pending ?? mOps.filter(o => o.status === "pending").length,
            approved: summary?.approved ?? summary?.counts?.approved ?? mOps.filter(o => o.status === "approved").length,
            final: summary?.final ?? summary?.counts?.final ?? mOps.filter(o => o.status === "final-approved").length,
            rejected: summary?.rejected ?? mOps.filter(o => o.status === "rejected").length,
            erp: summary?.erp ?? summary?.counts?.erp ?? mOps.filter(o => o.erpPosted).length,
          };
          const nonRejectedOps = mOps.filter(o => o.status !== "rejected");
          const total = summary?.totalAmount != null
            ? summary.totalAmount / 100
            : (nonRejectedOps.some(o => o.amount == null) ? null : nonRejectedOps.reduce((s, o) => s + (o.amount ?? 0), 0));
          const totalCount = summary?.total ?? mOps.length;
          const stepNum = cfg.step;
          const maxStep = 5;
          const isSelected = selectedKey === cardKey;

          return (
            <button key={cardKey} aria-expanded={isSelected} aria-controls={isSelected ? "module-accounting-package-details" : undefined} onClick={() => setSelectedKey(isSelected ? null : cardKey)}
              className={`rounded-xl border ${dir === "ltr" ? "text-left" : "text-right"} overflow-hidden transition-all
                ${cfg.cls} ${isSelected ? "ring-2 ring-offset-1 ring-purple-400 shadow-md" : "hover:brightness-95"}`}>
              <div className="h-1 bg-gray-200/60">
                <div className={`h-1 ${cfg.dot}`} style={{ width: `${Math.min((stepNum / maxStep) * 100, 100)}%` }} />
              </div>
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{m.icon}</span>
                  <span className={`text-[9px] font-bold ${cfg.headerCls}`}>{stepNum > 0 ? `${en ? "S" : "م"}${displayDigits(`${stepNum}/5`, lang)}` : ""}</span>
                </div>
                <p className="font-bold text-sm text-gray-800 mb-0.5">{mLabel}</p>
                <p className={`text-[10px] font-semibold mb-1 ${cfg.headerCls}`}>{cfgLabel}</p>
                <p className="text-[9px] text-gray-400 mb-2 leading-tight">{cfgSublabel}</p>
                {totalCount > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {counts.pending > 0 && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">{displayDigits(counts.pending, lang)} {t("معلق", "Pending")}</span>}
                      {counts.approved > 0 && <span className="text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-semibold">{displayDigits(counts.approved, lang)} {t("راجع", "Reviewed")}</span>}
                      {counts.final > 0 && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">{displayDigits(counts.final, lang)} {t("مُجمَّع", "Consolidated")}</span>}
                      {counts.rejected > 0 && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">{displayDigits(counts.rejected, lang)} {t("مرفوض", "Rejected")}</span>}
                      {counts.erp > 0 && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">{displayDigits(counts.erp, lang)} ERP</span>}
                    </div>
                    {total != null && total > 0 && <p className="text-[10px] font-mono font-bold text-gray-600">{fmtAmt(total, lang)} {t("ر.س", "SAR")}</p>}
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-300">{t("لا توجد بيانات", "No data")}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedMeta && (
        <div ref={detailsRef} id="module-accounting-package-details" className="scroll-mt-4 border-t border-gray-100 bg-gray-50/60 p-5" dir={dir}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedMeta.icon}</span>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{t("الحزمة المحاسبية", "Accounting Package")} — {en ? (EN_MODULE_META[selectedMeta.label] || selectedMeta.label) : selectedMeta.label}</h4>
                <p className="text-[10px] text-gray-400">{t("محتوى الحزمة: ما هو مُدرَج، ما هو مُستبعد، ما يمنع التجميع، ما هو جاهز لـ ERP", "Package contents: what is included, excluded, blocking consolidation, ready for ERP")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedMeta.key && (
                <button onClick={() => navigate(`head-${selectedMeta.key}` as PageId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[11px] font-bold hover:bg-purple-700 transition-colors">
                  <ChevronsRight size={11} />
                  {t("فتح الموديول", "Open Module")}
                </button>
              )}
              <button onClick={() => setSelectedKey(null)} className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded-lg hover:bg-white border border-transparent hover:border-gray-200">
                ✕ {t("إغلاق", "Close")}
              </button>
            </div>
          </div>

          {recentOperations.length > 0 && (
            <div className="mb-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-700">{t("أحدث العمليات المسجلة", "Recent recorded operations")}</span>
                <span className="text-[10px] text-gray-400">{t("معاينة من جميع مراحل العمل", "Preview across all workflow stages")}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {recentOperations.map(operation => (
                  <div key={operation.id} className="px-4 py-2 flex items-center gap-3 text-xs">
                    <span className="font-mono text-gray-500 flex-shrink-0" title={operation.id}>{operation.id.length > 12 ? `${operation.id.slice(0, 8)}…` : operation.id}</span>
                    <span className="text-gray-600 flex-shrink-0">{operation.branch}</span>
                    <span className="flex-1" />
                    <span className="text-[10px] text-gray-500">{statusLabel(operation.status)}</span>
                    <span className="font-mono font-bold text-gray-700">{fmtAmt(operation.amountHalalas / 100, lang)} {t("ر.س", "SAR")}</span>
                    {operation.erpPosted && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">ERP ✓</span>}
                    {operation.operationDate && <span className="text-[9px] text-gray-400">{new Date(operation.operationDate).toLocaleDateString(en ? "en" : "ar")}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedOps.length === 0 && recentOperations.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-gray-600">{selectedMeta.key && (selectedSummary?.total ?? 0) > 0
                ? t("توجد سجلات في هذا الموديول، لكن تفاصيلها تظهر في شاشة الموديول حسب مرحلة المراجعة.", "Records exist in this module. Open the module to review details by workflow stage.")
                : t("لا توجد بيانات في هذا الموديول", "No data in this module")}</p>
            </div>
          ) : selectedOps.length === 0 ? null : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                {selectedOps.filter(o => o.status === "final-approved").length > 0 && (
                  <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden">
                    <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-[11px] font-bold text-emerald-800">{t("مُدرَجة في الحزمة — قيود مُعتمدة نهائياً", "Included in Package — Final-approved entries")}</span>
                      <span className="text-[10px] text-emerald-600 mr-auto font-mono font-bold">
                        {fmtAmt(aggregateOpsAmount(selectedOps.filter(o => o.status === "final-approved")))} {t("ر.س", "SAR")}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {selectedOps.filter(o => o.status === "final-approved").slice(0, 4).map((o, i) => (
                        <div key={i} className="px-4 py-2 flex items-center gap-3 text-xs">
                          <span className="font-mono text-gray-400 flex-shrink-0">{o.id}</span>
                          <span className="text-gray-600 flex-shrink-0">{o.branch}</span>
                          <span className="flex-1"></span>
                          <span className="font-mono font-bold text-gray-700">{fmtAmt(o.amount)} {t("ر.س", "SAR")}</span>
                          {o.erpPosted
                            ? <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">ERP ✓</span>
                            : <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">{t("جاهز", "Ready")}</span>}
                        </div>
                      ))}
                      {selectedOps.filter(o => o.status === "final-approved").length > 4 &&
                        <p className="px-4 py-1.5 text-[10px] text-gray-400">+ {selectedOps.filter(o => o.status === "final-approved").length - 4} {t("عمليات أخرى", "more operations")}</p>}
                    </div>
                  </div>
                )}

                {selectedOps.filter(o => o.status === "pending").length > 0 && (
                  <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
                    <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-[11px] font-bold text-red-800">{t("معلقة — تمنع اكتمال التجميع", "Pending — Blocking consolidation")}</span>
                      <span className="text-[10px] text-red-600 mr-auto font-mono font-bold">
                        {fmtAmt(aggregateOpsAmount(selectedOps.filter(o => o.status === "pending")))} {t("ر.س", "SAR")}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {selectedOps.filter(o => o.status === "pending").slice(0, 3).map((o, i) => (
                        <div key={i} className="px-4 py-2 flex items-center gap-3 text-xs">
                          <span className="font-mono text-gray-400 flex-shrink-0">{o.id}</span>
                          <span className="text-gray-600 flex-shrink-0">{o.branch}</span>
                          {o.match === "diff" && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">⚠ {t("فرق", "Diff")}</span>}
                          <span className="flex-1"></span>
                          <span className="font-mono font-bold text-gray-700">{fmtAmt(o.amount)} {t("ر.س", "SAR")}</span>
                          <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{o.timeAgo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {(() => {
                  const readyForErp = selectedOps.filter(o => o.status === "final-approved" && !o.erpPosted);
                  if (readyForErp.length === 0) return null;
                  return (
                    <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
                      <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[11px] font-bold text-emerald-800">{t("جاهز للإرسال لـ ERP", "Ready to Send to ERP")}</span>
                        <span className="text-[10px] text-emerald-600 mr-auto font-mono font-bold">
                          {fmtAmt(aggregateOpsAmount(readyForErp))} {t("ر.س", "SAR")}
                        </span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-xs text-gray-500">{displayDigits(readyForErp.length, lang)} {t("عملية مُعتمدة نهائياً لم تُضَم لدفعة ERP بعد", "final-approved entries not yet added to an ERP batch")}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{t("ادمجها في الدفعة القادمة من صفحة التصدير لـ ERP", "Add them to the next batch from the ERP Export page")}</p>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const posted = selectedOps.filter(o => o.erpPosted);
                  if (posted.length === 0) return null;
                  const bm: Record<string, { total: number | null; count: number; ops: Op[] }> = {};
                  posted.forEach(o => { const b = o.erpBatchId || "—"; if (!bm[b]) bm[b] = { total: 0, count: 0, ops: [] }; bm[b].ops.push(o); bm[b].count++; });
                  Object.values(bm).forEach(entry => { entry.total = aggregateOpsAmount(entry.ops); });
                  return (
                    <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden">
                      <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-[11px] font-bold text-indigo-800">{t("مُرحَّلة في ERP — دفعات مُغلقة", "Posted to ERP — Closed Batches")}</span>
                        <span className="text-[10px] text-indigo-600 mr-auto font-mono font-bold">
                          {fmtAmt(aggregateOpsAmount(posted))} {t("ر.س", "SAR")}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {Object.entries(bm).map(([bid, { total, count }], i) => (
                          <div key={i} className="px-4 py-2 flex items-center gap-3">
                            <span className="font-mono text-[10px] text-indigo-700 font-bold">{bid}</span>
                            <span className="flex-1"></span>
                            <span className="text-[10px] text-gray-500">{count} {t("بيان", "entries")}</span>
                            <span className="font-mono text-xs font-bold text-indigo-800">{fmtAmt(total)} {t("ر.س", "SAR")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {selectedOps.filter(o => o.status === "rejected").length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      <span className="text-[11px] font-bold text-gray-600">{t("مُستبعدة — مرفوضة، خارج الحزمة", "Excluded — Rejected, outside the package")}</span>
                      <span className="text-[10px] text-gray-500 mr-auto font-mono">
                        {displayDigits(selectedOps.filter(o => o.status === "rejected").length, lang)} {t("بيانات", "entries")}
                      </span>
                    </div>
                    <div className="px-4 py-2">
                      {selectedOps.filter(o => o.status === "rejected").slice(0, 2).map((o, i) => (
                        <p key={i} className="text-[10px] text-gray-400 py-0.5">{o.id} · {o.branch} · {o.rejectReason || "—"}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
