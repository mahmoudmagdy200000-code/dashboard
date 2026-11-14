import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalWindow } from "happy-dom";
import type { Shift } from "../../../../../api/types/company";
import { loadEmployeeClosedShifts } from "../../../../../api/queries/shifts";
import { queryKeys } from "../../../../../api/queries/keys";
import { LangContext } from "../../_shared/LangContext";
import { EmployeeClosedShiftSales } from "./EmployeeClosedShiftSales";

const employee = { id: "employee-a", branchId: "branch-a" };
const first: Shift = {
  id: "shift-a", branchId: employee.branchId, branchName: "Test branch",
  cashierEmployeeId: employee.id, cashierName: "Cashier A", role: "cashier",
  shiftNo: 1, shiftType: "Morning", startedAt: "2026-11-14T07:00:00Z",
  endedAt: "2026-11-14T11:00:00Z", status: "pending_review", isLate: false,
  ordersCount: null, salesHalalas: 11500, openingFloatHalalas: 1000,
  cashExpectedHalalas: 5000, cashActualHalalas: 3000, varianceHalalas: -2000,
  reportReview: { operation_id: "report-a", public_id: "SHF-0001" },
};
const second: Shift = { ...first, id: "shift-b", status: "closed", salesHalalas: 420000, reportReview: null };

test("selects the employee’s completed shifts across pages before accountant approval", async () => {
  const rows: Shift[][] = [
    [first, { ...first, id: "other-employee", cashierEmployeeId: "employee-b" },
      { ...first, id: "open", status: "active", endedAt: null }],
    [second, { ...first, id: "other-branch", branchId: "branch-b" },
      { ...first, id: "manager", role: "branch_manager" }],
  ];
  const actual = await loadEmployeeClosedShifts(employee.id, employee.branchId, async page => ({
    data: rows[page - 1], meta: { page, pageSize: 3, total: 6, totalPages: 2 },
  }));
  assert.deepEqual(actual.map(shift => shift.id), [first.id, second.id]);
});

test("shows gross sales immediately and only the selected employee’s assigned share", async () => {
  const window = new GlobalWindow();
  Object.assign(globalThis, { window, document: window.document, React, IS_REACT_ACT_ENVIRONMENT: true });
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  qc.setQueryData(["shifts", "employee-closed", employee.id, employee.branchId], [first, second]);
  qc.setQueryData(queryKeys.operation("report-a"), {
    id: "report-a", branchId: employee.branchId, moduleKey: "shifts", payload: { shiftId: first.id },
    liability: { shares: [
      { type: "cashier", id: "mobile-a", amountHalalas: 1250 },
      { type: "employee", id: "employee-b", amountHalalas: 750 },
    ] },
  });
  const identity = { employee_id: employee.id, branch_id: employee.branchId, name: "Cashier A",
    role: "cashier", linked_type: "cashier", linked_id: "mobile-a", branch_name: "Test branch" };
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  try {
    await act(async () => root.render(
      <QueryClientProvider client={qc}>
        <LangContext.Provider value={{ lang: "en", dir: "ltr", setLang: () => {}, t: (_ar, en) => en }}>
          <EmployeeClosedShiftSales employee={employee} identity={identity} />
        </LangContext.Provider>
      </QueryClientProvider>,
    ));
    const rows = div.querySelectorAll("li");
    assert.equal(rows.length, 2);
    assert.match(rows[0].textContent ?? "", /Shift sales total115\.00 SAR/);
    assert.match(rows[0].textContent ?? "", /Assigned variance 12\.50 SAR/);
    assert.doesNotMatch(rows[0].textContent ?? "", /20\.00|7\.50/);
    assert.match(rows[1].textContent ?? "", /Shift sales total4,200\.00 SAR/);
    assert.doesNotMatch(rows[1].textContent ?? "", /Assigned variance/);
  } finally {
    await act(async () => root.unmount());
    qc.clear();
    await window.happyDOM.close();
  }
});
