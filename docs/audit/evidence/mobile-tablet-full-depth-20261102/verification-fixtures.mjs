export function getMockUser(role) {
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

export const SALES_KPIS={date:'2026-11-01',totalSalesHalalas:1200000,branchCount:2,trendPct:4.5,totalCollectedHalalas:1200000,totalVarianceHalalas:0,varianceCaseCount:0,zeroVarianceBranchCount:2,varianceBranches:[]};
export const EXPENSE_KPIS={dateFrom:'2026-11-01',dateTo:'2026-11-01',statementCount:4,invoiceCount:12,totalHalalas:450000,preTaxHalalas:391304,vat15Halalas:58696,pendingStatementCount:1,pendingInvoices:{total:2,matched:1,mismatch:1,missing:0},verifiedInvoiceCount:10,unverifiedInvoiceCount:2,convertedInvoiceCount:0};
export async function installMocks(page,user,requests=[]) {
    await page.route("**/api/v1/**", async (route) => {
      const req = route.request();
      const url = req.url(); requests.push(new URL(url).pathname); if (!["GET","OPTIONS"].includes(req.method())) throw new Error("Unapproved mutation");
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
              { branchId: "b1", branchName: "[HARNESS] Branch [HARNESS] assab-ui-qa-20261018", date:"2026-11-01", state:{key:"empty",labelAr:"لا بيانات",subLabelAr:"",step:0},counts:{total:0,pending:0,approved:0,finalApproved:0,rejected:0,erpPosted:0},totalAmountHalalas:0 },
              { branchId: "b2", branchName: "فرع الياسمين", date:"2026-11-01", state:{key:"empty",labelAr:"لا بيانات",subLabelAr:"",step:0},counts:{total:0,pending:0,approved:0,finalApproved:0,rejected:0,erpPosted:0},totalAmountHalalas:0 },
            ],
          }),
        });
      }
      if (url.includes("/company/me/sales/kpis")) {
        return route.fulfill({ status: 200, headers, body: JSON.stringify(SALES_KPIS) });
      }
      if (url.includes("/company/me/expenses/kpis")) {
        return route.fulfill({ status: 200, headers, body: JSON.stringify(EXPENSE_KPIS) });
      }
      if (/\/company\/me\/reports(?:\?|$)/.test(url)) return route.fulfill({status:200,headers,body:JSON.stringify([])});
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

}
