import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  TrendingUp,
  Search,
  RotateCcw,
} from "lucide-react";
import type { Operation as ApiOperation } from "../../../../../api/types";
import { queryKeys } from "../../../../../api/queries/keys";
import { useAccountantDashboardPlatform } from "../../../../../api/queries";
import { salesBulkApprovalIds } from "../../salesActionGuards";
import { KpiCard } from "../../components/KpiCard";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { EmptyState } from "../../components/EmptyState";
import { useLang } from "../../_shared/LangContext";
import { formatTodayLong, opDetailPage } from "../../_shared/formatters";
import { displayDigits } from "../../_shared/displayDigits";
import { STATUS_CFG, EN_STATUS_CFG } from "../../_shared/displayConfig";
import { applyFilters } from "../../_shared/filterOps";
import { PipelineOverview } from "../../_shared/PipelineOverview";
import { ExceptionPanel } from "../../_shared/ExceptionPanel";
import { OpRow } from "../../_shared/OpRow";
import type {
  PageProps,
  ModuleKey,
  Filters,
  Op,
  OpStatus,
  PageId,
} from "../../_shared/types";

function opWorkdayKey(op: Op): string {
  const raw = op.operationDate ?? "";
  return typeof raw === "string" && raw.length >= 10 ? raw.slice(0, 10) : "";
}

function inSelectedPeriod(op: Op, period: "all" | "today" | "week" | "month"): boolean {
  if (period === "all") return true;
  const dateKey = opWorkdayKey(op);
  if (!dateKey) return false;
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  if (period === "today") return dateKey === todayKey;
  const opTime = new Date(`${dateKey}T00:00:00Z`).getTime();
  const todayTime = new Date(`${todayKey}T00:00:00Z`).getTime();
  if (!Number.isFinite(opTime) || !Number.isFinite(todayTime)) return false;
  const diffDays = (todayTime - opTime) / 86_400_000;
  if (period === "week") return diffDays >= 0 && diffDays <= 7;
  return dateKey.slice(0, 7) === todayKey.slice(0, 7);
}

export function AccDashboard({ navigate, setModal, setDetailId, ops, approveOp, rejectOp, bulkApprove, role }: PageProps) {
  const { t, lang } = useLang();
  // Live data subscription — falls back to inline `ops` prop on empty / error.
  const { data: dashData } = useAccountantDashboardPlatform();
  const kpis = dashData?.kpis;
  const apiModules = dashData?.modules;
  const [filters, setFilters] = useState<Filters & { date: string }>({ branch: "", status: "pending", match: "", search: "", date: "" });
  const [period, setPeriod] = useState<"all" | "today" | "week" | "month">("all");
  const [showAllOperations, setShowAllOperations] = useState(false);

  const branchOptions = Array.from(
    new Map(ops.filter(o => o.branch).map(o => [o.branchId || o.branch, { id: o.branchId || o.branch, name: o.branch }])).values(),
  );
  const scopedOps = ops.filter(o => {
    if (filters.branch && o.branch !== filters.branch && o.branchId !== filters.branch) return false;
    if (filters.date && opWorkdayKey(o) !== filters.date) return false;
    if (!inSelectedPeriod(o, period)) return false;
    return true;
  });
  const hasScopeFilter = Boolean(filters.branch || filters.date || period !== "all");

  const pending = scopedOps.filter(o => o.status === "pending");
  const approved = scopedOps.filter(o => o.status === "approved");
  const finalApprovedOps = scopedOps.filter(o => o.status === "final-approved");

  // Prefer backend counts when unfiltered; derive from scopedOps whenever branch/date/period narrows the view.
  const awaitingReviewCount = !hasScopeFilter && kpis?.awaitingReview != null ? kpis.awaitingReview : pending.length;
  const iApprovedCount = !hasScopeFilter && kpis?.iApproved != null ? kpis.iApproved : approved.length;
  const finalApprovedCount = !hasScopeFilter && kpis?.finalApproved != null ? kpis.finalApproved : finalApprovedOps.length;
  const approvalRate = !hasScopeFilter && kpis?.approvalRate != null
    ? kpis.approvalRate
    : (scopedOps.length > 0 ? Math.round((approved.length + finalApprovedOps.length) / scopedOps.length * 100) : 0);
  const localOverdue = pending.filter(o => {
    const daysAgo = (o.timeAgo ?? "").includes("يوم") ? parseInt(o.timeAgo ?? "") || 2 : (o.timeAgo ?? "").includes("أمس") ? 1 : 0;
    return daysAgo >= 2;
  }).length;
  const overdueCount = !hasScopeFilter && kpis?.overdueCount != null ? kpis.overdueCount : localOverdue;

  // Backend `modules[]` keyed by `.key` — used to override client-computed counts per module when unfiltered.
  const apiModulesByKey: Record<string, { pendingCount: number; totalCount: number }> = {};
  if (!hasScopeFilter) {
    apiModules?.forEach(m => { if (m.key) apiModulesByKey[m.key] = { pendingCount: m.pendingCount, totalCount: m.totalCount }; });
  }

  const pendingByModule: Record<ModuleKey, number> = {} as any;
  pending.forEach(o => { pendingByModule[o.moduleKey] = (pendingByModule[o.moduleKey] || 0) + 1; });

  const modules = [
    { id: "acc-sales", label: t("المبيعات", "Sales"), icon: "💰", color: "bg-emerald-500", key: "sales" as ModuleKey },
    { id: "acc-expenses", label: t("المصروفات", "Expenses"), icon: "💸", color: "bg-red-500", key: "expenses" as ModuleKey },
    { id: "acc-purchases", label: t("المشتريات", "Purchases"), icon: "🛒", color: "bg-blue-500", key: "purchases" as ModuleKey },
    { id: "acc-inventory", label: t("المخزون", "Inventory"), icon: "📦", color: "bg-amber-500", key: "inventory" as ModuleKey },
    { id: "acc-waste", label: t("الهدر والتالف", "Waste"), icon: "🗑️", color: "bg-rose-500", key: null },
    { id: "acc-assets", label: t("الأصول الثابتة", "Fixed Assets"), icon: "🏢", color: "bg-purple-500", key: null },
    { id: "acc-shifts", label: t("إدارة الشفتات", "Shifts"), icon: "⏰", color: "bg-cyan-500", key: "shifts" as ModuleKey },
    { id: "acc-employees", label: t("كشف الموظفين", "Employees"), icon: "👥", color: "bg-indigo-500", key: "employees" as ModuleKey },
    { id: "acc-cash", label: t("العهد النقدية", "Cash Custody"), icon: "💼", color: "bg-orange-500", key: "cash" as ModuleKey },
  ];

  const displayed = applyFilters(scopedOps, filters);
  const queryClient = useQueryClient();
  const pendingIds = salesBulkApprovalIds(pending, pending.map(o => o.id), role,
    op => queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id)));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-gray-800 font-bold text-lg sm:text-xl">{t("ملخص — ", "Summary — ")}{formatTodayLong(lang)}</h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5">{displayDigits(t("الفروع المخصصة: 1–50 | الموديولات: التسعة", "Assigned branches: 1–50 | Modules: All nine"), lang)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg">
              <AlertTriangle size={12} /> {displayDigits(overdueCount, lang)} {displayDigits(t("عملية متأخرة >يومين", "operations overdue >2 days"), lang)}
            </div>
          )}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5">
            {(["all", "today", "week", "month"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {p === "all" ? t("الكل", "All") : p === "today" ? t("اليوم", "Today") : p === "week" ? t("الأسبوع", "Week") : t("الشهر", "Month")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="relative">
          <KpiCard label={t("تنتظر مراجعتي", "Awaiting My Review")} value={displayDigits(awaitingReviewCount, lang)} sub={t("📱 رُفعت من الفروع", "📱 Uploaded from branches")} icon={<Clock size={20} className="text-amber-600" />} accent="amber" />
          {overdueCount > 0 && <span className="absolute top-2.5 end-2.5 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{displayDigits(overdueCount, lang)} {t("متأخر", "overdue")}</span>}
        </div>
        <KpiCard label={t("وافقت عليها", "I Approved")} value={displayDigits(iApprovedCount, lang)} sub={t("بانتظار الاعتماد النهائي", "Awaiting final approval")} icon={<CheckCircle2 size={20} className="text-sky-600" />} accent="blue" />
        <KpiCard label={t("معتمدة نهائياً", "Final Approved")} value={displayDigits(finalApprovedCount, lang)} sub={t("مُغلقة — تنتظر ERP أو مُرحَّلة", "Closed — awaiting ERP or posted")} icon={<Lock size={20} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("معدل الموافقة", "Approval Rate")} value={displayDigits(`${approvalRate}%`, lang)} sub={period === "all" ? t("كل الفترات", "All periods") : `${t("هذا", "This")} ${period === "today" ? t("اليوم", "Day") : period === "week" ? t("الأسبوع", "Week") : t("الشهر", "Month")}`} icon={<TrendingUp size={20} className="text-purple-600" />} accent="purple" />
      </div>

      {/* Daily progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <h3 className="font-bold text-gray-800 text-sm">🎯 {t("تقدم الفترة المحددة", "Selected Period Progress")}</h3>
          <span className="text-xs text-gray-400">{t("الهدف: مراجعة جميع العمليات المعلقة", "Goal: Review all pending operations")}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: t("المراجعة", "Review"), done: scopedOps.filter(o => o.status !== "pending").length, total: scopedOps.length, color: "bg-purple-500" },
            { label: t("الموافقة", "Approval"), done: scopedOps.filter(o => o.status === "approved" || o.status === "final-approved").length, total: scopedOps.length, color: "bg-emerald-500" },
            { label: t("التوثيق", "Documentation"), done: scopedOps.filter(o => o.status === "final-approved" && o.erpPosted).length, total: scopedOps.filter(o => o.status === "final-approved").length || 1, color: "bg-blue-500" },
            // Backend dashboard does not expose completedBranches/totalBranches — fall back to a
            // derived signal: fully-processed branches vs. total branches touched by any op.
            (() => {
              const perBranch = new Map<string, { done: number; total: number }>();
              scopedOps.forEach(o => {
                const cur = perBranch.get(o.branch) ?? { done: 0, total: 0 };
                cur.total++;
                if (o.status !== "pending") cur.done++;
                perBranch.set(o.branch, cur);
              });
              let doneBranches = 0;
              perBranch.forEach(v => { if (v.total > 0 && v.done === v.total) doneBranches++; });
              return { label: t("الفروع المكتملة", "Completed Branches"), done: doneBranches, total: perBranch.size || 1, color: "bg-cyan-500" };
            })(),
          ].map(({ label, done, total, color }) => {
            const pct = Math.min(100, total > 0 ? Math.round(done / total * 100) : 0);
            return (
              <div key={label} className="bg-gray-50/50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg">
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="font-semibold text-gray-600">{label}</span>
                  <span className={`font-bold ${pct === 100 ? "text-emerald-600" : "text-gray-500"}`}>{displayDigits(`${done}/${total}`, lang)} {pct === 100 ? "✅" : ""}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 text-left ltr:text-right">{displayDigits(`${pct}%`, lang)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <PipelineOverview ops={scopedOps} navigate={navigate} />

      <ExceptionPanel ops={scopedOps} forRole="accountant" navigate={navigate} />

      <div data-testid="modules-and-filters-section" className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="col-span-1 lg:col-span-2">
          <Card title={t("الموديولات التسعة", "Nine Modules")} actions={<span className="text-xs text-gray-400">{t("المعلق / الإجمالي", "Pending / Total")}</span>}>
            <div className="p-3 sm:p-4 grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {modules.map(m => {
                const apiRow = m.key ? apiModulesByKey[m.key] : undefined;
                const mod_pending = apiRow?.pendingCount ?? (m.key ? (pendingByModule[m.key] || 0) : 0);
                const mod_total = apiRow?.totalCount ?? (m.key ? scopedOps.filter(o => o.moduleKey === m.key).length : 0);
                return (
                  <button key={m.id} onClick={() => navigate(m.id)}
                    className="flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-xl border border-gray-100 hover:border-purple-300 hover:bg-purple-50/40 transition-all relative cursor-pointer">
                    {mod_pending > 0 && <span className="absolute top-1.5 start-1.5 w-2 h-2 rounded-full bg-red-500"></span>}
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base sm:text-lg text-white ${m.color}`}>{m.icon}</div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight line-clamp-1">{m.label}</span>
                    <div className="flex items-center gap-1">
                      {mod_pending > 0 && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{displayDigits(mod_pending, lang)}</span>}
                      {mod_total > 0 && <><span className="text-gray-300 text-[10px]">/</span><span className="text-gray-500 text-[10px]">{displayDigits(mod_total, lang)}</span></>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
        <div className="col-span-1">
          <Card title={t("فلاتر البحث", "Search Filters")}>
            <div className="p-3 sm:p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">{t("🏪 الفرع", "🏪 Branch")}</label>
                <select value={filters.branch} onChange={e => setFilters(p => ({ ...p, branch: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white">
                  <option value="">{t("الكل", "All")}</option>
                  {branchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">{t("📅 يوم العمل", "📅 Workday")}</label>
                <input type="date" value={filters.date} onChange={e => setFilters(p => ({ ...p, date: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">{t("🔄 الحالة", "🔄 Status")}</label>
                <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white">
                  <option value="">{t("الكل", "All")}</option>
                  {(["pending", "approved", "rejected", "final-approved"] as OpStatus[]).map(s => (
                    <option key={s} value={s}>{lang === "ar" ? (STATUS_CFG[s]?.label || s) : (EN_STATUS_CFG[s] || STATUS_CFG[s]?.label || s)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Search size={13} className="text-gray-400 flex-shrink-0" />
                <input value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} placeholder={t("بحث...", "Search...")} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white" />
              </div>
              {(filters.branch || filters.date || period !== "all" || filters.status !== "pending" || filters.match || filters.search) &&
                <button onClick={() => { setPeriod("all"); setFilters({ branch: "", status: "pending", match: "", search: "", date: "" }); }} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11} /> {t("مسح الفلاتر", "Clear Filters")}</button>
              }
            </div>
          </Card>
        </div>
      </div>

      <Card title={t("قائمة العمليات", "Operations List")} actions={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">{displayDigits(displayed.length, lang)} {t("عملية", "operations")}</span>
          {pendingIds.length > 0 && <Btn size="sm" variant="success" onClick={() => bulkApprove(pendingIds)}>✓ {t("موافقة جماعية", "Bulk Approve")} ({displayDigits(pendingIds.length, lang)})</Btn>}
        </div>
      }>
        {displayed.length === 0
          ? <EmptyState icon="✅" title={t("لا توجد عمليات", "No Operations")} desc={t("تم معالجة جميع العمليات أو لا تطابق الفلاتر المحددة", "All operations processed or no matches for the selected filters")} />
          : (showAllOperations ? displayed : displayed.slice(0, 8)).map(op => (
            <OpRow key={op.id} op={op}
              onView={() => { setDetailId(op.moduleKey === "shifts" ? (op.sourceId ?? op.id) : op.id); navigate(opDetailPage(op.moduleKey) as PageId); }}
              onApprove={() => approveOp(op.id)}
              onReject={() => { setDetailId(op.id); setModal("reject"); }} />
          ))
        }
        {displayed.length > 8 && !showAllOperations && (
          <div className="px-5 py-3 text-center">
            <button onClick={() => setShowAllOperations(true)} className="text-xs text-purple-600 hover:underline">{t("عرض كل", "View all")} {displayDigits(displayed.length, lang)} {t("عملية", "operations")}</button>
          </div>
        )}
      </Card>
    </div>
  );
}
