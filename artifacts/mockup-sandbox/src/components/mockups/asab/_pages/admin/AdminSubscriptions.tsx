import { useState, useEffect } from "react";
import {
  useAdminSubscriptions,
  useRenewSubscription,
  useChangeSubscriptionPlan,
  useUpdateSubscriptionModules,
  useCreateAdminRestaurant,
  useSuspendSubscription,
  useActivateSubscription,
  useToggleAutoReminder,
  useAdminBrands,
  useCreateAdminSubscription,
  useAdminPackages,
  useAdminModules,
  type AdminPackage,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { formatDateLong } from "../../_shared/formatters";
import { KpiCard } from "../../components/KpiCard";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import {
  Plus, CheckCircle2, AlertTriangle, XCircle, Home,
  ChevronDown, Check, X
} from "lucide-react";
import type { PageProps } from "../../_shared/types";

// Inline editor modal for a subscription card's three actions:
// change plan · add restaurant · edit modules. All three post to real endpoints.
function SubEditModal(props: {
  edit: { kind: "plan" | "restaurant" | "modules"; sub: any };
  packages: AdminPackage[];
  moduleOptions: Array<{ key: string; value?: string; labelAr: string; labelEn: string }>;
  changePlan: (id: string, plan: string) => void;
  addRestaurant: (brandId: string, name: string, city: string) => void;
  saveModules: (id: string, modules: string[]) => void;
  pending: boolean;
  onClose: () => void;
}) {
  const { edit, packages, moduleOptions, changePlan, addRestaurant, saveModules, pending, onClose } = props;
  const { t, lang } = useLang();
  const { sub } = edit;
  const [plan, setPlan] = useState<string>(() => {
    if (packages.some((p) => p.code === sub.plan)) return sub.plan;
    return packages[0]?.code ?? "";
  });
  const [restName, setRestName] = useState("");
  const [restCity, setRestCity] = useState("");
  const [mods, setMods] = useState<Set<string>>(() => new Set<string>(Array.isArray(sub.modules) ? sub.modules : []));
  const title =
    edit.kind === "plan" ? t("تعديل الباقة", "Edit Plan")
      : edit.kind === "restaurant" ? t("إضافة مطعم", "Add Restaurant")
        : t("تعديل الموديولات", "Edit Modules");

  const canSave =
    edit.kind === "plan" ? !!plan && plan !== sub.plan
      : edit.kind === "restaurant" ? restName.trim().length > 0 && restCity.trim().length > 0
        : true;

  const submit = () => {
    if (edit.kind === "plan") changePlan(sub.id, plan);
    else if (edit.kind === "restaurant") addRestaurant(sub.brandId, restName.trim(), restCity.trim());
    else saveModules(sub.id, Array.from(mods));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="px-5 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
          <h3 className="font-bold">{title} · {sub.name}</h3>
          <button onClick={onClose} className="text-purple-200 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          {edit.kind === "plan" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">{t("الباقة", "Plan")}</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400">
                {packages.length
                  ? packages.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)
                  : <option value="">{t("لا توجد باقات", "No packages")}</option>}
              </select>
            </div>
          )}
          {edit.kind === "restaurant" && (
            <>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم المطعم", "Restaurant name")}</label>
                <input value={restName} onChange={(e) => setRestName(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" placeholder={t("مطعم جديد", "New restaurant")} /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("المدينة", "City")}</label>
                <input value={restCity} onChange={(e) => setRestCity(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" placeholder={t("الرياض", "Riyadh")} /></div>
            </>
          )}
          {edit.kind === "modules" && (
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {moduleOptions.length === 0 && <p className="text-xs text-gray-400 col-span-2">{t("لا توجد موديولات متاحة", "No modules available")}</p>}
              {moduleOptions.map((m) => {
                const key = m.value ?? m.key;
                const on = mods.has(key);
                return (
                  <button key={key} type="button" onClick={() => setMods((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; })}
                    className={`text-xs px-3 py-2 rounded-lg border text-right transition-colors ${on ? "bg-purple-50 border-purple-300 text-purple-700 font-semibold" : "bg-white border-gray-200 text-gray-500"}`}>
                    {on ? "✓ " : ""}{lang === "en" ? m.labelEn : m.labelAr}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <Btn onClick={onClose}>{t("إلغاء", "Cancel")}</Btn>
            <Btn variant="primary" disabled={!canSave || pending} onClick={submit}>{t("حفظ", "Save")}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminSubscriptions({ }: PageProps) {
  const { data: apiSubs } = useAdminSubscriptions();
  const renewMut = useRenewSubscription();
  const changePlanMut = useChangeSubscriptionPlan();
  const updateSubModulesMut = useUpdateSubscriptionModules();
  const createRestMut = useCreateAdminRestaurant();
  const suspendSubMut = useSuspendSubscription();
  const activateSubMut = useActivateSubscription();
  const toggleReminderMut = useToggleAutoReminder();
  const { data: subBrandsApi } = useAdminBrands();
  const createSubMut = useCreateAdminSubscription();
  // Plans come from GET /admin/packages (active only) — the SAME source the
  // AddBrand dropdown uses. Hardcoded silver/gold/platinum was rejected by the
  // backend ("plan is invalid") because they aren't the packages the admin created.
  const { data: packagesApi = [] } = useAdminPackages();
  const activePackages = (Array.isArray(packagesApi) ? packagesApi : []).filter((p) => p.isActive);
  const { data: modulesLookup } = useAdminModules();
  type ModuleOpt = { key: string; value?: string; labelAr: string; labelEn: string };
  const moduleOptions: ModuleOpt[] = Array.isArray((modulesLookup as any)?.data)
    ? ((modulesLookup as any).data as ModuleOpt[])
    : Array.isArray(modulesLookup)
      ? (modulesLookup as unknown as ModuleOpt[])
      : [];
  const [showAddSub, setShowAddSub] = useState(false);
  const [subForm, setSubForm] = useState<{ brandId: string; plan: string; months: number }>({ brandId: "", plan: "", months: 12 });
  // Normalize the create-form plan to a real active package code once they load.
  useEffect(() => {
    if (activePackages.length && !activePackages.some((p) => p.code === subForm.plan)) {
      setSubForm((f) => ({ ...f, plan: activePackages[0].code }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packagesApi]);
  // Inline editor for the expanded-card actions (plan / add-restaurant / modules).
  const [subEdit, setSubEdit] = useState<{ kind: "plan" | "restaurant" | "modules"; sub: any } | null>(null);
  const { t, dir, lang } = useLang();
  // Driven by GET /admin/subscriptions — mapped into the card render shape. No static seed.
  type SubCard = {
    id: string; brandId?: string; name: string; abbr: string; color: string; owner: string; plan: string;
    subStatus: "active" | "warning" | "danger" | "expired" | "none"; hasSub: boolean; expires: string; expiresAtDate?: string; isExpired?: boolean; daysLeft: number;
    monthlyPrice?: number; restaurants: any[]; modules: string[];
  };
  const [subs, setSubs] = useState<SubCard[]>([]);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [autoReminders, setAutoReminders] = useState<Record<string, boolean>>({});
  // Brand-first merge: EVERY brand the admin added (GET /admin/brands) shows here with
  // its plan; a real subscription record (GET /admin/subscriptions) enriches it when one
  // exists, otherwise the brand is shown as «بدون اشتراك» so it's never hidden.
  useEffect(() => {
    const brands = Array.isArray(subBrandsApi) ? (subBrandsApi as any[]) : [];
    const subsArr = Array.isArray(apiSubs) ? (apiSubs as any[]) : [];
    const subFor = (b: any) => subsArr.find((s: any) => (s.brandId && s.brandId === b.id) || (s.brandName && s.brandName === b.name));
    const cardFromSub = (s: any, brand?: any): SubCard => ({
      id: s.id,
      brandId: s.brandId ?? brand?.id,
      name: s.brandName ?? brand?.name ?? s.name ?? "—",
      abbr: (s.brandName ?? brand?.name ?? "؟").toString().slice(0, 2),
      color: brand?.color ?? s.color ?? "#7C3AED",
      owner: brand?.owner ?? s.owner ?? s.ownerEmail ?? "",
      plan: s.plan ?? brand?.plan ?? "—",
      subStatus: (s.status ?? "active") as SubCard["subStatus"],
      hasSub: true,
      expires: s.expiresAt ?? "",
      // 2026-08-03: prefer the server's display-ready YYYY-MM-DD; `daysLeft` is now
      // recomputed at read time and `isExpired` is authoritative (was a stale column).
      expiresAtDate: s.expiresAtDate ?? s.expiresAt ?? "",
      isExpired: s.isExpired ?? ((s.daysLeft ?? 0) < 0),
      daysLeft: s.daysLeft ?? 0,
      monthlyPrice: s.monthlyPrice,
      restaurants: Array.isArray(brand?.restaurants) ? brand.restaurants : (Array.isArray(s.restaurants) ? s.restaurants : []),
      modules: Array.isArray(s.modules) ? s.modules : (Array.isArray(brand?.modules) ? brand.modules : []),
    });
    const cardFromBrand = (b: any): SubCard => ({
      id: b.id,
      brandId: b.id,
      name: b.name ?? "—",
      abbr: (b.name ?? "؟").toString().slice(0, 2),
      color: b.color ?? "#7C3AED",
      owner: b.owner ?? b.ownerEmail ?? "",
      plan: b.plan ?? "—",
      subStatus: "none",
      hasSub: false,
      expires: "",
      daysLeft: 0,
      monthlyPrice: undefined,
      restaurants: Array.isArray(b.restaurants) ? b.restaurants : [],
      modules: Array.isArray(b.modules) ? b.modules : [],
    });
    let mapped: SubCard[];
    if (brands.length > 0) {
      mapped = brands.map((b: any) => { const s = subFor(b); return s ? cardFromSub(s, b) : cardFromBrand(b); });
      // Keep any orphan subscriptions whose brand isn't in the brands list.
      subsArr.forEach((s: any) => { if (!mapped.some(m => (s.brandId && m.brandId === s.brandId) || m.name === s.brandName)) mapped.push(cardFromSub(s)); });
    } else {
      mapped = subsArr.map((s: any) => cardFromSub(s));
    }
    setSubs(mapped);
    setAutoReminders(Object.fromEntries(subsArr.map((s: any) => [s.id, !!s.reminderEnabled])));
  }, [apiSubs, subBrandsApi]);
  const statusCls = { active: "border-emerald-200 bg-emerald-50/20", warning: "border-amber-200 bg-amber-50/20", danger: "border-red-200 bg-red-50/20", expired: "border-red-300 bg-red-50/30", none: "border-gray-200 bg-gray-50/40" };
  const statusBadgeCls = { active: "bg-emerald-50 text-emerald-700", warning: "bg-amber-50 text-amber-700", danger: "bg-red-50 text-red-700", expired: "bg-red-100 text-red-800", none: "bg-gray-100 text-gray-600" };
  const statusLabel = { active: t("اشتراك نشط", "Active Subscription"), warning: t("ينتهي قريباً", "Expiring Soon"), danger: t("إنذار انتهاء", "Expiry Alert"), expired: t("منتهي الاشتراك", "Subscription Expired"), none: t("بدون اشتراك", "No subscription") };
  const renew = (id: string) => {
    setSubs(p => p.map(s => s.id === id ? { ...s, subStatus: "active" as const, daysLeft: 365, expires: "14 مارس 2027" } : s) as typeof subs);
    renewMut.mutate({ id });
  };
  // Side-effect bindings — call when status toggles or plan is changed.
  const onSuspendSub = (id: string) => suspendSubMut.mutate(id);
  const onActivateSub = (id: string) => activateSubMut.mutate(id);
  const onChangePlan = (id: string, plan: string) => changePlanMut.mutate({ id, plan });
  void onSuspendSub; void onActivateSub; void onChangePlan;

  const totalRestaurants = subs.reduce((s, b) => s + (b.restaurants?.length ?? 0), 0);
  const totalBranches = subs.reduce((s, b) => s + (b.restaurants ?? []).reduce((ss, r) => ss + (r.branches?.length ?? 0), 0), 0);

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("إدارة الاشتراكات", "Subscription Management")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{subs.length} {t("علامة تجارية", "brands")} · {totalRestaurants} {t("مطعم", "restaurants")} · {totalBranches} {t("فرع", "branches")}</p>
        </div>
        <Btn variant="primary" onClick={() => setShowAddSub(true)}><Plus size={14} /> {t("اشتراك جديد", "New Subscription")}</Btn>
      </div>

      {showAddSub && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddSub(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
              <h3 className="font-bold">{t("اشتراك جديد", "New Subscription")}</h3>
              <button onClick={() => setShowAddSub(false)} className="text-purple-200 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("العلامة التجارية", "Brand")}</label>
                <select value={subForm.brandId} onChange={e => setSubForm(f => ({ ...f, brandId: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400">
                  <option value="">{t("اختر العلامة", "Select brand")}</option>
                  {(Array.isArray(subBrandsApi) ? subBrandsApi : []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الباقة", "Plan")}</label>
                  <select value={subForm.plan} onChange={e => setSubForm(f => ({ ...f, plan: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400">
                    {activePackages.length
                      ? activePackages.map(p => <option key={p.id} value={p.code}>{p.name}</option>)
                      : <option value="">{t("لا توجد باقات — أضف باقة أولاً", "No packages — add one first")}</option>}
                  </select></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("عدد الأشهر", "Months")}</label><input type="number" min={1} max={36} value={subForm.months} onChange={e => setSubForm(f => ({ ...f, months: Number(e.target.value) || 1 }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Btn onClick={() => setShowAddSub(false)}>{t("إلغاء", "Cancel")}</Btn>
                <Btn variant="primary" disabled={!subForm.brandId || !subForm.plan || createSubMut.isPending} onClick={() => { createSubMut.mutate({ brandId: subForm.brandId, plan: subForm.plan, months: subForm.months }, { onSuccess: () => { setShowAddSub(false); setSubForm({ brandId: "", plan: activePackages[0]?.code ?? "", months: 12 }); } }); }}><Plus size={13} /> {t("إنشاء", "Create")}</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {subEdit && (
        <SubEditModal
          edit={subEdit}
          packages={activePackages}
          moduleOptions={moduleOptions}
          pending={changePlanMut.isPending || createRestMut.isPending || updateSubModulesMut.isPending}
          onClose={() => setSubEdit(null)}
          changePlan={(id, plan) => changePlanMut.mutate({ id, plan }, { onSuccess: () => setSubEdit(null) })}
          addRestaurant={(brandId, name, city) => createRestMut.mutate({ brandId, name, city }, { onSuccess: () => setSubEdit(null) })}
          saveModules={(id, modules) => updateSubModulesMut.mutate({ id, modules }, { onSuccess: () => setSubEdit(null) })}
        />
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label={t("اشتراكات نشطة", "Active Subscriptions")} value={String(subs.filter(s => s.subStatus === "active").length)} sub="" icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("تنتهي قريباً", "Expiring Soon")} value={String(subs.filter(s => s.subStatus === "warning" || s.subStatus === "danger").length)} sub="" icon={<AlertTriangle size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("منتهية الاشتراك", "Expired")} value={String(subs.filter(s => s.subStatus === "expired").length)} sub="" icon={<XCircle size={18} className="text-red-500" />} accent="red" />
        <KpiCard label={t("إجمالي الفروع", "Total Branches")} value={String(totalBranches)} sub="" icon={<Home size={18} className="text-purple-600" />} accent="purple" />
      </div>

      {/* Per-brand subscription cards */}
      <div className="space-y-3">
        {subs.map((sub) => {
          const isExp = expandedSub === sub.id;
          const restCount = sub.restaurants?.length ?? 0;
          const branchCount = (sub.restaurants ?? []).reduce((s, r) => s + (r.branches?.length ?? 0), 0);

          return (
            <div key={sub.id} className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden ${statusCls[sub.subStatus]}`}>
              {/* Main row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: sub.color }}>{sub.abbr}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800">{sub.name}</p>
                    <Badge className={`text-[10px] bg-purple-50 text-purple-600`}>باقة {sub.plan}</Badge>
                    <Badge className={`text-[10px] ${statusBadgeCls[sub.subStatus]}`}>{statusLabel[sub.subStatus]}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{sub.owner} · {restCount} {t("مطعم", "restaurants")} · {branchCount} {t("فرع", "branches")}</p>
                </div>

                {/* Expiry bar */}
                <div className="w-40 flex-shrink-0 hidden md:block">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>{t("تاريخ الانتهاء:", "Expires:")} {formatDateLong(lang, sub.expiresAtDate || sub.expires) || sub.expires || "—"}</span>
                    <span className={sub.isExpired ? "text-red-600 font-bold" : ""}>{sub.isExpired ? `${t("منتهي", "Expired")} ${Math.abs(sub.daysLeft)} ${t("يوم", "days")}` : `${sub.daysLeft} ${t("يوم", "days")}`}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${sub.subStatus === "active" ? "bg-emerald-500" : sub.subStatus === "warning" ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.max(0, Math.min(100, (sub.daysLeft / 365) * 100))}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { const next = !autoReminders[sub.id]; setAutoReminders(p => ({ ...p, [sub.id]: next })); toggleReminderMut.mutate({ id: sub.id, enabled: next }); }}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${autoReminders[sub.id] ? "bg-purple-600" : "bg-gray-200"}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${autoReminders[sub.id] ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    <span className="text-[10px] text-gray-500">{t("تذكير تلقائي", "Auto Reminder")}</span>
                  </div>
                  {sub.hasSub ? (
                    <button onClick={() => renew(sub.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sub.subStatus === "expired" ? "bg-red-600 text-white hover:bg-red-700" : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"}`}>
                      {sub.subStatus === "expired" ? t("تفعيل", "Activate") : t("تجديد", "Renew")}
                    </button>
                  ) : (
                    <button onClick={() => { setSubForm(f => ({ ...f, brandId: sub.brandId ?? "" })); setShowAddSub(true); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-purple-600 text-white hover:bg-purple-700">
                      {t("إنشاء اشتراك", "Create subscription")}
                    </button>
                  )}
                  <button onClick={() => setExpandedSub(isExp ? null : sub.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100">
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${isExp ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExp && (
                <div className="border-t border-gray-200 px-5 py-4 space-y-4 bg-gray-50/50">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">{t("الموديولات الفعّالة", "Active Modules")}</p>
                      <div className="flex flex-wrap gap-1">
                        {sub.modules.map(m => <span key={m} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{m}</span>)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">{t("المطاعم والفروع", "Restaurants & Branches")}</p>
                      <div className="space-y-1">
                        {(sub.restaurants ?? []).map(r => (
                          <div key={r.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700">{r.name}</span>
                            <span className="text-gray-400">{r.branches?.length ?? 0} {t("فروع", "branches")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">{t("الفوترة", "Billing")}</p>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between"><span className="text-gray-400">{t("الباقة:", "Plan:")}</span><span className="font-medium">{t("باقة", "Plan")} {sub.plan}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">{t("عدد الفروع:", "Branches:")}</span><span className="font-medium">{branchCount} {t("فرع", "branches")}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">{t("تاريخ الانتهاء:", "Expires:")}</span><span className={`font-medium ${sub.subStatus === "expired" ? "text-red-600" : ""}`}>{sub.expires}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {sub.hasSub && (
                      <Btn size="sm" onClick={() => setSubEdit({ kind: "plan", sub })}>{t("تعديل الباقة", "Edit Plan")}</Btn>
                    )}
                    <Btn size="sm" variant="ghost" onClick={() => setSubEdit({ kind: "restaurant", sub })} disabled={!sub.brandId}>{t("إضافة مطعم", "Add Restaurant")}</Btn>
                    {sub.hasSub && (
                      <Btn size="sm" variant="ghost" onClick={() => setSubEdit({ kind: "modules", sub })}>{t("تعديل الموديولات", "Edit Modules")}</Btn>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
