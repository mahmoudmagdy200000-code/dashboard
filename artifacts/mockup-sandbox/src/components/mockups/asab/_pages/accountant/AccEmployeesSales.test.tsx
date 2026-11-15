import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalWindow } from "happy-dom";
import { api } from "../../../../../api/client";
import {
  loadBranchSalesOperations,
  useBranchSalesOperations,
} from "../../../../../api/queries/operations";
import type { Operation } from "../../../../../api/types";
import type {
  Employee,
  EmployeeStatement,
  Shift,
} from "../../../../../api/types/company";
import type { ShiftCustodyStatement } from "../../../../../api/queries/employees";
import { AuthContext } from "../../../../../auth/AuthContext";
import { LangContext, type Lang } from "../../_shared/LangContext";
import type { PageProps } from "../../_shared/types";
import { AccEmployees } from "./AccEmployees";
import {
  extractManagerCustodyHandovers,
  filterManagerDailySalesOperations,
  groupManagerDailySalesByDay,
  isBranchManagerEmployeeRole,
  isCashierEmployeeRole,
  resolveCashierShifts,
  totalManagerDailySalesHalalas,
} from "./employeeSalesHelpers";

const window = new GlobalWindow();
Object.assign(globalThis, {
  window,
  document: window.document,
  React,
  IS_REACT_ACT_ENVIRONMENT: true,
});

const flushUi = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 25));
  });
};

const makeLangValue = (lang: Lang) => ({
  lang,
  dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
  setLang: () => {},
  t: <T,>(ar: T, en: T): T => (lang === "ar" ? ar : en),
});

const makeAuthValue = () => ({
  user: {
    id: "acc-user-1",
    name: "QA Accountant",
    email: "qa-acc@example.com",
    companyId: "comp-1",
    roles: [
      {
        key: "accountant" as const,
        scope: "all" as const,
        brandIds: [],
        restaurantIds: [],
        branchIds: [],
        moduleKeys: [],
      },
    ],
    permissions: {},
  },
  financialTransition: false,
  initializing: false,
  loggingIn: false,
  defaultPage: "acc-employees",
  login: async () => {
    throw new Error("not used");
  },
  loginWith2fa: async () => {
    throw new Error("not used");
  },
  logout: async () => {},
  refreshMe: async () => {},
  hasPermission: () => true,
  isRole: (...roles: string[]) => roles.includes("accountant"),
});

const dummyPageProps: PageProps = {
  role: "accountant",
  ops: [],
  detailId: null,
  navigate: () => {},
  setDetailId: () => {},
  setModal: () => {},
  approveOp: () => {},
  rejectOp: () => {},
  finalApproveOp: () => {},
  bulkApprove: () => {},
};

const qaCashierA: Employee = {
  id: "emp-cashier-a",
  empNumber: "EMP-101",
  phone: "0500000101",
  name: "QA Cashier A",
  role: "cashier",
  branchId: "branch-qa-1",
  branchName: "QA Handover Branch",
  monthlySalary: 0,
  balanceHalalas: 0,
  balanceCaption: {
    key: "settled",
    labelAr: "لا يوجد رصيد",
  },
  status: "active",
};

const arabicCashier: Employee = {
  id: "emp-cashier-ar",
  empNumber: "EMP-102",
  phone: "0500000102",
  name: "كاشير المساء",
  role: "كاشير",
  branchId: "branch-qa-1",
  branchName: "QA Handover Branch",
  monthlySalary: 300000,
  balanceHalalas: 0,
  balanceCaption: {
    key: "settled",
    labelAr: "لا يوجد رصيد",
  },
  status: "active",
};

const qaManager: Employee = {
  id: "emp-manager-1",
  empNumber: "EMP-103",
  phone: "0500000103",
  name: "QA Manager",
  role: "مدير فرع",
  branchId: "branch-qa-1",
  branchName: "QA Handover Branch",
  monthlySalary: 0,
  balanceHalalas: -500,
  balanceCaption: {
    key: "owed_by_employee",
    labelAr: "مديون للشركة",
  },
  status: "active",
};

function makeShift(overrides: Partial<Shift>): Shift {
  return {
    id: "sh-1",
    branchId: "branch-qa-1",
    branchName: "QA Handover Branch",
    cashierEmployeeId: qaCashierA.id,
    cashierName: qaCashierA.name,
    role: "cashier",
    shiftType: "first",
    shiftNo: 1,
    startedAt: "2026-11-15T06:00:00Z",
    endedAt: "2026-11-15T14:00:00Z",
    status: "pending_review",
    isLate: false,
    ordersCount: 10,
    salesHalalas: 100000,
    openingFloatHalalas: 0,
    cashActualHalalas: 40000,
    cashExpectedHalalas: 40000,
    varianceHalalas: 0,
    cashCountState: "counted",
    reportReview: { operation_id: "op-sh-1", public_id: "SHF-1001" },
    ...overrides,
  };
}

function makeSalesOp(overrides: Partial<Operation>): Operation {
  return {
    id: "op-sal-1",
    publicId: "SAL-0001",
    moduleKey: "sales",
    status: "pending",
    branchId: "branch-qa-1",
    branchName: "QA Handover Branch",
    amountHalalas: 150000,
    operationDate: "2026-11-14",
    submittedAt: "2026-11-14T22:00:00Z",
    createdAt: "2026-11-14T22:00:00Z",
    updatedAt: "2026-11-14T22:00:00Z",
    ...overrides,
  };
}

test("role normalization supports English and Arabic cashier and branch manager roles", () => {
  assert.equal(isCashierEmployeeRole("cashier"), true);
  assert.equal(isCashierEmployeeRole("كاشير"), true);
  assert.equal(isCashierEmployeeRole("كاشير رئيسي"), true);
  assert.equal(isCashierEmployeeRole("مدير فرع"), false);

  assert.equal(isBranchManagerEmployeeRole("branch_manager"), true);
  assert.equal(isBranchManagerEmployeeRole("مدير فرع"), true);
  assert.equal(isBranchManagerEmployeeRole("مدير الفرع"), true);
  assert.equal(isBranchManagerEmployeeRole("cashier"), false);

  const shiftsMap: Record<string, Shift[]> = {
    "emp-cashier-a": [makeShift({ id: "s-emp", salesHalalas: 100000 })],
    "cashier-identity-9": [
      makeShift({ id: "s-linked", cashierEmployeeId: "cashier-identity-9", salesHalalas: 200000 }),
    ],
    "other-cashier": [makeShift({ id: "s-other", cashierEmployeeId: "other-cashier", salesHalalas: 99900 })],
  };

  const resolved = resolveCashierShifts(shiftsMap, qaCashierA, {
    employee_id: qaCashierA.id,
    linked_type: "cashier",
    linked_id: "cashier-identity-9",
  });
  assert.deepEqual(
    resolved?.map((s) => s.id).sort(),
    ["s-emp", "s-linked"],
  );
});

test("loadBranchSalesOperations paginates, hydrates multi-manager attribution, and rejects rejected/unassigned rows", async () => {
  const opDay1 = makeSalesOp({
    id: "op-sal-1",
    publicId: "SAL-0011",
    operationDate: "2026-11-14",
    amountHalalas: 100000,
    status: "final-approved",
  });
  const opDay2 = makeSalesOp({
    id: "op-sal-2",
    publicId: "SAL-0012",
    operationDate: "2026-11-15",
    amountHalalas: 250000,
    status: "pending",
  });
  const opRejected = makeSalesOp({
    id: "op-sal-rej",
    publicId: "SAL-0013",
    operationDate: "2026-11-15",
    amountHalalas: 90000,
    status: "rejected",
  });

  const detailCalls: string[] = [];
  const loaded = await loadBranchSalesOperations(
    "branch-qa-1",
    async (page) =>
      page === 1
        ? {
            data: [opDay1, opRejected],
            meta: { page: 1, totalPages: 2, pageSize: 50, total: 3 },
          }
        : {
            data: [opDay2],
            meta: { page: 2, totalPages: 2, pageSize: 50, total: 3 },
          },
    async (id) => {
      detailCalls.push(id);
      return id === "op-sal-1"
        ? ({
            ...opDay1,
            payload: { managerName: "QA Manager" },
          } as Operation)
        : ({
            ...opDay2,
            payload: { managerName: "Other Manager" },
          } as Operation);
    },
  );

  assert.deepEqual(detailCalls, ["op-sal-1", "op-sal-2"]);
  const qaMgrOps = filterManagerDailySalesOperations(loaded, qaManager, 2);
  assert.deepEqual(
    qaMgrOps?.map((o) => o.id),
    ["op-sal-1"],
  );
  assert.equal(totalManagerDailySalesHalalas(qaMgrOps), 100000);
  assert.equal(
    totalManagerDailySalesHalalas([makeSalesOp({ amountHalalas: null })]),
    null,
  );

  const grouped = groupManagerDailySalesByDay([opDay1, opDay2, opRejected]);
  assert.deepEqual(
    grouped.map((g) => ({ date: g.date, totalHalalas: g.totalHalalas })),
    [
      { date: "2026-11-15", totalHalalas: 250000 },
      { date: "2026-11-14", totalHalalas: 100000 },
    ],
  );
});

test("AccEmployees shows immediate cashier shift sales + totals and branch manager day-by-day deliveries + totals", async () => {
  const originalGet = api.get.bind(api);
  const shifts: Shift[] = [
    makeShift({
      id: "sh-1",
      salesHalalas: 100000,
      status: "pending_review",
      endedAt: "2026-11-13T15:00:00Z",
      reportReview: { operation_id: "op-1", public_id: "SHF-0001" },
    }),
    makeShift({
      id: "sh-2",
      salesHalalas: 200000,
      status: "pending_review",
      endedAt: "2026-11-14T15:00:00Z",
      reportReview: { operation_id: "op-2", public_id: "SHF-0002" },
    }),
    makeShift({
      id: "sh-3",
      salesHalalas: 300000,
      status: "closed",
      endedAt: "2026-11-15T15:00:00Z",
      reportReview: { operation_id: "op-3", public_id: "SHF-0003" },
    }),
    makeShift({
      id: "sh-ar",
      cashierEmployeeId: arabicCashier.id,
      cashierName: arabicCashier.name,
      salesHalalas: 125000,
      status: "pending_review",
      reportReview: { operation_id: "op-4", public_id: "SHF-0004" },
    }),
  ];

  const salesOps: Operation[] = [
    makeSalesOp({
      id: "op-day-1",
      publicId: "SAL-0101",
      operationDate: "2026-11-14",
      amountHalalas: 150000,
      status: "final-approved",
    }),
    makeSalesOp({
      id: "op-day-2",
      publicId: "SAL-0102",
      operationDate: "2026-11-15",
      amountHalalas: 250000,
      status: "pending",
    }),
    makeSalesOp({
      id: "op-day-rej",
      publicId: "SAL-0103",
      operationDate: "2026-11-15",
      amountHalalas: 500000,
      status: "rejected",
    }),
  ];

  const statementsByEmployee: Record<string, Partial<EmployeeStatement>> = {
    [qaCashierA.id]: {
      employee: qaCashierA,
      openingBalanceHalalas: 0,
      totalCredit: 0,
      totalDebit: 0,
      closingBalanceHalalas: 0,
      balanceHalalas: 0,
      movements: [],
    },
    [arabicCashier.id]: {
      employee: arabicCashier,
      openingBalanceHalalas: 0,
      totalCredit: 0,
      totalDebit: 0,
      closingBalanceHalalas: 0,
      balanceHalalas: 0,
      movements: [],
    },
    [qaManager.id]: {
      employee: qaManager,
      openingBalanceHalalas: 0,
      totalCredit: 0,
      totalDebit: 500,
      closingBalanceHalalas: -500,
      balanceHalalas: -500,
      hasDebitBalance: true,
      movements: [
        {
          id: "mov-1",
          movementType: "debit",
          category: "receipts_shortage",
          amountHalalas: 500,
          description: "خصم فرق كاش · CSH-JOQCD9",
          date: "2026-11-15",
        } as unknown as EmployeeStatement["movements"][number],
      ],
    },
  };

  const custodyByEmployee: Record<string, ShiftCustodyStatement> = {
    [qaManager.id]: {
      unit: "halala",
      identity_link_state: "linked",
      identity: {
        employee_id: qaManager.id,
        name: qaManager.name,
        role: qaManager.role,
        linked_type: "branch_manager",
        linked_id: "bm-1",
        branch_id: qaManager.branchId,
        branch_name: qaManager.branchName,
      },
      period: { from: null, to: null },
      balances: {
        is_available: true,
        opening_balance: 0,
        closing_balance: 50000,
        total_cash_in: 400000,
        total_cash_out: 350000,
        net_period_change: 50000,
      },
      entries: [
        {
          source_type: "personal_ledger",
          source_id: "pl-1",
          event_at: "2026-11-15T18:00:00Z",
          business_date: "2026-11-15",
          branch: { id: qaManager.branchId, name: qaManager.branchName },
          transaction_type: "Transfer to Custody",
          classification: "transfer_to_custody",
          label_ar: "تحويل لعهدة الفرع",
          label_en: "Transfer to custody",
          source_shift_id: null,
          receiving_shift_id: null,
          receipt_id: null,
          counterparty: { type: "custody", id: "cus-1", name: "عهدة الفرع" },
          cash_in: 0,
          cash_out: 350000,
          running_balance: 50000,
          confirmation_state: "confirmed",
          lineage_key: null,
          reversal_id: null,
        },
      ],
      pending: [],
      pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    },
  };

  api.get = (async (url: string) => {
    if (url === "/company/me/employees") {
      return {
        data: {
          data: [qaCashierA, arabicCashier, qaManager],
          meta: { page: 1, pageSize: 50, total: 3, totalPages: 1 },
        },
      };
    }
    if (url === "/accountant/shifts/history") {
      return {
        data: {
          data: shifts,
          meta: { page: 1, pageSize: 50, total: shifts.length, totalPages: 1 },
        },
      };
    }
    if (url === "/operations") {
      return {
        data: {
          data: salesOps,
          meta: { page: 1, pageSize: 50, total: salesOps.length, totalPages: 1 },
        },
      };
    }
    const movMatch = /^\/company\/me\/employees\/([^/]+)\/movements$/.exec(url);
    if (movMatch) {
      return { data: statementsByEmployee[movMatch[1]] };
    }
    const custMatch = /^\/company\/me\/employees\/([^/]+)\/shift-custody-statement$/.exec(url);
    if (custMatch) {
      return {
        data: custodyByEmployee[custMatch[1]] ?? {
          unit: "halala",
          identity_link_state: "unlinked",
          identity: {
            employee_id: custMatch[1],
            name: "",
            role: "",
            linked_type: null,
            linked_id: null,
            branch_id: null,
            branch_name: null,
          },
          period: { from: null, to: null },
          balances: {
            is_available: false,
            opening_balance: null,
            closing_balance: null,
            total_cash_in: null,
            total_cash_out: null,
            net_period_change: null,
          },
          entries: [],
          pending: [],
          pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
        },
      };
    }
    return { data: { data: [] } };
  }) as typeof api.get;

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={makeAuthValue()}>
            <LangContext.Provider value={makeLangValue("en")}>
              <AccEmployees {...dummyPageProps} />
            </LangContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );
    });
    await flushUi();

    const listText = container.textContent ?? "";
    // List shows immediate cashier totals (including Arabic role "كاشير") and manager daily total (excluding rejected)
    assert.match(listText, /QA Cashier A/);
    assert.match(listText, /6,000\.00/);
    assert.match(listText, /1,250\.00/);
    assert.match(listText, /4,000\.00/);
    assert.doesNotMatch(listText, /9,000\.00/);

    // Click QA Cashier A -> side statement displays 6,000.00 total and all 3 shifts (1000, 2000, 3000)
    const cashierBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("QA Cashier A"),
    );
    assert.ok(cashierBtn);
    await act(async () => cashierBtn.click());
    await flushUi();

    const cashierSummary = container.querySelector('[data-testid="statement-delivered-sales-summary"]');
    assert.match(cashierSummary?.textContent ?? "", /6,000\.00 SAR/);
    const sideStatementCard = Array.from(container.querySelectorAll(".space-y-4")).find((el) =>
      (el.textContent ?? "").includes("كشف حساب: QA Cashier A"),
    );
    assert.ok(sideStatementCard, "side statement card rendered for QA Cashier A");
    assert.match(sideStatementCard.textContent ?? "", /1,000\.00/);
    assert.match(sideStatementCard.textContent ?? "", /2,000\.00/);
    assert.match(sideStatementCard.textContent ?? "", /3,000\.00/);
    assert.doesNotMatch(sideStatementCard.textContent ?? "", /1,250\.00/);

    // Click Arabic cashier -> recognized despite role === "كاشير"
    const arCashierBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("كاشير المساء"),
    );
    assert.ok(arCashierBtn);
    await act(async () => arCashierBtn.click());
    await flushUi();

    const arSummary = container.querySelector('[data-testid="statement-delivered-sales-summary"]');
    assert.match(arSummary?.textContent ?? "", /1,250\.00 SAR/);

    // Click QA Manager ("مدير فرع") -> side panel shows day-by-day handed-over breakdown + 4,000.00 total + custody handover + debit alert preserved
    const managerBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("QA Manager"),
    );
    assert.ok(managerBtn);
    await act(async () => managerBtn.click());
    await flushUi();

    const managerSummary = container.querySelector('[data-testid="statement-delivered-sales-summary"]');
    assert.match(managerSummary?.textContent ?? "", /4,000\.00 SAR/);
    const managerSection = container.querySelector('[data-testid="manager-delivered-sales-section"]');
    assert.match(managerSection?.textContent ?? "", /November 15, 2026/);
    assert.match(managerSection?.textContent ?? "", /2,500\.00 SAR/);
    assert.match(managerSection?.textContent ?? "", /November 14, 2026/);
    assert.match(managerSection?.textContent ?? "", /1,500\.00 SAR/);
    assert.match(managerSection?.textContent ?? "", /Grand total \(2 days\)/);
    assert.match(managerSection?.textContent ?? "", /3,500\.00 SAR/);
    assert.match(container.textContent ?? "", /خصم فرق كاش/);
    assert.match(container.textContent ?? "", /Debit balance recorded on employee statement for settlement per company policy/);
  } finally {
    api.get = originalGet;
    await act(async () => root.unmount());
    container.remove();
  }
});

test("extractManagerCustodyHandovers isolates outgoing manager deliveries and pending handovers", () => {
  const summary = extractManagerCustodyHandovers({
    unit: "halala",
    identity_link_state: "linked",
    identity: {
      employee_id: "m-1",
      name: "Manager",
      role: "مدير فرع",
      linked_type: "branch_manager",
      linked_id: "bm-1",
      branch_id: "b-1",
      branch_name: "Branch 1",
    },
    period: { from: null, to: null },
    balances: {
      is_available: true,
      opening_balance: 0,
      closing_balance: 0,
      total_cash_in: 500000,
      total_cash_out: 300000,
      net_period_change: 200000,
    },
    entries: [
      {
        source_type: "personal_ledger",
        source_id: "in-1",
        event_at: "2026-11-15T10:00:00Z",
        business_date: "2026-11-15",
        branch: { id: "b-1", name: "Branch 1" },
        transaction_type: "Total Sales",
        classification: "handover_received",
        label_ar: "استلام من كاشير",
        label_en: "Received from cashier",
        source_shift_id: null,
        receiving_shift_id: null,
        receipt_id: "r-1",
        counterparty: { type: null, id: null, name: null },
        cash_in: 500000,
        cash_out: 0,
        running_balance: 500000,
        confirmation_state: "confirmed",
        lineage_key: null,
        reversal_id: null,
      },
      {
        source_type: "personal_ledger",
        source_id: "out-1",
        event_at: "2026-11-15T20:00:00Z",
        business_date: "2026-11-15",
        branch: { id: "b-1", name: "Branch 1" },
        transaction_type: "Handover to Brand Owner",
        classification: "handover_sent",
        label_ar: "تسليم لمالك العلامة",
        label_en: "Handover to brand owner",
        source_shift_id: null,
        receiving_shift_id: null,
        receipt_id: null,
        counterparty: { type: "brand_owner", id: "bo-1", name: "Owner" },
        cash_in: 0,
        cash_out: 300000,
        running_balance: 200000,
        confirmation_state: "confirmed",
        lineage_key: null,
        reversal_id: null,
      },
    ],
    pending: [
      {
        request_type: "handover_sent",
        request_id: "req-1",
        created_at: "2026-11-15T21:00:00Z",
        business_date: "2026-11-15",
        amount: 100000,
        counterparty: { type: null, id: null, name: null },
        source_shift_id: null,
        status: "pending",
      },
    ],
    pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
  });

  assert.equal(summary.confirmedTotalHalalas, 300000);
  assert.equal(summary.pendingTotalHalalas, 100000);
  assert.deepEqual(
    summary.confirmedEntries.map((e) => e.source_id),
    ["out-1"],
  );
  assert.deepEqual(
    summary.pendingRequests.map((p) => p.request_id),
    ["req-1"],
  );
});

test("AccEmployees falls back to custody handover total when manager has 0 daily sales ops and handles sales fetch retry", async () => {
  const originalGet = api.get.bind(api);
  let failOps = true;
  api.get = (async (url: string) => {
    if (url === "/company/me/employees") {
      return {
        data: {
          data: [qaManager],
          meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
        },
      };
    }
    if (url === "/operations") {
      if (failOps) {
        failOps = false;
        throw new Error("Network failure");
      }
      return {
        data: {
          data: [],
          meta: { page: 1, pageSize: 50, total: 0, totalPages: 1 },
        },
      };
    }
    if (url === `/company/me/employees/${qaManager.id}/movements`) {
      return {
        data: {
          employee: qaManager,
          openingBalanceHalalas: 0,
          totalCredit: 0,
          totalDebit: 0,
          closingBalanceHalalas: 0,
          balanceHalalas: 0,
          movements: [],
        } satisfies Partial<EmployeeStatement>,
      };
    }
    if (url === `/company/me/employees/${qaManager.id}/shift-custody-statement`) {
      return {
        data: {
          unit: "halala",
          identity_link_state: "linked",
          identity: {
            employee_id: qaManager.id,
            name: qaManager.name,
            role: qaManager.role,
            linked_type: "branch_manager",
            linked_id: "bm-1",
            branch_id: qaManager.branchId,
            branch_name: qaManager.branchName,
          },
          period: { from: null, to: null },
          balances: {
            is_available: true,
            opening_balance: 0,
            closing_balance: 0,
            total_cash_in: 220000,
            total_cash_out: 220000,
            net_period_change: 0,
          },
          entries: [
            {
              source_type: "personal_ledger",
              source_id: "bo-handover-1",
              event_at: "2026-11-15T20:00:00Z",
              business_date: "2026-11-15",
              branch: { id: qaManager.branchId, name: qaManager.branchName },
              transaction_type: "Handover to Brand Owner",
              classification: "handover_sent",
              label_ar: "تسليم لمالك العلامة",
              label_en: "Handover to brand owner",
              source_shift_id: null,
              receiving_shift_id: null,
              receipt_id: null,
              counterparty: { type: "brand_owner", id: "bo-1", name: "Owner" },
              cash_in: 0,
              cash_out: 220000,
              running_balance: 0,
              confirmation_state: "confirmed",
              lineage_key: null,
              reversal_id: null,
            },
          ],
          pending: [],
          pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
        } satisfies ShiftCustodyStatement,
      };
    }
    return { data: { data: [] } };
  }) as typeof api.get;

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={makeAuthValue()}>
            <LangContext.Provider value={makeLangValue("ar")}>
              <AccEmployees {...dummyPageProps} />
            </LangContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );
    });
    await flushUi();

    const managerBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("QA Manager"),
    );
    assert.ok(managerBtn);
    await act(async () => managerBtn.click());
    await flushUi();

    const retryBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("إعادة المحاولة"),
    );
    assert.ok(retryBtn, "error state displays retry button");
    await act(async () => retryBtn.click());
    await flushUi();

    const summary = container.querySelector('[data-testid="statement-delivered-sales-summary"]');
    assert.match(summary?.textContent ?? "", /٢٬٢٠٠٫٠٠|2,200\.00/);
    const custodySection = container.querySelector('[data-testid="manager-custody-handovers-section"]');
    assert.match(custodySection?.textContent ?? "", /تسليم لمالك العلامة/);
  } finally {
    api.get = originalGet;
    await act(async () => root.unmount());
    container.remove();
  }
});

void useBranchSalesOperations;
