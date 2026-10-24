import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { queryKeys } from "../../api/queries/keys";
import type { Subscription } from "../../api/queries/companyAdmin";
import { useSubscriptionExpired } from "../../auth/useErrorHandler";

/**
 * Persistent banner shown when the backend has reported SUBSCRIPTION_EXPIRED
 * (via the global error handler) OR when the cached `subscription` query data
 * reports status === "expired".
 *
 * Renders nothing while the subscription is healthy.
 */
export function SubscriptionExpiredBanner() {
  const qc = useQueryClient();
  const flagExpired = useSubscriptionExpired();

  const sub = qc.getQueryData<Subscription>(queryKeys.subscription);
  const cacheExpired = sub?.status === "expired";

  if (!flagExpired && !cacheExpired) return null;

  return (
    <div
      role="alert"
      dir="rtl"
      style={{
        background: "#fef2f2",
        borderBottom: "1px solid #fecaca",
        color: "#991b1b",
        padding: "10px 16px",
        fontSize: 13,
        fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 8,
        justifyContent: "center",
      }}
    >
      <AlertTriangle size={16} />
      <span style={{ fontWeight: 700 }}>انتهى اشتراك الشركة.</span>
      <span>يرجى التواصل مع إدارة المنصة لتجديد الاشتراك.</span>
      <a
        href="#/preview/asab/CompanyDashboard"
        style={{
          marginInlineStart: 12,
          background: "#991b1b",
          color: "white",
          padding: "4px 12px",
          borderRadius: 6,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        عرض تفاصيل الاشتراك
      </a>
    </div>
  );
}
