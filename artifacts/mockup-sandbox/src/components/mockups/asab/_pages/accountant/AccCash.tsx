import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  X,
  FileText,
  RotateCcw,
  Send,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Check,
  ArrowLeftRight,
  Plus,
  Clock,
} from "lucide-react";
import {
  useCreateCashTransaction,
  useCashTransactions,
  useApproveCashTxn,
  useRejectCashTxn,
  useRequestCashSettlement,
  useSettleCash,
  useExportCashLedger,
  useCashCustody,
  useExportCash,
  useAccountantInventoryBrands,
} from "../../../../../api/queries";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { KpiCard } from "../../components/KpiCard";
import { EmptyState } from "../../components/EmptyState";
import { fmtAmt } from "../../_shared/formatters";
import { BRANCHES } from "../../_shared/filterOps";
import type { PageProps } from "../../_shared/types";
import { useAuth } from "../../../../../auth/AuthContext";
import { grantedRoleKeys } from "../../../../../auth/roleAccess.ts";
import { getErrorMessage } from "../../../../../api/errors";
import { useAccountantFundingRequests, useExecuteFundingRequest } from "../../../../../api/queries/fundingRequests";
import { createFinancialIntent, type FinancialIntent } from "../../../../../api/idempotencyIntent.ts";
import { checkCustodyWriteAuthorization, type DirectDebitSafetyContext } from "../../../../../api/queries/cashTransactionContract.ts";
import { reconcileExecutionStatus, computeFileHash } from "../../../../../api/queries/fundingExecutionContract.ts";

function FundingExecution() {
  const { isRole, user } = useAuth();
  const accountant = isRole("accountant");
  const { data: requests = [], isError, refetch } = useAccountantFundingRequests(accountant);
  const execute = useExecuteFundingRequest();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [intent, setIntent] = useState<FinancialIntent<any> | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  if (!accountant) return null;
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3" dir="rtl">
      <h3 className="font-bold text-gray-900 text-sm">طلبات تغذية عهدة الفرع</h3>
      <p className="text-xs text-gray-600">إرسال المحاسب يوثق التحويل فقط. يزداد الرصيد بعد تأكيد مدير الفرع الاستلام.</p>
      {isError && <p role="alert" className="text-xs text-red-700">تعذر تحميل الطلبات المخولة. أعد المحاولة لاحقًا.</p>}
      {!isError && requests.length === 0 && <p className="text-xs text-gray-500">لا توجد طلبات معتمدة ضمن صلاحياتك.</p>}
      {requests.map((request) => (
        <div key={request.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="flex justify-between gap-3 text-sm">
            <span>{request.branchName ?? "الفرع"} — {request.amount} ر.س</span>
            <span className="text-xs font-semibold">
              {request.receivedAt ? "استلم المدير واكتمل الترحيل" : request.executedAt ? "أُرسل، بانتظار تأكيد المدير" : "معتمد، بانتظار إرسال المحاسب"}
            </span>
          </div>
          {request.transferReference && <p className="text-xs text-gray-600">مرجع التحويل: {request.transferReference}</p>}
          {request.canExecute && (
            <button
              type="button"
              className="text-xs text-blue-700 underline"
              onClick={() => {
                setSelectedId(request.id);
                setReference("");
                setProof(null);
                setIntent(null);
              }}
            >
              تنفيذ وإرسال التغذية
            </button>
          )}
          {selectedId === request.id && request.canExecute && (
            <form
              className="flex flex-wrap gap-2 items-center"
              onSubmit={async (event) => {
                event.preventDefault();
                const cleanRef = reference.trim();
                if (!proof || cleanRef.length < 2) return;

                // Reconciliation check before retry: if an unconfirmed attempt timed out,
                // check server status first to prevent duplicate 422 errors.
                if (intent && intent.attemptCount > 0 && execute.isError) {
                  setCheckingStatus(true);
                  const { data: latest = [] } = await refetch();
                  setCheckingStatus(false);
                  const recon = reconcileExecutionStatus(request.id, latest);
                  if (recon.alreadyExecuted) {
                    toast.success("تم تأكيد تسجيل التحويل في الخادم بالفعل؛ بانتظار استلام المدير");
                    setSelectedId(null);
                    setProof(null);
                    setReference("");
                    setIntent(null);
                    return;
                  }
                }

                const proofHash = await computeFileHash(proof);

                // Bind intent to form lifecycle: reuse on retry, create once per submission
                const currentIntent =
                  intent &&
                  intent.payload?.reference === cleanRef &&
                  intent.payload?.proofName === proof.name &&
                  intent.payload?.proofSize === proof.size &&
                  intent.payload?.proofHash === proofHash
                    ? intent
                    : createFinancialIntent(
                        {
                          requestId: request.id,
                          reference: cleanRef,
                          proofName: proof.name,
                          proofSize: proof.size,
                          proofHash,
                        },
                        undefined,
                        user?.id,
                      );

                // Check if operation is already in flight before dispatching
                if (currentIntent.status === "in_flight") {
                  toast.warning("العملية قيد التنفيذ بالفعل؛ يرجى الانتظار.");
                  return;
                }
                setIntent(currentIntent);

                execute.mutate(
                  {
                    id: request.id,
                    reference: cleanRef,
                    proof,
                    proofHash,
                    currentActorId: user?.id,
                    intent: currentIntent,
                  },
                  {
                    onSuccess: () => {
                      currentIntent.status = "resolved";
                      toast.success("تم توثيق الإرسال؛ بانتظار تأكيد المدير");
                      setSelectedId(null);
                      setProof(null);
                      setReference("");
                      setIntent(null);
                    },
                    onError: async (error) => {
                      currentIntent.status = "timed_out";
                      // Automatic server reconciliation upon timeout/error
                      try {
                        const { data: latest = [] } = await refetch();
                        const recon = reconcileExecutionStatus(request.id, latest);
                        if (recon.alreadyExecuted) {
                          currentIntent.status = "resolved";
                          toast.success("تم تأكيد تسجيل التحويل في الخادم بالفعل؛ بانتظار استلام المدير");
                          setSelectedId(null);
                          setProof(null);
                          setReference("");
                          setIntent(null);
                          return;
                        }
                        if (!recon.canRetry) {
                          toast.error(`تعذر التحقق من حالة الخادم: ${recon.reason}`);
                          return;
                        }
                      } catch {
                        // network refetch failure: prohibit blind retry
                      }
                      toast.error(getErrorMessage(error, "ar"));
                    },
                  },
                );
              }}
            >
              <input
                aria-label="مرجع التحويل"
                required
                minLength={2}
                maxLength={120}
                value={reference}
                onChange={(event) => {
                  const val = event.target.value;
                  // If unconfirmed attempt is pending, alert user rather than silently dropping intent
                  if (intent && intent.attemptCount > 0 && val !== intent.payload?.reference) {
                    toast.warning("توجد محاولة إرسال سابقة قيد التحقق. يرجى التحقق من حالة الخادم أولاً.");
                    return;
                  }
                  setReference(val);
                  if (!intent || intent.attemptCount === 0) setIntent(null);
                }}
                placeholder="مرجع التحويل أو التسليم"
                className="border rounded px-2 py-1 text-xs"
              />
              <input
                aria-label="إثبات التحويل"
                required
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (intent && intent.attemptCount > 0 && file && (file.name !== intent.payload?.proofName || file.size !== intent.payload?.proofSize)) {
                    toast.warning("توجد محاولة إرسال سابقة قيد التحقق. يرجى التحقق من حالة الخادم أولاً.");
                    return;
                  }
                  setProof(file);
                  if (!intent || intent.attemptCount === 0) setIntent(null);
                }}
                className="text-xs"
              />
              <button
                type="submit"
                disabled={execute.isPending || checkingStatus || !proof}
                className="rounded bg-blue-600 px-3 py-1 text-white text-xs disabled:opacity-50"
              >
                {checkingStatus
                  ? "جارٍ التحقق من الخادم..."
                  : execute.isPending
                    ? "جارٍ الإرسال..."
                    : intent && execute.isError
                      ? "التحقق وإعادة المحاولة (نفس المفتاح)"
                      : "تسجيل الإرسال"}
              </button>
              {intent && execute.isError && (
                <button
                  type="button"
                  disabled={checkingStatus}
                  onClick={async () => {
                    setCheckingStatus(true);
                    try {
                      const { data: latest = [] } = await refetch();
                      const recon = reconcileExecutionStatus(request.id, latest);
                      if (recon.alreadyExecuted) {
                        toast.success("تم تأكيد تسجيل التحويل في الخادم بالفعل");
                        setSelectedId(null);
                        setProof(null);
                        setReference("");
                        setIntent(null);
                      } else if (recon.canRetry) {
                        toast.info("الطلب ما زال غير منفذ في الخادم؛ يمكنك إعادة المحاولة.");
                      } else {
                        toast.warning(`حالة غير حاسمة: ${recon.reason}`);
                      }
                    } finally {
                      setCheckingStatus(false);
                    }
                  }}
                  className="rounded border border-gray-300 px-2 py-1 text-gray-700 text-xs hover:bg-gray-50"
                >
                  التحقق من حالة الطلب
                </button>
              )}
            </form>
          )}
        </div>
      ))}
    </section>
  );
}

// Direct custody movements are limited to permitted disbursements (T09 §B3).
export function AsabCashTxnModal({
  custodyId,
  custodianName,
  remainingHalalas,
  brandId,
  onClose,
}: {
  custodyId: string;
  custodianName: string;
  remainingHalalas: number;
  brandId?: string;
  onClose: () => void;
}) {
  const { user, isRole } = useAuth();
  const createMut = useCreateCashTransaction();
  const [intent] = useState(() => createFinancialIntent({ custodyId, txnType: "debit" }));
  const [amount, setAmount] = useState("");
  const [description, setDesc] = useState("");
  const amountH = Math.round((parseFloat(amount) || 0) * 100);
  const overdraw = amountH > remainingHalalas;
  const actorRoles = user ? grantedRoleKeys(user as any) : [];
  const isCustodyWriteAuthorized = checkCustodyWriteAuthorization(
    { roles: actorRoles, brandIds: user?.brandIds, id: user?.id },
    { brandId, id: custodyId },
  );
  const submit = () => {
    if (amountH < 1 || overdraw || !isCustodyWriteAuthorized) return;
    const context: DirectDebitSafetyContext = {
      custody: { id: custodyId, brandId, remainingHalalas },
      actor: {
        roles: actorRoles,
        brandIds: user?.brandIds,
        isCustodyWriteAuthorized,
      },
    };
    createMut.mutate(
      {
        custodyId,
        payload: { txnType: "debit", amount: amountH, description: description.trim() || undefined, source: "manual" },
        context,
        intent,
      },
      { onSuccess: () => onClose() },
    );
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">صرف من العهدة — {custodianName}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button></div>
        <div className="space-y-3">
          <p className="text-xs text-amber-700">تعزيز العهدة يتم عبر طلب تغذية معتمد، ثم إرسال المحاسب وتأكيد استلام مدير الفرع. هذا المسار غير متاح من شاشة الحركات.</p>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">المبلغ (ر.س)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono" />
            {overdraw && <p className="text-[10px] text-red-600 mt-1">المبلغ يتجاوز المتبقي ({fmtAmt(remainingHalalas / 100)} ر.س)</p>}
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">البيان (اختياري)</label>
            <input value={description} onChange={e => setDesc(e.target.value)} placeholder="بيان الصرف..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
          {!isCustodyWriteAuthorized && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 font-medium">
              صرف العهدة مقتصر على مالك/مدير العلامة المصرح له، ولا يجوز للمحاسب الصرف المباشر بدون تفويض.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50">إلغاء</button>
            <Btn variant="primary" onClick={submit} disabled={amountH < 1 || overdraw || !isCustodyWriteAuthorized || createMut.isPending}><Check size={11} /> تسجيل</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// One expandable custody row + ledger + approve/reject + settle (T09 §B2/B4/B5).
export function AsabCustodyCard({ custody }: { custody: any }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [showTxn, setShowTxn] = useState(false);
  const { data: ledger } = useCashTransactions(open ? custody.id : null, month || undefined);
  const approveMut = useApproveCashTxn();
  const rejectMut = useRejectCashTxn();
  const reqMut = useRequestCashSettlement();
  const settleMut = useSettleCash();
  const exportLedgerMut = useExportCashLedger();

  const isLow = custody.status !== "normal";
  const pct = Math.round(custody.usagePct ?? 0);
  const statusCls = custody.status === "critical" ? "bg-red-100 text-red-700 border-red-200"
    : custody.status === "low" ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";
  const doReject = (txnId: string) => { const r = window.prompt("سبب الرفض؟") ?? ""; if (r.trim()) rejectMut.mutate({ custodyId: custody.id, txnId, reason: r.trim() }); };
  return (
    <div className="border-b border-gray-100 last:border-0">
      {showTxn && <AsabCashTxnModal custodyId={custody.id} custodianName={custody.custodianName} remainingHalalas={custody.remainingHalalas} onClose={() => setShowTxn(false)} />}
      <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 ${open ? "bg-orange-50/20" : ""} ${isLow ? "border-r-4 border-r-red-400" : ""}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{custody.branchName}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">{custody.custodianName}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusCls}`}>{custody.statusLabelAr}</span>
            {custody.daysSinceSettlement >= 30 && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">⏰ {custody.daysSinceSettlement} يوم بدون تسوية</span>}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-32"><div className={`h-1.5 rounded-full ${pct > 85 ? "bg-red-400" : "bg-orange-400"}`} style={{ width: `${Math.min(pct, 100)}%` }}></div></div>
            <span className="text-xs text-gray-400">{pct}% مُصرَف</span>
            <span className={`text-xs font-bold font-mono ${isLow ? "text-red-600" : "text-emerald-600"}`}>{fmtAmt(custody.remainingHalalas / 100)} ر.س متبقٍ</span>
          </div>
        </div>
        <button onClick={() => setShowTxn(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold hover:bg-purple-100 flex-shrink-0"><Plus size={10} /> صرف</button>
        <Btn size="sm" onClick={() => setOpen(!open)}>{open ? <ChevronUp size={12} /> : <ChevronDown size={12} />} المعاملات</Btn>
      </div>
      {open && (
        <div className="px-5 pb-4 bg-gray-50/30">
          <div className="flex items-center justify-between mb-2 pt-2 gap-2 flex-wrap">
            <p className="text-[11px] font-bold text-gray-500">سجل معاملات العهدة — {custody.custodianName}</p>
            <div className="flex items-center gap-2">
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="text-[11px] border border-gray-200 rounded-lg px-2 py-1" />
              <button onClick={() => exportLedgerMut.mutate({ custodyId: custody.id, month: month || undefined })} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold hover:bg-emerald-100"><FileText size={10} /> Excel</button>
              {custody.daysSinceSettlement >= 30 && <button onClick={() => reqMut.mutate({ custodyId: custody.id })} disabled={reqMut.isPending} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold hover:bg-amber-100"><Send size={10} /> طلب تسوية</button>}
              <button onClick={() => settleMut.mutate({ custodyId: custody.id })} disabled={settleMut.isPending} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold hover:bg-blue-100"><Check size={10} /> تسوية العهدة</button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-xs" dir="rtl">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">التاريخ</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">البيان</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">النوع</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">المبلغ</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">الرصيد</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(ledger?.transactions ?? []).length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">لا توجد معاملات</td></tr>}
                {(ledger?.transactions ?? []).map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(tx.txnDate).toLocaleDateString("ar-SA")}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{tx.description}</td>
                    <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.txnType === "credit" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{tx.typeLabelAr}</span></td>
                    <td className={`px-3 py-2 text-center font-mono font-bold ${tx.txnType === "credit" ? "text-emerald-600" : "text-red-600"}`}>{tx.txnType === "credit" ? "+" : "-"}{fmtAmt(tx.amountHalalas / 100)}</td>
                    <td className="px-3 py-2 text-center font-mono text-gray-600">{fmtAmt(tx.runningBalanceHalalas / 100)}</td>
                    <td className="px-3 py-2 text-center">
                      {tx.status === "pending" ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => approveMut.mutate({ custodyId: custody.id, txnId: tx.id })} disabled={approveMut.isPending} className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="اعتماد"><Check size={12} /></button>
                          <button onClick={() => doReject(tx.id)} disabled={rejectMut.isPending} className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100" title="رفض"><X size={12} /></button>
                        </div>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{tx.status === "approved" ? "معتمد" : "مرفوض"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="px-3 py-2 font-bold text-gray-700">الرصيد الحالي</td>
                  <td className={`px-3 py-2 text-center font-black font-mono ${isLow ? "text-red-600" : "text-emerald-700"}`}>{fmtAmt((ledger?.custody.currentBalanceHalalas ?? custody.remainingHalalas) / 100)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function AccCash({ }: PageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  // Brand/branch filters go to the server (2026-08-09); search/status stay client-side.
  const { data: custodyPage } = useCashCustody({ brandId: brandFilter || undefined, branchId: branchFilter || undefined });
  const exportCashMut = useExportCash();
  const { data: cashBrandsApi } = useAccountantInventoryBrands();
  const cashBrandRows = (Array.isArray(cashBrandsApi) ? cashBrandsApi : []).map((b: any) => ({ id: String(b?.id ?? ""), name: String(b?.name ?? b?.id ?? "") })).filter((b: any) => b.id);

  const custodies = custodyPage?.data ?? [];
  const branchOpts = [...new Map(custodies.map((c: any) => [String(c.branchId ?? c.branchName ?? ""), c.branchName ?? "—"])).entries()].filter(([id]) => id);
  const kpis = custodyPage?.meta.kpis;
  const overdueSettlement = custodies.filter(c => c.daysSinceSettlement >= 30);

  const filtered = custodies.filter(c => {
    if (searchTerm && !c.branchName.includes(searchTerm) && !c.custodianName.includes(searchTerm)) return false;
    if (statusFilter === "قريبة من النفاد" && c.status === "normal") return false;
    if (statusFilter === "حرجة" && c.status !== "critical") return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <FundingExecution />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">إدارة العهد النقدية</h2>
        <button onClick={() => exportCashMut.mutate({ brandId: brandFilter || undefined, branchId: branchFilter || undefined })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={12} /> ملخص العهد Excel</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="عدد العهود النشطة" value={String(kpis?.activeCustodies ?? custodies.length)} sub="فروع لديها عهدة" icon={<ArrowLeftRight size={18} className="text-orange-600" />} accent="orange" />
        <KpiCard label="طلبات صرف معلقة" value={String(kpis?.pendingRequests ?? 0)} sub="بانتظار المراجعة والموافقة" icon={<Clock size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label="عهود قريبة من النفاد" value={String(kpis?.nearDepletion ?? 0)} sub="أقل من 500 ر.س متبقٍ" icon={<AlertTriangle size={18} className="text-red-600" />} accent="red" />
        <KpiCard label="تسويات متأخرة" value={String(overdueSettlement.length)} sub="+30 يوم بدون تسوية" icon={<Clock size={18} className="text-red-600" />} accent="red" />
      </div>
      {overdueSettlement.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3" dir="rtl">
          <AlertTriangle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">تنبيه: {overdueSettlement.length} عهدة لم تُسوَّ منذ أكثر من 30 يوماً</p>
            <p className="text-xs text-red-700 mt-0.5">{overdueSettlement.map(c => `${c.branchName} (${c.daysSinceSettlement} يوم)`).join(" · ")}</p>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir="rtl">
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">بحث — الفرع أو أمين الصندوق</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="اسم الفرع أو أمين الصندوق..." className="flex-1 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">العلامة التجارية</label>
            <select value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setBranchFilter(""); }} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">كل العلامات</option>
              {cashBrandRows.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">الفرع</label>
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">كل الفروع</option>
              {branchOpts.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">حالة العهدة</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل", "قريبة من النفاد", "حرجة"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {(searchTerm || statusFilter || brandFilter || branchFilter) && (
          <button onClick={() => { setSearchTerm(""); setStatusFilter(""); setBrandFilter(""); setBranchFilter(""); }} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11} /> مسح الفلاتر</button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">كشف العهد النقدية — اضغط على فرع لعرض سجل المعاملات</p>
        </div>
        {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-8">لا توجد عهد</p>}
        {filtered.map(c => <AsabCustodyCard key={c.id} custody={c} />)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FIXED ASSETS — Mobile ↔ Accountant Coordination + Branch Report
// ════════════════════════════════════════════════════════════
