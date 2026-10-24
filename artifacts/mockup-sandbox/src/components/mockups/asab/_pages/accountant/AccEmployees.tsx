import { useState } from "react";
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
  useExportEmployeeStatement,
  useExportPayroll,
} from "../../../../../api/queries";
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
  const settleMut = useSettleEmployeeBalance();
  const exportStatementMut = useExportEmployeeStatement();
  const exportPayrollMut = useExportPayroll();

  const employees = employeesPage?.data ?? [];
  const emp = selectedId
    ? employees.find((e) => e.id === selectedId)
    : undefined;
  const balColor = (h: number) =>
    h < 0 ? "text-red-600" : h > 0 ? "text-emerald-600" : "text-gray-400";
  const bal = statement?.balanceHalalas ?? emp?.balanceHalalas ?? 0;

  const doSettle = () => {
    if (selectedId) settleMut.mutate({ employeeId: selectedId });
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
                    onClick={doSettle}
                    disabled={settleMut.isPending || bal === 0}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-40"
                  >
                    <Check size={11} /> تسوية الرصيد
                  </button>
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
