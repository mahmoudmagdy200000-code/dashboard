import { type Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures';
import { randomUUID } from 'node:crypto';
import { env } from '../../src/env';
import { evaluateMutationGuard } from '../../src/guards';
import { SCENARIOS, expectedResults, halalasToSar, sarToHalalas } from '../../src/finance';
import { errorCode, validationMessages, describe as d } from '../../src/api/client';
import { cashier, manager, ops, ok, endPayload, findShfForCashierShift, findDayOp, pollFor, type CashierSales } from '../../src/api/shiftCycle';
import { adminAs, branchManager, cashierActor, releaseActors } from '../../src/actors';
import { expectLogin, fixtureEmail, loginAdmin, logoutAdmin } from '../../src/api/auth';
import { PhaseState } from '../../src/state';
import { traces, blocked, type Layer } from '../../src/trace';
import { openAs, AccountantShiftReview, AccountantSales, HeadModule, expectPanelLine, enMoney } from '../../src/ui/dashboard';

/**
 * MAIN SHIFT LIFECYCLE — Business Rules v3.4.
 *
 * Coverage layers (stated per test, never overstated):
 *  - Cashier and branch-manager steps run through the REAL Laravel mobile API
 *    (there is no web UI for them in the dashboard repo): API-assisted.
 *  - Accountant / head review steps run through the REAL React dashboard when
 *    ASSAB_E2E_UI=true and ASSAB_E2E_FRONTEND_URL is set (UI E2E); otherwise the
 *    same backend actions run through the API and the test says "api-only".
 *
 * Reference example (BR v3.4 §4, zero confirmed opening): gross 115, cards 50,
 * apps 25, confirmed opening 0, counted 20 → net 100, VAT 15, cash sales 40,
 * expected 40, variance −20, shortage 20 (fully allocated to the cashier).
 */

type S = {
  businessDate: string;
  managerId: string;
  managerDayId: string;
  cashierId: string;
  templateId: string;
  aggregatorId: string;
  cashierShiftId: string;
  started: boolean;
  submitted: boolean;
  handoverId: string;
  attemptId: string;
  receiptConfirmed: boolean;
  shfOpId: string;
  shfPublicId: string;
  adminShiftId: string;
  reportRevision: number;
  liabilityApproved: boolean;
  daySubmitted: boolean;
  dayOpId: string;
  dayPublicId: string;
  shfAccountantApproved: boolean;
  dayAccountantApproved: boolean;
  shfFinal: boolean;
  dayFinal: boolean;
};

const state = new PhaseState<S>('lifecycle');
const guard = evaluateMutationGuard(env);
// Mode C is restricted to the separately approved balanced 115/50/25/0/40
// scenario. The original shortage lifecycle remains available in Mode B.
const figures = env.mode === 'staging-financial'
  ? { ...SCENARIOS.zeroOpening, countedSar: '40.00' }
  : SCENARIOS.zeroOpening;
const R = expectedResults(figures);
const ui = env.ui && Boolean(env.frontendUrl);
const reviewLayer: Layer = ui ? 'ui-e2e' : 'api-only';

function sales(aggregatorId: string): CashierSales {
  return { ...figures, aggregatorId };
}

const num = (v: unknown) => Number(v);

test.beforeEach(() => {
  if (!guard.allowed) blocked(`financial mutation guard refused: ${guard.reasons.join('; ')}`);
  if (env.openingScenario === 'confirmed10') {
    blocked('opening scenario "confirmed10" needs a proven confirmed incoming transfer from a previous shift; the suite does not fabricate one (CASH-01..03)');
  }
});

test.afterAll(async () => {
  await releaseActors();
});

// ── Phase 1 ───────────────────────────────────────────────────────────────
test('P01 authentication: every lifecycle actor signs in on its real surface', async () => {
  traces('api-only'); // infrastructure: no business rule; role probes live in tests/preflight
  state.reset();
  const acc = await adminAs('accountant');
  const head = await adminAs('head-accountant');
  expect(acc.user.roles.map((r) => r.key)).toContain('accountant');
  expect(head.user.roles.map((r) => r.key)).toContain('head');
  const bm = await branchManager();
  const c = await cashierActor();
  state.set({ businessDate: env.businessDate, managerId: bm.user.id, cashierId: c.user.id });
});

// ── Phase 2 ───────────────────────────────────────────────────────────────
test('P02 shift preparation: manager day open, assignment, cashier start', async () => {
  traces('api-assisted', 'AC-37', 'OPS-08');
  const s = state.need('cashierId', 'businessDate');
  const bm = (await branchManager()).api;
  const c = (await cashierActor()).api;

  const cur = ok(await manager.current(bm), 'manager workday/current');
  const day = cur.body?.data?.shift;
  expect(day?.id, `manager day: ${d(cur)}`).toBeTruthy();
  if (day.status === 'not_started') ok(await manager.start(bm), 'manager workday/start');
  else expect(day.status, 'manager day must be open for receipts').toBe('in_progress');

  const tpl = ok(await manager.templates(bm), 'branch shift templates');
  const templates = (tpl.body?.data ?? []) as Array<{ id: string; name: string; is_active: boolean }>;
  const template = templates.find((t) => t.is_active && t.name.startsWith('[HARNESS]'));
  if (!template) blocked('no active "[HARNESS]" shift template in the fixture branch');

  // One lifecycle per fixture per business date: (cashier, shift template, date) is unique.
  const before = ok(await cashier.myShifts(c), 'my-shifts');
  const existing = ((before.body?.data ?? []) as Array<{ id: string; shift_date: string; status: string }>).find((x) => x.shift_date?.startsWith(s.businessDate));
  if (existing && existing.status !== 'not_started') {
    blocked(`fixture cashier already has a ${existing.status} shift on ${s.businessDate} (${existing.id}); one lifecycle per fixture per business date`);
  }
  if (!existing) ok(await manager.assign(bm, s.cashierId, template!.id, s.businessDate), 'assign-shifts');

  const assigned = ok(await cashier.myShifts(c), 'my-shifts after assignment');
  const shift = ((assigned.body?.data ?? []) as Array<{ id: string; shift_date: string; status: string }>).find((x) => x.shift_date?.startsWith(s.businessDate));
  expect(shift?.status, `assigned shift: ${d(assigned)}`).toBe('not_started');
  test.info().annotations.push({ type: 'gap', description: 'Backend has no explicit cashier "accept assignment" endpoint; starting the shift is the acceptance (only reassign/accept exists).' });

  const started = ok(await cashier.start(c, shift!.id), 'cashier start');
  expect(started.body?.data?.status ?? 'in_progress').toBe('in_progress');
  state.set({ managerDayId: day.id, templateId: template!.id, cashierShiftId: shift!.id, started: true });
});

// ── Phase 3 ───────────────────────────────────────────────────────────────
test('P03 opening balance is zero without a proven confirmed transfer', async () => {
  traces('api-assisted', 'AC-10', 'CASH-01', 'CASH-02');
  const s = state.need('cashierShiftId', 'started');
  const c = (await cashierActor()).api;
  const aggs = ok(await cashier.aggregators(c), 'aggregators');
  const list = (Array.isArray(aggs.body?.data) ? aggs.body.data : aggs.body?.data?.data ?? []) as Array<{ id: string; is_active?: boolean }>;
  const agg = list.find((a) => a.is_active !== false);
  if (!agg) blocked('no active aggregator exists; apps 25 SAR needs aggregator_id (exists:aggregators,id)');
  state.set({ aggregatorId: agg!.id });

  const pv = ok(await cashier.preview(c, s.cashierShiftId, endPayload(sales(agg!.id), halalasToSar(R.cashSalesH), [])), 'reconciliation preview');
  const rec = pv.body?.data?.cash_reconciliation ?? pv.body?.cash_reconciliation;
  expect(rec, d(pv)).toBeTruthy();
  expect(num(rec.confirmed_opening_cash), 'confirmed opening (no confirmed receipt exists)').toBe(0);
  expect(num(rec.pending_incoming_cash), 'pending incoming is not opening cash').toBe(0);
});

// ── Phase 4 ───────────────────────────────────────────────────────────────
test('P04 sales and reconciliation: server computes the approved fixture values', async () => {
  traces('api-assisted', 'AC-01', 'AC-02', 'SAL-01', 'SAL-02', 'SAL-03', 'SAL-04', 'CASH-08', 'DIFF-01');
  const s = state.need('cashierShiftId', 'aggregatorId');
  const c = (await cashierActor()).api;
  const pv = ok(await cashier.preview(c, s.cashierShiftId, endPayload(sales(s.aggregatorId), halalasToSar(R.cashSalesH), [])), 'preview');
  const data = pv.body?.data ?? pv.body;
  const rec = data.cash_reconciliation;
  expect(num(rec.counted_cash) * 100, 'counted cash is the independent input').toBe(sarToHalalas(figures.countedSar));
  expect(num(rec.expected_cash) * 100).toBe(R.expectedCashH);
  expect(num(rec.cash_variance) * 100).toBe(R.varianceH);
  if (R.shortageH > 0) expect(rec.cash_variance_type).toBe('shortage');
  expect(num(data.shortage_to_allocate ?? 0) * 100).toBe(R.shortageH);
  expect(Boolean(data.allocation_required)).toBe(R.shortageH > 0);
  expect(R.netH).toBe(100_00);
  expect(R.vatH).toBe(15_00);
});

// Mode C stops after this one balanced report. It never enters the shortage,
// handover or approval phases of the broader isolated lifecycle.
test('P04b staging balanced shift report: submit once, no handover', async () => {
  traces('api-assisted', 'SAL-01', 'SAL-02', 'SAL-04', 'CASH-01');
  if (env.mode !== 'staging-financial') test.skip(true, 'balanced report is Mode C only');
  const s = state.need('cashierShiftId', 'aggregatorId');
  const c = (await cashierActor()).api;
  expect(R.varianceH).toBe(0);
  expect(R.shortageH).toBe(0);
  const payload = endPayload(sales(s.aggregatorId), halalasToSar(R.cashSalesH), []);
  const r = ok(await cashier.endOnly(c, s.cashierShiftId, payload), 'balanced end-only');
  const summary = r.body?.data?.summary ?? r.body?.data;
  expect(num(summary.total_sales) * 100).toBe(R.grossH);
  expect(num(summary.net_sales) * 100).toBe(R.netH);
  expect(num(summary.vat_amount) * 100).toBe(R.vatH);
  expect(summary.handover_status).toBe('pending');
  state.set({ submitted: true });
});

// ── Phase 5 ───────────────────────────────────────────────────────────────
test('P05 shortage allocation: an incomplete allocation is rejected and nothing closes', async () => {
  traces('api-assisted', 'AC-04', 'DIFF-02');
  const s = state.need('cashierShiftId', 'aggregatorId', 'managerId', 'cashierId');
  const c = (await cashierActor()).api;
  const partial = endPayload(sales(s.aggregatorId), halalasToSar(R.cashSalesH), [{ type: 'cashier', id: s.cashierId, amountSar: '10.00' }]);
  const r = await cashier.endWithHandoverToManager(c, s.cashierShiftId, partial, s.managerId, figures.countedSar);
  expect(r.status, d(r)).toBe(422);
  expect(validationMessages(r.body)).toContain('ALLOCATION_INCOMPLETE');
  const mine = ok(await cashier.myShifts(c), 'my-shifts');
  const shift = (mine.body?.data ?? []).find((x: { id: string }) => x.id === s.cashierShiftId);
  expect(shift?.status, 'shift must stay open after a rejected close').toBe('in_progress');
});

// ── Phase 6 ───────────────────────────────────────────────────────────────
test('P06 shift report submission with a complete allocation (custody not yet transferred)', async () => {
  traces('api-assisted', 'AC-13', 'AC-36', 'DIFF-02', 'CASH-06', 'CASH-08', 'SAL-01');
  const s = state.need('cashierShiftId', 'aggregatorId', 'managerId', 'cashierId');
  const c = (await cashierActor()).api;
  const full = endPayload(sales(s.aggregatorId), halalasToSar(R.cashSalesH), [{ type: 'cashier', id: s.cashierId, amountSar: halalasToSar(R.shortageH) }]);
  const r = ok(await cashier.endWithHandoverToManager(c, s.cashierShiftId, full, s.managerId, figures.countedSar), 'end-with-handover');
  const sum = r.body?.data?.summary ?? r.body?.data;
  expect(num(sum.total_sales) * 100, 'gross (VAT-inclusive) as entered').toBe(R.grossH);
  expect(num(sum.net_sales) * 100).toBe(R.netH);
  expect(num(sum.vat_amount) * 100).toBe(R.vatH);
  expect(sum.handover_details?.status, 'handover request is pending, not received').toBe('pending');
  state.set({ submitted: true });
});

// ── Phase 7 ───────────────────────────────────────────────────────────────
test('P07 cash handover: request ≠ receipt, presentation is idempotent, confirmation is single-effect', async () => {
  traces('api-assisted', 'AC-08', 'AC-36', 'CASH-05', 'CASH-06', 'CASH-07');
  const s = state.need('cashierShiftId', 'submitted');
  const bm = (await branchManager()).api;
  const c = (await cashierActor()).api;

  const findHandoff = async () => {
    const h = ok(await manager.handoffs(bm), 'workday/handoffs');
    return ((h.body?.data?.handoffs?.to_branch_manager ?? []) as Array<{ handover_id: string; cashier_shift_id: string; status: string; approved_at: string | null }>)
      .find((x) => x.cashier_shift_id === s.cashierShiftId);
  };
  const pending = await pollFor('handoff to branch manager', findHandoff);
  expect(pending.status, 'custody does not transfer on request').toBe('pending');
  expect(pending.approved_at).toBeNull();

  const key = randomUUID();
  const p1 = ok(await cashier.present(c, pending.handover_id, sarToHalalas(figures.countedSar), key), 'present');
  const p2 = ok(await cashier.present(c, pending.handover_id, sarToHalalas(figures.countedSar), key), 'present replay');
  expect(p2.body?.data?.id, 'same idempotency key → same attempt').toBe(p1.body?.data?.id);
  const attemptId = p1.body.data.id as string;

  const stillPending = await findHandoff();
  expect(stillPending?.status, 'presentation alone is not receipt').toBe('pending');

  const rc = ok(await manager.confirmReceipt(bm, attemptId, 20_00), 'confirm-receipt');
  expect(rc.body?.data?.confirmed_amount ?? rc.body?.confirmed_amount).toBe('20.00');

  const again = await manager.confirmReceipt(bm, attemptId, 20_00);
  expect(again.status, `repeated confirmation: ${d(again)}`).toBe(409);
  expect(errorCode(again.body)).toBe('HANDOVER_NOT_PENDING');

  const accepted = await findHandoff();
  expect(accepted?.status).toBe('accepted');
  expect(accepted?.approved_at).toBeTruthy();
  state.set({ handoverId: pending.handover_id, attemptId, receiptConfirmed: true });
});

// ── Phase 8 ───────────────────────────────────────────────────────────────
test('P08 branch manager approves shortage liability, closes the day and submits the daily report', async () => {
  traces('api-assisted', 'AC-05', 'AC-35', 'DIFF-03', 'DAY-01', 'DAY-02', 'DAY-03');
  const s = state.need('cashierShiftId', 'receiptConfirmed', 'managerDayId');
  const acc = (await adminAs('accountant')).api;
  const bm = (await branchManager()).api;

  const found = await pollFor('SHF operation projected for the cashier shift', async () => {
    const f = await findShfForCashierShift(acc, env.branchId, s.cashierShiftId);
    return f.op ? f : undefined;
  });
  const det = found.detail;
  const p = det.payload;
  expect(p.salesHalalas).toBe(R.grossH);
  expect(p.cardTotalHalalas).toBe(50_00);
  expect(p.aggregatorTotalsHalalas).toBe(25_00);
  expect(p.cashExpectedHalalas).toBe(R.expectedCashH);
  expect(p.cashActualHalalas).toBe(20_00);
  expect(p.varianceHalalas).toBe(R.varianceH);
  expect(p.cashCountState).toBe('counted');
  expect(det.confirmedOpeningHalalas ?? 0, 'configured opening is not confirmed opening').toBe(0);
  const shares = det.liability.shares as Array<{ amountHalalas: number }>;
  expect(shares.reduce((a, x) => a + x.amountHalalas, 0), 'shortage fully allocated').toBe(R.shortageH);
  expect(det.liability.managerApprovalStatus).toBe('pending');

  ok(await manager.approveLiability(bm, s.cashierShiftId, det.liability.version, det.reportRevision), 'liability approve');
  const after = ok(await ops.detail(acc, found.op!.id), 'SHF detail after manager approval');
  expect(after.body.liability.managerApprovalStatus).toBe('approved');

  ok(await manager.end(bm), 'manager workday/end');
  const cur = ok(await manager.current(bm), 'workday/current after end');
  expect(cur.body?.data?.shift?.status).toBe('completed');
  const rev = cur.body?.data?.shift?.daily_close?.report_revision;
  expect(typeof rev, d(cur)).toBe('number');

  const key = randomUUID();
  ok(await manager.submitDay(bm, s.managerDayId, rev, key), 'daily-close/submit');
  const replay = await manager.submitDay(bm, s.managerDayId, rev, key);
  expect([200, 409], `submit replay must not create a second effect: ${d(replay)}`).toContain(replay.status);

  const day = await pollFor('daily sales operation', async () => {
    const f = await findDayOp(acc, env.branchId, s.managerDayId);
    return f.op ? f : undefined;
  });
  state.set({
    shfOpId: found.op!.id, shfPublicId: found.op!.publicId, adminShiftId: p.shiftId, reportRevision: after.body.reportRevision,
    liabilityApproved: true, daySubmitted: true, dayOpId: day.op!.id, dayPublicId: day.op!.publicId,
  });
});

test('P08b a role-less tenant member cannot read the submitted shift', async () => {
  traces('api-only');
  const s = state.need('shfOpId');
  const r = expectLogin('restricted', await loginAdmin(env.apiOrigin!, fixtureEmail(env.namespace, 'restricted'), env.password!));
  try {
    const list = await r.api.get('operations', { moduleKey: 'shifts', branchId: env.branchId, pageSize: 20 });
    const visible = list.status === 200 && ((list.body?.data ?? []) as Array<{ id: string }>).some((o) => o.id === s.shfOpId);
    expect(visible, `restricted user listing operations: HTTP ${list.status}${visible ? ' — SHF visible' : ''}`).toBe(false);
    const one = await r.api.get(`operations/${s.shfOpId}`);
    expect([403, 404], `restricted GET operations/{id}: ${d(one)}`).toContain(one.status);
  } finally {
    await logoutAdmin(r);
  }
});

// ── Phase 9 ───────────────────────────────────────────────────────────────
async function accountantApproveShfViaUi(page: Page, publicId: string): Promise<void> {
  const acc = await adminAs('accountant');
  await openAs(page, env.frontendUrl!, acc, 'accountant');
  const view = new AccountantShiftReview(page);
  await view.open();
  const panel = await view.expand(publicId);
  await expect(panel.getByText(/^Physically counted$/)).toBeVisible();
  await expectPanelLine(panel, 'Gross sales (including VAT)', enMoney(R.grossH));
  await expectPanelLine(panel, 'Card total', enMoney(50_00));
  await expectPanelLine(panel, 'Aggregators (before commission)', enMoney(25_00));
  await expectPanelLine(panel, 'Expected cash', enMoney(R.expectedCashH));
  await expectPanelLine(panel, 'Counted cash', enMoney(20_00));
  await expectPanelLine(panel, 'Shortage', enMoney(R.varianceH));
  await view.approveButton(publicId).click();
}

test('P09a accountant: gross-sales modification is refused', async () => {
  traces('api-only', 'AC-23', 'COR-05', 'EXP-06');
  const s = state.need('cashierShiftId', 'reportRevision', 'daySubmitted');
  const acc = (await adminAs('accountant')).api;
  const r = await ops.correct(acc, s.cashierShiftId, { expected_revision: s.reportRevision, reason: 'E2E: gross tamper must be refused', changes: { total_sales: '200.00' } });
  expect(r.status, d(r)).toBe(422);
  expect(errorCode(r.body) ?? validationMessages(r.body).join(',')).toContain('GROSS_SALES_MODIFICATION_PROHIBITED');
  const det = ok(await ops.detail(acc, state.read().shfOpId!), 'SHF detail');
  expect(det.body.payload.salesHalalas, 'gross sales unchanged').toBe(R.grossH);
});

test('P09b accountant approves the cashier shift and the daily report', async ({ page }) => {
  traces(reviewLayer, 'AC-61', 'COR-05');
  if (!ui) test.info().annotations.push({ type: 'NOT_RUN', description: 'UI review step not run (ASSAB_E2E_UI=false or no ASSAB_E2E_FRONTEND_URL); backend action executed via API instead' });
  const s = state.need('shfOpId', 'shfPublicId', 'dayOpId', 'dayPublicId');
  const acc = (await adminAs('accountant')).api;

  if (ui) await accountantApproveShfViaUi(page, s.shfPublicId);
  else ok(await ops.approve(acc, s.shfOpId), 'approve SHF');
  await expect.poll(async () => (await ops.detail(acc, s.shfOpId)).body?.status).toBe('approved');
  state.set({ shfAccountantApproved: true });

  if (ui) {
    const view = new AccountantSales(page);
    await view.open();
    await view.approveButton(s.dayPublicId).click();
  } else ok(await ops.approve(acc, s.dayOpId), 'approve daily report');
  await expect.poll(async () => (await ops.detail(acc, s.dayOpId)).body?.status).toBe('approved');
  state.set({ dayAccountantApproved: true });
});

test('P09c after accountant approval the report is locked for accountant edits', async () => {
  traces('api-only', 'COR-05', 'COR-08');
  const s = state.need('shfOpId', 'cashierShiftId', 'reportRevision', 'shfAccountantApproved');
  const acc = (await adminAs('accountant')).api;
  const again = await ops.approve(acc, s.shfOpId);
  expect(again.status, d(again)).toBe(409);
  expect(errorCode(again.body)).toBe('OP_NOT_PENDING');
  const corr = await ops.correct(acc, s.cashierShiftId, { expected_revision: s.reportRevision, reason: 'E2E: edit after approval', changes: { card_payments: '40.00' } });
  expect(corr.status, d(corr)).toBe(409);
  expect(errorCode(corr.body)).toBe('REPORT_IN_HEAD_REVIEW');
});

// ── Phase 10 ──────────────────────────────────────────────────────────────
test('P10a head: the day cannot be finalised before its shifts', async () => {
  traces('api-only', 'AC-61', 'DAY-03');
  const s = state.need('dayOpId', 'dayAccountantApproved');
  const head = (await adminAs('head-accountant')).api;
  const r = await ops.finalApprove(head, s.dayOpId);
  expect(r.status, d(r)).toBe(409);
  expect(errorCode(r.body)).toBe('DAY_MEMBER_NOT_FINAL_CURRENT');
});

test('P10b head final approval of the cashier shift, then the day', async ({ page }) => {
  traces(reviewLayer, 'AC-61');
  if (!ui) test.info().annotations.push({ type: 'NOT_RUN', description: 'UI head step not run; backend action executed via API instead' });
  const s = state.need('shfOpId', 'shfPublicId', 'dayOpId', 'dayPublicId', 'dayAccountantApproved');
  const head = await adminAs('head-accountant');

  if (ui) {
    await openAs(page, env.frontendUrl!, head, 'head');
    const view = new HeadModule(page);
    await view.openShifts();
    await view.finalApproveButton(s.shfPublicId).click();
  } else {
    const r = await ops.finalApprove(head.api, s.shfOpId);
    expect(r.status, `head final approval of SHF: ${d(r)}`).toBe(200);
  }
  await expect.poll(async () => (await ops.detail(head.api, s.shfOpId)).body?.status, { message: 'SHF final' }).toBe('final-approved');
  state.set({ shfFinal: true });

  if (ui) {
    const view = new HeadModule(page);
    await view.openSales();
    await view.finalApproveButton(s.dayPublicId).click();
  } else ok(await ops.finalApprove(head.api, s.dayOpId), 'head final approval of day');
  await expect.poll(async () => (await ops.detail(head.api, s.dayOpId)).body?.status, { message: 'day final' }).toBe('final-approved');
  state.set({ dayFinal: true });
});

test('P10c audit trail records each review stage with its actor', async () => {
  traces('api-only', 'AUD-01');
  const s = state.need('shfOpId', 'shfFinal');
  const acc = (await adminAs('accountant')).api;
  const a = ok(await ops.audit(acc, s.shfOpId), 'audit-trail');
  const rows = (a.body?.data ?? []) as Array<{ action: string; by: string; time: string }>;
  expect(rows.length).toBeGreaterThanOrEqual(2);
  for (const row of rows) {
    expect(row.by, 'actor recorded').toBeTruthy();
    expect(row.time, 'timestamp recorded').toBeTruthy();
  }
});

// ── Phase 11 ──────────────────────────────────────────────────────────────
test('P11 post-final immutability is enforced by the backend', async () => {
  traces('api-only', 'AC-43', 'COR-09', 'CASH-14');
  const s = state.need('shfOpId', 'cashierShiftId', 'reportRevision', 'shfFinal', 'dayFinal', 'adminShiftId');
  const acc = (await adminAs('accountant')).api;
  const head = (await adminAs('head-accountant')).api;
  const snapshot = ok(await ops.detail(acc, s.shfOpId), 'SHF before probes').body;

  const probes = [
    ['approve again', await ops.approve(acc, s.shfOpId)],
    ['final again', await ops.finalApprove(head, s.shfOpId)],
    ['accountant correction', await ops.correct(acc, s.cashierShiftId, { expected_revision: s.reportRevision, reason: 'E2E post-final', changes: { card_payments: '40.00' } })],
    ['reject', await ops.reject(acc, s.shfOpId, 'other', 'E2E post-final reject')],
  ] as const;
  for (const [label, r] of probes) expect(r.status, `${label} after final: ${d(r)}`).toBeGreaterThanOrEqual(400);

  const after = ok(await ops.detail(acc, s.shfOpId), 'SHF after probes').body;
  expect(after.status).toBe('final-approved');
  expect(after.payload).toEqual(snapshot.payload);
  expect(after.reportRevision).toBe(snapshot.reportRevision);
});

