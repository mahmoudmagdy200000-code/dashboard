import { useState } from "react";
import { FileText, Plus, Truck, TrendingUp, Star, Edit2, XCircle } from "lucide-react";
import {
  useProcurementSuppliersPlatform,
  useLookup,
  useExportSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useRateSupplier,
  useToggleSupplierActive,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { KpiCard } from "../../components/KpiCard";
import { Badge } from "../../components/Badge";
import { Btn } from "../../components/Btn";

export function ProcSuppliers({ }: PageProps) {
  const { data: apiSuppliers } = useProcurementSuppliersPlatform();
  const { t } = useLang();
  const { data: catLookup } = useLookup("supplier-categories");
  const exportSuppliersMut = useExportSuppliers();
  const createSupplierMut = useCreateSupplier();
  const updateSupplierMut = useUpdateSupplier();
  const rateMut = useRateSupplier();
  const toggleMut = useToggleSupplierActive();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", contactName: "", phone: "", email: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", category: "", contactName: "", phone: "", email: "" });
  const [rateFor, setRateFor] = useState<{ id: string; name: string } | null>(null);
  const [rateValue, setRateValue] = useState(5);
  const [rateComment, setRateComment] = useState("");
  const categories = (((catLookup as any)?.data ?? catLookup ?? []) as any[]);
  const catLabel = (c: any) => c.labelAr ?? c.label ?? c.name ?? c.value ?? c.key ?? "";
  const catValue = (c: any) => c.value ?? c.key ?? c.id ?? catLabel(c);
  const starsOf = (sup: any) => { const a = sup.ratingAvg; return a != null ? a / 10 : (sup.rating ?? 0); };
  const isActiveOf = (sup: any) => sup.isActive ?? (sup.status === "نشط" || sup.status === "active" || sup.status === undefined);
  const contactOf = (sup: any) => sup.contactName ?? sup.contact ?? sup.contactPhone ?? "";

  const submitSupplier = () => {
    if (!form.name.trim()) return;
    createSupplierMut.mutate(
      { name: form.name, category: form.category, contactName: form.contactName, contactPhone: form.phone, contactEmail: form.email || undefined } as any,
      { onSuccess: () => { setShowAdd(false); setForm({ name: "", category: "", contactName: "", phone: "", email: "" }); } },
    );
  };
  const openEdit = (sup: any) => { setEditId(sup.id); setEditForm({ name: sup.name ?? "", category: sup.category ?? "", contactName: contactOf(sup), phone: sup.contactPhone ?? "", email: sup.contactEmail ?? "" }); };
  const submitEdit = () => {
    if (!editId || !editForm.name.trim()) return;
    updateSupplierMut.mutate(
      { id: editId, name: editForm.name, category: editForm.category, contactName: editForm.contactName, contactPhone: editForm.phone, contactEmail: editForm.email || undefined } as any,
      { onSuccess: () => setEditId(null) },
    );
  };
  const submitRate = () => {
    if (!rateFor) return;
    rateMut.mutate({ id: rateFor.id, rating: rateValue, comment: rateComment || undefined } as any,
      { onSuccess: () => { setRateFor(null); setRateComment(""); setRateValue(5); } });
  };

  // Suppliers come from the platform API ({data, meta.kpis}); empty until returned.
  const suppliers = ((apiSuppliers?.data ?? []) as any[]);
  const supKpis = (apiSuppliers as any)?.meta?.kpis;  // T11.13 — activeSuppliers/totalPurchases/avgRating

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الموردون", "Suppliers")}</h2><p className="text-gray-400 text-sm mt-0.5">{suppliers.length} {t("مورد", "suppliers")}</p></div>
        <div className="flex gap-2">
          <button onClick={() => exportSuppliersMut.mutate("xlsx")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11} /> Excel</button>
          <Btn variant="primary" onClick={() => setShowAdd(true)}><Plus size={13} /> {t("إضافة مورد", "Add Supplier")}</Btn>
        </div>
      </div>
      {supKpis && (
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label={t("موردون نشطون", "Active Suppliers")} value={String(supKpis.activeSuppliers ?? 0)} sub="" icon={<Truck size={18} className="text-emerald-600" />} accent="emerald" />
          <KpiCard label={t("إجمالي المشتريات", "Total Purchases")} value={`${fmtAmt(supKpis.totalPurchases ?? 0)} ${t("ر.س", "SAR")}`} sub="" icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" />
          <KpiCard label={t("متوسط التقييم", "Avg Rating")} value={`${(supKpis.avgRating ?? 0).toFixed(1)} ★`} sub={t("من 5", "of 5")} icon={<Star size={18} className="text-amber-600" />} accent="amber" />
        </div>
      )}
      {suppliers.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا يوجد موردون", "No suppliers")}</div>}
      <div className="grid grid-cols-2 gap-4">
        {suppliers.map((sup, i) => {
          const active = isActiveOf(sup);
          const stars = starsOf(sup);
          return (
            <div key={sup.id ?? i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{(sup.name ?? "?")[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800 text-sm truncate">{sup.name}</p>
                      <Badge className={active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>{active ? t("نشط", "Active") : t("موقوف", "Suspended")}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{sup.category ?? "—"}{contactOf(sup) ? ` · ${contactOf(sup)}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} fill={s <= Math.round(stars) ? "#F59E0B" : "none"} className={s <= Math.round(stars) ? "text-amber-400" : "text-gray-200"} />)}
                    <span className="text-[10px] text-gray-500 mr-1">{stars.toFixed(1)}</span>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <Btn size="sm" variant="ghost" className="flex-1" onClick={() => { setRateFor({ id: sup.id, name: sup.name }); setRateValue(Math.round(stars) || 5); }}><Star size={11} /> {t("تقييم", "Rate")}</Btn>
                  <Btn size="sm" variant="ghost" className="flex-1" onClick={() => openEdit(sup)}><Edit2 size={11} /> {t("تعديل", "Edit")}</Btn>
                  <Btn size="sm" className="flex-1" disabled={toggleMut.isPending} onClick={() => toggleMut.mutate(sup.id)}>{active ? t("إخفاء", "Suspend") : t("تفعيل", "Activate")}</Btn>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rateFor && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setRateFor(null)} dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-gray-800">{t("تقييم", "Rate")} {rateFor.name}</h3><button onClick={() => setRateFor(null)} className="text-gray-400"><XCircle size={18} /></button></div>
            <div className="flex items-center justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => setRateValue(s)}><Star size={28} fill={s <= rateValue ? "#F59E0B" : "none"} className={s <= rateValue ? "text-amber-400" : "text-gray-200"} /></button>)}
            </div>
            <textarea value={rateComment} onChange={e => setRateComment(e.target.value)} placeholder={t("تعليق (اختياري)...", "Comment (optional)...")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300 h-20 resize-none" />
            <div className="flex gap-2 justify-end pt-3"><Btn size="sm" onClick={() => setRateFor(null)}>{t("إلغاء", "Cancel")}</Btn><Btn size="sm" variant="primary" onClick={submitRate} disabled={rateMut.isPending}><Star size={12} /> {t("حفظ التقييم", "Save Rating")}</Btn></div>
          </div>
        </div>
      )}

      {(showAdd || editId) && (() => {
        const isEdit = !!editId; const f = isEdit ? editForm : form; const setF = isEdit ? setEditForm : setForm; const close = () => isEdit ? setEditId(null) : setShowAdd(false); const busy = isEdit ? updateSupplierMut.isPending : createSupplierMut.isPending; return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={close} dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{isEdit ? t("تعديل مورد", "Edit Supplier") : t("إضافة مورد", "Add Supplier")}</h3><button onClick={close} className="text-gray-400"><XCircle size={18} /></button></div>
              <div className="space-y-3">
                <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("اسم المورد", "Supplier Name")}</label><input value={f.name} onChange={e => setF(v => ({ ...v, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفئة", "Category")}</label>
                  {categories.length > 0 ? (
                    <select value={f.category} onChange={e => setF(v => ({ ...v, category: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300 bg-white">
                      <option value="">{t("— اختر —", "— Select —")}</option>
                      {categories.map((c: any, ci: number) => <option key={ci} value={catValue(c)}>{catLabel(c)}</option>)}
                    </select>
                  ) : (
                    <input value={f.category} onChange={e => setF(v => ({ ...v, category: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" />
                  )}
                </div>
                <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("اسم جهة الاتصال", "Contact Name")}</label><input value={f.contactName} onChange={e => setF(v => ({ ...v, contactName: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الجوال", "Phone")}</label><input value={f.phone} onChange={e => setF(v => ({ ...v, phone: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("البريد (اختياري)", "Email (optional)")}</label><input value={f.email} onChange={e => setF(v => ({ ...v, email: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                </div>
                <div className="flex gap-2 justify-end pt-1"><Btn size="sm" onClick={close}>{t("إلغاء", "Cancel")}</Btn><Btn size="sm" variant="primary" onClick={isEdit ? submitEdit : submitSupplier} disabled={!f.name.trim() || busy}><Plus size={12} /> {isEdit ? t("حفظ", "Save") : t("إضافة", "Add")}</Btn></div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
