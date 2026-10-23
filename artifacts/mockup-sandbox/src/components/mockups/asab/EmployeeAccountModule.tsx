import "./_group.css";
import { AppLayout } from "./_shared/AppLayout";
import { useState } from "react";
import {
  ArrowRight,
  Search,
  Download,
  TrendingDown,
  TrendingUp,
  User,
  Calendar,
  Filter,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  role: string;
  branch: string;
  balance: number;
  lastActivity: string;
}

interface Movement {
  id: string;
  date: string;
  description: string;
  type: "debit" | "credit";
  amount: number;
  balance: number;
  category: string;
}

const employees: Employee[] = [
  {
    id: "EMP-001",
    name: "محمد العتيبي",
    role: "كاشير رئيسي",
    branch: "فرع الرياض - العليا",
    balance: -450,
    lastActivity: "قبل ساعة",
  },
  {
    id: "EMP-002",
    name: "خالد الشمري",
    role: "مشرف الشفت",
    branch: "فرع الرياض - العليا",
    balance: 0,
    lastActivity: "اليوم",
  },
  {
    id: "EMP-003",
    name: "فهد القحطاني",
    role: "كاشير",
    branch: "فرع جدة - الحمراء",
    balance: -1200,
    lastActivity: "أمس",
  },
  {
    id: "EMP-004",
    name: "سعد الدوسري",
    role: "مشرف",
    branch: "فرع مكة - المعابدة",
    balance: 350,
    lastActivity: "قبل يومين",
  },
  {
    id: "EMP-005",
    name: "عبدالله الحربي",
    role: "كاشير",
    branch: "فرع الدمام",
    balance: 0,
    lastActivity: "اليوم",
  },
];

const movements: Movement[] = [
  {
    id: "MOV-001",
    date: "14 أكتوبر 2025 — 9:30 ص",
    description: "فرق في مبيعات قناة جاهز",
    type: "debit",
    amount: 150,
    balance: -150,
    category: "فرق مبيعات",
  },
  {
    id: "MOV-002",
    date: "13 أكتوبر 2025 — 2:00 م",
    description: "فرق في مبيعات نقدي (شفت مسائي)",
    type: "debit",
    amount: 300,
    balance: -300,
    category: "فرق مبيعات",
  },
  {
    id: "MOV-003",
    date: "12 أكتوبر 2025 — 11:00 ص",
    description: "تسوية فرق سابق — تم إرجاعه",
    type: "credit",
    amount: 300,
    balance: 0,
    category: "تسوية",
  },
  {
    id: "MOV-004",
    date: "11 أكتوبر 2025 — 6:00 م",
    description: "نقص في عدد الإيصالات",
    type: "debit",
    amount: 200,
    balance: -200,
    category: "نقص إيصالات",
  },
  {
    id: "MOV-005",
    date: "10 أكتوبر 2025 — 8:00 ص",
    description: "سلفة — خصم من الراتب",
    type: "debit",
    amount: 500,
    balance: -500,
    category: "سلفة",
  },
  {
    id: "MOV-006",
    date: "9 أكتوبر 2025 — 9:00 ص",
    description: "مكافأة أداء متميز",
    type: "credit",
    amount: 200,
    balance: 200,
    category: "مكافأة",
  },
  {
    id: "MOV-007",
    date: "8 أكتوبر 2025 — 1:00 م",
    description: "خصم غياب بدون إذن",
    type: "debit",
    amount: 250,
    balance: -250,
    category: "غياب",
  },
];

export function EmployeeAccountModule() {
  const [selectedEmp, setSelectedEmp] = useState<Employee>(employees[0]);

  return (
    <AppLayout
      role="accountant"
      userName="أحمد محمد"
      activeSection="employees"
      notificationsCount={12}
    >
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span className="text-purple-600 cursor-pointer hover:underline">
              الرئيسية
            </span>
            <ArrowRight size={12} className="rotate-180" />
            <span className="text-gray-700 font-semibold">
              كشف حساب الموظفين
            </span>
          </div>
          <h2 className="font-bold text-gray-800 text-xl">
            👥 كشف حساب الموظفين
          </h2>
          <p className="text-gray-400 text-sm">
            متابعة الحركات المالية لكل موظف (الفروقات، الخصومات، المكافآت)
          </p>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Employees List */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-4 py-3.5 border-b border-gray-100">
              <p className="font-bold text-gray-800 text-sm">قائمة الموظفين</p>
              <div className="flex items-center gap-2 mt-2.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                <Search size={13} className="text-gray-400" />
                <input
                  className="text-xs text-gray-600 bg-transparent outline-none w-full"
                  placeholder="بحث..."
                />
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-[calc(100vh-260px)] overflow-y-auto">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmp(emp)}
                  className={`w-full text-right px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedEmp.id === emp.id ? "bg-purple-50 border-r-3 border-r-purple-500" : ""}`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${selectedEmp.id === emp.id ? "bg-purple-100" : "bg-gray-100"}`}
                  >
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold text-sm truncate ${selectedEmp.id === emp.id ? "text-purple-700" : "text-gray-800"}`}
                    >
                      {emp.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{emp.role}</p>
                  </div>
                  <div
                    className={`text-xs font-bold flex-shrink-0 ${emp.balance < 0 ? "text-red-600" : emp.balance > 0 ? "text-emerald-600" : "text-gray-400"}`}
                  >
                    {emp.balance < 0
                      ? `-${Math.abs(emp.balance)}`
                      : emp.balance > 0
                        ? `+${emp.balance}`
                        : "0"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Account Statement */}
          <div className="col-span-2 space-y-4">
            {/* Employee Header Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-2xl">
                    👤
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                      {selectedEmp.name}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {selectedEmp.role} · {selectedEmp.branch}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                        {selectedEmp.id}
                      </span>
                      <span className="text-xs text-gray-400">
                        آخر نشاط: {selectedEmp.lastActivity}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500 mb-1">الرصيد الحالي</p>
                  <p
                    className={`font-bold text-2xl font-mono ${selectedEmp.balance < 0 ? "text-red-600" : selectedEmp.balance > 0 ? "text-emerald-600" : "text-gray-500"}`}
                    dir="ltr"
                  >
                    {selectedEmp.balance < 0
                      ? "-"
                      : selectedEmp.balance > 0
                        ? "+"
                        : ""}
                    {Math.abs(selectedEmp.balance).toLocaleString()} ر.س
                  </p>
                  <p
                    className={`text-xs mt-0.5 text-left ${selectedEmp.balance < 0 ? "text-red-400" : selectedEmp.balance > 0 ? "text-emerald-400" : "text-gray-400"}`}
                  >
                    {selectedEmp.balance < 0
                      ? "مديون للشركة"
                      : selectedEmp.balance > 0
                        ? "دائن"
                        : "لا يوجد رصيد"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-4">
                {[
                  {
                    label: "إجمالي المدين",
                    value: "1,400 ر.س",
                    icon: <TrendingDown size={14} />,
                    cls: "text-red-600 bg-red-50",
                  },
                  {
                    label: "إجمالي الدائن",
                    value: "500 ر.س",
                    icon: <TrendingUp size={14} />,
                    cls: "text-emerald-600 bg-emerald-50",
                  },
                  {
                    label: "عدد الحركات",
                    value: "7",
                    icon: <Calendar size={14} />,
                    cls: "text-blue-600 bg-blue-50",
                  },
                  {
                    label: "فترة الكشف",
                    value: "أكتوبر 2025",
                    icon: <Filter size={14} />,
                    cls: "text-purple-600 bg-purple-50",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 rounded-lg p-3 flex items-center gap-2"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.cls}`}
                    >
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">{stat.label}</p>
                      <p className="font-bold text-gray-800 text-sm">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Movements Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">كشف الحركات المالية</h3>
                <div className="flex items-center gap-2">
                  <select className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600">
                    <option>أكتوبر 2025</option>
                    <option>سبتمبر 2025</option>
                    <option>أغسطس 2025</option>
                  </select>
                  <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    <Download size={12} /> تصدير PDF
                  </button>
                </div>
              </div>
              <table className="w-full" dir="rtl">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500 font-semibold">
                    <th className="px-5 py-3 text-right">التاريخ والتفاصيل</th>
                    <th className="px-4 py-3 text-center">الفئة</th>
                    <th className="px-4 py-3 text-center">مدين</th>
                    <th className="px-4 py-3 text-center">دائن</th>
                    <th className="px-4 py-3 text-center">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map((m) => (
                    <tr
                      key={m.id}
                      className={`hover:bg-gray-50 ${m.type === "debit" ? "border-r-2 border-r-red-200" : "border-r-2 border-r-emerald-200"}`}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-800">
                          {m.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{m.date}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {m.category}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3.5 text-center font-mono font-semibold text-red-600"
                        dir="ltr"
                      >
                        {m.type === "debit"
                          ? `${m.amount.toLocaleString()} ر.س`
                          : "—"}
                      </td>
                      <td
                        className="px-4 py-3.5 text-center font-mono font-semibold text-emerald-600"
                        dir="ltr"
                      >
                        {m.type === "credit"
                          ? `${m.amount.toLocaleString()} ر.س`
                          : "—"}
                      </td>
                      <td
                        className="px-4 py-3.5 text-center font-mono font-bold"
                        dir="ltr"
                      >
                        <span
                          className={
                            m.balance < 0
                              ? "text-red-600"
                              : m.balance > 0
                                ? "text-emerald-600"
                                : "text-gray-400"
                          }
                        >
                          {m.balance < 0 ? "-" : ""}
                          {Math.abs(m.balance).toLocaleString()} ر.س
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                  <tr>
                    <td className="px-5 py-3.5 text-sm text-gray-700">
                      الرصيد الختامي
                    </td>
                    <td className="px-4 py-3.5"></td>
                    <td
                      className="px-4 py-3.5 text-center font-mono text-red-600"
                      dir="ltr"
                    >
                      1,400 ر.س
                    </td>
                    <td
                      className="px-4 py-3.5 text-center font-mono text-emerald-600"
                      dir="ltr"
                    >
                      500 ر.س
                    </td>
                    <td
                      className="px-4 py-3.5 text-center font-mono text-red-700 font-bold"
                      dir="ltr"
                    >
                      -450 ر.س
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="p-5 bg-red-50 border-t border-red-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-red-700 font-medium">
                    ⚠ الموظف مدين بمبلغ 450 ر.س — مسجل في كشف الحساب للتسوية وفق
                    سياسة المنشأة
                  </p>
                  <div className="flex gap-2">
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50">
                      إضافة حركة جديدة
                    </button>
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700">
                      تسوية الرصيد
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
