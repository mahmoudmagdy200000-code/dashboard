import { useState } from "react";
import {
  useAdminPackages,
  useCreateAdminPackage,
  useUpdateAdminPackage,
  useDeleteAdminPackage,
  type AdminPackage,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { Plus, Check, X } from "lucide-react";
import type { PageProps } from "../../_shared/types";

export function AdminPackages({ }: PageProps) {
  const { t } = useLang();
  const { data: packages = [], isLoading, isError } = useAdminPackages();
  const createMut = useCreateAdminPackage();
  const updateMut = useUpdateAdminPackage();
  const deleteMut = useDeleteAdminPackage();
  const [editing, setEditing] = useState<AdminPackage | "new" | null>(null);
  const emptyForm = { code: "", name: "", nameEn: "", priceSar: "", isActive: true };
  const [form, setForm] = useState(emptyForm);
  const busy = createMut.isPending || updateMut.isPending;

  const openNew = () => { setForm(emptyForm); setEditing("new"); };
  const openEdit = (p: AdminPackage) => {
    setForm({ code: p.code, name: p.name, nameEn: p.nameEn ?? "", priceSar: String((p.price ?? 0) / 100), isActive: p.isActive });
    setEditing(p);
  };
  const close = () => setEditing(null);
  // Price is stored in halalas (project convention); the form edits SAR.
  const save = () => {
    if (!form.code.trim() || !form.name.trim()) return;
    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      nameEn: form.nameEn.trim() || undefined,
      price: Math.round((parseFloat(form.priceSar) || 0) * 100),
      isActive: form.isActive,
    };
    if (editing === "new") createMut.mutate(body, { onSuccess: close });
    else if (editing) updateMut.mutate({ id: editing.id, ...body }, { onSuccess: close });
  };
  const remove = (p: AdminPackage) => {
    if (window.confirm(t(`حذف الباقة "${p.name}"؟`, `Delete package "${p.name}"?`))) deleteMut.mutate(p.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("الباقات", "Packages")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("باقات الاشتراك المتاحة عند إنشاء العلامات التجارية", "Subscription packages offered when creating brands")}</p>
        </div>
        <Btn variant="primary" onClick={openNew}><Plus size={14} /> {t("باقة جديدة", "New Package")}</Btn>
      </div>

      {isError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs">
          {t("تعذّر تحميل الباقات — تأكد أن الباك يدعم /admin/packages (قد لا يكون منشوراً بعد).", "Couldn't load packages — check that the backend exposes /admin/packages (it may not be deployed yet).")}
        </div>
      )}

      <Card title={`${t("الباقات", "Packages")} ${packages.length ? `(${packages.length})` : ""}`}>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t("جارٍ التحميل…", "Loading…")}</div>
        ) : packages.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t("لا توجد باقات بعد.", "No packages yet.")}</div>
        ) : (
          <table className="w-full" dir="rtl">
            <thead className="bg-gray-50"><tr className="text-xs text-gray-500 font-semibold">
              <th className="px-4 py-3 text-right">{t("الكود", "Code")}</th>
              <th className="px-4 py-3 text-right">{t("الاسم", "Name")}</th>
              <th className="px-4 py-3 text-center">{t("السعر (ر.س)", "Price (SAR)")}</th>
              <th className="px-4 py-3 text-center">{t("الحالة", "Status")}</th>
              <th className="px-4 py-3 text-center">{t("إجراءات", "Actions")}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {packages.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 rounded px-2 py-0.5 text-gray-600">{p.code}</span></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{p.name}{p.nameEn && <span className="text-gray-400 font-normal text-xs"> · {p.nameEn}</span>}</td>
                  <td className="px-4 py-3 text-center font-mono text-sm">{((p.price ?? 0) / 100).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => updateMut.mutate({ id: p.id, isActive: !p.isActive })} disabled={updateMut.isPending}>
                      <Badge className={p.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"}>{p.isActive ? t("نشطة", "Active") : t("موقوفة", "Inactive")}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Btn size="sm" onClick={() => openEdit(p)}>{t("تعديل", "Edit")}</Btn>
                      <Btn size="sm" variant="danger" onClick={() => remove(p)} disabled={deleteMut.isPending}>{t("حذف", "Delete")}</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
              <h3 className="font-bold">{editing === "new" ? t("إضافة باقة", "Add Package") : t("تعديل باقة", "Edit Package")}</h3>
              <button onClick={close} className="text-purple-200 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الكود", "Code")} <span className="text-red-500">*</span></label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} disabled={editing !== "new"} dir="ltr" placeholder="gold" className={`w-full text-sm border rounded-xl px-3 py-2.5 outline-none ${editing !== "new" ? "border-gray-100 bg-gray-50 text-gray-400" : "border-gray-200 focus:border-purple-400"}`} /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("السعر (ر.س)", "Price (SAR)")}</label>
                  <input type="number" value={form.priceSar} onChange={e => setForm(f => ({ ...f, priceSar: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الاسم (عربي)", "Name (Arabic)")} <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ذهبي" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الاسم (إنجليزي)", "Name (English)")}</label>
                  <input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} dir="ltr" placeholder="Gold" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-purple-600" />
                {t("باقة نشطة (تظهر عند إنشاء العلامات)", "Active (shown when creating brands)")}
              </label>
              <div className="flex gap-2 justify-end pt-1">
                <Btn onClick={close}>{t("إلغاء", "Cancel")}</Btn>
                <Btn variant="primary" disabled={!form.code.trim() || !form.name.trim() || busy} onClick={save}><Check size={13} /> {t("حفظ", "Save")}</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// T14.1 — platform-admin branch-creation review queue. A company-admin's
// add-branch creates a pending_review branch; approve flips it live, reject
