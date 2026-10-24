import { useState } from "react";
import { Download, Upload, FileText, Plus, Search, TrendingUp, Edit2, Trash2, XCircle } from "lucide-react";
import {
  useProcurementItemsPlatform,
  useLookup,
  useExportProcurementItems,
  useImportProcurementItems,
  useProcurementItemsTemplate,
  useCreateProcurementItem,
  useUpdateProcurementItem,
  useDeleteProcurementItem,
  useItemPriceHistory,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";

export function ProcItems({ }: PageProps) {
  const { data: apiItems } = useProcurementItemsPlatform();
  const { t } = useLang();
  const { data: catLookup } = useLookup("supplier-categories");
  const exportItemsMut = useExportProcurementItems();
  const importItemsMut = useImportProcurementItems();
  const templateMut = useProcurementItemsTemplate();
  const createItemMut = useCreateProcurementItem();
  const updateItemMut = useUpdateProcurementItem();
  const deleteItemMut = useDeleteProcurementItem();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "", category: "", price: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", unit: "", category: "", price: "" });
  const [historyId, setHistoryId] = useState<string | null>(null);
  const { data: priceHistory } = useItemPriceHistory(historyId ?? undefined);
  const categories = (((catLookup as any)?.data ?? catLookup ?? []) as any[]);
  const catLabel = (c: any) => c.labelAr ?? c.label ?? c.name ?? c.value ?? c.key ?? "";
  const catValue = (c: any) => c.value ?? c.key ?? c.id ?? catLabel(c);
  // Prefer the server's riyal field; fall back to halalas÷100 for older payloads.
  const priceOf = (item: any) => { if (item.lastPriceSar != null) return item.lastPriceSar; const h = item.lastPriceHalalas ?? item.priceHalalas; return h != null ? h / 100 : (item.defaultPrice ?? null); };
  const submitItem = () => {
    if (!form.name.trim()) return;
    // Field is «آخر سعر (ر.س)» → send riyals via lastPriceSar (backend converts to halalas).
    createItemMut.mutate(
      { name: form.name, unit: form.unit, category: form.category, lastPriceSar: parseFloat(form.price) || 0 } as any,
      { onSuccess: () => { setShowAdd(false); setForm({ name: "", unit: "", category: "", price: "" }); } },
    );
  };
  const openEdit = (item: any) => { setEditId(item.id); setEditForm({ name: item.name ?? "", unit: item.unit ?? "", category: item.category ?? "", price: priceOf(item) != null ? String(priceOf(item)) : "" }); };
  const submitEdit = () => {
    if (!editId || !editForm.name.trim()) return;
    updateItemMut.mutate(
      { id: editId, name: editForm.name, unit: editForm.unit, category: editForm.category, lastPriceSar: parseFloat(editForm.price) || 0 } as any,
      { onSuccess: () => setEditId(null) },
    );
  };
  // Procurement items come from the platform API; empty until the backend returns them.
  // ⚠️ Backend gap: list is legacy-thin ({id,name}); monthly-usage/stock/last-order have no source.
  const items = ((apiItems as any)?.length > 0 ? (apiItems as any) : []) as any[];
  const filtered = items.filter(i => !search || (i.name ?? "").includes(search) || (i.category ?? "").includes(search));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("كتالوج الأصناف", "Item Catalog")}</h2><p className="text-gray-400 text-sm mt-0.5">{filtered.length} {t("صنف", "items")}</p></div>
        <div className="flex gap-2">
          <button onClick={() => templateMut.mutate("xlsx")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold hover:bg-gray-100"><Download size={11} /> {t("نموذج", "Template")}</button>
          <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${importItemsMut.isPending ? "bg-purple-100 text-purple-400 border-purple-100" : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"}`}>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={importItemsMut.isPending}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importItemsMut.mutate(f); }} />
            <Upload size={11} /> {importItemsMut.isPending ? t("جارٍ…", "…") : t("رفع Excel", "Import Excel")}
          </label>
          <button onClick={() => exportItemsMut.mutate("xlsx")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11} /> {t("تصدير", "Export")}</button>
          <Btn variant="primary" onClick={() => setShowAdd(true)}><Plus size={13} /> {t("إضافة صنف", "Add Item")}</Btn>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("بحث بالصنف أو التصنيف...", "Search by item or category...")} className="flex-1 text-sm outline-none" />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs text-gray-500">
              <th className="px-4 py-3 text-right">{t("الصنف", "Item")}</th>
              <th className="px-4 py-3 text-center">{t("الرمز", "Code")}</th>
              <th className="px-4 py-3 text-center">{t("التصنيف", "Category")}</th>
              <th className="px-4 py-3 text-center">{t("الوحدة", "Unit")}</th>
              <th className="px-4 py-3 text-center">{t("الموردون", "Suppliers")}</th>
              <th className="px-4 py-3 text-center">{t("آخر سعر", "Last Price")}</th>
              <th className="px-4 py-3 text-center">{t("إجراءات", "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t("لا توجد أصناف", "No items")}</td></tr>}
            {filtered.map((item, i) => {
              const p = priceOf(item); return (
                <tr key={item.id ?? i} className="border-b border-gray-50 hover:bg-gray-50/60 last:border-0">
                  <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                  <td className="px-4 py-3 text-center font-mono text-[11px] text-gray-400">{item.code ?? "—"}</td>
                  <td className="px-4 py-3 text-center">{item.category ? <Badge className="bg-purple-50 text-purple-700 text-[10px]">{item.category}</Badge> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.unit ?? "—"}</td>
                  <td className="px-4 py-3 text-center">{item.supplierCount != null ? <Badge className="bg-blue-50 text-blue-700 text-[10px]">{item.supplierCount}</Badge> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-gray-800">{p != null ? `${fmtAmt(p)} ${t("ر.س", "SAR")}` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setHistoryId(item.id)} title={t("تاريخ الأسعار", "Price history")} className="text-blue-600 hover:text-blue-800"><TrendingUp size={14} /></button>
                      <button onClick={() => openEdit(item)} title={t("تعديل", "Edit")} className="text-gray-500 hover:text-gray-800"><Edit2 size={14} /></button>
                      <button onClick={() => { if (window.confirm(t("حذف الصنف؟", "Delete item?"))) deleteItemMut.mutate(item.id); }} title={t("حذف", "Delete")} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(showAdd || editId) && (() => {
        const isEdit = !!editId; const f = isEdit ? editForm : form; const setF = isEdit ? setEditForm : setForm; const close = () => isEdit ? setEditId(null) : setShowAdd(false); const busy = isEdit ? updateItemMut.isPending : createItemMut.isPending; return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={close} dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{isEdit ? t("تعديل صنف", "Edit Item") : t("إضافة صنف", "Add Item")}</h3><button onClick={close} className="text-gray-400"><XCircle size={18} /></button></div>
              <div className="space-y-3">
                <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("اسم الصنف", "Item Name")}</label><input value={f.name} onChange={e => setF(v => ({ ...v, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الوحدة", "Unit")}</label><input value={f.unit} onChange={e => setF(v => ({ ...v, unit: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("آخر سعر (ر.س)", "Last Price (SAR)")}</label><input type="number" value={f.price} onChange={e => setF(v => ({ ...v, price: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                </div>
                <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("التصنيف", "Category")}</label>
                  {categories.length > 0 ? (
                    <select value={f.category} onChange={e => setF(v => ({ ...v, category: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300 bg-white">
                      <option value="">{t("— اختر —", "— Select —")}</option>
                      {categories.map((c: any, ci: number) => <option key={ci} value={catValue(c)}>{catLabel(c)}</option>)}
                    </select>
                  ) : (
                    <input value={f.category} onChange={e => setF(v => ({ ...v, category: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" />
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-1"><Btn size="sm" onClick={close}>{t("إلغاء", "Cancel")}</Btn><Btn size="sm" variant="primary" onClick={isEdit ? submitEdit : submitItem} disabled={!f.name.trim() || busy}><Plus size={12} /> {isEdit ? t("حفظ", "Save") : t("إضافة", "Add")}</Btn></div>
              </div>
            </div>
          </div>
        );
      })()}

      {historyId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setHistoryId(null)} dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-gray-800">{t("تاريخ الأسعار", "Price History")}</h3><button onClick={() => setHistoryId(null)} className="text-gray-400"><XCircle size={18} /></button></div>
            {(((priceHistory as any[]) ?? []).length === 0) ? <p className="text-sm text-gray-400 py-6 text-center">{t("لا يوجد تاريخ أسعار", "No price history")}</p> : (
              <table className="w-full text-xs" dir="rtl">
                <thead className="text-gray-500"><tr><th className="text-right py-1.5">{t("المورد", "Supplier")}</th><th className="text-center py-1.5">{t("السعر", "Price")}</th><th className="text-center py-1.5">{t("التاريخ", "Date")}</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {((priceHistory as any[]) ?? []).map((r: any, ri: number) => (
                    <tr key={ri}><td className="py-1.5 font-medium text-gray-700">{r.supplierName ?? r.supplierId ?? "—"}</td><td className="py-1.5 text-center font-mono">{r.priceHalalas != null ? `${fmtAmt(r.priceHalalas / 100)} ${t("ر.س", "SAR")}` : "—"}</td><td className="py-1.5 text-center text-gray-400">{String(r.recordedAt ?? "").slice(0, 10)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
