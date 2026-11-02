import "./_group.css";
import { AppLayout } from "./_shared/AppLayout";
import { useState } from "react";
import { ArrowRight, Eye, ThumbsUp, ThumbsDown, CheckCircle2, XCircle, Paperclip, AlertTriangle, Download } from "lucide-react";

interface PurchaseItem {
  name: string;
  ordered: number;
  received: number;
  unit: string;
  unitPrice: number;
  diff: number;
}

interface Purchase {
  id: string;
  branch: string;
  supplier: string;
  orderDate: string;
  receiveDate: string;
  status: "pending" | "approved" | "rejected" | "mismatch";
  items: PurchaseItem[];
  totalOrdered: number;
  totalReceived: number;
  invoiceTotal: number;
  attachments: number;
}

const purchases: Purchase[] = [
  {
    id: "PUR-1101",
    branch: "فرع الرياض - العليا",
    supplier: "شركة الأغذية المتحدة",
    orderDate: "13 أكتوبر 2025",
    receiveDate: "14 أكتوبر 2025",
    status: "pending",
    totalOrdered: 4800,
    totalReceived: 4800,
    invoiceTotal: 4800,
    attachments: 3,
    items: [
      { name: "دجاج طازج", ordered: 50, received: 50, unit: "كجم", unitPrice: 28, diff: 0 },
      { name: "بطاطس", ordered: 80, received: 80, unit: "كجم", unitPrice: 5, diff: 0 },
      { name: "زيت قلي", ordered: 20, received: 20, unit: "لتر", unitPrice: 30, diff: 0 },
    ],
  },
  {
    id: "PUR-1100",
    branch: "فرع جدة - الحمراء",
    supplier: "مورد الخضروات الطازجة",
    orderDate: "13 أكتوبر 2025",
    receiveDate: "14 أكتوبر 2025",
    status: "mismatch",
    totalOrdered: 1200,
    totalReceived: 1050,
    invoiceTotal: 1200,
    attachments: 2,
    items: [
      { name: "طماطم", ordered: 30, received: 25, unit: "كجم", unitPrice: 8, diff: -5 },
      { name: "خس", ordered: 20, received: 20, unit: "كجم", unitPrice: 12, diff: 0 },
      { name: "بصل", ordered: 40, received: 35, unit: "كجم", unitPrice: 4, diff: -5 },
    ],
  },
  {
    id: "PUR-1099",
    branch: "فرع مكة",
    supplier: "شركة مشروبات النخبة",
    orderDate: "12 أكتوبر 2025",
    receiveDate: "13 أكتوبر 2025",
    status: "approved",
    totalOrdered: 2200,
    totalReceived: 2200,
    invoiceTotal: 2200,
    attachments: 1,
    items: [
      { name: "مياه معدنية (كرتون)", ordered: 50, received: 50, unit: "كرتون", unitPrice: 22, diff: 0 },
      { name: "عصائر متنوعة", ordered: 30, received: 30, unit: "كرتون", unitPrice: 45, diff: 0 },
    ],
  },
];

function PurchaseDetailModal({ pur, onClose }: { pur: Purchase; onClose: () => void }) {
  const hasDiff = pur.items.some((i) => i.diff !== 0);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[680px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800 text-lg">تفاصيل أمر الشراء — {pur.id}</h3>
              <p className="text-gray-500 text-sm mt-0.5">{pur.branch} · {pur.supplier}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {/* Info row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "تاريخ الطلب", value: pur.orderDate },
              { label: "تاريخ الاستلام", value: pur.receiveDate },
              { label: "المرفقات", value: `${pur.attachments} ملفات` },
            ].map((info, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">{info.label}</p>
                <p className="font-medium text-gray-800 text-sm mt-0.5">{info.value}</p>
              </div>
            ))}
          </div>

          {/* Items table */}
          <div>
            <h4 className="font-bold text-gray-700 text-sm mb-3">مقارنة الكميات المطلوبة والمستلمة</h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px] border border-gray-100 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
                <tr>
                  <th className="px-4 py-3 text-right">الصنف</th>
                  <th className="px-4 py-3 text-center">المطلوب</th>
                  <th className="px-4 py-3 text-center">المستلم</th>
                  <th className="px-4 py-3 text-center">الفرق</th>
                  <th className="px-4 py-3 text-center">سعر الوحدة</th>
                  <th className="px-4 py-3 text-center">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pur.items.map((item, i) => (
                  <tr key={i} className={item.diff !== 0 ? "bg-red-50" : ""}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{item.ordered} {item.unit}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-gray-800">{item.received} {item.unit}</td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.diff === 0 ? (
                        <span className="text-emerald-600">—</span>
                      ) : (
                        <span className="text-red-600 font-bold">{item.diff} {item.unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600" dir="ltr">{item.unitPrice} ر.س</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold" dir="ltr">
                      {(item.received * item.unitPrice).toLocaleString()} ر.س
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm">المجموع</td>
                  <td className="px-4 py-3 text-center text-sm">—</td>
                  <td className="px-4 py-3 text-center text-sm">—</td>
                  <td className="px-4 py-3 text-center text-sm">—</td>
                  <td className="px-4 py-3 text-center text-sm">—</td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-purple-700" dir="ltr">{pur.totalReceived.toLocaleString()} ر.س</td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>

          {/* Total comparison */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600">قيمة الطلب الأصلي</p>
              <p className="font-bold text-blue-700 text-lg" dir="ltr">{pur.totalOrdered.toLocaleString()} ر.س</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xs text-purple-600">قيمة المستلم الفعلي</p>
              <p className="font-bold text-purple-700 text-lg" dir="ltr">{pur.totalReceived.toLocaleString()} ر.س</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${hasDiff ? "bg-red-50" : "bg-emerald-50"}`}>
              <p className={`text-xs ${hasDiff ? "text-red-600" : "text-emerald-600"}`}>
                {hasDiff ? "فرق في الكمية" : "مطابق"}
              </p>
              <p className={`font-bold text-lg ${hasDiff ? "text-red-700" : "text-emerald-700"}`} dir="ltr">
                {hasDiff ? `${pur.totalOrdered - pur.totalReceived} ر.س` : "✓"}
              </p>
            </div>
          </div>

          {hasDiff && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-semibold text-sm">تنبيه: يوجد فرق في الكميات المستلمة</p>
                  <p className="text-amber-700 text-xs mt-1">يرجى التحقق من سبب الفرق مع مدير الفرع والمورد قبل الموافقة على العملية.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
              ✓ موافقة
            </button>
            <button className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-semibold border border-red-200 hover:bg-red-100">
              ✕ رفض مع ذكر السبب
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PurchasesModule() {
  const [selected, setSelected] = useState<Purchase | null>(null);

  const statusMap: Record<string, { label: string; cls: string }> = {
    pending: { label: "معلق", cls: "bg-amber-50 text-amber-700" },
    approved: { label: "موافق عليه", cls: "bg-emerald-50 text-emerald-700" },
    rejected: { label: "مرفوض", cls: "bg-red-50 text-red-700" },
    mismatch: { label: "⚠ فرق في الكمية", cls: "bg-red-50 text-red-700" },
  };

  return (
    <AppLayout role="accountant" userName="أحمد محمد" activeSection="purchases" notificationsCount={12}>
      {selected && <PurchaseDetailModal pur={selected} onClose={() => setSelected(null)} />}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <span className="text-purple-600 cursor-pointer hover:underline">الرئيسية</span>
              <ArrowRight size={12} className="rotate-180" />
              <span className="text-gray-700 font-semibold">موديول المشتريات</span>
            </div>
            <h2 className="font-bold text-gray-800 text-xl">🛒 موديول المشتريات</h2>
            <p className="text-gray-400 text-sm">مطابقة أوامر الشراء مع الفواتير الفعلية والكميات المستلمة</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            <Download size={14} /> تصدير
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "إجمالي المشتريات اليوم", value: "45,200 ر.س", color: "border-l-blue-500" },
            { label: "معلق للمراجعة", value: "8", color: "border-l-amber-500" },
            { label: "فروق في الكميات", value: "3", color: "border-l-red-500" },
            { label: "تمت الموافقة", value: "5", color: "border-l-emerald-500" },
          ].map((k, i) => (
            <div key={i} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${k.color}`}>
              <p className="text-gray-500 text-xs">{k.label}</p>
              <p className="text-gray-900 font-bold text-2xl mt-1">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">أوامر الشراء</h3>
            <div className="flex items-center gap-2">
              <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600">
                <option>كل الحالات</option>
                <option>معلق</option>
                <option>فرق في الكمية</option>
                <option>موافق عليه</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {purchases.map((pur) => {
              const status = statusMap[pur.status];
              const hasDiff = pur.totalOrdered !== pur.totalReceived;
              return (
                <div key={pur.id} className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50 ${hasDiff ? "border-r-4 border-r-red-400" : ""}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800 text-sm">{pur.branch}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs font-mono text-purple-600">{pur.id}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-500">{pur.supplier}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                      <span className="text-xs text-gray-400">📅 استلام: {pur.receiveDate}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Paperclip size={11} /> {pur.attachments} مرفقات
                      </span>
                      <span className="text-xs text-gray-400">{pur.items.length} أصناف</span>
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <div className="font-bold text-gray-800 font-mono" dir="ltr">{pur.totalReceived.toLocaleString()} ر.س</div>
                    {hasDiff && (
                      <div className="text-red-500 text-xs text-right" dir="ltr">
                        فرق: {(pur.totalOrdered - pur.totalReceived).toLocaleString()} ر.س
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setSelected(pur)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium"
                    >
                      <Eye size={13} /> مراجعة تفصيلية
                    </button>
                    {pur.status === "pending" || pur.status === "mismatch" ? (
                      <>
                        <button className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                          <ThumbsUp size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">
                          <ThumbsDown size={14} />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
