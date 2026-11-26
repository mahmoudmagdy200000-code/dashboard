import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, withIdempotencyKey, type Page } from "../../client";
import { getErrorMessage } from "../../errors";
import type {
  PlatformProcurementItem,
  PlatformProcurementOrder,
  PlatformProcurementOverview,
  PlatformProcurementSupplier,
  ProcurementSuppliersListResponse,
  PurchaseOrder,
  PurchaseOrderBulkApproveResult,
  PurchaseOrderDetail,
  PurchaseOrderGroupDetail,
  PurchaseOrderGroupedResponse,
  PurchaseOrderSendResult,
  PurchaseOrderSentGroup,
} from "../../types/platform";
import {
  queryKeys,
  type PlatformProcurementOrdersFilter,
  type PurchaseOrdersFilter,
} from "../keys";

// ─── Surface selection (platform vs company) ────────────────────────────────
// A procurement manager with no company is a PLATFORM account: it sees orders
// across every company at /procurement/*. One employed by a company keeps
// /company/me/procurement/*, which answers "my company" and refuses a
// companyless user with 403 WRONG_TENANT. Since round 4 a procurement account
// created without a companyId is the default, so picking the wrong base breaks
// every screen. AuthContext sets this from the signed-in user.
let procurementPlatformScope = false;

export function setProcurementPlatformScope(isPlatform: boolean): void {
  procurementPlatformScope = isPlatform;
}

export const procBase = () =>
  procurementPlatformScope ? "/procurement" : "/company/me/procurement";

// ─── Overview ───────────────────────────────────────────────────────────────
export function useProcurementOverviewPlatform() {
  return useQuery({
    queryKey: queryKeys.platformProcurementOverview,
    queryFn: async () => {
      const res = await api.get<PlatformProcurementOverview>(
        `${procBase()}/overview`,
      );
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Orders ─────────────────────────────────────────────────────────────────
export function useProcurementOrdersPlatform(
  filter: PlatformProcurementOrdersFilter = {},
) {
  return useQuery({
    queryKey: queryKeys.platformProcurementOrders(filter),
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformProcurementOrder> | PlatformProcurementOrder[]
      >(`${procBase()}/orders`, { params: filter });
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useProcurementOrderPlatform(id?: string) {
  return useQuery({
    queryKey: queryKeys.platformProcurementOrder(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<PlatformProcurementOrder>(
        `${procBase()}/orders/${id}`,
      );
      return res.data;
    },
  });
}

export function useApproveProcurementOrderPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.post<PlatformProcurementOrder>(
        `${procBase()}/orders/${id}/approve`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      qc.invalidateQueries({
        queryKey: ["platform", "procurement", "overview"],
      });
      toast.success("تم اعتماد الطلب");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useBulkApproveProcurementOrdersPlatform() {
  const qc = useQueryClient();
  return useMutation({
    // Contract 5.3 bulk: POST /company/me/procurement/orders/approve { orderIds?, branch?, supplier? }
    mutationFn: async (body: { orderIds?: string[]; branch?: string; supplier?: string }) => {
      const res = await api.post<{ approved: string[]; count: number }>(
        `${procBase()}/orders/approve`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "overview"] });
      toast.success("تم اعتماد الطلبات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRejectProcurementOrderPlatform() {
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
      const res = await api.post<PlatformProcurementOrder>(
        `${procBase()}/orders/${id}/reject`,
        { reason, notes },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      qc.invalidateQueries({
        queryKey: ["platform", "procurement", "overview"],
      });
      toast.success("تم رفض الطلب");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function usePartialRejectProcurementOrderPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.post<PlatformProcurementOrder>(
        `${procBase()}/orders/${id}/partial-reject`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      toast.success("تم الرفض الجزئي");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useConsolidateProcurementOrdersPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post<unknown>(
        `${procBase()}/orders/consolidate`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      qc.invalidateQueries({
        queryKey: ["platform", "procurement", "overview"],
      });
      toast.success("تم تجميع الطلبات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSendProcurementOrderPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      ...body
    }: { groupId: string } & Record<string, unknown>) => {
      const res = await api.post<unknown>(
        `${procBase()}/orders/grouped/${groupId}/send`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "orders"] });
      qc.invalidateQueries({
        queryKey: ["platform", "procurement", "overview"],
      });
      toast.success("تم إرسال الطلب للمورد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Suppliers & items ──────────────────────────────────────────────────────
// Returns the full { data, meta } — meta.kpis carries activeSuppliers/totalPurchases/avgRating (T11.13).
export function useProcurementSuppliersPlatform() {
  return useQuery({
    queryKey: queryKeys.platformProcurementSuppliers,
    queryFn: async () => {
      const res = await api.get<
        ProcurementSuppliersListResponse | PlatformProcurementSupplier[]
      >(`${procBase()}/suppliers`);
      const d = res.data;
      return Array.isArray(d)
        ? { data: d, meta: undefined }
        : { data: d.data ?? [], meta: d.meta };
    },
  });
}

export function useProcurementItemsPlatform() {
  return useQuery({
    queryKey: queryKeys.platformProcurementItems,
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformProcurementItem> | PlatformProcurementItem[]
      >(`${procBase()}/items`);
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// Purchase-orders BRIDGE (real branch/mobile-app orders). Amounts = SAR floats.
// Base: /company/me/procurement/purchase-orders
// NOTE: routes are not on the live server yet (return 404 until backend deploys
// branch `asab-admin-backend`). Screens render safe empty states until then.
// ════════════════════════════════════════════════════════════════════════════

const poBase = () => `${procBase()}/purchase-orders`;
const invalidatePO = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["platform", "procurement", "purchase-orders"] });
  qc.invalidateQueries({ queryKey: ["platform", "procurement", "overview"] });
};

/** List branch orders. Returns the FULL page so callers can read `meta.total`. */
export function usePurchaseOrders(
  filter: PurchaseOrdersFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformPurchaseOrders(filter),
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const res = await api.get<Page<PurchaseOrder>>(poBase(), { params: filter });
      const d = res.data as Page<PurchaseOrder> | PurchaseOrder[];
      // Normalise to a page shape even if the backend returns a bare array.
      if (Array.isArray(d)) {
        return { data: d, meta: { page: 1, pageSize: d.length, total: d.length, totalPages: 1 } };
      }
      return d;
    },
  });
}

/** Single order detail (accepts uuid OR orderNumber). */
export function usePurchaseOrder(
  id?: string,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformPurchaseOrder(id ?? ""),
    enabled: Boolean(id) && (options.enabled ?? true),
    queryFn: async () => {
      const res = await api.get<PurchaseOrderDetail>(`${poBase()}/${id}`);
      return res.data;
    },
  });
}

/** Orders decided by the current manager (decided_at DESC). Full page. */
export function usePurchaseOrdersApprovedByMe(
  filter: PurchaseOrdersFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformPurchaseOrdersApprovedByMe(filter),
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const res = await api.get<Page<PurchaseOrder>>(`${poBase()}/approved-by-me`, {
        params: filter,
      });
      const d = res.data as Page<PurchaseOrder> | PurchaseOrder[];
      if (Array.isArray(d)) {
        return { data: d, meta: { page: 1, pageSize: d.length, total: d.length, totalPages: 1 } };
      }
      return d;
    },
  });
}

export function useApprovePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<PurchaseOrder>(`${poBase()}/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      invalidatePO(qc);
      toast.success("تم اعتماد الطلب");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** Partial approve — quantity 0 rejects that line; all zeros = full rejection. */
export function usePartialApprovePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      items,
      note,
    }: {
      id: string;
      items: Array<{ orderItemId: string; quantity: number }>;
      note?: string;
    }) => {
      const res = await api.post<PurchaseOrder>(`${poBase()}/${id}/partial-approve`, {
        items,
        note,
      });
      return res.data;
    },
    onSuccess: () => {
      invalidatePO(qc);
      toast.success("تم الاعتماد الجزئي");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRejectPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post<PurchaseOrder>(`${poBase()}/${id}/reject`, { reason });
      return res.data;
    },
    onSuccess: () => {
      invalidatePO(qc);
      toast.success("تم رفض الطلب");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** Bulk approve — per-order failures are collected in the result, never thrown. */
export function useBulkApprovePurchaseOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      const res = await api.post<PurchaseOrderBulkApproveResult>(
        `${poBase()}/bulk-approve`,
        { orderIds },
      );
      return res.data;
    },
    onSuccess: (data) => {
      invalidatePO(qc);
      const ok = data?.count ?? data?.approved?.length ?? 0;
      const failed = data?.failed?.length ?? 0;
      if (failed > 0) {
        toast.warning(`تم اعتماد ${ok} وتعذّر ${failed}`);
      } else {
        toast.success(`تم اعتماد ${ok} طلب`);
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** Live preview grouped by supplier (default), city, or item (T11.7). Not persisted. */
export function useGroupedPurchaseOrders(
  by: "supplier" | "city" | "item" = "supplier",
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformPurchaseOrdersGrouped(by),
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const res = await api.get<PurchaseOrderGroupedResponse>(`${poBase()}/grouped`, {
        params: { by },
      });
      return res.data;
    },
  });
}

/** Send a supplier's consolidatable orders. Omit orderIds = send ALL of them. */
export function useSendGroupedPurchaseOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplierId,
      orderIds,
      expectedDeliveryDate,
      commandId,
    }: {
      supplierId: string;
      orderIds?: string[];
      expectedDeliveryDate: string;
      commandId?: string;
    }) => {
      const res = await api.post<PurchaseOrderSendResult>(
        `${poBase()}/grouped/send`,
        {
          supplierId,
          orderIds,
          expectedDeliveryDate,
        },
        commandId ? withIdempotencyKey(commandId) : undefined,
      );
      return res.data;
    },
    onSuccess: (data) => {
      invalidatePO(qc);
      qc.invalidateQueries({
        queryKey: queryKeys.platformPurchaseOrdersSent,
      });
      const wa = data?.whatsapp;
      if (wa && !wa.deliverable) {
        toast.warning("تم تأكيد الإرسال، لكن لا يوجد رقم واتساب للمورد — أضف رقم الجوال للمورد");
      } else {
        toast.success("تم تأكيد الإرسال للمورد — الحالة: أُرسل بانتظار الرد");
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** DEC-06: Record manual supplier response (WhatsApp / phone) for non-subscribed supplier. */
export function useRecordManualSupplierResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      source,
      respondedAt,
      reason,
      note,
    }: {
      id: string;
      decision: "accepted" | "rejected";
      source: "whatsapp" | "phone";
      respondedAt: string;
      reason?: string;
      note?: string;
    }) => {
      const res = await api.post(`${poBase()}/${id}/manual-supplier-response`, {
        decision,
        source,
        respondedAt,
        reason,
        note,
      });
      return res.data;
    },
    onSuccess: () => {
      invalidatePO(qc);
      qc.invalidateQueries({ queryKey: queryKeys.platformPurchaseOrdersSent });
      qc.invalidateQueries({ queryKey: ["platform", "procurement", "purchase-orders", "group"] });
      toast.success("تم تسجيل رد المورد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

/** Groups already sent to suppliers (status derived live from member orders). */
export function useSentPurchaseOrders(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.platformPurchaseOrdersSent,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const res = await api.get<
        Page<PurchaseOrderSentGroup> | PurchaseOrderSentGroup[]
      >(`${poBase()}/sent`);
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

/** One sent group: header + aggregated items + member orders (for tracking). */
export function usePurchaseOrderGroup(
  groupId?: string,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformPurchaseOrderGroup(groupId ?? ""),
    enabled: Boolean(groupId) && (options.enabled ?? true),
    queryFn: async () => {
      const res = await api.get<PurchaseOrderGroupDetail>(`${poBase()}/groups/${groupId}`);
      return res.data;
    },
  });
}
