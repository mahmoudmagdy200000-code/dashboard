import { useAdminOverview } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { KpiCard } from "../../components/KpiCard";
import { Plus, Home, Users, AlertTriangle, ChevronRight } from "lucide-react";
import type { PageProps } from "../../_shared/types";

export function AdminOverview({ navigate, setModal }: PageProps) {
  const { data: apiOverview } = useAdminOverview();
  const { t, dir } = useLang();
  const o = (apiOverview as any) ?? {};
  const kpis = (o.kpis as any) ?? {};
  // Brand hierarchy rows come straight from the API (id, name, abbr, color,
  // restaurantCount, branchCount, plan, subStatus, daysLeft). No static fallback.
  const brandHierarchy: any[] = Array.isArray(o.brandHierarchy) ? o.brandHierarchy : [];
  const expiringBrands = brandHierarchy.filter((b: any) => b.subStatus === "warning" || b.subStatus === "danger" || b.subStatus === "expired");
  const brandsCount = kpis.brandCount ?? 0;
  const totalRests = kpis.restaurantCount ?? 0;
  const totalBranches = kpis.branchCount ?? 0;
  const activeUsers = kpis.activeUserCount ?? 0;
  const expiringCount = kpis.brandsNeedingRenewal ?? expiringBrands.length;

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("نظرة عامة على النظام", "System Overview")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("منصة SaaS متعددة المستأجرين — علامات تجارية · مطاعم · مستخدمون", "Multi-tenant SaaS platform — brands · restaurants · users")}</p>
        </div>
        <Btn variant="primary" onClick={() => setModal("add-user")} className="self-start sm:self-auto shrink-0"><Plus size={14} /> {t("مستخدم جديد", "New User")}</Btn>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t("علامات تجارية", "Brands")} value={String(brandsCount)} sub={t("علامات نشطة", "active brands")} icon={<span className="text-xl font-bold text-purple-600">B</span>} accent="purple" />
        <KpiCard label={t("مطاعم وفروع", "Restaurants & Branches")} value={`${totalRests} / ${totalBranches}`} sub={t("مطعم / فرع", "restaurant / branch")} icon={<Home size={18} className="text-blue-600" />} accent="blue" />
        <KpiCard label={t("مستخدمون نشطون", "Active Users")} value={String(activeUsers)} sub={t("مستخدم نشط", "active users")} icon={<Users size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("تحتاج تجديد", "Need Renewal")} value={String(expiringCount)} sub={t("علامات تجارية", "brands")} icon={<AlertTriangle size={18} className="text-amber-500" />} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title={t("هيكل العلامات التجارية", "Brand Hierarchy")} actions={<button onClick={() => navigate("admin-restaurants")} className="text-xs text-purple-600 hover:underline shrink-0">{t("إدارة كاملة", "Full management")}</button>}>
          <div className="divide-y divide-gray-50">
            {brandHierarchy.length === 0 && (
              <div className="px-4 py-10 text-center text-gray-400 text-sm">{t("لا توجد علامات تجارية", "No brands")}</div>
            )}
            {brandHierarchy.map((b: any) => {
              const branchCount = b.branchCount ?? 0;
              const subBadge = b.subStatus === "active" ? "bg-emerald-50 text-emerald-600" : b.subStatus === "expired" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600";
              return (
                <div key={b.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate("admin-restaurants")}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: b.color }}>{b.abbr}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{b.name}</p>
                    <p className="text-xs text-gray-400 truncate">{b.restaurantCount ?? 0} {t("مطاعم", "restaurants")} · {branchCount} {t("فروع", "branches")} · {t("باقة", "plan")} {b.plan}</p>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${subBadge}`}>{b.subStatus === "active" ? t("نشط", "Active") : b.subStatus === "expired" ? t("منتهي", "Expired") : t("ينتهي قريباً", "Expiring soon")}</Badge>
                  <ChevronRight size={13} className="text-gray-300 shrink-0" />
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title={t("إجراءات سريعة", "Quick Actions")}>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[{ icon: "👤", label: t("مستخدم جديد", "New User"), a: () => setModal("add-user") },
              { icon: "🏪", label: t("مطعم جديد", "New Restaurant"), a: () => navigate("admin-restaurants") },
              { icon: "👥", label: t("توزيع المحاسبين", "Assign Accountants"), a: () => navigate("admin-users") },
              { icon: "💳", label: t("الاشتراكات", "Subscriptions"), a: () => navigate("admin-subscriptions") },
              { icon: "🔑", label: t("الصلاحيات", "Permissions"), a: () => navigate("admin-permissions") },
              { icon: "📋", label: t("سجل النشاطات", "Activity Log"), a: () => navigate("admin-audit") },
              ].map((a, i) => (
                <button key={i} onClick={a.a} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all">
                  <span className="text-xl">{a.icon}</span>
                  <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {expiringBrands.length > 0 && (
            <Card title={`⚠ ${t("تنبيهات الاشتراكات", "Subscription Alerts")}`} actions={<button onClick={() => navigate("admin-subscriptions")} className="text-xs text-purple-600 hover:underline shrink-0">{t("إدارة", "Manage")}</button>}>
              <div className="px-4 pb-3 space-y-2">
                {expiringBrands.map((b, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border ${b.subStatus === "expired" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: b.color }}>{b.abbr}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-gray-800 truncate">{b.name}</p>
                      <p className={`text-[10px] truncate ${b.subStatus === "expired" ? "text-red-600" : "text-amber-600"}`}>{b.subStatus === "expired" ? t(`منتهي منذ ${Math.abs(b.daysLeft)} يوم`, `Expired ${Math.abs(b.daysLeft)} days ago`) : t(`ينتهي خلال ${b.daysLeft} يوم`, `Expires in ${b.daysLeft} days`)}</p>
                    </div>
                    <button onClick={() => navigate("admin-subscriptions")} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold shrink-0 ${b.subStatus === "expired" ? "bg-red-600 text-white" : "bg-amber-100 text-amber-700 border border-amber-200"}`}>
                      {b.subStatus === "expired" ? t("تفعيل", "Activate") : t("تجديد", "Renew")}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
