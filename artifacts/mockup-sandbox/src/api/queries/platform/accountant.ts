import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type Page } from "../../client";
import { getErrorMessage } from "../../errors";
import type { Operation } from "../../types";
import type {
  PlatformAccountantDashboard,
  PlatformAsset,
  PlatformAssetDraft,
  PlatformCashCustodyRow,
  PlatformEmployee,
  PlatformInventoryBranch,
  PlatformReminderRow,
  PlatformReminderRule,
  PlatformShift,
} from "../../types/platform";
import {
  queryKeys,
  type PlatformAccountantOpsFilter,
  type PlatformAssetsFilter,
  type PlatformCashFilter,
  type PlatformEmployeesFilter,
  type PlatformInventoryFilter,
  type PlatformShiftsFilter,
  type PlatformWasteFilter,
} from "../keys";

// ─── Dashboard ──────────────────────────────────────────────────────────────
export function useAccountantDashboardPlatform() {
  return useQuery({
    queryKey: queryKeys.platformAccountantDashboard,
    queryFn: async () => {
      const res = await api.get<PlatformAccountantDashboard>(
        "/accountant/dashboard",
      );
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Operations ─────────────────────────────────────────────────────────────
export function useAccountantOperationsPlatform(
  filter: PlatformAccountantOpsFilter = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.platformAccountantOperations(filter),
    enabled: options.enabled,
    queryFn: async () => {
      const res = await api.get<Page<Operation> | Operation[]>(
        "/accountant/operations",
        { params: filter },
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function usePatchAccountantOperationReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.patch<Operation>(
        `/accountant/operations/${id}/reconciliation`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "accountant", "operations"],
      });
      toast.success("تم تحديث التسوية");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useConvertExpenseToAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      ...body
    }: { invoiceId: string } & Record<string, unknown>) => {
      const res = await api.post<PlatformAsset>(
        `/accountant/expense-invoices/${invoiceId}/convert-to-asset`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "accountant", "assets"] });
      qc.invalidateQueries({
        queryKey: ["platform", "accountant", "asset-drafts"],
      });
      toast.success("تم تحويل المصروف إلى أصل");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Assets ─────────────────────────────────────────────────────────────────
export function usePlatformAssets(filter: PlatformAssetsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformAssets(filter),
    queryFn: async () => {
      const res = await api.get<Page<PlatformAsset> | PlatformAsset[]>(
        "/accountant/assets",
        { params: filter },
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function usePlatformAssetDrafts() {
  return useQuery({
    queryKey: queryKeys.platformAssetDrafts,
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformAssetDraft> | PlatformAssetDraft[]
      >("/accountant/asset-drafts");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useCreatePlatformAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<PlatformAsset> & { name: string }) => {
      const res = await api.post<PlatformAsset>("/accountant/assets", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "accountant", "assets"] });
      toast.success("تم إنشاء الأصل");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useConfirmPlatformAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<PlatformAsset>(
        `/accountant/assets/${id}/confirm`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "accountant", "assets"] });
      toast.success("تم تأكيد الأصل");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useConfirmPlatformAssetDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      draftId,
      ...body
    }: { draftId: string } & Record<string, unknown>) => {
      const res = await api.post<PlatformAsset>(
        `/accountant/asset-drafts/${draftId}/confirm`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "accountant", "asset-drafts"],
      });
      qc.invalidateQueries({ queryKey: ["platform", "accountant", "assets"] });
      toast.success("تم تأكيد المسودة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeletePlatformAssetDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draftId: string) => {
      await api.delete(`/accountant/asset-drafts/${draftId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "accountant", "asset-drafts"],
      });
      toast.success("تم حذف المسودة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Inventory ──────────────────────────────────────────────────────────────
export function usePlatformInventory(filter: PlatformInventoryFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformInventory(filter),
    queryFn: async () => {
      // This endpoint returns a NAMED-KEY object { branches, summary } — not a list
      // and not { data }. Return it raw; the defensive list-unwrap would collapse it
      // to [] and blank the inventory-review screen (zero branches).
      const res = await api.get<unknown>("/accountant/inventory", { params: filter });
      return res.data as any;
    },
  });
}

export function usePlatformInventoryCatalog(brandId?: string) {
  return useQuery({
    queryKey: [...queryKeys.platformInventoryCatalog, brandId ?? "all"] as const,
    queryFn: async () => {
      const res = await api.get<unknown>("/accountant/inventory/catalog", {
        params: brandId ? { brandId } : undefined,
      });
      return res.data;
    },
  });
}

// GET /accountant/inventory/brands — brand pills w/ branchCount + itemCount.
// Empty scope → 200 + [].
export function useAccountantInventoryBrands() {
  return useQuery({
    queryKey: queryKeys.platformInventoryBrands,
    queryFn: async () => {
      const res = await api.get<
        { data: unknown[] } | unknown[]
      >("/accountant/inventory/brands");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// GET /accountant/inventory/brands/{brandId}/branches — branch pills for a brand.
export function useAccountantInventoryBrandBranches(brandId?: string) {
  return useQuery({
    queryKey: queryKeys.platformInventoryBrandBranches(brandId ?? ""),
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await api.get<
        { data: unknown[] } | unknown[]
      >(`/accountant/inventory/brands/${brandId}/branches`);
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function usePlatformInventoryDailyList(branchId?: string) {
  return useQuery({
    queryKey: queryKeys.platformInventoryDailyList(branchId ?? ""),
    enabled: Boolean(branchId),
    queryFn: async () => {
      const res = await api.get<unknown>(
        `/accountant/inventory/branches/${branchId}/daily-list`,
      );
      return res.data;
    },
  });
}

export function useSavePlatformInventoryCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post<unknown>(
        "/accountant/inventory/catalog",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "accountant", "inventory"],
      });
      toast.success("تم حفظ كتالوج الجرد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useFlagPlatformInventoryBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchId,
      ...body
    }: { branchId: string } & Record<string, unknown>) => {
      const res = await api.post<unknown>(
        `/accountant/inventory/branches/${branchId}/flag`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "accountant", "inventory"],
      });
      toast.success("تم تعليم الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// 2026-08-11 — the PUT response now reports whether the list actually reached the
// branch's app worksheet: { savedCount, appListCount, newMobileItems, appListError,
// pushedAt }. Previously the save could "succeed" (200) while nothing reached the
// branch. Only toast green when appListError === null AND appListCount === savedCount.
export function useSavePlatformDailyInventoryList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchId,
      ...body
    }: { branchId: string } & Record<string, unknown>) => {
      const res = await api.put<unknown>(
        `/accountant/inventory/branches/${branchId}/daily-list`,
        body,
      );
      return res.data;
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({
        queryKey: ["platform", "accountant", "inventory"],
      });
      const savedCount = res?.savedCount;
      const appListCount = res?.appListCount;
      const appListError = res?.appListError ?? null;
      const reachedBranch =
        appListError === null &&
        (appListCount === undefined || appListCount === savedCount);
      if (reachedBranch) {
        toast.success("تم حفظ قائمة الجرد اليومي وإرسالها للفرع");
      } else {
        toast.error(
          appListError ??
            `تم الحفظ لكن لم تصل كل الأصناف للفرع (${appListCount ?? "?"}/${savedCount ?? "?"})`,
        );
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Waste ──────────────────────────────────────────────────────────────────
export function usePlatformWaste(filter: PlatformWasteFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformWaste(filter),
    queryFn: async () => {
      const res = await api.get<unknown>("/accountant/waste", {
        params: filter,
      });
      return res.data;
    },
  });
}

export function usePatchPlatformWasteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entryId,
      productIdx,
      ...body
    }: { entryId: string; productIdx: number } & Record<string, unknown>) => {
      const res = await api.patch<unknown>(
        `/accountant/waste/${entryId}/products/${productIdx}`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "accountant", "waste"] });
      toast.success("تم تحديث الهالك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function usePutPlatformWasteAllocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entryId,
      productIdx,
      ...body
    }: { entryId: string; productIdx: number } & Record<string, unknown>) => {
      const res = await api.put<unknown>(
        `/accountant/waste/${entryId}/products/${productIdx}/allocations`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "accountant", "waste"] });
      toast.success("تم حفظ التوزيع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useApprovePlatformWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const res = await api.post<unknown>(
        `/accountant/waste/${entryId}/approve`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "accountant", "waste"] });
      toast.success("تم اعتماد الهالك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRejectPlatformWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entryId,
      reason,
      notes,
    }: {
      entryId: string;
      reason: string;
      notes?: string;
    }) => {
      const res = await api.post<unknown>(
        `/accountant/waste/${entryId}/reject`,
        { reason, notes },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "accountant", "waste"] });
      toast.success("تم رفض الهالك");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useBulkApprovePlatformWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { entryIds: string[] } | Record<string, unknown>) => {
      const res = await api.post<unknown>(
        "/accountant/waste/bulk-approve",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "accountant", "waste"] });
      toast.success("تم اعتماد الهالك بالجملة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Shifts ─────────────────────────────────────────────────────────────────
export function usePlatformLiveShifts() {
  return useQuery({
    queryKey: queryKeys.platformLiveShifts,
    queryFn: async () => {
      const res = await api.get<Page<PlatformShift> | PlatformShift[]>(
        "/accountant/shifts/live",
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function usePlatformHistoryShifts(filter: PlatformShiftsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformHistoryShifts(filter),
    queryFn: async () => {
      const res = await api.get<Page<PlatformShift> | PlatformShift[]>(
        "/accountant/shifts/history",
        { params: filter },
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useClosePlatformShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.post<PlatformShift>(
        `/accountant/shifts/${id}/close`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "accountant", "shifts"] });
      toast.success("تم إغلاق الوردية");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Employees ──────────────────────────────────────────────────────────────
export function usePlatformEmployees(filter: PlatformEmployeesFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformEmployees(filter),
    queryFn: async () => {
      const res = await api.get<Page<PlatformEmployee> | PlatformEmployee[]>(
        "/accountant/employees",
        { params: filter },
      );
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function usePlatformEmployeeStatement(id?: string) {
  return useQuery({
    queryKey: queryKeys.platformEmployeeStatement(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<unknown>(
        `/accountant/employees/${id}/statement`,
      );
      return res.data;
    },
  });
}

export function useCreatePlatformEmployeeMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.post<unknown>(
        `/accountant/employees/${id}/movements`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["platform", "accountant", "employees"],
      });
      toast.success("تم إضافة الحركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Cash Custody ───────────────────────────────────────────────────────────
export function usePlatformCashCustody(filter: PlatformCashFilter = {}) {
  return useQuery({
    queryKey: queryKeys.platformCashCustody(filter),
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformCashCustodyRow> | PlatformCashCustodyRow[]
      >("/accountant/cash-custody", { params: filter });
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function usePlatformCashTransactions(custodyId?: string) {
  return useQuery({
    queryKey: queryKeys.platformCashTransactions(custodyId ?? ""),
    enabled: Boolean(custodyId),
    queryFn: async () => {
      const res = await api.get<unknown>(
        `/accountant/cash-custody/${custodyId}/transactions`,
      );
      return res.data;
    },
  });
}

// Cash-custody mutations (settlement-request, create-transaction) are served by the
// shared company hooks in queries/cash.ts — both surfaces hit the same handlers (T09).

// ─── Reminders ──────────────────────────────────────────────────────────────
export function usePlatformReminders() {
  return useQuery({
    queryKey: queryKeys.platformReminders,
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformReminderRow> | PlatformReminderRow[]
      >("/reminders");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function usePlatformReminderRules() {
  return useQuery({
    queryKey: queryKeys.platformReminderRules,
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformReminderRule> | PlatformReminderRule[]
      >("/reminders/rules");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useSendReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.post<unknown>(`/reminders/${id}/send`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "reminders"] });
      toast.success("تم إرسال التذكير");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useBulkSendReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { ids: string[] } | Record<string, unknown>) => {
      const res = await api.post<unknown>("/reminders/bulk-send", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "reminders"] });
      toast.success("تم إرسال التذكيرات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useRespondToReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const res = await api.post<unknown>(`/reminders/${id}/respond`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "reminders"] });
      toast.success("تم تسجيل الرد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useCreateReminderRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<PlatformReminderRule>) => {
      const res = await api.post<PlatformReminderRule>(
        "/reminders/rules",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "reminders", "rules"] });
      toast.success("تم إنشاء القاعدة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function usePatchReminderRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<PlatformReminderRule>) => {
      const res = await api.patch<PlatformReminderRule>(
        `/reminders/rules/${id}`,
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "reminders", "rules"] });
      toast.success("تم تحديث القاعدة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useDeleteReminderRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/reminders/rules/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "reminders", "rules"] });
      toast.success("تم حذف القاعدة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useToggleReminderRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<PlatformReminderRule>(
        `/reminders/rules/${id}/toggle`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "reminders", "rules"] });
      toast.success("تم تبديل حالة القاعدة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
