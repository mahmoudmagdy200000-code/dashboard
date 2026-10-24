import { useState } from "react";
import { AlertTriangle, Bell, Plus, Smartphone, X } from "lucide-react";
import {
  useBranchEmployeesPlatform,
  useBranchOverviewPlatform,
  useAddBranchEmployeePlatform,
} from "../../../../../api/queries";
import { isApiError } from "../../../../../api/errors";
import { useLang } from "../../_shared/LangContext";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Btn } from "../../components/Btn";

// Roles that provision a real mobile login account on the backend.
export const CASHIER_ROLES = ["كاشير", "أمين صندوق", "cashier"];
export const isCashierRole = (role: string) =>
  CASHIER_ROLES.some((r) => r.toLowerCase() === role.trim().toLowerCase());

export function BranchEmployees({ }: PageProps) {
  const { t } = useLang();
  const { data: apiEmps = [] } = useBranchEmployeesPlatform();
  const { data: apiOverview } = useBranchOverviewPlatform();
  const addEmpMut = useAddBranchEmployeePlatform();
  const emps = ((apiEmps as any[]).length > 0 ? (apiEmps as any) : []) as any[];
  // The backend derives the branch from the manager's assignment; a manager created
  // without a branch (e.g. via CSV import) can't add employees (422 NO_BRANCH_ASSIGNED).
  // Detect it once the overview loads and block the flow with a clear message instead.
  const noBranch = !!apiOverview && !((apiOverview as any)?.branch?.id);
  const [showAdd, setShowAdd] = useState(false);
  // Cashiers are added from the mobile app by the branch manager — the dashboard
  // only creates non-cashier roles, and no longer collects an email.
  const emptyForm = { name: "", empNumber: "", role: "مشرف", salary: "", shift: "صباحي", phone: "" };
  const [form, setForm] = useState(emptyForm);
  const [addErr, setAddErr] = useState<string | null>(null);
  const canSubmit = form.name.trim() && form.empNumber.trim() && !addEmpMut.isPending;
  const submit = () => {
    if (!canSubmit) return;
    setAddErr(null);
    addEmpMut.mutate(
      {
        name: form.name.trim(),
        empNumber: form.empNumber.trim(),
        role: form.role,
        salaryHalalas: Math.round((parseFloat(form.salary) || 0) * 100),
        shift: form.shift,
        phone: form.phone.trim() || undefined,
      },
      {
        onSuccess: () => { setShowAdd(false); setForm(emptyForm); },
        onError: (e) => {
          // A cashier role should be impossible from the dropdown, but a cached
          // form / free-text role can still trip the 422 — show it inline.
          if (isApiError(e) && e.code === "CASHIER_MOBILE_ONLY") {
            setAddErr(e.messageAr || t("يُضاف الكاشير من تطبيق الموبايل بواسطة مدير الفرع.", "Cashiers are added from the mobile app by the branch manager."));
          } else {
            setAddErr(isApiError(e) ? (e.messageAr || e.message) : t("تعذّر إضافة الموظف", "Could not add the employee"));
          }
        },
      },
    );
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-gray-800">{t("الموظفون", "Employees")}</h2></div>
      {noBranch && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">{t("لم يتم تعيين فرع لحسابك بعد", "No branch is assigned to your account yet")}</p>
            <p className="text-xs text-amber-700 mt-0.5">{t("لا يمكن إضافة موظفين قبل أن يعيّن لك أدمن النظام فرعاً. تواصل مع الإدارة لتعيين الفرع.", "You can't add employees until a system admin assigns you a branch. Contact your administrator to set it.")}</p>
          </div>
        </div>
      )}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
              <h3 className="font-bold">{t("إضافة موظف", "Add Employee")}</h3>
              <button onClick={() => setShowAdd(false)} className="text-purple-200 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الاسم", "Name")} <span className="text-red-500">*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الرقم الوظيفي", "Emp. No.")} <span className="text-red-500">*</span></label><input value={form.empNumber} onChange={e => setForm(f => ({ ...f, empNumber: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الدور", "Role")}</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"><option>مشرف</option><option>عامل</option><option>محاسب</option><option>مسؤول مخزن</option></select></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الشفت", "Shift")}</label>
                  <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"><option>صباحي</option><option>مسائي</option><option>كامل</option></select></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الراتب (ر.س)", "Salary (SAR)")}</label><input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الهاتف", "Phone")}</label><input dir="ltr" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-start gap-2">
                <Bell size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-600">{t("يُضاف الكاشير من تطبيق الموبايل بواسطة مدير الفرع، ويظهر هنا للاطلاع فقط.", "Cashiers are added from the mobile app by the branch manager and appear here for reference only.")}</p>
              </div>
              {addErr && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-start gap-2">
                  <AlertTriangle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-600 font-medium">{addErr}</p>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <Btn onClick={() => setShowAdd(false)}>{t("إلغاء", "Cancel")}</Btn>
                <Btn variant="primary" disabled={!canSubmit} onClick={submit}><Plus size={13} /> {t("إضافة", "Add")}</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
      <Card title={(apiOverview as any)?.branch?.name ?? t("موظفو الفرع", "Branch Employees")}>
        {emps.length === 0 && !noBranch && <div className="px-5 py-8 text-center text-sm text-gray-400">{t("لا يوجد موظفون بعد", "No employees yet")}</div>}
        {emps.length > 0 && <table className="w-full" dir="rtl">
          <thead className="bg-gray-50"><tr className="text-xs text-gray-500 font-semibold"><th className="px-4 py-3 text-right">{t("الموظف", "Employee")}</th><th className="px-4 py-3 text-right">{t("الدور", "Role")}</th><th className="px-4 py-3 text-center">{t("الشفت", "Shift")}</th><th className="px-4 py-3 text-center">{t("الحالة", "Status")}</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {emps.map((e, i) => {
              // API shape: { name, role, shiftType, status, source,
              // workingShifts[], addedBy, addedAt } — cashiers come from the
              // mobile app (source "mobile") and carry their own shift windows.
              const isMobile = e.source === "mobile";
              const workingShifts = Array.isArray(e.workingShifts) ? e.workingShifts : [];
              const shift = e.shiftType ?? e.shift ?? "—";
              const active = (e.status ?? (e.active ? "active" : "")) === "active";
              return (
                <tr key={e.id ?? e.cashierId ?? i} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{(e.name || "?")[0]}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-gray-800">{e.name || "—"}</span>
                          {isMobile && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold inline-flex items-center gap-0.5"><Smartphone size={9} /> {t("من التطبيق", "From App")}</span>}
                        </div>
                        {(e.addedBy || e.addedAt) && <p className="text-[10px] text-gray-400 mt-0.5">{[e.addedBy, e.addedAt ? String(e.addedAt).slice(0, 10) : null].filter(Boolean).join(" · ")}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.role || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {workingShifts.length > 0
                      ? <div className="flex flex-col items-center gap-1">{workingShifts.map((w: any, wi: number) => (
                        <span key={w.id ?? wi} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-medium whitespace-nowrap">{w.name}{(w.startTime || w.endTime) ? ` · ${w.startTime ?? ""}–${w.endTime ?? ""}` : ""}</span>
                      ))}</div>
                      : <Badge className="bg-gray-50 text-gray-600">{shift}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-center"><Badge className={active ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"}>{active ? t("نشط", "Active") : t("إجازة", "On Leave")}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>}
      </Card>
    </div>
  );
}
