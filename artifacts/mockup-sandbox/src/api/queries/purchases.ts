import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type { Operation } from "../types";
import type {
  OperationsListSummary,
  PurchaseEnumsCatalogue,
  PurchaseLineEditResponse,
  PurchaseReturn,
  Supplier,
} from "../types/company";
import { getErrorMessage } from "../errors";
import {
  queryKeys,
  type OperationsFilter,
  type PurchaseReturnsFilter,
  type SuppliersFilter,
} from "./keys";
import { useOperation } from "./operations";

// ─── Purchases list + KPI header (T06 §1) ────────────────────────────────────
// Shared pipeline list scoped to purchases; carries `data[].purchaseRow` and
// `meta.summary.purchases`. `source` is a page-local derived filter (see spec).
export interface PurchasesListResponse {
  data: Operation[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages?: number;
    summary?: OperationsListSummary;
  };
}

export function usePurchasesList(filter: OperationsFilter = {}) {
  const params = { ...cleanFilter(filter), moduleKey: "purchases" as const };
  return useQuery({
    queryKey: queryKeys.operations(params),
    queryFn: async () => {
      const res = await api.get<PurchasesListResponse>("/company/me/operations", {
        params,
      });
      return res.data;
    },
  });
}

// ─── Grouped purchase CARDS (2026-08-09) — GET /company/me/purchases ─────────
// Supplier/branch cards → invoices → lines, matching the accountant screen.
// Shapes are deeply nested; kept loose (any) with a typed envelope.
export interface AccPurchasesFilter {
  groupBy?: "supplier" | "branch";
  brandId?: string;
  branchId?: string;
  supplierId?: string;
  status?: string;
  match?: string;
  documented?: boolean;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}
export interface AccPurchasesResponse {
  data: any[];
  meta: {
    groupBy: "supplier" | "branch";
    page: number;
    pageSize: number;
    total: number;
    totalPages?: number;
    scannedOperations?: number;
    truncated?: boolean;
    maxOperations?: number;
    kpis?: {
      totalPurchasesHalalas?: number;
      totalPurchasesSar?: number;
      pendingInvoices?: number;
      diffInvoices?: number;
      activeSuppliers?: number;
      invoices?: number;
      period?: { from: string | null; to: string | null };
    };
  };
}

export function useAccountantPurchases(filter: AccPurchasesFilter = {}) {
  const params = cleanFilter(filter);
  return useQuery({
    queryKey: ["accountant", "purchases", params] as const,
    queryFn: async () => {
      const res = await api.get<AccPurchasesResponse>("/company/me/purchases", {
        params,
      });
      return res.data;
    },
  });
}

export function useBulkDocumentPurchases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (operationIds: string[]) => {
      const res = await api.post("/company/me/purchases/bulk-document", {
        operationIds,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accountant", "purchases"] });
      qc.invalidateQueries({ queryKey: ["operations"] });
      toast.success("تم التوثيق الجماعي");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportAccountantPurchases() {
  return useMutation({
    mutationFn: async (
      filter: AccPurchasesFilter & { format?: "xlsx" | "csv" } = {},
    ) => {
      const fmt = filter.format ?? "xlsx";
      await downloadBlob("/company/me/purchases/export", `purchases.${fmt}`, {
        ...cleanFilter(filter),
        format: fmt,
      });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Purchase detail (3-way match) rides on GET /operations/{id} → purchases ──
export function usePurchaseDetail(operationId: string | null | undefined) {
  const query = useOperation(operationId);
  return {
    ...query,
    purchases: query.data?.purchases ?? null,
  };
}

// ─── Document (T06 §3) ⚠️ idempotent ─────────────────────────────────────────
export function useDocumentOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await api.post<Operation>(
        `/company/me/operations/${id}/document`,
        note ? { note } : {},
      );
      return res.data;
    },
    onSuccess: (op) => {
      qc.invalidateQueries({ queryKey: queryKeys.operation(op.id) });
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: queryKeys.operationAudit(op.id) });
      toast.success("تم توثيق أمر الشراء");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Line edit (T06 §4) — recomputes line/op totals + match both ways ────────
export function usePatchPurchaseLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      operationId,
      rowId,
      patch,
    }: {
      operationId: string;
      rowId: string;
      patch: { ordQty?: number; rcvQty?: number | null; unitPriceHalalas?: number; unitPriceSar?: number; documented?: boolean };
    }) => {
      const res = await api.patch<PurchaseLineEditResponse>(
        `/company/me/operations/${operationId}/purchase-lines/${rowId}`,
        patch,
      );
      return res.data;
    },
    onSuccess: (data) => {
      // Refetch the op detail so the recomputed purchases block + match land.
      qc.invalidateQueries({ queryKey: queryKeys.operation(data.operationId) });
      qc.invalidateQueries({ queryKey: queryKeys.operationAudit(data.operationId) });
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: ["accountant", "purchases"] });
      toast.success("تم تحديث السطر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Suppliers («الموردون المعتمدون», T06 §5) ────────────────────────────────
export function useSuppliers(filter: SuppliersFilter = {}) {
  return useQuery({
    queryKey: queryKeys.suppliers(filter),
    queryFn: async () => {
      const res = await api.get<
        { data: Supplier[]; meta?: { total: number } } | Supplier[]
      >("/company/me/suppliers", { params: cleanFilter(filter) });
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Returns («المرتجعات», T06 §6) — read-only ───────────────────────────────
export function usePurchaseReturns(filter: PurchaseReturnsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.purchaseReturns(filter),
    queryFn: async () => {
      const res = await api.get<
        { data: PurchaseReturn[]; meta?: { total: number } } | PurchaseReturn[]
      >("/company/me/purchases/returns", { params: cleanFilter(filter) });
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Enums (T06 §7) — fetch once at boot ─────────────────────────────────────
export function usePurchaseEnums() {
  return useQuery({
    queryKey: queryKeys.purchaseEnums,
    queryFn: async () => {
      const res = await api.get<PurchaseEnumsCatalogue>("/lookups/purchase-enums");
      return res.data;
    },
    staleTime: 30 * 60_000,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cleanFilter<T extends object>(f: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && v !== "" && v !== "all") {
      out[k] = v;
    }
  }
  return out as Partial<T>;
}
