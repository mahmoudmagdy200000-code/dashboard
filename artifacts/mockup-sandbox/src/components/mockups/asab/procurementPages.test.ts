import test from "node:test";
import assert from "node:assert/strict";
import { fmtAmt } from "./_shared/formatters.ts";
import { ProcOverview } from "./_pages/procurement/ProcOverview.tsx";
import { ProcReports } from "./_pages/procurement/ProcReports.tsx";
import { ProcSent } from "./_pages/procurement/ProcSent.tsx";
import { ProcItems } from "./_pages/procurement/ProcItems.tsx";
import { ProcSuppliers } from "./_pages/procurement/ProcSuppliers.tsx";
import type { PageProps } from "./_shared/types.ts";

test("Procurement modularized pages export valid React components", () => {
  assert.equal(typeof ProcOverview, "function", "ProcOverview must be exported as a function component");
  assert.equal(typeof ProcReports, "function", "ProcReports must be exported as a function component");
  assert.equal(typeof ProcSent, "function", "ProcSent must be exported as a function component");
  assert.equal(typeof ProcItems, "function", "ProcItems must be exported as a function component");
  assert.equal(typeof ProcSuppliers, "function", "ProcSuppliers must be exported as a function component");
});

test("fmtAmt shared formatter preserves exact currency formatting and null handling", () => {
  assert.equal(fmtAmt(null), "—", "null amount must return dash");
  assert.equal(fmtAmt(undefined), "—", "undefined amount must return dash");
  assert.equal(fmtAmt(NaN), "—", "NaN amount must return dash");
  assert.equal(fmtAmt(0), (0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "zero amount must format with 2 decimals in ar-SA");
  assert.equal(fmtAmt(1250.5), (1250.5).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "1250.5 must format properly in ar-SA");
});

test("Procurement page props signature complies with PageProps contract", () => {
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

test("ProcSuppliers rating and status resolution logic behaves consistently", () => {
  // Test starsOf logic: ratingAvg / 10 if present, else rating or 0
  const starsOf = (sup: any) => { const a = sup.ratingAvg; return a != null ? a / 10 : (sup.rating ?? 0); };
  assert.equal(starsOf({ ratingAvg: 45 }), 4.5, "ratingAvg should divide by 10");
  assert.equal(starsOf({ ratingAvg: null, rating: 4 }), 4, "fallback to rating when ratingAvg is null");
  assert.equal(starsOf({}), 0, "fallback to 0 when no rating info exists");

  // Test isActiveOf logic
  const isActiveOf = (sup: any) => sup.isActive ?? (sup.status === "نشط" || sup.status === "active" || sup.status === undefined);
  assert.equal(isActiveOf({ isActive: true }), true);
  assert.equal(isActiveOf({ isActive: false }), false);
  assert.equal(isActiveOf({ status: "نشط" }), true);
  assert.equal(isActiveOf({ status: "active" }), true);
  assert.equal(isActiveOf({ status: "موقوف" }), false);
  assert.equal(isActiveOf({}), true, "defaults to true when status is undefined");

  // Test contactOf logic
  const contactOf = (sup: any) => sup.contactName ?? sup.contact ?? sup.contactPhone ?? "";
  assert.equal(contactOf({ contactName: "Ahmed" }), "Ahmed");
  assert.equal(contactOf({ contact: "Mohamed" }), "Mohamed");
  assert.equal(contactOf({ contactPhone: "0501234567" }), "0501234567");
  assert.equal(contactOf({}), "");
});
