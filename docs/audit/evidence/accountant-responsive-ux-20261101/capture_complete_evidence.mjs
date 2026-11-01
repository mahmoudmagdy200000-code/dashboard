import pw from "../e2e/node_modules/@playwright/test/index.js";
const { chromium } = pw;
import fs from "fs";
import path from "path";

const outDir = path.resolve("./artifacts/responsive-evidence/final");
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
    branchName: "[HARNESS] Branch with Long Diagnostic Name (Testing Overflow)",
    moduleKey: "shifts",
    amountHalalas: 125000,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    match: "exact",
    attachmentCount: 1,
    status: "pending",
    origin: "mobile",
    currentStage: 1,
  },
  {
    id: "op-02",
    publicId: "[HARNESS] assab-ui-qa-20261018-EXP-0002-EXTENDED-REF-9999",
    branchName: "فرع الرياض - العليا والمروج الكبرى للتموين والإعاشة",
    moduleKey: "expenses",
    amountHalalas: 350050,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    match: "exact",
    attachmentCount: 3,
    status: "pending",
    origin: "mobile",
    currentStage: 1,
  },
  {
    id: "op-03",
    publicId: "OPS-EXP-20261101-003-LONG-ALPHANUMERIC-ID",
    branchName: "فرع جدة - الكورنيش الشمالي طريق الملك عبدالعزيز التجاري",
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
    publicId: "OPS-SALES-20261101-004-PKG6-FULL-RECONCILE",
    branchName: "فرع مكة المكرمة - العزيزية والمنطقة المركزية",
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
    publicId: "OPS-PUR-20261101-005-SUPPLIER-BATCH",
    branchName: "فرع المدينة المنورة - طريق سلطانة",
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
    branchName: "فرع الدمام - الشاطئ مول",
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
    publicId: "OPS-FIN-20261101-007-ERP-POSTED",
    branchName: "فرع الخبر - الواجهة البحرية",
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
      route.fulfill({ status: 200, headers, body: JSON.stringify(mockUser) });
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
      route.fulfill({ status: 200, headers, body: JSON.stringify(mockApiOps) });
      return;
    }

    route.fulfill({ status: 200, headers, body: JSON.stringify({ success: true, data: [] }) });
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const metrics = [];

  // Capture all 8 viewports in Arabic RTL
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: "ar-SA",
    });

    const page = await context.newPage();

    // Listen to console errors
    const consoleErrors = [];
    page.on("console", msg => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.addInitScript(() => {
      sessionStorage.setItem("asab.tokens", JSON.stringify({ accessToken: "mock-token", refreshToken: "mock-token" }));
      sessionStorage.setItem("asab.entry_selection", JSON.stringify({ slug: "asab/ASABPrototype", role: "accountant" }));
      localStorage.setItem("asab_site_lang", "ar");
      localStorage.setItem("asab_lang", "ar");
    });

    await setupRouteMocks(page);

    await page.goto("http://127.0.0.1:4173/#/preview/asab/ASABPrototype", { waitUntil: "networkidle" });
    await page.waitForSelector("header", { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 1. Capture Header at top of page
    const headerEl = page.locator("header");
    const headerFile = path.join(outDir, `${vp.name}_header.png`);
    await headerEl.screenshot({ path: headerFile });

    // 2. Capture Top of Page (KPIs + Progress + Timeline)
    const topFile = path.join(outDir, `${vp.name}_top.png`);
    await page.screenshot({ path: topFile, fullPage: false });

    // 3. Scroll main container to Modules Card and capture
    const modulesCard = page.locator("text=الموديولات التسعة").locator("xpath=ancestor::div[contains(@class, 'rounded-xl')]").first();
    let modulesFile = null;
    if (await modulesCard.count() > 0) {
      await modulesCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      modulesFile = path.join(outDir, `${vp.name}_modules.png`);
      await modulesCard.screenshot({ path: modulesFile });
    }

    // 4. Scroll main container to Operations List (OpRow) and capture
    const opRowCard = page.locator("text=قائمة العمليات").locator("xpath=ancestor::div[contains(@class, 'rounded-xl')]").first();
    let opRowCardFile = null;
    let opRowScrolledFile = null;
    let opRowItemFile = null;

    if (await opRowCard.count() > 0) {
      await opRowCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Scrolled viewport showing the Operations List in view
      opRowScrolledFile = path.join(outDir, `${vp.name}_oprow_scrolled.png`);
      await page.screenshot({ path: opRowScrolledFile, fullPage: false });

      // Entire Operations List Card
      opRowCardFile = path.join(outDir, `${vp.name}_oprow_card.png`);
      await opRowCard.screenshot({ path: opRowCardFile });

      // Single first OpRow close-up
      const firstRow = opRowCard.locator("div.border-b").first();
      if (await firstRow.count() > 0) {
        opRowItemFile = path.join(outDir, `${vp.name}_oprow_single.png`);
        await firstRow.screenshot({ path: opRowItemFile });
      }
    }

    // Measure exact computed gridTemplateColumns and header metrics from DOM
    const computedMetrics = await page.evaluate(() => {
      const header = document.querySelector("header");
      const activeHeader = Array.from(header.children).find(c => window.getComputedStyle(c).display !== "none");
      const h1 = activeHeader ? activeHeader.querySelector("h1") : null;
      const dateEl = activeHeader ? Array.from(activeHeader.querySelectorAll("div")).find(d => d.textContent.includes("2026") && d.classList.contains("whitespace-nowrap")) : null;
      const search = activeHeader ? activeHeader.querySelector("[role='search']") : null;

      const allGrids = Array.from(document.querySelectorAll(".grid"));
      const gridDetails = allGrids.map((g, i) => {
        const style = window.getComputedStyle(g);
        const colDef = style.gridTemplateColumns;
        const colCount = colDef ? colDef.split(" ").filter(Boolean).length : 0;
        return {
          index: i,
          className: g.className,
          gridTemplateColumns: colDef,
          colCount,
          clientWidth: g.clientWidth,
          scrollWidth: g.scrollWidth,
        };
      });

      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        header: {
          tag: activeHeader ? activeHeader.className : "",
          width: activeHeader ? activeHeader.clientWidth : 0,
          h1Text: h1 ? h1.textContent : null,
          h1Width: h1 ? h1.clientWidth : 0,
          h1ScrollWidth: h1 ? h1.scrollWidth : 0,
          h1Clipped: h1 ? h1.scrollWidth > h1.clientWidth : false,
          dateText: dateEl ? dateEl.textContent.trim() : null,
          dateHeight: dateEl ? dateEl.offsetHeight : 0,
          dateWrapped: dateEl ? dateEl.offsetHeight > 34 : false,
          searchWidth: search ? search.clientWidth : 0,
        },
        grids: gridDetails,
      };
    });

    metrics.push({
      viewport: vp,
      lang: "ar",
      consoleErrors,
      metrics: computedMetrics,
      files: {
        headerFile,
        topFile,
        modulesFile,
        opRowScrolledFile,
        opRowCardFile,
        opRowItemFile,
      },
    });

    console.log(`[AR-RTL] Verified ${vp.name}: overflow=${computedMetrics.hasHorizontalOverflow}, h1Clipped=${computedMetrics.header.h1Clipped}, dateWrapped=${computedMetrics.header.dateWrapped}, searchW=${computedMetrics.header.searchWidth}`);

    await context.close();
  }

  // English LTR test at 390px, 768px, 1024px, 1280px
  const enViewports = [viewports[2], viewports[4], viewports[6], viewports[7]];
  for (const vp of enViewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: "en-US",
    });

    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", msg => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.addInitScript(() => {
      sessionStorage.setItem("asab.tokens", JSON.stringify({ accessToken: "mock-token", refreshToken: "mock-token" }));
      sessionStorage.setItem("asab.entry_selection", JSON.stringify({ slug: "asab/ASABPrototype", role: "accountant" }));
      localStorage.setItem("asab_site_lang", "en");
      localStorage.setItem("asab_lang", "en");
    });

    await setupRouteMocks(page);

    await page.goto("http://127.0.0.1:4173/#/preview/asab/ASABPrototype", { waitUntil: "networkidle" });
    await page.waitForSelector("header", { timeout: 15000 });
    await page.waitForTimeout(1000);

    const headerEl = page.locator("header");
    const headerFile = path.join(outDir, `${vp.name}_header_en.png`);
    await headerEl.screenshot({ path: headerFile });

    const topFile = path.join(outDir, `${vp.name}_top_en.png`);
    await page.screenshot({ path: topFile, fullPage: false });

    // Scroll to OpRow in English
    const opRowCard = page.locator("text=Operations List, text=Operations").first().locator("xpath=ancestor::div[contains(@class, 'rounded-xl')]").first();
    let opRowFile = null;
    if (await opRowCard.count() > 0) {
      await opRowCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      opRowFile = path.join(outDir, `${vp.name}_oprow_en.png`);
      await page.screenshot({ path: opRowFile, fullPage: false });
    }

    const computedMetrics = await page.evaluate(() => {
      const header = document.querySelector("header");
      const activeHeader = Array.from(header.children).find(c => window.getComputedStyle(c).display !== "none");
      const h1 = activeHeader ? activeHeader.querySelector("h1") : null;
      const dateEl = activeHeader ? Array.from(activeHeader.querySelectorAll("div")).find(d => d.textContent.includes("2026") && d.classList.contains("whitespace-nowrap")) : null;
      const search = activeHeader ? activeHeader.querySelector("[role='search']") : null;

      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        header: {
          tag: activeHeader ? activeHeader.className : "",
          width: activeHeader ? activeHeader.clientWidth : 0,
          h1Text: h1 ? h1.textContent : null,
          h1Width: h1 ? h1.clientWidth : 0,
          h1ScrollWidth: h1 ? h1.scrollWidth : 0,
          h1Clipped: h1 ? h1.scrollWidth > h1.clientWidth : false,
          dateText: dateEl ? dateEl.textContent.trim() : null,
          dateHeight: dateEl ? dateEl.offsetHeight : 0,
          dateWrapped: dateEl ? dateEl.offsetHeight > 34 : false,
          searchWidth: search ? search.clientWidth : 0,
        },
      };
    });

    metrics.push({
      viewport: vp,
      lang: "en",
      consoleErrors,
      metrics: computedMetrics,
      files: { headerFile, topFile, opRowFile },
    });

    console.log(`[EN-LTR] Verified ${vp.name}: overflow=${computedMetrics.hasHorizontalOverflow}, h1Clipped=${computedMetrics.header.h1Clipped}, dateWrapped=${computedMetrics.header.dateWrapped}, searchW=${computedMetrics.header.searchWidth}`);

    await context.close();
  }

  // Mobile Drawer Open test at 390px
  {
    const vp = viewports[2];
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, locale: "ar-SA" });
    const page = await context.newPage();
    await page.addInitScript(() => {
      sessionStorage.setItem("asab.tokens", JSON.stringify({ accessToken: "mock-token", refreshToken: "mock-token" }));
      sessionStorage.setItem("asab.entry_selection", JSON.stringify({ slug: "asab/ASABPrototype", role: "accountant" }));
      localStorage.setItem("asab_site_lang", "ar");
      localStorage.setItem("asab_lang", "ar");
    });
    await setupRouteMocks(page);
    await page.goto("http://127.0.0.1:4173/#/preview/asab/ASABPrototype", { waitUntil: "networkidle" });
    await page.waitForSelector("header", { timeout: 15000 });
    await page.waitForTimeout(500);

    const menuBtn = page.locator('header button[aria-label="فتح القائمة"]');
    await menuBtn.click();
    await page.waitForTimeout(600);

    const drawerFile = path.join(outDir, `${vp.name}_drawer_open.png`);
    await page.screenshot({ path: drawerFile, fullPage: false });
    console.log(`[DRAWER] Captured mobile drawer open on ${vp.name}`);
    await context.close();
  }

  await browser.close();

  fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(metrics, null, 2));
  console.log("Full evidence capture and metric verification complete!");
}

run().catch((err) => {
  console.error("Capture script error:", err);
  process.exit(1);
});
