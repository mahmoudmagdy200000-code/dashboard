import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
(globalThis as Record<string, unknown>).React = React;
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { formatPlanPrice, calculateBillingKpis } from "./companyAdminGuards.ts";
import { formatHalalasAmount } from "../../../api/money.ts";
import type { Operation as ApiOperation } from "../../../api/types/index.ts";
import { AuthContext } from "../../../auth/AuthContext.tsx";
import { LangContext, type Lang } from "./_shared/LangContext.tsx";
import { OpRow as SharedOpRow } from "./_shared/OpRow.tsx";
import { CLangContext, OpRow as CompanyOpRow } from "./CompanyDashboard.tsx";
import { apiOpToCOp } from "./operationMapping.ts";

test("DB-1: formatHalalasAmount preserves exact fractions for negative and fractional halalas", () => {
  assert.equal(formatHalalasAmount(-40, "en"), "-0.40");
  assert.equal(formatHalalasAmount(-150, "en"), "-1.50");
  assert.equal(formatHalalasAmount(1999, "en"), "19.99");
  assert.equal(formatHalalasAmount(0, "en"), "0.00");
  assert.equal(formatHalalasAmount(null, "en"), "—");
  assert.equal(formatHalalasAmount(undefined, "en"), "—");
});

test("DB-1: formatPlanPrice preserves fractional halalas and does not round 1999 to 20", () => {
  const r1 = formatPlanPrice(1999, "en");
  assert.equal(r1.formatted, "19.99");
  assert.equal(r1.isCustom, false);

  const r2 = formatPlanPrice(2000, "en");
  assert.equal(r2.formatted, "20");

  const r3 = formatPlanPrice(null, "en");
  assert.equal(r3.formatted, "Custom");
  assert.equal(r3.isCustom, true);
});

test("DB-1: calculateBillingKpis preserves exact halalas without Math.round truncation", () => {
  const kpis = calculateBillingKpis(
    [],
    { totalPaidHalalas: 1999, outstandingHalalas: 150 },
    null
  );
  assert.equal(kpis.totalPaid, 19.99);
  assert.equal(kpis.companyTotalDue, 1.5);
});

test("DB-1: OpRow (shared & company) renders exact halalas (e.g. 12345 -> 123.45 SAR) from API response without rounding", () => {
  const opRowSource = readFileSync(
    new URL("./_shared/OpRow.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    opRowSource,
    /Math\.round\(op\.salesBreakdown/,
    "OpRow must not use Math.round on salesBreakdown amounts"
  );

  // Simulate exact backend ApiOperation response with fractional halalas:
  // Gross: 500.00 SAR (50000), Cash: 123.45 SAR (12345), Card: 200.00 SAR (20000),
  // Apps: 53.10 SAR (5310), Collected: 376.55 SAR (37655), Variance: -123.45 SAR (-12345)
  const apiOp: ApiOperation = {
    id: "op-halalas-12345",
    publicId: "OPS-12345",
    moduleKey: "sales",
    branchId: "branch-1",
    branchName: "فرع التحلية",
    brandName: "برجر بيت",
    amountHalalas: 12345,
    status: "pending",
    match: "diff",
    origin: "mobile",
    operationDate: "2026-11-18",
    createdAt: "2026-11-18T10:00:00Z",
    attachmentCount: 0,
    submittedBy: { id: "u-1", name: "كاشير" },
    salesBreakdown: {
      totalSalesHalalas: 50000,
      cashHalalas: 12345,
      cardHalalas: 20000,
      appsHalalas: 5310,
      collectedHalalas: 37655,
      varianceHalalas: -12345,
    },
  };

  const langCtx = (lang: Lang) => ({
    lang,
    dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
    setLang: () => {},
    t: <T,>(ar: T, en: T): T => (lang === "ar" ? ar : en),
  });

  // 1. Verify _shared/OpRow.tsx in EN and AR
  const sharedOp = {
    id: apiOp.publicId,
    branch: apiOp.branchName,
    brandName: apiOp.brandName ?? "—",
    moduleKey: "sales" as const,
    moduleLabel: "مبيعات",
    amount: apiOp.amountHalalas! / 100, // 123.45
    timeAgo: "الآن",
    match: "diff" as const,
    attachments: 0,
    status: "pending" as const,
    origin: "mobile" as const,
    salesBreakdown: apiOp.salesBreakdown,
  };

  const sharedEnHtml = renderToStaticMarkup(
    React.createElement(
      LangContext.Provider,
      { value: langCtx("en") },
      React.createElement(SharedOpRow, { op: sharedOp })
    )
  );
  assert.match(sharedEnHtml, /123\.45 SAR/, "Shared OpRow EN must show exact 123.45 SAR");
  assert.match(sharedEnHtml, /200\.00/, "Shared OpRow EN must show exact card 200.00");
  assert.match(sharedEnHtml, /53\.10/, "Shared OpRow EN must show exact apps 53.10");
  assert.match(sharedEnHtml, /376\.55/, "Shared OpRow EN must show exact collected 376.55");
  assert.match(sharedEnHtml, /-123\.45/, "Shared OpRow EN must show exact negative variance -123.45");

  const sharedArHtml = renderToStaticMarkup(
    React.createElement(
      LangContext.Provider,
      { value: langCtx("ar") },
      React.createElement(SharedOpRow, { op: sharedOp })
    )
  );
  assert.match(sharedArHtml, /١٢٣٫٤٥/, "Shared OpRow AR must show exact ١٢٣٫٤٥");
  assert.match(sharedArHtml, /٣٧٦٫٥٥/, "Shared OpRow AR must show exact ٣٧٦٫٥٥");
  assert.match(sharedArHtml, /-١٢٣٫٤٥/, "Shared OpRow AR must show exact -١٢٣٫٤٥");

  // 2. Verify CompanyDashboard OpRow mapped via apiOpToCOp in EN and AR
  const mappedCOp = apiOpToCOp(apiOp);
  assert.equal(mappedCOp.amount, 123.45);
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  const authValue = {
    user: { id: "u-acc", name: "Acc", email: "acc@test", companyId: "c-1", roles: [{ key: "accountant" as const, scope: "all" as const, brandIds: [], restaurantIds: [], branchIds: [], moduleKeys: [] }], permissions: {} },
    initializing: false,
    loggingIn: false,
    defaultPage: "accountant",
    financialTransition: false,
    login: async () => { throw new Error("unused"); },
    loginWith2fa: async () => { throw new Error("unused"); },
    logout: async () => {},
    refreshMe: async () => {},
    hasPermission: () => true,
    isRole: (...r: string[]) => r.includes("accountant"),
  };

  const companyEnHtml = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        AuthContext.Provider,
        { value: authValue },
        React.createElement(
          CLangContext.Provider,
          { value: langCtx("en") },
          React.createElement(CompanyOpRow, {
            op: mappedCOp,
            onApprove: () => {},
            onReject: () => {},
            onView: () => {},
          })
        )
      )
    )
  );
  assert.match(companyEnHtml, /123\.45/, "CompanyDashboard OpRow EN must show exact 123.45");
  assert.match(companyEnHtml, /200\.00/, "CompanyDashboard OpRow EN must show exact card 200.00");
  assert.match(companyEnHtml, /53\.10/, "CompanyDashboard OpRow EN must show exact apps 53.10");
  assert.match(companyEnHtml, /376\.55/, "CompanyDashboard OpRow EN must show exact collected 376.55");
  assert.match(companyEnHtml, /-123\.45/, "CompanyDashboard OpRow EN must show exact -123.45");
  qc.clear();
});
