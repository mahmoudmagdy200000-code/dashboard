import { useState } from "react";
import { useAdminAuditLogs, useExportAdminAuditLogs } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { Search, RotateCcw, FileText } from "lucide-react";
import type { PageProps } from "../../_shared/types";

export function humanAuditLabel(description?: string, action?: string): string {
  if (description && !/^[a-z]+\.[a-z._-]+$/i.test(description)) return description;
  const a = action ?? "";
  const [method, entity] = a.split(".");
  const verbs: Record<string, string> = { post: "إنشاء", put: "تعديل", patch: "تعديل", delete: "حذف", get: "عرض" };
  const ents: Record<string, string> = {
    companies: "شركة", subscriptions: "اشتراك", users: "مستخدم", brands: "علامة تجارية",
    restaurants: "مطعم", branches: "فرع", permissions: "الصلاحيات", reports: "تقرير",
    settings: "الإعدادات", accountants: "تعيين محاسب", assets: "أصل", operations: "عملية",
  };
  const v = verbs[method] ?? method ?? "";
  const e = ents[entity] ?? entity ?? "";
  return (v || e) ? `${v} ${e}`.trim() : a;
}

export function AdminAudit({ }: PageProps) {
  const { data: apiAuditLogs } = useAdminAuditLogs();
  const exportAuditMut = useExportAdminAuditLogs();
  const { t, lang, dir } = useLang(); const en = lang === "en";
  // Driven by GET /admin/audit-logs — mapped to the row render shape. No static fallback.
  type AuditRow = { action: string; user: string; time: string; icon: string; type: string; date: string };
  const apiLogsArr = (apiAuditLogs as any)?.data ?? (apiAuditLogs as any);
  const ALL_LOGS: AuditRow[] = Array.isArray(apiLogsArr)
    ? (apiLogsArr as any[]).map((l: any) => ({
      // B3: backend now ships ready-made descriptionAr/descriptionEn; formatter is only a fallback.
      action: (en ? l.descriptionEn : l.descriptionAr) ?? l.descriptionAr ?? humanAuditLabel(l.description, l.action),
      user: l.actorName ?? l.user ?? "",
      time: l.occurredAt ? new Date(l.occurredAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "",
      icon: "📋",
      type: l.entityType ?? l.type ?? "",
      date: l.occurredAt ? new Date(l.occurredAt).toLocaleDateString("ar-SA") : "",
    }))
    : [];
  const allVal = t("الكل", "All");
  const todayVal = t("اليوم", "Today");
  const yestVal = t("أمس", "Yesterday");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState(allVal);
  const [dateFilter, setDateFilter] = useState(allVal);

  const ACTION_TYPES = [allVal, t("مستخدمين", "Users"), t("اعتمادات", "Approvals"), t("اشتراكات", "Subscriptions"), t("رفض", "Rejection"), t("تصدير", "Export"), t("مخزون", "Inventory"), t("صلاحيات", "Permissions"), t("مشتريات", "Purchases")];
  const DATE_OPTIONS = [allVal, todayVal, yestVal];

  const shown = ALL_LOGS.filter(l => {
    if (userFilter && !l.user.includes(userFilter)) return false;
    const arType = l.type;
    const enTypes: Record<string, string> = { مستخدمين: "Users", اعتمادات: "Approvals", اشتراكات: "Subscriptions", رفض: "Rejection", تصدير: "Export", مخزون: "Inventory", صلاحيات: "Permissions", مشتريات: "Purchases" };
    if (actionFilter !== allVal && t(arType, enTypes[arType]) !== actionFilter) return false;
    const arDate = l.date;
    const enDates: Record<string, string> = { اليوم: "Today", أمس: "Yesterday" };
    if (dateFilter !== allVal && t(arDate, enDates[arDate]) !== dateFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("سجل النشاطات", "Activity Log")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{ALL_LOGS.length} {t("نشاط مسجل", "recorded activities")}</p>
        </div>
        <button onClick={() => exportAuditMut.mutate({ format: "xlsx" })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold hover:bg-emerald-100 transition-all">
          <FileText size={13} /> {t("تصدير Excel", "Export Excel")}
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("بحث بالمستخدم", "Search by User")}</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input value={userFilter} onChange={e => setUserFilter(e.target.value)} placeholder={t("اسم المستخدم...", "Username...")} className="flex-1 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("نوع النشاط", "Activity Type")}</label>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {ACTION_TYPES.map(tb => <option key={tb}>{tb}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("التاريخ", "Date")}</label>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {DATE_OPTIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        {(userFilter || actionFilter !== allVal || dateFilter !== allVal) && (
          <button onClick={() => { setUserFilter(""); setActionFilter(allVal); setDateFilter(allVal); }}
            className="mt-2 text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11} /> {t("مسح الفلاتر", "Clear Filters")}</button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">{t("النشاطات", "Activities")}</h3>
          <span className="text-xs text-gray-400">{shown.length} {t("نشاط", "activities")}</span>
        </div>
        <div className="divide-y divide-gray-100">
          {shown.map((log, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 bg-gray-50">{log.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{log.action}</p>
                <p className="text-xs text-gray-400">{log.user}</p>
              </div>
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{log.type}</span>
              <span className="text-xs text-gray-400 w-20 text-left flex-shrink-0">{log.time}</span>
            </div>
          ))}
          {shown.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">{t("لا توجد نشاطات بالفلاتر المحددة", "No activities match the selected filters")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
