import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import { getErrorMessage } from "../errors";
import { queryKeys } from "./keys";

export interface ReportCatalogItem {
  key: string;
  title: string;
  titleEn: string;
  description: string;
  category: "financial" | "operational" | "owner";
  availableFormats: ("pdf" | "xlsx" | "csv")[];
}

type ReportCatalogEntry = ReportCatalogItem | {
  key: string;
  labelAr: string;
  labelEn: string;
  category: "core" | "specialized";
};

export function useReports() {
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: async () => {
      const { data } = await api.get<ReportCatalogEntry[] | { data: ReportCatalogEntry[] }>(
        "/company/me/reports",
      );
      const reports = Array.isArray(data) ? data : data.data;
      return reports.map((report): ReportCatalogItem => {
        if ("title" in report) return report;
        return {
          key: report.key,
          title: report.labelAr,
          titleEn: report.labelEn,
          description: "",
          category: "financial",
          availableFormats: ["pdf", "xlsx"],
        };
      });
    },
    staleTime: 60_000,
  });
}

export function useAccountantReportBranches() {
  return useQuery({
    queryKey: [...queryKeys.reports, "accountant-branches"],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ data: { id: string | number }[] }>(
        "/company/me/lookups/branches",
        { signal },
      );
      return data.data.map(({ id }) => String(id));
    },
  });
}

interface ReportScope {
  branchIds: string[];
  from: string;
  to: string;
}

export function usePreviewReport() {
  return useMutation({
    mutationFn: async ({ key, scope }: { key: string; scope: ReportScope }) => {
      const { data } = await api.get<Blob>(
        `/company/me/reports/${encodeURIComponent(key)}/download`,
        { params: { ...scope, format: "pdf" }, responseType: "blob" },
      );
      if (data.type !== "application/pdf" || data.size === 0) {
        throw new Error("Invalid report PDF");
      }
      return data;
    },
  });
}

// ─── Individual report generators (shared §5 in BACKEND_API_SPEC) ───────────
export type ReportKey =
  | "profit-loss"
  | "sales-summary"
  | "expense-summary"
  | "inventory-valuation"
  | "payroll"
  | "waste-analysis"
  | "supplier-performance"
  | "menu-engineering"
  | "breakeven"
  | "cash-flow";

// T15.1/T15.7 — typed report request. All fields optional; role-gated to
// accountant/head/company-admin server-side (branch/procurement/supplier → 403).
export interface TypedReportBody {
  from?: string;
  to?: string;
  branchIds?: string[];
}

export interface TypedReportResult {
  reportId: string;
  generatedAt: string;
  data: Record<string, unknown>;
  downloadUrl: string | null;
}

function makeReportGenerator(key: ReportKey) {
  return function useGenerate() {
    return useMutation({
      mutationFn: async (body: TypedReportBody = {}) => {
        const res = await api.post<TypedReportResult>(`/reports/${key}`, body);
        return res.data;
      },
      onError: (e) => toast.error(getErrorMessage(e, "ar")),
    });
  };
}

export const useGenerateProfitLossReport = makeReportGenerator("profit-loss");
export const useGenerateSalesSummaryReport = makeReportGenerator("sales-summary");
export const useGenerateExpenseSummaryReport = makeReportGenerator("expense-summary");
export const useGenerateInventoryValuationReport = makeReportGenerator("inventory-valuation");
export const useGeneratePayrollReport = makeReportGenerator("payroll");
export const useGenerateWasteAnalysisReport = makeReportGenerator("waste-analysis");
export const useGenerateSupplierPerformanceReport = makeReportGenerator("supplier-performance");
export const useGenerateMenuEngineeringReport = makeReportGenerator("menu-engineering");
export const useGenerateBreakevenReport = makeReportGenerator("breakeven");
export const useGenerateCashFlowReport = makeReportGenerator("cash-flow");

export function useDownloadReport() {
  return useMutation({
    mutationFn: async ({
      key,
      format = "pdf",
      filename,
      scope,
    }: {
      key: string;
      format?: "pdf" | "xlsx" | "csv";
      filename?: string;
      scope?: ReportScope;
    }) => {
      await downloadBlob(
        `/company/me/reports/${encodeURIComponent(key)}/download`,
        filename ?? `${key}.${format}`,
        { ...scope, format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// T15.5 — mark a distributed report as viewed (read receipt). Any company role;
// foreign-tenant id → 404. Response { id, viewed:true, viewedAt }.
export function useMarkReportDistributionViewed() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ id: string; viewed: boolean; viewedAt?: string }>(
        `/company/me/reports/distributions/${id}/viewed`,
      );
      return res.data;
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
