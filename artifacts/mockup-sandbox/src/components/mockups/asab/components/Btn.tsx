import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";

export interface BtnProps {
  children: ReactNode;
  onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  variant?: "primary" | "success" | "danger" | "ghost" | "outline" | "amber";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  className = "",
  disabled = false,
}: BtnProps) {
  const base = "inline-flex items-center gap-1.5 font-semibold cursor-pointer border transition-all rounded-lg whitespace-nowrap";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-sm",
    success: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm",
    danger: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    ghost: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
    outline: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
