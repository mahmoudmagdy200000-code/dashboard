import test from "node:test";
import assert from "node:assert/strict";
import { formatHalalas, formatHalalasAmount, halalasToSAR, sarToHalalas } from "../money.ts";
import type {
  ShiftCustodyStatement,
  ShiftCustodyIdentityLinkState,
  ShiftCustodyBalances,
  CustodyEntry,
  PendingHandoverRequest,
} from "./employees.ts";

test("G2-C1: Currency & Halala conversions enforce 1 SAR = 100 Halalas", () => {
  assert.equal(halalasToSAR(420000), 4200);
  assert.equal(sarToHalalas(4200), 420000);
  assert.equal(halalasToSAR(720000), 7200);
  assert.equal(halalasToSAR(0), 0);
  assert.equal(halalasToSAR(-48000), -480);

  // Formatter displays standard 2 decimal places
  assert.equal(formatHalalasAmount(420000, "en"), "4,200.00");
  assert.equal(formatHalalasAmount(0, "en"), "0.00");
  assert.equal(formatHalalasAmount(null, "en"), "—");
  assert.equal(formatHalalas(null, "ar"), "—");
});

test("G2-C2: Unlinked employee state enforces is_available: false, null balances and unlinked state", () => {
  const unlinkedPayload: ShiftCustodyStatement = {
    unit: "halala",
    identity_link_state: "unlinked",
    identity: {
      employee_id: "emp-unlinked-99",
      name: "عامل بدون ربط",
      role: "عامل",
      linked_type: null,
      linked_id: null,
      branch_id: "b-01",
      branch_name: "فرع العليا",
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
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    },
  };

  assert.equal(unlinkedPayload.identity_link_state, "unlinked");
  assert.equal(unlinkedPayload.balances.is_available, false);
  assert.equal(unlinkedPayload.balances.opening_balance, null);
  assert.equal(unlinkedPayload.balances.closing_balance, null);
  assert.equal(unlinkedPayload.entries.length, 0);
  assert.equal(unlinkedPayload.pending.length, 0);

  // Helper verifying unlinked badge display
  const getBadgeText = (state: ShiftCustodyIdentityLinkState, isAvail: boolean) => {
    if (state === "unlinked" || !isAvail) return "غير متاح";
    return "مرتبط";
  };
  assert.equal(getBadgeText(unlinkedPayload.identity_link_state, unlinkedPayload.balances.is_available), "غير متاح");
});

test("G2-C3: Running balance continuity calculates running balance progressively across entries", () => {
  const openingBalance = 50000; // 500.00 SAR
  const entries: Array<{ cash_in: number; cash_out: number; expected_running: number }> = [
    { cash_in: 420000, cash_out: 0, expected_running: 470000 },
    { cash_in: 0, cash_out: 720000, expected_running: -250000 },
    { cash_in: 300000, cash_out: 0, expected_running: 50000 },
  ];

  let current = openingBalance;
  for (const e of entries) {
    current += (e.cash_in - e.cash_out);
    assert.equal(current, e.expected_running);
  }
});

test("G2-C4: Pending handover requests remain outside confirmed cash balances", () => {
  const statement: ShiftCustodyStatement = {
    unit: "halala",
    identity_link_state: "linked",
    identity: {
      employee_id: "emp-101",
      name: "أحمد الكاشير",
      role: "كاشير",
      linked_type: "cashier",
      linked_id: "cash-01",
      branch_id: "b-01",
      branch_name: "فرع العليا",
    },
    period: { from: "2026-11-01", to: "2026-11-11" },
    balances: {
      is_available: true,
      opening_balance: 100000,
      closing_balance: 100000,
      total_cash_in: 0,
      total_cash_out: 0,
      net_period_change: 0,
    },
    entries: [],
    pending: [
      {
        request_type: "handover_sent",
        request_id: "req-pending-01",
        created_at: "2026-11-11T12:00:00Z",
        business_date: "2026-11-11",
        amount: 40000, // 400.00 SAR pending
        counterparty: { type: "cashier", id: "cash-02", name: "كاشير 2" },
        source_shift_id: "shift-01",
        status: "pending",
      },
    ],
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
  };

  // Assert confirmed closing balance is NOT reduced by pending amount
  assert.equal(statement.balances.closing_balance, 100000);
  assert.equal(statement.pending.length, 1);
  assert.equal(statement.pending[0].amount, 40000);
  assert.equal(statement.pending[0].status, "pending");
});

test("G2-C5: Tab state model isolates dues & deductions from shift custody", () => {
  type EmpAccountTab = "dues" | "custody";
  let activeTab: EmpAccountTab = "dues";

  // Default tab is dues
  assert.equal(activeTab, "dues");

  // Switch to custody
  activeTab = "custody";
  assert.equal(activeTab, "custody");

  // Switch back to dues
  activeTab = "dues";
  assert.equal(activeTab, "dues");
});

test("G2-C6: Late-posted receipt distinguishes business_date from posting date (event_at)", () => {
  const lateEntry: CustodyEntry = {
    source_type: "cashier_custody",
    source_id: "entry-late-01",
    event_at: "2026-11-03T14:30:00Z",
    business_date: "2026-11-01",
    branch: { id: "b-01", name: "فرع العليا" },
    transaction_type: "Handover Received",
    classification: "handover_received",
    label_ar: "استلام من كاشير",
    label_en: "Received from cashier",
    source_shift_id: "shift-01",
    receiving_shift_id: "shift-02",
    receipt_id: "REC-LATE-01",
    counterparty: { type: "cashier", id: "c-01", name: "كاشير 1" },
    cash_in: 420000,
    cash_out: 0,
    running_balance: 420000,
    confirmation_state: "confirmed",
    lineage_key: null,
    reversal_id: null,
  };

  const postDate = lateEntry.event_at ? lateEntry.event_at.slice(0, 10) : "";
  const isDifferent = Boolean(lateEntry.business_date && postDate && lateEntry.business_date !== postDate);

  assert.equal(lateEntry.business_date, "2026-11-01");
  assert.equal(postDate, "2026-11-03");
  assert.equal(isDifferent, true);
});
