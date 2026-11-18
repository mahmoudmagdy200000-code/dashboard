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

test("FE-02: Mahmoud BE-01 cash confirmation rule, no false gate at custody=90, and custody-lowering path", () => {
  // Case A: Gross 200, Card 110, Apps 0, Initial Cash Collected 120, Posted Custody 90
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

  // 1. Editing card 110 -> 100 alone raises projected custody (90 -> 100) while old cash 120 > cap 100 -> blocked
  const draftCardOnly = {
    ...initialShiftCorrectionDraft(be01Detail),
    cardPaymentsSar: "100.00",
    reason: "تعديل الشبكة من ١١٠ إلى ١٠٠",
  };
  const preview1 = evaluateShiftCorrectionPreview(be01Detail, draftCardOnly);
  assert.equal(preview1.requiresExplicitCashConfirmation, true);
  assert.equal(preview1.cashAboveDerivedWhileIncreasing, true);
  assert.equal(preview1.cashExceedsDerivedCap, true);
  assert.equal(
    prepareShiftCorrectionRequest(be01Detail, draftCardOnly, { enforceCashConfirmation: true, cashConfirmed: true }),
    null,
    "Cannot auto-confirm an over-cap 120.00 cash figure when derived cap is 100.00",
  );

  // 2. Accountant explicitly sets cash = 90.00 -> custody stays 90, deficit 10 SAR, passes without extra checkbox
  const draftExplicit90 = {
    ...draftCardOnly,
    cashCollectedSar: "90.00",
  };
  const preview90 = evaluateShiftCorrectionPreview(be01Detail, draftExplicit90);
  assert.equal(preview90.cashEdited, true);
  assert.equal(preview90.requiresExplicitCashConfirmation, false);
  assert.equal(preview90.cashExceedsDerivedCap, false);
  assert.equal(preview90.collectionDiffHalalas, 1000, "200 - (100 card + 90 cash) = 10 SAR deficit");
  const req90 = prepareShiftCorrectionRequest(be01Detail, draftExplicit90, {
    enforceCashConfirmation: true,
    cashConfirmed: false,
  });
  assert.deepEqual(req90?.changes, { card_payments: "100.00", cash_collected: "90.00" });

  // 3. Card 110 -> 100 when actual cash & custody are ALREADY 90 -> custody stays 90 (90 <= 90),
  //    shows 10 SAR deficit and saves WITHOUT requiring extra cash confirmation!
  const detailActual90 = makeOperationDetail({
    payload: { ...be01Detail.payload!, cashActualHalalas: 9000, cashCollectedHalalas: 9000 },
  });
  const draft110To100Cash90 = {
    ...initialShiftCorrectionDraft(detailActual90),
    cardPaymentsSar: "100.00",
    reason: "تصحيح الشبكة مع بقاء الكاش 90",
  };
  const previewActual90 = evaluateShiftCorrectionPreview(detailActual90, draft110To100Cash90);
  assert.equal(previewActual90.requiresExplicitCashConfirmation, false, "Custody does not increase (90 -> 90)");
  assert.equal(previewActual90.cashExceedsDerivedCap, false);
  assert.equal(previewActual90.collectionDiffHalalas, 1000, "Deficit 10.00 SAR");
  assert.equal(previewActual90.targetShortageHalalas, 1000, "Requires 10.00 SAR allocation");
  const reqActual90 = prepareShiftCorrectionRequest(
    detailActual90,
    {
      ...draft110To100Cash90,
      shares: [{ type: "employee", id: emp1Id, empNumber: "1001", amountSar: "10.00" }],
    },
    { enforceCashConfirmation: true, cashConfirmed: false, allowNewShares: true },
  );
  assert.deepEqual(reqActual90?.changes, { card_payments: "100.00" });
  assert.deepEqual(reqActual90?.shortage_allocations, [{ type: "employee", id: emp1Id, amount: 1000 }]);

  // 4. Custody-lowering edit (card 90 -> 110, untouched old cash 120 -> custody drops 110 -> 90)
  //    must pass under BE-01 rules without forcing cash edit or tripping cashExceedsDerivedCap.
  const detailLowering = makeOperationDetail({
    payload: {
      ...be01Detail.payload!,
      salesHalalas: 20000,
      cardTotalHalalas: 9000,
      cashActualHalalas: 9000,
      cashCollectedHalalas: 12000,
    },
  });
  const draftLowering = {
    ...initialShiftCorrectionDraft(detailLowering),
    cardPaymentsSar: "110.00",
    reason: "تصحيح يخفض العهدة إلى 90",
  };
  const previewLowering = evaluateShiftCorrectionPreview(detailLowering, draftLowering);
  assert.equal(previewLowering.projectedCustodyCashHalalas, 9000);
  assert.equal(previewLowering.requiresExplicitCashConfirmation, false);
  assert.equal(previewLowering.cashExceedsDerivedCap, false, "Untouched old cash does not block custody reduction");
  const reqLowering = prepareShiftCorrectionRequest(detailLowering, draftLowering, {
    enforceCashConfirmation: true,
    cashConfirmed: false,
  });
  assert.deepEqual(reqLowering?.changes, { card_payments: "110.00" });

  // 5. Real custody increase (card 110 -> 100, untouched initial cash 100 -> posted 90, projected 100)
  //    MUST still demand explicit cash confirmation checkbox & send cash_collected="100.00".
  const detailInitial100 = makeOperationDetail({
    payload: { ...be01Detail.payload!, cashCollectedHalalas: 10000 },
  });
  const draftIncrease = {
    ...initialShiftCorrectionDraft(detailInitial100),
    cardPaymentsSar: "100.00",
    reason: "زيادة حقيقية للعهدة إلى 100",
  };
  const previewIncrease = evaluateShiftCorrectionPreview(detailInitial100, draftIncrease);
  assert.equal(previewIncrease.requiresExplicitCashConfirmation, true);
  assert.equal(previewIncrease.cashAboveDerivedWhileIncreasing, false);
  assert.equal(
    prepareShiftCorrectionRequest(detailInitial100, draftIncrease, { enforceCashConfirmation: true, cashConfirmed: false }),
    null,
    "Blocks auto-save without explicit confirmation when custody genuinely increases",
  );
  const reqIncreaseConfirmed = prepareShiftCorrectionRequest(detailInitial100, draftIncrease, {
    enforceCashConfirmation: true,
    cashConfirmed: true,
  });
  assert.deepEqual(reqIncreaseConfirmed?.changes, { card_payments: "100.00", cash_collected: "100.00" });
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

    // Custody stays 4200 -> 4200 when Ninja drops 660 -> 650 with cash=4200:
    // BE-01 cash-confirmation gate must NOT trigger unnecessarily.
    assert.equal(container.querySelector('[data-testid="cash-confirmation-gate"]'), null, "No extra cash gate when custody does not increase");

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

test("FE-02 UI: card 110->100 with cash=90 saves deficit without extra confirm; lowering saves untouched; real increase gates Save", async () => {
  const createRoot = await loadCreateRoot();
  const roster: Employee[] = [
    { id: emp1Id, empNumber: "1001", name: "فهد العتيبي", phone: "050", role: "كاشير", branchId: "branch-1", branchName: "العليا", monthlySalary: 300000, status: "active", balanceHalalas: 0, balanceCaption: { key: "zero", labelAr: "متوازن" } },
  ];

  async function mountScenario(detailOverride: ApiOperation, fn: (ctx: { container: HTMLDivElement; posted: Array<{ url: string; body: any }> }) => Promise<void>) {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    qc.setQueryData(queryKeys.employees({ branchId: "branch-1", pageSize: 100 }), {
      data: roster,
      meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
    });
    qc.setQueryData(["lookups", "branch-employee-by-number", "branch-1", "1001"], {
      status: "resolved",
      employee: { id: emp1Id, empNumber: "1001", name: "فهد العتيبي" },
    });
    const posted: Array<{ url: string; body: any }> = [];
    const origGet = api.get.bind(api);
    const origPost = api.post.bind(api);
    api.get = (async () => ({ data: detailOverride }) as never) as typeof api.get;
    api.post = (async (url: string, body?: unknown) => {
      posted.push({ url, body });
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
                <ShiftReportCorrectionForm op={apiOpToCOp(detailOverride)} detail={detailOverride} />
              </LangContext.Provider>
            </AuthContext.Provider>
          </QueryClientProvider>,
        );
      });
      await fn({ container, posted });
    } finally {
      api.get = origGet;
      api.post = origPost;
      await act(async () => root.unmount());
      container.remove();
      qc.clear();
    }
  }

  // A. Card 110 -> 100 with cash=90 & custody=90: shows 10 SAR deficit, no extra BE-01 cash gate, saves cleanly
  const detailCash90 = makeOperationDetail({
    payload: {
      shiftId: "shift-cash-90",
      reportRevision: 1,
      allocationVersion: null,
      cashCountState: "counted",
      salesHalalas: 20000,
      cardTotalHalalas: 11000,
      cashActualHalalas: 9000,
      cashExpectedHalalas: 9000,
      confirmedOpeningHalalas: 0,
      cashCollectedHalalas: 9000,
      aggregatorTotalsHalalas: 0,
      aggregatorBreakdown: [],
      pkg6Review: { phase: "accountant_review" },
    },
  });
  await mountScenario(detailCash90, async ({ container, posted }) => {
    const cardInput = Array.from(container.querySelectorAll("input")).find((i) => i.value === "110.00")!;
    await act(async () => setControlValue(cardInput, "100.00", "input"));
    assert.match(container.textContent ?? "", /عجز تحصيل/);
    assert.match(container.textContent ?? "", /١٠٫٠٠/);
    assert.equal(container.querySelector('[data-testid="cash-confirmation-gate"]'), null, "No extra confirmation when custody stays 90");

    await act(async () => setControlValue(container.querySelector("select")!, "خطأ في جهاز نقطة البيع (POS)", "change"));
    await act(async () => setControlValue(container.querySelector('input[placeholder="مثال: 1001"]') as HTMLInputElement, "1001", "input"));
    await act(async () => findButton(container, "المتبقي")!.click());
    const saveBtn = findButton(container, "حفظ التعديلات وإرسال اقتراح التحميل")!;
    assert.equal(saveBtn.disabled, false);
    await act(async () => saveBtn.click());
    assert.equal(posted.length, 1);
    assert.deepEqual(posted[0].body.changes, { card_payments: "100.00" });
    assert.deepEqual(posted[0].body.shortage_allocations, [{ type: "employee", id: emp1Id, amount: 1000 }]);
  });

  // B. Custody-lowering (card 90 -> 110, untouched old cash 120): allowed under BE-01 without touching cash
  const detailLower = makeOperationDetail({
    payload: {
      shiftId: "shift-lower",
      reportRevision: 1,
      allocationVersion: null,
      cashCountState: "counted",
      salesHalalas: 20000,
      cardTotalHalalas: 9000,
      cashActualHalalas: 9000,
      cashExpectedHalalas: 11000,
      confirmedOpeningHalalas: 0,
      cashCollectedHalalas: 12000,
      aggregatorTotalsHalalas: 0,
      aggregatorBreakdown: [],
      pkg6Review: { phase: "accountant_review" },
    },
  });
  await mountScenario(detailLower, async ({ container, posted }) => {
    const cardInput = Array.from(container.querySelectorAll("input")).find((i) => i.value === "90.00")!;
    await act(async () => setControlValue(cardInput, "110.00", "input"));
    assert.equal(container.querySelector('[data-testid="cash-confirmation-gate"]'), null);
    assert.doesNotMatch(container.textContent ?? "", /الكاش المحصّل يتجاوز المتبقي/);

    await act(async () => setControlValue(container.querySelector("select")!, "خطأ في جهاز نقطة البيع (POS)", "change"));
    const saveBtn = findButton(container, "حفظ التعديلات")!;
    assert.equal(saveBtn.disabled, false);
    await act(async () => saveBtn.click());
    assert.equal(posted.length, 1);
    assert.deepEqual(posted[0].body.changes, { card_payments: "110.00" });
  });

  // C. Real custody increase (card 110 -> 100, untouched cash 100, posted custody 90 -> 100): requires explicit confirmation
  const detailIncrease = makeOperationDetail({
    payload: {
      shiftId: "shift-inc",
      reportRevision: 1,
      allocationVersion: null,
      cashCountState: "counted",
      salesHalalas: 20000,
      cardTotalHalalas: 11000,
      cashActualHalalas: 10000,
      cashExpectedHalalas: 9000,
      confirmedOpeningHalalas: 0,
      cashCollectedHalalas: 10000,
      aggregatorTotalsHalalas: 0,
      aggregatorBreakdown: [],
      pkg6Review: { phase: "accountant_review" },
    },
  });
  await mountScenario(detailIncrease, async ({ container, posted }) => {
    const cardInput = Array.from(container.querySelectorAll("input")).find((i) => i.value === "110.00")!;
    await act(async () => setControlValue(cardInput, "100.00", "input"));
    const confirmCheckbox = container.querySelector('[data-testid="cash-confirmation-gate"] input[type="checkbox"]') as HTMLInputElement;
    assert.ok(confirmCheckbox, "BE-01 explicit cash confirmation gate required when custody genuinely increases");

    await act(async () => setControlValue(container.querySelector("select")!, "خطأ في جهاز نقطة البيع (POS)", "change"));
    const saveBtn = findButton(container, "حفظ التعديلات")!;
    assert.equal(saveBtn.disabled, true, "Save stays disabled before confirming cash increase");
    await act(async () => saveBtn.click());
    assert.equal(posted.length, 0);

    await act(async () => confirmCheckbox.click());
    assert.equal(saveBtn.disabled, false);
    await act(async () => saveBtn.click());
    assert.equal(posted.length, 1);
    assert.deepEqual(posted[0].body.changes, { card_payments: "100.00", cash_collected: "100.00" });
  });
});
