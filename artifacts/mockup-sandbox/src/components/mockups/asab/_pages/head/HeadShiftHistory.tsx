import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../../../api/client";
import { isApiError } from "../../../../../api/errors";
import { useShiftsHistory } from "../../../../../api/queries";
import { historyPageTarget } from "../../../../../api/queries/shifts";
import type { Shift } from "../../../../../api/types/company";
import { useLang } from "../../_shared/LangContext";
import { getShiftCountEvidence } from "../../shiftCountEvidence";

export function HeadShiftHistory() {
  const { t } = useLang();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(1);
  const { data: branchRows } = useQuery({
    queryKey: ["shifts", "assigned-branch-lookup"],
    queryFn: async () => {
      const response = await api.get<{ data: Array<{ id: string; name: string }> }>("/lookups/branches");
      return response.data.data;
    },
  });
  const branches = Array.isArray(branchRows) ? branchRows.filter(branch =>
    typeof branch?.id === "string" && typeof branch?.name === "string") : [];
  const query = useShiftsHistory({ dateFrom, dateTo, branchId, page, pageSize: 20 });
  const busy = query.isPending || query.isFetching;
  const meta = busy || query.isError ? undefined : query.data?.meta;
  const rows: Shift[] = busy || query.isError ? [] : (query.data?.data ?? []);
  return <section className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
    <h3 className="font-bold text-gray-800 text-sm">{t("سجل الورديات — قراءة فقط", "Shift history — read only")}</h3>
    <div className="flex flex-wrap gap-3 text-xs">
      <label>{t("من تاريخ الإغلاق", "Closed from")}<input type="date" value={dateFrom}
        onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="block border rounded px-2 py-1" /></label>
      <label>{t("إلى تاريخ الإغلاق", "Closed to")}<input type="date" value={dateTo}
        onChange={e => { setDateTo(e.target.value); setPage(1); }} className="block border rounded px-2 py-1" /></label>
      <label>{t("الفرع", "Branch")}<select value={branchId}
        onChange={e => { setBranchId(e.target.value); setPage(1); }} className="block border rounded px-2 py-1">
        <option value="">{t("كل الفروع المعيّنة", "All assigned branches")}</option>
        {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select></label>
    </div>
    {busy && <p role="status">{t("جارٍ تحميل السجل…", "Loading history…")}</p>}
    {!busy && query.isError && <p role="alert">{isApiError(query.error) ? query.error.messageAr : t("تعذر تحميل سجل الورديات", "Could not load shift history")}</p>}
    {!busy && !query.isError && rows.length === 0 && <p>{t("لا توجد ورديات في هذه الصفحة", "No shifts on this page")}</p>}
    {!busy && !query.isError && rows.map((shift: Shift) => {
      const evidence = getShiftCountEvidence(shift);
      return <div key={shift.id} className="flex flex-wrap gap-4 border-t py-2 text-xs">
        <span>{shift.branchName}</span><span>{shift.cashierName}</span>
        <span>{shift.endedAt ? new Date(shift.endedAt).toLocaleDateString("ar-SA") : "—"}</span>
        <span>{t("الفرق", "Variance")}: <bdi>{evidence.variance.text}</bdi></span>
      </div>;
    })}
    <div className="flex items-center justify-between text-xs">
      <span>{t("الصفحة", "Page")} {meta?.page ?? page} / {meta?.totalPages ?? "—"}</span>
      <div className="flex gap-2">
        <button disabled={busy || query.isError || historyPageTarget(meta, page, -1) === page}
          onClick={() => setPage(historyPageTarget(meta, page, -1))}>{t("السابق", "Previous")}</button>
        <button disabled={busy || query.isError || historyPageTarget(meta, page, 1) === page}
          onClick={() => setPage(historyPageTarget(meta, page, 1))}>{t("التالي", "Next")}</button>
      </div>
    </div>
  </section>;
}
