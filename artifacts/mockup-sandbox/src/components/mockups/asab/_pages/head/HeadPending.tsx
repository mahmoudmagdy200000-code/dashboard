import { useState } from "react";
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  FileText,
  Search,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  usePendingOperations,
  useExportHeadOperations,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import { MATCH_CFG } from "../../_shared/displayConfig";
import { applyFilters } from "../../_shared/filterOps";
import type { PageProps, Op, Filters } from "../../_shared/types";
import { isPkg6SalesReport, SALES_RETURN_HINT } from "../../salesActionGuards";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { KpiCard } from "../../components/KpiCard";

export function HeadPending({ navigate, setModal, setDetailId, ops, finalApproveOp, rejectOp, bulkApprove, returnForReview }: PageProps) {
  const { t, lang, dir } = useLang();
  const en = lang === "en";
  usePendingOperations();
  const exportHeadOpsMut = useExportHeadOperations();
  const [filters, setFilters] = useState<Filters>({ branch: "", status: "approved", match: "", search: "" });
  const [accFilter, setAccFilter] = useState(t("الكل", "All"));
  const [brandFilter, setBrandFilter] = useState(t("الكل", "All"));
  const [groupBy, setGroupBy] = useState<"flat" | "module" | "accountant">("module");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [conditionalId, setConditionalId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [conditionalApproved, setConditionalApproved] = useState<Set<string>>(new Set());
  const [isSubmittingCond, setIsSubmittingCond] = useState(false);
  const REJECT_REASONS = [t("يوجد فرق في المبالغ", "Amount discrepancy"), t("مستندات ناقصة", "Missing documents"), t("يحتاج مراجعة المورد", "Needs supplier review"), t("تكرار في القيد", "Duplicate entry"), t("خطأ في الفرع", "Wrong branch"), t("أخرى", "Other")];
  const [selectedRejectReason, setSelectedRejectReason] = useState("");
  // HA-F15: Real accountant names from the API only; display "غير متاح" when missing without fake placeholders.
  const getAcc = (op: Op) => op.accountantName || t("غير متاح", "Unavailable");
  const realAccs = [...new Set(ops.map(o => o.accountantName).filter(Boolean))] as string[];
  const HEAD_ACCS = realAccs;
  // B-H1: brand & branch filter options come from the enriched ops rows.
  const BRAND_OPTS = [...new Set(ops.map(o => o.brandName).filter(Boolean))] as string[];
  const BRANCH_OPTS = [...new Set(ops.map(o => o.branch).filter(Boolean))] as string[];
  let filtered = applyFilters(ops, filters).filter(o => o.status === "approved");
  const allVal = t("الكل", "All");
  if (accFilter !== allVal) filtered = filtered.filter(o => getAcc(o) === accFilter);
  if (brandFilter !== allVal) filtered = filtered.filter(o => o.brandName === brandFilter);
  const totalAmt = filtered.some(o => o.amount == null) ? null : filtered.reduce((s, o) => s + (o.amount ?? 0), 0);
  const hasFilters = accFilter !== allVal || brandFilter !== allVal || !!filters.branch || !!filters.match || !!filters.search;

  const toggleGroup = (key: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const buildGroups = () => {
    if (groupBy === "flat") return [{ key: "all", label: "جميع العمليات", ops: filtered }];
    const map = new Map<string, Op[]>();
    filtered.forEach(op => {
      const key = groupBy === "module" ? op.moduleLabel : getAcc(op);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(op);
    });
    return Array.from(map.entries()).map(([key, ops]) => ({ key, label: key, ops })).sort((a, b) => b.ops.length - a.ops.length);
  };

  const groups = buildGroups();

  const OpRow = ({ op }: { op: Op }) => {
    const accountant = getAcc(op);
    const isCond = conditionalId === op.id;
    const wasCond = conditionalApproved.has(op.id);
    return (
      <div key={op.id} className={`border-b border-gray-100 last:border-0 ${op.match === "diff" ? "border-r-4 border-r-red-400" : ""}`}>
        <div className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{accountant[0]}</div>
          {groupBy !== "module" && <Badge className="bg-purple-50 text-purple-700 border border-purple-100 text-xs flex-shrink-0">{op.moduleLabel}</Badge>}
          {groupBy !== "accountant" && <Badge className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] flex-shrink-0">{accountant}</Badge>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-800">{op.branch}</span>
              <span className="text-xs font-mono text-gray-400">{op.id}</span>
              <Badge className={`${MATCH_CFG[op.match].cls} border text-[10px]`}>{en ? (op.match === "exact" ? "Exact" : "Diff") : MATCH_CFG[op.match].label}</Badge>
              {wasCond && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">⚡ {t("اعتماد مشروط", "Conditional Approval")}</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">⏰ {op.timeAgo}</p>
          </div>
          <span className="font-mono font-bold text-gray-800 tabular-nums">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</span>
          <div className="flex gap-1.5 flex-shrink-0">
            <Btn size="sm" variant="success" onClick={() => finalApproveOp(op.id)}><CheckCircle2 size={12} /> {t("اعتماد", "Approve")}</Btn>
            <button onClick={() => { setConditionalId(isCond ? null : op.id); setApprovalComment(""); }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${isCond ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"}`}>
              <AlertTriangle size={11} /> {t("مشروط", "Conditional")}
            </button>
            {isPkg6SalesReport(op) && <span className="text-xs text-amber-700">{t(SALES_RETURN_HINT.ar, SALES_RETURN_HINT.en)}</span>}
            {returnForReview && !isPkg6SalesReport(op) && (
              <button onClick={() => { const note = window.prompt(t("ملاحظة الإرجاع (اختياري)", "Return note (optional)")); if (note === null) return; void returnForReview(op.id, note.trim() || undefined); }}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100">
                <RotateCcw size={11} /> {t("إرجاع للمراجعة", "Return")}
              </button>
            )}
            <div className="relative group" hidden={isPkg6SalesReport(op)}>
              <button className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 font-semibold hover:bg-red-100">
                <XCircle size={11} /> {t("رفض", "Reject")}
              </button>
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-20 hidden group-hover:block w-56">
                <p className="text-[10px] font-bold text-gray-500 mb-1.5 px-1">{t("سبب الرفض", "Reject Reason")}</p>
                {REJECT_REASONS.map(r => (
                  <button key={r} onClick={() => { setDetailId?.(op.id); rejectOp?.(op.id, r); }}
                    className={`w-full ${dir === "ltr" ? "text-left" : "text-right"} text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 text-red-700 hover:font-semibold transition-colors`}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {isCond && (
          <div className="px-5 pb-4 bg-amber-50/40 border-t border-amber-100">
            <p className="text-[11px] font-bold text-amber-800 mb-2 pt-2">{t("تفاصيل الاعتماد المشروط", "Conditional Approval Details")}</p>
            <textarea value={approvalComment} onChange={e => setApprovalComment(e.target.value)}
              placeholder={t("اكتب الشروط أو الملاحظات المطلوبة من الفرع قبل التنفيذ النهائي...", "Write conditions or notes required from the branch before final execution...")}
              className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 resize-none h-20 bg-white focus:outline-none focus:border-amber-400" />
            <div className="flex gap-2 mt-2">
              <button disabled={isSubmittingCond || !approvalComment.trim()}
                onClick={async () => {
                  const trimmed = approvalComment.trim();
                  if (!trimmed || isSubmittingCond) return;
                  setIsSubmittingCond(true);
                  try {
                    await finalApproveOp(op.id, { note: trimmed });
                    setConditionalApproved(p => new Set(p).add(op.id));
                    setConditionalId(null);
                    setApprovalComment("");
                  } catch {
                    // Do not mark conditional approved if server call fails
                  } finally {
                    setIsSubmittingCond(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50 transition-all">
                <CheckCircle2 size={11} /> {isSubmittingCond ? t("جارٍ الحفظ...", "Saving...") : t("تأكيد الاعتماد المشروط", "Confirm Conditional Approval")}
              </button>
              <button disabled={isSubmittingCond} onClick={() => { setConditionalId(null); setApprovalComment(""); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">{t("إلغاء", "Cancel")}</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("بانتظار الاعتماد النهائي", "Awaiting Final Approval")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} {t("عملية وافق عليها المحاسبون", "operations approved by accountants")} · {fmtAmt(totalAmt)} {t("ر.س إجمالياً", "SAR total")}</p>
        </div>
        <div className="flex gap-2">
          {/* HA-F23: Export matches head queue status (approved) */}
          <button onClick={() => exportHeadOpsMut.mutate({ status: "approved", format: "xlsx" })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
            <FileText size={11} /> Excel
          </button>
          {filtered.length > 0 && <Btn variant="success" onClick={() => bulkApprove(filtered.map(o => o.id))}>✅ {t("اعتماد الكل", "Approve All")} ({filtered.length})</Btn>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("بانتظار الاعتماد", "Awaiting Approval")} value={String(filtered.length)} sub={t("جميع الموديولات", "All modules")} icon={<Clock size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("الإجمالي", "Total")} value={totalAmt != null ? `${(totalAmt / 1000).toFixed(0)}K` : "—"} sub={t("ر.س", "SAR")} icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("يوجد فروقات", "Has Differences")} value={String(filtered.filter(o => o.match === "diff").length)} sub={t("تحتاج مراجعة إضافية", "Needs further review")} icon={<AlertTriangle size={18} className="text-red-600" />} accent="red" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir={dir}>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label htmlFor="head-pending-accountant-filter" className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المحاسب المراجع", "Reviewing Accountant")}</label>
            <select id="head-pending-accountant-filter" value={accFilter} onChange={e => setAccFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option>{t("الكل", "All")}</option>
              {HEAD_ACCS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="head-pending-brand-filter" className="text-[11px] font-semibold text-gray-500 block mb-1">{t("العلامة التجارية", "Brand")}</label>
            <select id="head-pending-brand-filter" value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option>{allVal}</option>
              {BRAND_OPTS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="head-pending-branch-filter" className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفرع", "Branch")}</label>
            <select id="head-pending-branch-filter" value={filters.branch} onChange={e => setFilters({ ...filters, branch: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">{t("الكل", "All")}</option>
              {BRANCH_OPTS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="head-pending-match-filter" className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المطابقة", "Match")}</label>
            <select id="head-pending-match-filter" value={filters.match} onChange={e => setFilters({ ...filters, match: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">{t("كل المطابقات", "All Matches")}</option>
              <option value="exact">{t("متطابق تاماً", "Exact Match")}</option>
              <option value="review">{t("يحتاج مراجعة", "Needs Review")}</option>
              <option value="diff">{t("يوجد فرق", "Has Difference")}</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input aria-label={t("بحث بالفرع أو المطعم أو رقم العملية", "Search by branch, restaurant or operation ID")} value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder={t("بحث بالفرع أو المطعم أو رقم العملية...", "Search by branch, restaurant or operation ID...")} className="flex-1 text-sm outline-none" />
          </div>
          {hasFilters && (
            <button onClick={() => { setAccFilter(allVal); setBrandFilter(allVal); setFilters({ branch: "", status: "approved", match: "", search: "" }); }}
              className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11} /> {t("مسح الفلاتر", "Clear Filters")}</button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">{t("تجميع حسب:", "Group by:")}</span>
        {([["flat", t("بدون تجميع", "No grouping")], ["module", t("الموديول", "Module")], ["accountant", t("المحاسب", "Accountant")]] as [typeof groupBy, string][]).map(([val, lbl]) => (
          <button key={val} onClick={() => setGroupBy(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${groupBy === val ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
            {lbl}
          </button>
        ))}
        {groupBy !== "flat" && (
          <button onClick={() => setCollapsedGroups(new Set(groups.map(g => g.key)))} className="text-xs text-gray-400 hover:text-gray-600 mr-2">{t("طي الكل", "Collapse All")}</button>
        )}
        {collapsedGroups.size > 0 && (
          <button onClick={() => setCollapsedGroups(new Set())} className="text-xs text-purple-600 hover:underline">{t("فتح الكل", "Expand All")}</button>
        )}
      </div>

      {filtered.length === 0
        ? <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10"><EmptyState icon="✅" title={t("لا توجد عمليات", "No Operations")} desc={t("تم اعتماد الكل أو لا تطابق الفلاتر", "All approved or no filters match")} /></div>
        : groupBy === "flat"
          ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">{t("العمليات المعلقة", "Pending Operations")}</h3>
                <span className="text-xs text-gray-400">{filtered.length} {t("عملية", "operations")} · {fmtAmt(totalAmt)} {t("ر.س", "SAR")}</span>
              </div>
              {filtered.map(op => <OpRow key={op.id} op={op} />)}
            </div>
          )
          : (
            <div className="space-y-3">
              {groups.map(grp => {
                const grpAmt = grp.ops.reduce((s, o) => s + (o.amount ?? 0), 0);
                const isCollapsed = collapsedGroups.has(grp.key);
                const diffCount = grp.ops.filter(o => o.match === "diff").length;
                return (
                  <div key={grp.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <button onClick={() => toggleGroup(grp.key)} className="w-full px-5 py-3.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <ChevronRight size={14} className={`text-gray-400 transition-transform ${isCollapsed ? "rotate-0" : "-rotate-90"}`} />
                        <span className="font-bold text-gray-900 text-sm">{grp.label}</span>
                        <Badge className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px]">{grp.ops.length} {t("عملية", "ops")}</Badge>
                        {diffCount > 0 && <Badge className="bg-red-50 text-red-700 border border-red-100 text-[10px]">⚠️ {diffCount} {t("فروقات", "diffs")}</Badge>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-gray-700">{fmtAmt(grpAmt)} {t("ر.س", "SAR")}</span>
                        <Btn size="sm" variant="success" onClick={e => { e.stopPropagation(); bulkApprove(grp.ops.map(o => o.id)); }}>
                          <CheckCircle2 size={11} /> {t("اعتماد المجموعة", "Approve Group")}
                        </Btn>
                      </div>
                    </button>
                    {!isCollapsed && grp.ops.map(op => <OpRow key={op.id} op={op} />)}
                  </div>
                );
              })}
              <div className="bg-gradient-to-l from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-4 flex items-center justify-between">
                <span className="font-bold text-purple-800 text-sm">{t("إجمالي العمليات المعلقة", "Total Pending Operations")}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{filtered.length} {t("عملية في", "operations in")} {groups.length} {groupBy === "module" ? t("موديول", "module") : t("محاسب", "accountant")}</span>
                  <span className="font-mono font-bold text-purple-700 text-base">{fmtAmt(totalAmt)} {t("ر.س", "SAR")}</span>
                </div>
              </div>
            </div>
          )
      }
    </div>
  );
}
