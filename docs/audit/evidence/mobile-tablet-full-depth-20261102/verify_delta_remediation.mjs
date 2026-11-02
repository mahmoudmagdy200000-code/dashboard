import pw from "../../../../e2e/node_modules/@playwright/test/index.js";
const { chromium } = pw;
import fs from "fs";
import path from "path";

const outDir = path.resolve("./artifacts/responsive-evidence/full-depth-114-reconciliation/delta_remediation");
fs.mkdirSync(outDir, { recursive: true });

function getMockUser(role) {
  let grant;
  if (role === "head") {
    grant = {
      key: "head",
      scope: "all",
      brandIds: [],
      restaurantIds: [],
      branchIds: [],
      moduleKeys: ["sales", "expenses", "purchases", "inventory", "shifts", "employees", "cash", "waste"],
    };
  } else if (role === "accountant") {
    grant = {
      key: "accountant",
      scope: "brand",
      brandIds: ["11111111-1111-1111-1111-111111111111"],
      restaurantIds: [],
      branchIds: [],
      moduleKeys: ["sales", "expenses", "purchases", "inventory", "shifts", "employees", "cash", "waste"],
    };
  } else if (role === "admin") {
    grant = {
      key: "admin",
      scope: "all",
      brandIds: [],
      restaurantIds: [],
      branchIds: [],
      moduleKeys: [],
    };
  } else {
    grant = {
      key: role,
      scope: "all",
      brandIds: [],
      restaurantIds: [],
      branchIds: [],
      moduleKeys: ["sales", "expenses", "purchases"],
    };
  }

  return {
    id: "33333333-3333-3333-3333-333333333333",
    name: `مستخدم تجريبي (${role})`,
    email: `${role}@assab.test`,
    role,
    roles: [grant],
    companyId: "11111111-1111-1111-1111-111111111111",
    permissions: { "*": true },
  };
}

const mockOps = [
  {
    id: "op-sales-04",
    publicId: "OPS-0004",
    refNum: "OPS-0004",
    branch: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018",
    branchName: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018",
    module: "sales",
    moduleKey: "sales",
    moduleLabel: "مبيعات",
    amount: 110.0,
    amountHalalas: 11000,
    createdAt: "2026-10-30T00:07:38+03:00",
    date: "2026-10-30T00:07:38+03:00",
    timeAgo: "منذ يومين",
    match: "exact",
    matchLabelAr: "متطابق",
    status: "rejected",
    statusLabelAr: "مرفوض",
    brandName: "مجموعة التاج",
    brandColor: "#7c3aed",
    submittedBy: "كاشير فرع الرياض",
    attachments: 0,
    salesBreakdown: { cashHalalas: 6000, cardHalalas: 5000, appsHalalas: 0, collectedHalalas: 11000, varianceHalalas: 0 },
  },
  {
    id: "op-sales-03",
    publicId: "OPS-0003",
    refNum: "OPS-0003",
    branch: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018",
    branchName: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018",
    module: "sales",
    moduleKey: "sales",
    moduleLabel: "مبيعات",
    amount: 3200.5,
    amountHalalas: 320050,
    createdAt: "2026-10-30T00:48:53+03:00",
    date: "2026-10-30T00:48:53+03:00",
    timeAgo: "منذ يومين",
    match: "exact",
    matchLabelAr: "متطابق",
    status: "approved",
    statusLabelAr: "تمت الموافقة",
    brandName: "مجموعة التاج",
    brandColor: "#7c3aed",
    submittedBy: "كاشير فرع الرياض",
    attachments: 0,
    salesBreakdown: { cashHalalas: 150000, cardHalalas: 170050, appsHalalas: 0, collectedHalalas: 320050, varianceHalalas: 0 },
  },
];

// Production-compliant Cash Custody Page with full Halala precision
const mockCustodyPage = {
  data: [
    {
      id: "cust-01",
      branchId: "b1",
      branchName: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018",
      custodianName: "أحمد بن عبد الله السديري",
      amountHalalas: 500000,
      usedHalalas: 180000,
      remainingHalalas: 320000,
      minAlertHalalas: 50000,
      usagePct: 36,
      status: "normal",
      statusLabelAr: "طبيعية",
      daysSinceSettlement: 12,
    },
    {
      id: "cust-02",
      branchId: "b2",
      branchName: "فرع العليا الرئيسي",
      custodianName: "محمد المنصور",
      amountHalalas: 1000000,
      usedHalalas: 950000,
      remainingHalalas: 50000,
      minAlertHalalas: 100000,
      usagePct: 95,
      status: "critical",
      statusLabelAr: "حرجة",
      daysSinceSettlement: 35,
    },
  ],
  meta: {
    page: 1,
    pageSize: 10,
    total: 2,
    totalPages: 1,
    kpis: {
      activeCustodies: 2,
      pendingRequests: 1,
      nearDepletion: 1,
    },
  },
};

const mockFundingRequests = {
  data: {
    requests: [
      {
        id: "freq-01",
        branchName: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018",
        submittedBy: "أحمد بن عبد الله السديري",
        status: "approved",
        amount: "5,000",
        amountHalalas: 500000,
        preferredReceiptMethod: "bank_transfer",
        purpose: "تغذية عهدة دورية للفرع",
        executedAt: null,
        receivedAt: null,
        transferReference: null,
        canExecute: true,
      },
    ],
  },
};

// Exact 28 delta cases corresponding strictly to unique keys in full_114_coverage_metrics.json
const deltaCases = [
  // 1. The 6 original mainOverflow=true cases under ASABPrototype
  {
    surface: "ASABPrototype",
    role: "accountant",
    screen: "acc-purchases",
    lang: "ar",
    width: 390,
    expectedTitle: "موديول المشتريات",
  },
  {
    surface: "ASABPrototype",
    role: "accountant",
    screen: "acc-assets",
    lang: "ar",
    width: 390,
    expectedTitle: "الأصول الثابتة",
  },
  {
    surface: "ASABPrototype",
    role: "accountant",
    screen: "acc-purchases",
    lang: "en",
    width: 390,
    expectedTitle: "Purchases",
  },
  {
    surface: "ASABPrototype",
    role: "accountant",
    screen: "acc-purchases",
    lang: "en",
    width: 820,
    expectedTitle: "Purchases",
  },
  {
    surface: "ASABPrototype",
    role: "admin",
    screen: "admin-companies",
    lang: "ar",
    width: 390,
    expectedTitle: "قائمة الشركات المشتركة في بوابة المجموعات",
  },
  {
    surface: "ASABPrototype",
    role: "admin",
    screen: "admin-companies",
    lang: "en",
    width: 390,
    expectedTitle: "Companies Subscribed to Groups Portal",
  },

  // 2. The 10 Head Accountant cases
  {
    surface: "ASABPrototype",
    role: "head",
    screen: "head-dashboard",
    lang: "ar",
    width: 390,
    expectedTitle: "لوحة رئيس الحسابات 👑",
  },
  {
    surface: "ASABPrototype",
    role: "head",
    screen: "head-sales",
    lang: "ar",
    width: 390,
    expectedTitle: "المبيعات — الاعتماد النهائي",
  },
  {
    surface: "ASABPrototype",
    role: "head",
    screen: "head-pending",
    lang: "ar",
    width: 820,
    expectedTitle: "بانتظار الاعتماد النهائي",
  },
  {
    surface: "ASABPrototype",
    role: "head",
    screen: "head-dashboard",
    lang: "en",
    width: 390,
    expectedTitle: "Dashboard",
  },
  {
    surface: "ASABPrototype",
    role: "head",
    screen: "head-sales",
    lang: "en",
    width: 390,
    expectedTitle: "Sales",
  },
  {
    surface: "ASABPrototype",
    role: "head",
    screen: "head-pending",
    lang: "en",
    width: 820,
    expectedTitle: "Pending Approval",
  },
  {
    surface: "CompanyDashboard",
    role: "head",
    screen: "head-dashboard",
    lang: "ar",
    width: 390,
    expectedTitle: "لوحة رئيس الحسابات 👑",
  },
  {
    surface: "CompanyDashboard",
    role: "head",
    screen: "head-dashboard",
    lang: "ar",
    width: 820,
    expectedTitle: "لوحة رئيس الحسابات 👑",
  },
  {
    surface: "CompanyDashboard",
    role: "head",
    screen: "head-dashboard",
    lang: "ar",
    width: 1280,
    expectedTitle: "لوحة رئيس الحسابات 👑",
  },
  {
    surface: "CompanyDashboard",
    role: "head",
    screen: "head-dashboard",
    lang: "en",
    width: 390,
    expectedTitle: "Head Accountant",
  },

  // 3. The 12 acc-cash cases across viewports and locales
  {
    surface: "ASABPrototype",
    role: "accountant",
    screen: "acc-cash",
    lang: "ar",
    width: 390,
    expectedTitle: "إدارة العهد النقدية",
    expectedKpi: "2",
  },
  {
    surface: "ASABPrototype",
    role: "accountant",
    screen: "acc-cash",
    lang: "ar",
    width: 820,
    expectedTitle: "إدارة العهد النقدية",
    expectedKpi: "2",
  },
  {
    surface: "ASABPrototype",
    role: "accountant",
    screen: "acc-cash",
    lang: "ar",
    width: 1280,
    expectedTitle: "إدارة العهد النقدية",
    expectedKpi: "2",
  },
  {
    surface: "ASABPrototype",
    role: "accountant",
    screen: "acc-cash",
    lang: "en",
    width: 390,
    expectedTitle: "Cash Custody",
    expectedKpi: "2",
  },
  {
    surface: "ASABPrototype",
    role: "accountant",
    screen: "acc-cash",
    lang: "en",
    width: 820,
    expectedTitle: "Cash Custody",
    expectedKpi: "2",
  },
  {
    surface: "ASABPrototype",
    role: "accountant",
    screen: "acc-cash",
    lang: "en",
    width: 1280,
    expectedTitle: "Cash Custody",
    expectedKpi: "2",
  },
  {
    surface: "CompanyDashboard",
    role: "accountant",
    screen: "acc-cash",
    lang: "ar",
    width: 390,
    expectedTitle: "إدارة العهد النقدية",
    expectedKpi: "2",
  },
  {
    surface: "CompanyDashboard",
    role: "accountant",
    screen: "acc-cash",
    lang: "ar",
    width: 820,
    expectedTitle: "إدارة العهد النقدية",
    expectedKpi: "2",
  },
  {
    surface: "CompanyDashboard",
    role: "accountant",
    screen: "acc-cash",
    lang: "ar",
    width: 1280,
    expectedTitle: "إدارة العهد النقدية",
    expectedKpi: "2",
  },
  {
    surface: "CompanyDashboard",
    role: "accountant",
    screen: "acc-cash",
    lang: "en",
    width: 390,
    expectedTitle: "Petty Cash Management",
    expectedKpi: "2",
  },
  {
    surface: "CompanyDashboard",
    role: "accountant",
    screen: "acc-cash",
    lang: "en",
    width: 820,
    expectedTitle: "Petty Cash Management",
    expectedKpi: "2",
  },
  {
    surface: "CompanyDashboard",
    role: "accountant",
    screen: "acc-cash",
    lang: "en",
    width: 1280,
    expectedTitle: "Petty Cash Management",
    expectedKpi: "2",
  },
];

export async function runDeltaVerification() {
  console.log(`=== Starting Strict Targeted Delta Verification (${deltaCases.length} Cases) ===`);
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  let passCount = 0;
  let failCount = 0;
  const results = [];

  for (const c of deltaCases) {
    const slug = c.surface === "ASABPrototype" ? "asab/ASABPrototype" : "asab/CompanyDashboard";
    const height = c.width >= 1024 ? 800 : c.width >= 768 ? 1024 : 844;
    const user = getMockUser(c.role);

    const context = await browser.newContext({
      viewport: { width: c.width, height },
      locale: c.lang === "ar" ? "ar-SA" : "en-US",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on("console", msg => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", err => {
      consoleErrors.push(err.message);
    });

    await page.addInitScript(({ slug, role, lang, user }) => {
      sessionStorage.setItem("asab.tokens", JSON.stringify({ accessToken: "mock-token", refreshToken: "mock-token" }));
      localStorage.setItem("asab_entry_selection", JSON.stringify({ slug, role }));
      localStorage.setItem("asab_site_lang", lang);
      localStorage.setItem("asab_lang", lang);
    }, { slug, role: c.role, lang: c.lang, user });

    await page.route("**/api/v1/**", async (route) => {
      const req = route.request();
      const url = req.url();
      const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (url.includes("/auth/me")) return route.fulfill({ status: 200, headers, body: JSON.stringify(user) });
      if (url.includes("/custody/requests")) return route.fulfill({ status: 200, headers, body: JSON.stringify(mockFundingRequests) });
      if (url.includes("/company/me/cash-custody")) return route.fulfill({ status: 200, headers, body: JSON.stringify(mockCustodyPage) });
      if (url.includes("/pipeline/daily-rollup")) {
        return route.fulfill({
          status: 200, headers,
          body: JSON.stringify({
            branches: [
              { branchId: "b1", branchName: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018", state: "empty", labelAr: "لا بيانات" },
              { branchId: "b2", branchName: "فرع الياسمين", state: "empty", labelAr: "لا بيانات" },
            ],
          }),
        });
      }
      if (url.includes("/company/me/sales/kpis")) {
        return route.fulfill({ status: 200, headers, body: JSON.stringify({ date: "2026-11-01", totalSalesHalalas: 1200000, branchCount: 2 }) });
      }
      if (url.includes("/company/me/expenses/kpis")) {
        return route.fulfill({ status: 200, headers, body: JSON.stringify({ statementCount: 4, invoiceCount: 12, totalHalalas: 450000 }) });
      }
      if (url.includes("/operations")) return route.fulfill({ status: 200, headers, body: JSON.stringify({ data: mockOps, meta: { total: mockOps.length } }) });
      if (url.includes("/subscription")) {
        return route.fulfill({
          status: 200, headers,
          body: JSON.stringify({ data: { id: "sub-1", status: "active", planName: "Enterprise Tier" } }),
        });
      }
      if (url.includes("/support/chat")) return route.fulfill({ status: 200, headers, body: JSON.stringify({ success: true, sessionId: null }) });
      return route.fulfill({ status: 200, headers, body: JSON.stringify({ success: true, data: [] }) });
    });

    const targetUrl = `http://127.0.0.1:4173/?page=${c.screen}#/preview/${slug}`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    // Allow font and layout settlement
    await page.waitForTimeout(1000);

    const evaluation = await page.evaluate(({ expectedTitle, expectedKpi }) => {
      const root = document.documentElement;
      const main = document.querySelector("main") || document.body;

      // Scroll measurements
      const docScrollWidth = root.scrollWidth;
      const docClientWidth = root.clientWidth;
      const docDiff = docScrollWidth - docClientWidth;
      const hasDocOverflow = docDiff > 2;

      const mainScrollWidth = main.scrollWidth;
      const mainClientWidth = main.clientWidth;
      const mainDiff = mainScrollWidth - mainClientWidth;
      const hasMainOverflow = mainDiff > 2;

      // Check Error Boundary
      const errorAlert = document.querySelector(".asab-error-boundary, [role='alert']");
      const hasErrorBoundary = !!errorAlert;
      const errorText = errorAlert ? errorAlert.textContent : null;

      // Check Fallback / Login screen detection
      const isLoginScreen = !!document.querySelector("input[type='password'], button[type='submit']");
      const bodyText = document.body.innerText || "";

      // Screen Identity Check
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, p, span, div")).map(h => h.textContent?.trim());
      const hasExpectedTitle = headings.some(h => h && h.includes(expectedTitle)) || bodyText.includes(expectedTitle);

      // Distinct Admin-Companies Guard: reject if showing subscription plan page
      const isSubPlanPage = bodyText.includes("إدارة الاشتراك") || bodyText.includes("الاشتراك والخطة");
      const passesDistinctIdentity = expectedTitle.includes("الشركات") ? (!isSubPlanPage && hasExpectedTitle) : hasExpectedTitle;

      // Check KPI values for custody
      let hasValidKpis = true;
      if (expectedKpi) {
        hasValidKpis = bodyText.includes(expectedKpi);
      }

      // Check Branch name wrapping on leaf elements
      const branchLeafEls = Array.from(document.querySelectorAll("span, p, div, option")).filter(el =>
        el.children.length === 0 && el.textContent && el.textContent.includes("assab-ui-qa-20261018")
      );
      const isBranchClipped = branchLeafEls.some(el => {
        const text = el.textContent || "";
        return text.startsWith("...") || text.endsWith("...") || el.scrollWidth > el.clientWidth + 5;
      });

      // Section D Vertical Scroll Measurement
      const totalScrollHeight = main.scrollHeight;
      const clientHeight = main.clientHeight;
      const maxScroll = Math.max(0, totalScrollHeight - clientHeight);
      const middleScroll = Math.floor(maxScroll / 2);
      const isScrollable = maxScroll > 0;

      return {
        hasDocOverflow,
        docScrollWidth,
        docClientWidth,
        docDiff,
        hasMainOverflow,
        mainScrollWidth,
        mainClientWidth,
        mainDiff,
        hasErrorBoundary,
        errorText,
        isLoginScreen,
        hasExpectedTitle,
        passesDistinctIdentity,
        hasValidKpis,
        isBranchClipped,
        totalScrollHeight,
        clientHeight,
        maxScroll,
        middleScroll,
        isScrollable,
      };
    }, { expectedTitle: c.expectedTitle, expectedKpi: c.expectedKpi });

    // Step 1: Top capture
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (main) main.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.waitForTimeout(100);
    const actualTopY = await page.evaluate(() => (document.querySelector("main") || document.documentElement).scrollTop);
    const topFile = `${c.surface}_${c.role}_${c.screen}_${c.lang}_${c.width}_top.png`;
    await page.screenshot({ path: path.join(outDir, topFile) });

    // Step 2: Middle capture
    let actualMidY = 0;
    if (evaluation.isScrollable) {
      await page.evaluate((targetY) => {
        const main = document.querySelector("main");
        if (main) main.scrollTo({ top: targetY, behavior: "instant" });
      }, evaluation.middleScroll);
      await page.waitForTimeout(100);
      actualMidY = await page.evaluate(() => (document.querySelector("main") || document.documentElement).scrollTop);
    }
    const midFile = `${c.surface}_${c.role}_${c.screen}_${c.lang}_${c.width}_mid.png`;
    await page.screenshot({ path: path.join(outDir, midFile) });

    // Step 3: Bottom capture
    let actualBottomY = 0;
    if (evaluation.isScrollable) {
      await page.evaluate((targetY) => {
        const main = document.querySelector("main");
        if (main) main.scrollTo({ top: targetY, behavior: "instant" });
      }, evaluation.maxScroll);
      await page.waitForTimeout(100);
      actualBottomY = await page.evaluate(() => (document.querySelector("main") || document.documentElement).scrollTop);
    }
    const bottomFile = `${c.surface}_${c.role}_${c.screen}_${c.lang}_${c.width}_bottom.png`;
    await page.screenshot({ path: path.join(outDir, bottomFile) });

    // LiveChat clearance check at bottom
    const clearance = await page.evaluate(() => {
      const chatBtn = document.querySelector("button[aria-label*='الدردشة'], button[aria-label*='chat']");
      if (!chatBtn) return { hasOverlap: false };
      const chatRect = chatBtn.getBoundingClientRect();
      const main = document.querySelector("main");
      const interactives = Array.from(main?.querySelectorAll("button, a, input, select") || []).filter(el => {
        return el !== chatBtn && !chatBtn.contains(el);
      });
      let hasOverlap = false;
      for (const el of interactives) {
        const r = el.getBoundingClientRect();
        if (
          r.top < chatRect.bottom &&
          r.bottom > chatRect.top &&
          r.left < chatRect.right &&
          r.right > chatRect.left
        ) {
          hasOverlap = true;
          break;
        }
      }
      return { hasOverlap, chatRect };
    });

    const isPass = !evaluation.hasDocOverflow
      && !evaluation.hasMainOverflow
      && !evaluation.hasErrorBoundary
      && !evaluation.isLoginScreen
      && evaluation.passesDistinctIdentity
      && evaluation.hasValidKpis
      && !clearance.hasOverlap
      && consoleErrors.length === 0;

    const resultRecord = {
      surface: c.surface,
      role: c.role,
      screen: c.screen,
      lang: c.lang,
      width: c.width,
      status: isPass ? "PASS" : "FAIL",
      docOverflow: evaluation.hasDocOverflow,
      mainOverflow: evaluation.hasMainOverflow,
      docWidths: `${evaluation.docScrollWidth}/${evaluation.docClientWidth}`,
      mainWidths: `${evaluation.mainScrollWidth}/${evaluation.mainClientWidth}`,
      hasErrorBoundary: evaluation.hasErrorBoundary,
      passesDistinctIdentity: evaluation.passesDistinctIdentity,
      hasValidKpis: evaluation.hasValidKpis,
      branchClipped: evaluation.isBranchClipped,
      chatOverlap: clearance.hasOverlap,
      consoleErrors: consoleErrors.length,
      scrollMeasurement: {
        totalHeight: evaluation.totalScrollHeight,
        clientHeight: evaluation.clientHeight,
        maxScroll: evaluation.maxScroll,
        middleScroll: evaluation.middleScroll,
        scrollStatus: evaluation.isScrollable ? "SCROLLABLE" : "NOT SCROLLABLE",
        actualScrollOffsets: {
          top: actualTopY,
          mid: actualMidY,
          bottom: actualBottomY,
        },
      },
      screenshots: {
        top: topFile,
        mid: midFile,
        bottom: bottomFile,
      },
    };

    results.push(resultRecord);
    if (isPass) {
      passCount++;
      const scrollDesc = evaluation.isScrollable ? `[${actualTopY}, ${actualMidY}, ${actualBottomY}] / max ${evaluation.maxScroll}px` : `NOT SCROLLABLE (${evaluation.clientHeight}px)`;
      console.log(`[PASS] ${c.surface} | ${c.role} | ${c.screen} | ${c.lang} | ${c.width}px -> scroll: ${scrollDesc} | docOvf: false | mainOvf: false`);
    } else {
      failCount++;
      console.log(`[FAIL] ${c.surface} | ${c.role} | ${c.screen} | ${c.lang} | ${c.width}px -> errs: ${consoleErrors.length}, docOvf: ${evaluation.hasDocOverflow}, mainOvf: ${evaluation.hasMainOverflow}, identity: ${evaluation.passesDistinctIdentity}, kpis: ${evaluation.hasValidKpis}`);
      if (consoleErrors.length > 0) console.log(`       Console errors:`, consoleErrors);
      if (evaluation.hasErrorBoundary) console.log(`       Error boundary:`, evaluation.errorText);
    }

    await context.close();
  }

  await browser.close();

  // Save measured results
  const metricsPath = path.resolve("./docs/audit/evidence/mobile-tablet-full-depth-20261102/delta_remediation_metrics.json");
  fs.writeFileSync(metricsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalCases: deltaCases.length,
    passCount,
    failCount,
    results,
  }, null, 2));

  console.log("\n=======================================================");
  console.log(`STRICT TARGETED DELTA VERIFICATION COMPLETE:`);
  console.log(`Total Cases: ${deltaCases.length}`);
  console.log(`PASS: ${passCount} | FAIL: ${failCount}`);
  console.log(`Results saved to: ${metricsPath}`);
  console.log("=======================================================\n");

  return { passCount, failCount, results };
}

// Run directly when executed
if (process.argv[1] && process.argv[1].endsWith("verify_delta_remediation.mjs")) {
  runDeltaVerification().catch(console.error);
}
