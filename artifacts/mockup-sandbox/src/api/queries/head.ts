import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type { Operation, Page } from "../types";
import { getErrorMessage } from "../errors";
import { queryKeys, type ErpPreviewFilter } from "./keys";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface HeadDashboardResponse {
  kpis?: Record<string, number | string>;
  pendingCount?: number;
  finalApprovedCount?: number;
  rejectedCount?: number;
  totals?: Record<string, number>;
  brandSummary?: Array<{
    id: string;
    name: string;
    color?: string;
    abbr?: string;
    monthlySalesHalalas?: number;
    branchesCount?: number;
  }>;
  brandPerformance?: Array<{
    brandId?: string;
    id?: string;
    name: string;
    color?: string;
    abbr?: string;
    salesHalalas?: number;
    expensesHalalas?: number;
    netHalalas?: number;
    pctOfTarget?: number;
    sales?: number;
    target?: number;
  }>;
}

export interface AccountantPerformanceRow {
  userId: string;
  name: string;
  branchName?: string;
  brandName?: string;
  approvedCount: number;
  rejectedCount: number;
  pendingCount?: number;
  avgReviewMinutes?: number;
  approvalRate?: number;
}

export interface HeadReminder {
  id: string;
  type: string;
  title?: string;
  titleAr?: string;
  titleEn?: string;
  body?: string;
  bodyAr?: string;
  bodyEn?: string;
  priority?: "low" | "normal" | "high" | string;
  refType?: string;
  refId?: string;
  isDone?: boolean;
  done?: boolean;
  timeAr?: string;
  dueAt?: string;
  createdAt: string;
}

export interface ERPPreflight {
  ready: boolean;
  eligibleCount: number;
  issues?: Array<{ code: string; message: string; refId?: string }>;
  estimatedAmountHalalas?: number;
}

export interface ERPEligibleOperation {
  id: string;
  publicId: string;
  moduleKey: string;
  branchName?: string;
  amountHalalas: number;
  operationDate: string;
}

// T10 §B5 — company ERP preview response (paginated + per-restaurant rollup).
export interface ErpPreviewResponse {
  data: Operation[];
  meta: Page<Operation>["meta"] & {
    count: number;
    totalAmountHalalas: number;
    branches: number;
    perRestaurant: Array<{
      restaurantId: string;
      name: string;
      count: number;
      amountHalalas: number;
    }>;
  };
}

// T10 §B batch shape. Status enum: ready «جاهز للتصدير» · exported «تم التصدير» ·
// failed «فشل التصدير». Legacy rows may read `success` → treat as exported.
export interface ERPBatch {
  id: string;
  batchId?: string;
  moduleKey?: string;
  status: "ready" | "exported" | "failed" | "success" | string;
  statusLabelAr?: string;
  operationCount?: number;
  operationsCount?: number;
  totalAmount?: number;
  totalHalalas?: number;
  branchCount?: number;
  readyAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  fileUrl?: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export function useHeadDashboard() {
  return useQuery({
    queryKey: queryKeys.headDashboard,
    queryFn: async () => {
      const res = await api.get<HeadDashboardResponse>(
        "/company/me/head/dashboard",
      );
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Accountants performance ─────────────────────────────────────────────────
export function useAccountantsPerformance() {
  return useQuery({
    queryKey: queryKeys.accountantsPerformance,
    queryFn: async () => {
      const res = await api.get<
        { data: AccountantPerformanceRow[] } | AccountantPerformanceRow[]
      >("/company/me/head/accountants/performance");
      const d = res.data as
        | { data?: AccountantPerformanceRow[] }
        | AccountantPerformanceRow[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Head reminders ──────────────────────────────────────────────────────────
export function useHeadReminders() {
  return useQuery({
    queryKey: queryKeys.headReminders,
    queryFn: async () => {
      const res = await api.get<
        { data: HeadReminder[] } | HeadReminder[]
      >("/company/me/head/reminders");
      const d = res.data as { data?: HeadReminder[] } | HeadReminder[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function usePatchHeadReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<HeadReminder>) => {
      const res = await api.patch<HeadReminder>(
        `/company/me/head/reminders/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.headReminders });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useMarkAllHeadRemindersDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/company/me/head/reminders/mark-all-done");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.headReminders });
      toast.success("تم وضع علامة على كل التذكيرات كمكتملة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── ERP ─────────────────────────────────────────────────────────────────────
export function usePostToERP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ batchId?: string }>(
        `/company/me/operations/${id}/post-to-erp`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: queryKeys.erpBatches });
      toast.success("تم الإرسال إلى ERP");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useERPPreflight() {
  return useQuery({
    queryKey: queryKeys.erpPreflight,
    queryFn: async () => {
      const res = await api.get<ERPPreflight>("/head/erp/preflight");
      return res.data;
    },
  });
}

export function useERPEligibleOperations() {
  return useQuery({
    queryKey: queryKeys.erpEligibleOperations,
    queryFn: async () => {
      const res = await api.get<
        { data: ERPEligibleOperation[] } | ERPEligibleOperation[]
      >("/head/erp/eligible-operations");
      const d = res.data as
        | { data?: ERPEligibleOperation[] }
        | ERPEligibleOperation[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useERPBatches() {
  return useQuery({
    queryKey: queryKeys.erpBatches,
    queryFn: async () => {
      const res = await api.get<{ data: ERPBatch[] } | ERPBatch[]>(
        "/head/erp/batches",
      );
      const d = res.data as { data?: ERPBatch[] } | ERPBatch[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateERPBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      operationIds?: string[];
      filters?: Record<string, unknown>;
    }) => {
      const res = await api.post<ERPBatch>("/erp/batches", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.erpBatches });
      qc.invalidateQueries({ queryKey: queryKeys.erpEligibleOperations });
      toast.success("تم إنشاء دفعة ERP");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useERPBatchStatus(batchId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.erpBatchStatus(batchId ?? ""),
    enabled: Boolean(batchId),
    queryFn: async () => {
      const res = await api.get<ERPBatch>(
        `/erp/batches/${batchId}/status`,
      );
      return res.data;
    },
  });
}

export function useDownloadERPBatch() {
  return useMutation({
    mutationFn: async ({
      batchId,
      format = "xlsx",
      filename,
    }: {
      batchId: string;
      format?: "json" | "csv" | "xlsx";
      filename?: string;
    }) => {
      await downloadBlob(
        `/erp/batches/${batchId}/download.${format}`,
        filename ?? `erp-batch-${batchId}.${format}`,
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Retry a failed batch (T10 §B3) — 409 BATCH_NOT_FAILED otherwise ─────────
export function useRetryERPBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      const res = await api.post<ERPBatch>(`/erp/batches/${batchId}/retry`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.erpBatches });
      qc.invalidateQueries({ queryKey: ["platform", "erp", "batches"] });
      toast.success("تمت إعادة محاولة الترحيل");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Company head ERP preview (T10 §B5) — paginated + meta.perRestaurant ─────
export function useERPPreview(filter: ErpPreviewFilter = {}) {
  const clean = Object.fromEntries(
    Object.entries(filter).filter(([, v]) => v !== undefined && v !== "" && v !== "all"),
  );
  return useQuery({
    queryKey: queryKeys.erpPreview(filter),
    queryFn: async () => {
      const res = await api.get<ErpPreviewResponse>("/company/me/erp/preview", {
        params: clean,
      });
      return res.data;
    },
  });
}

// Recent activity feed for Head dashboard.
export interface HeadMovementEntry {
  id: string;
  actionAr: string;
  timeAr: string;
  module: string;
  moduleLabelAr: string;
}

export function useHeadRecentMovements(limit = 10) {
  return useQuery({
    queryKey: ["head", "movements", "recent", limit] as const,
    queryFn: async () => {
      const res = await api.get<{ data: HeadMovementEntry[] } | HeadMovementEntry[]>(
        "/head/movements/recent",
        { params: { limit } },
      );
      const d = res.data as { data?: HeadMovementEntry[] } | HeadMovementEntry[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
    staleTime: 30_000,
  });
}

export function useCompanyHeadRecentMovements(limit = 10) {
  return useQuery({
    queryKey: ["company", "head", "movements", "recent", limit] as const,
    queryFn: async () => {
      const res = await api.get<{ data: HeadMovementEntry[] } | HeadMovementEntry[]>(
        "/company/me/head/movements/recent",
        { params: { limit } },
      );
      const d = res.data as { data?: HeadMovementEntry[] } | HeadMovementEntry[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
    staleTime: 30_000,
  });
}
