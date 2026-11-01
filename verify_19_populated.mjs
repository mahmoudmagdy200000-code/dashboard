import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = 'D:/claude/ASSAB ERP GITHUB BACKEND ANTIGRAVITY/worktree_dashboard_responsive_ux';
const outDir = 'C:/Users/COMPUMARTS/.codex/.chatgpt-projects/g-p-6ac8d24c8f68819186688a760db77c9f/audit-2026-11-01-all-roles';
const screensDir = path.join(outDir, 'screens_populated');
fs.mkdirSync(screensDir, { recursive: true });

const pw = (await import(pathToFileURL(path.join(repo, 'e2e/node_modules/@playwright/test/index.js')))).default;

const widths = [320, 360, 390, 430, 768, 820, 1024, 1280];
const langs = ['ar', 'en'];

// The exact 19 screens from audit REPORT.md
const targets = [
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-dashboard', label: 'لوحة التحكم' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'head', screen: 'head-pending', label: 'بانتظار الاعتماد' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'admin', screen: 'admin-restaurants', label: 'المطاعم والفروع' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'admin', screen: 'admin-branch-requests', label: 'طلبات الفروع' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'admin', screen: 'admin-permissions', label: 'الصلاحيات' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'admin', screen: 'admin-settings', label: 'إعدادات النظام' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'branch', screen: 'branch-upload', label: 'رفع البيانات' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'procurement', screen: 'proc-new', label: 'الطلبات الجديدة' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'procurement', screen: 'proc-suppliers', label: 'الموردون' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'head', screen: 'head-pending', label: 'بانتظار الاعتماد' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'accountant', screen: 'acc-dashboard', label: 'لوحة التحكم' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'accountant', screen: 'acc-sales', label: 'المبيعات' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'accountant', screen: 'acc-expenses', label: 'المصروفات' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'accountant', screen: 'acc-purchases', label: 'المشتريات' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'accountant', screen: 'acc-inventory', label: 'المخزون' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'accountant', screen: 'acc-assets', label: 'الأصول الثابتة' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'accountant', screen: 'acc-shifts', label: 'إدارة الشفتات' },
  { surface: 'CompanyDashboard', slug: 'asab/CompanyDashboard', role: 'accountant', screen: 'acc-employees', label: 'كشف حساب الموظفين' },
  { surface: 'ASABPrototype', slug: 'asab/ASABPrototype', role: 'accountant', screen: 'acc-sales-detail', label: 'تفاصيل عملية المبيعات' },
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
    name: 'مستخدم اختبار محلي', email: 'local@assab.test', role,
    roles: [grant], companyId: '11111111-1111-1111-1111-111111111111',
    supplier: role === 'supplier' ? { id: 'sup-01', name: 'مورد تجريبي' } : undefined,
    permissions: { '*': true },
  };
}

// Rich mock data generators
const mockOps = [
  {
    id: 'op-sales-01', refNum: 'OP-20261101-001', branch: 'فرع العليا الرئيسي - الرياض', branchId: 'b-01',
    brandName: 'برغر التاج الفاخر', brandColor: '#8b5cf6', module: 'sales', moduleKey: 'sales', moduleLabel: 'المبيعات',
    match: 'diff', diff: '-150.00 ر.س', status: 'pending', submittedBy: 'أحمد الشمري (مدير الفرع)',
    date: '2026-11-01', timeAgo: 'منذ ساعتين', attachments: 2, amount: 15420.50,
    salesBreakdown: { cashHalalas: 450000, cardHalalas: 850000, appsHalalas: 242050, collectedHalalas: 1527050, varianceHalalas: -15000 }
  },
  {
    id: 'op-sales-02', refNum: 'OP-20261101-002', branch: 'فرع طريق الملك فهد - الخبر', branchId: 'b-02',
    brandName: 'شاورما ستيشن', brandColor: '#ec4899', module: 'sales', moduleKey: 'sales', moduleLabel: 'المبيعات',
    match: 'ok', diff: null, status: 'approved', submittedBy: 'خالد العنزي',
    date: '2026-11-01', timeAgo: 'منذ 3 ساعات', attachments: 1, amount: 8930.00,
    salesBreakdown: { cashHalalas: 250000, cardHalalas: 543000, appsHalalas: 100000, collectedHalalas: 893000, varianceHalalas: 0 }
  },
  {
    id: 'op-exp-01', refNum: 'OP-20261101-003', branch: 'فرع حطين النموذجي - الرياض', branchId: 'b-03',
    brandName: 'برغر التاج الفاخر', brandColor: '#8b5cf6', module: 'expenses', moduleKey: 'expenses', moduleLabel: 'المصروفات',
    match: 'review', diff: 'فاتورة بدون ضريبة', status: 'pending', submittedBy: 'سعد القحطاني',
    date: '2026-11-01', timeAgo: 'منذ ساعة', attachments: 3, amount: 3450.00
  },
  {
    id: 'op-pur-01', refNum: 'OP-20261101-004', branch: 'فرع التحلية - جدة', branchId: 'b-04',
    brandName: 'شاورما ستيشن', brandColor: '#ec4899', module: 'purchases', moduleKey: 'purchases', moduleLabel: 'المشتريات',
    match: 'diff', diff: 'فرق كمية: لحم مفروم', status: 'pending', submittedBy: 'محمد الغامدي',
    date: '2026-11-01', timeAgo: 'منذ 4 ساعات', attachments: 2, amount: 12200.00
  },
  {
    id: 'op-inv-01', refNum: 'OP-20261101-005', branch: 'فرع الياسمين - الرياض', branchId: 'b-05',
    brandName: 'برغر التاج الفاخر', brandColor: '#8b5cf6', module: 'inventory', moduleKey: 'inventory', moduleLabel: 'المخزون',
    match: 'diff', diff: 'هدر غير مبرر: صوص خاص', status: 'pending', submittedBy: 'عبدالله الشهري',
    date: '2026-11-01', timeAgo: 'منذ 5 ساعات', attachments: 1, amount: 780.00
  },
  {
    id: 'op-shf-01', refNum: 'OP-20261101-006', branch: 'فرع الروضة - الرياض', branchId: 'b-06',
    brandName: 'برغر التاج الفاخر', brandColor: '#8b5cf6', module: 'shifts', moduleKey: 'shifts', moduleLabel: 'الورديات',
    match: 'ok', diff: null, status: 'approved', submittedBy: 'عمر الدوسري',
    date: '2026-11-01', timeAgo: 'منذ 6 ساعات', attachments: 1, amount: 4500.00
  }
];

const mockBranchRequests = [
  { id: 'br-01', name: 'فرع مكة المكرمة - العزيزية', companyName: 'شركة الإعمار للأغذية', brandName: 'برغر التاج', restaurantName: 'مطعم التاج', city: 'مكة المكرمة', reviewStatus: 'pending_review' },
  { id: 'br-02', name: 'فرع المدينة المنورة - سلطانة', companyName: 'شركة الإعمار للأغذية', brandName: 'برغر التاج', restaurantName: 'مطعم التاج', city: 'المدينة المنورة', reviewStatus: 'pending_review' },
  { id: 'br-03', name: 'فرع الدمام - الشاطئ', companyName: 'مجموعة التغذية الأولى', brandName: 'شاورما ستيشن', restaurantName: 'سيتي لايت', city: 'الدمام', reviewStatus: 'rejected', reviewNote: 'الموقع غير مكتمل التراخيص البلدية' },
  { id: 'br-04', name: 'فرع الرياض - النرجس', companyName: 'مجموعة التغذية الأولى', brandName: 'برغر التاج', restaurantName: 'مطعم التاج', city: 'الرياض', reviewStatus: 'approved' }
];

const mockSuppliers = [
  { id: 'sup-01', name: 'شركة المراعي للتوزيع الغذائي المحدودة', category: 'ألبان ومشتقاتها', contactName: 'م. فهد السالم', contactPhone: '0501234567', contactEmail: 'supply@almarai.example', ratingAvg: 48, status: 'active', isActive: true },
  { id: 'sup-02', name: 'مؤسسة الرياض لتوريد اللحوم الطازجة', category: 'لحوم ودواجن', contactName: 'أبو سلطان', contactPhone: '0559876543', contactEmail: 'meat@riyadh.example', ratingAvg: 42, status: 'active', isActive: true },
  { id: 'sup-03', name: 'شركة التغليف الحديث للصناعات الورقية', category: 'تغليف ومستهلكات', contactName: 'عصام كمال', contactPhone: '0543210987', contactEmail: 'pack@modern.example', ratingAvg: 35, status: 'active', isActive: true },
  { id: 'sup-04', name: 'مورد مجمدات الأطعمة السريعة المتخصصة', category: 'مجمدات ومعلبات', contactName: 'وليد خالد', contactPhone: '0567890123', contactEmail: 'frozen@fast.example', ratingAvg: 25, status: 'suspended', isActive: false }
];

const mockPurchaseOrders = [
  { id: 'po-101', orderNumber: 'PO-2026-101', branchName: 'فرع العليا الرئيسي - الرياض', supplierId: 'sup-01', supplierName: 'شركة المراعي للتوزيع الغذائي المحدودة', totalItems: 8, totalAmount: 4320.00, priority: 'high', status: 'incoming' },
  { id: 'po-102', orderNumber: 'PO-2026-102', branchName: 'فرع طريق الملك فهد - الخبر', supplierId: 'sup-02', supplierName: 'مؤسسة الرياض لتوريد اللحوم الطازجة', totalItems: 14, totalAmount: 18750.00, priority: 'normal', status: 'incoming' },
  { id: 'po-103', orderNumber: 'PO-2026-103', branchName: 'فرع حطين النموذجي - الرياض', supplierId: 'sup-03', supplierName: 'شركة التغليف الحديث للصناعات الورقية', totalItems: 5, totalAmount: 2400.00, priority: 'normal', status: 'incoming' }
];

const mockPermissionsMatrix = [
  { module: 'المبيعات اليومية', perms: ['view', 'submit', 'review', 'approve', 'final', 'final'] },
  { module: 'المصروفات والفواتير', perms: ['view', 'submit', 'review', 'approve', 'final', 'final'] },
  { module: 'المشتريات والتوريد', perms: ['view', 'submit', 'review', 'approve', 'final', 'final'] },
  { module: 'المخزون والهدر', perms: ['view', 'submit', 'review', 'approve', 'final', 'final'] },
  { module: 'الورديات والشفتات', perms: ['view', 'submit', 'review', 'approve', 'final', 'final'] },
  { module: 'كشف الموظفين', perms: ['view', 'none', 'review', 'approve', 'final', 'final'] },
  { module: 'العهد النقدية', perms: ['view', 'submit', 'review', 'approve', 'final', 'final'] },
  { module: 'تصدير ERP', perms: ['none', 'none', 'none', 'approve', 'final', 'final'] }
];

const mockAssets = [
  { id: 'ast-01', publicId: 'AST-2026-001', name: 'ماكينة قهوة إسبريسو لا مارزوكو ثنائية', category: 'equipment', categoryLabelAr: 'معدات المطبخ', branchId: 'b-01', branchName: 'فرع العليا', bookValueHalalas: 4500000, status: 'active' },
  { id: 'ast-02', publicId: 'AST-2026-002', name: 'نظام كاشير متكامل بشاشتين وطابعة فواتير', category: 'pos', categoryLabelAr: 'أنظمة نقاط البيع', branchId: 'b-02', branchName: 'فرع الخبر', bookValueHalalas: 1200000, status: 'active' },
  { id: 'ast-03', publicId: 'AST-2026-003', name: 'ثلاجة عرض أفقية زجاجية استيل 3 أبواب', category: 'cooling', categoryLabelAr: 'تبريد وتجميد', branchId: null, branchName: null, bookValueHalalas: 1800000, status: 'pending_branch' }
];

const jobs = [];
for (const target of targets) {
  for (const lang of langs) {
    for (const width of widths) {
      jobs.push({ ...target, lang, width });
    }
  }
}

const browser = await pw.chromium.launch({ headless: true, channel: 'chrome' });
const results = [];
let nextJob = 0;
let done = 0;

async function runJob(job) {
  const context = await browser.newContext({
    viewport: { width: job.width, height: job.width >= 1024 ? 800 : job.width >= 768 ? 1024 : 844 },
    locale: job.lang === 'ar' ? 'ar-SA' : 'en-US',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.addInitScript(({ slug, role, lang }) => {
    sessionStorage.setItem('asab.tokens', JSON.stringify({ accessToken: 'mock-token', refreshToken: 'mock-token' }));
    localStorage.setItem('asab_entry_selection', JSON.stringify({ slug, role }));
    localStorage.setItem('asab_site_lang', lang);
    localStorage.setItem('asab_lang', lang);
  }, { slug: job.slug, role: job.role, lang: job.lang });

  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    const method = route.request().method();
    const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.includes('/auth/me')) return route.fulfill({ status: 200, headers, body: JSON.stringify(mockUser(job.role)) });
    if (url.includes('/accountant/operations')) return route.fulfill({ status: 200, headers, body: JSON.stringify(mockOps) });
    if (url.includes('/accountant/dashboard')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify({
        today: '2026-11-01',
        kpis: { awaitingReview: 6, iApproved: 18, finalApproved: 42, approvalRate: 88, overdueCount: 1 },
        counts: { awaitingReview: 6, iApproved: 18, finalApproved: 42, approvalRatePct: 88 },
        rejectedReuploadNeededCount: 2,
        scope: { branchCount: 12, moduleLabelsAr: ['المبيعات', 'المصروفات', 'المشتريات', 'المخزون'] },
        progressToday: { reviewPct: 85, approvalPct: 78, documentationPct: 65, completedBranchesPct: 90 },
        modules: [
          { key: 'sales', labelAr: 'المبيعات', icon: '💰', pendingCount: 2, totalCount: 24, hasUrgent: true },
          { key: 'expenses', labelAr: 'المصروفات', icon: '💸', pendingCount: 3, totalCount: 18, hasUrgent: false },
          { key: 'purchases', labelAr: 'المشتريات', icon: '🛒', pendingCount: 1, totalCount: 12, hasUrgent: true },
          { key: 'inventory', labelAr: 'المخزون', icon: '📦', pendingCount: 2, totalCount: 15, hasUrgent: false }
        ]
      }) });
    }
    if (url.includes('/company/me/sales/kpis')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify({
        date: '2026-11-01', totalSalesHalalas: 24500000, branchCount: 12, trendPct: 8.4,
        totalCollectedHalalas: 24350000, totalVarianceHalalas: -150000, varianceCaseCount: 2,
        zeroVarianceBranchCount: 10,
        varianceBranches: [
          { branchId: 'b-01', name: 'فرع العليا الرئيسي', varianceHalalas: -100000 },
          { branchId: 'b-03', name: 'فرع حطين النموذجي', varianceHalalas: -50000 }
        ]
      }) });
    }
    if (url.includes('/company/me/expenses/kpis')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify({
        dateFrom: '2026-11-01', dateTo: '2026-11-01', statementCount: 18, invoiceCount: 45,
        totalHalalas: 8500000, preTaxHalalas: 7391304, vat15Halalas: 1108696, pendingStatementCount: 3,
        pendingInvoices: { total: 12, matched: 9, mismatch: 2, missing: 1 },
        verifiedInvoiceCount: 30, unverifiedInvoiceCount: 3, convertedInvoiceCount: 12
      }) });
    }
    if (url.includes('/admin/branch-requests') || url.includes('/branches/requests')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify(mockBranchRequests) });
    }
    if (url.includes('/admin/permissions')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify({
        roles: ['محاسب', 'رئيس حسابات', 'مدير فرع', 'مدير مشتريات', 'مورد', 'أدمن'],
        matrix: mockPermissionsMatrix
      }) });
    }
    if (url.includes('/admin/settings')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify({
        notifications: { approvalNotifications: true, subscriptionAlerts: true, dailyPerformanceReports: false },
        backup: { dailyAutoBackup: true, weeklyBackup: true, dataEncryption: true },
        api: { erpConnection: true, paymentGatewayConnection: false, mobileAppInterface: true },
        security: { twoFactorAuthRequired: true, sessionDurationMinutes: 60, passwordPolicyEnabled: true }
      }) });
    }
    if (url.includes('/procurement/orders') || url.includes('/purchase-orders')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify({ data: mockPurchaseOrders, meta: { total: 3 } }) });
    }
    if (url.includes('/procurement/suppliers') || url.includes('/suppliers')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify({
        data: mockSuppliers,
        meta: { total: 4, kpis: { activeSuppliers: 3, totalPurchases: 185400, avgRating: 4.4 } }
      }) });
    }
    if (url.includes('/branch/upload/status')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify({
        reports: [
          { id: 'sales', type: 'sales', labelAr: 'المبيعات', uploadedToday: true, lastStatus: 'success' },
          { id: 'expenses', type: 'expenses', labelAr: 'المصروفات', uploadedToday: true, lastStatus: 'success' },
          { id: 'inventory', type: 'inventory', labelAr: 'المخزون', uploadedToday: false, lastStatus: null },
          { id: 'shift', type: 'shift', labelAr: 'إغلاق الشفت', uploadedToday: true, lastStatus: 'success' }
        ]
      }) });
    }
    if (url.includes('/assets')) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify({
        data: mockAssets,
        meta: { summary: { total: 3, active: 2, maintenance: 0, pendingBranch: 1, bookValueTotal: 7500000 } }
      }) });
    }
    return route.fulfill({ status: 200, headers, body: JSON.stringify({ success: true, data: [] }) });
  });

  const url = `http://127.0.0.1:4173/?page=${job.screen}#/preview/${job.slug}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('header', { timeout: 10000 });
    await page.waitForTimeout(100);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const main = document.querySelector('main') || document.body;
      const docScroll = root.scrollWidth;
      const vp = root.clientWidth;
      const mainScroll = main.scrollWidth;
      const mainClient = main.clientWidth;
      const hasDocOverflow = docScroll > vp + 2;
      const hasMainOverflow = mainScroll > mainClient + 2;
      return { vp, docScroll, mainClient, mainScroll, hasDocOverflow, hasMainOverflow };
    });

    const imageKey = `${job.surface}_${job.role}_${job.screen}_${job.width}_${job.lang}.jpg`;
    const shouldSaveImage = (job.width === 390 || job.width === 820);
    let imageRel = null;
    if (shouldSaveImage) {
      const imgPath = path.join(screensDir, imageKey);
      await page.screenshot({ path: imgPath, type: 'jpeg', quality: 65 });
      imageRel = path.relative(outDir, imgPath).replace(/\\/g, '/');
    }

    results.push({
      target: `${job.surface} · ${job.role} · ${job.screen}`,
      screen: job.screen,
      role: job.role,
      surface: job.surface,
      width: job.width,
      lang: job.lang,
      metrics,
      errors: errors.slice(0, 3),
      image: imageRel,
      passed: !metrics.hasDocOverflow && !metrics.hasMainOverflow && errors.length === 0
    });
  } catch (err) {
    results.push({
      target: `${job.surface} · ${job.role} · ${job.screen}`,
      screen: job.screen,
      role: job.role,
      surface: job.surface,
      width: job.width,
      lang: job.lang,
      error: err.message,
      passed: false
    });
  } finally {
    await context.close();
    done++;
    if (done % 50 === 0) console.log(`Progress: ${done}/${jobs.length} cases completed.`);
  }
}

async function worker() {
  while (true) {
    const index = nextJob++;
    if (index >= jobs.length) return;
    await runJob(jobs[index]);
  }
}

console.log(`STARTING Populated Suite: ${jobs.length} total cases across ${targets.length} screens.`);
await Promise.all(Array.from({ length: 4 }, worker));
await browser.close();

fs.writeFileSync(path.join(outDir, 'phase2_populated_results.json'), JSON.stringify(results, null, 2));

const passCount = results.filter(r => r.passed).length;
const failCount = results.filter(r => !r.passed).length;
console.log(`\nALL CASES COMPLETED: ${results.length} total cases.`);
console.log(`PASSED: ${passCount}, FAILED: ${failCount}`);

// Per-screen breakdown
const perScreen = {};
for (const r of results) {
  perScreen[r.target] = perScreen[r.target] || { total: 0, pass: 0, overflowCases: [] };
  perScreen[r.target].total++;
  if (r.passed) perScreen[r.target].pass++;
  else perScreen[r.target].overflowCases.push(`${r.width}px ${r.lang}`);
}

console.log('\n--- 19 SCREENS POPULATED MATRIX SUMMARY ---');
for (const [key, stat] of Object.entries(perScreen)) {
  const status = stat.pass === stat.total ? 'PASS¹ (Visual Clean)' : `FAIL (${stat.overflowCases.join(', ')})`;
  console.log(`${key}: ${status} [${stat.pass}/${stat.total}]`);
}
