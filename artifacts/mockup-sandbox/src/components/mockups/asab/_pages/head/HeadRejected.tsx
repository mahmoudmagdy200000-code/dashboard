import {
  useRejectedOperations,
  useExportHeadOperations,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";

export function HeadRejected({ ops }: PageProps) {
  useRejectedOperations();
  const { t, dir } = useLang();
  const exportHeadOpsMut = useExportHeadOperations();
  const rejected = ops.filter(o => o.status === "rejected");
  return (
    <div className="space-y-5" dir={dir}>
      <h2 className="text-xl font-bold text-gray-800">{t("المرفوضة", "Rejected")}</h2>
      <Card title={`${rejected.length} ${t("عملية مرفوضة", "rejected operations")}`}>
        {rejected.length === 0
          ? <EmptyState icon="📋" title={t("لا توجد عمليات مرفوضة", "No Rejected Operations")} desc="" />
          : rejected.map(op => (
            <div key={op.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 border-r-4 border-r-red-400">
              <Badge className="bg-purple-50 text-purple-700">{op.moduleLabel}</Badge>
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-800">{op.branch}</span><span className="text-xs font-mono text-gray-400">{op.id}</span></div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-red-50 text-red-700">✕ {t("مرفوض", "Rejected")}</Badge>
                  {op.rejectReason && <span className="text-xs text-red-500">{op.rejectReason}</span>}
                </div>
              </div>
              <span className="font-mono font-bold text-gray-800">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</span>
            </div>
          ))
        }
      </Card>
    </div>
  );
}
