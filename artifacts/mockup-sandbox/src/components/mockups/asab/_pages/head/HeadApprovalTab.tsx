import { useState } from "react";
import { CheckCircle2, ChevronUp, ChevronDown, XCircle } from "lucide-react";
import {
  useExportHeadOperations,
  usePendingOperations,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import {
  MATCH_CFG,
  STATUS_CFG,
  EN_STATUS_CFG,
} from "../../_shared/displayConfig";
import type { Op } from "../../_shared/types";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { isPkg6SalesReport, SALES_RETURN_HINT } from "../../salesActionGuards";

export function HeadApprovalTab({ ops, finalApproveOp, rejectOp, setModal, setDetailId, bulkApprove }: {
  ops: Op[]; finalApproveOp: (id: string) => void; rejectOp: (id: string, r: string) => void;
  setModal: (id: string | null) => void; setDetailId: (id: string | null) => void;
  bulkApprove: (ids: string[]) => void;
}) {
  const { t, lang } = useLang();
  const exportHeadOpsMut = useExportHeadOperations();
  const en = lang === "en";
  usePendingOperations();
  const awaitingHead = ops.filter(o => o.status === "approved");
  const [expanded, setExpanded] = useState<string | null>("g0");

  // B-H1: group by the real reviewing accountant (accountantName from /head/operations/pending).
  const groupMap = new Map<string, Op[]>();
  awaitingHead.forEach(op => {
    const acc = op.accountantName ?? t("غير محدد", "Unassigned");
    if (!groupMap.has(acc)) groupMap.set(acc, []);
    groupMap.get(acc)!.push(op);
  });
  const groups = Array.from(groupMap.entries()).map(([accountant, gops], i) => ({
    key: `g${i}`,
    accountant,
    module: [...new Set(gops.map(o => o.moduleLabel))].join(" · "),
    ops: gops,
  })).filter(g => g.ops.length > 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{t("العمليات مجمعة حسب المحاسب · اعتماد دفعة واحدة أو فردي", "Operations grouped by accountant · Bulk or individual approval")}</p>
        {awaitingHead.length > 0 && <Btn variant="success" onClick={() => bulkApprove(awaitingHead.map(o => o.id))}>✅ {t("اعتماد الكل", "Approve All")} ({awaitingHead.length})</Btn>}
      </div>
      {awaitingHead.length === 0 && <EmptyState icon="✅" title={t("تم اعتماد جميع العمليات", "All Operations Approved")} desc={t("لا توجد عمليات بانتظار اعتمادك النهائي", "No operations awaiting your final approval")} />}
      {groups.map(g => (
        <div key={g.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100" onClick={() => setExpanded(expanded === g.key ? null : g.key)}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{g.accountant[0]}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 text-sm">{g.accountant}</span>
                <Badge className="bg-blue-50 text-blue-700">{g.module}</Badge>
                {g.ops.some(o => o.match === "diff") && <Badge className="bg-red-50 text-red-700">⚠ {t("يوجد فروق", "Differences Found")}</Badge>}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{g.ops.length} {t("عمليات موافق عليها", "approved operations")}</p>
            </div>
            <span className="font-mono font-bold text-purple-700">{fmtAmt(g.ops.reduce((s, o) => s + (o.amount ?? 0), 0))} {t("ر.س", "SAR")}</span>
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="success" onClick={e => { e.stopPropagation(); bulkApprove(g.ops.map(o => o.id)); }}><CheckCircle2 size={13} /> {t("اعتماد الكل", "Approve All")}</Btn>
              {expanded === g.key ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </div>
          {expanded === g.key && (
            <div>
              {g.ops.map(op => (
                <div key={op.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <span className="font-mono text-xs text-purple-600 font-semibold w-24 flex-shrink-0">{op.id}</span>
                  <span className="text-sm text-gray-700 flex-1">{op.branch}</span>
                  <Badge className={`${MATCH_CFG[op.match].cls} border`}>{en ? (op.match === "exact" ? "Exact" : "Diff") : MATCH_CFG[op.match].label}</Badge>
                  <Badge className={STATUS_CFG[op.status].cls}>{en ? (EN_STATUS_CFG[op.status] || STATUS_CFG[op.status].label) : STATUS_CFG[op.status].label}</Badge>
                  <span className="font-mono font-semibold text-gray-800">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</span>
                  <div className="flex gap-1">
                    <button onClick={() => finalApproveOp(op.id)} className="p-1.5 rounded hover:bg-emerald-50"><CheckCircle2 size={13} className="text-emerald-600" /></button>
                    {isPkg6SalesReport(op) ? <span className="text-xs text-amber-700">{t(SALES_RETURN_HINT.ar, SALES_RETURN_HINT.en)}</span> : <button onClick={() => { setDetailId(op.id); setModal("reject"); }} className="p-1.5 rounded hover:bg-red-50"><XCircle size={13} className="text-red-500" /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
