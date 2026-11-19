import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { api } from "../../../../../api/client";
import type { Operation } from "../../../../../api/types";
import { useLang } from "../../_shared/LangContext";
import { displayDigits } from "../../_shared/displayDigits";
import { formatShiftHalalas } from "../../shiftCountEvidence";
import { formatWorkdayDate } from "./ManagerDeliveredSales";
import { dailySalesReportFromOperation, groupDailySalesWorkdays } from "./dailySalesWorkdays";

export type SalesOperationReference = {
  id: string;
  status: string;
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
  // The backend returns a provenance classifier in the list; do not fetch
  // unrelated legacy/manual sales operations. Older list responses without the
  // classifier can still be recognized through the PKG-6 review marker.
  const candidates = references.filter((r) => r.workflowKind === "sal_day" ||
    (r.workflowKind === undefined && r.reportReview != null));
  const signature = [...candidates]
    .map((reference) => `${reference.id}:${reference.status}`)
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

  return (
    <section data-testid="daily-sales-workdays" className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-3.5 sm:px-5">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">{t("تقارير مبيعات الأيام والفروع", "Daily branch sales reports")}</h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {t("تقرير واحد لكل فرع ويوم عمل، بعد إرسال الإغلاق اليومي من مدير الفرع", "One report per branch and workday after the manager submits the daily close")}
          </p>
        </div>
        {reports.isSuccess && <span className="text-xs font-semibold text-purple-700">
          {displayDigits(String(days.length), lang)} {t("يوم / فرع", "branch-days")}
        </span>}
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
          <article key={day.key} data-testid="daily-sales-workday-card" className="border-b border-gray-100 last:border-b-0">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpandedKey(expanded ? null : day.key)}
              className="flex w-full flex-wrap items-center gap-3 px-4 py-4 text-start hover:bg-gray-50/80 sm:px-5"
            >
              <span className="rounded-xl bg-purple-50 p-2.5 text-purple-700"><FileText size={19} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-gray-900">{t("مبيعات يوم", "Sales for")} {formatWorkdayDate(lang, day.date)} · {day.branchName}</span>
                <span className="mt-1 inline-flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                  <span className={`rounded-md border px-2 py-0.5 ${statusCls}`}>{statusLabel}</span>
                  <span>{displayDigits(String(day.reports.length), lang)} {t("تقرير مدير", "manager reports")}</span>
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

            {expanded && <div className="space-y-4 border-t border-gray-100 bg-gray-50/70 px-4 py-4 sm:px-5">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {([
                  [t("المبيعات النقدية", "Cash sales"), day.cashHalalas],
                  [t("مدفوعات الشبكة", "Card payments"), day.cardHalalas],
                  [t("تطبيقات التوصيل", "Delivery apps"), day.appsHalalas],
                  [t("فرق النقد", "Cash variance"), day.varianceHalalas],
                ] as const).map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-gray-200 bg-white p-3">
                    <dt className="text-[11px] text-gray-500">{label}</dt>
                    <dd className="mt-1 font-mono text-sm font-bold text-gray-800"><bdi>{money(value, lang)}</bdi> {t("ر.س", "SAR")}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-[11px] text-gray-500">
                {t("الأرقام من تقرير إغلاق اليوم؛ تسليم النقد الفعلي واعتماده لهما حالة منفصلة.", "Figures come from the submitted daily report; physical cash receipt and approval are separate.")}
              </p>
              {day.reports.map((item) => (
                <div key={item.operation.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-gray-800">{item.managerName ?? t("مدير الفرع", "Branch manager")} · <bdi>{item.operation.publicId}</bdi></span>
                    <span className="font-mono text-gray-800">{money(item.operation.amountHalalas ?? null, lang)} {t("ر.س", "SAR")}</span>
                  </div>
                  {onOpenOperation && <button type="button" onClick={() => onOpenOperation(item.operation.id)}
                    className="mt-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                    {t("عرض تقرير اليوم الكامل", "Open full daily report")}
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
