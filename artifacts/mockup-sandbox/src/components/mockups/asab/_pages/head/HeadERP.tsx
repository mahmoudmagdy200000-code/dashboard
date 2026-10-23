import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  Lock,
  ChevronsRight,
  AlertTriangle,
  FileText,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  useErpEligibleOperationsPlatform,
  useErpPreflightPlatform,
  useErpBatchesPlatform,
  useRetryERPBatch,
  useDownloadERPBatch,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import { ORIGIN_CFG } from "../../_shared/displayConfig";
import type { PageProps, Op } from "../../_shared/types";
import {
  filterErpOperations,
  canProceedPreflight,
  getLocalDateString,
} from "../../headReviewGuards";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";

export function HeadERP({ ops, markErpPosted }: PageProps) {
  useErpEligibleOperationsPlatform();
  // B-H4: preflight checklist + previous batches log now come from the API.
  const { data: erpPreflight } = useErpPreflightPlatform();
  const { data: erpBatches } = useErpBatchesPlatform();
  const retryBatchMut = useRetryERPBatch();     // T10 §B3 — retry a failed batch
  const downloadBatchMut = useDownloadERPBatch();  // T10 §B4 — json/csv/xlsx
  const { t, dir, lang } = useLang();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [tab, setTab] = useState<"export" | "reports">("export");
  const [postedBatchId, setPostedBatchId] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // Filters connected to reactive state (HA-F07)
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("day");
  const [restaurantFilter, setRestaurantFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("approved_only");

  // Only show ops that are final-approved but NOT yet ERP-posted
  const pendingErp = ops.filter(o => o.status === "final-approved" && !o.erpPosted);
  const postedOps = ops.filter(o => o.erpPosted);
  const finalApproved = ops.filter(o => o.status === "final-approved");

  // Real dynamic counts from operations, no hardcoded counts
  const availableRestaurants = [...new Set(pendingErp.map(o => o.brandName || o.branch).filter(Boolean))];
  const availableBranches = [...new Set(pendingErp.map(o => o.branch).filter(Boolean))];

  // Derive toPost from reactive filters and exclude unknown money (HA-F07, HA-F11)
  const toPost = useMemo(() => {
    return filterErpOperations(ops, {
      moduleFilter,
      periodFilter,
      restaurantFilter,
      branchFilter,
      statusFilter,
    });
  }, [ops, moduleFilter, periodFilter, restaurantFilter, branchFilter, statusFilter]);

  const totalAmt = toPost.some(o => o.amount == null) ? null : toPost.reduce((s, o) => s + (o.amount ?? 0), 0);
  // B-H4: preflight shape { checks:[{ok,labelAr,labelEn,severity}], canProceed, warningCount }
  const preflightChecks = (((erpPreflight as any)?.checks ?? []) as { ok: boolean; labelAr?: string; labelEn?: string; severity?: string }[]);
  const preflightWarnings = (erpPreflight as any)?.warningCount ?? preflightChecks.filter(c => !c.ok).length;
  const erpBatchRows = (((erpBatches as any)?.data ?? erpBatches ?? []) as any[]);

  // ERP Reports: group posted ops by module (HA-F11: null-safe module totals)
  const reportsByModule = postedOps.reduce<Record<string, { label: string; count: number; total: number | null; batchIds: string[] }>>((acc, op) => {
    if (!acc[op.moduleKey]) { acc[op.moduleKey] = { label: op.moduleLabel, count: 0, total: 0, batchIds: [] }; }
    acc[op.moduleKey].count++;
    if (acc[op.moduleKey].total !== null) {
      if (op.amount == null || Number.isNaN(op.amount)) {
        acc[op.moduleKey].total = null;
      } else {
        acc[op.moduleKey].total = (acc[op.moduleKey].total ?? 0) + op.amount;
      }
    }
    if (op.erpBatchId && !acc[op.moduleKey].batchIds.includes(op.erpBatchId)) acc[op.moduleKey].batchIds.push(op.erpBatchId);
    return acc;
  }, {});
  const reportRows = Object.values(reportsByModule);

  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("نظام ERP — التصدير والتقارير", "ERP System — Export & Reports")}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{t("ترحيل العمليات المعتمدة نهائياً · تقارير ERP المُستوردة (قراءة فقط)", "Post final-approved operations · Imported ERP reports (read-only)")}</p></div>
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: "export" as const, label: `🔗 ${t("التصدير لـ ERP", "Export to ERP")}`, count: toPost.length },
          { id: "reports" as const, label: `📊 ${t("تقارير ERP المُستوردة", "Imported ERP Reports")}`, count: postedOps.length },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px flex items-center gap-2
              ${tab === tb.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tb.label}
            {tb.count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === tb.id ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>{tb.count}</span>}
          </button>
        ))}
      </div>
      {tab === "reports" && (
        <div className="space-y-5">
          <div className="rounded-xl overflow-hidden border border-slate-300 shadow-sm">
            <div className="bg-slate-700 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📊</span>
                <div>
                  <p className="font-bold text-white text-sm">{t("طبقة التقارير المرجعية — خارج سير العمل التشغيلي", "Reference Reports Layer — Outside Operational Workflow")}</p>
                  <p className="text-slate-300 text-xs mt-0.5">{t("هذه البيانات استُوردت من نظام ERP بعد معالجتها · المرحلة 6 من دورة الحياة", "This data was imported from ERP after processing · Stage 6 of lifecycle")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-slate-600 text-slate-200 border border-slate-500 text-xs">🔒 {t("قراءة فقط", "Read Only")}</Badge>
                <Badge className="bg-red-900/40 text-red-300 border border-red-700/50 text-xs">{t("لا تعديل · لا إجراء", "No edits · No actions")}</Badge>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-2.5 flex items-center gap-6 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> {t("هذه السجلات لا تمثل عمليات تشغيلية نشطة", "These records don't represent active operational transactions")}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> {t("ASAB يعمل كطبقة تشغيلية قبل ERP · وطبقة تقارير مرجعية بعده", "ASAB works as operational layer before ERP · and reference layer after")}</span>
            </div>
          </div>
          {postedOps.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-semibold text-gray-700">{t("لا توجد تقارير مستوردة بعد", "No imported reports yet")}</p>
              <p className="text-gray-400 text-sm mt-1">{t("بعد ترحيل العمليات لـ ERP ومعالجتها، تظهر التقارير هنا", "After posting operations to ERP and processing, reports appear here")}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-3xl font-extrabold font-mono text-slate-800">{postedOps.length}</p>
                  <p className="text-xs text-slate-500 mt-1">{t("عملية مُعالَجة في ERP", "Operations processed in ERP")}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-3xl font-extrabold font-mono text-indigo-700">{(postedOps.reduce((s, o) => s + (o.amount ?? 0), 0) / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-slate-500 mt-1">{t("ر.س إجمالي المُرحَّل", "SAR total posted")}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-3xl font-extrabold font-mono text-slate-800">{new Set(postedOps.map(o => o.erpBatchId)).size}</p>
                  <p className="text-xs text-slate-500 mt-1">{t("دفعة ترحيل", "Posting batches")}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">{t("التقرير المالي الموحد — مُستورد من ERP", "Consolidated Financial Report — Imported from ERP")}</h3>
                  <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-xs">🔒 {t("قراءة فقط", "Read Only")}</Badge>
                </div>
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-xs text-slate-500 font-semibold text-right">
                      <th className="px-5 py-3">{t("الموديول", "Module")}</th>
                      <th className="px-5 py-3 text-center">{t("المصدر الأصلي", "Origin")}</th>
                      <th className="px-5 py-3 text-center">{t("عدد العمليات", "Count")}</th>
                      <th className="px-5 py-3 text-center">{t("الإجمالي", "Total")}</th>
                      <th className="px-5 py-3 text-center">{t("دفعة ERP", "ERP Batch")}</th>
                      <th className="px-5 py-3 text-center">{t("الحالة", "Status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportRows.map((r, i) => {
                      const moduleOps = postedOps.filter(o => o.moduleLabel === r.label);
                      const originCounts = moduleOps.reduce<Record<string, number>>((a, o) => { a[o.origin] = (a[o.origin] || 0) + 1; return a; }, {});
                      const dominantOrigin = (Object.entries(originCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "mobile") as Op["origin"];
                      const originInfo = ORIGIN_CFG[dominantOrigin];
                      return (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3.5 font-semibold text-sm text-slate-800">{r.label}</td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge className={`${originInfo.cls} border text-[10px]`}>{originInfo.icon} {originInfo.label}</Badge>
                          </td>
                          <td className="px-5 py-3.5 text-center text-slate-600 font-mono font-bold">{r.count}</td>
                          <td className="px-5 py-3.5 text-center font-mono font-extrabold text-slate-800 tabular-nums">{r.total != null ? `${(r.total / 1000).toFixed(1)}K ${t("ر.س", "SAR")}` : "—"}</td>
                          <td className="px-5 py-3.5 text-center">
                            {r.batchIds.map(b => <span key={b} className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mr-1">{b}</span>)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge className="bg-slate-100 text-slate-600 border border-slate-300 text-xs">✓ {t("مرجعي", "Reference")}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td className="px-5 py-3 font-bold text-slate-700 text-sm">{t("الإجمالي الكلي", "Grand Total")}</td>
                      <td></td>
                      <td className="px-5 py-3 text-center font-bold text-slate-700 font-mono">{postedOps.length}</td>
                      <td className="px-5 py-3 text-center font-extrabold text-slate-900 font-mono tabular-nums">
                        {postedOps.some(o => o.amount == null) ? "—" : `${(postedOps.reduce((s, o) => s + (o.amount ?? 0), 0) / 1000).toFixed(1)}K ${t("ر.س", "SAR")}`}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="text-xs text-slate-400 text-center py-2">
                📱 {t("هذه البيانات رُفعت أصلاً من مديري الفروع عبر التطبيق · مرت بمراجعة المحاسبين والاعتماد النهائي · ومُرحَّلة الآن في ERP", "This data was originally uploaded by branch managers via app · went through accountant review and final approval · and is now posted in ERP")}
              </div>
            </>
          )}
        </div>
      )}
      {tab === "export" && (<>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-500" /> {t("قائمة التحقق قبل التصدير", "Pre-Export Validation Checklist")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {/* B-H4: checks from GET /head/erp/preflight */}
            {preflightChecks.length === 0
              ? <div className="col-span-2 text-xs text-gray-400 px-3 py-2">{t("لا توجد فحوصات متاحة", "No checks available")}</div>
              : preflightChecks.map((c, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${c.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {c.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  <span>{(lang === "ar" ? c.labelAr : c.labelEn) ?? c.labelAr ?? c.labelEn}</span>
                </div>
              ))}
          </div>
          {preflightWarnings > 0 && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <AlertTriangle size={11} /> {t(`يوجد ${preflightWarnings} بنود تحتاج مراجعة — يمكنك المتابعة أو تأجيل التصدير`, `${preflightWarnings} items need review — you can proceed or defer export`)}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><Clock size={15} className="text-purple-500" /> {t("سجل دفعات التصدير السابقة", "Previous Export Batches Log")}</h3>
          <div className="space-y-2">
            {/* B-H4: previous batches from GET /head/erp/batches (createdAt/completedAt). */}
            {erpBatchRows.length === 0
              ? <div className="text-xs text-gray-400 px-3 py-2">{t("لا توجد دفعات ترحيل سابقة", "No previous export batches")}</div>
              : erpBatchRows.map((h: any, i: number) => {
                const bid = h.batchId ?? h.id ?? "—";
                const bdate = h.createdAt ?? h.completedAt ?? "";
                const bcount = h.operationCount ?? h.operationsCount ?? h.count ?? (Array.isArray(h.operationIds) ? h.operationIds.length : 0);
                const bamtHalalas = typeof h.totalAmount === "number" ? h.totalAmount : (typeof h.totalHalalas === "number" ? h.totalHalalas : null);
                const bamt = bamtHalalas != null ? Math.round(bamtHalalas / 100).toLocaleString() : (h.total ?? h.amount ?? "—");
                // T10 §B status enum: ready/exported/failed (legacy success/completed → exported).
                const bstatus = h.status ?? "exported";
                const isExported = bstatus === "exported" || bstatus === "success" || bstatus === "completed";
                const isFailed = bstatus === "failed";
                const statusLabel = h.statusLabelAr ?? (isExported ? t("تم التصدير لـ ERP", "Exported") : isFailed ? t("فشل التصدير", "Failed") : t("جاهز للتصدير", "Ready"));
                const statusCls = isExported ? "bg-emerald-100 text-emerald-700" : isFailed ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
                const bby = h.createdByName ?? h.by ?? "";
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="font-mono text-xs text-purple-600 flex-1">{bid}</span>
                    <span className="text-[11px] text-gray-400">{bdate ? new Date(bdate).toLocaleDateString("ar-SA") : ""}</span>
                    <span className="text-xs font-mono font-bold text-gray-700">{bcount} {t("عملية", "ops")}</span>
                    <span className="text-xs font-mono font-bold text-gray-800">{bamt} {t("ر.س", "SAR")}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusCls}`}>{isExported ? "✓ " : isFailed ? "✕ " : "● "}{statusLabel}</span>
                    {bby && <span className="text-[11px] text-gray-500">{bby}</span>}
                    <div className="flex items-center gap-1">
                      {isExported && (
                        <>
                          <button onClick={() => downloadBatchMut.mutate({ batchId: bid, format: "xlsx" })} title={t("تنزيل Excel", "Download Excel")} className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><FileText size={12} /></button>
                          <button onClick={() => downloadBatchMut.mutate({ batchId: bid, format: "json" })} title={t("تنزيل JSON", "Download JSON")} className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"><Download size={12} /></button>
                        </>
                      )}
                      {isFailed && (
                        <button onClick={() => retryBatchMut.mutate(bid)} disabled={retryBatchMut.isPending} title={t("إعادة المحاولة", "Retry")} className="p-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100"><RefreshCw size={12} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-0 mb-6">
            {[{ n: 1, label: `1. ${t("اختيار الفترة", "Select Period")}`, icon: "📅" }, { n: 2, label: `2. ${t("معاينة البيانات", "Preview Data")}`, icon: "👁" }, { n: 3, label: `3. ${t("تأكيد الإرسال", "Confirm Send")}`, icon: "✅" }].map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <button
                  disabled={(s.n === 3 && !postedBatchId) || (s.n === 2 && (toPost.length === 0 || !canProceedPreflight(erpPreflight)) && !postedBatchId)}
                  onClick={() => {
                    if (s.n === 3 && !postedBatchId) return;
                    if (s.n === 2 && (toPost.length === 0 || !canProceedPreflight(erpPreflight)) && !postedBatchId) return;
                    setStep((s.n - 1) as 0 | 1 | 2);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${step === s.n - 1 ? "bg-purple-600 text-white" : step > s.n - 1 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"} ${((s.n === 3 && !postedBatchId) || (s.n === 2 && (toPost.length === 0 || !canProceedPreflight(erpPreflight)) && !postedBatchId)) ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <span>{step >= s.n ? "✓" : s.icon}</span>
                  <span className="text-xs font-semibold whitespace-nowrap">{s.label}</span>
                </button>
                {i < 2 && <div className={`flex-1 h-0.5 mx-1 ${step > i ? "bg-emerald-300" : "bg-gray-200"}`}></div>}
              </div>
            ))}
          </div>
          {step === 0 && (
            <div className="space-y-4">
              {/* ── Advanced export filters per document ── */}
              <div className="grid grid-cols-2 gap-4">

                {/* Module filter */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-600 mb-3">📦 {t("الموديول", "Module")}</p>
                  <div className="space-y-2">
                    {[{ k: "all", l: t("الكل", "All") }, { k: "sales", l: t("المبيعات", "Sales") }, { k: "expenses", l: t("المصروفات", "Expenses") }, { k: "purchases", l: t("المشتريات", "Purchases") }, { k: "inventory", l: t("المخزون", "Inventory") }].map(m => (
                      <label key={m.k} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="erp-module" checked={moduleFilter === m.k} onChange={() => setModuleFilter(m.k)} className="accent-purple-600" />
                        <span className="text-sm text-gray-700">{m.l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                    <p className="text-xs font-bold text-gray-600 mb-2">📅 {t("الفترة الزمنية", "Time Period")}</p>
                    <div className="space-y-1.5">
                      {[{ k: "day", l: t("يوم محدد", "Specific day") }, { k: "week", l: t("الأسبوع الحالي", "Current week") }, { k: "month", l: t("الشهر الحالي", "Current month") }].map((p) => (
                        <label key={p.k} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="erp-period" checked={periodFilter === p.k} onChange={() => setPeriodFilter(p.k)} className="accent-purple-600" />
                          <span className="text-xs text-gray-700">{p.l}</span>
                        </label>
                      ))}
                      <div className="w-full text-xs border border-gray-200 bg-gray-100/70 rounded-lg px-2.5 py-1.5 mt-1 text-gray-600 font-mono flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">{t("نطاق تاريخ العمليات (اليوم):", "Operations Date Scope (Today):")}</span>
                        <span className="font-semibold text-purple-700">{getLocalDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2">
                    <div>
                      <p className="text-xs font-bold text-gray-600 mb-1.5">🏢 {t("المطعم", "Restaurant")}</p>
                      <div className="flex gap-3 flex-wrap">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="erp-rest" checked={restaurantFilter === "all"} onChange={() => setRestaurantFilter("all")} className="accent-purple-600" />
                          <span className="text-xs text-gray-700">{t("الكل", "All")} ({availableRestaurants.length})</span>
                        </label>
                        {availableRestaurants.map(r => (
                          <label key={r} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="erp-rest" checked={restaurantFilter === r} onChange={() => setRestaurantFilter(r)} className="accent-purple-600" />
                            <span className="text-xs text-gray-700">{r}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-600 mb-1.5">🏪 {t("الفرع", "Branch")}</p>
                      <div className="flex gap-3 flex-wrap">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="erp-branch" checked={branchFilter === "all"} onChange={() => setBranchFilter("all")} className="accent-purple-600" />
                          <span className="text-xs text-gray-700">{t("الكل", "All")} ({availableBranches.length})</span>
                        </label>
                        {availableBranches.map(b => (
                          <label key={b} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="erp-branch" checked={branchFilter === b} onChange={() => setBranchFilter(b)} className="accent-purple-600" />
                            <span className="text-xs text-gray-700">{b}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-600 mb-1.5">🔄 {t("الحالة", "Status")}</p>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="erp-status" checked={statusFilter === "approved_only"} onChange={() => setStatusFilter("approved_only")} className="accent-purple-600" />
                          <span className="text-xs text-gray-700">{t("معتمدة فقط", "Approved only")}</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="erp-status" checked={statusFilter === "all"} onChange={() => setStatusFilter("all")} className="accent-purple-600" />
                          <span className="text-xs text-gray-700">{t("الكل", "All")}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center border border-blue-100">
                <div><p className="text-2xl font-bold text-blue-700 font-mono">{toPost.length}</p><p className="text-xs text-blue-600">{t("تنتظر الترحيل", "Awaiting posting")}</p></div>
                <div><p className="text-2xl font-bold text-blue-700 font-mono">{totalAmt != null ? (totalAmt / 1000).toFixed(1) + "K" : "—"}</p><p className="text-xs text-blue-600">{t("ر.س إجمالي", "SAR total")}</p></div>
                <div><p className="text-2xl font-bold text-blue-700 font-mono">{new Set(toPost.map(o => o.branch)).size}</p><p className="text-xs text-blue-600">{t("فرع مشارك", "branches")}</p></div>
              </div>
              {finalApproved.length !== toPost.length && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 text-xs text-indigo-700 font-medium">
                  ✓ {finalApproved.length - toPost.length} {t("عملية سبق ترحيلها في دفعات سابقة", "operations already posted in previous batches")}
                </div>
              )}
              <Btn
                variant="primary"
                disabled={toPost.length === 0 || !canProceedPreflight(erpPreflight)}
                onClick={() => setStep(1)}
                className="justify-center"
              >
                {t("معاينة البيانات", "Preview Data")} →
              </Btn>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <table className="w-full" dir={dir}>
                <thead className="bg-gray-50"><tr className="text-xs text-gray-500 font-semibold">
                  <th className="px-4 py-3 text-right">{t("رقم العملية", "Op ID")}</th><th className="px-4 py-3 text-right">{t("الموديول", "Module")}</th>
                  <th className="px-4 py-3 text-right">{t("الفرع", "Branch")}</th><th className="px-4 py-3 text-center">{t("المبلغ", "Amount")}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {toPost.length === 0
                    ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">{t("لا توجد عمليات معتمدة نهائياً تنتظر الترحيل", "No final-approved operations awaiting posting")}</td></tr>
                    : toPost.map(op => (
                      <tr key={op.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-purple-700 font-bold">{op.id}</td>
                        <td className="px-4 py-3 text-sm">{op.moduleLabel}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{op.branch}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold tabular-nums">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</td>
                        <td className="px-4 py-3 text-center"><Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs"><Lock size={9} /> {t("معتمد", "Approved")}</Badge></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
              <div className="flex gap-3">
                <Btn onClick={() => setStep(0)}>← {t("رجوع", "Back")}</Btn>
                <Btn variant="primary"
                  disabled={toPost.length === 0 || isPosting || !canProceedPreflight(erpPreflight)}
                  onClick={async () => {
                    if (toPost.length === 0 || isPosting || !canProceedPreflight(erpPreflight)) return;
                    setIsPosting(true);
                    try {
                      if (markErpPosted) {
                        const serverId = await markErpPosted(toPost.map(o => o.id));
                        if (typeof serverId === "string" && serverId.trim().length > 0) {
                          setPostedBatchId(serverId);
                          setStep(2);
                        } else {
                          toast.error(t("لم يتم استلام معرّف الدفعة من الخادم", "No batch ID received from server"));
                        }
                      }
                    } catch (err) {
                      const msg = (err as any)?.response?.data?.message || (err as any)?.message || t("فشل الترحيل إلى ERP", "ERP posting failed");
                      toast.error(msg);
                      // Posting failed — do NOT advance to step 2!
                    } finally {
                      setIsPosting(false);
                    }
                  }}
                  className="flex-1 justify-center">
                  {isPosting ? t("جارٍ الترحيل...", "Posting...") : `${t("تأكيد وإرسال للـ ERP", "Confirm & Send to ERP")} →`}
                </Btn>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto border-2 border-indigo-200">
                <ChevronsRight size={36} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{t("تم الترحيل بنجاح!", "Posted Successfully!")}</h3>
                <p className="text-gray-500 text-sm">{t("تم إرسال", "Sent")} {toPost.length} {t("عملية بإجمالي", "operations totaling")} {fmtAmt(totalAmt)} {t("ر.س إلى نظام ERP", "SAR to ERP")}</p>
                <p className="text-gray-400 text-xs mt-1 font-mono">{t("رقم دفعة الترحيل:", "Batch ID:")} {postedBatchId || "—"}</p>
                <div className="mt-3 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2">
                  <Lock size={13} className="text-indigo-600" />
                  <span className="text-sm text-indigo-700 font-semibold">{t("السجلات مُرحَّلة ومُغلقة نهائياً", "Records posted and permanently closed")}</span>
                </div>
              </div>
              <Btn onClick={() => setStep(0)} className="mx-auto">{t("ترحيل دفعة جديدة", "Post New Batch")}</Btn>
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}
