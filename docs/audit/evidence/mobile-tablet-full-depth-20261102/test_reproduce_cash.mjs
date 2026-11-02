import pw from "../../../../e2e/node_modules/@playwright/test/index.js";
const { chromium } = pw;

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-SA" });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", err => {
    consoleErrors.push(err.message);
  });

  const grant = {
    key: "accountant",
    scope: "brand",
    brandIds: ["11111111-1111-1111-1111-111111111111"],
    restaurantIds: [],
    branchIds: [],
    moduleKeys: ["sales", "expenses", "purchases", "inventory", "shifts", "employees", "cash", "waste"],
  };
  const user = {
    id: "33333333-3333-3333-3333-333333333333",
    name: "محاسب تجريبي",
    email: "accountant@assab.test",
    role: "accountant",
    roles: [grant],
    companyId: "11111111-1111-1111-1111-111111111111",
    permissions: { "*": true },
  };

  await page.addInitScript(({ user }) => {
    sessionStorage.setItem("asab.tokens", JSON.stringify({ accessToken: "mock-token", refreshToken: "mock-token" }));
    localStorage.setItem("asab_entry_selection", JSON.stringify({ slug: "asab/ASABPrototype", role: "accountant" }));
    localStorage.setItem("asab_site_lang", "ar");
    localStorage.setItem("asab_lang", "ar");
  }, { user });

  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
    if (url.includes("/auth/me")) return route.fulfill({ status: 200, headers, body: JSON.stringify(user) });
    if (url.includes("/operations")) return route.fulfill({ status: 200, headers, body: JSON.stringify({ data: [], meta: { total: 0 } }) });
    if (url.includes("/company/me/cash-custody")) {
      // Simulating API response without meta.kpis
      return route.fulfill({ status: 200, headers, body: JSON.stringify({ data: [] }) });
    }
    return route.fulfill({ status: 200, headers, body: JSON.stringify({ data: [] }) });
  });

  await page.goto("http://127.0.0.1:4173/?page=acc-cash#/preview/asab/ASABPrototype");
  await page.waitForTimeout(1000);

  const diag = await page.evaluate(() => {
    const root = document.querySelector("#root");
    const h2 = document.querySelector("h2");
    const alerts = Array.from(document.querySelectorAll("[role='alert']")).map(a => a.textContent);
    const bodyText = document.body.innerText.slice(0, 300);
    return {
      title: h2 ? h2.textContent : null,
      alerts,
      bodyText,
    };
  });

  console.log("DIAG:", JSON.stringify(diag, null, 2));
  console.log("CONSOLE ERRORS:", consoleErrors);
  await browser.close();
}

run();
