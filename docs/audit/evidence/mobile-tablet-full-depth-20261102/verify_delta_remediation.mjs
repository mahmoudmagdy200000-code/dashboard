import {installMocks,getMockUser} from './verification-fixtures.mjs';
import {inspectDOM,expectedHeader,sha256} from './evidence-integrity.mjs';
import {execFileSync} from 'node:child_process';
import pw from "../../../../e2e/node_modules/@playwright/test/index.js";
const { chromium } = pw;
import fs from "fs";
import path from "path";

const outDir = path.resolve("./artifacts/responsive-evidence/full-depth-114-reconciliation/delta_remediation");
fs.mkdirSync(outDir, { recursive: true });

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

    await installMocks(page,user);

    const targetUrl = `http://127.0.0.1:4173/?page=${c.screen}#/preview/${slug}`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    // Allow font and layout settlement
    await page.waitForTimeout(1000);

    await page.waitForSelector('main,[role=alert]',{timeout:15000});
    const evaluation=await page.evaluate(inspectDOM,{expectedHeader:expectedHeader(c),cash:c.screen==='acc-cash',checkLayout:true});

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

    const isPass = evaluation.passed && actualTopY === 0 && actualMidY === evaluation.middleScroll && actualBottomY === evaluation.maxScroll && !evaluation.hasDocOverflow
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
      kpiChecks:evaluation.kpiChecks, cashAmounts:evaluation.cashAmounts,
      header:evaluation.header, expectedHeader:evaluation.expectedHeader,
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
    testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    fixtureSha256:sha256('docs/audit/evidence/mobile-tablet-full-depth-20261102/verification-fixtures.mjs'),
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

  if(failCount)process.exitCode=1;
  return { passCount, failCount, results };
}

// Run directly when executed
if (process.argv[1] && process.argv[1].endsWith("verify_delta_remediation.mjs")) {
  runDeltaVerification().catch(e=>{console.error(e);process.exitCode=1;});
}
