// ─── Roles ───────────────────────────────────────────────────────────────────
export type RoleKey =
  | "admin"
  | "company-admin"
  | "head"
  | "accountant"
  | "branch"
  | "procurement"
  | "supplier";

/** Actual /auth/me roles[] assignment; a legacy user.role is not a grant. */
export interface RoleGrant {
  key: RoleKey;
  scope: "all" | "brand" | "restaurant" | "branch";
  brandIds: string[];
  restaurantIds: string[];
  branchIds: string[];
  moduleKeys: string[];
}

// ─── Authentication ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  /** Legacy compatibility only; /auth/me authorizes through roles[] below. */
  role?: RoleKey;
  /** May be null for platform users; role scopes are carried by roles[]. */
  companyId: string | null;
  brandIds?: string[];
  restaurantIds?: string[];
  branchIds?: string[];
  avatar?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  companyId: string | null;
  /** Backend tells us where to land the user after login. */
  defaultPage: string;
}

/** 2026-08-04: business identity of a supplier login (read live from asab_suppliers). */
export interface MeSupplier {
  id: string;
  /** The business name shown in the supplier-portal header (≠ the login person's `name`). */
  name: string;
  category?: string;
  companyId?: string | null;
  status?: string;
  records?: Array<{ id: string; name: string; status?: string }>;
}

export interface MeResponse extends User {
  roles: RoleGrant[];
  /** Permission map (key → boolean) for UI gating. */
  permissions: Record<string, boolean>;
  /** Present for role `supplier` — carries the business name for the header. */
  supplier?: MeSupplier | null;
}

// ─── Operations (the 6-stage approval pipeline core) ─────────────────────────
export type ModuleKey =
  | "sales"
  | "expenses"
  | "purchases"
  | "inventory"
  | "shifts"
  | "employees"
  | "cash"
  | "waste";

export type OperationStatus =
  | "pending"
  | "approved"
  | "final-approved"
  | "rejected";

export type MatchStatus = "exact" | "review" | "diff";

export type OperationOrigin = "mobile" | "procurement" | "system";

export interface OperationActor {
  id: string;
  name: string;
}

/** `GET /operations` row's ready-made lifecycle badge (T03 §1 notes). */
export interface OperationStage {
  key: "submit" | "review" | "approved" | "final" | "erp" | "reports" | "rejected";
  step: number;
  icon: string;
  labelAr: string;
  labelShortAr: string;
}

/** Sales-module rows only (T04 §8); `null` until the operation is reconciled. */
export interface SalesBreakdown {
  cashHalalas: number;
  cardHalalas: number;
  appsHalalas: number;
  totalSalesHalalas: number;
  collectedHalalas: number;
  varianceHalalas: number;
}

/** Known SHF detail fields (handoff 02 §B, step 12). Missing money is not zero.
 * Keys are optional because native/legacy payloads may not include count evidence.
 * BD-3 correction versions are not part of this contract yet.
 */
export interface ShiftOpPayload {
  shiftId?: string | null;
  legacyShiftId?: string | number | null;
  /** BD-3: report revision and shortage allocation version are independent coordinates. */
  reportRevision?: number | null;
  allocationVersion?: number | null;
  salesHalalas?: number | null;
  cardTotalHalalas?: number | null;
  aggregatorTotalsHalalas?: number | null;
  /** Nested keys are not specified by the supplied Admin contract. */
  aggregatorBreakdown?: Record<string, unknown>[] | null;
  openingFloatHalalas?: number | null;
  confirmedOpeningHalalas?: number | null;
  confirmed_opening_halalas?: number | null;
  cashExpectedHalalas?: number | null;
  cashActualHalalas?: number | null;
  varianceHalalas?: number | null;
  cashCountState?: import("./company").CashCountState;
  pendingIncomingCountedHalalas?: number | null;
  varianceAllocations?: Record<string, unknown>[] | null;
  pkg6Review?: Record<string, unknown> | null;
  cashCollectedHalalas?: number | null;
  handoverNotes?: string | null;
  lastCorrection?: Record<string, unknown> | null;
}

/** BD-2 read-only allocation evidence. `version` belongs to the allocation. */
export interface ShiftLiability {
  version?: number | null;
  managerApprovalStatus?: string | null;
  createdByType?: string | null;
  shares?: Array<{
    type?: string | null;
    id?: string | null;
    name?: string | null;
    amountHalalas?: number | null;
  }> | null;
}

export interface Operation {
  id: string;
  /** Human ID, e.g. "OPS-2401". */
  publicId: string;
  moduleKey: ModuleKey;
  sourceModule?: string | null;
  sourceId?: string | null;
  status: OperationStatus;
  statusLabelAr?: string;
  statusLabelShortAr?: string;
  match?: MatchStatus;
  matchLabelAr?: string;
  diffNote?: string | null;
  origin?: OperationOrigin | null;
  /** Both SHF and daily sales rows expose the server's review metadata here. */
  reportReview?: Record<string, unknown> | null;
  /** Present on GET /operations/{id} for SHF operations. */
  reportRevision?: number | null;
  /** Present on GET /operations/{id}; this is not the report revision. */
  allocationVersion?: number | null;
  confirmedOpeningHalalas?: number | null;
  cashCollectedHalalas?: number | null;
  handoverNotes?: string | null;
  lastCorrection?: Record<string, unknown> | null;
  originLabelAr?: string;
  originIcon?: string;
  attachmentCount?: number;
  stage?: OperationStage;
  /** Sales rows only; `null` until reconciled, absent on other modules. */
  salesBreakdown?: SalesBreakdown | null;
  /** Purchases list rows only (T06 §1); absent on other modules. */
  purchaseRow?: import("./company").PurchaseRow | null;
  branchId: string;
  branchName: string;
  brandId?: string;
  brandName?: string;
  restaurantId?: string;
  restaurantName?: string;
  /** Integer halalas; missing/null means unavailable, not zero. */
  amountHalalas?: number | null;
  operationDate: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: OperationActor;
  approvedBy?: OperationActor | null;
  approvedAt?: string | null;
  finalApprovedBy?: OperationActor | null;
  finalApprovedAt?: string | null;
  rejectedBy?: OperationActor | null;
  rejectedAt?: string | null;
  rejectReason?: string | null;
  rejectReasonKey?: string | null;
  rejectNotes?: string | null;
  isConditional?: boolean;
  conditionalNote?: string | null;
  isCorrection?: boolean;
  correctiveRefId?: string | null;
  erpPosted?: boolean;
  erpBatchId?: string | null;
  // ── Head queue-row extras (T10 §A2) — present on /head/operations/* rows ────
  accountantId?: string | null;
  accountantName?: string | null;
  moduleLabel?: string;
  /** Alias of amountHalalas (halalas) emitted on head queue rows. */
  amount?: number;
  // ── Present only on GET /operations/{id} (single-detail response) ──────────
  payload?: ShiftOpPayload & { channels?: unknown[] };
  liability?: ShiftLiability | null;
  auditTrail?: AuditEvent[];
  /** Sales-module single-op detail only (T04 §4); `null` until reconciled. */
  reconciliation?: import("./company").SalesReconciliation | null;
  /** Expenses-module single-op detail only (T05 §1). */
  expenses?: import("./company").ExpensesBlock | null;
  /** Purchases-module single-op detail only (T06 §2). */
  purchases?: import("./company").PurchasesBlock | null;
}

/** POST /accountant/shifts/{id}/corrections (COR-05). */
export interface ShiftReportCorrectionRequest {
  expected_revision: number;
  expected_allocation_version?: number;
  reason: string;
  changes: {
    card_payments?: string;
    cash_collected?: string;
    counted_cash?: string;
    handover_notes?: string | null;
    aggregators?: Array<{ aggregator_id: string; amount: string; notes?: string | null }>;
  };
  shortage_allocations?: Array<{
    type: "cashier" | "employee" | "branch_manager";
    id: string;
    amount: number;
  }>;
}

export interface ShiftReportCorrectionResponse {
  revision_number: number;
  revision_id: string;
  evidence_id: string | null;
  allocation_version: number | null;
  manager_review_required: boolean;
  financial_results: {
    total_sales: string;
    card_payments: string;
    cash_collected: string;
    variance: string;
    variance_halalas: number | null;
    actual_count_halalas: number | null;
    expected_halalas: number | null;
  };
}

export interface AuditEvent {
  icon: string;
  action: string;
  by: string;
  time: string;
  isTerminal?: boolean;
  meta?: Record<string, unknown>;
}

// ─── Notifications ───────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  refType?: string | null;
  refId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

// ─── Common Lookup row ───────────────────────────────────────────────────────
export interface LookupRow {
  id: string;
  name: string;
  nameAr?: string;
  parentId?: string | null;
  extra?: Record<string, unknown>;
}

// Re-export error & page types for convenience.
export type { Page } from "../client";
export { ApiError, isApiError, getErrorMessage } from "../errors";
