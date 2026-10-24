import { useState } from "react";
import { Home, Truck, Eye, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import {
  useGroupedPurchaseOrders,
  useProcurementSuppliersPlatform,
  useSendGroupedPurchaseOrders,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Badge } from "../../components/Badge";
import { Btn } from "../../components/Btn";

export function ProcGrouped({ navigate }: PageProps) {
  const { t } = useLang();
  const [viewMode, setViewMode] = useState<"supplier" | "city" | "item">("item");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [assignSupplier, setAssignSupplier] = useState<Record<string, string>>({});
  // Live consolidation preview from the bridge (grouped by supplier, city, or item).
  const { data: grouped } = useGroupedPurchaseOrders(viewMode);
  const { data: suppliersRaw } = useProcurementSuppliersPlatform();
  const sendMut = useSendGroupedPurchaseOrders();

  const supplierGroups = (((grouped as any)?.suppliers ?? []) as any[]);
  const unassigned = (((grouped as any)?.unassignedOrders ?? []) as any[]);
  const cityGroups = (((grouped as any)?.cities ?? []) as any[]);
  const itemCards = (((grouped as any)?.items ?? []) as any[]);   // T11.7 by=item
  const supplierOpts = ((suppliersRaw?.data ?? []) as any[]);
  const fmtOrDash = (n: number | null | undefined) => n == null ? "—" : fmtAmt(n);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("الطلبات المجمعة", "Consolidated Orders")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("راجع الكميات المجمعة ونبّه إن تجاوزت طاقة المورد", "Review consolidated quantities and flag if supplier capacity is exceeded")}</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {(["item", "supplier", "city"] as const).map(m => (
            <button key={m} onClick={() => { setViewMode(m); setExpandedGroup(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === m ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {m === "item" ? t("بالصنف", "By Item") : m === "supplier" ? t("بالمورد", "By Supplier") : t("بالمدينة", "By City")}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "item" ? (
        <div className="space-y-3">
          {itemCards.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد أصناف جاهزة للتجميع", "No items ready to consolidate")}</div>}
          {itemCards.map((it: any, i: number) => {
            const key = it.itemId ?? String(i);
            const sup = it.suggestedSupplier;
            const hasSavings = it.savings != null && it.savings > 0;
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">📦</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800 text-sm">{it.name}</p>
                      <Badge className="bg-blue-50 text-blue-700 text-[10px]">{it.requestsCount ?? 0} {t("طلبات", "requests")} · {it.branchesCount ?? 0} {t("فروع", "branches")}</Badge>
                      {hasSavings && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">💰 {t("توفير", "Save")} {fmtOrDash(it.savings)} {t("ر.س", "SAR")}{it.savingsPct != null ? ` (${it.savingsPct}%)` : ""}</Badge>}
                    </div>
                    {/* Per-branch request lines */}
                    <div className="mt-2 space-y-1">
                      {(it.branchLines ?? []).map((bl: any, j: number) => (
                        <div key={j} className="flex items-center gap-2 text-xs text-gray-600">
                          <Home size={10} className="text-gray-400" />
                          <span className="flex-1">{bl.branchName}</span>
                          <span className="font-mono font-bold text-gray-800">{bl.qty} {bl.unit ?? it.unit ?? ""}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-xs pt-1 border-t border-gray-100 mt-1">
                        <span className="flex-1 font-semibold text-gray-700">{t("الكمية الكلية", "Total quantity")}</span>
                        <span className="font-mono font-black text-emerald-700">{it.totalQuantity} {it.unit ?? ""}</span>
                      </div>
                    </div>
                    {/* Suggested supplier + cost */}
                    <div className="mt-3 flex items-center gap-3 flex-wrap bg-gray-50 rounded-xl px-3 py-2">
                      {sup ? (
                        <>
                          <span className="text-[11px] text-gray-500">{t("المورد المقترح", "Suggested supplier")}:</span>
                          <span className="text-xs font-bold text-gray-800">{sup.name}</span>
                          <span className="text-[11px] text-gray-400">·</span>
                          <span className="text-xs font-mono text-blue-700">{fmtOrDash(it.unitPrice)} {t("ر.س/وحدة", "SAR/unit")}</span>
                          <span className="text-[11px] text-gray-400">·</span>
                          <span className="text-xs font-mono font-bold text-gray-800">{t("الإجمالي", "Total")} {fmtOrDash(it.totalCost)} {t("ر.س", "SAR")}</span>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-400">{t("لا يوجد مورد بسعر معلن — «—»", "No priced supplier")}</span>
                      )}
                      <div className="mr-auto">
                        <Btn size="sm" variant="primary" disabled={!sup || sendMut.isPending}
                          onClick={() => sendMut.mutate({ supplierId: sup?.id, orderIds: it.orderIds })}>
                          <Truck size={11} /> {t("تجميع وإرسال للمورد", "Consolidate & send")}
                        </Btn>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "supplier" ? (
        <div className="space-y-3">
          {supplierGroups.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات جاهزة للتجميع", "No orders ready to consolidate")}</div>}
          {supplierGroups.map((g, i) => {
            const key = g.supplierId ?? String(i);
            const hasOverCapacity = g.capacityExceeded === true;
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedGroup(expandedGroup === key ? null : key)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-800">{g.supplierName ?? t("مورد", "Supplier")}</p>
                      {g.urgentCount > 0 && <Badge className="bg-amber-50 text-amber-700 text-[10px]">{g.urgentCount} {t("عاجل", "urgent")}</Badge>}
                      {hasOverCapacity && <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">⚠ {t("تجاوز الطاقة", "Over Capacity")}</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{g.branchesCount ?? 0} {t("فرع", "branches")} · {g.itemsCount ?? g.items?.length ?? 0} {t("أصناف", "items")} · {(g.cities ?? []).join("، ") || "—"}</p>
                  </div>
                  <span className="font-mono font-bold text-gray-800">{fmtAmt(g.totalAmount ?? 0)} {t("ر.س", "SAR")}</span>
                  <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    <Btn size="sm" onClick={() => setExpandedGroup(expandedGroup === key ? null : key)}><Eye size={12} /> {t("تفاصيل", "Details")}</Btn>
                    <Btn size="sm" variant="primary" onClick={() => sendMut.mutate({ supplierId: g.supplierId })} disabled={sendMut.isPending || !g.supplierId}><Truck size={12} /> {t("إرسال للمورد", "Send to Supplier")}</Btn>
                  </div>
                  {expandedGroup === key ? <ChevronUp size={13} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />}
                </div>
                {expandedGroup === key && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                    <table className="w-full text-xs" dir="rtl">
                      <thead><tr className="text-gray-500">
                        <th className="text-right py-1">{t("الصنف", "Item")}</th>
                        <th className="text-center py-1">{t("الوحدة", "Unit")}</th>
                        <th className="text-center py-1">{t("الكمية الكلية", "Total Qty")}</th>
                        <th className="text-center py-1 text-amber-700">{t("الطاقة القصوى", "Max Capacity")}</th>
                        <th className="text-center py-1">{t("الحالة", "Status")}</th>
                        <th className="text-center py-1">{t("سعر الوحدة", "Unit Price")}</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {(g.items ?? []).map((it: any, j: number) => {
                          const noCap = it.capacity == null;
                          const pct = it.capacityPct ?? (noCap ? null : Math.round((it.totalQuantity / it.capacity) * 100));
                          const over = it.exceeded === true;
                          return (
                            <tr key={j} className={over ? "bg-red-50/40" : ""}>
                              <td className="py-2 font-medium text-gray-800">{it.name}</td>
                              <td className="py-2 text-center text-gray-500">{it.unit ?? "—"}</td>
                              <td className="py-2 text-center font-mono font-bold text-gray-800">{it.totalQuantity}</td>
                              <td className="py-2 text-center font-mono text-amber-700">{noCap ? "—" : it.capacity}</td>
                              <td className="py-2 text-center">
                                {noCap ? <span className="text-gray-300 text-[10px]">{t("غير معلن", "n/a")}</span> : (
                                  <div className="w-20 mx-auto">
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-0.5">
                                      <div className={`h-1.5 rounded-full ${over ? "bg-red-500" : (pct ?? 0) > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
                                    </div>
                                    <p className={`text-[9px] font-bold ${over ? "text-red-600" : (pct ?? 0) > 80 ? "text-amber-600" : "text-emerald-600"}`}>
                                      {over ? `${t("تجاوز بـ", "Exceeds by")} ${it.excessQuantity ?? ""} ${it.unit ?? ""}` : `${pct}%`}
                                    </p>
                                  </div>
                                )}
                              </td>
                              <td className="py-2 text-center font-mono text-blue-700">{fmtAmt(it.unitPrice ?? 0)} {t("ر.س", "SAR")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {hasOverCapacity && (
                      <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                        <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />
                        <p className="text-[11px] text-red-700">
                          <strong>{t("تحذير:", "Warning:")}</strong> {t("بعض الأصناف تتجاوز الطاقة الاستيعابية للمورد — يُنصح بتوزيع الكمية على مورد احتياطي.", "Some items exceed the supplier's capacity — it is recommended to distribute the quantity to a backup supplier.")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned officer orders — assign a supplier then send */}
          {unassigned.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-100 flex items-center gap-2">
                <AlertTriangle size={13} className="text-amber-600" />
                <p className="font-bold text-amber-800 text-sm">{t("طلبات بلا مورد — تحتاج تعيين", "Unassigned orders — need a supplier")}</p>
                <Badge className="bg-amber-100 text-amber-700 text-[10px]">{unassigned.length}</Badge>
              </div>
              {unassigned.map((o: any) => (
                <div key={o.id} className="px-5 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <span className="font-mono text-xs text-purple-600">{o.orderNumber}</span>
                    <span className="text-xs text-gray-500 mr-2">{o.branchName ?? "—"}</span>
                  </div>
                  <span className="font-mono font-bold text-gray-700 text-sm">{fmtAmt(o.totalAmount ?? 0)} {t("ر.س", "SAR")}</span>
                  <select value={assignSupplier[o.id] ?? ""} onChange={e => setAssignSupplier(m => ({ ...m, [o.id]: e.target.value }))}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
                    <option value="">{t("اختر المورد", "Select supplier")}</option>
                    {supplierOpts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <Btn size="sm" variant="primary" disabled={!assignSupplier[o.id] || sendMut.isPending}
                    onClick={() => sendMut.mutate({ supplierId: assignSupplier[o.id], orderIds: [o.id] })}><Truck size={11} /> {t("إرسال", "Send")}</Btn>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {cityGroups.length === 0 && <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات جاهزة للتجميع", "No orders ready to consolidate")}</div>}
          {cityGroups.map((cg, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">🏙</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800">{cg.city}</p>
                    {cg.urgentCount > 0 && <Badge className="bg-red-50 text-red-700 text-[10px]">{cg.urgentCount} {t("عاجل", "Urgent")}</Badge>}
                  </div>
                  <p className="text-xs text-gray-400">{cg.ordersCount} {t("طلب", "orders")} · {(cg.suppliers ?? []).length} {t("موردون", "suppliers")}</p>
                </div>
                <span className="font-mono font-bold text-purple-700">{fmtAmt(cg.totalAmount ?? 0)} {t("ر.س", "SAR")}</span>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                {(cg.suppliers ?? []).map((s: any, j: number) => (
                  <div key={j} className="flex items-center gap-1.5 py-1 border-b border-gray-50 last:border-0">
                    <Truck size={10} className="text-gray-400" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setViewMode("supplier"); setExpandedGroup(null); }}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-semibold transition-colors">
                <Eye size={11} /> {t("عرض بالموردين", "View by suppliers")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
