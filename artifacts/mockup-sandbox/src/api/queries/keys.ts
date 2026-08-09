import type { ModuleKey, OperationStatus } from "../types";

/** Centralized query key factory. Use these for invalidation across hooks. */
export const queryKeys = {
  // Auth
  me: ["auth", "me"] as const,

  // Notifications
  notifications: (filter?: { unread?: boolean }) =>
    ["notifications", { filter }] as const,

  // Operations
  operations: (filter?: OperationsFilter) =>
    ["operations", { filter }] as const,
  operation: (id: string) => ["operations", id] as const,
  operationAudit: (id: string) => ["operations", id, "audit-trail"] as const,

  // Accountant dashboard
  accDashboard: ["accountant", "dashboard"] as const,

  // Sales recon / KPIs / day completeness
  salesKpis: (date?: string) => ["sales", "kpis", date ?? "today"] as const,
  dayCompleteness: (days?: number) =>
    ["sales", "day-completeness", days ?? 7] as const,

  // Pipeline daily rollup
  pipelineDailyRollup: (params?: Record<string, unknown>) =>
    ["pipeline", "daily-rollup", params ?? {}] as const,

  // Rejection reasons / operation enums catalogue
  rejectionReasons: (moduleKey?: string) =>
    ["lookups", "rejection-reasons", moduleKey ?? "all"] as const,
  operationEnums: ["lookups", "operation-enums"] as const,

  // Operation attachments
  operationAttachments: (operationId: string) =>
    ["operations", operationId, "attachments"] as const,

  // Expenses (T05)
  expenseInvoices: (filter?: ExpenseFilter) =>
    ["expense-invoices", { filter }] as const,
  expenseInvoiceAttachments: (id: string, invoiceIndex?: number) =>
    ["expense-invoices", id, "attachments", invoiceIndex ?? "all"] as const,
  expensesKpis: (params?: { dateFrom?: string; dateTo?: string }) =>
    ["expenses", "kpis", params ?? {}] as const,

  // Inventory
  inventoryBranches: (filter?: InventoryBranchesFilter) =>
    ["inventory", "branches", { filter }] as const,
  inventoryCatalog: ["inventory", "catalog"] as const,
  dailyInventoryList: (branchId: string) =>
    ["inventory", "daily-list", branchId] as const,

  // Waste
  waste: (filter?: WasteFilter) => ["waste", { filter }] as const,

  // Assets (T05)
  assets: (filter?: AssetFilter) => ["assets", { filter }] as const,
  assetDrafts: ["asset-drafts"] as const,
  assetEnums: ["lookups", "asset-enums"] as const,
  assetCategories: ["lookups", "asset-categories"] as const,

  // Purchases (T06)
  suppliers: (filter?: SuppliersFilter) => ["suppliers", { filter }] as const,
  purchaseReturns: (filter?: PurchaseReturnsFilter) =>
    ["purchases", "returns", { filter }] as const,
  purchaseEnums: ["lookups", "purchase-enums"] as const,

  // Shifts (T08)
  shiftsLive: ["shifts", "live"] as const,
  shifts: (filter?: ShiftFilter) => ["shifts", "history", { filter }] as const,
  shiftConfigs: ["shifts", "configs"] as const,

  // Employees (T09-A)
  employees: (filter?: EmployeeFilter) =>
    ["employees", { filter }] as const,
  employeeMovements: (employeeId: string, month?: string) =>
    ["employees", employeeId, "movements", month ?? "all"] as const,

  // Cash custody (T09-B)
  cashCustody: (filter?: CashFilter) =>
    ["cash-custody", { filter }] as const,
  cashTransactions: (custodyId: string, month?: string) =>
    ["cash-custody", custodyId, "transactions", month ?? "all"] as const,

  // Reminders
  reminders: ["accountant", "reminders"] as const,

  // Reports catalog
  reports: ["reports"] as const,

  // Lookups
  lookup: (type: LookupType, params?: Record<string, unknown>) =>
    ["lookups", type, params ?? {}] as const,

  // ─── Company Admin ──────────────────────────────────────────────────────────
  companyAdminDashboard: ["company-admin", "dashboard"] as const,

  // Subscription / plans
  subscription: ["subscription"] as const,
  plans: ["plans"] as const,

  // Users / invitations
  companyUsers: (filter?: CompanyUsersFilter) =>
    ["company-users", { filter }] as const,
  companyInvitations: ["company-invitations"] as const,

  // Organization
  companyBrands: ["company-brands"] as const,
  companyModules: ["company-modules"] as const,
  companySettings: ["company-settings"] as const,

  // ─── Billing ────────────────────────────────────────────────────────────────
  billingSummary: ["billing", "summary"] as const,
  billingInvoices: (filter?: BillingInvoicesFilter) =>
    ["billing", "invoices", { filter }] as const,
  billingInvoice: (id: string) => ["billing", "invoices", id] as const,
  paymentMethods: ["billing", "payment-methods"] as const,
  billingAddress: ["billing", "address"] as const,

  // ─── Support ────────────────────────────────────────────────────────────────
  supportChannels: ["support", "channels"] as const,
  supportTickets: (filter?: SupportTicketsFilter) =>
    ["support", "tickets", { filter }] as const,
  supportTicket: (id: string) => ["support", "tickets", id] as const,

  // ─── Head ───────────────────────────────────────────────────────────────────
  headDashboard: ["head", "dashboard"] as const,
  accountantsPerformance: ["head", "accountants-performance"] as const,
  headReminders: ["head", "reminders"] as const,
  erpPreflight: ["erp", "preflight"] as const,
  erpEligibleOperations: ["erp", "eligible-operations"] as const,
  erpBatches: ["erp", "batches"] as const,
  erpBatchStatus: (batchId: string) => ["erp", "batches", batchId, "status"] as const,

  // ─── Branch Manager ─────────────────────────────────────────────────────────
  branchOverview: ["branch", "overview"] as const,
  branchEmployees: ["branch", "employees"] as const,
  branchItems: ["branch", "items"] as const,
  branchPurchaseRequests: ["branch", "purchase-requests"] as const,
  branchSuppliers: ["branch", "suppliers"] as const,
  branchSettings: ["branch", "settings"] as const,
  branchActiveShift: ["branch", "shifts", "active"] as const,

  // ─── Procurement ────────────────────────────────────────────────────────────
  procurementOverview: ["procurement", "overview"] as const,
  procurementOrders: (filter?: ProcurementOrdersFilter) =>
    ["procurement", "orders", { filter }] as const,
  procurementGroupedOrders: ["procurement", "orders", "grouped"] as const,
  procurementSentOrders: ["procurement", "orders", "sent"] as const,
  procurementItems: ["procurement", "items"] as const,
  itemPriceHistory: (id: string) =>
    ["procurement", "items", id, "price-history"] as const,
  procurementSuppliers: ["procurement", "suppliers"] as const,
  procurementReports: ["procurement", "reports"] as const,

  // ─── Attachments ────────────────────────────────────────────────────────────
  attachment: (id: string) => ["attachments", id] as const,

  // ─── Cross-cutting ──────────────────────────────────────────────────────────
  search: (q: string, type?: string) => ["search", { q, type }] as const,
  auditLogs: (filter?: AuditLogsFilter) => ["audit-logs", { filter }] as const,

  // ═══════════════════════════════════════════════════════════════════════════
  // PLATFORM (ASAB) — distinct namespace from /company/me/* hooks above.
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Platform Admin (/api/v1/admin/*) ──────────────────────────────────────
  platformAdminOverview: ["platform", "admin", "overview"] as const,
  platformAdminCompanies: (filter?: AdminCompaniesFilter) =>
    ["platform", "admin", "companies", { filter }] as const,
  platformAdminCompany: (id: string) =>
    ["platform", "admin", "companies", id] as const,
  platformAdminCompanyModules: (id: string) =>
    ["platform", "admin", "companies", id, "modules"] as const,
  platformAdminCompanyUsage: (id: string) =>
    ["platform", "admin", "companies", id, "usage"] as const,
  platformAdminBrands: (filter?: AdminBrandsFilter) =>
    ["platform", "admin", "brands", { filter }] as const,
  platformAdminRestaurantSubs: ["platform", "admin", "restaurants", "subscriptions"] as const,
  platformAdminBranches: (filter?: AdminBranchesFilter) =>
    ["platform", "admin", "branches", { filter }] as const,
  platformAdminBranchRequests: (filter?: AdminBranchRequestsFilter) =>
    ["platform", "admin", "branch-requests", { filter }] as const,
  platformAdminUsers: (filter?: AdminUsersFilter) =>
    ["platform", "admin", "users", { filter }] as const,
  platformAdminDistribution: ["platform", "admin", "distribution"] as const,
  platformAdminSubscriptions: (filter?: AdminSubscriptionsFilter) =>
    ["platform", "admin", "subscriptions", { filter }] as const,
  platformAdminPermissions: ["platform", "admin", "permissions"] as const,
  platformAdminAuditLogs: (filter?: AdminAuditLogsFilter) =>
    ["platform", "admin", "audit-logs", { filter }] as const,
  platformAdminSettings: ["platform", "admin", "settings"] as const,
  platformAdminPackages: ["platform", "admin", "packages"] as const,
  platformAdminReportsCatalog: ["platform", "admin", "reports", "catalog"] as const,
  platformAdminBrandUploadStatus: (brandId: string) =>
    ["platform", "admin", "brands", brandId, "upload-status"] as const,

  // ─── Platform Head (/api/v1/head/*) ────────────────────────────────────────
  platformHeadDashboard: ["platform", "head", "dashboard"] as const,
  platformAccountantsPerformance: ["platform", "head", "accountants-performance"] as const,
  platformHeadReminders: ["platform", "head", "reminders"] as const,
  platformPendingOperations: (filter?: PlatformOpsFilter) =>
    ["platform", "operations", "pending", { filter }] as const,
  platformFinalApprovedOperations: (filter?: PlatformOpsFilter) =>
    ["platform", "operations", "final-approved", { filter }] as const,
  platformRejectedOperations: (filter?: PlatformOpsFilter) =>
    ["platform", "operations", "rejected", { filter }] as const,
  platformErpPreflight: ["platform", "erp", "preflight"] as const,
  platformErpEligibleOperations: (filter?: PlatformErpFilter) =>
    ["platform", "erp", "eligible-operations", { filter }] as const,
  platformErpBatches: (filter?: PlatformErpFilter) =>
    ["platform", "erp", "batches", { filter }] as const,
  platformErpBatchStatus: (batchId: string) =>
    ["platform", "erp", "batches", batchId, "status"] as const,
  platformReportsInternal: ["platform", "reports", "internal"] as const,
  platformReportsOwner: ["platform", "reports", "owner"] as const,

  // ─── Company head ERP preview (T10 §B5) ────────────────────────────────────
  erpPreview: (filter?: ErpPreviewFilter) => ["erp", "preview", { filter }] as const,

  // ─── Admin ERP (T10 §C — cross-company, /admin/erp/*) ──────────────────────
  adminErpSummary: ["platform", "admin", "erp", "summary"] as const,
  adminErpBatches: (filter?: AdminErpFilter) =>
    ["platform", "admin", "erp", "batches", { filter }] as const,

  // ─── Platform Accountant (/api/v1/accountant/*) ────────────────────────────
  platformAccountantDashboard: ["platform", "accountant", "dashboard"] as const,
  platformAccountantOperations: (filter?: PlatformAccountantOpsFilter) =>
    ["platform", "accountant", "operations", { filter }] as const,
  platformAssets: (filter?: PlatformAssetsFilter) =>
    ["platform", "accountant", "assets", { filter }] as const,
  platformAssetDrafts: ["platform", "accountant", "asset-drafts"] as const,
  platformInventory: (filter?: PlatformInventoryFilter) =>
    ["platform", "accountant", "inventory", { filter }] as const,
  platformInventoryCatalog: ["platform", "accountant", "inventory", "catalog"] as const,
  platformInventoryBrands: ["platform", "accountant", "inventory", "brands"] as const,
  platformInventoryBrandBranches: (brandId: string) =>
    ["platform", "accountant", "inventory", "brands", brandId, "branches"] as const,
  platformInventoryDailyList: (branchId: string) =>
    ["platform", "accountant", "inventory", "daily-list", branchId] as const,
  platformWaste: (filter?: PlatformWasteFilter) =>
    ["platform", "accountant", "waste", { filter }] as const,
  platformLiveShifts: ["platform", "accountant", "shifts", "live"] as const,
  platformHistoryShifts: (filter?: PlatformShiftsFilter) =>
    ["platform", "accountant", "shifts", "history", { filter }] as const,
  platformEmployees: (filter?: PlatformEmployeesFilter) =>
    ["platform", "accountant", "employees", { filter }] as const,
  platformEmployeeStatement: (id: string) =>
    ["platform", "accountant", "employees", id, "statement"] as const,
  platformCashCustody: (filter?: PlatformCashFilter) =>
    ["platform", "accountant", "cash-custody", { filter }] as const,
  platformCashTransactions: (id: string) =>
    ["platform", "accountant", "cash-custody", id, "transactions"] as const,
  platformReminders: ["platform", "reminders"] as const,
  platformReminderRules: ["platform", "reminders", "rules"] as const,

  // ─── Platform Branch (/api/v1/branch/*) ────────────────────────────────────
  platformBranchOverview: ["platform", "branch", "overview"] as const,
  platformBranchUploadStatus: ["platform", "branch", "upload", "status"] as const,
  platformBranchEmployees: ["platform", "branch", "employees"] as const,
  platformBranchInventoryItems: ["platform", "branch", "inventory-items"] as const,
  platformBranchSuppliers: ["platform", "branch", "suppliers"] as const,
  platformBranchSettings: ["platform", "branch", "settings"] as const,

  // ─── Platform Procurement (/api/v1/procurement/*) ──────────────────────────
  platformProcurementOverview: ["platform", "procurement", "overview"] as const,
  platformProcurementOrders: (filter?: PlatformProcurementOrdersFilter) =>
    ["platform", "procurement", "orders", { filter }] as const,
  platformProcurementOrder: (id: string) =>
    ["platform", "procurement", "orders", id] as const,
  platformProcurementSuppliers: ["platform", "procurement", "suppliers"] as const,
  platformProcurementItems: ["platform", "procurement", "items"] as const,
  // Purchase-orders bridge (real branch/mobile-app orders)
  platformPurchaseOrders: (filter?: PurchaseOrdersFilter) =>
    ["platform", "procurement", "purchase-orders", { filter }] as const,
  platformPurchaseOrder: (id: string) =>
    ["platform", "procurement", "purchase-orders", id] as const,
  platformPurchaseOrdersApprovedByMe: (filter?: PurchaseOrdersFilter) =>
    ["platform", "procurement", "purchase-orders", "approved-by-me", { filter }] as const,
  platformPurchaseOrdersGrouped: (by?: "supplier" | "city" | "item") =>
    ["platform", "procurement", "purchase-orders", "grouped", by ?? "supplier"] as const,
  platformPurchaseOrdersSent: ["platform", "procurement", "purchase-orders", "sent"] as const,
  platformPurchaseOrderGroup: (groupId: string) =>
    ["platform", "procurement", "purchase-orders", "groups", groupId] as const,

  // ─── Supplier (/api/v1/asab/supplier/*) ────────────────────────────────────
  supplierOverview: ["platform", "supplier", "overview"] as const,
  supplierOrders: (filter?: SupplierOrdersFilter) =>
    ["platform", "supplier", "orders", { filter }] as const,
  supplierReports: ["platform", "supplier", "reports"] as const,
  supplierItems: ["platform", "supplier", "items"] as const,
};

export type LookupType =
  | "brands"
  | "restaurants"
  | "branches"
  | "users"
  | "cities"
  | "asset-categories"
  | "inventory-categories"
  | "units"
  | "expense-categories"
  | "supplier-categories"
  | "modules";

export interface OperationsFilter {
  moduleKey?: ModuleKey | "all";
  status?: OperationStatus | "all";
  branchId?: string;
  brandId?: string;
  match?: "exact" | "review" | "diff" | "all";
  origin?: "mobile" | "procurement" | "system" | "all";
  /** Purchases (T06 §1). */
  supplierId?: string;
  source?: "supplier" | "branch" | "procurement" | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// ─── Purchases (T06) filters ─────────────────────────────────────────────────
export interface SuppliersFilter {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface PurchaseReturnsFilter {
  status?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ExpenseFilter {
  branchId?: string;
  verified?: boolean;
  search?: string;
  page?: number;
}

export interface InventoryBranchesFilter {
  type?: "monthly" | "daily";
  branchId?: string;
  date?: string;
  status?: "pending" | "confirmed" | "flagged" | "all";
}

export interface WasteFilter {
  branchId?: string;
  status?: OperationStatus | "all";
  dateFrom?: string;
  dateTo?: string;
}

export interface AssetFilter {
  search?: string;
  category?: string;
  status?: string;
  branchId?: string;
  /** Assignment state: pending = branch_id null (awaiting assignment). Default = all incl. pending. */
  assignment?: "pending" | "assigned" | "all";
  page?: number;
  pageSize?: number;
}

export interface ShiftFilter {
  branchId?: string;
  status?: "active" | "late" | "pending_review" | "closed" | "all";
  shiftType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface EmployeeFilter {
  branchId?: string;
  /** 2026-08-09 — resolves the brand's branches (incl. restaurant-linked). */
  brandId?: string;
  empNumber?: string;
  /** Name search (T09-A1). */
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CashFilter {
  branchId?: string;
  /** 2026-08-09 — resolves the brand's branches (incl. restaurant-linked). */
  brandId?: string;
  /** 2026-08-09 — live status filter (derived from balance server-side). */
  status?: "normal" | "low" | "critical" | string;
  /** Branch/custodian search (T09-B1). */
  q?: string;
  page?: number;
  pageSize?: number;
  /** Export format passthrough (xlsx|csv). */
  format?: "xlsx" | "csv";
}

export interface CompanyUsersFilter {
  role?: string;
  status?: "active" | "inactive" | "all";
  search?: string;
  branchId?: string;
}

export interface BillingInvoicesFilter {
  status?: "paid" | "open" | "overdue" | "void" | "all";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface SupportTicketsFilter {
  status?: "open" | "pending" | "resolved" | "closed" | "all";
  search?: string;
  page?: number;
}

export interface ProcurementOrdersFilter {
  status?: "draft" | "approved" | "rejected" | "sent" | "all";
  supplierId?: string;
  brandId?: string;
  branchId?: string;
  search?: string;
  page?: number;
}

export interface AuditLogsFilter {
  actorId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Platform (ASAB) filter typedefs
// ═══════════════════════════════════════════════════════════════════════════

export interface AdminCompaniesFilter {
  filter?: "all" | "Basic" | "Professional" | "Enterprise" | "trial" | "suspended";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminBrandsFilter {
  search?: string;
  plan?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminBranchesFilter {
  brandId?: string;
  restaurantId?: string;
  city?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// T14.1 — platform-admin branch-creation review queue.
export interface AdminBranchRequestsFilter {
  status?: "pending_review" | "approved" | "rejected" | "all";
  page?: number;
  pageSize?: number;
}

export interface AdminUsersFilter {
  search?: string;
  roleFilter?: string;
  brandFilter?: string;
  status?: "active" | "inactive" | "all";
  page?: number;
  pageSize?: number;
}

export interface AdminSubscriptionsFilter {
  status?: "active" | "warning" | "danger" | "expired" | "all";
  plan?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminAuditLogsFilter {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PlatformOpsFilter {
  page?: number;
  pageSize?: number;
  groupBy?: "module" | "accountant" | "flat";
  /** T10 §A3 — server-side accountant×module grouping for the pending queue. */
  view?: "grouped" | "flat";
  groupPreview?: number;
  accountantId?: string;
  brandId?: string;
  branchId?: string;
  moduleKey?: string;
  match?: "exact" | "review" | "diff";
  erpPosted?: boolean;
  search?: string;
  /** Top-bar period filter (inclusive, YYYY-MM-DD) — head operation lists accept these. */
  dateFrom?: string;
  dateTo?: string;
}

export interface PlatformErpFilter {
  moduleKey?: string;
  period?: "day" | "week" | "month" | "range";
  dateFrom?: string;
  dateTo?: string;
  restaurantId?: string;
  branchId?: string;
  status?: "approved" | "all" | "ready" | "exported" | "failed";
  page?: number;
  pageSize?: number;
}

// Company head ERP preview (T10 §B5).
export interface ErpPreviewFilter {
  moduleKey?: string;
  restaurantId?: string;
  branchId?: string;
  status?: string;
  periodType?: "today" | "week" | "month" | "custom";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// Admin cross-company ERP log (T10 §C).
export interface AdminErpFilter {
  companyId?: string;
  moduleKey?: string;
  status?: "ready" | "exported" | "failed" | "all";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PlatformAccountantOpsFilter {
  moduleKey?: ModuleKey | "all";
  branchId?: string;
  brandId?: string;
  status?: OperationStatus | "all";
  match?: "exact" | "review" | "diff";
  day?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PlatformAssetsFilter {
  viewMode?: "list" | "branch_report";
  status?: "pending_branch" | "pending_accountant" | "confirmed" | "all";
  category?: string;
  year?: string;
  branchId?: string;
  brandId?: string;
  search?: string;
}

export interface PlatformInventoryFilter {
  type?: "monthly" | "daily";
  branchId?: string;
  brandId?: string;
  search?: string;
}

export interface PlatformWasteFilter {
  branchId?: string;
  brandId?: string;
  status?: OperationStatus | "all";
  dateFrom?: string;
  dateTo?: string;
}

export interface PlatformShiftsFilter {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PlatformEmployeesFilter {
  empNumber?: string;
  branchId?: string;
  brandId?: string;
  active?: boolean;
  search?: string;
}

export interface PlatformCashFilter {
  branchId?: string;
  brandId?: string;
  status?: "active" | "settled" | "discrepancy" | "all";
  search?: string;
}

export interface PlatformProcurementOrdersFilter {
  status?: "pending" | "approved" | "rejected" | "sent" | "all";
  groupBy?: "branch" | "supplier";
  city?: string;
  supplierId?: string;
  urgency?: "عاجل" | "عادي";
  page?: number;
  pageSize?: number;
}

// Purchase-orders bridge list filter (guide §2.2).
export interface PurchaseOrdersFilter {
  // `incoming` = pending + emergency + variance (awaiting decision), or one exact status value.
  status?:
    | "incoming"
    | "pending"
    | "emergency"
    | "variance"
    | "confirmed"
    | "rejected"
    | "cancelled"
    | "cancelled_by_branch"
    | "cancelled_by_supplier"
    | "preparing"
    | "on_the_way"
    | "delivered"
    | "closed";
  branchId?: string;
  priority?: "high" | "normal";
  page?: number;
  pageSize?: number;
}

export interface SupplierOrdersFilter {
  status?: "pending" | "accepted" | "rejected" | "delivered" | "confirmed" | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}
