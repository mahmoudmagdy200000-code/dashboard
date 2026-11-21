import React, { useState } from "react";
import { useOperations } from "../../../../../api/queries/operations";
import type { OperationStatus } from "../../../../../api/types";
import type { OperationsFilter } from "../../../../../api/queries/keys";
import { useLang } from "../../_shared/LangContext";
import { displayDigits } from "../../_shared/displayDigits";
import { fmtAmt, formatDateLong } from "../../_shared/formatters";

const statuses: { value: OperationStatus; ar: string; en: string }[] = [
  { value: "pending", ar: "قيد المراجعة", en: "Pending review" },
  { value: "approved", ar: "وافق عليها المحاسب", en: "Accountant approved" },
  { value: "final-approved", ar: "معتمدة نهائياً", en: "Final approved" },
  { value: "rejected", ar: "مرفوضة", en: "Rejected" },
];

export function HeadModuleRecords({ moduleKey }: { moduleKey: OperationsFilter["moduleKey"] }) {
  const { t, lang } = useLang();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OperationStatus | "">("");
  const query = useOperations({ moduleKey, status: status || undefined, page, pageSize: 20 });
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;
  const number = (value: number) => displayDigits(value, lang);

  return (
    <section aria-label={t("سجل عمليات الموديول", "Module operation history")} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{t("سجل العمليات", "Operation History")}</h3>
          {meta && <p className="mt-1 text-xs text-gray-500">{number(meta.total)} {t("عملية", "operations")}</p>}
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
          {t("الحالة", "Status")}
          <select value={status} onChange={event => { setStatus(event.target.value as OperationStatus | ""); setPage(1); }}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5">
            <option value="">{t("كل الحالات", "All statuses")}</option>
            {statuses.map(item => <option key={item.value} value={item.value}>{t(item.ar, item.en)}</option>)}
          </select>
        </label>
      </div>
      {query.isPending ? <p role="status" className="p-5 text-sm text-gray-500">{t("جارٍ تحميل العمليات…", "Loading operations…")}</p>
        : query.isError ? <div role="alert" className="flex flex-wrap items-center gap-3 p-5 text-sm text-red-700">
          {t("تعذّر تحميل سجل العمليات.", "Could not load operation history.")}
          <button type="button" className="font-semibold underline" onClick={() => void query.refetch()}>{t("إعادة المحاولة", "Retry")}</button>
        </div>
        : rows.length === 0 ? <p className="p-5 text-sm text-gray-500">{t("لا توجد سجلات مطابقة ضمن نطاقك.", "No matching records in your scope.")}</p>
        : <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-start text-xs">
            <thead className="bg-gray-50 text-gray-600"><tr>
              {[t("رقم العملية", "Operation ID"), t("الفرع", "Branch"), t("التاريخ", "Date"), t("الحالة", "Status"), t("المبلغ", "Amount")].map(label =>
                <th key={label} scope="col" className="px-5 py-2.5 text-start font-semibold">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => {
                const rowStatus = statuses.find(item => item.value === row.status);
                return <tr key={row.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-mono"><bdi>{row.publicId || row.id}</bdi></td>
                  <td className="px-5 py-3">{row.branchName || "—"}</td>
                  <td className="px-5 py-3">{formatDateLong(lang, row.operationDate) || "—"}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-purple-50 px-2.5 py-1 font-medium text-purple-700">
                      {row.erpPosted ? t("مُرحّلة لـ ERP", "Posted to ERP") : rowStatus ? t(rowStatus.ar, rowStatus.en) : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono font-semibold"><bdi>{row.amountHalalas == null ? "—" : `${fmtAmt(row.amountHalalas / 100, lang)} ${t("ر.س", "SAR")}`}</bdi></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      }
      {meta && meta.totalPages > 1 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-xs">
        <span>{t("الصفحة", "Page")} <bdi>{number(page)} / {number(meta.totalPages)}</bdi></span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} className="rounded border px-3 py-1.5 disabled:opacity-40" onClick={() => setPage(page - 1)}>{t("السابق", "Previous")}</button>
          <button type="button" disabled={page >= meta.totalPages} className="rounded border px-3 py-1.5 disabled:opacity-40" onClick={() => setPage(page + 1)}>{t("التالي", "Next")}</button>
        </div>
      </div>}
    </section>
  );
}
