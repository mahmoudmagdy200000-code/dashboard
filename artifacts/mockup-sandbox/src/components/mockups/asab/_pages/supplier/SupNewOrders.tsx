import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  useSupplierOrders,
  useAcceptSupplierOrder,
  useRejectSupplierOrder,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";

// T13 §2-4 — GET /asab/supplier/orders?status=pending + accept/reject.
// The hook already unwraps the page to an array. Order rows carry itemsText
// (a summary string) + total (halalas) — there is no per-line item array.
export function SupNewOrders({ }: PageProps) {
  const { data: apiOrders } = useSupplierOrders({ status: "pending" });
  const { t } = useLang();
  const acceptMut = useAcceptSupplierOrder();
  const rejectMut = useRejectSupplierOrder();
  const orders = (Array.isArray(apiOrders) ? apiOrders : []) as any[];
  // T13 §4 — reason is required (≤500). Collect it before submitting.
  const [rejectFor, setRejectFor] = useState<{ id: string; from: string } | null>(null);
  const [reason, setReason] = useState("");
  const accept = (id: string) => acceptMut.mutate({ id });
  const submitReject = () => {
    if (!rejectFor || !reason.trim()) return;
    rejectMut.mutate({ id: rejectFor.id, reason: reason.trim() }, { onSuccess: () => { setRejectFor(null); setReason(""); } });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">{t("الطلبات الجديدة", "New Orders")}</h2>
      {orders.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات جديدة", "No new orders")}</div>}
      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.id} title={`${order.from ?? "—"}${order.publicId ? ` · ${order.publicId}` : ""}`} actions={
            <div className="flex gap-2">
              <Btn size="sm" variant="success" disabled={acceptMut.isPending} onClick={() => accept(order.id)}><CheckCircle2 size={12} /> {t("قبول الطلب", "Accept Order")}</Btn>
              <Btn size="sm" variant="danger" onClick={() => { setRejectFor({ id: order.id, from: order.from ?? "—" }); setReason(""); }}><XCircle size={12} /> {t("رفض", "Reject")}</Btn>
            </div>
          }>
            <div className="p-4">
              <p className="text-sm text-gray-700">{order.itemsText ?? t("تفاصيل غير متوفرة", "Details unavailable")}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">{t("موعد التسليم:", "Delivery:")} <strong className="text-gray-800">{order.deliveryDate ? String(order.deliveryDate).slice(0, 10) : "—"}</strong>{order.orderDate && <span className="text-xs text-gray-400"> · {t("بتاريخ", "ordered")} {String(order.orderDate).slice(0, 10)}</span>}</span>
                <span className="font-mono font-bold text-lg text-purple-700">{fmtAmt((order.total ?? 0) / 100)} {t("ر.س", "SAR")}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {rejectFor && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setRejectFor(null)} dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-gray-800">{t("رفض طلب", "Reject Order")} — {rejectFor.from}</h3><button onClick={() => setRejectFor(null)} className="text-gray-400"><XCircle size={18} /></button></div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("سبب الرفض (إلزامي)", "Rejection reason (required)")}</label>
            <textarea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} placeholder={t("مثال: السعر مرتفع...", "e.g. price too high...")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300 h-24 resize-none" />
            <div className="flex gap-2 justify-end pt-3"><Btn size="sm" onClick={() => setRejectFor(null)}>{t("إلغاء", "Cancel")}</Btn><Btn size="sm" variant="danger" onClick={submitReject} disabled={!reason.trim() || rejectMut.isPending}><XCircle size={12} /> {t("تأكيد الرفض", "Confirm Reject")}</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}
