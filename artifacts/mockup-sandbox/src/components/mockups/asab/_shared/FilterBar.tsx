import { Search, RotateCcw } from "lucide-react";
import { useLang } from "./LangContext";
import type { Filters } from "./types";

export function FilterBar({ filters, onChange, branches }: { filters: Filters; onChange: (f: Filters) => void; branches: string[] }) {
  const { t } = useLang();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
        <Search size={13} className="text-gray-400" />
        <input value={filters.search} onChange={e => onChange({ ...filters, search: e.target.value })} placeholder={t("بحث...", "Search...")} className="text-xs outline-none text-gray-600 w-28" />
      </div>
      <select value={filters.branch} onChange={e => onChange({ ...filters, branch: e.target.value })} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
        <option value="">{t("الكل — الفروع", "All Branches")}</option>
        {branches.map(b => <option key={b}>{b}</option>)}
      </select>
      <select value={filters.status} onChange={e => onChange({ ...filters, status: e.target.value })} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
        <option value="">{t("كل الحالات", "All Statuses")}</option>
        <option value="pending">{t("معلق", "Pending")}</option>
        <option value="approved">{t("موافق عليه", "Approved")}</option>
        <option value="rejected">{t("مرفوض", "Rejected")}</option>
        <option value="final-approved">{t("معتمد نهائياً", "Final Approved")}</option>
      </select>
      <select value={filters.match} onChange={e => onChange({ ...filters, match: e.target.value })} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
        <option value="">{t("كل المطابقات", "All Matches")}</option>
        <option value="exact">{t("متطابق", "Exact Match")}</option>
        <option value="review">{t("يحتاج مراجعة", "Needs Review")}</option>
        <option value="diff">{t("فرق", "Difference")}</option>
      </select>
      {(filters.branch || filters.status || filters.match || filters.search) &&
        <button onClick={() => onChange({ branch: "", status: "", match: "", search: "" })} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11} /> {t("مسح الفلاتر", "Clear Filters")}</button>
      }
    </div>
  );
}
