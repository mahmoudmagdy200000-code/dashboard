import test from "node:test";
import assert from "node:assert/strict";
import { prepareWorkdayBulkApproval } from "./workdayBulkApproval.ts";

test("bulk confirmation map uses public operation ids while request ids may be internal", () => {
  const report = {
    id: "internal-uuid-1", publicId: "OPS-0001", workflowKind: "sal_day", branchName: "الفرع الأول",
    workdayReview: { confirmation: "a".repeat(64), questions: [{ shiftLabel: "الشفت الصباحي", reply: null }] },
  };
  assert.deepEqual(prepareWorkdayBulkApproval([report]), {
    workdayConfirmations: { "OPS-0001": "a".repeat(64) },
    openQuestions: ["OPS-0001، الفرع الأول: الشفت الصباحي"],
  });
});

test("bulk confirmation preparation fails closed on missing, stale-shaped, or unclassified evidence", () => {
  const valid = { id: "internal-id", publicId: "OPS-2", workflowKind: "sal_day", workdayReview: { confirmation: "b".repeat(64) } };
  for (const report of [
    { ...valid, publicId: undefined },
    { ...valid, workflowKind: "unknown" },
    { ...valid, workdayReview: { confirmation: "short" } },
  ]) assert.throws(() => prepareWorkdayBulkApproval([report]));
});
