import { Bell } from "lucide-react";
import { useBranchInventoryItemsPlatform } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";

export function BranchItems({ }: PageProps) {
  const { t } = useLang();
  const { data: apiItems } = useBranchInventoryItemsPlatform();
  const items = (((apiItems as any)?.items ?? []) as any[]);   // T12 §4 rows w/ stock status
  const configuredBy = (apiItems as any)?.configuredBy;
  const SC: Record<string, { cls: string; label: string }> = {
    ok: { cls: "bg-emerald-50 text-emerald-700", label: t("كافٍ", "OK") },
    low: { cls: "bg-amber-50 text-amber-700", label: t("منخفض", "Low") },
    critical: { cls: "bg-red-50 text-red-700", label: t("حرج", "Critical") },
  };
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">{t("الأصناف المحددة للجرد", "Items for Inventory")}</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
        <Bell size={14} className="text-blue-600 flex-shrink-0" />
        <p className="text-blue-700 text-xs">{configuredBy ? `${t("القائمة محددة بواسطة", "List configured by")} ${configuredBy}` : t("قائمة كتالوج العلامة التجارية.", "Brand catalog list.")}</p>
      </div>
      <Card title={`${t("الأصناف —", "Items —")} ${items.length} ${t("أصناف", "items")}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-right">{t("الصنف", "Item")}</th>
                <th className="px-4 py-2.5 text-center">{t("الوحدة", "Unit")}</th>
                <th className="px-4 py-2.5 text-center">{t("المتوقع", "Expected")}</th>
                <th className="px-4 py-2.5 text-center">{t("الحد الأدنى", "Min")}</th>
                <th className="px-4 py-2.5 text-center">{t("السعر", "Price")}</th>
                <th className="px-4 py-2.5 text-center">{t("الحالة", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t("لا توجد أصناف", "No items")}</td></tr>}
              {items.map((it, i) => {
                const sc = SC[it.stockStatus] ?? SC.ok; return (
                  <tr key={it.id ?? i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{it.name}{it.code ? <span className="block text-[10px] font-mono text-gray-400">{it.code}</span> : null}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{it.unit ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-mono text-gray-700">{it.expectedQty ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-mono text-gray-500">{it.minLevel ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-mono text-gray-700">{it.priceHalalas != null ? `${fmtAmt(it.priceHalalas / 100)}` : "—"}</td>
                    <td className="px-4 py-3 text-center"><Badge className={`text-[10px] ${sc.cls}`}>{it.stockStatusLabel ?? sc.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
