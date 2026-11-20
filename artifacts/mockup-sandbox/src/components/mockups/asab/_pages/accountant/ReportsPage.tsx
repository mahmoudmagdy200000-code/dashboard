import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Download, RotateCcw } from "lucide-react";
import { api } from "../../../../../api/client";
import {
  useAccountantReportBranches,
  useDownloadReport,
  usePreviewReport,
  useReports,
} from "../../../../../api/queries/reports";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../../../ui/dialog";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { useLang } from "../../_shared/LangContext";
import { STATUS_CFG, EN_STATUS_CFG } from "../../_shared/displayConfig";
import { displayDigits } from "../../_shared/displayDigits";
import { fmtAmt, formatMonthLong, opDetailPage } from "../../_shared/formatters";
import { Btn } from "../../components/Btn";
import type { Op, OpStatus, PageId, PageProps } from "../../_shared/types";

type RecordModuleFilter = "sales" | "expenses" | "purchases" | "inventory" | "shifts" | "all";

const REPORT_TO_MODULE: Record<string, RecordModuleFilter> = {
  "sales-channel": "sales",
  "pl": "all",
  "smart-compare": "all",
  "profit-cash": "sales",
  "breakeven": "all",
  "op-profit": "all",
  "menu-eng": "sales",
};

function opDateKey(op: Op): string {
  const raw = op.operationDate ?? "";
  return typeof raw === "string" && raw.length >= 10 ? raw.slice(0, 10) : "";
}

export function ReportsPage({ ops, navigate, setDetailId }: PageProps) {
  const { t, lang, dir } = useLang();
  const catalog = useReports();
  const branches = useAccountantReportBranches();
  const branchLookups = useQuery({
    queryKey: ["reports", "branch-lookups"],
    queryFn: async () => {
      const { data } = await api.get<{ data: { id: string | number; name: string }[] }>("/company/me/lookups/branches");
      return (data.data ?? []).map(b => ({ id: String(b.id), name: b.name }));
    },
    staleTime: 60_000,
  });
  const previewReport = usePreviewReport();
  const downloadReport = useDownloadReport();
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  const previewUrl = preview?.url;

  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const date = new Date();
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const defaultFrom = `${month}-01`;
  const defaultTo = `${month}-${String(lastDay).padStart(2, "0")}`;

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [recordModule, setRecordModule] = useState<RecordModuleFilter>("sales");
  const [selectedReportTitle, setSelectedReportTitle] = useState<string>("");

  const branchOptions = branchLookups.data?.length
    ? branchLookups.data
    : Array.from(new Map(ops.filter(o => o.branch).map(o => [o.branchId || o.branch, { id: o.branchId || o.branch, name: o.branch }])).values());

  const scope = {
    branchIds: selectedBranchId ? [selectedBranchId] : (branches.data ?? []),
    from: fromDate || defaultFrom,
    to: `${toDate || defaultTo} 23:59:59`,
  };
  const loading = catalog.isPending || branches.isPending;
  const loadFailed = catalog.isError || branches.isError;
  const working = previewReport.isPending || downloadReport.isPending;

  const filteredRecords = ops.filter(op => {
    if (recordModule !== "all" && op.moduleKey !== recordModule) return false;
    if (selectedBranchId && op.branchId !== selectedBranchId && op.branch !== selectedBranchId) return false;
    if (statusFilter && op.status !== statusFilter) return false;
    const dk = opDateKey(op);
    if (fromDate && dk && dk < fromDate) return false;
    if (toDate && dk && dk > toDate) return false;
    return true;
  });

  const totalAmountSar = filteredRecords.reduce((sum, op) => sum + (op.amount ?? 0), 0);

  function exportFilteredCsv() {
    const header = [t("المرجع", "Reference"), t("الفرع", "Branch"), t("التاريخ", "Date"), t("المبلغ (ر.س)", "Amount (SAR)"), t("الحالة", "Status")];
    const rows = filteredRecords.map(op => [
      op.id,
      op.branch,
      opDateKey(op) || "—",
      (op.amount ?? 0).toFixed(2),
      lang === "ar" ? (STATUS_CFG[op.status]?.label ?? op.status) : (EN_STATUS_CFG[op.status] ?? op.status),
    ]);
    const csv = "\uFEFF" + [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assab-report-${recordModule}-${fromDate || "all"}-to-${toDate || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5" dir={dir}>
      <h2 className="text-xl font-bold text-gray-800">{t("التقارير", "Reports")}</h2>

      {/* Scope Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="min-w-0">
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفرع", "Branch")}</label>
            <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700">
              <option value="">{t("كل الفروع المخصصة", "All assigned branches")}</option>
              {branchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("من تاريخ", "From date")}</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700" />
          </div>
          <div className="min-w-0">
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("إلى تاريخ", "To date")}</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700" />
          </div>
          <div className="min-w-0">
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحالة", "Status")}</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700">
              <option value="">{t("كل الحالات", "All statuses")}</option>
              {(["pending", "approved", "rejected", "final-approved"] as OpStatus[]).map(s => (
                <option key={s} value={s}>{lang === "ar" ? (STATUS_CFG[s]?.label || s) : (EN_STATUS_CFG[s] || s)}</option>
              ))}
            </select>
          </div>
        </div>
        {(selectedBranchId || statusFilter || fromDate !== defaultFrom || toDate !== defaultTo) && (
          <button type="button" onClick={() => { setSelectedBranchId(""); setStatusFilter(""); setFromDate(defaultFrom); setToDate(defaultTo); }}
            className="mt-2.5 text-xs text-purple-600 hover:underline inline-flex items-center gap-1">
            <RotateCcw size={11} /> {t("إعادة ضبط الفلاتر", "Reset filters")}
          </button>
        )}
      </div>

      {loading ? (
        <p role="status">{t("جارٍ تحميل التقارير…", "Loading reports…")}</p>
      ) : loadFailed ? (
        <div role="alert" className="flex items-center gap-3">
          <p>{t("تعذر تحميل قائمة التقارير أو الفروع.", "Could not load the reports or branches.")}</p>
          <Btn size="sm" onClick={() => {
            if (catalog.isError) void catalog.refetch();
            if (branches.isError) void branches.refetch();
          }}>{t("إعادة المحاولة", "Retry")}</Btn>
        </div>
      ) : !catalog.data?.length || scope.branchIds.length === 0 ? (
        <p>{t("لا توجد تقارير متاحة للفروع المخصصة لك.", "No reports are available for your assigned branches.")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {catalog.data.map((report) => {
            const title = t(report.title, report.titleEn);
            const canPreview = report.availableFormats.includes("pdf");
            const format = canPreview ? "pdf" : report.availableFormats[0];
            return (
              <article key={report.key} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 text-start shadow-sm">
                <div aria-hidden="true" className="mb-3 text-3xl">📊</div>
                <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                <p className="mt-1 text-xs text-gray-500">{formatMonthLong(lang, date)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Btn size="sm" onClick={() => {
                    setRecordModule(REPORT_TO_MODULE[report.key] ?? "all");
                    setSelectedReportTitle(title);
                  }}><Eye size={11} /> {t("عرض السجلات", "View records")}</Btn>
                  {canPreview && (
                    <Btn size="sm" disabled={working} onClick={() => {
                      downloadReport.reset();
                      previewReport.mutate({ key: report.key, scope }, {
                        onSuccess: (pdf) => setPreview({ title, url: URL.createObjectURL(pdf) }),
                      });
                    }}><Eye size={11} /> {t("معاينة PDF", "Preview PDF")}</Btn>
                  )}
                  {format && (
                    <Btn size="sm" disabled={working} onClick={() => {
                      previewReport.reset();
                      downloadReport.mutate({ key: report.key, format, scope });
                    }}><Download size={11} /> {t("تحميل", "Download")}</Btn>
                  )}
                </div>
                {previewReport.isError && previewReport.variables?.key === report.key && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {t("تعذر عرض التقرير. أعد المحاولة.", "Could not preview the report. Try again.")}
                  </p>
                )}
                {downloadReport.isError && downloadReport.variables?.key === report.key && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {t("تعذر تحميل التقرير. أعد المحاولة.", "Could not download the report. Try again.")}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Underlying Records Breakdown (matches KEY_248s_08_finance_reports.jpg) */}
      <Card
        title={selectedReportTitle ? `${t("سجلات:", "Records:")} ${selectedReportTitle}` : t("سجلات التقرير المحدد", "Selected Report Records")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select value={recordModule} onChange={e => { setRecordModule(e.target.value as RecordModuleFilter); setSelectedReportTitle(""); }}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700">
              <option value="sales">{t("المبيعات", "Sales")}</option>
              <option value="expenses">{t("المصروفات", "Expenses")}</option>
              <option value="purchases">{t("المشتريات", "Purchases")}</option>
              <option value="inventory">{t("المخزون", "Inventory")}</option>
              <option value="shifts">{t("إدارة الشفتات", "Shifts")}</option>
              <option value="all">{t("كل الموديولات", "All modules")}</option>
            </select>
            <button type="button" onClick={exportFilteredCsv} data-testid="reports-export-csv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100">
              <Download size={12} /> {t("تنزيل CSV", "Download CSV")}
            </button>
          </div>
        }
      >
        <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
          <span>{displayDigits(filteredRecords.length, lang)} {t("عملية", "records")}</span>
          <span>
            {t("المجموع:", "Total:")}{" "}
            <strong className="font-mono text-purple-800">{fmtAmt(totalAmountSar, lang)} {t("ر.س", "SAR")}</strong>
          </span>
        </div>
        {filteredRecords.length === 0 ? (
          <EmptyState icon="📊" title={t("لا توجد سجلات", "No Records")} desc={t("لا توجد سجلات تطابق الفلاتر المحددة", "No records match the selected filters")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-start">{t("المرجع", "Reference")}</th>
                  <th className="px-4 py-2.5 text-start">{t("الفرع", "Branch")}</th>
                  <th className="px-4 py-2.5 text-center">{t("التاريخ", "Date")}</th>
                  <th className="px-4 py-2.5 text-center">{t("المبلغ", "Amount")}</th>
                  <th className="px-4 py-2.5 text-center">{t("الحالة", "Status")}</th>
                  <th className="px-4 py-2.5 text-center">{t("فتح", "Open")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map(op => (
                  <tr key={op.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-800">{op.id}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{op.branch}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-xs text-gray-500">{opDateKey(op) || "—"}</td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-purple-800">
                      {fmtAmt(op.amount ?? 0, lang)} {t("ر.س", "SAR")}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge className={STATUS_CFG[op.status]?.cls ?? "bg-gray-100 text-gray-700"}>
                        {lang === "ar" ? (STATUS_CFG[op.status]?.label ?? op.status) : (EN_STATUS_CFG[op.status] ?? op.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button type="button" onClick={() => {
                        setDetailId(op.moduleKey === "shifts" ? (op.sourceId ?? op.id) : op.id);
                        navigate(opDetailPage(op.moduleKey) as PageId);
                      }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100">
                        <Eye size={11} /> {t("عرض", "View")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {working && <p role="status">{t("جارٍ تجهيز التقرير…", "Preparing the report…")}</p>}
      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        {preview && (
          <DialogContent dir={dir} className="max-w-5xl">
            <DialogTitle>{preview.title}</DialogTitle>
            <DialogDescription>{t("معاينة التقرير", "Report preview")}</DialogDescription>
            <iframe src={preview.url} title={preview.title} className="h-[65vh] w-full rounded border" />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
