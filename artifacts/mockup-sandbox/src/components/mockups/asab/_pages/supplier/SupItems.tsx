import { SupplierQueryState } from "./SupplierFeedback";
import { Dialog, DialogContent, DialogTitle } from "../../../../ui/dialog";
import { useState, useRef } from "react";
import { Download, Upload, FileText, Plus, ToggleRight, ToggleLeft, Edit2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useSupplierItems,
  buildSupplierItemBody, supplierRecordChoices, runSupplierMutation,
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
  const query = useSupplierItems();
  const apiItems = query.data;
  const { t, dir } = useLang();
  const mutationLock = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [formError, setFormError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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
  const busy = createItemMut.isPending || updateItemMut.isPending || importSupItemsMut.isPending || toggleItemMut.isPending || deleteItemMut.isPending;
  const recordError = (error: unknown) => {
    const ids = supplierRecordChoices(error);
    if (ids.length) { setPickedSupplierId(""); setAmbigSuppliers(ids.map(id => ({ id, name: id }))); }
  };
  const submitItem = () => {
    if (mutationLock.current) return;
    try {
      const body = { ...buildSupplierItemBody(form), ...(pickedSupplierId ? { supplierId: pickedSupplierId } : {}) };
      setFormError("");
      void runSupplierMutation(mutationLock, async () => {
        const created = await createItemMut.mutateAsync(body);
        setShowAdd(false); setForm(blank); setAmbigSuppliers([]); setPickedSupplierId("");
        if ((created as any)?.publishedToApp === false)
          toast.warning(t("تم الحفظ لكن الصنف غير ظاهر في تطبيق المشتريات بعد", "Saved, but the item is not visible in the procurement app yet"));
        ((created as any)?.warnings ?? []).forEach((w: string) => toast.warning(supWarnLabel(w)));
      }).catch(recordError);
    } catch (error) { setFormError(t("راجع الاسم والسعر (منزلتان كحد أقصى) وحدود الكميات الصحيحة.", (error as Error).message)); }
  };
  const openEdit = (it: any) => {
    returnFocus.current = document.activeElement as HTMLElement;
    setFormError(""); setEditId(it.id);
    setEditForm({ name: it.name ?? "", code: it.code ?? "", unit: it.unit ?? "", minQty: it.minQty != null ? String(it.minQty) : "", maxQty: it.maxQty != null ? String(it.maxQty) : "", price: priceSar(it) != null ? String(priceSar(it)) : "", leadTimeDays: it.leadTimeDays != null ? String(it.leadTimeDays) : "", available: isAvailable(it) });
  };
  const submitEdit = () => {
    if (!editId || mutationLock.current) return;
    try {
      const body = { id: editId, ...buildSupplierItemBody(editForm), ...(pickedSupplierId ? { supplierId: pickedSupplierId } : {}) };
      setFormError("");
      void runSupplierMutation(mutationLock, async () => { await updateItemMut.mutateAsync(body); setEditId(null); }).catch(recordError);
    } catch (error) { setFormError(t("راجع الاسم والسعر وحدود الكميات الصحيحة.", (error as Error).message)); }
  };
  const importFile = (file: File) => {
    if (mutationLock.current) return;
    setPendingFile(file);
    void runSupplierMutation(mutationLock, async () => {
      await importSupItemsMut.mutateAsync({ file, supplierId: pickedSupplierId || undefined });
      setPendingFile(null);
    }).catch(recordError);
  };
  const recordPicker = ambigSuppliers.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
    <label htmlFor="supplier-record">{t("اختر معرّف سجل المورد الذي أعاده الخادم", "Choose a supplier record ID returned by the server")}</label>
    <select id="supplier-record" value={pickedSupplierId} onChange={e => setPickedSupplierId(e.target.value)} disabled={busy} className="w-full border rounded-lg p-2">
      <option value="">{t("— اختر —", "— select —")}</option>
      {ambigSuppliers.map(record => <option key={record.id} value={record.id}>{record.id}</option>)}
    </select>
    <p className="text-xs">{t("لم يوفر الخادم أسماء السجلات أو ارتباط كل صنف بها؛ لا يُختار سجل تلقائيًا.", "The server does not supply record names or each item's record link; no record is selected automatically.")}</p>
  </div>;
  if (query.isPending || query.isError) return <SupplierQueryState query={query} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("قائمة الأصناف", "Item List")}</h2><p className="text-gray-400 text-sm mt-0.5">{items.length} {t("صنف", "items")} · {t("المنتجات التي يوفرها المورد", "Products offered by this supplier")}</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => supTemplateMut.mutate("xlsx")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold hover:bg-gray-100"><Download size={11} /> {t("نموذج", "Template")}</button>
          <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${importSupItemsMut.isPending ? "bg-purple-100 text-purple-400 border-purple-100" : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"}`}>
            <input type="file" accept=".xlsx,.xls,.csv" aria-label={t("استيراد أصناف المورد", "Import supplier items")} className="sr-only" disabled={busy}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importFile(f); }} />
            <Upload size={11} /> {importSupItemsMut.isPending ? t("جارٍ…", "…") : t("رفع Excel", "Import Excel")}
          </label>
          <button onClick={() => exportSupItemsMut.mutate("xlsx")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11} /> {t("تصدير", "Export")}</button>
          <Btn variant="primary" disabled={busy} onClick={() => { returnFocus.current = document.activeElement as HTMLElement; setFormError(""); setForm(blank); setShowAdd(true); }}><Plus size={13} /> {t("إضافة صنف", "Add Item")}</Btn>
        </div>
      </div>
      {!showAdd && !editId && recordPicker}
      {pendingFile && ambigSuppliers.length > 0 && <Btn disabled={busy || !pickedSupplierId} onClick={() => importFile(pendingFile)}>{t("إعادة استيراد الملف المحفوظ", "Retry retained import")}</Btn>}
      <p className="text-xs text-gray-500">{t("أسعار الكتالوج قبل الضريبة؛ تفاصيل ضريبة الطلب والفاتورة تتطلب عقد الخادم.", "Catalog prices exclude VAT; order and invoice VAT breakdown requires the Backend contract.")}</p>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm" dir={dir}>
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
                      <button onClick={() => { void runSupplierMutation(mutationLock, () => toggleItemMut.mutateAsync(item.id)).catch(() => {}); }} disabled={busy} aria-label={av ? t("إيقاف الصنف", "Deactivate item") : t("تفعيل الصنف", "Activate item")} title={av ? t("إيقاف", "Deactivate") : t("تفعيل", "Activate")} className={av ? "min-w-11 min-h-11 text-emerald-600 hover:text-emerald-800" : "min-w-11 min-h-11 text-gray-400 hover:text-gray-600"}>{av ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}</button>
                      <button disabled={busy} onClick={() => openEdit(item)} aria-label={t("تعديل الصنف", "Edit item")} title={t("تعديل", "Edit")} className="min-w-11 min-h-11 text-gray-500 hover:text-gray-800"><Edit2 size={14} /></button>
                      <button onClick={() => { if (window.confirm(t("حذف الصنف؟", "Delete item?"))) void runSupplierMutation(mutationLock, () => deleteItemMut.mutateAsync(item.id)).catch(() => {}); }} disabled={busy} aria-label={t("حذف الصنف", "Delete item")} title={t("حذف", "Delete")} className="min-w-11 min-h-11 text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Dialog open={showAdd || !!editId} onOpenChange={open => { if (!open && !mutationLock.current) { setShowAdd(false); setEditId(null); } }}>
        <DialogContent dir={dir} aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto"
          onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}>
          <DialogTitle>{editId ? t("تعديل صنف", "Edit item") : t("إضافة صنف", "Add item")}</DialogTitle>
          <form onSubmit={event => { event.preventDefault(); if (editId) submitEdit(); else submitItem(); }} className="space-y-3">
            <fieldset disabled={busy} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["name", "code", "unit", "price", "minQty", "maxQty", "leadTimeDays"] as const).map(field => {
                const labels = { name: t("اسم الصنف", "Item name"), code: t("الرمز", "Code"), unit: t("الوحدة", "Unit"), price: t("السعر قبل الضريبة (ر.س)", "Price excl. VAT (SAR)"), minQty: t("الحد الأدنى", "Minimum quantity"), maxQty: t("الحد الأقصى", "Maximum quantity"), leadTimeDays: t("مدة التحضير (يوم)", "Lead time (days)") };
                const f = editId ? editForm : form, setF = editId ? setEditForm : setForm;
                const numeric = ["price", "minQty", "maxQty", "leadTimeDays"].includes(field);
                return <div key={field}><label htmlFor={`supplier-item-${field}`}>{labels[field]}</label>
                  <input id={`supplier-item-${field}`} value={f[field]} required={field === "name" || field === "price"} type={numeric ? "number" : "text"}
                    min={numeric ? 0 : undefined} step={field === "price" ? "0.01" : numeric ? "1" : undefined}
                    maxLength={field === "name" ? 200 : field === "code" ? 32 : field === "unit" ? 16 : undefined}
                    onChange={e => setF(previous => ({ ...previous, [field]: e.target.value }))} className="w-full rounded-lg border p-2" /></div>;
              })}
              <label><input type="checkbox" checked={(editId ? editForm : form).available} onChange={e => (editId ? setEditForm : setForm)(previous => ({ ...previous, available: e.target.checked }))} /> {t("متاح", "Available")}</label>
            </fieldset>
            {recordPicker}
            {formError && <p role="alert">{formError}</p>}
            {(createItemMut.isError || updateItemMut.isError) && <p role="alert">{t("لم يُحفظ التغيير. المسودة محفوظة.", "Change was not saved. The draft is retained.")}</p>}
            <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => { setShowAdd(false); setEditId(null); }} className="min-h-11 border rounded-lg px-3">{t("إلغاء", "Cancel")}</button>
              <button type="submit" disabled={busy || (ambigSuppliers.length > 0 && !pickedSupplierId)} className="min-h-11 rounded-lg bg-purple-700 text-white px-4">{t("حفظ", "Save")}</button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
