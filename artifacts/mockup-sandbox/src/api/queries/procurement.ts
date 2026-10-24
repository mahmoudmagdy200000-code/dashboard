import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob, withIdempotencyKey } from "../client";
import { getErrorMessage, ApiError } from "../errors";
import { queryKeys, type ProcurementOrdersFilter } from "./keys";
import type { PurchaseOrderSendResult } from "../types/platform";
// The catalog surface follows the signed-in account: a platform procurement
// manager (company_id NULL) writes to /procurement/*, a company one to
// /company/me/procurement/*. Company `/company/me/*` refuses a companyless user
// with 403 WRONG_TENANT — which is exactly the «المستخدم غير مرتبط بشركة» the
// platform manager hit on «إضافة صنف». AuthContext keeps procBase() in sync.
import { procBase } from "./platform/procurement";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ProcurementOverviewResponse {
  kpis?: Record<string, number | string>;
  pendingCount?: number;
  groupedCount?: number;
  sentCount?: number;
  topSuppliers?: Array<{
    id: string;
    name: string;
    ordersCount: number;
    totalHalalas: number;
  }>;
  recentOrders?: ProcurementOrder[];
}

export interface ProcurementOrder {
  id: string;
  publicId?: string;
  supplierId?: string;
  supplierName?: string;
  branchId?: string;
  branchName?: string;
  brandName?: string;
  status: "draft" | "approved" | "rejected" | "sent" | string;
  totalHalalas: number;
  itemsCount?: number;
  createdAt: string;
  approvedAt?: string;
  sentAt?: string;
  items?: ProcurementOrderItem[];
}

export interface ProcurementOrderItem {
  id?: string;
  itemId: string;
  itemName?: string;
  qty: number;
  unit?: string;
  unitPriceHalalas?: number;
  totalHalalas?: number;
  notes?: string;
}

export interface ProcurementGroupedOrder {
  groupId: string;
  supplierId: string;
  supplierName: string;
  ordersCount: number;
  branchesCount?: number;
  totalHalalas: number;
  orders?: ProcurementOrder[];
}

export interface ProcurementItem {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  lastPriceHalalas?: number;
  avgPriceHalalas?: number;
  preferredSupplierName?: string;
  isActive?: boolean;
}

export interface ItemPriceHistoryRow {
  date: string;
  supplierName?: string;
  pricePerUnitHalalas: number;
  qty?: number;
}

export interface ProcurementSupplier {
  id: string;
  name: string;
  category?: string;
  phone?: string;
  email?: string;
  rating?: number;
  ratingsCount?: number;
  ordersCount?: number;
  isActive: boolean;
  isPreferred?: boolean;
}

export interface ProcurementReport {
  key: string;
  title: string;
  titleEn?: string;
  description?: string;
  availableFormats: ("pdf" | "xlsx" | "csv")[];
}

// ─── Overview ────────────────────────────────────────────────────────────────
export function useProcurementOverview() {
  return useQuery({
    queryKey: queryKeys.procurementOverview,
    queryFn: async () => {
      const res = await api.get<ProcurementOverviewResponse>(
        `${procBase()}/overview`,
      );
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export function useProcurementOrders(filter: ProcurementOrdersFilter = {}) {
  return useQuery({
    queryKey: queryKeys.procurementOrders(filter),
    queryFn: async () => {
      const res = await api.get<
        { data: ProcurementOrder[]; meta?: any } | ProcurementOrder[]
      >(`${procBase()}/orders`, { params: filter });
      const d = res.data;
      if (Array.isArray(d)) {
        const items = [...d] as ProcurementOrder[] & { meta?: any };
        items.meta = { total: d.length, page: 1, pageSize: d.length, totalPages: 1 };
        return items;
      }
      const items = [...(d.data ?? [])] as ProcurementOrder[] & { meta?: any };
      items.meta = d.meta ?? { total: items.length, page: 1, pageSize: items.length, totalPages: 1 };
      return items;
    },
  });
}

export function useGroupedOrders() {
  return useQuery({
    queryKey: queryKeys.procurementGroupedOrders,
    queryFn: async () => {
      const res = await api.get<
        { data: ProcurementGroupedOrder[] } | ProcurementGroupedOrder[]
      >(`${procBase()}/orders/grouped`);
      const d = res.data as
        | { data?: ProcurementGroupedOrder[] }
        | ProcurementGroupedOrder[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useSentOrders() {
  return useQuery({
    queryKey: queryKeys.procurementSentOrders,
    queryFn: async () => {
      const res = await api.get<
        { data: ProcurementOrder[] } | ProcurementOrder[]
      >(`${procBase()}/orders/sent`);
      const d = res.data as
        | { data?: ProcurementOrder[] }
        | ProcurementOrder[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateProcurementOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      supplierId?: string;
      branchId?: string;
      items: ProcurementOrderItem[];
      notes?: string;
      description?: string;
      commandId?: string;
    }) => {
      const { commandId, ...rest } = body;
      const payload = {
        ...rest,
        description: body.description ?? body.notes,
        notes: body.notes ?? body.description,
      };
      const res = await api.post<ProcurementOrder>(
        `${procBase()}/orders`,
        payload,
        commandId ? withIdempotencyKey(commandId) : undefined,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "orders"] });
      qc.invalidateQueries({ queryKey: queryKeys.procurementOverview });
      toast.success("تم إنشاء الأمر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteProcurementOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${procBase()}/orders/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "orders"] });
      qc.invalidateQueries({ queryKey: queryKeys.procurementOverview });
      toast.success("تم حذف الأمر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<ProcurementOrder>) => {
      const res = await api.patch<ProcurementOrder>(
        `${procBase()}/orders/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "orders"] });
      toast.success("تم تحديث الأمر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useApproveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<ProcurementOrder>(
        `${procBase()}/orders/${id}/approve`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "orders"] });
      qc.invalidateQueries({ queryKey: queryKeys.procurementOverview });
      toast.success("تم اعتماد الأمر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRejectOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      notes,
    }: {
      id: string;
      reason: string;
      notes?: string;
    }) => {
      const res = await api.post<ProcurementOrder>(
        `${procBase()}/orders/${id}/reject`,
        { reason, notes },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "orders"] });
      toast.success("تم رفض الأمر");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSendGroupedOrder() {
  const qc = useQueryClient();
  return useMutation({
    // FR-PUR-1: the new WhatsApp send-to-supplier endpoint (per supplier). If the new
    // route isn't deployed yet (404), fall back to the legacy per-group send so the
    // button keeps working (without WhatsApp) instead of breaking.
    mutationFn: async (vars: { supplierId: string; groupId?: string; orderIds?: string[]; expectedDeliveryDate?: string }) => {
      const { groupId, ...body } = vars;
      try {
        const res = await api.post<PurchaseOrderSendResult>(
          `${procBase()}/purchase-orders/grouped/send`,
          body,
        );
        return res.data;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404 && groupId) {
          const legacy = await api.post<{ sentOrderIds: string[] }>(
            `${procBase()}/orders/grouped/${groupId}/send`,
          );
          return { ordersCount: legacy.data?.sentOrderIds?.length ?? 0, whatsapp: null } as unknown as PurchaseOrderSendResult;
        }
        throw e;
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementGroupedOrders });
      qc.invalidateQueries({ queryKey: queryKeys.procurementSentOrders });
      qc.invalidateQueries({ queryKey: queryKeys.procurementOverview });
      const wa = data?.whatsapp;
      if (wa?.deliverable && wa.url) {
        window.open(wa.url, "_blank", "noopener,noreferrer");
        toast.success("تم التجهيز — افتح واتساب لإرسال الطلب للمورد");
      } else if (wa && !wa.deliverable) {
        toast.warning("تم الإرسال، لكن لا يوجد رقم واتساب للمورد — أضف رقم الجوال للمورد");
      } else {
        toast.success("تم إرسال الأوامر المجمعة");
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Items ───────────────────────────────────────────────────────────────────
export function useProcurementItems() {
  return useQuery({
    queryKey: queryKeys.procurementItems,
    queryFn: async () => {
      const res = await api.get<
        { data: ProcurementItem[] } | ProcurementItem[]
      >(`${procBase()}/items`);
      const d = res.data as
        | { data?: ProcurementItem[] }
        | ProcurementItem[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useItemPriceHistory(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.itemPriceHistory(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<
        { data: ItemPriceHistoryRow[] } | ItemPriceHistoryRow[]
      >(`${procBase()}/items/${id}/price-history`);
      const d = res.data as
        | { data?: ItemPriceHistoryRow[] }
        | ItemPriceHistoryRow[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// Write body: send `lastPriceSar` (riyals — matches the «آخر سعر (ر.س)» field);
// `lastPriceHalalas`/`defaultPriceHalalas` (halalas) stay accepted for old callers.
type ProcurementItemWrite = Partial<ProcurementItem> & {
  lastPriceSar?: number;
  defaultPriceHalalas?: number;
};

const invalidateProcItems = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: queryKeys.procurementItems });
  // The platform procurement surface caches items under a different key — refresh
  // it too so the list updates without a manual reload on either surface.
  qc.invalidateQueries({ queryKey: queryKeys.platformProcurementItems });
};

export function useCreateProcurementItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ProcurementItemWrite) => {
      const res = await api.post<ProcurementItem>(`${procBase()}/items`, body);
      return res.data;
    },
    onSuccess: () => {
      invalidateProcItems(qc);
      toast.success("تم إضافة الصنف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteProcurementItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${procBase()}/items/${id}`);
    },
    onSuccess: () => {
      invalidateProcItems(qc);
      toast.success("تم حذف الصنف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateProcurementItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & ProcurementItemWrite) => {
      const res = await api.patch<ProcurementItem>(
        `${procBase()}/items/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      invalidateProcItems(qc);
      toast.success("تم تحديث الصنف");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** Download the catalog template (empty, or the account's saved rows). */
export function useProcurementItemsTemplate() {
  return useMutation({
    mutationFn: async (format: "xlsx" | "csv" = "xlsx") => {
      await downloadBlob(
        `${procBase()}/items/template`,
        `procurement-items-template.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** Bulk import the catalog from Excel/CSV. Idempotent (code, else name). */
export function useImportProcurementItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{
        itemCount: number;
        errors?: Array<{ row: number; message: string }>;
      }>(`${procBase()}/items/import`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      invalidateProcItems(qc);
      const n = data?.itemCount ?? 0;
      const failed = data?.errors?.length ?? 0;
      if (failed > 0) toast.warning(`تم استيراد ${n} صنف · ${failed} صف به خطأ`);
      else toast.success(`تم استيراد ${n} صنف`);
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Suppliers ───────────────────────────────────────────────────────────────
export function useProcurementSuppliers() {
  return useQuery({
    queryKey: queryKeys.procurementSuppliers,
    queryFn: async () => {
      const endpoint = procBase() === "/procurement" ? `${procBase()}/suppliers` : "/company/me/suppliers";
      const res = await api.get<
        { data: ProcurementSupplier[] } | ProcurementSupplier[]
      >(endpoint);
      const d = res.data as
        | { data?: ProcurementSupplier[] }
        | ProcurementSupplier[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<ProcurementSupplier>) => {
      const res = await api.post<ProcurementSupplier>(
        "/company/me/suppliers",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementSuppliers });
      qc.invalidateQueries({ queryKey: queryKeys.platformProcurementSuppliers });
      toast.success("تم إضافة المورد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<ProcurementSupplier>) => {
      const res = await api.patch<ProcurementSupplier>(
        `/company/me/suppliers/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementSuppliers });
      qc.invalidateQueries({ queryKey: queryKeys.platformProcurementSuppliers });
      toast.success("تم تحديث المورد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      rating,
      comment,
    }: {
      id: string;
      rating: number;
      comment?: string;
    }) => {
      const res = await api.post<ProcurementSupplier>(
        `/company/me/suppliers/${id}/ratings`,
        { rating, comment },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementSuppliers });
      qc.invalidateQueries({ queryKey: queryKeys.platformProcurementSuppliers });
      toast.success("تم حفظ التقييم");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useToggleSupplierActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<ProcurementSupplier>(
        `/company/me/suppliers/${id}/toggle-active`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.procurementSuppliers });
      qc.invalidateQueries({ queryKey: queryKeys.platformProcurementSuppliers });
      toast.success("تم تحديث حالة المورد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export function useProcurementReports() {
  return useQuery({
    queryKey: queryKeys.procurementReports,
    queryFn: async () => {
      const res = await api.get<
        { data: ProcurementReport[] } | ProcurementReport[]
      >("/company/me/procurement/reports");
      const d = res.data as
        | { data?: ProcurementReport[] }
        | ProcurementReport[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
    staleTime: 60_000,
  });
}

export function useDownloadProcurementReport() {
  return useMutation({
    mutationFn: async ({
      key,
      format = "pdf",
      filename,
    }: {
      key: string;
      format?: "pdf" | "xlsx" | "csv";
      filename?: string;
    }) => {
      await downloadBlob(
        `/company/me/procurement/reports/${key}/download`,
        filename ?? `${key}.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportProcurementItems() {
  return useMutation({
    mutationFn: async (format: "xlsx" | "csv" = "xlsx") => {
      await downloadBlob(
        `${procBase()}/items/export`,
        `procurement-items.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useExportSuppliers() {
  return useMutation({
    mutationFn: async (format: "xlsx" | "csv" = "xlsx") => {
      await downloadBlob(
        "/company/me/suppliers/export",
        `suppliers.${format}`,
        { format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
