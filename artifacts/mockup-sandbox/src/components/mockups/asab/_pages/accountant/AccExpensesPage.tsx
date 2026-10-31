import { useState, useContext, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Download,
  Edit3,
  X,
  FileText,
  RotateCcw,
  Lock,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Filter,
  Search,
  Check,
  CheckSquare,
  Wallet,
  Layers,
  GitMerge,
  Clock,
  Building2,
  ArrowRightToLine,
} from "lucide-react";
import {
  useAccountantOperationsPlatform,
  useExpensesKpis,
  useExportOperations,
  useVerifyExpenseInvoice,
  useUnverifyExpenseInvoice,
  useOperation,
  useOperationAttachments,
  useLookup,
} from "../../../../../api/queries";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { KpiCard } from "../../components/KpiCard";
import { EmptyState } from "../../components/EmptyState";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt, isImageFile, resolveAssetUrl, opDetailPage } from "../../_shared/formatters";
import {
  STATUS_CFG,
  EN_STATUS_CFG,
  MATCH_CFG,
  EN_MATCH_CFG,
  ORIGIN_CFG,
  EN_ORIGIN,
} from "../../_shared/displayConfig";
import { applyFilters, BRANCHES, brandOptionsFromOps } from "../../_shared/filterOps";
import {
  AssetDraftContext,
  type AssetCatType,
  type AssetDraft,
} from "../../_shared/assetDraft";
import type { PageProps, Op, Filters, PageId, OpStatus } from "../../_shared/types";

// CONVERT TO ASSET MODAL
// ─────────────────────────────────────────────
// Branch list for selectors comes from the platform API; empty until the backend returns it.
const ALL_BRANCHES_FULL: string[] = [];
const ASSET_CATS: AssetCatType[] = ["معدات", "تقنية", "أثاث", "مركبات", "أخرى"];
const USEFUL_LIFE_OPTS = [
  { label: "24 شهر (سنتان)", val: 24 }, { label: "36 شهر (3 سنوات)", val: 36 },
  { label: "48 شهر (4 سنوات)", val: 48 }, { label: "60 شهر (5 سنوات)", val: 60 },
  { label: "72 شهر (6 سنوات)", val: 72 }, { label: "84 شهر (7 سنوات)", val: 84 },
  { label: "96 شهر (8 سنوات)", val: 96 }, { label: "120 شهر (10 سنوات)", val: 120 },
];

function ConvertToAssetModal({
  expenseOpId, invoiceIndex, invNum, vendor, desc, amount, branch, date,
  onClose, onSuccess,
}: {
  expenseOpId: string; invoiceIndex?: number; invNum: string; vendor: string; desc: string;
  amount: number; branch: string; date: string;
  onClose: () => void; onSuccess: (draftId: string) => void;
}) {
  const { t, lang, dir } = useLang();
  const en = lang === "en";
  const { addDraft } = useContext(AssetDraftContext);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [assetName, setAssetName] = useState(vendor || desc);
  const [cat, setCat] = useState<AssetCatType>("معدات");
  const [usefulLife, setUsefulLife] = useState(60);
  const [custodian, setCustodian] = useState(t("مدير الفرع", "Branch Manager"));
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [targetBranches, setTargetBranches] = useState<string[]>([branch]);
  const [confirmed, setConfirmed] = useState(false);

  const toggleBranch = (b: string) => setTargetBranches(p => p.includes(b) ? p.filter(x => x !== b) : [...p, b]);
  const canProceed = assetName.trim().length > 0 && targetBranches.length > 0 && custodian.trim().length > 0;

  const handleConfirm = () => {
    const draftId = `DRAFT-${invNum}-${Date.now()}`;
    addDraft({
      draftId, expenseOpId, invoiceIndex: invoiceIndex ?? 0, invNum, vendor, desc,
      amount, expenseBranch: branch, expenseDate: date,
      assetName: assetName.trim(), cat, usefulLife,
      targetBranches, custodian, qty, notes,
      convertedAt: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      status: "draft",
    });
    setConfirmed(true);
    setStep(3);
    setTimeout(() => { onSuccess(draftId); }, 1500);
  };

  const CAT_ICONS: Record<AssetCatType, string> = { معدات: "🔧", تقنية: "💻", أثاث: "🪑", مركبات: "🚗", أخرى: "📦" };
  const CAT_LABELS: Record<AssetCatType, string> = {
    معدات: t("معدات", "Equipment"),
    تقنية: t("تقنية", "Technology"),
    أثاث: t("أثاث", "Furniture"),
    مركبات: t("مركبات", "Vehicles"),
    أخرى: t("أخرى", "Other"),
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} dir={dir}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-l from-purple-700 to-indigo-700 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <GitMerge size={16} /> {t("تحويل مصروف إلى أصل ثابت", "Convert Expense to Fixed Asset")}
            </h3>
            <p className="text-purple-200 text-xs mt-0.5">{t("الفاتورة", "Invoice")} {invNum} · {vendor}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {([1, 2, 3] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${step >= s ? "bg-white text-purple-700 border-white" : "bg-transparent text-purple-300 border-purple-400"}`}>{s}</div>
                  {i < 2 && <div className={`w-5 h-0.5 ${step > s ? "bg-white" : "bg-purple-400/50"}`} />}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="text-purple-200 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        {/* Step labels */}
        <div className="flex border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
          {[
            { n: 1, l: t("بيانات الأصل", "Asset Details") },
            { n: 2, l: t("الفروع والعهدة", "Branches & Custody") },
            { n: 3, l: t("تم الإنشاء", "Created") },
          ].map(s => (
            <div key={s.n} className={`flex-1 py-2.5 text-center text-xs font-semibold transition-colors ${step === s.n ? "text-purple-700 border-b-2 border-purple-600" : "text-gray-400"}`}>{s.l}</div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: Asset Details ── */}
          {step === 1 && (
            <div className="p-6 space-y-5">
              {/* Expense source chip */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0"><Wallet size={16} className="text-amber-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-800">{t("مصدر المصروف", "Expense Source")}</p>
                  <p className="text-xs text-amber-700 mt-0.5 truncate">{invNum} · {vendor} · <span className="font-mono font-bold">{fmtAmt(amount)} {t("ر.س", "SAR")}</span> · {branch}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-amber-600">{t("يُحول المبلغ تلقائياً", "Amount auto-transferred")}</p>
                  <p className="text-xs font-bold text-amber-800 font-mono">{fmtAmt(amount)} {t("ر.س", "SAR")}</p>
                </div>
              </div>

              {/* Asset name */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">{t("اسم الأصل", "Asset Name")} <span className="text-red-500">*</span></label>
                <input value={assetName} onChange={e => setAssetName(e.target.value)}
                  placeholder={t("مثال: ثلاجة صناعية سامسونج — فرع الرياض", "e.g. Samsung Commercial Refrigerator — Riyadh Branch")}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-400 outline-none" />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">{t("فئة الأصل", "Asset Category")} <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-5 gap-2">
                  {ASSET_CATS.map(c => (
                    <button key={c} onClick={() => setCat(c)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-semibold ${cat === c ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:border-purple-200"}`}>
                      <span className="text-xl">{CAT_ICONS[c]}</span>{CAT_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Useful life */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">{t("العمر الإنتاجي", "Useful Life")}</label>
                <select value={usefulLife} onChange={e => setUsefulLife(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-400 outline-none">
                  {USEFUL_LIFE_OPTS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
              </div>

              {/* Qty */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">{t("الكمية (عدد الوحدات)", "Quantity (units)")}</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-bold">−</button>
                  <span className="w-14 text-center font-bold text-lg text-gray-800">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-bold">+</button>
                  <span className="text-xs text-gray-500 mr-2">{t("وحدة — سعر الوحدة:", "unit — unit price:")} <span className="font-mono font-bold">{fmtAmt(Math.round(amount / qty))} {t("ر.س", "SAR")}</span></span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">{t("ملاحظات إضافية", "Additional Notes")}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder={t("أي ملاحظات على الأصل (اختياري)...", "Any notes about the asset (optional)...")}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-400 outline-none resize-none" />
              </div>
            </div>
          )}

          {/* ── STEP 2: Branches & Custodian ── */}
          {step === 2 && (
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  {t("الفروع المستفيدة", "Beneficiary Branches")} <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal mr-2">— {t("يمكن اختيار فرع واحد أو أكثر", "select one or more branches")}</span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {ALL_BRANCHES_FULL.map(b => (
                    <button key={b} onClick={() => toggleBranch(b)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-xs text-right ${targetBranches.includes(b) ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:border-purple-200"}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${targetBranches.includes(b) ? "bg-purple-500 border-purple-500" : "border-gray-300"}`}>
                        {targetBranches.includes(b) && <Check size={10} className="text-white" />}
                      </div>
                      <span className="font-semibold truncate">{b}</span>
                    </button>
                  ))}
                </div>
                {targetBranches.length > 0 && (
                  <p className="text-[11px] text-purple-600 mt-2 font-semibold">
                    ✓ {targetBranches.length} {t("فرع محدد · سيُضاف", "selected branches · will add")} {qty * targetBranches.length} {t("أصل إجمالاً", "assets total")}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">{t("المسؤول عن العهدة", "Custody Responsible")} <span className="text-red-500">*</span></label>
                <input value={custodian} onChange={e => setCustodian(e.target.value)}
                  placeholder={t("اسم المسؤول عن الأصل (مدير الفرع، مشرف الشفت...)", "Name of asset custodian (branch manager, shift supervisor...)")}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-400 outline-none" />
              </div>

              {/* Summary card */}
              {canProceed && (
                <div className="bg-gradient-to-l from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-purple-800 flex items-center gap-1.5"><Layers size={12} /> {t("ملخص ما سيُضاف في موديول الأصول الثابتة", "Summary of what will be added in the Fixed Assets module")}</p>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
                    <div><span className="text-gray-500">{t("الأصل:", "Asset:")}</span> <span className="font-semibold text-gray-800">{assetName}</span></div>
                    <div><span className="text-gray-500">{t("الفئة:", "Category:")}</span> <span className="font-semibold text-gray-800">{CAT_ICONS[cat]} {CAT_LABELS[cat]}</span></div>
                    <div><span className="text-gray-500">{t("الكمية:", "Qty:")}</span> <span className="font-semibold text-gray-800">{qty} {t("وحدة ×", "unit ×")} {targetBranches.length} {t("فرع", "branch")}</span></div>
                    <div><span className="text-gray-500">{t("العمر الإنتاجي:", "Useful Life:")}</span> <span className="font-semibold text-gray-800">{usefulLife} {t("شهر", "months")}</span></div>
                    <div><span className="text-gray-500">{t("القيمة للوحدة:", "Unit value:")}</span> <span className="font-mono font-bold text-purple-700">{fmtAmt(Math.round(amount / qty))} {t("ر.س", "SAR")}</span></div>
                    <div><span className="text-gray-500">{t("المسؤول:", "Custodian:")}</span> <span className="font-semibold text-gray-800">{custodian}</span></div>
                  </div>
                  <p className="text-[10px] text-purple-600">{t('سيظهر هذا الأصل كـ "مسودة" في موديول الأصول الثابتة لمراجعتك النهائية', 'This asset will appear as a "draft" in the Fixed Assets module for your final review')}</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Success ── */}
          {step === 3 && (
            <div className="p-8 flex flex-col items-center gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">{t("تم إنشاء المسودة بنجاح", "Draft Created Successfully")}</h4>
                <p className="text-gray-500 text-sm mt-1">
                  {t("تم تحويل", "Converted")} <span className="font-semibold text-purple-700">{invNum}</span> {t("إلى مسودة أصل ثابت", "to a fixed asset draft")}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t("انتقل إلى موديول الأصول الثابتة لمراجعتها وتأكيدها", "Navigate to the Fixed Assets module to review and confirm")}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {targetBranches.map(b => (
                  <span key={b} className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-semibold">{b}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between flex-shrink-0">
          <Btn size="sm" onClick={onClose}><X size={12} /> {t("إغلاق", "Close")}</Btn>
          <div className="flex gap-2">
            {step === 1 && (
              <button onClick={() => setStep(2)} disabled={!assetName.trim()}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${!assetName.trim() ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"}`}>
                {t("التالي: الفروع والعهدة", "Next: Branches & Custody")} <ChevronLeft size={13} />
              </button>
            )}
            {step === 2 && (
              <>
                <Btn onClick={() => setStep(1)}><ChevronRight size={13} /> {t("رجوع", "Back")}</Btn>
                <button onClick={handleConfirm} disabled={!canProceed || confirmed}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${(!canProceed || confirmed) ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"}`}>
                  <GitMerge size={13} /> {t("تأكيد التحويل للمسودة", "Confirm Convert to Draft")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// One real invoice attachment (GET /operations/{id}.expenses.invoices[].attachments).
type AttFile = { id: string; filename: string; publicUrl: string; label?: string | null };

export function AccExpensesPage({ navigate, setModal, setDetailId, ops, approveOp, rejectOp, bulkApprove }: PageProps) {
  const { t, dir, lang } = useLang();
  const en = lang === "en";
  const { data: expensesApi } = useAccountantOperationsPlatform({ moduleKey: "expenses" });
  const { data: expKpis } = useExpensesKpis();
  const exportOpsMut = useExportOperations();
  const verifyMut = useVerifyExpenseInvoice();
  const unverifyMut = useUnverifyExpenseInvoice();
  const { getConvertedInvNums, drafts } = useContext(AssetDraftContext);
  const [filters, setFilters] = useState<Filters>({ branch: "", status: "", match: "", search: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [selectedDay, setSelectedDay] = useState("all");
  const [verifiedInvoices, setVerifiedInvoices] = useState<Record<string, boolean>>({});
  const [attachModal, setAttachModal] = useState<{ opId: string; invNum: string; idx: number; files: AttFile[] } | null>(null);
  const [convertModal, setConvertModal] = useState<{ opId: string; invoiceIndex: number; invNum: string; vendor: string; desc: string; amount: number; branch: string; date: string } | null>(null);
  const convertedInvNums = getConvertedInvNums();

  // Real per-invoice detail for the currently-expanded op (T05 §1) —
  // GET /operations/{id}.expenses.invoices. The list endpoint carries no invoice
  // rows, so the table below fed on the simulated INVOICES map. Fetch the open op
  // and use its enriched invoices (real supplier/vendor, exact halalas, verify
  // + conversion state) instead; fall back to the simulation when absent.
  const { data: expandedDetail } = useOperation(expandedId);
  // Operation-level attachments (GET /operations/{id}/attachments) — used as a
  // fallback when a specific invoice row carries no attachments[] of its own.
  const { data: opAttachments = [] } = useOperationAttachments(expandedId);
  const opFiles: AttFile[] = (opAttachments as any[])
    .map(a => ({ id: String(a?.id ?? ""), filename: String(a?.filename ?? ""), publicUrl: String(a?.publicUrl ?? ""), label: a?.label ?? null }))
    .filter(a => a.publicUrl);
  const realExpandedInvoices = (expandedDetail as any)?.expenses?.invoices as
    | Array<{ index: number; invNum: string; vendor: string; desc: string; date: string; preTaxHalalas: number; vat15Halalas: number; inclTaxHalalas: number; verified: boolean; convertedToAsset: boolean; attachmentCount: number; attachments?: Array<{ id: string; filename: string; publicUrl: string; label?: string | null }> }>
    | undefined;
  type ExpInvRow = { invNum: string; vendor: string; desc: string; amount: number; date: string; attachCount: number; _index?: number; _verified?: boolean; _preTax?: number; _vat?: number; _converted?: boolean; _attachments?: AttFile[] };
  const invoicesFor = (opId: string): ExpInvRow[] => {
    if (opId === expandedId && realExpandedInvoices && realExpandedInvoices.length > 0) {
      return realExpandedInvoices.map(r => {
        // Real invoice files (2026-08-14): each { id, filename, publicUrl, label }.
        const files: AttFile[] = Array.isArray(r.attachments)
          ? r.attachments.map(a => ({ id: String(a?.id ?? ""), filename: String(a?.filename ?? ""), publicUrl: String(a?.publicUrl ?? ""), label: a?.label ?? null })).filter(a => a.publicUrl)
          : [];
        return {
          invNum: r.invNum,
          // Quick-cash expenses carry no invoice_details; the bridge synthesises a
          // single row where the vendor = expense supplier → quick-cash supplier
          // (2026-08-14). supplierName is the payload-root fallback for older rows.
          vendor: r.vendor || (r as any).supplierName || "—",
          desc: r.desc || "",
          amount: (r.inclTaxHalalas ?? 0) / 100,
          date: r.date || "",
          attachCount: r.attachmentCount ?? files.length,
          _index: r.index,
          _verified: r.verified,
          _preTax: (r.preTaxHalalas ?? 0) / 100,
          _vat: (r.vat15Halalas ?? 0) / 100,
          _converted: r.convertedToAsset,
          _attachments: files,
        };
      });
    }
    return INVOICES[opId] || INVOICES["default"];
  };

  const FALLBACK_EXP_DAY_OPTIONS = [
    { label: t("الكل", "All"), val: "all" },
    { label: t("اليوم", "Today"), val: "today" },
    { label: t("أمس (14 أكت)", "Yesterday (Oct 14)"), val: "d14" },
    { label: t("13 أكت", "Oct 13"), val: "d13" },
    { label: t("12 أكت", "Oct 12"), val: "d12" },
    { label: t("11 أكت", "Oct 11"), val: "d11" },
    { label: t("الأسبوع الماضي", "Last Week"), val: "lastWeek" },
    { label: t("الشهر الماضي", "Last Month"), val: "lastMonth" },
  ];
  const apiExpDayOptions = (expensesApi as any)?.dayOptions;
  const EXP_DAY_OPTIONS = (apiExpDayOptions?.length > 0 ? apiExpDayOptions : FALLBACK_EXP_DAY_OPTIONS) as any[];

  // 2026-08-14: brand/branch filters come from the tenant-scoped lookups
  // (GET /company/me/lookups/brands · …/branches?brandId=). Both are already
  // narrowed to the caller's assignment server-side — do NOT re-filter client-side.
  // Fall back to ops-derived options only until the lookup responds (never empty).
  const { data: brandLookup } = useLookup("brands");
  const { data: branchLookup } = useLookup("branches", brand ? { brandId: brand } : undefined);
  const brandOpts: { id: string; name: string }[] = (Array.isArray(brandLookup) && brandLookup.length
    ? (brandLookup as any[]).map(b => ({ id: String(b.id), name: String(b.name || b.nameAr || "") }))
    : brandOptionsFromOps(ops)).filter(b => b.id && b.name);
  // Use `name` (not nameAr): the branch filter matches by name against op.branch
  // (= branchName from the same source), so the strings must be identical.
  const branchFilterNames = (Array.isArray(branchLookup) && branchLookup.length
    ? (branchLookup as any[]).map(b => String(b.name))
    : [...new Set(ops.filter(o => o.moduleKey === "expenses").map(o => o.branch))]
  ).filter(n => n && n !== "—");
  const mOps = ops.filter(o => o.moduleKey === "expenses");
  const filtered = applyFilters(ops, filters, "expenses").filter(o => !brand || o.brandId === brand);
  const pending = mOps.filter(o => o.status === "pending");

  const toggleInvoiceVerify = (key: string) => setVerifiedInvoices(p => ({ ...p, [key]: !p[key] }));

  // Simulated batch invoices for each operation
  const FALLBACK_INVOICES: Record<string, { invNum: string; vendor: string; desc: string; amount: number; date: string; attachCount: number }[]> = {
    default: [
      { invNum: "INV-001", vendor: "شركة الخليج للمواد", desc: "مواد تنظيف وصيانة", amount: 850, date: "12 أكت", attachCount: 2 },
      { invNum: "INV-002", vendor: "مستلزمات المطبخ", desc: "أدوات خدمة وتغليف", amount: 420, date: "12 أكت", attachCount: 1 },
      { invNum: "INV-003", vendor: "خدمات الصيانة السريعة", desc: "إصلاح معدات المطبخ", amount: 1200, date: "13 أكت", attachCount: 3 },
    ],
  };
  const apiInvoices = (expensesApi as any)?.invoices;
  const INVOICES: Record<string, Array<{ invNum: string; vendor: string; desc: string; amount: number; date: string; attachCount: number }>> = (apiInvoices && Object.keys(apiInvoices).length > 0 ? apiInvoices : FALLBACK_INVOICES) as Record<string, Array<{ invNum: string; vendor: string; desc: string; amount: number; date: string; attachCount: number }>>;

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("موديول المصروفات", "Expenses Module")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{pending.length} {t("بيان معلق — قد يحتوي كل بيان على فواتير متعددة", "pending entries — each may contain multiple invoices")}</p>
        </div>
        {pending.length > 0 && (
          <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            {t("اعتماد المصروفات من صلاحية مالك العلامة أو المدير المفوّض (EXP-06)", "Expense approval is reserved for Brand Owner or Manager (EXP-06)")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("إجمالي البيانات المرفوعة", "Total Uploaded")} value={String(mOps.length)} sub={t("كل الحالات", "All statuses")} icon={<FileText size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("قيد المراجعة", "Under Review")} value={String(pending.length)} sub={t("رُفعت من الفروع", "Uploaded from branches")} icon={<Clock size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("تمت الموافقة", "Approved")} value={String(mOps.filter(o => o.status === "approved" || o.status === "final-approved").length)} sub={t("موافق + معتمد نهائياً", "Approved + Final-approved")} icon={<CheckCircle2 size={18} className="text-sky-600" />} accent="blue" />
        <KpiCard label={t("مرفوضة", "Rejected")} value={String(mOps.filter(o => o.status === "rejected").length)} sub={t("تحتاج إعادة رفع", "Needs re-upload")} icon={<XCircle size={18} className="text-red-600" />} accent="red" />
      </div>

      {/* Expenses invoice-match KPIs (T05 §2) — GET /company/me/expenses/kpis */}
      {expKpis && (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label={t("إجمالي المصروفات", "Total Expenses")} value={fmtAmt(Math.round(expKpis.totalHalalas / 100))} sub={`${t("ضريبة", "VAT")} ${fmtAmt(Math.round(expKpis.vat15Halalas / 100))}`} icon={<FileText size={18} className="text-purple-600" />} accent="purple" />
          <KpiCard label={t("فواتير مطابقة", "Matched")} value={String(expKpis.pendingInvoices.matched)} sub={t("قيد المراجعة", "under review")} icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
          <KpiCard label={t("غير مطابقة", "Mismatch")} value={String(expKpis.pendingInvoices.mismatch)} sub={t("تحتاج تدقيق", "needs audit")} icon={<AlertTriangle size={18} className="text-amber-600" />} accent="amber" />
          <KpiCard label={t("مفقودة", "Missing")} value={String(expKpis.pendingInvoices.missing)} sub={t("بلا مستند", "no document")} icon={<XCircle size={18} className="text-red-600" />} accent="red" />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir={dir}>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفرع", "Branch")}</label>
            <select value={filters.branch} onChange={e => setFilters(p => ({ ...p, branch: e.target.value === t("الكل", "All") ? "" : e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {[t("الكل", "All"), ...branchFilterNames].map(b => <option key={b} value={b === t("الكل", "All") ? "" : b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحالة", "Status")}</label>
            <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value === t("الكل", "All") ? "" : e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {[t("الكل", "All"), "pending", "approved", "rejected", "final-approved"].map(s => (
                <option key={s} value={s === t("الكل", "All") ? "" : s}>
                  {s === t("الكل", "All") ? s : (en ? (EN_STATUS_CFG[s as OpStatus] || STATUS_CFG[s as OpStatus]?.label || s) : (STATUS_CFG[s as OpStatus]?.label || s))}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("العلامة التجارية", "Brand")}</label>
            <select value={brand} onChange={e => { setBrand(e.target.value); setFilters(p => ({ ...p, branch: "" })); }} disabled={brandOpts.length === 0} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400">
              <option value="">{t("الكل", "All")}</option>
              {brandOpts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("التاريخ / الفترة", "Date / Period")}</label>
            <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {EXP_DAY_OPTIONS.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("بحث / رقم الفاتورة", "Search / Invoice Number")}</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400" />
              <input value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} placeholder={t("رقم الفاتورة أو اسم المورد...", "Invoice number or supplier name...")} className="flex-1 text-sm outline-none bg-transparent" />
            </div>
          </div>
          <div className="flex items-end">
            {(filters.branch || filters.status || filters.search || selectedDay !== "all" || brand) && (
              <button onClick={() => { setFilters({ branch: "", status: "", match: "", search: "" }); setBrand(""); setSelectedDay("all"); }}
                className="text-xs text-purple-600 hover:underline flex items-center gap-1 pb-2"><RotateCcw size={11} /> {t("مسح الفلاتر", "Clear Filters")}</button>
            )}
          </div>
        </div>
      </div>

      {filtered.some(op => (INVOICES[op.id] || INVOICES["default"]).some(inv => inv.amount >= 1000 && !convertedInvNums.has(inv.invNum))) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3" dir={dir}>
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={14} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">{t("فواتير مقترح تحويلها إلى أصول ثابتة", "Invoices recommended for conversion to fixed assets")}</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {filtered.flatMap(op => (INVOICES[op.id] || INVOICES["default"]).filter(inv => inv.amount >= 1000 && !convertedInvNums.has(inv.invNum))).length} {t("فاتورة بقيمة أعلى من 1,000 ر.س — يُنصح بمراجعتها للنظر في تصنيفها كأصل ثابت بدلاً من مصروف.", "invoices above 1,000 SAR — recommend reviewing them to classify as fixed assets instead of expenses.")}
            </p>
          </div>
          <button onClick={() => alert(t("جارٍ الانتقال إلى صفحة الأصول الثابتة...", "Navigating to Fixed Assets page..."))} className="text-xs text-amber-700 border border-amber-300 bg-white px-2.5 py-1.5 rounded-lg hover:bg-amber-100 font-semibold flex-shrink-0">
            {t("عرض الأصول ←", "View Assets →")}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">{t("بيانات المصروفات", "Expense Entries")}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{filtered.length} {t("بيان", "entries")}</span>
            <button onClick={() => exportOpsMut.mutate({ moduleKey: "expenses", format: "xlsx" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
              <FileText size={11} /> Excel
            </button>
          </div>
        </div>
        {filtered.length === 0
          ? <EmptyState icon="✅" title={t("لا توجد بيانات", "No Data")} desc={t("لا توجد بيانات تطابق الفلاتر المحددة", "No data matches the selected filters")} />
          : filtered.map(op => {
            const invoices = invoicesFor(op.id);
            const isExpanded = expandedId === op.id;
            const isLocked = op.status === "final-approved";
            const statusLabel = en ? (EN_STATUS_CFG[op.status] || STATUS_CFG[op.status].label) : STATUS_CFG[op.status].label;
            return (
              <div key={op.id} className="border-b border-gray-100 last:border-0">
                <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 ${isExpanded ? "bg-purple-50/20" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">{op.branch}</span>
                      <span className="text-gray-300">·</span>
                      <span className="font-mono text-xs text-purple-600">{op.id}</span>
                      <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px]">{invoices.length} {t("فاتورة", "invoices")}</Badge>
                      <Badge className={STATUS_CFG[op.status].cls}>{statusLabel}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{t("أُرسل", "Sent")} {op.timeAgo}{op.submittedBy ? ` · ${t("قدّمها", "by")} ${op.submittedBy}` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn size="sm" onClick={() => setExpandedId(isExpanded ? null : op.id)}>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {t("الفواتير", "Invoices")}
                    </Btn>
                    {op.status === "pending" && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                        {t("بانتظار اعتماد المالك (EXP-06)", "Awaiting Owner approval (EXP-06)")}
                      </span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-4 bg-gray-50/40">
                    <div className="mt-2 mb-2 flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-600">{t("تفاصيل الفواتير المضمنة في هذا البيان:", "Invoice details included in this entry:")}</p>
                      {!isLocked && <button onClick={() => setEditingRow(editingRow ? null : op.id)} className="text-[10px] text-purple-600 hover:underline flex items-center gap-1"><Edit3 size={10} /> {editingRow === op.id ? t("إيقاف التعديل", "Stop Editing") : t("تفعيل التعديل", "Enable Editing")}</button>}
                    </div>
                    {editingRow === op.id && (
                      <div className="mb-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                        <p className="text-[11px] font-bold text-purple-700 mb-2 flex items-center gap-1.5"><Edit3 size={11} /> {t("وضع التعديل — عدِّل بيانات الفاتورة والضريبة", "Edit Mode — update invoice and tax data")}</p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {[
                            { label: t("رقم فاتورة المورد", "Supplier Invoice No."), placeholder: "INV-XXXX", mono: true },
                            { label: t("اسم المورد", "Supplier Name"), placeholder: t("اسم المورد", "Supplier name") },
                            { label: t("البيان / الوصف", "Description"), placeholder: t("وصف المصروف", "Expense description") },
                            { label: t("التاريخ", "Date"), placeholder: "DD/MM/YYYY" },
                            { label: t("الرقم الضريبي للمورد", "Supplier Tax Number"), placeholder: t("رقم ضريبي 15 خانة", "15-digit tax number"), mono: true },
                          ].map((f, fi) => (
                            <div key={fi} className={fi === 4 ? "col-span-2" : ""}>
                              <label className="text-[10px] font-semibold text-gray-500 block mb-1">{f.label}</label>
                              <input placeholder={f.placeholder}
                                className={`w-full text-sm border border-purple-200 rounded-lg px-3 py-1.5 bg-white focus:border-purple-400 outline-none ${f.mono ? "font-mono" : ""}`}
                                dir={f.mono ? "ltr" : dir} />
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                          {[
                            { label: t("المبلغ قبل الضريبة", "Amount Before Tax"), cls: "text-gray-800" },
                            { label: t("ضريبة القيمة المضافة (15%)", "VAT (15%)"), cls: "text-amber-700" },
                            { label: t("المبلغ بعد الضريبة", "Amount After Tax"), cls: "text-emerald-700 font-bold" },
                          ].map((f, fi) => (
                            <div key={fi} className={`bg-white rounded-xl border ${fi === 2 ? "border-emerald-200" : "border-purple-200"} p-2.5`}>
                              <label className={`text-[10px] font-semibold block mb-1 ${f.cls}`}>{f.label}</label>
                              <input placeholder="0.00" type="number"
                                className={`w-full text-sm border-0 outline-none font-mono bg-transparent ${f.cls}`} />
                              <span className="text-[10px] text-gray-400">{t("ر.س", "SAR")}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Btn size="sm" variant="success"><CheckCircle2 size={11} /> {t("حفظ التعديلات", "Save Changes")}</Btn>
                          <Btn size="sm" onClick={() => setEditingRow(null)}>{t("إلغاء", "Cancel")}</Btn>
                        </div>
                      </div>
                    )}
                    <table className="w-full border border-gray-100 rounded-xl overflow-hidden text-xs" dir={dir}>
                      <thead className="bg-gray-100">
                        <tr>
                          <th className={`px-3 py-2 ${dir === "ltr" ? "text-left" : "text-right"}`}>{t("رقم الفاتورة", "Invoice No.")}</th>
                          <th className={`px-3 py-2 ${dir === "ltr" ? "text-left" : "text-right"}`}>{t("المورد", "Supplier")}</th>
                          <th className={`px-3 py-2 ${dir === "ltr" ? "text-left" : "text-right"}`}>{t("البيان", "Description")}</th>
                          <th className="px-3 py-2 text-center">{t("التاريخ", "Date")}</th>
                          <th className="px-3 py-2 text-center">{t("قبل الضريبة", "Before Tax")}</th>
                          <th className="px-3 py-2 text-center bg-amber-50/60 text-amber-700">{t("الضريبة 15%", "VAT 15%")}</th>
                          <th className="px-3 py-2 text-center bg-emerald-50/60 text-emerald-700">{t("بعد الضريبة", "After Tax")}</th>
                          <th className="px-3 py-2 text-center">{t("المرفقات", "Attachments")}</th>
                          <th className="px-3 py-2 text-center">{t("توثيق", "Verify")}</th>
                          <th className="px-3 py-2 text-center bg-purple-50/60 text-purple-700">{t("أصل ثابت", "Fixed Asset")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {invoices.map((inv, k) => {
                          const vKey = `${op.id}-${inv.invNum}`;
                          // Prefer the real op-detail fields when the row came from the
                          // live invoices; fall back to the simulated math otherwise.
                          const rInv = inv as typeof inv & { _index?: number; _verified?: boolean; _preTax?: number; _vat?: number; _converted?: boolean };
                          const invIndex = rInv._index ?? k;
                          const isInvVerified = rInv._verified ?? (verifiedInvoices[vKey] || false);
                          const amtBeforeVat = rInv._preTax ?? null;
                          const vatAmt = rInv._vat ?? null;
                          const alreadyConverted = (rInv._converted ?? false) || convertedInvNums.has(inv.invNum);
                          return (
                            <tr key={k} className={`hover:bg-gray-50 ${isInvVerified ? "bg-emerald-50/40" : ""} ${alreadyConverted ? "bg-purple-50/20" : ""}`}>
                              <td className="px-3 py-2 font-mono text-purple-700 font-semibold">{inv.invNum}</td>
                              <td className="px-3 py-2 font-medium text-gray-800">{inv.vendor}</td>
                              <td className="px-3 py-2 text-gray-600">{inv.desc}</td>
                              <td className="px-3 py-2 text-center text-gray-500">{inv.date}</td>
                              <td className="px-3 py-2 text-center font-mono text-gray-600">{amtBeforeVat != null ? `${fmtAmt(amtBeforeVat)} ${t("ر.س", "SAR")}` : "—"}</td>
                              <td className="px-3 py-2 text-center font-mono text-amber-600 bg-amber-50/20">{vatAmt != null ? `${fmtAmt(vatAmt)} ${t("ر.س", "SAR")}` : "—"}</td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">{fmtAmt(inv.amount)} {t("ر.س", "SAR")}</td>
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => setAttachModal({ opId: op.id, invNum: inv.invNum, idx: 0, files: (inv._attachments && inv._attachments.length ? inv._attachments : opFiles) })}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
                                  <Paperclip size={10} /><span className="font-semibold">{(inv._attachments && inv._attachments.length ? inv._attachments.length : (opFiles.length || inv.attachCount))}</span>
                                </button>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => { toggleInvoiceVerify(vKey); (isInvVerified ? unverifyMut : verifyMut).mutate({ invoiceId: op.id, invoiceIndex: invIndex }); }}
                                  title={isInvVerified ? t("موثّق", "Verified") : t("اضغط للتوثيق", "Click to verify")}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all ${isInvVerified ? "bg-emerald-500 text-white" : "border-2 border-dashed border-gray-300 text-gray-300 hover:border-emerald-400 hover:text-emerald-400"}`}>
                                  <CheckSquare size={12} />
                                </button>
                              </td>
                              <td className="px-3 py-2 text-center bg-purple-50/10">
                                {alreadyConverted ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-[10px] font-semibold">
                                    <Building2 size={10} /> {t("محوّل", "Converted")}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setConvertModal({ opId: op.id, invoiceIndex: invIndex, invNum: inv.invNum, vendor: inv.vendor, desc: inv.desc, amount: inv.amount, branch: op.branch, date: inv.date })}
                                    title={t("تحويل هذه الفاتورة إلى أصل ثابت", "Convert this invoice to a fixed asset")}
                                    className="group inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 border-dashed border-purple-200 text-purple-400 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 transition-all">
                                    <ArrowRightToLine size={11} />
                                    <span className="text-[10px] font-semibold hidden group-hover:inline">{t("أصل ثابت", "Fixed Asset")}</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={4} className={`px-3 py-2.5 font-bold text-gray-900 ${dir === "ltr" ? "text-left" : "text-right"}`}>{t("الإجمالي", "Total")}</td>
                        {(() => {
                          const hasPreTax = invoices.length > 0 && invoices.every(i => (i as any)._preTax != null);
                          const totalPreTax = hasPreTax ? invoices.reduce((s, i) => s + ((i as any)._preTax ?? 0), 0) : null;
                          const hasVat = invoices.length > 0 && invoices.every(i => (i as any)._vat != null);
                          const totalVat = hasVat ? invoices.reduce((s, i) => s + ((i as any)._vat ?? 0), 0) : null;
                          return (
                            <>
                              <td className="px-3 py-2.5 text-center font-mono text-gray-600">{totalPreTax != null ? `${fmtAmt(totalPreTax)} ${t("ر.س", "SAR")}` : "—"}</td>
                              <td className="px-3 py-2.5 text-center font-mono text-amber-600 bg-amber-50/20">{totalVat != null ? `${fmtAmt(totalVat)} ${t("ر.س", "SAR")}` : "—"}</td>
                            </>
                          );
                        })()}
                          <td className="px-3 py-2.5 text-center font-black font-mono text-emerald-700 bg-emerald-50/20">{fmtAmt(invoices.reduce((s, i) => s + i.amount, 0))} {t("ر.س", "SAR")}</td>
                          <td></td>
                          <td className="px-3 py-2.5 text-center text-[10px] text-gray-500">
                            {invoices.filter(inv => ((inv as any)._verified ?? verifiedInvoices[`${op.id}-${inv.invNum}`])).length}/{invoices.length} {t("موثّق", "verified")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        }
      </div>

      {drafts.filter(d => d.status === "draft").length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-purple-800">
              {drafts.filter(d => d.status === "draft").length} {t("فاتورة محوّلة إلى مسودة أصول ثابتة", "invoice(s) converted to fixed asset drafts")}
            </p>
            <p className="text-[11px] text-purple-600 mt-0.5">
              {drafts.filter(d => d.status === "draft").map(d => d.invNum).join(" · ")} — {t("انتقل إلى موديول الأصول الثابتة لمراجعتها", "Navigate to the Fixed Assets module to review them")}
            </p>
          </div>
          <button onClick={() => navigate("acc-assets")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all flex-shrink-0">
            <Building2 size={12} /> {t("فتح الأصول الثابتة", "Open Fixed Assets")}
          </button>
        </div>
      )}

      {/* Attachment Viewer Modal */}
      {attachModal && (() => {
        const files = attachModal.files;
        const total = files.length;
        const cur = total > 0 ? files[Math.min(attachModal.idx, total - 1)] : null;
        const curName = cur?.filename || "";
        const img = cur ? isImageFile(curName) : false;
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setAttachModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
              <div className="px-5 py-4 bg-gradient-to-l from-blue-600 to-blue-700 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">مرفقات الفاتورة — {attachModal.invNum}</h3>
                  <p className="text-blue-200 text-xs mt-0.5">{total > 0 ? `مرفق ${attachModal.idx + 1} من ${total}` : t("لا توجد مرفقات", "No attachments")}</p>
                </div>
                <button onClick={() => setAttachModal(null)} className="text-blue-200 hover:text-white"><X size={18} /></button>
              </div>
              {/* Attachment preview area — real file from the backend */}
              <div className="p-5">
                {!cur ? (
                  <div className="bg-gray-50 rounded-xl h-52 flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                    <Paperclip size={36} className="text-gray-300 mb-3" />
                    <p className="text-sm font-semibold text-gray-500">{t("لا يوجد ملف مرفق لهذه الفاتورة", "No file attached to this invoice")}</p>
                  </div>
                ) : img ? (
                  <a href={resolveAssetUrl(cur.publicUrl)} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={resolveAssetUrl(cur.publicUrl)} alt={curName}
                      onError={e => { e.currentTarget.style.display = "none"; const n = e.currentTarget.nextElementSibling as HTMLElement | null; if (n) n.style.display = "flex"; }}
                      className="w-full h-52 object-contain rounded-xl bg-gray-100 border border-gray-200" />
                    <div style={{ display: "none" }} className="w-full h-52 flex-col items-center justify-center rounded-xl bg-gray-100 border-2 border-dashed border-gray-300">
                      <FileText size={36} className="text-gray-400 mb-2" />
                      <span className="text-sm text-blue-600 font-semibold">{t("عرض الملف الكامل", "View Full File")}</span>
                      <span className="text-[10px] text-gray-400 mt-1 truncate max-w-[80%]">{curName}</span>
                    </div>
                  </a>
                ) : (
                  <div className="bg-gray-100 rounded-xl h-52 flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                    <FileText size={36} className="text-gray-400 mb-3" />
                    <p className="text-sm font-semibold text-gray-600">{cur.label || t("مستند الفاتورة", "Invoice document")}</p>
                    <p className="text-xs text-gray-400 mt-1 truncate max-w-[80%]">{curName}</p>
                    <a href={resolveAssetUrl(cur.publicUrl)} target="_blank" rel="noopener noreferrer"
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all">
                      <Eye size={14} /> {t("عرض الملف الكامل", "View Full File")}
                    </a>
                  </div>
                )}
                {total > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <button disabled={attachModal.idx === 0}
                      onClick={() => setAttachModal(p => p ? { ...p, idx: p.idx - 1 } : p)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      <ChevronRight size={14} /> {t("السابق", "Prev")}
                    </button>
                    <div className="flex gap-1.5">
                      {Array.from({ length: total }, (_, i) => (
                        <button key={i} onClick={() => setAttachModal(p => p ? { ...p, idx: i } : p)}
                          className={`w-2.5 h-2.5 rounded-full transition-all ${i === attachModal.idx ? "bg-blue-600" : "bg-gray-300"}`} />
                      ))}
                    </div>
                    <button disabled={attachModal.idx === total - 1}
                      onClick={() => setAttachModal(p => p ? { ...p, idx: p.idx + 1 } : p)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      {t("التالي", "Next")} <ChevronLeft size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="px-5 pb-4 flex gap-2 justify-end">
                {cur && <a href={resolveAssetUrl(cur.publicUrl)} download={curName} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"><Download size={12} /> {t("تحميل", "Download")}</a>}
                <Btn size="sm" variant="success" onClick={() => {
                  toggleInvoiceVerify(`${attachModal.opId}-${attachModal.invNum}`);
                  setAttachModal(null);
                }}><CheckSquare size={12} /> {t("تم التحقق من المرفق", "Attachment Verified")}</Btn>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Convert to Asset Modal */}
      {convertModal && (
        <ConvertToAssetModal
          expenseOpId={convertModal.opId}
          invoiceIndex={convertModal.invoiceIndex}
          invNum={convertModal.invNum}
          vendor={convertModal.vendor}
          desc={convertModal.desc}
          amount={convertModal.amount}
          branch={convertModal.branch}
          date={convertModal.date}
          onClose={() => setConvertModal(null)}
          onSuccess={() => setConvertModal(null)}
        />
      )}
    </div>
  );
}
