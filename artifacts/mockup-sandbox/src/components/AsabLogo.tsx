import type { CSSProperties, ReactElement } from "react";
import { LOGO } from "../auth/authTheme";

export const LOGO_EMBLEM_SVG = `${import.meta.env.BASE_URL}assab-emblem.svg`;

export interface AsabLogoProps {
  /**
   * Presentation variant:
   * - "brand-card": Prominent badge for Entry / Login Hero split-panel.
   * - "header": Standard top navigation bar logo.
   * - "sidebar": Sidebar brand identity (supports collapsed / expanded).
   * - "compact": Small inline mark (e.g. modals, footers).
   * - "icon": Vector emblem only.
   */
  variant?: "brand-card" | "header" | "sidebar" | "compact" | "icon";
  /** Optional custom height (in px or css string) */
  height?: number | string;
  /** Optional custom className */
  className?: string;
  /** Optional custom style */
  style?: CSSProperties;
  /** Show text mark when in sidebar variant (default true) */
  showWordmark?: boolean;
  /** Alt text for accessibility */
  alt?: string;
}

/**
 * Unified, responsive presentation component for the official ASSAB brand identity.
 * Prevents blurriness, distortion, uneven padding, and oversized empty containers.
 */
export function AsabLogo({
  variant = "header",
  height,
  className = "",
  style,
  showWordmark = true,
  alt = "ASAB — عصب",
}: AsabLogoProps): ReactElement {
  if (variant === "icon") {
    const iconHeight = height ?? 22;
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={style}
        role="img"
        aria-label={alt}
      >
        <img
          src={LOGO_EMBLEM_SVG}
          alt=""
          aria-hidden="true"
          style={{ height: iconHeight, width: "auto" }}
          className="object-contain block shrink-0"
        />
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={`flex items-center gap-2.5 min-w-0 ${className}`} style={style}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white/10 transition-transform duration-200"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #00D9FF 100%)" }}
          role="img"
          aria-label={alt}
        >
          <img
            src={LOGO_EMBLEM_SVG}
            alt=""
            aria-hidden="true"
            className="w-5 h-auto object-contain brightness-0 invert"
          />
        </div>
        {showWordmark && (
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-base leading-tight tracking-tight">عصب</div>
            <div className="text-white/45 text-[10px] tracking-wide font-medium">ASAB System</div>
          </div>
        )}
      </div>
    );
  }

  if (variant === "brand-card") {
    const imgHeight = height ?? 46;
    return (
      <div
        className={`asab-logo-in inline-flex items-center justify-center self-start bg-white rounded-2xl px-5 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.18)] border border-white/80 transition-all duration-200 hover:shadow-[0_14px_36px_rgba(0,0,0,0.22)] ${className}`}
        style={style}
      >
        <img
          src={LOGO}
          alt={alt}
          style={{ height: imgHeight, width: "auto", aspectRatio: "1494 / 1120" }}
          className="object-contain block max-w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
        />
      </div>
    );
  }

  // "header" or "compact"
  const defaultHeight = variant === "compact" ? 24 : 34;
  const appliedHeight = height ?? defaultHeight;

  return (
    <div className={`inline-flex items-center shrink-0 ${className}`} style={style}>
      <img
        src={LOGO}
        alt={alt}
        style={{ height: appliedHeight, width: "auto", aspectRatio: "1494 / 1120" }}
        className="object-contain block shrink-0 transition-opacity duration-150 hover:opacity-95"
      />
    </div>
  );
}
