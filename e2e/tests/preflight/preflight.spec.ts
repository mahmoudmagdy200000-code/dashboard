import { test, expect, request as pwRequest } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { env } from '../../src/env';
import { ROLE_PROBES, fixtureEmail, loginAdmin, loginMobile, logoutAdmin, logoutMobile, expectLogin } from '../../src/api/auth';
import { describe as d } from '../../src/api/client';
import { cashier, manager, ok } from '../../src/api/shiftCycle';
import { traces, blocked } from '../../src/trace';

/**
 * MODE A — READ-ONLY PREFLIGHT.
 *
 * Writes nothing to business data. The only server-side side effects are the
 * session tokens created by logging in, which are revoked at the end of every
 * test. No shift, assignment, handover, approval or correction is created.
 * UI login is the one place a password is typed into the browser; no trace is
 * recorded in this file.
 */

const OLD_BACKEND_HOST = 'ivory-snail-183262.hostingersite.com'; // dashboard .env.production default at ce078df

test.beforeEach(() => {
  if (!env.apiOrigin) blocked('ASSAB_E2E_API_ORIGIN is not set');
  if (!env.password) blocked('ASSAB_E2E_FIXTURE_PASSWORD is not set (supply it from a CI secret)');
});

test('A01 deployment identity is operator-attested (no backend endpoint exposes the deployed SHA)', async () => {
  traces('api-only');
  if (!env.expectedBackendSha) blocked('ASSAB_E2E_EXPECTED_BACKEND_SHA not provided');
  if (!env.attestedBackendSha) blocked('ASSAB_E2E_ATTESTED_DEPLOYED_BACKEND_SHA not provided; deployed backend SHA is UNVERIFIED');
  expect(env.attestedBackendSha, 'attested deployed backend SHA equals the SHA under test').toBe(env.expectedBackendSha);
  if (env.expectedFrontendSha) expect(env.attestedFrontendSha, 'attested deployed frontend SHA').toBe(env.expectedFrontendSha);
});

test('A02 the deployed dashboard bundle targets the API under test', async () => {
  traces('api-only');
  if (!env.frontendUrl) blocked('ASSAB_E2E_FRONTEND_URL not provided');
  const ctx = await pwRequest.newContext();
  try {
    const html = await ctx.get(env.frontendUrl + '/', { failOnStatusCode: false, maxRedirects: 3 });
    expect(html.status(), 'dashboard index reachable').toBe(200);
    const scripts = [...(await html.text()).matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => new URL(m[1]!, env.frontendUrl + '/').toString());
    expect(scripts.length, 'module bundle referenced by index.html').toBeGreaterThan(0);
    let bundle = '';
    for (const src of scripts) bundle += await (await ctx.get(src)).text();
    const apiHost = new URL(env.apiOrigin!).host;
    test.info().annotations.push({ type: 'bundle-api-host', description: bundle.includes(apiHost) ? `contains ${apiHost}` : `does NOT contain ${apiHost}` });
    expect(bundle.includes(OLD_BACKEND_HOST), `bundle still embeds the old backend ${OLD_BACKEND_HOST} (set VITE_API_BASE_URL in Vercel)`).toBe(false);
    expect(bundle.includes(apiHost), `bundle embeds the API under test (${apiHost})`).toBe(true);
  } finally {
    await ctx.dispose();
  }
});

for (const [key, probe] of Object.entries(ROLE_PROBES)) {
  test(`A03 ${key}: login, role key, authorized and forbidden probe`, async () => {
    traces('api-only');
    const s = expectLogin(key, await loginAdmin(env.apiOrigin!, fixtureEmail(env.namespace, key as keyof typeof ROLE_PROBES), env.password!));
    try {
      expect(s.user.roles.map((r) => r.key)).toContain(probe.roleKey);
      expect(s.user.companyId).toBe(env.companyId);
      const allowed = await s.api.get(probe.authorized);
      expect(allowed.status, `${probe.authorized}: ${d(allowed)}`).toBe(200);
      const denied = await s.api.get(probe.forbidden);
      expect(denied.status, `${probe.forbidden}: ${d(denied)}`).toBe(403);
    } finally {
      await logoutAdmin(s);
    }
  });
}

test('A04 multi-role finance user reaches both accountant and head routes', async () => {
  traces('api-only');
  const s = expectLogin('multi-role-finance', await loginAdmin(env.apiOrigin!, fixtureEmail(env.namespace, 'multi-role-finance'), env.password!));
  try {
    expect(s.user.roles.map((r) => r.key).sort()).toEqual(expect.arrayContaining(['accountant', 'head']));
    expect((await s.api.get('company/me/accountant/dashboard')).status).toBe(200);
    expect((await s.api.get('company/me/head/dashboard')).status).toBe(200);
  } finally {
    await logoutAdmin(s);
  }
});

test('A05a restricted user is denied the role-gated dashboards', async () => {
  traces('api-only');
  const s = expectLogin('restricted', await loginAdmin(env.apiOrigin!, fixtureEmail(env.namespace, 'restricted'), env.password!));
  try {
    expect((await s.api.get('auth/me')).status).toBe(200);
    for (const path of ['company/me/accountant/dashboard', 'company/me/head/dashboard', 'company/me/branch/overview', 'company/me/brands']) {
      const r = await s.api.get(path);
      expect(r.status, `${path}: ${d(r)}`).toBe(403);
    }
  } finally {
    await logoutAdmin(s);
  }
});

test('A05b restricted user cannot read financial operations', async () => {
  traces('api-only');
  // GET operations, operations/{id} and operations/{id}/audit-trail carry no EnsureAsabRole
  // middleware at 289fe09 (also at 57bd40c3); this test documents the expected denial.
  const s = expectLogin('restricted', await loginAdmin(env.apiOrigin!, fixtureEmail(env.namespace, 'restricted'), env.password!));
  try {
    const list = await s.api.get('operations', { pageSize: 5 });
    expect(list.status, `restricted GET operations: ${d(list)}`).toBe(403);
  } finally {
    await logoutAdmin(s);
  }
});

test('A06 wrong password and cross-surface tokens are rejected', async () => {
  traces('api-only');
  const bad = await loginAdmin(env.apiOrigin!, fixtureEmail(env.namespace, 'accountant'), `${env.password!}-wrong`);
  expect(bad.session, 'wrong password must not authenticate').toBeUndefined();
  expect([401, 422]).toContain(bad.result.status);

  const c = expectLogin('cashier', await loginMobile(env.apiOrigin!, 'cashier', fixtureEmail(env.namespace, 'cashier'), env.password!));
  try {
    const me = await c.api.get('auth/me');
    expect(me.status, `cashier bearer on Admin auth/me: ${d(me)}`).toBe(401);
    const ops = await c.api.get('operations');
    expect([401, 403], `cashier bearer on Admin operations: ${d(ops)}`).toContain(ops.status);
  } finally {
    await logoutMobile(c, 'cashier');
  }
});

test('A07 tenant and branch isolation on read paths', async () => {
  traces('api-only');
  const s = expectLogin('accountant', await loginAdmin(env.apiOrigin!, fixtureEmail(env.namespace, 'accountant'), env.password!));
  try {
    const foreignOp = await s.api.get(`operations/${randomUUID()}`);
    expect([403, 404], `unknown operation id: ${d(foreignOp)}`).toContain(foreignOp.status);
    const foreignBranch = await s.api.get('operations', { moduleKey: 'shifts', branchId: randomUUID(), pageSize: 5 });
    if (foreignBranch.status === 200) expect(foreignBranch.body?.data ?? [], 'no rows from an unassigned branch').toEqual([]);
    else expect([403, 404, 422]).toContain(foreignBranch.status);
  } finally {
    await logoutAdmin(s);
  }
});

test('A08 lifecycle readiness of the fixture for the business date (read-only)', async () => {
  traces('api-only');
  const bmLogin = await loginMobile(env.apiOrigin!, 'branch-manager', fixtureEmail(env.namespace, 'branch-manager'), env.password!);
  if (!bmLogin.session) {
    blocked(`branch-manager mobile login failed (${d(bmLogin.result)}); if 403 FirstLoginRequired, the fixture BM must complete the forced reset or the policy must be relaxed for the fixture`);
  }
  const c = expectLogin('cashier', await loginMobile(env.apiOrigin!, 'cashier', fixtureEmail(env.namespace, 'cashier'), env.password!));
  const bm = bmLogin.session!;
  try {
    const tpl = ((ok(await manager.templates(bm.api), 'templates').body?.data ?? []) as Array<{ name: string; is_active: boolean }>);
    test.info().annotations.push({ type: 'templates', description: tpl.map((t) => t.name).join(', ') || 'none' });
    expect(tpl.some((t) => t.is_active && t.name.startsWith('[HARNESS]')), 'active [HARNESS] shift template').toBe(true);

    const aggs = ok(await cashier.aggregators(c.api), 'aggregators');
    const list = (Array.isArray(aggs.body?.data) ? aggs.body.data : aggs.body?.data?.data ?? []) as unknown[];
    expect(list.length, 'at least one aggregator exists (apps 25 SAR needs aggregator_id)').toBeGreaterThan(0);

    const mine = ((ok(await cashier.myShifts(c.api), 'my-shifts').body?.data ?? []) as Array<{ shift_date: string; status: string }>);
    const today = mine.filter((x) => x.shift_date?.startsWith(env.businessDate));
    test.info().annotations.push({ type: 'cashier-shifts-on-date', description: JSON.stringify(today.map((x) => x.status)) });
    expect(today.every((x) => x.status === 'not_started'), `fixture cashier already used on ${env.businessDate}; lifecycle cannot run today`).toBe(true);

    // Safety (A08): the manager-day GET handler uses firstOrCreate(), so it can
    // write to the real staging DB. Do not call it in the read-only preflight.
    // Without an equivalent safe API, leave this readiness condition unverified.
    test.info().annotations.push({
      type: 'not-verifiable-read-only',
      description: 'Manager day state NOT_VERIFIED: the existing GET handler can create a manager workday. Use an approved read-only DB inspection instead.',
    });
    test.info().annotations.push({
      type: 'not-verifiable-read-only',
      description: 'cashier Employee mirror (Employee.legacy_cashier_id) required by the SHF bridge cannot be checked through the API; run `php artisan asab:mirror-mobile-cashiers` on staging if the lifecycle reports no SHF operation',
    });
  } finally {
    await logoutMobile(bm, 'branch-manager');
    await logoutMobile(c, 'cashier');
  }
});
