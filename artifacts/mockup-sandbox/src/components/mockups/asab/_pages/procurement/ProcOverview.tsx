import { ShoppingCart, Package, Truck, TrendingUp, Eye, CheckCircle2 } from "lucide-react";
import { useProcurementOverviewPlatform, usePurchaseOrders, useApprovePurchaseOrder } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { KpiCard } from "../../components/KpiCard";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";

export function ProcOverview({ navigate }: PageProps) {
  const { t } = useLang();
  const { data: apiOverview } = useProcurementOverviewPlatform();
  // Real branch orders (bridge). meta.total = live "from branches" count.
  const { data: incomingPage } = usePurchaseOrders({ status: "incoming", pageSize: 5 });
  const approveMut = useApprovePurchaseOrder();
  const kpis = (apiOverview as any)?.kpis ?? {};
  const savings = (apiOverview as any)?.monthlySavings;
  // Headline cards use the REAL bridge pipeline (T11.1), falling back to bridge meta / Operations counts.
  const fromBranches = kpis.incoming ?? (incomingPage as any)?.meta?.total ?? kpis.newOrders ?? 0;
  const readyToSend = kpis.readyToSend ?? kpis.consolidated ?? 0;
  const awaitingConf = kpis.sentAwaitingConfirmation ?? kpis.sentToSuppliers ?? 0;
  const incomingRows = ((incomingPage as any)?.data ?? []) as any[];
  const trendPct = savings?.trendPct ?? 0;
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">{t("لوحة تحكم المشتريات", "Procurement Dashboard")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("تجميع الطلبات والتنسيق مع الموردين", "Consolidate orders and coordinate with suppliers")}</p></div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("طلبات جديدة من الفروع", "New Branch Orders")} value={String(fromBranches)} sub={t("بانتظار القرار", "awaiting decision")} icon={<ShoppingCart size={18} className="text-red-600" />} accent="red" />
        <KpiCard label={t("جاهزة للإرسال", "Ready to Send")} value={String(readyToSend)} sub={t("مؤكدة وغير مجمعة", "confirmed & ungrouped")} icon={<Package size={18} className="text-blue-600" />} accent="blue" />
        <KpiCard label={t("مرسلة بانتظار التأكيد", "Sent — Awaiting")} value={String(awaitingConf)} sub={t("لم يتصرف المورد بعد", "supplier not acting yet")} icon={<Truck size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("التوفير الشهري", "Monthly Savings")}
          value={savings?.amount != null ? `${fmtAmt(savings.amount)} ${t("ر.س", "SAR")}` : "—"}
          sub={savings ? `${savings.pctOfPurchases ?? 0}% ${t("من المشتريات", "of purchases")}${trendPct ? ` · ${trendPct > 0 ? "▲" : "▼"}${Math.abs(trendPct)}%` : ""}` : t("من التجميع", "from consolidation")}
          icon={<TrendingUp size={18} className="text-emerald-600" />} accent="emerald" />
      </div>
      <Card title={t("الطلبات الجديدة من الفروع", "New Orders from Branches")} actions={<Btn size="sm" variant="primary" onClick={() => navigate("proc-new")}><Package size={12} /> {t("تجميع الطلبات", "Consolidate Orders")}</Btn>}>
        {incomingRows.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400">{t("لا توجد طلبات جديدة من الفروع", "No new branch orders")}</div>}
        {incomingRows.map((r) => {
          const urgent = r.priority === "high";
          return (
            <div key={r.id} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${urgent ? "border-r-4 border-r-red-400" : ""}`}>
              <div className="flex-1"><p className="font-semibold text-sm text-gray-800">{r.branchName ?? r.branchId ?? "—"}</p><div className="flex items-center gap-2 mt-1"><span className="text-xs text-gray-400">{r.totalItems ?? 0} {t("أصناف", "items")}</span><Badge className={urgent ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-600"}>{urgent ? t("عاجل", "Urgent") : t("عادي", "Normal")}</Badge><span className="text-[11px] text-gray-300 font-mono">{r.orderNumber}</span></div></div>
              <span className="font-mono font-bold text-gray-800">{fmtAmt(r.totalAmount ?? 0)} {t("ر.س", "SAR")}</span>
              <div className="flex gap-1.5">
                <Btn size="sm" onClick={() => navigate("proc-new")}><Eye size={12} /> {t("تفاصيل", "Details")}</Btn>
                <Btn size="sm" variant="primary" disabled={approveMut.isPending} onClick={() => approveMut.mutate(r.id)}><CheckCircle2 size={12} /> {t("اعتماد", "Approve")}</Btn>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
