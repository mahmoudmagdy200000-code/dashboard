import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type { Page } from "../types";
import type {
  CloseShiftResponse,
  Shift,
  ShiftConfig,
  ShiftConfigPayload,
  ShiftsLiveResponse,
} from "../types/company";
import { getErrorMessage } from "../errors";
import { queryKeys, type ShiftFilter } from "./keys";

// ─── Live board + KPIs (T08 §3) — { active[], overdue[], kpis } (not paginated) ─
export function useShiftsLive() {
  return useQuery({
    queryKey: queryKeys.shiftsLive,
    queryFn: async () => {
      const res = await api.get<ShiftsLiveResponse>("/accountant/shifts/live");
      return res.data;
    },
    staleTime: 15_000,
  });
}

// ─── Closed-shift history (T08 §3) — paginated ───────────────────────────────
export function useShiftsHistory(filter: ShiftFilter = {}) {
  const clean = Object.fromEntries(
    Object.entries(filter).filter(([, v]) => v !== undefined && v !== "" && v !== "all"),
  );
  return useQuery({
    queryKey: queryKeys.shifts(filter),
    queryFn: async () => {
      const res = await api.get<Page<Shift>>("/accountant/shifts/history", {
        params: clean,
      });
      return res.data;
    },
  });
}

// ─── Config (T08 §1) ─────────────────────────────────────────────────────────
export function useShiftConfigs(scope?: "brand" | "branch" | "all") {
  return useQuery({
    queryKey: [...queryKeys.shiftConfigs, scope ?? "brand"] as const,
    queryFn: async () => {
      const res = await api.get<
        { data: ShiftConfig[] } | ShiftConfig[]
      >("/company/me/shifts/configs", { params: scope ? { scope } : undefined });
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
    staleTime: 60_000,
  });
}

// 2026-08-09 — assign a shift schedule at the BRANCH level (overrides the brand's).
// Same body as the brand endpoint; a branch override wins over the brand schedule.
export function useSaveBranchShiftConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      branchId,
      config,
    }: {
      branchId: string;
      config: ShiftConfigPayload;
    }) => {
      const res = await api.put<ShiftConfig>(
        `/company/me/branches/${branchId}/shift-config`,
        config,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.shiftConfigs });
      toast.success("تم حفظ إعدادات شفت الفرع");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

export function useSaveShiftConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      brandId,
      config,
    }: {
      brandId: string;
      config: ShiftConfigPayload;
    }) => {
      const res = await api.put<ShiftConfig>(
        `/company/me/brands/${brandId}/shift-config`,
        config,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.shiftConfigs });
      toast.success("تم حفظ إعدادات الشفت");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Open (T08 §2) — branch role ─────────────────────────────────────────────
export function useOpenShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      cashierEmpNumber?: string;
      cashierId?: string;
      openingCashHalalas?: number;
    } = {}) => {
      const res = await api.post<Shift>("/company/me/branch/shifts/open", body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("تم فتح الشفت");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Close (T08 §5) — expected cash is server-derived; never send salesSystem ─
export function useCloseShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shiftId,
      cashActualHalalas,
      cardTotalHalalas,
      aggregatorTotalsHalalas,
      notes,
    }: {
      shiftId: string;
      cashActualHalalas: number;
      cardTotalHalalas?: number;
      aggregatorTotalsHalalas?: number;
      notes?: string;
    }) => {
      const res = await api.post<CloseShiftResponse>(
        `/company/me/shifts/${shiftId}/close`,
        { cashActualHalalas, cardTotalHalalas, aggregatorTotalsHalalas, notes },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: queryKeys.accDashboard });
      toast.success("تم إغلاق الشفت وإرساله للمراجعة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Cash-gap split (T08 §6) — must sum to |variance|; set before final-approve ─
export function useShiftVarianceAllocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      operationId: _operationId,
      shiftId,
      allocations,
    }: {
      /** Cache key only; the endpoint identifies the operation through shiftId. */
      operationId: string;
      shiftId: string;
      allocations: Array<{ employeeId?: string; empNumber?: string; amountHalalas: number }>;
    }) => {
      const res = await api.post<{ operationId: string; allocations: Array<{ employeeId: string; employeeName: string; amountHalalas: number }> }>(
        `/company/me/shifts/${shiftId}/variance-allocations`,
        { allocations },
      );
      return res.data;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: queryKeys.operation(vars.operationId) });
      toast.success("تم توزيع فرق الكاش");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── Excel (T08 §7) — binary stream, branch-scoped ───────────────────────────
export function useExportShifts() {
  return useMutation({
    mutationFn: async (
      filter: ShiftFilter & { format?: "xlsx" | "csv" } = {},
    ) => {
      const fmt = filter.format ?? "xlsx";
      await downloadBlob("/company/me/shifts/export", `shifts.${fmt}`, {
        ...filter,
        format: fmt,
      });
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
