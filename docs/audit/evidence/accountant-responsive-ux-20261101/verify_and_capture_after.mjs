import pw from "../e2e/node_modules/@playwright/test/index.js";
const { chromium } = pw;
import fs from "fs";
import path from "path";

const outDir = path.resolve("./artifacts/responsive-evidence/after");
fs.mkdirSync(outDir, { recursive: true });

const mockUser = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "محاسب لوحة التحكم",
  email: "accountant@assab.local",
  role: "accountant",
  roles: [
    {
      key: "accountant",
      scope: "brand",
      brandIds: ["11111111-1111-1111-1111-111111111111"],
      restaurantIds: [],
      branchIds: [],
      moduleKeys: ["sales", "expenses", "purchases", "inventory", "shifts", "employees", "cash", "waste"],
    },
  ],
  companyId: "11111111-1111-1111-1111-111111111111",
  permissions: { "*": true },
};

const mockKpis = {
  awaitingReview: 7,
  iApproved: 3,
  finalApproved: 1,
  approvalRate: 36,
  overdueCount: 7,
};

const mockApiOps = [
  {
    id: "op-01",
    publicId: "[HARNESS] assab-ui-qa-20261018-SHF-0004",
    branchName: "[HARNESS] Branch",
    moduleKey: "shifts",
    amountHalalas: 125000,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    match: "exact",
    attachmentCount: 0,
    status: "pending",
    origin: "mobile",
    currentStage: 1,
  },
  {
    id: "op-02",
    publicId: "[HARNESS] assab-ui-qa-20261018-EXP-0002",
    branchName: "[HARNESS] Branch",
    moduleKey: "expenses",
    amountHalalas: 350000,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    match: "exact",
    attachmentCount: 0,
    status: "pending",
    origin: "mobile",
    currentStage: 1,
  },
  {
    id: "op-03",
    publicId: "OPS-EXP-20261101-003",
    branchName: "فرع الرياض - العليا والمروج الكبرى للتجارة والتموين",
    moduleKey: "expenses",
    amountHalalas: 1420050,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    match: "review",
    attachmentCount: 2,
    status: "pending",
    origin: "mobile",
    currentStage: 1,
  },
  {
    id: "op-04",
    publicId: "OPS-SALES-20261101-004",
    branchName: "فرع جدة - الكورنيش الشمالي طريق الملك عبدالعزيز",
    moduleKey: "sales",
    amountHalalas: 5218075,
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    match: "diff",
    diff: "فرق في الكارت: 450 ر.س",
    attachmentCount: 5,
    status: "pending",
    origin: "mobile",
    currentStage: 1,
    salesBreakdown: {
      cashHalalas: 2500000,
      cardHalalas: 2600000,
      appsHalalas: 118075,
      collectedHalalas: 5173075,
      varianceHalalas: -45000,
    },
  },
  {
    id: "op-05",
    publicId: "OPS-PUR-20261101-005",
    branchName: "فرع مكة - المعابدة",
    moduleKey: "purchases",
    amountHalalas: 820000,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    match: "diff",
    diff: "فرق في الكمية: 5 كجم",
    attachmentCount: 4,
    status: "pending",
    origin: "procurement",
    currentStage: 1,
  },
  {
    id: "op-06",
    publicId: "OPS-APP-20261101-006",
    branchName: "فرع الدمام - الكورنيش",
    moduleKey: "sales",
    amountHalalas: 3180000,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    match: "exact",
    attachmentCount: 3,
    status: "approved",
    origin: "mobile",
    currentStage: 2,
  },
  {
    id: "op-07",
    publicId: "OPS-FIN-20261101-007",
    branchName: "فرع الرياض - النزهة",
    moduleKey: "sales",
    amountHalalas: 1920000,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    match: "exact",
    attachmentCount: 3,
    status: "final-approved",
    origin: "mobile",
    currentStage: 3,
  },
];

const viewports = [
  { name: "320px_narrow_mobile", width: 320, height: 640 },
  { name: "360px_android_mobile", width: 360, height: 800 },
  { name: "390px_standard_mobile", width: 390, height: 844 },
  { name: "430px_large_mobile", width: 430, height: 932 },
  { name: "768px_tablet_portrait", width: 768, height: 1024 },
  { name: "820px_tablet_portrait", width: 820, height: 1180 },
  { name: "1024px_tablet_landscape", width: 1024, height: 768 },
  { name: "1280px_desktop", width: 1280, height: 800 },
];

async function setupRouteMocks(page) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",
      "Content-Type": "application/json",
    };

    if (url.includes("/auth/me")) {
      route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(mockUser),
      });
      return;
    }

    if (url.includes("/accountant/dashboard")) {
      route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          kpis: mockKpis,
          modules: [
            { key: "sales", pendingCount: 4, totalCount: 11 },
            { key: "expenses", pendingCount: 2, totalCount: 5 },
            { key: "shifts", pendingCount: 1, totalCount: 2 },
          ],
        }),
      });
      return;
    }

    if (url.includes("/accountant/operations")) {
      route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(mockApiOps),
      });
      return;
    }

    route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });

  const results = [];

  // 1. Run all 8 viewports in Arabic RTL
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: "ar-SA",
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      sessionStorage.setItem("asab.tokens", JSON.stringify({
        accessToken: "mock-access-token-accountant",
        refreshToken: "mock-refresh-token-accountant",
      }));
      sessionStorage.setItem("asab.entry_selection", JSON.stringify({
        slug: "asab/ASABPrototype",
        role: "accountant",
      }));
      localStorage.setItem("asab_site_lang", "ar");
      localStorage.setItem("asab_lang", "ar");
    });

    await setupRouteMocks(page);

    await page.goto("http://127.0.0.1:4173/#/preview/asab/ASABPrototype", {
      waitUntil: "networkidle",
    });

    await page.waitForSelector("header", { timeout: 15000 });
    await page.waitForTimeout(1500);

    const docMetrics = await page.evaluate(() => {
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasHorizontalOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
      };
    });

    const file = path.join(outDir, `${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: false });

    const fullPageFile = path.join(outDir, `${vp.name}_full.png`);
    await page.screenshot({ path: fullPageFile, fullPage: true });

    results.push({
      viewport: vp,
      lang: "ar",
      metrics: docMetrics,
      file,
      fullPageFile,
    });

    console.log(
      `[AR-RTL] Captured ${vp.name}: clientWidth=${docMetrics.clientWidth}, scrollWidth=${docMetrics.scrollWidth}, overflow=${docMetrics.hasHorizontalOverflow}`,
    );

    await context.close();
  }

  // 2. English LTR test on mobile (390px) and desktop (1280px)
  for (const vp of [viewports[2], viewports[7]]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: "en-US",
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      sessionStorage.setItem("asab.tokens", JSON.stringify({
        accessToken: "mock-access-token-accountant",
        refreshToken: "mock-refresh-token-accountant",
      }));
      sessionStorage.setItem("asab.entry_selection", JSON.stringify({
        slug: "asab/ASABPrototype",
        role: "accountant",
      }));
      localStorage.setItem("asab_site_lang", "en");
      localStorage.setItem("asab_lang", "en");
    });

    await setupRouteMocks(page);

    await page.goto("http://127.0.0.1:4173/#/preview/asab/ASABPrototype", {
      waitUntil: "networkidle",
    });

    await page.waitForSelector("header", { timeout: 15000 });
    await page.waitForTimeout(1500);

    const docMetrics = await page.evaluate(() => {
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasHorizontalOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
      };
    });

    const file = path.join(outDir, `${vp.name}_en.png`);
    await page.screenshot({ path: file, fullPage: false });

    const fullPageFile = path.join(outDir, `${vp.name}_en_full.png`);
    await page.screenshot({ path: fullPageFile, fullPage: true });

    results.push({
      viewport: vp,
      lang: "en",
      metrics: docMetrics,
      file,
      fullPageFile,
    });

    console.log(
      `[EN-LTR] Captured ${vp.name}: clientWidth=${docMetrics.clientWidth}, scrollWidth=${docMetrics.scrollWidth}, overflow=${docMetrics.hasHorizontalOverflow}`,
    );

    await context.close();
  }

  // 3. Test Drawer Open on Mobile (390px)
  {
    const vp = viewports[2];
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: "ar-SA",
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      sessionStorage.setItem("asab.tokens", JSON.stringify({
        accessToken: "mock-access-token-accountant",
        refreshToken: "mock-refresh-token-accountant",
      }));
      sessionStorage.setItem("asab.entry_selection", JSON.stringify({
        slug: "asab/ASABPrototype",
        role: "accountant",
      }));
      localStorage.setItem("asab_site_lang", "ar");
      localStorage.setItem("asab_lang", "ar");
    });

    await setupRouteMocks(page);

    await page.goto("http://127.0.0.1:4173/#/preview/asab/ASABPrototype", {
      waitUntil: "networkidle",
    });

    await page.waitForSelector("header", { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Click the mobile menu hamburger button
    const menuButton = page.locator('header button[aria-label="فتح القائمة"]');
    await menuButton.click();
    await page.waitForTimeout(800);

    const drawerFile = path.join(outDir, `${vp.name}_drawer_open.png`);
    await page.screenshot({ path: drawerFile, fullPage: false });

    console.log(`[DRAWER] Captured drawer open on ${vp.name}`);

    await context.close();
  }

  await browser.close();
  fs.writeFileSync(
    path.join(outDir, "metrics.json"),
    JSON.stringify(results, null, 2),
  );
  console.log("After verification capture complete!");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
