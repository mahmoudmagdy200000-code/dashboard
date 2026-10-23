import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  useBranchSettingsPlatform,
  useUpdateBranchSettingsPlatform,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";

export function BranchSettings({ navigate }: PageProps) {
  const { t } = useLang();
  const { data: apiSettings } = useBranchSettingsPlatform();
  const updateSettingsMut = useUpdateBranchSettingsPlatform();
  const [saved, setSaved] = useState(false);
  // Empty defaults — every value comes from GET /company/me/branch/settings, so the
  // form reflects real data and shows saved edits after a reload (no fake seed).
  const [form, setForm] = useState({
    branchName: "", manager: "",
    phone: "", address: "",
    openTime: "", closeTime: "", shiftDuration: "",
    taxNumber: "", bankAccount: "",
    cashLimit: "", wasteThreshold: "", autoReminders: false, requireImages: false
  });
  // branchName / phone / address are owned by the admin record now — the backend
  // ignores edits to them. Lock whatever it reports (default to those three).
  const readOnlyFields = new Set(apiSettings?.readOnlyFields ?? ["branchName", "phone", "address"]);
  // Seed EVERY field from the settings payload (read defensively — the contract is
  // loosely typed). Editable fields must be seeded too, or edits appear not to persist.
  useEffect(() => {
    if (!apiSettings) return;
    const s = apiSettings as any;
    const cashLimitSar = s.cashLimitHalalas != null ? String(Math.round(s.cashLimitHalalas / 100))
      : s.cashAlertThreshold != null ? String(s.cashAlertThreshold) : "";
    setForm(p => ({
      ...p,
      branchName: s.branchName ?? p.branchName,
      manager: s.manager ?? s.managerName ?? p.manager,
      phone: s.phone ?? p.phone,
      address: s.address ?? p.address,
      openTime: s.workingHours?.open ?? s.openTime ?? p.openTime,
      closeTime: s.workingHours?.close ?? s.closeTime ?? p.closeTime,
      shiftDuration: s.shiftDurationHours != null ? String(s.shiftDurationHours) : (s.shiftDuration ?? p.shiftDuration),
      taxNumber: s.taxNumber ?? s.vatNumber ?? p.taxNumber,
      bankAccount: s.bankAccount ?? s.iban ?? p.bankAccount,
      cashLimit: cashLimitSar || p.cashLimit,
      wasteThreshold: s.wasteThreshold != null ? String(s.wasteThreshold) : p.wasteThreshold,
      autoReminders: s.autoReminders ?? s.notificationPrefs?.newReminders ?? p.autoReminders,
      requireImages: s.requireImages ?? p.requireImages,
    }));
  }, [apiSettings]);
  // T12 §8 — shift timings are admin-owned (read-only); default locked.
  const shiftLocked = ((apiSettings as any)?.shiftConfig?.readOnly ?? true) as boolean;
  // PUT /company/me/branch/settings — only the editable fields (identity + shift
  // timings are silently ignored server-side, so we don't send them).
  const save = () => {
    // Only send fields that actually have a value — sending null for an empty text
    // field would wipe an existing value on the server. Toggles are always explicit.
    const patch: any = { autoReminders: form.autoReminders, requireImages: form.requireImages };
    if (form.manager.trim()) patch.manager = form.manager.trim();
    if (form.taxNumber.trim()) patch.taxNumber = form.taxNumber.trim();
    if (form.bankAccount.trim()) patch.bankAccount = form.bankAccount.trim();
    if (form.wasteThreshold !== "") patch.wasteThreshold = Number(form.wasteThreshold);
    if (form.cashLimit !== "") patch.cashLimitHalalas = Math.round((parseFloat(form.cashLimit) || 0) * 100);
    updateSettingsMut.mutate(patch, { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("إعدادات الفرع", "Branch Settings")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{form.branchName}</p>
        </div>
        <Btn variant="success" onClick={save}><CheckCircle2 size={14} /> {saved ? `✅ ${t("تم الحفظ", "Saved")}` : t("حفظ الإعدادات", "Save Settings")}</Btn>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Card title={`📋 ${t("البيانات الأساسية", "Basic Information")}`}>
          <div className="p-4 space-y-3">
            {[{ label: t("اسم الفرع", "Branch Name"), field: "branchName" }, { label: t("مدير الفرع", "Branch Manager"), field: "manager" }, { label: t("رقم الهاتف", "Phone"), field: "phone" }, { label: t("العنوان", "Address"), field: "address" }].map(({ label, field }) => {
              const locked = readOnlyFields.has(field);
              return (
                <div key={field}>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">{label}{locked && <span className="text-gray-300 font-normal"> · {t("من إدارة النظام", "set by admin")}</span>}</label>
                  <input value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} disabled={locked}
                    className={`w-full text-sm border rounded-lg px-3 py-2 outline-none ${locked ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 focus:border-purple-300"}`} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card title={`⏰ ${t("أوقات العمل والشفتات", "Working Hours & Shifts")}`}>
          <div className="p-4 space-y-3">
            {[{ label: t("وقت الفتح", "Opening Time"), field: "openTime", type: "time" }, { label: t("وقت الإغلاق", "Closing Time"), field: "closeTime", type: "time" }, { label: t("مدة الشفت (ساعات)", "Shift Duration (hrs)"), field: "shiftDuration", type: "number" }].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">{label}{shiftLocked && <span className="text-gray-300 font-normal"> · {t("من إدارة النظام", "set by admin")}</span>}</label>
                <input type={type} value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} disabled={shiftLocked}
                  className={`w-full text-sm border rounded-lg px-3 py-2 outline-none ${shiftLocked ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 focus:border-purple-300"}`} />
              </div>
            ))}
            {(() => {
              const openH = parseInt(form.openTime), closeH = parseInt(form.closeTime), dur = parseInt(form.shiftDuration);
              if (!Number.isFinite(openH) || !Number.isFinite(closeH)) return null;
              const hrs = closeH - openH;
              return (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-700 font-medium">⏱ {t("ساعات العمل اليومية:", "Daily working hours:")} <strong>{hrs} {t("ساعة", "hrs")}</strong>{Number.isFinite(dur) && dur > 0 ? ` · ${Math.floor(hrs / dur)} ${t("شفتات", "shifts")}` : ""}</p>
                </div>
              );
            })()}
          </div>
        </Card>
        <Card title={`💳 ${t("البيانات المالية والضريبية", "Financial & Tax Information")}`}>
          <div className="p-4 space-y-3">
            {[{ label: t("الرقم الضريبي", "Tax Number"), field: "taxNumber" }, { label: t("رقم الحساب البنكي (IBAN)", "Bank Account (IBAN)"), field: "bankAccount" }, { label: t("سقف العهدة النقدية (ر.س)", "Cash Limit (SAR)"), field: "cashLimit", type: "number" }].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">{label}</label>
                <input type={type || "text"} value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300 font-mono" dir="ltr" />
              </div>
            ))}
          </div>
        </Card>
        <Card title={`⚙️ ${t("خيارات التشغيل", "Operation Options")}`}>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("حد التنبيه للهدر (%)", "Waste Alert Threshold (%)")}</label>
              <input type="number" value={form.wasteThreshold} onChange={e => setForm(p => ({ ...p, wasteThreshold: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" />
            </div>
            <div className="space-y-3">
              {[{ label: t("إرسال التذكيرات تلقائياً", "Send Reminders Automatically"), field: "autoReminders", desc: t("إرسال تذكير للمحاسب عند غياب تقرير الفرع", "Send a reminder to the accountant when a branch report is missing") },
              { label: t("إلزامية إرفاق الصور", "Require Photo Attachments"), field: "requireImages", desc: t("يجب إرفاق صور مع كل عملية مشتريات أو هدر", "Photos must be attached with every purchase or waste entry") }].map(({ label, field, desc }) => (
                <div key={field} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="pt-0.5">
                    <button onClick={() => setForm(p => ({ ...p, [field]: !(p as any)[field] }))}
                      className={`w-10 h-5 rounded-full transition-all ${(form as any)[field] ? "bg-purple-500" : "bg-gray-300"}`}>
                      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${(form as any)[field] ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
