import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = 'D:/claude/ASSAB ERP GITHUB BACKEND ANTIGRAVITY/worktree_dashboard_responsive_ux';
const outDir = 'C:/Users/COMPUMARTS/.codex/.chatgpt-projects/g-p-6ac8d24c8f68819186688a760db77c9f/audit-2026-11-01-all-roles';

const pw = (await import(pathToFileURL(path.join(repo, 'e2e/node_modules/@playwright/test/index.js')))).default;

// The remaining 5 widths required by reviewer
const remainingWidths = [320, 360, 430, 768, 1024];
const langs = ['ar', 'en'];

// The exact 30 Remediated Screens (F01-F08)
const REMEDIATED_30_SCREENS = [
  // F01 - Accountant (9)
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-reminders', label: 'التذكيرات', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-sales', label: 'المبيعات', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-expenses', label: 'المصروفات', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-purchases', label: 'المشتريات', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-inventory', label: 'المخزون', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-waste', label: 'الهدر والتالف', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-assets', label: 'الأصول الثابتة', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-shifts', label: 'إدارة الشفتات', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-cash', label: 'إدارة العهد النقدية', findingId: 'F01' },
  // F01 - Head (10)
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-dashboard', label: 'لوحة التحكم', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-sales', label: 'المبيعات', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-expenses', label: 'المصروفات', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-purchases', label: 'المشتريات', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-inventory', label: 'المخزون', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-waste', label: 'الهدر والتالف', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-assets', label: 'الأصول الثابتة', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-shifts', label: 'إدارة الشفتات', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-employees', label: 'كشف حساب الموظفين', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-cash', label: 'العهد النقدية', findingId: 'F01' },
  // F01 - Admin (3)
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'admin', screen: 'admin-subscriptions', label: 'الاشتراكات', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'admin', screen: 'admin-companies', label: 'اشتراكات الشركات', findingId: 'F01' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'admin', screen: 'admin-erp', label: 'التصدير لـ ERP', findingId: 'F01' },
  // F01 - Procurement (1)
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'procurement', screen: 'proc-overview', label: 'لوحة التحكم', findingId: 'F01' },
  // F02 - Procurement (1)
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'procurement', screen: 'proc-items', label: 'الأصناف', findingId: 'F02' },
  // F03 - Admin (1)
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'admin', screen: 'admin-users', label: 'المستخدمون', findingId: 'F03' },
  // F04 - Head (1)
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-reports', label: 'التقارير', findingId: 'F04' },
  // F05 - Head (1)
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-erp', label: 'التصدير لـ ERP', findingId: 'F05' },
  // F06 - Accountant (1)
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-reports', label: 'التقارير', findingId: 'F06' },
  // F07 - Branch (1)
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'branch', screen: 'branch-settings', label: 'إعدادات الفرع', findingId: 'F07' },
  // F08 - Accountant (1)
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-inventory-items', label: 'تحديد أصناف الجرد اليومي', findingId: 'F08' },
];

function mockUser(role) {
  const grant = {
    key: role,
    scope: role === 'branch' ? 'branch' : role === 'accountant' ? 'brand' : 'all',
    brandIds: role === 'accountant' ? ['11111111-1111-1111-1111-111111111111'] : [],
    restaurantIds: [],
    branchIds: role === 'branch' ? ['22222222-2222-2222-2222-222222222222'] : [],
    moduleKeys: [],
  };
  return {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'مستخدم اختبار محلي',
    email: 'local@assab.test',
    role,
    roles: [grant],
    companyId: '11111111-1111-1111-1111-111111111111',
    supplier: role === 'supplier' ? { id: 'sup-01', name: 'شركة المراعي' } : undefined,
    permissions: { '*': true },
  };
}

const FAILED_SCREENS = new Set([
  'acc-sales', 'acc-expenses', 'acc-cash'
]);

const jobs = [];
for (const scr of REMEDIATED_30_SCREENS.filter(s => FAILED_SCREENS.has(s.screen))) {
  for (const lang of langs) {
    for (const width of remainingWidths) {
      jobs.push({ ...scr, lang, width });
    }
  }
}

console.log(`Starting execution of ${jobs.length} remaining width test cases (3 accountant screens × 5 widths × 2 langs)...`);

const browser = await pw.chromium.launch({ headless: true, channel: 'chrome' });
const results = [];
let completed = 0;
let passedCount = 0;
let failedCount = 0;
let nextIdx = 0;

async function runSingle(job) {
  const context = await browser.newContext({
    viewport: { width: job.width, height: job.width >= 1024 ? 800 : job.width >= 768 ? 1024 : 844 },
    locale: job.lang === 'ar' ? 'ar-SA' : 'en-US',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const user = mockUser(job.role);

  await page.addInitScript(({ slug, role, lang }) => {
    sessionStorage.setItem('asab.tokens', JSON.stringify({ accessToken: 'mock-token', refreshToken: 'mock-token' }));
    localStorage.setItem('asab_entry_selection', JSON.stringify({ slug, role }));
    localStorage.setItem('asab_site_lang', lang);
    localStorage.setItem('asab_lang', lang);
  }, { slug: job.slug, role: job.role, lang: job.lang });

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
    const url = route.request().url();
    if (url.includes('/company/me/sales/kpis')) {
      return route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          date: '2026-11-01',
          totalSalesHalalas: 1542050,
          branchCount: 3,
          trendPct: 4.5,
          totalCollectedHalalas: 1542050,
          totalVarianceHalalas: 0,
          varianceCaseCount: 0,
          zeroVarianceBranchCount: 3,
          varianceBranches: [],
        }),
      });
    }
    if (url.includes('/company/me/expenses/kpis')) {
      return route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          dateFrom: '2026-11-01',
          dateTo: '2026-11-01',
          statementCount: 12,
          invoiceCount: 45,
          totalHalalas: 3450000,
          preTaxHalalas: 3000000,
          vat15Halalas: 450000,
          pendingStatementCount: 2,
          pendingInvoices: { total: 5, matched: 3, mismatch: 1, missing: 1 },
          verifiedInvoiceCount: 38,
          unverifiedInvoiceCount: 7,
          convertedInvoiceCount: 2,
        }),
      });
    }
    if (url.includes('/company/me/cash-custody')) {
      return route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          data: [
            {
              id: 'cust-01',
              branchName: 'فرع العليا الرئيسي',
              custodianName: 'أحمد المحاسب',
              allocatedHalalas: 1000000,
              spentHalalas: 650000,
              balanceHalalas: 350000,
              status: 'active',
            },
          ],
          meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, kpis: { activeCustodies: 1, pendingRequests: 0, nearDepletion: 0 } },
        }),
      });
    }
    return route.fulfill({ status: 200, headers, body: JSON.stringify({ success: true, data: [] }) });
  });

  const url = `http://127.0.0.1:4173/?page=${job.screen}#/preview/${job.slug}`;
  let navError = null;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await page.waitForSelector('header', { timeout: 6000 });
    await page.waitForTimeout(100);
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

      const clipped = [...content.querySelectorAll('*')]
        .filter(e => visible(e) && e.scrollWidth > e.clientWidth + 4 && ['hidden', 'clip'].includes(getComputedStyle(e).overflowX) && (e.textContent || '').trim().length > 12)
        .slice(0, 8)
        .map(e => ({ tag: e.tagName, text: (e.textContent || '').trim().slice(0, 65), client: e.clientWidth, scroll: e.scrollWidth }));

      const smallButtons = [...content.querySelectorAll('button')]
        .filter(visible)
        .map(e => ({
          text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30),
          w: Math.round(e.getBoundingClientRect().width),
          h: Math.round(e.getBoundingClientRect().height),
        }))
        .filter(x => x.w < 36 || x.h < 36)
        .slice(0, 12);

      return {
        vp: root.clientWidth,
        docScroll: root.scrollWidth,
        bodyScroll: document.body.scrollWidth,
        mainClient: main?.clientWidth ?? null,
        mainScroll: main?.scrollWidth ?? null,
        hasDocOverflow: root.scrollWidth > root.clientWidth + 2,
        hasMainOverflow: (main?.scrollWidth ?? 0) > (main?.clientWidth ?? 0) + 3,
        heading: (content.querySelector('h1, h2')?.textContent || '').trim().slice(0, 80),
        clippedCount: clipped.length,
        smallButtonsCount: smallButtons.length,
        errorBoundary: /Failed to render preview|فشل تحميل المعاينة|ليس لديك صلاحية|You cannot access/.test(document.body.innerText || ''),
      };
    });
  } catch (err) {
    navError = navError || String(err?.message || err).slice(0, 300);
  }

  const passed = !navError && metrics && !metrics.hasDocOverflow && !metrics.errorBoundary;
  if (passed) passedCount++; else failedCount++;

  results.push({
    surface: job.surface,
    role: job.role,
    screen: job.screen,
    label: job.label,
    findingId: job.findingId,
    width: job.width,
    lang: job.lang,
    metrics,
    passed,
    navError,
  });

  await context.close();
  completed++;
  if (completed % 50 === 0 || completed === jobs.length) {
    console.log(`Progress: ${completed}/${jobs.length} (Passed: ${passedCount}, Failed: ${failedCount})`);
  }
}

async function worker() {
  while (true) {
    const idx = nextIdx++;
    if (idx >= jobs.length) return;
    try { await runSingle(jobs[idx]); } catch (err) { console.error('Worker error:', err); }
  }
}

const start = Date.now();
await Promise.all(Array.from({ length: 4 }, worker));
await browser.close();

const existing = JSON.parse(fs.readFileSync(path.join(outDir, 'screens_30_remaining_widths.json'), 'utf8')).filter(x => x.passed);
const merged = [...existing, ...results];
fs.writeFileSync(path.join(outDir, 'screens_30_remaining_widths.json'), JSON.stringify(merged, null, 2));

console.log(`\n=== REMAINING WIDTHS SUMMARY ===`);
console.log(`Executed now: ${completed}`);
console.log(`Passed now: ${passedCount} (${((passedCount / completed) * 100).toFixed(1)}%)`);
console.log(`Total merged records: ${merged.length}`);
console.log(`Total passing across all 300: ${merged.filter(x => x.passed).length} / ${merged.length}`);
console.log(`Failed: ${failedCount}`);
console.log(`Duration: ${((Date.now() - start) / 1000).toFixed(1)}s`);
console.log(`File: ${path.join(outDir, 'screens_30_remaining_widths.json')}`);
