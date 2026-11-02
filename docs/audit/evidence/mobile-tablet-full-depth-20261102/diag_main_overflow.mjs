import pw from "../../../../e2e/node_modules/@playwright/test/index.js";
const { chromium } = pw;

async function checkScreen(screen, role, surface, width) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, locale: "ar-SA" });
  const page = await ctx.newPage();

  const grant = {
    key: role,
    scope: role === "branch" ? "branch" : role === "accountant" ? "brand" : "all",
    brandIds: role === "accountant" ? ["11111111-1111-1111-1111-111111111111"] : [],
    restaurantIds: [],
    branchIds: role === "branch" ? ["22222222-2222-2222-2222-222222222222"] : [],
    moduleKeys: ["sales", "expenses", "purchases", "inventory", "shifts", "employees", "cash", "waste"],
  };
  const user = {
    id: "33333333-3333-3333-3333-333333333333",
    name: "مستخدم اختبار",
    email: `${role}@assab.test`,
    role,
    roles: [grant],
    companyId: "11111111-1111-1111-1111-111111111111",
    permissions: { "*": true },
  };

  const slug = surface === "ASABPrototype" ? "asab/ASABPrototype" : "asab/CompanyDashboard";
  await page.addInitScript(({ slug, role, user }) => {
    sessionStorage.setItem("asab.tokens", JSON.stringify({ accessToken: "mock-token", refreshToken: "mock-token" }));
    localStorage.setItem("asab_entry_selection", JSON.stringify({ slug, role }));
    localStorage.setItem("asab_site_lang", "ar");
    localStorage.setItem("asab_lang", "ar");
  }, { slug, role, user });

  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
    if (url.includes("/auth/me")) return route.fulfill({ status: 200, headers, body: JSON.stringify(user) });
    if (url.includes("/operations")) return route.fulfill({ status: 200, headers, body: JSON.stringify({ data: [], meta: { total: 0 } }) });
    if (url.includes("/company/me/cash-custody")) {
      return route.fulfill({ status: 200, headers, body: JSON.stringify({ data: [], meta: { kpis: { activeCustodies: 0, pendingRequests: 0, nearDepletion: 0 } } }) });
    }
    return route.fulfill({ status: 200, headers, body: JSON.stringify({ data: [] }) });
  });

  const url = `http://127.0.0.1:4173/?page=${screen}#/preview/${slug}`;
  await page.goto(url);
  await page.waitForTimeout(600);

  const diag = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return { error: "no main" };
    const root = document.documentElement;
    const overflowing = [];
    for (const el of main.querySelectorAll("*")) {
      if (el.scrollWidth > main.clientWidth + 2) {
        overflowing.push({
          tag: el.tagName,
          className: el.className?.slice ? el.className.slice(0, 50) : "",
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          parentTag: el.parentElement?.tagName,
          parentClass: el.parentElement?.className?.slice ? el.parentElement.className.slice(0, 50) : "",
          text: el.textContent?.slice(0, 25)
        });
      }
    }
    return {
      docScroll: root.scrollWidth,
      docClient: root.clientWidth,
      mainScroll: main.scrollWidth,
      mainClient: main.clientWidth,
      mainDiff: main.scrollWidth - main.clientWidth,
      overflowingCount: overflowing.length,
      top3: overflowing.slice(0, 3)
    };
  });

  console.log(`[${screen} ${width}px]`, JSON.stringify(diag, null, 2));
  await browser.close();
}

async function main() {
  await checkScreen("acc-purchases", "accountant", "ASABPrototype", 390);
  await checkScreen("acc-assets", "accountant", "ASABPrototype", 390);
  await checkScreen("admin-companies", "admin", "ASABPrototype", 390);
}

main();
