import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, ChevronUp, CreditCard, Eye, FileText, Smartphone, Wallet } from "lucide-react";
import { api } from "../../../../../api/client";
import type { Operation } from "../../../../../api/types";
import { useLang } from "../../_shared/LangContext";
import { displayDigits } from "../../_shared/displayDigits";
import { formatShiftHalalas } from "../../shiftCountEvidence";
import { formatWorkdayDate } from "./ManagerDeliveredSales";
import { dailySalesReportFromOperation, groupDailySalesWorkdays } from "./workdaySalesReport";

export type SalesOperationReference = {
  id: string;
  status: string;
  origin?: Operation["origin"];
  workflowKind?: Operation["workflowKind"];
  reportReview?: Operation["reportReview"];
};

export type DailySalesFilters = {
  branchId?: string;
  date?: string;
  status?: string;
  search?: string;
  brandName?: string;
  brandId?: string;
  match?: string;
};

/**
 * GET /operations list omits payload/date/managerShiftId. Fetch the scoped
 * detail for each operation to use the REAL workday key, not the upload date.
 * A failed page/detail produces an explicit error, never a partial financial sum.
 */
export function useSubmittedDailySalesReports(references: readonly SalesOperationReference[]) {
  // "unknown" can still carry PKG-6 review evidence (e.g. a stale source
  // classifier). Fetch those details, and mobile-origin candidates from older
  // deployments, but include a report only after the detail payload proves it.
  const candidates = references.filter((r) => r.workflowKind === "sal_day" ||
    (r.workflowKind !== "legacy_sales" && (r.reportReview != null || r.origin === "mobile")));
  const signature = [...candidates]
    .map((reference) => `${reference.id}:${reference.status}:${reference.workflowKind ?? "missing"}:${reference.origin ?? "missing"}:${reference.reportReview != null}`)
    .sort()
    .join("|");
  const ids = useMemo(() => Array.from(new Set(candidates.map((r) => r.id))).sort(), [signature]);
  return useQuery({
    queryKey: ["sales", "submitted-daily-workdays", signature],
    enabled: ids.length > 0,
    queryFn: async ({ signal }) => {
      const result: Operation[] = [];
      // Cap simultaneous operation-detail requests so a branch's history does
      // not burst the accountant API or trigger its throttle protection.
      for (let offset = 0; offset < ids.length; offset += 5) {
        const batch = await Promise.all(ids.slice(offset, offset + 5).map(async (id) => {
          const response = await api.get<Operation>(`/operations/${encodeURIComponent(id)}`, { signal });
          if ((response.data?.id !== id && response.data?.publicId !== id) || response.data.moduleKey !== "sales") {
            throw new Error("SALES_OPERATION_DETAIL_MISMATCH");
          }
          return response.data;
        }));
        result.push(...batch);
      }
      return result;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });
}

type Props = {
  references: readonly SalesOperationReference[];
  filters?: DailySalesFilters;
  renderOperation?: (operationId: string) => ReactNode;
  onOpenOperation?: (operationId: string) => void;
};

function money(value: number | null, lang: "ar" | "en") {
  return value == null ? "—" : formatShiftHalalas(value, lang);
}

export function DailySalesWorkdays({ references, filters = {}, renderOperation, onOpenOperation }: Props) {
  const { lang, t } = useLang();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const reports = useSubmittedDailySalesReports(references);
  const allOperations = reports.data ?? [];
  const workdayOperationIds = new Set(allOperations.filter((op) => dailySalesReportFromOperation(op)).map((op) => op.id));

  const visibleOperations = allOperations.filter((op) => {
    if (!workdayOperationIds.has(op.id)) return false;
    const workday = dailySalesReportFromOperation(op)!;
    if (filters.branchId && op.branchId !== filters.branchId) return false;
    if (filters.date && workday.workday !== filters.date) return false;
    if (filters.status && op.status !== filters.status) return false;
    if (filters.brandName && op.brandName !== filters.brandName) return false;
    if (filters.brandId && op.brandId !== filters.brandId) return false;
    if (filters.match && op.match !== filters.match) return false;
    if (filters.search) {
      const term = filters.search.toLowerCase();
      if (![op.branchName || op.branchId, op.publicId, workday.managerName ?? "", workday.workday]
        .some((part) => part.toLowerCase().includes(term))) return false;
    }
    return true;
  });
  const days = groupDailySalesWorkdays(visibleOperations);
  const allTotalsVerified = days.every((day) => day.provenanceVerified && day.totalSalesHalalas !== null);
  const totalValue = allTotalsVerified ? days.reduce((total, day) => total + day.totalSalesHalalas!, 0) : null;
  const grandTotal = totalValue !== null && Number.isSafeInteger(totalValue) ? totalValue : null;

  return (
    <section data-testid="daily-sales-workdays" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-4 sm:px-5">
        <div>
          <h3 className="font-bold text-gray-900 text-base">{t("تقارير المبيعات اليومية", "Daily Sales Reports")}</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {t("تقرير يومي موحّد لكل فرع من الإغلاق المُرسل للمحاسب", "One branch-day report from the daily close submitted to accounting")}
          </p>
        </div>
        {reports.isSuccess && <div className="flex items-center gap-3 text-xs">
          <span className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 font-semibold text-purple-700">
            {displayDigits(String(days.length), lang)} {t("تقارير يومية", "daily reports")}
          </span>
          {days.length > 0 && <span className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700">
            {t("الإجمالي:", "Total:")} <bdi className="font-mono font-bold text-purple-800">{money(grandTotal, lang)}</bdi> {t("ر.س", "SAR")}
          </span>}
        </div>}
      </div>

      {reports.isPending && reports.fetchStatus === "fetching" && (
        <p role="status" className="p-5 text-sm text-gray-500">{t("جارٍ تحميل تقارير الأيام وربطها بتواريخ العمل...", "Loading reports with their canonical workday dates...")}</p>
      )}
      {reports.isError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm text-red-700">
          <span>{t("تعذر جلب تفاصيل مبيعات الأيام، لذلك لم نحسب إجماليات ناقصة.", "Daily report details could not be loaded; no partial totals are displayed.")}</span>
          <button type="button" onClick={() => void reports.refetch()} className="rounded-lg border border-red-200 px-3 py-1.5 font-semibold">
            {t("إعادة المحاولة", "Retry")}
          </button>
        </div>
      )}
      {(reports.isSuccess || !reports.isEnabled) && days.length === 0 && (
        <p className="p-5 text-sm text-gray-500">{t("لا توجد تقارير إغلاق يومي مرسلة تطابق الفلاتر.", "No submitted daily close reports match the filters.")}</p>
      )}

      {days.map((day) => {
        const expanded = expandedKey === day.key;
        const pending = day.reports.some(({ operation }) => operation.status === "pending");
        const rejected = day.reports.some(({ operation }) => operation.status === "rejected");
        const finalApproved = day.reports.every(({ operation }) => operation.status === "final-approved");
        const statusLabel = pending ? t("قيد مراجعة المحاسب", "Awaiting accountant review")
          : rejected ? t("توجد تقارير مرفوضة", "Contains rejected reports")
          : finalApproved ? t("معتمد نهائيًا", "Finally approved")
          : t("تمت المراجعة / بانتظار الاعتماد", "Reviewed / awaiting final approval");
        const statusCls = rejected ? "bg-red-50 text-red-700 border-red-200"
          : pending ? "bg-amber-50 text-amber-700 border-amber-200"
          : finalApproved ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-blue-50 text-blue-700 border-blue-200";

        return (
          <article key={day.key} data-testid="daily-sales-workday-card" className="border-b border-gray-100 p-3 last:border-b-0 sm:p-4">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpandedKey(expanded ? null : day.key)}
              className="flex w-full flex-wrap items-center gap-3 rounded-lg px-2 py-2.5 text-start transition-colors hover:bg-purple-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 sm:px-3"
            >
              <span className="rounded-xl bg-purple-50 p-2.5 text-purple-700"><CalendarDays size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-gray-900">{t("مبيعات يوم", "Sales for")} {formatWorkdayDate(lang, day.date)}</span>
                <span className="mt-1 block text-xs font-semibold text-gray-600">{day.branchName}</span>
                <span className="mt-1 inline-flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                  <span className={`rounded-md border px-2 py-0.5 ${statusCls}`}>{statusLabel}</span>
                  {!day.provenanceVerified && <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                    {t("المصدر بانتظار التحقق", "Source needs verification")}
                  </span>}
                  {day.memberShiftIds.length > 0 && <span>{displayDigits(String(day.memberShiftIds.length), lang)} {t("شيفت مشمول", "included shifts")}</span>}
                </span>
              </span>
              <span className="text-end">
                <span className="block text-[11px] text-gray-500">{t("إجمالي المبيعات", "Total sales")}</span>
                <bdi className="font-mono text-lg font-bold text-purple-800">{money(day.totalSalesHalalas, lang)}</bdi>
                <span className="mx-1 text-xs text-gray-500">{t("ر.س", "SAR")}</span>
              </span>
              {expanded ? <ChevronUp size={17} className="text-gray-500" /> : <ChevronDown size={17} className="text-gray-500" />}
            </button>

            <dl className="mt-1 grid grid-cols-2 overflow-hidden rounded-lg border border-gray-100 bg-slate-50/70 sm:grid-cols-4">
              {([
                [t("النقد المحصّل", "Cash collected"), day.cashHalalas, <Wallet size={14} />, false],
                [t("مدفوعات الشبكة", "Card payments"), day.cardHalalas, <CreditCard size={14} />, false],
                [t("تطبيقات التوصيل", "Delivery apps"), day.appsHalalas, <Smartphone size={14} />, false],
                [
                  day.reports.some((r) => r.operation.workdaySettlement != null)
                    ? t("فرق التحصيل النهائي", "Final collection variance")
                    : t("فرق النقد", "Cash variance"),
                  day.varianceHalalas,
                  <FileText size={14} />,
                  true,
                ],
              ] as const).map(([label, value, icon, isVariance]) => (
                <div key={label} className="border-b border-gray-100 px-3 py-2.5 last:border-b-0 sm:border-b-0 sm:border-e sm:last:border-e-0">
                  <dt className="flex items-center gap-1.5 text-[11px] text-gray-500">{icon}{label}</dt>
                  <dd className={`mt-1 font-mono text-sm font-bold tabular-nums ${isVariance && value != null && value < 0 ? "text-red-700" : "text-gray-800"}`}><bdi>{money(value, lang)}</bdi> {t("ر.س", "SAR")}</dd>
                </div>
              ))}
            </dl>
            {day.reportedCashVarianceHalalas != null && day.reportedCashVarianceHalalas !== day.varianceHalalas && (
              <p data-testid="historical-shift-cash-variance" className="mt-1.5 text-[11px] text-gray-500">
                {t("فرق جرد النقد التاريخي للورديات (من الإغلاق الأصلي):", "Historical shift cash-count variance (original close):")}{" "}
                <bdi className="font-mono font-semibold text-gray-700">{money(day.reportedCashVarianceHalalas, lang)}</bdi> {t("ر.س", "SAR")}
              </p>
            )}

            {day.reports.length === 1 && onOpenOperation && (
              <button type="button" onClick={() => onOpenOperation(day.reports[0].operation.publicId || day.reports[0].operation.id)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100">
                <Eye size={15} /> {t("عرض التفاصيل", "View details")}
              </button>
            )}

            {expanded && <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-600">{t("بيانات المدير المسلّمة لهذا اليوم — اختر التقرير لعرض تفاصيل الورديات", "Manager-submitted reports for this day — select one for shift details")}</p>
              {day.reports.map((item) => (
                <div key={item.operation.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-gray-800">{item.managerName ?? t("مدير الفرع", "Branch manager")} · <bdi>{item.operation.publicId}</bdi></span>
                    <span className="font-mono text-gray-800">{money(item.totalSalesHalalas, lang)} {t("ر.س", "SAR")}</span>
                  </div>
                  {onOpenOperation && <button type="button" onClick={() => onOpenOperation(item.operation.publicId || item.operation.id)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                    <Eye size={13}/>{t("عرض التقرير وتفاصيل الورديات", "Open report and shifts")}
                  </button>}
                  {renderOperation?.(item.operation.id)}
                </div>
              ))}
            </div>}
          </article>
        );
      })}
    </section>
  );
}
