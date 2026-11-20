import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, FileText, Pencil, Smartphone, Wallet } from "lucide-react";
import { api } from "../../../../../api/client";
import type { Operation, Page } from "../../../../../api/types";
import type { Shift } from "../../../../../api/types/company";
import { useOperation } from "../../../../../api/queries/operations";
import { useLang } from "../../_shared/LangContext";
import { formatShiftHalalas } from "../../shiftCountEvidence";
import { ShiftReportCorrectionForm } from "../../CompanyDashboard";
import { apiOpToCOp } from "../../operationMapping";
import { getShiftCorrectionEvidence, getShiftCorrectionIneligibilityReason, getShiftCorrectionNextStep } from "../../shiftReportCorrection";
import { formatWorkdayDate } from "./ManagerDeliveredSales";
import type { DailySalesReport } from "./workdaySalesReport";

function isMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function shiftTime(value: string | null | undefined, lang: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) return "—";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA" : "en-GB", {
    timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

/** The server's submitted-workday filter and the daily lock's exact shift IDs
 * must both agree. Never attach a same-date shift belonging to another day. */
export async function loadDailyReportMemberShifts(
  report: Pick<DailySalesReport, "workday" | "managerShiftId" | "memberShiftIds" | "operation">,
  signal?: AbortSignal,
): Promise<{ shifts: Shift[]; missingCount: number }> {
  if (!report.memberShiftIds.length) return { shifts: [], missingCount: 0 };
  // The member_source_ids are CashierShift IDs, while /shifts/history emits
  // mirrored ASAB Shift IDs. The stable join available to this read-only API
  // is reportReview.memberships[].day_id -> managerShiftId.
  const matches = new Map<string, Shift>();
  let expectedTotal: number | null = null;
  let totalSeen = 0;

  for (let page = 1; ; page++) {
    const response = await api.get<Page<Shift> & { meta: Page<Shift>["meta"] & { submittedWithWorkday?: boolean } }>(
      "/accountant/shifts/history",
      { params: {
        branchId: report.operation.branchId,
        submittedWithWorkday: true, role: "cashier", pageSize: 100, page,
      }, signal },
    );
    const { data, meta } = response.data;
    if (!Array.isArray(data) || meta?.submittedWithWorkday !== true || meta.page !== page ||
      !Number.isSafeInteger(meta.totalPages) || meta.totalPages < 1 ||
      !Number.isSafeInteger(meta.total) || meta.total < 0 ||
      (expectedTotal !== null && meta.total !== expectedTotal)) {
      throw new Error("DAILY_SHIFT_HISTORY_INCOMPLETE");
    }
    expectedTotal = meta.total;
    totalSeen += data.length;
    for (const shift of data) {
      const belongsToDay = shift.reportReview?.memberships?.some((member) => member.day_id === report.managerShiftId);
      if (!belongsToDay) continue;
      if (shift.branchId !== report.operation.branchId || (shift.role && shift.role !== "cashier") || matches.has(shift.id)) {
        throw new Error("DAILY_SHIFT_HISTORY_PROVENANCE_MISMATCH");
      }
      matches.set(shift.id, shift);
    }
    if (page >= meta.totalPages) break;
    if (!data.length) throw new Error("DAILY_SHIFT_HISTORY_MISSING_PAGE");
  }
  if (totalSeen !== expectedTotal) throw new Error("DAILY_SHIFT_HISTORY_PARTIAL");
  if (matches.size > report.memberShiftIds.length) throw new Error("DAILY_SHIFT_HISTORY_MEMBERSHIP_MISMATCH");
  return {
    shifts: Array.from(matches.values()),
    missingCount: report.memberShiftIds.length - matches.size,
  };
}

/** A day is a read-only rollup. Corrections belong to a verified member's
 * pending shift operation and must use COR-05, never legacy sales-details. */
function DailyReportMemberEdit({ shift, managerShiftId }: { shift: Shift; managerShiftId: string }) {
  const { t, lang } = useLang();
  const operationId = shift.reportReview?.operation_id;
  const operationQuery = useOperation(operationId);
  const operation = operationQuery.data;
  const linked = operation && operation.moduleKey === "shifts" &&
    operation.branchId === shift.branchId &&
    (operation.id === operationId || operation.publicId === operationId) &&
    operation.payload?.shiftId === shift.id &&
    shift.reportReview?.memberships?.some(member => member.day_id === managerShiftId);
  const validOperation: Operation | null = linked ? operation : null;
  const correctionEvidence = validOperation
    ? getShiftCorrectionEvidence(apiOpToCOp(validOperation), validOperation, "accountant") : null;

  if (!operationId) return <p role="note" className="text-xs text-amber-800">
    {t("لا يوجد تقرير مراجعة موثّق مرتبط بهذه الوردية؛ لا يمكن تعديل بياناتها من هنا.",
      "No verified review operation is linked to this shift; editing is unavailable here.")}
  </p>;
  if (operationQuery.isPending) return <p role="status" className="text-xs text-gray-500">
    {t("جارٍ التحقق من صلاحية تعديل الوردية…", "Checking shift correction eligibility…")}
  </p>;
  if (operationQuery.isError) return <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-red-700">
    <span>{t("تعذر جلب تقرير الوردية للتحقق من التعديل.", "Could not verify the shift report for editing.")}</span>
    <button type="button" onClick={() => void operationQuery.refetch()} className="rounded-md border border-red-200 px-2 py-1 font-semibold">
      {t("إعادة المحاولة", "Retry")}
    </button>
  </div>;
  if (!validOperation) return <p role="alert" className="text-xs text-amber-800">
    {t("تقرير الوردية لا يطابق عضوية يوم العمل المحدد؛ تم منع التعديل.",
      "Shift report does not match this workday membership; editing is blocked.")}
  </p>;
  if (!correctionEvidence) return <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
    <p className="font-semibold">{t("التعديل غير متاح لهذه الوردية حالياً.", "This shift is not editable right now.")}</p>
    <p>{getShiftCorrectionIneligibilityReason(apiOpToCOp(validOperation), validOperation, "accountant", lang)}</p>
    <p>{getShiftCorrectionNextStep(apiOpToCOp(validOperation), validOperation, "accountant", lang)}</p>
  </div>;

  return <div className="space-y-3" data-testid="daily-sales-member-edit-form">
    <p className="text-xs text-purple-800">{t(
      "عدّل قنوات الدفع أو النقد المجرود مع ذكر السبب؛ إجمالي المبيعات الأصلي لا يُعدَّل. تحفظ التغييرات كنسخة جديدة من تقرير الوردية.",
      "Adjust channels or counted cash with a reason; original gross sales stay locked. Changes create a new shift report revision.")}</p>
    <ShiftReportCorrectionForm
      key={`${validOperation.id}:${correctionEvidence.reportRevision}`}
      op={apiOpToCOp(validOperation)} detail={validOperation}
    />
  </div>;
}

export function DailySalesShiftDetails({ report, embedded = false, showDayCollection = true, editOpen: controlledEditOpen }: {
  report: DailySalesReport;
  /** The sales-reconciliation card owns the heading and edit action in the live dashboard. */
  embedded?: boolean;
  showDayCollection?: boolean;
  editOpen?: boolean;
}) {
  const { lang, t } = useLang();
  const [localEditOpen, setLocalEditOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const editOpen = controlledEditOpen ?? localEditOpen;
  const money = (value: number | null | undefined) => isMoney(value)
    ? `${formatShiftHalalas(value, lang)} ${t("ر.س", "SAR")}` : "—";
  const paid = [report.cashHalalas, report.cardHalalas, report.appsHalalas];
  const channelTotal = paid.every(isMoney) ? paid.reduce<number>((sum, v) => sum + (v ?? 0), 0) : null;
  const channelMatch = channelTotal !== null && report.totalSalesHalalas !== null
    ? channelTotal === report.totalSalesHalalas : null;
  const members = useQuery({
    queryKey: ["sales", "daily-report-shifts", report.operation.branchId, report.managerShiftId, [...report.memberShiftIds].sort().join("|")],
    enabled: report.memberShiftIds.length > 0,
    queryFn: ({ signal }) => loadDailyReportMemberShifts(report, signal),
    staleTime: 30_000,
    retry: 1,
  });
  const selectedShift = members.data?.shifts.find((shift) => shift.id === editingShiftId)
    ?? members.data?.shifts[0] ?? null;

  return (
    <div data-testid="daily-sales-shift-details" className={embedded ? "bg-white" : "overflow-hidden rounded-xl border border-gray-200 bg-white"}>
      {!report.provenanceVerified && <p role="note" className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
        {t("بيانات التقرير موجودة، لكن السيرفر لم يؤكد تصنيفه كتقرير إغلاق يومي؛ الأرقام معروضة للفحص فقط وليست إجماليًا ماليًا معتمدًا.",
          "The report payload is present, but the server has not verified its daily-close classification. These amounts are for inspection only, not approved financial totals.")}
      </p>}
      {!embedded && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
        <div>
          <h3 className="text-base font-bold text-gray-900">{t("تسوية مبيعات اليوم", "Daily sales breakdown")}</h3>
          <p className="mt-1 text-xs text-gray-500">
            {report.operation.branchName} · {formatWorkdayDate(lang, report.workday)} · {report.managerName || t("مدير الفرع", "Branch manager")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" data-testid="daily-sales-edit-toggle" aria-expanded={editOpen}
            aria-controls={`daily-sales-edit-${report.operation.id}`}
            onClick={() => setLocalEditOpen(open => !open)}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">
            <Pencil size={15} /> {editOpen ? t("إغلاق التعديل", "Close editing") : t("تعديل الأرقام", "Edit figures")}
          </button>
        </div>
      </div>}

      {showDayCollection && <div className="divide-y divide-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/80 px-4 py-3.5 text-sm font-bold text-indigo-900">
          <span className="flex flex-wrap items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />
            {t("إجمالي المبيعات", "Total sales")}
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{t("من إغلاق مدير الفرع — مقفل", "Manager close — locked")}</span>
          </span>
          <bdi className="font-mono text-base font-extrabold tabular-nums">{money(report.totalSalesHalalas)}</bdi>
        </div>
        {([
          [t("النقد المحصّل", "Cash collected"), report.cashHalalas, <Wallet size={16} />],
          [t("مدفوعات الشبكة", "Card payments"), report.cardHalalas, <CreditCard size={16} />],
        ] as const).map(([label, value, icon]) => (
          <div key={label} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-slate-50/60">
            <span className="flex items-center gap-2 font-medium text-gray-700"><span className="text-gray-500">{icon}</span>{label}</span>
            <bdi className="font-mono font-semibold tabular-nums text-gray-800">{money(value)}</bdi>
          </div>
        ))}
        <div className="bg-slate-50 px-4 py-2.5 text-xs font-semibold text-gray-600">{t("تطبيقات التوصيل", "Delivery apps")}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-slate-50/60">
          <span className="flex items-center gap-2 font-medium text-gray-700"><Smartphone size={16} className="text-gray-500" />{t("إجمالي تطبيقات التوصيل", "Delivery apps total")}</span>
          <bdi className="font-mono font-semibold tabular-nums text-gray-800">{money(report.appsHalalas)}</bdi>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/80 px-4 py-3.5 text-sm font-bold text-emerald-900">
          <span>{t("إجمالي التحصيل", "Total collected")}</span>
          <bdi className="font-mono text-base font-extrabold tabular-nums">{money(channelTotal)}</bdi>
        </div>
        {channelMatch === true && <p className="bg-emerald-50 px-4 py-2.5 text-center text-xs font-semibold text-emerald-700">
          ✓ {t("إجمالي التحصيل مطابق لإجمالي المبيعات تماماً", "Total collected matches submitted sales exactly")}
        </p>}
        {channelMatch === false && <p role="alert" className="flex items-center gap-2 border-t border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          <AlertTriangle size={14} />{t("يوجد اختلاف بين إجمالي المبيعات وتفصيل القنوات في التقرير المُرسل.", "Submitted sales do not match the channel total.")}
        </p>}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800">
          <span>
            {report.operation.workdaySettlement != null
              ? t("فرق التحصيل النهائي", "Final collection variance")
              : t("فرق الجرد النقدي (من التقرير)", "Cash-count variance (reported)")}
          </span>
          <bdi className={`font-mono ${report.varianceHalalas != null && report.varianceHalalas < 0 ? "text-red-700" : "text-gray-800"}`}>
            {money(report.varianceHalalas)}
          </bdi>
        </div>
        {report.reportedCashVarianceHalalas != null && report.reportedCashVarianceHalalas !== report.varianceHalalas && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/60 px-4 py-2.5 text-xs font-semibold text-gray-600">
            <span>{t("فرق الجرد النقدي التاريخي للورديات (من التقرير الأصلي)", "Historical shift cash-count variance (original report)")}</span>
            <bdi className="font-mono text-gray-700">{money(report.reportedCashVarianceHalalas)}</bdi>
          </div>
        )}
      </div>}
      {editOpen && <section id={`daily-sales-edit-${report.operation.id}`} role="region"
        aria-label={t("تعديل تفاصيل ورديات اليوم", "Edit daily shift details")}
        className="mx-4 my-4 space-y-3 rounded-xl border border-purple-200 bg-purple-50/50 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 text-sm font-bold text-purple-900"><Pencil size={15}/>{t("تعديل الأرقام", "Edit figures")}</h4>
          <span className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-purple-700">{t("تصحيح وردية موثّق", "Verified shift correction")}</span>
        </div>
        <p className="text-xs leading-relaxed text-purple-900">
          {report.provenanceVerified && report.operation.status === "pending" && report.memberShiftIds.length > 0
            ? t("اختر وردية الكاشير لتصحيح قنوات الدفع أو النقد المجرود. إجمالي إغلاق المدير الأصلي مقفل.",
              "Select a cashier shift to correct payment channels or counted cash. The manager's consolidated close cannot be edited directly.")
            : t("هذا التقرير غير مؤهل للتعديل المباشر: قد يكون مُعتمدًا أو تنقصه بيانات الربط الموثّقة.",
              "Direct editing is unavailable: this report may be approved or lack verified shift links.")}
        </p>
        {report.provenanceVerified && report.operation.status === "pending" && members.isSuccess && members.data.shifts.length > 0 && <>
          {members.data.shifts.length > 1 && <div className="flex flex-wrap items-center gap-2" aria-label={t("اختر الوردية المراد تعديلها", "Choose a shift to edit")}>
            {members.data.shifts.map(shift => <button key={shift.id} type="button" aria-pressed={selectedShift?.id === shift.id}
              onClick={() => setEditingShiftId(shift.id)}
              className={`min-h-9 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${selectedShift?.id === shift.id ? "border-purple-600 bg-purple-600 text-white" : "border-purple-200 bg-white text-purple-800 hover:bg-purple-100"}`}>
              {shift.cashierName || t("الكاشير", "Cashier")} · {t("وردية", "Shift")} {shift.shiftNo}
            </button>)}
          </div>}
          {selectedShift && <DailyReportMemberEdit key={selectedShift.id} shift={selectedShift} managerShiftId={report.managerShiftId} />}
        </>}
        {report.provenanceVerified && report.operation.status === "pending" && members.isSuccess && members.data.shifts.length === 0 && <p role="note" className="text-xs text-amber-800">
          {t("لا توجد ورديات مرتبطة مؤكدة يمكن تصحيحها.", "No verified linked shifts are available for correction.")}
        </p>}
      </section>}
      <p className="px-4 py-3 text-xs leading-relaxed text-gray-500">
        {t("هذه أرقام تقرير الإغلاق المرسل فعليًا؛ تفصيل كل تطبيق توصيل غير موجود في هذا المصدر. تصحيح الورديات يتم عبر دورة PKG-6، وليس تعديل سجل المبيعات القديم.",
          "These figures are from the actual submitted close. Per-app breakdown is not in this source. PKG-6 shift correction is separate from legacy sales editing.")}
      </p>
      {report.notes && <div className="mx-4 mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
        <p className="mb-1 font-bold text-gray-700">{t("ملاحظات إغلاق اليوم", "Daily close notes")}</p>
        <p className="whitespace-pre-wrap text-gray-600">{report.notes}</p>
      </div>}

      <div className="space-y-3 border-t border-gray-100 bg-slate-50/40 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2"><FileText size={17} className="text-purple-700" />
          <h3 className="text-sm font-bold text-gray-900">{t("تفاصيل ورديات الكاشير المشمولة", "Included cashier shift details")}</h3>
          <span className="text-xs text-gray-500">({report.memberShiftIds.length})</span>
        </div>
        {report.memberShiftIds.length === 0 && <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          {t("التقرير لا يحتوي معرفات ورديات مربوطة، لذلك لا يمكن إظهار تفاصيل فردية مؤكدة.", "The report does not contain linked shift IDs; individual details cannot be verified.")}
        </p>}
        {members.isPending && report.memberShiftIds.length > 0 && <p role="status" className="text-xs text-gray-600">{t("جارٍ تحميل ورديات اليوم…", "Loading the day's shifts…")}</p>}
        {members.isError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <span>{t("تعذر تحميل تفاصيل الورديات المربوطة من السيرفر.", "Could not load verified linked shifts.")}</span>
          <button onClick={() => void members.refetch()} className="rounded-md border border-red-200 bg-white px-2 py-1 font-semibold">{t("إعادة المحاولة", "Retry")}</button>
        </div>}
        {members.isSuccess && <>
          {members.data.shifts.map((shift) => (
            <article key={shift.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-gray-800">{shift.cashierName || t("الكاشير", "Cashier")} · {t("وردية", "Shift")} {shift.shiftNo}</span>
                <span className="font-mono text-sm font-bold text-purple-800">{t("مبيعات الوردية:", "Shift sales:")} {money(shift.salesHalalas)}</span>
              </div>
              <p className="mb-3 text-[11px] text-gray-500">
                {t("بداية الوردية:", "Started:")} {shiftTime(shift.startedAt, lang)} · {t("نهاية الوردية:", "Ended:")} {shiftTime(shift.endedAt, lang)}
                {shift.ordersCount != null && <> · {t("الطلبات:", "Orders:")} {shift.ordersCount}</>}
                {shift.statusLabelAr && <> · {shift.statusLabelAr}</>}
              </p>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {([
                  [t("الرصيد الافتتاحي", "Opening float"), shift.openingFloatHalalas],
                  [t("النقد المتوقع", "Expected cash"), shift.cashExpectedHalalas],
                  [t("النقد المجرود", "Counted cash"), shift.cashActualHalalas],
                  [t("فرق النقد", "Cash variance"), shift.varianceHalalas],
                ] as const).map(([label, value]) => (
                  <div key={label}><dt className="text-[11px] text-gray-500">{label}</dt><dd className="mt-1 font-mono text-xs font-semibold text-gray-800">{money(value)}</dd></div>
                ))}
              </dl>
            </article>
          ))}
          {members.data.missingCount > 0 && <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {t("بعض الورديات المربوطة لم تظهر في سجل الورديات المرسل؛ لا نعرض أرقامًا غير متحقّق منها.", "Some linked shifts are missing from submitted history; unverified values are not shown.")}
          </p>}
        </>}
      </div>
    </div>
  );
}
