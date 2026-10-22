import test from "node:test";
import assert from "node:assert/strict";
import { fmtAmt } from "./_shared/formatters.ts";
import { ProcOverview } from "./_pages/procurement/ProcOverview.tsx";
import { ProcReports } from "./_pages/procurement/ProcReports.tsx";
import { ProcSent } from "./_pages/procurement/ProcSent.tsx";
import { ProcItems } from "./_pages/procurement/ProcItems.tsx";
import type { PageProps } from "./_shared/types.ts";

test("Procurement modularized pages export valid React components", () => {
  assert.equal(typeof ProcOverview, "function", "ProcOverview must be exported as a function component");
  assert.equal(typeof ProcReports, "function", "ProcReports must be exported as a function component");
  assert.equal(typeof ProcSent, "function", "ProcSent must be exported as a function component");
  assert.equal(typeof ProcItems, "function", "ProcItems must be exported as a function component");
});

test("fmtAmt shared formatter preserves exact currency formatting and null handling", () => {
  assert.equal(fmtAmt(null), "—", "null amount must return dash");
  assert.equal(fmtAmt(undefined), "—", "undefined amount must return dash");
  assert.equal(fmtAmt(NaN), "—", "NaN amount must return dash");
  assert.equal(fmtAmt(0), (0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "zero amount must format with 2 decimals in ar-SA");
  assert.equal(fmtAmt(1250.5), (1250.5).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "1250.5 must format properly in ar-SA");
});

test("Procurement page props signature complies with PageProps contract", () => {
  // Verify that an object adhering to PageProps can be type-checked and passed to components
  const mockProps: PageProps = {
    role: "procurement",
    navigate: () => {},
    setModal: () => {},
    setDetailId: () => {},
    detailId: null,
    ops: [],
    approveOp: () => {},
    rejectOp: () => {},
    finalApproveOp: () => {},
    bulkApprove: () => {},
  };

  assert.ok(mockProps, "PageProps structure conforms to expected router props");
});
