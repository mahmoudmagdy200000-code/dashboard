import { XCircle } from "lucide-react";
import { useSupplierOrders } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";

// T13 §2 — GET orders?status=rejected. The order row does not carry the
// rejection reason back, so we render the summary + amount only.
export function SupRejected({ }: PageProps) {
  const { data: apiRejected } = useSupplierOrders({ status: "rejected" });
  const { t } = useLang();
  const orders = (Array.isArray(apiRejected) ? apiRejected : []) as any[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الطلبات المرفوضة", "Rejected Orders")}</h2><p className="text-gray-400 text-sm mt-0.5">{orders.length} {t("طلب مرفوض", "rejected orders")}</p></div>
      </div>
      {orders.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات مرفوضة", "No rejected orders")}</div>}
      {orders.length > 0 && (
        <Card title={t("سجل الرفض", "Rejection Log")}>
          {orders.map((o, i) => (
            <div key={o.id ?? i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0"><XCircle size={16} className="text-red-500" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-800 truncate">{o.from ?? "—"}</span>{o.publicId && <span className="font-mono text-xs text-gray-400">{o.publicId}</span>}</div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{o.itemsText ?? "—"}{o.orderDate ? ` · ${String(o.orderDate).slice(0, 10)}` : ""}</p>
              </div>
              <Badge className="bg-red-50 text-red-700 flex-shrink-0">{o.statusLabel ?? t("مرفوض", "Rejected")}</Badge>
              <span className="font-mono font-bold text-gray-800 flex-shrink-0">{fmtAmt((o.total ?? 0) / 100)} {t("ر.س", "SAR")}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
