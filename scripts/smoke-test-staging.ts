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
 * - Zero logging of access tokens, refresh tokens, auth cookies, or personal identifiers.
 */

import * as fs from "fs";
import * as path from "path";

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

interface LoginResponse {
  accessToken?: string;
  user?: {
    id: string;
    email: string;
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

interface EndpointCheck {
  endpoint: string;
  method: string;
  description: string;
  hookReference: string;
  halalaField?: string;
}

interface EndpointResult {
  endpoint: string;
  method: string;
  description: string;
  hookReference: string;
  status: number;
  statusText: string;
  durationMs: number;
  rootCauseClassification?: "OK" | "URL_NOT_FOUND" | "CONTRACT_MISSING" | "INSUFFICIENT_PERMISSION" | "ROLE_MISMATCH" | "SERVER_ERROR" | "NOT_FOUND" | "CONTRACT_MISMATCH";
  currencyVerification?: {
    rawHalalas: number | null;
    expectedSar: string;
    uiBrowserVerification: string;
    fieldValidated: boolean;
  };
  error?: string;
}

interface RoleSmokeResult {
  role: string;
  accountEmail: string;
  loginStatus: "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN";
  authMeRolesSanitized?: any[];
  endpoints: EndpointResult[];
}

/**
 * S-1 (GO-17 review): explicit money check for the balanced Mode C fixture shift.
 * Fields are the real ShiftPresenter keys (halalas). The approved case is
 * gross 115 SAR, cards 50, apps 25, opening 0, counted cash 40 => expected 40, variance 0.
 * A fixture shift that is not returned is NOT_FOUND, never a silent pass.
 */
export const EXPECTED_FIXTURE_SHIFT = {
  salesHalalas: 11500,
  cashExpectedHalalas: 4000,
  cashActualHalalas: 4000,
  varianceHalalas: 0,
  cashCountState: "counted",
} as const;

export function evaluateFixtureShift(items: unknown): { found: boolean; matches: boolean; mismatches: string[]; rawSalesHalalas: number | null } {
  if (!Array.isArray(items)) return { found: false, matches: false, mismatches: ["response data is not an array"], rawSalesHalalas: null };
  const candidate = items.find((i: any) => i && i.salesHalalas === EXPECTED_FIXTURE_SHIFT.salesHalalas);
  if (!candidate) return { found: false, matches: false, mismatches: ["no shift with salesHalalas=11500 in the fixture date window"], rawSalesHalalas: null };
  const mismatches: string[] = [];
  for (const [key, expected] of Object.entries(EXPECTED_FIXTURE_SHIFT)) {
    if ((candidate as any)[key] !== expected) mismatches.push(`${key}: expected ${String(expected)}, got ${String((candidate as any)[key])}`);
  }
  return { found: true, matches: mismatches.length === 0, mismatches, rawSalesHalalas: candidate.salesHalalas };
}

/** S-4 (GO-17 review): end the smoke session so no staging token stays valid. Best effort, never logs the token. */
async function logout(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await request(`${API_ORIGIN.replace(/\/$/, "")}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
    });
  } catch {
    // best effort
  }
}

async function request(url: string, options: RequestInit = {}): Promise<{ status: number; statusText: string; data: any; durationMs: number }> {
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

async function login(email: string): Promise<{ token: string | null; sanitizedUser: any | null; status: number; error?: string }> {
  if (!API_ORIGIN || !STAGING_PASSWORD) {
    return { token: null, sanitizedUser: null, status: 0, error: "CREDENTIALS_MISSING" };
  }

  const loginUrl = `${API_ORIGIN.replace(/\/$/, "")}/api/v1/auth/login`;
  const res = await request(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: STAGING_PASSWORD }),
  });

  if (res.status === 200 && res.data?.accessToken) {
    const loginData = res.data as LoginResponse;
    const sanitizedUser = {
      id: loginData.user?.id,
      email: loginData.user?.email,
      roles: loginData.user?.roles?.map(r => ({
        key: r.key,
        scope: r.scope,
        brandIdsCount: r.brandIds?.length ?? 0,
        branchIdsCount: r.branchIds?.length ?? 0,
        restaurantIdsCount: r.restaurantIds?.length ?? 0,
        branchIds: r.branchIds,
      })),
    };
    return { token: loginData.accessToken ?? null, sanitizedUser, status: 200 };
  }

  return { token: null, sanitizedUser: null, status: res.status, error: typeof res.data === "string" ? res.data : JSON.stringify(res.data) };
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

    return {
      timestamp,
      apiOrigin: API_ORIGIN,
      frontendUrl: FRONTEND_URL || "NOT_CONFIGURED",
      backendSha: EXPECTED_BACKEND_SHA,
      frontendSha: EXPECTED_FRONTEND_SHA,
      environmentState: "BLOCKED — NO REQUESTS EXECUTED",
      results: [
        { role: "accountant", accountEmail: "accountant.burger@nakhat.sa", loginStatus: "BLOCKED", endpoints: [] },
        { role: "head", accountEmail: "head@nakhat.sa", loginStatus: "BLOCKED", endpoints: [] },
        { role: "company-admin", accountEmail: "admin@nakhat.sa", loginStatus: "BLOCKED", endpoints: [] },
        { role: "branch", accountEmail: "branch@nakhat.sa", loginStatus: "BLOCKED", endpoints: [] },
      ],
      branchScopeEvaluation: null,
      blockers,
    };
  }

  const apiUrl = `${API_ORIGIN.replace(/\/$/, "")}/api/v1`;
  const results: RoleSmokeResult[] = [];
  let branchScopeEvaluation: any = null;

  // 1. ACCOUNTANT ROLE SMOKE
  const accLogin = await login("accountant.burger@nakhat.sa");
  const accResult: RoleSmokeResult = {
    role: "accountant",
    accountEmail: "accountant.burger@nakhat.sa",
    loginStatus: accLogin.status === 200 ? "PASS" : "FAIL",
    authMeRolesSanitized: accLogin.sanitizedUser?.roles,
    endpoints: [],
  };

  if (accLogin.token) {
    const headers = { "Authorization": `Bearer ${accLogin.token}` };
    const checks: EndpointCheck[] = [
      { endpoint: "/accountant/shifts/live", method: "GET", description: "Live Shifts Queue", hookReference: "usePlatformLiveShifts" },
      { endpoint: "/accountant/shifts/history", method: "GET", description: "Shift History", hookReference: "usePlatformHistoryShifts" },
      { endpoint: "/accountant/operations", method: "GET", description: "Daily Operations List", hookReference: "useAccountantOperationsPlatform", halalaField: "amountHalalas" },
      { endpoint: "/accountant/employees", method: "GET", description: "Employee Statement Roster", hookReference: "usePlatformEmployees" },
      { endpoint: "/company/me/cash-custody", method: "GET", description: "Cash Custody", hookReference: "useCashCustody" },
      { endpoint: "/company/me/asset-drafts", method: "GET", description: "Asset Drafts (Backend E1 dependency)", hookReference: "useAssetDrafts" },
    ];

    for (const c of checks) {
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
        epResult.rootCauseClassification = "OK";
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
        epResult.rootCauseClassification = c.endpoint.includes("asset-drafts") ? "CONTRACT_MISSING" : "URL_NOT_FOUND";
      } else if (res.status === 403) {
        epResult.rootCauseClassification = "INSUFFICIENT_PERMISSION";
      } else {
        epResult.rootCauseClassification = "SERVER_ERROR";
      }
      accResult.endpoints.push(epResult);
    }

    // S-1: explicit fixture-shift money check (history window = fixture business date)
    const fixtureDate = process.env.ASSAB_SMOKE_FIXTURE_DATE || "2026-10-24";
    const fxPath = `/accountant/shifts/history?dateFrom=${fixtureDate}&dateTo=${fixtureDate}`;
    const fxRes = await request(`${apiUrl}${fxPath}`, { headers });
    const fx = fxRes.status === 200 ? evaluateFixtureShift(fxRes.data?.data) : null;
    accResult.endpoints.push({
      endpoint: fxPath,
      method: "GET",
      description: "Fixture shift money check (115 gross / 50 card / 25 apps / counted 40 => expected 40.00 SAR, variance 0)",
      hookReference: "usePlatformHistoryShifts",
      status: fxRes.status,
      statusText: fxRes.statusText,
      durationMs: fxRes.durationMs,
      rootCauseClassification:
        fxRes.status !== 200
          ? (fxRes.status === 404 ? "URL_NOT_FOUND" : fxRes.status === 403 ? "INSUFFICIENT_PERMISSION" : "SERVER_ERROR")
          : !fx || !fx.found
            ? "NOT_FOUND"
            : fx.matches
              ? "OK"
              : "CONTRACT_MISMATCH",
      currencyVerification: fx && fx.found
        ? {
            rawHalalas: fx.rawSalesHalalas,
            expectedSar: "115.00 SAR gross; expected cash 40.00 SAR",
            uiBrowserVerification: "NOT_RUN (Requires interactive Browser QA on deployed Vercel UI)",
            fieldValidated: fx.matches,
          }
        : undefined,
      error: fx && fx.mismatches.length > 0 ? fx.mismatches.join("; ") : undefined,
    });
  }
  await logout(accLogin.token);
  results.push(accResult);

  // 2. HEAD ACCOUNTANT ROLE SMOKE
  const headLogin = await login("head@nakhat.sa");
  const headResult: RoleSmokeResult = {
    role: "head",
    accountEmail: "head@nakhat.sa",
    loginStatus: headLogin.status === 200 ? "PASS" : "FAIL",
    authMeRolesSanitized: headLogin.sanitizedUser?.roles,
    endpoints: [],
  };

  if (headLogin.token) {
    const headers = { "Authorization": `Bearer ${headLogin.token}` };
    const checks: EndpointCheck[] = [
      { endpoint: "/plans", method: "GET", description: "Subscription Plans Catalog (Task A2)", hookReference: "useCompanyPlans" },
      { endpoint: "/head/erp/batches", method: "GET", description: "ERP Batches Queue (Task D1)", hookReference: "useERPBatches" },
      { endpoint: "/head/erp/eligible-operations", method: "GET", description: "ERP Eligible Ops (Task D1)", hookReference: "useERPEligibleOperations" },
      { endpoint: "/operations?moduleKey=shifts&pageSize=100&page=1", method: "GET", description: "Head Shift Approval Queue (same source as CompanyDashboard useOperations)", hookReference: "useOperations" },
    ];

    for (const c of checks) {
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
    }
  }
  await logout(headLogin.token);
  results.push(headResult);

  // 3. COMPANY ADMIN ROLE SMOKE (Strictly Read-Only — NO Mutating POSTs)
  const adminLogin = await login("admin@nakhat.sa");
  const adminResult: RoleSmokeResult = {
    role: "company-admin",
    accountEmail: "admin@nakhat.sa",
    loginStatus: adminLogin.status === 200 ? "PASS" : "FAIL",
    authMeRolesSanitized: adminLogin.sanitizedUser?.roles,
    endpoints: [],
  };

  if (adminLogin.token) {
    const headers = { "Authorization": `Bearer ${adminLogin.token}` };
    const checks: EndpointCheck[] = [
      { endpoint: "/company/me/users", method: "GET", description: "Company Users Catalog", hookReference: "useCompanyUsers" },
      { endpoint: "/company/invitations", method: "GET", description: "Pending Invitations List (Read-Only)", hookReference: "useCompanyInvitations" },
      { endpoint: "/plans", method: "GET", description: "Subscription Plans (Task A2)", hookReference: "useCompanyPlans" },
      { endpoint: "/company/me/subscription", method: "GET", description: "Company Subscription Status", hookReference: "useCompanySubscription" },
    ];

    for (const c of checks) {
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
    }
  }
  await logout(adminLogin.token);
  results.push(adminResult);

  // 4. BRANCH MANAGER SCOPE INSPECTION & GET /auth/me (Task B2)
  const branchLogin = await login("branch@nakhat.sa");
  const branchResult: RoleSmokeResult = {
    role: "branch",
    accountEmail: "branch@nakhat.sa",
    loginStatus: branchLogin.status === 200 ? "PASS" : "FAIL",
    authMeRolesSanitized: branchLogin.sanitizedUser?.roles,
    endpoints: [],
  };

  if (branchLogin.token) {
    const headers = { "Authorization": `Bearer ${branchLogin.token}` };
    // B2 Requirement: Execute explicit GET /auth/me call
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

      // Strict validation conforming to roleAccess.ts:25-39:
      // Missing fields are NOT treated as empty arrays automatically!
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
          : "COMPATIBILITY_HOLD_BACKEND_FIXTURE_POLLUTED",
      };
    }

    // Branch Overview View
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
  }
  await logout(branchLogin.token);
  results.push(branchResult);

  // 5. AUTHENTICATED ROLE-LESS USER (403 WRONG_ROLE check with error envelope inspection)
  if (ROLELESS_EMAIL) {
    const rolelessLogin = await login(ROLELESS_EMAIL);
    const rolelessResult: RoleSmokeResult = {
      role: "roleless_authenticated",
      accountEmail: ROLELESS_EMAIL,
      loginStatus: rolelessLogin.status === 200 ? "PASS" : "FAIL",
      authMeRolesSanitized: rolelessLogin.sanitizedUser?.roles,
      endpoints: [],
    };
    if (rolelessLogin.token) {
      const res = await request(`${apiUrl}/company/me/shifts`, {
        headers: { "Authorization": `Bearer ${rolelessLogin.token}` },
      });

      // Backend envelope: { error: { code: "WRONG_ROLE", messageAr: "..." }, requestId: "..." }
      // All conditions required together (AND), not OR:
      // 1. HTTP 403
      // 2. error.code === "WRONG_ROLE"
      // 3. Non-empty Arabic message in error.messageAr
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
    }
    await logout(rolelessLogin.token);
    results.push(rolelessResult);
  }

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
  };
}

if (process.argv[1] && (process.argv[1].endsWith("smoke-test-staging.ts") || process.argv[1].endsWith("smoke-test-staging.js"))) {
  runStagingSmoke()
    .then(report => {
      console.log(`[smoke-test] Completed with environment status: ${report.environmentState}`);
      console.log("--------------------------------------------------");
      console.log("ASSAB ERP - Sanitized Role Smoke Ledger:");
      console.log("--------------------------------------------------");
      report.results.forEach(r => {
        console.log(`Role: [${r.role.padEnd(20)}] Login: ${r.loginStatus.padEnd(8)} Account: ${r.accountEmail}`);
        r.endpoints.forEach(ep => {
          console.log(`   -> [HTTP ${ep.status}] ${ep.method} ${ep.endpoint} (${ep.rootCauseClassification ?? "N/A"}) - ${ep.description}`);
          if (ep.currencyVerification) {
            console.log(`      * Currency Check: ${ep.currencyVerification.rawHalalas ?? "N/A"} halalas => ${ep.currencyVerification.expectedSar} | UI Browser QA: ${ep.currencyVerification.uiBrowserVerification}`);
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
      console.log("--------------------------------------------------");
    })
    .catch(err => {
      console.error("[smoke-test] Unhandled execution error:", err);
      process.exit(1);
    });
}
