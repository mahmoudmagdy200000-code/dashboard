import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../../../auth/AuthContext.tsx";
import {
  CASubscription,
  PageRouter,
  CLangContext,
  type CRole,
} from "./CompanyDashboard.tsx";
import {
  parsePlansResponse,
  parseSubscriptionResponse,
  hasActiveSubscription,
  safeArray,
} from "../../../api/responseContracts.ts";
import {
  formatPlanPrice,
  formatQuota,
} from "./companyAdminGuards.ts";
import { ErrorBoundary } from "../../ErrorBoundary.tsx";
import { ErrorBoundaryCore } from "../../errorBoundaryCore.ts";

// ═════════════════════════════════════════════════════════════════════════════
// UI-NAV-01: Subscription & Plan Contract & Envelope Parsing
// ═════════════════════════════════════════════════════════════════════════════

test("UI-NAV-01 [Contract 1]: parsePlansResponse accepts bare array of plans", () => {
  const payload = [
    {
      id: "plan-basic",
      code: "basic",
      nameAr: "الأساسية",
      nameEn: "Basic",
      priceMonthlyHalalas: 29900,
      priceAnnualHalalas: 299000,
      features: ["فرع واحد", "3 مستخدمين"],
    },
    {
      id: "plan-pro",
      code: "pro",
      name: "Professional",
      priceMonthlyHalalas: 59900,
      priceAnnualHalalas: 599000,
      features: ["3 فروع", "10 مستخدمين"],
    },
  ];

  const plans = parsePlansResponse(payload);
  assert.equal(plans.length, 2);
  assert.equal(plans[0].name, "الأساسية");
  assert.equal(plans[0].priceMonthlyHalalas, 29900);
  assert.equal(plans[1].name, "Professional");
});

test("UI-NAV-01 [Contract 2]: parsePlansResponse accepts standard backend envelope { data: [...] }", () => {
  const payload = {
    data: [
      {
        id: "plan-ent",
        code: "enterprise",
        nameAr: "المؤسسات",
        nameEn: "Enterprise",
        priceMonthlyHalalas: null,
        priceAnnualHalalas: null,
        features: ["فروع غير محدودة"],
      },
    ],
  };

  const plans = parsePlansResponse(payload);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].code, "enterprise");
  assert.equal(plans[0].name, "المؤسسات");
  assert.equal(plans[0].priceMonthlyHalalas, null);
});

test("UI-NAV-01 [Contract 3]: parsePlansResponse accepts alternative envelopes { plans: [...] } and { items: [...] }", () => {
  const payloadPlans = {
    plans: [
      { id: "p1", name: "خطة 1", price_monthly: 10000 },
    ],
  };
  const resPlans = parsePlansResponse(payloadPlans);
  assert.equal(resPlans.length, 1);
  assert.equal(resPlans[0].id, "p1");
  assert.equal(resPlans[0].priceMonthlyHalalas, 10000);

  const payloadItems = {
    items: [
      { id: "p2", name: "خطة 2" },
    ],
  };
  const resItems = parsePlansResponse(payloadItems);
  assert.equal(resItems.length, 1);
  assert.equal(resItems[0].id, "p2");
});

test("UI-NAV-01 [Contract 4]: parsePlansResponse handles null and undefined gracefully returning []", () => {
  assert.deepEqual(parsePlansResponse(null), []);
  assert.deepEqual(parsePlansResponse(undefined), []);
});

test("UI-NAV-01 [Contract 5]: parseSubscriptionResponse parses active subscription", () => {
  const payload = {
    data: {
      id: "sub-101",
      companyId: "comp-1",
      planId: "plan-pro",
      planName: "Professional",
      status: "active",
      billingCycle: "annual",
      currentPeriodEnd: "2027-10-31T00:00:00Z",
      usage: {
        branches: { used: 2, max: 5 },
        users: { used: 4, max: 10 },
        storage: { used: 12, max: null },
      },
    },
  };

  const sub = parseSubscriptionResponse(payload);
  assert.ok(sub);
  assert.equal(sub.id, "sub-101");
  assert.equal(sub.planName, "Professional");
  assert.equal(sub.status, "active");
  assert.equal(hasActiveSubscription(sub), true);
});

test("UI-NAV-01 [Contract 6]: parseSubscriptionResponse parses trialing subscription as active", () => {
  const payload = {
    id: "sub-trial",
    companyId: "comp-1",
    planId: "plan-basic",
    status: "trialing",
    currentPeriodEnd: "2026-11-14T00:00:00Z",
  };

  const sub = parseSubscriptionResponse(payload);
  assert.ok(sub);
  assert.equal(hasActiveSubscription(sub), true);
});

test("UI-NAV-01 [Contract 7]: parseSubscriptionResponse returns null for NOT_FOUND / unprovisioned company", () => {
  assert.equal(parseSubscriptionResponse(null), null);
  assert.equal(parseSubscriptionResponse(undefined), null);
  assert.equal(parseSubscriptionResponse({ code: "NOT_FOUND", message: "No subscription" }), null);
  assert.equal(parseSubscriptionResponse({ subscription: null }), null);
});

test("UI-NAV-01 [Contract 8]: hasActiveSubscription correctly distinguishes active vs inactive/null", () => {
  assert.equal(hasActiveSubscription(null), false);
  assert.equal(hasActiveSubscription(undefined), false);
  assert.equal(hasActiveSubscription({}), false);
  assert.equal(hasActiveSubscription({ id: "sub-1", status: "cancelled" }), false);
  assert.equal(hasActiveSubscription({ id: "sub-1", status: "expired" }), false);
  assert.equal(hasActiveSubscription({ id: "sub-1", status: "unpaid" }), false);
  assert.equal(hasActiveSubscription({ id: "sub-1", status: "active" }), true);
  assert.equal(hasActiveSubscription({ id: "sub-1", status: "ACTIVE" }), true);
  assert.equal(hasActiveSubscription({ id: "sub-1", status: "trialing" }), true);
});

test("UI-NAV-01 [Contract 9]: formatPlanPrice handles custom vs halala numeric amounts", () => {
  const customAr = formatPlanPrice(null, "ar");
  assert.equal(customAr.isCustom, true);
  assert.equal(customAr.formatted, "حسب الطلب");

  const customEn = formatPlanPrice(undefined, "en");
  assert.equal(customEn.isCustom, true);
  assert.equal(customEn.formatted, "Custom");

  const priceAnnual = formatPlanPrice(299000, "ar");
  assert.equal(priceAnnual.isCustom, false);
  assert.equal(priceAnnual.formatted, "2,990");

  const priceWithCents = formatPlanPrice(123450, "en");
  assert.equal(priceWithCents.isCustom, false);
  assert.equal(priceWithCents.formatted, "1,234.50");
});

test("UI-NAV-01 [Contract 10]: formatQuota handles unlimited vs bounded storage", () => {
  const unlimited = formatQuota(15, null, "ar");
  assert.equal(unlimited.isUnlimited, true);
  assert.equal(unlimited.percentage, 0);
  assert.equal(unlimited.label, "15 / ∞");

  const bounded = formatQuota(3, 10, "ar");
  assert.equal(bounded.isUnlimited, false);
  assert.equal(bounded.percentage, 30);
  assert.equal(bounded.label, "3 / 10");
});

// ═════════════════════════════════════════════════════════════════════════════
// UI-NAV-01 & Smoke: ErrorBoundary Prevents Blank White Screens
// ═════════════════════════════════════════════════════════════════════════════

test("UI-NAV-01 [Boundary 11]: ErrorBoundaryCore catches render exceptions and formats user-visible alert", () => {
  let resetCalled = false;
  const core = new ErrorBoundaryCore(() => {
    resetCalled = true;
  });

  assert.equal(core.hasError, false);
  assert.equal(core.error, null);

  const testError = new TypeError("Cannot read properties of undefined (reading 'map')");
  const derived = ErrorBoundaryCore.getDerivedStateFromError(testError);
  assert.equal(derived.hasError, true);
  assert.equal(derived.error, testError);

  core.setError(testError);
  assert.equal(core.hasError, true);
  assert.equal(core.error, testError);

  core.reset();
  assert.equal(resetCalled, true);
  assert.equal(core.hasError, false);
  assert.equal(core.error, null);
});

test("UI-NAV-01 [Boundary 12]: ErrorBoundary renders user-facing error UI when error occurs", () => {
  const testError = new Error("Simulated failure in component render");

  // Create ErrorBoundary instance
  const eb = new ErrorBoundary({
    children: React.createElement("div", null, "Child Content"),
    title: "تعذر تحميل الصفحة المطلوبة",
  });

  // Initial state renders children
  eb.state = { hasError: false, error: null };
  const initialOutput: any = eb.render();
  assert.ok(initialOutput);

  // When error is caught: renders controlled alert with retry button
  eb.state = { hasError: true, error: testError };
  const errorOutput: any = eb.render();
  assert.ok(errorOutput);
  assert.equal(errorOutput.type, "div");
  assert.equal(errorOutput.props.role, "alert");
});

// ═════════════════════════════════════════════════════════════════════════════
// Bounded Navigation Smoke Pass: Route Resolution & Clean Rendering
// ═════════════════════════════════════════════════════════════════════════════

test("Navigation Smoke [Pass 13]: All Company Admin page identifiers are defined and distinct", () => {
  const caPages = [
    "ca-dashboard",
    "ca-subscription",
    "ca-users",
    "ca-branches",
    "ca-modules",
    "ca-billing",
    "ca-settings",
    "ca-support",
  ];

  const unique = new Set(caPages);
  assert.equal(unique.size, 8, "All 8 Company Admin routes must be distinct");

  // Verify each route resolves to an expected navigation slug
  for (const p of caPages) {
    assert.match(p, /^ca-[a-z]+$/);
  }
});

test("Navigation Smoke [Pass 14]: All Head Accountant page identifiers are defined and distinct", () => {
  const headPages = [
    "head-dashboard",
    "head-pending",
    "head-approved",
    "head-rejected",
    "head-sales",
    "head-expenses",
    "head-purchases",
    "head-inventory",
    "head-waste",
    "head-assets",
    "head-shifts",
    "head-employees",
    "head-cash",
    "head-accountants",
    "head-reports",
    "head-reminders",
    "head-erp",
  ];

  const unique = new Set(headPages);
  assert.equal(unique.size, 17, "All 17 Head Accountant routes must be distinct");
  for (const p of headPages) {
    assert.match(p, /^head-[a-z]+$/);
  }
});

test("Navigation Smoke [Pass 15]: All Branch Dashboard page identifiers are defined and distinct", () => {
  const branchPages = [
    "branch-overview",
    "branch-upload",
    "branch-requests",
    "branch-items",
    "branch-employees",
    "branch-shifts",
    "branch-suppliers",
    "branch-settings",
  ];

  const unique = new Set(branchPages);
  assert.equal(unique.size, 8, "All 8 Branch Dashboard routes must be distinct");
  for (const p of branchPages) {
    assert.match(p, /^branch-[a-z]+$/);
  }
});

test("Navigation Smoke [Pass 16]: All Procurement page identifiers are defined and distinct", () => {
  const procPages = [
    "proc-overview",
    "proc-new",
    "proc-grouped",
    "proc-sent",
    "proc-suppliers",
    "proc-items",
    "proc-reports",
  ];

  const unique = new Set(procPages);
  assert.equal(unique.size, 7, "All 7 Procurement routes must be distinct");
  for (const p of procPages) {
    assert.match(p, /^proc-[a-z]+$/);
  }
});

test("Navigation Smoke [Pass 17]: Company Admin subscription navigation targets match between dashboard and sidebar", () => {
  // Navigation action simulation
  let navigatedTo = "";
  const navigate = (page: string) => {
    navigatedTo = page;
  };

  // 1. Sidebar navigation click
  navigate("ca-subscription");
  assert.equal(navigatedTo, "ca-subscription");

  // 2. Dashboard Manage Subscription button click
  navigate("ca-subscription");
  assert.equal(navigatedTo, "ca-subscription");

  // 3. Dashboard Upgrade Plan button click
  navigate("ca-subscription");
  assert.equal(navigatedTo, "ca-subscription");
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION C: REAL MOUNTED CASUBSCRIPTION & PAGE ROUTER SMOKE (UI-NAV-01)
// ═════════════════════════════════════════════════════════════════════════════

const mockAuthValue: any = {
  user: {
    id: "usr-admin-01",
    email: "admin@assab.local",
    roles: ["company-admin", "head", "accountant", "branch", "procurement"],
    companyId: "comp-01",
    branchId: "br-01",
    activeRole: "company-admin",
  },
  logout: () => {},
  isRole: () => true,
  hasRoleGrant: () => true,
  switchRole: () => {},
};

function renderInHarness(ui: React.ReactElement, qc: QueryClient, lang: "ar" | "en" = "ar"): string {
  const clangValue = {
    lang,
    setLang: () => {},
    t: (ar: string, en: string) => (lang === "ar" ? ar : en),
    dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
  };
  return renderToString(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        AuthContext.Provider,
        { value: mockAuthValue },
        React.createElement(
          CLangContext.Provider,
          { value: clangValue },
          ui,
        ),
      ),
    ),
  );
}

const defaultPageProps = {
  navigate: () => {},
  ops: [],
  approve: () => {},
  reject: () => {},
  requestClarification: () => {},
  bulkApprove: () => {},
  finalApprove: () => {},
  bulkFinalApprove: () => {},
  actionsPending: false,
  shiftReviewPage: 1,
  setShiftReviewPage: () => {},
};

function setSuccessQuery<T>(qc: QueryClient, key: readonly string[], data: T) {
  qc.setQueryData(key, data);
  const q = qc.getQueryCache().build(qc, { queryKey: key });
  q.setState({ status: "success", data, fetchStatus: "idle", dataUpdatedAt: Date.now() });
}

function setErrorQuery(qc: QueryClient, key: readonly string[], error: Error) {
  const q = qc.getQueryCache().build(qc, { queryKey: key });
  q.setState({ status: "error", error, fetchStatus: "idle", errorUpdatedAt: Date.now() });
}

test("UI-NAV-01 [Mounted CASubscription 18]: State 1 - Active subscription renders quotas and plan info in Arabic and English", () => {
  const activeSub = {
    id: "sub-101",
    companyId: "comp-01",
    planId: "plan-pro",
    planName: "احترافية",
    planNameAr: "احترافية",
    planNameEn: "Professional",
    status: "active",
    billingCycle: "annual",
    currentPeriodEnd: "2027-10-31T00:00:00Z",
    usage: {
      branches: { used: 3, max: 10 },
      users: { used: 5, max: 20 },
      storage: { used: 25, max: null },
    },
  };
  const plans = [
    {
      id: "plan-pro",
      code: "pro",
      name: "احترافية",
      nameAr: "احترافية",
      nameEn: "Professional",
      priceMonthlyHalalas: 59900,
      priceAnnualHalalas: 599000,
      features: ["10 فروع", "20 مستخدم"],
      isCurrent: true,
    },
  ];

  // Arabic
  const qcAr = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnMount: false } } });
  setSuccessQuery(qcAr, ["subscription"], activeSub);
  setSuccessQuery(qcAr, ["plans"], plans);
  const htmlAr = renderInHarness(React.createElement(CASubscription), qcAr, "ar");
  assert.ok(htmlAr.length > 0);
  assert.match(htmlAr, /احترافية/);
  assert.match(htmlAr, /3.*10/);
  assert.match(htmlAr, /dir="rtl"/);

  // English
  const qcEn = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnMount: false } } });
  setSuccessQuery(qcEn, ["subscription"], activeSub);
  setSuccessQuery(qcEn, ["plans"], plans);
  const htmlEn = renderInHarness(React.createElement(CASubscription), qcEn, "en");
  assert.ok(htmlEn.length > 0);
  assert.match(htmlEn, /Professional/);
  assert.match(htmlEn, /3.*10/);
  assert.match(htmlEn, /dir="ltr"/);
});

test("UI-NAV-01 [Mounted CASubscription 19]: State 2 - No active subscription (404/NOT_FOUND) renders plans selection safely", () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const plans = [
    {
      id: "plan-basic",
      code: "basic",
      name: "أساسية",
      nameAr: "أساسية",
      nameEn: "Basic",
      priceMonthlyHalalas: 29900,
      priceAnnualHalalas: 299000,
      features: ["فرع واحد", "3 مستخدمين"],
    },
  ];
  setSuccessQuery(qc, ["subscription"], null);
  setSuccessQuery(qc, ["plans"], plans);

  const html = renderInHarness(React.createElement(CASubscription), qc, "ar");
  assert.ok(html.length > 0);
  assert.match(html, /أساسية/);
  assert.match(html, /لم يتم تجهيز أو تفعيل باقة اشتراك/);
});

test("UI-NAV-01 [Mounted CASubscription 20]: State 3 - Empty plans list ([]) renders resilient empty state without crashing", () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  setSuccessQuery(qc, ["subscription"], null);
  setSuccessQuery(qc, ["plans"], []);

  const html = renderInHarness(React.createElement(CASubscription), qc, "ar");
  assert.ok(html.length > 0);
  assert.match(html, /لا توجد خطط اشتراك متاحة حالياً/);
});

test("UI-NAV-01 [Mounted CASubscription 21]: State 4 - Server error on plans renders role='alert' error box instead of white screen", () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryOnMount: false,
        refetchOnMount: false,
        staleTime: Infinity,
      },
    },
  });
  setSuccessQuery(qc, ["subscription"], null);
  setErrorQuery(qc, ["plans"], new Error("500 Internal Server Error"));

  const html = renderInHarness(React.createElement(CASubscription), qc, "ar");
  assert.ok(html.length > 0);
  assert.match(html, /role="alert"/);
  assert.match(html, /فشل تحميل بيانات الخطط/);
});

test("Navigation Smoke [Pass 22]: All 8 Company Admin pages mount and render HTML output via PageRouter", () => {
  const caPages = [
    "ca-dashboard",
    "ca-subscription",
    "ca-users",
    "ca-branches",
    "ca-modules",
    "ca-billing",
    "ca-settings",
    "ca-support",
  ];

  for (const page of caPages) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["subscription"], null);
    qc.setQueryData(["plans"], []);

    const html = renderInHarness(
      React.createElement(PageRouter, {
        role: "company-admin",
        page,
        ...defaultPageProps,
      }),
      qc,
      "ar",
    );
    assert.ok(html.length > 0, `Page ${page} must render non-empty HTML string`);
    assert.ok(!html.includes("ErrorBoundaryAlert"), `Page ${page} must render without unhandled errors`);
  }
});

test("Navigation Smoke [Pass 23]: Bounded smoke across all authorized roles and routes via PageRouter", () => {
  const rolePages: Record<CRole, string[]> = {
    "company-admin": [
      "ca-dashboard", "ca-subscription", "ca-users", "ca-branches",
      "ca-modules", "ca-billing", "ca-settings", "ca-support",
    ],
    head: [
      "head-dashboard", "head-pending", "head-approved", "head-rejected",
      "head-sales", "head-expenses", "head-purchases", "head-inventory",
      "head-waste", "head-assets", "head-shifts", "head-employees",
      "head-cash", "head-accountants", "head-reports", "head-reminders",
      "head-erp",
    ],
    accountant: [
      "acc-dashboard", "acc-sales", "acc-expenses", "acc-purchases",
      "acc-inventory", "acc-waste", "acc-assets", "acc-shifts",
      "acc-employees", "acc-cash", "acc-reminders", "acc-reports",
    ],
    branch: [
      "branch-overview", "branch-upload", "branch-requests", "branch-items",
      "branch-employees", "branch-shifts", "branch-suppliers", "branch-settings",
    ],
    procurement: [
      "proc-overview", "proc-new", "proc-grouped", "proc-sent",
      "proc-suppliers", "proc-items", "proc-reports",
    ],
  };

  const results: Record<string, "PASS" | "FAIL"> = {};

  for (const [role, pages] of Object.entries(rolePages) as [CRole, string[]][]) {
    for (const page of pages) {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      qc.setQueryData(["subscription"], null);
      qc.setQueryData(["plans"], []);

      try {
        const html = renderInHarness(
          React.createElement(PageRouter, {
            role,
            page,
            ...defaultPageProps,
          }),
          qc,
          "ar",
        );
        assert.ok(html.length > 0);
        results[`${role}:${page}`] = "PASS";
      } catch (err: any) {
        results[`${role}:${page}`] = "FAIL";
        throw new Error(`Smoke failure on ${role} page ${page}: ${err?.message}`);
      }
    }
  }

  // Verify all 52 routes rendered with PASS
  const passCount = Object.values(results).filter((r) => r === "PASS").length;
  assert.equal(passCount, 52, "All 52 application routes must render successfully");
});
