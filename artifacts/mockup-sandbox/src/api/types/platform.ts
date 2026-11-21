/**
 * Platform (ASAB) — domain types for the platform-tier endpoints under
 * `/api/v1/admin/*`, `/api/v1/head/*`, `/api/v1/accountant/*`, `/api/v1/branch/*`,
 * `/api/v1/procurement/*`, `/api/v1/asab/supplier/*`.
 *
 * Pragmatic: response shapes are pulled from BACKEND_API_SPEC.md §6 with
 * sensible defaults. Use `any` where the response shape is uncertain or
 * extensive — the goal is wired endpoints, not perfect types.
 */

// ─── Admin (platform tenant admin) ──────────────────────────────────────────
export interface PlatformAdminOverview {
  kpis: {
    brandCount: number;
    restaurantCount: number;
    branchCount: number;
    activeUserCount: number;
    brandsNeedingRenewal: number;
    uptime: string;
  };
  brandHierarchy: Array<{
    id: string;
    name: string;
    abbr?: string;
    color?: string;
    restaurantCount: number;
    branchCount: number;
    plan?: string;
    subStatus?: string;
    daysLeft?: number;
  }>;
  expiringBrands?: Array<Record<string, unknown>>;
  accountantsByRole?: Record<string, number>;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  brands?: string[];
  restaurants?: string[];
  branches?: string[];
  modules?: string[];
  // BREAKING (2026-07-17): reads return an object; writes must send the head's
  // userId as a plain string. Keep both shapes so list + form can share the type.
  reportsTo?: string | { id: string; name: string } | null;
  companyId?: string | null;
  supplierId?: string | null;
  scope?: "all" | "brand" | "restaurant" | "branch";
  status: "active" | "inactive";
  createdAt?: string;
}

export interface AdminCompany {
  id: string;
  name: string;
  logo?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  city?: string;
  plan?: "Basic" | "Professional" | "Enterprise" | string;
  status?: "active" | "suspended" | "trial" | string;
  modules?: string[];
  adminEmail?: string;
  maxUsers?: number | null;
  maxBranches?: number | null;
  createdAt?: string;
  [k: string]: unknown;
}

export interface AdminBrand {
  id: string;
  name: string;
  abbr?: string;
  color?: string;
  owner?: string;
  ownerEmail?: string;
  /** B-A6: id of the brand-owner user created/linked on create. null when no ownerEmail. */
  ownerUserId?: string | null;
  /** B-A6: whether the temp-password / link email actually went out. */
  emailSent?: boolean;
  plan?: string;
  modules?: string[];
  /** BUG-1: fixed catalog of 9; empty `modules` = full set, so this is 9 there. Prefer over modules.length. */
  moduleCount?: number;
  subStatus?: string;
  daysLeft?: number;
  companyId?: string;
  status?: string;
  restaurants?: AdminRestaurant[];
  /** 2026-07-27: linked/unlinked branch tallies straight from the brand tree. */
  branchCounts?: { linked: number; unlinked: number };
  /** Branches attributed to this brand but not yet under a restaurant. */
  unlinkedBranches?: { id: string; name: string; city?: string }[];
}

/** A branch candidate for linking (GET /admin/brands/{id}/branches?linked=false). */
export interface AdminUnlinkedBranch {
  id: string;
  name: string;
  city?: string | null;
  restaurantId?: string | null;
  restaurantName?: string | null;
  brandId?: string | null;
  companyId?: string | null;
  manager?: string | null;
  status?: string;
  /** "brand" = brand known, restaurant missing · "orphan" = no linkage at all. */
  linkage?: "brand" | "orphan" | string;
}

export interface AdminUnlinkedBranchesResponse {
  data: AdminUnlinkedBranch[];
  meta: {
    brandId: string;
    linked: string;
    total: number;
    restaurants: { id: string; name: string }[];
  };
}

export interface AdminRestaurant {
  id: string;
  brandId: string;
  companyId?: string;
  name: string;
  city?: string;
  status?: "active" | "suspended" | string;
  /** BUG-2: real accountant count (brand-derived). Present in the brand tree. */
  accountants?: number;
  /** BUG-2: same count on the restaurant object returned by create/update. */
  accountantCount?: number;
  branches?: AdminBranch[];
}

export interface AdminBranch {
  id: string;
  restaurantId: string;
  name: string;
  manager?: string;
  managerUserId?: string;
  city?: string;
  address?: string;
  phone?: string;
  // T14.1 — branch-request review workflow (also returned by the admin queue).
  status?: string;
  reviewStatus?: "pending_review" | "approved" | "rejected";
  reviewNote?: string;
  companyName?: string;
  brandName?: string;
  restaurantName?: string;
  createdAt?: string;
}

export interface AdminRestaurantSubscription {
  id: string;
  restaurantId: string;
  restaurantName: string;
  brandId?: string;
  brandName?: string;
  plan: string;
  status: "active" | "warning" | "danger" | "expired" | string;
  expiresAt: string;
  /** 2026-08-03: display-ready YYYY-MM-DD alongside the raw ISO `expiresAt`. */
  expiresAtDate?: string;
  daysLeft: number;
  /** 2026-08-03: computed from expires_at at read time — prefer over daysLeft<0. */
  isExpired?: boolean;
  monthlyPrice: number;
  autoRenew: boolean;
  reminderEnabled: boolean;
}

export interface AdminSubscription {
  id: string;
  brandId?: string;
  brandName?: string;
  plan: string;
  status: string;
  expiresAt?: string;
  /** 2026-08-03: display-ready YYYY-MM-DD alongside the raw ISO `expiresAt`. */
  expiresAtDate?: string;
  /** 2026-08-03: recomputed at read time (was a stale stored column). */
  daysLeft?: number;
  /** 2026-08-03: computed from expires_at at read time — prefer over daysLeft<0. */
  isExpired?: boolean;
  monthlyPrice?: number;
  autoRenew?: boolean;
  reminderEnabled?: boolean;
}

export interface AdminDistribution {
  heads: Array<{
    id: string;
    name: string;
    avatar?: string;
    color?: string;
    accountantCount: number;
    restaurantCount: number;
  }>;
  accountants: Array<{
    id: string;
    name: string;
    avatar?: string;
    headId: string;
    restaurants: string[];
    /** BUG-4: id+name pairs for display (was ids only → "zero restaurants"). */
    restaurantsNamed?: Array<{ id: string; name: string }>;
  }>;
  allRestaurants: string[];
  assignedRestaurants: string[];
  freeRestaurants: string[];
  accModules: Record<string, Record<string, string[]>>;
  /** BUG-4: id → name map so any restaurant id in the payload resolves to a name. */
  restaurantNames?: Record<string, string>;
}

export type AdminPermission =
  | "view"
  | "submit"
  | "review"
  | "approve"
  | "final"
  | "none";

export interface AdminPermissionsMatrix {
  matrix: Array<{ module: string; perms: AdminPermission[] }>;
  roles: string[];
  legend: Record<AdminPermission, { labelAr: string; labelEn: string }>;
}

export interface AdminAuditLogEntry {
  id: string;
  action: string;
  actorName?: string;
  actorRole?: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  ip?: string;
  occurredAt: string;
  before?: unknown;
  after?: unknown;
}

export interface AdminSettings {
  // Authoritative field names confirmed by backend (B4).
  notifications?: {
    approvalNotifications?: boolean;
    subscriptionAlerts?: boolean;
    dailyPerformanceReports?: boolean;
  } & Record<string, unknown>;
  backup?: {
    dailyAutoBackup?: boolean;
    weeklyBackup?: boolean;
    dataEncryption?: boolean;
  } & Record<string, unknown>;
  api?: {
    erpConnection?: boolean;
    paymentGatewayConnection?: boolean;
    mobileAppInterface?: boolean;
  } & Record<string, unknown>;
  security?: {
    twoFactorAuthRequired?: boolean;
    sessionDurationMinutes?: number;
    passwordPolicyEnabled?: boolean;
  } & Record<string, unknown>;
  [k: string]: unknown;
}

export interface AdminReportItem {
  key: string;
  label: string;
  description?: string;
  category?: string;
}

export type AdminBrandUploadType =
  | "sales-items"
  | "raw-materials"
  | "suppliers"
  | "employees"
  | "fixed-assets";

/** One row of the per-owner upload progress list. */
export interface AdminUploadRow {
  type: AdminBrandUploadType;
  status: "done" | "failed" | "queued" | "processing";
  progressPct?: number;
  parsedRows?: number;
  failedRows?: number;
  failureReason?: string | null;
  startedAt?: string;
  finishedAt?: string;
}

export interface AdminBrandUploadStatus {
  uploads?: AdminUploadRow[];
  // The screen offers THREE shared catalog cards. As of 2026-08-03 `fixedAssets`
  // moved OUT of `shared` (assets upload per branch) to a top-level
  // `brandFixedAssets`, so «بيانات مشتركة» is 3/3 again. Kept optional here for
  // back-compat with older four-key payloads.
  shared?: {
    sales?: boolean;
    materials?: boolean;
    suppliers?: boolean;
    fixedAssets?: boolean;
  };
  /** 2026-08-03: fixed-assets state, moved out of `shared`. */
  brandFixedAssets?: boolean;
  /**
   * 2026-08-03: one block that feeds every «ملخص رفع البيانات» tile directly,
   * so the cards no longer derive their own (previously wrong 3/4 · 75%) counts.
   */
  summary?: {
    shared?: { done: number; total: number };
    branchAssets?: { done: number; total: number };
    restaurantEmployees?: { done: number; total: number };
    completionPct?: number;
  };
  completionPct?: number;
  // legacy/compat — older payloads keyed progress per restaurant/branch
  employees?: Record<string, boolean>;
  assets?: Record<string, boolean>;
}

/** GET /admin/branches/{id}/upload-status — per-branch fixed-assets state. */
export interface AdminBranchUploadStatus {
  branchId?: string;
  uploads?: AdminUploadRow[];
  fixedAssets?: boolean;
  completionPct?: number;
}

/** GET /admin/restaurants/{id}/upload-status — per-restaurant employees state. */
export interface AdminRestaurantUploadStatus {
  restaurantId?: string;
  uploads?: AdminUploadRow[];
  employees?: boolean;
  completionPct?: number;
}

/** One branch row from GET /admin/brands/{id}/branches/upload-status. */
export interface AdminBranchFixedAssetsRow {
  branchId?: string;
  branchName?: string;
  restaurantId?: string;
  /** Tri-state so a failed upload is distinguishable from a never-uploaded one. */
  fixedAssetsStatus?: "done" | "failed" | "not_uploaded";
  fixedAssetsCount?: number;
  fixedAssetsFailureReason?: string | null;
  /** 2026-08-04: per-branch employees column, mirrors the fixed-assets one. */
  employees?: boolean;
  employeesStatus?: "done" | "failed" | "not_uploaded";
  employeesCount?: number;
  employeesFailureReason?: string | null;
  reason?: string | null;
}

/** GET /admin/brands/{id}/branches/upload-status — the whole fixed-assets column in one call. */
export interface AdminBrandBranchesUploadStatus {
  brandId?: string;
  branches?: AdminBranchFixedAssetsRow[];
}

/** One restaurant row in the accountant module matrix. */
export interface AdminAccountantModuleRow {
  id: string;
  name?: string;
  modules?: string[];
}

/**
 * GET /admin/accountants/{id}/modules — per-restaurant module matrix, named.
 * `reason: "NO_COVERED_RESTAURANTS"` means the accountant isn't assigned to any brand yet.
 */
export interface AdminAccountantModulesResponse {
  accountantId?: string;
  accountantName?: string;
  brandName?: string;
  restaurants?: AdminAccountantModuleRow[];
  moduleCatalog?: Array<{ key: string; labelAr?: string; labelEn?: string }>;
  availableModules?: string[];
  reason?: string | null;
}

/** Shared result shape for every admin upload endpoint. */
export interface AdminUploadResult {
  uploadId?: string;
  rowsImported?: number;
  uploadedCount?: number;
  employeeCount?: number;
  assetCount?: number;
  /** raw-materials: how many branches got the catalog seeded. */
  branchesSeeded?: number;
  /** e.g. "NO_BRANCHES_LINKED" — uploaded OK but nothing shows in the app. */
  warnings?: string[];
  status?: "done" | "failed" | "queued" | "processing";
  errors?: Array<{ row: number; message: string }>;
}

// ─── Head (platform) ────────────────────────────────────────────────────────
export interface PlatformHeadDashboard {
  kpis: {
    // T10 §A1 canonical KPI keys.
    awaiting?: number;
    finalApproved?: number;
    erpPosted?: number;
    rejected?: number;
    accountantsActive?: { active: number; total: number };
    performanceRatePct?: number;
    totalReviewedThisMonth?: number;
    avgReviewTimeMinutes?: number;
    vsLastMonthDeltaPct?: number;
    // Legacy aliases kept for back-compat.
    awaitingApproval?: number;
    finalApprovedAwaitingErp?: number;
    performanceRate?: number;
    totalApprovedThisMonth?: number;
    totalRejectedThisMonth?: number;
  };
  weeklyPerformance?: Array<{
    day: string;
    dayAr?: string;
    thisWeek: number;
    lastWeek: number;
  }>;
  branchesCount?: number;
  moduleAggregation?: Array<{
    moduleKey: string;
    pending?: number;
    approved?: number;
    final?: number;
    rejected?: number;
    erp?: number;
    total?: number;
    totalAmount?: number;
    recentOperations?: Array<{
      id: string;
      branch: string;
      status: "pending" | "approved" | "final-approved" | "rejected";
      amountHalalas: number;
      operationDate?: string | null;
      erpPosted: boolean;
    }>;
    label?: string;
    icon?: string;
    state?: string;
    counts?: { pending: number; approved: number; final: number; erp: number };
  }>;
  pipeline?: Array<{ stageId: string; count: number }>;
  // T10 §A1 — real per-brand month performance vs target.
  brandPerformance?: Array<{
    brandId: string;
    name: string;
    abbr?: string;
    color?: string;
    salesHalalas: number;
    expensesHalalas: number;
    netHalalas: number;
    pctOfTarget: number;
  }>;
  // Company surface extras (T10 §A1).
  pipelineCounts?: Record<string, number>;
  monthlySalesHalalas?: number;
  salesDeltaPct?: number;
  awaitingFinalApprovalPreview?: unknown[];
  exceptions?: unknown[];
}

// ─── ERP batches (T10 §B) ─────────────────────────────────────────────────────
// Status enum: ready «جاهز للتصدير» · exported «تم التصدير» · failed «فشل».
// Legacy rows may read `success` → treat as exported. Never hardcode `success`.
export type ErpBatchStatus = "ready" | "exported" | "failed" | "success" | string;

export interface ErpBatchRow {
  id: string;
  batchId: string;
  moduleKey?: string;
  status: ErpBatchStatus;
  statusLabelAr?: string;
  operationCount: number;
  totalAmount: number;
  branchCount?: number;
  readyAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  companyId?: string;
}

export interface ErpExportResult {
  batches: ErpBatchRow[];
  count: number;
  totalAmountHalalas: number;
  // Top-level back-compat mirror of the first batch.
  id?: string;
  batchId?: string;
  status?: ErpBatchStatus;
  createdAt?: string;
}

// ─── Admin ERP (T10 §C — cross-company) ───────────────────────────────────────
export interface AdminErpSummary {
  connection: {
    ok: boolean;
    label: string;
    lastExportAt?: string | null;
    lastExportCount?: number;
  };
  kpis: {
    ready: number;
    exportedToday: number;
    awaitingHead: number;
    failed: number;
  };
}

export interface AdminErpExportResult {
  exported: string[];
  failed: Array<{ batchId?: string; id?: string; code?: string }>;
  count: number;
}

export interface PlatformAccountantPerformanceRow {
  id: string;
  name: string;
  // Legacy fields (kept for back-compat with existing UI render paths):
  branchesCount?: number;
  reviewedCount?: number;
  approvedCount?: number;
  pendingCount?: number;
  rate?: number;
  prevMonthRate?: number;
  rating?: number;
  avgReviewTimeMinutes?: number;
  level?: string;
  recentActivities?: Array<{ text: string; timeAgo: string; module: string }>;
  // Enriched fields (post-MISSING_ENDPOINTS_SPEC):
  branchesAssignedCount?: number;
  approvalRatePct?: number;
  previousMonthRatePct?: number;
  avgReviewMinutes?: number;
  levelLabelAr?: string;
}

export interface PlatformHeadReminder {
  id: string;
  type: string;
  title: string;
  body?: string;
  priority?: string;
  refType?: string;
  refId?: string;
  done: boolean;
  dueAt?: string;
  createdAt: string;
}

export interface PlatformErpPreflight {
  checks: Array<{ ok: boolean; label: string; severity: "info" | "warning" | "error" }>;
  canProceed: boolean;
  warningCount: number;
}

export interface PlatformErpBatch {
  id: string;
  status: string;
  operationsCount: number;
  totalHalalas?: number;
  createdAt: string;
  completedAt?: string;
  fileUrl?: string;
}

// ─── Accountant (platform) ──────────────────────────────────────────────────
export interface PlatformAccountantDashboard {
  kpis: {
    awaitingReview: number;
    iApproved: number;
    finalApproved: number;
    approvalRate: number;
    overdueCount: number;
  };
  progress?: Record<string, { done: number; total: number; pct: number }>;
  pipeline?: unknown[];
  exceptions?: unknown[];
  modules?: Array<{
    id: string;
    key: string | null;
    label: string;
    icon?: string;
    pendingCount: number;
    totalCount: number;
  }>;
  recentOperations?: unknown[];
}

export interface PlatformAsset {
  id: string;
  name: string;
  category: string;
  branchId: string;
  branchName?: string;
  invNum?: string;
  cost: number;
  usefulLifeMonths: number;
  custodian?: string;
  status: "pending_branch" | "pending_accountant" | "confirmed" | string;
  notes?: string;
  createdAt?: string;
}

export interface PlatformAssetDraft {
  draftId: string;
  status: string;
  assetName?: string;
  category?: string;
  usefulLifeMonths?: number;
  targetBranches?: string[];
  custodian?: string;
  qty?: number;
  notes?: string;
}

export interface PlatformInventoryBranch {
  branchId: string;
  branchName: string;
  operationId?: string;
  status: "pending" | "approved" | "final-approved" | "rejected" | "not_submitted" | string;
  items: Array<{
    item: string;
    cat: string;
    unit: string;
    prev: number;
    curr: number;
    isAnomaly: boolean;
    pct: number;
  }>;
  anomalyCount: number;
  isFlagged: boolean;
  branchConfirmed: boolean;
  sentToConfirm: boolean;
  flaggedItemIndices: number[];
}

export interface PlatformShift {
  id: string;
  branchId: string;
  branchName?: string;
  supervisor?: string;
  startedAt?: string;
  endedAt?: string;
  status: "open" | "closed" | "needs-review" | string;
  cashInDrawer?: number;
  salesSystem?: number;
  variance?: number;
}

export interface PlatformEmployee {
  id: string;
  empNumber?: string;
  name: string;
  branchId?: string;
  branchName?: string;
  role?: string;
  monthlySalary?: number;
  active?: boolean;
}

export interface PlatformCashCustodyRow {
  id: string;
  branchId: string;
  branchName?: string;
  custodian?: string;
  balance?: number;
  status: string;
  lastTxnAt?: string;
}

export interface PlatformReminderRow {
  id: string;
  module: string;
  branchId?: string;
  branchName?: string;
  urgency?: string;
  status: "not_sent" | "sent" | "responded" | string;
  message?: string;
  response?: string;
  createdAt?: string;
}

export interface PlatformReminderRule {
  id: string;
  module: string;
  triggerHour: string;
  repeatHours: number;
  active: boolean;
}

// ─── Branch (platform) ─────────────────────────────────────────────────────
export interface PlatformBranchOverview {
  branch: { id: string; name: string; manager?: string };
  // T12 §1 — hero achievement band (halalas).
  hero?: {
    targetHalalas: number;
    actualHalalas: number;
    achievementPct: number;
  };
  kpis: {
    todaySales: number;
    todaySalesTrendPct?: number;
    todayOrders: number;
    monthSales?: number;
    monthExpenses?: number;
    netProfit?: number;
    activeEmployees: number;
    requiredReportsCount: number;
  };
  // T12 §1 — task checklist for the day.
  tasksOfDay?: Array<{
    id: string;
    label: string;
    state: "completed" | "pending" | "later" | string;
    stateLabel?: string;
  }>;
  // T12 §1 — active crew (attendance is a future source; active reads `present`).
  crew?: Array<{
    id: string;
    name: string;
    role?: string;
    shift?: string;
    attendanceStatus?: string;
    attendanceLabel?: string;
  }>;
  requiredReports: Array<{
    id: string;
    name: string;
    deadline?: string;
    urgent?: boolean;
    required?: boolean;
    uploadedToday?: boolean;
    lastStatus?: string;
  }>;
  currentShift?: {
    supervisor: string;
    startedAt: string;
    duration: string;
    ordersCount: number;
    salesAmount: number;
    cashAmount: number;
  } | null;
}

export interface PlatformBranchUploadStatus {
  date: string;
  reports: Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    lastUpload: string | null;
    lastStatus: "success" | "late" | "missing";
    todayDeadline: string;
    uploadedToday: boolean;
  }>;
}

export type PlatformBranchReportType =
  | "sales"
  | "inventory"
  | "cash"
  | "waste"
  | "purchases"
  | "expenses";

/**
 * Cashier provisioning outcome, present on the add-employee response when the
 * role is a cashier ("cashier" / "كاشير" / "أمين صندوق", case-insensitive).
 * `provisioned:false` with reason EMAIL_REQUIRED / NO_BRANCH_MANAGER means the
 * admin record was created but no mobile login account was.
 */
export interface CashierProvisioning {
  provisioned: boolean;
  cashierId?: string | null;
  emailSent?: boolean;
  reason:
    | null
    | "LINKED_EXISTING"
    | "RESTORED_EXISTING"
    | "EMAIL_REQUIRED"
    | "NO_BRANCH_MANAGER";
}

/** A shift window a mobile cashier works (from the app's "Shift Details"). */
export interface BranchEmployeeShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface PlatformBranchEmployee {
  id: string;
  empNumber: string;
  name: string;
  nationalId?: string;
  role?: string;
  monthlySalary?: number;
  shiftType?: string;
  hireDate?: string;
  status?: string;
  email?: string;
  phone?: string;
  /**
   * Where the record came from. Cashiers are now created only in the mobile app
   * by the branch manager; the dashboard reads them but never creates them
   * (source "dashboard" = added here, "mobile" = created in the app).
   */
  source?: "mobile" | "dashboard";
  /** The mobile `cashiers.id` when this person exists in the app. */
  cashierId?: string | null;
  /** Shift windows the manager assigned in the app (mobile cashiers only). */
  workingShifts?: BranchEmployeeShift[];
  /** Who created the mobile record, and when (ISO). */
  addedBy?: string;
  addedAt?: string;
  /** @deprecated cashier accounts are provisioned in the mobile app, not here. */
  cashier?: CashierProvisioning;
}

export interface PlatformBranchSettings {
  workingHours?: { open: string; close: string };
  autoCloseShift?: boolean;
  deliveryAppsEnabled?: string[];
  cashAlertThreshold?: number;
  notificationPrefs?: { newReminders: boolean; opsApproved: boolean };
  /** Display-only fields sourced from the admin record (see readOnlyFields). */
  branchName?: string;
  phone?: string;
  address?: string;
  /** Field names the branch manager may NOT edit — render them disabled. */
  readOnlyFields?: string[];
  /** Shift config is owned by the admin; `readOnly` marks the whole block. */
  shiftConfig?: { readOnly?: boolean; [k: string]: unknown };
  [k: string]: unknown;
}

/** One branch inventory row (T12 §4). Money = halalas. */
export interface PlatformBranchInventoryItem {
  id: string;
  code?: string;
  name: string;
  unit?: string;
  cat?: string;
  category?: string;
  priceHalalas?: number;
  minLevel?: number;
  expectedQty?: number;
  stockStatus?: "ok" | "low" | "critical" | string;
  stockStatusLabel?: string;
}

/** GET /company/me/branch/items → branch-assigned items (or brand catalog). */
export interface PlatformBranchInventoryItems {
  items: PlatformBranchInventoryItem[];
  /** Name of whoever configured the list, or null when it falls back to the catalog. */
  configuredBy: string | null;
}

/** GET /company/me/branch/suppliers → active suppliers + still-pending «طلب مورد جديد» rows. */
export interface PlatformBranchSupplierRow {
  id: string;
  name: string;
  category?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  commercialReg?: string;
  address?: string;
  paymentTerms?: string;
  rating?: number;
  status?: string;
  statusLabel?: string;
  isActive?: boolean;
  /** true = a pending request (chip «قيد المراجعة»), not yet an approved supplier. */
  isRequest?: boolean;
}

// ─── Procurement (platform) ────────────────────────────────────────────────
export interface PlatformProcurementOverview {
  kpis: {
    // Operations family (halalas).
    newOrders: number;
    consolidated: number;
    sentToSuppliers: number;
    ordersValueThisWeek: number;
    // Real bridge pipeline — use these for the headline cards (T11.1).
    incoming?: number;
    readyToSend?: number;
    sentAwaitingConfirmation?: number;
  };
  // Monthly savings from consolidation (SAR, bridge world) — T11.8.
  monthlySavings?: {
    amount: number;
    pctOfPurchases: number;
    trendPct: number;
  };
  newOrders?: Array<{
    id: string;
    publicId?: string;
    branch?: string;
    branchId?: string;
    itemCount?: number;
    total: number;
    urgency?: "normal" | "urgent" | string;
    urgencyLabel?: string;
  }>;
}

export interface PlatformProcurementOrder {
  id: string;
  publicId?: string;
  branchId: string;
  branchName?: string;
  supplierId?: string;
  supplierName?: string;
  status: string;
  total: number;
  itemCount?: number;
  urgency?: string;
  items?: Array<{
    id: string;
    name: string;
    unit?: string;
    ordered?: number;
    recommended?: number;
    dailyAvg?: number;
    price?: number;
    historicPrice?: number;
    qtyStatus?: "ok" | "over" | "under";
    priceStatus?: "ok" | "high";
  }>;
  anomalies?: { qtyOverCount: number; priceHighCount: number };
}

export interface PlatformProcurementSupplier {
  id: string;
  name: string;
  category?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  commercialReg?: string;
  paymentTerms?: string;
  /** 0–50 (stars × 10); ÷10 for star display (T11.13). */
  rating?: number;
  ratingAvg?: number;
  status?: string;
  isActive?: boolean;
  itemsCount?: number;
  monthlyOrderCount?: number;
  lifetimeOrdersCount?: number;
  lifetimeSpend?: number; // SAR
}

/** Suppliers list header KPIs (T11.13 — meta.kpis). */
export interface ProcurementSuppliersKpis {
  activeSuppliers: number;
  totalPurchases: number; // SAR
  avgRating: number; // 0–5 stars
}

export interface ProcurementSuppliersListResponse {
  data: PlatformProcurementSupplier[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    kpis?: ProcurementSuppliersKpis;
  };
}

export interface PlatformProcurementItem {
  id: string;
  name: string;
  unit?: string;
  category?: string;
  code?: string;
  defaultPrice?: number;
  lastPriceHalalas?: number;
  supplierId?: string;
  supplierName?: string;
  supplierCount?: number;
  available?: boolean;
  status?: string;
}

// ─── Procurement purchase-orders BRIDGE (real branch/mobile-app orders) ──────
// ⚠️ Amounts here are SAR floats (NOT halalas) — do not divide by 100.
export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  branchId: string;
  branchName?: string | null; // null in approve/partial/reject responses — reuse from list row
  orderType?: "direct_supplier" | "via_purchasing_officer" | "multiple_sources" | string;
  status: string;
  statusLabel?: string;
  priority?: "high" | "normal" | null;
  supplierId?: string | null;
  totalAmount: number; // SAR float
  totalItems?: number;
  rejectionReason?: string | null;
  submittedAt?: string;
  decidedAt?: string | null;
}

export interface PurchaseOrderItem {
  orderItemId: string;
  itemId?: string | null;
  name: string;
  unit?: string;
  quantityOrdered: number;
  quantityConfirmed?: number | null;
  unitPrice: number; // SAR float
  totalPrice: number; // SAR float
  status?: "pending" | "confirmed" | "rejected" | "partial" | string;
  dailyConsumption?: number | null; // null when branch didn't report
  remainingBalance?: number | null;
  weekendForecast?: number | null;
  nextSupplyDate?: string | null;
}

export interface PurchaseOrderDetail extends PurchaseOrder {
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderGroupedItem {
  itemId?: string | null;
  name: string;
  unit?: string;
  totalQuantity: number;
  unitPrice: number; // SAR float
  capacity?: number | null; // supplier declared stock; null = "no data", render «—»
  capacityPct?: number | null;
  exceeded?: boolean | null;
  excessQuantity?: number | null;
}

export interface PurchaseOrderGroupedSupplier {
  supplierId: string;
  supplierName: string;
  ordersCount: number;
  branchesCount: number;
  cities: string[];
  urgentCount: number;
  totalAmount: number; // SAR float
  itemsCount: number;
  capacityExceeded: boolean;
  orderIds: string[];
  items: PurchaseOrderGroupedItem[];
}

export interface PurchaseOrderGroupedCity {
  city: string;
  ordersCount: number;
  urgentCount: number;
  totalAmount: number; // SAR float
  suppliers: string[];
  orderIds: string[];
}

// by=item card (T11.7 — the SRS core value loop). Money = SAR floats.
export interface PurchaseOrderGroupedItemCard {
  itemId: string;
  name: string;
  unit?: string;
  requestsCount: number;
  branchesCount: number;
  branchLines: Array<{
    branchId: string;
    branchName: string;
    qty: number;
    unit?: string;
  }>;
  totalQuantity: number;
  suggestedSupplier: { id: string; name: string; unitPrice: number } | null;
  unitPrice: number | null;
  totalCost: number | null;
  savings: number | null;
  savingsPct: number | null;
  status: string;
  orderIds: string[];
}

export interface PurchaseOrderGroupedResponse {
  suppliers?: PurchaseOrderGroupedSupplier[];
  unassignedOrders?: Array<{
    id: string;
    orderNumber: string;
    branchName?: string;
    totalAmount: number;
  }>;
  cities?: PurchaseOrderGroupedCity[];
  items?: PurchaseOrderGroupedItemCard[];
}

export interface PurchaseOrderSentGroup {
  groupId: string;
  groupNumber: string;
  supplierId: string;
  supplierName: string;
  ordersCount: number;
  totalAmount: number; // SAR float
  // T11.10 — a freshly-sent batch reads `sent` (not `confirmed`) until the supplier acts.
  status: "sent" | "confirmed" | "preparing" | "on_the_way" | "delivered" | string;
  statusLabel?: string;
  savings?: number | null; // SAR, snapshotted at send (T11.8)
  savingsPct?: number | null;
  eta?: string | null;
  sentAt: string;
}

export interface PurchaseOrderGroupDetail extends PurchaseOrderSentGroup {
  items: PurchaseOrderGroupedItem[];
  orders: Array<{
    id: string;
    orderNumber: string;
    branchId: string;
    branchName?: string;
    city?: string;
    status: string;
    statusLabel?: string;
    totalAmount: number;
  }>;
}

export interface PurchaseOrderSendResult {
  groupId: string;
  groupNumber: string;
  supplierId: string;
  ordersCount: number;
  savings?: number | null; // SAR (T11.8)
  savingsPct?: number | null;
  eta?: string | null; // T11.9
  sentAt: string;
  // FR-PUR-1: WhatsApp send-to-supplier. Open `url` to launch WhatsApp pre-filled.
  whatsapp?: {
    channel: string;
    reference: string;
    supplierName: string;
    phone: string | null;
    message: string;
    url: string | null;
    deliverable: boolean;
  } | null;
}

export interface PurchaseOrderBulkApproveResult {
  approved: string[];
  failed: Array<{ id: string; reason: string }>;
  count: number;
}

// ─── Supplier ───────────────────────────────────────────────────────────────
export interface SupplierOverview {
  kpis: {
    newOrders: number;
    acceptedThisMonth: number;
    totalSalesThisMonth: number; // integer halalas
    totalSalesTrendPct?: number; // this-month vs last-month change (%)
    activeItems: number;
    totalItems: number;
  };
  recentOrders?: SupplierOrder[]; // newest first, max 8
}

// T13 order row — returned by overview.recentOrders, the orders list,
// and every accept/reject/deliver response. Render statusKey + statusLabel
// (never the raw `status`, which may hold a procurement synonym).
export interface SupplierOrder {
  id: string;
  publicId?: string; // e.g. "PUR-A1B2C3"
  total: number; // integer halalas
  status: string; // raw DB value — do not tab/filter on this
  statusKey?: "pending" | "accepted" | "delivered" | "rejected";
  statusLabel?: string; // Arabic label matching statusKey
  from?: string; // branch name, else «مدير المشتريات»
  itemsText?: string | null; // human summary of order lines, else «n صنف» / null
  orderDate?: string;
  deliveryDate?: string | null; // supplier-promised, else requested, else null
  // legacy / compat
  branchName?: string;
  items?: Array<{ name: string; unit: string; qty: number; price: number }>;
  createdAt?: string;
}

// T13 reports — aggregates over fulfilled (accepted + delivered) orders only.
// SUP-3 breakdowns (topItems/topBranches/monthly) are DEFERRED and omitted
// by the backend — do not render placeholders for them.
export interface SupplierReports {
  totalRevenue: number; // integer halalas
  orderCount: number;
  averageOrderValue: number; // integer halalas
}

// T13 item row — returned by the items list and every item write.
// `price` and `priceHalalas` are the SAME integer-halalas value.
export interface SupplierItem {
  id: string;
  code?: string;
  name: string;
  unit?: string;
  price: number; // integer halalas
  priceHalalas?: number; // same value as price
  minQty?: number;
  maxQty?: number | null;
  available?: boolean; // mirrors status
  leadTimeDays?: number;
  status?: "active" | "inactive" | string;
}
