import { useEffect, useState } from "react";
import { Eye, Download } from "lucide-react";
import {
  useAccountantReportBranches,
  useDownloadReport,
  usePreviewReport,
  useReports,
} from "../../../../../api/queries/reports";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../../../ui/dialog";
import { useLang } from "../../_shared/LangContext";
import { formatMonthLong } from "../../_shared/formatters";
import { Btn } from "../../components/Btn";
import type { PageProps } from "../../_shared/types";

export function ReportsPage({ }: PageProps) {
  const { t, lang, dir } = useLang();
  const catalog = useReports();
  const branches = useAccountantReportBranches();
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
  const scope = {
    branchIds: branches.data ?? [],
    from: `${month}-01`,
    to: `${month}-${lastDay} 23:59:59`,
  };
  const loading = catalog.isPending || branches.isPending;
  const loadFailed = catalog.isError || branches.isError;
  const working = previewReport.isPending || downloadReport.isPending;

  return (
    <div className="space-y-5" dir={dir}>
      <h2 className="text-xl font-bold text-gray-800">{t("التقارير", "Reports")}</h2>
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
                  {canPreview && (
                    <Btn size="sm" disabled={working} onClick={() => {
                      downloadReport.reset();
                      previewReport.mutate({ key: report.key, scope }, {
                        onSuccess: (pdf) => setPreview({ title, url: URL.createObjectURL(pdf) }),
                      });
                    }}><Eye size={11} /> {t("عرض", "View")}</Btn>
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
