import { ApiClient, describe, type ApiResult } from './client';

/** Fixture identities exactly as `StagingHarnessProvisioner::plan()` derives them. */
export type AdminRole = 'company-admin' | 'branch-manager' | 'accountant' | 'head-accountant' | 'multi-role-finance' | 'restricted';

export function fixtureEmail(namespace: string, key: AdminRole | 'cashier'): string {
  return `${namespace}.${key}@fixture.invalid`;
}

/**
 * Authorized / forbidden probes from docs/testing/ASSAB_TEST_HARNESS.md
 * ("Test-account and role matrix"), verified against route middleware at 289fe09.
 */
export const ROLE_PROBES: Record<Exclude<AdminRole, 'multi-role-finance' | 'restricted'>, { authorized: string; forbidden: string; roleKey: string }> = {
  'company-admin': { authorized: 'company/me/brands', forbidden: 'company/me/accountant/dashboard', roleKey: 'company-admin' },
  'branch-manager': { authorized: 'company/me/branch/overview', forbidden: 'company/me/accountant/dashboard', roleKey: 'branch' },
  accountant: { authorized: 'company/me/accountant/dashboard', forbidden: 'company/me/head/dashboard', roleKey: 'accountant' },
  'head-accountant': { authorized: 'company/me/head/dashboard', forbidden: 'company/me/branch/overview', roleKey: 'head' },
};

export interface AdminSession {
  api: ApiClient;
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; companyId: string | null; roles: Array<{ key: string; branchIds?: string[] }> };
}

/** POST /api/v1/auth/login {email,password} → {accessToken, refreshToken, user}. */
export async function loginAdmin(apiOrigin: string, email: string, password: string): Promise<{ session?: AdminSession; result: ApiResult }> {
  const api = await ApiClient.create(apiOrigin);
  const result = await api.post('auth/login', { email, password });
  if (result.status !== 200 || typeof result.body?.accessToken !== 'string') {
    await api.dispose();
    return { result };
  }
  api.withToken(result.body.accessToken);
  return {
    result,
    session: { api, accessToken: result.body.accessToken, refreshToken: result.body.refreshToken, user: result.body.user },
  };
}

export interface MobileSession {
  api: ApiClient;
  user: { id: string; email: string };
}

/** Legacy mobile logins: POST cashier/auth/login | branch-manager/auth/login {identifier,password} → data.token. */
export async function loginMobile(apiOrigin: string, surface: 'cashier' | 'branch-manager', identifier: string, password: string): Promise<{ session?: MobileSession; result: ApiResult }> {
  const api = await ApiClient.create(apiOrigin);
  const result = await api.post(`${surface}/auth/login`, { identifier, password });
  const token = result.body?.data?.token;
  if (result.status !== 200 || typeof token !== 'string') {
    await api.dispose();
    return { result };
  }
  api.withToken(token);
  return { result, session: { api, user: result.body.data.user } };
}

export function expectLogin<T>(label: string, r: { session?: T; result: ApiResult }): T {
  if (!r.session) throw new Error(`${label} login failed: ${describe(r.result)}`);
  return r.session;
}

/** Best-effort token revocation so traces/reports never hold a live token after the run. */
export async function logoutAdmin(s?: AdminSession): Promise<void> {
  if (!s) return;
  await s.api.post('auth/logout', { refreshToken: s.refreshToken }).catch(() => undefined);
  await s.api.dispose();
}

export async function logoutMobile(s: MobileSession | undefined, surface: 'cashier' | 'branch-manager'): Promise<void> {
  if (!s) return;
  // Verified routes: POST cashier/logout, POST branch-manager/auth/logout.
  await s.api.post(surface === 'cashier' ? 'cashier/logout' : 'branch-manager/auth/logout').catch(() => undefined);
  await s.api.dispose();
}
