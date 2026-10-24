import { defineConfig, devices } from '@playwright/test';

/**
 * ASSAB shift-cycle E2E. Projects:
 *  - unit:       offline checks of the reference arithmetic, guards, redaction, traceability.
 *  - preflight:  Mode A — READ-ONLY against any target (logins, role probes, fixture state).
 *  - lifecycle:  the main shift lifecycle (serial, one worker). Mutates; guarded by src/guards.ts.
 *  - regression: secondary negative/edge cases. Mutates; guarded by src/guards.ts.
 *
 * Reports: HTML (reports/html), JUnit (reports/junit.xml), JSON, list.
 *
 * SECRET HYGIENE: Playwright's built-in tracing also records every
 * APIRequestContext, including the login bodies (password) and Bearer headers.
 * Built-in tracing is therefore OFF. Browser-only traces are recorded by
 * src/fixtures.ts, started AFTER the session tokens are injected, and kept on
 * failure only. Those traces can still contain the fixture's short-lived
 * access token in the dashboard's own requests; every session is revoked
 * (POST auth/logout) at the end of the run. The password never enters a trace.
 */
/** Per-run report root (the isolated runner sets one per project). */
const REPORTS = process.env.ASSAB_E2E_REPORT_DIR ?? './reports';

export default defineConfig({
  testDir: './tests',
  outputDir: `${REPORTS}/artifacts`,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0, // a retry could duplicate a financial effect; failures must be investigated, not retried
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: `${REPORTS}/html`, open: 'never' }],
    ['junit', { outputFile: `${REPORTS}/junit.xml` }],
    ['json', { outputFile: `${REPORTS}/results.json` }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'off', // see SECRET HYGIENE above — never switch to 'on'/'retain-on-failure'
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'en-US',
    timezoneId: 'Asia/Riyadh',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: 'unit', testMatch: /unit\/.*\.spec\.ts$/ },
    { name: 'preflight', testMatch: /preflight\/.*\.spec\.ts$/ },
    { name: 'lifecycle', testMatch: /lifecycle\/.*\.spec\.ts$/ },
    { name: 'regression', testMatch: /regression\/.*\.spec\.ts$/ },
  ],
});
