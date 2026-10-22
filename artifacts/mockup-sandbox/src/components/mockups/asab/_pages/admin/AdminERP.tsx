import { useState } from "react";
import {
  useAdminErpSummary,
  useAdminErpBatches,
  useAdminErpExport,
  useRetryERPBatch,
  useDownloadERPBatch,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import { OP_MODULE_LABELS } from "../../_shared/displayConfig";
import { KpiCard } from "../../components/KpiCard";
import {
  ChevronsRight, Clock, CheckCircle2, Lock, AlertTriangle,
  RefreshCw, FileText, Download
} from "lucide-react";
import type { PageProps } from "../../_shared/types";

export function AdminERP({ }: PageProps) {
  const { t, dir } = useLang();
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "exported" | "failed">("all");
  const [moduleFilter, setModuleFilter] = useState("");

  const { data: summary } = useAdminErpSummary();
  const { data: batchPage } = useAdminErpBatches({
    status: statusFilter,
    moduleKey: moduleFilter || undefined,
  });
  const exportMut = useAdminErpExport();
  const retryMut = useRetryERPBatch();
  const downloadMut = useDownloadERPBatch();

  const batches = (batchPage?.data ?? []) as any[];
  const conn = summary?.connection;
  const kpis = summary?.kpis;

  const statusMeta = (s: string) => {
    const exported = s === "exported" || s === "success" || s === "completed";
    if (exported) return { cls: "bg-emerald-100 text-emerald-700", label: t("تم التصدير لـ ERP", "Exported"), mark: "✓" };
    if (s === "failed") return { cls: "bg-red-100 text-red-700", label: t("فشل التصدير", "Failed"), mark: "✕" };
    return { cls: "bg-amber-100 text-amber-700", label: t("جاهز للتصدير", "Ready"), mark: "●" };
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("التصدير لـ ERP — كل الشركات", "ERP Export — All Companies")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("متابعة دفعات التصدير عبر جميع الشركات", "Cross-company export batches")}</p>
        </div>
        <button onClick={() => exportMut.mutate({ allReady: true })} disabled={exportMut.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50">
          <ChevronsRight size={13} /> {t("تصدير كل الجاهز", "Export all ready")}
        </button>
      </div>

      {/* Connection status */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${conn?.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${conn?.ok ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
        <div className="flex-1">
          <p className={`text-sm font-bold ${conn?.ok ? "text-emerald-800" : "text-red-800"}`}>{conn?.label ?? (conn?.ok ? t("متصل ونشط", "Connected") : t("غير متصل", "Disconnected"))}</p>
          {conn?.lastExportAt && <p className="text-[11px] text-gray-500">{t("آخر تصدير", "Last export")}: {new Date(conn.lastExportAt).toLocaleString("ar-SA")} · {conn.lastExportCount ?? 0} {t("دفعة", "batches")}</p>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("جاهزة للتصدير", "Ready")} value={String(kpis?.ready ?? 0)} sub={t("بانتظار الترحيل", "awaiting export")} icon={<Clock size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("صُدِّرت اليوم", "Exported Today")} value={String(kpis?.exportedToday ?? 0)} sub={t("اليوم", "today")} icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("بانتظار رئيس الحسابات", "Awaiting Head")} value={String(kpis?.awaitingHead ?? 0)} sub={t("لم تُعتمد نهائياً", "not final-approved")} icon={<Lock size={18} className="text-blue-600" />} accent="blue" />
        <KpiCard label={t("فشل التصدير", "Failed")} value={String(kpis?.failed ?? 0)} sub={t("يحتاج إعادة", "needs retry")} icon={<AlertTriangle size={18} className="text-red-600" />} accent="red" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحالة", "Status")}</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="all">{t("الكل", "All")}</option>
              <option value="ready">{t("جاهز للتصدير", "Ready")}</option>
              <option value="exported">{t("تم التصدير", "Exported")}</option>
              <option value="failed">{t("فشل", "Failed")}</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الموديول", "Module")}</label>
            <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">{t("كل الموديولات", "All modules")}</option>
              {Object.entries(OP_MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Cross-company batch log */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">{t("سجل دفعات التصدير — كل الشركات", "Export batch log — all companies")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">{t("رقم الدفعة", "Batch")}</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">{t("الشركة", "Company")}</th>
                <th className="px-4 py-2.5 text-center font-semibold text-gray-600">{t("الموديول", "Module")}</th>
                <th className="px-4 py-2.5 text-center font-semibold text-gray-600">{t("العمليات", "Ops")}</th>
                <th className="px-4 py-2.5 text-center font-semibold text-gray-600">{t("المبلغ", "Amount")}</th>
                <th className="px-4 py-2.5 text-center font-semibold text-gray-600">{t("الحالة", "Status")}</th>
                <th className="px-4 py-2.5 text-center font-semibold text-gray-600">{t("إجراءات", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {batches.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">{t("لا توجد دفعات", "No batches")}</td></tr>}
              {batches.map((b, i) => {
                const bid = b.batchId ?? b.id;
                const sm = statusMeta(b.status);
                const exported = b.status === "exported" || b.status === "success" || b.status === "completed";
                const amtH = typeof b.totalAmount === "number" ? b.totalAmount : 0;
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-purple-600">{bid}</td>
                    <td className="px-4 py-3 text-gray-600">{b.companyId ?? "—"}</td>
                    <td className="px-4 py-3 text-center">{b.moduleKey ? (OP_MODULE_LABELS[b.moduleKey] ?? b.moduleKey) : "—"}</td>
                    <td className="px-4 py-3 text-center font-mono">{b.operationCount ?? b.operationsCount ?? 0}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-gray-800">{fmtAmt(Math.round(amtH / 100))}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sm.cls}`}>{sm.mark} {b.statusLabelAr ?? sm.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {b.status === "ready" && <button onClick={() => exportMut.mutate({ batchIds: [bid] })} disabled={exportMut.isPending} title={t("تصدير", "Export")} className="p-1 rounded bg-purple-50 text-purple-600 hover:bg-purple-100"><ChevronsRight size={12} /></button>}
                        {b.status === "failed" && <button onClick={() => retryMut.mutate(bid)} disabled={retryMut.isPending} title={t("إعادة المحاولة", "Retry")} className="p-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100"><RefreshCw size={12} /></button>}
                        {exported && <>
                          <button onClick={() => downloadMut.mutate({ batchId: bid, format: "xlsx" })} title={t("تنزيل Excel", "Excel")} className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><FileText size={12} /></button>
                          <button onClick={() => downloadMut.mutate({ batchId: bid, format: "json" })} title={t("تنزيل JSON", "JSON")} className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"><Download size={12} /></button>
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
