import type { Operation, OperationStatus } from "../../../../../api/types";
import type { ShiftCustodyStatement } from "../../../../../api/queries/employees";
import type { Employee } from "../../../../../api/types/company";
import { useLang, type Lang } from "../../_shared/LangContext";
import { displayDigits } from "../../_shared/displayDigits";
import { AR_MONTHS_LONG, EN_MONTHS_LONG } from "../../_shared/formatters";
import { formatShiftHalalas } from "../../shiftCountEvidence";
import {
  extractManagerCustodyHandovers,
  groupManagerDailySalesByDay,
  isBranchManagerEmployeeRole,
  totalManagerDailySalesHalalas,
} from "./employeeSalesHelpers";

const OP_STATUS_BADGES: Record<
  OperationStatus,
  { ar: string; en: string; cls: string }
> = {
  pending: {
    ar: "بانتظار المراجعة",
    en: "Pending review",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    ar: "معتمد",
    en: "Approved",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "final-approved": {
    ar: "معتمد نهائياً",
    en: "Final approved",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    ar: "مرفوض",
    en: "Rejected",
    cls: "bg-red-50 text-red-700 border-red-200",
  },
};

/** Formats a YYYY-MM-DD workday key safely without local-timezone day drift. */
export function formatWorkdayDate(lang: Lang, isoOrDay?: string | null): string {
  if (!isoOrDay || isoOrDay === "unknown") {
    return lang === "ar" ? "تاريخ غير محدد" : "Unspecified date";
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoOrDay.trim());
  if (m) {
    const year = Number(m[1]);
    const monthIdx = Number(m[2]) - 1;
    const day = Number(m[3]);
    if (monthIdx >= 0 && monthIdx < 12 && day >= 1 && day <= 31) {
      return lang === "ar"
        ? displayDigits(`${day} ${AR_MONTHS_LONG[monthIdx]} ${year}`, lang)
        : `${EN_MONTHS_LONG[monthIdx]} ${day}, ${year}`;
    }
  }
  const d = new Date(isoOrDay);
  if (Number.isNaN(d.getTime())) return isoOrDay;
  return lang === "ar"
    ? displayDigits(`${d.getDate()} ${AR_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`, lang)
    : `${EN_MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function ManagerDeliveredSalesTotal({
  operations,
  custodyStatement,
}: {
  operations?: readonly Operation[];
  custodyStatement?: ShiftCustodyStatement | null;
}) {
  const { lang, t } = useLang();
  const dailyTotal = totalManagerDailySalesHalalas(operations);
  const custodySummary = extractManagerCustodyHandovers(custodyStatement);

  if (
    dailyTotal === 0 &&
    custodyStatement &&
    custodySummary.confirmedTotalHalalas > 0
  ) {
    return (
      <p
        data-testid="manager-delivered-sales-total"
        className="text-[11px] font-medium text-emerald-700 mt-0.5"
      >
        {t("تسليمات العهدة النقدية:", "Cash handovers:")}{" "}
        <bdi className="font-mono font-bold">
          {formatShiftHalalas(custodySummary.confirmedTotalHalalas, lang)}
        </bdi>{" "}
        {t("ر.س", "SAR")}
      </p>
    );
  }

  if (dailyTotal === null) return null;

  return (
    <p
      data-testid="manager-delivered-sales-total"
      className="text-[11px] font-medium text-emerald-700 mt-0.5"
    >
      {t("إجمالي المبيعات المسلمة:", "Delivered sales:")}{" "}
      <bdi className="font-mono font-bold">
        {formatShiftHalalas(dailyTotal, lang)}
      </bdi>{" "}
      {t("ر.س", "SAR")}
    </p>
  );
}

export function ManagerDeliveredSalesSection({
  employee,
  operations,
  custodyStatement,
  isOpsPending = false,
  isOpsError = false,
  onRetryOps,
  isCustodyPending = false,
  isCustodyError = false,
  onRetryCustody,
}: {
  employee: Pick<Employee, "id" | "name" | "role" | "branchId">;
  operations?: readonly Operation[];
  custodyStatement?: ShiftCustodyStatement | null;
  isOpsPending?: boolean;
  isOpsError?: boolean;
  onRetryOps?: () => void;
  isCustodyPending?: boolean;
  isCustodyError?: boolean;
  onRetryCustody?: () => void;
}) {
  const { lang, dir, t } = useLang();

  if (
    !isBranchManagerEmployeeRole(
      employee.role,
      custodyStatement?.identity?.linked_type,
    )
  ) {
    return null;
  }

  const nonRejectedOps = (operations ?? []).filter((o) => o.status !== "rejected");
  const dayGroups = groupManagerDailySalesByDay(nonRejectedOps);
  const dailyTotal = isOpsPending || isOpsError
    ? null
    : totalManagerDailySalesHalalas(nonRejectedOps);
  const custodySummary = extractManagerCustodyHandovers(custodyStatement);
  const hasCustodyDeliveries =
    custodySummary.confirmedEntries.length > 0 ||
    custodySummary.pendingRequests.length > 0;

  return (
    <div
      data-testid="manager-delivered-sales-section"
      className="mb-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3 space-y-3"
      dir={dir}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-gray-800">
            {t("المبيعات اليومية المسلمة", "Daily delivered sales")}
          </h4>
          <p className="text-[11px] text-gray-500">
            {t(
              "تفاصيل الأيام والتقارير التي سلمها مدير الفرع",
              "Workday sales reports handed over by the branch manager",
            )}
          </p>
        </div>
        {dailyTotal !== null && (
          <div
            data-testid="manager-daily-sales-total-badge"
            className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-emerald-800"
          >
            {t("الإجمالي:", "Total:")}{" "}
            <bdi className="font-mono font-bold">
              {formatShiftHalalas(dailyTotal, lang)}
            </bdi>{" "}
            {t("ر.س", "SAR")}
          </div>
        )}
      </div>

      {isOpsPending && (
        <div className="rounded-lg bg-white/80 border border-gray-100 p-3 text-xs text-gray-400">
          {t("جاري تحميل المبيعات اليومية...", "Loading daily sales...")}
        </div>
      )}

      {isOpsError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center justify-between gap-2 text-xs text-red-700">
          <span>
            {t(
              "تعذر تحميل سجل الأيام المسلمة لهذا المدير.",
              "Could not load manager daily sales reports.",
            )}
          </span>
          {onRetryOps && (
            <button
              type="button"
              onClick={onRetryOps}
              className="px-2.5 py-1 rounded-md bg-white border border-red-200 font-semibold hover:bg-red-50"
            >
              {t("إعادة المحاولة", "Retry")}
            </button>
          )}
        </div>
      )}

      {!isOpsPending && !isOpsError && (
        <>
          {dayGroups.length === 0 ? (
            <div className="rounded-lg bg-white border border-gray-100 p-3 text-xs text-gray-400 text-center">
              {t(
                "لا توجد أيام مبيعات مسلمة مسجلة لهذا المدير حتى الآن",
                "No submitted daily sales recorded for this manager yet",
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-100">
              {dayGroups.map((group) => {
                const leadOp = group.items[0];
                const badge = leadOp
                  ? OP_STATUS_BADGES[leadOp.status]
                  : undefined;
                const refs = group.items
                  .map((o) => o.publicId)
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div
                    key={group.date}
                    data-testid="manager-day-row"
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800">
                        {formatWorkdayDate(lang, group.date)}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-gray-500">
                        {refs && <span className="font-mono">{refs}</span>}
                        {group.items.length > 1 && (
                          <span>
                            ({displayDigits(String(group.items.length), lang)}{" "}
                            {t("تقارير", "reports")})
                          </span>
                        )}
                        {badge && (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${badge.cls}`}
                          >
                            {lang === "ar" ? badge.ar : badge.en}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="font-mono font-bold text-emerald-700 flex-shrink-0">
                      {formatShiftHalalas(group.totalHalalas, lang)}{" "}
                      {t("ر.س", "SAR")}
                    </p>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/50 text-xs font-bold text-emerald-900">
                <span>
                  {t("الإجمالي الكلي", "Grand total")} (
                  {displayDigits(String(dayGroups.length), lang)}{" "}
                  {t(dayGroups.length === 1 ? "يوم" : "أيام", dayGroups.length === 1 ? "day" : "days")}
                  )
                </span>
                <span className="font-mono">
                  {formatShiftHalalas(dailyTotal, lang)} {t("ر.س", "SAR")}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {(isCustodyPending || isCustodyError || hasCustodyDeliveries) && (
        <div
          data-testid="manager-custody-handovers-section"
          className="pt-2 border-t border-emerald-200/70 space-y-2"
        >
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-bold text-gray-700">
              {t(
                "تسليمات العهدة النقدية حسب اليوم",
                "Cash custody handovers by day",
              )}
            </span>
            {hasCustodyDeliveries && (
              <span className="font-mono font-bold text-gray-700">
                {formatShiftHalalas(custodySummary.confirmedTotalHalalas, lang)}{" "}
                {t("ر.س", "SAR")}
              </span>
            )}
          </div>

          {isCustodyError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2 flex items-center justify-between text-[11px] text-red-700">
              <span>
                {t(
                  "تعذر تحميل سجل تسليمات العهدة النقدية.",
                  "Could not load cash custody handovers.",
                )}
              </span>
              {onRetryCustody && (
                <button
                  type="button"
                  onClick={onRetryCustody}
                  className="px-2 py-0.5 rounded bg-white border border-red-200 font-semibold"
                >
                  {t("إعادة المحاولة", "Retry")}
                </button>
              )}
            </div>
          )}

          {!isCustodyPending && !isCustodyError && hasCustodyDeliveries && (
            <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-100">
              {custodySummary.confirmedEntries.map((entry) => (
                <div
                  key={entry.source_id}
                  data-testid="manager-custody-handover-row"
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">
                      {formatWorkdayDate(
                        lang,
                        entry.business_date || entry.event_at,
                      )}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {lang === "ar" ? entry.label_ar : entry.label_en}
                      {entry.counterparty?.name
                        ? ` · ${entry.counterparty.name}`
                        : ""}
                    </p>
                  </div>
                  <p className="font-mono font-bold text-gray-800 flex-shrink-0">
                    {formatShiftHalalas(entry.cash_out, lang)}{" "}
                    {t("ر.س", "SAR")}
                  </p>
                </div>
              ))}
              {custodySummary.pendingRequests.map((req) => (
                <div
                  key={req.request_id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs bg-amber-50/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">
                      {formatWorkdayDate(
                        lang,
                        req.business_date || req.created_at,
                      )}
                    </p>
                    <p className="text-[10px] text-amber-700">
                      {t("تسليم بانتظار التأكيد", "Handover pending approval")}
                      {req.counterparty?.name
                        ? ` · ${req.counterparty.name}`
                        : ""}
                    </p>
                  </div>
                  <p className="font-mono font-bold text-amber-700 flex-shrink-0">
                    {formatShiftHalalas(req.amount, lang)} {t("ر.س", "SAR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
