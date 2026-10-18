import { test, expect } from '../../src/fixtures';
import { randomUUID } from 'node:crypto';
import { env } from '../../src/env';
import { evaluateMutationGuard } from '../../src/guards';
import { expectedResults, halalasToSar, sarToHalalas, type ShiftFigures } from '../../src/finance';
import { errorCode, describe as d, type ApiClient } from '../../src/api/client';
import { cashier, manager, ok, endPayload, findShfForCashierShift, pollFor } from '../../src/api/shiftCycle';
import { adminAs, branchManager, cashierActor, releaseActors } from '../../src/actors';
import { traces, blocked } from '../../src/trace';

/**
 * SECONDARY REGRESSION — API-only integration coverage against the real
 * Laravel backend (no dashboard UI is involved in these cashier/manager
 * steps). Each financial scenario needs its own (cashier, shift template,
 * business date) slot; the isolated bootstrap provisions "[E2E-REG]"
 * templates for that. Where they do not exist (e.g. the staging fixture) the
 * scenario is reported BLOCKED, never PASS.
 */

const guard = evaluateMutationGuard(env);

test.beforeEach(() => {
  if (!guard.allowed) blocked(`financial mutation guard refused: ${guard.reasons.join('; ')}`);
});

test.afterAll(async () => {
  await releaseActors();
});

interface Slot { bm: ApiClient; c: ApiClient; managerId: string; cashierId: string; shiftId: string; aggregatorId: string }

/** Opens a fresh cashier shift on the n-th "[E2E-REG]" template for the business date. */
async function openRegressionShift(index: number): Promise<Slot> {
  const bmS = await branchManager();
  const cS = await cashierActor();
  const bm = bmS.api;
  const c = cS.api;
  const cur = ok(await manager.current(bm), 'workday/current');
  if (cur.body.data.shift.status === 'not_started') ok(await manager.start(bm), 'workday/start');
  else if (cur.body.data.shift.status !== 'in_progress') blocked(`manager day is ${cur.body.data.shift.status}; regression needs an open manager day`);

  const tpls = ((ok(await manager.templates(bm), 'templates').body?.data ?? []) as Array<{ id: string; name: string }>)
    .filter((t) => t.name.startsWith('[E2E-REG]'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const tpl = tpls[index];
  if (!tpl) blocked(`regression template #${index} ("[E2E-REG] …") is not provisioned; only scripts/isolated/bootstrap-local-fixture.php creates it`);

  const before = new Set(((ok(await cashier.myShifts(c), 'my-shifts').body?.data ?? []) as Array<{ id: string }>).map((x) => x.id));
  ok(await manager.assign(bm, cS.user.id, tpl!.id, env.businessDate), 'assign-shifts');
  const fresh = ((ok(await cashier.myShifts(c), 'my-shifts').body?.data ?? []) as Array<{ id: string; status: string }>).find((x) => !before.has(x.id));
  if (!fresh) blocked(`template ${tpl!.name} already used for ${env.businessDate}`);
  ok(await cashier.start(c, fresh!.id), 'cashier start');

  const aggs = ok(await cashier.aggregators(c), 'aggregators');
  const list = (Array.isArray(aggs.body?.data) ? aggs.body.data : aggs.body?.data?.data ?? []) as Array<{ id: string }>;
  if (!list[0]) blocked('no aggregator available');
  return { bm, c, managerId: bmS.user.id, cashierId: cS.user.id, shiftId: fresh!.id, aggregatorId: list[0]!.id };
}

async function handoffFor(bm: ApiClient, cashierShiftId: string) {
  const h = ok(await manager.handoffs(bm), 'handoffs');
  return ((h.body?.data?.handoffs?.to_branch_manager ?? []) as Array<{ handover_id: string; cashier_shift_id: string; status: string; approved_at: string | null }>)
    .find((x) => x.cashier_shift_id === cashierShiftId);
}

test('R01 surplus belongs to the branch: no allocation, sales unchanged', async () => {
  traces('api-only', 'AC-03', 'DIFF-05');
  const s = await openRegressionShift(0);
  const f: ShiftFigures = { grossSar: '115.00', cardSar: '50.00', appsSar: '25.00', confirmedOpeningSar: '0.00', countedSar: '45.00' };
  const R = expectedResults(f);
  expect(R.surplusH).toBe(5_00);
  const payload = endPayload({ ...f, aggregatorId: s.aggregatorId }, halalasToSar(R.cashSalesH), []);

  const pv = ok(await cashier.preview(s.c, s.shiftId, payload), 'preview').body.data;
  expect(Number(pv.cash_reconciliation.cash_variance) * 100).toBe(R.varianceH);
  expect(pv.cash_reconciliation.cash_variance_type).toBe('surplus');
  expect(pv.allocation_required, 'no employee is made responsible for a surplus').toBe(false);

  const end = ok(await cashier.endWithHandoverToManager(s.c, s.shiftId, payload, s.managerId, f.countedSar), 'end-with-handover').body.data.summary;
  expect(Number(end.total_sales) * 100, 'surplus is not added to sales').toBe(R.grossH);

  const acc = (await adminAs('accountant')).api;
  const shf = await pollFor('SHF op', async () => (await findShfForCashierShift(acc, env.branchId, s.shiftId)).detail);
  expect(shf.payload.varianceHalalas).toBe(R.surplusH);
  expect(shf.payload.salesHalalas).toBe(R.grossH);
  expect((shf.liability?.shares ?? []).length, 'surplus creates no liability share').toBe(0);
});

test('R02 mismatched handover: no silent partial transfer, physical return, same request corrected (input error → no shortage), evidence kept', async () => {
  traces('api-only', 'AC-14', 'AC-15', 'CASH-09', 'CASH-10', 'CASH-11', 'CASH-12', 'AUD-01');
  const s = await openRegressionShift(1);
  // Cashier submitted 40 cash, but only 30 is physically present: card was mis-keyed (input error).
  const wrong: ShiftFigures = { grossSar: '115.00', cardSar: '50.00', appsSar: '25.00', confirmedOpeningSar: '0.00', countedSar: '40.00' };
  const payload = endPayload({ ...wrong, aggregatorId: s.aggregatorId }, '40.00', []);
  ok(await cashier.endWithHandoverToManager(s.c, s.shiftId, payload, s.managerId, '40.00'), 'end-with-handover');
  const h0 = await pollFor('handoff', () => handoffFor(s.bm, s.shiftId));

  const a1 = ok(await cashier.present(s.c, h0.handover_id, 40_00, randomUUID()), 'present 40').body.data.id as string;
  const mismatch = await manager.confirmReceipt(s.bm, a1, 30_00);
  expect(mismatch.status, `confirm 30 of 40: ${d(mismatch)}`).toBe(409);
  expect(errorCode(mismatch.body)).toBe('HANDOVER_AMOUNT_MISMATCH_CORRECTION_REQUIRED');
  expect((await handoffFor(s.bm, s.shiftId))?.status, 'nothing transferred on a mismatch').toBe('pending');

  ok(await manager.rejectAttempt(s.bm, a1, 30_00, 'E2E: only 30 SAR physically present', 'input_error'), 'reject attempt');
  const st1 = ok(await cashier.handoverStatus(s.c, s.shiftId), 'handover status').body.data;
  expect(st1.status).toBe('rejected');
  const rev1 = st1.report_revision_number as number;

  const stale = await manager.confirmReceipt(s.bm, a1, 40_00);
  expect(stale.status, 'a rejected attempt cannot be confirmed later').toBe(409);

  const early = await cashier.editAfterRejection(s.c, s.shiftId, { correction_reason: 'input_error', expected_revision: rev1, handover_amount: '30.00', counted_cash: '30.00', cash_collected: '30.00', card_payments: '60.00' });
  expect(early.status, `correction before the physical return: ${d(early)}`).toBe(409);
  expect(errorCode(early.body)).toBe('PHYSICAL_RETURN_REQUIRED');

  const ret = ok(await manager.initiateReturn(s.bm, a1, 30_00, randomUUID(), 'E2E: return rejected cash'), 'initiate return').body.data;
  ok(await cashier.confirmReturn(s.c, ret.id), 'cashier confirms the return');

  const corrected = ok(await cashier.editAfterRejection(s.c, s.shiftId, { correction_reason: 'input_error', expected_revision: rev1, handover_amount: '30.00', counted_cash: '30.00', cash_collected: '30.00', card_payments: '60.00' }), 'correct same request');
  expect(corrected.body?.success).toBe(true);
  const st2 = ok(await cashier.handoverStatus(s.c, s.shiftId), 'handover status after correction').body.data;
  expect(st2.report_revision_number, 'correction creates a new revision').toBe(rev1 + 1);
  expect(st2.status).toBe('pending');
  expect(Number(st2.variance), 'input error creates no shortage (CASH-10)').toBe(0);
  expect((await handoffFor(s.bm, s.shiftId))?.handover_id, 'the same request was corrected').toBe(h0.handover_id);

  const a2 = ok(await cashier.present(s.c, h0.handover_id, sarToHalalas('30.00'), randomUUID()), 'present corrected 30').body.data.id as string;
  expect(a2).not.toBe(a1);
  const rc = ok(await manager.confirmReceipt(s.bm, a2, 30_00), 'confirm corrected 30').body.data;
  expect(rc.confirmed_amount).toBe('30.00');
  expect((await handoffFor(s.bm, s.shiftId))?.status).toBe('accepted');

  // AUD-01: the rejection (reason, count) survives the correction and the final receipt.
  const detail = ok(await manager.handoffDetail(s.bm, h0.handover_id), 'handoff detail').body.data.handover;
  expect(detail.rejection_reason, 'previous rejection evidence is preserved').toBe('E2E: only 30 SAR physically present');
  expect(detail.rejection_count).toBe(1);
  expect(Number(detail.handover_amount)).toBe(30);
  expect(Number(detail.card_payments), 'corrected card total').toBe(60);
  expect(Number(detail.total_sales), 'gross sales unchanged by the correction').toBe(115);
});

test('R03 a cashier token cannot assign shifts (branch-manager action)', async () => {
  traces('api-only'); // authorization boundary (no single BR id); BM-only action per the role matrix
  if (env.mode !== 'isolated') blocked('write-path authorization probe runs only against the disposable backend');
  const cS = await cashierActor();
  const bm = await branchManager();
  const tpls = (ok(await manager.templates(bm.api), 'templates').body?.data ?? []) as Array<{ id: string }>;
  const tomorrow = new Date(Date.parse(`${env.businessDate}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const r = await manager.assign(cS.api, cS.user.id, tpls[0]!.id, tomorrow);
  expect(r.status, `cashier calling branch-manager/cashiers/assign-shifts: ${d(r)}`).toBe(403);
});

test('R04 accountant correction of the shortage allocation without double posting', async () => {
  traces('api-only', 'AC-22', 'COR-05', 'COR-06', 'COR-07');
  blocked('the allocation-correction request schema of accountant/shifts/{id}/corrections (shortage shares) was not independently verified in this pass; not implemented rather than guessed');
});

test('R05 head returns an accountant-approved report (return cycle) and it is resubmitted', async () => {
  traces('api-only', 'AC-42', 'COR-08');
  blocked('head-review return path not verified: head final approval of SHF is blocked by backend defect STALE_REPORT_REVISION (ShiftCloseService::onFinalApproved)');
});

test('R06 partial / full repayment of an employee shortage', async () => {
  traces('api-only', 'AC-40', 'AC-41', 'CASH-16');
  blocked('no repayment endpoint was identified and verified for CASH-16 in this pass');
});

test('R07 partial confirmed handover (request smaller than counted cash)', async () => {
  traces('api-only', 'AC-09', 'CASH-05');
  blocked('backend refuses confirmed ≠ presented (HANDOVER_AMOUNT_MISMATCH_CORRECTION_REQUIRED, see R02); a "partial request" flow that keeps the remainder with the sender was not identified — needs a business/technical decision');
});
