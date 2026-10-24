import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Filter,
  Check,
  Plus,
  Save,
  Package,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  usePlatformInventory,
  useAccountantInventoryBrands,
  useAccountantInventoryBrandBranches,
  usePlatformInventoryCatalog,
  usePlatformInventoryDailyList,
  useSavePlatformDailyInventoryList,
} from "../../../../../api/queries";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { Breadcrumb } from "../../components/Breadcrumb";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";

export function AccInventoryItems({ navigate }: PageProps) {
  usePlatformInventory();
  const { data: brandsApi } = useAccountantInventoryBrands();

  // Static demo fallbacks — used ONLY when the accountant-scoped APIs return [].
  const DEMO_BRAND_BRANCHES: Record<string, string[]> = {
    "برغر خليفة": ["فرع الرياض - العليا", "فرع الرياض - النزهة", "فرع جدة - الحمراء", "فرع الدمام - الكورنيش"],
    "بيتزا باكو": ["فرع الرياض - الصحافة", "فرع جدة - العزيزية", "فرع مكة - العزيزية"],
    "وسطاوي": ["فرع الرياض - المغرزات", "فرع مكة - المعابدة", "فرع جدة - الرحاب"],
  };
  const MONTHLY_DIFF: Record<string, Record<string, { prev: number; curr: number; pct: number }>> = {
    "فرع الرياض - العليا": { "دجاج طازج": { prev: 120, curr: 89, pct: 26 }, "بطاطس": { prev: 80, curr: 51, pct: 36 }, "زيت قلي": { prev: 40, curr: 27, pct: 33 }, "مايونيز": { prev: 15, curr: 19, pct: 27 } },
    "فرع الرياض - النزهة": { "خبز برجر": { prev: 500, curr: 340, pct: 32 }, "جبنة شيدر": { prev: 30, curr: 21, pct: 30 } },
    "فرع جدة - الحمراء": { "كاتشب": { prev: 20, curr: 13, pct: 35 }, "صوص برجر خاص": { prev: 18, curr: 11, pct: 39 } },
    "فرع الدمام - الكورنيش": { "لحم برجر": { prev: 25, curr: 16, pct: 36 } },
    "فرع الرياض - الصحافة": { "عجينة البيتزا": { prev: 60, curr: 39, pct: 35 }, "جبنة موزاريلا": { prev: 25, curr: 16, pct: 36 } },
    "فرع جدة - العزيزية": { "دجاج مشوي": { prev: 18, curr: 11, pct: 39 } },
    "فرع مكة - العزيزية": { "صوص الطماطم": { prev: 12, curr: 7, pct: 42 }, "مشروم": { prev: 10, curr: 6, pct: 40 } },
    "فرع الرياض - المغرزات": { "أرز بسمتي": { prev: 80, curr: 52, pct: 35 }, "دجاج طازج": { prev: 40, curr: 26, pct: 35 } },
    "فرع مكة - المعابدة": { "لحم ضأن": { prev: 22, curr: 13, pct: 41 } },
    "فرع جدة - الرحاب": { "خبز تنور": { prev: 300, curr: 190, pct: 37 }, "بهارات مشوي": { prev: 8, curr: 5, pct: 38 } },
  };
  const FLAG_PCT = 25;

  // ── Brands (API-first): [{id,name,branchCount,itemCount}] ────────────────
  // Demo fallback applies ONLY before the API has responded (undefined). Once it
  // responds with [] (empty scope), we honor it and let the empty-state render.
  const brandsResponded = Array.isArray(brandsApi);
  const apiBrands = (brandsResponded ? brandsApi : []) as any[];
  const isApiBrands = apiBrands.length > 0;
  // Once the accountant-scoped API has RESPONDED with an empty scope, honor it:
  // no assigned brand → honest empty state, never the demo brands. Showing the
  // demo brands here was the misleading «بيانات قديمة» the accountant saw — real
  // names but a catalog gated off (isApiBrands=false), so nothing was selectable.
  // Demo brands remain only for the brief pre-response window.
  const brandRows = isApiBrands
    ? apiBrands.map(b => ({ id: String(b?.id ?? b?.name ?? ""), name: String(b?.name ?? b?.id ?? ""), branchCount: Number(b?.branchCount ?? 0) }))
    : brandsResponded
      ? []
      : Object.keys(DEMO_BRAND_BRANCHES).map(n => ({ id: n, name: n, branchCount: DEMO_BRAND_BRANCHES[n].length }));
  const brands = brandRows.map(b => b.name);
  const brandIdByName: Record<string, string> = Object.fromEntries(brandRows.map(b => [b.name, b.id]));
  const brandCountByName: Record<string, number> = Object.fromEntries(brandRows.map(b => [b.name, b.branchCount]));

  const [selBrand, setSelBrand] = useState(brands[0] ?? "");   // brand NAME
  useEffect(() => { if (brands.length && !brands.includes(selBrand)) setSelBrand(brands[0]); }, [brands.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const selBrandId = brandIdByName[selBrand] ?? selBrand;

  // ── Branches for selBrand (API-first): [{id,name,listItemCount}] ─────────
  const { data: branchesApi } = useAccountantInventoryBrandBranches(isApiBrands ? selBrandId : undefined);
  const apiBranches = (Array.isArray(branchesApi) ? branchesApi : []) as any[];
  const branchRows = apiBranches.length > 0
    ? apiBranches.map(b => ({ id: String(b?.id ?? ""), name: String(b?.name ?? b?.id ?? ""), real: true, count: Number(b?.listItemCount ?? 0) }))
    : (DEMO_BRAND_BRANCHES[selBrand] ?? []).map(n => ({ id: n, name: n, real: false, count: 0 }));
  const branchNames = branchRows.map(b => b.name);
  const branchIdByName: Record<string, string> = Object.fromEntries(branchRows.map(b => [b.name, b.id]));
  const branchRealByName: Record<string, boolean> = Object.fromEntries(branchRows.map(b => [b.name, b.real]));
  const branchCountByName: Record<string, number> = Object.fromEntries(branchRows.map(b => [b.name, b.count]));

  const [selBranch, setSelBranch] = useState(branchNames[0] ?? "");   // branch NAME
  useEffect(() => { if (branchNames.length && !branchNames.includes(selBranch)) setSelBranch(branchNames[0]); }, [branchNames.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const selBranchId = branchIdByName[selBranch] ?? selBranch;
  const selBranchReal = !!branchRealByName[selBranch];

  // ── Catalog for selBrand (API-first): { items:[{id,name,cat,unit}] } ─────
  const { data: catalogApi } = usePlatformInventoryCatalog(isApiBrands ? selBrandId : undefined);
  const apiCatItems = (catalogApi && Array.isArray((catalogApi as any).items)) ? ((catalogApi as any).items as any[]) : [];
  const catalog = (apiCatItems.length > 0
    ? apiCatItems.map(it => ({ id: String(it?.id ?? it?.name ?? ""), name: String(it?.name ?? ""), cat: String(it?.cat ?? it?.category ?? "—"), unit: String(it?.unit ?? "") }))
    : []) as { id: string; name: string; cat: string; unit: string }[];
  const itemIdByName: Record<string, string> = Object.fromEntries(catalog.map(it => [it.name, it.id]));

  // 2026-08-11: catalog defaults to raw_material (أصناف المشتريات) — the branch
  // counts raw materials, not menu items. Trust `counts` for the real total, and
  // when rawMaterial===0 the empty screen is a data (upload) issue, not a bug.
  const catCounts = (catalogApi as any)?.counts ?? null;
  const rawMaterialCount = catCounts && typeof catCounts.rawMaterial === "number" ? catCounts.rawMaterial : catalog.length;
  const catalogResponded = isApiBrands && catalogApi !== undefined;
  const catalogNoRawMaterial = catalogResponded && rawMaterialCount === 0;

  const [catFilter, setCatFilter] = useState("الكل");
  const [savedBranch, setSavedBranch] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  // 2026-08-11: null = list reached the branch (green); non-null = it didn't (warn).
  const [saveWarn, setSaveWarn] = useState<string | null>(null);

  // ── Current daily list for selBranch (API-first) → seed selection once ───
  const { data: dailyApi } = usePlatformInventoryDailyList(selBranchReal ? selBranchId : undefined);
  const [dailyLists, setDailyLists] = useState<Record<string, string[]>>({}); // keyed by branch NAME, holds item NAMES
  useEffect(() => {
    const rows = (dailyApi as any)?.data ?? (Array.isArray(dailyApi) ? dailyApi : null);
    if (Array.isArray(rows) && selBranchReal) {
      // Seed once per branch so local edits are not clobbered on refetch.
      setDailyLists(p => p[selBranch] !== undefined ? p : ({ ...p, [selBranch]: rows.map((r: any) => String(r?.name ?? r?.catalogItemId ?? r?.id ?? "")) }));
    }
  }, [dailyApi, selBranch, selBranchReal]);

  const savePut = useSavePlatformDailyInventoryList();
  const saving = savePut.isPending;

  const cats = ["الكل", ...new Set(catalog.map(i => i.cat))];
  const shown = catFilter === "الكل" ? catalog : catalog.filter(i => i.cat === catFilter);
  const dailyList = dailyLists[selBranch] || [];
  const branchDiffs = MONTHLY_DIFF[selBranch] || {};
  const isFlagged = (name: string) => !!(branchDiffs[name] && branchDiffs[name].pct >= FLAG_PCT);
  const flaggedNotInDaily = catalog.filter(i => isFlagged(i.name) && !dailyList.includes(i.name));

  const toggleItem = (name: string) => {
    setSavedBranch(null);
    setDailyLists(p => ({ ...p, [selBranch]: p[selBranch]?.includes(name) ? p[selBranch].filter(x => x !== name) : [...(p[selBranch] || []), name] }));
  };
  const addAllFlagged = () => {
    setSavedBranch(null);
    setDailyLists(p => ({ ...p, [selBranch]: [...new Set([...(p[selBranch] || []), ...flaggedNotInDaily.map(i => i.name)])] }));
  };
  const save = () => {
    if (selBranchReal) {
      // Real persist: resolve selected item NAMES → catalogItemIds, then PUT.
      const ids = (dailyLists[selBranch] || []).map(n => itemIdByName[n]).filter(Boolean);
      savePut.mutate({ branchId: selBranchId, items: ids }, {
        onSuccess: (res: any) => {
          const sc = typeof res?.savedCount === "number" ? res.savedCount : ids.length;
          const alc = typeof res?.appListCount === "number" ? res.appListCount : sc;
          const err = res?.appListError ?? null;
          setSavedBranch(selBranch);
          setSavedCount(sc);
          // Only claim success when the list actually reached the branch worksheet.
          setSaveWarn(err !== null ? String(err) : (alc !== sc ? `تم حفظ ${sc} صنف لكن وصل ${alc} فقط إلى تطبيق الفرع — أعد المحاولة.` : null));
        },
      });
    } else {
      // Demo branch (no real id): local-only confirmation.
      setSavedBranch(selBranch); setSavedCount(dailyList.length); setSaveWarn(null);
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: "لوحة التحكم", onClick: () => navigate("acc-dashboard") }, { label: "المخزون", onClick: () => navigate("acc-inventory") }, { label: "تحديد الأصناف" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">تحديد أصناف الجرد اليومي — حسب الفرع</h2>
          <p className="text-gray-400 text-sm mt-0.5">كل فرع له قائمة أصناف مستقلة · الأصناف بفروقات شهرية كبيرة (&gt;25%) تُعلَّم بـ ⚡ للإضافة السريعة</p>
        </div>
        <Btn variant="primary" onClick={save} className={saving ? "opacity-70 cursor-not-allowed" : ""}>
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {saving ? "جاري الحفظ..." : "حفظ وتحديث الفرع فوراً"}
        </Btn>
      </div>

      {savedBranch && (saveWarn === null ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-emerald-800 font-semibold text-sm">تم الحفظ والإرسال بنجاح!</p>
            <p className="text-emerald-600 text-xs">تم إرسال {savedCount ?? dailyList.length} صنف إلى تطبيق مدير {savedBranch} مع إشعار فوري.</p>
          </div>
          <button onClick={() => setSavedBranch(null)} className="mr-auto text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-amber-800 font-semibold text-sm">تم الحفظ لكن لم يصل للفرع بالكامل</p>
            <p className="text-amber-600 text-xs">{saveWarn}</p>
          </div>
          <button onClick={() => setSavedBranch(null)} className="mr-auto text-amber-400 hover:text-amber-600"><X size={14} /></button>
        </div>
      ))}

      {brands.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10">
          <EmptyState icon="📦"
            title={brandsResponded ? "لا توجد علامات مخصّصة لك بعد" : "لا يوجد كتالوج أصناف بعد"}
            desc={brandsResponded ? "لم تُخصَّص لك أي علامة تجارية بعد. تواصل مع الأدمن لتخصيص علامة، وتأكد من رفع كتالوج أصنافها." : "ارفع كتالوج الأصناف للعلامة أولاً، ثم حدّد أصناف الجرد اليومي لكل فرع."} />
        </div>
      ) : (<>
        {/* Brand + Branch selector */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">العلامة التجارية</p>
            <div className="flex gap-2 flex-wrap">
              {brands.map(b => (
                <button key={b} onClick={() => { setSelBrand(b); setCatFilter("الكل"); setSavedBranch(null); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${selBrand === b ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:border-purple-200"}`}>
                  {b}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selBrand === b ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"}`}>{brandCountByName[b] ?? 0} فروع</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">الفرع</p>
            <div className="flex flex-wrap gap-2">
              {branchNames.map(br => {
                const brDaily = dailyLists[br] || [];
                const brDiffs = MONTHLY_DIFF[br] || {};
                const brFlaggedCount = catalog.filter(i => brDiffs[i.name] && brDiffs[i.name].pct >= FLAG_PCT && !brDaily.includes(i.name)).length;
                return (
                  <button key={br} onClick={() => { setSelBranch(br); setCatFilter("الكل"); setSavedBranch(null); }}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${selBranch === br ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:border-purple-200"}`}>
                    <span>{br.replace("فرع ", "ف. ")}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${selBranch === br ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>{(brDaily.length || branchCountByName[br] || 0)} صنف</span>
                    {brFlaggedCount > 0 && (
                      <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{brFlaggedCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Flagged alert */}
        {flaggedNotInDaily.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-800 font-semibold text-sm">⚡ {flaggedNotInDaily.length} أصناف بفروقات شهرية عالية في {selBranch.replace("فرع ", "")}</p>
                <p className="text-amber-600 text-xs mt-0.5">تجاوزت فروقاتها في الجرد الشهري 25% — يُنصح بإضافتها للجرد اليومي لمتابعة أدق</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {flaggedNotInDaily.map(i => (
                    <button key={i.name} onClick={() => toggleItem(i.name)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 text-xs font-medium hover:bg-amber-200 transition-all">
                      ⚡ {i.name}
                      <span className="text-amber-600 text-[9px] font-bold">(-{branchDiffs[i.name].pct}%)</span>
                      <Plus size={10} className="text-amber-700" />
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={addAllFlagged}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-all whitespace-nowrap">
                إضافة الكل ⚡
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-5">
          {/* Left: catalog */}
          <div className="col-span-2 space-y-3">
            <div className="flex gap-2 flex-wrap">
              {cats.map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${catFilter === c ? "bg-purple-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                  {c}
                </button>
              ))}
            </div>
            <Card title={`كتالوج ${selBrand} — ${catFilter === "الكل" ? rawMaterialCount : shown.length} صنف`} actions={
              <div className="flex gap-3">
                <button onClick={() => { setSavedBranch(null); setDailyLists(p => ({ ...p, [selBranch]: catalog.map(i => i.name) })); }} className="text-xs text-purple-600 hover:underline">تحديد الكل</button>
                <button onClick={() => { setSavedBranch(null); setDailyLists(p => ({ ...p, [selBranch]: [] })); }} className="text-xs text-red-500 hover:underline">إلغاء الكل</button>
              </div>
            }>
              {catalogNoRawMaterial ? (
                <div className="p-6">
                  <EmptyState icon="📥" title="لم يُرفع ملف أصناف المشتريات لهذه العلامة"
                    desc="أصناف الجرد اليومي مصدرها المواد الخام (أصناف المشتريات). ارفع ملف أصناف المشتريات لهذه العلامة أولاً لتظهر هنا." />
                </div>
              ) : (
                <div className="p-4 grid grid-cols-2 gap-2.5">
                  {shown.map(item => {
                    const isSelected = dailyList.includes(item.name);
                    const flagged = isFlagged(item.name);
                    const diffData = branchDiffs[item.name];
                    return (
                      <button key={item.name} onClick={() => toggleItem(item.name)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-right ${isSelected ? "border-purple-300 bg-purple-50/70" : flagged ? "border-amber-300 bg-amber-50/50 hover:border-amber-400" : "border-gray-100 bg-white hover:border-gray-200"}`}>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-purple-600" : flagged ? "bg-amber-400" : "bg-gray-100"}`}>
                          {isSelected ? <Check size={12} className="text-white" /> : flagged ? <span className="text-white text-[10px] font-bold">⚡</span> : null}
                        </div>
                        <div className="text-right flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {item.cat} · {item.unit}
                            {flagged && <span className="text-amber-600 font-bold"> · ⚡ فرق {diffData.pct}%</span>}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right: daily list + monthly diff */}
          <div className="space-y-3">
            <Card title={`جرد ${selBranch.replace("فرع ", "")}`} actions={<Badge className="bg-purple-100 text-purple-700 font-bold">{dailyList.length} صنف يومياً</Badge>}>
              <div className="p-4">
                {dailyList.length === 0
                  ? <EmptyState icon="📦" title="لم يتم اختيار أصناف" desc="اختر من الكتالوج على اليسار" />
                  : <div className="space-y-1 mb-3 max-h-52 overflow-y-auto">
                    {dailyList.map((n, i) => {
                      const flagged = isFlagged(n);
                      return (
                        <div key={n} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors group ${flagged ? "bg-amber-50/70 hover:bg-amber-50" : "hover:bg-gray-50"}`}>
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <span className="text-sm text-gray-700 flex-1">{n}</span>
                          {flagged && <span className="text-[10px] text-amber-600 font-semibold">⚡</span>}
                          <button onClick={() => toggleItem(n)} className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><X size={13} /></button>
                        </div>
                      );
                    })}
                  </div>
                }
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 mb-3">
                  <p className="text-[10px] text-blue-600">⚡ مُعلَّم = فروقات شهرية كبيرة · يُرسَل فورياً للموبايل</p>
                </div>
                <Btn variant="primary" className="w-full justify-center" onClick={save}>
                  <RefreshCw size={13} /> {saving ? "جاري الإرسال..." : "تحديث الفرع فوراً"}
                </Btn>
              </div>
            </Card>

            {Object.keys(branchDiffs).length > 0 && (
              <Card title="فروقات الجرد الشهري">
                <div className="p-3 space-y-2">
                  {Object.entries(branchDiffs).map(([name, d]) => (
                    <div key={name} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{name}</p>
                        <p className="text-[10px] text-gray-400">{d.prev} → {d.curr} {catalog.find(i => i.name === name)?.unit || ""}</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${d.pct >= 35 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>-{d.pct}%</div>
                      {dailyList.includes(name)
                        ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                        : <button onClick={() => toggleItem(name)} className="text-amber-500 hover:text-amber-700 flex-shrink-0 transition-colors"><Plus size={14} /></button>
                      }
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </>)}
    </div>
  );
}
