import { test as base, type Page } from '@playwright/test';

/**
 * Browser-only tracing (built-in tracing is OFF; see playwright.config.ts).
 * A trace is started by openAs() after tokens are injected and is saved and
 * attached only when the test did not end with its expected status.
 */
const tracing = new WeakSet<Page>();

export async function startUiTrace(page: Page): Promise<void> {
  if (tracing.has(page)) return;
  await page.context().tracing.start({ screenshots: true, snapshots: true, sources: false });
  tracing.add(page);
}

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await use(page);
    if (!tracing.has(page)) return;
    if (testInfo.status !== testInfo.expectedStatus) {
      const path = testInfo.outputPath('ui-trace.zip');
      await page.context().tracing.stop({ path });
      await testInfo.attach('ui-trace', { path, contentType: 'application/zip' });
    } else {
      await page.context().tracing.stop();
    }
  },
});

export { expect } from '@playwright/test';
