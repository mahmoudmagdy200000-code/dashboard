// Company Dashboard — Accountant-scope types.
// Most operation/notification/audit types live in ./index.ts.

import type { OperationStatus, ModuleKey } from "./index";

// ─── Company Invitations (Task A1 / FR-001) ──────────────────────────────────
export interface CreateCompanyInvitationPayload {
  email: string;
  name?: string;
  roleKey: "company-admin" | "head" | "accountant" | "branch" | "procurement";
  brandId?: string;   // Mandatory if roleKey === 'accountant'
  branchId?: string;  // Mandatory if roleKey === 'branch', strictly omit brandId
}

export interface CompanyInvitation {
  id: string;
  email: string;
  name?: string;
  roleKey: string;
  brandId?: string;
  branchId?: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: string;
  expiresAt?: string;
}

// ─── Accountant dashboard summary (T04 §1) ───────────────────────────────────
export interface AccDashboardCounts {
  awaitingReview: number;
  iApproved: number;
  finalApproved: number;
  rejected: number;
  newTodayCount: number;
  /** 0–100; `approvedByMe ÷ (approvedByMe + rejectedByMe)`, 0 when nothing reviewed yet. */
  approvalRatePct: number;
  overdueCount: number;
}

export interface AccDashboardScope {
  branchCount: number;
  branchIds: string[];
  isCompanyWide: boolean;
  moduleKeys: ModuleKey[];
  moduleLabelsAr: string[];
}

export interface AccDashboardModuleTile {
  key: ModuleKey;
  labelAr: string;
  label: string;
  icon: string;
  pendingCount: number;
  totalCount: number;
  /** Red-dot trigger: any pending record with match:"diff" or pending >48h. */
  hasUrgent: boolean;
}

export interface AccDashboardProgressToday {
  reviewPct: number;
  approvalPct: number;
  documentationPct: number;
  completedBranchesPct: number;
  operationsToday: number;
}

export interface AccDashboardNeedsAttentionEntry {
  operationId: string;
  refNum: string;
  branch: string;
  moduleLabel: string;
  match: string;
  diff: string;
}

export interface AccDashboardResponse {
  today: string;
  counts: AccDashboardCounts;
  scope: AccDashboardScope;
  /** Always the nine modules, catalogue order, zero-count included. */
  modules: AccDashboardModuleTile[];
  progressToday: AccDashboardProgressToday;
  /** Legacy sparse map, kept only for pre-T04 screens — bind `modules[]` instead. */
  pendingByModule: Record<string, number>;
  needsAttention: AccDashboardNeedsAttentionEntry[];
  rejectedReuploadNeededCount: number;
}

// ─── Sales reconciliation (T04 §4/§5) ────────────────────────────────────────
export interface SalesReconciliationChannel {
  key: string;
  labelAr: string;
  icon: string;
  group: "core" | "delivery";
  posAmountHalalas: number;
  actualAmountHalalas: number;
  diffHalalas: number;
  status: "exact" | "diff";
  statusLabelAr: string;
}

export interface SalesReconciliationTotals {
  expectedTotalHalalas: number;
  totalCollectionHalalas: number;
  varianceHalalas: number;
  status: "exact" | "diff";
  statusLabelAr: string;
}

/** Rides on `GET /operations/{id}` for sales-module ops; `null` until reconciled. */
export interface SalesReconciliation {
  channels: SalesReconciliationChannel[];
  totals: SalesReconciliationTotals;
  varianceReason: string | null;
  /** true once the op is final-approved — hide the edit UI (server 409s anyway). */
  isLocked: boolean;
}

/** Body for `PATCH /company/me/operations/{id}/sales-details`. */
export interface SalesDetailsPatchPayload {
  channels: Array<{
    key: string;
    actualAmountHalalas: number;
    posAmountHalalas?: number;
  }>;
  varianceReason?: string;
}

export interface SalesDetailsPatchResponse {
  id: string;
  reconciliation: SalesReconciliation;
  totalCollectionHalalas: number;
  varianceHalalas: number;
  match: "exact" | "diff";
}

/** Body for `POST /company/me/operations/{id}/sales-variance/assign`. */
export interface SalesVarianceAssignPayload {
  allocations: Array<{
    empNumber?: string;
    employeeId?: string;
    amountHalalas: number;
  }>;
  notes?: string;
}

export interface SalesVarianceAllocationResult {
  id: string;
  employeeId: string;
  employeeName: string;
  amountHalalas: number;
  category: string;
  categoryLabelAr: string;
  appliedAt: string;
}

export interface SalesVarianceAssignResult {
  operationId: string;
  varianceTotalHalalas: number;
  allocations: SalesVarianceAllocationResult[];
  remainingUnallocatedHalalas: number;
  remainingVarianceHalalas: number;
}

// ─── Sales KPIs & day completeness (T04 §2/§3) ───────────────────────────────
export interface SalesVarianceBranch {
  branchId: string;
  name: string;
  varianceHalalas: number;
}

export interface SalesKpis {
  date: string;
  totalSalesHalalas: number;
  branchCount: number;
  /** vs previous day; `null` when there were no sales the prior day — render "—". */
  trendPct: number | null;
  totalCollectedHalalas: number;
  totalVarianceHalalas: number;
  varianceCaseCount: number;
  zeroVarianceBranchCount: number;
  varianceBranches: SalesVarianceBranch[];
}

export interface DayCompletenessMissingBranch {
  branchId: string;
  name: string;
}

export interface DayCompletenessEntry {
  date: string;
  pillLabelAr: string;
  requiredCount: number;
  completedCount: number;
  missingCount: number;
  bannerAr: string;
  missingBranches: DayCompletenessMissingBranch[];
}

// ─── Pipeline daily rollup (T03 §12) ─────────────────────────────────────────
export type DailyRollupStateKey =
  | "empty"
  | "incomplete"
  | "ready_consolidation"
  | "consolidated"
  | "ready_erp"
  | "exported"
  | "erp_imported";

export interface DailyRollupState {
  key: DailyRollupStateKey;
  labelAr: string;
  subLabelAr: string;
  step: number;
}

export interface DailyRollupCounts {
  total: number;
  pending: number;
  approved: number;
  finalApproved: number;
  rejected: number;
  erpPosted: number;
}

export interface DailyRollupEntry {
  branchId: string;
  branchName: string;
  date: string;
  state: DailyRollupState;
  counts: DailyRollupCounts;
  totalAmountHalalas: number;
}

// ─── Lookups (T03 §13/§14) ────────────────────────────────────────────────────
export interface RejectionReasonOption {
  key: string;
  value: string;
  labelAr: string;
}

export interface OperationEnumsCatalogue {
  status: Array<{ key: string; labelAr: string; labelShortAr?: string }>;
  stages: Array<{ key: string; step: number; icon: string; labelAr: string; labelShortAr: string }>;
  origin: Array<{ key: string; labelAr: string; icon: string }>;
  match: Array<{ key: string; labelAr: string }>;
  rollup: Array<{ key: string; labelAr: string; subLabelAr?: string }>;
  rejectionReasons: RejectionReasonOption[];
  rejectionReasonsByModule: Record<string, RejectionReasonOption[]>;
}

// ─── Attachments (T04 §9) ────────────────────────────────────────────────────
export interface OperationAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  publicUrl: string;
  label: string | null;
  verifiedAt: string | null;
  uploadedAt: string;
}

// ─── Expense invoices (T05) ──────────────────────────────────────────────────
export type InvoiceMatchStatus = "matched" | "mismatch" | "missing";

export interface ExpenseInvoiceAttachment {
  id: string;
  filename: string;
  publicUrl: string;
  label?: string | null;
  invoiceIndex?: number | null;
}

/** One row inside an expenses statement (T05 §1 `expenses.invoices[]`). */
export interface ExpenseInvoiceRow {
  index: number;
  invNum: string;
  vendor: string;
  desc: string;
  date: string;
  amountHalalas: number;
  preTaxHalalas: number;
  vat15Halalas: number;
  inclTaxHalalas: number;
  verified: boolean;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  convertedToAsset: boolean;
  convertedLabelAr?: string | null;
  assetDraftId?: string | null;
  documentAmountHalalas?: number | null;
  documentVendor?: string | null;
  documentInvNum?: string | null;
  documentDate?: string | null;
  matchStatus: InvoiceMatchStatus;
  matchLabelAr: string;
  matchIcon: string;
  deltaHalalas?: number | null;
  deltaNoteAr?: string | null;
  attachments: ExpenseInvoiceAttachment[];
  attachmentCount: number;
}

/** The `expenses` block on an expenses operation detail (T05 §1). */
export interface ExpensesBlock {
  invoices: ExpenseInvoiceRow[];
  totals: {
    invoiceCount: number;
    preTaxHalalas: number;
    vat15Halalas: number;
    inclTaxHalalas: number;
  };
  verifiedCount: number;
  allVerified: boolean;
  allVerifiedBadgeAr?: string | null;
  matchSummary: { matched: number; mismatch: number; missing: number };
  isLocked: boolean;
}

/** Expenses KPI strip (T05 §2). */
export interface ExpenseKpis {
  dateFrom: string;
  dateTo: string;
  statementCount: number;
  invoiceCount: number;
  totalHalalas: number;
  preTaxHalalas: number;
  vat15Halalas: number;
  pendingStatementCount: number;
  pendingInvoices: { total: number; matched: number; mismatch: number; missing: number };
  verifiedInvoiceCount: number;
  unverifiedInvoiceCount: number;
  convertedInvoiceCount: number;
}

/** Verify/unverify one invoice response (T05 §3). */
export interface VerifyInvoiceResponse {
  operationId: string;
  invoiceIndex: number;
  verified: boolean;
  verifiedAt?: string | null;
  allVerified: boolean;
  allVerifiedBadgeAr?: string | null;
  verifiedCount: number;
  invoiceCount: number;
}

/** Review-modal side-by-side response (T05 §4). */
export interface ReviewInvoiceResponse {
  invoice: ExpenseInvoiceRow;
  rows: Array<{
    field: string;
    labelAr: string;
    entered: string | number | null;
    document: string | number | null;
    matches: boolean;
  }>;
  deltaHalalas?: number | null;
  deltaNoteAr?: string | null;
}

// ─── Purchases (T06 — 3-way match) ───────────────────────────────────────────
export type PurchaseLineMatchKey = "matched" | "diff" | "pending";
export type PurchaseOrderSourceKey = "supplier" | "branch" | "procurement";

export interface PurchaseLineMatch {
  key: PurchaseLineMatchKey;
  labelAr: string;
  icon: string;
}

export interface PurchaseOrderSource {
  key: PurchaseOrderSourceKey | string;
  labelAr: string;
}

/** List-row extra (T06 §1) — GET /operations?moduleKey=purchases → data[].purchaseRow */
export interface PurchaseRow {
  supplierId: string | null;
  supplierName: string | null;
  orderSource: PurchaseOrderSource;
  receiveDate: string | null;
  itemCount: number;
  orderedTotalHalalas: number;
  receivedTotalHalalas: number;
  hasDiff: boolean;
  isDocumented: boolean;
}

/** meta.summary.purchases (T06 §1) — only when moduleKey=purchases. */
export interface PurchasesSummary {
  todayTotalHalalas: number;
  pendingReview: number;
  qtyDiscrepancies: number;
  approvedToday: number;
}

/** Generic status counts + purchases block returned in the list meta.summary. */
export interface OperationsListSummary {
  total?: number;
  pending?: number;
  approved?: number;
  finalApproved?: number;
  rejected?: number;
  purchases?: PurchasesSummary;
}

/** Detail line (T06 §2). `rcvQty === null` → pending receipt, never a shortfall. */
export interface PurchaseLine {
  rowId: string;
  item: string;
  itemId: string;
  unit: string;
  ordQty: number;
  rcvQty: number | null;
  unitPriceHalalas: number;
  orderedUnitPriceHalalas: number;
  totalHalalas: number;
  receivedValueHalalas: number;
  diffQty: number | null;
  qtyMatched: boolean;
  priceMatched: boolean;
  received: boolean;
  lineMatch: PurchaseLineMatch;
  diffNoteAr: string | null;
}

export interface PurchasesSummaryTiles {
  lineCount: number;
  orderedValueHalalas: number;
  receivedValueHalalas: number;
  qtyDiscrepancyCount: number;
  priceDiscrepancyCount: number;
  pendingReceiptCount: number;
  isMatched: boolean;
  hasMismatch: boolean;
}

export interface PurchaseDocumentation {
  documentedAt: string;
  documentedById: string;
  documentedBy: string;
  note: string | null;
}

/** Detail block (T06 §2) — GET /operations/{id} → purchases. */
export interface PurchasesBlock {
  supplierId: string | null;
  supplierName: string | null;
  orderSource: PurchaseOrderSource;
  urgency: string;
  deliveryDate: string | null;
  description: string | null;
  purchaseItems: PurchaseLine[];
  summary: PurchasesSummaryTiles;
  isDocumented: boolean;
  documentation: PurchaseDocumentation | null;
  attachments: OperationAttachment[];
}

/** PATCH …/purchase-lines/{rowId} response (T06 §4). */
export interface PurchaseLineEditResponse {
  operationId: string;
  rowId: string;
  row: {
    rowId: string;
    ordQty: number;
    rcvQty: number | null;
    unitPriceHalalas: number;
    totalHalalas: number;
    priceMatched: boolean;
    qtyMatched: boolean;
    lineMatch: PurchaseLineMatch;
  };
  match: "exact" | "review" | "diff";
  amount: number;
}

/** Supplier card (T06 §5). `rating` is 0–50 (stars × 10) → divide by 10 for ★. */
export interface Supplier {
  id: string;
  name: string;
  category: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  paymentTerms: string | null;
  rating: number;
  status: string;
  isActive: boolean;
  itemsCount: number;
  monthlyOrderCount: number;
}

/** Return row (T06 §6) — read-only window onto legacy return_orders. */
export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  orderNumber: string | null;
  supplierId: string | null;
  supplierName: string | null;
  branchId: string | null;
  branchName: string | null;
  returnDate: string;
  status: string;
  statusLabelAr: string;
  totalReturnAmountHalalas: number;
  refundAmountHalalas: number;
  itemCount: number;
}

/** Enums (T06 §7) — fetch once at boot; never hardcode Arabic labels. */
export interface PurchaseEnumsCatalogue {
  orderSource: Array<{ key: string; labelAr: string }>;
  lineMatch: Array<{ key: string; labelAr: string; icon: string }>;
  returnStatus: Array<{ key: string; labelAr: string }>;
}

// ─── Inventory review (T07 §1) ───────────────────────────────────────────────
export type InventoryChip = "red" | "green" | "neutral" | null;

export interface InventoryReviewItem {
  itemId: string;
  itemName: string;
  unit: string;
  prevQty: number | null;
  currQty: number;
  changePct: number | null;
  chip: InventoryChip;
  /** Server-computed (|change| > 50%); never trust a payload flag. */
  isAnomaly: boolean;
  isLow: boolean;
}

export interface InventoryReviewBranch {
  branchId: string;
  branchName?: string;
  brandName?: string;
  operationId: string | null;
  status: string;
  items: InventoryReviewItem[];
  anomalyCount: number;
  isFlagged: boolean;
  branchConfirmed: boolean;
  flaggedItemIndices: number[];
}

export interface InventoryReviewSummary {
  totalSubmissions: number;
  uploadedCount: number;
  pendingCount: number;
  completedBranches: number;
  anomalyAlerts: number;
  lowItems: number;
  normalItems: number;
  totalWasteTodayHalalas: number;
  wasteRatePct: number;
}

export interface InventoryBranchesResponse {
  branches: InventoryReviewBranch[];
  summary: InventoryReviewSummary;
}

// ─── Daily equation (T07 §2) ─────────────────────────────────────────────────
export interface InventoryStockStatus {
  key: "critical" | "low" | "normal" | string;
  labelAr: string;
}

/** Catalog item for the daily-list config picker (T07 §8). */
export interface InventoryCatalogItem {
  id: string;
  name: string;
  category: string;
  unit: string;
}

// ─── Inventory (legacy daily-reconciliation row — kept for existing consumers) ─
export interface InventoryBranchRow {
  branchId: string;
  branchName: string;
  brandName: string;
  date: string;
  status: "pending" | "confirmed" | "flagged";
  itemCount: number;
  varianceCount: number;
}

export interface InventoryItemRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  prevQty: number;
  currQty: number;
  varianceQty: number;
  flagged: boolean;
}

export interface InventoryItemDef {
  id: string;
  name: string;
  category: string;
  unit: string;
}

export interface InventoryCatalogResponse {
  items: InventoryItemDef[];
}

// ─── Waste (T07 §4–§7) ───────────────────────────────────────────────────────
export type WasteClassification = "هدر" | "تالف";
export type WasteResponsibility = "موظف" | "مطعم";

/** Per-employee allocation of a «موظف» product's loss value (halalas). */
export interface WasteEmpAlloc {
  employeeId?: string;
  empNumber?: string;
  employeeName?: string;
  amountHalalas: number;
}

export interface WasteProduct {
  name: string;
  classification: WasteClassification | string;
  responsibility: WasteResponsibility | string;
  /** Loss value in halalas. */
  value: number;
  empAllocs: WasteEmpAlloc[];
  qty?: number;
  unit?: string;
}

export interface WasteEntry {
  id: string;
  publicId: string;
  branchId: string;
  branchName?: string;
  brandId?: string;
  brandName?: string;
  date: string;
  status: OperationStatus;
  /** Total loss value in halalas. */
  amount: number;
  productsCount: number;
  /** Σ empAllocs of «موظف» products = «منه على موظفين». */
  employeeChargedHalalas: number;
  products: WasteProduct[];
}

/** meta.summary on the waste list (T07 §4). */
export interface WasteListSummary {
  total: number;
  pendingReview: number;
  approvedThisMonth: number;
  totalLossesHalalas: number;
  chargedToEmployeesHalalas: number;
}

// ─── Assets (fixed-asset register, T05 §9–§14) ───────────────────────────────
export type AssetLifecycleStatus = "active" | "maintenance" | "retired";
export type AssetWorkflowStatus = "pending_branch" | "pending_accountant" | "confirmed";
export type AssetStatus = AssetLifecycleStatus | AssetWorkflowStatus;
export type UsefulLifeMonths = 24 | 36 | 48 | 60 | 72 | 84;

export interface Asset {
  id: string;
  publicId: string; // FA-000N per company
  name: string;
  category: string;
  categoryLabelAr?: string;
  /** null for brand-level uploaded assets awaiting assignment to a branch. */
  branchId: string | null;
  branchName?: string | null;
  /** Purchase price (halalas). Server returns both `cost` and `priceHalalas`. */
  cost: number;
  priceHalalas: number;
  bookValue: number;
  bookValueHalalas: number;
  usefulLifeMonths: number;
  monthlyDepreciationHalalas?: number;
  annualDepreciationHalalas?: number;
  status: AssetStatus;
  statusLabelAr?: string;
  invNum?: string | null;
  serial?: string | null;
  purchaseDate?: string | null;
  custodian?: string | null;
  notes?: string | null;
}

/** Pending asset draft from an expense conversion (T05 §7). */
export interface AssetDraft {
  id: string;
  draftId: string; // "DRAFT-…"
  expenseOpId: string;
  invNum: string;
  vendor: string;
  desc: string;
  expenseBranch: string;
  expenseDate: string;
  assetName: string;
  category: string;
  categoryLabelAr?: string;
  amount: number;
  amountHalalas: number;
  usefulLifeMonths: number;
  annualDepreciationHalalas: number;
  monthlyDepreciationHalalas: number;
  qty: number;
  targetBranches: string[];
  custodian: string;
  status: "draft" | "confirmed" | "discarded";
  statusLabelAr?: string;
  createdAt: string;
}

/** Fixed-assets register KPI tiles (T05 §9 meta.summary). */
export interface AssetsSummary {
  /** Brand-level uploaded assets still awaiting assignment to a branch (branch_id=null). */
  pendingAssignment?: number;
  pendingAccountant: number;
  pendingBranch: number;
  confirmed: number;
  active: number;
  maintenance: number;
  retired: number;
  total: number;
  bookValueTotal: number;
}

/** Paginated register envelope (T05 §9). */
export interface AssetsRegisterResponse {
  data: Asset[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    summary: AssetsSummary;
    drafts: AssetDraft[];
  };
}

/** Confirm-draft response (T05 §8). */
export interface ConfirmDraftResponse {
  createdAssets: Asset[];
}

export interface AssetImportResult {
  jobId: string;
  parsedRows: number;
  createdRows: number;
  count: number;
  imported: Array<Partial<Asset> & { publicId: string; name: string }>;
  errors: Array<{ row: number; message: string }>;
}

/** Asset-category lookup row (T05 §14). */
export interface AssetCategoryLookup {
  key: string;
  id: string;
  name: string;
  labelAr?: string;
  depreciationRate: number;
}

/** Full asset vocabulary (T05 §14 GET /lookups/asset-enums). */
export interface AssetEnumsCatalogue {
  categories: AssetCategoryLookup[];
  usefulLifeMonths: Array<{ key: number; labelAr: string }>;
  lifecycleStatus: Array<{ key: string; labelAr: string }>;
  workflowStatus: Array<{ key: string; labelAr: string }>;
  draftStatus: Array<{ key: string; labelAr: string }>;
  expenses: {
    vatPercent: number;
    invoiceMatch: Array<{ key: string; labelAr: string }>;
    allVerifiedBadgeAr: string;
    convertedLabelAr: string;
  };
}

// ─── Shifts (T08) ────────────────────────────────────────────────────────────
export type ShiftStatus = "active" | "late" | "pending_review" | "closed";

/** `unknown` is a legacy projection, never evidence of a physical count. */
export type CashCountState = "counted" | "unknown" | null;

/** Review metadata emitted by the Admin shift presenter (handoff 02 §B). */
export interface ShiftReportReview {
  operation_id?: string | null;
  public_id?: string | null;
  status?: OperationStatus | null;
  phase?: string | null;
  return_cycle?: number | null;
  return_reason?: string | null;
  /** Preserve evidence fields without treating revision IDs as revision numbers. */
  memberships?: Record<string, unknown>[] | null;
}

/** Canonical shift shape (T08 §4). Money = halalas. */
export interface Shift {
  id: string;
  branchId: string;
  branchName: string;
  cashierEmployeeId: string | null;
  cashierName: string;
  role?: string | null;
  cashierPhone?: string | null;
  whatsapp?: string | null;
  supervisorName?: string | null;
  shiftNo: number;
  shiftType: string;
  startedAt: string;
  endedAt?: string | null;
  status: ShiftStatus;
  statusLabelAr?: string;
  isLate: boolean;
  lateBannerAr?: string | null;
  ordersCount: number | null;
  salesHalalas: number;
  openingFloatHalalas: number | null;
  cashExpectedHalalas: number | null;
  cashActualHalalas: number | null;
  varianceHalalas: number | null;
  cashCountState?: CashCountState;
  pendingIncomingCountedHalalas?: number | null;
  reportReview?: ShiftReportReview | null;
  // Deprecated aliases still emitted by the backend.
  supervisor?: string;
  salesAmount?: number;
  cashExpected?: number | null;
  cashActual?: number | null;
  variance?: number | null;
}

export interface ShiftKpis {
  openNow: number;
  closedToday: number;
  todaySalesHalalas: number;
  cashGapsPendingReview: number;
}

export interface ShiftsLiveResponse {
  active: Shift[];
  overdue: Shift[];
  kpis: ShiftKpis;
}

/** One derived shift window inside a brand config (T08 §1). */
export interface ShiftConfigWindow {
  no: number;
  name: string;
  start: string;
  end: string;
  window: string;
}

export interface ShiftConfig {
  brandId: string;
  brandName: string;
  numShifts: number;
  durationHours: number;
  firstShiftStart: string;
  openingFloatHalalas: number;
  shifts: ShiftConfigWindow[];
  // Legacy window strings still emitted.
  morningWindow?: string;
  eveningWindow?: string;
}

/** PUT shift-config body (T08 §1) — either the N-shift form or legacy windows. */
export interface ShiftConfigPayload {
  numShifts?: number;
  durationHours?: number;
  firstShiftStart?: string;
  openingFloatHalalas?: number;
  morningWindow?: string;
  eveningWindow?: string;
}

/** Close response (T08 §5) = shift shape + the created SHF- pipeline op. */
export interface CloseShiftResponse extends Shift {
  operationId: string;
  operationPublicId: string;
}

// ─── Employees (T09-A) ───────────────────────────────────────────────────────
/** Short key→labelAr caption rendered verbatim (balance/category/type captions). */
export interface LabelCaption {
  key: string;
  labelAr: string;
}

/** A1 list row — `balanceHalalas` = Σcredit − Σdebit; negative = employee owes. */
export interface Employee {
  id: string;
  empNumber: string;
  name: string;
  phone: string;
  role: string;
  branchId: string;
  branchName: string;
  /** Monthly salary in halalas (payload field is bare `monthlySalary`, halalas unit). */
  monthlySalary: number;
  status: "active" | "inactive" | string;
  balanceHalalas: number;
  balanceCaption: LabelCaption;
}

/** Manual movement categories (postable via A3); system keys are read-only. */
export type EmployeeMovementCategory =
  | "advance"
  | "bonus"
  | "absence"
  | "receipts_shortage"
  | "settlement"
  | "deduction"
  | "sales_variance"
  | "cash_variance"
  | "waste_charge"
  | "inventory_variance"
  | string;

/** A2 statement row — newest-first, each carries its own running balance. */
export interface EmployeeMovement {
  id: string;
  movementDate: string;
  description: string;
  movementType: "credit" | "debit";
  movementTypeLabelAr: string;
  category: EmployeeMovementCategory;
  categoryLabelAr: string;
  ref: string;
  amountHalalas: number;
  amount: number;
  runningBalanceHalalas: number;
}

/** A2 — `GET …/employees/{id}/movements?month=` full statement payload. */
export interface EmployeeStatement {
  employee: { id: string; name: string; empNumber: string; branchId: string };
  period: { month: string | null; from: string; to: string };
  openingBalanceHalalas: number;
  closingBalanceHalalas: number;
  balance: number;
  balanceHalalas: number;
  balanceCaption: LabelCaption;
  /** Primary flag from backend v3.5 */
  hasDebitBalance?: boolean;
  /** Standing balance < 0 → render the salary-deduction banner (fallback). */
  autoDeductFromSalary?: boolean;
  totalCredit: number;
  totalDebit: number;
  movementCount: number;
  movements: EmployeeMovement[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** A3 — add-movement body. `category` required + must be a manual key. */
export interface EmployeeMovementInput {
  movementType: "credit" | "debit";
  /** Integer halalas ≥ 1. */
  amount: number;
  category: EmployeeMovementCategory;
  description: string;
  date?: string;
}

/** A4 — settle-balance response. */
export interface SettleBalanceResult {
  id: string;
  employeeId: string;
  settledHalalas: number;
  movementType: "credit" | "debit";
  category: "settlement";
  categoryLabelAr: string;
  ref: string;
  balanceHalalas: number;
  balanceCaption: LabelCaption;
}

// ─── Cash Custody (T09-B) ──────────────────────────────────────────────────────
/** Status is server-derived from the balance — never trust a stored `active`. */
export type CashCustodyStatus = "normal" | "low" | "critical";

/** B1 list row. */
export interface CashCustodyRow {
  id: string;
  branchId: string;
  branchName: string;
  custodianName: string;
  amountHalalas: number;
  usedHalalas: number;
  remainingHalalas: number;
  minAlertHalalas: number;
  usagePct: number;
  status: CashCustodyStatus;
  statusLabelAr: string;
  daysSinceSettlement: number;
  transactions?: CashTransaction[];
}

/** B1 `meta.kpis` block. */
export interface CashCustodyKpis {
  activeCustodies: number;
  pendingRequests: number;
  nearDepletion: number;
}

/** B1 list envelope — `{ data, meta }` with a KPI block inside meta. */
export interface CashCustodyPage {
  data: CashCustodyRow[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    kpis: CashCustodyKpis;
  };
}

export type CashTxnStatus = "pending" | "approved" | "rejected";

/** B2 transaction row — only approved txns move the balance. */
export interface CashTransaction {
  id: string;
  txnDate: string;
  description: string;
  /** DB stores credit|debit; credit = money in (incl. تعزيز), debit = disbursement. */
  txnType: "credit" | "debit";
  typeLabel: { key: "in" | "out"; labelAr: string };
  typeLabelAr: string;
  amountHalalas: number;
  amount: number;
  status: CashTxnStatus;
  source: "treasury" | "manual" | null;
  runningBalanceHalalas: number;
}

/** B2 — `GET …/cash-custody/{id}/transactions?month=` monthly ledger payload. */
export interface CashCustodyLedger {
  custody: {
    id: string;
    custodianName: string;
    amountHalalas: number;
    usedHalalas: number;
    currentBalanceHalalas: number;
  };
  period: { month: string | null; from: string; to: string };
  transactions: CashTransaction[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** B3 — add-transaction body (replenish / disburse). */
export interface CashTransactionInput {
  txnType: "credit" | "debit";
  /** Integer halalas ≥ 1. */
  amount: number;
  description?: string;
  date?: string;
  /** `approved` (default, applies now) or `pending` (records a request). */
  status?: "approved" | "pending";
  source?: "treasury" | "manual";
}

// ─── Reminders ───────────────────────────────────────────────────────────────
export type ReminderPriority = "high" | "medium" | "low";

export interface Reminder {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  priority: ReminderPriority;
  done: boolean;
  scope: "company" | "brand" | "branch" | "personal";
  branchId?: string | null;
  brandId?: string | null;
}
