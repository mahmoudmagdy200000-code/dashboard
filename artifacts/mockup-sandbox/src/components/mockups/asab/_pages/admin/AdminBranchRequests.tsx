import { useState } from "react";
import {
  useAdminBranchRequests,
  useApproveBranchRequest,
  useRejectBranchRequest,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { Building2, CheckCircle2, XCircle } from "lucide-react";
import type { PageProps } from "../../_shared/types";

export function AdminBranchRequests({ }: PageProps) {
  const { t } = useLang();
  const [tab, setTab] = useState<"pending_review" | "approved" | "rejected" | "all">("pending_review");
  const { data: apiRows } = useAdminBranchRequests({ status: tab });
  const approveMut = useApproveBranchRequest();
  const rejectMut = useRejectBranchRequest();
  const rows = (Array.isArray(apiRows) ? apiRows : []) as any[];
  const [rejectFor, setRejectFor] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState("");
  const submitReject = () => { if (!rejectFor || !reason.trim()) return; rejectMut.mutate({ id: rejectFor.id, reason: reason.trim() }, { onSuccess: () => { setRejectFor(null); setReason(""); } }); };
  const TABS = [["pending_review", "قيد المراجعة", "Pending"], ["approved", "معتمد", "Approved"], ["rejected", "مرفوض", "Rejected"], ["all", "الكل", "All"]] as const;
  const statusChip = (rs?: string) => rs === "approved" ? "bg-emerald-50 text-emerald-700" : rs === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  const statusLabel = (rs?: string) => rs === "approved" ? t("معتمد", "Approved") : rs === "rejected" ? t("مرفوض", "Rejected") : t("قيد المراجعة", "Pending review");
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">{t("طلبات الفروع", "Branch Requests")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("مراجعة واعتماد الفروع التي أنشأها مديرو الشركات", "Review and approve branches created by company admins")}</p></div>
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(([k, ar, en]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === k ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>{t(ar, en)}</button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {rows.length === 0 && <div className="px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات", "No requests")}</div>}
        {rows.map((r, i) => (
          <div key={r.id ?? i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0"><Building2 size={16} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-sm text-gray-800 truncate">{r.name}</span><Badge className={statusChip(r.reviewStatus)}>{statusLabel(r.reviewStatus)}</Badge></div>
              <p className="text-[11px] text-gray-400 mt-0.5">{[r.companyName, r.brandName, r.restaurantName, r.city].filter(Boolean).join(" · ") || "—"}</p>
              {r.reviewStatus === "rejected" && r.reviewNote && <p className="text-[11px] text-red-600 mt-0.5">{t("سبب الرفض:", "Reason:")} {r.reviewNote}</p>}
            </div>
            {r.reviewStatus === "pending_review" && (
              <div className="flex gap-1.5 flex-shrink-0">
                <Btn size="sm" variant="success" disabled={approveMut.isPending} onClick={() => approveMut.mutate(r.id)}><CheckCircle2 size={12} /> {t("اعتماد", "Approve")}</Btn>
                <Btn size="sm" variant="danger" onClick={() => { setRejectFor({ id: r.id, name: r.name }); setReason(""); }}><XCircle size={12} /> {t("رفض", "Reject")}</Btn>
              </div>
            )}
          </div>
        ))}
      </div>
      {rejectFor && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setRejectFor(null)} dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-gray-800">{t("رفض الفرع", "Reject Branch")} — {rejectFor.name}</h3><button onClick={() => setRejectFor(null)} className="text-gray-400"><XCircle size={18} /></button></div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("سبب الرفض (إلزامي)", "Rejection reason (required)")}</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300 h-24 resize-none" />
            <div className="flex gap-2 justify-end pt-3"><Btn size="sm" onClick={() => setRejectFor(null)}>{t("إلغاء", "Cancel")}</Btn><Btn size="sm" variant="danger" onClick={submitReject} disabled={!reason.trim() || rejectMut.isPending}><XCircle size={12} /> {t("تأكيد الرفض", "Confirm Reject")}</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}
