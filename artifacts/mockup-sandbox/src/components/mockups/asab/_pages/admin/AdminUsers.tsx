import { useState, useEffect, useMemo, useRef } from "react";
import {
  useAdminUsers,
  useAdminDistribution,
  useAdminModules,
  useAdminBrands,
  useImportAdminUsers,
  useUpdateAccountantAssignments,
  useSetAccountantRestaurantModules,
  useAdminAccountantModules,
  useDeleteAdminUser,
  useResetAdminUserPassword,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import {
  Upload, Plus, Search, Check, ChevronDown, Clock,
  Calendar, Edit2, X
} from "lucide-react";
import { type AdminUserData, reportsToName, type PageProps } from "../../_shared/types";

const BRANDS_CATALOG: {
  id: string; name: string; color: string; abbr: string;
  restaurants: { id: string; name: string; branches: string[] }[];
}[] = [];

export function AdminUsers({ navigate, setModal, ops, approveOp, rejectOp, finalApproveOp, bulkApprove, users, setUsers }: PageProps & {
  users: AdminUserData[];
  setUsers: (v: any) => void;
}) {
  const { t, dir, lang } = useLang();
  const { data: apiUsers } = useAdminUsers();
  const { data: distApi } = useAdminDistribution();
  const { data: modulesLookup } = useAdminModules();
  const { data: brandsTreeApi } = useAdminBrands();
  const importUsersMut = useImportAdminUsers();
  const loc = lang === "ar" ? "ar-EG" : "en-GB";
  const fmtUserDate = (v?: string) => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(loc, { year: "numeric", month: "long", day: "numeric" });
  };
  const fmtUserDateTime = (v?: string) => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString(loc, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  // Sync the user list from the API (GET /admin/users). No static seed.
  useEffect(() => {
    if (Array.isArray(apiUsers)) setUsers(apiUsers as any);
  }, [apiUsers]);

  // The API returns only the ASSIGNED level for a user (a branch manager gets his one
  // branch; brands/restaurants come back empty). To show the full path, derive the parent
  // restaurant + brand of each assigned branch (and the parent brand of each restaurant)
  // from the brand hierarchy (GET /admin/brands). Keyed by both id and name for tolerance.
  const branchParent = useMemo(() => {
    const byBranch = new Map<string, { restaurant: string; brand: string }>();
    const byRestaurant = new Map<string, string>();
    // id → display name, so assigned ids (which is what the API stores) render as names.
    const branchName = new Map<string, string>();
    const restName = new Map<string, string>();
    const tree = Array.isArray(brandsTreeApi) ? (brandsTreeApi as any[]) : [];
    for (const b of tree) {
      const brandName = b?.name ?? "";
      for (const r of (b?.restaurants ?? [])) {
        const rName = r?.name ?? "";
        if (r?.id) { byRestaurant.set(String(r.id), brandName); restName.set(String(r.id), rName); }
        if (rName) byRestaurant.set(rName, brandName);
        for (const br of (r?.branches ?? [])) {
          const brName = typeof br === "string" ? br : (br?.name ?? "");
          const brId = typeof br === "string" ? "" : (br?.id ?? "");
          const val = { restaurant: rName, brand: brandName };
          if (brId) { byBranch.set(String(brId), val); branchName.set(String(brId), brName); }
          if (brName) byBranch.set(brName, val);
        }
      }
    }
    return { byBranch, byRestaurant, branchName, restName };
  }, [brandsTreeApi]);

  // Fill in the empty brand/restaurant levels for a user from its assigned branch(es),
  // and resolve stored ids to display names (the API stores ids, not names).
  const derivePath = (u: AdminUserData) => {
    let brands = [...(u.brands ?? [])];
    const branchesRaw = u.branches ?? [];
    let restaurants = [...(u.restaurants ?? [])];
    if (restaurants.length === 0 && branchesRaw.length > 0) {
      restaurants = Array.from(new Set(branchesRaw.map(b => branchParent.byBranch.get(b)?.restaurant).filter(Boolean) as string[]));
    }
    if (brands.length === 0) {
      const fromBranches = branchesRaw.map(b => branchParent.byBranch.get(b)?.brand).filter(Boolean) as string[];
      const fromRests = restaurants.map(r => branchParent.byRestaurant.get(r)).filter(Boolean) as string[];
      brands = Array.from(new Set([...fromBranches, ...fromRests]));
    }
    // Map any leftover ids to names (a value already being a name passes through).
    let branches = branchesRaw.map(b => branchParent.branchName.get(b) ?? b);
    restaurants = restaurants.map(r => branchParent.restName.get(r) ?? r);
    // BUG-3: prefer the backend-provided *Named arrays when present (authoritative id→name).
    const uAny = u as any;
    const toNames = (arr: any): string[] => Array.isArray(arr) ? (arr.map((x: any) => (x && typeof x === "object") ? x.name : x).filter(Boolean) as string[]) : [];
    const bn = toNames(uAny.brandsNamed); if (bn.length) brands = bn;
    const rn = toNames(uAny.restaurantsNamed); if (rn.length) restaurants = rn;
    const brn = toNames(uAny.branchesNamed); if (brn.length) branches = brn;
    return { brands, restaurants, branches };
  };
  const importFileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [usersTab, setUsersTab] = useState<"list" | "distribute">("list");

  // ── Distribution data ──
  const [headSel, setHeadSel] = useState<string | null>("h1");
  const [accSel, setAccSel] = useState<string | null>("acc1");
  type DistAcc = { id: string; name: string; avatar: string; headId: string | null; restaurants: string[]; restaurantCount?: number; moduleCount?: number };
  // Distribution data is driven entirely by GET /admin/distribution. No static fallback.
  const [distAccs, setDistAccs] = useState<DistAcc[]>([]);
  useEffect(() => {
    const accs = (distApi as any)?.accountants;
    // Normalize: the API may omit `restaurants` for an accountant, and code paths
    // (e.g. the module matrix) call `.restaurants.map` directly — a missing array
    // would white-screen the page. Guarantee the shape here.
    if (Array.isArray(accs)) setDistAccs(accs.map((a: any) => ({
      ...a,
      restaurants: Array.isArray(a?.restaurants) ? a.restaurants : [],
      headId: a?.headId ?? null,
    })) as DistAcc[]);
  }, [distApi]);
  const distHeads = (Array.isArray((distApi as any)?.heads)
    ? (distApi as any).heads
    : []) as Array<{ id: string; name: string; avatar?: string; color?: string }>;
  const ALL_RESTS = (Array.isArray((distApi as any)?.allRestaurants)
    ? (distApi as any).allRestaurants
    : []) as string[];
  // BUG-4: resolve a restaurant id to its display name via the backend id→name map.
  const restaurantNames = ((distApi as any)?.restaurantNames ?? {}) as Record<string, string>;
  const restName = (id: string) => restaurantNames[id] ?? id;
  const assignedRests = distAccs.flatMap(a => a.restaurants);
  const freeRests = ALL_RESTS.filter(r => !assignedRests.includes(r));
  const accsUnderHead = distAccs.filter(a => a.headId === headSel);
  const selAccData = distAccs.find(a => a.id === accSel);
  const selAccRests = selAccData?.restaurants || [];
  const availableForAcc = freeRests.filter(r => !selAccRests.includes(r));

  // Contract 1.8: PATCH /admin/accountants/{accId}/assignments reconciles restaurants + headId.
  const assignMut = useUpdateAccountantAssignments();
  const modulesMut = useSetAccountantRestaurantModules();
  const syncAssignments = (accId: string, restaurants: string[], headId: string | null, prevAccs?: typeof distAccs) => {
    assignMut.mutate({ accId, headId, restaurants }, {
      onError: () => {
        if (prevAccs) setDistAccs(prevAccs);
      }
    });
  };
  const removeRestFromAcc = (accId: string, rest: string) => {
    const acc = distAccs.find(a => a.id === accId); if (!acc) return;
    const prev = distAccs;
    const restaurants = acc.restaurants.filter(r => r !== rest);
    setDistAccs(p => p.map(a => a.id === accId ? { ...a, restaurants } : a));
    syncAssignments(accId, restaurants, acc.headId, prev);
  };
  const addRestToAcc = (accId: string, rest: string) => {
    const acc = distAccs.find(a => a.id === accId); if (!acc) return;
    const prev = distAccs;
    const restaurants = [...acc.restaurants, rest];
    setDistAccs(p => p.map(a => a.id === accId ? { ...a, restaurants } : a));
    syncAssignments(accId, restaurants, acc.headId, prev);
  };
  const moveAccToHead = (accId: string, headId: string | null) => {
    const acc = distAccs.find(a => a.id === accId); if (!acc) return;
    const prev = distAccs;
    setDistAccs(p => p.map(a => a.id === accId ? { ...a, headId } : a));
    syncAssignments(accId, acc.restaurants, headId, prev);
  };

  // ── Module distribution ──
  // B2: source modules from GET /admin/lookups/modules and send KEYS (value), not Arabic labels.
  // Backend stores modules[] verbatim into module_keys; Arabic names break permission resolution.
  const MODULE_FALLBACK = [
    { value: "sales", label: "المبيعات" }, { value: "expenses", label: "المصروفات" },
    { value: "purchases", label: "المشتريات" }, { value: "inventory", label: "المخزون" },
    { value: "shifts", label: "الشفتات" }, { value: "account_statement", label: "كشف الحساب" },
    { value: "cash_custody", label: "العهد النقدية" }, { value: "fixed_assets", label: "الأصول الثابتة" },
  ];
  const lookupModules = ((((modulesLookup as any)?.data ?? modulesLookup ?? []) as any[]))
    .map(m => { const value = m.value ?? m.key; return { value, label: m.labelAr ?? m.labelEn ?? m.key ?? value }; })
    .filter(m => m.value);
  const DIST_MODULES = lookupModules.length ? lookupModules : MODULE_FALLBACK;
  const [distModeType, setDistModeType] = useState<"restaurant" | "module" | "heads">("restaurant");
  const [modAccSel, setModAccSel] = useState<string>("acc1");
  const [modAccFilter, setModAccFilter] = useState("");
  const [modRestFilter, setModRestFilter] = useState("");
  // Heads assignment (mode 3) state
  const [h3AccSel, setH3AccSel] = useState<string | null>(null);
  const [h3HeadFilter, setH3HeadFilter] = useState("");
  // accModules: accId → restId → modules[]. Seeded from the distribution API; no static seed.
  const [accModules, setAccModules] = useState<Record<string, Record<string, string[]>>>({});
  useEffect(() => {
    const accs = (distApi as any)?.accountants;
    if (!Array.isArray(accs)) return;
    const seed: Record<string, Record<string, string[]>> = {};
    for (const a of accs) {
      if (a?.id && a?.modulesByRestaurant && typeof a.modulesByRestaurant === "object") {
        seed[a.id] = a.modulesByRestaurant;
      }
    }
    if (Object.keys(seed).length > 0) setAccModules(seed);
  }, [distApi]);
  // Dedicated per-accountant matrix (named restaurants + moduleCatalog + reason).
  // Only fires while the module-distribution tab is open for the selected accountant.
  const { data: accModulesApi } = useAdminAccountantModules(
    distModeType === "module" ? modAccSel : null,
  );
  // Seed the matrix from the dedicated endpoint, keyed by restaurant id, so the
  // optimistic toggle has an accurate baseline (the distribution seed was by name).
  useEffect(() => {
    const rests = (accModulesApi as any)?.restaurants;
    if (!modAccSel || !Array.isArray(rests)) return;
    const cells: Record<string, string[]> = {};
    for (const r of rests) {
      const rid = r?.id ?? r?.restaurantId ?? r?.restaurant_id;
      if (rid) cells[String(rid)] = Array.isArray(r?.modules) ? r.modules : (Array.isArray(r?.moduleKeys) ? r.moduleKeys : []);
    }
    setAccModules(p => ({ ...p, [modAccSel]: cells }));
  }, [accModulesApi, modAccSel]);
  // Contract 1.9: PUT /admin/accountants/{accId}/restaurants/{restaurant}/modules
  const toggleModuleForRest = (accId: string, rest: string, mod: string) => {
    const cur = accModules[accId]?.[rest] ?? [];
    const next = cur.includes(mod) ? cur.filter(m => m !== mod) : [...cur, mod];
    setAccModules(p => ({ ...p, [accId]: { ...(p[accId] ?? {}), [rest]: next } }));
    modulesMut.mutate({ accId, restaurant: rest, modules: next });
  };
  const assignAllModules = (accId: string, rest: string, keys?: string[]) => {
    const allKeys = keys ?? DIST_MODULES.map(m => m.value);
    setAccModules(p => ({ ...p, [accId]: { ...(p[accId] ?? {}), [rest]: allKeys } }));
    modulesMut.mutate({ accId, restaurant: rest, modules: allKeys });
  };
  const clearRestModules = (accId: string, rest: string) => {
    setAccModules(p => { const n = { ...(p[accId] ?? {}) }; delete n[rest]; return { ...p, [accId]: n }; });
    modulesMut.mutate({ accId, restaurant: rest, modules: [] });
  };

  const roleCls: Record<string, string> = {
    "محاسب": "bg-blue-50 text-blue-700 border-blue-200",
    "رئيس حسابات": "bg-amber-50 text-amber-700 border-amber-200",
    "مدير فرع": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "مدير مشتريات": "bg-purple-50 text-purple-700 border-purple-200",
    "مورد": "bg-orange-50 text-orange-700 border-orange-200",
    "أدمن": "bg-red-50 text-red-700 border-red-200",
  };
  const scopeLabel: Record<string, string> = { all: "كامل", brand: "علامة تجارية", restaurant: "مطعم", branch: "فرع" };
  const scopeCls: Record<string, string> = { all: "bg-gray-100 text-gray-600", brand: "bg-purple-50 text-purple-600", restaurant: "bg-blue-50 text-blue-600", branch: "bg-emerald-50 text-emerald-600" };

  const allBrands = Array.from(new Set(users.flatMap(u => u.brands)));
  const shown = users.filter(u => {
    if (search && !u.name.includes(search) && !u.email.includes(search)) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (brandFilter && !u.brands.includes(brandFilter)) return false;
    return true;
  });
  const deleteUserMut = useDeleteAdminUser();
  const resetPwdMut = useResetAdminUserPassword();
  const deleteUser = (email: string) => {
    const target = users.find(u => u.email === email);
    // Deleting a dashboard user now also revokes their mobile app access and
    // kills their app sessions; reactivating does not restore it. Say so.
    if (!window.confirm(t(
      "حذف هذا المستخدم؟ سيتم إلغاء دخوله من تطبيق الجوال أيضاً وإنهاء جلساته، وإعادة التفعيل لا تُرجِع صلاحية التطبيق.",
      "Delete this user? Their mobile app access is revoked and their app sessions ended. Reactivating does not restore mobile access.",
    ))) return;
    if (target?.id) {
      deleteUserMut.mutate(target.id, {
        onSuccess: () => {
          setUsers((prev: AdminUserData[]) => prev.filter(u => u.email !== email));
        },
      });
    } else {
      setUsers((prev: AdminUserData[]) => prev.filter(u => u.email !== email));
    }
  };

  const byRole: Record<string, number> = {};
  users.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("إدارة المستخدمين", "User Management")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{users.length} {t("مستخدم — متعدد العلامات التجارية والمطاعم", "users — multi-brand & multi-restaurant")}</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={importFileRef} type="file" accept=".csv" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) importUsersMut.mutate(f); e.target.value = ""; }} />
          <button onClick={() => importFileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 text-sm font-semibold hover:bg-gray-100 transition-all">
            <Upload size={13} /> {t("استيراد CSV", "Import CSV")}
          </button>
          <Btn variant="primary" onClick={() => setModal("add-user")}><Plus size={14} /> {t("مستخدم جديد", "New User")}</Btn>
        </div>
      </div>

      <div className="flex gap-0 border-b border-gray-200">
        {([{ id: "list" as const, label: `👤 ${t("قائمة المستخدمين", "User List")}` }, { id: "distribute" as const, label: `🏢 ${t("توزيع المطاعم", "Distribute Restaurants")}` }]).map(tb => (
          <button key={tb.id} onClick={() => setUsersTab(tb.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${usersTab === tb.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{tb.label}</button>
        ))}
      </div>

      {/* ── DISTRIBUTION TAB ── */}
      {usersTab === "distribute" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-amber-700">{distHeads.length}</p><p className="text-[11px] text-gray-400">{t("رؤساء الحسابات", "Accounting Heads")}</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-blue-700">{distAccs.filter(a => a.headId).length}</p><p className="text-[11px] text-gray-400">{t("محاسبون مُعيَّنون", "Assigned Accountants")}</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-emerald-700">{assignedRests.length}</p><p className="text-[11px] text-gray-400">{t("مطاعم مُوزَّعة", "Assigned Restaurants")}</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-red-600">{freeRests.length}</p><p className="text-[11px] text-gray-400">{t("مطاعم غير مُوزَّعة", "Unassigned Restaurants")}</p></div>
          </div>

          <div className="flex items-center gap-0 bg-gray-100 p-1 rounded-xl w-fit">
            <button aria-pressed={distModeType === "restaurant"} onClick={() => setDistModeType("restaurant")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${distModeType === "restaurant" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              🏢 {t("بالمطعم", "By Restaurant")}
            </button>
            <button aria-pressed={distModeType === "module"} onClick={() => setDistModeType("module")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${distModeType === "module" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              📦 {t("بالموديول", "By Module")}
            </button>
            <button aria-pressed={distModeType === "heads"} onClick={() => setDistModeType("heads")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${distModeType === "heads" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              👥 {t("توزيع المحاسبين على الرؤساء", "Assign Accountants to Heads")}
            </button>
          </div>

          {/* ─ Mode 1: by Restaurant ─ */}
          {distModeType === "restaurant" && <><div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                <p className="font-bold text-amber-800 text-sm">🏅 {t("رؤساء الحسابات", "Accounting Heads")}</p>
                <p className="text-[11px] text-amber-600 mt-0.5">{t("اختر رئيساً لعرض محاسبيه", "Select a head to view their accountants")}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {distHeads.map(head => {
                  const cnt = distAccs.filter(a => a.headId === head.id).length;
                  const restCnt = distAccs.filter(a => a.headId === head.id).flatMap(a => a.restaurants).length;
                  return (
                    <button key={head.id} onClick={() => { setHeadSel(head.id); setAccSel(distAccs.find(a => a.headId === head.id)?.id || null); }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors ${headSel === head.id ? "bg-amber-50/60 border-r-2 border-amber-400" : "hover:bg-gray-50"}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${head.color}`}>{head.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800">{head.name}</p>
                        <p className="text-[11px] text-gray-400">{cnt} {t("محاسب", "accountants")} · {restCnt} {t("مطعم", "restaurants")}</p>
                      </div>
                      {headSel === head.id && <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
                    </button>
                  );
                })}
                {distAccs.filter(a => !a.headId).length > 0 && (
                  <button onClick={() => { setHeadSel(null); setAccSel(distAccs.find(a => !a.headId)?.id || null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors ${headSel === null ? "bg-red-50/60 border-r-2 border-red-400" : "hover:bg-gray-50"}`}>
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">⚠️</div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-600">{t("محاسبون غير مُعيَّنين", "Unassigned Accountants")}</p>
                      <p className="text-[11px] text-gray-400">{distAccs.filter(a => !a.headId).length} {t("محاسب", "accountants")}</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <p className="font-bold text-blue-800 text-sm">👨‍💼 {t("المحاسبون", "Accountants")}</p>
                <p className="text-[11px] text-blue-600 mt-0.5">
                  {headSel ? `${t("تابعون لـ", "Reporting to")} ${distHeads.find(h => h.id === headSel)?.name}` : t("غير مُعيَّنين", "Unassigned")}
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {(headSel === null ? distAccs.filter(a => !a.headId) : distAccs.filter(a => a.headId === headSel)).map(acc => (
                  <div key={acc.id}>
                    <button onClick={() => setAccSel(acc.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors ${accSel === acc.id ? "bg-blue-50/60 border-r-2 border-blue-400" : "hover:bg-gray-50"}`}>
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">{acc.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{acc.name}</p>
                        <p className="text-[11px] text-gray-400">{acc.restaurants.length} {t("مطعم مُخصَّص", "restaurants assigned")}</p>
                      </div>
                      {accSel === acc.id && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </button>
                    {accSel === acc.id && headSel === null && (
                      <div className="px-4 pb-3">
                        <p className="text-[11px] text-gray-500 mb-1">{t("نقل إلى رئيس حسابات:", "Move to head:")}  </p>
                        <div className="flex gap-1.5 flex-wrap">
                          {distHeads.map(h => (
                            <button key={h.id} onClick={() => moveAccToHead(acc.id, h.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${h.color} border-current/20 hover:opacity-80`}>
                              + {h.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(headSel === null ? distAccs.filter(a => !a.headId) : distAccs.filter(a => a.headId === headSel)).length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-400 text-xs">{t("لا يوجد محاسبون", "No accountants")}</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                <p className="font-bold text-emerald-800 text-sm">🏢 {t("المطاعم", "Restaurants")}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  {selAccData ? `${t("مخصصة لـ", "Assigned to")} ${selAccData.name}` : t("اختر محاسباً", "Select an accountant")}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {selAccData && (
                  <>
                    {selAccRests.length === 0
                      ? <div className="px-4 py-4 text-center text-xs text-gray-400">{t("لا توجد مطاعم مخصصة", "No assigned restaurants")}</div>
                      : selAccRests.map(rest => (
                        <div key={rest} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 flex-1">{restName(rest)}</span>
                          <button onClick={() => removeRestFromAcc(accSel!, rest)} className="text-red-400 hover:text-red-600 flex-shrink-0 text-xs px-1.5 py-0.5 rounded hover:bg-red-50">✕</button>
                        </div>
                      ))
                    }
                    {availableForAcc.length > 0 && (
                      <div className="px-4 py-2 bg-gray-50/50">
                        <p className="text-[10px] font-bold text-gray-400 mb-1.5">{t("إضافة مطاعم:", "Add restaurants:")}</p>
                        {availableForAcc.map(rest => (
                          <div key={rest} className="flex items-center gap-2.5 py-1.5 hover:bg-white rounded px-1">
                            <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                            <span className="text-xs text-gray-500 flex-1">{restName(rest)}</span>
                            <button onClick={() => addRestToAcc(accSel!, rest)} className="text-emerald-500 hover:text-emerald-700 flex-shrink-0 text-xs px-1.5 py-0.5 rounded hover:bg-emerald-50 font-bold">+</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {!selAccData && <div className="px-4 py-8 text-center text-gray-400 text-sm">{t("اختر محاسباً من العمود المجاور", "Select an accountant from the adjacent column")}</div>}
              </div>
            </div>
          </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="font-bold text-sm text-gray-700 mb-3">{t("ملخص التوزيع الكامل", "Full Distribution Summary")}</p>
              <div className="space-y-2">
                {distHeads.map(head => (
                  <div key={head.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${head.color}`}>{head.avatar}</div>
                      <p className="font-bold text-sm text-gray-800">{head.name}</p>
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 mr-auto">{t("رئيس حسابات", "Accounting Head")}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mr-9">
                      {distAccs.filter(a => a.headId === head.id).map(acc => (
                        <div key={acc.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">{acc.avatar}</div>
                            <p className="text-xs font-semibold text-gray-700">{acc.name}</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {acc.restaurants.length === 0
                              ? <span className="text-[10px] text-gray-400">{t("لا مطاعم", "No restaurants")}</span>
                              : acc.restaurants.map(r => <span key={r} className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5">{restName(r).split("—")[0].trim()}</span>)
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>}

          {distModeType === "module" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-[11px] text-blue-700">
                💡 {t("اختر محاسباً ثم حدّد الموديولات المسموح بها لكل مطعم من مطاعمه المخصصة", "Select an accountant, then set allowed modules for each of their assigned restaurants")}
              </div>
              <div className="grid grid-cols-3 gap-4">

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <p className="font-bold text-blue-800 text-sm">👨‍💼 {t("المحاسبون", "Accountants")}</p>
                    <div className="flex items-center gap-1.5 mt-2 bg-white border border-blue-200 rounded-lg px-2.5 py-1.5">
                      <Search size={10} className="text-gray-400 flex-shrink-0" />
                      <input value={modAccFilter} onChange={e => setModAccFilter(e.target.value)}
                        className="text-[11px] bg-transparent outline-none flex-1 text-gray-600" placeholder={t("بحث باسم المحاسب...", "Search accountant...")} />
                      {modAccFilter && <button onClick={() => setModAccFilter("")}><X size={10} className="text-gray-400" /></button>}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 overflow-y-auto flex-1" style={{ maxHeight: 340 }}>
                    {distAccs.filter(a => !modAccFilter || a.name.includes(modAccFilter)).map(acc => {
                      // Counts come from the API (restaurantCount/moduleCount) — the
                      // stored restaurant_ids are empty by design for accountants, so
                      // never derive the count from them. Fall back to the local matrix.
                      const modCount = acc.moduleCount ?? Object.values(accModules[acc.id] ?? {}).reduce((s, m) => s + m.length, 0);
                      const restCount = acc.restaurantCount ?? Object.keys(accModules[acc.id] ?? {}).length;
                      return (
                        <button key={acc.id} onClick={() => { setModAccSel(acc.id); setModAccFilter(""); }}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition-colors ${modAccSel === acc.id ? "bg-blue-50/60 border-r-2 border-blue-500" : "hover:bg-gray-50"}`}>
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">{acc.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-800 truncate">{acc.name}</p>
                            <p className="text-[11px] text-gray-400">{restCount} {t("مطعم", "restaurants")} · {modCount} {t("صلاحية", "permissions")}</p>
                          </div>
                          {modAccSel === acc.id && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                    {distAccs.filter(a => !modAccFilter || a.name.includes(modAccFilter)).length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-400 text-xs">لا نتائج</div>
                    )}
                  </div>
                </div>

                {/* Column 2+3 merged: module matrix for selected accountant */}
                <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {(() => {
                    const acc = distAccs.find(a => a.id === modAccSel);
                    if (!acc) return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">{t("اختر محاسباً", "Select an accountant")}</div>;
                    // Prefer the dedicated /accountants/{id}/modules matrix (named
                    // restaurants + moduleCatalog); fall back to the distribution seed.
                    const apiRests = Array.isArray((accModulesApi as any)?.restaurants) ? (accModulesApi as any).restaurants as any[] : null;
                    const apiCatalog = Array.isArray((accModulesApi as any)?.moduleCatalog) && (accModulesApi as any).moduleCatalog.length
                      ? ((accModulesApi as any).moduleCatalog as any[]).map(m => ({ value: m.key ?? m.value, label: m.labelAr ?? m.labelEn ?? m.key ?? m.value })).filter(m => m.value)
                      : null;
                    const COLS = apiCatalog ?? DIST_MODULES;
                    // Never assume field names or that a name resolves — the API may key
                    // restaurants by restaurantId/name and restName() returns undefined for
                    // an unknown id. String()-guard everything so .split can't throw.
                    const rowName = (nm: any, id: string) => String(nm ?? restName(id) ?? id ?? "").split("—")[0].trim();
                    const rows: { id: string; name: string }[] = apiRests
                      ? apiRests.map((r: any) => { const rid = String(r?.id ?? r?.restaurantId ?? r?.restaurant_id ?? ""); return { id: rid, name: rowName(r?.name ?? r?.restaurantName ?? r?.restaurant_name, rid) }; })
                      : (acc.restaurants ?? []).map((rest: string) => ({ id: String(rest), name: rowName(undefined, String(rest)) }));
                    if ((accModulesApi as any)?.reason === "NO_COVERED_RESTAURANTS") return (
                      <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
                        <p className="text-sm">{t("لا يوجد براند مخصّص لهذا المحاسب", "No brand assigned to this accountant")}</p>
                        <p className="text-xs">{t("عيّن براند للمحاسب أولاً من الطريقة الأولى", "Assign a brand to the accountant first using method 1")}</p>
                      </div>
                    );
                    if (rows.length === 0) return (
                      <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
                        <p className="text-sm">{t("لا توجد مطاعم مخصصة لهذا المحاسب", "No restaurants assigned to this accountant")}</p>
                        <p className="text-xs">{t("قم بتخصيص مطاعم أولاً من الطريقة الأولى", "Assign restaurants first using method 1")}</p>
                      </div>
                    );
                    return (
                      <>
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-800 text-sm">{t("مصفوفة الموديولات", "Module Matrix")} — {acc.name}</p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => rows.forEach(r => assignAllModules(modAccSel, r.id, COLS.map(m => m.value)))}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700">
                                ✓ {t("تمكين الكل", "Enable all")}
                              </button>
                              <button onClick={() => rows.forEach(r => clearRestModules(modAccSel, r.id))}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300">
                                ✕ {t("إلغاء الكل", "Clear all")}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 max-w-xs">
                            <Search size={10} className="text-gray-400 flex-shrink-0" />
                            <input value={modRestFilter} onChange={e => setModRestFilter(e.target.value)}
                              className="text-[11px] bg-transparent outline-none flex-1 text-gray-600" placeholder={t("فلترة بالمطعم...", "Filter by restaurant...")} />
                            {modRestFilter && <button onClick={() => setModRestFilter("")}><X size={10} className="text-gray-400" /></button>}
                          </div>
                        </div>
                        <div className="overflow-auto">
                          <table className="w-full text-right">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-2.5 text-xs font-bold text-gray-500 text-right min-w-[140px]">{t("المطعم", "Restaurant")}</th>
                                {COLS.map(m => {
                                  const lbl = String(m.label ?? m.value ?? ""); return (
                                    <th key={m.value} className="px-2 py-2.5 text-[10px] font-bold text-gray-500 text-center align-bottom min-w-[56px] max-w-[76px] whitespace-normal break-words leading-tight" title={lbl}>{lbl}</th>
                                  );
                                })}
                                <th className="px-3 py-2.5 text-[10px] font-bold text-gray-400 text-center">الكل</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {rows.filter(r => !modRestFilter || r.name.includes(modRestFilter)).map((row, ri) => {
                                const mods = accModules[modAccSel]?.[row.id] ?? [];
                                const allChecked = COLS.every(m => mods.includes(m.value));
                                return (
                                  <tr key={row.id} className={`hover:bg-gray-50/50 ${ri % 2 === 1 ? "bg-gray-50/30" : ""}`}>
                                    <td className="px-4 py-2.5">
                                      <p className="text-xs font-semibold text-gray-700">{row.name}</p>
                                      <p className="text-[10px] text-gray-400">{mods.length}/{COLS.length} موديول</p>
                                    </td>
                                    {COLS.map(m => {
                                      const checked = mods.includes(m.value);
                                      return (
                                        <td key={m.value} className="px-2 py-2.5 text-center">
                                          <button onClick={() => toggleModuleForRest(modAccSel, row.id, m.value)}
                                            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all ${checked ? "bg-purple-600 text-white shadow-sm" : "bg-gray-100 text-gray-400 hover:bg-purple-100 hover:text-purple-600"}`}>
                                            {checked ? <Check size={11} /> : <span className="text-[10px]">—</span>}
                                          </button>
                                        </td>
                                      );
                                    })}
                                    <td className="px-3 py-2.5 text-center">
                                      <button onClick={() => allChecked ? clearRestModules(modAccSel, row.id) : assignAllModules(modAccSel, row.id, COLS.map(m => m.value))}
                                        className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all ${allChecked ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500 hover:bg-emerald-100"}`}>
                                        {allChecked ? <Check size={11} /> : <Plus size={9} />}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-purple-600 inline-block" /> {t("ممكَّن", "Enabled")}</span>
                          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-gray-100 inline-block" /> {t("غير ممكَّن", "Disabled")}</span>
                          <span className="mr-auto">{t("اضغط أي خانة لتفعيل/إلغاء الموديول", "Tap any cell to toggle module")}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ─ Mode 3: Accountants → Heads ─ */}
          {distModeType === "heads" && (() => {
            const unassigned = distAccs.filter(a => !a.headId);
            return (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-[11px] text-amber-700">
                  💡 {t("اضغط على محاسب لتحديده، ثم اضغط على رئيس الحسابات لتعيينه إليه — أو اضغط ✕ لإلغاء التعيين", "Tap an accountant to select, then tap a head to assign — or press ✕ to remove assignment")}
                </div>
                <div className="grid grid-cols-5 gap-4">

                  {/* Left col (2/5): All accountants */}
                  <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-gray-800 text-sm">👨‍💼 {t("جميع المحاسبين", "All Accountants")}</p>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">{distAccs.filter(a => a.headId).length} {t("مُعيَّن", "assigned")}</span>
                          {unassigned.length > 0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">{unassigned.length} {t("غير مُعيَّن", "unassigned")}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
                        <Search size={10} className="text-gray-400 flex-shrink-0" />
                        <input value={h3HeadFilter} onChange={e => setH3HeadFilter(e.target.value)}
                          className="text-[11px] bg-transparent outline-none flex-1 text-gray-600" placeholder={t("بحث بالاسم...", "Search by name...")} />
                        {h3HeadFilter && <button onClick={() => setH3HeadFilter("")}><X size={10} className="text-gray-400" /></button>}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50 overflow-y-auto flex-1" style={{ maxHeight: 400 }}>
                      {distAccs.filter(a => !h3HeadFilter || a.name.includes(h3HeadFilter)).map(acc => {
                        const head = distHeads.find(h => h.id === acc.headId);
                        const isSelected = h3AccSel === acc.id;
                        const selectionId = `head-accountant-${encodeURIComponent(acc.id)}`;
                        return (
                          <div key={acc.id}
                            className={`flex items-center gap-3 px-4 py-3 transition-all ${isSelected ? "bg-purple-50 border-r-4 border-purple-500" : "hover:bg-gray-50"}`}>
                            <label htmlFor={selectionId} className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer">
                              <input
                                id={selectionId}
                                type="radio"
                                name="head-accountant-selection"
                                value={acc.id}
                                checked={isSelected}
                                onChange={() => setH3AccSel(acc.id)}
                                className="h-4 w-4 shrink-0 accent-purple-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                              />
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${isSelected ? "bg-purple-200 text-purple-800 ring-2 ring-purple-400" : "bg-blue-100 text-blue-700"}`}>
                                {acc.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm truncate ${isSelected ? "text-purple-800" : "text-gray-800"}`}>{acc.name}</p>
                                {head
                                  ? <p className="text-[10px] text-emerald-600 flex items-center gap-1"><Check size={9} /> {head.name}</p>
                                  : <p className="text-[10px] text-red-400">⚠ {t("غير مُعيَّن بعد", "Not yet assigned")}</p>
                                }
                              </div>
                            </label>
                            {acc.headId && (
                              <button type="button" onClick={e => { e.stopPropagation(); moveAccToHead(acc.id, null); setH3AccSel(null); }}
                                className="w-6 h-6 rounded-full bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center flex-shrink-0">
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {h3AccSel && (
                      <div className="px-4 py-2.5 bg-purple-50 border-t border-purple-200 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        <p className="text-[11px] text-purple-700 font-semibold">
                          {distAccs.find(a => a.id === h3AccSel)?.name} — {t("اختر رئيساً لتعيينه", "Select a head to assign")}
                        </p>
                        <button type="button" onClick={() => setH3AccSel(null)} className="mr-auto text-[10px] text-purple-500 hover:text-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700">{t("إلغاء", "Cancel")}</button>
                      </div>
                    )}
                  </div>

                  {/* Right col (3/5): Heads panels */}
                  <div className="col-span-3 space-y-3">
                    {distHeads.map(head => {
                      const headAccs = distAccs.filter(a => a.headId === head.id);
                      const totalRests = headAccs.flatMap(a => a.restaurants).length;
                      const canAssign = h3AccSel && distAccs.find(a => a.id === h3AccSel)?.headId !== head.id;
                      return (
                        <div key={head.id}
                          className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden transition-all ${canAssign ? "border-purple-400" : "border-gray-100"}`}>
                          {/* Head header */}
                          <div className={`px-4 py-3 flex items-center gap-3 ${head.id === "h1" ? "bg-amber-50" : "bg-purple-50"}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${head.color}`}>{head.avatar}</div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-800 text-sm">{head.name}</p>
                              <p className="text-[11px] text-gray-500">{t("رئيس حسابات", "Accounting Head")} · {headAccs.length} {t("محاسب", "accountants")} · {totalRests} {t("مطعم", "restaurants")}</p>
                            </div>
                            {canAssign && (
                              <button
                                type="button"
                                onClick={() => { if (h3AccSel) { moveAccToHead(h3AccSel, head.id); setH3AccSel(null); } }}
                                aria-label={t(`تعيين المحاسب المحدد إلى ${head.name}`, `Assign selected accountant to ${head.name}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[11px] font-semibold hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700">
                                <Plus size={11} /> {t("تعيين هنا", "Assign here")}
                              </button>
                            )}
                          </div>
                          {/* Assigned accountants */}
                          <div className="px-4 py-3">
                            {headAccs.length === 0
                              ? <p className="text-xs text-gray-400 text-center py-2">لا محاسبين مُعيَّنين</p>
                              : <div className="flex flex-wrap gap-2">
                                {headAccs.map(acc => (
                                  <div key={acc.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">{acc.avatar}</div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-700">{acc.name}</p>
                                      <p className="text-[9px] text-gray-400">{acc.restaurants.length} مطعم</p>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); moveAccToHead(acc.id, null); }}
                                      className="w-4 h-4 rounded-full bg-red-100 text-red-400 hover:bg-red-200 flex items-center justify-center mr-1">
                                      <X size={8} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            }
                          </div>
                        </div>
                      );
                    })}

                    {/* Unassigned summary */}
                    {unassigned.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        <p className="text-xs font-bold text-red-700 mb-2">⚠ محاسبون غير مُعيَّنين ({unassigned.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {unassigned.map(acc => (
                            <div key={acc.id} className="flex items-center gap-1.5 bg-white border border-red-200 rounded-lg px-2.5 py-1">
                              <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">{acc.avatar}</div>
                              <p className="text-[11px] text-gray-700">{acc.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── LIST TAB ── */}
      {usersTab === "list" && (<>
        <div className="grid grid-cols-6 gap-3">
          {[["محاسب", "blue"], ["رئيس حسابات", "amber"], ["مدير فرع", "emerald"], ["مدير مشتريات", "purple"], ["مورد", "orange"], ["أدمن", "red"]].map(([r, c]) => (
            <div key={r} className={`bg-white rounded-xl border border-gray-100 p-3 text-center cursor-pointer hover:border-${c}-200 transition-all ${roleFilter === r ? `border-${c}-300 bg-${c}-50/40` : ""}`}
              onClick={() => setRoleFilter(roleFilter === r ? "" : r)}>
              <p className={`text-xl font-bold text-${c}-600`}>{byRole[r] || 0}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{r}</p>
            </div>
          ))}
        </div>

        <Card title={t("قائمة المستخدمين", "User List")} actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
              <Search size={13} className="text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("بحث بالاسم...", "Search by name...")} className="text-xs outline-none text-gray-600 w-28" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
              <option value="">{t("جميع الأدوار", "All Roles")}</option>
              {["محاسب", "رئيس حسابات", "مدير فرع", "مدير مشتريات", "مورد", "أدمن"].map(r => <option key={r}>{r}</option>)}
            </select>
            <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
              <option value="">{t("جميع العلامات", "All Brands")}</option>
              {allBrands.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
        }>
          {shown.length === 0
            ? <EmptyState icon="👤" title={t("لا توجد نتائج", "No results")} desc={t("جرب تغيير الفلتر", "Try changing the filter")} />
            : <div className="divide-y divide-gray-100">
              {shown.map((u, i) => {
                const isExp = expandedRow === u.email;
                const path = derivePath(u);
                return (
                  <div key={i}>
                    <div className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors ${isExp ? "bg-purple-50/30" : ""}`}
                      onClick={() => setExpandedRow(isExp ? null : u.email)}>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{u.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-gray-800">{u.name}</p>
                          <Badge className={`text-[10px] border ${roleCls[u.role] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{u.role}</Badge>
                          <Badge className={`text-[10px] ${scopeCls[u.scope]}`}>{scopeLabel[u.scope]}</Badge>
                          <Badge className={u.status === "active" ? "bg-emerald-50 text-emerald-600 text-[10px]" : "bg-gray-50 text-gray-400 text-[10px]"}>{u.status === "active" ? t("نشط", "Active") : t("غير نشط", "Inactive")}</Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{u.email} · {u.phone}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right hidden md:block">
                          <p className="text-[10px] text-gray-400">العلامات التجارية</p>
                          <p className="text-xs font-medium text-gray-600 max-w-[160px] truncate">{path.brands.join("، ") || "—"}</p>
                        </div>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isExp ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {isExp && (
                      <div className="mx-4 mb-3 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-gray-400 font-semibold mb-1">{t("العلامات التجارية", "Brands")}</p>
                            <div className="space-y-0.5">
                              {path.brands.length > 0 ? path.brands.map(b => {
                                const bc = BRANDS_CATALOG.find(x => x.name === b);
                                return <div key={b} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: bc?.color || "#888" }} /><span>{b}</span></div>;
                              }) : <span className="text-gray-400">—</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400 font-semibold mb-1">{t("المطاعم المخصصة", "Assigned Restaurants")}</p>
                            <div className="space-y-0.5">
                              {path.restaurants.length > 0 ? path.restaurants.map(r => <div key={r}>{r}</div>) : <span className="text-gray-400">{u.scope === "brand" ? t("جميع مطاعم العلامة", "All brand restaurants") : "—"}</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400 font-semibold mb-1">{t("الفروع المخصصة", "Assigned Branches")}</p>
                            <div className="space-y-0.5">
                              {path.branches.length > 0 ? path.branches.map(b => <div key={b}>{b}</div>) : <span className="text-gray-400">{u.scope === "restaurant" ? t("جميع فروع المطعم", "All restaurant branches") : "—"}</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400 font-semibold mb-1">{t("الموديولات", "Modules")} ({u.modules.length})</p>
                            <div className="flex flex-wrap gap-1">
                              {u.modules.map(m => <span key={m} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">{m}</span>)}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 text-xs">
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                            <Clock size={12} className="text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-gray-400 text-[10px]">{t("آخر تسجيل دخول", "Last Login")}</p>
                              <p className="font-semibold text-gray-700">{fmtUserDateTime(u.lastLoginAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                            <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-gray-400 text-[10px]">{t("تاريخ الإنشاء", "Created At")}</p>
                              <p className="font-semibold text-gray-700">{fmtUserDate(u.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                        {reportsToName(u.reportsTo) && (
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                            <span className="font-semibold">{t("يرفع تقاريره إلى:", "Reports to:")}</span>
                            <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-lg">{reportsToName(u.reportsTo)}</span>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2 border-t border-gray-200">
                          <Btn size="sm" onClick={(e) => { e.stopPropagation(); navigate?.("admin-permissions"); }}><Edit2 size={12} /> {t("تعديل الصلاحيات", "Edit Permissions")}</Btn>
                          <Btn size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); if (u.id && window.confirm(t("إعادة تعيين كلمة مرور هذا المستخدم؟ سيتم إرسال كلمة مرور جديدة بالبريد.", "Reset this user's password? A new password will be emailed."))) resetPwdMut.mutate({ id: u.id }); }}>{t("إعادة تعيين كلمة المرور", "Reset Password")}</Btn>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          }
        </Card>
      </>)}
    </div>
  );
}

