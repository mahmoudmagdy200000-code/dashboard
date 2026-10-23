import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../client";
import { getErrorMessage } from "../errors";
import type { AppNotification, Page } from "../types";
import { queryKeys } from "./keys";

export function useNotifications(filter?: { unread?: boolean }, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.notifications(filter),
    enabled: options.enabled !== false,
    queryFn: async () => {
      const res = await api.get<Page<AppNotification>>(
        "/company/me/notifications",
        { params: filter },
      );
      return res.data;
    },
    staleTime: 10_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/company/me/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/company/me/notifications/mark-all-read");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/notifications/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ─── Notification preferences ───────────────────────────────────────────────
export interface NotificationChannelPref {
  enabled: boolean;
  address?: string;
}

export interface NotificationEventPref {
  inApp?: boolean;
  email?: boolean;
  push?: boolean;
  whatsapp?: boolean;
}

export interface NotificationPreferences {
  channels: {
    inApp: NotificationChannelPref;
    email: NotificationChannelPref;
    push: NotificationChannelPref;
    whatsapp: NotificationChannelPref;
  };
  events: Record<string, NotificationEventPref>;
  quietHours?: { enabled: boolean; startsAt: string; endsAt: string };
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notifications", "preferences"] as const,
    queryFn: async () => {
      const res = await api.get<NotificationPreferences>(
        "/admin/notifications/preferences",
      );
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      const res = await api.patch<NotificationPreferences>(
        "/admin/notifications/preferences",
        patch,
      );
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["notifications", "preferences"], data);
      toast.success("تم حفظ تفضيلات الإشعارات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

