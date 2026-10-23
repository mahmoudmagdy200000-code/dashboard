import { CheckCircle2, ChevronsRight, Lock } from "lucide-react";
import {
  useFinalApprovedOperations,
  useExportHeadOperations,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";

export function HeadApproved({ ops }: PageProps) {
  useFinalApprovedOperations();
  const { t, dir } = useLang();
  const exportHeadOpsMut = useExportHeadOperations();
  const approved = ops.filter(o => o.status === "final-approved");
  const erpPostedCount = approved.filter(o => o.erpPosted).length;
  const pendingErp = approved.filter(o => !o.erpPosted).length;
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("المعتمدة نهائياً", "Final Approved")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{approved.length} {t("سجل", "records")} · {erpPostedCount} {t("مُرحَّل لـ ERP", "Posted to ERP")} · {pendingErp} {t("في الانتظار", "pending")}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0" />
          <div><p className="font-extrabold text-emerald-700 text-2xl font-mono">{approved.length}</p><p className="text-emerald-600 text-xs">{t("معتمد نهائياً", "Final Approved")}</p></div>
        </div>
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${erpPostedCount > 0 ? "bg-indigo-50 border-indigo-200" : "bg-amber-50 border-amber-200"}`}>
          <ChevronsRight size={24} className={erpPostedCount > 0 ? "text-indigo-600 flex-shrink-0" : "text-amber-500 flex-shrink-0"} />
          <div>
            <p className={`font-extrabold text-2xl font-mono ${erpPostedCount > 0 ? "text-indigo-700" : "text-amber-600"}`}>{erpPostedCount}</p>
            <p className={`text-xs ${erpPostedCount > 0 ? "text-indigo-600" : "text-amber-500"}`}>{t("مُرحَّل لـ ERP", "Posted to ERP")} {pendingErp > 0 ? `· ${pendingErp} ${t("انتظار", "pending")}` : `· ${t("اكتمل", "done")}`}</p>
          </div>
        </div>
      </div>
      <Card title={`${approved.length} ${t("عملية معتمدة نهائياً", "final approved operations")}`}>
        {approved.length === 0
          ? <EmptyState icon="📋" title={t("لا توجد عمليات معتمدة", "No Approved Operations")} desc={t("بعد اعتماد العمليات تظهر هنا", "Approved operations will appear here")} />
          : approved.map(op => (
            <div key={op.id} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${op.erpPosted ? "bg-indigo-50/30" : ""}`}>
              <Badge className="bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold">{op.moduleLabel}</Badge>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">{op.branch}</span>
                  <span className="text-xs font-mono text-gray-400">{op.id}</span>
                  {op.isCorrection && <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs">{t("تعديل على", "Correction on")} {op.correctiveRef}</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs"><Lock size={9} /> {t("معتمد نهائياً", "Final Approved")}</Badge>
                  {op.erpPosted
                    ? <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs"><ChevronsRight size={9} /> {t("مُرحَّل لـ ERP", "Posted to ERP")} · {op.erpBatchId || "—"}</Badge>
                    : <Badge className="bg-amber-50 text-amber-600 border border-amber-200 text-xs">⏳ {t("في انتظار الترحيل لـ ERP", "Awaiting ERP Posting")}</Badge>
                  }
                </div>
              </div>
              <span className="font-mono font-extrabold text-gray-800 tabular-nums">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</span>
            </div>
          ))
        }
      </Card>
    </div>
  );
}
