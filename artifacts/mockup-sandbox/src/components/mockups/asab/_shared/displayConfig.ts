import type { Op, MatchStatus, OpStatus, ExceptionSeverity, PipelineStageId } from "./types";

export const EN_MATCH_CFG: Record<string, string> = {
  exact: "Matched", review: "Needs Review", diff: "Quantity Difference",
};

export const EN_STATUS_CFG: Record<string, string> = {
  "pending": "Pending", "approved": "Approved", "rejected": "Rejected",
  "final-approved": "Final Approved",
};

export const EN_PIPELINE: Record<string, { label: string; labelShort: string }> = {
  submit: { label: "Submitted from Branch", labelShort: "Submitted" },
  review: { label: "Under Review", labelShort: "Review" },
  approved: { label: "Approved", labelShort: "Approval" },
  final: { label: "Final Approved", labelShort: "Final" },
  erp: { label: "Posted to ERP", labelShort: "ERP" },
  reports: { label: "ERP Reports (Read)", labelShort: "Reports" },
};

export const EN_ORIGIN: Record<string, string> = {
  mobile: "Branch App", procurement: "Procurement Flow", system: "System Import",
};

export const MATCH_CFG: Record<MatchStatus, { label: string; cls: string; dot: string }> = {
  exact: { label: "متطابق", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  review: { label: "يحتاج مراجعة", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  diff: { label: "فرق في الكمية", cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

export const STATUS_CFG: Record<OpStatus, { label: string; cls: string }> = {
  "pending": { label: "معلق", cls: "bg-amber-50 text-amber-700" },
  "approved": { label: "موافق عليه", cls: "bg-blue-50 text-blue-700" },
  "rejected": { label: "مرفوض", cls: "bg-red-50 text-red-700" },
  "final-approved": { label: "معتمد نهائياً", cls: "bg-emerald-50 text-emerald-700" },
};

export const ORIGIN_CFG: Record<Op["origin"], { icon: string; label: string; cls: string }> = {
  "mobile": { icon: "📱", label: "تطبيق الفرع", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  "procurement": { icon: "🛒", label: "سير المشتريات", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  "system": { icon: "⚙", label: "استيراد النظام", cls: "bg-gray-50 text-gray-600 border-gray-200" },
};

export const PIPELINE_STAGES = [
  { id: "submit" as PipelineStageId, icon: "📱", label: "رُفع من الفرع", labelShort: "الرفع", color: "blue", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", fill: "bg-blue-500" },
  { id: "review" as PipelineStageId, icon: "🔍", label: "قيد المراجعة", labelShort: "المراجعة", color: "amber", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", fill: "bg-amber-500" },
  { id: "approved" as PipelineStageId, icon: "✓", label: "موافق عليه", labelShort: "الموافقة", color: "sky", bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-300", fill: "bg-sky-500" },
  { id: "final" as PipelineStageId, icon: "🔒", label: "معتمد نهائياً", labelShort: "الاعتماد", color: "emerald", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", fill: "bg-emerald-500" },
  { id: "erp" as PipelineStageId, icon: "🔗", label: "مُرحَّل لـ ERP", labelShort: "ERP", color: "indigo", bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300", fill: "bg-indigo-500" },
  { id: "reports" as PipelineStageId, icon: "📊", label: "تقارير ERP (قراءة)", labelShort: "التقارير", color: "slate", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", fill: "bg-slate-500" },
] as const;

export function getPipelineStage(op: Op): number {
  if (op.status === "rejected") return -1;
  if (op.erpPosted) return 4;
  if (op.status === "final-approved") return 3;
  if (op.status === "approved") return 2;
  return 1;
}

export function getPipelineLabel(op: Op): string {
  if (op.status === "rejected") return "مرفوض";
  const idx = getPipelineStage(op);
  return PIPELINE_STAGES[idx]?.label || "";
}

export const EN_SEV_LABEL: Record<string, string> = {
  critical: "Critical", high: "High", medium: "Medium",
};

export const EN_EXCEPTION_UI = {
  noExceptions: "No exceptions found — system running normally",
  panelTitle: "Exceptions Requiring Action",
  responsible: "Responsible",
  since: "Since",
  requiredAction: "Required Action",
  financialImpact: "Financial / Operational Impact",
  context: "Context",
  navigateCTA: "Navigate directly to affected records",
  collapse: "▲ Collapse",
  expand: "▼ Expand",
};

export const EN_EXCEPTION_ITEMS = {
  stuck: {
    label: "Entries pending for more than 2 days without review",
    ownerHead: "Assigned branch accountant",
    ownerAcc: "You — these are within your branches",
    action: "Open each pending entry and complete review or reject with clear reason",
    agePrefix: "Longest delay: ",
    ageSuffix: " — exceeded acceptable limit",
    impactSuffix: " SAR not entered approval cycle — blocks monthly consolidation",
    navLabelHead: "View Pending",
    navLabelAcc: "Open Module",
  },
  diffs: {
    label: "Quantity or price differences unresolved",
    ownerHead: "Assigned accountant — requires head accountant for complex cases",
    ownerAcc: "You — the difference requires your decision",
    action: "Review the difference, issue a corrective entry, or account for it and close the entry",
    impactSuffix: " SAR in entries with differences — cannot be consolidated until resolved",
    navLabel: "View Mismatched Entries",
  },
  pendingErp: {
    label: "Final-approved entries not yet posted to ERP",
    owner: "Head Accountant — has posting batch authority",
    action: "Go to ERP Export and create a posting batch for these entries",
    age: "Final-approved — awaiting batch",
    impactSuffix: " SAR missing from ERP — owner reports incomplete",
    navLabel: "Open ERP Export Page",
  },
  corrections: {
    label: "Corrective entries linked to previous entries awaiting review",
    ownerHead: "Accountant who issued the correction",
    ownerAcc: "You — this correction is linked to an entry you issued",
    action: "Review the corrective entry and verify corrected amounts before approving",
    impact: "Not approving the correction leaves the original balance incorrect in the accounting entry",
    navLabel: "Open Corrective Entries",
  },
  problemBranches: {
    label: "Branches showing repeated rejection patterns",
    ownerSuffix_head: "Head Accountant",
    ownerSuffix_acc: "You",
    ownerPrefix: "Branch Manager + ",
    action: "Contact the branch manager to identify the cause of recurring errors and correct upload methodology",
    age: "Recurring pattern — not an isolated incident",
    impactSuffix: " SAR in rejected entries — indicator of a structural problem",
    navLabel: "View Rejected",
  },
};

export const EXCEPTION_SEV_CFG: Record<ExceptionSeverity, { cls: string; barCls: string; dot: string; badgeCls: string; titleCls: string; label: string }> = {
  critical: { cls: "border-red-200 bg-red-50/60", barCls: "bg-red-500", dot: "bg-red-500", badgeCls: "bg-red-100 text-red-700 border-red-200", titleCls: "text-red-800", label: "حرج" },
  high: { cls: "border-amber-200 bg-amber-50/60", barCls: "bg-amber-500", dot: "bg-amber-500", badgeCls: "bg-amber-100 text-amber-700 border-amber-200", titleCls: "text-amber-800", label: "عالي" },
  medium: { cls: "border-sky-200 bg-sky-50/60", barCls: "bg-sky-400", dot: "bg-sky-400", badgeCls: "bg-sky-100 text-sky-700 border-sky-200", titleCls: "text-sky-800", label: "متوسط" },
};

export const OP_MODULE_LABELS: Record<string, string> = {
  sales: "مبيعات",
  expenses: "مصروفات",
  purchases: "مشتريات",
  inventory: "مخزون",
  shifts: "شفتات",
  employees: "كشف الحساب",
  cash: "عهدة نقدية",
  waste: "هالك",
};

export const EN_NAV_LABELS: Record<string, string> = {
  "acc-dashboard": "Dashboard", "acc-reminders": "Reminders", "acc-sales": "Sales",
  "acc-expenses": "Expenses", "acc-purchases": "Purchases", "acc-inventory": "Inventory",
  "acc-waste": "Waste & Spoilage", "acc-assets": "Fixed Assets",
  "acc-shifts": "Shift Management", "acc-employees": "Employee Accounts",
  "acc-cash": "Cash Custody", "acc-reports": "Reports",
  "head-dashboard": "Dashboard", "head-pending": "Pending Approval",
  "head-approved": "Final Approved", "head-rejected": "Rejected",
  "head-sales": "Sales", "head-expenses": "Expenses", "head-purchases": "Purchases",
  "head-inventory": "Inventory", "head-waste": "Waste & Spoilage",
  "head-assets": "Fixed Assets", "head-shifts": "Shifts",
  "head-employees": "Employee Accounts", "head-cash": "Cash Custody",
  "head-reminders": "Reminders", "head-accountants": "Accountant Performance",
  "head-erp": "ERP Export", "head-reports": "Reports",
  "admin-overview": "Overview", "admin-users": "Users",
  "admin-restaurants": "Restaurants & Branches", "admin-branch-requests": "Branch Requests", "admin-subscriptions": "Subscriptions",
  "admin-packages": "Packages",
  "admin-companies": "Company Subscriptions", "admin-permissions": "Permissions",
  "admin-reports": "Report Manager", "admin-audit": "Activity Log",
  "admin-erp": "ERP Export", "admin-settings": "System Settings",
  "branch-overview": "Overview", "branch-employees": "Employees",
  "branch-items": "Items", "branch-suppliers": "Suppliers",
  "branch-upload": "Upload Data", "branch-settings": "Branch Settings",
  "branch-requests": "Purchase Requests", "branch-shifts": "Branch Shifts",
  "proc-overview": "Dashboard", "proc-new": "New Orders",
  "proc-grouped": "Grouped Orders", "proc-sent": "Sent to Suppliers",
  "proc-items": "Items", "proc-suppliers": "Suppliers", "proc-reports": "Reports",
  "sup-overview": "Dashboard", "sup-new": "New Orders",
  "sup-accepted": "Accepted", "sup-rejected": "Rejected",
  "sup-items": "Items & Prices", "sup-reports": "Sales Reports",
  "pl": "P&L Statement",
  "sales-channel": "Sales Channel Analysis",
  "smart-compare": "Smart Comparisons",
  "profit-cash": "Profit-Cash Reconciliation",
  "breakeven": "Break-Even Analysis",
  "op-profit": "Operating Profitability",
  "menu-eng": "Menu Engineering",
};

export const EN_REPORT_SUBS: Record<string, string> = {
  "pl": "In-depth financial analysis — 3 levels",
  "sales-channel": "Comprehensive channel analysis with ratios",
  "smart-compare": "Monthly & cross-branch comparisons",
  "profit-cash": "Difference between your money and your profit",
  "breakeven": "Risk & financial safety analysis",
  "op-profit": "Performance KPIs and industry comparisons",
  "menu-eng": "Item performance KPIs and comparisons",
};
