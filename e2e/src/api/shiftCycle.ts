import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { ApiClient, ApiResult } from './client';
import { describe } from './client';
import type { ShiftFigures } from '../finance';

/**
 * Thin, typed wrappers over the REAL backend routes used by the shift cycle.
 * Every path and field below was read from the route list / controllers at
 * backend 289fe09 and exercised against an isolated local instance.
 * Money: mobile routes take SAR strings; transfer-attempt routes take integer halalas.
 */

export function ok<T = any>(r: ApiResult<T>, label: string, expected = 200): ApiResult<T> {
  expect(r.status, `${label}: ${describe(r)}`).toBe(expected);
  return r;
}

// ── Branch manager (legacy mobile token) ──────────────────────────────────
export const manager = {
  /** UNSAFE FOR MODE A: GET branch-manager/workday/current uses firstOrCreate() and can write a manager day. Lifecycle/isolated mode only. */
  current: (bm: ApiClient) => bm.get('branch-manager/workday/current'),
  /** GET branch-manager/shifts — the branch's shift templates (ShiftController@index). */
  templates: (bm: ApiClient) => bm.get('branch-manager/shifts'),
  start: (bm: ApiClient) => bm.post('branch-manager/workday/start'),
  /** POST branch-manager/cashiers/assign-shifts {cashier_id, shift_ids[], shift_date}. */
  assign: (bm: ApiClient, cashierId: string, templateId: string, date: string) =>
    bm.post('branch-manager/cashiers/assign-shifts', { cashier_id: cashierId, shift_ids: [templateId], shift_date: date }),
  handoffs: (bm: ApiClient) => bm.get('branch-manager/workday/handoffs'),
  /** BranchManagerShiftController@getCashierHandoverDetails — keeps rejection_reason / rejection_count. */
  handoffDetail: (bm: ApiClient, handoverId: string) => bm.get(`branch-manager/workday/handoffs/cashier/${handoverId}`),
  /** CASH-09..12: reject a presented attempt with the physically counted amount (integer halalas). */
  rejectAttempt: (bm: ApiClient, attemptId: string, physicalHalalas: number, reason: string, correction: 'input_error' | 'actual_shortage') =>
    bm.post(`shift-transfer-attempts/${attemptId}/reject`, { physical_halalas: physicalHalalas, reason, correction_reason: correction }),
  /** CASH-11: the receiver physically returns the rejected cash. */
  initiateReturn: (bm: ApiClient, attemptId: string, returnedHalalas: number, key: string, reason: string) =>
    bm.post(`shift-transfer-attempts/${attemptId}/returns`, { returned_halalas: returnedHalalas, idempotency_key: key, reason }),
  confirmReceipt: (bm: ApiClient, attemptId: string, confirmedHalalas: number) =>
    bm.post(`shift-transfer-attempts/${attemptId}/confirm-receipt`, { confirmed_halalas: confirmedHalalas }),
  /** Liability approve requires Idempotency-Key (IdempotencyKey:required,transaction,legacy). */
  approveLiability: (bm: ApiClient, cashierShiftId: string, version: number, expectedRevision: number) =>
    bm.post(`branch-manager/shifts/${cashierShiftId}/liability/approve`, { version, expected_revision: expectedRevision }, true),
  end: (bm: ApiClient) => bm.post('branch-manager/workday/end', { handover_timing: 'today' }),
  submitDay: (bm: ApiClient, dayId: string, expectedRevision: number, key: string = randomUUID()) =>
    bm.post('branch-manager/workday/daily-close/submit', { branch_manager_shift_id: dayId, expected_revision: expectedRevision, final_notes: 'ASSAB E2E synthetic fixture' }, key),
};

// ── Cashier (legacy mobile token) ─────────────────────────────────────────
export interface CashierSales extends ShiftFigures {
  aggregatorId: string;
}

export function endPayload(f: CashierSales, cashSalesSar: string, allocations: Array<{ type: 'cashier' | 'branch_manager' | 'employee'; id: string; amountSar: string }>) {
  return {
    total_sales: f.grossSar,
    cash_collected: cashSalesSar,
    card_payments: f.cardSar,
    aggregators: [{ aggregator_id: f.aggregatorId, amount: f.appsSar }],
    counted_cash: f.countedSar,
    ...(allocations.length
      ? { shortage_allocations: allocations.map((a) => ({ responsible_type: a.type, responsible_id: a.id, amount: a.amountSar })) }
      : {}),
  };
}

export const cashier = {
  myShifts: (c: ApiClient) => c.get('cashier/my-shifts'),
  detail: (c: ApiClient, id: string) => c.get(`cashier/my-shifts/${id}`),
  start: (c: ApiClient, id: string) => c.post(`cashier/shifts/${id}/start`),
  aggregators: (c: ApiClient) => c.get('aggregators'),
  /** Server-side calculation preview; writes nothing (ShiftEndController@previewCashReconciliation). */
  preview: (c: ApiClient, id: string, payload: object) => c.post(`cashier/shifts/${id}/cash-reconciliation/preview`, payload),
  endOnly: (c: ApiClient, id: string, payload: object) => c.post(`cashier/shifts/${id}/end`, payload, true),
  endWithHandoverToManager: (c: ApiClient, id: string, payload: object, managerId: string, handoverSar: string) =>
    c.post(`cashier/shifts/${id}/end-with-handover`, { ...payload, handover_to_type: 'branch_manager', branch_manager_id: managerId, handover_amount: handoverSar }, true),
  /** Physical presentation creates a transfer attempt (CASH-05); idempotency key is a body field here. */
  handoverStatus: (c: ApiClient, id: string) => c.get(`cashier/shifts/${id}/handover/status`),
  /** ShiftHandoverController@editHandoverAfterRejection — SAR strings, expected_revision, correction_reason. */
  editAfterRejection: (c: ApiClient, id: string, body: object) => c.post(`cashier/shifts/${id}/handover/edit`, body, true),
  /** Cashier confirms the physical return of rejected cash (ShiftTransferAttemptController@confirm). */
  confirmReturn: (c: ApiClient, returnId: string) => c.post(`shift-transfer-returns/${returnId}/confirm`, {}),
  present: (c: ApiClient, handoverId: string, presentedHalalas: number, key: string) =>
    c.post(`shift-transfers/handover/${handoverId}/present`, { presented_halalas: presentedHalalas, idempotency_key: key }),
};

// ── Dashboard operations (Admin token) ────────────────────────────────────
export interface OpRef { id: string; publicId: string; status: string; moduleKey: string }

/** Finds the SHF operation projected for a legacy cashier shift (payload.legacyShiftId). */
export async function findShfForCashierShift(admin: ApiClient, branchId: string, cashierShiftId: string): Promise<{ op?: OpRef; detail?: any }> {
  const list = ok(await admin.get('operations', { moduleKey: 'shifts', branchId, pageSize: 100 }), 'list SHF ops');
  for (const op of (list.body?.data ?? []) as OpRef[]) {
    const d = await admin.get(`operations/${op.id}`);
    if (d.status === 200 && d.body?.payload?.legacyShiftId === cashierShiftId) return { op, detail: d.body };
  }
  return {};
}

/** Finds the daily sales operation for a manager day (payload.managerShiftId). */
export async function findDayOp(admin: ApiClient, branchId: string, managerDayId: string): Promise<{ op?: OpRef; detail?: any }> {
  const list = ok(await admin.get('operations', { moduleKey: 'sales', branchId, pageSize: 100 }), 'list sales ops');
  for (const op of (list.body?.data ?? []) as OpRef[]) {
    const d = await admin.get(`operations/${op.id}`);
    if (d.status === 200 && d.body?.payload?.managerShiftId === managerDayId) return { op, detail: d.body };
  }
  return {};
}

export const ops = {
  detail: (a: ApiClient, id: string) => a.get(`operations/${id}`),
  audit: (a: ApiClient, id: string) => a.get(`operations/${id}/audit-trail`),
  approve: (a: ApiClient, id: string) => a.post(`operations/${id}/approve`, {}),
  finalApprove: (a: ApiClient, id: string) => a.post(`operations/${id}/final-approve`, {}, true),
  reject: (a: ApiClient, id: string, reason: string, notes: string) => a.post(`company/me/operations/${id}/reject`, { reason, notes }, true),
  /** Accountant report correction (COR-05). changes.* are SAR strings; shortage shares are integer halalas. */
  correct: (a: ApiClient, cashierShiftId: string, body: object) => a.post(`accountant/shifts/${cashierShiftId}/corrections`, body, true),
  varianceAllocations: (a: ApiClient, adminShiftId: string, allocations: object[]) => a.post(`company/me/shifts/${adminShiftId}/variance-allocations`, { allocations }, true),
};

/** Bounded polling helper for eventually-consistent bridges (no arbitrary sleeps). */
export async function pollFor<T>(label: string, fn: () => Promise<T | undefined>, timeoutMs = 20_000, intervalMs = 1_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v !== undefined) return v;
    if (Date.now() > deadline) throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${label}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
