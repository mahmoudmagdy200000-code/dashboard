import { useHeadSalesDayCompleteness, useHeadSalesKpis, useHeadSalesOperations, useHeadShiftConfigs } from "../../../../../api/queries/platform/head";
import { useShiftsLive } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { DailySalesWorkdays } from "../accountant/DailySalesWorkdays";

function amount(halalas: number | undefined, lang: "ar" | "en") {
  return typeof halalas === "number" && Number.isFinite(halalas)
    ? new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 2 }).format(halalas / 100)
    : "—";
}

export function HeadSalesData() {
  const { t, lang, dir } = useLang();
  const kpisQuery = useHeadSalesKpis();
  const daysQuery = useHeadSalesDayCompleteness(7);
  const operationsQuery = useHeadSalesOperations();
  const kpis = kpisQuery.data;
  const days = daysQuery.data ?? [];
  return (
    <section className="space-y-3" dir={dir} aria-label={t("بيانات المبيعات الفعلية", "Live sales data")}>
      <div>
        <h3 className="text-base font-bold text-gray-900">{t("تقارير المبيعات اليومية", "Daily sales reports")}</h3>
        <p className="mt-1 text-xs text-gray-500">{t("بيانات التحصيل واكتمال التقارير من سجلات الشركة", "Collection and report-completeness data from company records")}</p>
      </div>
      {kpisQuery.isError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{t("تعذر تحميل ملخص المبيعات", "Could not load sales summary")}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [t("مبيعات اليوم", "Today's sales"), kpis?.totalSalesHalalas],
          [t("إجمالي التحصيل", "Total collected"), kpis?.totalCollectedHalalas],
          [t("فروقات التحصيل", "Collection variance"), kpis?.totalVarianceHalalas],
          [t("فروع بها فروقات", "Branches with variance"), kpis?.varianceCaseCount],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-2 font-mono text-lg font-bold text-gray-900">{typeof value === "number" && String(label) === t("فروع بها فروقات", "Branches with variance") ? value : amount(value as number | undefined, lang)} <span className="text-xs font-normal text-gray-500">{typeof value === "number" && String(label) === t("فروع بها فروقات", "Branches with variance") ? t("فرع", "branches") : t("ر.س", "SAR")}</span></p>
          </div>
        ))}
      </div>
      {kpis?.varianceBranches?.length ? <div className="flex flex-wrap gap-2">{kpis.varianceBranches.map(branch => <span key={branch.branchId} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{branch.name}: <bdi>{amount(branch.varianceHalalas, lang)} {t("ر.س", "SAR")}</bdi></span>)}</div> : null}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
          <h4 className="text-sm font-bold text-gray-800">{t("اكتمال التقارير حسب اليوم", "Daily report completeness")}</h4>
          {daysQuery.isFetching && <span role="status" className="text-xs text-gray-500">{t("تحديث...", "Updating...")}</span>}
        </div>
        {daysQuery.isError && <p role="alert" className="p-4 text-xs text-red-700">{t("تعذر تحميل بيانات اكتمال التقارير", "Could not load report completeness")}</p>}
        {!daysQuery.isError && days.length === 0 && <p className="p-4 text-xs text-gray-500">{t("لا توجد تقارير يومية ضمن النطاق", "No daily reports in scope")}</p>}
        <div className="divide-y divide-gray-100">
          {days.map(day => (
            <div key={day.date} className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs">
              <span className="min-w-24 font-semibold text-gray-800">{new Date(`${day.date}T12:00:00`).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}</span>
              <span className="text-emerald-700">{day.completedCount} {t("مكتمل", "complete")}</span>
              <span className={day.missingCount ? "font-semibold text-amber-700" : "text-gray-500"}>{day.missingCount} {t("ناقص", "missing")}</span>
              {day.missingBranches.length > 0 && <span className="min-w-0 flex-1 break-words text-gray-500">{day.missingBranches.map(branch => branch.name).join("، ")}</span>}
            </div>
          ))}
        </div>
      </div>
      <DailySalesWorkdays references={operationsQuery.data ?? []} />
      {operationsQuery.isError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{t("تعذر تحميل تفاصيل تقارير المبيعات", "Could not load sales report details")}</p>}
    </section>
  );
}

export function HeadShiftData() {
  const { t, lang, dir } = useLang();
  const liveQuery = useShiftsLive();
  const configQuery = useHeadShiftConfigs("all");
  const active = liveQuery.data?.active ?? [];
  const kpis = liveQuery.data?.kpis;
  const configs = configQuery.data ?? [];
  return (
    <section className="space-y-3" dir={dir} aria-label={t("إدارة الشفتات الفعلية", "Live shift management data")}>
      <div>
        <h3 className="text-base font-bold text-gray-900">{t("حالة الشفتات وإعداداتها", "Shift status and schedules")}</h3>
        <p className="mt-1 text-xs text-gray-500">{t("بيانات حية وإعدادات قراءة فقط من سجلات الفروع", "Live status and read-only schedules from branch records")}</p>
      </div>
      {liveQuery.isError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{t("تعذر تحميل حالة الشفتات", "Could not load shift status")}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [t("مفتوحة الآن", "Open now"), kpis?.openNow ?? 0],
          [t("أغلقت اليوم", "Closed today"), kpis?.closedToday ?? 0],
          [t("مبيعات اليوم", "Today's shift sales"), amount(kpis?.todaySalesHalalas, lang)],
          [t("فروقات للمراجعة", "Gaps for review"), kpis?.cashGapsPendingReview ?? 0],
        ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-2 font-mono text-lg font-bold text-gray-900">{value}{String(label) === t("مبيعات اليوم", "Today's shift sales") ? <span className="ms-1 text-xs font-normal text-gray-500">{t("ر.س", "SAR")}</span> : null}</p></div>)}
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <h4 className="border-b border-gray-100 px-4 py-3 text-sm font-bold text-gray-800">{t("الشفتات المفتوحة", "Open shifts")} · {active.length}</h4>
          {active.length === 0 && !liveQuery.isError && <p className="p-4 text-xs text-gray-500">{t("لا توجد شفتات مفتوحة الآن", "No shifts are open right now")}</p>}
          <div className="divide-y divide-gray-100">{active.map(shift => <div key={shift.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs"><b className="min-w-0 flex-1 break-words">{shift.branchName}</b><span>{shift.cashierName}</span><span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">{shift.statusLabelAr || shift.status}</span><span className="font-mono">{amount(shift.salesHalalas, lang)} {t("ر.س", "SAR")}</span></div>)}</div>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <h4 className="border-b border-gray-100 px-4 py-3 text-sm font-bold text-gray-800">{t("إعدادات الشفتات", "Shift schedules")}</h4>
          {configQuery.isError && <p role="alert" className="p-4 text-xs text-red-700">{t("تعذر تحميل إعدادات الشفتات", "Could not load shift schedules")}</p>}
          {!configQuery.isError && configs.length === 0 && <p className="p-4 text-xs text-gray-500">{t("لا توجد إعدادات للشفتات ضمن النطاق", "No shift schedules in scope")}</p>}
          <div className="divide-y divide-gray-100">{configs.map((config, index) => {
            const name = (config as typeof config & { branchName?: string; ownerName?: string }).branchName || (config as typeof config & { ownerName?: string }).ownerName || config.brandName || config.brandId;
            return <div key={`${config.brandId}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"><b className="min-w-0 break-words">{name}</b><span>{config.numShifts} {t("شفت", "shifts")} × {config.durationHours} {t("ساعة", "hours")}</span><span className="font-mono">{config.firstShiftStart}</span></div>;
          })}</div>
        </div>
      </div>
    </section>
  );
}
