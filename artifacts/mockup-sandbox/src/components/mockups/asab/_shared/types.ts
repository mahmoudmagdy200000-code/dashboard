import type { Operation as ApiOperation } from "../../../../api/types";

export type RoleId = "admin" | "head" | "accountant" | "branch" | "procurement" | "supplier";
export type PageId = string;
export type OpStatus = "pending" | "approved" | "rejected" | "final-approved";
export type MatchStatus = "exact" | "review" | "diff";
export type ModuleKey = "sales" | "expenses" | "purchases" | "inventory" | "shifts" | "employees" | "cash";

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
