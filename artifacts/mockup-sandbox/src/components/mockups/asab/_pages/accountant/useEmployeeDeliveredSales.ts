import { useEmployeeClosedShiftHistory } from "../../../../../api/queries/shifts";
import { useBranchSalesOperations } from "../../../../../api/queries/operations";
import type { ShiftCustodyStatement } from "../../../../../api/queries/employees";
import { totalClosedShiftSales } from "../../../../../api/queries/shifts";
import type { Employee } from "../../../../../api/types/company";
import {
  countBranchManagersByBranch,
  extractManagerCustodyHandovers,
  filterManagerDailySalesOperations,
  isBranchManagerEmployeeRole,
  isCashierEmployeeRole,
  resolveCashierShifts,
  totalManagerDailySalesHalalas,
} from "./employeeSalesHelpers";

/**
 * Shared hook loading cashier closed/pending_review shift sales and branch-manager
 * daily delivered sales across employee lists in both Accountant and Company dashboards.
 */
export function useEmployeeDeliveredSales(
  employees: readonly Employee[],
  selectedEmployee: Employee | null | undefined,
  selectedCustody: ShiftCustodyStatement | null | undefined,
) {
  const selectedIdentity = selectedCustody?.identity;
  const managerCountsByBranch = countBranchManagersByBranch(employees);

  const cashierBranchIds = [
    ...new Set(
      employees
        .filter((e) => isCashierEmployeeRole(e.role) && e.branchId)
        .map((e) => e.branchId),
    ),
  ];
  if (
    selectedEmployee?.branchId &&
    selectedIdentity?.linked_type === "cashier" &&
    !cashierBranchIds.includes(selectedEmployee.branchId)
  ) {
    cashierBranchIds.push(selectedEmployee.branchId);
  }

  const managerBranchIds = [
    ...new Set(
      employees
        .filter((e) => isBranchManagerEmployeeRole(e.role) && e.branchId)
        .map((e) => e.branchId),
    ),
  ];
  if (
    selectedEmployee?.branchId &&
    selectedIdentity?.linked_type === "branch_manager" &&
    !managerBranchIds.includes(selectedEmployee.branchId)
  ) {
    managerBranchIds.push(selectedEmployee.branchId);
  }

  const resolveDetailsByBranch = Object.fromEntries(
    managerBranchIds.map((branchId) => [
      branchId,
      (managerCountsByBranch[branchId] ?? 0) > 1,
    ]),
  );

  const branchShiftHistory = useEmployeeClosedShiftHistory(cashierBranchIds);
  const branchSalesOps = useBranchSalesOperations(
    managerBranchIds,
    resolveDetailsByBranch,
  );

  const getEmployeeSales = (employee: Employee) => {
    const isSelected = selectedEmployee?.id === employee.id;
    const identity = isSelected ? selectedIdentity : undefined;
    const custody = isSelected ? selectedCustody : undefined;
    const isCashier = isCashierEmployeeRole(employee.role, identity?.linked_type);
    const isManager = isBranchManagerEmployeeRole(
      employee.role,
      identity?.linked_type,
    );
    const shiftQuery = employee.branchId
      ? branchShiftHistory.get(employee.branchId)
      : undefined;
    const cashierShifts =
      isCashier && shiftQuery?.isSuccess
        ? resolveCashierShifts(shiftQuery.data, employee, identity)
        : undefined;
    const salesQuery = employee.branchId
      ? branchSalesOps.get(employee.branchId)
      : undefined;
    const managerOps =
      isManager && salesQuery?.isSuccess
        ? filterManagerDailySalesOperations(
            salesQuery.data,
            employee,
            managerCountsByBranch[employee.branchId] ?? 1,
          )
        : undefined;

    const managerOpsTotal = totalManagerDailySalesHalalas(managerOps);
    const managerCustodySummary = extractManagerCustodyHandovers(custody);
    const deliveredTotalHalalas = isCashier
      ? totalClosedShiftSales(cashierShifts)
      : isManager
        ? managerOpsTotal === 0 &&
          custody &&
          managerCustodySummary.confirmedTotalHalalas > 0
          ? managerCustodySummary.confirmedTotalHalalas
          : managerOpsTotal
        : null;

    return {
      identity,
      custody,
      isCashier,
      isManager,
      shiftQuery,
      cashierShifts,
      salesQuery,
      managerOps,
      deliveredTotalHalalas,
    };
  };

  return {
    getEmployeeSales,
    selectedSales: selectedEmployee ? getEmployeeSales(selectedEmployee) : null,
  };
}
