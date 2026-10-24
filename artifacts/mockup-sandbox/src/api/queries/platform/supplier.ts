import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob, type Page } from "../../client";
import { getErrorMessage } from "../../errors";
import type {
  SupplierItem,
  SupplierOrder,
  SupplierOverview,
  SupplierReports,
} from "../../types/platform";
import { queryKeys, type SupplierOrdersFilter } from "../keys";

// ─── Overview ───────────────────────────────────────────────────────────────
export function useSupplierOverview() {
  return useQuery({
    queryKey: queryKeys.supplierOverview,
    queryFn: async () => {
      const res = await api.get<SupplierOverview>("/asab/supplier/overview");
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Orders ─────────────────────────────────────────────────────────────────
export function useSupplierOrders(filter: SupplierOrdersFilter = {}) {
  return useQuery({
    queryKey: queryKeys.supplierOrders(filter),
    queryFn: async () => {
      const res = await api.get<Page<SupplierOrder> | SupplierOrder[]>(
        "/asab/supplier/orders",
        { params: filter },
      );
      const d = res.data;
      // Preserve the server's pagination. Legacy array responses are one page only.
      return Array.isArray(d)
        ? { data: d, meta: { page: 1, pageSize: d.length, total: d.length, totalPages: 1 } }
        : d;
    },
  });
}

export function useAcceptSupplierOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.post<SupplierOrder>(
        `/asab/supplier/orders/${id}/accept`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "supplier", "orders"] });
      qc.invalidateQueries({ queryKey: ["platform", "supplier", "overview"] });
      toast.success("تم قبول الطلب");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRejectSupplierOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      note,
    }: {
      id: string;
      reason: string; // required, ≤500 chars (T13 §4)
      note?: string;
    }) => {
      const res = await api.post<SupplierOrder>(
        `/asab/supplier/orders/${id}/reject`,
        { reason, note },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "supplier", "orders"] });
      qc.invalidateQueries({ queryKey: ["platform", "supplier", "overview"] });
      toast.success("تم رفض الطلب");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useMarkSupplierOrderDelivered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.post<SupplierOrder>(
        `/asab/supplier/orders/${id}/mark-delivered`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "supplier", "orders"] });
      qc.invalidateQueries({ queryKey: ["platform", "supplier", "overview"] });
      toast.success("تم تسجيل إقرار المورد بالتسليم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Reports ────────────────────────────────────────────────────────────────
export function useSupplierReports() {
  return useQuery({
    queryKey: queryKeys.supplierReports,
    queryFn: async () => {
      const res = await api.get<SupplierReports>("/asab/supplier/reports");
      return res.data;
    },
  });
}

// ─── Items ──────────────────────────────────────────────────────────────────
export function useSupplierItems() {
  return useQuery({
    queryKey: queryKeys.supplierItems,
    queryFn: async () => {
      const res = await api.get<Page<SupplierItem> | SupplierItem[]>(
        "/asab/supplier/items",
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// Write body: prefer `priceSar` (riyals — matches the «السعر (ر.س)» field);
// `price`/`priceHalalas` (halalas) stay accepted for older callers.
type SupplierItemWrite = Partial<SupplierItem> & {
  priceSar?: number;
  supplierId?: string;
};

export function useCreateSupplierItem() {
  const qc = useQueryClient();
  return useMutation({
    // T13 §8 — name required; priceSar (riyals) OR priceHalalas (halalas) for price.
    mutationFn: async (body: SupplierItemWrite & { name: string }) => {
      const res = await api.post<SupplierItem>("/asab/supplier/items", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "supplier", "items"] });
      toast.success("تم إضافة الصنف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateSupplierItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & SupplierItemWrite) => {
      const res = await api.patch<SupplierItem>(
        `/asab/supplier/items/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "supplier", "items"] });
      toast.success("تم تحديث الصنف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteSupplierItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/asab/supplier/items/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "supplier", "items"] });
      toast.success("تم حذف الصنف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useToggleSupplierItemActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<SupplierItem>(
        `/asab/supplier/items/${id}/toggle-active`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "supplier", "items"] });
      toast.success("تم تبديل حالة الصنف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportSupplierItems() {
  return useMutation({
    mutationFn: async (format: "xlsx" | "csv" = "xlsx") => {
      await downloadBlob(
        "/asab/supplier/items/export",
        `supplier-items.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** Download the supplier catalog template (empty, or the supplier's saved rows). */
export function useSupplierItemsTemplate() {
  return useMutation({
    mutationFn: async (format: "xlsx" | "csv" = "xlsx") => {
      await downloadBlob(
        "/asab/supplier/items/template",
        `supplier-items-template.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** Bulk import the supplier catalog from Excel/CSV. Idempotent (code, else name). */
export function useImportSupplierItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: File | { file: File; supplierId?: string }) => {
      const { file, supplierId } = input instanceof File ? { file: input, supplierId: undefined } : input;
      const fd = new FormData();
      fd.append("file", file);
      if (supplierId) fd.append("supplierId", supplierId);
      const res = await api.post<{
        itemCount: number;
        errors?: Array<{ row: number; message: string }>;
      }>("/asab/supplier/items/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["platform", "supplier", "items"] });
      const n = data?.itemCount ?? 0;
      const failed = data?.errors?.length ?? 0;
      if (failed > 0) toast.warning(`تم استيراد ${n} صنف · ${failed} صف به خطأ`);
      else toast.success(`تم استيراد ${n} صنف`);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** IDs are supplied by the authenticated Backend ambiguity response, not guessed. */
export function supplierRecordChoices(error: unknown): string[] {
  const e = error as { code?: string; details?: { supplierIds?: unknown } } | null;
  if (e?.code !== "SUPPLIER_RECORD_AMBIGUOUS" || !Array.isArray(e.details?.supplierIds)) return [];
  return [...new Set(e.details.supplierIds.filter((id): id is string => typeof id === "string" && id.length > 0))];
}

export interface SupplierItemForm {
  name: string; code: string; unit: string; price: string;
  minQty: string; maxQty: string; leadTimeDays: string; available: boolean;
}

/** Catalog quantity constraints are integer fields in the existing Backend contract.
 * This does not choose a fractional purchase-quantity rounding policy (PUR-05).
 */
export function buildSupplierItemBody(form: SupplierItemForm) {
  if (!form.name.trim() || form.name.trim().length > 200 || form.code.trim().length > 32 || form.unit.trim().length > 16)
    throw new Error("Invalid item name, code or unit");
  const raw = form.price.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error("Enter a non-negative price with at most two decimals");
  const [major, minor = ""] = raw.split(".");
  const priceHalalas = Number(major) * 100 + Number(minor.padEnd(2, "0"));
  if (!Number.isSafeInteger(priceHalalas)) throw new Error("Price exceeds safe halala precision");
  const quantity = (value: string) => {
    if (value.trim() === "") return undefined;
    if (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value))) throw new Error("Quantity and lead time must be non-negative integers");
    return Number(value);
  };
  const minQty = quantity(form.minQty), maxQty = quantity(form.maxQty);
  if (minQty !== undefined && maxQty !== undefined && minQty > maxQty) throw new Error("Minimum quantity exceeds maximum");
  return { name: form.name.trim(), code: form.code.trim() || undefined, unit: form.unit.trim() || undefined,
    priceHalalas, minQty, maxQty, leadTimeDays: quantity(form.leadTimeDays), available: form.available };
}

/** Synchronous UI lock only. Server transaction/idempotency guarantees remain separate. */
export async function runSupplierMutation<T>(lock: { current: boolean }, mutate: () => Promise<T>): Promise<T | undefined> {
  if (lock.current) return undefined;
  lock.current = true;
  try { return await mutate(); } finally { lock.current = false; }
}

export function useExportSupplierOrders() {
  return useMutation({
    mutationFn: async (
      filter: {
        status?: "pending" | "accepted" | "delivered" | "rejected";
        format?: "xlsx" | "csv";
      } = {},
    ) => {
      const fmt = filter.format ?? "xlsx";
      await downloadBlob(
        "/asab/supplier/orders/export",
        `supplier-orders-${filter.status ?? "all"}.${fmt}`,
        { ...filter, format: fmt },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
