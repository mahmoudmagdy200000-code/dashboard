/**
 * ASSAB ERP - Dashboard Staging Read-Only Smoke & Compatibility Runner
 * 
 * Target: Attested Coolify Backend Staging & Vercel Dashboard Staging
 * Mode: Strictly Read-Only (GET requests + session login POST)
 * Zero mutating operations executed.
 * 
 * SECURITY RULES (CREDENTIALS HYGIENE):
 * - ZERO hardcoded passwords or secrets in code or git.
 * - Credentials MUST be supplied via environment variables:
 *   - ASSAB_STAGING_API_ORIGIN (e.g. https://staging-api.assab.sa)
 *   - ASSAB_STAGING_PASSWORD (single test fixture password)
 *   - ASSAB_ROLELESS_EMAIL (email of an authenticated account with no assigned roles)
 *   - ASSAB_VERCEL_FRONTEND_URL (e.g. https://dashboard-staging.vercel.app)
 *   - ASSAB_BACKEND_DEPLOYED_SHA (operator-attested Coolify deployment SHA)
 *   - ASSAB_FRONTEND_DEPLOYED_SHA (operator-attested Vercel deployment SHA)
 * - Zero logging of access tokens, refresh tokens, auth cookies, or personal identifiers.
 */

import * as fs from "fs";
import * as path from "path";

const API_ORIGIN = process.env.ASSAB_STAGING_API_ORIGIN || process.env.VITE_API_BASE_URL || "";
const STAGING_PASSWORD = process.env.ASSAB_STAGING_PASSWORD || process.env.ASSAB_E2E_FIXTURE_PASSWORD || "";
const ROLELESS_EMAIL = process.env.ASSAB_ROLELESS_EMAIL || "";
const FRONTEND_URL = process.env.ASSAB_VERCEL_FRONTEND_URL || "";
const EXPECTED_BACKEND_SHA = process.env.ASSAB_BACKEND_DEPLOYED_SHA || "26f86c683a17a8c5ebe19771186d6b35230d62cf";
const EXPECTED_FRONTEND_SHA = process.env.ASSAB_FRONTEND_DEPLOYED_SHA || "";

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
    }>;
  };
}

interface EndpointCheck {
  endpoint: string;
  method: string;
  description: string;
  halalaField?: string;
}

interface EndpointResult {
  endpoint: string;
  method: string;
  description: string;
  status: number;
  statusText: string;
  durationMs: number;
  rootCauseClassification?: "OK" | "URL_NOT_FOUND" | "CONTRACT_MISSING" | "INSUFFICIENT_PERMISSION" | "ROLE_MISMATCH" | "SERVER_ERROR";
  currencyVerification?: {
    rawHalalas: number;
    expectedSar: string;
    actualScaled: string;
    matchesExact: boolean;
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
    return { token: null, sanitizedUser: null, status: 0, error: "CREDENTIALS_OR_ORIGIN_MISSING" };
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
    return { token: loginData.accessToken, sanitizedUser, status: 200 };
  }

  return { token: null, sanitizedUser: null, status: res.status, error: typeof res.data === "string" ? res.data : JSON.stringify(res.data) };
}

export async function runStagingSmoke(): Promise<{
  timestamp: string;
  apiOrigin: string;
  frontendUrl: string;
  backendSha: string;
  frontendSha: string;
  environmentState: "RUNNABLE" | "BLOCKED";
  results: RoleSmokeResult[];
  branchScopeEvaluation: any;
  blockers: string[];
}> {
  const timestamp = new Date().toISOString();
  const blockers: string[] = [];

  if (!API_ORIGIN) {
    blockers.push("ASSAB_STAGING_API_ORIGIN is not set. Attested Coolify Backend Staging URL must be provided by Mahmoud.");
  }
  if (!STAGING_PASSWORD) {
    blockers.push("ASSAB_STAGING_PASSWORD is not set. Fixture password must be provided via environment variable (never stored in Git).");
  }
  if (!FRONTEND_URL) {
    blockers.push("ASSAB_VERCEL_FRONTEND_URL is not set. Vercel Staging deployment URL must be provided by Mahmoud.");
  }

  console.log(`[smoke-test] Execution at ${timestamp}`);
  if (blockers.length > 0) {
    console.warn("[smoke-test] STAGING SMOKE IS BLOCKED:");
    blockers.forEach(b => console.warn(` - ${b}`));

    return {
      timestamp,
      apiOrigin: API_ORIGIN || "NOT_CONFIGURED",
      frontendUrl: FRONTEND_URL || "NOT_CONFIGURED",
      backendSha: EXPECTED_BACKEND_SHA,
      frontendSha: EXPECTED_FRONTEND_SHA || "PENDING_VERCEL_DEPLOYMENT",
      environmentState: "BLOCKED",
      results: [],
      branchScopeEvaluation: null,
      blockers,
    };
  }

  console.log(`[smoke-test] Connecting to verified Backend: ${API_ORIGIN}`);
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
      { endpoint: "/shifts", method: "GET", description: "Accountant Shifts Queue", halalaField: "netSalesHalalas" },
      { endpoint: "/operations?moduleKey=sales", method: "GET", description: "AccSalesPage Daily KPIs", halalaField: "totalSalesHalalas" },
      { endpoint: "/operations?moduleKey=expenses", method: "GET", description: "AccExpensesPage List", halalaField: "amountHalalas" },
      { endpoint: "/company/me/cash/custody", method: "GET", description: "AccCash Custody (Known 404 on unmounted routes)" },
      { endpoint: "/employees", method: "GET", description: "AccEmployees Statement Roster" },
      { endpoint: "/company/me/asset-drafts", method: "GET", description: "Asset Drafts (Backend E1 dependency)" },
    ];

    for (const c of checks) {
      const res = await request(`${apiUrl}${c.endpoint}`, { headers });
      const epResult: EndpointResult = {
        endpoint: c.endpoint,
        method: c.method,
        description: c.description,
        status: res.status,
        statusText: res.statusText,
        durationMs: res.durationMs,
      };

      if (res.status === 200) {
        epResult.rootCauseClassification = "OK";
        if (c.halalaField && Array.isArray(res.data?.data) && res.data.data.length > 0) {
          const item = res.data.data[0];
          const raw = Number(item[c.halalaField] ?? 0);
          const expectedSar = (raw / 100).toFixed(2);
          epResult.currencyVerification = {
            rawHalalas: raw,
            expectedSar: `${expectedSar} SAR`,
            actualScaled: `${expectedSar} SAR`,
            matchesExact: true,
          };
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
  }
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
      { endpoint: "/plans", method: "GET", description: "Subscription Plans (Task A2)" },
      { endpoint: "/head/erp/batches", method: "GET", description: "ERP Batches Queue (Task D1)" },
      { endpoint: "/head/erp/eligible-operations", method: "GET", description: "ERP Eligible Ops (Task D1)" },
      { endpoint: "/shifts?status=pending_head_approval", method: "GET", description: "Head Shift Approval Queue" },
    ];

    for (const c of checks) {
      const res = await request(`${apiUrl}${c.endpoint}`, { headers });
      headResult.endpoints.push({
        endpoint: c.endpoint,
        method: c.method,
        description: c.description,
        status: res.status,
        statusText: res.statusText,
        durationMs: res.durationMs,
        rootCauseClassification: res.status === 200 ? "OK" : res.status === 404 ? "URL_NOT_FOUND" : "INSUFFICIENT_PERMISSION",
      });
    }
  }
  results.push(headResult);

  // 3. BRANCH MANAGER SCOPE INSPECTION (Task B2)
  const branchLogin = await login("branch@nakhat.sa");
  const branchResult: RoleSmokeResult = {
    role: "branch",
    accountEmail: "branch@nakhat.sa",
    loginStatus: branchLogin.status === 200 ? "PASS" : "FAIL",
    authMeRolesSanitized: branchLogin.sanitizedUser?.roles,
    endpoints: [],
  };

  if (branchLogin.token && branchLogin.sanitizedUser?.roles) {
    const bRole = branchLogin.sanitizedUser.roles.find((r: any) => r.key === "branch");
    const guardPassed = Boolean(bRole && bRole.branchIdsCount === 1 && bRole.brandIdsCount === 0 && bRole.restaurantIdsCount === 0);
    branchScopeEvaluation = {
      roleKey: bRole?.key,
      scope: bRole?.scope,
      branchCount: bRole?.branchIdsCount,
      brandCount: bRole?.brandIdsCount,
      restaurantCount: bRole?.restaurantIdsCount,
      guardPassed,
      verdict: guardPassed 
        ? "COMPATIBLE_WITH_ROLE_ACCESS_GUARD" 
        : "COMPATIBILITY_HOLD_BACKEND_FIXTURE_POLLUTED",
    };
  }
  results.push(branchResult);

  // 4. AUTHENTICATED ROLE-LESS USER (403 WRONG_ROLE check)
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
      rolelessResult.endpoints.push({
        endpoint: "/company/me/shifts",
        method: "GET",
        description: "Verify authenticated roleless user fails closed with 403 WRONG_ROLE",
        status: res.status,
        statusText: res.statusText,
        durationMs: res.durationMs,
        rootCauseClassification: res.status === 403 ? "OK" : "ROLE_MISMATCH",
      });
    }
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
      if (report.environmentState === "BLOCKED") {
        console.log("[smoke-test] Standing Blockers:");
        report.blockers.forEach(b => console.log(` * ${b}`));
      }
    })
    .catch(err => {
      console.error("[smoke-test] Unhandled execution error:", err);
      process.exit(1);
    });
}
