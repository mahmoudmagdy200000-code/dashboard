import { useState, useEffect, useContext } from "react";
import {
  CheckCircle2, Eye, Download, Edit2, X, FileText, RotateCcw, Send,
  Paperclip, ChevronDown, ChevronUp, Filter, Search, Check,
  ArrowLeftRight, Plus, Save, Clock, Smartphone, Wallet, Upload, Bell, Building,
  GitMerge, Building2, Clipboard
} from "lucide-react";
import {
  usePlatformAssets,
  usePlatformAssetDrafts,
  useExportAssets,
  useAdminUploadTemplate,
  useCreatePlatformAsset,
  useConfirmPlatformAsset,
  useImportAssets,
} from "../../../../../api/queries";
import { AssetDraftContext, type AssetDraft, type AssetCatType } from "../../_shared/assetDraft";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import { BRANCHES } from "../../_shared/filterOps";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { KpiCard } from "../../components/KpiCard";
import type { PageProps } from "../../_shared/types";

function ExcelImportModal({ assets, setAssets, onClose }: { assets: any[]; setAssets: (fn: (p: any[]) => any[]) => void; onClose: () => void }) {
  const { t, lang, dir } = useLang();
  const uploadTemplateMut = useAdminUploadTemplate();
  const importMut = useImportAssets();
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  type ImportRow = {
    rowId: number; name: string; cat: string; branch: string; invNum: string;
    cost: number; usefulLife: number; custodian: string; selected: boolean; branchEditing: boolean;
  };
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([
    { rowId: 1, name: "ثلاجة صناعية سامسونج 800L", cat: "معدات", branch: "فرع الرياض - العليا", invNum: "INV-B001", cost: 32000, usefulLife: 72, custodian: "مدير الفرع", selected: true, branchEditing: false },
    { rowId: 2, name: "شاشة كاشير LG 27 بوصة", cat: "تقنية", branch: "فرع جدة - الحمراء", invNum: "INV-B002", cost: 4500, usefulLife: 48, custodian: "مدير الفرع", selected: true, branchEditing: false },
    { rowId: 3, name: "طاولات ستانلس × 6", cat: "أثاث", branch: "فرع مكة - المعابدة", invNum: "INV-B003", cost: 9800, usefulLife: 60, custodian: "مدير الفرع", selected: true, branchEditing: false },
    { rowId: 4, name: "مولّد كهربائي 50KW", cat: "معدات", branch: "فرع الدمام - الخبر", invNum: "INV-B004", cost: 68000, usefulLife: 120, custodian: "مدير الفرع", selected: false, branchEditing: false },
    { rowId: 5, name: "كاميرات مراقبة × 8", cat: "تقنية", branch: "فرع الرياض - السليمانية", invNum: "INV-B005", cost: 12000, usefulLife: 60, custodian: "مدير الفرع", selected: true, branchEditing: false },
    { rowId: 6, name: "سيارة توصيل", cat: "مركبات", branch: "فرع جدة - العزيزية", invNum: "INV-B006", cost: 95000, usefulLife: 60, custodian: "سائق الفرع", selected: true, branchEditing: false },
    { rowId: 7, name: "طابعة فواتير إيبسون", cat: "تقنية", branch: "فرع الرياض - العليا", invNum: "INV-B007", cost: 2200, usefulLife: 36, custodian: "مدير الفرع", selected: true, branchEditing: false },
    { rowId: 8, name: "مضخة ماء صناعية", cat: "معدات", branch: "فرع مكة - المعابدة", invNum: "INV-B008", cost: 7500, usefulLife: 84, custodian: "مدير الفرع", selected: false, branchEditing: false },
  ]);
  const [importSent, setImportSent] = useState(false);

  const selectedRows = rows.filter(r => r.selected);
  const allSelected = rows.every(r => r.selected);

  const branchGroups = selectedRows.reduce<Record<string, ImportRow[]>>((acc, r) => {
    if (!acc[r.branch]) acc[r.branch] = [];
    acc[r.branch].push(r);
    return acc;
  }, {});

  // Pick a real file → preview step. If no file object (synthetic click), keep the demo preview.
  const pickFile = (f: File | null, name: string) => {
    setPickedFile(f);
    setFileName(name);
    setTimeout(() => setStep(2), 300);
  };

  // Real import (T05 §13): POST /company/me/assets/import (multipart). Server parses + creates.
  const confirmImport = () => {
    if (pickedFile) {
      importMut.mutate(pickedFile, {
        onSuccess: () => { setImportSent(true); setStep(3); },
      });
      return;
    }
    // No real file chosen (demo click) — fall back to a local preview add so the flow stays usable.
    setAssets(prev => {
      const newEntries = selectedRows.map((r, i) => ({
        id: `FA-${String(prev.length + i + 1).padStart(3, "0")}`,
        name: r.name, cat: r.cat as any, branch: r.branch,
        cost: r.cost, book: r.cost, usefulLife: r.usefulLife,
        case_: "acc_register" as const, status: "pending_branch" as const,
        invNum: r.invNum, submittedBy: "المحاسب — استيراد Excel", date: "اليوم",
        custodian: r.custodian,
        history: [{ date: "اليوم", from: "—", to: r.custodian, note: `مستورد من Excel (${fileName})`, by: "المحاسب" }]
      }));
      return [...prev, ...newEntries];
    });
    setImportSent(true);
    setStep(3);
  };

  const ALL_BRANCHES: string[] = [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-l from-emerald-700 to-emerald-600 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2"><Upload size={16} /> استيراد أصول من Excel</h3>
            <p className="text-emerald-200 text-xs mt-0.5">استيراد دفعي لأصول متعددة — يُرسَل لكل فرع إشعار مستقل على الموبايل</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {([1, 2, 3] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${step >= s ? "bg-white text-emerald-700 border-white" : "bg-transparent text-emerald-300 border-emerald-400"}`}>{s}</div>
                  {i < 2 && <div className={`w-6 h-0.5 ${step > s ? "bg-white" : "bg-emerald-400/50"}`} />}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="text-emerald-200 hover:text-white ml-2"><X size={18} /></button>
          </div>
        </div>

        {/* Step labels */}
        <div className="flex border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
          {[{ n: 1, l: "رفع الملف" }, { n: 2, l: "مراجعة البيانات" }, { n: 3, l: "تم الإرسال" }].map(s => (
            <div key={s.n} className={`flex-1 py-2.5 text-center text-xs font-semibold transition-colors ${step === s.n ? "text-emerald-700 border-b-2 border-emerald-600" : "text-gray-400"}`}>{s.l}</div>
          ))}
        </div>

        {/* ── STEP 1: Upload ─────────────────── */}
        {step === 1 && (
          <div className="p-8 flex flex-col items-center gap-6">
            {/* Drag-drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f, f.name); }}
              className={`w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${dragging ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50/40"}`}
              onClick={() => document.getElementById("asab-asset-import-input")?.click()}>
              <input id="asab-asset-import-input" type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f, f.name); }} />
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Upload size={28} className="text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800 text-base">اسحب ملف Excel هنا أو اضغط للتصفح</p>
                <p className="text-gray-400 text-sm mt-1">يدعم: .xlsx · .xls · .csv — الحجم الأقصى 10MB</p>
              </div>
              <Btn variant="primary">📂 {t("تصفح الملفات", "Browse Files")}</Btn>
            </div>

            {/* Template download */}
            <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">📊</div>
                <div>
                  <p className="font-semibold text-blue-900 text-sm">قالب Excel الجاهز</p>
                  <p className="text-blue-600 text-xs mt-0.5">حمّل القالب المطلوب بالأعمدة الصحيحة لضمان الاستيراد السليم</p>
                </div>
              </div>
              <button onClick={() => uploadTemplateMut.mutate({ type: "fixed-assets" })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-all">
                <Download size={13} /> تحميل القالب
              </button>
            </div>

            {/* Required columns info */}
            <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-700 mb-2">📋 الأعمدة المطلوبة في الملف:</p>
              <div className="grid grid-cols-4 gap-2">
                {["اسم الأصل", "الفئة", "اسم الفرع", "رقم الفاتورة", "التكلفة (ر.س)", "العمر الافتراضي (شهر)", "أمين العهدة", "ملاحظات"].map(col => (
                  <div key={col} className="flex items-center gap-1 text-[11px] text-gray-600"><Check size={10} className="text-emerald-500 flex-shrink-0" />{col}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Preview table ──────────── */}
        {step === 2 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-emerald-50/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-base">📊</div>
                <div>
                  <p className="font-bold text-gray-800 text-sm" dir="ltr">{fileName || "assets_import.xlsx"}</p>
                  <p className="text-xs text-gray-500">{rows.length} صف مُكتشف · {selectedRows.length} محدد للاستيراد</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={allSelected} onChange={e => setRows(p => p.map(r => ({ ...r, selected: e.target.checked })))} className="rounded" />
                  تحديد الكل
                </label>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold">
                    <th className="px-3 py-2.5 text-center w-8">✔</th>
                    <th className="px-3 py-2.5 text-right">اسم الأصل</th>
                    <th className="px-3 py-2.5 text-center">الفئة</th>
                    <th className="px-3 py-2.5 text-right">الفرع</th>
                    <th className="px-3 py-2.5 text-center">رقم الفاتورة</th>
                    <th className="px-3 py-2.5 text-center">التكلفة</th>
                    <th className="px-3 py-2.5 text-center">العمر (شهر)</th>
                    <th className="px-3 py-2.5 text-center">أمين العهدة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.rowId} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${!r.selected ? "opacity-40" : ""}`}>
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" checked={r.selected}
                          onChange={e => setRows(p => p.map(x => x.rowId === r.rowId ? { ...x, selected: e.target.checked } : x))}
                          className="rounded" />
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{r.name}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px]">{r.cat}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        {r.branchEditing ? (
                          <select value={r.branch}
                            onChange={e => setRows(p => p.map(x => x.rowId === r.rowId ? { ...x, branch: e.target.value, branchEditing: false } : x))}
                            autoFocus className="text-xs border border-emerald-300 rounded-lg px-2 py-1 w-full">
                            {ALL_BRANCHES.map(b => <option key={b}>{b}</option>)}
                          </select>
                        ) : (
                          <button onClick={() => setRows(p => p.map(x => x.rowId === r.rowId ? { ...x, branchEditing: true } : x))}
                            className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1 group">
                            {r.branch}<Edit2 size={10} className="opacity-0 group-hover:opacity-100" />
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs text-gray-500">{r.invNum}</td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-gray-800">{fmtAmt(r.cost)}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{r.usefulLife}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-orange-700 font-semibold">{r.custodian}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={5} className="px-3 py-3 text-xs font-bold text-gray-600 text-right">إجمالي الأصول المحددة ({selectedRows.length})</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-emerald-700">{fmtAmt(selectedRows.reduce((s, r) => s + r.cost, 0))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Branch summary + action */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/40 flex-shrink-0">
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><Smartphone size={12} className="text-emerald-600" /> سيُرسَل إشعار مستقل على الموبايل لكل فرع:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(branchGroups).map(([branch, brRows]) => (
                  <div key={branch} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                    <span className="font-semibold text-emerald-800">{branch}</span>
                    <Badge className="bg-emerald-200 text-emerald-800 text-[9px]">{brRows.length} أصل</Badge>
                    <span className="text-emerald-600 font-mono">{fmtAmt(brRows.reduce((s, r) => s + r.cost, 0))}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 justify-end">
                <Btn onClick={() => setStep(1)}>{t("← رجوع", "Back →")}</Btn>
                <Btn variant="primary" onClick={confirmImport} disabled={selectedRows.length === 0}>
                  <Send size={13} /> تأكيد الاستيراد وإرسال الإشعارات ({selectedRows.length} أصل · {Object.keys(branchGroups).length} فروع)
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Success ─────────────────── */}
        {step === 3 && (
          <div className="p-8 flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-xl">تم الاستيراد والإرسال بنجاح!</h3>
              <p className="text-gray-500 text-sm mt-1">تم إضافة {selectedRows.length} أصل وإرسال إشعار لكل فرع على الموبايل</p>
            </div>
            <div className="w-full max-w-lg space-y-2">
              {Object.entries(branchGroups).map(([branch, brRows]) => (
                <div key={branch} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Smartphone size={14} className="text-emerald-600" />
                    <span className="font-semibold text-emerald-900 text-sm">{branch}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-200 text-emerald-800 text-[10px]">{brRows.length} أصل</Badge>
                    <span className="font-mono text-emerald-700 font-bold text-sm">{fmtAmt(brRows.reduce((s, r) => s + r.cost, 0))} ر.س</span>
                    <Badge className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px]">📱 إشعار أُرسل</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 w-full max-w-lg">
              <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5"><Bell size={12} /> انتظر تأكيد مديري الفروع</p>
              <p className="text-xs text-amber-600 mt-1">سيظهر كل أصل في سجلك بحالة "ينتظر تأكيد الفرع" حتى يقوم مدير الفرع بالتأكيد عبر تطبيق الموبايل.</p>
            </div>
            <Btn variant="primary" onClick={onClose}><CheckCircle2 size={13} /> {t("العودة إلى سجل الأصول", "Return to Asset Registry")}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

export function AccAssets({ navigate }: PageProps) {
  const { t, lang, dir } = useLang();
  const { data: apiAssetsPage } = usePlatformAssets();
  usePlatformAssetDrafts();
  const exportAssetsMut = useExportAssets();
  const uploadTemplateMut = useAdminUploadTemplate();
  const createAssetMut = useCreatePlatformAsset();
  const confirmAssetMut = useConfirmPlatformAsset();
  const { drafts, discardDraft, confirmDraft } = useContext(AssetDraftContext);
  type AssetStatus = "pending_branch" | "pending_accountant" | "confirmed" | "registered";
  type AssetCat = "معدات" | "تقنية" | "أثاث" | "مركبات" | "أخرى";
  interface TransferLog { date: string; from: string; to: string; note: string; by: string; }
  interface AssetEntry {
    id: string; name: string; cat: AssetCat; branch: string; cost: number; book: number; usefulLife: number;
    case_: "branch_upload" | "acc_register"; status: AssetStatus; invNum: string;
    submittedBy: string; date: string; custodian: string;
    history: TransferLog[];
    // Server-provided display strings — prefer these over the local maps so live
    // statuses (active/maintenance/retired) and categories (kitchen/…) render right.
    statusLabelAr?: string; categoryLabelAr?: string; purchaseDate?: string;
  }

  const CAT_ICON: Record<AssetCat, string> = { "معدات": "🔧", "تقنية": "💻", "أثاث": "🪑", "مركبات": "🚗", "أخرى": "📦" };
  const CAT_CLR: Record<AssetCat, string> = { "معدات": "bg-blue-500", "تقنية": "bg-purple-500", "أثاث": "bg-amber-500", "مركبات": "bg-green-500", "أخرى": "bg-gray-400" };

  const apiAssetsList = (apiAssetsPage as any)?.data ?? (apiAssetsPage as any);
  const [assets, setAssets] = useState<AssetEntry[]>([]);
  // The live API returns PlatformAsset rows (category/branchName/usefulLifeMonths,
  // no history/book/cat/case_), but this screen renders the richer AssetEntry
  // shape. Normalize each row with safe defaults so a missing field (e.g. the
  // absent `history` array) can never crash the page to a white screen.
  useEffect(() => {
    if (!Array.isArray(apiAssetsList)) return;
    const CAT_MAP: Record<string, AssetCat> = {
      معدات: "معدات", تقنية: "تقنية", أثاث: "أثاث", مركبات: "مركبات", أخرى: "أخرى",
      equipment: "معدات", tech: "تقنية", technology: "تقنية", devices: "تقنية",
      furniture: "أثاث", vehicle: "مركبات", vehicles: "مركبات", other: "أخرى",
    };
    const STATUSES: AssetStatus[] = ["pending_branch", "pending_accountant", "confirmed", "registered"];
    const num = (v: any) => (typeof v === "number" && isFinite(v) ? v : 0);
    setAssets(apiAssetsList.map((a: any, i: number): AssetEntry => {
      const cost = a?.costHalalas != null ? num(a.costHalalas) / 100 : num(a?.cost);
      const book = a?.bookValueHalalas != null ? num(a.bookValueHalalas) / 100 : (a?.book != null ? num(a.book) : cost);
      return {
        id: a?.publicId ?? a?.id ?? `FA-${i + 1}`,
        name: a?.name ?? "—",
        cat: CAT_MAP[String(a?.cat ?? a?.category ?? "")] ?? "أخرى",
        branch: a?.branch ?? a?.branchName ?? a?.branchId ?? "—",
        cost, book,
        usefulLife: num(a?.usefulLife ?? a?.usefulLifeMonths) || 60,
        case_: a?.case_ === "branch_upload" ? "branch_upload" : "acc_register",
        status: STATUSES.includes(a?.status) ? a.status : "pending_accountant",
        invNum: a?.invNum ?? "—",
        submittedBy: a?.submittedBy ?? "—",
        date: a?.purchaseDate ?? a?.date ?? a?.createdAt ?? "—",
        custodian: a?.custodian ?? "قيد التعيين",
        history: Array.isArray(a?.history) ? a.history : [],
        statusLabelAr: a?.statusLabelAr ?? undefined,
        categoryLabelAr: a?.categoryLabelAr ?? undefined,
        purchaseDate: a?.purchaseDate ?? undefined,
      };
    }));
  }, [apiAssetsList]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"الكل" | AssetStatus>("الكل");
  const [filterCat, setFilterCat] = useState<"الكل" | AssetCat>("الكل");
  const [filterYear, setFilterYear] = useState("الكل");
  const [viewMode, setViewMode] = useState<"list" | "branch_report">("list");
  const [filterBranch, setFilterBranch] = useState("الكل");
  const [assetAttach, setAssetAttach] = useState<{ assetId: string; name: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // New asset form
  const [newAsset, setNewAsset] = useState({ name: "", cat: "معدات" as AssetCat, branch: "", invNum: "", cost: "", usefulLife: "60", custodian: "", notes: "" });
  const [addSent, setAddSent] = useState(false);
  const [transferForm, setTransferForm] = useState({ to: "", note: "" });

  const [reviewingDraft, setReviewingDraft] = useState<string | null>(null);

  const confirmAsset = (id: string) => {
    // Optimistic flip + real POST /accountant/assets/{id}/confirm; the server
    // truth wins on the invalidation-triggered refetch.
    setAssets(p => p.map(a => a.id === id ? { ...a, status: "confirmed" as AssetStatus } : a));
    confirmAssetMut.mutate(id);
  };

  const confirmDraftToAssets = (draftId: string) => {
    const draft = drafts.find(d => d.draftId === draftId);
    if (!draft) return;
    const costPerUnit = Math.round(draft.amount / Math.max(draft.qty, 1));
    const newEntries: AssetEntry[] = draft.targetBranches.flatMap((br, bi) =>
      Array.from({ length: draft.qty }, (_, qi) => ({
        id: `FA-${String(assets.length + 1 + (bi * draft.qty) + qi).padStart(3, "0")}`,
        name: draft.qty > 1 ? `${draft.assetName} (${qi + 1})` : draft.assetName,
        cat: draft.cat as AssetCat, branch: br,
        cost: costPerUnit, book: costPerUnit, usefulLife: draft.usefulLife,
        case_: "acc_register" as const, status: "pending_branch" as AssetStatus,
        invNum: draft.invNum, submittedBy: "المحاسب — تحويل من مصروف",
        date: "اليوم", custodian: draft.custodian,
        history: [{
          date: "اليوم", from: "—", to: draft.custodian,
          note: `تحويل من فاتورة مصروف ${draft.invNum} (${draft.vendor}) — مصدر: ${draft.expenseBranch}`,
          by: "المحاسب"
        }]
      }))
    );
    setAssets(p => [...p, ...newEntries]);
    confirmDraft(draftId);
    setReviewingDraft(null);
  };

  const submitNewAsset = () => {
    const id = `FA-${String(assets.length + 1).padStart(3, "0")}`;
    setAssets(p => [...p, {
      id, name: newAsset.name, cat: newAsset.cat, branch: newAsset.branch,
      cost: parseFloat(newAsset.cost) || 0, book: parseFloat(newAsset.cost) || 0,
      usefulLife: parseInt(newAsset.usefulLife) || 60, case_: "acc_register",
      status: "pending_branch", invNum: newAsset.invNum || `INV-${id}`,
      submittedBy: "المحاسب", date: "اليوم", custodian: newAsset.custodian || "قيد التعيين",
      history: [{ date: "اليوم", from: "—", to: newAsset.custodian || "—", note: "تسجيل من المحاسب — أُرسل إشعار للفرع", by: "المحاسب" }]
    }]);
    // The branch picker is name-valued but POST /accountant/assets needs branchId —
    // resolve it from the loaded rows and only fire the real create when we can
    // (otherwise keep the optimistic local row without a broken request).
    const branchId = Array.isArray(apiAssetsList)
      ? apiAssetsList.find((a: any) => (a?.branchName ?? a?.branch) === newAsset.branch)?.branchId
      : undefined;
    if (branchId) {
      // Backend stores `category` verbatim (string, no enum) and filters/KPIs break
      // on Arabic labels — send the canonical English key, not the display label.
      const CAT_KEY: Record<string, string> = { "معدات": "kitchen", "تقنية": "tech", "أثاث": "furniture", "مركبات": "vehicles", "أخرى": "other" };
      createAssetMut.mutate({
        name: newAsset.name,
        category: CAT_KEY[newAsset.cat] ?? "other",
        branchId,
        cost: Math.round((parseFloat(newAsset.cost) || 0) * 100),   // SAR → halalas
        usefulLifeMonths: parseInt(newAsset.usefulLife) || 60,
        custodian: newAsset.custodian || undefined,
        invNum: newAsset.invNum || undefined,
        notes: newAsset.notes || undefined,
      });
    }
    setAddSent(true);
    setTimeout(() => { setShowAddModal(false); setAddSent(false); setNewAsset({ name: "", cat: "معدات", branch: "", invNum: "", cost: "", usefulLife: "60", custodian: "", notes: "" }); }, 1200);
  };
  const submitTransfer = (id: string) => {
    setAssets(p => p.map(a => {
      if (a.id !== id) return a;
      const t: TransferLog = { date: "اليوم", from: a.custodian, to: transferForm.to, note: transferForm.note || "نقل عهدة", by: "المحاسب" };
      return { ...a, custodian: transferForm.to, history: [...a.history, t] };
    }));
    setShowTransfer(null);
    setTransferForm({ to: "", note: "" });
  };

  const pendingAccountant = assets.filter(a => a.status === "pending_accountant");
  const pendingBranch = assets.filter(a => a.status === "pending_branch");
  const confirmed = assets.filter(a => a.status === "confirmed");
  const displayedAssets = assets.filter(a => {
    if (filterStatus !== "الكل" && a.status !== filterStatus) return false;
    if (filterCat !== "الكل" && a.cat !== filterCat) return false;
    if (filterYear !== "الكل") {
      // Year from the real purchaseDate (YYYY-…) — not a hardcoded id list.
      if ((a.purchaseDate ?? a.date ?? "").slice(0, 4) !== filterYear) return false;
    }
    return true;
  });
  const ASSET_BRANCHES = [...new Set(assets.map(a => a.branch))];
  const branchFiltered = filterBranch === "الكل" ? assets : assets.filter(a => a.branch === filterBranch);
  const activeDrafts = drafts.filter(d => d.status === "draft");

  const STATUS_ASSET: Record<AssetStatus, { label: string; cls: string }> = {
    pending_branch: { label: "ينتظر تأكيد الفرع", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
    pending_accountant: { label: "ينتظر مراجعة المحاسب", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
    confirmed: { label: "مؤكد — مكتمل", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    registered: { label: "مسجل", cls: "bg-purple-50 text-purple-700 border border-purple-200" },
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">الأصول الثابتة</h2>
          <p className="text-gray-400 text-sm mt-0.5">تسجيل وتتبع الأصول — سجل العهدة والنقل التاريخي بين الموظفين</p>
        </div>
        <div className="flex flex-col gap-2 items-end flex-shrink-0">
          {/* Row 1: view toggle + export */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {([["list", "قائمة الأصول"], ["branch_report", "تقرير الفروع"]] as const).map(([v, l]) => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === v ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={() => exportAssetsMut.mutate({ format: "xlsx" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold hover:bg-gray-100 transition-all">
              <FileText size={11} /> تصدير Excel
            </button>
          </div>
          {/* Row 2: import + add */}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm">
              <Upload size={14} /> استيراد من Excel
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-all shadow-sm">
              <Plus size={14} /> إضافة أصل جديد
            </button>
          </div>
        </div>
      </div>

      {/* Brand filter bar for assets */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث بالاسم أو المطعم</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input placeholder="اسم الأصل أو المطعم أو المسؤول..." className="flex-1 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل"].map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الفئة</label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل", "معدات", "أجهزة", "مركبات", "أثاث", "تجهيزات"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── From-Expense Drafts Section ── */}
      {activeDrafts.length > 0 && (
        <div className="bg-gradient-to-l from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-purple-100 bg-purple-100/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-200 rounded-xl flex items-center justify-center">
                <GitMerge size={18} className="text-purple-700" />
              </div>
              <div>
                <h3 className="font-bold text-purple-900 text-base flex items-center gap-2">
                  مسودات محوّلة من المصروفات
                  <span className="bg-purple-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{activeDrafts.length}</span>
                </h3>
                <p className="text-purple-600 text-xs mt-0.5">راجع بيانات كل مسودة وأكّد إضافتها لسجل الأصول الثابتة</p>
              </div>
            </div>
            <button onClick={() => navigate("acc-expenses")}
              className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-all">
              <Wallet size={12} /> العودة للمصروفات
            </button>
          </div>

          <div className="divide-y divide-purple-100">
            {activeDrafts.map(draft => {
              const isReviewing = reviewingDraft === draft.draftId;
              const CAT_ICON_D: Record<AssetCatType, string> = { معدات: "🔧", تقنية: "💻", أثاث: "🪑", مركبات: "🚗", أخرى: "📦" };
              return (
                <div key={draft.draftId} className={`px-5 py-4 ${isReviewing ? "bg-white" : "hover:bg-purple-50/60"} transition-all`}>
                  {/* Draft row header */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">{CAT_ICON_D[draft.cat]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800 text-sm">{draft.assetName}</span>
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{draft.cat}</span>
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">مسودة</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><Wallet size={10} /> من: {draft.invNum} · {draft.vendor}</span>
                        <span>·</span>
                        <span className="font-mono font-bold text-purple-700">{fmtAmt(draft.amount)} ر.س</span>
                        <span>·</span>
                        <span>{draft.targetBranches.length} فرع · {draft.qty} وحدة · {draft.usefulLife} شهر</span>
                        <span>·</span>
                        <span>عهدة: {draft.custodian}</span>
                      </div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {draft.targetBranches.map(b => (
                          <span key={b} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-semibold">{b}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setReviewingDraft(isReviewing ? null : draft.draftId)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isReviewing ? "bg-purple-100 border-purple-300 text-purple-700" : "bg-white border-gray-200 text-gray-600 hover:border-purple-300"}`}>
                        <Eye size={11} /> {isReviewing ? "إخفاء" : "مراجعة"}
                      </button>
                      <button onClick={() => discardDraft(draft.draftId)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-100 text-red-500 hover:bg-red-50 transition-all">
                        <X size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Review panel */}
                  {isReviewing && (
                    <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5"><Eye size={12} /> مراجعة بيانات الأصل قبل الإضافة</p>

                      {/* Two-column detail grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                        <div className="bg-white rounded-lg border border-gray-100 p-3">
                          <p className="text-[10px] text-gray-400 font-semibold mb-1">بيانات المصروف الأصلي</p>
                          <div className="space-y-1">
                            <div className="flex justify-between"><span className="text-gray-500">الفاتورة:</span> <span className="font-mono font-bold text-purple-700">{draft.invNum}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">المورد:</span> <span className="font-semibold text-gray-800">{draft.vendor}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">المبلغ:</span> <span className="font-mono font-bold text-gray-800">{fmtAmt(draft.amount)} ر.س</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">الفرع المصدر:</span> <span className="font-semibold text-gray-800 text-[10px]">{draft.expenseBranch}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">التاريخ:</span> <span className="font-semibold text-gray-800">{draft.expenseDate}</span></div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-100 p-3">
                          <p className="text-[10px] text-gray-400 font-semibold mb-1">بيانات الأصل المحوّل</p>
                          <div className="space-y-1">
                            <div className="flex justify-between"><span className="text-gray-500">اسم الأصل:</span> <span className="font-semibold text-gray-800 text-[10px]">{draft.assetName}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">الفئة:</span> <span className="font-semibold text-gray-800">{CAT_ICON_D[draft.cat]} {draft.cat}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">الكمية:</span> <span className="font-semibold text-gray-800">{draft.qty} وحدة × {draft.targetBranches.length} فرع = {draft.qty * draft.targetBranches.length} إجمالاً</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">تكلفة الوحدة:</span> <span className="font-mono font-bold text-purple-700">{fmtAmt(Math.round(draft.amount / Math.max(draft.qty, 1)))} ر.س</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">المسؤول:</span> <span className="font-semibold text-gray-800">{draft.custodian}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">العمر:</span> <span className="font-semibold text-gray-800">{draft.usefulLife} شهر</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Target branches */}
                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-500 mb-1.5">الفروع التي ستُضاف إليها الأصول ({draft.targetBranches.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {draft.targetBranches.map(b => (
                            <span key={b} className="text-[11px] px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-semibold">{b}</span>
                          ))}
                        </div>
                      </div>

                      {draft.notes && (
                        <div className="mb-4 bg-yellow-50 border border-yellow-100 rounded-lg p-2.5">
                          <p className="text-[10px] font-bold text-yellow-700">ملاحظات المحاسب:</p>
                          <p className="text-xs text-yellow-800 mt-0.5">{draft.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => confirmDraftToAssets(draft.draftId)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-emerald-600 to-emerald-500 text-white rounded-xl text-sm font-bold hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-sm">
                          <CheckCircle2 size={14} /> تأكيد الإضافة — {draft.qty * draft.targetBranches.length} أصل لـ {draft.targetBranches.length} فرع
                        </button>
                        <button onClick={() => setReviewingDraft(null)}
                          className="px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-all">
                          إغلاق المراجعة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="بانتظار مراجعتي" value={String(pendingAccountant.length)} sub="رُفعت من الفروع" icon={<Clock size={18} className="text-blue-600" />} accent="blue" />
        <KpiCard label="بانتظار تأكيد الفرع" value={String(pendingBranch.length)} sub="سجّلها المحاسب" icon={<Smartphone size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label="مؤكد ومسجّل" value={String(confirmed.length)} sub="تمت الموافقة" icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label="القيمة الدفترية" value={`${(assets.reduce((s, a) => s + a.book, 0) / 1000).toFixed(0)}K`} sub="ر.س — كل الأصول" icon={<Building2 size={18} className="text-purple-600" />} accent="purple" />
      </div>

      {/* ── BRANCH REPORT VIEW ─────────────────────────────────────── */}
      {viewMode === "branch_report" && (
        <div className="space-y-4">
          {/* Branch filter chips */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[11px] font-semibold text-gray-500 mb-2">اختر الفرع</p>
            <div className="flex flex-wrap gap-2">
              {["الكل", ...ASSET_BRANCHES].map(b => (
                <button key={b} onClick={() => setFilterBranch(b)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${filterBranch === b ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
                  {b}
                  <span className={`text-[9px] px-1.5 rounded-full font-bold ${filterBranch === b ? "bg-white text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                    {b === "الكل" ? assets.length : assets.filter(a => a.branch === b).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Branch groups */}
          {(filterBranch === "الكل" ? ASSET_BRANCHES : [filterBranch]).map(br => {
            const brAssets = assets.filter(a => a.branch === br);
            if (!brAssets.length) return null;
            const totalCost = brAssets.reduce((s, a) => s + a.cost, 0);
            const totalBook = brAssets.reduce((s, a) => s + a.book, 0);
            return (
              <div key={br} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-gradient-to-l from-indigo-50 to-blue-50 border-b border-indigo-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-indigo-900 text-sm">{br}</h3>
                    <p className="text-[11px] text-indigo-600 mt-0.5">{brAssets.length} أصل · تكلفة إجمالية: <span className="font-mono font-bold">{fmtAmt(totalCost)} ر.س</span> · دفترية: <span className="font-mono font-bold">{fmtAmt(totalBook)} ر.س</span></p>
                  </div>
                </div>
                <table className="w-full text-xs" dir="rtl">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-right font-semibold text-gray-600">الأصل</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">الفئة</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">التكلفة</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">الدفترية</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-orange-700 bg-orange-50/60">تحت عهدة</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">الحالة</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">سجل النقل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {brAssets.map(a => {
                      const cfg = STATUS_ASSET[a.status];
                      return (
                        <tr key={a.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{CAT_ICON[a.cat]}</span>
                              <div>
                                <p className="font-semibold text-gray-800">{a.name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{a.id} · {a.invNum}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className="bg-gray-100 text-gray-600 text-[10px]">{a.categoryLabelAr ?? a.cat}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-gray-800">{fmtAmt(a.cost)}</td>
                          <td className="px-4 py-3 text-center font-mono text-gray-600">{fmtAmt(a.book)}</td>
                          <td className="px-4 py-3 text-center bg-orange-50/30">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-orange-800 font-semibold text-[11px]">{a.custodian}</span>
                              {a.history.length > 1 && <span className="text-[9px] text-orange-500">{a.history.length} عملية نقل</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`${cfg.cls} text-[10px]`}>{a.statusLabelAr ?? cfg.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] hover:bg-indigo-100 transition-all">
                              <Clock size={9} /> التاريخ ({a.history.length})
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* History panels */}
                {brAssets.filter(a => expandedId === a.id).map(a => (
                  <div key={a.id} className="px-5 pb-4 pt-2 bg-indigo-50/30 border-t border-indigo-100">
                    <p className="text-[11px] font-bold text-indigo-800 mb-2">📋 سجل العهدة والنقل — {a.name}</p>
                    <div className="space-y-2">
                      {a.history.map((h, hi) => (
                        <div key={hi} className="flex items-start gap-3 text-xs">
                          <div className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{hi + 1}</div>
                          <div className="flex-1 bg-white rounded-lg border border-indigo-100 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-700">{h.date} — {h.by}</span>
                              {h.from !== "—" && <span className="text-[10px] text-gray-400">{h.from} → <span className="text-indigo-700 font-semibold">{h.to}</span></span>}
                            </div>
                            <p className="text-gray-500 mt-0.5">{h.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Btn size="sm" onClick={() => setShowTransfer(a.id)}><ArrowLeftRight size={11} /> {t("نقل عهدة", "Transfer Custody")}</Btn>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {/* Workflow explanation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3" dir="rtl">
              <div className="flex items-center gap-2 mb-1"><Smartphone size={14} className="text-blue-600 flex-shrink-0" />
                <span className="text-xs font-bold text-blue-800">الحالة 1 — مدير الفرع يرفع عبر الموبايل</span>
              </div>
              <p className="text-[11px] text-blue-600">يرفع مدير الفرع صورة الأصل والفاتورة → يستلمها المحاسب هنا → يراجعها ويسجّلها</p>
            </div>
            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3" dir="rtl">
              <div className="flex items-center gap-2 mb-1"><Clipboard size={14} className="text-amber-600 flex-shrink-0" />
                <span className="text-xs font-bold text-amber-800">الحالة 2 — المحاسب يسجّل الفاتورة</span>
              </div>
              <p className="text-[11px] text-amber-600">المحاسب يسجّل الأصل → يُرسل إشعاراً لمدير الفرع → مدير الفرع يؤكد الاستلام</p>
            </div>
          </div>

          {/* Filters: Status + Category + Year */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">الحالة</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as "الكل" | AssetStatus)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  <option value="الكل">الكل — {assets.length} أصل</option>
                  <option value="pending_accountant">ينتظر مراجعة المحاسب ({pendingAccountant.length})</option>
                  <option value="pending_branch">ينتظر تأكيد الفرع ({pendingBranch.length})</option>
                  <option value="confirmed">مؤكد — مكتمل ({confirmed.length})</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">تصنيف الأصل</label>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value as "الكل" | AssetCat)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  <option value="الكل">{t("الكل", "All")}</option>
                  {(["معدات", "تقنية", "أثاث", "مركبات", "أخرى"] as AssetCat[]).map(c => (
                    <option key={c} value={c}>{CAT_ICON[c]} {c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">سنة الشراء</label>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  {["الكل", "2025", "2024", "2023", "2022"].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                {(filterStatus !== "الكل" || filterCat !== "الكل" || filterYear !== "الكل") && (
                  <button onClick={() => { setFilterStatus("الكل"); setFilterCat("الكل"); setFilterYear("الكل"); }}
                    className="text-xs text-purple-600 hover:underline flex items-center gap-1 pb-2"><RotateCcw size={11} /> مسح الفلاتر</button>
                )}
              </div>
            </div>
          </div>

          {/* Assets list */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">سجل الأصول — اضغط لعرض التفاصيل والتاريخ</h3>
              <span className="text-xs text-gray-400">{displayedAssets.length} أصل</span>
            </div>
            {displayedAssets.map(a => {
              const isExpanded = expandedId === a.id;
              const cfg = STATUS_ASSET[a.status];
              return (
                <div key={a.id} className="border-b border-gray-100 last:border-0">
                  <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 cursor-pointer ${isExpanded ? "bg-purple-50/20" : ""}`}
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${CAT_CLR[a.cat]}`}>
                      {CAT_ICON[a.cat]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">{a.name}</span>
                        <Badge className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px]">{a.categoryLabelAr ?? a.cat}</Badge>
                        <Badge className={`${cfg.cls} text-[10px]`}>{a.statusLabelAr ?? cfg.label}</Badge>
                        {a.case_ === "branch_upload"
                          ? <Badge className="bg-blue-50 text-blue-600 text-[10px]"><Smartphone size={9} className="ml-0.5" /> مُرفوع من الفرع</Badge>
                          : <Badge className="bg-amber-50 text-amber-600 text-[10px]"><Clipboard size={9} className="ml-0.5" /> سجّله المحاسب</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-gray-400">{a.branch} · {a.date}</p>
                        <span className="text-[10px] text-orange-700 font-semibold">عهدة: {a.custodian}</span>
                        {a.history.length > 1 && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">{a.history.length} نقل</span>}
                      </div>
                    </div>
                    <div className="text-left text-sm">
                      <p className="font-mono font-bold text-gray-800">{fmtAmt(a.cost)} ر.س</p>
                      <p className="text-xs text-gray-400 mt-0.5">دفترية: {fmtAmt(a.book)} ر.س</p>
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 bg-gray-50/40 space-y-3">
                      <div className="grid grid-cols-4 gap-3 mt-2">
                        <div className="bg-white rounded-xl border border-gray-100 p-3">
                          <p className="text-[10px] font-semibold text-gray-400 mb-1">رقم الفاتورة</p>
                          <p className="text-sm font-bold font-mono text-purple-700">{a.invNum}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-3">
                          <p className="text-[10px] font-semibold text-gray-400 mb-1">التكلفة</p>
                          <p className="text-sm font-bold font-mono">{fmtAmt(a.cost)} ر.س</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-3">
                          <p className="text-[10px] font-semibold text-gray-400 mb-1">القيمة الدفترية</p>
                          <p className="text-sm font-bold font-mono">{fmtAmt(a.book)} ر.س</p>
                        </div>
                        <div className="bg-white rounded-xl border border-orange-100 p-3 bg-orange-50/30">
                          <p className="text-[10px] font-semibold text-orange-500 mb-1">تحت عهدة</p>
                          <p className="text-sm font-bold text-orange-800">{a.custodian}</p>
                        </div>
                      </div>

                      <button onClick={() => setAssetAttach({ assetId: a.id, name: a.name })}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-all">
                        <Paperclip size={11} /> عرض المرفقات (صورة الأصل + الفاتورة)
                      </button>

                      {/* Transfer history */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-gray-700">📋 سجل العهدة والنقل</p>
                          <button onClick={() => setShowTransfer(a.id)} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                            <ArrowLeftRight size={11} /> نقل عهدة
                          </button>
                        </div>
                        <div className="space-y-2">
                          {a.history.map((h, hi) => (
                            <div key={hi} className="flex items-start gap-3 text-xs">
                              <div className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${hi === a.history.length - 1 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"}`}>{hi + 1}</div>
                              <div className="flex-1 bg-white rounded-lg border border-gray-100 px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-gray-700">{h.date} · {h.by}</span>
                                  {h.from !== "—" && <span className="text-[10px] text-gray-400 font-mono">{h.from} → <span className="text-indigo-700 font-semibold">{h.to}</span></span>}
                                </div>
                                <p className="text-gray-500 mt-0.5">{h.note}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Workflow state actions */}
                      {a.status === "pending_accountant" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                          <Smartphone size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-blue-900">الخطوة: مراجعة وتأكيد التسجيل</p>
                            <p className="text-xs text-blue-600 mt-0.5">رُفع الأصل من الفرع. راجع البيانات والمرفقات ثم أكّد التسجيل الرسمي.</p>
                          </div>
                          <Btn size="sm" variant="success" onClick={() => confirmAsset(a.id)}><CheckCircle2 size={12} /> تأكيد التسجيل</Btn>
                        </div>
                      )}
                      {a.status === "pending_branch" && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                          <Smartphone size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-amber-900">بانتظار تأكيد الفرع على الموبايل</p>
                            <p className="text-xs text-amber-600 mt-0.5">أُرسل إشعار لمدير الفرع لتأكيد الاستلام الفعلي.</p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 text-xs flex-shrink-0">⏳ ينتظر الفرع</Badge>
                        </div>
                      )}
                      {a.status === "confirmed" && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                          <p className="text-sm text-emerald-800 font-medium">مكتمل — تم التأكيد من كلا الطرفين. الأصل مسجّل رسمياً.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ADD ASSET MODAL ──────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="px-6 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">إضافة أصل ثابت جديد</h3>
                <p className="text-purple-200 text-xs mt-0.5">يُرسَل للفرع تلقائياً لتأكيد الاستلام بعد الحفظ</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-purple-200 hover:text-white"><X size={18} /></button>
            </div>
            {addSent ? (
              <div className="p-10 flex flex-col items-center justify-center text-center">
                <CheckCircle2 size={48} className="text-emerald-500 mb-3" />
                <p className="font-bold text-gray-900 text-lg">تم إرسال الإشعار للفرع!</p>
                <p className="text-gray-500 text-sm mt-1">سيتلقى مدير الفرع إشعاراً على تطبيق الموبايل لتأكيد الاستلام</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">اسم الأصل *</label>
                    <input value={newAsset.name} onChange={e => setNewAsset(p => ({ ...p, name: e.target.value }))}
                      placeholder="مثال: ثلاجة عرض — باناسونيك 600L"
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">الفئة *</label>
                    <select value={newAsset.cat} onChange={e => setNewAsset(p => ({ ...p, cat: e.target.value as AssetCat }))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none">
                      {(["معدات", "تقنية", "أثاث", "مركبات", "أخرى"] as AssetCat[]).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">الفرع *</label>
                    <select value={newAsset.branch} onChange={e => setNewAsset(p => ({ ...p, branch: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none">
                      <option value="">{t("-- اختر الفرع --", "-- Select Branch --")}</option>
                      {ASSET_BRANCHES.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">رقم الفاتورة</label>
                    <input value={newAsset.invNum} onChange={e => setNewAsset(p => ({ ...p, invNum: e.target.value }))}
                      placeholder="INV-XXXX" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none" dir="ltr" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">التكلفة الإجمالية (ر.س) *</label>
                    <input value={newAsset.cost} onChange={e => setNewAsset(p => ({ ...p, cost: e.target.value }))}
                      placeholder="0.00" type="number"
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none text-center font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">العمر الافتراضي (شهر)</label>
                    <input value={newAsset.usefulLife} onChange={e => setNewAsset(p => ({ ...p, usefulLife: e.target.value }))}
                      type="number" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none text-center font-mono" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">المسؤول / الموظف (اسم أمين العهدة)</label>
                    <input value={newAsset.custodian} onChange={e => setNewAsset(p => ({ ...p, custodian: e.target.value }))}
                      placeholder="اسم مدير الفرع أو الموظف المسؤول"
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">ملاحظات</label>
                    <textarea value={newAsset.notes} onChange={e => setNewAsset(p => ({ ...p, notes: e.target.value }))}
                      rows={2} placeholder="أي ملاحظات إضافية..."
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 outline-none resize-none" />
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <Smartphone size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">بعد الحفظ، سيتلقى مدير الفرع إشعاراً فورياً على تطبيق الموبايل لتأكيد استلام الأصل وإضافته رسمياً لأصول الفرع.</p>
                </div>
                <div className="flex gap-3 justify-end">
                  <Btn onClick={() => setShowAddModal(false)}>{t("إلغاء", "Cancel")}</Btn>
                  <Btn variant="primary" onClick={submitNewAsset} disabled={!newAsset.name || !newAsset.branch || !newAsset.cost}>
                    <Send size={13} /> {t("حفظ وإرسال للفرع", "Save & Send to Branch")}
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRANSFER CUSTODY MODAL ──────────────────────────────── */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowTransfer(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-indigo-700 to-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">نقل عهدة الأصل</h3>
                <p className="text-indigo-200 text-xs mt-0.5">{assets.find(a => a.id === showTransfer)?.name}</p>
              </div>
              <button onClick={() => setShowTransfer(null)} className="text-indigo-200 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-center flex-1">
                  <p className="text-[10px] text-gray-500 mb-0.5">الحالي</p>
                  <p className="font-bold text-gray-800 text-sm">{assets.find(a => a.id === showTransfer)?.custodian}</p>
                </div>
                <ArrowLeftRight size={16} className="text-indigo-500" />
                <div className="text-center flex-1">
                  <p className="text-[10px] text-gray-500 mb-0.5">الجديد</p>
                  <p className="font-bold text-indigo-700 text-sm">{transferForm.to || "—"}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">اسم المسؤول الجديد *</label>
                <input value={transferForm.to} onChange={e => setTransferForm(p => ({ ...p, to: e.target.value }))}
                  placeholder="اسم الموظف أو مدير الفرع الجديد"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-indigo-400 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">سبب النقل</label>
                <input value={transferForm.note} onChange={e => setTransferForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="مثال: نقل الفرع، تغيير المناوبة..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-indigo-400 outline-none" />
              </div>
              <div className="flex gap-3 justify-end">
                <Btn onClick={() => setShowTransfer(null)}>{t("إلغاء", "Cancel")}</Btn>
                <Btn variant="primary" onClick={() => submitTransfer(showTransfer)} disabled={!transferForm.to}>
                  <ArrowLeftRight size={13} /> {t("تأكيد النقل وتوثيقه", "Confirm & Document Transfer")}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXCEL IMPORT MODAL ──────────────────────────────────── */}
      {showImportModal && <ExcelImportModal assets={assets} setAssets={setAssets} onClose={() => setShowImportModal(false)} />}

      {/* Asset attachment viewer modal */}
      {assetAttach && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setAssetAttach(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-blue-600 to-blue-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">مرفقات الأصل — {assetAttach.name}</h3>
                <p className="text-blue-200 text-xs mt-0.5">مرفق 1 من 2</p>
              </div>
              <button onClick={() => setAssetAttach(null)} className="text-blue-200 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { name: `صورة_الأصل_${assetAttach.assetId}.jpg`, type: "صورة", size: "340KB", icon: "🖼" },
                { name: `فاتورة_شراء_${assetAttach.assetId}.pdf`, type: "PDF", size: "180KB", icon: "📄" },
              ].map((att, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer group">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xl ${att.type === "صورة" ? "bg-purple-100" : "bg-blue-100"}`}>{att.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate" dir="ltr">{att.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{att.type} · {att.size}</p>
                  </div>
                  <Btn size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity"><Eye size={11} /> {t("عرض", "View")}</Btn>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 flex gap-2 justify-end border-t border-gray-100 pt-3">
              <Btn size="sm"><Plus size={11} /> {t("إضافة مرفق", "Add Attachment")}</Btn>
              <Btn size="sm" onClick={() => setAssetAttach(null)}>{t("إغلاق", "Close")}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
