/**
 * ASSAB ERP - Dashboard Staging Read-Only Smoke & Compatibility Runner
 *
 * Target: Attested Coolify Backend Staging & Vercel Dashboard Staging
 * Staging URL: https://szkrjqiuo9s6d6nsy5fldc0j.62.72.19.141.sslip.io/
 * Mode: Strictly Read-Only (GET requests + session login POST)
 * Zero mutating operations executed.
 *
 * SECURITY RULES (CREDENTIALS HYGIENE):
 * - ZERO hardcoded passwords or secrets in code or git.
 * - Credentials MUST be supplied via environment variables:
 *   - ASSAB_STAGING_API_ORIGIN (defaults to Coolify Staging URL)
 *   - ASSAB_STAGING_PASSWORD (single test fixture password)
 *   - ASSAB_ROLELESS_EMAIL (email of an authenticated account with no assigned roles)
 *   - ASSAB_VERCEL_FRONTEND_URL (e.g. https://dashboard-staging.vercel.app)
 *   - ASSAB_BACKEND_DEPLOYED_SHA (operator-attested Coolify deployment SHA)
 *   - ASSAB_FRONTEND_DEPLOYED_SHA (operator-attested Vercel deployment SHA)
 *   - ASSAB_DEPLOYMENT_ATTESTED ("true" if Mahmoud explicitly confirmed deployment)
 *   - ASSAB_SMOKE_FIXTURE_SHIFT_ID (optional unique identifier for 2026-10-24 fixture shift)
 * - Zero logging of access tokens, refresh tokens, auth cookies, or personal identifiers.
 */

import * as fs from "fs";

const DEFAULT_STAGING_ORIGIN = "https://szkrjqiuo9s6d6nsy5fldc0j.62.72.19.141.sslip.io";
const API_ORIGIN = process.env.ASSAB_STAGING_API_ORIGIN || process.env.VITE_API_BASE_URL || DEFAULT_STAGING_ORIGIN;
const STAGING_PASSWORD = process.env.ASSAB_STAGING_PASSWORD || process.env.ASSAB_E2E_FIXTURE_PASSWORD || "";
const ROLELESS_EMAIL = process.env.ASSAB_ROLELESS_EMAIL || "";
const FRONTEND_URL = process.env.ASSAB_VERCEL_FRONTEND_URL || "";
const EXPECTED_BACKEND_SHA = process.env.ASSAB_BACKEND_DEPLOYED_SHA || "PENDING_OPERATOR_ATTESTATION";
const EXPECTED_FRONTEND_SHA = process.env.ASSAB_FRONTEND_DEPLOYED_SHA || "PENDING_VERCEL_DEPLOYMENT";
const IS_DEPLOYMENT_ATTESTED = process.env.ASSAB_DEPLOYMENT_ATTESTED === "true";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODULE_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;

export function validStringArray(val: unknown, pattern: RegExp): val is string[] {
  return (
    Array.isArray(val) &&
    val.every(id => typeof id === "string" && id.trim() === id && pattern.test(id)) &&
    new Set(val).size === val.length
  );
}

/**
 * Sanitizes error messages by redacting email addresses, auth tokens, and passwords.
 */
export function sanitizeError(err: unknown): string {
  if (!err) return "Unknown error";
  let msg = typeof err === "string" ? err : (err as any)?.message || String(err);
  msg = msg.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, "[REDACTED_EMAIL]");
  msg = msg.replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, "Bearer [REDACTED_TOKEN]");
  msg = msg.replace(/(["']?password["']?\s*[:=]?\s*)(["'][^"']*["']|\S+)/gi, '$1"[REDACTED]"');
  return msg;
}

interface LoginResponse {
  accessToken?: string;
  user?: {
    id: string;
    email?: string;
    roles?: Array<{
      key: string;
      scope: string;
      brandIds?: string[];
      branchIds?: string[];
      restaurantIds?: string[];
      moduleKeys?: string[];
    }>;
  };
}

export interface ShiftVerificationResult {
  status: "MATCH" | "MISMATCH" | "NOT_FOUND" | "BLOCKED";
  reason?: "AMBIGUOUS_FIXTURE" | "FIXTURE_MISSING" | "DATA_MISMATCH";
  shiftId?: string;
  targetDate: string;
  expected: {
    salesHalalas: number;
    cashExpectedHalalas: number;
    cashActualHalalas: number;
    varianceHalalas: number;
    cashCountState: string;
  };
  actual?: {
    salesHalalas?: number;
    cashExpectedHalalas?: number;
    cashActualHalalas?: number;
    varianceHalalas?: number;
    cashCountState?: string;
  };
  mismatches?: Array<{ field: string; expected: any; actual: any }>;
  message: string;
}

export const EXPECTED_FIXTURE_SHIFT = {
  salesHalalas: 11500,
  cashExpectedHalalas: 4000,
  cashActualHalalas: 4000,
  varianceHalalas: 0,
  cashCountState: "counted",
} as const;

/**
 * Checks if a date or ISO timestamp belongs to the target business date in Asia/Riyadh (+03:00).
 */
export function isRiyadhDate(dtStr: unknown, targetDate: string): boolean {
  if (typeof dtStr !== "string" || !dtStr.trim()) return false;
  try {
    const d = new Date(dtStr);
    if (!isNaN(d.getTime())) {
      const riyadhDate = d.toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
      return riyadhDate === targetDate;
    }
  } catch {
    // fallback
  }
  return dtStr.startsWith(targetDate);
}

export function verifyBalancedShift(
  responseBody: any,
  optionsOrDate?: string | { targetDate?: string; fixtureId?: string }
): ShiftVerificationResult {
  const targetDate = typeof optionsOrDate === "string"
    ? optionsOrDate
    : (optionsOrDate?.targetDate || process.env.ASSAB_SMOKE_FIXTURE_DATE || "2026-10-24");
  const fixtureId = typeof optionsOrDate === "object"
    ? optionsOrDate.fixtureId
    : (process.env.ASSAB_SMOKE_FIXTURE_SHIFT_ID || undefined);

  const shifts: any[] = Array.isArray(responseBody?.data)
    ? responseBody.data
    : Array.isArray(responseBody)
      ? responseBody
      : [];

  const expected = { ...EXPECTED_FIXTURE_SHIFT };

  if (!shifts.length) {
    return {
      status: "NOT_FOUND",
      reason: "FIXTURE_MISSING",
      targetDate,
      expected,
      message: `No shifts found in history response for date ${targetDate}.`,
    };
  }

  // Filter shifts specifically belonging to the target business date in Asia/Riyadh (+03:00)
  const candidateShifts = shifts.filter((s: any) => {
    return (
      isRiyadhDate(s?.startedAt, targetDate) ||
      isRiyadhDate(s?.endedAt, targetDate) ||
      isRiyadhDate(s?.businessDate, targetDate) ||
      isRiyadhDate(s?.date, targetDate)
    );
  });

  if (candidateShifts.length === 0) {
    return {
      status: "NOT_FOUND",
      reason: "FIXTURE_MISSING",
      targetDate,
      expected,
      message: `No shift matching target date ${targetDate} was found among ${shifts.length} history records.`,
    };
  }

  let targetShift: any = null;

  // 1. Unique identifier lookup if provided
  if (fixtureId) {
    targetShift = candidateShifts.find(
      (s: any) => s?.id === fixtureId || s?.publicId === fixtureId || s?.shiftNo === fixtureId
    );
    if (!targetShift) {
      return {
        status: "NOT_FOUND",
        reason: "FIXTURE_MISSING",
        targetDate,
        expected,
        message: `Fixture shift '${fixtureId}' not found among ${candidateShifts.length} candidate shifts on ${targetDate}.`,
      };
    }
  } else {
    // 2. Ambiguity resolution when no unique identifier is provided
    if (candidateShifts.length === 1) {
      targetShift = candidateShifts[0];
    } else {
      // Multiple candidates without documented unique identifier => AMBIGUOUS_FIXTURE
      // Never select an unrelated shift merely because it has the same sales amount!
      return {
        status: "BLOCKED",
        reason: "AMBIGUOUS_FIXTURE",
        targetDate,
        expected,
        message: `Ambiguous fixture identification: found ${candidateShifts.length} candidate shifts on ${targetDate} without a documented unique identifier. Ambiguous fixture cannot produce PASS.`,
      };
    }
  }

  const actual = {
    salesHalalas: targetShift.salesHalalas,
    cashExpectedHalalas: targetShift.cashExpectedHalalas,
    cashActualHalalas: targetShift.cashActualHalalas,
    varianceHalalas: targetShift.varianceHalalas,
    cashCountState: targetShift.cashCountState,
  };

  const mismatches: Array<{ field: string; expected: any; actual: any }> = [];

  if (actual.salesHalalas !== expected.salesHalalas) {
    mismatches.push({ field: "salesHalalas", expected: expected.salesHalalas, actual: actual.salesHalalas });
  }
  if (actual.cashExpectedHalalas !== expected.cashExpectedHalalas) {
    mismatches.push({ field: "cashExpectedHalalas", expected: expected.cashExpectedHalalas, actual: actual.cashExpectedHalalas });
  }
  if (actual.cashActualHalalas !== expected.cashActualHalalas) {
    mismatches.push({ field: "cashActualHalalas", expected: expected.cashActualHalalas, actual: actual.cashActualHalalas });
  }
  if (actual.varianceHalalas !== expected.varianceHalalas) {
    mismatches.push({ field: "varianceHalalas", expected: expected.varianceHalalas, actual: actual.varianceHalalas });
  }
  if (actual.cashCountState !== expected.cashCountState) {
    mismatches.push({ field: "cashCountState", expected: expected.cashCountState, actual: actual.cashCountState });
  }

  const resolvedId = targetShift.id || targetShift.publicId || targetShift.shiftNo || "unknown";

  if (mismatches.length > 0) {
    return {
      status: "MISMATCH",
      reason: "DATA_MISMATCH",
      shiftId: resolvedId,
      targetDate,
      expected,
      actual,
      mismatches,
      message: `Shift ${resolvedId} on ${targetDate} failed balanced shift verification: ${mismatches.map(m => `${m.field} expected ${m.expected} but got ${m.actual}`).join(", ")}`,
    };
  }

  return {
    status: "MATCH",
    shiftId: resolvedId,
    targetDate,
    expected,
    actual,
    message: `Balanced shift verified successfully on ${targetDate}: salesHalalas=11500, cashExpectedHalalas=4000, cashActualHalalas=4000, varianceHalalas=0, cashCountState='counted'.`,
  };
}

interface EndpointCheck {
  endpoint: string;
  method: string;
  description: string;
  hookReference: string;
  halalaField?: string;
}

export interface EndpointResult {
  endpoint: string;
  method: string;
  description: string;
  hookReference: string;
  status: number;
  statusText: string;
  durationMs: number;
  rootCauseClassification?: "OK" | "NOT_FOUND" | "URL_NOT_FOUND" | "CONTRACT_MISSING" | "INSUFFICIENT_PERMISSION" | "ROLE_MISMATCH" | "SERVER_ERROR" | "BLOCKED" | "FAIL";
  currencyVerification?: {
    rawHalalas: number | null;
    expectedSar: string;
    uiBrowserVerification: string;
    fieldValidated: boolean;
  };
  shiftVerification?: ShiftVerificationResult;
  error?: string;
}

export interface RoleSmokeResult {
  role: string;
  testId?: string;
  loginStatus: "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN";
  logoutStatus?: "SUCCESS" | "FAILED" | "NOT_RUN";
  authMeRolesSanitized?: any[];
  endpoints: EndpointResult[];
}

export interface SmokeSummary {
  totalEndpoints: number;
  passCount: number;
  failCount: number;
  notFoundCount: number;
  blockedCount: number;
  notRunCount: number;
  executedChecksStatus: "ALL_PASSED" | "HAS_FAILURES" | "NONE_RUN";
  overallStatus: "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN";
}

export async function request(url: string, options: RequestInit = {}): Promise<{ status: number; statusText: string; data: any; durationMs: number }> {
  const start = Date.now();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/json",
      "Accept-Language": "ar",
      ...(options.headers || {}),
    },
  });
  const durationMs = Date.now() - start;
  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, statusText: res.statusText, data, durationMs };
}

export async function logout(token: string): Promise<{ status: number; success: boolean; durationMs: number; error?: string }> {
  if (!token) {
    return { status: 0, success: false, durationMs: 0, error: "TOKEN_MISSING" };
  }
  const logoutUrl = `${API_ORIGIN.replace(/\/$/, "")}/api/v1/auth/logout`;
  try {
    const res = await request(logoutUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const success = res.status === 200 || res.status === 204;
    return { status: res.status, success, durationMs: res.durationMs };
  } catch (err: any) {
    return { status: 0, success: false, durationMs: 0, error: sanitizeError(err) };
  }
}

export async function login(email: string): Promise<{ token: string | null; sanitizedUser: any | null; status: number; error?: string }> {
  if (!API_ORIGIN || !STAGING_PASSWORD) {
    return { token: null, sanitizedUser: null, status: 0, error: "CREDENTIALS_MISSING" };
  }

  const loginUrl = `${API_ORIGIN.replace(/\/$/, "")}/api/v1/auth/login`;
  try {
    const res = await request(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: STAGING_PASSWORD }),
    });

    if (res.status === 200 && res.data?.accessToken) {
      const loginData = res.data as LoginResponse;
      const sanitizedUser = {
        id: loginData.user?.id,
        roles: loginData.user?.roles?.map(r => ({
          key: r.key,
          scope: r.scope,
          brandIdsCount: r.brandIds?.length ?? 0,
          branchIdsCount: r.branchIds?.length ?? 0,
          restaurantIdsCount: r.restaurantIds?.length ?? 0,
          branchIds: r.branchIds,
        })),
      };
      return { token: loginData.accessToken, sanitizedUser, status: 200 };
    }

    return { token: null, sanitizedUser: null, status: res.status, error: typeof res.data === "string" ? res.data : JSON.stringify(res.data) };
  } catch (err: any) {
    return { token: null, sanitizedUser: null, status: 0, error: sanitizeError(err) };
  }
}

export function computeSmokeSummary(
  results: RoleSmokeResult[],
  environmentState: string,
  branchScopeEvaluation?: { guardPassed?: boolean; verdict?: string } | null
): SmokeSummary {
  let passCount = 0;
  let failCount = 0;
  let notFoundCount = 0;
  let blockedCount = 0;
  let notRunCount = 0;
  let totalEndpoints = 0;

  if (environmentState.startsWith("BLOCKED")) {
    for (const _ of results) {
      blockedCount++;
    }
    return {
      totalEndpoints: 0,
      passCount: 0,
      failCount: 0,
      notFoundCount: 0,
      blockedCount,
      notRunCount: 0,
      executedChecksStatus: "NONE_RUN",
      overallStatus: "BLOCKED",
    };
  }

  for (const r of results) {
    if (r.loginStatus === "FAIL") {
      failCount++;
    } else if (r.loginStatus === "BLOCKED") {
      blockedCount++;
    } else if (r.loginStatus === "NOT_RUN") {
      notRunCount++;
    }

    // Do not ignore failed session termination (logout failure is an endpoint failure)
    if (r.logoutStatus === "FAILED") {
      failCount++;
    }

    for (const ep of r.endpoints) {
      totalEndpoints++;
      const cls = ep.rootCauseClassification;

      let epFailed = false;
      let epBlocked = false;
      let epNotFound = false;

      if (ep.shiftVerification) {
        if (ep.shiftVerification.status === "MISMATCH") epFailed = true;
        else if (ep.shiftVerification.status === "NOT_FOUND") epNotFound = true;
        else if (ep.shiftVerification.status === "BLOCKED") epBlocked = true;
      }

      if (
        cls === "FAIL" ||
        cls === "SERVER_ERROR" ||
        cls === "CONTRACT_MISSING" ||
        cls === "URL_NOT_FOUND" ||
        cls === "ROLE_MISMATCH" ||
        cls === "INSUFFICIENT_PERMISSION"
      ) {
        epFailed = true;
      } else if (cls === "NOT_FOUND") {
        epNotFound = true;
      } else if (cls === "BLOCKED") {
        epBlocked = true;
      }

      if (epFailed) {
        failCount++;
      } else if (epNotFound) {
        notFoundCount++;
      } else if (epBlocked) {
        blockedCount++;
      } else if (cls === "OK") {
        passCount++;
      } else if (cls === "NOT_RUN") {
        notRunCount++;
      }
    }
  }

  // Branch Scope evaluation: if branch role access guard failed or could not be evaluated,
  // classify as Backend E2/E3 blocker (do not ignore guardPassed result)
  if (branchScopeEvaluation && branchScopeEvaluation.guardPassed === false) {
    blockedCount++;
  }

  const hasFailures = failCount > 0 || notFoundCount > 0;
  const executedChecksStatus = hasFailures
    ? "HAS_FAILURES"
    : passCount > 0
      ? "ALL_PASSED"
      : "NONE_RUN";

  // Operational Acceptance Status:
  // - If any check failed -> FAIL
  // - If any mandatory check is blocked (e.g. Backend E1/E2/E3 dependency) -> BLOCKED (never PASS)
  // - If any mandatory check was not run, or no checks passed -> NOT_RUN (no complete acceptance)
  // - Only if ALL mandatory checks pass and zero are blocked/failed/unexecuted -> PASS
  let overallStatus: "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN";
  if (hasFailures) {
    overallStatus = "FAIL";
  } else if (blockedCount > 0) {
    overallStatus = "BLOCKED";
  } else if (notRunCount > 0 || passCount === 0) {
    overallStatus = "NOT_RUN";
  } else {
    overallStatus = "PASS";
  }

  return {
    totalEndpoints,
    passCount,
    failCount,
    notFoundCount,
    blockedCount,
    notRunCount,
    executedChecksStatus,
    overallStatus,
  };
}

/**
 * Determines the exit code for CI / workflow gating based on environment and operational acceptance:
 * - 0: All acceptance checks PASSED (full operational acceptance)
 * - 1: Acceptance verification FAILED with errors or financial mismatches
 * - 2: Staging readiness gate BLOCKED before execution (missing prerequisites/credentials)
 * - 3: Operational acceptance gate BLOCKED or NOT_RUN (standing backend dependencies, missing required accounts, or unexecuted checks)
 * Non-zero exit code ensures CI workflow gates do not report false success.
 */
export function determineSmokeExitCode(
  environmentState: string,
  overallStatus: "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN"
): number {
  if (environmentState.startsWith("BLOCKED")) {
    return 2;
  }
  if (overallStatus === "FAIL") {
    return 1;
  }
  if (overallStatus === "BLOCKED" || overallStatus === "NOT_RUN") {
    return 3;
  }
  return 0;
}

export async function runStagingSmoke(): Promise<{
  timestamp: string;
  apiOrigin: string;
  frontendUrl: string;
  backendSha: string;
  frontendSha: string;
  environmentState: "RUNNABLE" | "BLOCKED — NO REQUESTS EXECUTED";
  results: RoleSmokeResult[];
  branchScopeEvaluation: any;
  blockers: string[];
  summary: SmokeSummary;
}> {
  const timestamp = new Date().toISOString();
  const blockers: string[] = [];

  // STAGING READINESS GATE ENFORCEMENT
  if (!STAGING_PASSWORD || STAGING_PASSWORD.trim().length === 0) {
    blockers.push("ASSAB_STAGING_PASSWORD is not set. Fixture password must be provided via environment variable (never stored in Git).");
  }
  if (!FRONTEND_URL || FRONTEND_URL.trim().length === 0 || FRONTEND_URL === "NOT_CONFIGURED") {
    blockers.push("ASSAB_VERCEL_FRONTEND_URL is not set. Vercel Staging deployment URL must be provided by Mahmoud for Browser QA.");
  }
  if (EXPECTED_BACKEND_SHA === "PENDING_OPERATOR_ATTESTATION" || !IS_DEPLOYMENT_ATTESTED) {
    blockers.push("Coolify Backend deployment SHA is not yet attested by Mahmoud. Environment variable existence alone does not constitute deployment proof.");
  }

  console.log(`[smoke-test] Execution started at ${timestamp}`);
  console.log(`[smoke-test] Target API Origin: ${API_ORIGIN}`);

  // FAIL-CLOSED: If ANY readiness prerequisite is missing, execute ZERO requests!
  if (blockers.length > 0) {
    console.warn("[smoke-test] STAGING READINESS GATE: BLOCKED — NO REQUESTS EXECUTED");
    blockers.forEach(b => console.warn(` - ${b}`));

    const blockedResults: RoleSmokeResult[] = [
      { role: "accountant", testId: "SMOKE_ACC_01", loginStatus: "BLOCKED", logoutStatus: "NOT_RUN", endpoints: [] },
      { role: "head", testId: "SMOKE_HEAD_01", loginStatus: "BLOCKED", logoutStatus: "NOT_RUN", endpoints: [] },
      { role: "company-admin", testId: "SMOKE_ADMIN_01", loginStatus: "BLOCKED", logoutStatus: "NOT_RUN", endpoints: [] },
      { role: "branch", testId: "SMOKE_BRANCH_01", loginStatus: "BLOCKED", logoutStatus: "NOT_RUN", endpoints: [] },
    ];

    const summary = computeSmokeSummary(blockedResults, "BLOCKED — NO REQUESTS EXECUTED");

    return {
      timestamp,
      apiOrigin: API_ORIGIN,
      frontendUrl: FRONTEND_URL || "NOT_CONFIGURED",
      backendSha: EXPECTED_BACKEND_SHA,
      frontendSha: EXPECTED_FRONTEND_SHA,
      environmentState: "BLOCKED — NO REQUESTS EXECUTED",
      results: blockedResults,
      branchScopeEvaluation: null,
      blockers,
      summary,
    };
  }

  const apiUrl = `${API_ORIGIN.replace(/\/$/, "")}/api/v1`;
  const results: RoleSmokeResult[] = [];
  let branchScopeEvaluation: any = null;

  // 1. ACCOUNTANT ROLE SMOKE
  const accResult: RoleSmokeResult = {
    role: "accountant",
    testId: "SMOKE_ACC_01",
    loginStatus: "NOT_RUN",
    logoutStatus: "NOT_RUN",
    endpoints: [],
  };
  let accToken: string | null = null;
  try {
    const accLogin = await login("accountant.burger@nakhat.sa");
    accToken = accLogin.token;
    accResult.loginStatus = accLogin.status === 200 ? "PASS" : "FAIL";
    accResult.authMeRolesSanitized = accLogin.sanitizedUser?.roles;

    if (accLogin.token) {
      const headers = { "Authorization": `Bearer ${accLogin.token}` };
      const checks: EndpointCheck[] = [
        { endpoint: "/accountant/shifts/live", method: "GET", description: "Live Shifts Queue", hookReference: "usePlatformLiveShifts" },
        { endpoint: "/accountant/shifts/history?dateFrom=2026-10-24&dateTo=2026-10-24", method: "GET", description: "Balanced Shift History Verification (2026-10-24)", hookReference: "usePlatformHistoryShifts" },
        { endpoint: "/accountant/shifts/history", method: "GET", description: "Shift History", hookReference: "usePlatformHistoryShifts" },
        { endpoint: "/accountant/operations", method: "GET", description: "Daily Operations List", hookReference: "useAccountantOperationsPlatform", halalaField: "amountHalalas" },
        { endpoint: "/accountant/employees", method: "GET", description: "Employee Statement Roster", hookReference: "usePlatformEmployees" },
        { endpoint: "/company/me/cash-custody", method: "GET", description: "Cash Custody", hookReference: "useCashCustody" },
        { endpoint: "/company/me/asset-drafts", method: "GET", description: "Asset Drafts (Backend E1 dependency)", hookReference: "useAssetDrafts" },
      ];

      for (const c of checks) {
        try {
          const res = await request(`${apiUrl}${c.endpoint}`, { headers });
          const epResult: EndpointResult = {
            endpoint: c.endpoint,
            method: c.method,
            description: c.description,
            hookReference: c.hookReference,
            status: res.status,
            statusText: res.statusText,
            durationMs: res.durationMs,
          };

          if (res.status === 200) {
            if (c.endpoint.includes("/accountant/shifts/history?dateFrom=2026-10-24&dateTo=2026-10-24")) {
              const shiftVerif = verifyBalancedShift(res.data, "2026-10-24");
              epResult.shiftVerification = shiftVerif;
              if (shiftVerif.status === "MATCH") {
                epResult.rootCauseClassification = "OK";
              } else if (shiftVerif.status === "NOT_FOUND") {
                epResult.rootCauseClassification = "NOT_FOUND";
                epResult.error = shiftVerif.message;
              } else if (shiftVerif.status === "BLOCKED") {
                epResult.rootCauseClassification = "BLOCKED";
                epResult.error = shiftVerif.message;
              } else {
                epResult.rootCauseClassification = "FAIL";
                epResult.error = shiftVerif.message;
              }
            } else {
              epResult.rootCauseClassification = "OK";
            }

            if (c.halalaField && Array.isArray(res.data?.data) && res.data.data.length > 0) {
              const item = res.data.data[0];
              const raw = item?.[c.halalaField];
              if (typeof raw === "number" && !isNaN(raw)) {
                const expectedSar = (raw / 100).toFixed(2);
                epResult.currencyVerification = {
                  rawHalalas: raw,
                  expectedSar: `${expectedSar} SAR`,
                  uiBrowserVerification: "NOT_RUN (Requires interactive Browser QA on deployed Vercel UI)",
                  fieldValidated: true,
                };
              } else {
                epResult.currencyVerification = {
                  rawHalalas: null,
                  expectedSar: "N/A",
                  uiBrowserVerification: "FIELD_MISSING_OR_NON_NUMERIC",
                  fieldValidated: false,
                };
              }
            }
          } else if (res.status === 404) {
            if (c.endpoint.includes("asset-drafts")) {
              // Backend E1 dependency: asset drafts endpoint not yet implemented on backend
              epResult.rootCauseClassification = "BLOCKED";
              epResult.error = "BLOCKED: Backend E1 dependency (asset-drafts endpoint pending backend implementation)";
            } else {
              epResult.rootCauseClassification = "URL_NOT_FOUND";
            }
          } else if (res.status === 403) {
            epResult.rootCauseClassification = "INSUFFICIENT_PERMISSION";
          } else {
            epResult.rootCauseClassification = "SERVER_ERROR";
          }
          accResult.endpoints.push(epResult);
        } catch (epErr: any) {
          accResult.endpoints.push({
            endpoint: c.endpoint,
            method: c.method,
            description: c.description,
            hookReference: c.hookReference,
            status: 0,
            statusText: "NETWORK_ERROR",
            durationMs: 0,
            rootCauseClassification: "FAIL",
            error: sanitizeError(epErr),
          });
        }
      }
    }
  } catch (roleErr: any) {
    accResult.loginStatus = "FAIL";
    accResult.endpoints.push({
      endpoint: "role:accountant",
      method: "N/A",
      description: "Accountant role execution exception",
      hookReference: "smokeRunner",
      status: 0,
      statusText: "EXCEPTION",
      durationMs: 0,
      rootCauseClassification: "FAIL",
      error: sanitizeError(roleErr),
    });
  } finally {
    if (accToken) {
      try {
        const logoutRes = await logout(accToken);
        accResult.logoutStatus = logoutRes.success ? "SUCCESS" : "FAILED";
      } catch {
        accResult.logoutStatus = "FAILED";
      }
    }
  }
  results.push(accResult);

  // 2. HEAD ACCOUNTANT ROLE SMOKE
  const headResult: RoleSmokeResult = {
    role: "head",
    testId: "SMOKE_HEAD_01",
    loginStatus: "NOT_RUN",
    logoutStatus: "NOT_RUN",
    endpoints: [],
  };
  let headToken: string | null = null;
  try {
    const headLogin = await login("head@nakhat.sa");
    headToken = headLogin.token;
    headResult.loginStatus = headLogin.status === 200 ? "PASS" : "FAIL";
    headResult.authMeRolesSanitized = headLogin.sanitizedUser?.roles;

    if (headLogin.token) {
      const headers = { "Authorization": `Bearer ${headLogin.token}` };
      const checks: EndpointCheck[] = [
        { endpoint: "/plans", method: "GET", description: "Subscription Plans Catalog (Task A2)", hookReference: "useCompanyPlans" },
        { endpoint: "/head/erp/batches", method: "GET", description: "ERP Batches Queue (Task D1)", hookReference: "useERPBatches" },
        { endpoint: "/head/erp/eligible-operations", method: "GET", description: "ERP Eligible Ops (Task D1)", hookReference: "useERPEligibleOperations" },
        { endpoint: "/operations?moduleKey=shifts&pageSize=100&page=1", method: "GET", description: "Head Shift Approval Queue via Operations", hookReference: "useOperations" },
      ];

      for (const c of checks) {
        try {
          const res = await request(`${apiUrl}${c.endpoint}`, { headers });
          headResult.endpoints.push({
            endpoint: c.endpoint,
            method: c.method,
            description: c.description,
            hookReference: c.hookReference,
            status: res.status,
            statusText: res.statusText,
            durationMs: res.durationMs,
            rootCauseClassification: res.status === 200 ? "OK" : res.status === 404 ? "URL_NOT_FOUND" : "INSUFFICIENT_PERMISSION",
          });
        } catch (epErr: any) {
          headResult.endpoints.push({
            endpoint: c.endpoint,
            method: c.method,
            description: c.description,
            hookReference: c.hookReference,
            status: 0,
            statusText: "NETWORK_ERROR",
            durationMs: 0,
            rootCauseClassification: "FAIL",
            error: sanitizeError(epErr),
          });
        }
      }
    }
  } catch (roleErr: any) {
    headResult.loginStatus = "FAIL";
    headResult.endpoints.push({
      endpoint: "role:head",
      method: "N/A",
      description: "Head Accountant role execution exception",
      hookReference: "smokeRunner",
      status: 0,
      statusText: "EXCEPTION",
      durationMs: 0,
      rootCauseClassification: "FAIL",
      error: sanitizeError(roleErr),
    });
  } finally {
    if (headToken) {
      try {
        const logoutRes = await logout(headToken);
        headResult.logoutStatus = logoutRes.success ? "SUCCESS" : "FAILED";
      } catch {
        headResult.logoutStatus = "FAILED";
      }
    }
  }
  results.push(headResult);

  // 3. COMPANY ADMIN ROLE SMOKE (Strictly Read-Only — NO Mutating POSTs)
  const adminResult: RoleSmokeResult = {
    role: "company-admin",
    testId: "SMOKE_ADMIN_01",
    loginStatus: "NOT_RUN",
    logoutStatus: "NOT_RUN",
    endpoints: [],
  };
  let adminToken: string | null = null;
  try {
    const adminLogin = await login("admin@nakhat.sa");
    adminToken = adminLogin.token;
    adminResult.loginStatus = adminLogin.status === 200 ? "PASS" : "FAIL";
    adminResult.authMeRolesSanitized = adminLogin.sanitizedUser?.roles;

    if (adminLogin.token) {
      const headers = { "Authorization": `Bearer ${adminLogin.token}` };
      const checks: EndpointCheck[] = [
        { endpoint: "/company/me/users", method: "GET", description: "Company Users Catalog", hookReference: "useCompanyUsers" },
        { endpoint: "/company/invitations", method: "GET", description: "Pending Invitations List (Read-Only)", hookReference: "useCompanyInvitations" },
        { endpoint: "/plans", method: "GET", description: "Subscription Plans (Task A2)", hookReference: "useCompanyPlans" },
        { endpoint: "/company/me/subscription", method: "GET", description: "Company Subscription Status", hookReference: "useCompanySubscription" },
      ];

      for (const c of checks) {
        try {
          const res = await request(`${apiUrl}${c.endpoint}`, { headers });
          adminResult.endpoints.push({
            endpoint: c.endpoint,
            method: c.method,
            description: c.description,
            hookReference: c.hookReference,
            status: res.status,
            statusText: res.statusText,
            durationMs: res.durationMs,
            rootCauseClassification: res.status === 200 ? "OK" : res.status === 404 ? "URL_NOT_FOUND" : "INSUFFICIENT_PERMISSION",
          });
        } catch (epErr: any) {
          adminResult.endpoints.push({
            endpoint: c.endpoint,
            method: c.method,
            description: c.description,
            hookReference: c.hookReference,
            status: 0,
            statusText: "NETWORK_ERROR",
            durationMs: 0,
            rootCauseClassification: "FAIL",
            error: sanitizeError(epErr),
          });
        }
      }
    }
  } catch (roleErr: any) {
    adminResult.loginStatus = "FAIL";
    adminResult.endpoints.push({
      endpoint: "role:company-admin",
      method: "N/A",
      description: "Company Admin role execution exception",
      hookReference: "smokeRunner",
      status: 0,
      statusText: "EXCEPTION",
      durationMs: 0,
      rootCauseClassification: "FAIL",
      error: sanitizeError(roleErr),
    });
  } finally {
    if (adminToken) {
      try {
        const logoutRes = await logout(adminToken);
        adminResult.logoutStatus = logoutRes.success ? "SUCCESS" : "FAILED";
      } catch {
        adminResult.logoutStatus = "FAILED";
      }
    }
  }
  results.push(adminResult);

  // 4. BRANCH MANAGER SCOPE INSPECTION & GET /auth/me (Task B2)
  const branchResult: RoleSmokeResult = {
    role: "branch",
    testId: "SMOKE_BRANCH_01",
    loginStatus: "NOT_RUN",
    logoutStatus: "NOT_RUN",
    endpoints: [],
  };
  let branchToken: string | null = null;
  try {
    const branchLogin = await login("branch@nakhat.sa");
    branchToken = branchLogin.token;
    branchResult.loginStatus = branchLogin.status === 200 ? "PASS" : "FAIL";
    branchResult.authMeRolesSanitized = branchLogin.sanitizedUser?.roles;

    if (branchLogin.token) {
      const headers = { "Authorization": `Bearer ${branchLogin.token}` };
      try {
        const authMeRes = await request(`${apiUrl}/auth/me`, { headers });
        branchResult.endpoints.push({
          endpoint: "/auth/me",
          method: "GET",
          description: "Direct GET /auth/me inspection for branch manager scope",
          hookReference: "useAuthMe",
          status: authMeRes.status,
          statusText: authMeRes.statusText,
          durationMs: authMeRes.durationMs,
          rootCauseClassification: authMeRes.status === 200 ? "OK" : "SERVER_ERROR",
        });

        if (authMeRes.status === 200 && authMeRes.data) {
          const roles = authMeRes.data.roles || authMeRes.data.user?.roles || [];
          const bRole = roles.find((r: any) => r.key === "branch" || r.role === "branch");

          const isRoleKeyBranch = bRole?.key === "branch";
          const hasBranchScope = bRole?.scope === "branch";
          const isBrandIdsValid = validStringArray(bRole?.brandIds, UUID_PATTERN);
          const hasEmptyBrands = isBrandIdsValid && bRole.brandIds.length === 0;
          const isRestaurantIdsValid = validStringArray(bRole?.restaurantIds, UUID_PATTERN);
          const hasEmptyRestaurants = isRestaurantIdsValid && bRole.restaurantIds.length === 0;
          const isBranchIdsValid = validStringArray(bRole?.branchIds, UUID_PATTERN);
          const hasExactOneBranch = isBranchIdsValid && bRole.branchIds.length === 1;
          const isModuleKeysValid = validStringArray(bRole?.moduleKeys, MODULE_KEY_PATTERN);

          const guardPassed = Boolean(
            isRoleKeyBranch &&
            hasBranchScope &&
            hasExactOneBranch &&
            hasEmptyBrands &&
            hasEmptyRestaurants &&
            isModuleKeysValid
          );

          branchScopeEvaluation = {
            roleKey: bRole?.key || bRole?.role,
            scope: bRole?.scope,
            hasBranchScope,
            isBrandIdsValid,
            isRestaurantIdsValid,
            isBranchIdsValid,
            branchCount: bRole?.branchIds?.length ?? 0,
            brandCount: bRole?.brandIds?.length ?? 0,
            restaurantCount: bRole?.restaurantIds?.length ?? 0,
            guardPassed,
            verdict: guardPassed
              ? "COMPATIBLE_WITH_ROLE_ACCESS_GUARD"
              : "COMPATIBILITY_HOLD_BACKEND_FIXTURE_POLLUTED (Backend E2/E3 dependency)",
          };
        }
      } catch (epErr: any) {
        branchResult.endpoints.push({
          endpoint: "/auth/me",
          method: "GET",
          description: "Direct GET /auth/me inspection for branch manager scope",
          hookReference: "useAuthMe",
          status: 0,
          statusText: "NETWORK_ERROR",
          durationMs: 0,
          rootCauseClassification: "FAIL",
          error: sanitizeError(epErr),
        });
      }

      // Branch Overview View
      try {
        const boRes = await request(`${apiUrl}/company/me/branch/overview`, { headers });
        branchResult.endpoints.push({
          endpoint: "/company/me/branch/overview",
          method: "GET",
          description: "Branch Overview Dashboard",
          hookReference: "usePlatformBranchOverview",
          status: boRes.status,
          statusText: boRes.statusText,
          durationMs: boRes.durationMs,
          rootCauseClassification: boRes.status === 200 ? "OK" : "INSUFFICIENT_PERMISSION",
        });
      } catch (epErr: any) {
        branchResult.endpoints.push({
          endpoint: "/company/me/branch/overview",
          method: "GET",
          description: "Branch Overview Dashboard",
          hookReference: "usePlatformBranchOverview",
          status: 0,
          statusText: "NETWORK_ERROR",
          durationMs: 0,
          rootCauseClassification: "FAIL",
          error: sanitizeError(epErr),
        });
      }
    }
  } catch (roleErr: any) {
    branchResult.loginStatus = "FAIL";
    branchResult.endpoints.push({
      endpoint: "role:branch",
      method: "N/A",
      description: "Branch Manager role execution exception",
      hookReference: "smokeRunner",
      status: 0,
      statusText: "EXCEPTION",
      durationMs: 0,
      rootCauseClassification: "FAIL",
      error: sanitizeError(roleErr),
    });
  } finally {
    if (branchToken) {
      try {
        const logoutRes = await logout(branchToken);
        branchResult.logoutStatus = logoutRes.success ? "SUCCESS" : "FAILED";
      } catch {
        branchResult.logoutStatus = "FAILED";
      }
    }
  }
  results.push(branchResult);

  // If Branch Scope could not be inspected from /auth/me (e.g. login failed, 403/500, or empty roles),
  // record as NOT_EVALUATED / BLOCKED rather than skipping it.
  if (!branchScopeEvaluation) {
    branchScopeEvaluation = {
      roleKey: undefined,
      scope: undefined,
      guardPassed: false,
      verdict: "NOT_EVALUATED / BLOCKED: Failed to inspect branch manager scope from /auth/me",
    };
    blockers.push("Branch Scope evaluation from /auth/me could not be completed.");
  }

  // 5. AUTHENTICATED ROLE-LESS USER (403 WRONG_ROLE check with error envelope inspection)
  if (ROLELESS_EMAIL) {
    const rolelessResult: RoleSmokeResult = {
      role: "roleless_authenticated",
      testId: "SMOKE_ROLELESS_01",
      loginStatus: "NOT_RUN",
      logoutStatus: "NOT_RUN",
      endpoints: [],
    };
    let rolelessToken: string | null = null;
    try {
      const rolelessLogin = await login(ROLELESS_EMAIL);
      rolelessToken = rolelessLogin.token;
      rolelessResult.loginStatus = rolelessLogin.status === 200 ? "PASS" : "FAIL";
      rolelessResult.authMeRolesSanitized = rolelessLogin.sanitizedUser?.roles;

      if (rolelessLogin.token) {
        try {
          const res = await request(`${apiUrl}/company/me/shifts`, {
            headers: { "Authorization": `Bearer ${rolelessLogin.token}` },
          });

          const errEnvelope = res.data?.error;
          const isHttp403 = res.status === 403;
          const hasWrongRoleCode = errEnvelope?.code === "WRONG_ROLE";
          const hasNonEmptyMessageAr = typeof errEnvelope?.messageAr === "string" && errEnvelope.messageAr.trim().length > 0;
          const isWrongRoleEnvelopeValid = Boolean(isHttp403 && hasWrongRoleCode && hasNonEmptyMessageAr);

          rolelessResult.endpoints.push({
            endpoint: "/company/me/shifts",
            method: "GET",
            description: "Verify authenticated roleless user receives 403 with error.code WRONG_ROLE and error.messageAr",
            hookReference: "useRoleGuard",
            status: res.status,
            statusText: res.statusText,
            durationMs: res.durationMs,
            rootCauseClassification: isWrongRoleEnvelopeValid ? "OK" : "ROLE_MISMATCH",
          });
        } catch (epErr: any) {
          rolelessResult.endpoints.push({
            endpoint: "/company/me/shifts",
            method: "GET",
            description: "Verify authenticated roleless user receives 403 with error.code WRONG_ROLE and error.messageAr",
            hookReference: "useRoleGuard",
            status: 0,
            statusText: "NETWORK_ERROR",
            durationMs: 0,
            rootCauseClassification: "FAIL",
            error: sanitizeError(epErr),
          });
        }
      }
    } catch (roleErr: any) {
      rolelessResult.loginStatus = "FAIL";
      rolelessResult.endpoints.push({
        endpoint: "role:roleless_authenticated",
        method: "N/A",
        description: "Roleless user execution exception",
        hookReference: "smokeRunner",
        status: 0,
        statusText: "EXCEPTION",
        durationMs: 0,
        rootCauseClassification: "FAIL",
        error: sanitizeError(roleErr),
      });
    } finally {
      if (rolelessToken) {
        try {
          const logoutRes = await logout(rolelessToken);
          rolelessResult.logoutStatus = logoutRes.success ? "SUCCESS" : "FAILED";
        } catch {
          rolelessResult.logoutStatus = "FAILED";
        }
      }
    }
    results.push(rolelessResult);
  } else {
    // Missing required role-less account: do NOT skip! Register BLOCKED / NOT_RUN
    blockers.push("ASSAB_ROLELESS_EMAIL environment variable is not configured. Required role-less user WRONG_ROLE 403 inspection cannot execute.");
    const rolelessResult: RoleSmokeResult = {
      role: "roleless_authenticated",
      testId: "SMOKE_ROLELESS_01",
      loginStatus: "BLOCKED",
      logoutStatus: "NOT_RUN",
      endpoints: [
        {
          endpoint: "/company/me/shifts",
          method: "GET",
          description: "Verify authenticated roleless user receives 403 with error.code WRONG_ROLE and error.messageAr",
          hookReference: "useRoleGuard",
          status: 0,
          statusText: "NOT_CONFIGURED",
          durationMs: 0,
          rootCauseClassification: "BLOCKED",
          error: "BLOCKED: ASSAB_ROLELESS_EMAIL environment variable is not configured. Required role-less test account is missing.",
        },
      ],
    };
    results.push(rolelessResult);
  }

  const summary = computeSmokeSummary(results, "RUNNABLE", branchScopeEvaluation);

  return {
    timestamp,
    apiOrigin: API_ORIGIN,
    frontendUrl: FRONTEND_URL,
    backendSha: EXPECTED_BACKEND_SHA,
    frontendSha: EXPECTED_FRONTEND_SHA,
    environmentState: "RUNNABLE",
    results,
    branchScopeEvaluation,
    blockers,
    summary,
  };
}

if (process.argv[1] && (process.argv[1].endsWith("smoke-test-staging.ts") || process.argv[1].endsWith("smoke-test-staging.js"))) {
  runStagingSmoke()
    .then(report => {
      console.log(`[smoke-test] Completed with environment status: ${report.environmentState}`);
      console.log("==================================================");
      console.log("ASSAB ERP — Staging Smoke Runner Summary");
      console.log("==================================================");
      console.log(`Overall Acceptance Status: ${report.summary.overallStatus}`);
      console.log(`Executed Checks Status: ${report.summary.executedChecksStatus}`);
      console.log(`Result Categories Breakdown:`);
      console.log(`  - PASS:     ${report.summary.passCount}`);
      console.log(`  - FAIL:     ${report.summary.failCount}`);
      console.log(`  - NOT_FOUND: ${report.summary.notFoundCount}`);
      console.log(`  - BLOCKED:  ${report.summary.blockedCount}`);
      console.log(`  - NOT_RUN:  ${report.summary.notRunCount}`);
      console.log("--------------------------------------------------");
      console.log("ASSAB ERP — Sanitized Role Smoke Ledger:");
      console.log("--------------------------------------------------");
      report.results.forEach(r => {
        console.log(`Role: [${r.role.padEnd(20)}] ID: [${(r.testId || r.role).padEnd(16)}] Login: ${r.loginStatus.padEnd(7)} Logout: ${(r.logoutStatus ?? "N/A").padEnd(8)}`);
        r.endpoints.forEach(ep => {
          console.log(`   -> [HTTP ${ep.status}] ${ep.method} ${ep.endpoint} (${ep.rootCauseClassification ?? "N/A"}) - ${ep.description}`);
          if (ep.currencyVerification) {
            console.log(`      * Currency Check: ${ep.currencyVerification.rawHalalas ?? "N/A"} halalas => ${ep.currencyVerification.expectedSar} | UI Browser QA: ${ep.currencyVerification.uiBrowserVerification}`);
          }
          if (ep.shiftVerification) {
            console.log(`      * Shift Verification (${ep.shiftVerification.targetDate}): [${ep.shiftVerification.status}] ${ep.shiftVerification.message}`);
          }
        });
      });
      console.log("--------------------------------------------------");
      if (report.branchScopeEvaluation) {
        console.log(`Branch Guard Evaluation: ${report.branchScopeEvaluation.verdict} (Guard Passed: ${report.branchScopeEvaluation.guardPassed})`);
      }
      if (report.blockers.length > 0) {
        console.log("[smoke-test] Standing Environment Blockers:");
        report.blockers.forEach(b => console.log(` * ${b}`));
      }
      console.log("Browser QA Status: NOT_RUN (Requires interactive browser session on deployed Vercel UI)");
      console.log("==================================================");

      // Write GitHub Actions Step Summary if running in GitHub Actions
      if (process.env.GITHUB_STEP_SUMMARY) {
        try {
          const summaryMarkdown = `
### ASSAB ERP — Staging Smoke Verification Summary
| Category | Count / Status |
| :--- | :--- |
| **Overall Acceptance Status** | **${report.summary.overallStatus}** |
| **Executed Checks Status** | **${report.summary.executedChecksStatus}** |
| **PASS** | ${report.summary.passCount} |
| **FAIL** | ${report.summary.failCount} |
| **NOT_FOUND** | ${report.summary.notFoundCount} |
| **BLOCKED** | ${report.summary.blockedCount} |
| **NOT_RUN** | ${report.summary.notRunCount} |

**Environment State:** \`${report.environmentState}\`<br/>
**Backend Deployment SHA:** \`${report.backendSha}\`<br/>
**Browser QA:** \`NOT_RUN\` (Requires interactive Vercel session)
`;
          fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown);
        } catch {
          // ignore summary writing errors
        }
      }

      // Exit code propagation
      const exitCode = determineSmokeExitCode(report.environmentState, report.summary.overallStatus);
      if (exitCode !== 0) {
        if (exitCode === 2) {
          console.error("[smoke-test] Readiness gate blocked before execution.");
        } else if (exitCode === 1) {
          console.error("[smoke-test] Acceptance verification failed with errors or mismatches.");
        } else {
          console.warn(`[smoke-test] Operational acceptance gate BLOCKED / NOT_RUN (Exit code ${exitCode}). Executed checks: ${report.summary.executedChecksStatus}. Overall status: ${report.summary.overallStatus}.`);
        }
        process.exit(exitCode);
      } else {
        console.log("[smoke-test] All acceptance checks PASSED.");
        process.exit(0);
      }
    })
    .catch(err => {
      console.error("[smoke-test] Unhandled execution error:", sanitizeError(err));
      process.exit(1);
    });
}
