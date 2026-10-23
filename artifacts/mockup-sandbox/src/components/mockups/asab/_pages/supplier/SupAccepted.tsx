import { SupplierQueryState, SupplierPagination } from "./SupplierFeedback";
import { useState, useRef } from "react";
import { CheckCircle2, FileText, Truck } from "lucide-react";
import {
  useSupplierOrders,
  runSupplierMutation,
  useExportSupplierOrders,
  useMarkSupplierOrderDelivered,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Btn } from "../../components/Btn";

// T13 §2/§5 — GET orders?status=accepted + mark-delivered (accepted → delivered).
export function SupAccepted({ }: PageProps) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"accepted" | "delivered">("accepted");
  const query = useSupplierOrders({ status, page, pageSize: 20 });
  const apiAccepted = query.data;
  const { t } = useLang();
  const mutationLock = useRef(false);
  const exportSupOrdersMut = useExportSupplierOrders();
  const deliverMut = useMarkSupplierOrderDelivered();
  const orders = (apiAccepted?.data ?? []) as any[];
  const totalRunning = orders.every(o => Number.isSafeInteger(o.total)) ? orders.reduce((s, o) => s + o.total, 0) : null; // halalas
  const statusChip = (k?: string) => k === "delivered" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";

  if (query.isPending || query.isError) return <SupplierQueryState query={query} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3"><label htmlFor="supplier-history-status">{t("حالة الطلب", "Order status")}</label><select id="supplier-history-status" value={status} onChange={e => { setStatus(e.target.value as "accepted" | "delivered"); setPage(1); }}><option value="accepted">{t("مقبولة", "Accepted")}</option><option value="delivered">{t("إقرارات التسليم", "Supplier delivery declarations")}</option></select></div>
      <p className="text-sm text-gray-500">{t("إقرار المورد بالتسليم ليس تأكيد استلام الفرع أو تسوية مالية.", "A supplier delivery declaration is not branch receipt or financial settlement.")}</p>
      <SupplierPagination meta={query.data?.meta} page={page} setPage={setPage} busy={query.isFetching} />
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{status === "accepted" ? t("الطلبات المقبولة", "Accepted Orders") : t("سجل إقرارات التسليم", "Delivery declaration history")}</h2><p className="text-gray-400 text-sm mt-0.5">{orders.length} {t("طلب", "orders")} · {t("إجمالي الصفحة:", "Page total:")} {fmtAmt(totalRunning !== null && Number.isSafeInteger(totalRunning) ? totalRunning / 100 : null)} {t("ر.س", "SAR")}</p></div>
        <button onClick={() => exportSupOrdersMut.mutate({ status, format: "xlsx" })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11} /> Excel</button>
      </div>
      {orders.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات في هذه الصفحة", "No orders on this page")}</div>}
      {orders.length > 0 && (
        <Card title={t("سجل الطلبات المقبولة", "Accepted Orders Log")}>
          {orders.map((o, i) => (
            <div key={o.id ?? i} className="px-5 py-4 flex flex-wrap items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"><CheckCircle2 size={16} className="text-emerald-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-800 truncate">{o.from ?? "—"}</span>{o.publicId && <span className="font-mono text-xs text-gray-400">{o.publicId}</span>}</div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{o.itemsText ?? "—"}</p>
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-[10px] text-gray-400">{t("التسليم", "Delivery")}</p>
                <p className="text-xs font-semibold text-gray-700">{o.deliveryDate ? String(o.deliveryDate).slice(0, 10) : "—"}</p>
              </div>
              <Badge className={`${statusChip(o.statusKey)} flex-shrink-0`}>{o.statusLabel ?? o.statusKey ?? o.status}</Badge>
              <span className="font-mono font-bold text-gray-800 flex-shrink-0">{fmtAmt(Number.isSafeInteger(o.total) ? o.total / 100 : null)} {t("ر.س", "SAR")}</span>
              {o.statusKey !== "delivered" && (
                <Btn size="sm" variant="success" disabled={deliverMut.isPending} onClick={() => { void runSupplierMutation(mutationLock, () => deliverMut.mutateAsync({ id: o.id })).catch(() => {}); }}><Truck size={12} /> {t("إقرار المورد بالتسليم", "Declare delivery")}</Btn>
              )}
            </div>
          ))}
          <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600">{t("إجمالي الصفحة", "Page total")}</span>
            <span className="font-mono font-black text-purple-700 text-lg">{fmtAmt(totalRunning !== null && Number.isSafeInteger(totalRunning) ? totalRunning / 100 : null)} {t("ر.س", "SAR")}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
