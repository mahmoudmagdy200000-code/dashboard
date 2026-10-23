import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Paperclip,
  Lock,
  RotateCcw,
  Send,
  ChevronRight,
  ChevronsRight,
  Eye,
  Download,
  Check,
  Plus,
  Edit2,
  Edit3,
  X,
  FileText,
  XCircle,
  MessageSquare,
} from "lucide-react";
import type { Operation as ApiOperation } from "../../../../../api/types";
import { queryKeys } from "../../../../../api/queries/keys";
import {
  useBranchEmployeesLookup,
  useOperation,
  useAuditTrail,
  useAssignSalesVariance,
  usePatchSalesDetails,
  useRequestClarification,
  useCorrectOperation,
  useOperationAttachments,
} from "../../../../../api/queries";
import {
  getSalesActionPolicy,
  hasSalesReconciliationEvidence,
  isPkg6SalesReport,
  runSalesAction,
  SALES_RETURN_HINT,
} from "../../salesActionGuards";
import { KpiCard } from "../../components/KpiCard";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { PageHeader } from "../../components/PageHeader";
import { Breadcrumb } from "../../components/Breadcrumb";
import { ClarifyModal } from "../../../../shared/ClarifyModal";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt, resolveAssetUrl, formatDateLong } from "../../_shared/formatters";
import {
  MATCH_CFG,
  STATUS_CFG,
  ORIGIN_CFG,
  EN_MATCH_CFG,
  EN_STATUS_CFG,
  EN_ORIGIN,
} from "../../_shared/displayConfig";
import { PipelineBar } from "../../_shared/PipelineOverview";
import { LockBanner, buildAuditTrail } from "../../_shared/auditTrail";
import type { PageProps, Op } from "../../_shared/types";

function AccVarEmpRow({ branchId, row, onField, onRemove, onQuickFill, canRemove, t }: {
  branchId?: string; row: { empId: string; amount: string };
  onField: (field: "empId" | "amount", val: string) => void; onRemove: () => void; onQuickFill: () => void;
  canRemove: boolean; t: (ar: string, en: string) => string;
}) {
  const { data: emp } = useBranchEmployeesLookup(branchId, row.empId.length >= 3 ? row.empId : undefined);
  const empName = emp?.name ?? "";
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] text-gray-400">{t("رقم الموظف", "Employee ID")}</label>
        <input placeholder={t("مثال: 1001", "e.g. 1001")} value={row.empId}
          onChange={ev => onField("empId", ev.target.value)}
          className="w-24 text-center font-mono border border-red-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-red-400" />
      </div>
      <div className="flex flex-col gap-0.5 flex-1">
        <label className="text-[10px] text-gray-400">{t("اسم الموظف", "Employee Name")}</label>
        <div className="h-8 flex items-center px-2 rounded-lg bg-white border border-gray-100 text-xs text-gray-700 font-medium">
          {empName || <span className="text-gray-300">{t("يُعبأ تلقائياً", "Auto-filled")}</span>}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] text-gray-400">{t("المبلغ (ر.س)", "Amount (SAR)")}</label>
        <input placeholder="0.00" type="number" value={row.amount}
          onChange={ev => onField("amount", ev.target.value)}
          className="w-28 text-center font-mono border border-red-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-red-400" />
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] text-gray-400 opacity-0">⚡</label>
        <button title={t("تعبئة المتبقي تلقائياً", "Auto-fill remaining")} onClick={onQuickFill}
          className="px-2 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold hover:bg-amber-200 border border-amber-200">
          ⚡ {t("المتبقي", "Remaining")}
        </button>
      </div>
      {canRemove && (
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 opacity-0">×</label>
          <button onClick={onRemove} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><X size={13} /></button>
        </div>
      )}
    </div>
  );
}

export function AccSalesDetail({ navigate, setModal, setDetailId, detailId, ops, approveOp, addCorrectiveOp, role }: PageProps) {
  const { t, lang, dir } = useLang();
  const en = lang === "en";
  const op = ops.find(o => o.id === detailId);

  // Real reconciliation rides on GET /operations/{id} (T04 §4). `detailId` accepts
  // uuid or publicId; the row's `id` is the publicId, so fetch by op.id.
  const { data: detail } = useOperation(op?.id);
  const recon = detail?.reconciliation ?? null;
  const queryClient = useQueryClient();
  const salesContext = () => {
    const currentDetail = op ? queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id)) ?? detail : undefined;
    return {
      operation: op, role, detail: currentDetail, locked: currentDetail?.reconciliation?.isLocked,
      financialDataReady: hasSalesReconciliationEvidence(currentDetail?.reconciliation)
    };
  };
  const salesPolicy = getSalesActionPolicy(salesContext());
  const assignMut = useAssignSalesVariance();
  const patchMut = usePatchSalesDetails();
  const clarifyMut = useRequestClarification();
  const correctMut = useCorrectOperation();
  const [clarifyOpen, setClarifyOpen] = useState(false);
  // Real record-lifecycle log from GET /operations/{id}/audit-trail; fall back to
  // the locally-derived timeline only until the server events arrive.
  const { data: apiAudit } = useAuditTrail(op?.id);
  const auditEvents: any[] = (Array.isArray(apiAudit) && apiAudit.length > 0)
    ? apiAudit
    : (op ? buildAuditTrail(op) : []);

  const totalSales = detail?.amountHalalas == null ? null : detail.amountHalalas / 100;
  const fmtSales = (value: number | null | undefined) => value == null ? "—" : fmtAmt(value);
  const channels = recon?.channels ?? [];
  const coreCh = channels.filter(c => c.group === "core");
  const deliveryCh = channels.filter(c => c.group === "delivery");

  const [reconEditMode, setReconEditMode] = useState(false);
  // Per-channel edited actual amounts (SAR strings), keyed by channel key.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reconVarReason, setReconVarReason] = useState("");

  function beginEdit() {
    if (!op || !recon) return;
    runSalesAction(salesContext, "edit", () => {
      const seed: Record<string, string> = {};
      channels.forEach(c => { seed[c.key] = String(c.actualAmountHalalas / 100); });
      setDraft(seed);
      setReconVarReason(recon?.varianceReason ?? "");
      setReconEditMode(true);
    });
  }
  function saveEdit() {
    if (!op || !recon) return;
    runSalesAction(salesContext, "save", () => {
      const payloadChannels = channels.map(c => ({
        key: c.key,
        actualAmountHalalas: Math.round((parseFloat(draft[c.key] ?? String(c.actualAmountHalalas / 100)) || 0) * 100),
        posAmountHalalas: c.posAmountHalalas,
      }));
      patchMut.mutate(
        { operationId: op.id, payload: { channels: payloadChannels, varianceReason: reconVarReason || undefined } },
        { onSuccess: () => setReconEditMode(false) },
      );
    });
  }

  type VEmp = { empId: string; amount: string };
  const [varEmps, setVarEmps] = useState<VEmp[]>([{ empId: "", amount: "" }]);
  const setVarEmpField = (i: number, field: keyof VEmp, val: string) =>
    setVarEmps(p => p.map((e, j) => j === i ? { ...e, [field]: val } : e));

  const totalCollection = recon?.totals?.totalCollectionHalalas == null ? null : recon.totals.totalCollectionHalalas / 100;
  // Prefer the server-computed variance when reconciliation is present.
  const variance = recon?.totals?.varianceHalalas == null ? null : recon.totals.varianceHalalas / 100;
  const hasVariance = recon?.totals?.varianceHalalas != null && recon.totals.varianceHalalas !== 0;
  const isShortage = recon?.totals?.varianceHalalas != null && recon.totals.varianceHalalas < 0;
  const isSurplus = recon?.totals?.varianceHalalas != null && recon.totals.varianceHalalas > 0;
  const assignedTotal = varEmps.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const remaining = variance == null ? null : Math.round((Math.abs(variance) - assignedTotal) * 100) / 100;

  const isLocked = (recon?.isLocked ?? false) || op?.status === "final-approved";

  function confirmVarianceAssign() {
    if (!op || recon?.totals?.varianceHalalas == null) return;
    runSalesAction(salesContext, "assign", () => {
      const allocations = varEmps
        .filter(e => e.empId.trim() && (parseFloat(e.amount) || 0) > 0)
        .map(e => ({ empNumber: e.empId.trim(), amountHalalas: Math.round((parseFloat(e.amount) || 0) * 100) }));
      if (allocations.length === 0) return;
      assignMut.mutate({ operationId: op.id, payload: { allocations, notes: reconVarReason || undefined } });
    });
  }

  return (
    <div className="space-y-4">
      {salesPolicy.pkg6 && <p role="note" className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3">{t(SALES_RETURN_HINT.ar, SALES_RETURN_HINT.en)}</p>}
      {salesPolicy.staleMembers.length > 0 && <p role="status" className="text-xs text-amber-700">{t("بانتظار إعادة اعتماد ورديات أعضاء", "Awaiting reapproval of member shifts")}</p>}
      {recon && !salesPolicy.pkg6 && !hasSalesReconciliationEvidence(recon) && <p role="note" className="text-xs text-gray-500">{t("بيانات التسوية غير مكتملة — التعديل غير متاح", "Reconciliation data is incomplete — editing is unavailable")}</p>}
      <Breadcrumb items={[
        { label: t("لوحة التحكم", "Dashboard"), onClick: () => navigate("acc-dashboard") },
        { label: t("المبيعات", "Sales"), onClick: () => navigate("acc-sales") },
        { label: op?.id || "" }
      ]} />

      {op && <PipelineBar op={op} />}
      {isLocked && <LockBanner op={op} />}
      {op?.isCorrection && op.correctiveRef && (
        <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-xl" dir={dir}>
          <ArrowLeftRight size={14} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-bold">{t("عملية تعديل — ", "Correction operation — ")}</span>
            {t("ترتبط بالسجل الأصلي:", "Linked to original record:")}
            <span className="font-mono font-bold text-amber-900 mx-1">{op.correctiveRef}</span>
          </p>
        </div>
      )}

      <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isLocked ? "border-slate-200" : "border-gray-100"}`}>
        {isLocked && <div className="h-1 bg-gradient-to-l from-emerald-400 to-emerald-600 w-full" />}
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <h2 className="font-bold text-gray-900 text-xl">{t("تقرير المبيعات اليومي", "Daily Sales Report")}</h2>
                  <p className="text-gray-500 text-sm mt-0.5">{op?.branch}{op?.operationDate ? ` · ${formatDateLong(lang, op.operationDate)}` : ""} · {t("نهاية الشفت", "Shift End")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-mono">{op?.id}</Badge>
                <Badge className={`${STATUS_CFG[op?.status || "pending"].cls} border`}>
                  {isLocked && <Lock size={10} />}
                  {en ? (EN_STATUS_CFG[op?.status || "pending"] || STATUS_CFG[op?.status || "pending"].label) : STATUS_CFG[op?.status || "pending"].label}
                </Badge>
                <Badge className="bg-gray-50 text-gray-500 border border-gray-200">{t("مدير الفرع: أحمد الشمري", "Branch Manager: Ahmed Al-Shammari")}</Badge>
                <Badge className="bg-gray-50 text-gray-500 border border-gray-200">📱 {t("أُرسل قبل ساعة", "Sent 1 hour ago")}</Badge>
              </div>
            </div>
            <div className={`rounded-xl px-5 py-3 text-center ${isLocked ? "bg-emerald-50 border border-emerald-200" : op?.status === "approved" ? "bg-blue-50" : "bg-purple-50"}`}>
              {isLocked ? (
                <><Lock size={22} className="text-emerald-600 mx-auto" />
                  <p className="text-emerald-700 font-bold mt-1 text-sm">{t("معتمد نهائياً", "Final Approved")}</p>
                  <p className="text-emerald-500 text-xs">{t("مُرحَّل لـ ERP · مُغلق", "Posted to ERP · Locked")}</p></>
              ) : op?.status === "approved" ? (
                <><CheckCircle2 size={28} className="text-blue-500 mx-auto" />
                  <p className="text-blue-700 font-bold mt-1 text-sm">{t("موافق عليه", "Approved")}</p>
                  <p className="text-blue-500 text-xs">{t("بانتظار رئيس الحسابات", "Awaiting Head Accountant")}</p></>
              ) : (
                <><p className="text-gray-500 text-xs">{t("إجمالي المبيعات", "Total Sales")}</p>
                  <p className="font-bold text-purple-700 text-2xl font-mono mt-0.5">{fmtSales(totalSales)}<span className="text-sm mx-1">{t("ر.س", "SAR")}</span></p>
                  {hasVariance && <p className="text-red-500 text-xs mt-0.5 font-medium">⚠ {t("فرق:", "Variance:")} {fmtSales(variance == null ? null : Math.abs(variance))} {t("ر.س", "SAR")}</p>}
                  {variance === 0 && <p className="text-emerald-600 text-xs mt-0.5 font-medium">✓ {t("التسوية مطابقة", "Reconciliation matched")}</p>}</>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <Card title={t("تسوية المبيعات", "Sales Reconciliation")} actions={
            salesPolicy.edit && recon && (
              <button onClick={() => reconEditMode ? saveEdit() : beginEdit()} disabled={patchMut.isPending}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${reconEditMode ? "bg-purple-600 text-white border-purple-600" : "bg-white text-purple-600 border-purple-200 hover:bg-purple-50"}`}>
                <Edit3 size={11} /> {reconEditMode ? (patchMut.isPending ? t("جارٍ الحفظ…", "Saving…") : t("💾 حفظ التعديلات", "💾 Save Changes")) : t("تعديل الأرقام", "Edit Figures")}
              </button>
            )
          }>
            <div className="divide-y divide-gray-100" dir={dir}>

              {!recon && (
                <p className="text-sm text-gray-400 text-center py-6">{t("لم تتم التسوية بعد لهذه العملية", "This operation has not been reconciled yet")}</p>
              )}

              {recon && <>
                {/* ── إجمالي المبيعات (مقفل — من رفع مدير الفرع) ── */}
                <div className="flex items-center justify-between px-4 py-3.5 bg-indigo-50/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-indigo-900">{t("إجمالي المبيعات", "Total Sales")}</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-md">{t("(من رفع مدير الفرع — مقفل)", "(Branch Manager entry — locked)")}</span>
                  </div>
                  <span className="font-mono font-black text-indigo-800 text-base">{recon.totals?.expectedTotalHalalas == null ? "—" : fmtAmt(recon.totals.expectedTotalHalalas / 100)} {t("ر.س", "SAR")}</span>
                </div>

                {/* ── Core channels ── */}
                {coreCh.map(c => (
                  <div key={c.key} className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50/60 ${c.status === "diff" ? "bg-amber-50/40" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{c.icon}</span>
                      <span className="text-sm text-gray-700 font-medium">{c.labelAr}</span>
                      {c.diffHalalas != null && c.diffHalalas !== 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">{c.statusLabelAr} {c.diffHalalas > 0 ? "+" : ""}{fmtAmt(c.diffHalalas / 100)}</span>}
                    </div>
                    {reconEditMode && salesPolicy.edit ? (
                      <input type="number" step="0.01" value={draft[c.key] ?? (c.actualAmountHalalas / 100).toFixed(2)}
                        onChange={e => setDraft(d => ({ ...d, [c.key]: e.target.value }))}
                        className="w-36 text-center font-mono font-semibold border-2 border-purple-300 rounded-xl px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:border-purple-500" />
                    ) : (
                      <span className="font-mono font-semibold text-gray-800 text-sm">{c.actualAmountHalalas == null ? "—" : fmtAmt(c.actualAmountHalalas / 100)} {t("ر.س", "SAR")}</span>
                    )}
                  </div>
                ))}

                {/* Delivery apps header */}
                {deliveryCh.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50/80">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{t("تطبيقات التوصيل", "Delivery Apps")}</p>
                  </div>
                )}

                {/* ── Delivery channels ── */}
                {deliveryCh.map(c => (
                  <div key={c.key} className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50/60 transition-colors ${c.status === "diff" ? "bg-amber-50/40" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{c.icon}</span>
                      <span className="text-sm text-gray-700 font-medium">{c.labelAr}</span>
                      {c.diffHalalas != null && c.diffHalalas !== 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">{c.statusLabelAr} {c.diffHalalas > 0 ? "+" : ""}{fmtAmt(c.diffHalalas / 100)}</span>}
                    </div>
                    {reconEditMode && salesPolicy.edit ? (
                      <input type="number" step="0.01" value={draft[c.key] ?? (c.actualAmountHalalas / 100).toFixed(2)}
                        onChange={e => setDraft(d => ({ ...d, [c.key]: e.target.value }))}
                        className="w-36 text-center font-mono font-semibold border-2 border-purple-300 rounded-xl px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:border-purple-500" />
                    ) : (
                      <span className={`font-mono font-semibold text-sm ${c.status === "diff" ? "text-amber-700" : "text-gray-800"}`}>{c.actualAmountHalalas == null ? "—" : fmtAmt(c.actualAmountHalalas / 100)} {t("ر.س", "SAR")}</span>
                    )}
                  </div>
                ))}

                {/* ── قسم توزيع الفرق على الموظفين (يظهر فقط عند وجود عجز وفق ACC-F04) ── */}
                {isSurplus && (
                  <div className="mx-4 my-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-blue-900" dir={dir}>
                    <span className="text-xs font-bold">{t("فائض في المبيعات — يُقيد لصالح الفرع ولا يُحمَّل على موظفين", "Sales surplus — credited to branch, not assigned to employees")}</span>
                    <span className="font-mono font-bold text-sm">+{fmtSales(variance)} {t("ر.س", "SAR")}</span>
                  </div>
                )}
                {isShortage && salesPolicy.assign && (
                  <div className="mx-4 my-3 bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-100/60 border-b border-red-200">
                      <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
                      <p className="text-sm font-bold text-red-800">
                        {t("تحميل العجز على موظفين — العجز:", "Assign shortage to employees — Shortage:")} <span className="font-mono">{fmtSales(variance)} {t("ر.س", "SAR")}</span>
                      </p>
                      <span className={`mr-auto text-xs font-bold px-2 py-1 rounded-lg ${remaining != null && remaining <= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {remaining != null && remaining <= 0 ? t("✓ محمَّل بالكامل", "✓ Fully assigned") : `${t("متبقي", "Remaining")} ${fmtSales(remaining)} ${t("ر.س", "SAR")}`}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      {/* Variance reason */}
                      <div className="mb-3">
                        <label className="text-[11px] font-bold text-red-700 block mb-1.5">{t("سبب الفرق", "Variance Reason")} <span className="text-red-400">*</span></label>
                        <select value={reconVarReason} onChange={e => setReconVarReason(e.target.value)}
                          className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-red-400">
                          <option value="">— {t("اختر سبب الفرق", "Select reason")} —</option>
                          <option value="تأخر تحويل">{t("تأخر تحويل من تطبيقات التوصيل", "Delayed transfer from delivery apps")}</option>
                          <option value="خطأ في الجهاز">{t("خطأ في جهاز نقطة البيع (POS)", "POS terminal error")}</option>
                          <option value="عملية ملغاة">{t("عملية مبيعات ملغاة", "Cancelled sales transaction")}</option>
                          <option value="فارق صندوق">{t("فارق في الصندوق النقدي", "Cash till discrepancy")}</option>
                          <option value="خطأ في الإدخال">{t("خطأ في إدخال البيانات", "Data entry error")}</option>
                          <option value="تسوية لاحقة">{t("تسوية لاحقة — جارٍ المتابعة", "Deferred reconciliation — under follow-up")}</option>
                          <option value="أخرى">{t("أخرى", "Other")}</option>
                        </select>
                        {reconVarReason && <p className="text-[10px] text-red-500 mt-1">✓ {t("سبب مُسجَّل:", "Recorded reason:")} {reconVarReason}</p>}
                      </div>
                      {varEmps.map((e, i) => (
                        <AccVarEmpRow key={i} branchId={op?.branchId} row={e} canRemove={varEmps.length > 1} t={t}
                          onField={(f, v) => setVarEmpField(i, f, v)}
                          onRemove={() => setVarEmps(p => p.filter((_, j) => j !== i))}
                          onQuickFill={() => { if (remaining == null) return; setVarEmpField(i, "amount", String(Math.max(0, remaining + (parseFloat(e.amount) || 0)))); }} />
                      ))}
                      <div className="flex items-center justify-between pt-1">
                        <button onClick={() => setVarEmps(p => [...p, { empId: "", amount: "" }])}
                          className="flex items-center gap-1 text-xs text-red-600 hover:underline font-semibold">
                          <Plus size={11} /> {t("إضافة موظف آخر", "Add Another Employee")}
                        </button>
                        <Btn size="sm" variant="success" onClick={confirmVarianceAssign} disabled={assignMut.isPending || remaining == null || remaining > 0}>
                          <CheckCircle2 size={11} /> {assignMut.isPending ? t("جارٍ التحميل…", "Uploading…") : t("تأكيد التحميل", "Confirm Assignment")}
                        </Btn>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── إجمالي التحصيل ── */}
                <div className={`flex items-center justify-between px-4 py-3.5 font-bold border-t-2 ${variance === 0 ? "bg-emerald-50/70 border-emerald-200" : hasVariance ? (isShortage ? "bg-red-50/70 border-red-200" : "bg-blue-50/70 border-blue-200") : "bg-gray-50 border-gray-200"}`}>
                  <span className={`text-sm ${variance === 0 ? "text-emerald-800" : isShortage ? "text-red-800" : isSurplus ? "text-blue-800" : "text-gray-500"}`}>{t("إجمالي التحصيل", "Total Collected")}</span>
                  <span className={`font-mono text-base ${variance === 0 ? "text-emerald-700" : isShortage ? "text-red-700" : isSurplus ? "text-blue-700" : "text-gray-500"}`}>{fmtSales(totalCollection)} {t("ر.س", "SAR")}</span>
                </div>

                {variance == null ? <p className="text-xs text-gray-400 px-4 py-3">{t("الفرق غير متاح —", "Variance unavailable —")}</p> : isShortage ? (
                  <div className="flex items-center justify-between px-4 py-3 bg-red-100 border-t border-red-200">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={13} className="text-red-600" />
                      <span className="text-sm font-bold text-red-800">{t("العجز المطلوب تحميله على الموظفين", "Shortage to assign to employees")}</span>
                    </div>
                    <span className="font-mono font-black text-red-800 text-base">{fmtSales(variance)} {t("ر.س", "SAR")}</span>
                  </div>
                ) : isSurplus ? (
                  <div className="flex items-center justify-between px-4 py-3 bg-blue-100 border-t border-blue-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-blue-600" />
                      <span className="text-sm font-bold text-blue-800">{t("فائض تحصيل (لصالح الفرع)", "Surplus collected (for branch)")}</span>
                    </div>
                    <span className="font-mono font-black text-blue-800 text-base">+{fmtSales(variance)} {t("ر.س", "SAR")}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center px-4 py-3 bg-emerald-50">
                    <span className="text-sm text-emerald-700 font-bold flex items-center gap-2">
                      <CheckCircle2 size={14} /> {t("إجمالي التحصيل مطابق لإجمالي المبيعات تماماً", "Total collected matches total sales exactly")}
                    </span>
                  </div>
                )}
              </>}

            </div>
          </Card>
          <Card title={t("سجل دورة حياة السجل", "Record Lifecycle Log")} actions={<span className="text-xs text-gray-400 font-mono">{op?.id}</span>}>
            <div className="p-4 space-y-0">
              {auditEvents.map((event, i, arr) => (
                <div key={i} className="flex gap-3 relative">
                  {/* Vertical connector line */}
                  {i < arr.length - 1 && (
                    <div className="absolute right-[13px] top-7 bottom-0 w-0.5 bg-gray-100 z-0" />
                  )}
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 z-10 border ${event.isTerminal ? "border-2 border-emerald-300" : "border-gray-100"} ${event.cls ?? "bg-gray-50 text-gray-500"}`}>
                    {event.icon}
                  </span>
                  <div className={`flex-1 pb-4 ${i === arr.length - 1 ? "" : ""}`}>
                    <p className={`text-xs font-semibold leading-tight ${event.isTerminal ? "text-gray-900" : "text-gray-700"}`}>{event.action}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{event.by} · {event.time}</p>
                    {event.isTerminal && (
                      <Badge className={`mt-1.5 text-[10px] ${op?.erpPosted ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                        <Lock size={8} /> {t("حالة نهائية", "Final State")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {isLocked ? (
            <Card title={t("حالة السجل الموثَّق", "Verified Record Status")}>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-xl p-3 text-center border-2 ${isLocked ? "border-emerald-300 bg-emerald-50" : "border-gray-100 bg-gray-50"}`}>
                    <CheckCircle2 size={20} className="text-emerald-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-emerald-700">{t("اعتماد نهائي", "Final Approval")}</p>
                    <p className="text-[10px] text-emerald-500 mt-0.5">{op?.finalApprovedAt || t("16:42 م", "4:42 PM")}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center border-2 ${op?.erpPosted ? "border-indigo-300 bg-indigo-50" : "border-dashed border-gray-200 bg-gray-50"}`}>
                    <ChevronsRight size={20} className={`mx-auto mb-1 ${op?.erpPosted ? "text-indigo-600" : "text-gray-300"}`} />
                    <p className={`text-xs font-bold ${op?.erpPosted ? "text-indigo-700" : "text-gray-400"}`}>
                      {op?.erpPosted ? t("مُرحَّل لـ ERP", "Posted to ERP") : t("لم يُرحَّل بعد", "Not yet posted")}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${op?.erpPosted ? "text-indigo-500" : "text-gray-300"}`}>
                      {op?.erpPosted ? (op?.erpBatchId || "ERP-BATCH") : t("في انتظار دفعة الترحيل", "Awaiting ERP batch")}
                    </p>
                  </div>
                </div>
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 text-xs">
                  {[
                    { label: t("مُنشئ السجل", "Created by"), value: op?.submittedBy || t("مدير الفرع", "Branch Manager") },
                    { label: t("راجعه واعتمده", "Reviewed & approved by"), value: op?.approvedBy || t("المحاسب المختص", "Assigned Accountant") },
                    { label: t("الاعتماد النهائي", "Final approval by"), value: op?.finalApprovedBy || t("رئيس الحسابات", "Head Accountant") },
                    { label: t("الترحيل لـ ERP", "ERP posting"), value: op?.erpPosted ? `✓ ${op.erpBatchId || t("تم الترحيل", "Posted")}` : `⏳ ${t("لم يُرحَّل بعد", "Not yet posted")}` },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between px-3 py-2.5">
                      <span className="text-gray-400">{row.label}</span>
                      <span className={`font-semibold ${row.value.startsWith("✓") ? "text-emerald-600" : row.value.startsWith("⏳") ? "text-amber-500" : "text-gray-700"}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                {salesPolicy.correct && <button
                  disabled={correctMut.isPending || !salesPolicy.correct}
                  onClick={() => {
                    runSalesAction(salesContext, "correct", () => {
                      if (!op) return;
                      // Real POST /operations/{id}/correction; keep the optimistic
                      // linked op so the UI updates immediately either way.
                      correctMut.mutate({ id: op.id });
                      if (addCorrectiveOp) addCorrectiveOp(op.id);
                      navigate("acc-sales");
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 text-amber-700 font-semibold text-sm hover:bg-amber-100 border border-amber-200 disabled:opacity-50">
                  <FileText size={14} /> {t("إنشاء عملية تعديل مرتبطة", "Create Linked Correction")}
                </button>}
              </div>
            </Card>
          ) : op?.status === "pending" ? (
            <Card title={t("الإجراءات", "Actions")}>
              <div className="p-4 space-y-2.5">
                <button onClick={() => { approveOp(op.id); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 shadow-sm">
                  <CheckCircle2 size={15} /> {t("موافقة — إرسال لرئيس الحسابات", "Approve — Send to Head Accountant")}
                </button>
                {salesPolicy.return && <button onClick={() => runSalesAction(salesContext, "return", () => { setDetailId(op.id); setModal("reject"); })} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-700 font-semibold text-sm hover:bg-red-100 border border-red-200">
                  <XCircle size={15} /> {t("رفض — إعادة لمدير الفرع", "Reject — Return to Branch Manager")}
                </button>}
                <button onClick={() => setClarifyOpen(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 border border-blue-200">
                  <MessageSquare size={15} /> {t("طلب توضيح", "Request Clarification")}
                </button>
              </div>
            </Card>
          ) : op?.status === "approved" ? (
            <Card title={t("حالة السجل", "Record Status")}>
              <div className="p-4">
                <div className="flex flex-col items-center gap-2 py-3 text-center">
                  <CheckCircle2 size={32} className="text-blue-500" />
                  <p className="font-bold text-blue-700 text-sm">{t("تمت الموافقة", "Approved")}</p>
                  <p className="text-gray-400 text-xs">{t("بانتظار الاعتماد النهائي من رئيس الحسابات", "Awaiting final approval from Head Accountant")}</p>
                </div>
              </div>
            </Card>
          ) : null}
          {op && <AccAttachmentsCard operationId={op.id} t={t} />}
          {!isLocked && (
            <Card title={t("ملاحظات المحاسب", "Accountant Notes")}>
              <div className="p-4">
                <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 resize-none mb-2" rows={3} placeholder={t("أضف ملاحظة...", "Add a note...")} />
                <Btn variant="ghost" className="w-full justify-center text-xs">{t("حفظ الملاحظة", "Save Note")}</Btn>
              </div>
            </Card>
          )}
        </div>
      </div>

      {op && (
        <ClarifyModal
          open={clarifyOpen}
          subject={op.id}
          onClose={() => setClarifyOpen(false)}
          onSubmit={({ message }) => { clarifyMut.mutate({ id: op.id, message }); }}
          t={t}
        />
      )}
    </div>
  );
}

// Attachments card for the accountant sales detail — GET /operations/{id}/attachments.
function AccAttachmentsCard({ operationId, t }: { operationId: string; t: (ar: string, en: string) => string }) {
  const { data: files = [], isLoading } = useOperationAttachments(operationId);
  const kindOf = (mime: string) => mime.includes("pdf") ? "PDF" : mime.includes("sheet") || mime.includes("excel") || mime.includes("csv") ? "Excel" : "File";
  return (
    <Card title={`${t("المرفقات", "Attachments")} (${files.length})`}>
      <div className="p-4 space-y-2">
        {isLoading && <p className="text-xs text-gray-400 text-center py-2">{t("جارٍ التحميل…", "Loading…")}</p>}
        {!isLoading && files.length === 0 && <p className="text-xs text-gray-400 text-center py-2">{t("لا توجد مرفقات", "No attachments")}</p>}
        {files.map(att => {
          const kind = kindOf(att.mimeType || "");
          return (
            <div key={att.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${kind === "PDF" ? "bg-red-100 text-red-700" : kind === "Excel" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{kind}</span>
                <div><p className="text-xs font-medium text-gray-700">{att.filename}</p><p className="text-[10px] text-gray-400">{Math.round((att.size || 0) / 1024)} KB</p></div>
              </div>
              <div className="flex gap-1">
                <a href={resolveAssetUrl(att.publicUrl)} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-gray-200"><Eye size={11} className="text-gray-500" /></a>
                <a href={resolveAssetUrl(att.publicUrl)} download className="p-1.5 rounded hover:bg-gray-200"><Download size={11} className="text-gray-500" /></a>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
