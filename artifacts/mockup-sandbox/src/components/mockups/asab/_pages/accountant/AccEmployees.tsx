import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  X,
  FileText,
  RotateCcw,
  Filter,
  Search,
  Check,
  Plus,
  Phone,
} from "lucide-react";
import {
  useCreateEmployeeMovement,
  useEmployees,
  useAccountantInventoryBrands,
  useEmployeeMovements,
  useSettleEmployeeBalance,
  useApproveEmployeeSettlement,
  useRejectEmployeeSettlement,
  useExportEmployeeStatement,
  useExportPayroll,
} from "../../../../../api/queries";
import { useAuth } from "../../../../../auth/AuthContext";
import { grantedRoleKeys } from "../../../../../auth/roleAccess";
import { createFinancialIntent } from "../../../../../api/idempotencyIntent.ts";
import { getUnconfirmedIntent, setUnconfirmedIntent, removeUnconfirmedIntent } from "../../../../../api/queries/financialIntentStore.ts";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { fmtAmt, hasEmployeeDebitWarning } from "../../_shared/formatters";
import { BRANCHES } from "../../_shared/filterOps";
import { useLang } from "../../_shared/LangContext";
import type { PageProps } from "../../_shared/types";

// Manual movement categories postable via T09 §A3.
export const ASAB_EMP_CATEGORIES: {
  key: string;
  labelAr: string;
  defaultType: "credit" | "debit";
}[] = [
  { key: "advance", labelAr: "سلفة", defaultType: "debit" },
  { key: "deduction", labelAr: "خصم", defaultType: "debit" },
  { key: "absence", labelAr: "غياب", defaultType: "debit" },
  { key: "receipts_shortage", labelAr: "نقص إيصالات", defaultType: "debit" },
  { key: "bonus", labelAr: "مكافأة", defaultType: "credit" },
];

// «إضافة حركة» modal (T09 §A3) — POST /accountant/employees/{id}/movements.
export function AsabEmpMovementModal({
  employeeId,
  employeeName,
  onClose,
}: {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}) {
  const createMut = useCreateEmployeeMovement();
  const [category, setCategory] = useState("advance");
  const [movementType, setType] = useState<"credit" | "debit">("debit");
  const [amount, setAmount] = useState("");
  const [description, setDesc] = useState("");
  const [date, setDate] = useState("");
  const pick = (k: string) => {
    setCategory(k);
    const c = ASAB_EMP_CATEGORIES.find((x) => x.key === k);
    if (c) setType(c.defaultType);
  };
  const amountH = Math.round((parseFloat(amount) || 0) * 100);
  const submit = () => {
    if (amountH < 1 || !description.trim()) return;
    createMut.mutate(
      {
        employeeId,
        payload: {
          movementType,
          amount: amountH,
          category,
          description: description.trim(),
          date: date || undefined,
        },
      },
      { onSuccess: () => onClose() },
    );
  };
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">
            إضافة حركة — {employeeName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              التصنيف
            </label>
            <select
              value={category}
              onChange={(e) => pick(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            >
              {ASAB_EMP_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.labelAr}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                النوع
              </label>
              <select
                value={movementType}
                onChange={(e) => setType(e.target.value as "credit" | "debit")}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="debit">مدين (على الموظف)</option>
                <option value="credit">دائن (للموظف)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                المبلغ (ر.س)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              البيان
            </label>
            <input
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="وصف الحركة..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              التاريخ (اختياري)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
            >
              إلغاء
            </button>
            <Btn
              variant="primary"
              onClick={submit}
              disabled={
                amountH < 1 || !description.trim() || createMut.isPending
              }
            >
              <Plus size={11} /> تسجيل الحركة
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccEmployees({ setModal }: PageProps) {
  const { t } = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [empFilter, setEmpFilter] = useState({
    q: "",
    branchId: "",
    brandId: "",
  });
  const [month, setMonth] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: employeesPage } = useEmployees({
    q: empFilter.q || undefined,
    branchId: empFilter.branchId || undefined,
    brandId: empFilter.brandId || undefined,
  });
  // Brand options for the accountant (2026-08-09 request) — same source the
  // inventory screen uses; the brandId filter resolves restaurant-linked branches too.
  const { data: empBrandsApi } = useAccountantInventoryBrands();
  const empBrandRows = (Array.isArray(empBrandsApi) ? empBrandsApi : [])
    .map((b: any) => ({
      id: String(b?.id ?? ""),
      name: String(b?.name ?? b?.id ?? ""),
    }))
    .filter((b: any) => b.id);
  const { data: statement } = useEmployeeMovements(
    selectedId,
    month || undefined,
  );
  const { user, isRole } = useAuth();
  const isHead = isRole("head");
  const settleMut = useSettleEmployeeBalance();
  const approveSettlementMut = useApproveEmployeeSettlement();
  const rejectSettlementMut = useRejectEmployeeSettlement();
  const exportStatementMut = useExportEmployeeStatement();
  const exportPayrollMut = useExportPayroll();

  const employees = employeesPage?.data ?? [];
  const emp = selectedId
    ? employees.find((e) => e.id === selectedId)
    : undefined;
  const balColor = (h: number) =>
    h < 0 ? "text-red-600" : h > 0 ? "text-emerald-600" : "text-gray-400";
  const bal = statement?.balanceHalalas ?? emp?.balanceHalalas ?? 0;

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleReason, setSettleReason] = useState("");
  const [settleError, setSettleError] = useState("");

  const activeSettlementIntent = selectedId
    ? getUnconfirmedIntent<any>("employee_settlement", selectedId, user?.id, (user as any)?.companyId)
    : null;

  const [reviewSettlementId, setReviewSettlementId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  const handleInitiateSettle = () => {
    setSettleError("");
    const cleanReason = settleReason.trim();
    if (cleanReason.length < 3) {
      setSettleError("سبب التسوية إلزامي ويجب ألا يقل عن 3 أحرف");
      return;
    }
    if (!selectedId) return;

    let intent = selectedId
      ? getUnconfirmedIntent<any>("employee_settlement", selectedId, user?.id, (user as any)?.companyId)
      : null;
    if (!intent || intent.status === "resolved") {
      intent = createFinancialIntent(
        { employeeId: selectedId, reason: cleanReason },
        undefined,
        user?.id,
        (user as any)?.companyId,
      );
    } else if (intent.status === "in_flight" || settleMut.isPending) {
      setSettleError("طلب التسوية قيد المعالجة بالفعل");
      return;
    } else if (intent.status === "timed_out") {
      if (intent.payload && intent.payload.reason !== cleanReason) {
        setSettleError("لا يمكن تعديل سبب التسوية لمعاملة قيد المعالجة (IDEMPOTENCY_CONFLICT)");
        return;
      }
      if (intent.payload && intent.payload.employeeId !== selectedId) {
        setSettleError("لا يمكن تبديل الموظف لمعاملة قيد المعالجة (IDEMPOTENCY_CONFLICT)");
        return;
      }
    }

    settleMut.mutate(
      {
        employeeId: selectedId,
        reason: cleanReason,
        intent,
        currentActorId: user?.id,
        companyId: (user as any)?.companyId,
      },
      {
        onSuccess: (data: any) => {
          intent.status = "resolved";
          const activeCompanyId = (user as any)?.companyId;
          if (user?.id && user.id === intent.actorId && activeCompanyId === intent.companyId) {
            removeUnconfirmedIntent("employee_settlement", selectedId, user.id, activeCompanyId);
            setShowSettleModal(false);
            setSettleReason("");
            setSettleError("");
            if (data?.settlementId || data?.id) {
              setReviewSettlementId(data?.settlementId ?? data?.id);
            }
          } else {
            removeUnconfirmedIntent("employee_settlement", selectedId, intent.actorId, intent.companyId);
          }
        },
        onError: (err: any) => {
          intent.status = "timed_out";
          const activeCompanyId = (user as any)?.companyId;
          if (!user?.id || user.id !== intent.actorId || activeCompanyId !== intent.companyId) {
            return;
          }
          setUnconfirmedIntent("employee_settlement", selectedId, intent, user.id, activeCompanyId);
          const msg =
            err?.response?.data?.messageAr ||
            err?.response?.data?.message ||
            err?.message ||
            "فشل إرسال طلب التسوية";
          setSettleError(msg);
        },
      },
    );
  };

  const handleCloseSettleModal = () => {
    const existing = selectedId
      ? getUnconfirmedIntent<any>("employee_settlement", selectedId, user?.id, (user as any)?.companyId)
      : null;
    if (settleMut.isPending || existing?.status === "in_flight") {
      toast.warning("طلب التسوية قيد المعالجة، يرجى الانتظار");
      return;
    }
    setShowSettleModal(false);
  };

  const handleApproveSettlement = (sid: string) => {
    setReviewError("");
    setReviewSuccess("");
    if (!sid) {
      setReviewError("معرف طلب التسوية مطلوب للاعتماد");
      return;
    }
    if (emp?.id === user?.id || (statement as any)?.createdByUserId === user?.id) {
      setReviewError("لا يجوز لرئيس الحسابات اعتماد تسوية أنشأها بنفسه أو تخص حسابه الشخصي");
      return;
    }
    approveSettlementMut.mutate(
      {
        settlementId: sid,
        employeeId: selectedId ?? undefined,
        actor: { roles: user ? grantedRoleKeys(user as any) : [], id: user?.id },
      },
      {
        onSuccess: () => {
          setReviewSuccess("تم اعتماد التسوية وترحيل القيد المحاسبي بنجاح");
          setReviewError("");
          setReviewSettlementId("");
          setShowRejectForm(false);
        },
        onError: (err: any) => {
          setReviewError(
            err?.response?.data?.messageAr ||
            err?.response?.data?.message ||
            err?.message ||
            "فشل اعتماد التسوية",
          );
        },
      },
    );
  };

  const handleRejectSettlement = (sid: string) => {
    setReviewError("");
    setReviewSuccess("");
    if (!sid) {
      setReviewError("معرف طلب التسوية مطلوب للرفض");
      return;
    }
    const cleanRejection = rejectionReason.trim();
    if (cleanRejection.length < 3) {
      setReviewError("سبب رفض التسوية إلزامي ويجب ألا يقل عن 3 أحرف");
      return;
    }
    rejectSettlementMut.mutate(
      {
        settlementId: sid,
        employeeId: selectedId ?? undefined,
        rejectionReason: cleanRejection,
        actor: { roles: user ? grantedRoleKeys(user as any) : [], id: user?.id },
      },
      {
        onSuccess: () => {
          setReviewSuccess("تم رفض طلب التسوية دون إنشاء أي حركة مالية");
          setReviewError("");
          setReviewSettlementId("");
          setRejectionReason("");
          setShowRejectForm(false);
        },
        onError: (err: any) => {
          setReviewError(
            err?.response?.data?.messageAr ||
            err?.response?.data?.message ||
            err?.message ||
            "فشل رفض التسوية",
          );
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      {showAdd && emp && (
        <AsabEmpMovementModal
          employeeId={emp.id}
          employeeName={emp.name}
          onClose={() => setShowAdd(false)}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">كشف حساب الموظفين</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {employees.length} موظف
          </p>
        </div>
        <button
          onClick={() =>
            exportPayrollMut.mutate(new Date().toISOString().slice(0, 7))
          }
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"
        >
          <Download size={12} /> كشف الرواتب Excel
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
        dir="rtl"
      >
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              اسم الموظف
            </label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input
                value={empFilter.q}
                onChange={(e) =>
                  setEmpFilter((p) => ({ ...p, q: e.target.value }))
                }
                placeholder="ابحث باسم الموظف..."
                className="flex-1 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              العلامة التجارية
            </label>
            <select
              value={empFilter.brandId}
              onChange={(e) => {
                setEmpFilter((p) => ({
                  ...p,
                  brandId: e.target.value,
                  branchId: "",
                }));
                setSelectedId(null);
              }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            >
              <option value="">كل العلامات</option>
              {empBrandRows.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              الفرع
            </label>
            <select
              value={empFilter.branchId}
              onChange={(e) => {
                setEmpFilter((p) => ({ ...p, branchId: e.target.value }));
                setSelectedId(null);
              }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            >
              <option value="">كل الفروع</option>
              {[
                ...new Map(
                  employees.map((e) => [e.branchId, e.branchName]),
                ).entries(),
              ].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(empFilter.q || empFilter.branchId || empFilter.brandId) && (
          <button
            onClick={() => setEmpFilter({ q: "", branchId: "", brandId: "" })}
            className="mt-2 text-xs text-purple-600 hover:underline flex items-center gap-1"
          >
            <RotateCcw size={11} /> مسح الفلاتر
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5 items-start">
        <Card title={`قائمة الموظفين (${employees.length})`}>
          <div className="divide-y divide-gray-100">
            {employees.length === 0 && (
              <EmptyState icon="🔍" title="لا نتائج" desc="لا يوجد موظفون" />
            )}
            {employees.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setSelectedId(selectedId === e.id ? null : e.id);
                  setMonth("");
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-right ${selectedId === e.id ? "bg-purple-50/50" : ""} ${e.status !== "active" ? "opacity-60" : ""}`}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {e.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">
                    {e.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {e.role} · {e.branchName}
                  </p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p
                    className={`font-mono font-bold text-sm ${balColor(e.balanceHalalas)}`}
                  >
                    {fmtAmt(e.balanceHalalas / 100)} ر.س
                  </p>
                  <p className="text-[9px] text-gray-400">
                    {e.balanceCaption?.labelAr}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          {!emp ? (
            <Card title="كشف الحساب">
              <div className="p-8 text-center text-gray-400 text-sm">
                اختر موظفاً من القائمة لعرض كشف حسابه
              </div>
            </Card>
          ) : (
            <Card
              title={`كشف حساب: ${emp.name}`}
              actions={
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold hover:bg-purple-100"
                  >
                    <Plus size={11} /> إضافة حركة
                  </button>
                  <button
                    onClick={() => {
                      setShowSettleModal(true);
                      setSettleError("");
                      if (activeSettlementIntent?.payload?.reason) {
                        setSettleReason(activeSettlementIntent.payload.reason);
                      } else {
                        setSettleReason("");
                      }
                    }}
                    disabled={settleMut.isPending || bal === 0 || statement?.settlementStatus === "under_review"}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-40"
                  >
                    <Check size={11} /> طلب تسوية
                  </button>
                  {statement?.settlementStatus === "under_review" && (
                    <span className="text-xs font-semibold text-amber-700">طلب التسوية قيد مراجعة رئيس الحسابات</span>
                  )}
                  <button
                    onClick={() =>
                      selectedId &&
                      exportStatementMut.mutate({
                        employeeId: selectedId,
                        month: month || undefined,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"
                  >
                    <FileText size={11} /> Excel
                  </button>
                  <button
                    onClick={() =>
                      selectedId &&
                      exportStatementMut.mutate({
                        employeeId: selectedId,
                        month: month || undefined,
                        format: "pdf",
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100"
                  >
                    <FileText size={11} /> PDF
                  </button>
                  <button
                    onClick={() => setModal("contact")}
                    className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                  >
                    <Phone size={11} /> تواصل
                  </button>
                </div>
              }
            >
              <div className="p-4">
                {showSettleModal && (
                  <div className="mb-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3" dir="rtl">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-emerald-900">إنشاء طلب تسوية رصيد الموظف</h4>
                      <button
                        type="button"
                        onClick={handleCloseSettleModal}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      رصيد الموظف القائم: <span className="font-semibold">{fmtAmt(bal)} ر.س</span>. لا يتم ترحيل أي أثر مالي إلا بعد اعتماد رئيس الحسابات.
                    </p>
                    {activeSettlementIntent?.status === "timed_out" && (
                      <p className="text-xs text-amber-700 bg-amber-100/70 p-2 rounded-lg font-medium">
                        يوجد طلب تسوية سابق قيد المعالجة. تم قفل سبب التسوية لتجنب تضارب المعاملة، ويمكنك إعادة المحاولة بنفس المفتاح.
                      </p>
                    )}
                    <input
                      type="text"
                      required
                      minLength={3}
                      disabled={settleMut.isPending || activeSettlementIntent?.status === "timed_out"}
                      value={settleReason}
                      onChange={(e) => setSettleReason(e.target.value)}
                      placeholder="سبب طلب التسوية ومبرر الإجراء (إلزامي)"
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white disabled:bg-gray-100"
                    />
                    {settleError && <p className="text-xs text-red-600">{settleError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleInitiateSettle}
                        disabled={settleMut.isPending || settleReason.trim().length < 3 || activeSettlementIntent?.status === "in_flight"}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {settleMut.isPending ? "جاري الإرسال..." : activeSettlementIntent?.status === "timed_out" ? "إعادة المحاولة (نفس المفتاح)" : "تأكيد طلب التسوية"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseSettleModal}
                        disabled={settleMut.isPending}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 disabled:opacity-50"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {isHead && statement?.settlementStatus === "under_review" && (
                  <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3" dir="rtl">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-amber-900">
                        لوحة مراجعة واعتماد طلب التسوية (رئيس الحسابات)
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600">
                      يوجد طلب تسوية معلق لهذا الموظف. يتطلب الاعتماد صلاحية رئيس الحسابات ولن يقبل النظام الاعتماد الذاتي.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={reviewSettlementId || (statement as any)?.settlementId || ""}
                        onChange={(e) => setReviewSettlementId(e.target.value)}
                        placeholder="معرف طلب التسوية (Settlement ID)"
                        className="text-xs p-2 rounded-lg border border-amber-300 bg-white w-64 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleApproveSettlement(reviewSettlementId || (statement as any)?.settlementId)}
                        disabled={approveSettlementMut.isPending || !(reviewSettlementId || (statement as any)?.settlementId)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {approveSettlementMut.isPending ? "جاري الاعتماد..." : "اعتماد التسوية وترحيل القيد"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(!showRejectForm)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
                      >
                        رفض التسوية...
                      </button>
                    </div>
                    {showRejectForm && (
                      <div className="p-3 bg-white rounded-lg border border-red-200 space-y-2 mt-2">
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="سبب رفض التسوية (إلزامي)"
                          className="w-full text-xs p-2 rounded border border-gray-300 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRejectSettlement(reviewSettlementId || (statement as any)?.settlementId)}
                          disabled={rejectSettlementMut.isPending || rejectionReason.trim().length < 3}
                          className="px-3 py-1 bg-red-700 text-white rounded text-xs font-semibold hover:bg-red-800 disabled:opacity-50"
                        >
                          {rejectSettlementMut.isPending ? "جاري الرفض..." : "تأكيد الرفض (دون أثر مالي)"}
                        </button>
                      </div>
                    )}
                    {reviewError && <p className="text-xs text-red-600">{reviewError}</p>}
                    {reviewSuccess && <p className="text-xs text-emerald-700">{reviewSuccess}</p>}
                    <p className="text-[10px] text-amber-800">
                      ملاحظة فنية: مسار Backend 1c484bd0 لا يوفر قائمة لطلبات التسوية ويحجب المعرف من كشف الحساب. أدخل المعرف لتنفيذ الاعتماد أو الرفض عبر POST /company/me/employee-settlements/{'{id}'}/approve.
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-3 mb-3 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-gray-400">الراتب</p>
                    <p className="font-bold text-sm text-blue-700">
                      {fmtAmt((emp.monthlySalary ?? 0) / 100)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">إجمالي الدائن</p>
                    <p className="font-bold text-emerald-600">
                      +{fmtAmt((statement?.totalCredit ?? 0) / 100)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">إجمالي المدين</p>
                    <p className="font-bold text-red-600">
                      -{fmtAmt((statement?.totalDebit ?? 0) / 100)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">الرصيد</p>
                    <p className={`font-bold text-base ${balColor(bal)}`}>
                      {fmtAmt(bal / 100)} ر.س
                    </p>
                  </div>
                </div>
                {hasEmployeeDebitWarning(statement) && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle
                      size={13}
                      className="text-amber-600 flex-shrink-0"
                    />
                    <p className="text-[11px] text-amber-800 font-semibold">
                      {t(
                        "رصيد مدين مسجل في كشف الحساب للتسوية وفق سياسة المنشأة",
                        "Debit balance recorded on employee statement for settlement per company policy",
                      )}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-gray-500">
                    سجل الحركات المالية
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="text-[11px] border border-gray-200 rounded-lg px-2 py-1"
                    />
                    {month && (
                      <button
                        onClick={() => setMonth("")}
                        className="text-[10px] text-purple-600 hover:underline"
                      >
                        كل الفترات
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {(statement?.movements ?? []).length === 0 && (
                    <p className="text-center text-gray-400 text-xs py-4">
                      لا توجد حركات في هذه الفترة
                    </p>
                  )}
                  {(statement?.movements ?? []).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${m.movementType === "credit" ? "bg-emerald-50" : "bg-red-50"}`}
                      >
                        {m.movementType === "credit" ? "⬆" : "⬇"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {m.description}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(m.movementDate).toLocaleDateString("ar-SA")}{" "}
                          · {m.categoryLabelAr} · {m.ref}
                        </p>
                      </div>
                      <div className="text-left flex-shrink-0">
                        <span
                          className={`font-mono font-bold text-sm ${m.movementType === "credit" ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {m.movementType === "credit" ? "+" : "-"}
                          {fmtAmt(m.amountHalalas / 100)}
                        </span>
                        <p
                          className={`text-[9px] font-mono ${balColor(m.runningBalanceHalalas)}`}
                        >
                          {fmtAmt(m.runningBalanceHalalas / 100)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {statement && (
                  <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {month
                        ? `رصيد أول المدة: ${fmtAmt((statement.openingBalanceHalalas ?? 0) / 100)} ر.س`
                        : ""}
                    </span>
                    <span className="font-bold text-gray-700">
                      رصيد آخر المدة:{" "}
                      <span
                        className={`font-mono ${balColor(statement.closingBalanceHalalas)}`}
                      >
                        {fmtAmt((statement.closingBalanceHalalas ?? 0) / 100)}{" "}
                        ر.س
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
