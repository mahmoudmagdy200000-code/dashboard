/// <reference types="node" />
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  runStagingSmoke,
  validStringArray,
  verifyBalancedShift,
  logout,
  isRiyadhDate,
  sanitizeError,
  computeSmokeSummary,
  determineSmokeExitCode,
  type RoleSmokeResult,
} from "../../../../../scripts/smoke-test-staging";

test("T028: Contract Test - smoke-test-staging.ts matches actual Dashboard hooks and endpoints", () => {
  const smokePath = new URL("../../../../../scripts/smoke-test-staging.ts", import.meta.url);
  const smokeContent = readFileSync(smokePath, "utf8");

  const cashQueryPath = new URL("./cash.ts", import.meta.url);
  const cashContent = readFileSync(cashQueryPath, "utf8");

  // 1. useCashCustody in cash.ts queries /company/me/cash-custody
  assert.ok(
    cashContent.includes('"/company/me/cash-custody"'),
    "useCashCustody must call GET /company/me/cash-custody",
  );

  // 2. smoke-test-staging.ts queries /company/me/cash-custody (with hyphen, not slash)
  assert.ok(
    smokeContent.includes('endpoint: "/company/me/cash-custody"'),
    "smoke-test-staging.ts must check /company/me/cash-custody matching useCashCustody",
  );
  assert.equal(
    smokeContent.includes('endpoint: "/company/me/cash/custody"'),
    false,
    "smoke-test-staging.ts must not contain obsolete /company/me/cash/custody",
  );

  // 3. S-1: Verify removal of ineffective netSalesHalalas from live shifts
  assert.equal(
    smokeContent.includes('halalaField: "netSalesHalalas"'),
    false,
    "smoke-test-staging.ts must not check non-existent netSalesHalalas field on /accountant/shifts/live",
  );
  assert.ok(
    smokeContent.includes('endpoint: "/accountant/shifts/history?dateFrom=2026-10-24&dateTo=2026-10-24"'),
    "smoke-test-staging.ts must check explicit 2026-10-24 shift history endpoint",
  );

  // 4. S-2: Head Accountant Queue uses /operations?moduleKey=shifts&pageSize=100 with useOperations
  assert.ok(
    smokeContent.includes('endpoint: "/operations?moduleKey=shifts&pageSize=100'),
    "Head Accountant check must query GET /operations?moduleKey=shifts&pageSize=100",
  );
  assert.ok(
    smokeContent.includes('hookReference: "useOperations"'),
    "Head Accountant check must reference useOperations hook",
  );
  assert.equal(
    smokeContent.includes('/accountant/shifts/history?status=pending_head_approval'),
    false,
    "smoke-test-staging.ts must not query obsolete /accountant/shifts/history?status=pending_head_approval",
  );

  // 5. S-4: Session Cleanup via POST /auth/logout in try/finally
  assert.ok(
    smokeContent.includes("export async function logout("),
    "smoke-test-staging.ts must export a logout helper function",
  );
  assert.ok(
    smokeContent.includes("await logout(accToken)"),
    "Accountant role must call logout in finally block",
  );
  assert.ok(
    smokeContent.includes("await logout(headToken)"),
    "Head role must call logout in finally block",
  );
  assert.ok(
    smokeContent.includes("await logout(adminToken)"),
    "Admin role must call logout in finally block",
  );
  assert.ok(
    smokeContent.includes("await logout(branchToken)"),
    "Branch role must call logout in finally block",
  );

  // 6. Verify hook alignment across all smoke checks
  assert.ok(smokeContent.includes('hookReference: "usePlatformLiveShifts"'));
  assert.ok(smokeContent.includes('hookReference: "usePlatformHistoryShifts"'));
  assert.ok(smokeContent.includes('hookReference: "useAccountantOperationsPlatform"'));
  assert.ok(smokeContent.includes('hookReference: "usePlatformEmployees"'));
  assert.ok(smokeContent.includes('hookReference: "useCashCustody"'));
  assert.ok(smokeContent.includes('hookReference: "useCompanyPlans"'));
  assert.ok(smokeContent.includes('hookReference: "useERPBatches"'));
  assert.ok(smokeContent.includes('hookReference: "useCompanyUsers"'));
  assert.ok(smokeContent.includes('hookReference: "useAuthMe"'));
});

test("T029: S-1 Offline Unit Tests - verifyBalancedShift handles MATCH, MISMATCH, and NOT_FOUND", () => {
  // Case 1: MATCH - All 5 fields match approved 2026-10-24 fixture values exactly
  const matchPayload = {
    data: [
      {
        id: "shf-20261024-001",
        startedAt: "2026-10-24T06:00:00+03:00",
        endedAt: "2026-10-24T14:30:00+03:00",
        salesHalalas: 11500,
        cashExpectedHalalas: 4000,
        cashActualHalalas: 4000,
        varianceHalalas: 0,
        cashCountState: "counted",
      },
    ],
  };
  const matchResult = verifyBalancedShift(matchPayload, "2026-10-24");
  assert.equal(matchResult.status, "MATCH");
  assert.equal(matchResult.shiftId, "shf-20261024-001");
  assert.equal(matchResult.actual?.salesHalalas, 11500);
  assert.equal(matchResult.actual?.cashExpectedHalalas, 4000);
  assert.equal(matchResult.actual?.cashActualHalalas, 4000);
  assert.equal(matchResult.actual?.varianceHalalas, 0);
  assert.equal(matchResult.actual?.cashCountState, "counted");
  assert.equal(matchResult.mismatches, undefined);

  // Case 2: MISMATCH - Target shift on 2026-10-24 has differing values (e.g. variance, sales, cashCountState)
  const mismatchPayload = {
    data: [
      {
        id: "shf-20261024-002",
        startedAt: "2026-10-24T14:30:00+03:00",
        endedAt: "2026-10-24T23:00:00+03:00",
        salesHalalas: 12000, // Expected 11500
        cashExpectedHalalas: 4000,
        cashActualHalalas: 3800, // Expected 4000
        varianceHalalas: -200, // Expected 0
        cashCountState: "unknown", // Expected "counted"
      },
    ],
  };
  const mismatchResult = verifyBalancedShift(mismatchPayload, "2026-10-24");
  assert.equal(mismatchResult.status, "MISMATCH");
  assert.equal(mismatchResult.shiftId, "shf-20261024-002");
  const mismatches = mismatchResult.mismatches;
  if (!mismatches) {
    assert.fail("mismatchResult.mismatches must be defined");
  }
  assert.equal(mismatches.length, 4);
  assert.ok(mismatches.some(m => m.field === "salesHalalas" && m.expected === 11500 && m.actual === 12000));
  assert.ok(mismatches.some(m => m.field === "cashActualHalalas" && m.expected === 4000 && m.actual === 3800));
  assert.ok(mismatches.some(m => m.field === "varianceHalalas" && m.expected === 0 && m.actual === -200));
  assert.ok(mismatches.some(m => m.field === "cashCountState" && m.expected === "counted" && m.actual === "unknown"));

  // Case 3A: NOT_FOUND - Empty data array returned
  const notFoundEmpty = verifyBalancedShift({ data: [] }, "2026-10-24");
  assert.equal(notFoundEmpty.status, "NOT_FOUND");
  assert.ok(notFoundEmpty.message.includes("No shifts found"));

  // Case 3B: NOT_FOUND - Shifts exist but only for other dates (e.g. 2026-10-23)
  const notFoundOtherDate = verifyBalancedShift({
    data: [
      {
        id: "shf-20261023-001",
        startedAt: "2026-10-23T06:00:00+03:00",
        endedAt: "2026-10-23T14:30:00+03:00",
        salesHalalas: 11500,
        cashExpectedHalalas: 4000,
        cashActualHalalas: 4000,
        varianceHalalas: 0,
        cashCountState: "counted",
      },
    ],
  }, "2026-10-24");
  assert.equal(notFoundOtherDate.status, "NOT_FOUND");
  assert.ok(notFoundOtherDate.message.includes("No shift matching target date 2026-10-24"));
});

test("T028: Staging Readiness Gate - Blocks execution and makes zero requests when attestation is missing", async () => {
  // Run smoke without setting credentials or attestation
  const report = await runStagingSmoke();

  assert.equal(report.environmentState, "BLOCKED — NO REQUESTS EXECUTED");
  assert.ok(report.blockers.length >= 2, "Must report blockers for missing credentials and operator attestation");
  assert.ok(
    report.blockers.some(b => b.includes("ASSAB_STAGING_PASSWORD")),
    "Must block on missing password",
  );
  assert.ok(
    report.blockers.some(b => b.includes("deployment SHA is not yet attested")),
    "Must block on missing deployment attestation",
  );

  // All roles must report BLOCKED with zero endpoints executed
  assert.ok(report.results.length >= 4, "Must list all configured roles in blocked state");
  for (const r of report.results) {
    assert.equal(r.loginStatus, "BLOCKED", `${r.role} must be BLOCKED`);
    assert.equal(r.endpoints.length, 0, `${r.role} must have 0 executed endpoints`);
  }
});

test("T028: WRONG_ROLE Envelope - Requires HTTP 403, error.code, and messageAr together (AND logic)", () => {
  const smokePath = new URL("../../../../../scripts/smoke-test-staging.ts", import.meta.url);
  const smokeContent = readFileSync(smokePath, "utf8");

  // Verify WRONG_ROLE parsing logic
  assert.ok(
    smokeContent.includes('errEnvelope?.code === "WRONG_ROLE"'),
    "Must verify error.code === 'WRONG_ROLE'",
  );
  assert.ok(
    smokeContent.includes('typeof errEnvelope?.messageAr === "string" && errEnvelope.messageAr.trim().length > 0'),
    "Must verify non-empty error.messageAr string",
  );
  assert.ok(
    smokeContent.includes("isHttp403 && hasWrongRoleCode && hasNonEmptyMessageAr"),
    "All 3 WRONG_ROLE conditions must be required together via boolean AND",
  );
});

test("T028: Strict Branch Guard - Conforms to roleAccess.ts without auto-empty fallbacks", () => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // 1. Missing or undefined brandIds/restaurantIds must NOT be treated as empty array
  assert.equal(validStringArray(undefined, uuidPattern), false, "undefined is not a valid array");
  assert.equal(validStringArray(null, uuidPattern), false, "null is not a valid array");
  assert.equal(validStringArray("not-array", uuidPattern), false, "string is not a valid array");

  // 2. Empty arrays are valid
  assert.equal(validStringArray([], uuidPattern), true, "Empty array is valid");

  // 3. Array with invalid UUID format is rejected
  assert.equal(validStringArray(["invalid-uuid"], uuidPattern), false, "Non-UUID string is rejected");

  // 4. Array with valid UUID is accepted
  const validUuid = "12345678-1234-1234-1234-123456789abc";
  assert.equal(validStringArray([validUuid], uuidPattern), true, "Valid UUID is accepted");
});

test("T030: S-1 Deterministic Fixture Identification & Ambiguity Rejection", () => {
  // Case 1: Timezone-aware date parsing (Asia/Riyadh UTC+3)
  // 2026-10-23T21:30:00.000Z in UTC is 2026-10-24T00:30:00+03:00 in Riyadh time
  assert.equal(isRiyadhDate("2026-10-23T21:30:00.000Z", "2026-10-24"), true);
  // 2026-10-24T20:59:59.000Z in UTC is 2026-10-24T23:59:59+03:00 in Riyadh time
  assert.equal(isRiyadhDate("2026-10-24T20:59:59.000Z", "2026-10-24"), true);
  // 2026-10-24T21:01:00.000Z in UTC is 2026-10-25T00:01:00+03:00 in Riyadh time (different date!)
  assert.equal(isRiyadhDate("2026-10-24T21:01:00.000Z", "2026-10-24"), false);

  // Case 2: Ambiguity detection - Multiple shifts on 2026-10-24 without unique ID must return BLOCKED (AMBIGUOUS_FIXTURE)
  const multiCandidatePayload = {
    data: [
      {
        id: "shf-20261024-alpha",
        startedAt: "2026-10-24T06:00:00+03:00",
        salesHalalas: 11500,
        cashExpectedHalalas: 4000,
        cashActualHalalas: 4000,
        varianceHalalas: 0,
        cashCountState: "counted",
      },
      {
        id: "shf-20261024-beta",
        startedAt: "2026-10-24T14:00:00+03:00",
        salesHalalas: 11500,
        cashExpectedHalalas: 4000,
        cashActualHalalas: 4000,
        varianceHalalas: 0,
        cashCountState: "counted",
      },
    ],
  };
  const ambiguousResult = verifyBalancedShift(multiCandidatePayload, "2026-10-24");
  assert.equal(ambiguousResult.status, "BLOCKED");
  assert.equal(ambiguousResult.reason, "AMBIGUOUS_FIXTURE");
  assert.ok(ambiguousResult.message.includes("Ambiguous fixture identification"));

  // Case 3: Disambiguation with unique fixtureId
  const disambiguatedResult = verifyBalancedShift(multiCandidatePayload, {
    targetDate: "2026-10-24",
    fixtureId: "shf-20261024-beta",
  });
  assert.equal(disambiguatedResult.status, "MATCH");
  assert.equal(disambiguatedResult.shiftId, "shf-20261024-beta");

  // Case 4: fixtureId requested but not found among candidates
  const missingIdResult = verifyBalancedShift(multiCandidatePayload, {
    targetDate: "2026-10-24",
    fixtureId: "shf-20261024-gamma",
  });
  assert.equal(missingIdResult.status, "NOT_FOUND");
  assert.equal(missingIdResult.reason, "FIXTURE_MISSING");
  assert.ok(missingIdResult.message.includes("Fixture shift 'shf-20261024-gamma' not found"));
});

test("T031: Per-Role Failure Isolation & Logout Safety", () => {
  const smokePath = new URL("../../../../../scripts/smoke-test-staging.ts", import.meta.url);
  const smokeContent = readFileSync(smokePath, "utf8");

  // 1. Verify every role contains try/catch/finally
  assert.ok(smokeContent.includes("accResult.loginStatus = \"FAIL\""));
  assert.ok(smokeContent.includes("headResult.loginStatus = \"FAIL\""));
  assert.ok(smokeContent.includes("adminResult.loginStatus = \"FAIL\""));
  assert.ok(smokeContent.includes("branchResult.loginStatus = \"FAIL\""));

  // 2. Inner try-catch per endpoint check
  assert.ok(smokeContent.includes('statusText: "NETWORK_ERROR"'));

  // 3. Logout in finally block
  assert.ok(smokeContent.includes("if (accToken)"));
  assert.ok(smokeContent.includes("if (headToken)"));
  assert.ok(smokeContent.includes("if (adminToken)"));
  assert.ok(smokeContent.includes("if (branchToken)"));

  // 4. Logout error handling
  assert.ok(smokeContent.includes('accResult.logoutStatus = "FAILED"'));
});

test("T032: Evidence Sanitization - Zero Account Emails or Secrets in Output", () => {
  const smokePath = new URL("../../../../../scripts/smoke-test-staging.ts", import.meta.url);
  const smokeContent = readFileSync(smokePath, "utf8");

  // 1. Output ledger does NOT print Account: ${r.accountEmail}
  assert.equal(
    smokeContent.includes("Account: ${r.accountEmail}"),
    false,
    "smoke-test-staging.ts must not print personal account email in ledger",
  );

  // 2. RoleSmokeResult interface must not contain accountEmail field
  assert.equal(
    smokeContent.includes("accountEmail: string;"),
    false,
    "RoleSmokeResult must not include accountEmail field",
  );

  // 3. sanitizeError utility redacts emails, tokens, and passwords
  const dirtyError = "Failed to connect for user test.account@nakhat.sa with Bearer eyJhbGciOiJIUzI1NiJ9 and password \"secret123\"";
  const sanitized = sanitizeError(dirtyError);
  assert.equal(sanitized.includes("test.account@nakhat.sa"), false);
  assert.equal(sanitized.includes("eyJhbGciOiJIUzI1NiJ9"), false);
  assert.equal(sanitized.includes("secret123"), false);
  assert.ok(sanitized.includes("[REDACTED_EMAIL]"));
  assert.ok(sanitized.includes("[REDACTED_TOKEN]"));
  assert.ok(sanitized.includes("[REDACTED]"));
});

test("T033: Result Categories Breakdown & Failure Determination", () => {
  // Case 1: All checks OK produces PASS
  const passResults: RoleSmokeResult[] = [
    {
      role: "accountant",
      testId: "SMOKE_ACC_01",
      loginStatus: "PASS",
      logoutStatus: "SUCCESS",
      endpoints: [
        {
          endpoint: "/accountant/shifts/live",
          method: "GET",
          description: "Live",
          hookReference: "usePlatformLiveShifts",
          status: 200,
          statusText: "OK",
          durationMs: 50,
          rootCauseClassification: "OK",
        },
      ],
    },
  ];
  const passSummary = computeSmokeSummary(passResults, "RUNNABLE");
  assert.equal(passSummary.overallStatus, "PASS");
  assert.equal(passSummary.executedChecksStatus, "ALL_PASSED");
  assert.equal(passSummary.passCount, 1);
  assert.equal(passSummary.failCount, 0);

  // Case 2: A financial mismatch must produce overallStatus: FAIL
  const mismatchResults: RoleSmokeResult[] = [
    {
      role: "accountant",
      testId: "SMOKE_ACC_01",
      loginStatus: "PASS",
      logoutStatus: "SUCCESS",
      endpoints: [
        {
          endpoint: "/accountant/shifts/history?dateFrom=2026-10-24&dateTo=2026-10-24",
          method: "GET",
          description: "History",
          hookReference: "usePlatformHistoryShifts",
          status: 200,
          statusText: "OK",
          durationMs: 50,
          rootCauseClassification: "FAIL",
          shiftVerification: {
            status: "MISMATCH",
            targetDate: "2026-10-24",
            expected: { salesHalalas: 11500, cashExpectedHalalas: 4000, cashActualHalalas: 4000, varianceHalalas: 0, cashCountState: "counted" },
            actual: { salesHalalas: 12000, cashExpectedHalalas: 4000, cashActualHalalas: 4000, varianceHalalas: 0, cashCountState: "counted" },
            message: "Mismatch",
          },
        },
      ],
    },
  ];
  const mismatchSummary = computeSmokeSummary(mismatchResults, "RUNNABLE");
  assert.equal(mismatchSummary.overallStatus, "FAIL");
  assert.equal(mismatchSummary.executedChecksStatus, "HAS_FAILURES");
  assert.ok(mismatchSummary.failCount >= 1);

  // Case 3: Missing fixture (NOT_FOUND) must produce overallStatus: FAIL
  const notFoundResults: RoleSmokeResult[] = [
    {
      role: "accountant",
      testId: "SMOKE_ACC_01",
      loginStatus: "PASS",
      logoutStatus: "SUCCESS",
      endpoints: [
        {
          endpoint: "/accountant/shifts/history?dateFrom=2026-10-24&dateTo=2026-10-24",
          method: "GET",
          description: "History",
          hookReference: "usePlatformHistoryShifts",
          status: 200,
          statusText: "OK",
          durationMs: 50,
          rootCauseClassification: "NOT_FOUND",
          shiftVerification: {
            status: "NOT_FOUND",
            targetDate: "2026-10-24",
            expected: { salesHalalas: 11500, cashExpectedHalalas: 4000, cashActualHalalas: 4000, varianceHalalas: 0, cashCountState: "counted" },
            message: "Not found",
          },
        },
      ],
    },
  ];
  const notFoundSummary = computeSmokeSummary(notFoundResults, "RUNNABLE");
  assert.equal(notFoundSummary.overallStatus, "FAIL");
  assert.equal(notFoundSummary.executedChecksStatus, "HAS_FAILURES");
  assert.ok(notFoundSummary.notFoundCount >= 1);

  // Case 4: Backend E1 dependency (asset-drafts 404) is classified as BLOCKED
  const blockedE1Results: RoleSmokeResult[] = [
    {
      role: "accountant",
      testId: "SMOKE_ACC_01",
      loginStatus: "PASS",
      logoutStatus: "SUCCESS",
      endpoints: [
        {
          endpoint: "/company/me/asset-drafts",
          method: "GET",
          description: "Asset Drafts",
          hookReference: "useAssetDrafts",
          status: 404,
          statusText: "Not Found",
          durationMs: 30,
          rootCauseClassification: "BLOCKED",
        },
      ],
    },
  ];
  const blockedSummary = computeSmokeSummary(blockedE1Results, "RUNNABLE");
  assert.equal(blockedSummary.blockedCount, 1);
  assert.equal(blockedSummary.failCount, 0);
  assert.equal(blockedSummary.executedChecksStatus, "NONE_RUN");
  assert.equal(blockedSummary.overallStatus, "BLOCKED"); // Standing backend blocker blocks operational acceptance (never PASS)

  // Case 5 (Regression): 16 PASS + 1 BLOCKED must NOT yield Overall Acceptance PASS
  const sixteenPassOneBlockedResults: RoleSmokeResult[] = [
    {
      role: "accountant",
      testId: "SMOKE_ACC_01",
      loginStatus: "PASS",
      logoutStatus: "SUCCESS",
      endpoints: [
        { endpoint: "/accountant/shifts/live", method: "GET", description: "Live", hookReference: "usePlatformLiveShifts", status: 200, statusText: "OK", durationMs: 40, rootCauseClassification: "OK" },
        { endpoint: "/accountant/shifts/history?dateFrom=2026-10-24&dateTo=2026-10-24", method: "GET", description: "Shift 2026-10-24", hookReference: "usePlatformHistoryShifts", status: 200, statusText: "OK", durationMs: 40, rootCauseClassification: "OK", shiftVerification: { status: "MATCH", targetDate: "2026-10-24", expected: { salesHalalas: 11500, cashExpectedHalalas: 4000, cashActualHalalas: 4000, varianceHalalas: 0, cashCountState: "counted" }, actual: { salesHalalas: 11500, cashExpectedHalalas: 4000, cashActualHalalas: 4000, varianceHalalas: 0, cashCountState: "counted" }, message: "Matched" } },
        { endpoint: "/accountant/shifts/history", method: "GET", description: "History", hookReference: "usePlatformHistoryShifts", status: 200, statusText: "OK", durationMs: 40, rootCauseClassification: "OK" },
        { endpoint: "/accountant/operations", method: "GET", description: "Operations", hookReference: "useAccountantOperationsPlatform", status: 200, statusText: "OK", durationMs: 40, rootCauseClassification: "OK" },
        { endpoint: "/accountant/employees", method: "GET", description: "Employees", hookReference: "usePlatformEmployees", status: 200, statusText: "OK", durationMs: 40, rootCauseClassification: "OK" },
        { endpoint: "/company/me/cash-custody", method: "GET", description: "Cash Custody", hookReference: "useCashCustody", status: 200, statusText: "OK", durationMs: 40, rootCauseClassification: "OK" },
        { endpoint: "/company/me/asset-drafts", method: "GET", description: "Asset Drafts", hookReference: "useAssetDrafts", status: 404, statusText: "Not Found", durationMs: 30, rootCauseClassification: "BLOCKED" },
      ],
    },
    {
      role: "head",
      testId: "SMOKE_HEAD_01",
      loginStatus: "PASS",
      logoutStatus: "SUCCESS",
      endpoints: [
        { endpoint: "/plans", method: "GET", description: "Plans", hookReference: "useCompanyPlans", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
        { endpoint: "/head/erp/batches", method: "GET", description: "Batches", hookReference: "useERPBatches", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
        { endpoint: "/head/erp/eligible-operations", method: "GET", description: "Eligible Ops", hookReference: "useERPEligibleOperations", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
        { endpoint: "/operations?moduleKey=shifts&pageSize=100&page=1", method: "GET", description: "Operations", hookReference: "useOperations", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
      ],
    },
    {
      role: "company-admin",
      testId: "SMOKE_ADMIN_01",
      loginStatus: "PASS",
      logoutStatus: "SUCCESS",
      endpoints: [
        { endpoint: "/company/me/users", method: "GET", description: "Users", hookReference: "useCompanyUsers", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
        { endpoint: "/company/invitations", method: "GET", description: "Invitations", hookReference: "useCompanyInvitations", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
        { endpoint: "/plans", method: "GET", description: "Plans", hookReference: "useCompanyPlans", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
        { endpoint: "/company/me/subscription", method: "GET", description: "Subscription", hookReference: "useCompanySubscription", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
      ],
    },
    {
      role: "branch",
      testId: "SMOKE_BRANCH_01",
      loginStatus: "PASS",
      logoutStatus: "SUCCESS",
      endpoints: [
        { endpoint: "/auth/me", method: "GET", description: "AuthMe", hookReference: "useAuthMe", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
        { endpoint: "/company/me/branch/overview", method: "GET", description: "Branch Overview", hookReference: "usePlatformBranchOverview", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
      ],
    },
  ];

  const sixteenPassSummary = computeSmokeSummary(sixteenPassOneBlockedResults, "RUNNABLE");
  assert.equal(sixteenPassSummary.passCount, 16, "Must count exactly 16 passed endpoints");
  assert.equal(sixteenPassSummary.blockedCount, 1, "Must count exactly 1 blocked endpoint");
  assert.equal(sixteenPassSummary.failCount, 0, "Must have zero failCount");
  assert.equal(sixteenPassSummary.notFoundCount, 0, "Must have zero notFoundCount");
  assert.equal(sixteenPassSummary.executedChecksStatus, "ALL_PASSED", "Executed checks must be ALL_PASSED");
  assert.notEqual(sixteenPassSummary.overallStatus, "PASS", "16 PASS + 1 BLOCKED must NEVER give Overall Acceptance PASS");
  assert.equal(sixteenPassSummary.overallStatus, "BLOCKED", "16 PASS + 1 BLOCKED must give Overall Acceptance BLOCKED");

  // Case 6: Failed session logout must register as failure
  const logoutFailedResults: RoleSmokeResult[] = [
    {
      role: "accountant",
      testId: "SMOKE_ACC_01",
      loginStatus: "PASS",
      logoutStatus: "FAILED",
      endpoints: [
        { endpoint: "/accountant/shifts/live", method: "GET", description: "Live", hookReference: "usePlatformLiveShifts", status: 200, statusText: "OK", durationMs: 50, rootCauseClassification: "OK" },
      ],
    },
  ];
  const logoutFailedSummary = computeSmokeSummary(logoutFailedResults, "RUNNABLE");
  assert.ok(logoutFailedSummary.failCount >= 1, "Logout failure must increment failCount");
  assert.equal(logoutFailedSummary.executedChecksStatus, "HAS_FAILURES");
  assert.equal(logoutFailedSummary.overallStatus, "FAIL");

  // Case 7: Failed branch scope guard (Backend E2/E3 fixture pollution) must register as BLOCKED
  const branchEvaluationResults: RoleSmokeResult[] = [
    {
      role: "branch",
      testId: "SMOKE_BRANCH_01",
      loginStatus: "PASS",
      logoutStatus: "SUCCESS",
      endpoints: [
        { endpoint: "/company/me/branch/overview", method: "GET", description: "Branch Overview", hookReference: "usePlatformBranchOverview", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
      ],
    },
  ];
  const branchGuardFailedSummary = computeSmokeSummary(branchEvaluationResults, "RUNNABLE", {
    guardPassed: false,
    verdict: "COMPATIBILITY_HOLD_BACKEND_FIXTURE_POLLUTED (Backend E2/E3 dependency)",
  });
  assert.ok(branchGuardFailedSummary.blockedCount >= 1, "Failed branch guard must increment blockedCount");
  assert.equal(branchGuardFailedSummary.failCount, 0, "Branch fixture blocker must not be blamed on Dashboard as a failure");
  assert.equal(branchGuardFailedSummary.overallStatus, "BLOCKED");

  // Case 8: Unexecuted check must not yield complete acceptance PASS
  const notRunResults: RoleSmokeResult[] = [
    {
      role: "accountant",
      testId: "SMOKE_ACC_01",
      loginStatus: "NOT_RUN",
      logoutStatus: "NOT_RUN",
      endpoints: [],
    },
  ];
  const notRunSummary = computeSmokeSummary(notRunResults, "RUNNABLE");
  assert.ok(notRunSummary.notRunCount >= 1);
  assert.notEqual(notRunSummary.overallStatus, "PASS");
  assert.equal(notRunSummary.overallStatus, "NOT_RUN");

  // Case 9: When Branch Scope evaluation from /auth/me fails or is inconclusive (guardPassed: false), it must register as BLOCKED
  const branchNoEvalResults: RoleSmokeResult[] = [
    {
      role: "branch",
      testId: "SMOKE_BRANCH_01",
      loginStatus: "PASS",
      logoutStatus: "SUCCESS",
      endpoints: [
        { endpoint: "/company/me/branch/overview", method: "GET", description: "Branch Overview", hookReference: "usePlatformBranchOverview", status: 200, statusText: "OK", durationMs: 30, rootCauseClassification: "OK" },
      ],
    },
  ];
  const branchNoEvalSummary = computeSmokeSummary(branchNoEvalResults, "RUNNABLE", {
    guardPassed: false,
    verdict: "NOT_EVALUATED / BLOCKED: Failed to inspect branch manager scope from /auth/me",
  });
  assert.ok(branchNoEvalSummary.blockedCount >= 1, "Inconclusive branchScopeEvaluation must increment blockedCount");
  assert.equal(branchNoEvalSummary.overallStatus, "BLOCKED", "Inconclusive branchScopeEvaluation must yield overallStatus BLOCKED");

  // Case 10: When required Roleless account is missing, runner records roleless as BLOCKED, yielding overallStatus BLOCKED
  const missingRolelessResults: RoleSmokeResult[] = [
    {
      role: "roleless_authenticated",
      testId: "SMOKE_ROLELESS_01",
      loginStatus: "BLOCKED",
      logoutStatus: "NOT_RUN",
      endpoints: [
        {
          endpoint: "/company/me/shifts",
          method: "GET",
          description: "Verify authenticated roleless user receives 403",
          hookReference: "useRoleGuard",
          status: 0,
          statusText: "NOT_CONFIGURED",
          durationMs: 0,
          rootCauseClassification: "BLOCKED",
          error: "BLOCKED: ASSAB_ROLELESS_EMAIL environment variable is not configured.",
        },
      ],
    },
  ];
  const missingRolelessSummary = computeSmokeSummary(missingRolelessResults, "RUNNABLE");
  assert.ok(missingRolelessSummary.blockedCount >= 1, "Missing roleless account must increment blockedCount");
  assert.equal(missingRolelessSummary.overallStatus, "BLOCKED", "Missing roleless account must yield overallStatus BLOCKED");

  // Case 11: determineSmokeExitCode must return non-zero exit code when overallStatus is BLOCKED or FAIL
  assert.equal(determineSmokeExitCode("RUNNABLE", "PASS"), 0, "All checks passed must yield exit code 0");
  assert.equal(determineSmokeExitCode("RUNNABLE", "FAIL"), 1, "Failed checks must yield exit code 1");
  assert.equal(determineSmokeExitCode("BLOCKED — NO REQUESTS EXECUTED", "BLOCKED"), 2, "Readiness gate blocked must yield exit code 2");
  assert.equal(determineSmokeExitCode("RUNNABLE", "BLOCKED"), 3, "Operational acceptance BLOCKED must yield non-zero exit code 3");
  assert.equal(determineSmokeExitCode("RUNNABLE", "NOT_RUN"), 3, "Operational acceptance NOT_RUN must yield non-zero exit code 3");
});

test("T034: Smoke Workflow Exit Code Propagation & Failure Safety", () => {
  const workflowPath = new URL("../../../../../.github/workflows/assab-go17-staging-smoke.yml", import.meta.url);
  const workflowContent = readFileSync(workflowPath, "utf8");

  // 1. Unconditional || true is removed
  assert.equal(
    workflowContent.includes("|| true"),
    false,
    "Workflow must not contain unconditional '|| true' suppressing smoke failures",
  );

  // 2. shell: bash and set -o pipefail are configured
  assert.ok(
    workflowContent.includes("shell: bash"),
    "Workflow smoke step must explicitly declare shell: bash",
  );
  assert.ok(
    workflowContent.includes("set -o pipefail"),
    "Workflow smoke step must set pipefail to propagate failure across tee",
  );

  // 3. Artifact upload executes with if: always()
  assert.ok(
    workflowContent.includes("if: always()"),
    "Evidence upload must execute on failure using if: always()",
  );

  // 4. Hardcoded reviewed repository and commit SHA prevent unreviewed input override
  assert.ok(
    workflowContent.includes('repository: "mohameelsherbini/dashboard"'),
    "Workflow checkout must be hardcoded to mohameelsherbini/dashboard",
  );
  assert.ok(
    workflowContent.includes('ref: "4a4246b7b94153b5f34ff5f78d9095a82b1d6160"'),
    "Workflow checkout must be hardcoded to reviewed commit SHA 4a4246b7b94153b5f34ff5f78d9095a82b1d6160",
  );
  assert.equal(
    workflowContent.includes("reviewed_dashboard_commit_sha:"),
    false,
    "Workflow inputs must NOT allow overriding reviewed commit SHA",
  );
  assert.equal(
    workflowContent.includes("reviewed_dashboard_repository:"),
    false,
    "Workflow inputs must NOT allow overriding reviewed repository",
  );

  // 5. Verification step checks git rev-parse HEAD before running with secrets
  assert.ok(
    workflowContent.includes("git rev-parse HEAD"),
    "Workflow must verify actual checked out SHA via git rev-parse HEAD",
  );
  assert.ok(
    workflowContent.includes("4a4246b7b94153b5f34ff5f78d9095a82b1d6160"),
    "Workflow must assert checked out SHA matches 4a4246b7b94153b5f34ff5f78d9095a82b1d6160",
  );

  // 6. Checked-out code SHA is NOT conflated with Vercel deployment SHA
  assert.ok(
    workflowContent.includes('ASSAB_FRONTEND_DEPLOYED_SHA: "PENDING_VERCEL_DEPLOYMENT_ATTESTATION"'),
    "ASSAB_FRONTEND_DEPLOYED_SHA must remain unproven/pending rather than falsely adopting code commit SHA",
  );
});
