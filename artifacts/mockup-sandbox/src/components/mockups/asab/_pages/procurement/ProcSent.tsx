import { useState } from "react";
import { Eye, XCircle, PhoneCall } from "lucide-react";
import { useSentPurchaseOrders, usePurchaseOrderGroup, useRecordManualSupplierResponse } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Btn } from "../../components/Btn";

export function ProcSent({ }: PageProps) {
  const { t, dir } = useLang();
  // Sent groups come from the bridge; status is derived live from member orders.
  const { data: apiSent } = useSentPurchaseOrders();
  const groups = ((apiSent as any[]) ?? []) as any[];
  const [trackId, setTrackId] = useState<string | null>(null);
  const { data: trackDetail } = usePurchaseOrderGroup(trackId ?? undefined);
  const manualMut = useRecordManualSupplierResponse();
  const [manualForId, setManualForId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"accepted" | "rejected">("accepted");
  const [source, setSource] = useState<"whatsapp" | "phone">("whatsapp");
  const [respondedAt, setRespondedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const statusCfg: Record<string, { cls: string; label: string }> = {
    sent: { cls: "bg-purple-50 text-purple-700", label: t("أُرسل — بانتظار الرد", "Sent — Awaiting Response") },
    sent_awaiting_response: { cls: "bg-purple-50 text-purple-700", label: t("أُرسل — بانتظار الرد", "Sent — Awaiting Response") },
    confirmed: { cls: "bg-emerald-50 text-emerald-700", label: t("مؤكد", "Confirmed") },
    rejected: { cls: "bg-red-50 text-red-700", label: t("مرفوض", "Rejected") },
    preparing: { cls: "bg-amber-50 text-amber-700", label: t("قيد التحضير", "Preparing") },
    on_the_way: { cls: "bg-blue-50 text-blue-700", label: t("في الطريق", "On the Way") },
    delivered: { cls: "bg-emerald-50 text-emerald-700", label: t("تم التسليم", "Delivered") },
  };
  const submitManualResponse = (orderId: string) => {
    manualMut.mutate(
      {
        id: orderId,
        decision,
        source,
        respondedAt,
        reason: decision === "rejected" ? (note.trim() || t("رفض من المورد", "Rejected by supplier")) : undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setManualForId(null);
          setNote("");
        },
      },
    );
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
                      <div key={r.id} className="px-3 py-2 space-y-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-purple-600">{r.orderNumber}</span>
                          <span className="text-gray-600">{r.branchName ?? r.branchId ?? "—"}{r.city ? ` · ${r.city}` : ""}</span>
                          <Badge className={stCfg(r.status).cls + " mr-auto"}>{r.statusLabel ?? stCfg(r.status).label}</Badge>
                          <span className="font-mono font-semibold text-gray-700">{fmtAmt(r.totalAmount ?? 0)}</span>
                          {!det.isSubscribedSupplier && (r.status === "sent_awaiting_response" || r.status === "pending") && (
                            <Btn size="sm" onClick={() => setManualForId(manualForId === r.id ? null : r.id)}>
                              <PhoneCall size={11} /> {t("تسجيل رد المورد", "Record Response")}
                            </Btn>
                          )}
                        </div>
                        {r.manualResponse && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-700">
                            <span className="font-semibold">{t("رد المورد المسجل:", "Recorded Supplier Response:")}</span>{" "}
                            {r.manualResponse.decision === "accepted" ? t("قبول", "Accepted") : t("رفض", "Rejected")} ·{" "}
                            {r.manualResponse.source === "whatsapp" ? t("واتساب", "WhatsApp") : t("هاتف", "Phone")} ·{" "}
                            {String(r.manualResponse.respondedAt ?? "").slice(0, 16).replace("T", " ")}
                            {r.manualResponse.recordedByName ? ` · ${r.manualResponse.recordedByName}` : ""}
                            {r.manualResponse.note ? ` — ${r.manualResponse.note}` : ""}
                          </div>
                        )}
                        {manualForId === r.id && (
                          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 space-y-2" dir={dir}>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <select value={decision} onChange={e => setDecision(e.target.value as "accepted" | "rejected")} className="border border-amber-200 rounded-lg px-2 py-1 bg-white">
                                <option value="accepted">{t("قبول المورد", "Supplier Accepted")}</option>
                                <option value="rejected">{t("رفض المورد", "Supplier Rejected")}</option>
                              </select>
                              <select value={source} onChange={e => setSource(e.target.value as "whatsapp" | "phone")} className="border border-amber-200 rounded-lg px-2 py-1 bg-white">
                                <option value="whatsapp">{t("واتساب", "WhatsApp")}</option>
                                <option value="phone">{t("هاتف", "Phone")}</option>
                              </select>
                              <input type="datetime-local" value={respondedAt} onChange={e => setRespondedAt(e.target.value)} className="border border-amber-200 rounded-lg px-2 py-1 bg-white" />
                            </div>
                            <input
                              value={note}
                              onChange={e => setNote(e.target.value)}
                              placeholder={decision === "rejected" ? t("سبب الرفض (إلزامي)...", "Rejection reason (required)...") : t("ملاحظة الرد (اختياري)...", "Response note (optional)...")}
                              className="w-full border border-amber-200 rounded-lg px-2.5 py-1.5 bg-white"
                            />
                            <div className="flex gap-2">
                              <Btn size="sm" variant="primary" disabled={manualMut.isPending || !respondedAt || (decision === "rejected" && !note.trim())} onClick={() => submitManualResponse(r.id)}>
                                {t("حفظ الرد", "Save Response")}
                              </Btn>
                              <Btn size="sm" onClick={() => setManualForId(null)}>{t("إلغاء", "Cancel")}</Btn>
                            </div>
                          </div>
                        )}
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
