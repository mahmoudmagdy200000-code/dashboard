import { Download, FileText } from "lucide-react";
import { useProcurementReports, useDownloadProcurementReport } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import type { PageProps } from "../../_shared/types";
import { Btn } from "../../components/Btn";

// Procurement reports — catalog + download (backend deferred the content by product decision).
export function ProcReports({ }: PageProps) {
  const { t } = useLang();
  const { data: apiReports } = useProcurementReports();
  const dlMut = useDownloadProcurementReport();
  const reports = ((apiReports as any[]) ?? []) as any[];
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">{t("التقارير", "Reports")}</h2>
      {reports.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد تقارير متاحة حالياً", "No reports available yet")}</div>}
      <div className="grid grid-cols-3 gap-4">
        {reports.map((r: any, i: number) => {
          const key = r.key ?? r.reportKey ?? r.id; const label = r.labelAr ?? r.label ?? r.name ?? key; return (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-3xl mb-3">📊</div>
              <p className="font-semibold text-gray-800 text-sm">{label}</p>
              {r.description && <p className="text-xs text-gray-400 mt-1">{r.description}</p>}
              <div className="flex items-center gap-2 mt-3">
                <Btn size="sm" disabled={dlMut.isPending || !key} onClick={() => dlMut.mutate({ key, format: "pdf" })}><Download size={11} /> PDF</Btn>
                <Btn size="sm" disabled={dlMut.isPending || !key} onClick={() => dlMut.mutate({ key, format: "xlsx" })}><FileText size={11} /> Excel</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
