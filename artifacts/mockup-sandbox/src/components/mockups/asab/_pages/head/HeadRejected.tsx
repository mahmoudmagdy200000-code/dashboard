import {
  useRejectedOperations,
  useExportHeadOperations,
} from "../../../../../api/queries";
import { FileText } from "lucide-react";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { ModuleStatusCounts } from "./ModuleStatusCounts";

export function HeadRejected({ ops }: PageProps) {
  useRejectedOperations();
  const { t, dir } = useLang();
  const exportHeadOpsMut = useExportHeadOperations();
  const rejected = ops.filter(o => o.status === "rejected");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("المرفوضة", "Rejected")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{rejected.length} {t("عملية مرفوضة", "rejected operations")}</p>
        </div>
        <button onClick={() => exportHeadOpsMut.mutate({ status: "rejected", format: "xlsx" })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
          <FileText size={12} /> Excel
        </button>
      </div>
      <ModuleStatusCounts ops={rejected} tone="red" />
      <Card title={`${rejected.length} ${t("عملية مرفوضة", "rejected operations")}`}>
        {rejected.length === 0
          ? <EmptyState icon="📋" title={t("لا توجد عمليات مرفوضة", "No Rejected Operations")} desc="" />
          : rejected.map(op => (
            <div key={op.id} className="px-5 py-4 flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 border-r-4 border-r-red-400">
              <Badge className="bg-purple-50 text-purple-700">{op.moduleLabel}</Badge>
              <div className="flex-1 min-w-0 w-full xl:w-auto">
                <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-sm text-gray-800 break-words">{op.branch}</span><span className="text-xs font-mono text-gray-400 break-all">{op.id}</span></div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-red-50 text-red-700">✕ {t("مرفوض", "Rejected")}</Badge>
                  {op.rejectReason && <span className="text-xs text-red-500">{op.rejectReason}</span>}
                </div>
              </div>
              <span className="font-mono font-bold text-gray-800 tabular-nums self-start xl:self-auto">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</span>
            </div>
          ))
        }
      </Card>
    </div>
  );
}
