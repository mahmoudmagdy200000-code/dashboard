import { useState, useEffect } from "react";
import {
  Bell, Send, CheckCircle2, X, FileText, RotateCcw,
  Filter, Search, Check, Plus, Save, Smartphone, AlertTriangle,
  RefreshCw
} from "lucide-react";
import {
  useMissingDataReminders,
  useExportAccReminders,
  useCreateReminder,
  useSendAllReminders,
  useSendMissingReminder,
  useScanReminders,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { BRANCHES } from "../../_shared/filterOps";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { KpiCard } from "../../components/KpiCard";
import type { PageProps } from "../../_shared/types";

export function AccReminders({ }: PageProps) {
  const { t, lang, dir } = useLang();
  // 2026-08-09: the «بيانات الفروع المفقودة» list is GET /company/me/reminders —
  // NOT /reminders (the accountant's personal list, which is why it read 0/0/0/0).
  const { data: missingRem } = useMissingDataReminders();
  const exportRemindersMut = useExportAccReminders();
  const createReminderMut = useCreateReminder();
  const sendAllMut = useSendAllReminders();
  const sendOneMut = useSendMissingReminder();
  const scanMut = useScanReminders();
  type ReminderStatus = "not_sent" | "sent" | "responded";
  type ResponseType = "سيرسل لاحقاً" | "لا مشتريات اليوم" | "تم الجرد — قيد الرفع" | "توضيح: لا يوجد هدر اليوم" | null;
  interface MissingReport { id: string; branch: string; reportType: string; moduleKey: string; requiredBy: string; daysMissing: number; urgency: "high" | "medium" | "low"; reminderStatus: ReminderStatus; response: ResponseType }

  const MODULE_LABELS: Record<string, string> = {
    "sales": "المبيعات",
    "inventory_daily": "الجرد اليومي",
    "inventory_monthly": "الجرد الشهري",
    "waste": "الهدر والتالف",
    "purchases": "المشتريات",
    "expenses": "المصروفات",
  };

  const [filterModule, setFilterModule] = useState("الكل");
  const [filterBranch, setFilterBranch] = useState("الكل");
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | string>("all");
  const [broadcastModule, setBroadcastModule] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");

  // Map the branch missing-data rows into the screen shape.
  const apiRemList = (missingRem as any)?.data;
  const remSummary = (missingRem as any)?.meta?.summary;
  const [reminders, setReminders] = useState<MissingReport[]>([]);
  useEffect(() => {
    if (!Array.isArray(apiRemList)) return;
    setReminders(apiRemList.map((r: any): MissingReport => ({
      id: String(r?.id ?? ""),
      branch: r?.branchName ?? "—",
      reportType: r?.moduleLabelAr ?? MODULE_LABELS[r?.moduleKey] ?? r?.moduleKey ?? "—",
      moduleKey: r?.moduleKey ?? "",
      requiredBy: r?.requiredBy ?? "",
      daysMissing: Number(r?.daysMissing ?? 0),
      urgency: (r?.urgency ?? "medium") as MissingReport["urgency"],
      reminderStatus: (r?.reminderStatus ?? "not_sent") as ReminderStatus,
      response: null,
    })));
  }, [apiRemList]); // eslint-disable-line react-hooks/exhaustive-deps
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseOptions] = useState<ResponseType[]>(["سيرسل لاحقاً", "لا مشتريات اليوم", "تم الجرد — قيد الرفع", "توضيح: لا يوجد هدر اليوم"]);

  // Real send (POST /company/me/reminders/{id}/send · /send-all) + optimistic flip.
  const sendReminder = (id: string) => { sendOneMut.mutate(id); setReminders(p => p.map(r => r.id === id ? { ...r, reminderStatus: "sent" as ReminderStatus } : r)); };
  const sendAll = () => { sendAllMut.mutate({ onlyUnsent: true }); setReminders(p => p.map(r => r.reminderStatus === "not_sent" ? { ...r, reminderStatus: "sent" as ReminderStatus } : r)); };

  const displayed = reminders.filter(r => {
    if (filterModule !== "الكل" && r.moduleKey !== filterModule) return false;
    if (filterBranch !== "الكل" && r.branch !== filterBranch) return false;
    return true;
  });
  const notSent = displayed.filter(r => r.reminderStatus === "not_sent");
  const sent = displayed.filter(r => r.reminderStatus === "sent");
  const responded = displayed.filter(r => r.reminderStatus === "responded");

  const REM_BRANCHES = [...new Set(reminders.map(r => r.branch))];

  const urgencyBadge = (u: string) =>
    u === "high" ? "bg-red-50 text-red-700 border border-red-200" :
      u === "medium" ? "bg-amber-50 text-amber-700 border border-amber-200" :
        "bg-gray-50 text-gray-600 border border-gray-200";
  const urgencyLbl = (u: string) => u === "high" ? "عاجل" : u === "medium" ? "متوسط" : "منخفض";

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">التذكيرات — بيانات الفروع المفقودة</h2>
          <p className="text-gray-400 text-sm mt-0.5">أرسل تذكيراً مخصصاً لفرع بعينه أو لجميع الفروع — يصل على تطبيق الموبايل</p>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" onClick={() => scanMut.mutate()} disabled={scanMut.isPending}>
            <RotateCcw size={12} /> {scanMut.isPending ? "جارٍ التحديث…" : "تحديث"}
          </Btn>
          <Btn variant="primary" size="sm" onClick={sendAll} disabled={notSent.length === 0 || sendAllMut.isPending}>
            <Send size={12} /> إرسال تذكير للكل{notSent.length > 0 ? ` (${notSent.length})` : ""}
          </Btn>
          <button onClick={() => setBroadcastModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold hover:bg-purple-100 transition-all">
            <Bell size={12} /> إرسال مخصص
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="لم تُرسَل بعد" value={String(remSummary?.notSent ?? notSent.length)} sub="تنتظر إجراءً منك" icon={<Bell size={18} className="text-red-600" />} accent="red" />
        <KpiCard label="تم الإرسال" value={String(remSummary?.sent ?? sent.length)} sub="ينتظر رد الفرع" icon={<Send size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label="تم الرد" value={String(remSummary?.responded ?? responded.length)} sub="استجاب مدير الفرع" icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label="إجمالي المفقود" value={String(remSummary?.totalMissing ?? reminders.length)} sub="تقارير وبيانات" icon={<AlertTriangle size={18} className="text-purple-600" />} accent="purple" />
      </div>

      {/* Filters: Module + Branch search + Brand + Excel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الموديول</label>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="الكل">{t("الكل", "All")}</option>
              {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث بالفرع أو المطعم</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input value={filterBranch === "الكل" ? "" : filterBranch}
                onChange={e => setFilterBranch(e.target.value || "الكل")}
                placeholder="اكتب اسم الفرع أو المطعم..." className="flex-1 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل"].map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => exportRemindersMut.mutate("xlsx")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold hover:bg-emerald-100 transition-all w-full justify-center">
              <FileText size={13} /> تصدير Excel
            </button>
          </div>
        </div>
        {(filterModule !== "الكل" || filterBranch !== "الكل") && (
          <button onClick={() => { setFilterModule("الكل"); setFilterBranch("الكل"); }} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11} /> مسح الفلاتر</button>
        )}
      </div>

      {/* Broadcast custom reminder modal */}
      {broadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setBroadcastModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">إرسال تذكير مخصص</h3>
              <button onClick={() => setBroadcastModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4" dir="rtl">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">إرسال إلى</label>
                <div className="flex gap-2">
                  <button onClick={() => setBroadcastTarget("all")}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${broadcastTarget === "all" ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    جميع الفروع
                  </button>
                  <button onClick={() => setBroadcastTarget("specific")}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${broadcastTarget !== "all" && broadcastTarget !== "all" ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {t("فرع محدد", "Specific Branch")}
                  </button>
                </div>
                {broadcastTarget === "specific" && (
                  <select onChange={e => setBroadcastTarget(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-2">
                    <option value="">{t("اختر الفرع...", "Select Branch...")}</option>
                    {REM_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">الموديول المطلوب</label>
                <select value={broadcastModule} onChange={e => setBroadcastModule(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  <option value="">{t("اختر الموديول...", "Select Module...")}</option>
                  {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">نص الرسالة</label>
                <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} rows={3}
                  placeholder="يرجى رفع بيانات اليوم في أقرب وقت..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:border-purple-300" />
              </div>
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Btn size="sm" variant="primary" onClick={() => setBroadcastModal(false)}>
                <Send size={11} /> إرسال {broadcastTarget === "all" ? "لكل الفروع" : "للفرع المحدد"}
              </Btn>
              <Btn size="sm" onClick={() => setBroadcastModal(false)}>{t("إلغاء", "Cancel")}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Reminders table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">البيانات المفقودة من الفروع</h3>
          <span className="text-xs text-gray-400">{displayed.length} بيان مفقود</span>
        </div>
        {displayed.map(r => {
          const isExpanded = expandedId === r.id;
          return (
            <div key={r.id} className="border-b border-gray-100 last:border-0">
              <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 ${isExpanded ? "bg-blue-50/20" : ""}`}>
                <div className={`w-2 h-10 rounded-full flex-shrink-0 ${r.urgency === "high" ? "bg-red-400" : r.urgency === "medium" ? "bg-amber-400" : "bg-gray-300"}`} />
                <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{r.branch}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-600">{r.reportType}</span>
                    <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">{MODULE_LABELS[r.moduleKey] || r.moduleKey}</Badge>
                    <Badge className={`${urgencyBadge(r.urgency)} text-[10px]`}>{urgencyLbl(r.urgency)}</Badge>
                    {r.daysMissing > 1 && <Badge className="bg-red-50 text-red-700 text-[10px]">⏰ {r.daysMissing} أيام متأخر</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-gray-400">كان مطلوباً: {r.requiredBy}</p>
                    {r.reminderStatus === "sent" && <Badge className="bg-amber-50 text-amber-700 text-[10px]">📤 تم الإرسال</Badge>}
                    {r.reminderStatus === "responded" && r.response && <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">✅ رد: {r.response}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {r.reminderStatus === "not_sent" && (
                    <Btn size="sm" variant="primary" onClick={() => sendReminder(r.id)}>
                      <Send size={11} /> إرسال تذكير
                    </Btn>
                  )}
                  {r.reminderStatus === "sent" && (
                    <Btn size="sm" onClick={() => sendReminder(r.id)}>
                      <RefreshCw size={11} /> إعادة الإرسال
                    </Btn>
                  )}
                  {r.reminderStatus === "responded" && (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-1.5">
                      <CheckCircle2 size={10} className="ml-1" /> استجاب
                    </Badge>
                  )}
                </div>
              </div>
              {/* Expanded: response options preview (simulates mobile response) */}
              {isExpanded && r.reminderStatus === "sent" && (
                <div className="px-5 pb-4 bg-gray-50/40">
                  <p className="text-xs font-bold text-gray-600 mt-2 mb-2 flex items-center gap-1.5">
                    <Smartphone size={12} className="text-gray-500" /> ردود سريعة متاحة لمدير الفرع على الموبايل:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {responseOptions.map(opt => (
                      <button key={opt} onClick={() => {
                        setReminders(p => p.map(rm => rm.id === r.id ? { ...rm, reminderStatus: "responded" as ReminderStatus, response: opt } : rm));
                        setExpandedId(null);
                      }} className="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all">
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto-reminder rules creation */}
      <AutoReminderRules moduleLabels={MODULE_LABELS} />
    </div>
  );
}

export function AutoReminderRules({ moduleLabels }: { moduleLabels: Record<string, string> }) {
  const { t, lang, dir } = useLang();
  type Rule = { id: string; module: string; triggerHour: string; repeatHours: string; active: boolean };
  const [rules, setRules] = useState<Rule[]>([
    { id: "AR1", module: "sales", triggerHour: "22:00", repeatHours: "2", active: true },
    { id: "AR2", module: "inventory_daily", triggerHour: "20:00", repeatHours: "3", active: true },
    { id: "AR3", module: "waste", triggerHour: "21:00", repeatHours: "4", active: false },
    { id: "AR4", module: "expenses", triggerHour: "23:00", repeatHours: "2", active: true },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({ module: "sales", triggerHour: "20:00", repeatHours: "3" });

  const toggleRule = (id: string) => setRules(p => p.map(r => r.id === id ? { ...r, active: !r.active } : r));
  const addRule = () => {
    setRules(p => [...p, { id: `AR${p.length + 1}`, ...newRule, active: true }]);
    setShowAdd(false);
    setNewRule({ module: "sales", triggerHour: "20:00", repeatHours: "3" });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">⚙️ قواعد التذكير التلقائي</h3>
          <p className="text-xs text-gray-400 mt-0.5">يُرسَل تذكير تلقائياً إذا لم يُرفع التقرير بحلول الوقت المحدد</p>
        </div>
        <Btn size="sm" variant="primary" onClick={() => setShowAdd(s => !s)}><Plus size={12} /> {t("إضافة قاعدة", "Add Rule")}</Btn>
      </div>
      {showAdd && (
        <div className="px-5 py-4 bg-purple-50/40 border-b border-purple-100">
          <p className="text-xs font-bold text-purple-700 mb-3">➕ قاعدة جديدة</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">الموديول</label>
              <select value={newRule.module} onChange={e => setNewRule(p => ({ ...p, module: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5">
                {Object.entries(moduleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">وقت التشغيل</label>
              <input type="time" value={newRule.triggerHour} onChange={e => setNewRule(p => ({ ...p, triggerHour: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5" dir="ltr" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">تكرار كل (ساعات)</label>
              <input type="number" min="1" max="12" value={newRule.repeatHours} onChange={e => setNewRule(p => ({ ...p, repeatHours: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
            </div>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="success" onClick={addRule}><CheckCircle2 size={11} /> {t("حفظ", "Save")}</Btn>
            <Btn size="sm" onClick={() => setShowAdd(false)}>{t("إلغاء", "Cancel")}</Btn>
          </div>
        </div>
      )}
      <div>
        {rules.map((r, i) => (
          <div key={r.id} className={`px-5 py-3.5 flex items-center gap-4 border-b border-gray-50 last:border-0 ${!r.active ? "opacity-50" : ""}`}>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Bell size={14} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-800">{moduleLabels[r.module] || r.module}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">يُرسَل في {r.triggerHour} · يتكرر كل {r.repeatHours} ساعات إذا لا يوجد رد</p>
            </div>
            <button onClick={() => toggleRule(r.id)}
              className={`w-11 h-6 rounded-full transition-all flex-shrink-0 relative ${r.active ? "bg-purple-500" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${r.active ? "right-0.5" : "left-0.5"}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
