import { TrendingUp, ShoppingCart, Users, AlertTriangle, Upload } from "lucide-react";
import { useBranchOverviewPlatform } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import type { PageProps } from "../../_shared/types";
import { KpiCard } from "../../components/KpiCard";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Btn } from "../../components/Btn";

export function BranchOverview({ navigate }: PageProps) {
  const { t, dir } = useLang();
  const { data: apiOverview } = useBranchOverviewPlatform();
  const kpis = (apiOverview as any)?.kpis ?? {};
  const hero = (apiOverview as any)?.hero;
  const todaySales = Math.round(((kpis.todaySales ?? kpis.todaySalesHalalas ?? 0)) / 100);
  const orders = kpis.todayOrders ?? kpis.ordersCount ?? 0;
  const empsActive = kpis.activeEmployees ?? 0;
  const reqReports = kpis.requiredReportsCount ?? 0;
  const targetSar = Math.round((hero?.targetHalalas ?? 0) / 100);
  const pct = hero?.achievementPct ?? 0;
  // T12 §1 — tasksOfDay / crew from the overview payload; empty states when absent.
  const tasks = ((apiOverview as any)?.tasksOfDay ?? []) as Array<{ id: string; label: string; state: string; stateLabel?: string }>;
  const crew = ((apiOverview as any)?.crew ?? []) as Array<{ id: string; name: string; role?: string; shift?: string; attendanceLabel?: string }>;
  const stateChip = (s: string) => s === "completed" ? "bg-emerald-50 text-emerald-700" : s === "pending" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500";
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("نظرة عامة", "Overview")} — {(apiOverview as any)?.branch?.name ?? ""}</h2><p className="text-gray-400 text-sm mt-0.5">{new Date().toLocaleDateString("ar-SA")}</p></div>
      {/* Hero achievement band (T12 §1) */}
      <div className="bg-gradient-to-l from-emerald-600 to-teal-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div><p className="font-black text-xl">{t("إنجاز الشهر", "Monthly Achievement")}</p><p className="text-white/70 text-sm mt-0.5">{t("الهدف:", "Target:")} {targetSar.toLocaleString()} {t("ر.س", "SAR")}</p></div>
          <div className={dir === "rtl" ? "text-left" : "text-right"}><p className="text-3xl font-black">{pct}%</p><p className="text-white/60 text-xs">{t("من الهدف", "of target")}</p></div>
        </div>
        <div className="w-full h-3 bg-white/20 rounded-full"><div className="h-3 bg-white rounded-full" style={{ width: `${Math.min(100, pct)}%` }} /></div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("مبيعات اليوم", "Today's Sales")} value={`${todaySales.toLocaleString()} ${t("ر.س", "SAR")}`} icon={<TrendingUp size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("الطلبات", "Orders")} value={String(orders)} sub={t("اليوم", "Today")} icon={<ShoppingCart size={18} className="text-blue-600" />} accent="blue" />
        <KpiCard label={t("الموظفون", "Employees")} value={String(empsActive)} sub={t("نشطون الآن", "Active Now")} icon={<Users size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("التقارير المطلوبة", "Required Reports")} value={String(reqReports)} sub={t("تنتظر الرفع", "Awaiting Upload")} icon={<AlertTriangle size={18} className="text-amber-600" />} accent="amber" />
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Card title={t("مهام اليوم", "Today's Tasks")}>
            {tasks.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400">{t("لا توجد مهام", "No tasks")}</div>}
            {tasks.map((tk) => (
              <div key={tk.id} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 ${tk.state === "pending" ? "bg-amber-50/20" : ""}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tk.state === "completed" ? "bg-emerald-500" : tk.state === "pending" ? "bg-amber-500" : "bg-gray-300"}`}></div>
                <div className="flex-1"><p className={`font-semibold text-sm ${tk.state === "completed" ? "text-gray-400 line-through" : "text-gray-800"}`}>{tk.label}</p></div>
                <Badge className={`text-[10px] ${stateChip(tk.state)}`}>{tk.stateLabel ?? tk.state}</Badge>
                {tk.state !== "completed" && <Btn size="sm" variant="primary" onClick={() => navigate("branch-upload")}><Upload size={12} /> {t("رفع", "Upload")}</Btn>}
              </div>
            ))}
          </Card>
        </div>
        <Card title={t("طاقم اليوم", "Today's Crew")}>
          <div className="p-4 space-y-2">
            {crew.length === 0 && <p className="text-center text-sm text-gray-400 py-4">{t("لا يوجد طاقم", "No crew")}</p>}
            {crew.map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{(c.name || "?")[0]}</div>
                <div className="flex-1"><p className="text-sm font-semibold text-gray-700">{c.name}</p><p className="text-[10px] text-gray-400">{c.role || "—"}{c.shift ? ` · ${c.shift}` : ""}</p></div>
                <Badge className="text-[10px] bg-emerald-50 text-emerald-700">{c.attendanceLabel ?? t("حاضر", "Present")}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
