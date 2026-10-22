import type { Operation as ApiOperation } from "../../../../api/types";

export type RoleId = "admin" | "head" | "accountant" | "branch" | "procurement" | "supplier";
export type PageId = string;
export type OpStatus = "pending" | "approved" | "rejected" | "final-approved";
export type MatchStatus = "exact" | "review" | "diff";
export type ModuleKey = "sales" | "expenses" | "purchases" | "inventory" | "shifts" | "employees" | "cash";

export interface Filters {
  branch: string;
  status: string;
  match: string;
  search: string;
}

export type PipelineStageId = "submit" | "review" | "approved" | "final" | "erp" | "reports";

export type ExceptionSeverity = "critical" | "high" | "medium";

export interface ExceptionItem {
  severity: ExceptionSeverity;
  icon: string;
  label: string;
  count: number;
  owner: string;
  action: string;
  age: string;
  impact: string;
  navTarget: PageId;
  navLabel: string;
  detail?: string;
}

export interface Op {
  id: string;
  branch: string;
  moduleKey: ModuleKey;
  moduleLabel: string;
  amount: number | null;
  timeAgo: string;
  match: MatchStatus;
  attachments: number;
  status: OpStatus;
  reportReview?: ApiOperation["reportReview"];
  diff?: string;
  salesBreakdown?: { cashHalalas: number; cardHalalas: number; appsHalalas: number; totalSalesHalalas: number; collectedHalalas: number; varianceHalalas: number } | null;
  rejectReason?: string;
  isCorrection?: boolean;
  correctiveRef?: string;
  erpPosted?: boolean;
  erpBatchId?: string;
  erpPostedAt?: string;
  origin: "mobile" | "procurement" | "system";
  accountantId?: string;
  accountantName?: string;
  brandId?: string;
  brandName?: string;
  branchId?: string;
  supplierName?: string;
  operationDate?: string;
  submittedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  finalApprovedBy?: string;
  finalApprovedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
}

export interface PageProps {
  role?: RoleId | null;
  navigate: (p: PageId) => void;
  setModal: (id: string | null) => void;
  setDetailId: (id: string | null) => void;
  detailId: string | null;
  ops: Op[];
  approveOp: (id: string) => void;
  rejectOp: (id: string, reason: string) => void;
  finalApproveOp: (id: string, conditional?: { note: string }) => void;
  bulkApprove: (ids: string[]) => void;
  returnForReview?: (id: string, note?: string) => void;
  addCorrectiveOp?: (refId: string) => void;
  markErpPosted?: (ids: string[]) => Promise<string> | void;
}

export interface AdminUserData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  brands: string[];
  restaurants: string[];
  branches: string[];
  // reportsTo: writes send the head's userId; reads come back as {id,name}.
  modules: string[];
  reportsTo: string | { id: string; name: string } | null;
  companyId?: string;
  scope: "all" | "brand" | "restaurant" | "branch";
  status: "active" | "inactive";
  createdAt?: string;
  lastLoginAt?: string;
  supplierId?: string;
}

/** reportsTo is a userId on write but an object on read — render the name safely. */
export const reportsToName = (v: unknown): string =>
  typeof v === "object" && v !== null && "name" in v ? String((v as any).name) : String(v ?? "");
