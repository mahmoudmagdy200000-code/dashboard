import { useState } from "react";
import { Eye, XCircle } from "lucide-react";
import { useSentPurchaseOrders, usePurchaseOrderGroup } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Btn } from "../../components/Btn";

export function ProcSent({ }: PageProps) {
  const { t } = useLang();
  // Sent groups come from the bridge; status is derived live from member orders.
  const { data: apiSent } = useSentPurchaseOrders();
  const groups = ((apiSent as any[]) ?? []) as any[];
  const [trackId, setTrackId] = useState<string | null>(null);
  const { data: trackDetail } = usePurchaseOrderGroup(trackId ?? undefined);
  const statusCfg: Record<string, { cls: string; label: string }> = {
    // T11.10 — a freshly-sent batch reads `sent` until the supplier acts.
    sent: { cls: "bg-purple-50 text-purple-700", label: t("أُرسل للمورد", "Sent") },
    confirmed: { cls: "bg-emerald-50 text-emerald-700", label: t("مؤكد", "Confirmed") },
    preparing: { cls: "bg-amber-50 text-amber-700", label: t("قيد التحضير", "Preparing") },
    on_the_way: { cls: "bg-blue-50 text-blue-700", label: t("في الطريق", "On the Way") },
    delivered: { cls: "bg-emerald-50 text-emerald-700", label: t("تم التسليم", "Delivered") },
  };
  const stCfg = (s: string) => statusCfg[s] ?? { cls: "bg-gray-50 text-gray-600", label: s ?? "—" };
  const det = trackDetail as any;
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">{t("المرسلة للموردين", "Sent to Suppliers")}</h2>
      <Card title={t("الطلبات المرسلة", "Sent Orders")}>
        {groups.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400">{t("لا توجد طلبات مرسلة", "No sent orders")}</div>}
        {groups.map((o) => {
          const c = stCfg(o.status); return (
            <div key={o.groupId} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-800">{o.supplierName ?? "—"}</p>
                <p className="text-xs text-gray-400 mt-1"><span className="font-mono text-purple-600">{o.groupNumber}</span> · {o.ordersCount ?? 0} {t("طلب", "orders")} · {t("أُرسل", "Sent")} {String(o.sentAt ?? "").slice(0, 10)}{o.eta ? ` · ${t("التسليم المتوقع", "ETA")} ${String(o.eta).slice(0, 10)}` : ""}</p>
              </div>
              {o.savings != null && o.savings > 0 && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">💰 {fmtAmt(o.savings)} {t("ر.س", "SAR")}{o.savingsPct != null ? ` (${o.savingsPct}%)` : ""}</Badge>}
              <Badge className={c.cls}>{c.label}</Badge>
              <span className="font-mono font-bold text-gray-800">{fmtAmt(o.totalAmount ?? 0)} {t("ر.س", "SAR")}</span>
              <Btn size="sm" onClick={() => setTrackId(o.groupId)}><Eye size={12} /> {t("تتبع", "Track")}</Btn>
            </div>
          );
        })}
      </Card>

      {trackId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setTrackId(null)} dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">{t("تتبع الدفعة", "Track Group")} <span className="font-mono text-purple-600 text-sm">{det?.groupNumber ?? ""}</span></h3>
              <button onClick={() => setTrackId(null)} className="text-gray-400"><XCircle size={18} /></button>
            </div>
            {!det ? <p className="text-sm text-gray-400 py-6 text-center">{t("جاري التحميل...", "Loading...")}</p> : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-gray-700">{det.supplierName ?? "—"}</span>
                  <Badge className={stCfg(det.status).cls}>{stCfg(det.status).label}</Badge>
                  <span className="font-mono font-bold text-gray-800 mr-auto">{fmtAmt(det.totalAmount ?? 0)} {t("ر.س", "SAR")}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1.5">{t("الطلبات", "Orders")} ({(det.orders ?? []).length})</p>
                  <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                    {(det.orders ?? []).map((r: any) => (
                      <div key={r.id} className="px-3 py-2 flex items-center gap-2 text-xs">
                        <span className="font-mono text-purple-600">{r.orderNumber}</span>
                        <span className="text-gray-600">{r.branchName ?? r.branchId ?? "—"}{r.city ? ` · ${r.city}` : ""}</span>
                        <Badge className={stCfg(r.status).cls + " mr-auto"}>{r.statusLabel ?? stCfg(r.status).label}</Badge>
                        <span className="font-mono font-semibold text-gray-700">{fmtAmt(r.totalAmount ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {(det.items ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1.5">{t("الأصناف المجمعة", "Aggregated Items")}</p>
                    <table className="w-full text-xs border border-gray-100 rounded-xl overflow-hidden" dir="rtl">
                      <thead className="bg-gray-50 text-gray-500"><tr>
                        <th className="text-right px-3 py-1.5">{t("الصنف", "Item")}</th>
                        <th className="text-center px-3 py-1.5">{t("الوحدة", "Unit")}</th>
                        <th className="text-center px-3 py-1.5">{t("الكمية", "Qty")}</th>
                        <th className="text-center px-3 py-1.5">{t("سعر الوحدة", "Unit Price")}</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50 bg-white">
                        {(det.items ?? []).map((it: any, j: number) => (
                          <tr key={j}>
                            <td className="px-3 py-1.5 font-medium text-gray-800">{it.name}</td>
                            <td className="px-3 py-1.5 text-center text-gray-500">{it.unit ?? "—"}</td>
                            <td className="px-3 py-1.5 text-center font-mono">{it.totalQuantity}</td>
                            <td className="px-3 py-1.5 text-center font-mono text-blue-700">{fmtAmt(it.unitPrice ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
