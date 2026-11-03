import "./_group.css";
import { AppLayout } from "./_shared/AppLayout";
import { useState } from "react";
import { ArrowRight, Eye, ThumbsUp, ThumbsDown, MessageSquare, Paperclip, Search, Filter, Download, CheckCircle2 } from "lucide-react";

type ExpenseStatus = "pending" | "approved" | "rejected";
interface Expense {
  id: string;
  branch: string;
  vendor: string;
  category: string;
  amount: string;
  invoiceNo: string;
  date: string;
  status: ExpenseStatus;
  invoiceMatch: "matched" | "mismatch" | "missing";
  attachments: number;
  notes?: string;
}

const expenses: Expense[] = [
  { id: "EXP-0441", branch: "فرع الرياض - العليا", vendor: "مورد مواد تنظيف — شركة النظافة السعودية", category: "مواد تنظيف", amount: "1,250 ر.س", invoiceNo: "INV-88312", date: "14 أكتوبر 2025", status: "pending", invoiceMatch: "matched", attachments: 2 },
  { id: "EXP-0440", branch: "فرع جدة - الحمراء", vendor: "صيانة مكيفات — شركة البارد", category: "صيانة", amount: "3,400 ر.س", invoiceNo: "INV-77201", date: "14 أكتوبر 2025", status: "pending", invoiceMatch: "mismatch", attachments: 1, notes: "المبلغ في الفاتورة 3,200 ر.س بينما المُدخل 3,400 ر.س" },
  { id: "EXP-0439", branch: "فرع مكة - المعابدة", vendor: "إيجار شهري — شركة الإيجار", category: "إيجار", amount: "8,000 ر.س", invoiceNo: "INV-44122", date: "13 أكتوبر 2025", status: "pending", invoiceMatch: "matched", attachments: 3 },
  { id: "EXP-0438", branch: "فرع الدمام", vendor: "فاتورة كهرباء — شركة الكهرباء", category: "فواتير خدمات", amount: "2,100 ر.س", invoiceNo: "INV-55678", date: "13 أكتوبر 2025", status: "approved", invoiceMatch: "matched", attachments: 1 },
  { id: "EXP-0437", branch: "فرع الرياض - النزهة", vendor: "مشتريات متنوعة", category: "متنوع", amount: "780 ر.س", invoiceNo: "—", date: "12 أكتوبر 2025", status: "rejected", invoiceMatch: "missing", attachments: 0, notes: "فاتورة مفقودة" },
];

const matchLabels: Record<string, { label: string; cls: string }> = {
  matched: { label: "✓ مطابقة للفاتورة", cls: "bg-emerald-50 text-emerald-700" },
  mismatch: { label: "⚠ تناقض في المبلغ", cls: "bg-red-50 text-red-700" },
  missing: { label: "✗ فاتورة مفقودة", cls: "bg-gray-50 text-gray-500" },
};

const statusLabels: Record<ExpenseStatus, { label: string; cls: string }> = {
  pending: { label: "معلق", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "معتمد", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "مرفوض", cls: "bg-red-50 text-red-700" },
};

function InvoiceVerifyModal({ exp, onClose }: { exp: Expense; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-[560px] p-6 space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">مراجعة الفاتورة — {exp.id}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">البيانات المُدخلة</p>
            <div className="space-y-1.5">
              <p className="text-sm"><span className="text-gray-500">المورد:</span> <span className="font-medium text-gray-800">{exp.vendor}</span></p>
              <p className="text-sm"><span className="text-gray-500">المبلغ:</span> <span className="font-bold text-purple-700">{exp.amount}</span></p>
              <p className="text-sm"><span className="text-gray-500">رقم الفاتورة:</span> <span className="font-mono text-gray-700">{exp.invoiceNo}</span></p>
              <p className="text-sm"><span className="text-gray-500">التاريخ:</span> <span className="text-gray-700">{exp.date}</span></p>
            </div>
          </div>
          <div className={`rounded-xl p-4 space-y-2 ${exp.invoiceMatch === "mismatch" ? "bg-red-50 border border-red-200" : "bg-emerald-50"}`}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">بيانات الفاتورة المرفقة</p>
            {exp.invoiceMatch === "missing" ? (
              <div className="flex flex-col items-center justify-center h-20 text-gray-400">
                <span className="text-3xl">📄</span>
                <p className="text-xs mt-1">لا توجد فاتورة مرفقة</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-sm"><span className="text-gray-500">المورد:</span> <span className="font-medium text-gray-800">{exp.vendor}</span></p>
                <p className="text-sm"><span className="text-gray-500">المبلغ:</span>
                  <span className={`font-bold ml-1 ${exp.invoiceMatch === "mismatch" ? "text-red-600" : "text-emerald-700"}`}>
                    {exp.invoiceMatch === "mismatch" ? "3,200 ر.س" : exp.amount}
                  </span>
                </p>
                <p className="text-sm"><span className="text-gray-500">رقم الفاتورة:</span> <span className="font-mono text-gray-700">{exp.invoiceNo}</span></p>
                {exp.invoiceMatch === "mismatch" && (
                  <p className="text-xs text-red-600 font-semibold mt-2">⚠ فرق: 200 ر.س عن الفاتورة الأصلية</p>
                )}
              </div>
            )}
          </div>
        </div>
        {exp.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-amber-800 text-sm">⚠ {exp.notes}</p>
          </div>
        )}
        <div className="border rounded-xl p-4 bg-gray-50 flex items-center justify-center gap-3">
          <span className="text-gray-400 text-sm">صورة الفاتورة (INV-88312.pdf)</span>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100">
            <Eye size={12} /> عرض الفاتورة
          </button>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
            ✓ موافقة
          </button>
          <button className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-semibold border border-red-200 hover:bg-red-100">
            ✕ رفض
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExpensesModule() {
  const [selected, setSelected] = useState<Expense | null>(null);

  return (
    <AppLayout role="accountant" userName="أحمد محمد" activeSection="expenses" notificationsCount={12}>
      {selected && <InvoiceVerifyModal exp={selected} onClose={() => setSelected(null)} />}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <span className="text-purple-600 cursor-pointer hover:underline">الرئيسية</span>
              <ArrowRight size={12} className="rotate-180" />
              <span className="text-gray-700 font-semibold">موديول المصروفات</span>
            </div>
            <h2 className="font-bold text-gray-800 text-xl">💸 موديول المصروفات</h2>
            <p className="text-gray-400 text-sm">التحقق من الفواتير ومطابقة المبالغ</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              <Filter size={14} /> فلترة
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              <Download size={14} /> تصدير
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "إجمالي المصروفات اليوم", value: "22,430 ر.س", sub: "22 فاتورة", color: "border-l-red-500", bg: "bg-red-50" },
            { label: "فواتير معلقة للمراجعة", value: "15", sub: "8 مطابقة / 4 تناقض / 3 مفقودة", color: "border-l-amber-500", bg: "bg-amber-50" },
            { label: "تمت الموافقة اليوم", value: "7", sub: "تم إرسالها لرئيس الحسابات", color: "border-l-emerald-500", bg: "bg-emerald-50" },
            { label: "تناقضات تحتاج مراجعة", value: "4", sub: "فرق في المبالغ", color: "border-l-purple-500", bg: "bg-purple-50" },
          ].map((k, i) => (
            <div key={i} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${k.color}`}>
              <p className="text-gray-500 text-xs">{k.label}</p>
              <p className="text-gray-900 font-bold text-xl mt-1">{k.value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">فواتير المصروفات</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                <Search size={13} className="text-gray-400" />
                <input className="text-sm text-gray-600 bg-transparent outline-none w-44" placeholder="بحث برقم الفاتورة أو المورد..." />
              </div>
              <button className="text-sm px-4 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100 border border-emerald-200">
                ✓ موافقة جماعية
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]" dir="rtl">
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-500 font-semibold">
                <th className="px-5 py-3 text-right">
                  <input type="checkbox" className="rounded ml-2" />
                  رقم المصروف
                </th>
                <th className="px-4 py-3 text-right">الفرع</th>
                <th className="px-4 py-3 text-right">المورد / الفئة</th>
                <th className="px-4 py-3 text-center">رقم الفاتورة</th>
                <th className="px-4 py-3 text-center">المبلغ</th>
                <th className="px-4 py-3 text-center">حالة الفاتورة</th>
                <th className="px-4 py-3 text-center">الحالة</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((exp) => {
                const match = matchLabels[exp.invoiceMatch];
                const status = statusLabels[exp.status];
                return (
                  <tr key={exp.id} className={`hover:bg-gray-50 ${exp.invoiceMatch === "mismatch" ? "border-r-4 border-r-red-400" : exp.invoiceMatch === "missing" ? "border-r-4 border-r-gray-300" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="font-mono text-xs text-purple-600 font-bold">{exp.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-700">{exp.branch}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{exp.vendor}</p>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{exp.category}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-mono text-xs text-gray-600">{exp.invoiceNo}</span>
                      {exp.attachments > 0 && (
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          <Paperclip size={10} className="text-gray-400" />
                          <span className="text-[10px] text-gray-400">{exp.attachments}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-bold text-gray-800 text-sm">{exp.amount}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${match.cls}`}>{match.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelected(exp)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
                        >
                          <Eye size={11} /> مراجعة
                        </button>
                        {exp.status === "pending" && (
                          <>
                            <button className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                              <ThumbsUp size={12} />
                            </button>
                            <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                              <ThumbsDown size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">عرض 5 من 22 فاتورة</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((p) => (
                <button key={p} className={`w-8 h-8 rounded-lg text-xs ${p === 1 ? "bg-purple-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
