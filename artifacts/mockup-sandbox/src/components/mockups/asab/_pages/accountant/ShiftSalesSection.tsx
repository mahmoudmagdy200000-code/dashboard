import { useId, useState, type ReactNode } from "react";
import type { Shift } from "../../../../../api/types/company";
import { useOperation } from "../../../../../api/queries/operations";
import {
  historyPageTarget,
  useShiftsHistory,
} from "../../../../../api/queries/shifts";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { useLang, type Lang } from "../../_shared/LangContext";
import type { Op } from "../../_shared/types";
import { displayDigits } from "../../_shared/displayDigits";
import {
  formatShiftHalalas,
  getShiftCountEvidence,
  getShiftStatusDisplay,
} from "../../shiftCountEvidence";

const dateFormats = {
  ar: new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }),
  en: new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }),
};

function ShiftTime({ value, lang }: { value?: string | null; lang: Lang }) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? (
    "—"
  ) : (
    <time dateTime={value}>{dateFormats[lang].format(date)}</time>
  );
}

function ShiftMoney({ value }: { value: number | null | undefined }) {
  const { lang, t } = useLang();
  return value == null ? (
    "—"
  ) : (
    <>
      <bdi>{formatShiftHalalas(value, lang)}</bdi> {t("ر.س", "SAR")}
    </>
  );
}

function ShiftField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm font-semibold ${className}`}>
        {children}
      </dd>
    </div>
  );
}

function ShiftSalesDetails({
  shift,
  operationId,
}: {
  shift: Shift;
  operationId?: string;
}) {
  const { lang, t } = useLang();
  const reportQuery = useOperation(operationId);
  const operation = reportQuery.data;
  const report =
    operation?.moduleKey === "shifts" &&
    operation.branchId === shift.branchId &&
    (operation.id === operationId || operation.publicId === operationId)
      ? operation
      : undefined;
  const cashCounted =
    shift.cashCountState === "counted" ? shift.cashActualHalalas : null;
  const notes = report?.handoverNotes ?? report?.payload?.handoverNotes;

  return (
    <div className="space-y-4 border-t border-gray-100 bg-gray-50/80 p-4">
      <dl className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-4">
        <ShiftField label={t("النقد المجرود", "Counted cash")}>
          {shift.cashCountState === "unknown" ? (
            t("غير مجرود", "Not counted")
          ) : (
            <ShiftMoney value={cashCounted} />
          )}
        </ShiftField>
        <ShiftField label={t("النقد المتوقع", "Expected cash")}>
          <ShiftMoney value={shift.cashExpectedHalalas} />
        </ShiftField>
        <ShiftField label={t("وقت بداية الوردية", "Shift started")}>
          <ShiftTime value={shift.startedAt} lang={lang} />
        </ShiftField>
        <ShiftField label={t("وقت إغلاق الوردية", "Shift closed")}>
          <ShiftTime value={shift.endedAt} lang={lang} />
        </ShiftField>
        {report && (
          <>
            <ShiftField label={t("مبيعات نقدية", "Cash sales")}>
              <ShiftMoney
                value={
                  report.cashCollectedHalalas ??
                  report.payload?.cashCollectedHalalas
                }
              />
            </ShiftField>
            <ShiftField label={t("مدفوعات الشبكة", "Card payments")}>
              <ShiftMoney value={report.payload?.cardTotalHalalas} />
            </ShiftField>
            <ShiftField label={t("منصات التوصيل", "Delivery platforms")}>
              <ShiftMoney value={report.payload?.aggregatorTotalsHalalas} />
            </ShiftField>
            <ShiftField
              label={t(
                "وقت إرسال التقرير للمراجعة",
                "Report submitted for review",
              )}
            >
              <ShiftTime value={report.submittedAt} lang={lang} />
            </ShiftField>
          </>
        )}
      </dl>
      {notes && (
        <dl>
          <ShiftField label={t("ملاحظات التسليم", "Handover notes")}>
            {notes}
          </ShiftField>
        </dl>
      )}
      {operationId && reportQuery.isPending && (
        <p role="status" className="text-sm text-gray-500">
          {t("جارٍ تحميل تقرير الوردية…", "Loading shift report…")}
        </p>
      )}
      {operationId && reportQuery.isError && (
        <div className="flex flex-wrap items-center gap-2">
          <p role="status" className="text-sm text-gray-600">
            {t("تعذر تحميل تقرير الوردية.", "Could not load the shift report.")}
          </p>
          <Btn
            size="sm"
            variant="outline"
            onClick={() => void reportQuery.refetch()}
          >
            {t("إعادة المحاولة", "Retry")}
          </Btn>
        </div>
      )}
      {(!operationId || (reportQuery.isSuccess && !report)) && (
        <p className="text-sm text-gray-500">
          {t(
            "تقرير المراجعة غير متاح لهذه الوردية.",
            "The review report is unavailable for this shift.",
          )}
        </p>
      )}
      {report?.auditTrail?.length ? (
        <div>
          <h4 className="mb-2 text-sm font-bold">
            {t("سجل إجراءات التقرير", "Report activity")}
          </h4>
          <ul className="space-y-2 text-sm text-gray-600">
            {report.auditTrail.map((event, index) => (
              <li
                key={index}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
              >
                <span className="font-medium text-gray-900">
                  {event.action}
                </span>
                {event.by && <bdi>{event.by}</bdi>}
                <span className="text-xs">
                  <ShiftTime value={event.time} lang={lang} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ShiftSalesRow({
  shift,
  linkedOperation,
  expanded,
  toggle,
}: {
  shift: Shift;
  linkedOperation?: Op;
  expanded: boolean;
  toggle: () => void;
}) {
  const { lang, t } = useLang();
  const detailId = useId();
  const { variance } = getShiftCountEvidence(shift, lang);
  const status = getShiftStatusDisplay(shift.status, lang);
  const publicId = shift.reportReview?.public_id ?? linkedOperation?.id;
  const operationId = shift.reportReview?.operation_id ?? publicId;

  return (
    <li
      data-shift-sales-id={shift.id}
      className="overflow-hidden rounded-xl border border-gray-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1 basis-44">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="break-words text-sm text-gray-900">
              {shift.branchName || "—"}
            </strong>
            <span className={`rounded-full px-2 py-0.5 text-xs ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 break-words text-xs text-gray-600">
            <bdi>{shift.cashierName || "—"}</bdi>
            {publicId && (
              <>
                {" "}
                · <bdi>{publicId}</bdi>
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {t("بدأت", "Started")}{" "}
            <ShiftTime value={shift.startedAt} lang={lang} />
          </p>
        </div>
        <dl className="grid flex-1 basis-44 grid-cols-2 gap-3">
          <ShiftField
            label={t("إجمالي المبيعات", "Total sales")}
            className="text-gray-900"
          >
            <ShiftMoney value={shift.salesHalalas} />
          </ShiftField>
          <ShiftField
            label={t("فرق النقد", "Cash variance")}
            className={variance.cls}
          >
            <bdi>{variance.text}</bdi>
          </ShiftField>
        </dl>
        <button
          type="button"
          className="rounded-lg border border-purple-200 px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50 focus-visible:outline-2 focus-visible:outline-purple-600"
          aria-expanded={expanded}
          aria-controls={detailId}
          onClick={toggle}
        >
          {expanded
            ? t("إخفاء التفاصيل", "Hide details")
            : t("عرض التفاصيل", "View details")}
        </button>
      </div>
      <div id={detailId} hidden={!expanded}>
        {expanded && (
          <ShiftSalesDetails shift={shift} operationId={operationId} />
        )}
      </div>
    </li>
  );
}

export function ShiftSalesSection({
  operations,
}: {
  operations: readonly Op[];
}) {
  const { lang, t } = useLang();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const history = useShiftsHistory({ page, pageSize: 5 });
  const shifts =
    history.data?.data.filter(
      (shift) => !shift.role || shift.role === "cashier",
    ) ?? [];
  const meta = history.data?.meta;
  const prev = historyPageTarget(meta, page, -1);
  const next = historyPageTarget(meta, page, 1);

  function changePage(target: number) {
    setExpandedId(null);
    setPage(target);
  }

  return (
    <Card title={t("مبيعات الورديات", "Shift sales")}>
      <div className="space-y-3 p-4 sm:p-5">
        <p className="text-sm text-gray-600">
          {t(
            "الورديات المقفلة من السجل التاريخي. الأوقات بتوقيت السعودية.",
            "Closed shifts from shift history. All times are shown in Saudi local time.",
          )}
        </p>
        {history.isPending && (
          <p role="status" className="text-sm text-gray-500">
            {t("جارٍ تحميل الورديات…", "Loading shifts…")}
          </p>
        )}
        {history.isError && (
          <div className="flex flex-wrap items-center gap-2">
            <p role="status" className="text-sm text-gray-600">
              {t(
                "تعذر تحديث مبيعات الورديات.",
                "Could not refresh shift sales.",
              )}
            </p>
            <Btn
              size="sm"
              variant="outline"
              onClick={() => void history.refetch()}
            >
              {t("إعادة المحاولة", "Retry")}
            </Btn>
          </div>
        )}
        {history.isSuccess && shifts.length === 0 && (
          <p className="text-sm text-gray-500">
            {t(
              "لا توجد ورديات كاشير في هذه الصفحة.",
              "No cashier shifts on this page.",
            )}
          </p>
        )}
        {shifts.length > 0 && (
          <ul className="space-y-2">
            {shifts.map((shift) => {
              // Native and older history rows can lack reportReview. Link only an
              // unambiguous, non-correction operation with the same shift and branch.
              const matches =
                shift.reportReview?.operation_id ||
                shift.reportReview?.public_id
                  ? []
                  : operations.filter(
                      (op) =>
                        op.moduleKey === "shifts" &&
                        !op.isCorrection &&
                        op.sourceId === shift.id &&
                        op.branchId === shift.branchId,
                    );
              return (
                <ShiftSalesRow
                  key={shift.id}
                  shift={shift}
                  linkedOperation={
                    matches.length === 1 ? matches[0] : undefined
                  }
                  expanded={expandedId === shift.id}
                  toggle={() =>
                    setExpandedId((id) => (id === shift.id ? null : shift.id))
                  }
                />
              );
            })}
          </ul>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Btn
              size="sm"
              variant="outline"
              disabled={prev === page}
              onClick={() => changePage(prev)}
            >
              {t("السابق", "Previous")}
            </Btn>
            <span className="text-xs text-gray-600">
              {t("الصفحة", "Page")}{" "}
              <bdi>
                {displayDigits(`${meta.page} / ${meta.totalPages}`, lang)}
              </bdi>
            </span>
            <Btn
              size="sm"
              variant="outline"
              disabled={next === page}
              onClick={() => changePage(next)}
            >
              {t("التالي", "Next")}
            </Btn>
          </div>
        )}
      </div>
    </Card>
  );
}
