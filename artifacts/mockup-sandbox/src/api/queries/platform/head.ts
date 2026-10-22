import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob, type Page } from "../../client";
import { getErrorMessage } from "../../errors";
import type { Operation } from "../../types";
import type {
  PlatformAccountantPerformanceRow,
  PlatformErpBatch,
  PlatformErpPreflight,
  PlatformHeadDashboard,
  PlatformHeadReminder,
} from "../../types/platform";
import {
  queryKeys,
  type PlatformErpFilter,
  type PlatformOpsFilter,
} from "../keys";

// ─── Dashboard ──────────────────────────────────────────────────────────────
export function useHeadDashboardPlatform() {
  return useQuery({
    queryKey: queryKeys.platformHeadDashboard,
    queryFn: async () => {
      const res = await api.get<PlatformHeadDashboard>("/head/dashboard");
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useAccountantsPerformancePlatform() {
  return useQuery({
    queryKey: queryKeys.platformAccountantsPerformance,
    queryFn: async () => {
      const res = await api.get<
        | Page<PlatformAccountantPerformanceRow>
        | PlatformAccountantPerformanceRow[]
      >("/head/accountants/performance");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Reminders ──────────────────────────────────────────────────────────────
export function useHeadRemindersPlatform() {
  return useQuery({
    queryKey: queryKeys.platformHeadReminders,
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformHeadReminder> | PlatformHeadReminder[]
      >("/head/reminders");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function usePatchHeadReminderPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<PlatformHeadReminder> & {
        done?: boolean;
      }) => {
      const res = await api.patch<PlatformHeadReminder>(
        `/head/reminders/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "head", "reminders"] });
      toast.success("تم تحديث التذكير");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useMarkAllHeadRemindersDonePlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/head/reminders/mark-all-done");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "head", "reminders"] });
      toast.success("تم تعليم كل التذكيرات كمنجزة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Operations queues (HA-F10: multi-page fetching & metadata preservation) ─
export async function fetchAllHeadOpsPages(
  url: string,
  filter: PlatformOpsFilter,
  apiClient: {
    get: <T = any>(u: string, cfg?: any) => Promise<{ data: T }>;
  } = api,
): Promise<Operation[]> {
  const res = await apiClient.get<Page<Operation> | Operation[]>(url, {
    params: filter,
  });
  const d = res.data;
  if (Array.isArray(d)) return d;
  const firstData = d.data ?? [];
  const meta = d.meta;
  // If caller specifically requested an explicit page, return that page with meta
  if (filter.page !== undefined || !meta || meta.totalPages <= 1) {
    return Object.assign(firstData, { meta });
  }
  // Otherwise, fetch all remaining pages so Head queues are never silently truncated
  const remaining = await Promise.all(
    Array.from({ length: meta.totalPages - 1 }, (_, i) =>
      apiClient
        .get<Page<Operation> | Operation[]>(url, {
          params: { ...filter, page: i + 2 },
        })
        .then((r) => (Array.isArray(r.data) ? r.data : (r.data.data ?? []))),
    ),
  );
  const all = [firstData, ...remaining].flat();
  return Object.assign(all, {
    meta: { ...meta, total: meta.total ?? all.length },
  });
}

export function usePendingOperations(
  filter: PlatformOpsFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformPendingOperations(filter),
    enabled: options.enabled ?? true,
    queryFn: () => fetchAllHeadOpsPages("/head/operations/pending", filter),
  });
}

export function useFinalApprovedOperations(
  filter: PlatformOpsFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformFinalApprovedOperations(filter),
    enabled: options.enabled ?? true,
    queryFn: () =>
      fetchAllHeadOpsPages("/head/operations/final-approved", filter),
  });
}

export function useRejectedOperations(
  filter: PlatformOpsFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformRejectedOperations(filter),
    enabled: options.enabled ?? true,
    queryFn: () => fetchAllHeadOpsPages("/head/operations/rejected", filter),
  });
}

// ─── ERP ────────────────────────────────────────────────────────────────────
export function useErpPreflightPlatform() {
  return useQuery({
    queryKey: queryKeys.platformErpPreflight,
    queryFn: async () => {
      const res = await api.get<PlatformErpPreflight>("/head/erp/preflight");
      return res.data;
    },
  });
}

export function useErpEligibleOperationsPlatform(
  filter: PlatformErpFilter = {},
) {
  return useQuery({
    queryKey: queryKeys.platformErpEligibleOperations(filter),
    queryFn: async () => {
      const res = await api.get<Page<Operation> | Operation[]>(
        "/head/erp/eligible-operations",
        { params: filter },
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useErpBatchesPlatform(filter: PlatformErpFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformErpBatches(filter),
    queryFn: async () => {
      const res = await api.get<Page<PlatformErpBatch> | PlatformErpBatch[]>(
        "/head/erp/batches",
        { params: filter },
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Reports ────────────────────────────────────────────────────────────────
// T15.18 — HEAD-7 financial-report cards, delivered under meta.financialReports.
export interface HeadFinancialReportCard {
  key: string;
  labelAr: string;
  reportKey: string;
  method: string;
  endpoint: string;
  formats: string[];
  note?: string;
}

export interface HeadReportsInternalResponse {
  data: unknown[];
  meta?: { financialReports?: HeadFinancialReportCard[] };
}

export function useReportsInternalPlatform() {
  return useQuery({
    queryKey: queryKeys.platformReportsInternal,
    queryFn: async () => {
      const res = await api.get<HeadReportsInternalResponse>(
        "/head/reports/internal",
      );
      return res.data;
    },
  });
}

export function useReportsOwnerPlatform() {
  return useQuery({
    queryKey: queryKeys.platformReportsOwner,
    queryFn: async () => {
      const res = await api.get<unknown>("/head/reports/owner");
      return res.data;
    },
  });
}

// B-H5: download an internal report from its API-provided downloadUrl (blob, Bearer-authed).
export function useDownloadHeadReport() {
  return useMutation({
    mutationFn: async ({
      url,
      filename,
    }: {
      url: string;
      filename: string;
    }) => {
      // downloadUrl looks like "/api/v1/operations/export?moduleKey=sales".
      // `api` is already based at ${BASE}/api/v1, so strip origin + the /api/v1 prefix.
      let path = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/api\/v1/, "");
      const [p, qs] = path.split("?");
      const params = qs
        ? Object.fromEntries(new URLSearchParams(qs))
        : undefined;
      await downloadBlob(p, filename, params);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
