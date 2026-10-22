import { useState } from "react";
import {
  Package,
  ShoppingCart,
  CheckCircle2,
  Truck,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ThumbsDown,
} from "lucide-react";
import {
  usePurchaseOrders,
  usePurchaseOrder,
  useApprovePurchaseOrder,
  useBulkApprovePurchaseOrders,
  useRejectPurchaseOrder,
  usePartialApprovePurchaseOrder,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Btn } from "../../components/Btn";
import { KpiCard } from "../../components/KpiCard";
import { Badge } from "../../components/Badge";

export function ProcNewOrders({ }: PageProps) {
  const { t } = useLang();
  // Incoming branch orders come from the purchase-orders BRIDGE (SAR floats).
  const { data: apiOrdersPage } = usePurchaseOrders({ status: "incoming" });
  const rows = (((apiOrdersPage as any)?.data ?? []) as any[]).map((r) => ({
    id: r.id as string,
    orderNumber: (r.orderNumber ?? r.id) as string,
    branch: (r.branchName ?? r.branchId ?? "—") as string,
    supplierId: (r.supplierId ?? "") as string,
    // Prefer the enriched supplier name (meeting 2026-07-29 §3); only fall back to
    // an id fragment when the backend hasn't attached a name.
    supplier: (r.supplierName ?? (r.supplierId ? `${t("مورد", "Supplier")} ${String(r.supplierId).slice(0, 6)}` : t("غير محدد", "Unassigned"))) as string,
    items: (r.totalItems ?? 0) as number,
    total: (r.totalAmount ?? 0) as number,
    urgency: (r.priority === "high" ? "عاجل" : "عادي") as string,
  }));
  const [groupBy, setGroupBy] = useState<"branch" | "supplier">("branch");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterBranch, setFilterBranch] = useState("الكل");
  const [filterUrgency, setFilterUrgency] = useState("الكل");
  const [approvedCount, setApprovedCount] = useState(0);
  // Reject editors — only one order open at a time.
  const [editMode, setEditMode] = useState<null | "partial" | "reject">(null);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [partialNote, setPartialNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  // Consumption detail is fetched only for the currently-expanded order.
  const detailQ = usePurchaseOrder(expandedId ?? undefined);
  const detailItems = ((detailQ.data as any)?.items ?? []) as any[];

  const approveMut = useApprovePurchaseOrder();
  const bulkMut = useBulkApprovePurchaseOrders();
  const rejectMut = useRejectPurchaseOrder();
  const partialMut = usePartialApprovePurchaseOrder();

  const approveOne = (id: string) => { approveMut.mutate(id, { onSuccess: () => setApprovedCount(c => c + 1) }); setExpandedId(null); };
  const approveList = (ids: string[]) => { if (ids.length) bulkMut.mutate(ids, { onSuccess: (res: any) => setApprovedCount(c => c + (res?.count ?? res?.approved?.length ?? ids.length)) }); };
  const openReject = (id: string) => { setExpandedId(id); setEditMode("reject"); setRejectReason(""); setRejectNote(""); };
  const confirmReject = (id: string) => { const reason = [rejectReason, rejectNote].filter(Boolean).join(" — ") || t("رفض من المشتريات", "Rejected by procurement"); rejectMut.mutate({ id, reason }, { onSuccess: () => { setEditMode(null); setExpandedId(null); } }); };
  const openPartial = (id: string) => { setExpandedId(id); setEditMode("partial"); setPartialNote(""); setQtyMap({}); };
  const confirmPartial = (id: string) => { const items = detailItems.map((it: any) => ({ orderItemId: it.orderItemId, quantity: qtyMap[it.orderItemId] ?? it.quantityOrdered ?? 0 })); partialMut.mutate({ id, items, note: partialNote || undefined }, { onSuccess: () => { setEditMode(null); setExpandedId(null); } }); };

  const branchList = ["الكل", ...[...new Set(rows.map(o => o.branch))]];
  const filteredOrders = rows.filter(o => {
    if (filterBranch !== "الكل" && o.branch !== filterBranch) return false;
    if (filterUrgency !== "الكل" && o.urgency !== filterUrgency) return false;
    return true;
  });
  const pending = filteredOrders;
  const groupKeys = [...new Set(filteredOrders.map(o => groupBy === "branch" ? o.branch : o.supplier))];

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("الطلبات الجديدة", "New Orders")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("راجع الاستهلاك قبل الاعتماد — اعتمد فردياً أو للفرع/المورد دفعةً واحدة", "Review consumption before approving — approve individually or per branch/supplier in bulk")}</p>
        </div>
        {pending.length > 0 && <Btn variant="primary" size="sm" disabled={bulkMut.isPending} onClick={() => approveList(pending.map(o => o.id))}><Package size={12} /> {t("اعتماد الكل", "Approve All")} ({pending.length})</Btn>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("طلبات جديدة معلقة", "Pending New Orders")} value={String(pending.length)} sub={t("من الفروع", "from branches")} icon={<ShoppingCart size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("تم اعتمادها", "Approved")} value={String(approvedCount)} sub={t("هذه الجلسة", "this session")} icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("الموردون المعنيون", "Relevant Suppliers")} value={String(new Set(pending.map(o => o.supplierId).filter(Boolean)).size)} sub={t("يحتاجون موافقة", "need approval")} icon={<Truck size={18} className="text-blue-600" />} accent="blue" />
      </div>

      {/* Filters panel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفرع", "Branch")}</label>
            <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {branchList.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الأولوية", "Priority")}</label>
            <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="الكل">{t("الكل", "All")}</option>
              <option value="عاجل">{t("عاجل", "Urgent")}</option>
              <option value="عادي">{t("عادي", "Normal")}</option>
            </select>
          </div>
        </div>
        {(filterBranch !== "الكل" || filterUrgency !== "الكل") && (
          <button onClick={() => { setFilterBranch("الكل"); setFilterUrgency("الكل"); }}
            className="mt-2 text-xs text-purple-600 hover:underline flex items-center gap-1">
            <RotateCcw size={11} /> {t("مسح الفلاتر", "Clear filters")} · {t("يظهر", "Showing")} {filteredOrders.length} {t("من", "of")} {rows.length} {t("طلب", "orders")}
          </button>
        )}
      </div>

      {/* Consumption notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
        <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800">
          <strong>{t("تنبيه:", "Notice:")}</strong> {t("قبل الاعتماد، اضغط على أي طلب لمراجعة بيانات الاستهلاك اليومي والكمية الموصى بها مقارنةً بما طلبه الفرع.", "Before approving, click any order to review daily consumption data and recommended quantity vs. what the branch ordered.")}
        </p>
      </div>

      {/* Group by toggle */}
      <div className="flex items-center gap-3" dir="rtl">
        <span className="text-xs font-semibold text-gray-500">{t("تجميع حسب:", "Group by:")}</span>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {(["branch", "supplier"] as const).map(g => (
            <button key={g} onClick={() => { setGroupBy(g); setExpandedId(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${groupBy === g ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {g === "branch" ? t("الفرع", "Branch") : t("المورد", "Supplier")}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 mr-auto flex items-center gap-1">
          <ChevronDown size={11} /> {t("اضغط على الطلب لمراجعة بيانات الاستهلاك", "Click an order to review consumption data")}
        </span>
      </div>

      {/* Grouped orders */}
      <div className="space-y-3">
        {groupKeys.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات جديدة من الفروع", "No new branch orders")}</div>}
        {groupKeys.map(groupKey => {
          const groupOrders = filteredOrders.filter(o => (groupBy === "branch" ? o.branch : o.supplier) === groupKey);
          const groupTotal = groupOrders.reduce((s, o) => s + o.total, 0);
          return (
            <div key={groupKey} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Group header */}
              <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 text-sm">{groupKey}</span>
                  <Badge className="bg-blue-50 text-blue-700 text-[10px]">{groupOrders.length} {t("طلب", "orders")}</Badge>
                  <span className="font-mono font-bold text-gray-600 text-sm">{fmtAmt(groupTotal)} {t("ر.س", "SAR")}</span>
                </div>
                {groupOrders.length > 1 && (
                  <Btn size="sm" variant="success" disabled={bulkMut.isPending}
                    onClick={() => approveList(groupOrders.map(o => o.id))}>
                    <CheckCircle2 size={11} /> {t("اعتماد الكل", "Approve All")} ({groupOrders.length} {t("طلب", "orders")})
                  </Btn>
                )}
              </div>
              {/* Orders in group */}
              {groupOrders.map((r) => {
                const isOpen = expandedId === r.id;
                return (
                  <div key={r.id} className={`border-b border-gray-100 last:border-0 ${r.urgency === "عاجل" ? "border-r-4 border-r-red-400" : ""}`}>
                    <div className={`px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 cursor-pointer ${isOpen ? "bg-amber-50/20" : ""}`}
                      onClick={() => { setExpandedId(isOpen ? null : r.id); setEditMode(null); }}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-purple-600">{r.orderNumber}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-600">{groupBy === "branch" ? r.supplier : r.branch}</span>
                          <Badge className={r.urgency === "عاجل" ? "bg-red-50 text-red-700 text-[10px]" : "bg-gray-50 text-gray-600 text-[10px]"}>{r.urgency}</Badge>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{r.items} {t("أصناف", "items")}</p>
                      </div>
                      <span className="font-mono font-bold text-gray-800 text-sm">{fmtAmt(r.total)} {t("ر.س", "SAR")}</span>
                      <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Btn size="sm" variant="success" disabled={approveMut.isPending} onClick={() => approveOne(r.id)}><CheckCircle2 size={12} /> {t("اعتماد", "Approve")}</Btn>
                      </div>
                      {isOpen ? <ChevronUp size={13} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />}
                    </div>
                    {/* Consumption intelligence expansion panel */}
                    {isOpen && (
                      <div className="px-5 pb-5 bg-amber-50/10 space-y-3 border-t border-amber-100">
                        <div className="flex items-center gap-2 mt-3 mb-1">
                          <BarChart3 size={13} className="text-amber-600" />
                          <p className="text-xs font-bold text-amber-900">{t("بيانات الاستهلاك — راجع قبل الاعتماد", "Consumption Data — Review before approving")}</p>
                          <span className="text-[10px] text-amber-600 mr-auto">{r.branch}</span>
                        </div>
                        {detailQ.isLoading && <p className="text-xs text-gray-400 py-2">{t("جاري تحميل التفاصيل...", "Loading details...")}</p>}
                        {!detailQ.isLoading && detailItems.length === 0 && <p className="text-xs text-gray-400 py-2">{t("لا توجد تفاصيل أصناف", "No item details available")}</p>}
                        {detailItems.length > 0 && (
                          <table className="w-full border border-amber-100 rounded-xl overflow-hidden text-xs" dir="rtl">
                            <thead className="bg-amber-50">
                              <tr>
                                <th className="px-3 py-2 text-right">{t("الصنف", "Item")}</th>
                                <th className="px-3 py-2 text-center">{t("الوحدة", "Unit")}</th>
                                <th className="px-3 py-2 text-center font-bold text-gray-800">{t("مطلوب", "Ordered")}</th>
                                <th className="px-3 py-2 text-center bg-amber-100/60 text-amber-700">{t("استهلاك يومي", "Daily Avg")}</th>
                                <th className="px-3 py-2 text-center bg-amber-100/60 text-amber-700">{t("موصى به (7 أيام)", "Recommended (7d)")}</th>
                                <th className="px-3 py-2 text-center bg-sky-50/80 text-sky-700">{t("المخزون المتبقي", "Remaining")}</th>
                                <th className="px-3 py-2 text-center">{t("سعر الوحدة", "Unit Price")}</th>
                                <th className="px-3 py-2 text-center">{t("التقييم", "Assessment")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-50 bg-white">
                              {detailItems.map((it: any, pi: number) => {
                                const ordered = it.quantityOrdered ?? 0;
                                const recommended = it.dailyConsumption != null ? Math.round(it.dailyConsumption * 7) : null;
                                const qtyDiff = recommended != null ? ordered - recommended : 0;
                                const qtyStatus = recommended == null ? "na" : Math.abs(qtyDiff) <= 5 ? "ok" : qtyDiff > 5 ? "over" : "under";
                                return (
                                  <tr key={it.orderItemId ?? pi} className={qtyStatus === "over" ? "bg-orange-50/40" : qtyStatus === "under" ? "bg-blue-50/30" : ""}>
                                    <td className="px-3 py-2 font-semibold text-gray-800">{it.name}</td>
                                    <td className="px-3 py-2 text-center text-gray-500">{it.unit ?? "—"}</td>
                                    <td className="px-3 py-2 text-center font-mono font-bold text-gray-800">{ordered}</td>
                                    <td className="px-3 py-2 text-center font-mono text-amber-700 bg-amber-50/30">{it.dailyConsumption ?? "—"}</td>
                                    <td className="px-3 py-2 text-center font-mono bg-amber-50/30">
                                      <span className={`font-bold ${qtyStatus === "over" ? "text-orange-600" : qtyStatus === "under" ? "text-blue-600" : qtyStatus === "ok" ? "text-emerald-600" : "text-gray-400"}`}>{recommended ?? "—"}</span>
                                    </td>
                                    <td className="px-3 py-2 text-center font-mono text-gray-500 bg-sky-50/20">{it.remainingBalance ?? "—"}</td>
                                    <td className="px-3 py-2 text-center font-mono font-semibold text-gray-800">{fmtAmt(it.unitPrice ?? 0)} {t("ر.س", "SAR")}</td>
                                    <td className="px-3 py-2 text-center">
                                      {qtyStatus === "na"
                                        ? <span className="text-gray-300">—</span>
                                        : qtyStatus === "ok"
                                          ? <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">✓ {t("مناسب", "OK")}</Badge>
                                          : qtyStatus === "over"
                                            ? <Badge className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px]">↑ {t("أعلى بـ", "High by ")}{qtyDiff}</Badge>
                                            : <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">↓ {t("أقل بـ", "Low by ")}{Math.abs(qtyDiff)}</Badge>
                                      }
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                        {/* Actions / reject editors */}
                        {editMode === "partial" ? (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2 mt-1" dir="rtl">
                            <p className="text-xs font-bold text-orange-800">⚠ {t("اعتماد جزئي — عدّل الكمية المعتمدة لكل صنف (صفر = رفض الصنف)", "Partial approve — set confirmed qty per item (0 = reject line)")}</p>
                            <div className="space-y-1.5 max-h-52 overflow-y-auto">
                              {detailItems.map((it: any) => (
                                <div key={it.orderItemId} className="flex items-center gap-2 text-xs">
                                  <span className="flex-1 text-gray-700">{it.name} <span className="text-gray-400">({t("مطلوب", "ordered")} {it.quantityOrdered ?? 0} {it.unit ?? ""})</span></span>
                                  <input type="number" min={0} max={it.quantityOrdered ?? undefined} dir="ltr"
                                    value={qtyMap[it.orderItemId] ?? it.quantityOrdered ?? 0}
                                    onChange={e => setQtyMap(m => ({ ...m, [it.orderItemId]: Math.max(0, Number(e.target.value) || 0) }))}
                                    className="w-24 text-sm border border-orange-200 rounded-lg px-2 py-1 bg-white outline-none text-center" />
                                </div>
                              ))}
                            </div>
                            <input value={partialNote} onChange={e => setPartialNote(e.target.value)}
                              placeholder={t("سبب / ملاحظة (اختياري)...", "Reason / note (optional)...")}
                              className="w-full text-sm border border-orange-200 rounded-lg px-3 py-2 bg-white outline-none" />
                            <div className="flex gap-2">
                              <Btn size="sm" variant="danger" disabled={partialMut.isPending || detailItems.length === 0} onClick={() => confirmPartial(r.id)}>
                                <ThumbsDown size={11} /> {t("تأكيد الاعتماد الجزئي", "Confirm Partial Approve")}
                              </Btn>
                              <Btn size="sm" onClick={() => setEditMode(null)}>{t("إلغاء", "Cancel")}</Btn>
                            </div>
                          </div>
                        ) : editMode === "reject" ? (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2 mt-1" dir="rtl">
                            <p className="text-xs font-bold text-red-800">⛔ {t("رفض كلي — اذكر سبب الرفض", "Full reject — state the rejection reason")}</p>
                            <select value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-white">
                              <option value="">{t("— اختر سبب الرفض —", "— Select rejection reason —")}</option>
                              <option>{t("سعر أعلى من المتفق عليه", "Price above agreed rate")}</option>
                              <option>{t("كمية أعلى من الحاجة الفعلية", "Quantity exceeds actual need")}</option>
                              <option>{t("صنف غير مطلوب حالياً", "Item not needed currently")}</option>
                              <option>{t("مشكلة في المورد", "Supplier issue")}</option>
                              <option>{t("أخرى", "Other")}</option>
                            </select>
                            <input value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                              placeholder={t("ملاحظة إضافية (اختياري)...", "Additional note (optional)...")}
                              className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-white outline-none" />
                            <div className="flex gap-2">
                              <Btn size="sm" variant="danger" disabled={rejectMut.isPending} onClick={() => confirmReject(r.id)}>
                                <ThumbsDown size={11} /> {t("تأكيد الرفض", "Confirm Reject")}
                              </Btn>
                              <Btn size="sm" onClick={() => setEditMode(null)}>{t("إلغاء", "Cancel")}</Btn>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 pt-1 flex-wrap">
                            <Btn size="sm" variant="success" disabled={approveMut.isPending} onClick={() => approveOne(r.id)}><CheckCircle2 size={12} /> {t("اعتماد بعد المراجعة", "Approve After Review")}</Btn>
                            <button onClick={() => openPartial(r.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold hover:bg-orange-100">
                              <AlertTriangle size={11} /> {t("اعتماد/رفض جزئي", "Partial")}
                            </button>
                            <Btn size="sm" variant="danger" onClick={() => openReject(r.id)}><ThumbsDown size={12} /> {t("رفض كلي", "Full Reject")}</Btn>
                            <Btn size="sm" onClick={() => setExpandedId(null)}>{t("إغلاق", "Close")}</Btn>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
