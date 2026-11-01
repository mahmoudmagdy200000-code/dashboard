import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = 'D:/claude/ASSAB ERP GITHUB BACKEND ANTIGRAVITY/worktree_dashboard_responsive_ux';
const outDir = 'C:/Users/COMPUMARTS/.codex/.chatgpt-projects/g-p-6ac8d24c8f68819186688a760db77c9f/audit-2026-11-01-all-roles';
const screens30Dir = path.join(outDir, 'screens_remediated_30');
fs.mkdirSync(screens30Dir, { recursive: true });

const pw = (await import(pathToFileURL(path.join(repo, 'e2e/node_modules/@playwright/test/index.js')))).default;

// 3 Viewports: Mobile (390), Tablet (820), Laptop (1280)
const widths = [390, 820, 1280];
const langs = ['ar', 'en'];

// The 30 Remediated Screens (F01-F08)
const REMEDIATED_30_KEYS = new Set([
  'ASABPrototype/accountant/acc-reminders',
  'ASABPrototype/accountant/acc-sales',
  'ASABPrototype/accountant/acc-expenses',
  'ASABPrototype/accountant/acc-purchases',
  'ASABPrototype/accountant/acc-inventory',
  'ASABPrototype/accountant/acc-waste',
  'ASABPrototype/accountant/acc-assets',
  'ASABPrototype/accountant/acc-shifts',
  'ASABPrototype/accountant/acc-cash',
  'ASABPrototype/head/head-dashboard',
  'ASABPrototype/head/head-sales',
  'ASABPrototype/head/head-expenses',
  'ASABPrototype/head/head-purchases',
  'ASABPrototype/head/head-inventory',
  'ASABPrototype/head/head-waste',
  'ASABPrototype/head/head-assets',
  'ASABPrototype/head/head-shifts',
  'ASABPrototype/head/head-employees',
  'ASABPrototype/head/head-cash',
  'ASABPrototype/admin/admin-subscriptions',
  'ASABPrototype/admin/admin-companies',
  'ASABPrototype/admin/admin-erp',
  'ASABPrototype/procurement/proc-overview',
  'ASABPrototype/procurement/proc-items',
  'ASABPrototype/admin/admin-users',
  'ASABPrototype/head/head-reports',
  'ASABPrototype/head/head-erp',
  'ASABPrototype/accountant/acc-reports',
  'ASABPrototype/branch/branch-settings',
  'ASABPrototype/accountant/acc-inventory-items',
]);

const FINDING_MAP = {
  'ASABPrototype/accountant/acc-reminders': 'F01',
  'ASABPrototype/accountant/acc-sales': 'F01',
  'ASABPrototype/accountant/acc-expenses': 'F01',
  'ASABPrototype/accountant/acc-purchases': 'F01',
  'ASABPrototype/accountant/acc-inventory': 'F01',
  'ASABPrototype/accountant/acc-waste': 'F01',
  'ASABPrototype/accountant/acc-assets': 'F01',
  'ASABPrototype/accountant/acc-shifts': 'F01',
  'ASABPrototype/accountant/acc-cash': 'F01',
  'ASABPrototype/head/head-dashboard': 'F01',
  'ASABPrototype/head/head-sales': 'F01',
  'ASABPrototype/head/head-expenses': 'F01',
  'ASABPrototype/head/head-purchases': 'F01',
  'ASABPrototype/head/head-inventory': 'F01',
  'ASABPrototype/head/head-waste': 'F01',
  'ASABPrototype/head/head-assets': 'F01',
  'ASABPrototype/head/head-shifts': 'F01',
  'ASABPrototype/head/head-employees': 'F01',
  'ASABPrototype/head/head-cash': 'F01',
  'ASABPrototype/admin/admin-subscriptions': 'F01',
  'ASABPrototype/admin/admin-companies': 'F01',
  'ASABPrototype/admin/admin-erp': 'F01',
  'ASABPrototype/procurement/proc-overview': 'F01',
  'ASABPrototype/procurement/proc-items': 'F02',
  'ASABPrototype/admin/admin-users': 'F03',
  'ASABPrototype/head/head-reports': 'F04',
  'ASABPrototype/head/head-erp': 'F05',
  'ASABPrototype/accountant/acc-reports': 'F06',
  'ASABPrototype/branch/branch-settings': 'F07',
  'ASABPrototype/accountant/acc-inventory-items': 'F08',
};

// Load inventory
const inventory = JSON.parse(fs.readFileSync(path.join(outDir, 'inventory.json'), 'utf8'));

// Build complete list of 114 routes
const allRoutes = [];
for (const s of inventory) {
  for (const [role, screens] of Object.entries(s.roles)) {
    for (const scr of screens) {
      allRoutes.push({
        surface: s.surface,
        slug: s.slug,
        role,
        screen: scr.id,
        label: scr.label,
        module: scr.module || '',
        isInternal: false,
      });
    }
  }
}

// Add the 2 internal pages
allRoutes.push({
  surface: 'ASABPrototype',
  slug: 'asab/ASABPrototype',
  role: 'accountant',
  screen: 'acc-sales-detail',
  label: 'تفاصيل عملية المبيعات',
  module: 'المبيعات / صفحة داخلية',
  isInternal: true,
});
allRoutes.push({
  surface: 'ASABPrototype',
  slug: 'asab/ASABPrototype',
  role: 'accountant',
  screen: 'acc-inventory-items',
  label: 'تحديد أصناف الجرد اليومي',
  module: 'المخزون / صفحة داخلية',
  isInternal: true,
});

console.log(`Loaded ${allRoutes.length} unique routes (112 main + 2 internal).`);

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

const browser = await pw.chromium.launch({ headless: true, channel: 'chrome' });

// We test 114 routes * 3 widths * 2 langs = 684 cases
const jobs = [];
for (const route of allRoutes) {
  for (const lang of langs) {
    for (const width of widths) {
      jobs.push({ ...route, lang, width });
    }
  }
}

console.log(`Total test cases to execute: ${jobs.length} (Concurrency: 4)`);

const rawStream = fs.createWriteStream(path.join(outDir, 'matrix_114_fresh.ndjson'), { flags: 'w' });
const remediatedResults = [];
let completed = 0;
let nextIndex = 0;
let totalPassed = 0;
let totalFailed = 0;

async function executeJob(job) {
  const context = await browser.newContext({
    viewport: { width: job.width, height: job.width >= 1024 ? 800 : job.width >= 768 ? 1024 : 844 },
    locale: job.lang === 'ar' ? 'ar-SA' : 'en-US',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const user = mockUser(job.role);
  let errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(`PAGEERROR: ${err.message}`));

  await page.addInitScript(({ slug, role, lang }) => {
    sessionStorage.setItem('asab.tokens', JSON.stringify({ accessToken: 'mock-token', refreshToken: 'mock-token' }));
    localStorage.setItem('asab_entry_selection', JSON.stringify({ slug, role }));
    localStorage.setItem('asab_site_lang', lang);
    localStorage.setItem('asab_lang', lang);
  }, { slug: job.slug, role: job.role, lang: job.lang });

  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const method = request.method();
    const url = request.url();
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json',
    };
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (method !== 'GET') {
      return route.fulfill({ status: 405, headers, body: JSON.stringify({ message: 'Read-only audit' }) });
    }
    if (url.includes('/auth/me')) return route.fulfill({ status: 200, headers, body: JSON.stringify(user) });
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
    if (/\/company\/me\/reports(?:\?|$)/.test(url)) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify([]) });
    }
    if (url.includes('/subscription')) {
      return route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          data: {
            id: 'sub-local',
            status: 'active',
            planName: 'Enterprise Pro',
            billingCycle: 'annual',
            usage: { branches: { used: 3, max: 10 }, users: { used: 8, max: 25 }, storage: { used: 12, max: 100 } },
          },
        }),
      });
    }
    return route.fulfill({ status: 200, headers, body: JSON.stringify({ success: true, data: [] }) });
  });

  const url = `http://127.0.0.1:4173/?page=${job.screen}#/preview/${job.slug}`;
  let navigationError = null;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    await page.waitForSelector('header', { timeout: 5000 });
    await page.waitForTimeout(100);
  } catch (err) {
    navigationError = String(err?.message || err).slice(0, 300);
  }

  let metrics = null;
  try {
    metrics = await page.evaluate(() => {
      const visible = el => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      };
      const root = document.documentElement;
      const main = document.querySelector('main');
      const content = main || document.body;

      const clipped = [...content.querySelectorAll('*')]
        .filter(e => visible(e) && e.scrollWidth > e.clientWidth + 4 && ['hidden', 'clip'].includes(getComputedStyle(e).overflowX) && (e.textContent || '').trim().length > 12)
        .slice(0, 8)
        .map(e => ({ tag: e.tagName, text: (e.textContent || '').trim().slice(0, 65), client: e.clientWidth, scroll: e.scrollWidth }));

      const smallButtons = [...content.querySelectorAll('button')]
        .filter(visible)
        .map(e => ({ text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }))
        .filter(x => x.w < 36 || x.h < 36)
        .slice(0, 12);

      const hasDocOverflow = root.scrollWidth > root.clientWidth + 2;
      const hasMainOverflow = (main?.scrollWidth ?? 0) > (main?.clientWidth ?? 0) + 3;

      return {
        vp: root.clientWidth,
        docScroll: root.scrollWidth,
        bodyScroll: document.body.scrollWidth,
        mainClient: main?.clientWidth ?? null,
        mainScroll: main?.scrollWidth ?? null,
        hasDocOverflow,
        hasMainOverflow,
        clippedCount: clipped.length,
        smallButtonsCount: smallButtons.length,
        heading: (content.querySelector('h1, h2')?.textContent || '').trim().slice(0, 80),
        errorBoundary: /Failed to render preview|فشل تحميل المعاينة|ليس لديك صلاحية|You cannot access/.test(document.body.innerText || ''),
      };
    });
  } catch (err) {
    navigationError = navigationError || String(err?.message || err).slice(0, 300);
  }

  const passed = !navigationError && metrics && !metrics.hasDocOverflow && !metrics.errorBoundary;
  if (passed) totalPassed++; else totalFailed++;

  const recordKey = `${job.surface}/${job.role}/${job.screen}`;
  const isRemediated30 = REMEDIATED_30_KEYS.has(recordKey);

  let screenshotRelPath = null;
  // Capture screenshot for the 30 remediated screens at 390 and 820 in AR and EN
  if (isRemediated30 && [390, 820].includes(job.width)) {
    const filename = `${job.surface}_${job.role}_${job.screen}_${job.width}_${job.lang}.jpg`;
    const fullPath = path.join(screens30Dir, filename);
    try {
      await page.screenshot({ path: fullPath, type: 'jpeg', quality: 75, timeout: 5000 });
      screenshotRelPath = `screens_remediated_30/${filename}`;
    } catch (err) {
      errors.push(`Screenshot failed: ${err.message}`);
    }
  }

  const record = {
    surface: job.surface,
    role: job.role,
    screen: job.screen,
    label: job.label,
    module: job.module,
    isInternal: job.isInternal,
    width: job.width,
    lang: job.lang,
    metrics,
    passed,
    screenshot: screenshotRelPath,
    findingId: FINDING_MAP[recordKey] || null,
    errors: errors.slice(0, 5),
    navigationError,
  };

  rawStream.write(JSON.stringify(record) + '\n');

  if (isRemediated30) {
    remediatedResults.push(record);
  }

  await context.close();
  completed++;
  if (completed % 50 === 0 || completed === jobs.length) {
    console.log(`Progress: ${completed}/${jobs.length} completed. (Passed: ${totalPassed}, Failed: ${totalFailed})`);
  }
}

async function worker() {
  while (true) {
    const idx = nextIndex++;
    if (idx >= jobs.length) return;
    try {
      await executeJob(jobs[idx]);
    } catch (err) {
      console.error(`Worker error on job ${idx}:`, err);
    }
  }
}

const startTime = Date.now();
await Promise.all(Array.from({ length: 4 }, worker));
await browser.close();
await new Promise(resolve => rawStream.end(resolve));

// Save remediated 30 results
fs.writeFileSync(path.join(outDir, 'screens_remediated_30.json'), JSON.stringify(remediatedResults, null, 2));

const duration = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n=== FRESH VERIFICATION SUMMARY ===`);
console.log(`Total Executed: ${completed}`);
console.log(`Passed: ${totalPassed} (${((totalPassed / completed) * 100).toFixed(1)}%)`);
console.log(`Failed: ${totalFailed}`);
console.log(`Remediated 30 records saved: ${remediatedResults.length}`);
console.log(`Duration: ${duration}s`);
console.log(`Raw log: ${path.join(outDir, 'matrix_114_fresh.ndjson')}`);
console.log(`Remediated 30 JSON: ${path.join(outDir, 'screens_remediated_30.json')}`);
