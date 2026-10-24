import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("T027: head.ts repoints ERP hooks to /head/erp/* and eliminates /company/me/erp/* dead routes", () => {
  const filePath = new URL("./head.ts", import.meta.url);
  const content = readFileSync(filePath, "utf8");

  // Verify dead routes are removed
  assert.equal(
    content.includes('"/company/me/erp/preflight"'),
    false,
    "head.ts must not reference dead route /company/me/erp/preflight",
  );
  assert.equal(
    content.includes('"/company/me/erp/eligible-operations"'),
    false,
    "head.ts must not reference dead route /company/me/erp/eligible-operations",
  );
  assert.equal(
    content.includes('"/company/me/erp/batches"'),
    false,
    "head.ts must not reference dead route /company/me/erp/batches",
  );

  // Verify repointed routes to /head/erp/*
  assert.ok(
    content.includes('"/head/erp/preflight"'),
    "useERPPreflight must target /head/erp/preflight",
  );
  assert.ok(
    content.includes('"/head/erp/eligible-operations"'),
    "useERPEligibleOperations must target /head/erp/eligible-operations",
  );
  assert.ok(
    content.includes('"/head/erp/batches"'),
    "useERPBatches must target /head/erp/batches",
  );
});

test("T027: Obsolete platform adapter hooks are pruned from platform queries", () => {
  const accountantPath = new URL("./platform/accountant.ts", import.meta.url);
  const accountantContent = readFileSync(accountantPath, "utf8");
  assert.equal(
    accountantContent.includes("useFlagPlatformInventoryItems"),
    false,
    "useFlagPlatformInventoryItems must be pruned from platform/accountant.ts",
  );
  assert.equal(
    accountantContent.includes("useSendInventoryConfirmation"),
    false,
    "useSendInventoryConfirmation must be pruned from platform/accountant.ts",
  );

  const branchPath = new URL("./platform/branch.ts", import.meta.url);
  const branchContent = readFileSync(branchPath, "utf8");
  assert.equal(
    branchContent.includes("useConfirmBranchAssetPlatform"),
    false,
    "useConfirmBranchAssetPlatform must be pruned from platform/branch.ts",
  );
  assert.equal(
    branchContent.includes("useReconfirmBranchInventoryPlatform"),
    false,
    "useReconfirmBranchInventoryPlatform must be pruned from platform/branch.ts",
  );
  assert.equal(
    branchContent.includes("useBranchUploadPlatform"),
    false,
    "useBranchUploadPlatform must be pruned from platform/branch.ts",
  );
});

test("T027: Mobile shift stubs are preserved per Decision D-1", () => {
  const shiftsPath = new URL("./shifts.ts", import.meta.url);
  const shiftsContent = readFileSync(shiftsPath, "utf8");
  assert.ok(
    shiftsContent.includes("export function useOpenShift"),
    "useOpenShift stub must be preserved in shifts.ts",
  );
  assert.ok(
    shiftsContent.includes("export function useCloseShift"),
    "useCloseShift stub must be preserved in shifts.ts",
  );

  const branchMgrPath = new URL("./branchMgr.ts", import.meta.url);
  const branchMgrContent = readFileSync(branchMgrPath, "utf8");
  assert.ok(
    branchMgrContent.includes("export function useBranchOpenShift"),
    "useBranchOpenShift stub must be preserved in branchMgr.ts",
  );
  assert.ok(
    branchMgrContent.includes("export function useBranchCloseShift"),
    "useBranchCloseShift stub must be preserved in branchMgr.ts",
  );
});
