import pw from "../../../../e2e/node_modules/@playwright/test/index.js";
const { chromium } = pw;
import fs from "fs";
import path from "path";

const targetCases = [
  { surface: "ASABPrototype", role: "head", screen: "head-dashboard", lang: "ar", width: 390 },
  { surface: "ASABPrototype", role: "head", screen: "head-sales", lang: "ar", width: 390 },
  { surface: "ASABPrototype", role: "head", screen: "head-pending", lang: "ar", width: 820 },
  { surface: "ASABPrototype", role: "head", screen: "head-dashboard", lang: "en", width: 390 },
  { surface: "ASABPrototype", role: "head", screen: "head-sales", lang: "en", width: 390 },
  { surface: "ASABPrototype", role: "head", screen: "head-pending", lang: "en", width: 820 },
  { surface: "CompanyDashboard", role: "head", screen: "head-dashboard", lang: "ar", width: 390 },
  { surface: "CompanyDashboard", role: "head", screen: "head-dashboard", lang: "ar", width: 820 },
  { surface: "CompanyDashboard", role: "head", screen: "head-dashboard", lang: "ar", width: 1280 },
  { surface: "CompanyDashboard", role: "head", screen: "head-dashboard", lang: "en", width: 390 },
];

async function run() {
  console.log("=== Verifying 10 Delta Cases ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  let passCount = 0;
  let failCount = 0;
  const results = [];

  for (const c of targetCases) {
    const slug = c.surface === "ASABPrototype" ? "asab/ASABPrototype" : "asab/CompanyDashboard";
    const height = c.width >= 1024 ? 800 : c.width >= 768 ? 1024 : 844;
    const context = await browser.newContext({
      viewport: { width: c.width, height },
      locale: c.lang === "ar" ? "ar-SA" : "en-US",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    await page.addInitScript(({ slug, role, lang }) => {
      sessionStorage.setItem("asab.tokens", JSON.stringify({ accessToken: "mock-token", refreshToken: "mock-token" }));
      localStorage.setItem("asab_entry_selection", JSON.stringify({ slug, role }));
      localStorage.setItem("asab_site_lang", lang);
      localStorage.setItem("asab_lang", lang);
    }, { slug, role: c.role, lang: c.lang });

    // Mock API
    await page.route("**/api/v1/**", async (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "OPS-9001",
              status: "approved",
              moduleKey: "sales",
              moduleLabel: "المبيعات",
              branch: "[HARNESS] assab-ui-qa-20261018",
              brandName: "مجموعة التاج",
              amount: 15000,
              match: "exact",
              timeAgo: "منذ ساعتين",
              accountantName: "محاسب تجريبي",
            }
          ]
        })
      });
    });

    const url = `http://127.0.0.1:4173/#${c.screen}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(300);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const main = document.querySelector("main") || document.body;
      const hasDocOverflow = root.scrollWidth > root.clientWidth + 2;
      const hasMainOverflow = main.scrollWidth > main.clientWidth + 2;

      // Check branch clipping
      const branchEls = Array.from(document.querySelectorAll("span, p, div")).filter(el =>
        el.textContent && el.textContent.includes("[HARNESS] assab-ui-qa-20261018")
      );
      const isBranchTruncated = branchEls.some(el => {
        const text = el.textContent || "";
        return text.startsWith("...") || text.endsWith("...") || el.scrollWidth > el.clientWidth + 5;
      });

      return { hasDocOverflow, hasMainOverflow, isBranchTruncated };
    });

    const isPass = !metrics.hasDocOverflow && !metrics.isBranchTruncated;
    if (isPass) {
      passCount++;
      console.log(`[PASS] ${c.surface} -> ${c.role} -> ${c.screen} (${c.width}px ${c.lang}) | docOvf: ${metrics.hasDocOverflow} | branchClipped: ${metrics.isBranchTruncated}`);
    } else {
      failCount++;
      console.log(`[FAIL] ${c.surface} -> ${c.role} -> ${c.screen} (${c.width}px ${c.lang}) | docOvf: ${metrics.hasDocOverflow} | branchClipped: ${metrics.isBranchTruncated}`);
    }

    results.push({ ...c, ...metrics, status: isPass ? "PASS" : "FAIL" });
    await context.close();
  }

  await browser.close();
  console.log(`=== Delta Results: PASS=${passCount}, FAIL=${failCount} ===`);
  return { passCount, failCount, results };
}

run();
