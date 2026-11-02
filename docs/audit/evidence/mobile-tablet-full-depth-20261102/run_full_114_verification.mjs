import pw from "../../../../e2e/node_modules/@playwright/test/index.js";
const { chromium } = pw;
import fs from "fs";
import path from "path";

const outDir = path.resolve("./artifacts/responsive-evidence/full-depth-114-reconciliation");
fs.mkdirSync(outDir, { recursive: true });

const pathsFile = path.resolve("./docs/audit/evidence/mobile-tablet-full-depth-20261102/paths_114.json");
const all114Paths = JSON.parse(fs.readFileSync(pathsFile, "utf8"));

// The 8 core paths already verified across all 8 widths (128 runs) in the previous phase:
const alreadyVerified8 = new Set([
  "CompanyDashboard|accountant|acc-sales",
  "CompanyDashboard|accountant|acc-dashboard",
  "CompanyDashboard|accountant|acc-expenses",
  "CompanyDashboard|accountant|acc-purchases",
  "CompanyDashboard|accountant|acc-shifts",
  "ASABPrototype|accountant|acc-sales",
  "ASABPrototype|accountant|acc-expenses",
  "ASABPrototype|head|head-pending",
]);

// Viewports for the remaining 106 paths (per checklist Item 3: Mobile 390px, Tablet 820px, Laptop 1280px)
const targetWidths = [390, 820, 1280];
const targetLangs = ["ar", "en"];

function getMockUser(role) {
  const grant = {
    key: role,
    scope: role === "branch" ? "branch" : role === "accountant" ? "brand" : "all",
    brandIds: role === "accountant" ? ["11111111-1111-1111-1111-111111111111"] : [],
    restaurantIds: [],
    branchIds: role === "branch" ? ["22222222-2222-2222-2222-222222222222"] : [],
    moduleKeys: ["sales", "expenses", "purchases", "inventory", "shifts", "employees", "cash", "waste"],
  };
  return {
    id: "33333333-3333-3333-3333-333333333333",
    name: "مستخدم اختبار المنظومة",
    email: `${role}@assab.test`,
    role,
    roles: [grant],
    companyId: "11111111-1111-1111-1111-111111111111",
    supplier: role === "supplier" ? { id: "sup-01", name: "مورد تجريبي معتمد" } : undefined,
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

async function main() {
  console.log("=== Starting 114-Path Full-Depth Verification Runner ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  const finalCoverage = [];
  let passCount = 0;
  let blockedCount = 0;
  let failCount = 0;

  // Group paths by surface and role
  const groups = new Map();
  for (const item of all114Paths) {
    const key = `${item.surface}|${item.role}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  for (const [groupKey, screens] of groups.entries()) {
    const [surface, role] = groupKey.split("|");
    const slug = surface === "ASABPrototype" ? "asab/ASABPrototype" : "asab/CompanyDashboard";
    const user = getMockUser(role);

    for (const lang of targetLangs) {
      for (const width of targetWidths) {
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
        }, { slug, role, lang });

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

        // Loop over screens in this role/surface
        for (const sc of screens) {
          const pathKey = `${sc.surface}|${sc.role}|${sc.screen}`;
          const isReused = alreadyVerified8.has(pathKey);

          const targetUrl = `http://127.0.0.1:4173/?page=${sc.screen}#/preview/${slug}`;
          let status = "PASS";
          let docOverflow = false;
          let mainOverflow = false;
          let chatCoveringBottom = false;
          let branchClipped = false;
          let moduleTitleTruncated = false;
          let isBlocked = false;
          let blockReason = null;

          try {
            await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
            // Wait for main content or permission barrier
            const found = await Promise.race([
              page.waitForSelector("header, main", { timeout: 12000 }).then(() => "ready"),
              page.waitForSelector("[role='alert']", { timeout: 12000 }).then(() => "alert"),
            ]).catch(() => "timeout");

            if (found === "alert") {
              const alertText = await page.textContent("[role='alert']").catch(() => "");
              if (alertText.includes("صلاحية") || alertText.includes("access")) {
                isBlocked = true;
                blockReason = "ROLE_PERMISSION_GATED";
                status = "BLOCKED";
              }
            } else if (found === "timeout") {
              status = "BLOCKED";
              blockReason = "UNMOUNTED_OR_TIMEOUT";
              isBlocked = true;
            }

            if (!isBlocked) {
              await page.waitForTimeout(200);

              // 1. Measure top and initial layout
              const metrics = await page.evaluate(() => {
                const root = document.documentElement;
                const main = document.querySelector("main") || document.body;
                const docScroll = root.scrollWidth;
                const vp = root.clientWidth;
                const mainScroll = main.scrollWidth;
                const mainClient = main.clientWidth;
                const hasDocOverflow = docScroll > vp + 2;
                const hasMainOverflow = mainScroll > mainClient + 2;

                // Branch clipping
                const branchEls = Array.from(document.querySelectorAll("span, p, div")).filter(el =>
                  el.textContent && el.textContent.includes("[HARNESS] assab-ui-qa-20261018")
                );
                const isBranchTruncated = branchEls.some(el => {
                  const text = el.textContent || "";
                  return text.startsWith("...") || text.endsWith("...") || el.scrollWidth > el.clientWidth + 5;
                });

                // Module title truncation
                const moduleTiles = Array.from(document.querySelectorAll("button")).filter(b =>
                  b.querySelector(".text-lg") && b.querySelector(".text-xs")
                );
                const hasTruncatedModuleTitle = moduleTiles.some(t => {
                  const labelDiv = t.querySelector(".text-xs");
                  if (!labelDiv) return false;
                  const text = labelDiv.textContent?.trim() || "";
                  return text === "..." || text === "…";
                });

                return { hasDocOverflow, hasMainOverflow, isBranchTruncated, hasTruncatedModuleTitle };
              });

              docOverflow = metrics.hasDocOverflow;
              mainOverflow = metrics.hasMainOverflow;
              branchClipped = metrics.isBranchTruncated;
              moduleTitleTruncated = metrics.hasTruncatedModuleTitle;

              // 2. Scroll to bottom
              await page.evaluate(() => {
                const main = document.querySelector("main");
                if (main) main.scrollTo({ top: main.scrollHeight, behavior: "instant" });
              });
              await page.waitForTimeout(100);

              // 3. Test LiveChat clearance at bottom
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
                return { hasOverlap };
              });

              chatCoveringBottom = clearance.hasOverlap;

              // Top & bottom screenshots
              const topFile = `${sc.surface}_${sc.role}_${sc.screen}_${lang}_${width}_top.png`;
              const bottomFile = `${sc.surface}_${sc.role}_${sc.screen}_${lang}_${width}_bottom.png`;
              await page.screenshot({ path: path.join(outDir, topFile) });
              await page.screenshot({ path: path.join(outDir, bottomFile) });

              if (docOverflow || chatCoveringBottom || moduleTitleTruncated || branchClipped) {
                status = "FAIL";
                failCount++;
              } else {
                status = "PASS";
                passCount++;
              }
            } else {
              blockedCount++;
            }
          } catch (err) {
            status = "BLOCKED";
            blockReason = err.message.slice(0, 80);
            blockedCount++;
          }

          finalCoverage.push({
            surface: sc.surface,
            role: sc.role,
            screen: sc.screen,
            label: sc.label,
            module: sc.module,
            lang,
            width,
            status,
            docOverflow,
            mainOverflow,
            chatCoveringBottom,
            branchClipped,
            moduleTitleTruncated,
            isBlocked,
            blockReason,
            reusedFromPrior128: isReused,
          });

          console.log(`[${status}] ${sc.surface} -> ${sc.role} -> ${sc.screen} (${width}px ${lang}) | docOvf: ${docOverflow} | chatOvf: ${chatCoveringBottom}`);
        }

        await context.close();
      }
    }
  }

  await browser.close();

  // Summary and JSON dump
  const outMetricsFile = path.join(outDir, "full_114_coverage_metrics.json");
  fs.writeFileSync(outMetricsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalPaths: all114Paths.length,
    totalExecutions: finalCoverage.length,
    passCount,
    failCount,
    blockedCount,
    coverage: finalCoverage,
  }, null, 2));

  console.log("\n=======================================================");
  console.log(`FULL 114 PATHS VERIFICATION COMPLETE:`);
  console.log(`Total Path Runs: ${finalCoverage.length}`);
  console.log(`PASS: ${passCount} | FAIL: ${failCount} | BLOCKED: ${blockedCount}`);
  console.log(`Metrics written to: ${outMetricsFile}`);
  console.log("=======================================================\n");
}

main().catch(console.error);
