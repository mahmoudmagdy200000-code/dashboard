import { Dialog, DialogContent, DialogTitle } from "../../../../ui/dialog";
import { SupplierQueryState, SupplierPagination } from "./SupplierFeedback";
import { useState, useRef } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  useSupplierOrders,
  runSupplierMutation,
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
  const [page, setPage] = useState(1);
  const query = useSupplierOrders({ status: "pending", page, pageSize: 20 });
  const apiOrders = query.data;
  const { t, dir } = useLang();
  const mutationLock = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const acceptMut = useAcceptSupplierOrder();
  const rejectMut = useRejectSupplierOrder();
  const orders = (apiOrders?.data ?? []) as any[];
  // T13 §4 — reason is required (≤500). Collect it before submitting.
  const [rejectFor, setRejectFor] = useState<{ id: string; from: string } | null>(null);
  const [reason, setReason] = useState("");
  const busy = acceptMut.isPending || rejectMut.isPending;
  const accept = (id: string) => { void runSupplierMutation(mutationLock, () => acceptMut.mutateAsync({ id })).catch(() => {}); };
  const submitReject = () => {
    if (!rejectFor || !reason.trim()) return;
    void runSupplierMutation(mutationLock, async () => {
      await rejectMut.mutateAsync({ id: rejectFor.id, reason: reason.trim() });
      setRejectFor(null); setReason("");
    }).catch(() => {});
  };

  if (query.isPending || query.isError) return <SupplierQueryState query={query} />;

  return (
    <div className="space-y-5">
      <SupplierPagination meta={query.data?.meta} page={page} setPage={setPage} busy={query.isFetching} />
      <h2 className="text-xl font-bold text-gray-800">{t("الطلبات الجديدة", "New Orders")}</h2>
      {orders.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات جديدة", "No new orders")}</div>}
      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.id} title={`${order.from ?? "—"}${order.publicId ? ` · ${order.publicId}` : ""}`} actions={
            <div className="flex gap-2">
              <Btn size="sm" variant="success" disabled={busy} onClick={() => accept(order.id)}><CheckCircle2 size={12} /> {t("قبول الطلب", "Accept Order")}</Btn>
              <Btn size="sm" variant="danger" disabled={busy} onClick={() => { returnFocus.current = document.activeElement as HTMLElement; setRejectFor({ id: order.id, from: order.from ?? "—" }); setReason(""); }}><XCircle size={12} /> {t("رفض", "Reject")}</Btn>
            </div>
          }>
            <div className="p-4">
              <p className="text-sm text-gray-700">{order.itemsText ?? t("تفاصيل غير متوفرة", "Details unavailable")}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">{t("موعد التسليم:", "Delivery:")} <strong className="text-gray-800">{order.deliveryDate ? String(order.deliveryDate).slice(0, 10) : "—"}</strong>{order.orderDate && <span className="text-xs text-gray-400"> · {t("بتاريخ", "ordered")} {String(order.orderDate).slice(0, 10)}</span>}</span>
                <span className="font-mono font-bold text-lg text-purple-700">{fmtAmt(Number.isSafeInteger(order.total) ? order.total / 100 : null)} {t("ر.س", "SAR")}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!rejectFor} onOpenChange={open => { if (!open && !mutationLock.current) setRejectFor(null); }}>
        <DialogContent dir={dir} aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto"
          onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}>
          <DialogTitle>{t("رفض طلب", "Reject Order")} — {rejectFor?.from}</DialogTitle>
          <label htmlFor="supplier-reject-reason">{t("سبب الرفض (إلزامي)", "Rejection reason (required)")}</label>
          <textarea id="supplier-reject-reason" required value={reason} maxLength={500} disabled={busy}
            onChange={e => setReason(e.target.value)} className="w-full border rounded-lg p-3 min-h-24" />
          {rejectMut.isError && <p role="alert">{t("فشل الرفض. النص محفوظ؛ راجع الحالة قبل إعادة المحاولة.", "Rejection failed. Your reason is retained; check the order before retrying.")}</p>}
          <div className="flex flex-wrap gap-3"><Btn disabled={busy} onClick={() => setRejectFor(null)}>{t("إلغاء", "Cancel")}</Btn>
            <Btn variant="danger" disabled={busy || !reason.trim()} onClick={submitReject}>{t("تأكيد الرفض", "Confirm rejection")}</Btn></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
