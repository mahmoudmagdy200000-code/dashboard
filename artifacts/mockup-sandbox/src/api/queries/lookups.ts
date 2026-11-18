import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import type { LookupRow, Page } from "../types";
import type {
  Employee,
  OperationEnumsCatalogue,
  RejectionReasonOption,
} from "../types/company";
import { queryKeys, type LookupType } from "./keys";

export function useLookup(type: LookupType, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.lookup(type, params),
    queryFn: async () => {
      const res = await api.get<LookupRow[]>(`/company/me/lookups/${type}`, {
        params,
      });
      return res.data;
    },
    staleTime: 5 * 60_000, // lookups change infrequently
  });
}

// Branch-scoped employee auto-fill by employee number (T04 §7).
// Returns { empNumber, name }; 404s when unknown or in another branch.
export interface EmployeeLookupResult {
  id?: string;
  employeeId?: string;
  empNumber: string;
  name: string;
}

export function useBranchEmployeesLookup(
  branchId: string | null | undefined,
  empNumber?: string | null,
) {
  const trimmed = empNumber?.trim() ?? "";
  return useQuery({
    queryKey: ["lookups", "branch-employees", branchId, trimmed] as const,
    enabled: Boolean(branchId) && Boolean(trimmed),
    retry: false, // an unknown number → 404, don't hammer
    queryFn: async () => {
      const res = await api.get<EmployeeLookupResult>(
        `/company/me/branches/${branchId}/employees/lookup`,
        { params: { empNumber: trimmed } },
      );
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export type BranchEmployeeNumberResolution =
  | { status: "idle"; employee: null }
  | { status: "resolved"; employee: { id: string; empNumber: string; name: string } }
  | { status: "not_found"; employee: null }
  | { status: "duplicate"; employee: null };

export function resolveBranchEmployeeMatch(
  employees: readonly Pick<Employee, "id" | "empNumber" | "name" | "status" | "branchId">[],
  branchId: string | null | undefined,
  empNumber: string | null | undefined,
): BranchEmployeeNumberResolution {
  const trimmed = empNumber?.trim() ?? "";
  if (!branchId || !trimmed) return { status: "idle", employee: null };
  const matches = employees.filter(
    (emp) =>
      emp.status === "active" &&
      emp.empNumber.trim() === trimmed &&
      (!emp.branchId || emp.branchId === branchId),
  );
  if (matches.length === 0) return { status: "not_found", employee: null };
  if (matches.length > 1) return { status: "duplicate", employee: null };
  const match = matches[0];
  return {
    status: "resolved",
    employee: { id: match.id, empNumber: match.empNumber, name: match.name },
  };
}

/**
 * Branch-scoped employee resolution returning internal UUID + active name for
 * shift shortage allocations (`POST /accountant/shifts/{id}/corrections`).
 */
export function useBranchEmployeeByNumber(
  branchId: string | null | undefined,
  empNumber?: string | null,
) {
  const trimmed = empNumber?.trim() ?? "";
  return useQuery({
    queryKey: ["lookups", "branch-employee-by-number", branchId, trimmed] as const,
    enabled: Boolean(branchId) && trimmed.length > 0,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await api.get<Page<Employee>>("/company/me/employees", {
        params: { branchId, empNumber: trimmed, pageSize: 5 },
      });
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      return resolveBranchEmployeeMatch(rows, branchId, trimmed);
    },
  });
}

// ─── Rejection reasons (T03 §13) ─────────────────────────────────────────────
export function useRejectionReasons(moduleKey?: string) {
  return useQuery({
    queryKey: queryKeys.rejectionReasons(moduleKey),
    queryFn: async () => {
      const res = await api.get<
        { data: RejectionReasonOption[] } | RejectionReasonOption[]
      >("/lookups/rejection-reasons", {
        params: moduleKey ? { moduleKey } : undefined,
      });
      const d = res.data;
      return Array.isArray(d) ? d : (d.data ?? []);
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Operation enum catalogue (T03 §14) — fetch once at boot ─────────────────
export function useOperationEnums() {
  return useQuery({
    queryKey: queryKeys.operationEnums,
    queryFn: async () => {
      const res = await api.get<OperationEnumsCatalogue>(
        "/lookups/operation-enums",
      );
      return res.data;
    },
    staleTime: 30 * 60_000,
  });
}
