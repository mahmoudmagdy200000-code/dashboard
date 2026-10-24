import { env } from './env';
import { expectLogin, fixtureEmail, loginAdmin, loginMobile, logoutAdmin, logoutMobile, type AdminSession, type MobileSession } from './api/auth';

/**
 * Lazily-created, worker-scoped sessions for the synthetic fixture identities.
 * The single fixture password comes from ASSAB_E2E_FIXTURE_PASSWORD only.
 */
type AdminKey = 'accountant' | 'head-accountant' | 'company-admin';

const admin = new Map<AdminKey, AdminSession>();
let bm: MobileSession | undefined;
let cash: MobileSession | undefined;

function creds(): { origin: string; pw: string } {
  if (!env.apiOrigin || !env.password) throw new Error('ASSAB_E2E_API_ORIGIN and ASSAB_E2E_FIXTURE_PASSWORD are required');
  return { origin: env.apiOrigin, pw: env.password };
}

export async function adminAs(key: AdminKey): Promise<AdminSession> {
  const hit = admin.get(key);
  if (hit) return hit;
  const { origin, pw } = creds();
  const s = expectLogin(key, await loginAdmin(origin, fixtureEmail(env.namespace, key), pw));
  admin.set(key, s);
  return s;
}

/** Branch manager on the legacy mobile surface (workday, assignments, receipts, liability approval). */
export async function branchManager(): Promise<MobileSession> {
  if (bm) return bm;
  const { origin, pw } = creds();
  bm = expectLogin('branch-manager (mobile)', await loginMobile(origin, 'branch-manager', fixtureEmail(env.namespace, 'branch-manager'), pw));
  return bm;
}

export async function cashierActor(): Promise<MobileSession> {
  if (cash) return cash;
  const { origin, pw } = creds();
  cash = expectLogin('cashier (mobile)', await loginMobile(origin, 'cashier', fixtureEmail(env.namespace, 'cashier'), pw));
  return cash;
}

export async function releaseActors(): Promise<void> {
  for (const s of admin.values()) await logoutAdmin(s);
  admin.clear();
  await logoutMobile(bm, 'branch-manager');
  await logoutMobile(cash, 'cashier');
  bm = undefined;
  cash = undefined;
}
