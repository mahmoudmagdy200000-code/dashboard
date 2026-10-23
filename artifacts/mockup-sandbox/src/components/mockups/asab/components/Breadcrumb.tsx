import { useLang } from "../_shared/LangContext";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const { dir, t } = useLang();
  return (
    <nav aria-label={t("مسار الصفحة", "Breadcrumb")} className="flex flex-wrap items-center gap-1.5 text-sm mb-5 bg-white rounded-xl border border-gray-100 px-4 py-2.5 w-fit shadow-sm" dir={dir}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={13} className="text-gray-300 rotate-180" />}
          {item.onClick
            ? <button onClick={item.onClick} className="text-purple-600 hover:text-purple-800 font-medium hover:underline">{item.label}</button>
            : <span className="font-semibold text-gray-700">{item.label}</span>
          }
        </div>
      ))}
    </nav>
  );
}
