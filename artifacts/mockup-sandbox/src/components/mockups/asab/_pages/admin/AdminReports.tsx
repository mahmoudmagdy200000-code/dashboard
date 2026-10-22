import { useState } from "react";
import {
  useAdminReportsCatalog,
  useAdminBrands,
  useAdminReportPeriods,
  useUploadAdminReport,
  useSendAdminReport,
  useGenerateAdminReport,
  useAdminReportPreview,
  useAdminReportStatus,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { formatMonthLong } from "../../_shared/formatters";
import { EN_NAV_LABELS, EN_REPORT_SUBS } from "../../_shared/displayConfig";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import {
  ChevronUp, ChevronDown, Upload, XCircle, CheckCircle2,
  Bell, Eye, Download, FileText, X
} from "lucide-react";
import type { PageProps } from "../../_shared/types";

export function AdminReports({ }: PageProps) {
  const { data: apiReportsCatalog } = useAdminReportsCatalog();
  const { data: brandsApiForReports } = useAdminBrands();
  const { data: periodList = [] } = useAdminReportPeriods();
  const { t, lang, dir } = useLang(); const en = lang === "en";
  const rL = (r: { id: string; label: string }) => en ? (EN_NAV_LABELS[r.id] || r.label) : r.label;
  const rS = (r: { id: string; sub: string }) => en ? (EN_REPORT_SUBS[r.id] || r.sub) : r.sub;
  const [adminRepTab, setAdminRepTab] = useState<"reports" | "status">("reports");
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [sentReports, setSentReports] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("pl");
  const [addRestModal, setAddRestModal] = useState(false);
  // T15 — live hooks.
  const uploadMut = useUploadAdminReport();
  const sendMut = useSendAdminReport();
  const generateMut = useGenerateAdminReport(); // T15.6 — backend-computed report → binary
  const [uploadResult, setUploadResult] = useState<{ uploadId: string; status: "verified" | "failed"; rowCount: number; errors: string[] } | null>(null);
  const [coverMessage, setCoverMessage] = useState("");
  const [sendFormat, setSendFormat] = useState<"pdf" | "excel" | "both">("pdf");
  const [sendMethod, setSendMethod] = useState<"email" | "inApp" | "both">("both");

  // Reporting period: prefer the API's newest YYYY-MM; fall back to the CURRENT
  // month (real clock) — never a pinned demo month, since this feeds the queries.
  const periodParam = (periodList as string[])[0] ?? new Date().toISOString().slice(0, 7);
  const [py, pm] = periodParam.split("-").map(Number);
  const periodFrom = `${periodParam}-01`;
  const periodTo = py && pm ? `${periodParam}-${String(new Date(py, pm, 0).getDate()).padStart(2, "0")}` : `${periodParam}-28`;
  const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const PERIOD = py && pm ? `${AR_MONTHS[pm - 1]} ${py}` : formatMonthLong("ar");
  // T15 §6 — generic flattened preview of the uploaded file (label/value/type/header).
  // The structured P&L preview (T15.2) is deferred, so we render whatever cells the
  // dry-run exposes and fall back to the demo layout only when no upload exists.
  const { data: previewApi } = useAdminReportPreview(activeReport ?? "", uploadResult?.uploadId, periodParam);
  // T15.5 (read side) — real per-restaurant sent/viewed status for the filtered report.
  const { data: statusApi } = useAdminReportStatus(statusFilter, periodParam);

  const coreReports = [
    { id: "pl", label: "قائمة الأرباح والخسائر", sub: "تحليل مالي متعمق — 3 مستويات", icon: "📈", tc: "text-purple-700", bc: "bg-purple-50", brd: "border-purple-200" },
    { id: "sales-channel", label: "تحليل قنوات المبيعات", sub: "تحليل شامل للقنوات مع النسب", icon: "🛒", tc: "text-emerald-700", bc: "bg-emerald-50", brd: "border-emerald-200" },
    { id: "smart-compare", label: "المقارنات الذكية", sub: "مقارنات شهرية وبين الفروع", icon: "📊", tc: "text-blue-700", bc: "bg-blue-50", brd: "border-blue-200" },
  ];
  const specializedReports = [
    { id: "profit-cash", label: "مقاربة الأرباح مع النقدية", sub: "الفرق بين أموالك وأرباحك", icon: "💰", tc: "text-amber-700", bc: "bg-amber-50", brd: "border-amber-200" },
    { id: "breakeven", label: "تحليل نقطة التعادل", sub: "تحليل المخاطر والأمان المالي", icon: "⚖️", tc: "text-red-700", bc: "bg-red-50", brd: "border-red-200" },
    { id: "op-profit", label: "الربحية التشغيلية", sub: "مؤشرات الأداء ومقارنات القطاع", icon: "🏆", tc: "text-indigo-700", bc: "bg-indigo-50", brd: "border-indigo-200" },
    { id: "menu-eng", label: "هندسة القوائم", sub: "مؤشرات الأداء ومقارنات القطاع", icon: "🍽️", tc: "text-cyan-700", bc: "bg-cyan-50", brd: "border-cyan-200" },
  ];
  // Report catalog comes from GET /admin/reports/catalog (mapped to render shape).
  // The coreReports/specializedReports list is feature config (identical per tenant)
  // used only when the API catalog is empty — not tenant data.
  const apiCatalog = (Array.isArray(apiReportsCatalog) ? apiReportsCatalog : []).map((r: any) => ({
    id: r.key ?? r.id, label: r.label ?? "", sub: r.description ?? r.sub ?? "",
    icon: r.icon ?? "📄", tc: "text-purple-700", bc: "bg-purple-50", brd: "border-purple-200",
  }));
  const allReportsFallback = [...coreReports, ...specializedReports];
  const allReports = (apiCatalog.length > 0 ? apiCatalog as any : allReportsFallback) as typeof allReportsFallback;

  // Restaurants are flattened from GET /admin/brands. No static list.
  const RESTAURANTS = (Array.isArray(brandsApiForReports)
    ? (brandsApiForReports as any[]).flatMap((b: any) => (b.restaurants ?? []).map((r: any) => ({
      id: r.id, name: r.name, owner: b.ownerEmail ?? "", email: b.ownerEmail ?? "",
    })))
    : []) as Array<{ id: string; name: string; owner: string; email: string }>;


  // T15.3 — POST /admin/reports/{key}/send. Omitting restaurantIds → all active
  // restaurants (bulk «إرسال الكل»). Delivery goes to the brand owner.
  const sendReport = (repId: string) => {
    sendMut.mutate(
      { reportKey: repId, period: { from: periodFrom, to: periodTo }, method: sendMethod, format: sendFormat, coverMessage: coverMessage || undefined },
      { onSuccess: () => { setSentReports(p => { const s = new Set(p); s.add(repId); return s; }); setStep(3); } },
    );
  };

  const previewRows: Record<string, { label: string; value: string; type: string; header?: boolean }[]> = {
    "pl": [{ label: "إجمالي الإيرادات", value: "842,500", type: "income", header: true }, { label: "   مبيعات المطعم", value: "820,000", type: "income" }, { label: "   إيرادات أخرى", value: "22,500", type: "income" }, { label: "إجمالي المصروفات", value: "(612,000)", type: "expense", header: true }, { label: "   تكلفة المواد", value: "(320,000)", type: "expense" }, { label: "   رواتب", value: "(180,000)", type: "expense" }, { label: "صافي الربح", value: "230,500", type: "profit", header: true }, { label: "هامش الربح", value: "27.4%", type: "profit", header: true }],
    "sales-channel": [{ label: "تطبيق المطعم", value: "42%", type: "income", header: false }, { label: "طلبات أجرجر", value: "28%", type: "income", header: false }, { label: "هنقرستيشن", value: "18%", type: "income", header: false }, { label: "كاونتر مباشر", value: "12%", type: "income", header: false }, { label: "الإجمالي", value: "842,500 ر.س", type: "profit", header: true }, { label: "أعلى قناة ربحية", value: "تطبيق المطعم", type: "profit", header: false }],
    "smart-compare": [{ label: "مبيعات أكتوبر", value: "842,500", type: "income", header: false }, { label: "مبيعات سبتمبر", value: "791,000", type: "income", header: false }, { label: "التغيير", value: "+6.5% ↑", type: "profit", header: false }, { label: "مصروفات أكتوبر", value: "612,000", type: "expense", header: false }, { label: "مصروفات سبتمبر", value: "589,000", type: "expense", header: false }, { label: "صافي التحسن", value: "+14.1% ↑", type: "profit", header: true }],
    "profit-cash": [{ label: "صافي الربح المحاسبي", value: "230,500", type: "profit", header: true }, { label: "التدفق النقدي الفعلي", value: "185,000", type: "income", header: true }, { label: "الفارق", value: "45,500", type: "expense", header: false }, { label: "المخزون غير المحقق", value: "32,000", type: "expense", header: false }, { label: "الذمم المدينة", value: "13,500", type: "expense", header: false }],
    "breakeven": [{ label: "إيرادات التعادل", value: "580,000", type: "income", header: true }, { label: "المصروفات الثابتة", value: "245,000", type: "expense", header: false }, { label: "هامش المساهمة", value: "42.3%", type: "profit", header: false }, { label: "هامش الأمان", value: "31.1%", type: "profit", header: true }, { label: "أيام التعادل الشهري", value: "17 يوم", type: "income", header: false }],
    "op-profit": [{ label: "ربحية فرع العليا", value: "18.2%", type: "profit", header: false }, { label: "ربحية فرع الحمراء", value: "21.5%", type: "profit", header: false }, { label: "ربحية فرع مكة", value: "14.8%", type: "income", header: false }, { label: "متوسط القطاع", value: "16%", type: "income", header: true }, { label: "أعلى من المتوسط", value: "فرعان", type: "profit", header: false }],
    "menu-eng": [{ label: "البنود النجمية ⭐", value: "12 صنف", type: "profit", header: false }, { label: "بنود البقرة النقدية 🐄", value: "8 أصناف", type: "income", header: false }, { label: "بنود الاستفهام ❓", value: "5 أصناف", type: "expense", header: false }, { label: "بنود الكلب 🐕", value: "3 أصناف", type: "expense", header: false }, { label: "هامش الربح العلوي", value: "الجمبري المشوي", type: "profit", header: true }],
  };

  const selectedReport = allReports.find(r => r.id === activeReport);

  // ── 4-step flow for active report ──
  if (activeReport && selectedReport) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button onClick={() => { setActiveReport(null); setStep(0); setUploaded(false); }} className="text-purple-600 hover:underline text-sm flex items-center gap-1"><ChevronUp size={13} className="rotate-90" /> {t("مدير التقارير", "Reports Manager")}</button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm font-semibold">{rL(selectedReport)}</span>
          <Badge className={`${selectedReport.bc} ${selectedReport.tc} border ${selectedReport.brd} mr-auto`}>{t("شهري", "Monthly")} · {PERIOD}</Badge>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">{selectedReport.icon}</span>
            <div><p className="font-bold text-gray-800">{rL(selectedReport)}</p><p className="text-xs text-gray-400">{rS(selectedReport)}</p></div>
          </div>
          <div className="flex items-center gap-0 mb-6">
            {[{ n: 1, label: t("تصدير من ERP", "ERP Export"), icon: "🔗" }, { n: 2, label: t("رفع Excel", "Upload Excel"), icon: "📊" }, { n: 3, label: t("مراجعة", "Review"), icon: "👁" }, { n: 4, label: t("إرسال لكل المطاعم", "Send to All"), icon: "📤" }].map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <button onClick={() => setStep(s.n - 1)} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all ${step === s.n - 1 ? "bg-purple-600 text-white" : step > s.n - 1 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                  <span className="text-xs">{step >= s.n ? "✓" : s.icon}</span><span className="text-xs font-semibold whitespace-nowrap">{s.label}</span>
                </button>
                {i < 3 && <div className={`flex-1 h-0.5 mx-1 ${step > i ? "bg-emerald-300" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>

          {step === 0 && <div className="text-center py-6 space-y-4">
            <div className="text-5xl">{selectedReport.icon}</div>
            <h3 className="font-bold text-gray-800">{t("تصدير", "Export")} {rL(selectedReport)} {t("من ERP", "from ERP")}</h3>
            <div className="bg-blue-50 rounded-xl p-4 text-right max-w-sm mx-auto">
              <p className="font-semibold text-blue-800 text-sm mb-2">{t("الخطوات:", "Steps:")}</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-blue-700">
                <li>{t("افتح نظام ERP → التقارير", "Open ERP → Reports")}</li>
                <li>{t("اختر", "Select")} {rL(selectedReport)}</li>
                <li>{t("الفترة:", "Period:")} {PERIOD}</li>
                <li>{t("اضغط تصدير Excel", "Click Export Excel")}</li>
              </ol>
            </div>
            <Btn variant="primary" onClick={() => setStep(1)} className="mx-auto">{t("انتقل لرفع الملف →", "Go to Upload →")}</Btn>
          </div>}

          {step === 1 && <div className="space-y-4">
            {!uploaded
              ? <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/20 transition-all">
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={uploadMut.isPending}
                  onChange={(e) => { const f = e.target.files?.[0]; if (!f || !activeReport) return; uploadMut.mutate({ reportKey: activeReport, file: f }, { onSuccess: (d: any) => { setUploadResult(d); setUploaded(true); } }); }} />
                <div className="text-5xl mb-3">📊</div>
                <p className="font-semibold text-gray-700 mb-1">{uploadMut.isPending ? t("جارٍ التحقق من الملف…", "Verifying file…") : t("اسحب وأفلت ملف Excel هنا", "Drag & drop Excel file here")}</p>
                <p className="text-xs text-gray-400 mb-4">xlsx, xls, csv · {PERIOD}</p>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold"><Upload size={14} /> {t("اختيار الملف", "Choose File")}</span>
              </label>
              : <div className="space-y-3">
                {/* T15.1 — parse dry-run: verified → allow preview; failed → block + show errors. */}
                {uploadResult?.status === "failed" ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-3"><XCircle size={18} className="text-red-600 flex-shrink-0" /><p className="font-semibold text-sm text-red-800">{t("فشل التحقق من الملف", "File verification failed")}</p><button onClick={() => { setUploaded(false); setUploadResult(null); }} className="mr-auto text-red-400 hover:text-red-600"><X size={14} /></button></div>
                    {(uploadResult.errors ?? []).map((er, ei) => <p key={ei} className="text-xs text-red-600 pr-7">• {er}</p>)}
                    <p className="text-[11px] text-red-500 pr-7">{t("صحّح الملف وأعد الرفع للمتابعة.", "Fix the file and re-upload to continue.")}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                    <div><p className="font-semibold text-sm text-emerald-800">{t("تم التحقق", "Verified")} ✓</p><p className="text-xs text-emerald-600">{uploadResult?.rowCount != null ? `${uploadResult.rowCount} ${t("صف", "rows")}` : rL(selectedReport)}</p></div>
                    <button onClick={() => { setUploaded(false); setUploadResult(null); }} className="mr-auto text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
                  </div>
                )}
                <Btn variant="primary" onClick={() => setStep(2)} disabled={uploadResult?.status === "failed"} className="w-full justify-center">{t("معاينة التقرير →", "Preview Report →")}</Btn>
              </div>}
          </div>}

          {step === 2 && <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{t("معاينة:", "Preview:")} {rL(selectedReport)} — {PERIOD}</h3>
              <Badge className="bg-blue-50 text-blue-700">{t("للعرض فقط", "View Only")}</Badge>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-purple-700 text-white px-5 py-3 text-center">
                <p className="font-bold">{selectedReport.icon} {rL(selectedReport)} — {PERIOD}</p>
                <p className="text-purple-200 text-xs mt-0.5">{t("جميع المطاعم المشتركة", "All subscribed restaurants")} · {RESTAURANTS.length} {t("مطاعم", "restaurants")}</p>
              </div>
              <table className="w-full" dir="rtl"><tbody className="divide-y divide-gray-200">
                {(((previewApi?.rows && previewApi.rows.length > 0) ? previewApi.rows : (previewRows[activeReport] || previewRows["pl"])) as any[]).map((row, i) => (
                  <tr key={i} className={row.header ? "bg-gray-100" : "bg-white"}>
                    <td className={`px-5 py-2.5 text-sm ${row.header ? "font-bold text-gray-800" : "text-gray-600"}`}>{row.label}</td>
                    <td className={`px-5 py-2.5 text-left font-mono text-sm ${row.type === "profit" ? "text-emerald-700 font-bold" : row.type === "expense" ? "text-red-600" : "text-gray-800"}`} dir="ltr">{row.value}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
            <div className="flex gap-3"><Btn onClick={() => setStep(1)}>{t("← رجوع", "← Back")}</Btn><Btn variant="primary" onClick={() => setStep(3 - 1 + 1)} className="flex-1 justify-center">{t("متابعة للإرسال →", "Continue to Send →")}</Btn></div>
          </div>}

          {step === 3 && !sentReports.has(activeReport) && <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{t("إرسال لجميع المطاعم المشتركة", "Send to All Subscribed Restaurants")}</h3>
              <Badge className="bg-emerald-50 text-emerald-700">{RESTAURANTS.length} {t("مطاعم", "restaurants")}</Badge>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-amber-700 text-sm">
              <Bell size={14} className="flex-shrink-0" />
              {t("سيُرسَل تقرير", "Report")} <strong>{rL(selectedReport)} — {PERIOD}</strong> {t("لمالك كل علامة (بريد + إشعار داخل التطبيق حسب اختيارك).", "will be sent to each brand owner (email + in-app per your choice).")}
            </div>
            {/* T15.3 — delivery method, attachment format, and optional cover message. */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("طريقة الإرسال", "Delivery Method")}</label>
                <select value={sendMethod} onChange={e => setSendMethod(e.target.value as any)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white">
                  <option value="both">{t("بريد + إشعار", "Email + In-app")}</option><option value="email">{t("بريد فقط", "Email only")}</option><option value="inApp">{t("إشعار فقط", "In-app only")}</option>
                </select>
              </div>
              <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("صيغة المرفق", "Attachment Format")}</label>
                <select value={sendFormat} onChange={e => setSendFormat(e.target.value as any)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white">
                  <option value="pdf">PDF</option><option value="excel">Excel</option><option value="both">{t("كلاهما", "Both")}</option>
                </select>
              </div>
            </div>
            <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("رسالة الغلاف (اختياري)", "Cover message (optional)")}</label>
              <textarea value={coverMessage} maxLength={2000} onChange={e => setCoverMessage(e.target.value)} placeholder={t("تفضلوا التقرير الشهري…", "Please find the monthly report…")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300 h-20 resize-none" />
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {RESTAURANTS.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  <div className="flex-1"><p className="text-sm font-medium text-gray-700">{r.name}</p><p className="text-xs text-gray-400">{r.owner} · {r.email}</p></div>
                  <span className="text-xs text-gray-400">{t("مالك العلامة", "Brand owner")}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Btn onClick={() => setStep(2)}>{t("← رجوع", "← Back")}</Btn>
              <button onClick={() => sendReport(activeReport)} disabled={sendMut.isPending} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 disabled:opacity-60 flex items-center justify-center gap-2">
                <Upload size={15} /> {sendMut.isPending ? t("جارٍ الإرسال…", "Sending…") : t("إرسال التقرير لكل المطاعم", "Send Report to All Restaurants")}
              </button>
            </div>
          </div>}

          {(step === 3 && sentReports.has(activeReport)) && <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto border-2 border-emerald-200">
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">{t("تم الإرسال بنجاح!", "Sent Successfully!")}</h3>
            <p className="text-gray-500 text-sm">{t("تم إرسال", "Sent")} <strong>{rL(selectedReport)} — {PERIOD}</strong> {t("لـ", "to")} {RESTAURANTS.length} {t("مطاعم", "restaurants")}</p>
            <div className="flex gap-3 justify-center">
              <Btn onClick={() => { setActiveReport(null); setAdminRepTab("status"); setStatusFilter(activeReport!); setStep(0); setUploaded(false); }}>
                <Eye size={13} /> {t("عرض حالة التقارير", "View Report Status")}
              </Btn>
              <Btn variant="primary" onClick={() => { setActiveReport(null); setStep(0); setUploaded(false); }}>
                {t("العودة للتقارير", "Back to Reports")}
              </Btn>
            </div>
          </div>}
        </div>
      </div>
    );
  }

  // ── Main reports manager grid ──
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("مدير التقارير", "Reports Manager")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("تقارير شهرية — ترسَل لكل المطاعم المشتركة", "Monthly reports — sent to all subscribed restaurants")}</p></div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-50 text-purple-700 border border-purple-200">📅 {PERIOD}</Badge>
          <Badge className="bg-gray-50 text-gray-600">{RESTAURANTS.length} {t("مطاعم مشتركة", "subscribed restaurants")}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {([{ id: "reports" as const, label: `📋 ${t("التقارير", "Reports")}` }, { id: "status" as const, label: `📊 ${t("حالة التقارير", "Report Status")}` }]).map(tb => (
          <button key={tb.id} onClick={() => setAdminRepTab(tb.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${adminRepTab === tb.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{tb.label}</button>
        ))}
      </div>

      {/* ── REPORTS TAB ── */}
      {adminRepTab === "reports" && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-gray-800">{allReports.length}</p><p className="text-[11px] text-gray-400">{t("إجمالي التقارير", "Total Reports")}</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-emerald-700">{sentReports.size}</p><p className="text-[11px] text-gray-400">{t("تم الإرسال", "Sent")}</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-amber-600">{allReports.length - sentReports.size}</p><p className="text-[11px] text-gray-400">{t("لم تُرسَل بعد", "Not Sent Yet")}</p></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"><p className="text-2xl font-extrabold font-mono text-blue-700">{RESTAURANTS.length}</p><p className="text-[11px] text-gray-400">{t("مطعم مشترك", "Subscribed Restaurants")}</p></div>
          </div>

          {/* Core Reports */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-gray-800 text-sm">{t("التقارير الأساسية", "Core Reports")}</h3>
              <Badge className="bg-gray-100 text-gray-500">{coreReports.length}</Badge>
            </div>
            <div className="space-y-2">
              {coreReports.map(rep => {
                const isSent = sentReports.has(rep.id);
                return (
                  <div key={rep.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 hover:shadow transition-shadow cursor-pointer ${isSent ? "border-emerald-100" : "border-gray-100"}`}
                    onClick={() => { setActiveReport(rep.id); setStep(0); setUploaded(false); setUploadResult(null); }}>
                    <div className={`w-11 h-11 rounded-xl ${rep.bc} border ${rep.brd} flex items-center justify-center text-xl flex-shrink-0`}>{rep.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${rep.tc}`}>{rL(rep)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{rS(rep)}</p>
                    </div>
                    {/* T15.6 — generate a backend-computed report as a binary (no wizard). */}
                    <button onClick={(e) => { e.stopPropagation(); generateMut.mutate({ reportKey: rep.id, period: { from: periodFrom, to: periodTo }, format: "pdf" }); }} disabled={generateMut.isPending} title="PDF" className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 flex-shrink-0"><Download size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); generateMut.mutate({ reportKey: rep.id, period: { from: periodFrom, to: periodTo }, format: "xlsx" }); }} disabled={generateMut.isPending} title="Excel" className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 flex-shrink-0"><FileText size={13} /></button>
                    {isSent
                      ? <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">✓ {t("مُرسَل", "Sent")}</Badge>
                      : <Badge className="bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">⏳ {t("لم يُرسَل", "Not Sent")}</Badge>
                    }
                    <ChevronDown size={14} className="text-gray-400 rotate-[-90deg] flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specialized Reports */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-gray-800 text-sm">{t("التقارير المتخصصة", "Specialized Reports")}</h3>
              <Badge className="bg-gray-100 text-gray-500">{specializedReports.length}</Badge>
            </div>
            <div className="space-y-2">
              {specializedReports.map(rep => {
                const isSent = sentReports.has(rep.id);
                return (
                  <div key={rep.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 hover:shadow transition-shadow cursor-pointer ${isSent ? "border-emerald-100" : "border-gray-100"}`}
                    onClick={() => { setActiveReport(rep.id); setStep(0); setUploaded(false); setUploadResult(null); }}>
                    <div className={`w-11 h-11 rounded-xl ${rep.bc} border ${rep.brd} flex items-center justify-center text-xl flex-shrink-0`}>{rep.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${rep.tc}`}>{rL(rep)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{rS(rep)}</p>
                    </div>
                    {/* T15.6 — generate a backend-computed report as a binary (no wizard). */}
                    <button onClick={(e) => { e.stopPropagation(); generateMut.mutate({ reportKey: rep.id, period: { from: periodFrom, to: periodTo }, format: "pdf" }); }} disabled={generateMut.isPending} title="PDF" className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 flex-shrink-0"><Download size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); generateMut.mutate({ reportKey: rep.id, period: { from: periodFrom, to: periodTo }, format: "xlsx" }); }} disabled={generateMut.isPending} title="Excel" className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 flex-shrink-0"><FileText size={13} /></button>
                    {isSent
                      ? <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">✓ {t("مُرسَل", "Sent")}</Badge>
                      : <Badge className="bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">⏳ {t("لم يُرسَل", "Not Sent")}</Badge>
                    }
                    <ChevronDown size={14} className="text-gray-400 rotate-[-90deg] flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS TAB ── */}
      {adminRepTab === "status" && (
        <div className="space-y-4">
          {/* Report filter */}
          <div className="flex flex-wrap gap-2">
            {allReports.map(r => (
              <button key={r.id} onClick={() => setStatusFilter(r.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === r.id ? `${r.bc} ${r.tc} ${r.brd}` : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                <span>{r.icon}</span> {rL(r)}
              </button>
            ))}
          </div>

          {/* Status summary cards */}
          {(() => {
            const statusRows = (statusApi?.rows ?? []) as any[];
            const sent = statusApi?.summary?.sent ?? statusRows.filter(r => r.sent).length;
            const notSent = statusApi?.summary?.notSent ?? Math.max(0, RESTAURANTS.length - sent);
            const viewed = statusApi?.summary?.viewed ?? statusRows.filter(r => r.viewed).length;
            const notView = statusApi?.summary?.notViewed ?? Math.max(0, sent - viewed);
            const selRep = allReports.find(r => r.id === statusFilter)!;
            return (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold font-mono text-emerald-700">{sent}</p><p className="text-xs text-emerald-600">✅ {t("أُرسل التقرير", "Report Sent")}</p></div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold font-mono text-red-700">{notSent}</p><p className="text-xs text-red-600">❌ {t("لم يُرسَل بعد", "Not Sent Yet")}</p></div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold font-mono text-blue-700">{viewed}</p><p className="text-xs text-blue-600">👁 {t("اطّلع صاحب المطعم", "Owner Viewed")}</p></div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold font-mono text-amber-700">{notView}</p><p className="text-xs text-amber-600">⏳ {t("لم يطّلع بعد", "Not Viewed Yet")}</p></div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <span>{selRep?.icon}</span>
                    <p className="font-bold text-sm text-gray-700">{selRep ? rL(selRep) : ""} — {PERIOD}</p>
                    <Badge className={`mr-auto ${sentReports.has(statusFilter) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{sentReports.has(statusFilter) ? t("مُرسَل", "Sent") : t("لم يُرسَل بعد", "Not Sent Yet")}</Badge>
                  </div>
                  <table className="w-full" dir="rtl">
                    <thead className="bg-gray-50/50">
                      <tr className="text-xs text-gray-500 font-semibold">
                        <th className="px-4 py-3 text-right">{t("المطعم", "Restaurant")}</th>
                        <th className="px-4 py-3 text-right">{t("صاحب المطعم", "Owner")}</th>
                        <th className="px-4 py-3 text-center">{t("أُرسل؟", "Sent?")}</th>
                        <th className="px-4 py-3 text-center">{t("تاريخ الإرسال", "Sent Date")}</th>
                        <th className="px-4 py-3 text-center">{t("اطّلع؟", "Viewed?")}</th>
                        <th className="px-4 py-3 text-center">{t("تاريخ الاطلاع", "Viewed Date")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {statusRows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">{t("لم يُرسَل هذا التقرير بعد", "This report has not been sent yet")}</td></tr>}
                      {statusRows.map((st: any) => (
                        <tr key={st.restaurantId} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-semibold text-sm text-gray-800">{st.restaurantName}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{st.owner}</td>
                          <td className="px-4 py-3 text-center">
                            {st.sent
                              ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs"><CheckCircle2 size={13} /> {t("نعم", "Yes")}</span>
                              : <span className="inline-flex items-center gap-1 text-red-500 text-xs"><X size={13} /> {t("لا", "No")}</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500">{st.sentDate ? String(st.sentDate).slice(0, 10) : "—"}</td>
                          <td className="px-4 py-3 text-center">
                            {st.viewed
                              ? <span className="inline-flex items-center gap-1 text-blue-700 font-semibold text-xs"><Eye size={13} /> {t("نعم", "Yes")}</span>
                              : st.sent
                                ? <span className="text-amber-600 text-xs font-medium">⏳ {t("لم يطّلع", "Not Viewed")}</span>
                                : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500">{st.viewedDate ? String(st.viewedDate).slice(0, 10) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}

          {!sentReports.has(statusFilter) && (
            <button onClick={() => { setAdminRepTab("reports"); setActiveReport(statusFilter); setStep(0); setUploaded(false); }}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 font-semibold text-sm hover:bg-purple-50 flex items-center justify-center gap-2">
              <Upload size={14} /> {t("إرسال هذا التقرير الآن", "Send This Report Now")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
