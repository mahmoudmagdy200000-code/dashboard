import { useState } from "react";
import { BarChart3, Eye, Download, ChevronsRight } from "lucide-react";
import {
  useReportsInternalPlatform,
  useReportsOwnerPlatform,
  useDownloadHeadReport,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps, ModuleKey } from "../../_shared/types";
import { aggregateOpsAmount } from "../../headReviewGuards";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";

// ─────────────────────────────────────────────
// HA-F14: removed static fake SEPT_BASELINE and SEPT_NET.
// Previous-period comparison is derived purely from real API data when available.

export function OwnerReportsPage({ ops }: PageProps) {
  const { t, lang, dir } = useLang();
  const en = lang === "en";
  const [tab, setTab] = useState<"internal" | "owner">("owner");
  // B-H5: internal report catalogue + owner headline come from the API now.
  const { data: internalReportsApi } = useReportsInternalPlatform();
  const { data: ownerApi } = useReportsOwnerPlatform();
  const dlReport = useDownloadHeadReport();
  const internalReports = (((internalReportsApi as any)?.data ?? internalReportsApi ?? []) as any[]);
  // T15.18 — HEAD-7 financial-report cards, delivered under meta.financialReports.
  const financialReports = (((internalReportsApi as any)?.meta?.financialReports ?? []) as any[]);

  // — Owner layer data source: ERP-posted only — the verified financial record
  const postedOps = ops.filter(o => o.erpPosted);
  const salesPosted = aggregateOpsAmount(postedOps.filter(o => o.moduleKey === "sales"));
  const expPosted = aggregateOpsAmount(postedOps.filter(o => o.moduleKey === "expenses"));
  const purPosted = aggregateOpsAmount(postedOps.filter(o => o.moduleKey === "purchases"));
  const netPosition = salesPosted != null && expPosted != null && purPosted != null
    ? salesPosted - expPosted - purPosted
    : null;

  // B-H5 / HA-F14: previous-month baseline + netPctChange come from /head/reports/owner without fake fallbacks
  const baselineNet = (ownerApi as any)?.previousMonthNet != null
    ? Math.round((ownerApi as any).previousMonthNet / 100)
    : null;
  const netPctChange = (ownerApi as any)?.netPctChange ?? (baselineNet != null && baselineNet > 0 && netPosition != null ? Math.round(((netPosition - baselineNet) / baselineNet) * 100) : null);

  // Branch rankings from ERP-posted ops — descending by amount, null-safe
  const branchAmts: Record<string, number | null> = {};
  postedOps.forEach(o => {
    if (!o.branch) return;
    if (branchAmts[o.branch] === null) return;
    if (o.amount == null || Number.isNaN(o.amount)) {
      branchAmts[o.branch] = null;
    } else {
      branchAmts[o.branch] = (branchAmts[o.branch] ?? 0) + o.amount;
    }
  });
  const completeBranchEntries = Object.entries(branchAmts)
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .sort(([, a], [, b]) => b - a);
  const incompleteBranches = Object.entries(branchAmts)
    .filter((entry): entry is [string, null] => entry[1] === null)
    .map(([b]) => b);
  const branchRankings = completeBranchEntries.slice(0, 5);

  // Category breakdown for owner — ERP-posted amounts only, with honest period comparison
  const ownerCategories = [
    { key: "sales" as ModuleKey, label: t("الإيرادات", "Revenue"), icon: "💰", color: "bg-emerald-500", textColor: "text-emerald-700", isIncome: true },
    { key: "expenses" as ModuleKey, label: t("المصروفات", "Expenses"), icon: "💸", color: "bg-red-500", textColor: "text-red-700", isIncome: false },
    { key: "purchases" as ModuleKey, label: t("المشتريات", "Purchases"), icon: "🛒", color: "bg-orange-500", textColor: "text-orange-700", isIncome: false },
    { key: "inventory" as ModuleKey, label: t("المخزون", "Inventory"), icon: "📦", color: "bg-amber-500", textColor: "text-amber-700", isIncome: false },
    { key: "shifts" as ModuleKey, label: t("الشفتات", "Shifts"), icon: "⏰", color: "bg-blue-500", textColor: "text-blue-700", isIncome: false },
    { key: "employees" as ModuleKey, label: t("مستحقات الموظفين", "Payroll"), icon: "👥", color: "bg-indigo-500", textColor: "text-indigo-700", isIncome: false },
    { key: "cash" as ModuleKey, label: t("العهد النقدية", "Cash Custody"), icon: "💼", color: "bg-purple-500", textColor: "text-purple-700", isIncome: false },
  ].map(c => {
    const catOps = postedOps.filter(o => o.moduleKey === c.key);
    const amt = aggregateOpsAmount(catOps);
    const hasOps = catOps.length > 0;
    const prev = (ownerApi as any)?.previousMonthByCategory?.[c.key] != null ? Math.round((ownerApi as any).previousMonthByCategory[c.key] / 100) : 0;
    const pct = amt != null && prev > 0 ? Math.round(((amt - prev) / prev) * 100) : null;
    return { ...c, amount: amt, hasOps, prev, pct };
  }).filter(c => (c.amount != null && c.amount > 0) || c.prev > 0 || c.hasOps);

  const maxCatAmt = Math.max(...ownerCategories.map(c => Math.max(c.amount ?? 0, c.prev)), 1);

  // Auto-commentary: derived from ERP-verified data only without fake September constants
  const commentary: { icon: string; text: string; color: string }[] = [];
  if (netPctChange !== null) {
    if (netPctChange >= 0) commentary.push({ icon: "✓", text: en ? `Net financial position improved ${netPctChange}% vs prior month` : `صافي المركز المالي تحسَّن ${netPctChange}% مقارنةً بالشهر السابق`, color: "text-emerald-700" });
    else commentary.push({ icon: "⚠", text: en ? `Net financial position declined ${Math.abs(netPctChange)}% vs prior month — requires attention` : `صافي المركز المالي تراجع ${Math.abs(netPctChange)}% مقارنةً بالشهر السابق — يستوجب المتابعة`, color: "text-amber-700" });
  }
  const topBranch = branchRankings[0];
  if (topBranch) commentary.push({ icon: "🏆", text: en ? `${topBranch[0]} is the highest-revenue branch in ERP at ${fmtAmt(topBranch[1])} SAR` : `${topBranch[0]} هو الفرع الأعلى إيراداً في ERP بمقدار ${fmtAmt(topBranch[1])} ر.س`, color: "text-indigo-700" });

  // ERP batch log — source of truth, null-safe batch totals
  const batchMap: Record<string, { id: string; total: number | null; modules: Set<string> }> = {};
  postedOps.forEach(o => {
    const b = o.erpBatchId || t("دفعة غير مُسمَّاة", "Unnamed batch");
    if (!batchMap[b]) batchMap[b] = { id: b, total: 0, modules: new Set() };
    if (batchMap[b].total !== null) {
      if (o.amount == null || Number.isNaN(o.amount)) {
        batchMap[b].total = null;
      } else {
        batchMap[b].total = (batchMap[b].total ?? 0) + o.amount;
      }
    }
    batchMap[b].modules.add(o.moduleLabel);
  });
  const batches = Object.values(batchMap);

  return (
    <div className="space-y-5" dir={dir}>
      {/* Page header — kept minimal, layer tabs carry the identity */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t("التقارير المالية", "Financial Reports")}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{t("طبقتان: التقارير التشغيلية الداخلية · رؤية المالك النهائية", "Two layers: Internal operational reports · Owner final view")}</p>
      </div>

      {/* Layer tabs — visually distinct to signal the boundary */}
      <div className="flex gap-0 border-b-2 border-gray-200">
        <button onClick={() => setTab("internal")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all
            ${tab === "internal" ? "border-blue-600 text-blue-700 bg-blue-50/60" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
          <span className="flex flex-col items-start gap-0.5">
            <span>📋 {t("التقارير الداخلية", "Internal Reports")}</span>
            <span className="text-[10px] font-normal text-gray-400">{t("للفريق المالي · تشغيلية", "Finance team · Operational")}</span>
          </span>
        </button>
        <button onClick={() => setTab("owner")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all
            ${tab === "owner" ? "border-indigo-600 text-indigo-700 bg-indigo-50/60" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
          <span className="flex flex-col items-start gap-0.5">
            <span>👁 {t("رؤية المالك", "Owner View")}</span>
            <span className="text-[10px] font-normal text-gray-400">{t("وجهة نهائية · بيانات ERP فقط · قراءة فقط", "Final destination · ERP data only · Read-only")}</span>
          </span>
        </button>
      </div>

      {/* ─── INTERNAL TAB — finance team operational view ─── */}
      {tab === "internal" && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3.5 flex items-start gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">📋</span>
            <div>
              <p className="text-sm font-bold text-blue-800">{t("تقارير داخلية — الطبقة التشغيلية للفريق المالي", "Internal Reports — Operational layer for the finance team")}</p>
              <p className="text-xs text-blue-600 mt-0.5">{t("تشمل البيانات في جميع مراحل المراجعة · تُستخدم لمتابعة الأداء الداخلي وليس للقرار المالي النهائي", "Includes data across all review stages · Used for internal performance tracking, not final financial decisions")}</p>
            </div>
          </div>
          {/* B-H5: catalogue from GET /head/reports/internal; buttons wired to the row downloadUrl. */}
          {/* T15.18 — HEAD-7 financial reports (endpoint catalog cards). */}
          {financialReports.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-800 text-sm mb-3">{t("التقارير المالية", "Financial Reports")}</h3>
              <div className="grid grid-cols-2 gap-3">
                {financialReports.map((f: any, i: number) => (
                  <div key={f.key ?? i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1"><BarChart3 size={15} className="text-purple-600" /><p className="font-bold text-gray-800 text-sm">{f.labelAr ?? f.key}</p></div>
                    {f.note && <p className="text-[11px] text-gray-400 mb-2">{f.note}</p>}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="bg-gray-50 text-gray-500 text-[10px] font-mono">{f.method} {f.endpoint}</Badge>
                      {(f.formats ?? []).map((fmt: string) => <Badge key={fmt} className="bg-purple-50 text-purple-700 text-[10px] uppercase">{fmt}</Badge>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {internalReports.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
              {t("لا توجد تقارير داخلية متاحة بعد", "No internal reports available yet")}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {internalReports.map((r: any, i: number) => {
                const title = (en ? r.labelEn : r.labelAr) ?? r.labelAr ?? r.labelEn ?? r.title ?? "";
                // B-H5 contract: { moduleKey, labelAr, labelEn, count, total(halalas), downloadUrl }
                const totalSar = typeof r.total === "number" ? Math.round(r.total / 100).toLocaleString() : null;
                const desc = (en ? r.descEn : r.descAr) ?? r.desc
                  ?? [r.count != null ? `${r.count} ${t("عملية", "ops")}` : null, totalSar != null ? `${totalSar} ${t("ر.س", "SAR")}` : null].filter(Boolean).join(" · ");
                const url = r.downloadUrl as string | undefined;
                const fname = `${(r.key ?? r.labelAr ?? "report")}.xlsx`;
                const doDownload = () => { if (url) dlReport.mutate({ url, filename: fname }); };
                return (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-sm transition-all shadow-sm">
                    <div className="text-2xl mb-3">{r.icon ?? "📊"}</div>
                    <p className="font-bold text-gray-800 text-sm">{title}</p>
                    <p className="text-xs text-gray-400 mt-1 mb-3">{desc}</p>
                    <div className="flex items-center gap-2">
                      <Btn size="sm" onClick={doDownload} disabled={!url}><Eye size={11} /> {t("عرض", "View")}</Btn>
                      <Btn size="sm" onClick={doDownload} disabled={!url}><Download size={11} /> {t("تحميل", "Download")}</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── OWNER TAB — executive read-only destination ─── */}
      {tab === "owner" && (
        <div className="space-y-6">

          {/* Identity header — distinct visual, communicates ERP-only data provenance */}
          <div className="rounded-2xl overflow-hidden shadow-md" style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e3a5f 100%)" }}>
            <div className="px-8 py-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <Eye size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg leading-tight">{t("التقرير المالي الموحد", "Unified Financial Report")}</p>
                    <p className="text-indigo-300 text-xs">{t("رؤية المالك — المركز المالي المُعتمد", "Owner View — Verified Financial Position")}</p>
                  </div>
                </div>
                <p className="text-indigo-200 text-xs leading-relaxed max-w-lg">
                  {t("هذه الصفحة وجهة نهائية للمالك وتُعرض بيانات مُعتمدة نهائياً ومُرحَّلة في ERP حصراً. لا تظهر هنا أي بيانات في طور المراجعة أو الاعتماد أو الانتظار.", "This page is the owner's final destination and displays only fully approved, ERP-posted data. No data under review or pending approval is shown here.")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center">
                  <p className="text-indigo-200 text-[10px] font-semibold">{t("الفترة المالية", "Financial Period")}</p>
                  <p className="text-white font-bold text-sm">{t("أكتوبر 2025", "October 2025")}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-emerald-300 font-semibold">{t("بيانات ERP مُعتمدة", "ERP Verified Data")}</span>
                </div>
              </div>
            </div>
            {/* Data provenance strip */}
            <div className="bg-black/20 border-t border-white/10 px-8 py-2.5 flex items-center gap-8 text-[11px] text-indigo-300">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{t("المصدر: ERP مُعتمد فقط", "Source: Approved ERP only")}</span>
              <span>·</span>
              <span>{t("الأرقام غير المُعتمدة نهائياً مُستبعدة", "Unapproved figures excluded")}</span>
              <span>·</span>
              <span>{t("لا توجد أزرار إجراءات في هذه الصفحة", "No action buttons on this page")}</span>
              <span>·</span>
              <span>{postedOps.length} {t("بيان مُدرَج", "records included")}</span>
            </div>
          </div>

          {postedOps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
              <div className="text-5xl mb-5">📊</div>
              <p className="font-bold text-gray-700 text-lg mb-2">{t("لا توجد بيانات ERP مُعتمدة بعد", "No approved ERP data yet")}</p>
              <p className="text-gray-400 text-sm mb-1">{t("تظهر هنا البيانات بعد الاعتماد النهائي والترحيل لـ ERP فقط", "Data appears here only after final approval and ERP posting")}</p>
              <p className="text-gray-300 text-xs">{t("الطبقة الداخلية (التبويب الأول) تُظهر جميع البيانات في مراحل المراجعة", "The internal layer (first tab) shows all data under review")}</p>
            </div>
          ) : (
            <>
              {/* Net position — the headline number for the owner */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t("صافي المركز المالي", "Net Financial Position")}</p>
                    <p className={`text-4xl font-black tabular-nums leading-none mb-2 ${netPosition != null && netPosition >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {netPosition != null ? (
                        <>
                          {netPosition >= 0 ? "+" : ""}{(netPosition / 1000).toFixed(1)}K
                          <span className="text-lg font-semibold text-gray-400 mr-1">{t("ر.س", "SAR")}</span>
                        </>
                      ) : (
                        <span className="text-2xl text-gray-400">—</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{t("إيرادات − مصروفات − مشتريات", "Revenue − Expenses − Purchases")}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                      <span>+ {t("إيرادات", "Revenue")}</span><span className="font-mono font-bold text-emerald-700">{salesPosted != null ? `${(salesPosted / 1000).toFixed(1)}K` : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                      <span>− {t("مصروفات", "Expenses")}</span><span className="font-mono font-bold text-red-600">{expPosted != null ? `${(expPosted / 1000).toFixed(1)}K` : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>− {t("مشتريات", "Purchases")}</span><span className="font-mono font-bold text-orange-600">{purPosted != null ? `${(purPosted / 1000).toFixed(1)}K` : "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Category bar chart — visual financial breakdown */}
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t("توزيع المبالغ المُعتمدة في ERP حسب الفئة", "ERP-Approved Amounts by Category")}</p>
                  <div className="space-y-3">
                    {ownerCategories.map((c, i) => {
                      const octPct = c.amount != null ? Math.round((c.amount / maxCatAmt) * 100) : 0;
                      const septPct = Math.round((c.prev / maxCatAmt) * 100);
                      const isUp = c.pct !== null && c.pct > 0;
                      const isDown = c.pct !== null && c.pct < 0;
                      const isFlat = c.pct === 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-base flex-shrink-0 w-6 text-center">{c.icon}</span>
                          <span className="text-xs font-semibold text-gray-600 w-24 flex-shrink-0 text-right">{c.label}</span>
                          <div className="flex-1 space-y-1">
                            {/* Oct bar */}
                            <div className="bg-gray-100 rounded-full h-2.5">
                              <div className={`h-2.5 rounded-full ${c.color}`} style={{ width: `${octPct}%` }} />
                            </div>
                            {/* Sep comparison bar — lighter */}
                            {c.prev > 0 && (
                              <div className="bg-gray-100 rounded-full h-1.5 opacity-50">
                                <div className={`h-1.5 rounded-full ${c.color}`} style={{ width: `${septPct}%` }} />
                              </div>
                            )}
                          </div>
                          <span className={`text-xs font-mono font-extrabold tabular-nums w-20 text-left flex-shrink-0 ${c.textColor}`}>
                            {c.amount != null ? `${(c.amount / 1000).toFixed(1)}K ر.س` : t("غير متاح", "Unavailable")}
                          </span>
                          {c.pct !== null && (
                            <span className={`text-[10px] font-bold w-10 text-left flex-shrink-0
                              ${isUp ? "text-emerald-600" : isDown ? "text-red-600" : "text-gray-400"}`}>
                              {isUp ? "↑" : isDown ? "↓" : "→"}
                              {isUp || isDown ? `${Math.abs(c.pct)}%` : "—"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-gray-300 pt-1">{t("الشريط العلوي: الفترة الحالية · الشريط السفلي: مقارنة الفترة السابقة (عند توفرها)", "Upper bar: Current period · Lower bar: Prior period (comparison when available)")}</p>
                  </div>
                </div>
              </div>

              {/* ─── Period comparison summary (HA-F14: shown only when real baselineNet exists) ─── */}
              {baselineNet !== null && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">{t("مقارنة الفترة السابقة", "Prior Period Comparison")}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{t("مبنية على بيانات ERP المُعتمدة في كلا الفترتين · أرقام غير مُعتمدة مُستبعدة", "Built on approved ERP data for both periods · Unapproved figures excluded")}</p>
                  </div>
                  <div className="px-6 py-4 grid grid-cols-4 gap-4">
                    {[
                      { label: t("صافي المركز المالي", "Net Position"), oct: netPosition, sep: baselineNet, isIncome: true },
                      { label: t("الإيرادات", "Revenue"), oct: salesPosted, sep: (ownerApi as any)?.previousMonthSales != null ? Math.round((ownerApi as any).previousMonthSales / 100) : null, isIncome: true },
                      { label: t("المصروفات", "Expenses"), oct: expPosted, sep: (ownerApi as any)?.previousMonthExpenses != null ? Math.round((ownerApi as any).previousMonthExpenses / 100) : null, isIncome: false },
                      { label: t("المشتريات", "Purchases"), oct: purPosted, sep: (ownerApi as any)?.previousMonthPurchases != null ? Math.round((ownerApi as any).previousMonthPurchases / 100) : null, isIncome: false },
                    ].map((row, i) => {
                      if (row.sep == null || row.oct == null) return null;
                      const diff = row.oct - row.sep;
                      const pct = row.sep > 0 ? Math.round((diff / row.sep) * 100) : null;
                      const isPos = diff > 0;
                      const isNeg = diff < 0;
                      const isGood = row.isIncome ? isPos : isNeg;
                      return (
                        <div key={i} className="text-center">
                          <p className="text-[10px] font-semibold text-gray-400 mb-2">{row.label}</p>
                          <p className="text-lg font-black tabular-nums text-gray-900">{(row.oct / 1000).toFixed(1)}K</p>
                          <p className="text-[10px] text-gray-400 mb-1">{t("السابق:", "Prior:")} {(row.sep / 1000).toFixed(1)}K</p>
                          {pct !== null && (
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full
                              ${isGood ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : isPos ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                              {isPos ? "↑" : "↓"} {Math.abs(pct)}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Branch comparison ─── */}
              {branchRankings.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{t("ترتيب الفروع — حسب المبالغ المُعتمدة في ERP", "Branch Rankings — By ERP-Approved Amounts")}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{t("بيانات ERP مُعتمدة فقط — فروع بدون ترحيل ERP غير مُدرجة", "Approved ERP data only — branches without ERP posting are excluded")}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                      {branchRankings.length} {t("فرع نشط", "active branches")}
                    </span>
                  </div>
                  <div className="px-6 py-3 space-y-3">
                    {branchRankings.map(([branch, total], i) => {
                      const maxBranch = branchRankings[0][1];
                      const pct = Math.round((total / maxBranch) * 100);
                      const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600", "text-gray-500", "text-gray-500"];
                      const medals = ["🥇", "🥈", "🥉", "④", "⑤"];
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`text-sm flex-shrink-0 ${medalColors[i]}`}>{medals[i]}</span>
                          <span className="text-sm font-semibold text-gray-700 w-28 flex-shrink-0">{branch}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                            <div className="h-2.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono font-extrabold text-xs text-indigo-700 tabular-nums w-24 text-left flex-shrink-0">
                            {fmtAmt(total)} {t("ر.س", "SAR")}
                          </span>
                          <span className="text-[10px] text-gray-400 w-8 text-left flex-shrink-0">{pct}%</span>
                        </div>
                      );
                    })}
                    {incompleteBranches.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 mt-2">
                        <p className="text-[11px] font-semibold text-amber-700 mb-1 flex items-center gap-1">
                          <span>⚠</span> {t("فروع بها مبالغ غير محددة (مستبعدة من الترتيب لحين اكتمال البيانات):", "Branches with undefined amounts (excluded from ranking until complete):")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {incompleteBranches.map(b => (
                            <span key={b} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
                              {b}: {t("بيانات غير مكتملة", "Incomplete Data")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Executive commentary ─── */}
              {commentary.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">{t("الملاحظات التنفيذية", "Executive Commentary")}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{t("مُشتقَّة تلقائياً من بيانات ERP المُعتمدة فقط · لا توجد بيانات تقديرية", "Auto-derived from approved ERP data only · No estimated figures")}</p>
                  </div>
                  <div className="px-6 py-4 space-y-2.5">
                    {commentary.map((c, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className={`font-bold text-base flex-shrink-0 mt-0.5 ${c.color}`}>{c.icon}</span>
                        <p className={`text-sm font-semibold ${c.color}`}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ERP batch provenance log */}
              {batches.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{t("سجل دفعات ERP", "ERP Batch Log")}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{t("مصدر البيانات المُعتمدة في هذا التقرير — كل دفعة قيد محاسبي مُغلق", "Source of approved data in this report — each batch is a closed accounting entry")}</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs">🔒 {t("مُغلق", "Closed")}</Badge>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {batches.map((b, i) => (
                      <div key={i} className="px-6 py-4 flex items-center gap-5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                          <ChevronsRight size={14} className="text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900 font-mono">{b.id}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{[...b.modules].join(" · ")}</p>
                        </div>
                        <p className="font-black text-gray-900 font-mono tabular-nums text-base">
                          {b.total != null ? `${(b.total / 1000).toFixed(1)}K` : "—"}
                          <span className="text-xs font-semibold text-gray-400 mr-0.5">{t("ر.س", "SAR")}</span>
                        </p>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">✓ {t("مُعتمد", "Approved")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provenance footer */}
              <div className="flex items-center justify-center gap-4 py-3 text-[11px] text-gray-300 border-t border-gray-100">
                <span>{t("جميع الأرقام من ERP المُعتمد حصراً", "All figures from approved ERP only")}</span>
                <span>·</span>
                <span>{t("الأرقام الأولية أو غير المُجمَّعة غير مُدرجة", "Preliminary or unaggregated figures excluded")}</span>
                <span>·</span>
                <span>{t("لا توجد إجراءات في هذه الصفحة", "No actions on this page")}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
