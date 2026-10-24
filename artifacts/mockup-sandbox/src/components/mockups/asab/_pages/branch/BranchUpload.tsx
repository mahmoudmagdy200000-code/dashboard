import { useState } from "react";
import { TrendingUp, Package, Wallet, CheckCircle2, Send, Upload, Paperclip } from "lucide-react";
import { toast } from "sonner";
import {
  useBranchUploadStatusPlatform,
  useBranchUpload,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import type { PageProps } from "../../_shared/types";
import { Btn } from "../../components/Btn";

export function BranchUpload({ }: PageProps) {
  const { t, dir } = useLang();
  const { data: apiUploadStatus } = useBranchUploadStatusPlatform();
  // Real submit — POST /company/me/branch/upload — the same endpoint the company
  // branch surface uses. Each submit creates an operation routed to the branch's
  // accountant, who reviews it before forwarding to the head accountant.
  const uploadMut = useBranchUpload();
  const SAR = t("ر.س", "SAR");
  const today = new Date().toISOString().slice(0, 10);

  const [salesAmt, setSalesAmt] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [shift, setShift] = useState("morning");
  const [expenseNote, setExpenseNote] = useState("");
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [invFile, setInvFile] = useState<File | null>(null);
  // Report types submitted this session — drives the "sent" acknowledgment.
  const [sent, setSent] = useState<Record<string, boolean>>({});

  // Optional server-provided checklist (status per report type for today).
  const reports = (((apiUploadStatus as any)?.reports?.length > 0 ? (apiUploadStatus as any).reports : [])) as any[];
  const statusOf = (type: string) => reports.find((r) => r.id === type || r.type === type);
  const isDone = (type: string) => sent[type] || statusOf(type)?.uploadedToday || statusOf(type)?.lastStatus === "success";

  const submitSales = async () => {
    if (!salesAmt.trim()) { toast.error(t("أدخل قيمة المبيعات أولاً", "Enter the sales amount first")); return; }
    try {
      // Sales and expenses are SEPARATE report types on the backend (each has its own
      // checklist entry), so submit them as two operations rather than one bundled call.
      await uploadMut.mutateAsync({
        reportType: "sales", date: today,
        salesHalalas: Math.round((parseFloat(salesAmt) || 0) * 100), shift,
        file: salesFile ?? undefined,
      });
      setSent((p) => ({ ...p, sales: true }));
      if (expAmt.trim()) {
        await uploadMut.mutateAsync({
          reportType: "expenses", date: today,
          expensesHalalas: Math.round((parseFloat(expAmt) || 0) * 100),
          expenseNote: expenseNote || undefined,
        });
        setSent((p) => ({ ...p, expenses: true }));
      }
      setSalesAmt(""); setExpAmt(""); setExpenseNote(""); setSalesFile(null);
    } catch { /* the hook's onError already surfaced the message */ }
  };
  const submitFile = (reportType: string, file: File | null) => {
    uploadMut.mutate(
      { reportType, date: today, file: file ?? undefined },
      { onSuccess: () => { setSent((p) => ({ ...p, [reportType]: true })); if (reportType === "inventory") setInvFile(null); } },
    );
  };

  const DoneChip = () => (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle2 size={12} />{t("تم الإرسال للمحاسب", "Sent to accountant")}</span>
  );

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("رفع البيانات اليومية", "Daily Data Upload")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("البيانات تُرسَل للمحاسب المسؤول لمراجعتها ثم رفعها لمدير الحسابات.", "Data is sent to the responsible accountant for review, then to the head accountant.")}</p>
        </div>
        <span className="text-sm text-gray-400">{new Date().toLocaleDateString("ar-SA")}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Sales + expenses — the daily figures the accountant reviews. */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /> {t("المبيعات والمصروفات", "Sales & Expenses")}</h3>
            {isDone("sales") && <DoneChip />}
          </div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t(`إجمالي المبيعات (${SAR})`, `Total Sales (${SAR})`)} <span className="text-red-500">*</span></label><input type="number" value={salesAmt} onChange={e => setSalesAmt(e.target.value)} placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الشفت", "Shift")}</label><select value={shift} onChange={e => setShift(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option value="morning">{t("صباحي", "Morning")}</option><option value="evening">{t("مسائي", "Evening")}</option><option value="full">{t("كامل اليوم", "Full Day")}</option></select></div>
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t(`المصروفات (${SAR})`, `Expenses (${SAR})`)}</label><input type="number" value={expAmt} onChange={e => setExpAmt(e.target.value)} placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-red-400" /></div>
          </div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("تفصيل المصروفات (اختياري)", "Expense note (optional)")}</label><textarea rows={2} value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder={t("وصف مختصر...", "Brief description...")} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none resize-none" /></div>
          <label className="block border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-emerald-300">
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => { setSalesFile(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
            <Paperclip size={16} className="text-gray-400 mx-auto mb-1" />
            <p className="text-[11px] text-gray-400">{salesFile ? salesFile.name : t("مرفق Z-report (اختياري)", "Z-report attachment (optional)")}</p>
          </label>
          <Btn variant="primary" className="w-full justify-center" disabled={uploadMut.isPending} onClick={submitSales}><Send size={14} /> {uploadMut.isPending ? t("جارٍ الإرسال…", "Sending…") : t("رفع البيانات للمحاسب", "Submit to Accountant")}</Btn>
        </div>

        {/* Inventory + shift-close — file / confirmation reports. */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Package size={16} className="text-blue-600" /> {t("جرد المخزون اليومي", "Daily Inventory Count")}</h3>
              {isDone("inventory") && <DoneChip />}
            </div>
            <label className="block border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-blue-300">
              <input type="file" accept=".xlsx,.xls,.csv,image/*,.pdf" className="hidden" onChange={e => { setInvFile(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
              <Upload size={16} className="text-gray-400 mx-auto mb-1" />
              <p className="text-[11px] text-gray-400">{invFile ? invFile.name : t("ملف الجرد (Excel / صورة)", "Inventory file (Excel / image)")}</p>
            </label>
            <Btn className="w-full justify-center" disabled={uploadMut.isPending} onClick={() => submitFile("inventory", invFile)}><Send size={13} /> {t("إرسال الجرد للمحاسب", "Send Inventory")}</Btn>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Wallet size={16} className="text-purple-600" /> {t("إغلاق الوردية المسائية", "Evening Shift Close")}</h3>
              {isDone("shift-close") && <DoneChip />}
            </div>
            <p className="text-xs text-gray-400">{t("يؤكد إغلاق وردية اليوم ويرسل ملخصها للمحاسب.", "Confirms the day's shift close and sends its summary to the accountant.")}</p>
            <Btn className="w-full justify-center" disabled={uploadMut.isPending} onClick={() => submitFile("shift-close", null)}><CheckCircle2 size={13} /> {t("تأكيد إغلاق الوردية", "Confirm Shift Close")}</Btn>
          </div>
        </div>
      </div>

      {/* Server-provided checklist / status for the day, when available. */}
      {reports.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-600 mb-3">{t("حالة تقارير اليوم", "Today's Report Status")}</p>
          <div className="grid grid-cols-2 gap-2">
            {reports.map((rep) => {
              const good = rep.uploadedToday || rep.lastStatus === "success" || sent[rep.id] || sent[rep.type];
              return (
                <div key={rep.id ?? rep.type} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${good ? "border-emerald-200 bg-emerald-50/40" : rep.lastStatus === "late" ? "border-amber-200 bg-amber-50/40" : "border-gray-100"}`}>
                  <span className="font-medium text-gray-700">{rep.name}{rep.required && <span className="text-red-400"> *</span>}</span>
                  <span className={good ? "text-emerald-600" : rep.lastStatus === "late" ? "text-amber-600" : "text-gray-400"}>
                    {good ? t("تم", "Done") : rep.lastStatus === "late" ? t("متأخر", "Late") : `${t("الموعد", "Due")} ${rep.todayDeadline ?? "—"}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
