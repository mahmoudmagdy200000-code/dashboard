import { Eye, Download } from "lucide-react";
import { useLang } from "../../_shared/LangContext";
import { formatMonthLong } from "../../_shared/formatters";
import { Btn } from "../../components/Btn";
import type { PageProps } from "../../_shared/types";

export function ReportsPage({ }: PageProps) {
  const { t, lang, dir } = useLang();
  const reports = ["تقرير المبيعات الشهري", "تقرير المصروفات", "تقرير المشتريات", "كشف الحسابات", "تقرير المخزون", "تقرير الأداء العام"];
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">التقارير</h2>
      <div className="grid grid-cols-3 gap-4">
        {reports.map((r, i) => (
          <button key={i} className="bg-white rounded-xl border border-gray-100 p-5 text-right hover:border-purple-200 hover:bg-purple-50/30 transition-all shadow-sm">
            <div className="text-3xl mb-3">📊</div>
            <p className="font-semibold text-gray-800 text-sm">{r}</p>
            <p className="text-xs text-gray-400 mt-1">{formatMonthLong(lang)}</p>
            <div className="flex items-center gap-2 mt-3">
              <Btn size="sm"><Eye size={11} /> {t("عرض", "View")}</Btn>
              <Btn size="sm"><Download size={11} /> {t("تحميل", "Download")}</Btn>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
