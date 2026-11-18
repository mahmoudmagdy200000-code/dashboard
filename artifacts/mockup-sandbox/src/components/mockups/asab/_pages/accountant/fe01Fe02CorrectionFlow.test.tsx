import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalWindow } from "happy-dom";
import { api } from "../../../../../api/client";
import { queryKeys } from "../../../../../api/queries/keys";
import { resolveBranchEmployeeMatch } from "../../../../../api/queries/lookups";
import type { Operation as ApiOperation } from "../../../../../api/types";
import type { Employee, Shift } from "../../../../../api/types/company";
import { AuthContext } from "../../../../../auth/AuthContext";
import { LangContext, type Lang } from "../../_shared/LangContext";
import { ShiftSalesSection } from "./ShiftSalesSection";
import { ShiftReportCorrectionForm } from "../../CompanyDashboard";
import {
  evaluateShiftCorrectionPreview,
  getShiftCorrectionNextStep,
  initialShiftCorrectionDraft,
  prepareShiftCorrectionRequest,
  validateShortageAllocations,
} from "../../shiftReportCorrection";
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
  const ReactDomClient = await import("react-dom/client");
  return ReactDomClient.createRoot;
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
        moduleKeys: ["sales", "shifts"],
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

const makeShift = (id: string, opId: string, status: "pending_review" | "closed"): Shift => ({
  id,
  branchId: "branch-1",
  branchName: "فرع العليا",
  cashierEmployeeId: "emp-c1",
  cashierName: "فهد العتيبي",
  role: "cashier",
  shiftType: "first",
  shiftNo: 1,
  startedAt: "2026-11-17T08:00:00Z",
  endedAt: "2026-11-17T16:00:00Z",
  status,
  isLate: false,
  ordersCount: 40,
  salesHalalas: 1834000,
  openingFloatHalalas: 0,
  cashActualHalalas: 420000,
  cashExpectedHalalas: 420000,
  varianceHalalas: 0,
  cashCountState: "counted",
  reportReview: { operation_id: opId, public_id: `SHF-${id}` },
});

const ninjaAggId = "550e8400-e29b-41d4-a716-446655440077";
const emp1Id = "550e8400-e29b-41d4-a716-446655440101";
const emp2Id = "550e8400-e29b-41d4-a716-446655440102";

const makeOperationDetail = (overrides: Partial<ApiOperation> = {}): ApiOperation => ({
  id: "op-fe-1",
  publicId: "SHF-2401",
  moduleKey: "shifts",
  status: "pending",
  branchId: "branch-1",
  branchName: "فرع العليا",
  operationDate: "2026-11-17",
  createdAt: "2026-11-17T16:05:00Z",
  updatedAt: "2026-11-17T16:05:00Z",
  submittedAt: "2026-11-17T16:05:00Z",
  amountHalalas: 1834000,
  reportReview: { phase: "accountant_review" },
  reportRevision: 1,
  allocationVersion: null,
  liability: null,
  cashCollectedHalalas: 420000,
  handoverNotes: "",
  payload: {
    shiftId: "admin-shift-fe-1",
    reportRevision: 1,
    allocationVersion: null,
    cashCountState: "counted",
    salesHalalas: 1834000,
    cardTotalHalalas: 850000,
    cashActualHalalas: 420000,
    cashExpectedHalalas: 420000,
    confirmedOpeningHalalas: 0,
    cashCollectedHalalas: 420000,
    aggregatorTotalsHalalas: 564000,
    aggregatorBreakdown: [
      { aggregator: ninjaAggId, amountHalalas: 66000 },
      { aggregator: "550e8400-e29b-41d4-a716-446655440078", amountHalalas: 498000 },
    ],
    pkg6Review: { phase: "accountant_review" },
    handoverNotes: "",
  },
  ...overrides,
});

function findButton(root: Element, textPart: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll("button")).find((b) =>
    (b.textContent ?? "").includes(textPart),
  );
}

function setControlValue(el: HTMLInputElement | HTMLSelectElement, val: string, eventType: "input" | "change" = "input") {
  const proto = el.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, val);
  else el.value = val;
  el.dispatchEvent(new window.Event(eventType, { bubbles: true }) as unknown as Event);
}

test("FE-01: ShiftSalesSection shows 'Edit breakdown' button only when eligible, and renders lock reason + next step when locked", async () => {
  const createRoot = await loadCreateRoot();
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  const eligibleShift = makeShift("s-eligible", "op-fe-1", "pending_review");
  const lockedShift = makeShift("s-locked", "op-fe-locked", "closed");

  qc.setQueryData(
    queryKeys.shifts({ page: 1, pageSize: 5, role: "cashier", submittedWithWorkday: true } as Parameters<typeof queryKeys.shifts>[0]),
    { data: [eligibleShift, lockedShift], meta: { page: 1, totalPages: 1, total: 2 } },
  );
  qc.setQueryData(queryKeys.operation("op-fe-1"), makeOperationDetail());
  qc.setQueryData(
    queryKeys.operation("op-fe-locked"),
    makeOperationDetail({
      id: "op-fe-locked",
      publicId: "SHF-2402",
      status: "approved",
      reportReview: { phase: "head_review" },
      payload: {
        ...makeOperationDetail().payload!,
        pkg6Review: { phase: "head_review" },
      },
    }),
  );
  qc.setQueryData(queryKeys.employees({ branchId: "branch-1", pageSize: 100 }), {
    data: [],
    meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 },
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={authValue}>
            <LangContext.Provider value={langCtx("ar")}>
              <ShiftSalesSection operations={[]} />
            </LangContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );
    });

    // 1. Eligible shift: expand -> shows "تعديل التفصيل", clicking opens ShiftReportCorrectionForm
    const row1 = container.querySelector('[data-shift-sales-id="s-eligible"]')!;
    await act(async () => findButton(row1, "عرض التفاصيل")?.click());
    const editBtn = findButton(row1, "تعديل التفصيل");
    assert.ok(editBtn, "Eligible shift exposes Edit breakdown button");
    assert.equal(row1.querySelector('[aria-label="تصحيح تقرير الوردية"]'), null, "Form starts collapsed until clicked");

    await act(async () => editBtn.click());
    assert.ok(row1.querySelector('[aria-label="تصحيح تقرير الوردية"]'), "Clicking Edit breakdown opens correction form");

    // 2. Locked shift: expand -> no edit button, shows both lock reason and next available step
    const row2 = container.querySelector('[data-shift-sales-id="s-locked"]')!;
    await act(async () => findButton(row2, "عرض التفاصيل")?.click());
    assert.equal(findButton(row2, "تعديل التفصيل"), undefined, "Locked shift hides Edit breakdown button");
    assert.match(row2.textContent ?? "", /حالة التقرير ليست معلقة/);
    assert.match(row2.textContent ?? "", /الخطوة المتاحة/);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});

test("FE-01: next step guidance covers final-approved, head_review, and manager_returned states", () => {
  const baseOp = { id: "op-1", moduleKey: "shifts", status: "pending", reportReview: { phase: "accountant_review" } };
  const baseDetail = makeOperationDetail();

  assert.match(
    getShiftCorrectionNextStep({ ...baseOp, status: "final-approved" }, { ...baseDetail, status: "final-approved" }, "accountant", "ar") ?? "",
    /معتمد نهائيًا/,
  );
  assert.match(
    getShiftCorrectionNextStep({ ...baseOp, status: "approved" }, { ...baseDetail, status: "approved", reportReview: { phase: "head_review" } }, "accountant", "ar") ?? "",
    /رئيس الحسابات/,
  );
  assert.match(
    getShiftCorrectionNextStep(baseOp, { ...baseDetail, reportReview: { phase: "manager_returned" }, payload: { ...baseDetail.payload!, pkg6Review: { phase: "manager_returned" } } }, "accountant", "ar") ?? "",
    /مدير الفرع/,
  );
});

test("FE-02: Mahmoud BE-01 cash confirmation rule & cash cap validation in integer halalas", () => {
  // Gross 200, Card 110, Apps 0, Initial Cash Collected 120, Posted Custody 90, Drawer Count 100
  const be01Detail = makeOperationDetail({
    payload: {
      shiftId: "shift-be01",
      reportRevision: 1,
      allocationVersion: null,
      cashCountState: "counted",
      salesHalalas: 20000,
      cardTotalHalalas: 11000,
      cashActualHalalas: 10000,
      confirmedOpeningHalalas: 0,
      cashCollectedHalalas: 12000,
      aggregatorTotalsHalalas: 0,
      aggregatorBreakdown: [],
      pkg6Review: { phase: "accountant_review" },
    },
  });

  // 1. Editing card 110 -> 100 without touching/confirming cash requires explicit confirmation & blocks >100 cap
  const draftCardOnly = {
    ...initialShiftCorrectionDraft(be01Detail),
    cardPaymentsSar: "100.00",
    reason: "تعديل الشبكة من ١١٠ إلى ١٠٠",
  };
  const preview1 = evaluateShiftCorrectionPreview(be01Detail, draftCardOnly);
  assert.equal(preview1.requiresExplicitCashConfirmation, true);
  assert.equal(preview1.cashExceedsDerivedCap, true, "120.00 exceeds new derived cash cap 100.00");
  assert.equal(
    prepareShiftCorrectionRequest(be01Detail, draftCardOnly, { enforceCashConfirmation: true, cashConfirmed: false }),
    null,
  );

  // 2. Explicit cash confirmation at 90.00 -> permitted, emits cash_collected="90.00", shows 10 SAR collection deficit
  const draftConfirm90 = {
    ...draftCardOnly,
    cashCollectedSar: "90.00",
  };
  const preview90 = evaluateShiftCorrectionPreview(be01Detail, draftConfirm90);
  assert.equal(preview90.cashExceedsDerivedCap, false);
  assert.equal(preview90.collectionDiffHalalas, 1000, "200 - (100 card + 90 cash) = 10 SAR deficit");
  assert.equal(
    prepareShiftCorrectionRequest(be01Detail, draftConfirm90, { enforceCashConfirmation: true, cashConfirmed: false }),
    null,
    "Auto-unconfirmed submission must fail when enforceCashConfirmation is active and cashConfirmed is false",
  );
  const req90 = prepareShiftCorrectionRequest(be01Detail, draftConfirm90, {
    enforceCashConfirmation: true,
    cashConfirmed: true,
  });
  assert.deepEqual(req90?.changes, { card_payments: "100.00", cash_collected: "90.00" });

  // 3. Explicit cash confirmation at 100.00 (even when initial cash was already 90.00!)
  const detailInitial90 = makeOperationDetail({
    payload: { ...be01Detail.payload!, cashCollectedHalalas: 9000 },
  });
  const draftConfirmSame90 = {
    ...initialShiftCorrectionDraft(detailInitial90),
    cardPaymentsSar: "100.00",
    reason: "الشبكة 100 والكاش المحصّل المؤكد 90",
  };
  const previewSame90 = evaluateShiftCorrectionPreview(detailInitial90, draftConfirmSame90);
  assert.equal(previewSame90.requiresExplicitCashConfirmation, true);
  const reqSame90Confirmed = prepareShiftCorrectionRequest(detailInitial90, draftConfirmSame90, {
    enforceCashConfirmation: true,
    cashConfirmed: true,
  });
  assert.equal(reqSame90Confirmed?.changes.cash_collected, "90.00", "Explicit confirmation forces cash_collected even if value matches initial");
});

test("FE-02: Ninja 660->650 deficit, 2-employee split, duplicate/unknown rejection, and lookup race safety", () => {
  const detail = makeOperationDetail();
  const baseDraft = initialShiftCorrectionDraft(detail);
  const ninjaDropDraft = {
    ...baseDraft,
    aggregators: [
      { aggregatorId: ninjaAggId, amountSar: "650.00" },
      baseDraft.aggregators![1],
    ],
    reason: "تأخر تحويل من تطبيقات التوصيل — نينجا 650 بدل 660",
  };

  const preview = evaluateShiftCorrectionPreview(detail, ninjaDropDraft);
  assert.equal(preview.totalCollectionHalalas, 1833000);
  assert.equal(preview.collectionDiffHalalas, 1000, "18340 - 18330 = 10 SAR deficit");
  assert.equal(preview.targetShortageHalalas, 1000);

  // Allocation validation: partial/wrong sum, duplicate, unknown, valid 2-person split
  assert.equal(
    validateShortageAllocations([{ type: "employee", id: emp1Id, empNumber: "1001", amountSar: "9.00" }], 1000).valid,
    false,
  );
  assert.equal(
    validateShortageAllocations(
      [
        { type: "employee", id: emp1Id, empNumber: "1001", amountSar: "5.00" },
        { type: "employee", id: emp1Id, empNumber: "1001", amountSar: "5.00" },
      ],
      1000,
    ).hasDuplicateEmployee,
    true,
  );
  assert.equal(
    validateShortageAllocations([{ type: "employee", id: "", empNumber: "9999", amountSar: "10.00" }], 1000).hasUnresolvedEmployee,
    true,
  );
  const splitOk = validateShortageAllocations(
    [
      { type: "employee", id: emp1Id, empNumber: "1001", amountSar: "6.00" },
      { type: "employee", id: emp2Id, empNumber: "1002", amountSar: "4.00" },
    ],
    1000,
  );
  assert.equal(splitOk.valid, true);
  assert.equal(splitOk.remainingHalalas, 0);

  const req = prepareShiftCorrectionRequest(
    detail,
    {
      ...ninjaDropDraft,
      shares: [
        { type: "employee", id: emp1Id, empNumber: "1001", amountSar: "6.00" },
        { type: "employee", id: emp2Id, empNumber: "1002", amountSar: "4.00" },
      ],
    },
    { enforceCashConfirmation: true, cashConfirmed: true, allowNewShares: true },
  );
  assert.equal(req?.changes.aggregators?.[0].amount, "650.00");
  assert.deepEqual(req?.shortage_allocations, [
    { type: "employee", id: emp1Id, amount: 600 },
    { type: "employee", id: emp2Id, amount: 400 },
  ]);

  // Scoped branch employee match checks inactive, other branch, and duplicate empNumber
  const roster: Employee[] = [
    { id: emp1Id, empNumber: "1001", name: "فهد العتيبي", phone: "050", role: "كاشير", branchId: "branch-1", branchName: "العليا", monthlySalary: 300000, status: "active", balanceHalalas: 0, balanceCaption: { key: "zero", labelAr: "متوازن" } },
    { id: emp2Id, empNumber: "1002", name: "سعد القحطاني", phone: "051", role: "كاشير", branchId: "branch-1", branchName: "العليا", monthlySalary: 300000, status: "inactive", balanceHalalas: 0, balanceCaption: { key: "zero", labelAr: "متوازن" } },
    { id: "550e8400-e29b-41d4-a716-446655440103", empNumber: "1003", name: "موظف فرع آخر", phone: "052", role: "كاشير", branchId: "branch-2", branchName: "النخيل", monthlySalary: 300000, status: "active", balanceHalalas: 0, balanceCaption: { key: "zero", labelAr: "متوازن" } },
    { id: "550e8400-e29b-41d4-a716-446655440104", empNumber: "1004", name: "مكرر ١", phone: "053", role: "كاشير", branchId: "branch-1", branchName: "العليا", monthlySalary: 300000, status: "active", balanceHalalas: 0, balanceCaption: { key: "zero", labelAr: "متوازن" } },
    { id: "550e8400-e29b-41d4-a716-446655440105", empNumber: "1004", name: "مكرر ٢", phone: "054", role: "كاشير", branchId: "branch-1", branchName: "العليا", monthlySalary: 300000, status: "active", balanceHalalas: 0, balanceCaption: { key: "zero", labelAr: "متوازن" } },
  ];
  assert.equal(resolveBranchEmployeeMatch(roster, "branch-1", "1001").status, "resolved");
  assert.equal(resolveBranchEmployeeMatch(roster, "branch-1", "1002").status, "not_found");
  assert.equal(resolveBranchEmployeeMatch(roster, "branch-1", "1003").status, "not_found");
  assert.equal(resolveBranchEmployeeMatch(roster, "branch-1", "1004").status, "duplicate");
});

test("FE-02 interactive form resolves employee by empNumber, blocks duplicate/wrong-sum, and submits atomic correction", async () => {
  const createRoot = await loadCreateRoot();
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  const detail = makeOperationDetail();
  const op = apiOpToCOp(detail);

  const roster: Employee[] = [
    { id: emp1Id, empNumber: "1001", name: "فهد العتيبي", phone: "050", role: "كاشير", branchId: "branch-1", branchName: "العليا", monthlySalary: 300000, status: "active", balanceHalalas: 0, balanceCaption: { key: "zero", labelAr: "متوازن" } },
    { id: emp2Id, empNumber: "1002", name: "سعد القحطاني", phone: "051", role: "كاشير", branchId: "branch-1", branchName: "العليا", monthlySalary: 300000, status: "active", balanceHalalas: 0, balanceCaption: { key: "zero", labelAr: "متوازن" } },
  ];

  qc.setQueryData(queryKeys.employees({ branchId: "branch-1", pageSize: 100 }), {
    data: roster,
    meta: { total: 2, page: 1, pageSize: 100, totalPages: 1 },
  });
  qc.setQueryData(["lookups", "branch-employee-by-number", "branch-1", "1001"], {
    status: "resolved",
    employee: { id: emp1Id, empNumber: "1001", name: "فهد العتيبي" },
  });
  qc.setQueryData(["lookups", "branch-employee-by-number", "branch-1", "9999"], {
    status: "not_found",
    employee: null,
  });

  const posted: Array<{ url: string; body: unknown; key?: unknown }> = [];
  const origGet = api.get.bind(api);
  const origPost = api.post.bind(api);
  api.get = (async (url: string) => {
    if (url.startsWith("/operations/")) return { data: detail } as never;
    return { data: { data: roster } } as never;
  }) as typeof api.get;
  api.post = (async (url: string, body?: unknown, config?: { headers?: Record<string, unknown> }) => {
    posted.push({ url, body, key: config?.headers?.["Idempotency-Key"] });
    return { data: { revision_number: 2 } } as never;
  }) as typeof api.post;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={authValue}>
            <LangContext.Provider value={langCtx("ar")}>
              <ShiftReportCorrectionForm op={op} detail={detail} />
            </LangContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );
    });

    // Gross sales is read-only (not an input), and counted cash is separate
    assert.match(container.textContent ?? "", /١٨٬٣٤٠٫٠٠/);
    const inputs = Array.from(container.querySelectorAll("input"));
    const ninjaInput = inputs.find((i) => i.value === "660.00");
    assert.ok(ninjaInput, "Aggregator item 1 input rendered");

    // Edit Ninja 660 -> 650 to create 10 SAR deficit
    await act(async () => {
      setControlValue(ninjaInput, "650.00", "input");
    });

    // Deficit panel + reason select appear automatically
    assert.match(container.textContent ?? "", /عجز تحصيل/);
    assert.match(container.textContent ?? "", /١٨٬٣٣٠٫٠٠/);

    // Select variance reason from taxonomy
    const reasonSelect = container.querySelector("select")!;
    await act(async () => {
      setControlValue(reasonSelect, "تأخر تحويل من تطبيقات التوصيل", "change");
    });

    // BE-01 cash confirmation gate activates because Ninja dropped 660->650 raising cash ceiling
    const confirmCheckbox = container.querySelector('[data-testid="cash-confirmation-gate"] input[type="checkbox"]') as HTMLInputElement;
    assert.ok(confirmCheckbox, "BE-01 cash confirmation checkbox shown");
    await act(async () => {
      confirmCheckbox.click();
    });

    // Enter unknown employee number 9999 -> name shows unknown & save is blocked
    const empNumberInput = container.querySelector('input[placeholder="مثال: 1001"]') as HTMLInputElement;
    await act(async () => {
      setControlValue(empNumberInput, "9999", "input");
    });
    assert.match(container.textContent ?? "", /غير موجود أو غير نشط/);

    const saveBtn = findButton(container, "حفظ التعديلات وإرسال اقتراح التحميل")!;
    await act(async () => saveBtn.click());
    assert.equal(posted.length, 0, "Submit blocked while employee is unknown and amount is 0");

    // Now enter valid employee 1001 & fill 10.00 via quick fill button
    await act(async () => {
      setControlValue(empNumberInput, "1001", "input");
    });
    assert.match(container.textContent ?? "", /فهد العتيبي/);

    const quickFillBtn = findButton(container, "المتبقي")!;
    await act(async () => quickFillBtn.click());

    await act(async () => saveBtn.click());
    assert.equal(posted.length, 1, "Atomic correction submitted once");
    assert.equal(posted[0].url, "/accountant/shifts/admin-shift-fe-1/corrections");
    assert.ok(posted[0].key, "Idempotency-Key attached");
  } finally {
    api.get = origGet;
    api.post = origPost;
    await act(async () => root.unmount());
    container.remove();
    qc.clear();
  }
});
