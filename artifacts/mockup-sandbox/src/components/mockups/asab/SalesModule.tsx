import "./_group.css";
import { AppLayout } from "./_shared/AppLayout";
import { KPICard } from "./_shared/KPICard";
import { TrendingUp, AlertTriangle, CheckCircle2, BarChart2, Download, Search, ChevronDown } from "lucide-react";

const salesData = [
  {
    branch: "فرع الرياض - العليا",
    date: "2025/10/14",
    cashSales: "45,230",
    cardSales: "62,500",
    appSales: "38,400",
    totalSales: "146,130",
    totalCollected: "142,930",
    variance: "3,200",
    varianceType: "danger",
    status: "pending",
    attachment: true,
  },
  {
    branch: "فرع جدة - الحمراء",
    date: "2025/10/14",
    cashSales: "31,200",
    cardSales: "48,750",
    appSales: "29,100",
    totalSales: "109,050",
    totalCollected: "109,050",
    variance: "0",
    varianceType: "success",
    status: "approved",
    attachment: true,
  },
  {
    branch: "فرع مكة - المعابدة",
    date: "2025/10/14",
    cashSales: "28,400",
    cardSales: "35,600",
    appSales: "22,800",
    totalSales: "86,800",
    totalCollected: "85,200",
    variance: "1,600",
    varianceType: "warning",
    status: "pending",
    attachment: true,
  },
  {
    branch: "فرع الدمام - الكورنيش",
    date: "2025/10/13",
    cashSales: "52,100",
    cardSales: "71,300",
    appSales: "44,200",
    totalSales: "167,600",
    totalCollected: "167,600",
    variance: "0",
    varianceType: "success",
    status: "final-approved",
    attachment: true,
  },
];

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: "في الانتظار", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "معتمد - مرحلة 1", cls: "bg-blue-50 text-blue-700" },
  "final-approved": { label: "معتمد نهائياً", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "مرفوض", cls: "bg-red-50 text-red-700" },
};

export function SalesModule() {
  return (
    <AppLayout role="accountant" userName="أحمد محمد" activeSection="sales" notificationsCount={12}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-gray-800 font-bold text-xl">موديول المبيعات</h2>
            <p className="text-gray-400 text-sm mt-0.5">مطابقة المبيعات مع التحصيلات — 14 أكتوبر 2025</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              <Download size={15} /> تصدير Excel
            </button>
            <button className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700">
              ✓ اعتماد المحدد (3)
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard title="إجمالي المبيعات اليوم" value="509,580 ر.س" subtitle="من 8 فروع" icon={<TrendingUp size={22} className="text-emerald-600" />} iconBg="bg-emerald-50" trend="up" trendValue="+8.3%" />
          <KPICard title="إجمالي التحصيل" value="504,780 ر.س" subtitle="نقد + بطاقة + تطبيقات" icon={<BarChart2 size={22} className="text-blue-600" />} iconBg="bg-blue-50" />
          <KPICard title="إجمالي الفرق" value="4,800 ر.س" subtitle="3 حالات تباين" icon={<AlertTriangle size={22} className="text-red-600" />} iconBg="bg-red-50" status="danger" />
          <KPICard title="فروع بلا تباين" value="5/8 فروع" subtitle="مطابقة تامة" icon={<CheckCircle2 size={22} className="text-emerald-600" />} iconBg="bg-emerald-50" status="success" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="بحث بالفرع أو رقم العملية..."
                className="flex-1 text-sm text-gray-600 placeholder-gray-400 border-none outline-none"
              />
            </div>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-gray-50">
              <option>جميع الفروع</option>
              <option>فرع الرياض - العليا</option>
              <option>فرع جدة - الحمراء</option>
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-gray-50">
              <option>كل الحالات</option>
              <option>في الانتظار</option>
              <option>معتمد</option>
              <option>مرفوض</option>
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-gray-50">
              <option>الفروع ذات التباين</option>
              <option>بلا تباين</option>
              <option>تباين 1000+ ر.س</option>
            </select>
            <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">
              تطبيق
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">جدول مطابقة المبيعات</h3>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-gray-600">تحديد الكل</span>
              </label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-8">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الفرع</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">التاريخ</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">مبيعات نقدية</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">مبيعات بطاقة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">مبيعات تطبيقات</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 font-bold">إجمالي المبيعات</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">إجمالي التحصيل</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الفرق</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" defaultChecked={row.status === "pending"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{row.branch}</div>
                      <div className="text-xs text-gray-400">{row.date}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600" dir="ltr">{row.date}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono" dir="ltr">{row.cashSales}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono" dir="ltr">{row.cardSales}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono" dir="ltr">{row.appSales}</td>
                    <td className="px-4 py-3 font-bold text-gray-800 font-mono" dir="ltr">{row.totalSales}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono" dir="ltr">{row.totalCollected}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold font-mono ${
                        row.varianceType === "danger" ? "text-red-600" :
                        row.varianceType === "warning" ? "text-amber-600" :
                        "text-emerald-600"
                      }`} dir="ltr">
                        {row.variance === "0" ? "✓ مطابق" : `${row.variance} ⚠`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusMap[row.status]?.cls}`}>
                        {statusMap[row.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100">عرض</button>
                        {row.status === "pending" && (
                          <>
                            <button className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100">✓</button>
                            <button className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">✕</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Variance Note Section */}
          <div className="p-4 bg-red-50 border-t border-red-100">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">تنبيه: توجد فروق في المبيعات</p>
                <p className="text-xs text-red-600 mt-1">
                  فرع الرياض العليا: تباين 3,200 ر.س — يرجى المراجعة قبل الاعتماد.
                  فرع مكة: تباين 1,600 ر.س — في انتظار التوضيح.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
