import assert from "node:assert/strict";
import { test } from "node:test";
import { fundingExecutionPayload, requirePendingReceipt } from "./fundingExecutionContract.ts";

test("accountant execution sends reference and proof, then awaits receipt without a posting", () => {
  const proof = new File(["proof"], "transfer.pdf", { type: "application/pdf" });
  const form = fundingExecutionPayload("  TR-123  ", proof);
  assert.equal(form.get("transferReference"), "TR-123");
  assert.equal((form.get("proof") as File).name, "transfer.pdf");
  assert.throws(() => fundingExecutionPayload(" ", proof));
  assert.equal(requirePendingReceipt({ financiallyPosted: false, executedAt: "2026-10-29T10:00:00Z" }).financiallyPosted, false);
  assert.throws(() => requirePendingReceipt({ financiallyPosted: true, executedAt: "2026-10-29T10:00:00Z" }));
  assert.throws(() => requirePendingReceipt({ financiallyPosted: false, executedAt: null }));
});
