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

const mockCustodies = [
  {
    id: "cust-1",
    custodianName: "أحمد بن عبد الله السديري",
    branchId: "b1",
    branchName: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018",
    limitHalalas: 500000,
    currentBalanceHalalas: 320000,
    status: "normal",
    daysSinceSettlement: 12,
  },
  {
    id: "cust-2",
    custodianName: "محمد المنصور",
    branchId: "b2",
    branchName: "فرع العليا الرئيسي",
    limitHalalas: 1000000,
    currentBalanceHalalas: 950000,
    status: "critical",
    daysSinceSettlement: 35,
  },
];

const deltaCases = [
  // 1. The 10 Head Accountant cases from previous review
  { surface: "ASABPrototype", role: "head", screen: "head-dashboard", lang: "ar", width: 390, expectedSnippet: "رئيس الحسابات" },
  { surface: "ASABPrototype", role: "head", screen: "head-sales", lang: "ar", width: 390, expectedSnippet: "المبيعات" },
  { surface: "ASABPrototype", role: "head", screen: "head-pending", lang: "ar", width: 820, expectedSnippet: "بانتظار" },
  { surface: "ASABPrototype", role: "head", screen: "head-dashboard", lang: "en", width: 390, expectedSnippet: "Dashboard" },
  { surface: "ASABPrototype", role: "head", screen: "head-sales", lang: "en", width: 390, expectedSnippet: "Sales" },
  { surface: "ASABPrototype", role: "head", screen: "head-pending", lang: "en", width: 820, expectedSnippet: "Pending" },
  { surface: "CompanyDashboard", role: "head", screen: "head-dashboard", lang: "ar", width: 390, expectedSnippet: "رئيس الحسابات" },
  { surface: "CompanyDashboard", role: "head", screen: "head-dashboard", lang: "ar", width: 820, expectedSnippet: "رئيس الحسابات" },
  { surface: "CompanyDashboard", role: "head", screen: "head-dashboard", lang: "ar", width: 1280, expectedSnippet: "رئيس الحسابات" },
  { surface: "CompanyDashboard", role: "head", screen: "head-dashboard", lang: "en", width: 390, expectedSnippet: "Head Accountant" },

  // 2. The 12 acc-cash cases across viewports and locales (remediated from undefined kpis)
  { surface: "ASABPrototype", role: "accountant", screen: "acc-cash", lang: "ar", width: 390, expectedSnippet: "العهد" },
  { surface: "ASABPrototype", role: "accountant", screen: "acc-cash", lang: "ar", width: 820, expectedSnippet: "العهد" },
  { surface: "ASABPrototype", role: "accountant", screen: "acc-cash", lang: "ar", width: 1280, expectedSnippet: "العهد" },
  { surface: "ASABPrototype", role: "accountant", screen: "acc-cash", lang: "en", width: 390, expectedSnippet: "Cash" },
  { surface: "ASABPrototype", role: "accountant", screen: "acc-cash", lang: "en", width: 820, expectedSnippet: "Cash" },
  { surface: "ASABPrototype", role: "accountant", screen: "acc-cash", lang: "en", width: 1280, expectedSnippet: "Cash" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-cash", lang: "ar", width: 390, expectedSnippet: "العهد" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-cash", lang: "ar", width: 820, expectedSnippet: "العهد" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-cash", lang: "ar", width: 1280, expectedSnippet: "العهد" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-cash", lang: "en", width: 390, expectedSnippet: "Cash" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-cash", lang: "en", width: 820, expectedSnippet: "Cash" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-cash", lang: "en", width: 1280, expectedSnippet: "Cash" },

  // 3. The 12 mainOverflow cases across viewports and locales (purchases, assets, companies)
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-purchases", lang: "ar", width: 390, expectedSnippet: "المشتريات" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-purchases", lang: "en", width: 390, expectedSnippet: "Purchases" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-purchases", lang: "ar", width: 820, expectedSnippet: "المشتريات" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-purchases", lang: "en", width: 820, expectedSnippet: "Purchases" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-assets", lang: "ar", width: 390, expectedSnippet: "الأصول" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-assets", lang: "en", width: 390, expectedSnippet: "Assets" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-assets", lang: "ar", width: 820, expectedSnippet: "الأصول" },
  { surface: "CompanyDashboard", role: "accountant", screen: "acc-assets", lang: "en", width: 820, expectedSnippet: "Assets" },
  { surface: "CompanyDashboard", role: "admin", screen: "admin-companies", lang: "ar", width: 390, expectedSnippet: "الشركات" },
  { surface: "CompanyDashboard", role: "admin", screen: "admin-companies", lang: "en", width: 390, expectedSnippet: "Companies" },
  { surface: "CompanyDashboard", role: "admin", screen: "admin-companies", lang: "ar", width: 820, expectedSnippet: "الشركات" },
  { surface: "CompanyDashboard", role: "admin", screen: "admin-companies", lang: "en", width: 820, expectedSnippet: "Companies" },
];

async function run() {
  console.log(`=== Starting Targeted Delta Remediation Runner (${deltaCases.length} Cases) ===`);
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
      if (url.includes("/custody/requests")) {
        return route.fulfill({
          status: 200, headers,
          body: JSON.stringify({ data: { requests: [] } }),
        });
      }
      if (url.includes("/company/me/cash-custody")) {
        return route.fulfill({
          status: 200, headers,
          body: JSON.stringify({
            data: mockCustodies,
            meta: {
              total: mockCustodies.length,
              kpis: {
                totalCustodies: mockCustodies.length,
                totalBalanceHalalas: 1270000,
                criticalCount: 1,
              },
            },
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
    await page.waitForTimeout(1000);

    // Evaluate screen DOM metrics and identify content
    const evaluation = await page.evaluate(({ expectedSnippet }) => {
      const root = document.documentElement;
      const main = document.querySelector("main") || document.body;

      // Scroll measurements
      const docScrollWidth = root.scrollWidth;
      const docClientWidth = root.clientWidth;
      const hasDocOverflow = docScrollWidth > docClientWidth + 2;

      const mainScrollWidth = main.scrollWidth;
      const mainClientWidth = main.clientWidth;
      const hasMainOverflow = mainScrollWidth > mainClientWidth + 2;

      // Check Error Boundary
      const errorAlert = document.querySelector("[role='alert'], .asab-error-boundary");
      const hasErrorBoundary = !!errorAlert;
      const errorText = errorAlert ? errorAlert.textContent : null;

      // Check Real Screen Content (Headings / Body Text)
      const bodyText = document.body.innerText || "";
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4")).map(h => h.textContent?.trim());
      const hasExpectedContent = bodyText.includes(expectedSnippet) || headings.some(h => h && h.includes(expectedSnippet));

      // Check Branch name wrapping / clipping
      const branchEls = Array.from(document.querySelectorAll("span, p, div")).filter(el =>
        el.textContent && el.textContent.includes("[HARNESS] assab-ui-qa-20261018")
      );
      const isBranchTruncated = branchEls.some(el => {
        const text = el.textContent || "";
        return text.startsWith("...") || text.endsWith("...") || el.scrollWidth > el.clientWidth + 5;
      });

      const totalScrollHeight = main.scrollHeight;
      const clientHeight = main.clientHeight;

      return {
        hasDocOverflow,
        docScrollWidth,
        docClientWidth,
        hasMainOverflow,
        mainScrollWidth,
        mainClientWidth,
        hasErrorBoundary,
        errorText,
        hasExpectedContent,
        headings,
        isBranchTruncated,
        totalScrollHeight,
        clientHeight,
      };
    }, { expectedSnippet: c.expectedSnippet });

    // Step 1: Top capture
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (main) main.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.waitForTimeout(100);
    const topY = await page.evaluate(() => (document.querySelector("main") || document.documentElement).scrollTop);
    const topFile = `${c.surface}_${c.role}_${c.screen}_${c.lang}_${c.width}_top.png`;
    await page.screenshot({ path: path.join(outDir, topFile) });

    // Step 2: Middle capture
    const midTarget = Math.round(evaluation.totalScrollHeight / 2);
    await page.evaluate((targetY) => {
      const main = document.querySelector("main");
      if (main) main.scrollTo({ top: targetY, behavior: "instant" });
    }, midTarget);
    await page.waitForTimeout(100);
    const midY = await page.evaluate(() => (document.querySelector("main") || document.documentElement).scrollTop);
    const midFile = `${c.surface}_${c.role}_${c.screen}_${c.lang}_${c.width}_mid.png`;
    await page.screenshot({ path: path.join(outDir, midFile) });

    // Step 3: Bottom capture & LiveChat clearance verification
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (main) main.scrollTo({ top: main.scrollHeight, behavior: "instant" });
    });
    await page.waitForTimeout(100);
    const bottomY = await page.evaluate(() => (document.querySelector("main") || document.documentElement).scrollTop);
    const bottomFile = `${c.surface}_${c.role}_${c.screen}_${c.lang}_${c.width}_bottom.png`;
    await page.screenshot({ path: path.join(outDir, bottomFile) });

    // LiveChat clearance check at bottom
    const clearance = await page.evaluate(() => {
      const chatBtn = document.querySelector("button[aria-label*='الدردشة'], button[aria-label*='chat']");
      if (!chatBtn) return { hasOverlap: false, distanceToBottom: 0 };
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
      && evaluation.hasExpectedContent
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
      hasExpectedContent: evaluation.hasExpectedContent,
      branchClipped: evaluation.isBranchTruncated,
      chatOverlap: clearance.hasOverlap,
      consoleErrors: consoleErrors.length,
      scrollPositions: {
        totalHeight: evaluation.totalScrollHeight,
        clientHeight: evaluation.clientHeight,
        topY,
        midY,
        bottomY,
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
      console.log(`[PASS] ${c.surface} | ${c.role} | ${c.screen} | ${c.lang} | ${c.width}px -> scroll: [${topY}, ${midY}, ${bottomY}] / max ${evaluation.totalScrollHeight}px | docOvf: false | mainOvf: false`);
    } else {
      failCount++;
      console.log(`[FAIL] ${c.surface} | ${c.role} | ${c.screen} | ${c.lang} | ${c.width}px -> errs: ${consoleErrors.length}, docOvf: ${evaluation.hasDocOverflow}, mainOvf: ${evaluation.hasMainOverflow}, content: ${evaluation.hasExpectedContent}`);
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
  console.log(`TARGETED DELTA REMEDIATION COMPLETE:`);
  console.log(`Total Cases: ${deltaCases.length}`);
  console.log(`PASS: ${passCount} | FAIL: ${failCount}`);
  console.log(`Results saved to: ${metricsPath}`);
  console.log("=======================================================\n");

  return { passCount, failCount, results };
}

run().catch(console.error);
