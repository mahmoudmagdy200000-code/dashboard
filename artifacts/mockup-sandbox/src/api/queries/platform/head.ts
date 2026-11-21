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
import type { DayCompletenessEntry, Employee, EmployeeStatement, SalesKpis, ShiftConfig } from "../../types/company";
import {
  queryKeys,
  type PlatformErpFilter,
  type PlatformOpsFilter,
  type PlatformEmployeesFilter,
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

// Read-only source records for the accountant modules shown to the head.
// Every URL below is backed by the tenant-scoped accountant read surface, whose
// route middleware explicitly includes the head role.
export type HeadOperationalModule = "expenses" | "purchases" | "inventory" | "cash" | "waste" | "assets";

const headModuleReadPaths: Record<HeadOperationalModule, string> = {
  expenses: "/accountant/operations",
  purchases: "/purchases",
  inventory: "/accountant/inventory",
  cash: "/company/me/cash-custody",
  waste: "/accountant/waste",
  assets: "/accountant/assets",
};

export function useHeadOperationalModule(moduleKey: HeadOperationalModule) {
  return useQuery({
    queryKey: ["platform", "head", "operational-module", moduleKey],
    queryFn: async () => {
      const res = await api.get<unknown>(headModuleReadPaths[moduleKey], {
        params: moduleKey === "purchases"
          ? { page: 1, pageSize: 100 }
          : moduleKey === "expenses"
            ? { moduleKey: "expenses", page: 1, pageSize: 100 }
            : undefined,
      });
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useHeadCashCustodyLedger(custodyId?: string) {
  return useQuery({
    queryKey: ["platform", "head", "cash-custody-ledger", custodyId ?? ""],
    enabled: Boolean(custodyId),
    queryFn: async () => {
      const res = await api.get<unknown>(
        `/company/me/cash-custody/${encodeURIComponent(custodyId!)}/transactions`,
      );
      return res.data;
    },
    staleTime: 15_000,
  });
}

// Head read-only module data uses the same tenant-scoped accountant reads.
// These routes explicitly allow the head role; no write actions are exposed here.
export function useHeadSalesKpis(date?: string) {
  return useQuery({
    queryKey: ["platform", "head", "sales-kpis", date ?? "today"],
    queryFn: async () => {
      const res = await api.get<SalesKpis>("/accountant/sales/kpis", {
        params: date ? { date } : undefined,
      });
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useHeadSalesDayCompleteness(days = 7) {
  return useQuery({
    queryKey: ["platform", "head", "sales-day-completeness", days],
    queryFn: async () => {
      const res = await api.get<Page<DayCompletenessEntry> | DayCompletenessEntry[]>(
        "/accountant/sales/day-completeness",
        { params: { days } },
      );
      return Array.isArray(res.data) ? res.data : (res.data.data ?? []);
    },
    staleTime: 30_000,
  });
}

export function useHeadSalesOperations(pageSize = 100) {
  return useQuery({
    queryKey: ["platform", "head", "sales-operations", pageSize],
    queryFn: async () => {
      const res = await api.get<Page<Operation> | Operation[]>("/accountant/operations", {
        params: { moduleKey: "sales", page: 1, pageSize },
      });
      return Array.isArray(res.data) ? res.data : (res.data.data ?? []);
    },
    staleTime: 15_000,
  });
}

export function useHeadShiftConfigs(scope: "brand" | "branch" | "all" = "all") {
  return useQuery({
    queryKey: ["platform", "head", "shift-configs", scope],
    queryFn: async () => {
      const res = await api.get<Page<ShiftConfig> | ShiftConfig[]>(
        "/accountant/shifts/configs",
        { params: { scope } },
      );
      return Array.isArray(res.data) ? res.data : (res.data.data ?? []);
    },
    staleTime: 60_000,
  });
}

export function useHeadEmployees(filter: PlatformEmployeesFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformEmployees(filter),
    queryFn: async () => {
      const { search, ...params } = filter;
      const res = await api.get<Page<Employee> | Employee[]>("/accountant/employees", {
        params: { ...params, q: search?.trim() || undefined },
      });
      return Array.isArray(res.data) ? res.data : (res.data.data ?? []);
    },
  });
}

export function useHeadEmployeeStatement(id?: string, month?: string) {
  return useQuery({
    queryKey: [...queryKeys.platformEmployeeStatement(id ?? ""), month ?? ""],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<EmployeeStatement>(
        `/accountant/employees/${encodeURIComponent(id!)}/statement`,
        { params: month ? { month } : undefined },
      );
      return res.data;
    },
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
export function useHeadRemindersPlatform(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.platformHeadReminders,
    enabled: options.enabled ?? true,
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

import { fetchAllHeadOpsPages as fetchAllHeadOpsPagesBase } from "../../../components/mockups/asab/headReviewGuards";

// ─── Operations queues (HA-F10: multi-page fetching & metadata preservation) ─
export async function fetchAllHeadOpsPages(
  url: string,
  filter: PlatformOpsFilter,
  apiClient: {
    get: <T = any>(u: string, cfg?: any) => Promise<{ data: T }>;
  } = api,
): Promise<Operation[]> {
  return fetchAllHeadOpsPagesBase<Operation>(url, filter, apiClient);
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
