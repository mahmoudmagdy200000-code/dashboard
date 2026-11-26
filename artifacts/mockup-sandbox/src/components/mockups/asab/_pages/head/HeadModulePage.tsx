import { useState } from "react";
import {
  ChevronRight,
  FileText,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Search,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useExportHeadOperations } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { displayDigits } from "../../_shared/displayDigits";
import { fmtAmt } from "../../_shared/formatters";
import { MATCH_CFG } from "../../_shared/displayConfig";
import { applyFilters } from "../../_shared/filterOps";
import type { PageProps, Op, Filters, ModuleKey } from "../../_shared/types";
import { isPkg6SalesReport, SALES_RETURN_HINT } from "../../salesActionGuards";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { KpiCard } from "../../components/KpiCard";
import { HeadShiftHistory } from "./HeadShiftHistory";
import { HeadEmployeeLedger } from "./HeadEmployeeLedger";
import { HeadSalesData, HeadShiftData } from "./HeadOperationalData";
import { HeadOperationalModuleData } from "./HeadOperationalModuleData";
import { HeadModuleRecords } from "./HeadModuleRecords";

export function HeadModulePage({ moduleKey, navigate, setModal, setDetailId, ops, finalApproveOp, rejectOp, bulkApprove }: PageProps & { moduleKey: string }) {
  const { t, lang, dir } = useLang();
  const en = lang === "en";
  const exportHeadOpsMut = useExportHeadOperations();
  const [filters, setFilters] = useState<Filters>({ branch: "", status: "", match: "", search: "" });
  const allVal = "";
  const count = (value: number) => displayDigits(value, lang);
  const [accFilter, setAccFilter] = useState(allVal);
  const [brandFilter, setBrandFilter] = useState(allVal);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const mk = moduleKey as ModuleKey;
  const labels: Record<string, string> = { sales: t("المبيعات", "Sales"), expenses: t("المصروفات", "Expenses"), purchases: t("المشتريات", "Purchases"), inventory: t("المخزون", "Inventory"), shifts: t("الشفتات", "Shifts"), employees: t("كشف الحساب", "Employees"), cash: t("العهد النقدية", "Petty Cash"), waste: t("الهدر والتالف", "Waste"), assets: t("الأصول الثابتة", "Assets") };
  const moduleEmoji: Record<string, string> = { sales: "💰", expenses: "🧾", purchases: "🛒", inventory: "📦", shifts: "🕐", employees: "👥", cash: "💵", waste: "🗑️", assets: "🏢" };
  const label = labels[moduleKey] || moduleKey;
  // HA-F15: Real accountant names from the API only; display "غير متاح" when missing without fake placeholders.
  const getAcc = (op: Op) => op.accountantName || t("غير متاح", "Unavailable");
  const realAccs = [...new Set(ops.map(o => o.accountantName).filter(Boolean))] as string[];
  const HEAD_ACCS = realAccs;
  // B-H1: brand & branch filter options from the enriched ops rows.
  const BRAND_OPTS = [...new Set(ops.map(o => o.brandName).filter(Boolean))] as string[];
  const BRANCH_OPTS = [...new Set(ops.map(o => o.branch).filter(Boolean))] as string[];
  const hasApprovalQueue = moduleKey !== "expenses" && moduleKey !== "employees" && moduleKey !== "cash" && moduleKey !== "assets";
  let filtered = hasApprovalQueue ? applyFilters(ops, filters, mk).filter(o => o.status === "approved") : [];
  if (accFilter !== allVal) filtered = filtered.filter(o => getAcc(o) === accFilter);
  if (brandFilter !== allVal) filtered = filtered.filter(o => o.brandName === brandFilter);
  // B-H3: apply the from/to date range (was previously dead UI — applyFilters ignores dates).
  if (dateFrom) filtered = filtered.filter(o => (o.operationDate ?? "").slice(0, 10) >= dateFrom);
  if (dateTo) filtered = filtered.filter(o => (o.operationDate ?? "").slice(0, 10) <= dateTo);
  const totalAmt = filtered.some(o => o.amount == null) ? null : filtered.reduce((s, o) => s + (o.amount ?? 0), 0);
  const diffCount = filtered.filter(o => o.match === "diff").length;
  const exactCount = filtered.filter(o => o.match === "exact").length;
  const hasFilters = accFilter !== allVal || brandFilter !== allVal || !!filters.branch || !!filters.match || !!filters.search || !!dateFrom || !!dateTo;

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <button onClick={() => navigate("head-dashboard")} className="hover:text-purple-600 transition-colors">{t("لوحة التحكم", "Dashboard")}</button>
        <ChevronRight size={12} />
        <span className="text-gray-500">{t("الموديولات", "Modules")}</span>
        <ChevronRight size={12} />
        <span className="text-gray-800 font-semibold">{moduleEmoji[moduleKey] || "📋"} {label}</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{label}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("السجلات الفعلية ومراحل المراجعة", "Live records and review status")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* HA-F23: Export matches head module queue status (approved) */}
          {hasApprovalQueue && <button onClick={() => exportHeadOpsMut.mutate({ status: "approved", moduleKey, format: "xlsx" })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
            <FileText size={11} /> Excel
          </button>}
          {filtered.length > 0 && <Btn variant="success" onClick={() => bulkApprove(filtered.map(o => o.id))}>✅ {t("اعتماد الكل", "Approve All")} ({count(filtered.length)})</Btn>}
        </div>
      </div>

      {hasApprovalQueue && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label={t("بانتظار الاعتماد", "Awaiting Approval")} value={count(filtered.length)} sub={t("عملية موافق عليها", "approved operations")} icon={<Clock size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("الإجمالي", "Total")} value={fmtAmt(totalAmt, lang)} sub={t("ر.س", "SAR")} icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("يوجد فروقات", "Has Differences")} value={count(diffCount)} sub={t("تحتاج مراجعة", "Needs review")} icon={<AlertTriangle size={18} className="text-red-600" />} accent="red" />
        <KpiCard label={t("متطابقة", "Matched")} value={count(exactCount)} sub={t("مطابقة تامة", "Exact match")} icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
      </div>}

      {moduleKey === "sales" && <HeadSalesData />}
      {moduleKey === "shifts" && <HeadShiftData />}
      {moduleKey === "employees" && <HeadEmployeeLedger />}
      {(["expenses", "purchases", "inventory", "cash", "waste", "assets"] as const).includes(moduleKey as "expenses" | "purchases" | "inventory" | "cash" | "waste" | "assets") && (
        <HeadOperationalModuleData moduleKey={moduleKey as "expenses" | "purchases" | "inventory" | "cash" | "waste" | "assets"} />
      )}

      {moduleKey !== "assets" && <HeadModuleRecords key={moduleKey} moduleKey={mk} />}

      {hasApprovalQueue && <>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir={dir}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المحاسب المراجع", "Reviewing Accountant")}</label>
              <select value={accFilter} onChange={e => setAccFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value="">{t("الكل", "All")}</option>
                {HEAD_ACCS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("العلامة التجارية", "Brand")}</label>
              <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value="">{t("الكل", "All")}</option>
                {BRAND_OPTS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفرع", "Branch")}</label>
              <select value={filters.branch} onChange={e => setFilters({ ...filters, branch: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value="">{allVal}</option>
                {BRANCH_OPTS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المطابقة", "Match")}</label>
              <select value={filters.match} onChange={e => setFilters({ ...filters, match: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value="">{t("كل المطابقات", "All Matches")}</option>
                <option value="exact">{t("متطابق تاماً", "Exact Match")}</option>
                <option value="review">{t("يحتاج مراجعة", "Needs Review")}</option>
                <option value="diff">{t("يوجد فرق", "Has Difference")}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("من تاريخ", "From Date")}</label>
              <input lang={lang === "ar" ? "ar-SA" : "en-US"} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" dir="ltr" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("إلى تاريخ", "To Date")}</label>
              <input lang={lang === "ar" ? "ar-SA" : "en-US"} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" dir="ltr" />
            </div>
            <div className="flex items-end gap-2">
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-2"><RotateCcw size={10} /> {t("مسح التاريخ", "Clear Dates")}</button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder={t("بحث بالفرع أو المطعم أو رقم العملية...", "Search by branch, restaurant or operation ID...")} className="flex-1 text-sm outline-none" />
            </div>
            {hasFilters && (
              <button onClick={() => { setAccFilter(allVal); setBrandFilter(allVal); setFilters({ branch: "", status: "", match: "", search: "" }); setDateFrom(""); setDateTo(""); }}
                className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11} /> {t("مسح الكل", "Clear All")}</button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">{t("بانتظار الاعتماد النهائي", "Awaiting Final Approval")}</h3>
            <span className="text-xs text-gray-400">{count(filtered.length)} {t("عملية", "operations")} · {fmtAmt(totalAmt, lang)} {t("ر.س", "SAR")}</span>
          </div>
          {filtered.length === 0
            ? <EmptyState icon="✅" title={t("لا توجد عمليات", "No Operations")} desc={t("لا توجد عمليات بانتظار الاعتماد في هذا الموديول", "No operations awaiting approval in this module")} />
            : filtered.map(op => {
              const accountant = getAcc(op);
              return (
                <div key={op.id} className={`px-5 py-4 flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 ${op.match === "diff" ? "border-r-4 border-r-red-400" : ""}`}>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{accountant[0]}</div>
                  <div className="flex-1 min-w-0 w-full xl:w-auto">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-800 break-words">{op.branch}</span>
                      <span className="text-xs font-mono text-gray-400 break-all">{op.id}</span>
                      <Badge className={`${(MATCH_CFG[op.match]?.cls ?? "bg-amber-50 text-amber-800 border-amber-200")} border text-[10px]`}>
                        {en
                          ? (op.match === "exact" ? "Exact" : op.match === "review" ? "Needs Review" : op.match === "diff" ? "Diff" : "Match unavailable")
                          : (MATCH_CFG[op.match]?.label ?? "مطابقة غير متاحة")}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{t("راجعه:", "Reviewed by:")} <span className="text-purple-600 font-medium">{accountant}</span> · <span>⏰ {op.timeAgo}</span></p>
                  </div>
                  <span className="font-mono font-bold text-gray-800 tabular-nums">{fmtAmt(op.amount, lang)} {t("ر.س", "SAR")}</span>
                  <div className="flex gap-1.5 flex-wrap w-full xl:w-auto">
                    <Btn size="sm" variant="success" onClick={() => { void Promise.resolve(finalApproveOp(op.id)).catch(() => {}); }}><CheckCircle2 size={12} /> {t("اعتماد", "Approve")}</Btn>
                    {isPkg6SalesReport(op) ? <span className="text-xs text-amber-700">{t(SALES_RETURN_HINT.ar, SALES_RETURN_HINT.en)}</span> : <Btn size="sm" variant="danger" onClick={() => { setDetailId(op.id); setModal("reject"); }}><XCircle size={12} /> {t("رفض", "Reject")}</Btn>}
                  </div>
                </div>
              );
            })
          }
          {filtered.length > 0 && (
            <div className="px-5 py-3 bg-gradient-to-r from-purple-50/80 to-cyan-50/60 border-t border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-600">{t("الإجمالي الكلي", "Grand Total")}</span>
                <Badge className="bg-purple-100 text-purple-700">{count(filtered.length)} {t("عملية", "ops")}</Badge>
                {diffCount > 0 && <Badge className="bg-red-50 text-red-700">{count(diffCount)} {t("فروقات", "diffs")}</Badge>}
                {exactCount > 0 && <Badge className="bg-emerald-50 text-emerald-700">{count(exactCount)} {t("مطابقة", "matched")}</Badge>}
              </div>
              <span className="font-mono font-black text-xl text-purple-700">{fmtAmt(totalAmt, lang)} {t("ر.س", "SAR")}</span>
            </div>
          )}
        </div>
      </>}
      {moduleKey === "shifts" && <HeadShiftHistory />}
    </div>
  );
}
