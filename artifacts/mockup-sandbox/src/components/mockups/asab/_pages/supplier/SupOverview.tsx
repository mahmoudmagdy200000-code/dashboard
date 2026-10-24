import { useAuth } from "../../../../../auth/AuthContext";
import { SupplierQueryState } from "./SupplierFeedback";
import { ShoppingCart, CheckCircle2, TrendingUp, Package } from "lucide-react";
import { useSupplierOverview } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { KpiCard } from "../../components/KpiCard";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";

// T13 §1 — GET /asab/supplier/overview. Money is integer halalas (÷100 → SAR).
export function SupOverview({ navigate }: PageProps) {
  const query = useSupplierOverview();
  const apiOverview = query.data;
  const { t } = useLang();
  const { user } = useAuth();
  const kpis = (apiOverview as any)?.kpis ?? {};
  const newOrders = kpis.newOrders ?? null;
  const accepted = kpis.acceptedThisMonth ?? null;
  const salesSar = kpis.totalSalesThisMonth != null ? kpis.totalSalesThisMonth / 100 : null;
  const trendPct = kpis.totalSalesTrendPct;
  const activeItems = kpis.activeItems ?? "—";
  const totalItems = kpis.totalItems ?? "—";
  const recent = ((apiOverview as any)?.recentOrders ?? []) as any[];
  const statusChip = (k?: string) => k === "delivered" ? "bg-emerald-50 text-emerald-700" : k === "accepted" ? "bg-blue-50 text-blue-700" : k === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  if (query.isPending || query.isError) return <SupplierQueryState query={query} />;
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">{t("لوحة تحكم المورد", "Supplier Dashboard")}</h2><p className="text-gray-400 text-sm mt-0.5">{(user as any)?.supplier?.name || user?.name || t("هوية المورد غير متاحة", "Supplier identity unavailable")}</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label={t("طلبات جديدة", "New Orders")} value={newOrders == null ? "—" : String(newOrders)} sub={t("تنتظر ردك", "awaiting your response")} icon={<ShoppingCart size={18} className="text-red-600" />} accent="red" />
        <KpiCard label={t("مقبولة هذا الشهر", "Accepted This Month")} value={accepted == null ? "—" : String(accepted)} sub={t("هذا الشهر", "this month")} icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("إجمالي مبيعاتي", "Total Sales")} value={`${fmtAmt(salesSar)} ${t("ر.س", "SAR")}`} sub={trendPct != null ? `${trendPct >= 0 ? "▲" : "▼"} ${Math.abs(trendPct)}% ${t("عن الشهر السابق", "vs last month")}` : t("هذا الشهر", "this month")} icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("أصناف نشطة", "Active Items")} value={`${activeItems}/${totalItems}`} sub={t("من كتالوجك", "of your catalog")} icon={<Package size={18} className="text-blue-600" />} accent="blue" />
      </div>
      <Card title={`${t("آخر الطلبات", "Recent Orders")} — ${recent.length}`} actions={<button onClick={() => navigate?.("sup-new")} className="text-xs text-purple-600 font-semibold hover:underline">{t("عرض الطلبات الجديدة", "View new orders")}</button>}>
        {recent.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400">{t("لا توجد طلبات", "No orders yet")}</div>}
        {recent.map((o, i) => (
          <div key={o.id ?? i} className="px-5 py-4 flex flex-wrap items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><p className="font-semibold text-sm text-gray-800 truncate">{o.from ?? "—"}</p>{o.publicId && <span className="font-mono text-[10px] text-gray-400">{o.publicId}</span>}</div>
              <p className="text-xs text-gray-400 mt-1 truncate">{o.itemsText ?? "—"}{o.deliveryDate ? ` · ${t("التسليم:", "Delivery:")} ${String(o.deliveryDate).slice(0, 10)}` : ""}</p>
            </div>
            <span className="font-mono font-bold text-gray-800 flex-shrink-0">{fmtAmt(Number.isSafeInteger(o.total) ? o.total / 100 : null)} {t("ر.س", "SAR")}</span>
            <Badge className={`${statusChip(o.statusKey)} flex-shrink-0`}>{o.statusLabel ?? o.statusKey ?? o.status}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
