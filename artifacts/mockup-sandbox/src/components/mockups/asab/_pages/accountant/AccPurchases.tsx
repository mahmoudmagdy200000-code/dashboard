import { useState, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertTriangle,
  Eye,
  Download,
  Edit3,
  X,
  FileText,
  RotateCcw,
  Send,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Clock,
  Filter,
  Search,
  Check,
  CheckSquare,
  ShoppingCart,
  Truck,
  Plus,
  XCircle,
} from "lucide-react";
import {
  useOperation,
  usePurchasesList,
  usePatchPurchaseLine,
  useAccountantPurchases,
  useBulkDocumentPurchases,
  useApproveOperation,
  useRejectOperation,
  useBulkApprove,
  useExportOperations,
  useExportAccountantPurchases,
  useSuppliers,
  usePurchaseReturns,
  useCreateSupplier,
  useReviewPurchaseReturn,
  useFinalApprovePurchaseReturn,
  useReturnForReviewPurchaseReturn,
} from "../../../../../api/queries";
import { useAccountantInventoryBrands } from "../../../../../api/queries/platform/accountant";
import { useInventoryBranches } from "../../../../../api/queries/inventory";
import { useDirectUpload, useVerifyAttachment } from "../../../../../api/queries/uploads";
import { queryKeys } from "../../../../../api/queries/keys";
import type { OperationAttachment } from "../../../../../api/types/company";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { KpiCard } from "../../components/KpiCard";
import { EmptyState } from "../../components/EmptyState";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt, isImageFile, resolveAssetUrl, opDetailPage } from "../../_shared/formatters";
import { MATCH_CFG, STATUS_CFG, EN_STATUS_CFG } from "../../_shared/displayConfig";
import { BRANCHES } from "../../_shared/filterOps";
import {
  filterApprovablePurchaseIds,
  hasUnavailablePurchaseMatch,
} from "../../purchaseApprovalGuards";
import type { PageProps, Op, Filters, PageId, OpStatus } from "../../_shared/types";

// ── Rich purchase records for Accountant module ─────────────────────────────
export interface PurItem { name: string; ordered: number; received: number; unit: string; price: number; histPrice: number; dailyAvg: number; recommended: number }
export interface PurRecord { id: string; branch: string; supplier: string; invNum: string; date: string; status: "pending" | "approved" | "rejected"; match: "exact" | "diff"; amount: number; items: PurItem[] }
// Purchase records come from the platform API at point of use; no static seed.
export const PUR_RECORDS: PurRecord[] = [];

// Keep PURCHASE_DETAIL for backwards compatibility with any remaining references
export const PURCHASE_DETAIL = { default: PUR_RECORDS[0] ? { supplier: PUR_RECORDS[0].supplier, invNum: PUR_RECORDS[0].invNum, items: PUR_RECORDS[0].items } : { supplier: "", invNum: "", items: [] } };

// ── Shared purchase reconciliation table (used in both AccPurchases and ProcNewOrders)
export function PurItemsTable({ items, verifiedMap, onToggleVerify }: { items: PurItem[]; verifiedMap?: Record<string, boolean>; onToggleVerify?: (key: string) => void }) {
  const { t, lang, dir } = useLang();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[750px] border border-gray-100 rounded-xl overflow-hidden text-xs" dir={dir}>
      <thead className="bg-gray-100">
        <tr>
          <th className="px-3 py-2 text-start">{t("الصنف", "Item")}</th>
          <th className="px-3 py-2 text-center">{t("الوحدة", "Unit")}</th>
          <th className="px-3 py-2 text-center">{t("سعر الوحدة", "Unit Price")}</th>
          <th className="px-3 py-2 text-center bg-sky-50/80 text-sky-700">{t("سعر تاريخي", "Hist. Price")}</th>
          <th className="px-3 py-2 text-center">{t("مطلوب", "Ordered")}</th>
          <th className="px-3 py-2 text-center">{t("مستلم", "Received")}</th>
          <th className="px-3 py-2 text-center bg-amber-50/80 text-amber-700">{t("استهلاك يومي", "Daily Avg")}</th>
          <th className="px-3 py-2 text-center bg-amber-50/80 text-amber-700">{t("موصى به", "Recommended")}</th>
          <th className="px-3 py-2 text-center">{t("الإجمالي", "Total")}</th>
          <th className="px-3 py-2 text-center">{t("الحالة", "Status")}</th>
          {onToggleVerify && <th className="px-3 py-2 text-center text-emerald-700 bg-emerald-50/50">{t("توثيق", "Verify")} ✓</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {items.map((row, i) => {
          const diff = row.ordered - row.received;
          const total = row.received * row.price;
          const priceDiff = row.price - row.histPrice;
          const qtyVsRec = row.received - row.recommended;
          const vKey = `${row.name}-${i}`;
          const verified = verifiedMap?.[vKey];
          return (
            <tr key={i} className={diff > 0 ? "bg-red-50/40" : verified ? "bg-emerald-50/30" : ""}>
              <td className="px-3 py-2 font-semibold text-gray-800">{row.name}</td>
              <td className="px-3 py-2 text-center text-gray-500">{row.unit}</td>
              <td className={`px-3 py-2 text-center font-mono font-semibold ${priceDiff > 2 ? "text-red-600" : priceDiff < -2 ? "text-emerald-600" : "text-gray-800"}`}>
                {row.price} {t("ر.س", "SAR")}
                {priceDiff > 2 && <div className="text-[9px] text-red-500">↑ {t("أعلى من المعتاد", "Above usual")}</div>}
                {priceDiff < -2 && <div className="text-[9px] text-emerald-500">↓ {t("أقل من المعتاد", "Below usual")}</div>}
              </td>
              <td className="px-3 py-2 text-center font-mono text-gray-500 bg-sky-50/20">{row.histPrice} {t("ر.س", "SAR")}</td>
              <td className="px-3 py-2 text-center font-mono font-bold text-gray-800">{row.ordered}</td>
              <td className={`px-3 py-2 text-center font-mono font-bold ${diff > 0 ? "text-red-600" : "text-gray-800"}`}>{row.received}</td>
              <td className="px-3 py-2 text-center font-mono text-amber-700 bg-amber-50/20">{row.dailyAvg}</td>
              <td className="px-3 py-2 text-center font-mono bg-amber-50/20">
                <span className={`font-semibold ${Math.abs(qtyVsRec) > 5 ? "text-orange-600" : "text-gray-700"}`}>{row.recommended}</span>
                {Math.abs(qtyVsRec) > 5 && <div className="text-[9px] text-orange-500">{qtyVsRec > 0 ? t("زيادة", "Over") : t("نقص", "Under")} {Math.abs(qtyVsRec)}</div>}
              </td>
              <td className="px-3 py-2 text-center font-mono font-semibold text-blue-700">{fmtAmt(total, lang)} {t("ر.س", "SAR")}</td>
              <td className="px-3 py-2 text-center">
                {diff === 0 ? <Badge className="bg-emerald-50 text-emerald-700">{t("مطابق", "Matched")}</Badge>
                  : <Badge className="bg-red-50 text-red-700">{t("فرق", "Diff")} {diff}</Badge>}
              </td>
              {onToggleVerify && (
                <td className="px-3 py-2 text-center">
                  <button onClick={() => onToggleVerify(vKey)}
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all ${verified ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 hover:border-emerald-400"}`}>
                    {verified && <CheckCircle2 size={12} />}
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
        <tr>
          <td colSpan={onToggleVerify ? 8 : 8} className="px-3 py-2 font-bold text-gray-800 text-right">{t("إجمالي الفاتورة", "Invoice Total")}</td>
          <td className="px-3 py-2 text-center font-black font-mono text-blue-800">
            {fmtAmt(items.reduce((s, r) => s + r.received * r.price, 0), lang)} {t("ر.س", "SAR")}
          </td>
          <td></td>
          {onToggleVerify && <td></td>}
        </tr>
      </tfoot>
    </table>
    </div>
  );
}

// Real PUR- detail: reads the canonical `purchases.purchaseItems[]` from
// GET /operations/{id} (ordQty vs rcvQty, "—" for null, server-computed totals +
// lineMatch), renders the supersedes banner, and edits a line via
// PATCH /company/me/operations/{id}/purchase-lines/{rowId}. Falls back to the rich
// demo panel (demoRender) when the backend has no real lines yet.
export function PurchaseLinesPanel({ rec, t, onAttach, demoRender }: {
  rec: any; t: (ar: string, en: string) => string; onAttach: () => void; demoRender: () => ReactNode;
}) {
  const { lang, dir } = useLang();
  const patchMut = usePatchPurchaseLine();
  // Lines from the grouped /company/me/purchases endpoint carry lastArrivalPrice
  // + documented; only fetch the op detail when the card didn't provide them.
  const linesFromCard: any[] = Array.isArray(rec.lines) ? rec.lines : [];
  const { data: detail, isLoading } = useOperation(linesFromCard.length ? null : rec.id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, { ordQty: string; rcvQty: string; price: string }>>({});

  const pur = (detail as any)?.purchases;
  const linesFromOp: any[] = Array.isArray(pur?.purchaseItems) ? pur.purchaseItems : [];
  const lines = linesFromCard.length ? linesFromCard : linesFromOp;
  if (lines.length === 0) {
    if (isLoading) return <div className="px-5 py-6 text-center text-sm text-gray-400">{t("جارٍ التحميل...", "Loading...")}</div>;
    return <>{demoRender()}</>;
  }

  const supersedesId = (detail as any)?.payload?.supersedesOperationId;
  const supplierName = pur?.supplierName ?? rec.supplier;
  // Prefer riyal fields; fall back to halalas÷100.
  const money = (l: any, sarKey: string, halKey: string) => {
    const s = l?.[sarKey]; if (typeof s === "number") return `${fmtAmt(s, lang)} ${t("ر.س", "SAR")}`;
    const h = l?.[halKey]; return typeof h === "number" ? `${fmtAmt(h / 100, lang)} ${t("ر.س", "SAR")}` : "—";
  };
  const startEdit = () => { const f: Record<string, any> = {}; lines.forEach((l: any) => { f[l.rowId] = { ordQty: String(l.ordQty ?? ""), rcvQty: l.rcvQty == null ? "" : String(l.rcvQty), price: String(l.unitPriceSar ?? (l.unitPriceHalalas != null ? l.unitPriceHalalas / 100 : "")) }; }); setForm(f); setEditing(true); };
  const saveRow = (l: any) => {
    const f = form[l.rowId]; if (!f) return;
    const patch: { ordQty?: number; rcvQty?: number | null; unitPriceSar?: number } = {};
    if (f.ordQty.trim() !== "") patch.ordQty = Number(f.ordQty);
    patch.rcvQty = f.rcvQty.trim() === "" ? null : Number(f.rcvQty);
    if (f.price.trim() !== "") patch.unitPriceSar = Number(f.price);
    patchMut.mutate({ operationId: rec.id, rowId: l.rowId, patch });
  };
  const toggleDoc = (l: any) => patchMut.mutate({ operationId: rec.id, rowId: l.rowId, patch: { documented: !l.documented } });
  const setF = (rowId: string, k: "ordQty" | "rcvQty" | "price", v: string) => setForm(p => ({ ...p, [rowId]: { ...(p[rowId] ?? { ordQty: "", rcvQty: "", price: "" }), [k]: v } }));
  const arrowCls = (dir: string) => dir === "up" ? "text-red-600" : dir === "down" ? "text-emerald-600" : "text-gray-400";
  const arrowIcon = (dir: string) => dir === "up" ? "▲" : dir === "down" ? "▼" : "";
  const documentedCount = lines.filter((l: any) => l.documented).length;

  return (
    <div className="px-5 pb-5 bg-gray-50/40 space-y-3">
      {supersedesId && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-amber-800">
          <RotateCcw size={13} className="flex-shrink-0" /> {t("نسخة معدّلة من عملية مرفوضة سابقة.", "Revised copy of a previously rejected operation.")}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3 p-3 bg-white rounded-xl border border-blue-100">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-700 break-words">{t("المورد:", "Supplier:")} <span className="text-blue-700">{supplierName ?? "—"}</span></p>
          <p className="text-xs text-gray-500 mt-0.5 break-words">
            {rec.invNum ? <>{t("رقم الفاتورة:", "Invoice #:")} <span className="font-mono font-semibold text-purple-600">{rec.invNum}</span> · </> : null}
            {t("الفرع:", "Branch:")} {rec.branch} · {t("إجمالي الفاتورة:", "Invoice Total:")} <span className="font-bold text-gray-700">{fmtAmt(rec.amount, lang)} {t("ر.س", "SAR")}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button onClick={onAttach} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-all">
            <Paperclip size={11} /> {t("المرفقات", "Attachments")}{rec.attachmentsCount ? ` (${rec.attachmentsCount})` : ""}
          </button>
          <button onClick={() => editing ? setEditing(false) : startEdit()} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${editing ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-purple-50 text-purple-600 hover:bg-purple-100"}`}>
            <Edit3 size={11} /> {editing ? t("إنهاء التعديل", "Done") : t("تعديل البنود", "Edit Lines")}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-100 rounded-xl overflow-hidden text-xs" dir={dir}>
          <thead className="bg-gray-100"><tr>
            <th className="px-3 py-2 text-start font-semibold text-gray-600">{t("اسم الصنف", "Item")}</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("الوحدة", "Unit")}</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("سعر الوحدة", "Unit Price")}</th>
            <th className="px-3 py-2 text-center font-semibold text-blue-700">{t("آخر سعر وصول", "Last Arrival")}</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("الكمية", "Qty")}</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("الإجمالي", "Total")}</th>
            <th className="px-3 py-2 text-center font-semibold text-emerald-700">{t("توثيق", "Documented")}</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {lines.map((l: any) => {
              const f = form[l.rowId] ?? { ordQty: "", rcvQty: "", price: "" };
              const qty = l.rcvQty ?? l.qty ?? l.ordQty;
              return (
                <tr key={l.rowId} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-semibold text-gray-800">{l.item ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center text-gray-500">{l.unit ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-red-600 font-bold">
                    {editing ? <input value={f.price} onChange={e => setF(l.rowId, "price", e.target.value)} placeholder={t("ر.س", "SAR")} className="w-16 text-center border border-purple-200 rounded-lg px-1 py-0.5 outline-none focus:border-purple-400" /> : money(l, "unitPriceSar", "unitPriceHalalas")}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono">
                    <div className="text-gray-600">{money(l, "lastArrivalPriceSar", "lastArrivalPriceHalalas")}</div>
                    {(l.priceDeltaSar != null || l.priceDeltaHalalas != null) && l.priceDirection && l.priceDirection !== "same" && l.priceDirection !== "unknown" && (
                      <div className={`text-[10px] font-bold ${arrowCls(l.priceDirection)}`}>{arrowIcon(l.priceDirection)} {fmtAmt(l.priceDeltaSar ?? (l.priceDeltaHalalas / 100), lang)}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono">
                    {editing
                      ? <div className="flex items-center justify-center gap-1">
                        <input value={f.ordQty} onChange={e => setF(l.rowId, "ordQty", e.target.value)} title={t("المطلوب", "Ordered")} className="w-12 text-center border border-purple-200 rounded-lg px-1 py-0.5 outline-none focus:border-purple-400" />
                        <span className="text-gray-300">/</span>
                        <input value={f.rcvQty} onChange={e => setF(l.rowId, "rcvQty", e.target.value)} placeholder="—" title={t("المستلم", "Received")} className="w-12 text-center border border-emerald-200 rounded-lg px-1 py-0.5 outline-none focus:border-emerald-400" />
                        <button onClick={() => saveRow(l)} disabled={patchMut.isPending} className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold disabled:opacity-50">{t("حفظ", "Save")}</button>
                      </div>
                      : (qty ?? "—")}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-blue-700 font-bold">{money(l, "totalSar", "totalHalalas")}</td>
                  <td className="px-3 py-2.5 text-center">
                    <input type="checkbox" checked={!!l.documented} disabled={patchMut.isPending} onChange={() => toggleDoc(l)} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-500 text-left">
        {t("إجمالي الفاتورة:", "Invoice Total:")} <span className="font-bold">{fmtAmt(rec.amount, lang)} {t("ر.س", "SAR")}</span> · {t("موثّق", "Documented")} {documentedCount}/{lines.length}
      </p>
      {rec.actionsNode}
    </div>
  );
}

export { hasUnavailablePurchaseMatch };

// ════════════════════════════════════════════════════════════
// ACCOUNTANT PURCHASES — Dual-Lens Professional View
// ════════════════════════════════════════════════════════════
export function AccPurchases({ navigate, setModal, setDetailId, ops, approveOp, rejectOp, bulkApprove }: PageProps) {
  const { t, lang, dir } = useLang();
  const en = lang === "en";
  const qc = useQueryClient();
  const exportOpsMut = useExportOperations();
  const exportPurMut = useExportAccountantPurchases();
  const approveMut = useApproveOperation();
  const rejectMut = useRejectOperation();
  const bulkApproveMut = useBulkApprove();
  const bulkDocMut = useBulkDocumentPurchases();
  // T06 live surfaces (company-surface handlers, shared with the accountant platform).
  const { data: purchasesList } = usePurchasesList({ pageSize: 100 });
  const { data: suppliersLive = [] } = useSuppliers();
  const { data: brandsLive = [] } = useAccountantInventoryBrands();
  const { data: branchesLive = [] } = useInventoryBranches();
  const { data: returnsLive = [] } = usePurchaseReturns();
  const createSupplierMut = useCreateSupplier();
  const reviewReturnMut = useReviewPurchaseReturn();
  const finalApproveReturnMut = useFinalApprovePurchaseReturn();
  const returnForReviewMut = useReturnForReviewPurchaseReturn();

  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", category: "", contactName: "", phone: "", email: "", isExternal: false });
  const purSummary = purchasesList?.meta?.summary?.purchases;
  const ALL = "الكل";
  const [viewMode, setViewMode] = useState<"supplier" | "branch" | "suppliers" | "returns">("supplier");
  const [filterBrand, setFilterBrand] = useState(ALL);
  const [filterSupplier, setFilterSupplier] = useState(ALL);
  const [filterBranch, setFilterBranch] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [filterMatch, setFilterMatch] = useState(ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifiedRows, setVerifiedRows] = useState<Record<string, boolean>>({});
  const [inFlightId, setInFlightId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [purAttachModal, setPurAttachModal] = useState<{ recId: string; invNum: string; idx: number; attachments: OperationAttachment[] } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ recId: string; invNum: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  const serverFilterParams = {
    groupBy: (viewMode === "branch" ? "branch" : "supplier") as "supplier" | "branch",
    ...(filterBrand !== ALL ? { brandId: filterBrand } : {}),
    ...(filterSupplier !== ALL ? { supplierId: filterSupplier } : {}),
    ...(filterBranch !== ALL ? { branchId: filterBranch } : {}),
    ...(filterStatus !== ALL ? { status: filterStatus } : {}),
    ...(filterMatch !== ALL ? { match: filterMatch } : {}),
    ...(search.trim() ? { q: search.trim() } : {}),
  };

  // Grouped purchase cards (GET /company/me/purchases) — supplier/branch cards
  // that already nest invoices WITH lines (lastArrivalPrice, documented, match).
  // We flatten the invoices into the flat record shape the cards/panel expect;
  // the id is the OPERATION id so line PATCH/توثيق target the right op.
  const { data: purCards } = useAccountantPurchases({ ...serverFilterParams, page, pageSize: 20 });
  const purMeta = (purCards as any)?.meta;
  const purKpis = purMeta?.kpis;
  const purGroupCards: any[] = Array.isArray((purCards as any)?.data) ? (purCards as any).data : [];
  const realPurRecords: any[] = purGroupCards.flatMap((c: any) =>
    (Array.isArray(c?.invoices) ? c.invoices : []).map((inv: any) => ({
      id: inv?.id ?? inv?.publicId ?? "",
      branchId: inv?.branchId ?? c?.branchId ?? null,
      branch: inv?.branchName ?? "—",
      supplierId: inv?.supplierId ?? c?.supplierId ?? null,
      supplier: inv?.supplierName ?? "—",
      invNum: inv?.invoiceNumber ?? inv?.publicId ?? "—",
      date: inv?.date ?? "—",
      status: inv?.status ?? "pending",
      match: inv?.match ?? null,
      amount: typeof inv?.totalHalalas === "number" ? inv.totalHalalas / 100 : (inv?.totalSar ?? 0),
      attachments: Array.isArray(inv?.attachments) ? inv.attachments : [],
      attachmentsCount: inv?.attachmentsCount ?? (Array.isArray(inv?.attachments) ? inv.attachments.length : 0),
      documentType: inv?.documentType ?? null,
      hasInvoice: Boolean(inv?.hasInvoice),
      documentedCaption: inv?.documentedCaption,
      lines: Array.isArray(inv?.lines) ? inv.lines : [],
      items: (Array.isArray(inv?.lines) ? inv.lines : []).map((l: any) => ({ name: l?.item ?? "" })),
    })),
  );
  const EFFECTIVE_PUR_RECORDS = (realPurRecords.length > 0 ? realPurRecords : PUR_RECORDS) as typeof PUR_RECORDS;

  const SUPPLIER_LIST = [...new Set(EFFECTIVE_PUR_RECORDS.map((r: any) => r.supplier))];
  const BRANCH_LIST = [...new Set(EFFECTIVE_PUR_RECORDS.map((r: any) => r.branch))];
  const supplierOptions = suppliersLive.length > 0
    ? suppliersLive.map((s: any) => ({ id: String(s.id), name: String(s.name) }))
    : purGroupCards.filter((c: any) => c?.supplierId && c?.supplierName).map((c: any) => ({ id: String(c.supplierId), name: String(c.supplierName) }));
  const branchOptions = Array.isArray(branchesLive) && branchesLive.length > 0
    ? branchesLive.map((b: any) => ({ id: String(b.id), name: String(b.name) }))
    : purGroupCards.filter((c: any) => c?.branchId && c?.branchName).map((c: any) => ({ id: String(c.branchId), name: String(c.branchName) }));
  const brandOptions = Array.isArray(brandsLive)
    ? brandsLive.map((b: any) => ({ id: String(b.id), name: String(b.name) }))
    : [];

  const filtered = EFFECTIVE_PUR_RECORDS.filter((r: any) => {
    if (filterSupplier !== ALL && String(r.supplierId ?? "") !== filterSupplier && r.supplier !== filterSupplier) return false;
    if (filterBranch !== ALL && String(r.branchId ?? "") !== filterBranch && r.branch !== filterBranch) return false;
    if (filterStatus !== ALL && r.status !== filterStatus) return false;
    if (filterMatch !== ALL && r.match !== filterMatch) return false;
    if (search && !r.branch.includes(search) && !r.supplier.includes(search) && !r.invNum.includes(search) && !r.items.some((it: any) => it.name.includes(search))) return false;
    return true;
  });

  // Status reflects confirmed server state only; never flip pending -> approved optimistically (PUR-F09).
  const effectiveFiltered = filtered;
  const pending = effectiveFiltered.filter(r => r.status === "pending");
  const approvableIds = filterApprovablePurchaseIds(pending as any[]);
  const approvablePending = pending.filter((r: any) => approvableIds.includes(r.id));
  const totalVal = effectiveFiltered.reduce((s, r) => s + r.amount, 0);
  const diffCount = effectiveFiltered.filter(r => r.match === "diff").length;
  const hasFilters = filterBrand !== ALL || filterSupplier !== ALL || filterBranch !== ALL || filterStatus !== ALL || filterMatch !== ALL || search;

  const approveRecord = async (rec: any) => {
    if (!rec?.id || inFlightId) return;
    if (hasUnavailablePurchaseMatch(rec)) {
      setActionError(t("مطابقة غير متاحة — لا يمكن اعتماد الفاتورة قبل توفر بيانات ودليل المطابقة.", "Match unavailable — cannot approve invoice before match data and evidence are available."));
      return;
    }
    setActionError(null);
    setInFlightId(rec.id);
    try {
      await approveMut.mutateAsync({ id: rec.id });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["accountant", "purchases"] }),
        qc.invalidateQueries({ queryKey: ["platform", "accountant", "purchases"] }),
        qc.invalidateQueries({ queryKey: ["operations"] }),
        qc.invalidateQueries({ queryKey: queryKeys.accDashboard }),
      ]);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || t("فشل اعتماد الفاتورة على الخادم. بقيت الفاتورة معلقة.", "Server approval failed. Invoice remains pending."));
    } finally {
      setInFlightId(null);
    }
  };

  // «موافقة جماعية» = real financial bulk approval endpoint (POST /operations/bulk-approve);
  // bulk documentation remains a separate action (documentAll).
  const approveAll = async () => {
    if (inFlightId || approvablePending.length === 0) return;
    setActionError(null);
    setInFlightId("__bulk__");
    try {
      const ids = approvablePending.map((r: any) => r.id);
      const res = await bulkApproveMut.mutateAsync({ operationIds: ids });
      const failedCount = Array.isArray(res?.failed) ? res.failed.length : 0;
      const approvedCount = Array.isArray(res?.approved) ? res.approved.length : 0;
      if (failedCount > 0) {
        setActionError(
          t(
            `تم اعتماد ${approvedCount} عملية وفشلت ${failedCount} وبقيت معلقة.`,
            `Approved ${approvedCount} operation(s); ${failedCount} failed and remain pending.`,
          ),
        );
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["accountant", "purchases"] }),
        qc.invalidateQueries({ queryKey: ["platform", "accountant", "purchases"] }),
        qc.invalidateQueries({ queryKey: ["operations"] }),
        qc.invalidateQueries({ queryKey: queryKeys.accDashboard }),
      ]);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || t("فشل الاعتماد الجماعي على الخادم. بقيت الفواتير معلقة.", "Server bulk approval failed. Invoices remain pending."));
    } finally {
      setInFlightId(null);
    }
  };

  const documentAll = async () => {
    if (inFlightId || pending.length === 0) return;
    setActionError(null);
    setInFlightId("__bulk_doc__");
    try {
      await bulkDocMut.mutateAsync(pending.map((r: any) => r.id).filter(Boolean));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["accountant", "purchases"] }),
        qc.invalidateQueries({ queryKey: ["platform", "accountant", "purchases"] }),
      ]);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || t("فشل التوثيق الجماعي على الخادم.", "Server bulk documentation failed."));
    } finally {
      setInFlightId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectModal || rejectBusy || !rejectReason.trim()) return;
    setRejectBusy(true);
    setRejectError(null);
    try {
      await rejectMut.mutateAsync({ id: rejectModal.recId, reason: "other", notes: rejectReason.trim() });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["accountant", "purchases"] }),
        qc.invalidateQueries({ queryKey: ["platform", "accountant", "purchases"] }),
        qc.invalidateQueries({ queryKey: queryKeys.operations() }),
        qc.invalidateQueries({ queryKey: queryKeys.accDashboard }),
      ]);
      setRejectModal(null);
      setRejectReason("");
    } catch (err: any) {
      setRejectError(err?.response?.data?.message || err?.message || t("فشل رفض الفاتورة على الخادم.", "Server rejection failed."));
    } finally {
      setRejectBusy(false);
    }
  };
  const toggleVerify = (recId: string, key: string) => setVerifiedRows(p => ({ ...p, [recId + "-" + key]: !p[recId + "-" + key] }));

  const isMissingInvoiceDoc = (rec: any): boolean => {
    const dt = rec?.documentType;
    if ((dt === "delivery_note" || dt === "receipt_without_document") && !rec?.hasInvoice) return true;
    return false;
  };

  const renderMatchBadge = (rec: any) => {
    if (rec?.documentType === "delivery_note" && !rec?.hasInvoice) {
      return <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">{t("سند تسليم · بانتظار الفاتورة", "Delivery Note · Awaiting Invoice")}</Badge>;
    }
    if (rec?.documentType === "receipt_without_document" && !rec?.hasInvoice) {
      return <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">{t("استلام مؤقت بدون مستند", "Temporary Receipt · No Document")}</Badge>;
    }
    if (hasUnavailablePurchaseMatch(rec)) {
      return <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">{t("مطابقة غير متاحة", "Match unavailable")}</Badge>;
    }
    const matchKey: "exact" | "diff" | "review" | null =
      rec.match === "exact" || rec.match === "diff" || rec.match === "review" ? rec.match : null;
    const cfg = matchKey ? MATCH_CFG[matchKey] : { cls: "bg-gray-100 text-gray-600 border-gray-200", label: String(rec.match) };
    return <Badge className={`${cfg.cls} border text-[10px]`}>{en ? (rec.match === "exact" ? "Exact" : "Diff") : cfg.label}</Badge>;
  };

  const renderRecordActions = (rec: any, recStatus: string) => {
    if (recStatus !== "pending") return null;
    const matchBlocked = hasUnavailablePurchaseMatch(rec);
    const docBlocked = isMissingInvoiceDoc(rec);
    const busy = inFlightId === rec.id || inFlightId === "__bulk__";
    return (
      <div className="space-y-2 pt-2">
        {(matchBlocked || docBlocked) && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            {docBlocked
              ? t("لا يمكن الاعتماد قبل رفع الفاتورة الضريبية من نافذة المرفقات.", "Cannot approve before uploading the tax invoice via Attachments.")
              : t("مطابقة غير متاحة — يلزم توفر بنود/دليل الفاتورة قبل الموافقة.", "Match unavailable — invoice lines or supporting evidence required before approval.")}
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          <Btn size="sm" variant="success" disabled={matchBlocked || docBlocked || busy} onClick={() => void approveRecord(rec)}>
            <ThumbsUp size={12} /> {t("موافقة على الفاتورة", "Approve Invoice")}
          </Btn>
          <Btn size="sm" variant="danger" disabled={busy} onClick={() => { setRejectError(null); setRejectReason(""); setRejectModal({ recId: rec.id, invNum: rec.invNum }); }}>
            <ThumbsDown size={12} /> {t("رفض", "Reject")}
          </Btn>
        </div>
      </div>
    );
  };

  // Supplier groups for supplier-mode
  const supplierGroups = SUPPLIER_LIST.map(sup => {
    const recs = effectiveFiltered.filter(r => r.supplier === sup);
    if (!recs.length) return null;
    const branches = [...new Set(recs.map(r => r.branch))];
    const total = recs.reduce((s, r) => s + r.amount, 0);
    const pCount = recs.filter(r => r.status === "pending").length;
    const dCount = recs.filter(r => r.match === "diff").length;
    const serverCard = purGroupCards.find((c: any) => c?.supplierName === sup || c?.title === sup);
    const dailyAverageHalalas: number | null = typeof serverCard?.dailyAverageHalalas === "number" ? serverCard.dailyAverageHalalas : null;
    return { sup, recs, branches, total, pCount, dCount, dailyAverageHalalas };
  }).filter(Boolean);

  // Branch groups for branch-mode
  const branchGroups = BRANCH_LIST.map(br => {
    const recs = effectiveFiltered.filter(r => r.branch === br);
    if (!recs.length) return null;
    const suppliers = [...new Set(recs.map(r => r.supplier))];
    const total = recs.reduce((s, r) => s + r.amount, 0);
    const pCount = recs.filter(r => r.status === "pending").length;
    return { br, recs, suppliers, total, pCount };
  }).filter(Boolean);

  // Shared expandable product panel
  const renderItemsPanel = (rec: PurRecord) => {
    const isEditing = editingRecId === rec.id;
    const recStatus = effectiveFiltered.find(r => r.id === rec.id)?.status ?? rec.status;
    return (
      <div className="px-5 pb-5 bg-gray-50/40 space-y-3">
        {/* Invoice meta bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-3 mb-1 p-3 bg-white rounded-xl border border-blue-100">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-700 break-words">{t("المورد:", "Supplier:")} <span className="text-blue-700">{rec.supplier}</span></p>
            <p className="text-xs text-gray-500 mt-0.5 break-words">{t("رقم الفاتورة:", "Invoice #:")} <span className="font-mono font-semibold text-purple-600">{rec.invNum}</span> · {rec.date}</p>
          </div>
          <div className="text-start sm:text-end">
            <p className="text-xs text-gray-400">{t("الفرع", "Branch")}</p>
            <p className="text-xs font-semibold text-gray-700">{rec.branch}</p>
          </div>
          <div className="text-start sm:text-end">
            <p className="text-xs text-gray-400">{t("إجمالي الفاتورة", "Invoice Total")}</p>
            <p className="font-mono font-bold text-blue-700">{fmtAmt(rec.amount, lang)} {t("ر.س", "SAR")}</p>
          </div>
          {/* Attachment + edit controls */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <button onClick={() => setPurAttachModal({ recId: rec.id, invNum: rec.invNum, idx: 0, attachments: Array.isArray((rec as any).attachments) ? (rec as any).attachments : [] })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-all">
              <Paperclip size={11} /> {t("المرفقات", "Attachments")} ({(rec as any).attachmentsCount ?? (Array.isArray((rec as any).attachments) ? (rec as any).attachments.length : 0)})
            </button>
            <button onClick={() => setEditingRecId(isEditing ? null : rec.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 text-xs font-semibold transition-all">
              <Edit3 size={11} /> {isEditing ? t("إنهاء التعديل", "Done") : t("تعديل البنود", "Edit Lines")}
            </button>
          </div>
        </div>

        {/* Simplified editable items table — item / unit / price / qty / total */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border border-gray-100 rounded-xl overflow-hidden text-xs" dir={dir}>
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-start font-semibold text-gray-600">{t("اسم الصنف", "Item Name")}</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("الوحدة", "Unit")}</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("سعر الوحدة", "Unit Price")}</th>
                <th className="px-3 py-2 text-center font-semibold text-sky-700 bg-sky-50/60">{t("آخر سعر وصول", "Last Price")}</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("الكمية", "Qty")}</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("الإجمالي", "Total")}</th>
                <th className="px-3 py-2 text-center font-semibold text-emerald-700 bg-emerald-50/50">{t("توثيق", "Verify")} ✓</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rec.items.map((row, i) => {
                const vKey = `${row.name}-${i}`;
                const verified = verifiedRows[rec.id + "-" + vKey];
                const total = row.received * row.price;
                return (
                  <tr key={i} className={`hover:bg-gray-50 ${verified ? "bg-emerald-50/30" : ""}`}>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">
                      {isEditing
                        ? <input defaultValue={row.name} className="w-full border border-purple-200 rounded-lg px-2 py-1 text-xs bg-white focus:border-purple-400 outline-none" />
                        : row.name
                      }
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-500">{row.unit}</td>
                    <td className="px-3 py-2.5 text-center font-mono">
                      {isEditing
                        ? <input defaultValue={String(row.price)} className="w-20 text-center border border-purple-200 rounded-lg px-2 py-1 text-xs font-mono bg-white focus:border-purple-400 outline-none" />
                        : <span className={`font-bold ${row.price > row.histPrice ? "text-red-600" : "text-gray-800"}`}>{row.price} {t("ر.س", "SAR")}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 text-center bg-sky-50/20">
                      <p className="font-mono text-gray-500">{row.histPrice} {t("ر.س", "SAR")}</p>
                      {row.price > row.histPrice && <p className="text-[9px] text-red-500 font-bold">▲ +{(row.price - row.histPrice).toFixed(1)}</p>}
                      {row.price < row.histPrice && <p className="text-[9px] text-emerald-500 font-bold">▼ -{(row.histPrice - row.price).toFixed(1)}</p>}
                      {row.price === row.histPrice && <p className="text-[9px] text-gray-400">{t("مطابق", "Match")}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono">
                      {isEditing
                        ? <input defaultValue={String(row.received)} className="w-16 text-center border border-purple-200 rounded-lg px-2 py-1 text-xs font-mono bg-white focus:border-purple-400 outline-none" />
                        : <span className="font-bold text-gray-800">{row.received}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-semibold text-blue-700">{fmtAmt(total, lang)} {t("ر.س", "SAR")}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => toggleVerify(rec.id, vKey)}
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all ${verified ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 hover:border-emerald-400"}`}>
                        {verified && <CheckCircle2 size={12} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={5} className="px-3 py-2.5 font-bold text-gray-900 text-right">{t("إجمالي الفاتورة", "Invoice Total")}</td>
                <td className="px-3 py-2.5 text-center font-black font-mono text-blue-800">{fmtAmt(rec.items.reduce((s, r) => s + r.received * r.price, 0), lang)} {t("ر.س", "SAR")}</td>
                <td className="px-3 py-2.5 text-center text-[10px] text-gray-500">
                  {Object.keys(verifiedRows).filter(k => k.startsWith(rec.id + "-")).length}/{rec.items.length} {t("موثّق", "verified")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {isEditing && (
          <div className="flex gap-2">
            <Btn size="sm" variant="success" onClick={() => setEditingRecId(null)}><CheckCircle2 size={11} /> {t("حفظ التعديلات", "Save Changes")}</Btn>
            <Btn size="sm" onClick={() => setEditingRecId(null)}>{t("إلغاء", "Cancel")}</Btn>
          </div>
        )}
        {recStatus === "pending" && (
          <div className="space-y-2 pt-1">
            {renderRecordActions(rec, recStatus)}
            {rec.items.some(r => r.price > r.histPrice) && (
              <button onClick={() => setPriceNotice(en
                ? `Price variance note prepared for ${rec.supplier}: ${rec.items.filter(r => r.price > r.histPrice).map(r => `${r.name} (${r.price} vs ${r.histPrice} SAR)`).join(", ")}`
                : `تم تجهيز ملاحظة فرق السعر للمورد ${rec.supplier}: ${rec.items.filter(r => r.price > r.histPrice).map(r => `${r.name} (${r.price} مقابل ${r.histPrice} ر.س)`).join("، ")}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold hover:bg-sky-100 transition-all">
                <Send size={11} /> {t("طلب تعديل من المورد", "Request Price Adjustment")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("موديول المشتريات", "Purchases Module")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("مطابقة الفواتير بالمنتجات والموردين — عرض حسب المورد أو حسب الفرع", "Match invoices to items and suppliers — view by supplier or by branch")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pending.length > 0 && (
            <Btn size="sm" disabled={!!inFlightId} onClick={() => void documentAll()}>
              <CheckSquare size={12} /> {t("توثيق جماعي للبنود", "Bulk Document Lines")} ({pending.length})
            </Btn>
          )}
          {approvablePending.length > 0 && (
            <Btn variant="success" size="sm" disabled={!!inFlightId} onClick={() => void approveAll()}>
              <CheckCircle2 size={12} /> {t("موافقة جماعية", "Bulk Approve")} ({approvablePending.length})
            </Btn>
          )}
        </div>
      </div>
      {actionError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-center justify-between gap-2">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
        </div>
      )}
      {priceNotice && (
        <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800 flex items-center justify-between gap-2">
          <span>{priceNotice}</span>
          <button type="button" onClick={() => setPriceNotice(null)} className="text-sky-600 hover:text-sky-800"><X size={14} /></button>
        </div>
      )}

      {/* KPI cards — real GET /company/me/purchases → meta.kpis (2026-08-09) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label={t("إجمالي قيمة المشتريات", "Total Purchases")}
          value={purKpis?.totalPurchasesSar != null ? `${(purKpis.totalPurchasesSar / 1000).toFixed(1)}K ${t("ر.س", "SAR")}` : `${(totalVal / 1000).toFixed(1)}K ${t("ر.س", "SAR")}`}
          sub={t("الفترة المحددة", "Selected period")} icon={<ShoppingCart size={18} className="text-blue-600" />} accent="blue" />
        <KpiCard label={t("فواتير معلقة", "Pending Invoices")} value={String(purKpis?.pendingInvoices ?? pending.length)} sub={t("تنتظر المراجعة", "Awaiting review")} icon={<Clock size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("فواتير بفروق", "Invoices w/ Variance")} value={String(purKpis?.diffInvoices ?? diffCount)} sub={t("كمية أو سعر", "Qty or price")} icon={<AlertTriangle size={18} className="text-red-600" />} accent="red" />
        <KpiCard label={t("موردون نشطون", "Active Suppliers")} value={String(purKpis?.activeSuppliers ?? suppliersLive.length ?? SUPPLIER_LIST.length)} sub={t("هذه الفترة", "This period")} icon={<Truck size={18} className="text-purple-600" />} accent="purple" />
      </div>

      {/* View mode tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-1">
        <div className="w-full lg:w-auto">
          <div className="flex flex-wrap bg-gray-100 rounded-xl p-1 gap-1">
            {([["supplier", `🏭 ${t("عرض حسب المورد", "By Supplier")}`], ["branch", `🏪 ${t("عرض حسب الفرع", "By Branch")}`], ["suppliers", `📇 ${t("الموردون المعتمدون", "Suppliers")}`], ["returns", `↩️ ${t("المرتجعات", "Returns")}`]] as const).map(([mode, label]) => (
              <button key={mode} onClick={() => { setViewMode(mode); setExpandedId(null); setPage(1); }}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${viewMode === mode ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 inline-block" />{t("استهلاك يومي", "Daily Avg")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-200 inline-block" />{t("سعر تاريخي", "Hist. Price")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" />{t("توثيق المحاسب", "Accountant Verify")}</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("العلامة التجارية / البراند", "Brand")}</label>
            <select value={filterBrand} onChange={e => { setFilterBrand(e.target.value); setPage(1); }} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value={ALL}>{t("الكل", "All")}</option>
              {brandOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المورد", "Supplier")}</label>
            <select value={filterSupplier} onChange={e => { setFilterSupplier(e.target.value); setPage(1); }} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value={ALL}>{t("الكل", "All")}</option>
              {supplierOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفرع", "Branch")}</label>
            <select value={filterBranch} onChange={e => { setFilterBranch(e.target.value); setPage(1); }} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value={ALL}>{t("الكل", "All")}</option>
              {branchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحالة", "Status")}</label>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value={ALL}>{t("الكل", "All")}</option>
              {["pending", "approved", "rejected"].map(s => (
                <option key={s} value={s}>{s === "pending" ? t("معلق", "Pending") : s === "approved" ? t("معتمد", "Approved") : t("مرفوض", "Rejected")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المطابقة", "Match")}</label>
            <select value={filterMatch} onChange={e => { setFilterMatch(e.target.value); setPage(1); }} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value={ALL}>{t("الكل", "All")}</option>
              <option value="exact">{t("مطابق تاماً", "Exact match")}</option>
              <option value="diff">{t("به فروق", "Has variance")}</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("بحث (فرع / مورد / منتج / مطعم)", "Search (branch / supplier / item)")}</label>
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-2">
              <Search size={11} className="text-gray-400 flex-shrink-0" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t("ابحث بالاسم أو المورد...", "Search by name or supplier...")} className="flex-1 text-xs outline-none min-w-0" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {hasFilters && (
            <button onClick={() => { setFilterBrand(ALL); setFilterSupplier(ALL); setFilterBranch(ALL); setFilterStatus(ALL); setFilterMatch(ALL); setSearch(""); setPage(1); }}
              className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={10} /> {t("مسح الفلاتر", "Clear Filters")}</button>
          )}
          <button onClick={() => exportPurMut.mutate({ ...serverFilterParams, format: "xlsx" })}
            disabled={exportPurMut.isPending}
            className="ms-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all disabled:opacity-50">
            <FileText size={11} /> {t("تصدير Excel", "Export Excel")}
          </button>
        </div>
      </div>

      {viewMode === "suppliers"
        ? (
          /* ── SUPPLIERS DIRECTORY (T06 §5) — real GET /company/me/suppliers ── */
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-sm">{t("الموردون المعتمدون", "Approved Suppliers")} ({suppliersLive.length})</h3>
              <Btn variant="primary" size="sm" onClick={() => setShowAddSupplier(true)}>
                <Plus size={13} /> {t("إضافة مورد", "Add Supplier")}
              </Btn>
            </div>
            {suppliersLive.length === 0
              ? <EmptyState icon="📇" title={t("لا يوجد موردون", "No Suppliers")} desc={t("لم تُرجع الخدمة أي موردين", "No suppliers returned")} />
              : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suppliersLive.map(s => {
                    const stars = Math.round((s.rating ?? 0) / 10);  // 0–50 scale → ★
                    return (
                      <div key={s.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-lg">🏭</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{s.name} {s.category && <span className="text-[10px] text-gray-400 font-normal">· {s.category}</span>}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{s.itemsCount} {t("صنف", "items")} · {s.monthlyOrderCount} {t("طلبية/شهر", "orders/mo")}{s.contactPhone ? ` · ${s.contactPhone}` : ""}</p>
                          </div>
                          <div className="text-end flex-shrink-0">
                            <div className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map(i => <span key={i} className={`text-sm ${i <= stars ? "text-amber-400" : "text-gray-200"}`}>★</span>)}</div>
                            {!s.isActive && <span className="text-[9px] text-red-500 font-semibold">{t("غير نشط", "inactive")}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )
        : viewMode === "returns"
          ? (
            /* ── RETURNS (T06 §6) — real read-only GET /company/me/purchases/returns ── */
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60"><h3 className="font-bold text-gray-900 text-sm">{t("المرتجعات", "Returns")}</h3></div>
              {returnsLive.length === 0
                ? <div className="py-8"><EmptyState icon="↩️" title={t("لا توجد مرتجعات", "No Returns")} desc={t("لم تُرجع الخدمة أي مرتجعات", "No returns returned")} /></div>
                : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[720px]">
                    <div className="grid grid-cols-7 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500">
                      <span>{t("رقم المرتجع", "Return #")}</span><span>{t("الأمر", "Order")}</span><span>{t("الفرع", "Branch")}</span><span className="text-center">{t("التاريخ", "Date")}</span><span className="text-center">{t("الحالة", "Status")}</span><span className="text-center">{t("المراجعة المالية", "Financial Review")}</span><span className="text-end">{t("المبلغ / الإجراءات", "Amount / Actions")}</span>
                    </div>
                    {returnsLive.map(r => {
                      const finStatus = r.financialStatus ?? "pending_review";
                      const isReviewed = finStatus === "reviewed_by_accountant";
                      const isApproved = finStatus === "approved_by_head";
                      return (
                        <div key={r.id} className="grid grid-cols-7 px-4 py-3 border-b border-gray-50 last:border-0 text-xs items-center">
                          <span className="font-mono font-semibold text-gray-700">{r.returnNumber}</span>
                          <span className="text-gray-500">{r.orderNumber ?? "—"}</span>
                          <span className="text-gray-600 truncate">{r.branchName ?? "—"}</span>
                          <span className="text-center text-gray-500">{r.returnDate}</span>
                          <span className="text-center"><Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px]">{r.statusLabelAr}</Badge></span>
                          <span className="text-center">
                            {isApproved ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">✓ {t("معتمد ماليًا", "Approved")}</Badge>
                            ) : isReviewed ? (
                              <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">✓ {t("تمت المراجعة", "Reviewed")}</Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">⏳ {t("بانتظار المراجعة", "Pending Review")}</Badge>
                            )}
                          </span>
                          <div className="text-end flex flex-col items-end gap-1">
                            <span className="font-mono font-bold text-gray-800">{fmtAmt(r.totalReturnAmountHalalas / 100, lang)} {t("ر.س", "SAR")}</span>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {!isReviewed && !isApproved && (
                                <button
                                  type="button"
                                  onClick={() => reviewReturnMut.mutate({ id: r.id })}
                                  disabled={reviewReturnMut.isPending}
                                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                >
                                  {t("مراجعة", "Review")}
                                </button>
                              )}
                              {isReviewed && !isApproved && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => finalApproveReturnMut.mutate({ id: r.id })}
                                    disabled={finalApproveReturnMut.isPending}
                                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                  >
                                    {t("اعتماد نهائي", "Approve")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => returnForReviewMut.mutate({ id: r.id })}
                                    disabled={returnForReviewMut.isPending}
                                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                                  >
                                    {t("إرجاع", "Return")}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
            </div>
          )
          : effectiveFiltered.length === 0
            ? <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><EmptyState icon="🔍" title={t("لا توجد نتائج", "No Results")} desc={t("غيّر الفلاتر للحصول على نتائج أخرى", "Adjust filters to see more results")} /></div>
            : viewMode === "supplier"
              ? (
                /* ── SUPPLIER MODE: grouped by supplier ── */
                <div className="space-y-4">
                  {supplierGroups.map(g => {
                    if (!g) return null;
                    return (
                      <div key={g.sup} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Supplier header */}
                        <div className="px-4 sm:px-5 py-4 bg-gradient-to-l from-blue-50/30 to-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black text-lg flex-shrink-0">
                              {g.sup.slice(0, 1)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 truncate">{g.sup}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{g.recs.length} {t("فاتورة", "inv.")} · {g.branches.length} {g.branches.length === 1 ? t("فرع", "branch") : t("فروع", "branches")}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-between sm:justify-end">
                            {g.dCount > 0 && <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">⚠ {g.dCount} {t("فرق", "diff")}</Badge>}
                            {g.pCount > 0 && <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">⏳ {g.pCount} {t("معلق", "pending")}</Badge>}
                            <div className="text-end">
                              <p className="font-mono font-bold text-blue-700 text-base">{fmtAmt(g.total, lang)} {t("ر.س", "SAR")}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{t("يومياً:", "Daily:")} {fmtAmt(g.dailyAverageHalalas != null ? g.dailyAverageHalalas / 100 : g.total / 30, lang)} {t("ر.س", "SAR")}</p>
                            </div>
                          </div>
                        </div>
                        {/* Per-branch breakdown header */}
                        <div className="px-5 py-2 bg-gray-50/50 border-b border-gray-100 flex gap-3 flex-wrap">
                          {g.branches.map(br => {
                            const brRecs = g.recs.filter(r => r.branch === br);
                            const brTotal = brRecs.reduce((s, r) => s + r.amount, 0);
                            return (
                              <div key={br} className="flex items-center gap-1.5 text-xs">
                                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                                <span className="text-gray-600 font-medium">{br}</span>
                                <span className="font-mono text-blue-600">{fmtAmt(brTotal, lang)} {t("ر.س", "SAR")}</span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Invoice rows */}
                        {g.recs.map(rec => {
                          const recStatus = effectiveFiltered.find(r => r.id === rec.id)?.status ?? rec.status;
                          return (
                            <div key={rec.id} className={`border-b border-gray-100 last:border-0 ${rec.match === "diff" ? "border-s-4 border-s-red-400" : ""}`}>
                              <div className={`px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/60 cursor-pointer ${expandedId === rec.id ? "bg-blue-50/20" : ""}`}
                                onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-gray-800">{rec.branch}</span>
                                    <span className="font-mono text-xs text-purple-600">{rec.invNum}</span>
                                    {renderMatchBadge(rec)}
                                    <Badge className={`${STATUS_CFG[recStatus].cls} text-[10px]`}>{en ? (EN_STATUS_CFG[recStatus] || STATUS_CFG[recStatus].label) : STATUS_CFG[recStatus].label}</Badge>
                                  </div>
                                  <p className="text-[11px] text-gray-400 mt-0.5">{rec.items.length} {t("أصناف", "items")} · {rec.date}</p>
                                </div>
                                <span className="font-mono font-bold text-gray-800">{fmtAmt(rec.amount, lang)} {t("ر.س", "SAR")}</span>
                                {expandedId === rec.id ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                              </div>
                              {expandedId === rec.id && <PurchaseLinesPanel rec={{ ...rec, actionsNode: renderRecordActions(rec, recStatus) }} t={t} onAttach={() => setPurAttachModal({ recId: rec.id, invNum: rec.invNum, idx: 0, attachments: Array.isArray((rec as any).attachments) ? (rec as any).attachments : [] })} demoRender={() => renderItemsPanel(rec)} />}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )
              : (
                /* ── BRANCH MODE: grouped by branch ── */
                <div className="space-y-4">
                  {branchGroups.map(g => {
                    if (!g) return null;
                    return (
                      <div key={g.br} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Branch header */}
                        <div className="px-4 sm:px-5 py-4 bg-gradient-to-l from-emerald-50/30 to-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-base flex-shrink-0">🏪</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 truncate">{g.br}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{g.recs.length} {t("فاتورة", "inv.")} · {g.suppliers.length} {t("مورد", "supplier(s)")}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-between sm:justify-end">
                            {g.pCount > 0 && <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">⏳ {g.pCount} {t("معلق", "pending")}</Badge>}
                            <div className="text-end">
                              <p className="font-mono font-bold text-emerald-700 text-base">{fmtAmt(g.total, lang)} {t("ر.س", "SAR")}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{t("إجمالي مشتريات الفرع", "Branch total purchases")}</p>
                            </div>
                          </div>
                        </div>
                        {/* Supplier breakdown pills */}
                        <div className="px-5 py-2 bg-gray-50/50 border-b border-gray-100 flex gap-2 flex-wrap">
                          {g.suppliers.map(sup => {
                            const supRecs = g.recs.filter(r => r.supplier === sup);
                            const supTotal = supRecs.reduce((s, r) => s + r.amount, 0);
                            return (
                              <div key={sup} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1">
                                <Truck size={9} className="text-gray-400" />
                                <span className="text-gray-600">{sup}</span>
                                <span className="font-mono font-semibold text-gray-700">{fmtAmt(supTotal, lang)} {t("ر.س", "SAR")}</span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Invoice rows */}
                        {g.recs.map(rec => {
                          const recStatus = effectiveFiltered.find(r => r.id === rec.id)?.status ?? rec.status;
                          return (
                            <div key={rec.id} className={`border-b border-gray-100 last:border-0 ${rec.match === "diff" ? "border-s-4 border-s-red-400" : ""}`}>
                              <div className={`px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/60 cursor-pointer ${expandedId === rec.id ? "bg-emerald-50/20" : ""}`}
                                onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-gray-800">{rec.supplier}</span>
                                    <span className="font-mono text-xs text-purple-600">{rec.invNum}</span>
                                    {renderMatchBadge(rec)}
                                    <Badge className={`${STATUS_CFG[recStatus].cls} text-[10px]`}>{en ? (EN_STATUS_CFG[recStatus] || STATUS_CFG[recStatus].label) : STATUS_CFG[recStatus].label}</Badge>
                                  </div>
                                  <p className="text-[11px] text-gray-400 mt-0.5">{rec.items.length} {t("أصناف", "items")} · {rec.date} · {rec.items.map(i => i.name).join("، ")}</p>
                                </div>
                                <span className="font-mono font-bold text-gray-800">{fmtAmt(rec.amount, lang)} {t("ر.س", "SAR")}</span>
                                {expandedId === rec.id ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                              </div>
                              {expandedId === rec.id && <PurchaseLinesPanel rec={{ ...rec, actionsNode: renderRecordActions(rec, recStatus) }} t={t} onAttach={() => setPurAttachModal({ recId: rec.id, invNum: rec.invNum, idx: 0, attachments: Array.isArray((rec as any).attachments) ? (rec as any).attachments : [] })} demoRender={() => renderItemsPanel(rec)} />}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )
      }

      {(viewMode === "supplier" || viewMode === "branch") && (purMeta?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 text-xs">
          <span className="text-gray-500">
            {t("صفحة", "Page")} {purMeta?.page ?? page} {t("من", "of")} {purMeta?.totalPages ?? 1} ({purMeta?.total ?? 0})
          </span>
          <div className="flex items-center gap-2">
            <Btn size="sm" disabled={(purMeta?.page ?? page) <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              {t("السابق", "Previous")}
            </Btn>
            <Btn size="sm" disabled={(purMeta?.page ?? page) >= (purMeta?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>
              {t("التالي", "Next")}
            </Btn>
          </div>
        </div>
      )}

      {/* Real Attachment viewer modal for purchases (CORRECTION-05) */}
      {purAttachModal && (
        <PurchaseAttachmentModal
          modal={purAttachModal}
          onClose={() => setPurAttachModal(null)}
          onIdxChange={idx => setPurAttachModal(p => p ? { ...p, idx } : p)}
          onVerify={idx => toggleVerify(purAttachModal.recId, `attach-${idx}`)}
        />
      )}

      {/* Server-confirmed Reject dialog for purchases */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !rejectBusy && setRejectModal(null)}>
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} dir={dir}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm">{t("رفض فاتورة المشتريات —", "Reject Purchase Invoice —")} {rejectModal.invNum}</h3>
              <button type="button" disabled={rejectBusy} onClick={() => setRejectModal(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-xs font-semibold text-gray-700">{t("سبب الرفض", "Rejection Reason")} <span className="text-red-500">*</span></label>
              <textarea
                rows={3}
                disabled={rejectBusy}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder={t("أدخل سبب الرفض الواضح...", "Enter clear rejection reason...")}
                className="w-full rounded-lg border border-gray-200 p-2.5 text-xs outline-none focus:border-red-400"
              />
              {rejectError && <p role="alert" className="text-xs text-red-600">{rejectError}</p>}
              <div className="flex justify-end gap-2 pt-2 flex-wrap">
                <Btn size="sm" disabled={rejectBusy} onClick={() => setRejectModal(null)}>{t("إلغاء", "Cancel")}</Btn>
                <Btn size="sm" variant="danger" disabled={rejectBusy || !rejectReason.trim()} onClick={() => void submitReject()}>
                  <ThumbsDown size={12} /> {t("تأكيد الرفض", "Confirm Rejection")}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* T3.3 / PUR-04: Add Supplier Modal for Accountant */}
      {showAddSupplier && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddSupplier(false)} dir={dir}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{t("إضافة مورد جديد", "Add New Supplier")}</h3>
              <button type="button" onClick={() => setShowAddSupplier(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("اسم المورد", "Supplier Name")} *</label>
                <input value={supplierForm.name} onChange={e => setSupplierForm(v => ({ ...v, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفئة", "Category")}</label>
                <input value={supplierForm.category} onChange={e => setSupplierForm(v => ({ ...v, category: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المسؤول", "Contact Person")}</label>
                  <input value={supplierForm.contactName} onChange={e => setSupplierForm(v => ({ ...v, contactName: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الهاتف", "Phone")}</label>
                  <input value={supplierForm.phone} onChange={e => setSupplierForm(v => ({ ...v, phone: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("البريد الإلكتروني", "Email")}</label>
                <input value={supplierForm.email} onChange={e => setSupplierForm(v => ({ ...v, email: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={supplierForm.isExternal}
                  onChange={e => setSupplierForm(v => ({ ...v, isExternal: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span>{t("مورد خارجي (بدون بوابة إلكترونية)", "External Supplier (no portal login)")}</span>
              </label>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <Btn onClick={() => setShowAddSupplier(false)}>{t("إلغاء", "Cancel")}</Btn>
              <Btn variant="primary" disabled={!supplierForm.name.trim() || createSupplierMut.isPending} onClick={() => {
                createSupplierMut.mutate(supplierForm, {
                  onSuccess: () => {
                    setShowAddSupplier(false);
                    setSupplierForm({ name: "", category: "", contactName: "", phone: "", email: "", isExternal: false });
                  }
                });
              }}>
                {createSupplierMut.isPending ? t("جارٍ الحفظ...", "Saving...") : t("إضافة المورد", "Add Supplier")}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PurchaseAttachmentModal({
  modal,
  onClose,
  onIdxChange,
  onVerify,
}: {
  modal: { recId: string; invNum: string; idx: number; attachments: OperationAttachment[] };
  onClose: () => void;
  onIdxChange: (idx: number) => void;
  onVerify: (idx: number) => void;
}) {
  const { t, dir } = useLang();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data: opDetail } = useOperation(modal.recId);
  const verifyMut = useVerifyAttachment();
  const uploadMut = useDirectUpload();
  const liveAttachments: OperationAttachment[] = Array.isArray((opDetail as any)?.purchases?.attachments) && (opDetail as any).purchases.attachments.length > 0
    ? ((opDetail as any).purchases.attachments as OperationAttachment[])
    : Array.isArray((opDetail as any)?.attachments) && (opDetail as any).attachments.length > 0
      ? ((opDetail as any).attachments as OperationAttachment[])
      : modal.attachments;
  const total = liveAttachments.length;
  const safeIdx = total > 0 ? Math.min(modal.idx, total - 1) : 0;
  const current = liveAttachments[safeIdx] as (OperationAttachment & { url?: string; fileName?: string }) | undefined;
  const resolvedUrl = resolveAssetUrl(current?.publicUrl || current?.url);
  const fileName = current?.filename || current?.fileName || "";
  const isImage = Boolean(resolvedUrl && (/^image\//i.test(current?.mimeType ?? "") || isImageFile(fileName)));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()} dir={dir}>
        <div className="px-5 py-4 bg-gradient-to-l from-blue-600 to-blue-700 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">{t("مرفقات الفاتورة —", "Invoice Attachments —")} {modal.invNum}</h3>
            <p className="text-blue-200 text-xs mt-0.5">
              {total > 0 ? `${t("مرفق", "Attachment")} ${safeIdx + 1} ${t("من", "of")} ${total}` : t("لا توجد مرفقات", "No attachments")}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-blue-200 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">
          {!current ? (
            <div className="bg-gray-50 rounded-xl h-48 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 text-center px-4">
              <Paperclip size={32} className="text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-600">{t("لا توجد مرفقات مرفوعة لهذه الفاتورة", "No uploaded attachments for this invoice")}</p>
              <p className="text-xs text-gray-400 mt-1">{t("مطابقة غير متاحة — بانتظار رفع دليل التوثيق.", "Match unavailable — awaiting supporting document upload.")}</p>
            </div>
          ) : (
            <>
              <div className="bg-gray-100 rounded-xl min-h-52 p-4 flex flex-col items-center justify-center border border-gray-200">
                {isImage ? (
                  <img src={resolvedUrl} alt={current.label || fileName} className="max-h-48 rounded-lg object-contain mb-3" />
                ) : (
                  <Paperclip size={36} className="text-blue-400 mb-3" />
                )}
                <p className="text-sm font-semibold text-gray-700 break-words text-center">{current.label || fileName}</p>
                <p className="text-xs text-gray-500 mt-1 break-all">{fileName}</p>
                {resolvedUrl && (
                  <a href={resolvedUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all">
                    <Eye size={14} /> {t("عرض الملف الكامل", "View Full File")}
                  </a>
                )}
              </div>
              {total > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button type="button" disabled={safeIdx === 0}
                    onClick={() => onIdxChange(safeIdx - 1)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    <ChevronRight size={14} /> {t("السابق", "Prev")}
                  </button>
                  <div className="flex gap-1.5">
                    {liveAttachments.map((att: OperationAttachment, i: number) => (
                      <button type="button" key={att.id || i} onClick={() => onIdxChange(i)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${i === safeIdx ? "bg-blue-600" : "bg-gray-300"}`} />
                    ))}
                  </div>
                  <button type="button" disabled={safeIdx === total - 1}
                    onClick={() => onIdxChange(safeIdx + 1)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    {t("التالي", "Next")} <ChevronLeft size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-5 pb-4 flex gap-2 justify-end border-t border-gray-100 pt-3 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              await uploadMut.mutateAsync({
                file,
                ownerType: "operation",
                ownerId: modal.recId,
                label: "invoice",
              });
              await Promise.all([
                qc.invalidateQueries({ queryKey: ["accountant", "purchases"] }),
                qc.invalidateQueries({ queryKey: ["platform", "accountant", "purchases"] }),
                qc.invalidateQueries({ queryKey: ["operations", modal.recId] }),
                qc.invalidateQueries({ queryKey: ["operations", modal.recId, "attachments"] }),
              ]);
            }}
          />
          <Btn
            size="sm"
            variant="primary"
            disabled={uploadMut.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={12} /> {uploadMut.isPending ? t("جارٍ الرفع...", "Uploading...") : t("رفع فاتورة / مرفق", "Upload Invoice / Attachment")}
          </Btn>
          {resolvedUrl && current && (
            <a href={resolvedUrl} download={current.filename} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <Download size={12} /> {t("تحميل", "Download")}
            </a>
          )}
          <Btn size="sm" variant="success" disabled={!current || verifyMut.isPending} onClick={async () => {
            if (current?.id) {
              await verifyMut.mutateAsync(current.id);
            }
            onVerify(safeIdx);
            onClose();
          }}><CheckSquare size={12} /> {t("تم التحقق من المرفق", "Attachment Verified")}</Btn>
        </div>
      </div>
    </div>
  );
}
