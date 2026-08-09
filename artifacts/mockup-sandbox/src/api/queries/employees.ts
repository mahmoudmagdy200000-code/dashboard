import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, downloadBlob } from "../client";
import type { Page } from "../types";
import type {
  Employee,
  EmployeeMovementInput,
  EmployeeStatement,
  SettleBalanceResult,
} from "../types/company";
import { getErrorMessage } from "../errors";
import { queryKeys, type EmployeeFilter } from "./keys";

// ─── A1. List — GET /company/me/employees (paginated, +balance chip) ──────────
export function useEmployees(filter: EmployeeFilter = {}) {
  const clean = Object.fromEntries(
    Object.entries(filter).filter(([, v]) => v !== undefined && v !== "" && v !== "all"),
  );
  return useQuery({
    queryKey: queryKeys.employees(filter),
    queryFn: async () => {
      const res = await api.get<Page<Employee>>("/company/me/employees", {
        params: clean,
      });
      return res.data;
    },
  });
}

// ─── A2. Statement — GET /company/me/employees/{id}/movements?month= ──────────
// Canonical portal alias of /accountant/employees/{id}/statement (identical payload).
// `month` optional (omit = all history). Rows newest-first, each with runningBalanceHalalas.
export function useEmployeeMovements(
  employeeId: string | null | undefined,
  month?: string,
) {
  const params = Object.fromEntries(
    Object.entries({ month }).filter(([, v]) => v !== undefined && v !== ""),
  );
  return useQuery({
    queryKey: queryKeys.employeeMovements(employeeId ?? "", month),
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const res = await api.get<EmployeeStatement>(
        `/company/me/employees/${employeeId}/movements`,
        { params },
      );
      return res.data;
    },
  });
}

// ─── A3. Add movement — POST /accountant/employees/{id}/movements ─────────────
// category is required and must be a manual key; system keys → 422.
export function useCreateEmployeeMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      payload,
    }: {
      employeeId: string;
      payload: EmployeeMovementInput;
    }) => {
      const res = await api.post(
        `/accountant/employees/${employeeId}/movements`,
        payload,
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["employees", vars.employeeId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم تسجيل الحركة");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── A4. Settle balance — POST /company/me/employees/{id}/settle-balance ──────
// Omit amountHalalas = clear the whole standing balance. Balance 0 → 409.
export function useSettleEmployeeBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      amountHalalas,
    }: {
      employeeId: string;
      amountHalalas?: number;
    }) => {
      const res = await api.post<SettleBalanceResult>(
        `/company/me/employees/${employeeId}/settle-balance`,
        amountHalalas !== undefined ? { amountHalalas } : {},
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["employees", vars.employeeId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تمت تسوية الرصيد");
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── A5a. Per-employee statement export ───────────────────────────────────────
export function useExportEmployeeStatement() {
  return useMutation({
    mutationFn: async ({
      employeeId,
      month,
      format = "xlsx",
    }: {
      employeeId: string;
      month?: string;
      format?: "xlsx" | "csv" | "pdf";
    }) => {
      await downloadBlob(
        `/company/me/employees/${employeeId}/statement/export`,
        `employee-${employeeId}${month ? `-${month}` : ""}.${format}`,
        { month, format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}

// ─── A5b. Payroll export — Net = salary − Σdebits + Σcredits ──────────────────
export function useExportPayroll() {
  return useMutation({
    mutationFn: async (
      arg: string | { month: string; format?: "xlsx" | "csv" },
    ) => {
      const month = typeof arg === "string" ? arg : arg.month;
      const format = typeof arg === "string" ? "xlsx" : (arg.format ?? "xlsx");
      await downloadBlob(
        "/company/me/employees/payroll/export",
        `payroll-${month}.${format}`,
        { month, format },
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });
}
