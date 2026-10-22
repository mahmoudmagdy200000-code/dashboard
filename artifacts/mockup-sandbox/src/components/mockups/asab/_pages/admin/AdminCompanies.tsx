import { useState, useEffect } from "react";
import {
  useAdminCompanies,
  useSuspendAdminCompany,
  useActivateAdminCompany,
  useUpgradeAdminCompany,
  useCreateAdminCompany,
  useResetCompanyAdminPassword,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { formatDateLong } from "../../_shared/formatters";
import { Btn } from "../../components/Btn";
import { KpiCard } from "../../components/KpiCard";
import {
  Plus, CheckCircle2, Star, AlertTriangle, Wallet, Building2,
  Search, Eye, CreditCard, Send, X, Check
} from "lucide-react";
import type { PageProps } from "../../_shared/types";

// ─────────────────────────────────────────────
// ADMIN — COMPANY SUBSCRIPTIONS (B2B Portal)
// ─────────────────────────────────────────────
type CompanyPlan = "Basic" | "Professional" | "Enterprise";
type CompanySub = {
  id: string; name: string; logo: string; contactName: string; contactEmail: string; contactPhone: string;
  plan: CompanyPlan; status: "active" | "warning" | "danger" | "suspended" | "trial";
  brands: number; restaurants: number; branches: number; usedBranches: number;
  users: number; maxUsers: number;
  monthlyRevenue: number; startDate: string; nextBilling: string; daysLeft: number;
  modules: string[]; adminEmail: string; city: string;
};

const COMPANY_PLANS_META = {
  Basic: { maxBranches: 5, maxUsers: 15, price: 1990, color: "bg-gray-100 text-gray-700 border border-gray-200" },
  Professional: { maxBranches: 20, maxUsers: 50, price: 4800, color: "bg-blue-50 text-blue-700 border border-blue-200" },
  Enterprise: { maxBranches: 999, maxUsers: 999, price: 12000, color: "bg-purple-50 text-purple-700 border border-purple-200" },
};
const PLAN_NAMES_AR: Record<string, string> = { Basic: "أساسي", Professional: "احترافي", Enterprise: "مؤسسي" };

const INITIAL_COMPANIES: CompanySub[] = [
  { id: "C001", name: "مجموعة التاج للمطاعم", logo: "👑", contactName: "محمد الراشد", contactEmail: "m.rashed@altaj.com", contactPhone: "+966 50 111 2222", plan: "Professional", status: "active", brands: 3, restaurants: 8, branches: 12, usedBranches: 12, users: 31, maxUsers: 50, monthlyRevenue: 4800, startDate: "يناير 2024", nextBilling: "15 يناير 2026", daysLeft: 87, modules: ["مبيعات", "مصروفات", "مشتريات", "مخزون", "أصول", "شفتات"], adminEmail: "admin@altaj.com", city: "الرياض" },
  { id: "C002", name: "شركة النخيل للأغذية", logo: "🌴", contactName: "فهد العتيبي", contactEmail: "f.otaibi@nakheel.sa", contactPhone: "+966 55 222 3333", plan: "Enterprise", status: "active", brands: 5, restaurants: 15, branches: 22, usedBranches: 20, users: 68, maxUsers: 999, monthlyRevenue: 12000, startDate: "مارس 2023", nextBilling: "01 مارس 2026", daysLeft: 145, modules: ["مبيعات", "مصروفات", "مشتريات", "مخزون", "أصول", "شفتات", "هدر", "كشف حساب", "عهدة نقدية"], adminEmail: "admin@nakheel.sa", city: "جدة" },
  { id: "C003", name: "مجموعة البلد للمطاعم", logo: "🏛", contactName: "سارة الزهراني", contactEmail: "s.zahr@balad.com.sa", contactPhone: "+966 53 333 4444", plan: "Professional", status: "warning", brands: 2, restaurants: 5, branches: 7, usedBranches: 7, users: 19, maxUsers: 50, monthlyRevenue: 4800, startDate: "فبراير 2024", nextBilling: "10 فبراير 2026", daysLeft: 24, modules: ["مبيعات", "مصروفات", "مشتريات", "مخزون"], adminEmail: "admin@balad.com.sa", city: "الدمام" },
  { id: "C004", name: "شركة المروج للضيافة", logo: "🌿", contactName: "عبدالله الحربي", contactEmail: "a.harbi@moroj.sa", contactPhone: "+966 56 444 5555", plan: "Basic", status: "danger", brands: 1, restaurants: 3, branches: 4, usedBranches: 3, users: 10, maxUsers: 15, monthlyRevenue: 1990, startDate: "أكتوبر 2024", nextBilling: "05 أكتوبر 2025", daysLeft: 7, modules: ["مبيعات", "مصروفات"], adminEmail: "admin@moroj.sa", city: "المدينة" },
  { id: "C005", name: "مجموعة الوطني للأكل", logo: "🇸🇦", contactName: "نورة السلمي", contactEmail: "noura@watani.sa", contactPhone: "+966 58 555 6666", plan: "Professional", status: "trial", brands: 2, restaurants: 4, branches: 5, usedBranches: 2, users: 8, maxUsers: 50, monthlyRevenue: 0, startDate: "مارس 2026", nextBilling: "15 أبريل 2026", daysLeft: 25, modules: ["مبيعات", "مصروفات", "مشتريات"], adminEmail: "admin@watani.sa", city: "الرياض" },
  { id: "C006", name: "شركة العربية للإطعام", logo: "🍽", contactName: "خالد الدوسري", contactEmail: "k.dos@arabia-food.sa", contactPhone: "+966 51 666 7777", plan: "Enterprise", status: "suspended", brands: 4, restaurants: 10, branches: 16, usedBranches: 16, users: 42, maxUsers: 999, monthlyRevenue: 0, startDate: "يونيو 2023", nextBilling: "—", daysLeft: 0, modules: ["مبيعات", "مصروفات", "مشتريات", "مخزون", "أصول"], adminEmail: "admin@arabia-food.sa", city: "مكة" },
];

export function AdminCompanies({ navigate }: PageProps) {
  const { data: apiCompanies } = useAdminCompanies();
  const suspendMut = useSuspendAdminCompany();
  const activateMut = useActivateAdminCompany();
  const upgradeMut = useUpgradeAdminCompany();
  const createCompanyMut = useCreateAdminCompany();
  const resetCompanyPwdMut = useResetCompanyAdminPassword();
  const [coForm, setCoForm] = useState({ name: "", contactName: "", adminEmail: "", phone: "", city: "", plan: "Professional" as CompanyPlan });
  const submitCompany = () => {
    if (!coForm.name.trim() || !coForm.adminEmail.trim()) return;
    createCompanyMut.mutate(
      { name: coForm.name, contactName: coForm.contactName, contactEmail: coForm.adminEmail, contactPhone: coForm.phone, city: coForm.city, plan: coForm.plan, modules: [], adminEmail: coForm.adminEmail } as any,
      { onSuccess: () => { setShowAdd(false); setCoForm({ name: "", contactName: "", adminEmail: "", phone: "", city: "", plan: "Professional" }); } },
    );
  };
  const { t, dir, lang } = useLang();
  const apiCompaniesArr = (apiCompanies as any)?.data ?? (apiCompanies as any);
  // Driven by GET /admin/companies. No static seed; map into the card shape with
  // safe defaults so missing fields never crash the filters/reducers below.
  const [companies, setCompanies] = useState<CompanySub[]>([]);
  useEffect(() => {
    if (!Array.isArray(apiCompaniesArr)) return;
    setCompanies(apiCompaniesArr.map((c: any) => {
      const m: any = {
        brands: 0, restaurants: 0, branches: 0, usedBranches: 0, users: 0, maxUsers: 0,
        monthlyRevenue: 0, daysLeft: 0, startDate: "", nextBilling: "", logo: "🏢",
        plan: "Basic", status: "active", modules: [], adminEmail: "", contactName: "",
        contactEmail: "", contactPhone: "", city: "", name: "—", ...c,
      };
      return {
        ...m,
        contactName: m.contactName ?? "", contactEmail: m.contactEmail ?? "",
        contactPhone: m.contactPhone ?? "", city: m.city ?? "", name: m.name ?? "—",
        usedBranches: m.usedBranches ?? 0, users: m.users ?? 0,
        monthlyRevenue: m.monthlyRevenue ?? 0, daysLeft: m.daysLeft ?? 0,
        modules: Array.isArray(m.modules) ? m.modules : [],
      };
    }) as CompanySub[]);
  }, [apiCompanies]); // eslint-disable-line react-hooks/exhaustive-deps
  const [filter, setFilter] = useState<"all" | CompanyPlan | "trial" | "suspended">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CompanySub | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState<{ company: CompanySub; targetPlan: CompanyPlan } | null>(null);

  const statusMeta = {
    active: { label: t("نشط", "Active"), cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    warning: { label: t("ينتهي قريباً", "Expiring Soon"), cls: "bg-amber-50 text-amber-700 border border-amber-200" },
    danger: { label: t("إنذار أخير", "Last Warning"), cls: "bg-red-50 text-red-700 border border-red-200" },
    suspended: { label: t("موقوف", "Suspended"), cls: "bg-gray-100 text-gray-500 border border-gray-200" },
    trial: { label: t("تجريبي", "Trial"), cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  };

  const shown = companies.filter(c => {
    const matchFilter = filter === "all" || (filter === "trial" ? c.status === "trial" : filter === "suspended" ? c.status === "suspended" : c.plan === filter);
    const matchSearch = !search || c.name.includes(search) || c.contactName.includes(search) || c.city.includes(search);
    return matchFilter && matchSearch;
  });

  const totalRevenue = companies.filter(c => c.status === "active" || c.status === "warning" || c.status === "danger").reduce((s, c) => s + c.monthlyRevenue, 0);
  const totalBranches = companies.reduce((s, c) => s + c.usedBranches, 0);
  const totalUsers = companies.reduce((s, c) => s + c.users, 0);

  const suspend = (id: string) => {
    setCompanies(p => p.map(c => c.id === id ? { ...c, status: "suspended" as const } : c));
    suspendMut.mutate(id);
  };
  const activate = (id: string) => {
    setCompanies(p => p.map(c => c.id === id ? { ...c, status: "active" as const, daysLeft: 365 } : c));
    activateMut.mutate(id);
  };
  const doUpgrade = (id: string, plan: CompanyPlan) => {
    setCompanies(p => p.map(c => c.id === id ? { ...c, plan, maxUsers: COMPANY_PLANS_META[plan].maxUsers, monthlyRevenue: COMPANY_PLANS_META[plan].price } : c));
    setShowUpgrade(null);
    if (selected) setSelected(s => s ? { ...s, plan, maxUsers: COMPANY_PLANS_META[plan].maxUsers } : s);
    upgradeMut.mutate({ id, plan: plan as "Basic" | "Professional" | "Enterprise" });
  };

  return (
    <div className="space-y-5" dir={dir}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("اشتراكات الشركات — بوابة المجموعات", "Company Subscriptions — Groups Portal")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{companies.length} {t("شركة مسجلة", "registered companies")} · {companies.filter(c => c.status === "active" || c.status === "warning").length} {t("نشطة", "active")} · {t("إيراد شهري", "Monthly Revenue")} {(totalRevenue / 1000).toFixed(0)}K {t("ر.س", "SAR")}</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 shadow-sm">
          <Plus size={14} /> {t("إضافة شركة جديدة", "Add New Company")}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        <KpiCard label={t("شركات نشطة", "Active Companies")} value={String(companies.filter(c => ["active", "warning", "danger"].includes(c.status)).length)} sub={t("من إجمالي الشركات", "of all companies")} icon={<CheckCircle2 size={16} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("تجريبي", "Trial")} value={String(companies.filter(c => c.status === "trial").length)} sub={t("يحتاج تحويل", "needs conversion")} icon={<Star size={16} className="text-blue-500" />} accent="blue" />
        <KpiCard label={t("ينتهي خلال 30 يوم", "Expires in 30 Days")} value={String(companies.filter(c => c.daysLeft > 0 && c.daysLeft <= 30).length)} sub={t("شركات تحتاج تجديد", "companies need renewal")} icon={<AlertTriangle size={16} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("الإيراد الشهري", "Monthly Revenue")} value={`${(totalRevenue / 1000).toFixed(0)}K`} sub={t("ر.س من الشركات", "SAR from companies")} icon={<Wallet size={16} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("فروع مدارة", "Managed Branches")} value={String(totalBranches)} sub={`${totalUsers} ${t("مستخدم", "users")}`} icon={<Building2 size={16} className="text-cyan-600" />} accent="cyan" />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-48">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("بحث بالشركة أو المسؤول أو المدينة...", "Search by company, contact or city...")} className="flex-1 text-sm outline-none" />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(["all", "Basic", "Professional", "Enterprise", "trial", "suspended"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {f === "all" ? t("الكل", "All") : f === "trial" ? t("تجريبي", "Trial") : f === "suspended" ? t("موقوف", "Suspended") : t(PLAN_NAMES_AR[f] || f, f)}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">{shown.length} {t("نتيجة", "results")}</span>
        </div>
      </div>

      {/* Companies table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">{t("قائمة الشركات المشتركة في بوابة المجموعات", "Companies Subscribed to Groups Portal")}</h3>
          <span className="text-xs text-gray-400">{shown.length} {t("شركة", "companies")}</span>
        </div>
        {shown.map(c => {
          const pm = COMPANY_PLANS_META[c.plan];
          const branchPct = Math.round((c.usedBranches / pm.maxBranches) * 100);
          return (
            <div key={c.id} className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelected(c)}>
              <div className="flex items-center gap-4">
                {/* Logo + name */}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-xl flex-shrink-0">{c.logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800 text-sm">{c.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${COMPANY_PLANS_META[c.plan].color}`}>{t(PLAN_NAMES_AR[c.plan] || c.plan, c.plan)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusMeta[c.status].cls}`}>{statusMeta[c.status].label}</span>
                    {c.status === "danger" && <span className="text-[10px] text-red-600 font-bold">⚠ {c.daysLeft} {t("يوم فقط", "days left")}</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-0.5">
                    <span className="text-[11px] text-gray-400">{c.contactName} · {c.city}</span>
                    <span className="text-[11px] text-gray-400">{c.brands} {t("علامة", "brands")} · {c.restaurants} {t("مطعم", "restaurants")} · {c.usedBranches} {t("فرع", "branches")}</span>
                    <span className="text-[11px] text-gray-400">{c.users} {t("مستخدم", "users")}</span>
                  </div>
                </div>

                {/* Usage + expiry */}
                <div className="w-40 flex-shrink-0 hidden lg:block">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>{t("الفروع", "Branches")}</span><span>{c.usedBranches}/{c.plan === "Enterprise" ? "∞" : pm.maxBranches}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full">
                    <div className={`h-1.5 rounded-full ${branchPct >= 90 ? "bg-red-500" : branchPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, branchPct)}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{t("تنتهي:", "Expires:")} {formatDateLong(lang, c.nextBilling) || c.nextBilling || "—"}</p>
                </div>

                {/* Revenue + actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {c.monthlyRevenue > 0 && (
                    <div className="text-left hidden xl:block">
                      <p className="font-mono font-bold text-gray-800 text-sm">{c.monthlyRevenue.toLocaleString()} ر.س</p>
                      <p className="text-[10px] text-gray-400">{t("سنوياً", "annually")}</p>
                    </div>
                  )}
                  <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    {(c.status === "suspended" || c.status === "danger") && (
                      <button onClick={() => activate(c.id)} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100">{t("تفعيل", "Activate")}</button>
                    )}
                    {c.status !== "suspended" && (
                      <button onClick={() => suspend(c.id)} className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200">{t("إيقاف", "Suspend")}</button>
                    )}
                    <button onClick={() => setSelected(c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><Eye size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Company Detail Panel (slide-in style modal) */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-start" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()} dir="rtl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-lg">{selected.logo}</div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{selected.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${COMPANY_PLANS_META[selected.plan].color}`}>{t(PLAN_NAMES_AR[selected.plan] || selected.plan, selected.plan)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusMeta[selected.status].cls}`}>{statusMeta[selected.status].label}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">{t("معلومات التواصل", "Contact Info")}</p>
                  <p className="font-semibold text-gray-800 text-sm">{selected.contactName}</p>
                  <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{selected.contactEmail}</p>
                  <p className="text-xs text-gray-500" dir="ltr">{selected.contactPhone}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t("المدينة:", "City:")} {selected.city}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">{t("حساب الأدمن", "Admin Account")}</p>
                  <p className="font-semibold text-gray-800 text-sm">{t("أدمن الشركة", "Company Admin")}</p>
                  <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{selected.adminEmail}</p>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => { if (selected.id && window.confirm(t("إعادة تعيين كلمة مرور أدمن الشركة؟ سيتم إرسالها بالبريد.", "Reset company admin password? It will be emailed."))) resetCompanyPwdMut.mutate({ id: selected.id }); }} className="px-2 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold hover:bg-purple-100">{t("إعادة تعيين كلمة المرور", "Reset Password")}</button>
                    <button className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold hover:bg-gray-200">{t("تسجيل الدخول باسمهم", "Login as Them")}</button>
                  </div>
                </div>
              </div>

              {/* Usage stats */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-3">{t("إحصائيات الاستخدام", "Usage Stats")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("الفروع", "Branches"), used: selected.usedBranches, max: selected.plan === "Enterprise" ? selected.usedBranches : COMPANY_PLANS_META[selected.plan].maxBranches, color: "bg-blue-500" },
                    { label: t("المستخدمون", "Users"), used: selected.users, max: selected.plan === "Enterprise" ? selected.users : selected.maxUsers, color: "bg-purple-500" },
                  ].map((u, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex justify-between text-xs font-semibold text-gray-600 mb-2">
                        <span>{u.label}</span><span>{u.used}/{selected.plan === "Enterprise" ? "∞" : u.max}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div className={`h-2 rounded-full ${u.color}`} style={{ width: `${Math.min(100, Math.round((u.used / u.max) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modules */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">{t("الوحدات المفعّلة", "Active Modules")} ({selected.modules.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.modules.map(m => (
                    <span key={m} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-lg font-medium">✓ {m}</span>
                  ))}
                  {["هدر", "كشف حساب", "عهدة نقدية"].filter(m => !selected.modules.includes(m)).map(m => (
                    <span key={m} className="text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-lg">○ {m}</span>
                  ))}
                </div>
              </div>

              {/* Billing */}
              <div className="bg-gradient-to-l from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-3">{t("معلومات الفوترة", "Billing Info")}</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-400">{t("الخطة", "Plan")}</p>
                    <p className="font-bold text-gray-800">{t(PLAN_NAMES_AR[selected.plan] || selected.plan, selected.plan)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t("القيمة السنوية", "Annual Value")}</p>
                    <p className="font-bold text-purple-700">{selected.monthlyRevenue.toLocaleString()} {t("ر.س", "SAR")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t("التجديد القادم", "Next Renewal")}</p>
                    <p className={`font-bold ${selected.daysLeft <= 30 ? "text-red-600" : "text-gray-800"}`}>{formatDateLong(lang, selected.nextBilling) || selected.nextBilling || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Upgrade/Actions */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-3">{t("إجراءات الاشتراك", "Subscription Actions")}</p>
                <div className="grid grid-cols-3 gap-3">
                  {(["Basic", "Professional", "Enterprise"] as CompanyPlan[]).map(plan => (
                    <button key={plan} onClick={() => plan !== selected.plan && setShowUpgrade({ company: selected, targetPlan: plan })}
                      className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${selected.plan === plan ? "border-purple-400 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-50"}`}>
                      {selected.plan === plan && <div className="text-[10px] font-normal text-purple-500 mb-0.5">{t("الخطة الحالية", "Current Plan")}</div>}
                      {t(PLAN_NAMES_AR[plan] || plan, plan)}
                      <div className="text-[10px] font-normal text-gray-400 mt-0.5">{COMPANY_PLANS_META[plan].price.toLocaleString()} {t("ر.س/سنة", "SAR/yr")}</div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => selected.status === "suspended" ? activate(selected.id) : suspend(selected.id)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${selected.status === "suspended" ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"}`}>
                    {selected.status === "suspended" ? t("✓ تفعيل الحساب", "✓ Activate Account") : t("⊘ إيقاف مؤقت", "⊘ Suspend")}
                  </button>
                  <button className="flex-1 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold hover:bg-blue-100">
                    📧 {t("إرسال تذكير تجديد", "Send Renewal Reminder")}
                  </button>
                </div>
              </div>

              {/* Structure */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">{t("هيكل المجموعة", "Group Structure")}</p>
                <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-2xl font-black text-gray-800">{selected.brands}</p><p className="text-[11px] text-gray-400">{t("علامة تجارية", "brands")}</p></div>
                  <div><p className="text-2xl font-black text-gray-800">{selected.restaurants}</p><p className="text-[11px] text-gray-400">{t("مطعم", "restaurants")}</p></div>
                  <div><p className="text-2xl font-black text-gray-800">{selected.usedBranches}</p><p className="text-[11px] text-gray-400">{t("فرع", "branches")}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade confirm */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" dir="rtl">
            <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4"><CreditCard size={24} className="text-purple-600" /></div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">{t("تأكيد تغيير الخطة", "Confirm Plan Change")}</h3>
            <p className="text-gray-500 text-sm mb-4">
              {t("تغيير خطة", "Change plan for")} <span className="font-bold">{showUpgrade.company.name}</span> {t("من", "from")} <span className="font-bold text-gray-700">{t(PLAN_NAMES_AR[showUpgrade.company.plan] || showUpgrade.company.plan, showUpgrade.company.plan)}</span> {t("إلى", "to")} <span className="font-bold text-purple-700">{t(PLAN_NAMES_AR[showUpgrade.targetPlan] || showUpgrade.targetPlan, showUpgrade.targetPlan)}</span>؟
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600">
              {t("القيمة الجديدة:", "New value:")} <span className="font-bold text-purple-700">{COMPANY_PLANS_META[showUpgrade.targetPlan].price.toLocaleString()} {t("ر.س/سنة", "SAR/yr")}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => doUpgrade(showUpgrade.company.id, showUpgrade.targetPlan)} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700">{t("تأكيد التغيير", "Confirm Change")}</button>
              <button onClick={() => setShowUpgrade(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">{t("إلغاء", "Cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Company modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
              <div><h3 className="font-bold">{t("إضافة شركة جديدة", "Add New Company")}</h3><p className="text-purple-200 text-xs">{t("منح حساب بوابة المجموعات", "Grant Group Portal Account")}</p></div>
              <button onClick={() => setShowAdd(false)} className="text-purple-200 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم الشركة", "Company Name")}</label><input value={coForm.name} onChange={e => setCoForm(f => ({ ...f, name: e.target.value }))} placeholder={t("مجموعة ...", "Group ...")} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم المسؤول", "Contact Name")}</label><input value={coForm.contactName} onChange={e => setCoForm(f => ({ ...f, contactName: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none" /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("المدينة", "City")}</label><input value={coForm.city} onChange={e => setCoForm(f => ({ ...f, city: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none" /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("البريد الإلكتروني (أدمن الشركة)", "Email (Company Admin)")}</label><input value={coForm.adminEmail} onChange={e => setCoForm(f => ({ ...f, adminEmail: e.target.value }))} dir="ltr" placeholder="admin@company.sa" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none" /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("رقم الجوال", "Mobile Number")}</label><input value={coForm.phone} onChange={e => setCoForm(f => ({ ...f, phone: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none" /></div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("الخطة", "Plan")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Basic", "Professional", "Enterprise"] as CompanyPlan[]).map(p => (
                    <button key={p} onClick={() => setCoForm(f => ({ ...f, plan: p }))} className={`py-2 rounded-xl border-2 text-xs font-bold transition-all ${coForm.plan === p ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600 hover:border-purple-400 hover:bg-purple-50"}`}>
                      {t(PLAN_NAMES_AR[p] || p, p)}<br /><span className="text-[10px] text-gray-400 font-normal">{COMPANY_PLANS_META[p].price.toLocaleString()} {t("ر.س", "SAR")}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                {t("سيتم إنشاء حساب أدمن الشركة وإرسال بيانات الدخول على البريد الإلكتروني تلقائياً.", "A company admin account will be created and login credentials sent to their email automatically.")}
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Btn onClick={() => setShowAdd(false)}>{t("إلغاء", "Cancel")}</Btn>
                <Btn variant="primary" onClick={submitCompany} disabled={!coForm.name.trim() || !coForm.adminEmail.trim() || createCompanyMut.isPending}><Send size={13} /> {t("إنشاء الحساب", "Create Account")}</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
