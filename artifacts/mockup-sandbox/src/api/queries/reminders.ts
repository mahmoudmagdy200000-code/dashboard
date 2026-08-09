import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type { Reminder } from "../types/company";
import { getErrorMessage } from "../errors";
import { queryKeys } from "./keys";

export function useReminders() {
  return useQuery({
    queryKey: queryKeys.reminders,
    queryFn: async () => {
      const res = await api.get<Reminder[]>("/company/me/accountant/reminders");
      return res.data;
    },
  });
}

// ─── Branch missing-data reminders (2026-08-09) — the «بيانات الفروع المفقودة»
// screen. Distinct from /accountant/reminders (the accountant's personal list),
// which is why the screen showed 0/0/0/0. Real engine: rows are generated per
// (branch × required module) with no data, sent + responded tracked server-side.
export interface MissingReminderRow {
  id: string;
  publicId?: string;
  branchId?: string;
  branchName?: string;
  moduleKey?: string;
  moduleLabelAr?: string;
  message?: string;
  daysMissing?: number;
  urgency?: string;
  reminderStatus?: "not_sent" | "sent" | "responded" | string;
  requiredBy?: string;
  sentAt?: string | null;
  respondedAt?: string | null;
}
export interface MissingRemindersResponse {
  data: MissingReminderRow[];
  meta: {
    summary?: { notSent?: number; sent?: number; responded?: number; totalMissing?: number; total?: number };
    modules?: Array<{ key: string; labelAr: string }>;
    capped?: boolean;
  };
}
export function useMissingDataReminders(
  filter: { moduleKey?: string; brandId?: string; branchId?: string; status?: string; q?: string } = {},
) {
  const clean = Object.fromEntries(
    Object.entries(filter).filter(([, v]) => v !== undefined && v !== "" && v !== "all"),
  );
  return useQuery({
    queryKey: ["reminders", "missing", clean] as const,
    queryFn: async () => {
      const res = await api.get<MissingRemindersResponse>("/company/me/reminders", {
        params: clean,
      });
      return res.data;
    },
    staleTime: 15_000,
  });
}

/** «تحديث» — rebuild today's missing-data list. */
export function useScanReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post("/company/me/reminders/scan");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders", "missing"] });
      toast.success("تم تحديث قائمة التذكيرات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** «إرسال تذكير للكل» — optional narrowing by module/brand/branch. */
export function useSendAllReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: { moduleKey?: string; brandId?: string; branchId?: string; onlyUnsent?: boolean } = {},
    ) => {
      const res = await api.post<{ sent: number; skipped: number }>(
        "/company/me/reminders/send-all",
        body,
      );
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reminders", "missing"] });
      toast.success(`تم إرسال ${data?.sent ?? 0} تذكير${data?.skipped ? ` · تخطّي ${data.skipped}` : ""}`);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** Send one branch missing-data reminder. */
export function useSendMissingReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/company/me/reminders/${id}/send`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders", "missing"] });
      toast.success("تم إرسال التذكير");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function usePatchReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Reminder, "done" | "title" | "description" | "dueAt" | "priority">>;
    }) => {
      const res = await api.patch<Reminder>(
        `/company/me/accountant/reminders/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export interface CreateReminderPayload {
  title: string;
  description: string;
  dueAt: string;
  priority: Reminder["priority"];
  scope?: Reminder["scope"];
  branchId?: string | null;
  brandId?: string | null;
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateReminderPayload) => {
      const res = await api.post<Reminder>(
        "/company/me/accountant/reminders",
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders });
      toast.success("تم إضافة التذكير");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/me/accountant/reminders/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportAccReminders() {
  return useMutation({
    mutationFn: async (format: "xlsx" | "csv" = "xlsx") => {
      await downloadBlob(
        "/company/me/accountant/reminders/export",
        `accountant-reminders.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export type ReminderChannel = "in-app" | "email" | "whatsapp" | "sms";

export interface BroadcastReminderPayload {
  messageAr: string;
  messageEn?: string;
  audience:
    | "all-branch-managers"
    | "all-accountants"
    | "all-suppliers"
    | "specific-branches";
  branchIds?: string[];
  channels?: ReminderChannel[];
}

export interface BroadcastReminderResponse {
  broadcastId: string;
  sentCount: number;
  failedCount: number;
  perChannel?: Record<string, { sent: number; failed: number }>;
}

export function useBroadcastReminder() {
  return useMutation({
    mutationFn: async (payload: BroadcastReminderPayload) => {
      const res = await api.post<BroadcastReminderResponse>(
        "/reminders/broadcast",
        payload,
      );
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`تم إرسال البث لـ ${data.sentCount} مستلم`);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// Section 1.9 — single send with channel selector (mirrors useSendReminder
// but typed for the new channel param; pass `channel: "in-app" | "email" | ...`).
export function useSendReminderWithChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, channel }: { id: string; channel?: ReminderChannel }) => {
      const res = await api.post<{
        id: string;
        reminderStatus: "sent";
        sent: boolean;
        channel: ReminderChannel;
        deliveredAt: string;
      }>(`/reminders/${id}/send`, channel ? { channel } : {});
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["platform", "reminders"] });
      toast.success("تم إرسال التذكير");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
