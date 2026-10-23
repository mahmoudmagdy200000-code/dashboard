import { CheckCircle2, FileText, Truck } from "lucide-react";
import {
  useSupplierOrders,
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
  const { data: apiAccepted } = useSupplierOrders({ status: "accepted" });
  const { t } = useLang();
  const exportSupOrdersMut = useExportSupplierOrders();
  const deliverMut = useMarkSupplierOrderDelivered();
  const orders = (Array.isArray(apiAccepted) ? apiAccepted : []) as any[];
  const totalRunning = orders.reduce((s, o) => s + (o.total ?? 0), 0); // halalas
  const statusChip = (k?: string) => k === "delivered" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الطلبات المقبولة", "Accepted Orders")}</h2><p className="text-gray-400 text-sm mt-0.5">{orders.length} {t("طلب", "orders")} · {t("إجمالي:", "Total:")} {fmtAmt(totalRunning / 100)} {t("ر.س", "SAR")}</p></div>
        <button onClick={() => exportSupOrdersMut.mutate({ status: "accepted", format: "xlsx" })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11} /> Excel</button>
      </div>
      {orders.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات مقبولة", "No accepted orders")}</div>}
      {orders.length > 0 && (
        <Card title={t("سجل الطلبات المقبولة", "Accepted Orders Log")}>
          {orders.map((o, i) => (
            <div key={o.id ?? i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
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
              <span className="font-mono font-bold text-gray-800 flex-shrink-0">{fmtAmt((o.total ?? 0) / 100)} {t("ر.س", "SAR")}</span>
              {o.statusKey !== "delivered" && (
                <Btn size="sm" variant="success" disabled={deliverMut.isPending} onClick={() => deliverMut.mutate({ id: o.id })}><Truck size={12} /> {t("تم التسليم", "Delivered")}</Btn>
              )}
            </div>
          ))}
          <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600">{t("الإجمالي", "Total")}</span>
            <span className="font-mono font-black text-purple-700 text-lg">{fmtAmt(totalRunning / 100)} {t("ر.س", "SAR")}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
