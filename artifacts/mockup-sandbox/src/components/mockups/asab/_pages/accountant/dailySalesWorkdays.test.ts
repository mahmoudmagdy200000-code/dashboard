import assert from "node:assert/strict";
import test from "node:test";
import type { Operation } from "../../../../../api/types";
import { dailySalesReportFromOperation, groupDailySalesWorkdays } from "./dailySalesWorkdays.ts";

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
