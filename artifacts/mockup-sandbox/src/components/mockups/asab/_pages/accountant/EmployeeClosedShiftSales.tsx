import { useState } from "react";
import type { Operation } from "../../../../../api/types";
import type { Employee, Shift } from "../../../../../api/types/company";
import type { ShiftCustodyStatement } from "../../../../../api/queries/employees";
import { useOperation } from "../../../../../api/queries/operations";
import { useEmployeeClosedShifts } from "../../../../../api/queries/shifts";
import { useLang } from "../../_shared/LangContext";
import { Btn } from "../../components/Btn";
import { formatShiftHalalas } from "../../shiftCountEvidence";

type Identity = ShiftCustodyStatement["identity"];
type ShiftEmployee = Pick<Employee, "id" | "branchId">;

export function employeeShiftAssignedVariance(
  report: Operation | undefined,
  shift: Shift,
  employee: ShiftEmployee,
  identity?: Identity,
): number | null {
  if (report?.moduleKey !== "shifts" || report.id !== shift.reportReview?.operation_id
    || report.branchId !== shift.branchId || (report.payload?.shiftId ?? report.sourceId) !== shift.id
    || shift.cashierEmployeeId !== employee.id || shift.branchId !== employee.branchId) return null;

  const cashierId = identity?.employee_id === employee.id && identity.branch_id === employee.branchId
    && identity.linked_type === "cashier" ? identity.linked_id : null;
  const amount = (report.liability?.shares ?? []).reduce((total, share) => {
    const belongsToEmployee = (share.type === "employee" && share.id === employee.id)
      || (share.type === "cashier" && cashierId !== null && share.id === cashierId);
    const value = share.amountHalalas;
    return belongsToEmployee && typeof value === "number" && Number.isSafeInteger(value) && value > 0
      ? total + value : total;
  }, 0);
  return amount > 0 && Number.isSafeInteger(amount) ? amount : null;
}

function EmployeeShiftSale({ shift, employee, identity }: { shift: Shift; employee: ShiftEmployee; identity?: Identity }) {
  const { lang, t } = useLang();
  const report = useOperation(shift.reportReview?.operation_id);
  const assigned = employeeShiftAssignedVariance(report.data, shift, employee, identity);
  const closedAt = new Date(shift.endedAt ?? "");
  const closed = Number.isNaN(closedAt.getTime()) ? "—" : new Intl.DateTimeFormat(
    lang === "ar" ? "ar-SA-u-ca-gregory" : "en-GB",
    { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" },
  ).format(closedAt);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-gray-900">{shift.shiftType || t("وردية", "Shift")} {shift.reportReview?.public_id && <bdi>{shift.reportReview.public_id}</bdi>}</p>
        <p className="text-xs text-gray-600">{closed}</p>
      </div>
      <div className="space-y-0.5 text-end">
        <p className="text-xs text-gray-600">{t("إجمالي مبيعات الوردية", "Shift sales total")}</p>
        <p className="text-base font-bold tabular-nums text-gray-900"><bdi>{formatShiftHalalas(shift.salesHalalas, lang)}</bdi> {t("ر.س", "SAR")}</p>
        {assigned !== null && <p className="text-xs text-gray-500">{t("فرق مسند للموظف", "Assigned variance")} <bdi>{formatShiftHalalas(assigned, lang)}</bdi> {t("ر.س", "SAR")}</p>}
      </div>
    </li>
  );
}

const pageSize = 8;

export function EmployeeClosedShiftSales({ employee, identity }: { employee: ShiftEmployee; identity?: Identity }) {
  const { t } = useLang();
  const query = useEmployeeClosedShifts(employee.id, employee.branchId);
  const [page, setPage] = useState(1);
  if (!employee.branchId) return null;
  const shifts = query.data ?? [];
  const lastPage = Math.max(1, Math.ceil(shifts.length / pageSize));
  const currentPage = Math.min(page, lastPage);
  const shown = shifts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section aria-label={t("مبيعات الورديات المقفلة", "Closed shift sales")} className="mt-4 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <h3 className="text-sm font-bold text-gray-900">{t("مبيعات الورديات المقفلة", "Closed shift sales")}</h3>
      {query.isPending && <p role="status" className="text-sm text-gray-600">{t("جارٍ تحميل الورديات…", "Loading shifts…")}</p>}
      {query.isError && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-700">
        {t("تعذر تحميل مبيعات الورديات", "Could not load shift sales")}
        <Btn size="sm" variant="outline" onClick={() => void query.refetch()}>{t("إعادة المحاولة", "Retry")}</Btn>
      </div>}
      {query.isSuccess && !shifts.length && <p className="text-sm text-gray-600">{t("لا توجد ورديات مقفلة لهذا الموظف", "No closed shifts for this employee")}</p>}
      {shown.length > 0 && <ul className="space-y-2">
        {shown.map(shift => <EmployeeShiftSale key={shift.id} shift={shift} employee={employee} identity={identity} />)}
      </ul>}
      {lastPage > 1 && <div className="flex items-center justify-between gap-2">
        <Btn size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{t("السابق", "Previous")}</Btn>
        <span className="text-xs text-gray-600">{currentPage} / {lastPage}</span>
        <Btn size="sm" variant="outline" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>{t("التالي", "Next")}</Btn>
      </div>}
    </section>
  );
}
