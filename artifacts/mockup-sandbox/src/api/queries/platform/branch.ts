import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type Page } from "../../client";
import { getErrorMessage, isApiError } from "../../errors";
import type {
  PlatformBranchEmployee,
  PlatformBranchInventoryItems,
  PlatformBranchOverview,
  PlatformBranchReportType,
  PlatformBranchSettings,
  PlatformBranchSupplierRow,
  PlatformBranchUploadStatus,
} from "../../types/platform";
import { queryKeys } from "../keys";

// ─── Overview ───────────────────────────────────────────────────────────────
export function useBranchOverviewPlatform(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.platformBranchOverview,
    enabled: opts.enabled,
    queryFn: async () => {
      const res = await api.get<PlatformBranchOverview>("/company/me/branch/overview");
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Uploads ────────────────────────────────────────────────────────────────
export function useBranchUploadStatusPlatform() {
  return useQuery({
    queryKey: queryKeys.platformBranchUploadStatus,
    queryFn: async () => {
      const res = await api.get<PlatformBranchUploadStatus>(
        "/company/me/branch/upload/status",
      );
      return res.data;
    },
  });
}

// ─── Employees ──────────────────────────────────────────────────────────────
export function useBranchEmployeesPlatform() {
  return useQuery({
    queryKey: queryKeys.platformBranchEmployees,
    queryFn: async () => {
      const res = await api.get<
        Page<PlatformBranchEmployee> | PlatformBranchEmployee[]
      >("/company/me/branch/employees");
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

export function useAddBranchEmployeePlatform() {
  const qc = useQueryClient();
  return useMutation({
    // Cashiers are created only in the mobile app by the branch manager — the
    // dashboard no longer provisions login accounts and `email` was dropped from
    // the contract. `phone` is still accepted (and now stored).
    mutationFn: async (
      body: Partial<PlatformBranchEmployee> & {
        name: string;
        empNumber: string;
        salaryHalalas?: number;
        shift?: string;
      },
    ) => {
      const res = await api.post<PlatformBranchEmployee>(
        "/company/me/branch/employees",
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "branch", "employees"] });
      toast.success("تم إضافة الموظف");
    },
    // CASHIER_MOBILE_ONLY (422) is shown inline in the form, not as a toast.
    onError: (e) => {
      if (isApiError(e) && e.code === "CASHIER_MOBILE_ONLY") return;
      toast.error(getErrorMessage(e, "ar"));
    },
  });
}

// ─── Inventory items & suppliers ────────────────────────────────────────────
export function useBranchInventoryItemsPlatform() {
  return useQuery({
    queryKey: queryKeys.platformBranchInventoryItems,
    queryFn: async () => {
      // Doc §4: the company-scoped path is /company/me/branch/items (verified
      // live, returns { items, configuredBy }). The old /inventory-items path
      // 404s. (/branch/inventory-items is the branch-role direct variant.)
      const res = await api.get<PlatformBranchInventoryItems>(
        "/company/me/branch/items",
      );
      return res.data;
    },
  });
}

export function useBranchSuppliersPlatform() {
  return useQuery({
    queryKey: queryKeys.platformBranchSuppliers,
    queryFn: async () => {
      const res = await api.get<
        { data: PlatformBranchSupplierRow[] } | PlatformBranchSupplierRow[]
      >("/company/me/branch/suppliers");
      const d = res.data as
        | { data?: PlatformBranchSupplierRow[] }
        | PlatformBranchSupplierRow[];
      return Array.isArray(d) ? d : (d.data ?? []);
    },
  });
}

// ─── Settings ───────────────────────────────────────────────────────────────
export function useBranchSettingsPlatform() {
  return useQuery({
    queryKey: queryKeys.platformBranchSettings,
    queryFn: async () => {
      const res = await api.get<PlatformBranchSettings>("/company/me/branch/settings");
      return res.data;
    },
  });
}

export function useUpdateBranchSettingsPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<PlatformBranchSettings>) => {
      const res = await api.patch<PlatformBranchSettings>(
        "/company/me/branch/settings",
        patch,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "branch", "settings"] });
      toast.success("تم تحديث الإعدادات");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
