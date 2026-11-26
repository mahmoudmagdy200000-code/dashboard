import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  filterApprovablePurchaseIds,
  hasUnavailablePurchaseMatch,
} from "./purchaseApprovalGuards.ts";

test("T1.5 REQ-ADD-04: hasUnavailablePurchaseMatch blocks missing/unknown match or zero-evidence records", () => {
  assert.equal(
    hasUnavailablePurchaseMatch({ match: null, attachmentsCount: 1, lines: [{}] }),
    true,
    "Null match must be treated as unavailable",
  );
  assert.equal(
    hasUnavailablePurchaseMatch({ match: "review", attachmentsCount: 1, lines: [{}] }),
    true,
    "Unresolved review match must not be treated as ready",
  );
  assert.equal(
    hasUnavailablePurchaseMatch({ match: "exact", attachmentsCount: 0, lines: [] }),
    true,
    "Zero attachments and zero lines must be treated as match unavailable",
  );
  assert.equal(
    hasUnavailablePurchaseMatch({ match: "exact", attachmentsCount: 1, lines: [{}] }),
    false,
    "Exact match with evidence and lines is eligible",
  );
  assert.equal(
    hasUnavailablePurchaseMatch({ match: "diff", attachmentsCount: 0, lines: [{}] }),
    false,
    "Known diff match with line data is inspectable",
  );
});

test("T1.5 PUR-F09: filterApprovablePurchaseIds keeps only pending records with valid match/evidence", () => {
  const ids = filterApprovablePurchaseIds([
    { id: "op-1", status: "pending", match: "exact", attachmentsCount: 1, lines: [{}] },
    { id: "op-2", status: "pending", match: null, attachmentsCount: 0, lines: [] },
    { id: "op-3", status: "approved", match: "exact", attachmentsCount: 2, lines: [{}] },
    { id: "", status: "pending", match: "exact", attachmentsCount: 1, lines: [{}] },
  ]);
  assert.deepEqual(ids, ["op-1"]);
});

test("T1.5 AUD-S1-001: AccPurchases separates real financial bulk/single approval from bulk documentation", () => {
  const accPurchasesSrc = readFileSync(
    new URL("./_pages/accountant/AccPurchases.tsx", import.meta.url),
    "utf8",
  );
  const opsSrc = readFileSync(
    new URL("../../../api/queries/operations.ts", import.meta.url),
    "utf8",
  );

  // Must invoke real financial approval endpoints, never bulk-document for approval
  assert.match(accPurchasesSrc, /useApproveOperation\(/, "AccPurchases must wire useApproveOperation");
  assert.match(accPurchasesSrc, /useBulkApprove\(/, "AccPurchases must wire useBulkApprove");
  assert.match(accPurchasesSrc, /approveMut\.mutateAsync\(\{\s*id:\s*rec\.id\s*\}\)/, "Single approve must invoke approveMut.mutateAsync");
  assert.match(accPurchasesSrc, /bulkApproveMut\.mutateAsync\(\{\s*operationIds:\s*ids\s*\}\)/, "Bulk approve must invoke bulkApproveMut.mutateAsync");

  // Failed/partial results must be reported and leave pending rows pending (never optimistically flipped)
  assert.match(accPurchasesSrc, /failedCount\s*>\s*0/, "Bulk approve must inspect partial/failed counts");
  assert.match(accPurchasesSrc, /documentAll/, "Bulk documentation must remain a separately named action");
  assert.doesNotMatch(accPurchasesSrc, /approvedIds/, "Must not maintain optimistic local approvedIds");
  assert.doesNotMatch(accPurchasesSrc, /setApprovedIds/, "Must not flip status optimistically before server confirmation");
  assert.doesNotMatch(accPurchasesSrc, /purchase_.*_p/, "Must not fabricate purchase PDF filenames");
  assert.doesNotMatch(accPurchasesSrc, /window\.alert\(|onClick=\{\(\)\s*=>\s*alert\(/, "Must not use blocking browser alert dialogs");

  // Canonical endpoints verified in operations.ts
  assert.match(opsSrc, /`\/operations\/\$\{id\}\/approve`/, "Single approve endpoint must target /operations/{id}/approve");
  assert.match(opsSrc, /"\/operations\/bulk-approve"/, "Bulk approve endpoint must target /operations/bulk-approve");

  assert.match(accPurchasesSrc, /submitReject/, "Must wire Reject dialog handler");
  assert.match(accPurchasesSrc, /PurchaseAttachmentModal/, "Must render real PurchaseAttachmentModal");
  assert.match(accPurchasesSrc, /useOperation\(modal\.recId\)/, "Attachment modal must read real operation attachments");
  assert.match(accPurchasesSrc, /مطابقة غير متاحة/, "Must display unmatched/unavailable match notice");

  const headPageSrc = readFileSync(
    new URL("./_pages/head/HeadModulePage.tsx", import.meta.url),
    "utf8",
  );
  assert.match(headPageSrc, /مطابقة غير متاحة/, "HeadModulePage must display fallback notice when match is unavailable");
});
