import type { ReactNode } from "react";

export interface KpiCardProps {
  label: string;
  value: string;
  valueLabel?: string;
  sub?: string;
  icon: ReactNode;
  accent?: string;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  valueLabel,
  sub,
  icon,
  accent = "purple",
  onClick,
}: KpiCardProps) {
  const accents: Record<string, string> = {
    purple: "border-t-purple-500 bg-purple-500",
    emerald: "border-t-emerald-500 bg-emerald-500",
    amber: "border-t-amber-500 bg-amber-500",
    blue: "border-t-blue-500 bg-blue-500",
    red: "border-t-red-500 bg-red-500",
    orange: "border-t-orange-500 bg-orange-500",
  };
  const borderCls = accents[accent]?.split(" ")[0] || "border-t-purple-500";
  const iconBg = accents[accent]?.split(" ")[1] || "bg-purple-500";
  const content = (
    <>
      <span className={`w-10 h-10 rounded-xl ${iconBg} bg-opacity-10 flex items-center justify-center flex-shrink-0`}>
        {icon}
      </span>
      <span className="block min-w-0">
        <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider leading-tight">{label}</span>
        {valueLabel ? (
          <span className="flex flex-wrap items-baseline gap-x-2 mt-1 text-gray-900 font-extrabold text-3xl leading-none font-mono">
            <span>{value}</span>
            <span className="min-w-0 max-w-full break-words text-xs font-medium leading-tight text-gray-500">{valueLabel}</span>
          </span>
        ) : (
          <span className="block text-gray-900 font-extrabold text-3xl mt-1 leading-none font-mono whitespace-nowrap">{value}</span>
        )}
        {sub && <span className="block text-gray-400 text-xs mt-1.5">{sub}</span>}
        {onClick && <span className="block text-[10px] text-purple-500 mt-1">← اضغط للتفاصيل</span>}
      </span>
    </>
  );

  const cardClassName = `bg-white rounded-xl shadow-sm border border-gray-100 border-t-2 ${borderCls} p-5 flex items-start gap-4 ${onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all" : ""}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${cardClassName} w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2`}
        style={{ fontFamily: "inherit", textAlign: "start" }}
      >
        {content}
      </button>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
