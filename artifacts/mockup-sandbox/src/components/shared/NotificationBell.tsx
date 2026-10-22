import { useState, useRef, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "../../api/queries/notifications";
import type { AppNotification } from "../../api/types";

interface Props {
  /** Optional translate function; falls back to Arabic text only. */
  t?: (ar: string, en: string) => string;
  /** Optional theme — "light" for dashboards on white, "dark" for sidebar. */
  theme?: "light" | "dark";
}

function timeAgo(iso: string, t: (ar: string, en: string) => string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMin = Math.max(1, Math.floor((now - date.getTime()) / 60000));
  if (diffMin < 60) return `${t("منذ", "")} ${diffMin} ${t("دقيقة", "min ago")}`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${t("منذ", "")} ${diffH} ${t("ساعة", "h ago")}`;
  const diffD = Math.floor(diffH / 24);
  return `${t("منذ", "")} ${diffD} ${t("يوم", "d ago")}`;
}

export function NotificationBell({ t = (ar) => ar, theme = "light" }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const deleteOne = useDeleteNotification();

  const items: AppNotification[] = data?.data ?? [];
  const unreadCount = items.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleItemClick = (notif: AppNotification) => {
    if (!notif.readAt) markRead.mutate(notif.id);
    if (notif.link) {
      // Hash-based navigation (consistent with App.tsx routing)
      if (notif.link.startsWith("/")) {
        window.location.hash = `#${notif.link}`;
      }
    }
    setOpen(false);
  };

  const iconColor = theme === "dark" ? "#cbd5e1" : "#475569";
  const buttonBg = theme === "dark" ? "rgba(255,255,255,0.05)" : "transparent";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        title={t("الإشعارات", "Notifications")}
        aria-label={t("الإشعارات", "Notifications")}
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          position: "relative",
          background: buttonBg,
          border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "none",
          borderRadius: 10,
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: iconColor,
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 18,
              height: 18,
              padding: "0 4px",
              borderRadius: 9,
              background: "#ef4444",
              color: "white",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          dir="rtl"
          role="region"
          aria-label={t("قائمة الإشعارات", "Notifications List")}
          style={{
            position: "absolute",
            top: 46,
            insetInlineEnd: 0,
            width: "min(380px, calc(100vw - 32px))",
            maxHeight: 480,
            background: "white",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            boxShadow: "0 12px 36px rgba(0,0,0,0.15)",
            zIndex: 50,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
              {t("الإشعارات", "Notifications")}
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#ef4444",
                    marginInlineStart: 8,
                    fontWeight: 600,
                  }}
                >
                  ({unreadCount} {t("جديدة", "new")})
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#7C3AED",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                {t("وضع علامة على الكل كمقروء", "Mark all read")}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {isLoading && (
              <div style={{ padding: 24, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                {t("جاري التحميل...", "Loading...")}
              </div>
            )}
            {!isLoading && items.length === 0 && (
              <div style={{ padding: 32, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                {t("لا توجد إشعارات", "No notifications")}
              </div>
            )}
            {items.map((n) => {
              const unread = !n.readAt;
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleItemClick(n)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleItemClick(n);
                    }
                  }}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                    background: unread ? "rgba(124,58,237,0.04)" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: unread ? "#7C3AED" : "transparent",
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: unread ? 700 : 500,
                        color: "#1e293b",
                        marginBottom: 2,
                      }}
                    >
                      {n.title}
                    </div>
                    {n.body && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {n.body}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      {timeAgo(n.createdAt, t)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOne.mutate(n.id);
                    }}
                    title={t("حذف", "Delete")}
                    aria-label={t("حذف الإشعار", "Delete notification")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#cbd5e1",
                      cursor: "pointer",
                      padding: 4,
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    <Check size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
