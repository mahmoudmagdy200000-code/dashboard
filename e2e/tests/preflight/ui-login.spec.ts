import { test, expect } from '@playwright/test';
import { env } from '../../src/env';
import { fixtureEmail } from '../../src/api/auth';
import { ApiClient } from '../../src/api/client';
import { traces, blocked } from '../../src/trace';

/**
 * MODE A — the one place the password is typed into the real dashboard.
 * Built-in tracing is off for the whole suite; screenshots are off here too.
 */
test.use({ screenshot: 'off' });

test.beforeEach(() => {
  if (!env.apiOrigin) blocked('ASSAB_E2E_API_ORIGIN is not set');
  if (!env.password) blocked('ASSAB_E2E_FIXTURE_PASSWORD is not set (supply it from a CI secret)');
});

test('A09 accountant signs in through the real entry flow and lands on the dashboard', async ({ page }) => {
  traces('ui-e2e');
  if (!env.ui) blocked('ASSAB_E2E_UI=false');
  if (!env.frontendUrl) blocked('ASSAB_E2E_FRONTEND_URL not provided');
  await page.addInitScript(() => {
    try { window.localStorage.setItem('asab_lang', 'en'); } catch { /* ignore */ }
  });
  await page.goto(env.frontendUrl + '/');
  await page.getByText('Enterprise Portal', { exact: true }).first().click();
  await page.getByText('Accountant', { exact: true }).first().click();
  await page.getByPlaceholder('name@example.com').fill(fixtureEmail(env.namespace, 'accountant'));
  await page.locator('input[autocomplete="current-password"]').fill(env.password!);
  await page.getByRole('button', { name: /^(Sign in|تسجيل الدخول)$/ }).click();
  await expect(page.getByRole('button', { name: /^\s*(Shift Management|إدارة الشفتات)(\s+\d+)?\s*$/ }).first()).toBeVisible({ timeout: 45_000 });

  // Revoke the session the browser created.
  const tokens = await page.evaluate(() => window.sessionStorage.getItem('asab.tokens') || window.localStorage.getItem('asab.tokens'));
  if (tokens) {
    const { accessToken, refreshToken } = JSON.parse(tokens) as { accessToken: string; refreshToken: string };
    const api = (await ApiClient.create(env.apiOrigin!)).withToken(accessToken);
    await api.post('auth/logout', { refreshToken }).catch(() => undefined);
    await api.dispose();
  }
});
