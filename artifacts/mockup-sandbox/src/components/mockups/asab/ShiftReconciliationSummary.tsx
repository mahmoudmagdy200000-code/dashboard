import { useLang } from "./_shared/LangContext.tsx";
import {
  getShiftReconciliationSummary,
  type ShiftReconciliationSource,
  type ShiftReconciliationSummary,
} from "./shiftReconciliationSummary.ts";

export function ShiftReconciliationSummaryView({
  source,
  className = "",
}: {
  source: ShiftReconciliationSource | null | undefined;
  className?: string;
}) {
  const { lang, t, dir } = useLang();
  const summary: ShiftReconciliationSummary = getShiftReconciliationSummary(source, lang);

  const varianceColor =
    summary.originalVariance.kind === "matched"
      ? "text-emerald-700 font-semibold"
      : summary.originalVariance.kind === "surplus"
      ? "text-blue-700 font-semibold"
      : summary.originalVariance.kind === "shortage"
      ? "text-red-700 font-semibold"
      : "text-gray-500";

  const unassignedColor =
    summary.originalVariance.kind === "shortage" && summary.unassignedAmount.amountHalalas === 0
      ? "text-emerald-700 font-bold"
      : summary.originalVariance.kind === "shortage" && (summary.unassignedAmount.amountHalalas ?? 0) > 0
      ? "text-amber-700 font-bold"
      : "text-gray-700";

  return (
    <div
      dir={dir}
      data-testid="shift-reconciliation-summary"
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-xs space-y-3 text-xs ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 text-sm">
            {t("ملخص تسوية الوردية والمطابقة", "Shift Reconciliation & Matching Summary")}
          </span>
          {summary.allocationCompleteIndicator.isComplete && (
            <span
              data-testid="allocation-complete-badge"
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${summary.allocationCompleteIndicator.cls}`}
            >
              ✓ {summary.allocationCompleteIndicator.text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <span>{t("مرحلة المراجعة:", "Review stage:")}</span>
          <span className="font-semibold text-gray-900 bg-gray-100 rounded px-2 py-0.5">
            {summary.reviewStage.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* 1. Original Gross Sales */}
        <div className="rounded-lg bg-gray-50/80 p-2.5 border border-gray-100">
          <span className="block text-[11px] text-gray-500">
            {t("المبيعات الأصلية", "Original Sales")}
          </span>
          <span className="mt-1 block font-mono font-bold text-gray-900 text-sm">
            <bdi>{summary.originalSales.formatted}</bdi>
          </span>
        </div>

        {/* 2. Expected Cash */}
        <div className="rounded-lg bg-gray-50/80 p-2.5 border border-gray-100">
          <span className="block text-[11px] text-gray-500">
            {t("النقد المتوقع", "Expected Cash")}
          </span>
          <span className="mt-1 block font-mono font-bold text-gray-900 text-sm">
            <bdi>{summary.expectedCash.formatted}</bdi>
          </span>
        </div>

        {/* 3. Counted Cash */}
        <div className="rounded-lg bg-gray-50/80 p-2.5 border border-gray-100">
          <span className="block text-[11px] text-gray-500">
            {t("النقد المجرود", "Counted Cash")}
          </span>
          <span className="mt-1 block font-mono font-bold text-gray-900 text-sm">
            <bdi>{summary.countedCash.formatted}</bdi>
          </span>
        </div>

        {/* 4. Original Variance */}
        <div className="rounded-lg bg-gray-50/80 p-2.5 border border-gray-100">
          <span className="block text-[11px] text-gray-500">
            {t("فرق الجرد الأصلي", "Original Variance")}
          </span>
          <span className={`mt-1 block font-mono text-sm ${varianceColor}`}>
            <bdi>{summary.originalVariance.formatted}</bdi>
          </span>
        </div>

        {/* 5. Assigned Responsibility */}
        <div className="rounded-lg bg-violet-50/60 p-2.5 border border-violet-100">
          <span className="block text-[11px] text-violet-800 font-medium">
            {t("المسؤولية المسندة الحالية", "Current Responsibility")}
          </span>
          <span className="mt-1 block font-mono font-bold text-violet-900 text-sm">
            <bdi>{summary.currentResponsibility.formatted}</bdi>
          </span>
          {summary.currentResponsibility.isApplicable && (
            <span className="mt-0.5 block text-[10px] text-violet-700">
              {summary.currentResponsibility.label}
            </span>
          )}
        </div>

        {/* 6. Unassigned Shortage */}
        <div className="rounded-lg bg-amber-50/60 p-2.5 border border-amber-100">
          <span className="block text-[11px] text-amber-800 font-medium">
            {t("غير المسند (المتبقي)", "Unassigned Amount")}
          </span>
          <span className={`mt-1 block font-mono text-sm ${unassignedColor}`}>
            <bdi>{summary.unassignedAmount.formatted}</bdi>
          </span>
          {summary.originalVariance.kind === "shortage" && summary.unassignedAmount.amountHalalas === 0 && (
            <span className="mt-0.5 block text-[10px] text-emerald-700 font-medium">
              {t("تم إسناد كامل العجز", "Full shortage assigned")}
            </span>
          )}
        </div>
      </div>

      {summary.originalVariance.kind === "shortage" && (
        <p className="text-[11px] text-gray-500 leading-relaxed border-t border-gray-100 pt-2">
          {t(
            "تنويه محاسبي: تصفير «غير المسند» يثبت اكتمال توزيع المسؤولية، ولا يصفّر فرق الجرد الأصلي أو المديونية الفعلية. تظل المديونية تحت المراجعة حتى اعتماد رئيس الحسابات (STMT-01).",
            "Accounting note: Zero 'Unassigned' confirms complete liability allocation; it does not zero out the physical shortage or actual debt. Debt remains under review until head-accountant approval (STMT-01)."
          )}
        </p>
      )}
    </div>
  );
}
