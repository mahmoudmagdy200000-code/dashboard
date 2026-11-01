import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = 'D:/claude/ASSAB ERP GITHUB BACKEND ANTIGRAVITY/worktree_dashboard_responsive_ux';
const outDir = 'C:/Users/COMPUMARTS/.codex/.chatgpt-projects/g-p-6ac8d24c8f68819186688a760db77c9f/audit-2026-11-01-all-roles';

const pw = (await import(pathToFileURL(path.join(repo, 'e2e/node_modules/@playwright/test/index.js')))).default;

const casesToRetest = [
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'head', screen: 'head-waste', label: 'الهدر والتالف', width: 820, lang: 'ar' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'head', screen: 'head-waste', label: 'الهدر والتالف', width: 1280, lang: 'ar' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'head', screen: 'head-shifts', label: 'إدارة الشفتات', width: 1280, lang: 'en' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'head', screen: 'head-reminders', label: 'التذكيرات', width: 390, lang: 'ar' },
];

function mockUser(role) {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'مستخدم اختبار محلي',
    email: 'local@assab.test',
    role,
    roles: [{ key: role, scope: 'all', brandIds: [], restaurantIds: [], branchIds: [], moduleKeys: [] }],
    companyId: '11111111-1111-1111-1111-111111111111',
    permissions: { '*': true },
  };
}

const browser = await pw.chromium.launch({ headless: true, channel: 'chrome' });
const results = [];

for (const c of casesToRetest) {
  const context = await browser.newContext({
    viewport: { width: c.width, height: c.width >= 1024 ? 800 : c.width >= 768 ? 1024 : 844 },
    locale: c.lang === 'ar' ? 'ar-SA' : 'en-US',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const user = mockUser(c.role);
  let errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(`PAGEERROR: ${err.message}`));

  await page.addInitScript(({ slug, role, lang }) => {
    sessionStorage.setItem('asab.tokens', JSON.stringify({ accessToken: 'mock-token', refreshToken: 'mock-token' }));
    localStorage.setItem('asab_entry_selection', JSON.stringify({ slug, role }));
    localStorage.setItem('asab_site_lang', lang);
    localStorage.setItem('asab_lang', lang);
  }, { slug: c.slug, role: c.role, lang: c.lang });

  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const method = request.method();
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json',
    };
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (method !== 'GET') return route.fulfill({ status: 405, headers, body: JSON.stringify({ message: 'Read-only audit' }) });
    if (route.request().url().includes('/auth/me')) return route.fulfill({ status: 200, headers, body: JSON.stringify(user) });
    return route.fulfill({ status: 200, headers, body: JSON.stringify({ success: true, data: [] }) });
  });

  const url = `http://127.0.0.1:4173/?page=${c.screen}#/preview/${c.slug}`;
  let navError = null;
  try {
    // Use domcontentloaded to avoid sub-resource stalls
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('header', { timeout: 8000 });
    await page.waitForTimeout(300);
  } catch (err) {
    navError = String(err?.message || err).slice(0, 300);
  }

  let metrics = null;
  try {
    metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const main = document.querySelector('main');
      const content = main || document.body;
      const visible = el => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      };

      const smallButtons = [...content.querySelectorAll('button')]
        .filter(visible)
        .map(e => ({
          text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30),
          w: Math.round(e.getBoundingClientRect().width),
          h: Math.round(e.getBoundingClientRect().height),
        }))
        .filter(x => x.w < 36 || x.h < 36);

      return {
        vp: root.clientWidth,
        docScroll: root.scrollWidth,
        bodyScroll: document.body.scrollWidth,
        mainClient: main?.clientWidth ?? null,
        mainScroll: main?.scrollWidth ?? null,
        hasDocOverflow: root.scrollWidth > root.clientWidth + 2,
        hasMainOverflow: (main?.scrollWidth ?? 0) > (main?.clientWidth ?? 0) + 3,
        heading: (content.querySelector('h1, h2')?.textContent || '').trim().slice(0, 80),
        buttonCount: content.querySelectorAll('button').length,
        smallButtonsCount: smallButtons.length,
        errorBoundary: /Failed to render preview|فشل تحميل المعاينة|ليس لديك صلاحية|You cannot access/.test(document.body.innerText || ''),
      };
    });
  } catch (err) {
    navError = navError || String(err?.message || err).slice(0, 300);
  }

  // Take screenshot for visual evidence
  const ssFilename = `retest_${c.surface}_${c.role}_${c.screen}_${c.width}_${c.lang}.jpg`;
  const ssPath = path.join(outDir, ssFilename);
  try {
    await page.screenshot({ path: ssPath, type: 'jpeg', quality: 75, timeout: 5000 });
  } catch (_) {}

  const passed = !navError && metrics && !metrics.hasDocOverflow && !metrics.errorBoundary;
  results.push({ ...c, navError, metrics, passed, screenshot: ssFilename });
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(outDir, 'retest_4_timeouts_result.json'), JSON.stringify(results, null, 2));
