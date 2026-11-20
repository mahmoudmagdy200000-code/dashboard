import assert from "node:assert/strict";
import test from "node:test";
import type { Operation } from "../../../../../api/types";
import { dailySalesReportFromOperation, groupDailySalesWorkdays } from "./workdaySalesReport.ts";

function report(id: string, data: {
  branchId?: string;
  workday?: string;
  submittedAt?: string;
  managerShiftId?: string;
  amountHalalas?: number | null;
  cashHalalas?: number | null;
  cardHalalas?: number | null;
  appsHalalas?: number | null;
  varianceHalalas?: number | null;
  members?: string[];
} = {}): Operation {
  const {
    branchId = "branch-1",
    workday = "2026-11-17",
    submittedAt = "2026-11-19T03:00:00Z",
    managerShiftId = `manager-${id}`,
    amountHalalas = 20000,
    cashHalalas = 9500,
    cardHalalas = 10000,
    appsHalalas = 500,
    varianceHalalas = 500,
    members = ["cashier-shift-1"],
  } = data;
  return {
    id,
    publicId: `OPS-${id}`,
    moduleKey: "sales",
    workflowKind: "sal_day",
    branchId,
    branchName: `Branch ${branchId}`,
    amountHalalas,
    operationDate: submittedAt,
    createdAt: submittedAt,
    updatedAt: submittedAt,
    status: "pending",
    payload: {
      date: workday,
      managerShiftId,
      managerName: "Demo Manager",
      cashHalalas,
      cardHalalas,
      appsHalalas,
      varianceHalalas,
      pkg6Review: { member_source_ids: members },
    } as Operation["payload"],
  };
}

test("groups sales by canonical branch workday, not creation/shift-close date", () => {
  const days = groupDailySalesWorkdays([
    report("a", { workday: "2026-11-17", submittedAt: "2026-11-19T09:00:00Z", members: ["shift-started-16th"] }),
    report("b", { workday: "2026-11-17", submittedAt: "2026-11-18T23:00:00Z", amountHalalas: 40000, cashHalalas: 18000, cardHalalas: 20000, appsHalalas: 2000, varianceHalalas: 800, members: ["shift-started-17th"] }),
    report("c", { workday: "2026-11-17", branchId: "branch-2", members: ["another-branch"] }),
    report("d", { workday: "2026-11-19", amountHalalas: 10000 }),
  ]);
  assert.equal(days.length, 3);
  const day17 = days.find(d => d.branchId === "branch-1" && d.date === "2026-11-17");
  assert.ok(day17);
  assert.equal(day17.totalSalesHalalas, 60000);
  assert.equal(day17.cashHalalas, 27500);
  assert.equal(day17.cardHalalas, 30000);
  assert.equal(day17.appsHalalas, 2500);
  assert.equal(day17.varianceHalalas, 1300);
  assert.deepEqual(day17.memberShiftIds, ["shift-started-16th", "shift-started-17th"]);
});

test("does not count duplicate manager-day revisions twice", () => {
  const old = report("original", { managerShiftId: "m-1", submittedAt: "2026-11-17T09:00:00Z" });
  const newer = report("revised", { managerShiftId: "m-1", amountHalalas: 40000, submittedAt: "2026-11-19T09:00:00Z" });
  const [day] = groupDailySalesWorkdays([old, newer]);
  assert.equal(day.totalSalesHalalas, 40000);
  assert.equal(day.reports.length, 1);
  assert.equal(day.reports[0].operation.id, "revised");
});

test("incomplete money is shown as unknown, never silently zero or partial", () => {
  const [day] = groupDailySalesWorkdays([
    report("complete"),
    report("missing", { amountHalalas: null, cashHalalas: null }),
  ]);
  assert.equal(day.totalSalesHalalas, null);
  assert.equal(day.cashHalalas, null);
  assert.equal(day.cardHalalas, 20000);
});

test("excludes manual sales, corrections, and unproven daily-close payloads", () => {
  const manual = report("manual");
  manual.payload = { notes: "manual" } as Operation["payload"];
  const correction = { ...report("corrected"), isCorrection: true };
  const missingLink = report("missing-link");
  missingLink.payload = { date: "2026-11-17" } as Operation["payload"];
  assert.equal(dailySalesReportFromOperation(manual), null);
  assert.equal(dailySalesReportFromOperation(correction), null);
  assert.equal(dailySalesReportFromOperation(missingLink), null);
  assert.equal(groupDailySalesWorkdays([manual, correction, missingLink]).length, 0);
});

test("supports an unknown classifier with verified PKG-6 detail, but not a forged mobile day", () => {
  const submitted = report("unknown");
  submitted.workflowKind = "unknown";
  assert.equal(dailySalesReportFromOperation(submitted)?.provenanceVerified, false);
  const forged = report("forged");
  forged.workflowKind = "unknown";
  forged.origin = "mobile";
  delete (forged.payload as Record<string, unknown>).pkg6Review;
  assert.equal(dailySalesReportFromOperation(forged), null);
});

test("keeps a conflicting source/operation sales total explicitly unknown", () => {
  const inconsistent = report("mismatch");
  inconsistent.payload = { ...inconsistent.payload, totalSalesHalalas: 99999 } as Operation["payload"];
  const [day] = groupDailySalesWorkdays([inconsistent]);
  assert.equal(day.totalSalesHalalas, null);
  assert.equal(day.cashHalalas, 9500);
});

test("daily sales channel summary and final collection variance follow the saved settlement while gross sales and historical shift cash variance remain preserved", () => {
  const corrected = report("settled", { amountHalalas: 1_000_000, cashHalalas: 400_000, cardHalalas: 300_000, appsHalalas: 300_000, varianceHalalas: 500 });
  corrected.workdaySettlement = {
    revision: 1,
    grossHalalas: 1_000_000,
    cashHalalas: 400_000,
    cardsHalalas: 300_000,
    delivery: [{ id: "app-1", name: "Delivery", amountHalalas: 299_500 }],
    allocations: [
      { empNumber: "2101", name: "Cashier 1", amountHalalas: 200 },
      { empNumber: "2010", name: "Branch Manager", amountHalalas: 300 },
    ],
    reason: "Corrected delivery reconciliation",
  };
  const [day] = groupDailySalesWorkdays([corrected]);
  assert.equal(day.totalSalesHalalas, 1_000_000); // Gross Sales = 10,000 SAR (locked)
  assert.equal(day.cashHalalas, 400_000); // Cash = 4,000 SAR
  assert.equal(day.cardHalalas, 300_000); // Cards = 3,000 SAR
  assert.equal(day.appsHalalas, 299_500); // Delivery = 2,995 SAR
  assert.equal(day.cashHalalas! + day.cardHalalas! + day.appsHalalas!, 999_500); // Total Collected = 9,995 SAR
  assert.equal(day.varianceHalalas, -500); // Final collection variance = -5.00 SAR (Shortage = 5 SAR)
  assert.equal(day.reportedCashVarianceHalalas, 500); // Historical shift cash variance stays preserved separately
});
