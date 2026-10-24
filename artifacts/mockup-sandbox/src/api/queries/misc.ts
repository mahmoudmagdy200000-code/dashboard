import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import type { DailyRollupEntry } from "../types/company";
import { queryKeys, type AuditLogsFilter } from "./keys";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SearchResult {
  type: "ops" | "branches" | "users" | "suppliers" | "items" | string;
  id: string;
  publicId?: string;
  title: string;
  subtitle?: string;
  link?: string;
  moduleKey?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  groupedByType?: Record<string, SearchResult[]>;
}

/** Validate the established FE envelope; do not expose raw Backend groups until
 * the response and assigned-branch authorization contract are independently verified.
 */
export function normalizeSearchResponse(value: unknown): SearchResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Unsupported search response");
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.results)) throw new Error("Search response contract requires Backend verification");
  const clean = (row: any): SearchResult => {
    if (!row || typeof row.id !== "string" || typeof row.title !== "string" || typeof row.type !== "string") throw new Error("Invalid search result");
    return { id: row.id, title: row.title, type: row.type,
      publicId: typeof row.publicId === "string" ? row.publicId : undefined,
      subtitle: typeof row.subtitle === "string" ? row.subtitle : undefined,
      moduleKey: typeof row.moduleKey === "string" ? row.moduleKey : undefined };
  };
  const results = data.results.map(clean);
  if (data.groupedByType === undefined) return { results };
  if (!data.groupedByType || typeof data.groupedByType !== "object" || Array.isArray(data.groupedByType)) throw new Error("Invalid grouped search response");
  const groupedByType: Record<string, SearchResult[]> = {};
  for (const [key, rows] of Object.entries(data.groupedByType)) {
    if (!Array.isArray(rows)) throw new Error("Invalid search group");
    groupedByType[key] = rows.map(clean);
  }
  return { results, groupedByType };
}

export interface AuditLogEntry {
  id: string;
  actorId?: string;
  actorName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  ip?: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────
export function useSearch(q: string, type?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.search(q, type),
    enabled: options.enabled !== false && Boolean(q && q.length >= 2),
    retry: false, // Explicit retry UI; never repeat an unsupported response contract automatically.
    queryFn: async () => {
      const res = await api.get<SearchResponse>("/company/me/search", {
        params: { q, types: type === "ops" ? "operations" : type },
      });
      return normalizeSearchResponse(res.data);
    },
    staleTime: 5_000,
  });
}

// ─── Pipeline / Aggregation / Exceptions (shared cross-cutting) ─────────────
export interface PipelineOverviewResponse {
  stages: Array<{ key: string; labelAr: string; count: number }>;
  throughputToday?: { submittedCount: number; completedCount: number };
  avgCycleTimeHours?: number;
}

export function usePipelineOverview() {
  return useQuery({
    queryKey: ["pipeline", "overview"] as const,
    queryFn: async () => {
      const res = await api.get<PipelineOverviewResponse>("/pipeline/overview");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useModulesAggregation() {
  return useQuery({
    queryKey: ["modules", "aggregation"] as const,
    queryFn: async () => {
      const res = await api.get<unknown>("/modules/aggregation");
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ─── Daily rollup — branch/day state chips (T03 §12) ────────────────────────
export interface DailyRollupParams {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  brandId?: string;
  companyId?: string;
}

export interface DailyRollupResponse {
  data: DailyRollupEntry[];
  meta: {
    dateFrom: string;
    dateTo: string;
    branchDays: number;
    byState: Record<string, number>;
  };
}

export function useDailyRollup(params: DailyRollupParams = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  );
  return useQuery({
    queryKey: queryKeys.pipelineDailyRollup(clean),
    queryFn: async () => {
      const res = await api.get<DailyRollupResponse>("/pipeline/daily-rollup", {
        params: clean,
      });
      return res.data;
    },
    staleTime: 30_000,
  });
}

export interface ExceptionEntry {
  id: string;
  type?: string;
  moduleKey?: string;
  message?: string;
  severity?: "low" | "medium" | "high" | "critical" | string;
  occurredAt: string;
}

export function useExceptions(
  filter: Record<string, unknown> = {},
) {
  return useQuery({
    queryKey: ["exceptions", filter] as const,
    queryFn: async () => {
      const res = await api.get<
        { data: ExceptionEntry[] } | ExceptionEntry[]
      >("/exceptions", { params: filter });
      const d = res.data as
        | { data?: ExceptionEntry[] }
        | ExceptionEntry[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useExceptionsLookup() {
  return useQuery({
    queryKey: ["lookups", "exceptions"] as const,
    queryFn: async () => {
      const res = await api.get<unknown>("/lookups/exceptions");
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useAuditLogs(filter: AuditLogsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs(filter),
    queryFn: async () => {
      const res = await api.get<
        { data: AuditLogEntry[] } | AuditLogEntry[]
      >("/company/me/audit-logs", { params: filter });
      const d = res.data as { data?: AuditLogEntry[] } | AuditLogEntry[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}
