import test from "node:test";
import assert from "node:assert/strict";
import {
  formatShiftHalalas,
  formatShiftSalesTotal,
  getShiftCountEvidence,
  getShiftStatusDisplay,
} from "./shiftCountEvidence.ts";

test("counted shortage keeps its sign and halalas", () => {
  const { variance } = getShiftCountEvidence({ cashCountState: "counted", varianceHalalas: -2001 }, "en");
  assert.equal(variance.kind, "shortage");
  assert.equal(variance.text, "-20.01 SAR");
  assert.match(variance.cls, /text-red/);
});

test("only counted with exactly zero variance is matched", () => {
  const { variance } = getShiftCountEvidence({ cashCountState: "counted", varianceHalalas: 0 });
  assert.equal(variance.kind, "matched");
  assert.equal(variance.text, "✓ متطابق");
  assert.match(variance.cls, /text-emerald/);
});

test("counted surplus shows a plus sign, two decimals and the surplus colour", () => {
  const { variance } = getShiftCountEvidence({ cashCountState: "counted", varianceHalalas: 2001 }, "en");
  assert.equal(variance.kind, "surplus");
  assert.equal(variance.text, "+20.01 SAR");
  assert.match(variance.cls, /text-blue/);
});

test("unknown counts never become a numeric variance or a match", () => {
  for (const varianceHalalas of [-2000, 0, 2000, null, undefined]) {
    const { variance } = getShiftCountEvidence({ cashCountState: "unknown", varianceHalalas });
    assert.equal(variance.kind, "unknown");
    assert.equal(variance.text, "غير مجرود");
    assert.match(variance.cls, /text-gray/);
    assert.equal(variance.rowCls, "");
  }
});

test("null, absent or unrecognized count state gives a dash even if variance is zero", () => {
  for (const cashCountState of [null, undefined, "unexpected"]) {
    for (const varianceHalalas of [-2000, 0, 2000, null, undefined]) {
      const { variance } = getShiftCountEvidence({ cashCountState, varianceHalalas });
      assert.equal(variance.kind, "missing");
      assert.equal(variance.text, "—");
      assert.equal(variance.rowCls, "");
    }
  }
  assert.equal(getShiftCountEvidence({}).variance.text, "—");
});

test("counted with null or absent variance gives a dash, never a match", () => {
  for (const varianceHalalas of [null, undefined]) {
    const { variance } = getShiftCountEvidence({ cashCountState: "counted", varianceHalalas });
    assert.equal(variance.kind, "missing");
    assert.equal(variance.text, "—");
  }
});

test("SHF money requires safe integer halalas; malformed values are not rounded or coerced", () => {
  for (const value of [0.5, -0.5, 2000.5, NaN, Infinity, -Infinity, "2000", "", false, {}, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(formatShiftHalalas(value, "en"), "Invalid amount");
    const view = getShiftCountEvidence({
      cashCountState: "counted", varianceHalalas: value,
      cashExpectedHalalas: value, salesHalalas: value, pendingIncomingCountedHalalas: value,
    }, "en");
    assert.equal(view.variance.kind, "invalid");
    assert.equal(view.variance.text, "Invalid amount");
    assert.equal(view.expectedCash, "Invalid amount");
    assert.equal(view.sales, "Invalid amount");
    assert.equal(view.pendingIncoming, "Invalid amount");
  }
});

test("SHF formatter preserves two SAR decimals, small negatives and large integer halalas", () => {
  for (const [value, expected] of [
    [0, "0.00"], [1, "0.01"], [-1, "-0.01"], [99, "0.99"],
    [100, "1.00"], [1001, "10.01"], [-2001, "-20.01"],
    [Number.MAX_SAFE_INTEGER, "90,071,992,547,409.91"],
  ] as const) {
    assert.equal(formatShiftHalalas(value, "en"), expected);
  }
  assert.equal(formatShiftHalalas(2001), "٢٠٫٠١");
  assert.equal(formatShiftHalalas(-1).replace(/\u061c/g, ""), "-٠٫٠١");
});

test("missing expected cash, sales and pending incoming remain visibly absent", () => {
  for (const value of [null, undefined]) {
    const view = getShiftCountEvidence({
      cashExpectedHalalas: value, salesHalalas: value, pendingIncomingCountedHalalas: value,
    });
    assert.equal(view.expectedCash, "—");
    assert.equal(view.sales, "—");
    assert.equal(view.pendingIncoming, "—");
    assert.equal(formatShiftHalalas(value), "—");
  }
  const zero = getShiftCountEvidence({ cashExpectedHalalas: 0, salesHalalas: 0 }, "en");
  assert.equal(zero.expectedCash, "0.00");
  assert.equal(zero.sales, "0.00");
});

test("only canonical halalas fields are used; legacy SAR aliases do not supply evidence", () => {
  const raw = { cashExpected: 50, salesAmount: 115, variance: 0, cashActual: 30 };
  const view = getShiftCountEvidence({ ...raw, cashCountState: undefined });
  assert.equal(view.expectedCash, "—");
  assert.equal(view.sales, "—");
  assert.equal(view.variance.text, "—");
});

test("pending incoming is displayed separately and never changes the server variance", () => {
  for (const cashCountState of ["counted", "unknown", null] as const) {
    const base = { cashCountState, varianceHalalas: -2001 };
    const before = getShiftCountEvidence(base, "en");
    for (const pendingIncomingCountedHalalas of [undefined, null, 0, 5000, -100, 0.5]) {
      const source = { ...base, pendingIncomingCountedHalalas };
      const snapshot = structuredClone(source);
      const view = getShiftCountEvidence(source, "en");
      assert.deepEqual(view.variance, before.variance);
      assert.deepEqual(source, snapshot, "display must not mutate count evidence");
    }
  }
  assert.equal(getShiftCountEvidence({ pendingIncomingCountedHalalas: 5001 }, "en").pendingIncoming, "50.01");
});

test("order placeholders, null and missing counts stay unavailable until F-6", () => {
  for (const ordersCount of [undefined, null, 0, 42]) {
    assert.equal(getShiftCountEvidence({ ordersCount }).ordersCount, "—");
  }
});

test("history sales totals preserve cents and never fill missing or invalid rows with zero", () => {
  assert.equal(formatShiftSalesTotal([{ salesHalalas: 1001 }, { salesHalalas: 2002 }], "en"), "30.03");
  assert.equal(formatShiftSalesTotal([{ salesHalalas: 0 }], "en"), "0.00");
  assert.equal(formatShiftSalesTotal([{ salesHalalas: 1001 }, { salesHalalas: null }]), "—");
  assert.equal(formatShiftSalesTotal([{}]), "—");
  assert.equal(formatShiftSalesTotal([]), "—");
  assert.equal(formatShiftSalesTotal([{ salesHalalas: 0.5 }], "en"), "Invalid amount");
  assert.equal(formatShiftSalesTotal([{ salesHalalas: Number.MAX_SAFE_INTEGER }, { salesHalalas: 1 }], "en"), "Invalid amount");
});

test("status colours distinguish pending review, late, closed and absent status", () => {
  assert.match(getShiftStatusDisplay("pending_review").cls, /text-amber/);
  assert.match(getShiftStatusDisplay("late").cls, /text-red/);
  assert.match(getShiftStatusDisplay("closed").cls, /text-gray/);
  assert.equal(getShiftStatusDisplay("pending_review").label, "بانتظار المراجعة");
  for (const status of [null, undefined, "unexpected", "toString"]) {
    assert.equal(getShiftStatusDisplay(status).label, "—");
    assert.match(getShiftStatusDisplay(status).cls, /text-gray/);
  }
});
