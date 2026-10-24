import { Phone } from "lucide-react";
import { useBranchSuppliersPlatform } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import type { PageProps } from "../../_shared/types";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";

export function BranchSuppliers({ }: PageProps) {
  const { t } = useLang();
  const { data: apiSuppliers } = useBranchSuppliersPlatform();
  const suppliers = ((apiSuppliers as any[]) ?? []) as any[];
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">{t("الموردون", "Suppliers")}</h2>
      <Card title={t("الموردون + طلبات الإضافة", "Suppliers + Requests")}>
        {suppliers.length === 0 && <div className="px-5 py-10 text-center text-sm text-gray-400">{t("لا يوجد موردون", "No suppliers")}</div>}
        {suppliers.map((s, i) => {
          const isReq = s.isRequest === true;
          const chip = s.statusLabel ?? (isReq ? t("قيد المراجعة", "Under Review") : t("معتمد", "Approved"));
          return (
            <div key={s.id ?? i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold flex-shrink-0">{(s.name || "?")[0]}</div>
              <div className="flex-1"><p className="font-semibold text-sm text-gray-800">{s.name}</p><p className="text-xs text-gray-400">{s.category ?? s.cat ?? "—"}{(s.contactName || s.contactPhone) ? ` · ${s.contactName ?? s.contactPhone}` : ""}</p></div>
              {s.contactPhone && <span className="text-xs text-emerald-600 flex items-center gap-1"><Phone size={11} /> {s.contactPhone}</span>}
              <Badge className={`text-[10px] ${isReq ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>{chip}</Badge>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
