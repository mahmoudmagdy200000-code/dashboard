import { useState, type ReactNode } from "react";
import { LoginPage } from "./LoginPage";
import { writeEntrySelection } from "./entrySelection";
import { SUPPLIER_PORTAL_ENABLED } from "../featureFlags";
import { V, G, CYAN, ensureAuthStyles } from "./authTheme";
import { useSiteLang, type SiteLang } from "./siteLang";
import { LangToggle } from "./LangToggle";
import { AsabLogo } from "../components/AsabLogo";

// Pre-login entry: choose dashboard → choose role → login. A professional split-panel
// experience on the client's Electric Violet + GreyScale palette, fully bilingual
// (AR/EN via the site-wide language toggle). Pure UI; no API calls until the credential
// step. The chosen {slug, role} is persisted so the mockup opens directly on that role.

type Bi = { ar: string; en: string };
type Tr = <T,>(ar: T, en: T) => T;

const FEATURES: { icon: string; label: Bi }[] = [
  { icon: "📊", label: { ar: "9 موديولات مالية متكاملة", en: "9 integrated finance modules" } },
  { icon: "✅", label: { ar: "خط اعتماد من 6 مراحل", en: "6-stage approval pipeline" } },
  { icon: "🏢", label: { ar: "تعدد الفروع والعلامات التجارية", en: "Multi-branch & multi-brand" } },
  { icon: "⚡", label: { ar: "تقارير ولوحات تحكم لحظية", en: "Real-time reports & dashboards" } },
];

const DASHBOARDS: { slug: string; icon: string; title: Bi; subtitle: Bi; desc: Bi; badge: Bi }[] = [
  {
    slug: "asab/ASABPrototype",
    icon: "🏢",
    title: { ar: "الداشبورد الرئيسي", en: "Main Dashboard" },
    subtitle: { ar: "منظومة عصب الكاملة", en: "The complete ASAB suite" },
    desc: {
      ar: "إدارة مالية متكاملة — المبيعات، المصروفات، المشتريات، المخزون، الشفتات، العهد النقدية، والأصول الثابتة.",
      en: "End-to-end finance — sales, expenses, purchases, inventory, shifts, petty cash, and fixed assets.",
    },
    badge: { ar: "9 موديولات · 6 أدوار · خط اعتماد 6 مراحل", en: "9 modules · 6 roles · 6-stage approval" },
  },
  {
    slug: "asab/CompanyDashboard",
    icon: "🏨",
    title: { ar: "بوابة الشركات", en: "Enterprise Portal" },
    subtitle: { ar: "مجموعة التاج — بوابة المؤسسات", en: "Al-Taj Group — Enterprise portal" },
    desc: {
      ar: "لوحة إدارة متعددة الفروع لمجموعات المطاعم — مراجعة البيانات وتدقيق العمليات عبر جميع العلامات التجارية.",
      en: "Multi-branch management for restaurant groups — review data and audit operations across all brands.",
    },
    badge: { ar: "5 أدوار · 4 علامات تجارية · متعدد الفروع", en: "5 roles · 4 brands · multi-branch" },
  },
];

const ROLES: Record<string, { id: string; icon: string; accent: string; title: Bi; desc: Bi }[]> = {
  "asab/ASABPrototype": [
    { id: "admin", icon: "🧠", accent: "#ef4444", title: { ar: "أدمن النظام", en: "System Admin" }, desc: { ar: "المستخدمون والاشتراكات والإعدادات", en: "Users, subscriptions & settings" } },
    { id: "head", icon: "👑", accent: "#f59e0b", title: { ar: "رئيس الحسابات", en: "Head Accountant" }, desc: { ar: "الاعتماد النهائي والإشراف", en: "Final approval & oversight" } },
    { id: "accountant", icon: "🧮", accent: V[600], title: { ar: "المحاسب", en: "Accountant" }, desc: { ar: "مراجعة وتدقيق العمليات اليومية", en: "Review & audit daily operations" } },
    { id: "branch", icon: "🏪", accent: "#10b981", title: { ar: "مدير الفرع", en: "Branch Manager" }, desc: { ar: "رفع البيانات اليومية وإدارة الفرع", en: "Upload daily data & manage the branch" } },
    { id: "procurement", icon: "🛒", accent: "#8b5cf6", title: { ar: "مدير المشتريات", en: "Procurement Manager" }, desc: { ar: "طلبات الشراء والتنسيق مع الموردين", en: "Purchase orders & supplier coordination" } },
    { id: "supplier", icon: "🏭", accent: CYAN, title: { ar: "المورد", en: "Supplier" }, desc: { ar: "استلام طلبات التوريد وإدارة الكتالوج", en: "Receive supply orders & manage catalog" } },
  ],
  "asab/CompanyDashboard": [
    { id: "company-admin", icon: "🏢", accent: V[700], title: { ar: "أدمن الشركة", en: "Company Admin" }, desc: { ar: "إدارة الاشتراك والمستخدمين", en: "Manage subscription & users" } },
    { id: "head", icon: "👑", accent: "#3b82f6", title: { ar: "رئيس الحسابات", en: "Head Accountant" }, desc: { ar: "الإشراف والاعتماد النهائي", en: "Oversight & final approval" } },
    { id: "accountant", icon: "📊", accent: CYAN, title: { ar: "محاسب", en: "Accountant" }, desc: { ar: "مراجعة العمليات المالية", en: "Review financial operations" } },
    { id: "branch", icon: "🏪", accent: "#10b981", title: { ar: "مدير فرع", en: "Branch Manager" }, desc: { ar: "رفع بيانات الفرع اليومية", en: "Upload daily branch data" } },
    { id: "procurement", icon: "🛒", accent: "#f59e0b", title: { ar: "مدير مشتريات", en: "Procurement Manager" }, desc: { ar: "أوامر الشراء والموردون", en: "Purchase orders & suppliers" } },
  ],
};

// ─── Persistent brand panel ───────────────────────────────────────────────────
function BrandPanel({ t }: { t: Tr }) {
  return (
    <aside className="asab-brand">
      <div className="asab-brand__grid" />
      <div className="asab-blob asab-blob--a" style={{ width: 320, height: 320, background: CYAN, opacity: 0.18, top: -80, insetInlineStart: -60 }} />
      <div className="asab-blob asab-blob--b" style={{ width: 360, height: 360, background: V[400], opacity: 0.28, bottom: -120, insetInlineEnd: -80 }} />

      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
        <AsabLogo variant="brand-card" />

        <div style={{ marginTop: "auto" }}>
          <h1 className="asab-rise" style={{ animationDelay: "80ms", fontSize: 34, fontWeight: 800, lineHeight: 1.25, margin: "0 0 14px", letterSpacing: "-0.01em" }}>
            {t("منظومة الإدارة المالية", "Smart financial")}
            <br />
            <span style={{ color: CYAN }}>{t("الذكية للمطاعم", "management for restaurants")}</span>
          </h1>
          <p className="asab-rise" style={{ animationDelay: "160ms", fontSize: 15, color: "rgba(255,255,255,.72)", lineHeight: 1.8, margin: "0 0 32px", maxWidth: 420 }}>
            {t(
              "منصة واحدة تجمع كل عملياتك المالية عبر الفروع والعلامات التجارية — بدقة، وشفافية، وفي الوقت الحقيقي.",
              "One platform for all your financial operations across branches and brands — accurate, transparent, and real-time.",
            )}
          </p>

          <div className="asab-brand__features" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={f.label.en} className="asab-feat asab-rise" style={{ animationDelay: `${240 + i * 70}ms` }}>
                <span>{f.icon}</span>
                {t(f.label.ar, f.label.en)}
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: "relative", fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 40, marginBottom: 0 }}>
          {t("عصب ASAB · النسخة التجريبية 2.0", "ASAB · Beta 2.0")}
        </p>
      </div>
    </aside>
  );
}

function EntryShell({
  children, onBack, backLabel, lang, setLang, t,
}: {
  children: ReactNode; onBack?: () => void; backLabel?: string;
  lang: SiteLang; setLang: (l: SiteLang) => void; t: Tr;
}) {
  return (
    <div className="asab-entry" dir={lang === "ar" ? "rtl" : "ltr"} style={{ direction: lang === "ar" ? "rtl" : "ltr" }}>
      <BrandPanel t={t} />
      <main className="asab-content">
        <div className="asab-langslot">
          <LangToggle lang={lang} onChange={setLang} variant="light" />
        </div>
        <div className="asab-stage">
          {onBack && (
            <button type="button" className="asab-back" onClick={onBack}>
              {t("→", "←")} {backLabel}
            </button>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

export function EntryFlow() {
  ensureAuthStyles();
  const [lang, setLang, t] = useSiteLang();
  const [slug, setSlug] = useState<string | null>(null);
  const [step, setStep] = useState<"dashboard" | "role" | "login">("dashboard");
  const shellProps = { lang, setLang, t };

  // ── Step 3: credential login ──
  if (step === "login") {
    return (
      <EntryShell {...shellProps} onBack={() => setStep("role")} backLabel={t("تغيير المستخدم", "Change user")}>
        <LoginPage />
      </EntryShell>
    );
  }

  // ── Step 2: role chooser ──
  if (step === "role" && slug) {
    const dash = DASHBOARDS.find((d) => d.slug === slug)!;
    const roles = (ROLES[slug] ?? []).filter((r) => r.id !== "supplier" || SUPPLIER_PORTAL_ENABLED);
    return (
      <EntryShell {...shellProps} onBack={() => { setSlug(null); setStep("dashboard"); }} backLabel={t("اختيار الداشبورد", "Choose dashboard")}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: V[50], border: `1px solid ${V[100]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{dash.icon}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: G[900] }}>{t(dash.title.ar, dash.title.en)}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: G[500] }}>{t(dash.subtitle.ar, dash.subtitle.en)}</p>
          </div>
        </div>
        <p style={{ fontSize: 14, color: G[600], margin: "14px 0 22px" }}>{t("اختر المستخدم للمتابعة إلى تسجيل الدخول", "Choose a user to continue to sign-in")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {roles.map((r, i) => (
            <button
              key={r.id}
              type="button"
              className="asab-role asab-rise"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => { writeEntrySelection({ slug, role: r.id }); setStep("login"); }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = r.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = G[200]; }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: `${r.accent}14`, border: `1px solid ${r.accent}33` }}>{r.icon}</div>
              <div style={{ color: G[900], fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t(r.title.ar, r.title.en)}</div>
              <div style={{ color: G[500], fontSize: 12, lineHeight: 1.6, minHeight: 30 }}>{t(r.desc.ar, r.desc.en)}</div>
            </button>
          ))}
        </div>
      </EntryShell>
    );
  }

  // ── Step 1: dashboard chooser ──
  return (
    <EntryShell {...shellProps}>
      <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: G[900] }}>{t("مرحباً بك في عصب", "Welcome to ASAB")}</h2>
      <p style={{ fontSize: 14, color: G[600], margin: "0 0 26px" }}>{t("اختر الداشبورد للبدء", "Choose a dashboard to begin")}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {DASHBOARDS.map((d, i) => (
          <button
            key={d.slug}
            type="button"
            className="asab-card asab-rise"
            onClick={() => { setSlug(d.slug); setStep("role"); }}
            style={{ padding: 24, animationDelay: `${i * 90}ms` }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 15, flexShrink: 0, background: `linear-gradient(135deg, ${V[600]}, ${V[800]})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: `0 8px 20px -6px ${V[600]}66` }}>{d.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: G[900] }}>{t(d.title.ar, d.title.en)}</div>
                <div style={{ fontSize: 13, color: V[600], fontWeight: 600, marginTop: 2 }}>{t(d.subtitle.ar, d.subtitle.en)}</div>
              </div>
              <div style={{ color: V[600], fontSize: 22, fontWeight: 700 }}>{t("←", "→")}</div>
            </div>
            <p style={{ fontSize: 13, color: G[600], lineHeight: 1.7, margin: "14px 0 12px" }}>{t(d.desc.ar, d.desc.en)}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: G[500], background: G[100], border: `1px solid ${G[200]}`, borderRadius: 8, padding: "5px 10px" }}>
              {t(d.badge.ar, d.badge.en)}
            </div>
          </button>
        ))}
      </div>
    </EntryShell>
  );
}
