import { useState } from "react";
import { Clock, Lock, ChevronsRight, XCircle, TrendingUp } from "lucide-react";
import {
  useHeadDashboardPlatform,
  useHeadRemindersPlatform,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import type { PageProps } from "../../_shared/types";
import { KpiCard } from "../../components/KpiCard";
import { PipelineOverview } from "../../_shared/PipelineOverview";
import { ExceptionPanel } from "../../_shared/ExceptionPanel";
import { ModuleAggregationGrid } from "./ModuleAggregationGrid";
import { HeadApprovalTab } from "./HeadApprovalTab";
import { HeadAccountants } from "./HeadAccountants";
import { HeadERP } from "./HeadERP";

export function HeadDashboard({ navigate, setModal, setDetailId, ops, finalApproveOp, rejectOp, bulkApprove, markErpPosted }: PageProps) {
  const { data: apiHead } = useHeadDashboardPlatform();
  useHeadRemindersPlatform();
  const { t } = useLang();
  const [tab, setTab] = useState<"approval" | "performance" | "erp">("approval");
  const awaitingHead = ops.filter(o => o.status === "approved");
  const finalApproved = ops.filter(o => o.status === "final-approved");
  const rejected = ops.filter(o => o.status === "rejected");
  // B-H2: bind KPIs to GET /head/dashboard (kpis.awaiting/finalApproved/erpPosted/rejected/
  // performanceRatePct), falling back to ops-derived counts only if the payload is absent.
  const headKpis = (apiHead as any)?.kpis ?? {};
  const kpiAwaiting = headKpis.awaiting ?? awaitingHead.length;
  const kpiFinalErp = headKpis.finalApproved ?? finalApproved.filter(o => !o.erpPosted).length;
  const kpiErpPosted = headKpis.erpPosted ?? finalApproved.filter(o => o.erpPosted).length;
  const kpiRejected = headKpis.rejected ?? rejected.length;
  const performanceRate = headKpis.performanceRatePct ?? 0;
  // B-H2: weeklyPerformance now ships day/thisW/lastW — no static fallback. Scale bars dynamically.
  const weekly = (((apiHead as any)?.weeklyPerformance ?? []) as { day?: string; dayAr?: string; thisW: number; lastW: number }[]);
  const weeklyMax = Math.max(1, ...weekly.flatMap(d => [d.thisW, d.lastW]));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t("لوحة رئيس الحسابات 👑", "Head Accountant Dashboard 👑")}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{t("الإشراف على 4 محاسبين · 100 فرع · الاعتماد النهائي وترحيل ERP", "Supervising 4 accountants · 100 branches · Final approval & ERP posting")}</p>
      </div>
      <div className="grid grid-cols-5 gap-4">
        <KpiCard label={t("بانتظار اعتمادي", "Awaiting My Approval")} value={String(kpiAwaiting)} sub={t("📱 من المحاسبين · م3", "📱 From accountants · S3")} icon={<Clock size={18} className="text-amber-600" />} accent="amber" onClick={() => setTab("approval")} />
        <KpiCard label={t("معتمدة نهائياً", "Final Approved")} value={String(kpiFinalErp)} sub={t("مُغلقة · تنتظر ERP · م4", "Closed · Awaiting ERP · S4")} icon={<Lock size={18} className="text-emerald-600" />} accent="emerald" onClick={() => setTab("erp")} />
        <KpiCard label={t("مُرحَّلة لـ ERP", "Posted to ERP")} value={String(kpiErpPosted)} sub={t("مُعالَجة · م5", "Processed · S5")} icon={<ChevronsRight size={18} className="text-indigo-600" />} accent="blue" onClick={() => setTab("erp")} />
        <KpiCard label={t("مرفوضة", "Rejected")} value={String(kpiRejected)} sub={t("خارج المسار", "Off pipeline")} icon={<XCircle size={18} className="text-red-600" />} accent="red" onClick={() => setTab("approval")} />
        <KpiCard label={t("معدل الأداء", "Performance Rate")} value={`${performanceRate}%`} sub={t("هذا الشهر", "This Month")} icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" onClick={() => setTab("performance")} />
      </div>
      {/* Weekly performance chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-sm">📈 {t("الأداء الأسبوعي — عمليات مكتملة", "Weekly Performance — Completed Operations")}</h3>
          <span className="text-xs text-gray-400">{t("الأسبوع الماضي مقارنةً بهذا الأسبوع", "Last week vs this week")}</span>
        </div>
        <div className="flex items-end gap-3 h-28">
          {weekly.length === 0
            ? <div className="w-full text-center text-xs text-gray-400 self-center">{t("لا توجد بيانات أداء أسبوعية بعد", "No weekly performance data yet")}</div>
            : weekly.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-20">
                  <div className="flex-1 bg-gray-200 rounded-t" style={{ height: `${(d.lastW / weeklyMax) * 100}%` }} />
                  <div className="flex-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t" style={{ height: `${(d.thisW / weeklyMax) * 100}%` }} />
                </div>
                <p className="text-[9px] text-gray-400 text-center leading-tight">{d.dayAr ?? d.day}</p>
              </div>
            ))}
        </div>
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500 flex-shrink-0" /><span className="text-[11px] text-gray-600">{t("هذا الأسبوع", "This Week")}</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 flex-shrink-0" /><span className="text-[11px] text-gray-600">{t("الأسبوع الماضي", "Last Week")}</span></div>
          <div className="mr-auto text-[11px] text-emerald-600 font-semibold">↑ +18% {t("مقارنة بالأسبوع الماضي", "vs last week")}</div>
        </div>
      </div>

      <PipelineOverview ops={ops} navigate={navigate} />
      <ExceptionPanel ops={ops} forRole="head" navigate={navigate} />
      <ModuleAggregationGrid ops={ops} navigate={navigate} />
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: "approval" as const, label: `✅ ${t("الاعتماد النهائي", "Final Approval")}` },
          { id: "performance" as const, label: `👥 ${t("أداء المحاسبين", "Accountants")}` },
          { id: "erp" as const, label: `🔗 ${t("الترحيل لـ ERP", "ERP Posting")}` },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === tb.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{tb.label}</button>
        ))}
      </div>
      {tab === "approval" && <HeadApprovalTab ops={ops} finalApproveOp={finalApproveOp} rejectOp={rejectOp} setModal={setModal} setDetailId={setDetailId} bulkApprove={bulkApprove} />}
      {tab === "performance" && <HeadAccountants navigate={navigate} setModal={setModal} setDetailId={setDetailId} detailId={null} ops={ops} approveOp={() => { }} rejectOp={() => { }} finalApproveOp={() => { }} bulkApprove={() => { }} />}
      {tab === "erp" && <HeadERP navigate={navigate} setModal={setModal} setDetailId={setDetailId} detailId={null} ops={ops} approveOp={() => { }} rejectOp={() => { }} finalApproveOp={() => { }} bulkApprove={() => { }} markErpPosted={markErpPosted} />}
    </div>
  );
}
