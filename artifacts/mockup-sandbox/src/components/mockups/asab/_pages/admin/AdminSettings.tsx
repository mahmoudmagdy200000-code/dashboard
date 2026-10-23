import { useState } from "react";
import {
  useAdminSettings,
  useUpdateAdminSettings,
} from "../../../../../api/queries";
import { useAuth } from "../../../../../auth/AuthContext";
import { useLanguagePref } from "../../../../../auth/useLanguagePref";
import { useLang } from "../../_shared/LangContext";
import { Card } from "../../components/Card";
import { NotificationPreferencesPage } from "../../../../shared/NotificationPreferencesPage";
import { ApiKeysPage } from "../../../../shared/ApiKeysPage";
import { WebhooksPage } from "../../../../shared/WebhooksPage";
import { SessionsList } from "../../../../shared/SessionsList";
import { TwoFactorSetupWizard } from "../../../../shared/TwoFactorSetupWizard";
import { PermissionHistoryDrawer } from "../../../../shared/PermissionHistoryDrawer";
import { ChangePasswordModal } from "../../../../../auth/ChangePasswordModal";
import {
  Lock, Smartphone, Shield, Bell, KeyRound, Webhook, History, Globe
} from "lucide-react";
import type { PageProps } from "../../_shared/types";

export function AdminSettings({ }: PageProps) {
  const { data: settingsData } = useAdminSettings();
  const updateSettingsMut = useUpdateAdminSettings();
  const { user } = useAuth();
  const hasCompany = !!user?.companyId;
  const { t, lang, setLang, dir } = useLang();
  const langPrefMut = useLanguagePref();
  const [showPwd, setShowPwd] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [settingsView, setSettingsView] = useState<"home" | "notifications" | "apikeys" | "webhooks">("home");
  const [showPermHistory, setShowPermHistory] = useState(false);
  if (settingsView === "notifications") return (<div className="space-y-4" dir={dir}><button onClick={() => setSettingsView("home")} className="text-sm text-purple-600 hover:underline">← {t("رجوع للإعدادات", "Back to settings")}</button><NotificationPreferencesPage t={(ar, en) => t(ar, en)} /></div>);
  if (settingsView === "apikeys") return (<div className="space-y-4" dir={dir}><button onClick={() => setSettingsView("home")} className="text-sm text-purple-600 hover:underline">← {t("رجوع للإعدادات", "Back to settings")}</button><ApiKeysPage t={(ar, en) => t(ar, en)} /></div>);
  if (settingsView === "webhooks") return (<div className="space-y-4" dir={dir}><button onClick={() => setSettingsView("home")} className="text-sm text-purple-600 hover:underline">← {t("رجوع للإعدادات", "Back to settings")}</button><WebhooksPage t={(ar, en) => t(ar, en)} /></div>);
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("إعدادات النظام", "System Settings")}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t("ملاحظة أمنية: تغيير الإعدادات يسجل في الخادم كإعدادات تفضيلية؛ إنفاذ السياسات يخضع لمسارات المصادقة والخوادم المستقلة (PERM-00)", "Security Notice: Settings changes are saved as system preferences; policy enforcement is governed by independent server authentication flows (PERM-00)")}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {/* B4: wired to GET/PATCH /admin/settings with the backend's authoritative field names.
            PATCH is a deep partial merge → send one section/key at a time. */}
        {([
          {
            section: "notifications", title: t("إعدادات الإشعارات", "Notification Settings"), icon: "🔔", fields: [
              { key: "approvalNotifications", label: t("إشعارات الاعتماد", "Approval Notifications"), type: "bool" },
              { key: "subscriptionAlerts", label: t("تنبيهات الاشتراك", "Subscription Alerts"), type: "bool" },
              { key: "dailyPerformanceReports", label: t("تقارير الأداء اليومية", "Daily Performance Reports"), type: "bool" },
            ]
          },
          {
            section: "backup", title: t("إعدادات النسخ الاحتياطي", "Backup Settings"), icon: "💾", fields: [
              { key: "dailyAutoBackup", label: t("نسخ تلقائي يومي", "Daily Auto Backup"), type: "bool" },
              { key: "weeklyBackup", label: t("نسخ أسبوعي", "Weekly Backup"), type: "bool" },
              { key: "dataEncryption", label: t("تشفير البيانات", "Data Encryption"), type: "bool" },
            ]
          },
          {
            section: "api", title: t("إعدادات API", "API Settings"), icon: "🔗", fields: [
              { key: "erpConnection", label: t("اتصال ERP", "ERP Connection"), type: "bool" },
              { key: "paymentGatewayConnection", label: t("اتصال بوابة الدفع", "Payment Gateway Connection"), type: "bool" },
              { key: "mobileAppInterface", label: t("واجهة تطبيق الموبايل", "Mobile App Interface"), type: "bool" },
            ]
          },
          {
            section: "security", title: t("إعدادات الأمان", "Security Settings"), icon: "🔐", fields: [
              { key: "twoFactorAuthRequired", label: t("المصادقة الثنائية", "Two-Factor Authentication"), type: "bool" },
              { key: "sessionDurationMinutes", label: t("مدة الجلسة (دقائق)", "Session Duration (min)"), type: "int" },
              { key: "passwordPolicyEnabled", label: t("سياسة كلمة المرور", "Password Policy"), type: "bool" },
            ]
          },
        ] as { section: string; title: string; icon: string; fields: { key: string; label: string; type: "bool" | "int" }[] }[]).map((s) => {
          const sectionVal = ((settingsData as any)?.[s.section] ?? {}) as Record<string, any>;
          return (
            <Card key={s.section} title={`${s.icon} ${s.title}`}>
              <div className="p-4 space-y-3">
                {s.fields.map((f) => {
                  if (f.type === "int") {
                    const val = Number(sectionVal[f.key] ?? 60);
                    return (
                      <div key={f.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-700">{f.label}</span>
                        <input type="number" min={5} key={val} defaultValue={val}
                          onBlur={e => { const n = Number(e.target.value); if (n > 0 && n !== val) updateSettingsMut.mutate({ [s.section]: { [f.key]: n } } as any); }}
                          className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 text-center" />
                      </div>
                    );
                  }
                  const on = !!sectionVal[f.key];
                  return (
                    <div key={f.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{f.label}</span>
                      <button type="button" disabled={updateSettingsMut.isPending}
                        onClick={() => updateSettingsMut.mutate({ [s.section]: { [f.key]: !on } } as any)}
                        className={`w-10 h-5 rounded-full cursor-pointer relative flex-shrink-0 transition-colors disabled:opacity-60 ${on ? "bg-purple-600" : "bg-gray-300"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${on ? "right-0.5" : "left-0.5"}`}></div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Account Settings ─────────────────────── */}
      <Card title={`👤 ${t("إعدادات الحساب", "Account Settings")}`}>
        <div className="p-4 flex flex-wrap gap-3">
          <button
            onClick={() => setShowPwd(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors">
            <Lock size={14} /> {t("تغيير كلمة المرور", "Change Password")}
          </button>
          <button
            onClick={() => setShowSessions(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
            <Smartphone size={14} /> {t("جلسات نشطة", "Active Sessions")}
          </button>
          <button
            onClick={() => setShow2FA(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
            <Shield size={14} /> {t("المصادقة الثنائية", "Two-Factor Auth")}
          </button>
          <button
            onClick={() => setSettingsView("notifications")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
            <Bell size={14} /> {t("تفضيلات الإشعارات", "Notification Preferences")}
          </button>
          {hasCompany && (
            <button
              onClick={() => setSettingsView("apikeys")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
              <KeyRound size={14} /> {t("مفاتيح API", "API Keys")}
            </button>
          )}
          {hasCompany && (
            <button
              onClick={() => setSettingsView("webhooks")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
              <Webhook size={14} /> Webhooks
            </button>
          )}
          <button
            onClick={() => setShowPermHistory(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
            <History size={14} /> {t("تاريخ الصلاحيات", "Permission History")}
          </button>
          <button
            onClick={() => {
              const next = lang === "ar" ? "en" : "ar";
              setLang(next);
              langPrefMut.mutate({ language: next });
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-sm font-bold hover:bg-purple-100 transition-colors">
            <Globe size={14} /> {lang === "ar" ? "English" : "عربي"}
          </button>
        </div>
      </Card>

      <TwoFactorSetupWizard open={show2FA} onClose={() => setShow2FA(false)} t={(ar, en) => t(ar, en)} />
      <PermissionHistoryDrawer open={showPermHistory} onClose={() => setShowPermHistory(false)} t={(ar, en) => t(ar, en)} />

      <ChangePasswordModal open={showPwd} onClose={() => setShowPwd(false)} />

      {showSessions && (
        <div
          onClick={() => setShowSessions(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(15,28,53,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: 16,
          }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560 }}>
            <SessionsList t={(ar, en) => t(ar, en)} />
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowSessions(false)}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "white", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                {t("إغلاق", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
