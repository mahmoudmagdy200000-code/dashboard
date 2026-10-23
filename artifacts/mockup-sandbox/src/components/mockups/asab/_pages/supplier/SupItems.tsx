import { useState } from "react";
import { Download, Upload, FileText, Plus, ToggleRight, ToggleLeft, Edit2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useSupplierItems,
  useExportSupplierItems,
  useImportSupplierItems,
  useSupplierItemsTemplate,
  useCreateSupplierItem,
  useUpdateSupplierItem,
  useDeleteSupplierItem,
  useToggleSupplierItemActive,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Badge } from "../../components/Badge";
import { Btn } from "../../components/Btn";

// T13 §7-12 — supplier catalog CRUD. Prices are integer halalas end-to-end:
// display priceHalalas÷100, and submit priceHalalas = SAR×100.
export function SupItems({ }: PageProps) {
  const { data: apiItems } = useSupplierItems();
  const { t } = useLang();
  const exportSupItemsMut = useExportSupplierItems();
  const importSupItemsMut = useImportSupplierItems();
  const supTemplateMut = useSupplierItemsTemplate();
  const createItemMut = useCreateSupplierItem();
  const updateItemMut = useUpdateSupplierItem();
  const deleteItemMut = useDeleteSupplierItem();
  const toggleItemMut = useToggleSupplierItemActive();
  const items = (Array.isArray(apiItems) ? apiItems : []) as any[];
  // Prefer the server's riyal field; fall back to halalas÷100 for older payloads.
  const priceSar = (it: any) => { if (it.priceSar != null) return it.priceSar; const h = it.priceHalalas ?? it.price; return h != null ? h / 100 : null; };
  const isAvailable = (it: any) => it.available ?? (it.status === "active");
  const blank = { name: "", code: "", unit: "", minQty: "", maxQty: "", price: "", leadTimeDays: "", available: true };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(blank);
  // 409 SUPPLIER_RECORD_AMBIGUOUS → the supplier login maps to >1 record; let the
  // user pick which supplierId to attach the item to, then resubmit.
  const [ambigSuppliers, setAmbigSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [pickedSupplierId, setPickedSupplierId] = useState("");
  const supWarnLabel = (w: string): string => ({
    ITEM_NAME_TAKEN: t("اسم الصنف مستخدم من قبل", "Item name already taken"),
    NO_BRANCH_AVAILABILITY: t("لا توجد فروع متاحة لعرض الصنف في التطبيق", "No branches available to show the item in the app"),
    NO_MOBILE_SUPPLIER_LOGIN: t("المورد ليس له حساب دخول على التطبيق — الصنف لن يظهر لموظف المشتريات", "Supplier has no mobile login — the item won't appear for the procurement officer"),
  } as Record<string, string>)[w] ?? w;
  // Build the write body from a form; only send priceHalalas when a price is typed.
  const bodyOf = (f: typeof blank) => ({
    name: f.name.trim(),
    code: f.code.trim() || undefined,
    unit: f.unit.trim() || undefined,
    minQty: f.minQty !== "" ? Number(f.minQty) : undefined,
    maxQty: f.maxQty !== "" ? Number(f.maxQty) : undefined,
    // Field is «السعر (ر.س)» → send riyals via priceSar (backend converts to halalas).
    priceSar: f.price !== "" ? (parseFloat(f.price) || 0) : undefined,
    leadTimeDays: f.leadTimeDays !== "" ? Number(f.leadTimeDays) : undefined,
    available: f.available,
  });
  const submitItem = () => {
    if (!form.name.trim()) return;
    const body: any = bodyOf(form);
    if (pickedSupplierId) body.supplierId = pickedSupplierId;
    createItemMut.mutate(body, {
      onSuccess: (created: any) => {
        setShowAdd(false); setForm(blank); setAmbigSuppliers([]); setPickedSupplierId("");
        // BUG-9 bridge visibility: the item is saved, but tell the supplier whether
        // it actually reached the procurement app + surface any soft warnings.
        if (created?.publishedToApp === false)
          toast.warning(t("تم الحفظ لكن الصنف لسه مش ظاهر في تطبيق المشتريات", "Saved, but the item isn't visible in the procurement app yet"));
        (Array.isArray(created?.warnings) ? created.warnings : []).forEach((w: string) => toast.warning(supWarnLabel(w)));
      },
      onError: (e: any) => {
        if (e?.code === "SUPPLIER_RECORD_AMBIGUOUS") {
          const cands = (e?.details?.suppliers ?? e?.details?.candidates ?? []) as any[];
          setAmbigSuppliers(cands.map((c: any) => ({ id: c.id ?? c.supplierId, name: c.name ?? c.supplierName ?? c.id })).filter((c: any) => c.id));
          toast.info(t("فيه أكتر من سجل مورد مرتبط بحسابك — اختر المورد وأعد الإضافة", "Multiple supplier records match your account — pick one and add again"));
        }
        // Other errors are toasted by the mutation hook itself.
      },
    });
  };
  const openEdit = (it: any) => { setEditId(it.id); setEditForm({ name: it.name ?? "", code: it.code ?? "", unit: it.unit ?? "", minQty: it.minQty != null ? String(it.minQty) : "", maxQty: it.maxQty != null ? String(it.maxQty) : "", price: priceSar(it) != null ? String(priceSar(it)) : "", leadTimeDays: it.leadTimeDays != null ? String(it.leadTimeDays) : "", available: isAvailable(it) }); };
  const submitEdit = () => {
    if (!editId || !editForm.name.trim()) return;
    updateItemMut.mutate({ id: editId, ...bodyOf(editForm) } as any, { onSuccess: () => setEditId(null) });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("قائمة الأصناف", "Item List")}</h2><p className="text-gray-400 text-sm mt-0.5">{items.length} {t("صنف", "items")} · {t("المنتجات التي يوفرها المورد", "Products offered by this supplier")}</p></div>
        <div className="flex gap-2">
          <button onClick={() => supTemplateMut.mutate("xlsx")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold hover:bg-gray-100"><Download size={11} /> {t("نموذج", "Template")}</button>
          <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${importSupItemsMut.isPending ? "bg-purple-100 text-purple-400 border-purple-100" : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"}`}>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={importSupItemsMut.isPending}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importSupItemsMut.mutate(f); }} />
            <Upload size={11} /> {importSupItemsMut.isPending ? t("جارٍ…", "…") : t("رفع Excel", "Import Excel")}
          </label>
          <button onClick={() => exportSupItemsMut.mutate("xlsx")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11} /> {t("تصدير", "Export")}</button>
          <Btn variant="primary" onClick={() => { setForm(blank); setShowAdd(true); }}><Plus size={13} /> {t("إضافة صنف", "Add Item")}</Btn>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs text-gray-500">
              <th className="px-4 py-3 text-right">{t("الصنف", "Item")}</th>
              <th className="px-4 py-3 text-center">{t("الرمز", "Code")}</th>
              <th className="px-4 py-3 text-center">{t("الوحدة", "Unit")}</th>
              <th className="px-4 py-3 text-center">{t("الحد الأدنى", "Min Qty")}</th>
              <th className="px-4 py-3 text-center">{t("الحد الأقصى", "Max Qty")}</th>
              <th className="px-4 py-3 text-center">{t("السعر (ر.س)", "Price (SAR)")}</th>
              <th className="px-4 py-3 text-center">{t("مدة التحضير", "Lead Time")}</th>
              <th className="px-4 py-3 text-center">{t("الحالة", "Status")}</th>
              <th className="px-4 py-3 text-center">{t("إجراءات", "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">{t("لا توجد أصناف", "No items")}</td></tr>}
            {items.map((item, i) => {
              const p = priceSar(item); const av = isAvailable(item); return (
                <tr key={item.id ?? i} className="border-b border-gray-50 hover:bg-gray-50/60 last:border-0">
                  <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                  <td className="px-4 py-3 text-center font-mono text-[11px] text-gray-400">{item.code ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.unit ?? "—"}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.minQty ?? "—"}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.maxQty ?? "—"}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-purple-700">{p != null ? fmtAmt(p) : "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">{item.leadTimeDays != null ? `${item.leadTimeDays} ${t("يوم", "d")}` : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={av ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>{av ? t("نشط", "Active") : t("موقوف", "Inactive")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => toggleItemMut.mutate(item.id)} disabled={toggleItemMut.isPending} title={av ? t("إيقاف", "Deactivate") : t("تفعيل", "Activate")} className={av ? "text-emerald-600 hover:text-emerald-800" : "text-gray-400 hover:text-gray-600"}>{av ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}</button>
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
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("اسم الصنف", "Item Name")}</label><input value={f.name} onChange={e => setF(v => ({ ...v, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الرمز (اختياري)", "Code (optional)")}</label><input value={f.code} onChange={e => setF(v => ({ ...v, code: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الوحدة", "Unit")}</label><input value={f.unit} onChange={e => setF(v => ({ ...v, unit: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("السعر (ر.س)", "Price (SAR)")}</label><input type="number" value={f.price} onChange={e => setF(v => ({ ...v, price: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحد الأدنى", "Min Qty")}</label><input type="number" value={f.minQty} onChange={e => setF(v => ({ ...v, minQty: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحد الأقصى", "Max Qty")}</label><input type="number" value={f.maxQty} onChange={e => setF(v => ({ ...v, maxQty: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("مدة التحضير (يوم)", "Lead Time (days)")}</label><input type="number" value={f.leadTimeDays} onChange={e => setF(v => ({ ...v, leadTimeDays: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div className="flex items-end gap-2"><label className="text-[11px] font-semibold text-gray-500">{t("متاح", "Available")}</label><input type="checkbox" checked={f.available} onChange={e => setF(v => ({ ...v, available: e.target.checked }))} className="w-4 h-4 mb-2" /></div>
                </div>
                {!isEdit && ambigSuppliers.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1.5">
                    <p className="text-[11px] font-bold text-amber-800">{t("اختر سجل المورد", "Choose supplier record")}</p>
                    <select value={pickedSupplierId} onChange={e => setPickedSupplierId(e.target.value)} className="w-full text-sm border border-amber-200 rounded-lg px-2 py-2 bg-white outline-none">
                      <option value="">{t("— اختر —", "— select —")}</option>
                      {ambigSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-1"><Btn size="sm" onClick={close}>{t("إلغاء", "Cancel")}</Btn><Btn size="sm" variant="primary" onClick={isEdit ? submitEdit : submitItem} disabled={!f.name.trim() || busy || (!isEdit && ambigSuppliers.length > 0 && !pickedSupplierId)}><Plus size={12} /> {isEdit ? t("حفظ", "Save") : t("إضافة", "Add")}</Btn></div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
