import { SupplierQueryState } from "./SupplierFeedback";
import { TrendingUp, CheckCircle2, BarChart3 } from "lucide-react";
import { useSupplierReports } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { KpiCard } from "../../components/KpiCard";

// T13 §13 — GET /asab/supplier/reports. Flat aggregates over fulfilled
// (accepted + delivered) orders only; money in halalas. SUP-3 breakdowns
// (topItems / topBranches / monthly) are DEFERRED — no placeholders rendered.
export function SupReports({ }: PageProps) {
  const query = useSupplierReports();
  const apiReports = query.data;
  const { t } = useLang();
  const r = (apiReports as any) ?? {};
  const totalRevenue = r.totalRevenue != null ? r.totalRevenue / 100 : null;
  const orderCount = r.orderCount ?? null;
  const avgOrderValue = r.averageOrderValue != null ? r.averageOrderValue / 100 : null;

  if (query.isPending || query.isError) return <SupplierQueryState query={query} />;
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">{t("التقارير", "Reports")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("ملخص أداء المبيعات (الطلبات المنفَّذة)", "Sales performance summary (fulfilled orders)")}</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label={t("إجمالي الإيرادات", "Total Revenue")} value={`${fmtAmt(totalRevenue)} ${t("ر.س", "SAR")}`} sub={t("الطلبات المنفَّذة", "fulfilled orders")} icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("عدد الطلبات", "Order Count")} value={orderCount == null ? "—" : String(orderCount)} sub={t("مقبولة + مسلَّمة", "accepted + delivered")} icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("متوسط قيمة الطلب", "Avg Order Value")} value={`${fmtAmt(avgOrderValue)} ${t("ر.س", "SAR")}`} sub={t("لكل طلب", "per order")} icon={<BarChart3 size={18} className="text-blue-600" />} accent="blue" />
      </div>
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        {t("التقارير التفصيلية (أفضل الأصناف والعملاء والاتجاه الشهري) قيد التطوير.", "Detailed reports (top items, top clients, monthly trend) are under development.")}
      </div>
    </div>
  );
}
