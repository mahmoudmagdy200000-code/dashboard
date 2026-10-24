import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runStagingSmoke, validStringArray } from "../../../../../scripts/smoke-test-staging";

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

  // 3. Verify hook alignment across all smoke checks
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
