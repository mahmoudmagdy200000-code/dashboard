import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalWindow } from "happy-dom";
import { api } from "../../../../../api/client";
import { queryKeys } from "../../../../../api/queries/keys";
import type { Operation as ApiOperation } from "../../../../../api/types";
import type { Employee, Shift } from "../../../../../api/types/company";
import { AuthContext } from "../../../../../auth/AuthContext";
import { LangContext, type Lang } from "../../_shared/LangContext";
import { AccCompanyEmployees, AccCompanySales, CLangContext, OpRow } from "../../CompanyDashboard";
import { apiOpToCOp } from "../../operationMapping";

const window = new GlobalWindow();
Object.assign(globalThis, {
  window,
  document: window.document,
  React,
  Event: window.Event,
  InputEvent: window.InputEvent,
  HTMLInputElement: window.HTMLInputElement,
  HTMLSelectElement: window.HTMLSelectElement,
  HTMLElement: window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});

async function loadCreateRoot() {
  const m = await import("react-dom/client");
  return m.createRoot;
}

const authValue = {
  user: {
    id: "acc-user-1",
    name: "Accountant User",
    email: "acc@assab.test",
    companyId: "company-1",
    roles: [
      {
        key: "accountant" as const,
        scope: "brand" as const,
        brandIds: ["550e8400-e29b-41d4-a716-446655440090"],
        restaurantIds: [],
        branchIds: [],
        moduleKeys: ["sales", "shifts", "employees"],
      },
    ],
    permissions: {},
  },
  initializing: false,
  loggingIn: false,
  defaultPage: "accountant",
  financialTransition: false,
  login: async () => {
    throw new Error("unused");
  },
  loginWith2fa: async () => {
    throw new Error("unused");
  },
  logout: async () => {},
  refreshMe: async () => {},
  hasPermission: () => true,
  isRole: (...roles: string[]) => roles.includes("accountant"),
};

const langCtx = (lang: Lang) => ({
  lang,
  dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
  setLang: () => {},
  t: <T,>(ar: T, en: T): T => (lang === "ar" ? ar : en),
});

const flushUi = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 25));
  });
};

function setInputValue(el: HTMLInputElement, val: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(el, val);
  else el.value = val;
  el.dispatchEvent(new window.Event("input", { bubbles: true }) as unknown as Event);
}

test("FE-03: OpRow exposes Approve/Return/Clarify per shiftPolicy and displays explicit reasons when disabled", async () => {
  const createRoot = await loadCreateRoot();
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });

  const headReturnedApiOp: ApiOperation = {
    id: "op-head-ret",
    publicId: "SHF-2403",
    moduleKey: "shifts",
    status: "pending",
    branchId: "branch-1",
    branchName: "فرع العليا",
    operationDate: "2026-11-16",
    createdAt: "2026-11-16T18:00:00Z",
    updatedAt: "2026-11-16T18:00:00Z",
    submittedAt: "2026-11-16T18:00:00Z",
    amountHalalas: 950000,
    reportReview: { phase: "head_returned", return_reason: "يرجى إرفاق إيصال جهاز مدى" },
    reportRevision: 1,
    allocationVersion: null,
    payload: {
      shiftId: "shf-3",
      reportRevision: 1,
      cashCountState: "counted",
      salesHalalas: 950000,
      cardTotalHalalas: 700000,
      cashActualHalalas: 250000,
      cashExpectedHalalas: 250000,
      pkg6Review: { phase: "head_returned", return_reason: "يرجى إرفاق إيصال جهاز مدى" },
    },
  };
  qc.setQueryData(queryKeys.operation("op-head-ret"), headReturnedApiOp);
  const cOp = apiOpToCOp(headReturnedApiOp);

  const origGet = api.get.bind(api);
  api.get = (async () => ({ data: headReturnedApiOp }) as never) as typeof api.get;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={authValue}>
            <LangContext.Provider value={langCtx("ar")}>
              <OpRow
                op={cOp}
                onApprove={() => {}}
                onReject={() => {}}
                onClarify={() => {}}
                onView={() => {}}
                expanded={true}
                onToggle={() => {}}
              />
            </LangContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );
    });

    assert.match(container.textContent ?? "", /مُعادة من رئيس الحسابات: الاعتماد وطلب الإيضاح معطلان/);
    const actionBar = container.querySelector('[data-testid="shift-review-action-bar"]')!;
    const buttons = Array.from(actionBar.querySelectorAll("button"));
    const approveBtn = buttons.find((b) => (b.textContent ?? "").includes("موافقة"))!;
    const clarifyBtn = buttons.find((b) => (b.textContent ?? "").includes("طلب إيضاح"))!;
    const returnBtn = buttons.find((b) => (b.textContent ?? "").includes("إرجاع لمدير الفرع"))!;
    assert.equal(approveBtn.disabled, true, "Approve disabled in head_returned phase");
    assert.equal(clarifyBtn.disabled, true, "Clarify disabled in head_returned phase");
    assert.equal(returnBtn.disabled, false, "Return to branch manager remains active");
  } finally {
    api.get = origGet;
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});

test("FE-03: AccCompanySales orders Summary, Filters, Sales Statements, and ShiftSalesSection and translates EN mode", async () => {
  const createRoot = await loadCreateRoot();
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });

  const salesApiOp: ApiOperation = {
    id: "op-sales-1",
    publicId: "OPS-2401",
    moduleKey: "sales",
    status: "pending",
    branchId: "branch-1",
    branchName: "Olaya Branch",
    operationDate: "2026-11-17",
    createdAt: "2026-11-17T16:10:00Z",
    updatedAt: "2026-11-17T16:10:00Z",
    submittedAt: "2026-11-17T16:10:00Z",
    amountHalalas: 1834000,
    origin: "mobile",
  };

  qc.setQueryData(queryKeys.salesKpis("2026-11-17"), {
    date: "2026-11-17",
    totalHalalas: 1834000,
    cashHalalas: 420000,
    cardHalalas: 850000,
    transferHalalas: 0,
    deliveryHalalas: 564000,
    varianceHalalas: 0,
    matchedCount: 1,
    varianceCount: 0,
    pendingCount: 1,
    varianceBranches: [],
  });
  qc.setQueryData(queryKeys.salesKpis(undefined), {
    date: "2026-11-17",
    totalHalalas: 1834000,
    cashHalalas: 420000,
    cardHalalas: 850000,
    transferHalalas: 0,
    deliveryHalalas: 564000,
    varianceHalalas: 0,
    matchedCount: 1,
    varianceCount: 0,
    pendingCount: 1,
    varianceBranches: [],
  });
  qc.setQueryData(queryKeys.dayCompleteness(7), [
    {
      date: "2026-11-17",
      pillLabelAr: "اليوم · ١٧ نوفمبر",
      requiredCount: 2,
      completedCount: 1,
      missingCount: 1,
      bannerAr: "تم رفع فرع ١ من ٢ — متبقي ١",
      missingBranches: [{ branchId: "branch-2", name: "Al-Nakheel Branch" }],
    },
  ]);
  qc.setQueryData([...queryKeys.shiftConfigs, "branch"], []);
  qc.setQueryData(
    queryKeys.shifts({ page: 1, pageSize: 5, role: "cashier", submittedWithWorkday: true } as Parameters<typeof queryKeys.shifts>[0]),
    { data: [], meta: { total: 0, page: 1, pageSize: 5, totalPages: 1, submittedWithWorkday: true } },
  );

  const origGet = api.get.bind(api);
  api.get = (async () => ({ data: { data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1, submittedWithWorkday: true } } }) as never) as typeof api.get;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={authValue}>
            <LangContext.Provider value={langCtx("en")}>
              <CLangContext.Provider value={langCtx("en")}>
                <AccCompanySales
                  ops={[apiOpToCOp(salesApiOp)]}
                  approve={() => {}}
                  reject={() => {}}
                  requestClarification={() => {}}
                  bulkApprove={() => {}}
                />
              </CLangContext.Provider>
            </LangContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );
    });

    const html = container.innerHTML;
    const summaryIdx = html.indexOf("sales-statements-summary");
    const filterIdx = html.indexOf("Search &amp; Filters");
    const listIdx = html.indexOf("Sales Statements");
    const shiftsIdx = html.lastIndexOf("Shift sales");
    assert.ok(summaryIdx > -1 && filterIdx > summaryIdx && listIdx > filterIdx && shiftsIdx > listIdx, "Sections follow 04-16 layout order");
    assert.match(container.textContent ?? "", /Branch app/);
    assert.match(container.textContent ?? "", /Bulk approve/);
    assert.match(container.textContent ?? "", /18,340\.00 SAR/);

    // Selecting a day pill in EN mode must render localized English day label (never Arabic pillLabelAr)
    const dayPill = container.querySelector('[data-testid="sales-day-pill-2026-11-17"]') as HTMLButtonElement;
    assert.ok(dayPill, "Day pill button rendered");
    assert.doesNotMatch(dayPill.textContent ?? "", /اليوم/);
    assert.match(dayPill.textContent ?? "", /Tue, Nov 17/);
    await act(async () => dayPill.click());
    const dayBanner = container.querySelector('[data-testid="sales-selected-day-banner"]');
    assert.ok(dayBanner, "Selected day completeness banner rendered");
    assert.doesNotMatch(dayBanner.textContent ?? "", /اليوم|تم رفع/);
    assert.match(dayBanner.textContent ?? "", /Tue, Nov 17/);
    assert.match(dayBanner.textContent ?? "", /1 of 2 branches submitted · 1 missing/);
  } finally {
    api.get = origGet;
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});

test("FE-04: AccCompanyEmployees searches by empNumber or name, separates Dues vs Custody tabs, distinguishes sales vs custody, and shows + / - / receipt / status / pending", async () => {
  const createRoot = await loadCreateRoot();
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });

  const emp1: Employee = {
    id: "emp-1001",
    empNumber: "1001",
    name: "فهد العتيبي",
    phone: "0500001001",
    role: "كاشير",
    branchId: "branch-1",
    branchName: "فرع العليا",
    monthlySalary: 350000,
    status: "active",
    balanceHalalas: -50000,
    balanceCaption: { key: "debtor", labelAr: "عليه" },
  };
  const shift1: Shift = {
    id: "shift-1",
    branchId: "branch-1",
    branchName: "فرع العليا",
    cashierEmployeeId: emp1.id,
    cashierName: emp1.name,
    role: "cashier",
    shiftType: "first",
    shiftNo: 1,
    startedAt: "2026-11-17T08:00:00Z",
    endedAt: "2026-11-17T16:00:00Z",
    status: "closed",
    isLate: false,
    ordersCount: 40,
    salesHalalas: 1834000,
    openingFloatHalalas: 0,
    cashActualHalalas: 420000,
    cashExpectedHalalas: 420000,
    varianceHalalas: 0,
    cashCountState: "counted",
    reportReview: { operation_id: "op-1", public_id: "SHF-2401" },
  };

  qc.setQueryData(queryKeys.employees({ empNumber: undefined, q: undefined, branchId: undefined }), {
    data: [emp1],
    meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
  });
  qc.setQueryData(queryKeys.employeeMovements(emp1.id, undefined), {
    employeeId: emp1.id,
    employeeName: emp1.name,
    openingBalanceHalalas: 0,
    closingBalanceHalalas: -50000,
    balanceHalalas: -50000,
    balanceCaption: { key: "debtor", labelAr: "عليه" },
    totalCredit: 0,
    totalDebit: 50000,
    movements: [],
  });
  qc.setQueryData(queryKeys.shiftCustodyStatement(emp1.id, { from: undefined, to: undefined, page: 1, pageSize: 10 }), {
    unit: "halala",
    identity_link_state: "linked",
    identity: {
      employee_id: emp1.id,
      name: emp1.name,
      role: "cashier",
      linked_type: "cashier",
      linked_id: "c-1",
      branch_id: "branch-1",
      branch_name: "فرع العليا",
    },
    period: { from: null, to: null },
    balances: {
      is_available: true,
      opening_balance: 0,
      closing_balance: 150000,
      total_cash_in: 470000,
      total_cash_out: 320000,
      net_period_change: 150000,
    },
    entries: [
      {
        source_type: "cashier_custody",
        source_id: "tx-1",
        event_at: "2026-11-17T16:05:00Z",
        business_date: "2026-11-17",
        branch: { id: "branch-1", name: "فرع العليا" },
        transaction_type: "Total Sales",
        classification: "sales_cash",
        label_ar: "كاش مبيعات الوردية #1",
        label_en: "Shift #1 cash sales custody",
        source_shift_id: "shift-1",
        receiving_shift_id: null,
        receipt_id: null,
        counterparty: { type: null, id: null, name: null },
        cash_in: 420000,
        cash_out: 0,
        running_balance: 420000,
        confirmation_state: "confirmed",
        lineage_key: "shift:1",
        reversal_id: null,
      },
      {
        source_type: "cashier_custody",
        source_id: "tx-2",
        event_at: "2026-11-17T16:20:00Z",
        business_date: "2026-11-17",
        branch: { id: "branch-1", name: "فرع العليا" },
        transaction_type: "Handover",
        classification: "handover_sent",
        label_ar: "تسليم عهدة لمدير الفرع",
        label_en: "Handover to branch manager",
        source_shift_id: "shift-1",
        receiving_shift_id: null,
        receipt_id: "RCP-9001",
        counterparty: { type: "branch_manager", id: "mgr-1", name: "خالد المدير" },
        cash_in: 0,
        cash_out: 270000,
        running_balance: 150000,
        confirmation_state: "confirmed",
        lineage_key: "ho:9001",
        reversal_id: null,
      },
    ],
    pending: [
      {
        request_type: "handover_sent",
        request_id: "pend-1",
        created_at: "2026-11-17T19:00:00Z",
        business_date: "2026-11-17",
        amount: 40000,
        counterparty: { type: "branch_manager", id: "mgr-1", name: "خالد المدير" },
        source_shift_id: "shift-1",
        status: "pending",
      },
    ],
    pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
  });
  qc.setQueryData(["shifts", "employee-closed", "branch-1"], { [emp1.id]: [shift1] });

  const requestedEmployeeParams: Array<Record<string, unknown>> = [];
  const origGet = api.get.bind(api);
  api.get = (async (url: string, config?: { params?: Record<string, unknown> }) => {
    if (url === "/company/me/employees") requestedEmployeeParams.push(config?.params ?? {});
    return { data: { data: [emp1], meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 } } } as never;
  }) as typeof api.get;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={authValue}>
            <LangContext.Provider value={langCtx("ar")}>
              <CLangContext.Provider value={langCtx("ar")}>
                <AccCompanyEmployees />
              </CLangContext.Provider>
            </LangContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );
    });

    // Search by empNumber "1001" and "EMP-0007" uses empNumber param (matching backend EmployeeController)
    const searchInput = container.querySelector('input[placeholder*="EMP-0007"]') as HTMLInputElement;
    assert.ok(searchInput, "Search input advertises employee number and name");
    await act(async () => setInputValue(searchInput, "1001"));
    await flushUi();
    assert.ok(
      requestedEmployeeParams.some((p) => p.empNumber === "1001" && p.q === undefined),
      `Expected empNumber=1001 in requestedEmployeeParams, got: ${JSON.stringify(requestedEmployeeParams)}`,
    );
    await act(async () => setInputValue(searchInput, "EMP-0007"));
    await flushUi();
    assert.ok(
      requestedEmployeeParams.some((p) => p.empNumber === "EMP-0007" && p.q === undefined),
      `Expected empNumber=EMP-0007 in requestedEmployeeParams, got: ${JSON.stringify(requestedEmployeeParams)}`,
    );

    // Select employee row -> defaults directly to Shift Cash Custody tab for cashier
    const empBtn = Array.from(container.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("فهد العتيبي"))!;
    await act(async () => empBtn.click());

    // Clear distinction between Shift Sales (18,340), Credit Handed Over (+3,200), Debit Cash In (−4,700), and pending (400)
    const distinction = container.querySelector('[data-testid="sales-vs-custody-distinction"]')!;
    assert.match(distinction.textContent ?? "", /١٨٬٣٤٠٫٠٠/);
    assert.match(container.querySelector('[data-testid="summary-custody-credit-delivered"]')?.textContent ?? "", /\+٣٬٢٠٠٫٠٠/);
    assert.match(container.querySelector('[data-testid="summary-custody-debit-received"]')?.textContent ?? "", /−٤٬٧٠٠٫٠٠/);
    assert.match(container.querySelector('[data-testid="summary-custody-pending-delivered"]')?.textContent ?? "", /٤٠٠٫٠٠/);

    // Custody tab is active immediately without manual click, showing Credit (cash_out) & Debit (cash_in)
    const duesTab = container.querySelector('[data-testid="tab-emp-dues"]')!;
    const custodyTab = container.querySelector('[data-testid="tab-emp-custody"]')!;
    assert.match(duesTab.textContent ?? "", /المستحقات والخصومات/);
    assert.match(custodyTab.className, /border-purple-600/);
    assert.match(container.querySelector('[data-testid="custody-total-credit"]')?.textContent ?? "", /\+٣٬٢٠٠٫٠٠/);
    assert.match(container.querySelector('[data-testid="custody-total-debit"]')?.textContent ?? "", /−٤٬٧٠٠٫٠٠/);

    const text = container.textContent ?? "";
    assert.match(text, /لا يغيّر الرصيد الجاري/);
    assert.match(text, /٤٠٠٫٠٠/);
    assert.match(text, /١٬٥٠٠٫٠٠/);
    assert.match(text, /\+٢٬٧٠٠٫٠٠/);
    assert.match(text, /−٤٬٢٠٠٫٠٠/);
    assert.match(text, /عهدة كاشير/);
    assert.match(text, /RCP-9001/);
    assert.match(text, /مؤكد/);
    assert.match(text, /دائن — مسلّم \(كاش خارج\)/);
    assert.match(text, /مدين — عليه \(كاش داخل\)/);

    // Switching to Dues tab exposes cross-link back to Shift Cash Custody
    await act(async () => (duesTab as HTMLButtonElement).click());
    const crossLink = container.querySelector('[data-testid="dues-custody-crosslink"]');
    assert.ok(crossLink, "Dues tab displays custody cross-link banner");
  } finally {
    api.get = origGet;
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});

test("FE-04 regression: 200 SAR cashier shift handed over (90 handover + 5 shortage repayment) shows 95.00 in Credit immediately without zeroes", async () => {
  const createRoot = await loadCreateRoot();
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });

  const cashierEmp: Employee = {
    id: "emp-cashier-200",
    empNumber: "0042",
    name: "يوسف الدوسري",
    phone: "0500000042",
    role: "كاشير",
    branchId: "branch-200",
    branchName: "فرع الملقا",
    monthlySalary: 300000,
    status: "active",
    balanceHalalas: 0,
    balanceCaption: { key: "balanced", labelAr: "متوازن" },
  };
  const shift200: Shift = {
    id: "shift-200",
    branchId: "branch-200",
    branchName: "فرع الملقا",
    cashierEmployeeId: cashierEmp.id,
    cashierName: cashierEmp.name,
    role: "cashier",
    shiftType: "first",
    shiftNo: 1,
    startedAt: "2026-11-19T08:00:00Z",
    endedAt: "2026-11-19T16:00:00Z",
    status: "closed",
    isLate: false,
    ordersCount: 10,
    salesHalalas: 20000,
    openingFloatHalalas: 0,
    cashActualHalalas: 9000,
    cashExpectedHalalas: 9500,
    varianceHalalas: -500,
    cashCountState: "counted",
    reportReview: { operation_id: "op-200", public_id: "SHF-200" },
  };

  qc.setQueryData(queryKeys.employees({ empNumber: undefined, q: undefined, branchId: undefined }), {
    data: [cashierEmp],
    meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
  });
  qc.setQueryData(queryKeys.employeeMovements(cashierEmp.id, undefined), {
    employeeId: cashierEmp.id,
    employeeName: cashierEmp.name,
    openingBalanceHalalas: 0,
    closingBalanceHalalas: 0,
    balanceHalalas: 0,
    balanceCaption: { key: "balanced", labelAr: "متوازن" },
    totalCredit: 0,
    totalDebit: 0,
    movements: [],
  });
  qc.setQueryData(queryKeys.shiftCustodyStatement(cashierEmp.id, { from: undefined, to: undefined, page: 1, pageSize: 10 }), {
    unit: "halala",
    identity_link_state: "linked",
    identity: {
      employee_id: cashierEmp.id,
      name: cashierEmp.name,
      role: "cashier",
      linked_type: "cashier",
      linked_id: "cashier-200",
      branch_id: "branch-200",
      branch_name: "فرع الملقا",
    },
    period: { from: null, to: null },
    balances: {
      is_available: true,
      opening_balance: 0,
      closing_balance: -500,
      total_cash_in: 9000,
      total_cash_out: 9500,
      net_period_change: -500,
    },
    entries: [
      {
        source_type: "cashier_custody",
        source_id: "tx-sales-90",
        event_at: "2026-11-19T16:00:00Z",
        business_date: "2026-11-19",
        branch: { id: "branch-200", name: "فرع الملقا" },
        transaction_type: "Total Sales",
        classification: "sales_collection",
        label_ar: "تحصيل مبيعات",
        label_en: "Sales collection",
        source_shift_id: "shift-200",
        receiving_shift_id: null,
        receipt_id: null,
        counterparty: { type: null, id: null, name: null },
        cash_in: 9000,
        cash_out: 0,
        running_balance: 9000,
        confirmation_state: "confirmed",
        lineage_key: null,
        reversal_id: null,
      },
      {
        source_type: "cashier_custody",
        source_id: "tx-ho-90",
        event_at: "2026-11-19T16:05:00Z",
        business_date: "2026-11-19",
        branch: { id: "branch-200", name: "فرع الملقا" },
        transaction_type: "Handover Sent",
        classification: "handover_sent",
        label_ar: "تسليم عهدة",
        label_en: "Handover sent",
        source_shift_id: "shift-200",
        receiving_shift_id: null,
        receipt_id: "RCP-2001",
        counterparty: { type: "branch_manager", id: "bm-1", name: "ماجد المدير" },
        cash_in: 0,
        cash_out: 9000,
        running_balance: 0,
        confirmation_state: "confirmed",
        lineage_key: null,
        reversal_id: null,
      },
      {
        source_type: "cashier_custody",
        source_id: "tx-repay-5",
        event_at: "2026-11-19T16:06:00Z",
        business_date: "2026-11-19",
        branch: { id: "branch-200", name: "فرع الملقا" },
        transaction_type: "Debt Repayment",
        classification: "debt_repayment",
        label_ar: "سداد مديونية",
        label_en: "Debt repayment",
        source_shift_id: null,
        receiving_shift_id: null,
        receipt_id: null,
        counterparty: { type: "branch_manager", id: "bm-1", name: "ماجد المدير" },
        cash_in: 0,
        cash_out: 500,
        running_balance: -500,
        confirmation_state: "confirmed",
        lineage_key: null,
        reversal_id: null,
      },
    ],
    pending: [],
    pagination: { page: 1, pageSize: 10, total: 3, totalPages: 1 },
  });
  qc.setQueryData(["shifts", "employee-closed", "branch-200"], { [cashierEmp.id]: [shift200] });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={authValue}>
            <LangContext.Provider value={langCtx("ar")}>
              <CLangContext.Provider value={langCtx("ar")}>
                <AccCompanyEmployees />
              </CLangContext.Provider>
            </LangContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );
    });

    const empBtn = Array.from(container.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("يوسف الدوسري"))!;
    await act(async () => empBtn.click());

    // Shift sales total 200.00 SAR, Credit handed over +95.00 SAR, Debit cash in −90.00 SAR shown immediately
    assert.match(container.querySelector('[data-testid="sales-vs-custody-distinction"]')?.textContent ?? "", /٢٠٠٫٠٠/);
    assert.match(container.querySelector('[data-testid="summary-custody-credit-delivered"]')?.textContent ?? "", /\+٩٥٫٠٠/);
    assert.match(container.querySelector('[data-testid="custody-total-credit"]')?.textContent ?? "", /\+٩٥٫٠٠/);
    assert.match(container.querySelector('[data-testid="custody-total-debit"]')?.textContent ?? "", /−٩٠٫٠٠/);

    const creditCells = Array.from(container.querySelectorAll('[data-testid="custody-cell-credit"]')).map((el) => el.textContent ?? "");
    const debitCells = Array.from(container.querySelectorAll('[data-testid="custody-cell-debit"]')).map((el) => el.textContent ?? "");
    assert.ok(creditCells.some((c) => c.includes("+٩٠٫٠٠")), `Expected +90.00 in Credit cells, got ${JSON.stringify(creditCells)}`);
    assert.ok(creditCells.some((c) => c.includes("+٥٫٠٠")), `Expected +5.00 in Credit cells, got ${JSON.stringify(creditCells)}`);
    assert.ok(debitCells.some((c) => c.includes("−٩٠٫٠٠")), `Expected -90.00 in Debit cells, got ${JSON.stringify(debitCells)}`);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});

test("FE-04 pending handover regression: unconfirmed 95.00 SAR handover shows pending badge immediately on cashier selection", async () => {
  const createRoot = await loadCreateRoot();
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });

  const cashierPending: Employee = {
    id: "emp-cashier-pending",
    empNumber: "0043",
    name: "سعد القحطاني",
    phone: "0500000043",
    role: "cashier",
    branchId: "branch-201",
    branchName: "فرع النخيل",
    monthlySalary: 300000,
    status: "active",
    balanceHalalas: 0,
    balanceCaption: { key: "balanced", labelAr: "متوازن" },
  };
  const shiftPending: Shift = {
    id: "shift-201",
    branchId: "branch-201",
    branchName: "فرع النخيل",
    cashierEmployeeId: cashierPending.id,
    cashierName: cashierPending.name,
    role: "cashier",
    shiftType: "first",
    shiftNo: 1,
    startedAt: "2026-11-19T08:00:00Z",
    endedAt: "2026-11-19T16:00:00Z",
    status: "closed",
    isLate: false,
    ordersCount: 10,
    salesHalalas: 20000,
    openingFloatHalalas: 0,
    cashActualHalalas: 9000,
    cashExpectedHalalas: 9500,
    varianceHalalas: -500,
    cashCountState: "counted",
    reportReview: { operation_id: "op-201", public_id: "SHF-201" },
  };

  qc.setQueryData(queryKeys.employees({ empNumber: undefined, q: undefined, branchId: undefined }), {
    data: [cashierPending],
    meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
  });
  qc.setQueryData(queryKeys.employeeMovements(cashierPending.id, undefined), {
    employeeId: cashierPending.id,
    employeeName: cashierPending.name,
    openingBalanceHalalas: 0,
    closingBalanceHalalas: 0,
    balanceHalalas: 0,
    balanceCaption: { key: "balanced", labelAr: "متوازن" },
    totalCredit: 0,
    totalDebit: 0,
    movements: [],
  });
  qc.setQueryData(queryKeys.shiftCustodyStatement(cashierPending.id, { from: undefined, to: undefined, page: 1, pageSize: 10 }), {
    unit: "halala",
    identity_link_state: "linked",
    identity: {
      employee_id: cashierPending.id,
      name: cashierPending.name,
      role: "cashier",
      linked_type: "cashier",
      linked_id: "cashier-201",
      branch_id: "branch-201",
      branch_name: "فرع النخيل",
    },
    period: { from: null, to: null },
    balances: {
      is_available: true,
      opening_balance: 0,
      closing_balance: 9000,
      total_cash_in: 9000,
      total_cash_out: 0,
      net_period_change: 9000,
    },
    entries: [],
    pending: [
      {
        request_type: "handover_sent",
        request_id: "pend-9500",
        created_at: "2026-11-19T16:05:00Z",
        business_date: "2026-11-19",
        amount: 9500,
        counterparty: { type: "branch_manager", id: "bm-1", name: "ماجد المدير" },
        source_shift_id: "shift-201",
        status: "pending",
      },
    ],
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
  });
  qc.setQueryData(["shifts", "employee-closed", "branch-201"], { [cashierPending.id]: [shiftPending] });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={authValue}>
            <LangContext.Provider value={langCtx("ar")}>
              <CLangContext.Provider value={langCtx("ar")}>
                <AccCompanyEmployees />
              </CLangContext.Provider>
            </LangContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );
    });

    const empBtn = Array.from(container.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("سعد القحطاني"))!;
    await act(async () => empBtn.click());

    assert.match(container.querySelector('[data-testid="summary-custody-pending-delivered"]')?.textContent ?? "", /٩٥٫٠٠/);
    assert.match(container.querySelector('[data-testid="custody-pending-section"]')?.textContent ?? "", /٩٥٫٠٠/);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});
