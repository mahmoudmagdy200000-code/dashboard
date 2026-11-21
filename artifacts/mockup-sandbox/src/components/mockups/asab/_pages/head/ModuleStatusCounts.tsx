import { useLang } from "../../_shared/LangContext";
import type { Op } from "../../_shared/types";

export function ModuleStatusCounts({ ops, tone = "blue" }: { ops: Op[]; tone?: "blue" | "red" }) {
  const { t } = useLang();
  const counts = Array.from(ops.reduce((result, op) => {
    result.set(op.moduleLabel, (result.get(op.moduleLabel) ?? 0) + 1);
    return result;
  }, new Map<string, number>()), ([label, count]) => ({ label, count }));

  return (
    <section aria-label={t("أعداد العمليات حسب الموديول", "Operation counts by module")} className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">{t("الأعداد حسب الموديول", "Counts by module")}</h3>
      {counts.length === 0 ? (
        <p className="text-xs text-gray-400">{t("لا توجد عمليات في هذه المرحلة", "No operations in this stage")}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
          {counts.map(({ label, count }) => (
            <div key={label} className="min-w-0 rounded-lg border border-gray-100 bg-white px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600 break-words">{label}</span>
              <span className={`shrink-0 inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-bold ${tone === "red" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
