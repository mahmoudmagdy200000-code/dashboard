import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  RotateCcw,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { Operation as ApiOperation } from "../../../../../api/types";
import { queryKeys } from "../../../../../api/queries/keys";
import {
  useExportOperations,
  useSalesDayCompleteness,
  useSalesKpis,
} from "../../../../../api/queries";
import { salesBulkApprovalIds } from "../../salesActionGuards";
import { KpiCard } from "../../components/KpiCard";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { EmptyState } from "../../components/EmptyState";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt, opDetailPage } from "../../_shared/formatters";
import { STATUS_CFG, EN_STATUS_CFG } from "../../_shared/displayConfig";
import {
  applyFilters,
  BRANCHES,
  brandOptionsFromOps,
} from "../../_shared/filterOps";
import { OpRow } from "../../_shared/OpRow";
import type { PageProps, Filters, OpStatus, PageId } from "../../_shared/types";

export function AccSalesPage({
  navigate,
  setModal,
  setDetailId,
  ops,
  approveOp,
  rejectOp,
  bulkApprove,
  role,
}: PageProps) {
  const { t, dir, lang } = useLang();
  const en = lang === "en";
  const exportOpsMut = useExportOperations();
  const [filters, setFilters] = useState<Filters>({
    branch: "",
    status: "",
    match: "",
    search: "",
  });
  const [brand, setBrand] = useState("");
  const [selectedDay, setSelectedDay] = useState("all");

  // Live day-completeness pills (T04 §3) + sales KPIs (T04 §2).
  const { data: dayRows = [] } = useSalesDayCompleteness(7);
  const salesDate = selectedDay !== "all" ? selectedDay : undefined;
  const { data: kpis } = useSalesKpis(salesDate);
  const selectedDayInfo = dayRows.find((d) => d.date === selectedDay);

  const brandOpts = brandOptionsFromOps(ops);
  const mOps = ops.filter((o) => o.moduleKey === "sales");
  const pending = mOps.filter((o) => o.status === "pending");
  const queryClient = useQueryClient();
  const filtered = applyFilters(ops, filters, "sales")
    .filter(
      (o) => !salesDate || (o.operationDate ?? "").slice(0, 10) === salesDate,
    )
    .filter((o) => !brand || o.brandId === brand);
  const filteredPending = filtered.filter((o) => o.status === "pending");
  const bulkSalesIds = salesBulkApprovalIds(
    filtered,
    filteredPending.map((op) => op.id),
    role,
    (op) => queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id)),
  );

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {t("موديول المبيعات", "Sales Module")}
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {pending.length}{" "}
            {t(
              "بيان معلق بانتظار مراجعتك",
              "pending entries awaiting your review",
            )}
          </p>
        </div>
        {bulkSalesIds.length > 0 && (
          <Btn
            variant="success"
            size="sm"
            onClick={() => bulkApprove(bulkSalesIds)}
          >
            ✓ {t("موافقة على الكل", "Approve All")} ({bulkSalesIds.length})
          </Btn>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label={t("إجمالي البيانات المرفوعة", "Total Uploaded")}
          value={String(mOps.length)}
          sub={t("كل الحالات", "All statuses")}
          icon={<FileText size={18} className="text-purple-600" />}
          accent="purple"
        />
        <KpiCard
          label={t("قيد المراجعة", "Under Review")}
          value={String(pending.length)}
          sub={t("رُفعت من الفروع", "Uploaded from branches")}
          icon={<Clock size={18} className="text-amber-600" />}
          accent="amber"
        />
        <KpiCard
          label={t("تمت الموافقة", "Approved")}
          value={String(
            mOps.filter(
              (o) => o.status === "approved" || o.status === "final-approved",
            ).length,
          )}
          sub={t("موافق + معتمد نهائياً", "Approved + Final-approved")}
          icon={<CheckCircle2 size={18} className="text-sky-600" />}
          accent="blue"
        />
        <KpiCard
          label={t("مرفوضة", "Rejected")}
          value={String(mOps.filter((o) => o.status === "rejected").length)}
          sub={t("تحتاج إعادة رفع", "Needs re-upload")}
          icon={<XCircle size={18} className="text-red-600" />}
          accent="red"
        />
      </div>

      {/* Sales financial KPIs (T04 §2) — GET /company/me/sales/kpis */}
      {kpis && (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            label={t("إجمالي المبيعات", "Total Sales")}
            value={fmtAmt(Math.round(kpis.totalSalesHalalas / 100))}
            sub={`${kpis.branchCount} ${t("فرع", "branches")}`}
            icon={<TrendingUp size={18} className="text-purple-600" />}
            accent="purple"
          />
          <KpiCard
            label={t("إجمالي التحصيل", "Total Collected")}
            value={fmtAmt(Math.round(kpis.totalCollectedHalalas / 100))}
            sub={
              kpis.trendPct == null
                ? t("لا مقارنة", "—")
                : `${kpis.trendPct > 0 ? "▲" : "▼"} ${Math.abs(kpis.trendPct)}%`
            }
            icon={<CheckCircle2 size={18} className="text-sky-600" />}
            accent="blue"
          />
          <KpiCard
            label={t("الفرق", "Variance")}
            value={fmtAmt(Math.round(kpis.totalVarianceHalalas / 100))}
            sub={`${kpis.varianceCaseCount} ${t("حالة فرق", "variance cases")}`}
            icon={<AlertTriangle size={18} className="text-red-600" />}
            accent={kpis.totalVarianceHalalas === 0 ? "emerald" : "red"}
          />
          <KpiCard
            label={t("فروع بلا فرق", "Zero-Variance")}
            value={String(kpis.zeroVarianceBranchCount)}
            sub={t("تحصيل مطابق", "Collection matches")}
            icon={<Lock size={18} className="text-emerald-600" />}
            accent="emerald"
          />
        </div>
      )}

      {kpis && kpis.varianceBranches.length > 0 && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4"
          dir={dir}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-red-600" />
            <p className="text-sm font-bold text-red-800">
              {t(
                "تنبيه: توجد فروق في التحصيل",
                "Alert: collection variances detected",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {kpis.varianceBranches.map((vb) => (
              <span
                key={vb.branchId}
                className="text-[11px] bg-white border border-red-200 text-red-700 px-2 py-1 rounded-lg font-semibold"
              >
                {vb.name}:{" "}
                <span className="font-mono">
                  {fmtAmt(Math.round(vb.varianceHalalas / 100))}{" "}
                  {t("ر.س", "SAR")}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
        dir={dir}
      >
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              {t("الفرع", "Branch")}
            </label>
            <select
              value={filters.branch}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  branch:
                    e.target.value === t("الكل", "All") ? "" : e.target.value,
                }))
              }
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            >
              {[t("الكل", "All"), ...BRANCHES].map((b) => (
                <option key={b} value={b === t("الكل", "All") ? "" : b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              {t("الحالة", "Status")}
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  status:
                    e.target.value === t("الكل", "All") ? "" : e.target.value,
                }))
              }
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            >
              {[
                t("الكل", "All"),
                "pending",
                "approved",
                "rejected",
                "final-approved",
              ].map((s) => (
                <option key={s} value={s === t("الكل", "All") ? "" : s}>
                  {s === t("الكل", "All")
                    ? s
                    : en
                      ? EN_STATUS_CFG[s as OpStatus] ||
                        STATUS_CFG[s as OpStatus]?.label ||
                        s
                      : STATUS_CFG[s as OpStatus]?.label || s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              {t("العلامة التجارية", "Brand")}
            </label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={brandOpts.length === 0}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">{t("الكل", "All")}</option>
              {brandOpts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              {t("التاريخ / الفترة", "Date / Period")}
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            >
              <option value="all">{t("الكل", "All")}</option>
              {dayRows.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.pillLabelAr} ({d.completedCount}/{d.requiredCount})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              {t("بحث / مرجعي", "Search / Reference")}
            </label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400" />
              <input
                value={filters.search}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, search: e.target.value }))
                }
                placeholder={t("بحث...", "Search...")}
                className="flex-1 text-sm outline-none bg-transparent"
              />
            </div>
          </div>
          <div className="flex items-end">
            {(filters.branch ||
              filters.status ||
              filters.search ||
              selectedDay !== "all" ||
              brand) && (
              <button
                onClick={() => {
                  setFilters({ branch: "", status: "", match: "", search: "" });
                  setBrand("");
                  setSelectedDay("all");
                }}
                className="text-xs text-purple-600 hover:underline flex items-center gap-1 pb-2"
              >
                <RotateCcw size={11} /> {t("مسح الفلاتر", "Clear Filters")}
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedDay !== "all" && selectedDayInfo && (
        <div
          className={`rounded-xl border p-4 flex items-center gap-4 ${selectedDayInfo.missingCount > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}
          dir={dir}
        >
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">
              {selectedDayInfo.pillLabelAr}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedDayInfo.bannerAr}
            </p>
            {selectedDayInfo.missingBranches.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedDayInfo.missingBranches.map((b) => (
                  <span
                    key={b.branchId}
                    className="text-[10px] bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-lg"
                  >
                    {b.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-lg font-black text-gray-800">
                {selectedDayInfo.requiredCount}
              </p>
              <p className="text-[10px] text-gray-500">
                {t("مطلوبة", "Required")}
              </p>
            </div>
            <div>
              <p className="text-lg font-black text-emerald-600">
                {selectedDayInfo.completedCount}
              </p>
              <p className="text-[10px] text-gray-500">{t("مكتملة", "Done")}</p>
            </div>
            <div>
              <p
                className={`text-lg font-black ${selectedDayInfo.missingCount > 0 ? "text-amber-600" : "text-gray-300"}`}
              >
                {selectedDayInfo.missingCount}
              </p>
              <p className="text-[10px] text-gray-500">
                {t("ناقص", "Missing")}
              </p>
            </div>
          </div>
        </div>
      )}

      <Card
        title={t("بيانات المبيعات", "Sales Entries")}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {filtered.length} {t("بيان", "entries")}
            </span>
            <button
              onClick={() =>
                exportOpsMut.mutate({ moduleKey: "sales", format: "xlsx" })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all"
            >
              <FileText size={11} /> Excel
            </button>
            {bulkSalesIds.length > 0 && (
              <Btn
                size="sm"
                variant="success"
                onClick={() => bulkApprove(bulkSalesIds)}
              >
                ✓ {t("موافقة جماعية", "Bulk Approve")}
              </Btn>
            )}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon="✅"
            title={t("لا توجد بيانات", "No Data")}
            desc={t(
              "لا توجد بيانات تطابق الفلاتر المحددة",
              "No data matches the selected filters",
            )}
          />
        ) : (
          filtered.map((op) => (
            <OpRow
              key={op.id}
              op={op}
              onView={() => {
                setDetailId(op.id);
                navigate(opDetailPage(op.moduleKey) as PageId);
              }}
              onApprove={() => approveOp(op.id)}
              onReject={() => {
                setDetailId(op.id);
                setModal("reject");
              }}
            />
          ))
        )}
      </Card>
    </div>
  );
}
