import pw from "../../../../e2e/node_modules/@playwright/test/index.js";
const { chromium } = pw;
import fs from "fs";
import path from "path";

const outDir = path.resolve("./artifacts/responsive-evidence/mobile-tablet-full-depth-20261102");
fs.mkdirSync(outDir, { recursive: true });

const rel = (p) => (p ? "responsive-evidence/mobile-tablet-full-depth-20261102/" + path.basename(p) : null);

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

const mockHeadUser = {
  id: "44444444-4444-4444-4444-444444444444",
  name: "رئيس الحسابات",
  email: "head@assab.local",
  role: "head",
  roles: [
    {
      key: "head",
      scope: "all",
      brandIds: [],
      restaurantIds: [],
      branchIds: [],
      moduleKeys: ["sales", "expenses", "purchases", "inventory", "shifts", "employees", "cash", "waste"],
    },
  ],
  companyId: "11111111-1111-1111-1111-111111111111",
  permissions: { "*": true },
};

const mockBranchUser = {
  id: "55555555-5555-5555-5555-555555555555",
  name: "مدير الفرع",
  email: "branch@assab.local",
  role: "branch",
  roles: [
    {
      key: "branch",
      scope: "branch",
      brandIds: [],
      restaurantIds: [],
      branchIds: ["22222222-2222-2222-2222-222222222222"],
      moduleKeys: [],
    },
  ],
  companyId: "11111111-1111-1111-1111-111111111111",
  permissions: { "*": true },
};

const mockProcUser = {
  id: "66666666-6666-6666-6666-666666666666",
  name: "مسؤول المشتريات",
  email: "proc@assab.local",
  role: "procurement",
  roles: [
    {
      key: "procurement",
      scope: "all",
      brandIds: [],
      restaurantIds: [],
      branchIds: [],
      moduleKeys: ["purchases"],
    },
  ],
  companyId: "11111111-1111-1111-1111-111111111111",
  permissions: { "*": true },
};

const mockAdminUser = {
  id: "77777777-7777-7777-7777-777777777777",
  name: "مدير المنظومة",
  email: "admin@assab.local",
  role: "admin",
  roles: [
    {
      key: "admin",
      scope: "all",
      brandIds: [],
      restaurantIds: [],
      branchIds: [],
      moduleKeys: [],
    },
  ],
  companyId: "11111111-1111-1111-1111-111111111111",
  permissions: { "*": true },
};

function getMockUserForRole(role) {
  if (role === "head") return mockHeadUser;
  if (role === "branch") return mockBranchUser;
  if (role === "procurement") return mockProcUser;
  if (role === "admin") return mockAdminUser;
  return mockUser;
}

const mockApiOps = [
  {
    id: "op-sales-04",
    publicId: "OPS-0004",
    refNum: "OPS-0004",
    branch: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018",
    branchName: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018",
    module: "sales",
    moduleKey: "sales",
    moduleLabel: "مبيعات",
    amount: 110.00,
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
    salesBreakdown: {
      cashHalalas: 6000,
      cardHalalas: 5000,
      appsHalalas: 0,
      collectedHalalas: 11000,
      varianceHalalas: 0,
    },
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
    amount: 50.00,
    amountHalalas: 5000,
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
    salesBreakdown: {
      cashHalalas: 3000,
      cardHalalas: 2000,
      appsHalalas: 0,
      collectedHalalas: 5000,
      varianceHalalas: 0,
    },
  },
  {
    id: "op-exp-02",
    publicId: "EXP-0002",
    refNum: "EXP-0002",
    branch: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018",
    branchName: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018",
    module: "expenses",
    moduleKey: "expenses",
    moduleLabel: "مصروفات",
    amount: 50.00,
    amountHalalas: 5000,
    createdAt: "2026-10-30T00:48:53+03:00",
    date: "2026-10-30T00:48:53+03:00",
    timeAgo: "منذ يومين",
    match: "exact",
    matchLabelAr: "متطابق",
    status: "pending",
    statusLabelAr: "قيد المراجعة",
    brandName: "مجموعة التاج",
    brandColor: "#7c3aed",
    submittedBy: "مسؤول الفرع",
    attachments: 1,
    invoices: [
      {
        index: 0,
        invNum: "INV-2026-001",
        vendor: "شركة التوريد العامة المحدودة",
        desc: "أدوات نظافة ومستهلكات ورقية للفرع",
        preTaxHalalas: 4348,
        vat15Halalas: 652,
        inclTaxHalalas: 5000,
        amount: 50.00,
        matchStatus: "match",
        matchIcon: "✓",
        matchLabelAr: "مطابق",
        verified: true,
        convertedToAsset: false,
        attachments: [],
        date: "2026-10-30",
      },
    ],
  },
];

const mockDailyRollup = {
  data: [
    {
      branchId: "b-01",
      branchName: "فرع الياسمين",
      date: "2026-11-02",
      state: { key: "empty", labelAr: "لا بيانات", subLabelAr: "لم يُرفع أي بيان" },
    },
    {
      branchId: "b-02",
      branchName: "[HARNESS] assab-ui-qa-20261018",
      date: "2026-11-02",
      state: { key: "empty", labelAr: "لا بيانات", subLabelAr: "لم يُرفع أي بيان" },
    },
  ],
  meta: { branchDays: 2 },
};

const mockExpenseDetail = {
  operation: mockApiOps[2],
  totals: {
    invoiceCount: 1,
    preTaxHalalas: 4348,
    vat15Halalas: 652,
    inclTaxHalalas: 5000,
  },
  matchSummary: { matched: 1, mismatch: 0, missing: 0 },
  verifiedCount: 1,
  allVerified: true,
  allVerifiedBadgeAr: "✅ كل الفواتير موثّقة",
  invoices: mockApiOps[2].invoices,
};

const widths = [320, 360, 390, 430, 768, 820, 1024, 1280];
const langs = ["ar", "en"];

const testScreens = [
  { slug: "asab/CompanyDashboard", role: "accountant", page: "acc-sales", title: "موديول المبيعات" },
  { slug: "asab/CompanyDashboard", role: "accountant", page: "acc-dashboard", title: "لوحة التحكم" },
  { slug: "asab/CompanyDashboard", role: "accountant", page: "acc-expenses", title: "موديول المصروفات" },
  { slug: "asab/CompanyDashboard", role: "accountant", page: "acc-purchases", title: "موديول المشتريات" },
  { slug: "asab/CompanyDashboard", role: "accountant", page: "acc-shifts", title: "إدارة الشفتات" },
  { slug: "asab/ASABPrototype", role: "accountant", page: "acc-sales", title: "المبيعات Prototype" },
  { slug: "asab/ASABPrototype", role: "accountant", page: "acc-expenses", title: "المصروفات Prototype" },
  { slug: "asab/ASABPrototype", role: "head", page: "head-pending", title: "بانتظار الاعتماد" },
];

async function main() {
  console.log("=== Launching Headless Chrome via Playwright ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const results = [];

  for (const sc of testScreens) {
    for (const lang of langs) {
      for (const width of widths) {
        const height = width >= 1024 ? 800 : width >= 768 ? 1024 : 844;
        const context = await browser.newContext({
          viewport: { width, height },
          locale: lang === "ar" ? "ar-SA" : "en-US",
          reducedMotion: "reduce",
        });
        const page = await context.newPage();

        await page.addInitScript(({ slug, role, lang }) => {
          sessionStorage.setItem("asab.tokens", JSON.stringify({ accessToken: "mock-token", refreshToken: "mock-token" }));
          localStorage.setItem("asab_entry_selection", JSON.stringify({ slug, role }));
          localStorage.setItem("asab_site_lang", lang);
          localStorage.setItem("asab_lang", lang);
        }, { slug: sc.slug, role: sc.role, lang });

        await page.route("**/api/v1/**", async (route) => {
          const url = route.request().url();
          const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
          if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
          if (url.includes("/auth/me")) return route.fulfill({ status: 200, headers, body: JSON.stringify(getMockUserForRole(sc.role)) });
          if (url.includes("/pipeline/daily-rollup")) return route.fulfill({ status: 200, headers, body: JSON.stringify(mockDailyRollup) });
          if (url.includes("/operations/op-exp-02")) return route.fulfill({ status: 200, headers, body: JSON.stringify(mockExpenseDetail) });
          if (url.includes("/operations")) return route.fulfill({ status: 200, headers, body: JSON.stringify({ data: mockApiOps, meta: { total: mockApiOps.length } }) });
          if (url.includes("/support/chat")) return route.fulfill({ status: 200, headers, body: JSON.stringify({ success: true, sessionId: null }) });
          return route.fulfill({ status: 200, headers, body: JSON.stringify({ success: true, data: [] }) });
        });

        const targetUrl = `http://127.0.0.1:4173/?page=${sc.page}#/preview/${sc.slug}`;
        let status = "PASS";
        let docOverflow = false;
        let mainOverflow = false;
        let chatCoveringBottom = false;
        let branchClipped = false;
        let moduleTitleTruncated = false;
        let topShotPath = null;
        let bottomShotPath = null;

        try {
          await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
          await page.waitForSelector("header, main", { timeout: 15000 });
          await page.waitForTimeout(300);

          // Top screenshot
          const topFileName = `${sc.slug.replace("/", "_")}_${sc.role}_${sc.page}_${lang}_${width}_top.png`;
          topShotPath = path.join(outDir, topFileName);
          await page.screenshot({ path: topShotPath });

          // Measure overflow and specific mobile metrics
          const metrics = await page.evaluate(() => {
            const root = document.documentElement;
            const main = document.querySelector("main") || document.body;
            const docScroll = root.scrollWidth;
            const vp = root.clientWidth;
            const mainScroll = main.scrollWidth;
            const mainClient = main.clientWidth;
            const hasDocOverflow = docScroll > vp + 2;
            const hasMainOverflow = mainScroll > mainClient + 2;

            // Check branch name truncation
            const branchEls = Array.from(document.querySelectorAll("span, p, div")).filter(el =>
              el.textContent && el.textContent.includes("[HARNESS] assab-ui-qa-20261018")
            );
            const isBranchTruncated = branchEls.some(el => {
              const text = el.textContent || "";
              return text.startsWith("...") || text.endsWith("...") || el.scrollWidth > el.clientWidth + 5;
            });

            // Check module tiles for "..." truncation
            const moduleTiles = Array.from(document.querySelectorAll("button")).filter(b =>
              b.querySelector(".text-lg") && b.querySelector(".text-xs")
            );
            const hasTruncatedModuleTitle = moduleTiles.some(t => {
              const labelDiv = t.querySelector(".text-xs");
              if (!labelDiv) return false;
              const text = labelDiv.textContent?.trim() || "";
              return text === "..." || text === "…";
            });

            return {
              hasDocOverflow,
              hasMainOverflow,
              docScroll,
              vp,
              mainScroll,
              mainClient,
              isBranchTruncated,
              hasTruncatedModuleTitle,
            };
          });

          docOverflow = metrics.hasDocOverflow;
          mainOverflow = metrics.hasMainOverflow;
          branchClipped = metrics.isBranchTruncated;
          moduleTitleTruncated = metrics.hasTruncatedModuleTitle;

          // Scroll to bottom and test LiveChat clearance
          await page.evaluate(() => {
            const main = document.querySelector("main");
            if (main) main.scrollTo({ top: main.scrollHeight, behavior: "instant" });
          });
          await page.waitForTimeout(100);

          // Check if floating livechat launcher overlaps bottom interactive elements
          const clearance = await page.evaluate(() => {
            const chatBtn = document.querySelector("button[aria-label*='الدردشة'], button[aria-label*='chat']");
            if (!chatBtn) return { hasOverlap: false, paddingBottom: 0 };
            const chatRect = chatBtn.getBoundingClientRect();
            const main = document.querySelector("main");
            const style = window.getComputedStyle(main || document.body);
            const pb = parseInt(style.paddingBottom || "0", 10);

            // Find last interactive element inside main
            const interactives = Array.from(main?.querySelectorAll("button, a, input, select") || []).filter(el => {
              return el !== chatBtn && !chatBtn.contains(el);
            });
            let hasOverlap = false;
            for (const el of interactives) {
              const r = el.getBoundingClientRect();
              // check if overlapping with chat button
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
            return { hasOverlap, paddingBottom: pb };
          });

          chatCoveringBottom = clearance.hasOverlap;

          // Bottom screenshot
          const bottomFileName = `${sc.slug.replace("/", "_")}_${sc.role}_${sc.page}_${lang}_${width}_bottom.png`;
          bottomShotPath = path.join(outDir, bottomFileName);
          await page.screenshot({ path: bottomShotPath });

          if (docOverflow || chatCoveringBottom || moduleTitleTruncated) {
            status = "FAIL";
          }
        } catch (err) {
          status = "ERROR: " + err.message;
        } finally {
          await context.close();
        }

        results.push({
          surface: sc.slug,
          role: sc.role,
          page: sc.page,
          lang,
          width,
          status,
          docOverflow,
          mainOverflow,
          chatCoveringBottom,
          branchClipped,
          moduleTitleTruncated,
          topScreenshot: rel(topShotPath),
          bottomScreenshot: rel(bottomShotPath),
        });

        console.log(`[${status}] ${sc.slug} ${sc.page} ${lang} ${width}px | docOvf: ${docOverflow} | chatOverlap: ${chatCoveringBottom} | modTrunc: ${moduleTitleTruncated}`);
      }
    }
  }

  await browser.close();

  const total = results.length;
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status !== "PASS").length;

  console.log("\n=================================");
  console.log(`TOTAL RUNS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================\n");

  const summary = {
    timestamp: new Date().toISOString(),
    total,
    passed,
    failed,
    passRate: `${Math.round((passed / total) * 100)}%`,
    results,
  };

  const metricsPath = path.join(outDir, "full_depth_metrics.json");
  fs.writeFileSync(metricsPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`Wrote full depth metrics to: ${metricsPath}`);
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
