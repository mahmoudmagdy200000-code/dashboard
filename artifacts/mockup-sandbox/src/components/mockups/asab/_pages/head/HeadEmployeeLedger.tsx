import { useState } from "react";
import { useHeadEmployeeStatement, useHeadEmployees } from "../../../../../api/queries/platform/head";
import { useLang } from "../../_shared/LangContext";

function money(halalas: number | undefined, lang: "ar" | "en") {
  if (typeof halalas !== "number" || !Number.isFinite(halalas)) return "—";
  return new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(halalas / 100);
}

export function HeadEmployeeLedger() {
  const { t, lang, dir } = useLang();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const employeesQuery = useHeadEmployees({ search, pageSize: 100 });
  const employees = employeesQuery.data ?? [];
  const selectedIdOrFirst = selectedId && employees.some(employee => employee.id === selectedId)
    ? selectedId
    : employees[0]?.id;
  const statementQuery = useHeadEmployeeStatement(selectedIdOrFirst);
  const statement = statementQuery.data;
  const selectedEmployee = employees.find(employee => employee.id === selectedIdOrFirst);
  const displayCurrency = (value: number | undefined) => `${money(value, lang)} ${t("ر.س", "SAR")}`;

  return (
    <section className="space-y-4" dir={dir} aria-label={t("كشف حساب الموظفين", "Employee ledger")}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t("كشف حساب الموظفين", "Employee ledger")}</h3>
          <p className="mt-1 text-sm text-gray-500">{t("أرصدة وحركات الموظفين من سجل الحسابات الفعلي", "Employee balances and movements from the live company ledger")}</p>
        </div>
        <span className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700">
          {employees.length} {t("موظف", "employees")}
        </span>
      </header>

      <label className="block rounded-xl border border-gray-200 bg-white p-3 text-xs font-semibold text-gray-600">
        {t("رقم الموظف أو الاسم", "Employee number or name")}
        <input value={search} onChange={event => setSearch(event.target.value)}
          placeholder={t("ابحث برقم الموظف أو الاسم...", "Search by employee number or name...")}
          className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal outline-none focus:border-purple-400" />
      </label>

      {employeesQuery.isPending && <p role="status" className="rounded-xl bg-white p-5 text-sm text-gray-500">{t("جارٍ تحميل الموظفين...", "Loading employees...")}</p>}
      {employeesQuery.isError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{t("تعذر تحميل كشف الموظفين من الخادم", "Could not load the employee ledger from the server")}</p>}
      {!employeesQuery.isPending && !employeesQuery.isError && employees.length === 0 && <p className="rounded-xl bg-white p-5 text-sm text-gray-500">{t("لا توجد بيانات موظفين ضمن نطاق صلاحيتك", "No employees are available in your access scope")}</p>}

      {employees.length > 0 && (
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.5fr)]">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <h4 className="border-b border-gray-100 px-4 py-3 text-sm font-bold text-gray-800">{t("قائمة الموظفين", "Employees")}</h4>
            <div className="divide-y divide-gray-100">
              {employees.map(employee => (
                <button key={employee.id} type="button" onClick={() => setSelectedId(employee.id)}
                  aria-pressed={employee.id === selectedIdOrFirst}
                  className={`flex w-full flex-wrap items-center gap-3 px-4 py-3 text-start hover:bg-purple-50/60 ${employee.id === selectedIdOrFirst ? "bg-purple-50" : ""}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 text-sm font-bold text-white">{employee.name.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold text-gray-900">{employee.name}</span>
                    <span className="mt-0.5 block break-all text-xs text-gray-500">{employee.empNumber} · {employee.branchName || employee.branchId || "—"}</span>
                  </span>
                  <span className={`font-mono text-xs font-bold ${(employee.balanceHalalas ?? 0) < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {displayCurrency(employee.balanceHalalas)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-purple-100 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
              <div>
                <h4 className="break-words text-sm font-bold text-gray-900">{t("كشف حساب:", "Statement:")} {statement?.employee?.name || selectedEmployee?.name}</h4>
                <p className="mt-1 text-xs text-gray-500">{statement?.employee?.empNumber || selectedEmployee?.empNumber} · {selectedEmployee?.branchName || "—"}</p>
              </div>
              <span className="rounded-md border border-purple-100 px-2 py-1 font-mono text-xs text-purple-700">{statement?.period?.month || t("كل الحركات", "All movements")}</span>
            </div>
            {statementQuery.isPending && <p role="status" className="p-5 text-sm text-gray-500">{t("جارٍ تحميل الحركات...", "Loading movements...")}</p>}
            {statementQuery.isError && <p role="alert" className="p-4 text-sm text-red-700">{t("تعذر تحميل حركات الموظف", "Could not load employee movements")}</p>}
            {statement && (
              <>
                <div className="grid grid-cols-1 gap-2 border-b border-gray-100 p-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3"><p className="text-[11px] text-emerald-700">{t("إجمالي الدائن", "Total credit")}</p><p className="mt-1 font-mono text-sm font-bold text-emerald-800">{displayCurrency(statement.totalCredit)}</p></div>
                  <div className="rounded-lg border border-red-100 bg-red-50 p-3"><p className="text-[11px] text-red-700">{t("إجمالي المدين", "Total debit")}</p><p className="mt-1 font-mono text-sm font-bold text-red-800">{displayCurrency(statement.totalDebit)}</p></div>
                  <div className="rounded-lg border border-purple-100 bg-purple-50 p-3"><p className="text-[11px] text-purple-700">{t("الرصيد الحالي", "Current balance")}</p><p className="mt-1 font-mono text-sm font-bold text-purple-800">{displayCurrency(statement.balanceHalalas)}</p></div>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs text-gray-500"><span>{t("سجل الحركات", "Movement history")}</span><span>{statement.movementCount} {t("حركة", "movements")}</span></div>
                  {statement.movements.map(movement => (
                    <div key={movement.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-xs">
                      <span className="min-w-28 flex-1 font-semibold text-gray-900">{movement.description || movement.categoryLabelAr}</span>
                      <span className="text-gray-500">{movement.movementDate}</span>
                      <span className={`font-mono font-bold ${movement.movementType === "credit" ? "text-emerald-700" : "text-red-600"}`}>
                        {movement.movementType === "credit" ? "+" : "−"}{displayCurrency(movement.amountHalalas)}
                      </span>
                      <span className="w-full break-all text-[10px] text-gray-400">{movement.categoryLabelAr} · {movement.ref}</span>
                    </div>
                  ))}
                  {statement.movements.length === 0 && <p className="p-5 text-sm text-gray-500">{t("لا توجد حركات في الفترة المحددة", "No movements in the selected period")}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
