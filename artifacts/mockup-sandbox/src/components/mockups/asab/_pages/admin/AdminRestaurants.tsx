import { useState, useEffect, useMemo } from "react";
import {
  useAdminBrands,
  useAdminRestaurantSubscriptions,
  useRenewSubscription,
  useCreateAdminBrand,
  useResetBrandOwnerPassword,
  useCreateAdminRestaurant,
  useCreateAdminBranch,
  useUpdateAdminRestaurant,
  useAdminCompanies,
  useAdminPackages,
  useAdminBrandUploadStatus,
  useAdminUploadBrand,
  useAdminUploadEmployees,
  useAdminUploadBranchEmployees,
  useAdminUploadFixedAssets,
  useAdminUploadTemplate,
  useAdminRestaurantEmployeeStatus,
  useAdminBrandBranchesUploadStatus,
  useAdminUnlinkedBranches,
  useLinkBranch,
  type AdminPackage,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { BRANCHES } from "../../_shared/filterOps";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import {
  Plus, CheckCircle2, Upload, Download, Search,
  TrendingUp, Package, Truck, Clock, Home,
  AlertTriangle, ChevronDown, Edit2, Users, X, Check
} from "lucide-react";
import { toast } from "sonner";
import { isApiError } from "../../../../../api/errors";
import type { PageProps } from "../../_shared/types";

// UI plan label (فضي/ذهبي/بلاتيني) → backend plan key (silver/gold/platinum).
const planKey = (label: string): string =>
  (({ "فضي": "silver", "ذهبي": "gold", "بلاتيني": "platinum" }) as Record<string, string>)[label] ?? label;



const BRANDS_DATA = [
  {
    id: "reem", name: "مطاعم الريم", color: "#7C3AED", abbr: "ر", plan: "بلاتيني", planColor: "purple",
    owner: "فيصل الريم", ownerEmail: "faisal@reem.sa",
    modules: ["المبيعات", "المصروفات", "المشتريات", "المخزون", "الشفتات", "كشف الحساب", "العهد", "الأصول"],
    subStatus: "active" as const, expires: "15 يناير 2027", daysLeft: 307,
    restaurants: [
      { id: "r1", name: "الريم — الصحافة", city: "الرياض", accountants: 2, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "أحمد الشمري" }, { name: "قسم التوصيل", manager: "سلطان الغامدي" }] },
      { id: "r2", name: "الريم — النسيم", city: "الرياض", accountants: 1, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "فيصل البريك" }, { name: "قسم التوصيل", manager: "بندر العتيبي" }] },
      { id: "r3", name: "الريم — العليا", city: "الرياض", accountants: 2, status: "active" as const, branches: [{ name: "الدور الأرضي", manager: "محمد الزهراني" }, { name: "الدور الأول", manager: "علي الغامدي" }] },
      { id: "r4", name: "الريم — جدة الكورنيش", city: "جدة", accountants: 1, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "خالد المطيري" }, { name: "قسم التوصيل", manager: "عمر العسيري" }] },
    ],
  },
  {
    id: "herfy", name: "مطاعم هرفي", color: "#D97706", abbr: "هـ", plan: "ذهبي", planColor: "amber",
    owner: "طلال الحسين", ownerEmail: "talal@herfy.sa",
    modules: ["المبيعات", "المصروفات", "المشتريات", "المخزون", "الشفتات", "كشف الحساب"],
    subStatus: "warning" as const, expires: "15 مارس 2026", daysLeft: 1,
    restaurants: [
      { id: "r5", name: "هرفي الصحافة", city: "الرياض", accountants: 3, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "طارق المنصور" }, { name: "قسم التوصيل", manager: "بندر القحطاني" }] },
      { id: "r6", name: "هرفي النسيم", city: "الرياض", accountants: 2, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "وليد الشهري" }, { name: "قسم التوصيل", manager: "نواف العمري" }] },
      { id: "r7", name: "هرفي العليا", city: "الرياض", accountants: 1, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "عبدالرحمن الغامدي" }, { name: "قسم التوصيل", manager: "صالح الحربي" }] },
      { id: "r8", name: "هرفي جدة الرحاب", city: "جدة", accountants: 1, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "حمد الدوسري" }, { name: "قسم التوصيل", manager: "جاسم القرني" }] },
      { id: "r9", name: "هرفي مكة العزيزية", city: "مكة", accountants: 1, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "أنس الطيار" }, { name: "قسم التوصيل", manager: "ماجد الشريف" }] },
    ],
  },
  {
    id: "mcd", name: "ماكدونالدز السعودية", color: "#DC2626", abbr: "م", plan: "بلاتيني", planColor: "purple",
    owner: "شركة المطعم العالمي", ownerEmail: "ops@mcd-sa.com",
    modules: ["المبيعات", "المصروفات", "المشتريات", "المخزون", "الشفتات", "كشف الحساب", "العهد", "الأصول"],
    subStatus: "danger" as const, expires: "21 أبريل 2026", daysLeft: 38,
    restaurants: [
      { id: "r10", name: "ماكدونالدز الدبلوماسي", city: "الرياض", accountants: 2, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "بدر الحوشان" }, { name: "قسم التوصيل", manager: "منصور العنزي" }] },
      { id: "r11", name: "ماكدونالدز النخيل مول", city: "الرياض", accountants: 2, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "سعد المالكي" }, { name: "قسم التوصيل", manager: "فهد الدوسري" }] },
      { id: "r12", name: "ماكدونالدز هايبر بنده", city: "الرياض", accountants: 1, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "وائل العتيبي" }, { name: "قسم التوصيل", manager: "رائد الشمري" }] },
      { id: "r13", name: "ماكدونالدز كورنيش الدمام", city: "الدمام", accountants: 2, status: "active" as const, branches: [{ name: "الصالة الرئيسية", manager: "خالد المطيري" }, { name: "قسم التوصيل", manager: "عمر العسيري" }] },
    ],
  },
  {
    id: "broasted", name: "بروستد الوطني", color: "#059669", abbr: "ب", plan: "فضي", planColor: "emerald",
    owner: "محمد السعيد", ownerEmail: "msaeed@broasted.sa",
    modules: ["المبيعات", "المصروفات", "المشتريات", "المخزون"],
    subStatus: "expired" as const, expires: "9 أكتوبر 2025", daysLeft: -156,
    restaurants: [
      { id: "r14", name: "بروستد الوطني الطائف", city: "الطائف", accountants: 1, status: "suspended" as const, branches: [{ name: "الصالة الرئيسية", manager: "نايف العتيبي" }, { name: "قسم التوصيل", manager: "عبدالله الشريف" }] },
      { id: "r15", name: "بروستد الوطني الهدا", city: "الطائف", accountants: 1, status: "suspended" as const, branches: [{ name: "الصالة الرئيسية", manager: "محمد الغامدي" }, { name: "قسم التوصيل", manager: "سعد القحطاني" }] },
    ],
  },
];

export function AdminRestaurants({ }: PageProps) {
  const { data: brandsApi } = useAdminBrands();
  useAdminRestaurantSubscriptions();
  const renewSubMut = useRenewSubscription();
  const createBrandMut = useCreateAdminBrand();
  const resetOwnerMut = useResetBrandOwnerPassword();
  const createRestMut = useCreateAdminRestaurant();
  const createBranchMut = useCreateAdminBranch();
  const updateRestMut = useUpdateAdminRestaurant();
  const { data: companiesApi } = useAdminCompanies();
  const companyOptions = (((companiesApi as any)?.data ?? companiesApi ?? []) as any[]);
  // Packages now come from GET /admin/packages (show active only). The brand's
  // `plan` field carries the chosen package `code`.
  const { data: packagesApi = [] } = useAdminPackages();
  const activePackages = packagesApi.filter(p => p.isActive);
  const [brandForm, setBrandForm] = useState({ name: "", owner: "", ownerEmail: "", plan: "فضي", companyId: "" });
  // Once packages load, normalize the plan to a real package code so the select
  // reflects a valid option instead of the legacy Arabic placeholder.
  useEffect(() => {
    if (activePackages.length && !activePackages.some(p => p.code === brandForm.plan)) {
      setBrandForm(f => ({ ...f, plan: activePackages[0].code }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packagesApi]);
  const [restForm, setRestForm] = useState({ brandId: "", name: "", city: "" });
  const [addBranchRest, setAddBranchRest] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [editRest, setEditRest] = useState<any | null>(null);
  const [editRestForm, setEditRestForm] = useState({ name: "", city: "", status: "active" });
  // Only adopt the API shape when it includes nested restaurants/branches; otherwise
  // fall back to the mock tree so the UI stays renderable while backend backfills nesting.
  const apiBrands = brandsApi as any;
  // Drive entirely from GET /admin/brands. When the API returns brands with
  // nested restaurants/branches we render the full tree; otherwise we render
  // whatever brands came back (flat) — never hiding brands or blanking the structure.
  const BRANDS = (Array.isArray(apiBrands)
    ? apiBrands.map((b: any) => ({
        ...b,
        restaurants: (Array.isArray(b.restaurants) ? b.restaurants : []).map((r: any) => ({
          ...r,
          branches: Array.isArray(r.branches) ? r.branches : [],
        })),
      }))
    : []) as typeof BRANDS_DATA;
  const { t, dir } = useLang();
  const [expandedBrand, setExpandedBrand] = useState<string | null>("reem");
  const [expandedRest, setExpandedRest] = useState<string | null>(null);
  const [expandedSub, setExpandedSubR] = useState<string | null>(null);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [linkBrand, setLinkBrand] = useState<{ id: string; name: string } | null>(null);
  const [showAddRest, setShowAddRest] = useState<string | null>(null);
  const [restTab, setRestTab] = useState<"structure" | "upload">("structure");
  type UploadKey = "sales" | "materials" | "employees" | "suppliers";
  const [uploadBrand, setUploadBrand] = useState<string>("reem");
  // No fake seed — the real done-state is synced from GET /admin/brands/{id}/upload-status.
  const [brandUploads, setBrandUploads] = useState<Record<string, Record<UploadKey, boolean>>>({});
  const setUploaded = (brandId: string, key: UploadKey) =>
    setBrandUploads(p => ({ ...p, [brandId]: { ...(p[brandId] ?? { sales: false, materials: false, employees: false, suppliers: false }), [key]: true } }));
  // Reflect the truthful server state (shared.* only turns true after a successful upload).
  const { data: uploadStatusApi } = useAdminBrandUploadStatus(uploadBrand);
  useEffect(() => {
    const shared = (uploadStatusApi as any)?.shared;
    if (!shared) return;
    setBrandUploads(p => ({
      ...p, [uploadBrand]: {
        ...(p[uploadBrand] ?? { sales: false, materials: false, employees: false, suppliers: false }),
        sales: !!shared.sales, materials: !!shared.materials, suppliers: !!shared.suppliers,
      }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadStatusApi, uploadBrand]);
  const [branchAssets, setBranchAssets] = useState<Record<string, boolean>>({
    "reem_r1_0": true, "reem_r1_1": false,
    "reem_r2_0": false, "reem_r2_1": false,
    "herfy_r5_0": true, "herfy_r5_1": true,
  });
  const setBranchAsset = (key: string) => setBranchAssets(p => ({ ...p, [key]: true }));
  const [uploadRestFilter, setUploadRestFilter] = useState("");
  const [uploadBrandFilter, setUploadBrandFilter] = useState("");
  // The seeded default id ("reem") rarely matches a real API brand — once brands
  // load, point the upload and expanded tabs at the first real brand.
  useEffect(() => {
    if (BRANDS.length && !BRANDS.some(b => b.id === uploadBrand)) setUploadBrand(BRANDS[0].id);
    if (BRANDS.length && !BRANDS.some(b => b.id === expandedBrand)) setExpandedBrand(BRANDS[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandsApi, BRANDS.length]);

  // ── Real upload wiring (the tab was entirely local booleans before) ──────────
  const uploadBrandMut = useAdminUploadBrand();
  const uploadEmpMut = useAdminUploadEmployees();
  const uploadBranchEmpMut = useAdminUploadBranchEmployees();
  const uploadAssetsMut = useAdminUploadFixedAssets();
  const templateMut = useAdminUploadTemplate();
  const { data: brandUploadStatus } = useAdminBrandUploadStatus(uploadBrand);
  // Employees aren't a brand-owner upload step, so brandUploadStatus never
  // reports them (the `.employees` map there is always empty → the column was
  // stuck on «لم يُرفع»). Read the real per-restaurant employee state from the
  // restaurant upload-status endpoint instead — batched over the brand's rests.
  const uploadRestIds = useMemo(
    () => (BRANDS.find(b => b.id === uploadBrand) ?? BRANDS[0])?.restaurants.map(r => r.id) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploadBrand, brandsApi],
  );
  const restEmpStatus = useAdminRestaurantEmployeeStatus(uploadRestIds);
  // Per-branch fixed-assets status (done/failed/not_uploaded) — the whole column
  // in one call. Brand upload-status never tracked per-branch assets, so the
  // column was stuck on «لم يُرفع» before this.
  const { data: branchesAssetStatus } = useAdminBrandBranchesUploadStatus(uploadBrand);
  const { branchAssetStatusMap, branchAssetReasonMap, branchEmpStatusMap } = useMemo(() => {
    const raw: any = (branchesAssetStatus as any)?.branches ?? branchesAssetStatus ?? [];
    const map: Record<string, "done" | "failed" | "not_uploaded"> = {};
    const reasons: Record<string, string> = {};
    const emp: Record<string, "done" | "failed" | "not_uploaded"> = {};
    const put = (id: string, v: any) => {
      if (!id) return;
      map[id] = (v?.fixedAssetsStatus ?? v?.status ?? v) as any;
      const r = v?.fixedAssetsFailureReason ?? v?.reason;
      if (r) reasons[id] = r;
      // 2026-08-04: same payload now carries the per-branch employees column.
      const es = v?.employeesStatus ?? (v?.employees === true ? "done" : v?.employees === false ? "not_uploaded" : undefined);
      if (es) emp[id] = es as any;
    };
    if (Array.isArray(raw)) {
      for (const b of raw) put(b?.branchId ?? b?.id, b);
    } else if (raw && typeof raw === "object") {
      for (const [id, v] of Object.entries(raw)) put(id, v);
    }
    return { branchAssetStatusMap: map, branchAssetReasonMap: reasons, branchEmpStatusMap: emp };
  }, [branchesAssetStatus]);
  // Last failure per card key, so INVALID_HEADER can show expected vs received.
  const [uploadErrors, setUploadErrors] = useState<Record<string, any>>({});
  const noteUploadError = (key: string, e: unknown) => {
    const err = e as { code?: string; messageAr?: string; details?: any };
    setUploadErrors(p => ({
      ...p, [key]: {
        code: err?.code, messageAr: err?.messageAr,
        expected: err?.details?.expected, received: err?.details?.received,
        rows: undefined,
      }
    }));
  };
  const clearUploadError = (key: string) => setUploadErrors(p => { const n = { ...p }; delete n[key]; return n; });
  // A partial import is normal — surface per-row errors after a 200.
  const noteRowErrors = (key: string, res: any) => {
    const rows = res?.errors ?? [];
    if (rows.length) setUploadErrors(p => ({ ...p, [key]: { code: "ROW_ERRORS", rows } }));
    else clearUploadError(key);
  };
  // Surface post-upload outcome for the shared catalog (T-BUG-9): how many branches
  // got seeded, and the NO_BRANCHES_LINKED warning (uploaded OK but invisible in app).
  const noteUploadOutcome = (res: any) => {
    const seeded = res?.branchesSeeded;
    if (typeof seeded === "number" && seeded > 0)
      toast.success(t(`تم زرع الأصناف في ${seeded} فرع`, `Seeded into ${seeded} branches`));
    const warns: string[] = Array.isArray(res?.warnings) ? res.warnings : [];
    if (warns.includes("NO_BRANCHES_LINKED"))
      toast.warning(t("تم الرفع لكن لا توجد فروع مربوطة — الأصناف لن تظهر في التطبيق حتى تُربط الفروع", "Uploaded, but no linked branches — items won't appear in the app until branches are linked"));
  };

  // Per-restaurant subscription state
  type RestSub = { plan: "فضي" | "ذهبي" | "بلاتيني"; status: "active" | "warning" | "danger" | "expired"; expires: string; daysLeft: number; price: number };
  const [restSubs, setRestSubs] = useState<Record<string, RestSub>>({
    r1: { plan: "بلاتيني", status: "active", expires: "15 يناير 2027", daysLeft: 307, price: 2499 },
    r2: { plan: "بلاتيني", status: "active", expires: "15 يناير 2027", daysLeft: 307, price: 2499 },
    r3: { plan: "بلاتيني", status: "warning", expires: "20 أبريل 2026", daysLeft: 35, price: 2499 },
    r4: { plan: "ذهبي", status: "active", expires: "1 ديسمبر 2026", daysLeft: 260, price: 1499 },
    r5: { plan: "ذهبي", status: "warning", expires: "15 مارس 2026", daysLeft: 1, price: 1499 },
    r6: { plan: "ذهبي", status: "active", expires: "20 سبتمبر 2026", daysLeft: 190, price: 1499 },
    r7: { plan: "فضي", status: "danger", expires: "25 مارس 2026", daysLeft: 10, price: 799 },
    r8: { plan: "فضي", status: "active", expires: "1 نوفمبر 2026", daysLeft: 230, price: 799 },
    r9: { plan: "فضي", status: "active", expires: "1 نوفمبر 2026", daysLeft: 230, price: 799 },
    r10: { plan: "بلاتيني", status: "active", expires: "10 فبراير 2027", daysLeft: 333, price: 2499 },
    r11: { plan: "بلاتيني", status: "active", expires: "10 فبراير 2027", daysLeft: 333, price: 2499 },
    r12: { plan: "بلاتيني", status: "danger", expires: "21 أبريل 2026", daysLeft: 38, price: 2499 },
    r13: { plan: "ذهبي", status: "danger", expires: "21 أبريل 2026", daysLeft: 38, price: 1499 },
    r14: { plan: "فضي", status: "expired", expires: "9 أكتوبر 2025", daysLeft: -156, price: 799 },
    r15: { plan: "فضي", status: "expired", expires: "9 أكتوبر 2025", daysLeft: -156, price: 799 },
  });
  const renewSub = (id: string) => {
    setRestSubs(p => ({ ...p, [id]: { ...p[id], status: "active", daysLeft: 365, expires: "مارس 2027" } }));
    renewSubMut.mutate({ id });
  };

  const subClsRest = { active: "bg-emerald-50 text-emerald-700 border-emerald-200", warning: "bg-amber-50 text-amber-700 border-amber-200", danger: "bg-red-50 text-red-700 border-red-200", expired: "bg-red-100 text-red-800 border-red-300" };
  const subLblRest = { active: t("نشط", "Active"), warning: t("ينتهي قريباً", "Expiring Soon"), danger: t("إنذار انتهاء", "Expiry Alert"), expired: t("منتهي", "Expired") };
  const planIcon = { "فضي": "🥈", "ذهبي": "🥇", "بلاتيني": "💎" };

  const totalRests = BRANDS.reduce((s, b) => s + b.restaurants.length, 0);
  const totalBranches = BRANDS.reduce((s, b) => s + b.restaurants.reduce((ss, r) => ss + r.branches.length, 0), 0);

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("الهيكل التشغيلي — العلامات والمطاعم والفروع", "Operational Structure — Brands, Restaurants & Branches")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{BRANDS.length} {t("علامة تجارية", "brands")} · {totalRests} {t("مطعم", "restaurants")} · {totalBranches} {t("فرع", "branches")}</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => setShowAddRest("")}><Plus size={14} /> {t("مطعم جديد", "New Restaurant")}</Btn>
          <Btn variant="primary" onClick={() => setShowAddBrand(true)}><Plus size={14} /> {t("علامة تجارية", "New Brand")}</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {[{ id: "structure" as const, label: t("🏗 الهيكل التشغيلي", "🏗 Structure") }, { id: "upload" as const, label: t("📤 رفع البيانات", "📤 Upload Data") }].map(tb => (
          <button key={tb.id} onClick={() => setRestTab(tb.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${restTab === tb.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{tb.label}</button>
        ))}
      </div>

      {/* ── Upload Tab ── */}
      {restTab === "upload" && (() => {
        // Fall back to the first brand and bail out cleanly when there are none —
        // guards the transient render before the sync effect fires and the empty case.
        const selBrand = BRANDS.find(b => b.id === uploadBrand) ?? BRANDS[0];
        if (!selBrand) {
          return (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
              {t("لا توجد علامات تجارية لرفع بياناتها بعد", "No brands available to upload data for yet")}
            </div>
          );
        }
        const ups = brandUploads[uploadBrand] ?? { sales: false, materials: false, employees: false, suppliers: false };
        // Authoritative completion comes from GET /admin/brands/{id}/upload-status.
        // `shared.*` now requires a SUCCESSFUL upload, so a failed one no longer
        // counts toward «مكتمل» — the counter is finally truthful.
        const apiShared = (brandUploadStatus as any)?.shared ?? {};
        const sharedDone = {
          sales: apiShared.sales ?? ups.sales,
          materials: apiShared.materials ?? ups.materials,
          suppliers: apiShared.suppliers ?? ups.suppliers,
          fixedAssets: apiShared.fixedAssets ?? false,
        };
        const apiCompletionPct = (brandUploadStatus as any)?.completionPct as number | undefined;
        // 2026-08-03: the server now ships a `summary{shared,branchAssets,
        // restaurantEmployees,completionPct}` block that feeds every «ملخص رفع
        // البيانات» tile directly — the cards used to derive their own counts and
        // pinned «بيانات مشتركة» at 3/4 and «اكتمال الإعداد» at 75%. Bind to it
        // when present; fall back to local math offline.
        const uploadSummary = (brandUploadStatus as any)?.summary as {
          shared?: { done: number; total: number };
          branchAssets?: { done: number; total: number };
          restaurantEmployees?: { done: number; total: number };
          completionPct?: number;
        } | undefined;
        const frac = (o?: { done: number; total: number }, fallback = "") =>
          o && typeof o.done === "number" && typeof o.total === "number"
            ? `${o.done}/${o.total}` : fallback;

        // per-restaurant employee upload state
        const empKey = (rid: string) => `${uploadBrand}_${rid}`;
        // Persisted employee status comes from the per-restaurant upload-status
        // endpoint (restEmpStatus, keyed by restaurantId) — the brand endpoint
        // doesn't track employees. Falls back to the in-session optimistic flip
        // until the query resolves. No per-row request either way.
        const apiAssetsDone = ((brandUploadStatus as any)?.assets ?? {}) as Record<string, boolean>;
        const restEmpDone = (rid: string) => Boolean(restEmpStatus[rid]) || (brandUploads[empKey(rid)]?.employees ?? false);
        const setRestEmp = (rid: string) => setUploaded(empKey(rid), "employees");
        // A branch's fixed-assets are "done" when the per-branch endpoint says so;
        // otherwise fall back to the legacy brand map then the optimistic flip.
        const branchAssetDone = (branchId: string, aKey: string) =>
          branchAssetStatusMap[branchId] === "done"
          || (branchAssetStatusMap[branchId] === undefined && (Boolean(branchId && apiAssetsDone[branchId]) || (branchAssets[aKey] ?? false)));
        const branchAssetDoneCount = selBrand.restaurants.flatMap((r: any) =>
          r.branches.map((br: any, bi: number) => {
            const bid = typeof br === "string" ? "" : (br?.id ?? "");
            return branchAssetDone(bid, bid || `${uploadBrand}_${r.id}_${bi}`);
          })
        ).filter(Boolean).length;
        const branchTotalCount = selBrand.restaurants.reduce((s: number, r: any) => s + r.branches.length, 0);

        // Renders EMPTY_FILE / INVALID_HEADER (expected vs received) and per-row errors.
        const UploadErrorBox = ({ err }: { err: any }) => {
          if (!err) return null;
          if (err.code === "ROW_ERRORS") return (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 space-y-1">
              <p className="text-[11px] font-bold text-amber-800">{t("تم الاستيراد جزئياً — صفوف بها أخطاء:", "Partially imported — rows with errors:")}</p>
              {err.rows.slice(0, 5).map((r: any, i: number) => <p key={i} className="text-[10px] text-amber-700">{t("صف", "Row")} {r.row}: {r.message}</p>)}
              {err.rows.length > 5 && <p className="text-[10px] text-amber-500">+{err.rows.length - 5}</p>}
            </div>
          );
          return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3 space-y-1">
              <p className="text-[11px] font-bold text-red-800">{err.messageAr ?? t("فشل الرفع", "Upload failed")}</p>
              {err.code === "INVALID_HEADER" && (
                <div className="space-y-1 pt-1">
                  <p className="text-[10px] text-red-700">{t("الأعمدة المتوقعة:", "Expected columns:")} <span className="font-mono">{(Array.isArray(err.expected?.[0]) ? err.expected[0] : err.expected ?? []).join(" · ")}</span></p>
                  <p className="text-[10px] text-red-600">{t("الأعمدة المستلمة:", "Received:")} <span className="font-mono">{(err.received ?? []).join(" · ")}</span></p>
                </div>
              )}
            </div>
          );
        };

        type UploadType = "sales-items" | "raw-materials" | "suppliers" | "employees" | "fixed-assets";
        type UploadCardProps = { icon: React.ReactNode; iconBg: string; title: string; subtitle: string; cols: string[]; colColor: string; done: boolean; countLabel: string; busy?: boolean; err?: any; templateType: UploadType; onUpload: (f: File) => void };
        const UploadCard = ({ icon, iconBg, title, subtitle, cols, colColor, done, countLabel, busy, err, templateType, onUpload }: UploadCardProps) => (
          <div className={`bg-white rounded-xl border shadow-sm p-4 ${done ? "border-emerald-200" : "border-gray-100"}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{title}</p>
                <p className="text-[11px] text-gray-400">{subtitle}</p>
              </div>
              {done && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
              <p className="text-[10px] font-bold text-gray-400 mb-1.5">{t("الأعمدة المطلوبة:", "Required Columns:")}</p>
              <div className="flex flex-wrap gap-1.5">
                {cols.map(c => <span key={c} className={`text-[10px] ${colColor} px-2 py-0.5 rounded-full`}>{c}</span>)}
              </div>
            </div>
            <UploadErrorBox err={err} />
            {done
              ? <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold mb-3 bg-emerald-50 rounded-lg px-3 py-2"><CheckCircle2 size={13} />{countLabel}</div>
              : <label className="block border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50/10 transition-all mb-3">
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={busy}
                  onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onUpload(f); }} />
                <Upload size={18} className="text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400">{busy ? t("جارٍ الرفع…", "Uploading…") : t("اضغط لرفع ملف Excel", "Click to upload Excel")}</p>
                <p className="text-[10px] text-gray-300 mt-0.5">{t("حتى 2 ميجابايت", "Max 2 MB")}</p>
              </label>
            }
            <div className="flex gap-2">
              <label className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${busy ? "bg-purple-300 text-white" : "bg-purple-600 text-white hover:bg-purple-700"}`}>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={busy}
                  onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onUpload(f); }} />
                <Upload size={11} /> {busy ? t("جارٍ…", "…") : t("رفع", "Upload")}
              </label>
              <Btn size="sm" onClick={() => templateMut.mutate({ type: templateType, brandId: uploadBrand })}><Download size={11} /> {t("نموذج", "Template")}</Btn>
            </div>
          </div>
        );

        return (
          <div className="space-y-6">

            {/* Brand selector + filter */}
            <div className="space-y-2.5">
              {/* Brand search */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm flex-1 max-w-xs">
                  <Search size={11} className="text-gray-400 flex-shrink-0" />
                  <input value={uploadBrandFilter} onChange={e => setUploadBrandFilter(e.target.value)}
                    className="text-[11px] text-gray-600 bg-transparent outline-none flex-1" placeholder={t("بحث باسم العلامة التجارية...", "Search by brand name...")} />
                  {uploadBrandFilter && <button onClick={() => setUploadBrandFilter("")} className="text-gray-400 hover:text-gray-600"><X size={10} /></button>}
                </div>
                {uploadBrandFilter && (
                  <span className="text-[10px] text-gray-400">
                    {BRANDS.filter(b => !uploadBrandFilter || b.name.includes(uploadBrandFilter)).length} علامة
                  </span>
                )}
              </div>
              {/* Brand cards */}
              <div className="flex gap-2 flex-wrap">
                {BRANDS.filter(b => !uploadBrandFilter || b.name.includes(uploadBrandFilter)).map(b => {
                  const bUps = brandUploads[b.id] ?? { sales: false, materials: false, employees: false, suppliers: false };
                  const done = Object.values(bUps).filter(Boolean).length;
                  const total = 2 + b.restaurants.length;
                  return (
                    <button key={b.id} onClick={() => { setUploadBrand(b.id); setUploadBrandFilter(""); }}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all ${uploadBrand === b.id ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-white hover:border-purple-300"}`}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: b.color }}>{b.abbr}</div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${uploadBrand === b.id ? "text-purple-800" : "text-gray-700"}`}>{b.name}</p>
                        <p className="text-[10px] text-gray-400">{done} / {total} {t("ملف مرفوع", "files uploaded")}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Section 1: Brand-level shared data ── */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-5 rounded-full" style={{ background: selBrand.color }} />
                <div>
                  <p className="font-bold text-gray-800 text-sm">{t("بيانات مشتركة", "Shared Data")} — {selBrand.name}</p>
                  <p className="text-[11px] text-gray-400">{t("تُرفع مرة واحدة وتنطبق على جميع مطاعم العلامة", "Uploaded once and applies to all brand restaurants")}</p>
                </div>
                <div className="mr-auto flex items-center gap-1.5 text-[10px] font-semibold">
                  <span className={`px-2 py-0.5 rounded-full ${[ups.sales, ups.materials, ups.suppliers].filter(Boolean).length === 3 ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {[ups.sales, ups.materials, ups.suppliers].filter(Boolean).length}/3 {t("مكتمل", "complete")}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {/* Column hints mirror the shipped templates: items and raw
                    materials use «التصنيف»; suppliers genuinely uses «الفئة». */}
                <UploadCard
                  icon={<TrendingUp size={16} className="text-purple-600" />} iconBg="bg-purple-100"
                  title={t("أصناف المبيعات", "Sales Items")} subtitle={t("قائمة المنتجات والأسعار", "Products & prices list")}
                  cols={t(["رمز الصنف", "اسم الصنف", "التصنيف", "وحدة البيع", "السعر"], ["Item Code", "Item Name", "Category", "Unit", "Price"])}
                  colColor="bg-purple-50 text-purple-700"
                  done={sharedDone.sales} countLabel={t("تم الرفع ✓", "Uploaded ✓")}
                  busy={uploadBrandMut.isPending} err={uploadErrors["sales-items"]} templateType="sales-items"
                  onUpload={(file) => { clearUploadError("sales-items"); uploadBrandMut.mutate({ brandId: uploadBrand, type: "sales-items", file }, { onSuccess: (r) => noteRowErrors("sales-items", r), onError: (e) => noteUploadError("sales-items", e) }); }}
                />
                <UploadCard
                  icon={<Package size={16} className="text-orange-600" />} iconBg="bg-orange-100"
                  title={t("مواد خام المشتريات", "Purchase Raw Materials")} subtitle={t("أصناف المواد الخام", "Raw material items")}
                  cols={t(["رمز المادة", "اسم المادة", "التصنيف", "وحدة القياس", "التكلفة"], ["Material Code", "Material Name", "Category", "Unit", "Cost"])}
                  colColor="bg-orange-50 text-orange-700"
                  done={sharedDone.materials} countLabel={t("تم الرفع ✓", "Uploaded ✓")}
                  busy={uploadBrandMut.isPending} err={uploadErrors["raw-materials"]} templateType="raw-materials"
                  onUpload={(file) => { clearUploadError("raw-materials"); uploadBrandMut.mutate({ brandId: uploadBrand, type: "raw-materials", file }, { onSuccess: (r) => { noteRowErrors("raw-materials", r); noteUploadOutcome(r); }, onError: (e) => noteUploadError("raw-materials", e) }); }}
                />
                <UploadCard
                  icon={<Truck size={16} className="text-teal-600" />} iconBg="bg-teal-100"
                  title={t("الموردون", "Suppliers")} subtitle={t("قائمة موردي العلامة التجارية", "Brand suppliers list")}
                  cols={t(["رقم المورد", "اسم المورد", "الفئة", "جهة الاتصال", "شروط الدفع"], ["Supplier ID", "Supplier Name", "Category", "Contact", "Payment Terms"])}
                  colColor="bg-teal-50 text-teal-700"
                  done={sharedDone.suppliers} countLabel={t("تم الرفع ✓", "Uploaded ✓")}
                  busy={uploadBrandMut.isPending} err={uploadErrors["suppliers"]} templateType="suppliers"
                  onUpload={(file) => { clearUploadError("suppliers"); uploadBrandMut.mutate({ brandId: uploadBrand, type: "suppliers", file }, { onSuccess: (r) => noteRowErrors("suppliers", r), onError: (e) => noteUploadError("suppliers", e) }); }}
                />
              </div>
            </div>

            {/* ── Section 2: Per-restaurant employees — hidden per request (2026-07) ── */}
            {false && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-5 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">{t("موظفو المطاعم", "Restaurant Employees")} — {selBrand.name}</p>
                    <p className="text-[11px] text-gray-400">{t("كل مطعم له قائمة موظفين مستقلة", "Each restaurant has its own employee list")}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                    <Search size={11} className="text-gray-400 flex-shrink-0" />
                    <input value={uploadRestFilter} onChange={e => setUploadRestFilter(e.target.value)}
                      className="text-[11px] text-gray-600 bg-transparent outline-none w-28" placeholder={t("بحث باسم المطعم...", "Search by restaurant name...")} />
                    {uploadRestFilter && <button onClick={() => setUploadRestFilter("")} className="text-gray-400 hover:text-gray-600"><X size={10} /></button>}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-5 gap-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
                    <p className="text-[10px] font-bold text-gray-500 col-span-2">{t("المطعم", "Restaurant")}</p>
                    <p className="text-[10px] font-bold text-gray-500 text-center">{t("حالة الرفع", "Upload Status")}</p>
                    <p className="text-[10px] font-bold text-gray-500 text-center">{t("آخر تحديث", "Last Updated")}</p>
                    <p className="text-[10px] font-bold text-gray-500 text-center">{t("إجراء", "Action")}</p>
                  </div>
                  {selBrand.restaurants.filter(r => !uploadRestFilter || r.name.includes(uploadRestFilter)).map((rest) => {
                    const done = restEmpDone(rest.id);
                    const errKey = `emp_${rest.id}`;
                    const err = uploadErrors[errKey];
                    return (
                      <div key={rest.id} className="border-b border-gray-50 last:border-0">
                        <div className="grid grid-cols-5 gap-0 items-center px-4 py-3 hover:bg-gray-50/50">
                          <div className="col-span-2 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: selBrand.color + "cc" }}>{rest.name[0]}</div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{rest.name}</p>
                              <p className="text-[10px] text-gray-400">{rest.city}</p>
                            </div>
                          </div>
                          <div className="text-center">
                            {done
                              ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> {t("مرفوع", "Uploaded")}</span>
                              : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={10} /> {t("لم يُرفع", "Not Uploaded")}</span>
                            }
                          </div>
                          <div className="text-center">
                            {/* No lastUploadedAt on this payload yet — don't invent a date. */}
                            <p className="text-[10px] text-gray-400">—</p>
                          </div>
                          <div className="text-center flex items-center justify-center gap-1">
                            {/* Employees upload is per RESTAURANT — each keeps its own roster. */}
                            <label className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer ${done ? "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={uploadEmpMut.isPending}
                                onChange={e => {
                                  const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; clearUploadError(errKey);
                                  uploadEmpMut.mutate({ restaurantId: rest.id, file: f }, { onSuccess: (r) => { noteRowErrors(errKey, r); setRestEmp(rest.id); }, onError: (er) => noteUploadError(errKey, er) });
                                }} />
                              <Upload size={10} />{done ? t("تحديث", "Update") : t("رفع", "Upload")}
                            </label>
                            <Btn size="sm" onClick={() => templateMut.mutate({ type: "employees", restaurantId: rest.id })}><Download size={10} /></Btn>
                          </div>
                        </div>
                        {err && <div className="px-4 pb-3"><UploadErrorBox err={err} /></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Section 3: Per-branch fixed assets ── */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-5 rounded-full bg-emerald-500" />
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">{t("الأصول الثابتة", "Fixed Assets")} — {selBrand.name}</p>
                  <p className="text-[11px] text-gray-400">{t("كل فرع له قائمة أصول ثابتة مستقلة (معدات، أجهزة، مفروشات...)", "Each branch has its own fixed assets list (equipment, devices, furniture...)")}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {branchAssetDoneCount}/{branchTotalCount} {t("فرع", "branches")}
                </span>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-6 gap-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
                  <p className="text-[10px] font-bold text-gray-500 col-span-2">{t("المطعم", "Restaurant")}</p>
                  <p className="text-[10px] font-bold text-gray-500 col-span-2">{t("الفرع", "Branch")}</p>
                  <p className="text-[10px] font-bold text-gray-500 text-center">{t("حالة الرفع", "Upload Status")}</p>
                  <p className="text-[10px] font-bold text-gray-500 text-center">{t("إجراء", "Action")}</p>
                </div>
                {selBrand.restaurants.filter(r => !uploadRestFilter || r.name.includes(uploadRestFilter)).flatMap(rest =>
                  rest.branches.map((br: any, bi: number) => {
                    // Keyed by the real branch id — the endpoint needs it, and the
                    // old index-based key broke as soon as branches reordered.
                    const branchId = typeof br === "string" ? "" : (br?.id ?? "");
                    const aKey = branchId || `${uploadBrand}_${rest.id}_${bi}`;
                    // Prefer the per-branch endpoint's tri-state; fall back to the
                    // (legacy, usually empty) brand map, then the optimistic flip.
                    const failed = branchId ? branchAssetStatusMap[branchId] === "failed" : false;
                    const done = branchAssetDone(branchId, aKey);
                    const errKey = `asset_${aKey}`;
                    return (
                      <div key={aKey} className="border-b border-gray-50 last:border-0">
                        {uploadErrors[errKey] && <div className="px-4 pt-2"><UploadErrorBox err={uploadErrors[errKey]} /></div>}
                        <div className="grid grid-cols-6 gap-0 items-center px-4 py-2.5 hover:bg-gray-50/50">
                          <div className="col-span-2 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: selBrand.color + "aa" }}>{rest.name[0]}</div>
                            <p className="text-[10px] text-gray-500 truncate">{rest.name}</p>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <Home size={10} className="text-gray-300 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-gray-700">{br.name}</p>
                              <p className="text-[10px] text-gray-400">{br.manager}</p>
                            </div>
                          </div>
                          <div className="text-center">
                            {done
                              ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={9} /> {t("مرفوع", "Uploaded")}</span>
                              : failed
                                ? <span title={branchId ? branchAssetReasonMap[branchId] : undefined} className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full cursor-help"><AlertTriangle size={9} /> {t("فشل الرفع", "Upload failed")}</span>
                                : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><Clock size={9} /> {t("لم يُرفع", "Not Uploaded")}</span>
                            }
                          </div>
                          <div className="text-center flex items-center justify-center gap-1">
                            <label className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors inline-flex items-center gap-1 ${branchId ? "cursor-pointer" : "opacity-40 cursor-not-allowed"} ${done ? "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                              title={branchId ? undefined : t("لا يوجد معرّف للفرع", "Branch id unavailable")}>
                              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={!branchId || uploadAssetsMut.isPending}
                                onChange={e => {
                                  const f = e.target.files?.[0]; e.target.value = ""; if (!f || !branchId) return; clearUploadError(errKey);
                                  uploadAssetsMut.mutate({ branchId, file: f }, { onSuccess: (r) => { noteRowErrors(errKey, r); setBranchAsset(aKey); }, onError: (er) => noteUploadError(errKey, er) });
                                }} />
                              <Upload size={9} />{done ? t("تحديث", "Update") : t("رفع", "Upload")}
                            </label>
                            <Btn size="sm" onClick={() => templateMut.mutate(branchId ? { type: "fixed-assets", branchId } : { type: "fixed-assets", brandId: uploadBrand })}><Download size={9} /></Btn>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Section 4: Per-branch employees (2026-08-04) ── */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-5 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">{t("موظفو الفروع", "Branch Employees")} — {selBrand.name}</p>
                  <p className="text-[11px] text-gray-400">{t("كل فرع يرفع كشف موظفيه (نفس قالب الموظفين)", "Each branch uploads its own employee roster (same employees template)")}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {selBrand.restaurants.flatMap((r: any) => r.branches.map((br: any) => { const bid = typeof br === "string" ? "" : (br?.id ?? ""); return bid && branchEmpStatusMap[bid] === "done"; })).filter(Boolean).length}/{branchTotalCount} {t("فرع", "branches")}
                </span>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-6 gap-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
                  <p className="text-[10px] font-bold text-gray-500 col-span-2">{t("المطعم", "Restaurant")}</p>
                  <p className="text-[10px] font-bold text-gray-500 col-span-2">{t("الفرع", "Branch")}</p>
                  <p className="text-[10px] font-bold text-gray-500 text-center">{t("حالة الرفع", "Upload Status")}</p>
                  <p className="text-[10px] font-bold text-gray-500 text-center">{t("إجراء", "Action")}</p>
                </div>
                {selBrand.restaurants.filter(r => !uploadRestFilter || r.name.includes(uploadRestFilter)).flatMap(rest =>
                  rest.branches.map((br: any, bi: number) => {
                    const branchId = typeof br === "string" ? "" : (br?.id ?? "");
                    const eKey = `bemp_${branchId || `${uploadBrand}_${rest.id}_${bi}`}`;
                    const status = branchId ? branchEmpStatusMap[branchId] : undefined;
                    const done = status === "done";
                    const failed = status === "failed";
                    return (
                      <div key={eKey} className="border-b border-gray-50 last:border-0">
                        {uploadErrors[eKey] && <div className="px-4 pt-2"><UploadErrorBox err={uploadErrors[eKey]} /></div>}
                        <div className="grid grid-cols-6 gap-0 items-center px-4 py-2.5 hover:bg-gray-50/50">
                          <div className="col-span-2 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: selBrand.color + "aa" }}>{rest.name[0]}</div>
                            <p className="text-[10px] text-gray-500 truncate">{rest.name}</p>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <Home size={10} className="text-gray-300 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-gray-700">{br.name}</p>
                              <p className="text-[10px] text-gray-400">{br.manager}</p>
                            </div>
                          </div>
                          <div className="text-center">
                            {done
                              ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={9} /> {t("مرفوع", "Uploaded")}</span>
                              : failed
                                ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full"><AlertTriangle size={9} /> {t("فشل الرفع", "Upload failed")}</span>
                                : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><Clock size={9} /> {t("لم يُرفع", "Not Uploaded")}</span>
                            }
                          </div>
                          <div className="text-center flex items-center justify-center gap-1">
                            <label className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors inline-flex items-center gap-1 ${branchId ? "cursor-pointer" : "opacity-40 cursor-not-allowed"} ${done ? "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                              title={branchId ? undefined : t("لا يوجد معرّف للفرع", "Branch id unavailable")}>
                              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={!branchId || uploadBranchEmpMut.isPending}
                                onChange={e => {
                                  const f = e.target.files?.[0]; e.target.value = ""; if (!f || !branchId) return; clearUploadError(eKey);
                                  uploadBranchEmpMut.mutate({ branchId, file: f }, { onSuccess: (r) => noteRowErrors(eKey, r), onError: (er) => noteUploadError(eKey, er) });
                                }} />
                              <Upload size={9} />{done ? t("تحديث", "Update") : t("رفع", "Upload")}
                            </label>
                            <Btn size="sm" onClick={() => templateMut.mutate({ type: "employees", restaurantId: rest.id })}><Download size={9} /></Btn>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Upload summary ── */}
            <div className="bg-gradient-to-l from-purple-50 to-emerald-50 rounded-xl border border-purple-100 p-4">
              <p className="text-xs font-bold text-purple-800 mb-3">{t("ملخص رفع البيانات", "Upload Summary")} — {selBrand.name}</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center bg-white rounded-lg p-2.5 border border-purple-100">
                  <p className="text-base font-extrabold text-purple-700">{frac(uploadSummary?.shared, `${[sharedDone.sales, sharedDone.materials, sharedDone.suppliers].filter(Boolean).length}/3`)}</p>
                  <p className="text-[10px] text-purple-500 mt-0.5">{t("بيانات مشتركة", "Shared Data")}</p>
                </div>
                <div className="text-center bg-white rounded-lg p-2.5 border border-blue-100">
                  <p className="text-base font-extrabold text-blue-700">{frac(uploadSummary?.restaurantEmployees, `${selBrand.restaurants.filter(r => restEmpDone(r.id)).length}/${selBrand.restaurants.length}`)}</p>
                  <p className="text-[10px] text-blue-500 mt-0.5">{t("موظفو المطاعم", "Restaurant Employees")}</p>
                </div>
                <div className="text-center bg-white rounded-lg p-2.5 border border-emerald-100">
                  <p className="text-base font-extrabold text-emerald-700">
                    {frac(uploadSummary?.branchAssets, `${branchAssetDoneCount}/${branchTotalCount}`)}
                  </p>
                  <p className="text-[10px] text-emerald-500 mt-0.5">{t("أصول الفروع", "Branch Assets")}</p>
                </div>
                <div className="text-center bg-white rounded-lg p-2.5 border border-gray-100">
                  {(() => {
                    // Prefer the server's summary.completionPct / completionPct (spans
                    // the whole onboarding and only credits successful uploads); fall
                    // back to local math offline.
                    const sharedCount = [sharedDone.sales, sharedDone.materials, sharedDone.suppliers].filter(Boolean).length;
                    const restCount = selBrand.restaurants.length;
                    const empDone = selBrand.restaurants.filter(r => restEmpDone(r.id)).length;
                    const localPct = Math.round(((sharedCount / 3) + (restCount ? empDone / restCount : 0)) / 2 * 100);
                    const pct = uploadSummary?.completionPct ?? apiCompletionPct ?? localPct;
                    const pctCls = pct === 100 ? "text-emerald-700" : pct >= 60 ? "text-amber-600" : "text-gray-500";
                    return (<>
                      <p className={`text-base font-extrabold ${pctCls}`}>{pct}%</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{t("اكتمال الإعداد", "Setup Completion")}</p>
                    </>);
                  })()}
                </div>
              </div>
            </div>

          </div>
        );
      })()}

      {restTab === "structure" && (
        <div className="space-y-3">

          {/* Add brand quick form */}
          {showAddBrand && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-purple-800 text-sm">{t("إضافة علامة تجارية جديدة", "Add New Brand")}</p>
                <button onClick={() => setShowAddBrand(false)}><X size={14} className="text-purple-400" /></button>
              </div>
              {/* No company picker: the backend auto-creates a company named after the
              brand (companyId is omitted entirely). */}
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">{t("اسم العلامة", "Brand Name")}</label><input value={brandForm.name} onChange={e => setBrandForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t("علامة جديدة", "New brand")} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">{t("المالك / المسؤول", "Owner / Manager")}</label><input value={brandForm.owner} onChange={e => setBrandForm(f => ({ ...f, owner: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t("اسم المالك", "Owner name")} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">{t("الباقة", "Plan")}</label>
                  <select value={brandForm.plan} onChange={e => setBrandForm(f => ({ ...f, plan: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {activePackages.length
                      ? activePackages.map(p => <option key={p.id} value={p.code}>{p.name}</option>)
                      : (<><option>فضي</option><option>ذهبي</option><option>بلاتيني</option></>)}
                  </select></div>
              </div>
              <div className="mt-3"><label className="text-xs text-gray-500 block mb-1">{t("بريد المالك (اختياري)", "Owner Email (optional)")}</label>
                <input type="email" dir="ltr" value={brandForm.ownerEmail} onChange={e => setBrandForm(f => ({ ...f, ownerEmail: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right" placeholder="owner@example.com" />
                <p className="text-[11px] text-gray-400 mt-1">{t("لو دخلت بريد المالك، هيتعمله حساب دخول وتتبعتله كلمة المرور على البريد.", "If provided, a login account is created and the password is emailed to the owner.")}</p></div>
              <div className="flex gap-2 mt-3"><Btn variant="primary" size="sm" disabled={!brandForm.name.trim() || createBrandMut.isPending} onClick={() => {
                if (!brandForm.name.trim()) return;
                createBrandMut.mutate({
                  name: brandForm.name,
                  // Omit the key entirely when unset — sending "" is a 422.
                  ...(brandForm.companyId ? { companyId: brandForm.companyId } : {}),
                  owner: brandForm.owner || undefined,
                  ownerEmail: brandForm.ownerEmail.trim() || undefined,
                  plan: planKey(brandForm.plan),
                } as any, {
                  onSuccess: (created: any) => {
                    setShowAddBrand(false);
                    setBrandForm({ name: "", owner: "", ownerEmail: "", plan: "فضي", companyId: "" });
                    // emailSent is meaningful now: false = the owner never got a password.
                    if (brandForm.ownerEmail.trim() && created?.emailSent === false) {
                      toast.warning(t("تم إنشاء العلامة، لكن لم يصل بريد كلمة المرور للمالك — استخدم «إعادة تعيين كلمة المرور».", "Brand created, but the owner's password email failed — use “Reset password”."));
                    }
                  }
                });
              }}>✓ {t("حفظ", "Save")}</Btn><Btn size="sm" onClick={() => setShowAddBrand(false)}>{t("إلغاء", "Cancel")}</Btn></div>
            </div>
          )}

          {showAddRest !== null && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddRest(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
                <div className="px-5 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
                  <h3 className="font-bold">{t("إضافة مطعم جديد", "Add New Restaurant")}</h3>
                  <button onClick={() => setShowAddRest(null)} className="text-purple-200 hover:text-white"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-3">
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("العلامة التجارية", "Brand")}</label>
                    <select value={restForm.brandId} onChange={e => setRestForm(f => ({ ...f, brandId: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400">
                      <option value="">{t("اختر العلامة", "Select brand")}</option>
                      {(Array.isArray(brandsApi) ? brandsApi : []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select></div>
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم المطعم", "Restaurant Name")}</label><input value={restForm.name} onChange={e => setRestForm(f => ({ ...f, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("المدينة", "City")}</label><input value={restForm.city} onChange={e => setRestForm(f => ({ ...f, city: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Btn onClick={() => setShowAddRest(null)}>{t("إلغاء", "Cancel")}</Btn>
                    <Btn variant="primary" disabled={!restForm.brandId || !restForm.name.trim() || createRestMut.isPending} onClick={() => { createRestMut.mutate({ brandId: restForm.brandId, name: restForm.name, city: restForm.city }, { onSuccess: () => { setShowAddRest(null); setRestForm({ brandId: "", name: "", city: "" }); } }); }}><Plus size={13} /> {t("إضافة", "Add")}</Btn>
                  </div>
                </div>
              </div>
            </div>
          )}

          {addBranchRest !== null && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAddBranchRest(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
                <div className="px-5 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
                  <h3 className="font-bold">{t("إضافة فرع", "Add Branch")}</h3>
                  <button onClick={() => setAddBranchRest(null)} className="text-purple-200 hover:text-white"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-3">
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم الفرع", "Branch Name")}</label><input value={branchName} onChange={e => setBranchName(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Btn onClick={() => setAddBranchRest(null)}>{t("إلغاء", "Cancel")}</Btn>
                    <Btn variant="primary" disabled={!branchName.trim() || createBranchMut.isPending} onClick={() => { createBranchMut.mutate({ restaurantId: addBranchRest, name: branchName } as any, { onSuccess: () => { setAddBranchRest(null); setBranchName(""); } }); }}><Plus size={13} /> {t("إضافة", "Add")}</Btn>
                  </div>
                </div>
              </div>
            </div>
          )}

          {editRest && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditRest(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
                <div className="px-5 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
                  <h3 className="font-bold">{t("تعديل المطعم", "Edit Restaurant")}</h3>
                  <button onClick={() => setEditRest(null)} className="text-purple-200 hover:text-white"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-3">
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم المطعم", "Restaurant Name")}</label><input value={editRestForm.name} onChange={e => setEditRestForm(f => ({ ...f, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("المدينة", "City")}</label><input value={editRestForm.city} onChange={e => setEditRestForm(f => ({ ...f, city: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                    <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الحالة", "Status")}</label><select value={editRestForm.status} onChange={e => setEditRestForm(f => ({ ...f, status: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"><option value="active">{t("نشط", "Active")}</option><option value="suspended">{t("موقوف", "Suspended")}</option></select></div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Btn onClick={() => setEditRest(null)}>{t("إلغاء", "Cancel")}</Btn>
                    <Btn variant="primary" disabled={!editRestForm.name.trim() || updateRestMut.isPending} onClick={() => { updateRestMut.mutate({ id: editRest.id, name: editRestForm.name, city: editRestForm.city, status: editRestForm.status } as any, { onSuccess: () => setEditRest(null) }); }}>{t("حفظ", "Save")}</Btn>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Brands accordion */}
          <div className="space-y-3">
            {BRANDS.map(brand => {
              const isExpanded = expandedBrand === brand.id;
              const restCount = brand.restaurants.length;
              const branchCount = brand.restaurants.reduce((s, r) => s + r.branches.length, 0);
              // 2026-07-27: prefer branchCounts.unlinked from the tree; fall back to the
              // old branchesLinked===0 heuristic for a backend that hasn't shipped it yet.
              const unlinkedCount = (brand as any).branchCounts?.unlinked
                ?? (((brand as any).branchesLinked === 0 && branchCount > 0) ? branchCount : 0);
              const subCls = { active: "bg-emerald-50 text-emerald-700", warning: "bg-amber-50 text-amber-700", danger: "bg-red-50 text-red-700", expired: "bg-red-100 text-red-800" };
              const subLbl = { active: t("اشتراك نشط", "Active Subscription"), warning: t("ينتهي قريباً", "Expiring Soon"), danger: t("إنذار انتهاء", "Expiry Alert"), expired: t("منتهي الاشتراك", "Subscription Expired") };

              return (
                <div key={brand.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isExpanded ? "border-purple-200" : "border-gray-100"}`}>
                  {/* Brand header */}
                  <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => setExpandedBrand(isExpanded ? null : brand.id)}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm" style={{ background: brand.color }}>{brand.abbr}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">{brand.name}</p>
                        <Badge className={`text-[10px] bg-purple-50 text-purple-600`}>باقة {brand.plan}</Badge>
                        <Badge className={`text-[10px] ${subCls[brand.subStatus]}`}>{subLbl[brand.subStatus]}</Badge>
                        {unlinkedCount > 0 && (
                          <span title={t("فروع غير مربوطة بمطاعم — لن تظهر بياناتها في التطبيق حتى تُربط", "Branches not linked to a restaurant — their data won't appear in the app until linked")}>
                            <Badge className="text-[10px] bg-red-50 text-red-700 border border-red-200">{unlinkedCount} {t("فرع غير مربوط", "unlinked")}</Badge>
                          </span>
                        )}
                        {unlinkedCount > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); setLinkBrand({ id: brand.id, name: brand.name }); }}
                            className="text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg px-2 py-0.5">
                            🔗 {t("اربط الفروع", "Link branches")}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{brand.owner} · {brand.ownerEmail}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center hidden md:block"><p className="text-base font-bold text-gray-800">{restCount}</p><p className="text-[10px] text-gray-400">{t("مطعم", "Restaurant")}</p></div>
                      <div className="text-center hidden md:block"><p className="text-base font-bold text-gray-800">{branchCount}</p><p className="text-[10px] text-gray-400">{t("فرع", "Branch")}</p></div>
                      <div className="text-center hidden md:block"><p className="text-base font-bold text-gray-800">{(brand as any).moduleCount ?? (brand.modules.length || 9)}</p><p className="text-[10px] text-gray-400">{t("موديول", "Module")}</p></div>
                      {(brand as any).branchesLinked != null && (
                        <div className="text-center hidden md:block"><p className={`text-base font-bold ${(brand as any).branchesLinked === 0 ? "text-red-600" : "text-gray-800"}`}>{(brand as any).branchesLinked}/{branchCount}</p><p className="text-[10px] text-gray-400">{t("مربوط", "Linked")}</p></div>
                      )}
                      {brand.ownerEmail && (
                        <button
                          onClick={(e) => { e.stopPropagation(); if (resetOwnerMut.isPending) return; if (window.confirm(t(`إرسال باسورد جديد إلى ${brand.ownerEmail}؟`, `Send a new password to ${brand.ownerEmail}?`))) resetOwnerMut.mutate({ brandId: brand.id }); }}
                          disabled={resetOwnerMut.isPending}
                          title={t("إعادة تعيين باسورد المالك", "Reset owner password")}
                          className="text-[10px] font-semibold text-purple-600 hover:text-purple-800 border border-purple-200 rounded-lg px-2 py-1 disabled:opacity-50">
                          {t("باسورد المالك", "Owner PW")}
                        </button>
                      )}
                      <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {/* Restaurants list */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {/* Active modules strip */}
                      <div className="px-5 py-2.5 bg-gray-50/60 flex items-center gap-2 border-b border-gray-100">
                        <span className="text-[10px] text-gray-400 font-semibold">{t("الموديولات الفعّالة:", "Active Modules:")}</span>
                        {brand.modules.map(m => <span key={m} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{m}</span>)}
                      </div>

                      {brand.restaurants.map(rest => {
                        const isRExp = expandedRest === rest.id;
                        const rsub = restSubs[rest.id];
                        return (
                          <div key={rest.id} className="border-b border-gray-100 last:border-0">

                            {/* ── Restaurant row — click to expand branches ── */}
                            <div className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                              onClick={() => setExpandedRest(isRExp ? null : rest.id)}>
                              {/* Dot indicator */}
                              <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: brand.color }} />

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm text-gray-800">{rest.name}</p>
                                  <Badge className={rest.status === "active" ? "bg-emerald-50 text-emerald-600 text-[10px]" : "bg-red-50 text-red-600 text-[10px]"}>{rest.status === "active" ? t("نشط", "Active") : t("موقوف", "Suspended")}</Badge>
                                  {rsub && <Badge className={`text-[10px] border ${subClsRest[rsub.status]}`}>{planIcon[rsub.plan]} {rsub.plan}</Badge>}
                                  {rsub && rsub.status !== "active" && <Badge className="bg-gray-50 text-gray-400 text-[10px]">{rsub.daysLeft < 0 ? `منتهي منذ ${Math.abs(rsub.daysLeft)} يوم` : `${rsub.daysLeft} يوم`}</Badge>}
                                </div>
                                <p className="text-[11px] text-gray-400 mt-0.5">{rest.city} · {rest.branches.length} {t("فروع", "branches")} · {rest.accountants} {t("محاسب", "accountant")}</p>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                {rsub && (rsub.status === "expired" || rsub.status === "danger") && (
                                  <button onClick={() => renewSub(rest.id)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${rsub.status === "expired" ? "bg-red-600 text-white" : "bg-amber-500 text-white"} transition-colors`}>
                                    {rsub.status === "expired" ? t("تفعيل", "Activate") : t("تجديد", "Renew")}
                                  </button>
                                )}
                                <Btn size="sm" variant="ghost" onClick={() => { setEditRest(rest); setEditRestForm({ name: rest.name, city: rest.city ?? "", status: rest.status ?? "active" }); }}><Edit2 size={11} /></Btn>
                              </div>
                              <ChevronDown size={13} className={`text-gray-300 transition-transform flex-shrink-0 ${isRExp ? "rotate-180" : ""}`} />
                            </div>

                            {/* ── Branches + subscription — visible on click ── */}
                            {isRExp && (
                              <div className="mx-6 mb-3 space-y-2">
                                {/* Subscription strip */}
                                {rsub && (
                                  <div className={`rounded-lg border px-4 py-2.5 flex items-center gap-3 ${rsub.status === "active" ? "bg-emerald-50 border-emerald-200" : rsub.status === "expired" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                                    <span className="text-sm">{planIcon[rsub.plan]}</span>
                                    <div className="flex-1">
                                      <p className={`font-bold text-xs ${rsub.status === "active" ? "text-emerald-800" : rsub.status === "expired" ? "text-red-800" : "text-amber-800"}`}>{t("باقة", "Plan")} {rsub.plan} — {subLblRest[rsub.status]}</p>
                                      <p className={`text-[10px] ${rsub.status === "active" ? "text-emerald-600" : rsub.status === "expired" ? "text-red-600" : "text-amber-600"}`}>{rsub.status === "expired" ? `${t("انتهى:", "Expired:")} ${rsub.expires}` : `${t("ينتهي:", "Expires:")} ${rsub.expires}`} · {rsub.price} {t("ر.س/شهر", "SAR/mo")}</p>
                                    </div>
                                    {rsub.status !== "active" && <button onClick={() => renewSub(rest.id)} className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-white border border-current hover:opacity-80">{rsub.status === "expired" ? t("تفعيل مجدداً", "Reactivate") : t("تجديد", "Renew")}</button>}
                                    <button className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">{t("تغيير الباقة", "Change Plan")}</button>
                                  </div>
                                )}
                                {/* Branches table */}
                                <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                                    <p className="text-[11px] font-bold text-gray-600">{t("الفروع", "Branches")} ({rest.branches.length})</p>
                                    <button onClick={() => { setAddBranchRest(rest.id); setBranchName(""); }} className="text-[10px] text-purple-600 hover:underline flex items-center gap-1"><Plus size={10} /> {t("إضافة فرع", "Add Branch")}</button>
                                  </div>
                                  <div className="divide-y divide-gray-100">
                                    {rest.branches.map((br, bi) => (
                                      <div key={bi} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 transition-colors">
                                        <Home size={12} className="text-gray-300 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-gray-700">{br.name}</p>
                                          <p className="text-[10px] text-gray-400">{br.manager}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500"><Edit2 size={10} /></button>
                                          <button className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500"><Users size={10} /></button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}

                      {/* Add restaurant button */}
                      <div className="px-5 py-3 flex justify-end border-t border-gray-100">
                        <button onClick={() => { setRestForm(f => ({ ...f, brandId: brand.id })); setShowAddRest(brand.id); }} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><Plus size={11} /> {t("إضافة مطعم لـ", "Add restaurant to")} {brand.name}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {linkBrand && <LinkBranchesModal brand={linkBrand} onClose={() => setLinkBrand(null)} />}
    </div>
  );
}

// ── Link unlinked branches to a restaurant (2026-07-27) ───────────────────────
// Rows come from GET /admin/brands/{id}/branches?linked=false (data); the
// restaurant dropdown options come from the SAME response (meta.restaurants).
// Linking is a per-row PATCH; a bulk save loops them, aggregating failures.
function LinkBranchesModal({ brand, onClose }: { brand: { id: string; name: string }; onClose: () => void }) {
  const { t, dir } = useLang();
  const { data: apiData, isLoading } = useAdminUnlinkedBranches(brand.id);
  const linkMut = useLinkBranch();
  const rows = (apiData?.data ?? []) as any[];
  const restOptions = (apiData?.meta?.restaurants ?? []) as { id: string; name: string }[];
  // Per-branch chosen restaurant id.
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const chosen = rows.filter(r => !done[r.id] && picks[r.id]);
  const canSave = !busy && chosen.length > 0;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    const errors: string[] = [];
    // Sequential — one failure doesn't stop the rest; collect and report at the end.
    for (const r of chosen) {
      try {
        await linkMut.mutateAsync({ id: r.id, restaurantId: picks[r.id] });
        setDone(p => ({ ...p, [r.id]: true }));
      } catch (e) {
        errors.push(`${r.name}: ${isApiError(e) ? (e.messageAr || e.message) : t("فشل", "failed")}`);
      }
    }
    setBusy(false);
    if (errors.length) toast.error(`${t("تعذّر ربط بعض الفروع:", "Some branches couldn't be linked:")} ${errors.join(" · ")}`);
    else toast.success(t("تم ربط الفروع بنجاح", "Branches linked successfully"));
  };

  const remaining = rows.filter(r => !done[r.id]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir={dir} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[640px] max-w-full flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800 text-base">🔗 {t("ربط الفروع بالمطاعم", "Link Branches to Restaurants")} — {brand.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t("اختر المطعم لكل فرع ثم احفظ. الفرع غير المربوط لا تظهر بياناته في التطبيق.", "Pick a restaurant for each branch and save. An unlinked branch's data doesn't appear in the app.")}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && <div className="py-10 text-center text-sm text-gray-400">{t("جارٍ التحميل…", "Loading…")}</div>}
          {!isLoading && remaining.length === 0 && (
            <div className="py-10 text-center">
              <CheckCircle2 size={26} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">{t("لا توجد فروع غير مربوطة", "No unlinked branches")}</p>
            </div>
          )}
          {!isLoading && restOptions.length === 0 && remaining.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-xs text-amber-700">
              {t("لا توجد مطاعم في هذه العلامة — أضف مطعماً أولاً لتربط الفروع به.", "This brand has no restaurants — add one first to link branches to it.")}
            </div>
          )}
          <div className="space-y-2">
            {remaining.map(r => (
              <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border ${done[r.id] ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{r.name}</p>
                    <Badge className={`text-[9px] ${r.linkage === "orphan" ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-700"}`}>
                      {r.linkage === "orphan" ? t("فرع قديم بلا ربط", "legacy · no link") : t("ناقص مطعم", "brand · needs restaurant")}
                    </Badge>
                  </div>
                  {r.city && <p className="text-[11px] text-gray-400">{r.city}</p>}
                </div>
                <select value={picks[r.id] ?? ""} disabled={busy || restOptions.length === 0}
                  onChange={e => setPicks(p => ({ ...p, [r.id]: e.target.value }))}
                  className="w-48 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300 disabled:bg-gray-50">
                  <option value="">{t("— اختر المطعم —", "— Select restaurant —")}</option>
                  {restOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 mr-auto">{t("إغلاق", "Close")}</button>
          <button disabled={!canSave} onClick={save}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors ${canSave ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
            {busy ? t("جارٍ الربط…", "Linking…") : `${t("ربط المحدد", "Link selected")} (${chosen.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
