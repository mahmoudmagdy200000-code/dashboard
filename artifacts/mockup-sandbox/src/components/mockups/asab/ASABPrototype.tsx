import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../../ui/sheet";
import { useDialogFocus } from "../../shared/useDialogFocus";
import "./_group.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Operation as ApiOperation } from "../../../api/types";
import { queryKeys } from "../../../api/queries/keys";
import { runSalesAction, salesBulkApprovalIds } from "./salesActionGuards";
import { headLegacyBulkIds, shouldUpdateHeadOps, runFinancialMutation, validateConditionalApproval, executeMixedBulkApproval } from "./headReviewGuards";
import { EmptyState } from "./components/EmptyState";
import { SimplePage } from "./components/SimplePage";
import { Badge } from "./components/Badge";
import { Btn } from "./components/Btn";
import { KpiCard } from "./components/KpiCard";
import { Card } from "./components/Card";
import { PageHeader } from "./components/PageHeader";
import { Breadcrumb } from "./components/Breadcrumb";
import { LangContext, useLang, type Lang, type LangCtxType } from "./_shared/LangContext";
import {
  fmtAmt,
  opDetailPage,
  AR_MONTHS_LONG,
  EN_MONTHS_LONG,
  AR_WEEKDAYS,
  EN_WEEKDAYS,
  formatTodayLong,
  formatMonthLong,
  formatDateLong,
} from "./_shared/formatters";
import {
  MATCH_CFG,
  STATUS_CFG,
  ORIGIN_CFG,
  EN_MATCH_CFG,
  EN_STATUS_CFG,
  EN_ORIGIN,
  EN_PIPELINE,
  PIPELINE_STAGES,
  getPipelineStage,
  getPipelineLabel,
  EN_SEV_LABEL,
  EN_EXCEPTION_UI,
  EN_EXCEPTION_ITEMS,
  EXCEPTION_SEV_CFG,
} from "./_shared/displayConfig";
import { applyFilters, BRANCHES, topModulePage } from "./_shared/filterOps";
import { PipelineBar, OpStagePill, PipelineOverview } from "./_shared/PipelineOverview";
import { OpRow } from "./_shared/OpRow";
import { deriveExceptions, ExceptionPanel } from "./_shared/ExceptionPanel";
import type { Filters, ExceptionItem, ExceptionSeverity, PipelineStageId } from "./_shared/types";
import { ProcOverview } from "./_pages/procurement/ProcOverview";
import { ProcReports } from "./_pages/procurement/ProcReports";
import { ProcSent } from "./_pages/procurement/ProcSent";
import { ProcItems } from "./_pages/procurement/ProcItems";
import { ProcSuppliers } from "./_pages/procurement/ProcSuppliers";
import { ProcGrouped } from "./_pages/procurement/ProcGrouped";
import { ProcNewOrders } from "./_pages/procurement/ProcNewOrders";
import { AccDashboard } from "./_pages/accountant/AccDashboard";
import { AccSalesPage } from "./_pages/accountant/AccSalesPage";
import { AccSalesDetail } from "./_pages/accountant/AccSalesDetail";
import { AccExpensesPage } from "./_pages/accountant/AccExpensesPage";
import { AccPurchases } from "./_pages/accountant/AccPurchases";
import { AccInventory } from "./_pages/accountant/AccInventory";
import { AccInventoryItems } from "./_pages/accountant/AccInventoryItems";
import { AccShifts } from "./_pages/accountant/AccShifts";
import { AccEmployees } from "./_pages/accountant/AccEmployees";
import { AccCash } from "./_pages/accountant/AccCash";
import { AccAssets } from "./_pages/accountant/AccAssets";
import { AccWaste } from "./_pages/accountant/AccWaste";
import { AccReminders } from "./_pages/accountant/AccReminders";
import { ReportsPage } from "./_pages/accountant/ReportsPage";
import { AccModulePage } from "./_pages/accountant/AccModulePage";
import { FilterBar } from "./_shared/FilterBar";
import { AdminOverview } from "./_pages/admin/AdminOverview";
import { AdminAudit } from "./_pages/admin/AdminAudit";
import { AdminERP } from "./_pages/admin/AdminERP";
import { AdminSettings } from "./_pages/admin/AdminSettings";
import { AdminPackages } from "./_pages/admin/AdminPackages";
import { AdminBranchRequests } from "./_pages/admin/AdminBranchRequests";
import { AdminReports } from "./_pages/admin/AdminReports";
import { AdminSubscriptions } from "./_pages/admin/AdminSubscriptions";
import { AdminCompanies } from "./_pages/admin/AdminCompanies";
import { AdminUsers } from "./_pages/admin/AdminUsers";
import { AdminRestaurants } from "./_pages/admin/AdminRestaurants";
import { AdminPermissions } from "./_pages/admin/AdminPermissions";
import { BranchOverview } from "./_pages/branch/BranchOverview";
import { BranchItems } from "./_pages/branch/BranchItems";
import { BranchSuppliers } from "./_pages/branch/BranchSuppliers";
import { BranchEmployees } from "./_pages/branch/BranchEmployees";
import { BranchUpload } from "./_pages/branch/BranchUpload";
import { BranchSettings } from "./_pages/branch/BranchSettings";
import { SupOverview } from "./_pages/supplier/SupOverview";
import { SupRejected } from "./_pages/supplier/SupRejected";
import { SupReports } from "./_pages/supplier/SupReports";
import { SupNewOrders } from "./_pages/supplier/SupNewOrders";
import { SupAccepted } from "./_pages/supplier/SupAccepted";
import { SupItems } from "./_pages/supplier/SupItems";
import { OwnerReportsPage } from "./_pages/head/OwnerReportsPage";
import { HeadReminders } from "./_pages/head/HeadReminders";
import { HeadApproved } from "./_pages/head/HeadApproved";
import { HeadRejected } from "./_pages/head/HeadRejected";
import { HeadAccountants } from "./_pages/head/HeadAccountants";
import { HeadDashboard } from "./_pages/head/HeadDashboard";
import { HeadApprovalTab } from "./_pages/head/HeadApprovalTab";
import { HeadPending } from "./_pages/head/HeadPending";
import { HeadModulePage } from "./_pages/head/HeadModulePage";
import { HeadShiftHistory } from "./_pages/head/HeadShiftHistory";
import { HeadERP } from "./_pages/head/HeadERP";
import { ModuleAggregationGrid, EN_MODULE_META } from "./_pages/head/ModuleAggregationGrid";
import { AssetDraftProvider, AssetDraftContext, type AssetDraft, type AssetCatType } from "./_shared/assetDraft";
import { toast } from "sonner";
import { useState, useEffect, useMemo, ReactNode, createContext, useContext, useRef, type MouseEvent as ReactMouseEvent } from "react";
import {
  KeyRound, Webhook, History,
  LayoutDashboard, TrendingUp, Wallet, ShoppingCart, Package, Building2, Clock,
  Users, ArrowLeftRight, BarChart3, Settings, Bell, LogOut, ChevronRight,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, MessageSquare, Eye, Download,
  AlertTriangle, Paperclip, ThumbsUp, ThumbsDown, RefreshCw, Star,
  Upload, ChevronsRight, Phone, Search, Plus, Trash2, Edit2, Edit3, X, FileText,
  Truck, Home, Shield, RotateCcw, Lock, Send, Tag, Smartphone, CheckSquare,
  ZapOff, ChevronLeft, Clipboard, Check, CreditCard, ArrowRightToLine, Layers, GitMerge,
  Printer, Globe, MapPin, Copy, ToggleLeft, ToggleRight, Calendar
} from "lucide-react";

// ─────────────────────────────────────────────
// PLATFORM API HOOK IMPORTS (mockup → live API with graceful fallback)
// ─────────────────────────────────────────────
import {
  // Accountant
  useAccountantDashboardPlatform,
  useAccountantOperationsPlatform,
  usePlatformAssets,
  usePlatformAssetDrafts,
  usePlatformInventory,
  useDailyReconciliation,
  usePlatformInventoryCatalog,
  usePlatformInventoryDailyList,
  useSavePlatformDailyInventoryList,
  useAccountantInventoryBrands,
  useAccountantInventoryBrandBranches,
  usePlatformWaste,
  usePlatformReminders,
  // Head
  useHeadDashboardPlatform,
  useAccountantsPerformancePlatform,
  useHeadRemindersPlatform,
  usePatchHeadReminderPlatform,
  useMarkAllHeadRemindersDonePlatform,
  usePendingOperations,
  useFinalApprovedOperations,
  useRejectedOperations,
  useErpEligibleOperationsPlatform,
  useErpBatchesPlatform,
  useErpPreflightPlatform,
  useReportsInternalPlatform,
  useReportsOwnerPlatform,
  useDownloadHeadReport,
  // Admin
  useAdminOverview,
  useAdminUsers,
  useAdminBrands,
  useAdminRestaurantSubscriptions,
  useAdminSubscriptions,
  useAdminCompanies,
  useAdminAuditLogs,
  useAdminPermissions,
  useAdminSettings,
  useUpdateAdminSettings,
  useAdminModules,
  useAdminReportsCatalog,
  useAdminDistribution,
  useUpdateAccountantAssignments,
  useSetAccountantRestaurantModules,
  useSuspendAdminCompany,
  useActivateAdminCompany,
  useUpgradeAdminCompany,
  useRenewSubscription,
  useChangeSubscriptionPlan,
  useUpdateSubscriptionModules,
  useAdminSuppliers,
  useSuspendSubscription,
  useActivateSubscription,
  useToggleAutoReminder,
  useDeleteAdminUser,
  useResetAdminUserPassword,
  useResetCompanyAdminPassword,
  useCreateAdminUser,
  useCreateAdminCompany,
  useCreateAdminBrand,
  useAdminPackages,
  useCreateAdminPackage,
  useUpdateAdminPackage,
  useDeleteAdminPackage,
  type AdminPackage,
  useResetBrandOwnerPassword,
  useCreateAdminRestaurant,
  useCreateAdminSubscription,
  useCreateAdminBranch,
  useAdminUnlinkedBranches,
  useLinkBranch,
  useAdminBranchRequests,
  useApproveBranchRequest,
  useRejectBranchRequest,
  useUploadAdminReport,
  useSendAdminReport,
  useAdminReportStatus,
  useAdminReportPreview,
  useAdminReportPeriods,
  useGenerateAdminReport,
  useUpdateAdminRestaurant,
  useUpdateAdminPermissions,
  useExportAdminAuditLogs,
  useImportAdminUsers,
  useAdminUploadBrand,
  useAdminUploadEmployees,
  useAdminUploadBranchEmployees,
  useAdminUploadFixedAssets,
  useAdminUploadTemplate,
  useAdminBrandUploadStatus,
  useAdminRestaurantEmployeeStatus,
  useAdminBrandBranchesUploadStatus,
  useLookupUsers,
  useAdminAccountantModules,
  useExportOperations,
  useExportHeadOperations,
  useExportAssets,
  useExportAccReminders,
  useExportSupplierItems,
  useExportSupplierOrders,
  useExportProcurementItems,
  useExportSuppliers,
  useExportPayroll,
  useExportCash,
  // T09 — employees ledger & cash custody (shared company hooks; same handlers as platform twin)
  useEmployees,
  useEmployeeMovements,
  useCreateEmployeeMovement,
  useSettleEmployeeBalance,
  useExportEmployeeStatement,
  useCashCustody,
  useCashTransactions,
  useCreateCashTransaction,
  useApproveCashTxn,
  useRejectCashTxn,
  useRequestCashSettlement,
  useSettleCash,
  useExportCashLedger,
  useExportWaste,
  useCreatePlatformAsset,
  useConfirmPlatformAsset,
  useCreateReminder,
  useMissingDataReminders,
  useSendAllReminders,
  useSendMissingReminder,
  useScanReminders,
  useCreateProcurementOrder,
  useUpdateOrder,
  useCreateSupplier,
  useCreateProcurementItem,
  useUpdateBranchSettingsPlatform,
  useLookup,
  // Branch (platform)
  useBranchOverviewPlatform,
  useBranchEmployeesPlatform,
  useAddBranchEmployeePlatform,
  useBranchInventoryItemsPlatform,
  useBranchSuppliersPlatform,
  useBranchUploadStatusPlatform,
  useBranchUpload,
  useBranchSettingsPlatform,
  // Procurement
  useProcurementOverviewPlatform,
  useProcurementSuppliersPlatform,
  useProcurementItemsPlatform,
  // Procurement — purchase-orders bridge (real branch orders)
  usePurchaseOrders,
  usePurchaseOrder,
  useApprovePurchaseOrder,
  usePartialApprovePurchaseOrder,
  useRejectPurchaseOrder,
  useBulkApprovePurchaseOrders,
  useGroupedPurchaseOrders,
  useSendGroupedPurchaseOrders,
  useSentPurchaseOrders,
  usePurchaseOrderGroup,
  // Procurement — items/suppliers actions + reports (company layer, existing)
  useUpdateProcurementItem,
  useDeleteProcurementItem,
  useItemPriceHistory,
  useImportProcurementItems,
  useProcurementItemsTemplate,
  useRateSupplier,
  useToggleSupplierActive,
  useUpdateSupplier,
  useProcurementReports,
  useDownloadProcurementReport,
  // Supplier
  useSupplierOverview,
  useSupplierOrders,
  useSupplierItems,
  useSupplierReports,
  useAcceptSupplierOrder,
  useRejectSupplierOrder,
  useMarkSupplierOrderDelivered,
  useCreateSupplierItem,
  useUpdateSupplierItem,
  useDeleteSupplierItem,
  useToggleSupplierItemActive,
  useImportSupplierItems,
  useSupplierItemsTemplate,
  // Mutation hooks (operations + ERP) — shared platform/company paths.
  useApproveOperation,
  useRejectOperation,
  useFinalApprove,
  useBulkApprove,
  useCreateERPBatch,
  // T10 — head group actions + ERP retry/download + admin ERP
  useBulkFinalApprove,
  useReturnForReview,
  useRetryERPBatch,
  useDownloadERPBatch,
  useAdminErpSummary,
  useAdminErpBatches,
  useAdminErpExport,
  // T03/T04 — single-op detail, attachments, clarification, variance-assign, day/kpis
  useOperation,
  useOperationAttachments,
  useRequestClarification,
  useAuditTrail,
  useCorrectOperation,
  useAssignSalesVariance,
  usePatchSalesDetails,
  useBranchEmployeesLookup,
  useSalesKpis,
  useSalesDayCompleteness,
  // T05 — expenses & fixed assets (company-surface handlers, shared)
  useExpensesKpis,
  useVerifyExpenseInvoice,
  useUnverifyExpenseInvoice,
  useConvertToAssetDraft,
  useAssetDrafts,
  useConfirmAssetDraft,
  useDiscardAssetDraft,
  useAssets,
  useCreateAsset,
  usePatchAsset,
  useImportAssets,
  useAssetCategories,
  // T06 — purchases (3-way match, company-surface handlers, shared)
  usePurchasesList,
  usePatchPurchaseLine,
  useAccountantPurchases,
  useBulkDocumentPurchases,
  useExportAccountantPurchases,
  useSuppliers,
  usePurchaseReturns,
  // T07 — waste mutations + inventory export (company-surface handlers, shared)
  useApproveWaste,
  useRejectWaste,
  useBulkApproveWaste,
  usePatchWasteProduct,
  usePutWasteAllocations,
  useExportInventory,
  // T08 — shifts (company-surface handlers, shared)
  useShiftsLive,
  useShiftsHistory,
  useShiftConfigs,
  useSaveShiftConfig,
  useSaveBranchShiftConfig,
  useExportShifts,
} from "../../../api/queries";
import { isApiError } from "../../../api/errors";
import { canRunAccountantOperations, chooseGrantedRole, grantedRoleKeys, pageForRole, prototypeRoles, purgeFinancialQueries } from "../../../auth/roleAccess";
import { historyBranchOptions, historyPageTarget } from "../../../api/queries/shifts";
import { formatShiftHalalas, formatShiftSalesTotal, getShiftCountEvidence, getShiftStatusDisplay } from "./shiftCountEvidence";
import { api, APP_BASE_URL } from "../../../api/client";
import { NotificationBell } from "../../shared/NotificationBell";
import { GlobalSearch } from "../../shared/GlobalSearch";
import { ClarifyModal } from "../../shared/ClarifyModal";

import { SessionsList } from "../../shared/SessionsList";
import { ChangePasswordModal } from "../../../auth/ChangePasswordModal";
import { NotificationPreferencesPage } from "../../shared/NotificationPreferencesPage";
import { TwoFactorSetupWizard } from "../../shared/TwoFactorSetupWizard";
import { ApiKeysPage } from "../../shared/ApiKeysPage";
import { WebhooksPage } from "../../shared/WebhooksPage";
import { PermissionHistoryDrawer } from "../../shared/PermissionHistoryDrawer";
import { LiveChatWidget } from "../../shared/LiveChatWidget";
import { useLanguagePref } from "../../../auth/useLanguagePref";
import { useAuth } from "../../../auth/AuthContext";
import { readEntrySelection, clearEntrySelection } from "../../../auth/entrySelection";
import { getSiteLang, setSiteLang, useDocumentLang } from "../../../auth/siteLang";
import { V, G, CYAN, ensureAuthStyles } from "../../../auth/authTheme";
import { LangToggle } from "../../../auth/LangToggle";
import { SUPPLIER_PORTAL_ENABLED } from "../../../featureFlags";
import { AsabLogo } from "../../AsabLogo";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
import { type AdminUserData, reportsToName, type RoleId } from "./_shared/types";
type PageId = string;
type OpStatus = "pending" | "approved" | "rejected" | "final-approved";
type MatchStatus = "exact" | "review" | "diff";
type ModuleKey = "sales" | "expenses" | "purchases" | "inventory" | "shifts" | "employees" | "cash";

interface Op {
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
  // Sales matching breakdown (T04 §8) — null until reconciled
  salesBreakdown?: { cashHalalas: number; cardHalalas: number; appsHalalas: number; totalSalesHalalas: number; collectedHalalas: number; varianceHalalas: number } | null;
  rejectReason?: string;
  // Corrective operation traceability
  isCorrection?: boolean;
  correctiveRef?: string;     // ID of the original op this corrects
  // ERP posting is a distinct step AFTER final-approval
  erpPosted?: boolean;
  erpBatchId?: string;        // e.g. ERP-BATCH-20251014-001
  erpPostedAt?: string;
  // Origin: where the operation entered the system
  origin: "mobile" | "procurement" | "system";
  // Head-enriched fields (from /head/operations/* — B-H1)
  accountantId?: string;
  accountantName?: string;
  brandId?: string;
  brandName?: string;
  branchId?: string;
  supplierName?: string;      // present on purchases/expenses rows
  operationDate?: string;     // raw ISO date for date-range filtering
  submittedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  finalApprovedBy?: string;
  finalApprovedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
}

interface AppState {
  role: RoleId | null;
  page: PageId;
  detailId: string | null;
  modal: string | null;
}

// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// LANGUAGE CONTEXT  (Arabic / English)
// ─────────────────────────────────────────────
// (Imported from ./_shared/LangContext)

// ── English translations for static configs ─────────────────────────────────
const EN_NAV_SECTIONS: Record<string, string> = {
  "الرئيسية": "Main", "الموديولات": "Modules", "التقارير": "Reports",
  "المراجعة والاعتماد": "Review & Approval", "التذكيرات والتقارير": "Reminders & Reports",
  "الإدارة": "Management", "إدارة البيانات": "Data Management",
  "الإعدادات": "Settings", "الطلبات": "Orders", "الكتالوج": "Catalog",
  "النظام": "System",
};
const EN_NAV_LABELS: Record<string, string> = {
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
const EN_REPORT_SUBS: Record<string, string> = {
  "pl": "In-depth financial analysis — 3 levels",
  "sales-channel": "Comprehensive channel analysis with ratios",
  "smart-compare": "Monthly & cross-branch comparisons",
  "profit-cash": "Difference between your money and your profit",
  "breakeven": "Risk & financial safety analysis",
  "op-profit": "Performance KPIs and industry comparisons",
  "menu-eng": "Item performance KPIs and comparisons",
};
const EN_ROLE_LABELS: Record<string, { name: string; label: string }> = {
  admin: { name: "—", label: "System Admin" },
  head: { name: "—", label: "Head Accountant" },
  accountant: { name: "—", label: "Accountant" },
  branch: { name: "—", label: "Branch Manager" },
  procurement: { name: "—", label: "Procurement Manager" },
  supplier: { name: "—", label: "Supplier" },
};
const EN_PAGE_LABELS: Record<string, string> = {
  "acc-sales-detail": "Sales Operation Details",
  "acc-inventory-items": "Select Daily Inventory Items",
};


interface PageProps {
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

interface NavSection { section: string }
interface NavItem { id: string; label: string; icon: ReactNode; badge?: number; badgeColor?: "red" | "yellow" }
type NavEntry = NavSection | NavItem;
function isSection(e: NavEntry): e is NavSection { return "section" in e; }

// ─────────────────────────────────────────────
// INITIAL OPERATIONS DATASET  (18 ops)
// ─────────────────────────────────────────────
const INITIAL_OPS: Op[] = [
  { id: "OPS-2401", branch: "فرع الرياض - العليا", moduleKey: "sales", moduleLabel: "مبيعات", amount: 18340, timeAgo: "قبل ساعة", match: "exact", attachments: 3, status: "pending", origin: "mobile" },
  { id: "OPS-2400", branch: "فرع جدة - الحمراء", moduleKey: "expenses", moduleLabel: "مصروفات", amount: 12500, timeAgo: "قبل 3 ساعات", match: "review", attachments: 2, status: "pending", origin: "mobile" },
  { id: "OPS-2399", branch: "فرع مكة - المعابدة", moduleKey: "purchases", moduleLabel: "مشتريات", amount: 8200, timeAgo: "قبل 5 ساعات", match: "diff", attachments: 4, status: "pending", origin: "procurement", diff: "فرق في الكمية: 5 كجم" },
  { id: "OPS-2398", branch: "فرع الدمام - الكورنيش", moduleKey: "sales", moduleLabel: "مبيعات", amount: 45230, timeAgo: "قبل 6 ساعات", match: "exact", attachments: 3, status: "pending", origin: "mobile" },
  { id: "OPS-2397", branch: "فرع الرياض - النزهة", moduleKey: "expenses", moduleLabel: "مصروفات", amount: 3800, timeAgo: "أمس", match: "review", attachments: 1, status: "pending", origin: "mobile" },
  { id: "OPS-2396", branch: "فرع الطائف - المحطة", moduleKey: "inventory", moduleLabel: "مخزون", amount: 6100, timeAgo: "أمس", match: "exact", attachments: 2, status: "pending", origin: "mobile" },
  { id: "OPS-2395", branch: "فرع الرياض - النزهة", moduleKey: "sales", moduleLabel: "مبيعات", amount: 22100, timeAgo: "قبل يومين", match: "exact", attachments: 3, status: "pending", origin: "mobile" },
  { id: "OPS-2394", branch: "فرع جدة - العزيزية", moduleKey: "purchases", moduleLabel: "مشتريات", amount: 5600, timeAgo: "قبل يومين", match: "diff", attachments: 2, status: "pending", origin: "procurement", diff: "فرق في السعر: 120 ر.س" },
  { id: "OPS-2393", branch: "فرع مكة - العزيزية", moduleKey: "shifts", moduleLabel: "شفتات", amount: 2800, timeAgo: "قبل 3 أيام", match: "review", attachments: 1, status: "pending", origin: "mobile" },
  { id: "OPS-2392", branch: "فرع الرياض - العليا", moduleKey: "employees", moduleLabel: "كشف الحساب", amount: 9400, timeAgo: "قبل 3 أيام", match: "exact", attachments: 2, status: "pending", origin: "mobile" },
  { id: "OPS-2391", branch: "فرع الدمام - الدانة", moduleKey: "cash", moduleLabel: "عهدة نقدية", amount: 3000, timeAgo: "قبل 4 أيام", match: "exact", attachments: 1, status: "pending", origin: "mobile" },
  { id: "OPS-2390", branch: "فرع جدة - الحمراء", moduleKey: "sales", moduleLabel: "مبيعات", amount: 31800, timeAgo: "قبل 4 أيام", match: "exact", attachments: 3, status: "approved", origin: "mobile" },
  { id: "OPS-2389", branch: "فرع الرياض - العليا", moduleKey: "expenses", moduleLabel: "مصروفات", amount: 1250, timeAgo: "قبل 5 أيام", match: "exact", attachments: 2, status: "approved", origin: "mobile" },
  { id: "OPS-2388", branch: "فرع مكة - المعابدة", moduleKey: "inventory", moduleLabel: "مخزون", amount: 8500, timeAgo: "قبل 5 أيام", match: "review", attachments: 2, status: "approved", origin: "mobile" },
  { id: "OPS-2387", branch: "فرع الدمام - الكورنيش", moduleKey: "purchases", moduleLabel: "مشتريات", amount: 4800, timeAgo: "قبل أسبوع", match: "exact", attachments: 2, status: "approved", origin: "procurement" },
  { id: "OPS-2386", branch: "فرع الرياض - النزهة", moduleKey: "sales", moduleLabel: "مبيعات", amount: 19200, timeAgo: "قبل أسبوع", match: "exact", attachments: 3, status: "final-approved", origin: "mobile" },
  { id: "OPS-2385", branch: "فرع جدة - العزيزية", moduleKey: "expenses", moduleLabel: "مصروفات", amount: 2100, timeAgo: "قبل أسبوع", match: "exact", attachments: 1, status: "final-approved", origin: "mobile" },
  { id: "OPS-2384", branch: "فرع الطائف - المحطة", moduleKey: "expenses", moduleLabel: "مصروفات", amount: 3400, timeAgo: "قبل أسبوع", match: "diff", attachments: 1, status: "rejected", origin: "mobile", rejectReason: "فاتورة مفقودة" },
];

// ─────────────────────────────────────────────
// NAV CONFIG (badges computed dynamically — see Sidebar)
// ─────────────────────────────────────────────
const NAV_CONFIG: Record<RoleId, NavEntry[]> = {
  accountant: [
    { section: "الرئيسية" },
    { id: "acc-dashboard", label: "لوحة التحكم", icon: <LayoutDashboard size={16} /> },
    { id: "acc-reminders", label: "التذكيرات", icon: <Bell size={16} />, badge: 3, badgeColor: "red" as const },
    { section: "الموديولات" },
    { id: "acc-sales", label: "المبيعات", icon: <TrendingUp size={16} />, badge: 0 },
    { id: "acc-expenses", label: "المصروفات", icon: <Wallet size={16} />, badge: 0 },
    { id: "acc-purchases", label: "المشتريات", icon: <ShoppingCart size={16} />, badge: 0 },
    { id: "acc-inventory", label: "المخزون", icon: <Package size={16} />, badge: 0 },
    { id: "acc-waste", label: "الهدر والتالف", icon: <Trash2 size={16} />, badge: 0 },
    { id: "acc-assets", label: "الأصول الثابتة", icon: <Building2 size={16} /> },
    { id: "acc-shifts", label: "إدارة الشفتات", icon: <Clock size={16} />, badge: 0 },
    { id: "acc-employees", label: "كشف حساب الموظفين", icon: <Users size={16} />, badge: 0 },
    { id: "acc-cash", label: "إدارة العهد النقدية", icon: <ArrowLeftRight size={16} />, badge: 0 },
    { section: "التقارير" },
    { id: "acc-reports", label: "التقارير", icon: <BarChart3 size={16} /> },
  ],
  head: [
    { section: "الرئيسية" },
    { id: "head-dashboard", label: "لوحة التحكم", icon: <LayoutDashboard size={16} /> },
    { section: "المراجعة والاعتماد" },
    { id: "head-pending", label: "بانتظار الاعتماد", icon: <Clock size={16} />, badge: 0 },
    { id: "head-approved", label: "المعتمدة نهائياً", icon: <CheckCircle2 size={16} /> },
    { id: "head-rejected", label: "المرفوضة", icon: <XCircle size={16} /> },
    { section: "الموديولات" },
    { id: "head-sales", label: "المبيعات", icon: <TrendingUp size={16} /> },
    { id: "head-expenses", label: "المصروفات", icon: <Wallet size={16} /> },
    { id: "head-purchases", label: "المشتريات", icon: <ShoppingCart size={16} /> },
    { id: "head-inventory", label: "المخزون", icon: <Package size={16} /> },
    { id: "head-waste", label: "الهدر والتالف", icon: <Trash2 size={16} /> },
    { id: "head-assets", label: "الأصول الثابتة", icon: <Building2 size={16} /> },
    { id: "head-shifts", label: "الشفتات", icon: <Clock size={16} /> },
    { id: "head-employees", label: "كشف حساب الموظفين", icon: <Users size={16} /> },
    { id: "head-cash", label: "العهد النقدية", icon: <ArrowLeftRight size={16} /> },
    { section: "التذكيرات والتقارير" },
    { id: "head-reminders", label: "التذكيرات", icon: <Bell size={16} />, badge: 3, badgeColor: "red" as const },
    { section: "الإدارة" },
    { id: "head-accountants", label: "أداء المحاسبين", icon: <Users size={16} /> },
    { id: "head-erp", label: "التصدير لـ ERP", icon: <ChevronsRight size={16} /> },
    { id: "head-reports", label: "التقارير", icon: <BarChart3 size={16} /> },
  ],
  admin: [
    { section: "الرئيسية" },
    { id: "admin-overview", label: "نظرة عامة", icon: <LayoutDashboard size={16} /> },
    { section: "الإدارة" },
    { id: "admin-users", label: "المستخدمون", icon: <Users size={16} /> },
    { id: "admin-restaurants", label: "المطاعم والفروع", icon: <Home size={16} /> },
    { id: "admin-branch-requests", label: "طلبات الفروع", icon: <Building2 size={16} /> },

    { id: "admin-subscriptions", label: "الاشتراكات", icon: <Shield size={16} />, badgeColor: "yellow" as const },
    { id: "admin-packages", label: "الباقات", icon: <Package size={16} /> },
    { id: "admin-companies", label: "اشتراكات الشركات", icon: <Building2 size={16} />, badgeColor: "yellow" as const },
    { id: "admin-permissions", label: "الصلاحيات", icon: <Settings size={16} /> },
    { section: "التقارير" },
    { id: "admin-reports", label: "مدير التقارير", icon: <BarChart3 size={16} /> },
    { id: "admin-audit", label: "سجل النشاطات", icon: <FileText size={16} /> },
    { section: "النظام" },
    { id: "admin-erp", label: "التصدير لـ ERP", icon: <ChevronsRight size={16} /> },
    { id: "admin-settings", label: "إعدادات النظام", icon: <Settings size={16} /> },
  ],
  branch: [
    { section: "الرئيسية" },
    { id: "branch-overview", label: "نظرة عامة", icon: <LayoutDashboard size={16} /> },
    { section: "إدارة البيانات" },
    { id: "branch-employees", label: "الموظفون", icon: <Users size={16} /> },
    { id: "branch-items", label: "الأصناف", icon: <Package size={16} /> },
    { id: "branch-suppliers", label: "الموردون", icon: <Truck size={16} /> },
    { id: "branch-upload", label: "رفع البيانات", icon: <Upload size={16} /> },
    { section: "الإعدادات" },
    { id: "branch-settings", label: "إعدادات الفرع", icon: <Settings size={16} /> },
  ],
  procurement: [
    { section: "الرئيسية" },
    { id: "proc-overview", label: "لوحة التحكم", icon: <LayoutDashboard size={16} /> },
    { section: "الطلبات" },
    { id: "proc-new", label: "الطلبات الجديدة", icon: <ShoppingCart size={16} /> },
    { id: "proc-grouped", label: "الطلبات المجمعة", icon: <Package size={16} /> },
    { id: "proc-sent", label: "المرسلة للموردين", icon: <Truck size={16} /> },
    { section: "الإدارة" },
    { id: "proc-items", label: "الأصناف", icon: <Package size={16} /> },
    { id: "proc-suppliers", label: "الموردون", icon: <Truck size={16} /> },
    { id: "proc-reports", label: "التقارير", icon: <BarChart3 size={16} /> },
  ],
  supplier: [
    { section: "الرئيسية" },
    { id: "sup-overview", label: "لوحة التحكم", icon: <LayoutDashboard size={16} /> },
    { section: "الطلبات" },
    { id: "sup-new", label: "الطلبات الجديدة", icon: <ShoppingCart size={16} /> },
    { id: "sup-accepted", label: "المقبولة", icon: <CheckCircle2 size={16} /> },
    { id: "sup-rejected", label: "المرفوضة", icon: <XCircle size={16} /> },
    { section: "الكتالوج" },
    { id: "sup-items", label: "الأصناف والأسعار", icon: <Package size={16} /> },
    { id: "sup-reports", label: "تقارير المبيعات", icon: <BarChart3 size={16} /> },
  ],
};

const ROLE_PROFILES: Record<RoleId, { name: string; avatar: string; label: string; defaultPage: PageId }> = {
  admin: { name: "—", avatar: "؟", label: "أدمن النظام", defaultPage: "admin-overview" },
  head: { name: "—", avatar: "؟", label: "رئيس الحسابات", defaultPage: "head-dashboard" },
  accountant: { name: "—", avatar: "؟", label: "محاسب", defaultPage: "acc-dashboard" },
  branch: { name: "—", avatar: "؟", label: "مدير فرع", defaultPage: "branch-overview" },
  procurement: { name: "—", avatar: "؟", label: "مدير المشتريات", defaultPage: "proc-overview" },
  supplier: { name: "—", avatar: "؟", label: "مورد", defaultPage: "sup-overview" },
};

const MODULE_TO_NAV: Record<ModuleKey, string> = {
  sales: "acc-sales", expenses: "acc-expenses", purchases: "acc-purchases",
  inventory: "acc-inventory", shifts: "acc-shifts", employees: "acc-employees", cash: "acc-cash",
};


// Two-letter avatar from a real name ("أحمد محمد" → "أم"); falls back to the first two chars.
const nameInitials = (n: string) => {
  const parts = String(n || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] || "") + (parts[1][0] || "");
  return String(n || "").trim().slice(0, 2);
};

// Top-bar period filter → server-side dateFrom/dateTo (inclusive, YYYY-MM-DD) over
// the real clock. "all" sends nothing (default), so nothing is hidden.
type OpPeriod = "all" | "month" | "week" | "today";
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function periodRange(period: OpPeriod): { dateFrom?: string; dateTo?: string } {
  if (period === "all") return {};
  const now = new Date();
  const today = isoDay(now);
  if (period === "today") return { dateFrom: today, dateTo: today };
  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); // week starts Sunday
    return { dateFrom: isoDay(start), dateTo: today };
  }
  return { dateFrom: isoDay(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: today }; // month
}


// ─────────────────────────────────────────────
// MODULE AGGREGATION STATES — accounting export package readiness
// Mirrors the real ASAB export pipeline: ops → accounting entry → ERP batch → ERP import
// ─────────────────────────────────────────────
type ModuleAggState =
  | "empty"               // no ops in this module
  | "incomplete"          // has pending ops — workflow not complete
  | "ready_consolidation" // all ops reviewed/approved, no finals yet — ready to consolidate
  | "consolidated"        // all ops final-approved — accounting entry locked, ready to batch
  | "ready_erp"           // consolidated + no ERP batch yet — ready to export
  | "exported"            // all final-approved ops are ERP-posted
  | "erp_imported";       // ★ aspirational — ERP acknowledged receipt (not in state machine)

interface ModuleAggCfg { label: string; sublabel: string; step: number; cls: string; dot: string; headerCls: string }
const MODULE_AGG_CFG: Record<ModuleAggState, ModuleAggCfg> = {
  empty: { label: "لا بيانات", sublabel: "لم يُرفع أي بيان", step: 0, cls: "bg-gray-50 text-gray-400 border-gray-200", dot: "bg-gray-300", headerCls: "text-gray-400" },
  incomplete: { label: "غير مكتمل", sublabel: "توجد بيانات معلقة في المراجعة", step: 1, cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", headerCls: "text-red-700" },
  ready_consolidation: { label: "جاهز للتجميع", sublabel: "كل البيانات راجعة — ابدأ التجميع", step: 2, cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", headerCls: "text-amber-700" },
  consolidated: { label: "مُجمَّع", sublabel: "قيد محاسبي مُغلق — جاهز للدفعة", step: 3, cls: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", headerCls: "text-sky-700" },
  ready_erp: { label: "جاهز لـ ERP", sublabel: "دفعة جاهزة للإرسال", step: 4, cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", headerCls: "text-emerald-700" },
  exported: { label: "مُصدَّر", sublabel: "مُرحَّل في ERP — انتظار التأكيد", step: 5, cls: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500", headerCls: "text-indigo-700" },
  erp_imported: { label: "مُستورَد في ERP ★", sublabel: "ERP أكّد الاستلام — مرحلة مستقبلية", step: 6, cls: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500", headerCls: "text-purple-700" },
};

function getModuleAggState(moduleOps: Op[]): ModuleAggState {
  if (moduleOps.length === 0) return "empty";
  const hasPending = moduleOps.some(o => o.status === "pending");
  const hasApproved = moduleOps.some(o => o.status === "approved");
  const hasFinal = moduleOps.some(o => o.status === "final-approved");
  const allFinalPosted = hasFinal && moduleOps.filter(o => o.status === "final-approved").every(o => o.erpPosted);

  if (allFinalPosted && !hasPending && !hasApproved) return "exported";
  if (hasFinal && !hasPending && !hasApproved) return "ready_erp";
  if (!hasPending && !hasFinal && hasApproved) return "ready_consolidation";
  if (!hasPending && hasFinal && hasApproved) return "consolidated";
  if (hasPending && (hasApproved || hasFinal)) return "incomplete";
  if (hasPending) return "incomplete";
  return "consolidated";
}

function LockBanner({ op }: { op?: Op }) {
  const isErpPosted = op?.erpPosted === true;
  return (
    <div className="rounded-xl overflow-hidden border-2 border-emerald-300 shadow-md" dir="rtl">
      {/* Authoritative header stripe */}
      <div className={`flex items-center justify-between px-5 py-3 ${isErpPosted ? "bg-gradient-to-l from-emerald-700 to-emerald-600" : "bg-gradient-to-l from-slate-700 to-slate-600"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Lock size={14} className="text-white" />
          </div>
          <div>
            <p className="text-white font-extrabold text-sm leading-tight">
              {isErpPosted ? "سجل مُغلق ومُرحَّل لـ ERP" : "سجل مُغلق — معتمد نهائياً"}
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              {isErpPosted
                ? `دفعة الترحيل: ${op?.erpBatchId || "—"} · ${op?.erpPostedAt || "—"}`
                : "معتمد نهائياً · في انتظار الترحيل لـ ERP"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs font-bold border ${isErpPosted ? "bg-white/20 text-white border-white/30" : "bg-white/20 text-white border-white/30"}`}>
            <CheckCircle2 size={10} />
            {isErpPosted ? "مُرحَّل لـ ERP" : "معتمد نهائياً"}
          </Badge>
        </div>
      </div>
      {/* Immutability notice */}
      <div className="bg-emerald-50 border-t border-emerald-200 px-5 py-2.5 flex items-center gap-2">
        <AlertTriangle size={12} className="text-emerald-600 flex-shrink-0" />
        <p className="text-xs text-emerald-700 font-medium">
          هذا السجل وصل للحالة النهائية ولا يمكن تعديله أو عكسه. أي تصحيح يتطلب إنشاء عملية تعديل مستقلة مرتبطة بهذا السجل.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUDIT TRAIL BUILDER  (derives lifecycle from op state)
// ─────────────────────────────────────────────
interface AuditEvent {
  icon: string;
  cls: string;
  action: string;
  by: string;
  time: string;
  isTerminal?: boolean;
}

function buildAuditTrail(op: Op): AuditEvent[] {
  const trail: AuditEvent[] = [];

  // Step 1: Creation (always present)
  trail.push({
    icon: "📋", cls: "bg-blue-50 text-blue-600",
    action: `أُنشئ السجل: ${op.id}${op.isCorrection ? ` (تعديل على ${op.correctiveRef})` : ""}`,
    by: op.submittedBy || "مدير الفرع",
    time: "08:00 ص"
  });

  // Step 2: Submission
  trail.push({
    icon: "📤", cls: "bg-blue-50 text-blue-600",
    action: "رُفع للمراجعة المحاسبية",
    by: op.submittedBy || "مدير الفرع",
    time: "08:15 ص"
  });

  // Step 3: Accountant review (if beyond pending)
  if (op.status !== "pending") {
    if (op.status === "rejected") {
      trail.push({
        icon: "✕", cls: "bg-red-50 text-red-600",
        action: `مرفوض — السبب: ${op.rejectReason || "لم يُذكر سبب"}`,
        by: op.rejectedBy || op.approvedBy || "المحاسب المختص",
        time: op.rejectedAt || "10:45 ص",
        isTerminal: true
      });
    } else {
      trail.push({
        icon: "✓", cls: "bg-emerald-50 text-emerald-600",
        action: "راجعه المحاسب ووافق عليه — أُرسل لرئيس الحسابات",
        by: op.approvedBy || "المحاسب المختص",
        time: op.approvedAt || "09:30 ص"
      });
    }
  }

  // Step 4: Head accountant final approval
  if (op.status === "final-approved") {
    trail.push({
      icon: "🔒", cls: "bg-emerald-100 text-emerald-700",
      action: "اعتمده رئيس الحسابات نهائياً — سجل مُغلق",
      by: op.finalApprovedBy || "رئيس الحسابات",
      time: op.finalApprovedAt || "16:42 م",
      isTerminal: !op.erpPosted
    });
  }

  // Step 5: ERP posting (if done)
  if (op.erpPosted) {
    trail.push({
      icon: "🔗", cls: "bg-indigo-50 text-indigo-600",
      action: `رُحِّل إلى نظام ERP — دفعة: ${op.erpBatchId || "—"}`,
      by: "النظام التلقائي / رئيس الحسابات",
      time: op.erpPostedAt || "17:00 م",
      isTerminal: true
    });
  }

  return trail;
}

// ─────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (r: RoleId) => void }) {
  const { lang, setLang, t } = useLang();

  const allRoles: { id: RoleId; icon: string; title: string; titleEn: string; desc: string; descEn: string; badge: string; badgeEn: string; badgeCls: string; accent: string }[] = [
    { id: "admin", icon: "🧠", title: "أدمن النظام", titleEn: "System Admin", desc: "إدارة المستخدمين، الاشتراكات، وإعدادات النظام الكاملة", descEn: "Manage users, subscriptions and full system settings", badge: "نظام", badgeEn: "System", badgeCls: "bg-red-500/20 text-red-200", accent: "#ef4444" },
    { id: "head", icon: "👑", title: "رئيس الحسابات", titleEn: "Head Accountant", desc: "الاعتماد النهائي للعمليات والإشراف على أداء المحاسبين", descEn: "Final approval of operations and supervision of accountants", badge: "اعتماد نهائي", badgeEn: "Final Approval", badgeCls: "bg-amber-500/20 text-amber-200", accent: "#f59e0b" },
    { id: "accountant", icon: "🧮", title: "المحاسب", titleEn: "Accountant", desc: "مراجعة وتدقيق العمليات اليومية من جميع الفروع المخصصة", descEn: "Review and audit daily operations from all assigned branches", badge: "مراجعة يومية", badgeEn: "Daily Review", badgeCls: "bg-blue-500/20 text-blue-200", accent: "#3b82f6" },
    { id: "branch", icon: "🏪", title: "مدير الفرع", titleEn: "Branch Manager", desc: "رفع البيانات اليومية وإدارة موظفي وموردي الفرع", descEn: "Upload daily data and manage branch employees and suppliers", badge: "فرع", badgeEn: "Branch", badgeCls: "bg-emerald-500/20 text-emerald-200", accent: "#10b981" },
    { id: "procurement", icon: "🛒", title: "مدير المشتريات", titleEn: "Procurement Manager", desc: "تجميع طلبات الشراء والتنسيق مع الموردين", descEn: "Consolidate purchase orders and coordinate with suppliers", badge: "مشتريات", badgeEn: "Procurement", badgeCls: "bg-purple-500/20 text-purple-200", accent: "#8b5cf6" },
    { id: "supplier", icon: "🏭", title: "المورد", titleEn: "Supplier", desc: "استلام طلبات التوريد وإدارة الكتالوج والأسعار", descEn: "Receive supply orders and manage catalog and pricing", badge: "مورد", badgeEn: "Supplier", badgeCls: "bg-cyan-500/20 text-cyan-200", accent: "#06b6d4" },
  ];
  // T13 — single-flag gate for «بوابة المورد»: drop the supplier role when off.
  const roles = allRoles.filter(r => r.id !== "supplier" || SUPPLIER_PORTAL_ENABLED);
  ensureAuthStyles();

  return (
    <div className="asab-landing" dir={lang === "ar" ? "rtl" : "ltr"} style={{ direction: lang === "ar" ? "rtl" : "ltr" }}>
      <div className="asab-blob asab-blob--a" style={{ width: 340, height: 340, background: V[300], opacity: 0.3, top: -120, insetInlineStart: -80 }} />
      <div className="asab-blob asab-blob--b" style={{ width: 320, height: 320, background: CYAN, opacity: 0.12, bottom: -120, insetInlineEnd: -60 }} />

      {/* Top bar: logo + language */}
      <header style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 28px", borderBottom: `1px solid ${G[200]}`, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
        <AsabLogo variant="header" />
        <LangToggle lang={lang} onChange={setLang} variant="light" />
      </header>

      {/* Main — role picker */}
      <main style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "44px 24px" }}>
        <div className="asab-rise" style={{ textAlign: "center", marginBottom: 30 }}>
          <h1 style={{ fontSize: 27, fontWeight: 800, color: G[900], margin: 0, letterSpacing: "-0.01em" }}>{t("اختر دورك", "Choose your role")}</h1>
          <p style={{ fontSize: 14, color: G[500], margin: "8px 0 0" }}>{t("ابدأ من حيث تحتاج — كل دور بصلاحياته وشاشاته", "Start where you need — each role has its own permissions and screens")}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, width: "100%", maxWidth: 900 }}>
          {roles.map((r, i) => (
            <button
              key={r.id}
              type="button"
              className="asab-role asab-rise"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => onLogin(r.id)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = r.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = G[200]; }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 15, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, background: `${r.accent}14`, border: `1px solid ${r.accent}33` }}>{r.icon}</div>
              <div style={{ color: G[900], fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{t(r.title, r.titleEn)}</div>
              <div style={{ color: G[500], fontSize: 12, lineHeight: 1.65, marginBottom: 12, minHeight: 34 }}>{t(r.desc, r.descEn)}</div>
              <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 99, fontSize: 10.5, fontWeight: 700, background: `${r.accent}14`, color: r.accent, border: `1px solid ${r.accent}33` }}>{t(r.badge, r.badgeEn)}</span>
            </button>
          ))}
        </div>
      </main>

      <footer style={{ position: "relative", textAlign: "center", padding: "16px 24px 28px", borderTop: `1px solid ${G[200]}` }}>
        <p style={{ fontSize: 12, color: G[400], margin: 0 }}>{t("عصب ASAB · نظام إدارة مالية المطاعم · النسخة التجريبية 2.0", "ASAB · Restaurant financial management · Beta 2.0")}</p>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────
// REJECT MODAL  (captures reason, calls rejectOp)
// ─────────────────────────────────────────────
function RejectModal({ opId, onReject, onClose }: { opId: string; onReject: (id: string, reason: string) => Promise<unknown>; onClose: () => void }) {
  const { t, dir, lang } = useLang();
  const REJECT_REASONS_AR = ["بيانات غير مكتملة", "فاتورة مفقودة أو غير واضحة", "تناقض في المبالغ", "فرق في الكميات", "مورد غير معتمد", "تاريخ غير صحيح", "أخرى"];
  const REJECT_REASONS_EN = ["Incomplete data", "Missing or unclear invoice", "Amount discrepancy", "Quantity difference", "Unapproved supplier", "Incorrect date", "Other"];
  const reasons = lang === "en" ? REJECT_REASONS_EN : REJECT_REASONS_AR;
  const placeholder = t("اختر السبب...", "Select reason...");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false), ref = useRef<HTMLDivElement>(null);
  useDialogFocus(true, ref, onClose, busy);
  const canSubmit = reason !== "" && reason !== placeholder && !busy;
  const submit = async () => {
    if (!canSubmit || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await onReject(opId, notes ? `${reason}: ${notes}` : reason); }
    catch { setError(t("تعذر تنفيذ الإرجاع. السبب والملاحظات محفوظة.", "Return failed. The reason and notes are retained.")); }
    finally { lock.current = false; setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="prototype-reject-title" className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-full max-h-[90dvh] overflow-y-auto" dir={dir}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 id="prototype-reject-title" className="font-bold text-gray-800 text-base">{t("رفض العملية", "Reject Operation")} {opId}</h3>
          <button aria-label={t("إغلاق", "Close")} disabled={busy} onClick={() => { if (!lock.current) onClose(); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-gray-500 text-sm">{t("ستُعاد العملية إلى مدير الفرع مع سبب الرفض.", "The operation will be returned to the branch manager with the rejection reason.")}</p>
          <div>
            <label htmlFor="prototype-reject-reason" className="text-sm font-semibold text-gray-700 block mb-1.5">{t("سبب الرفض", "Rejection Reason")} <span className="text-red-500">*</span></label>
            <select id="prototype-reject-reason" disabled={busy} value={reason} onChange={e => setReason(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              <option value="">{placeholder}</option>
              {reasons.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="prototype-reject-notes" className="text-sm font-semibold text-gray-700 block mb-1.5">{t("ملاحظات إضافية", "Additional Notes")}</label>
            <textarea id="prototype-reject-notes" disabled={busy} value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none" rows={3} placeholder={t("تفاصيل إضافية (اختياري)...", "Additional details (optional)...")} />
          </div>
          {error && <p role="alert">{error}</p>}
          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={submit}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${canSubmit ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
              disabled={!canSubmit}>
              ✕ {t("تأكيد الرفض وإعادة للفرع", "Confirm Rejection & Return to Branch")}
            </button>
            <button disabled={busy} onClick={() => { if (!lock.current) onClose(); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">{t("إلغاء", "Cancel")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADD USER MODAL
// ─────────────────────────────────────────────
// Brand catalog (brand → restaurant → branch) for admin scope/shift selectors comes from
// the platform API (useAdminBrands); intentionally empty — no static seed.
const BRANDS_CATALOG: {
  id: string; name: string; color: string; abbr: string;
  restaurants: { id: string; name: string; branches: string[] }[];
}[] = [];

const ALL_MODULES = ["المبيعات", "المصروفات", "المشتريات", "المخزون", "الشفتات", "كشف الحساب", "العهد النقدية", "الأصول الثابتة"];

// UI plan label (فضي/ذهبي/بلاتيني) → backend plan key (silver/gold/platinum).
const planKey = (label: string): string =>
  (({ "فضي": "silver", "ذهبي": "gold", "بلاتيني": "platinum" }) as Record<string, string>)[label] ?? label;

function AddUserModal({ onAdd, onClose }: { onAdd: (user: AdminUserData) => void; onClose: () => void }) {
  const { t, dir, lang } = useLang();
  const en = lang === "en";
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("محاسب");
  const [reportsTo, setReportsTo] = useState("");
  const [selBrands, setSelBrands] = useState<string[]>([]);
  const [selRests, setSelRests] = useState<string[]>([]);
  const [selBranches, setSelBranches] = useState<string[]>([]);
  const [selModules, setSelModules] = useState<string[]>(["المبيعات", "المصروفات"]);

  const isBranchManager = role === "مدير فرع";
  const isChief = role === "رئيس حسابات";
  const isMorrad = role === "مورد";
  const isProcurement = role === "مدير مشتريات";
  const isAdminRole = role === "أدمن";
  // Roles that carry no company/brand scope at all: platform supplier, platform
  // procurement manager, and system admin (admin is forced to scope "all").
  const isScopeless = isMorrad || isProcurement || isAdminRole;
  // reportsTo must be a real head's userId. Source it from the enriched
  // /lookups/users?role=head — it carries a display-ready `label`
  // ("حسن رشدي — رئيس حسابات") and drops an incomplete invite's empty name onto
  // its email, so same-named heads are distinguishable and no row is blank.
  const { data: headsApi } = useLookupUsers({ role: "head", status: "active" });
  const headOptions = ((Array.isArray(headsApi) ? headsApi : (headsApi as any)?.data ?? []) as any[])
    .map((h: any) => ({
      id: h.id,
      label: h.label
        ?? [h.name || h.email, h.roleLabel].filter(Boolean).join(" — ")
        ?? h.name,
    }))
    .filter((h: any) => h.id);
  // Brands/restaurants/branches come from the API (GET /admin/brands), not a static catalog.
  const { data: brandsApi } = useAdminBrands();
  // Selections are stored as IDs — the endpoint wants UUIDs, and sending display
  // names was a guaranteed 422 (BRANCH_NOT_IN_COMPANY / invalid brand id).
  const brandList = (Array.isArray(brandsApi) ? brandsApi : []).map((b: any) => ({
    id: b.id, name: b.name, color: b.color ?? "#7C3AED", companyId: b.companyId as string | undefined,
    abbr: b.abbr ?? (typeof b.name === "string" ? b.name.slice(0, 2) : "؟"),
    restaurants: (b.restaurants ?? []).map((r: any) => ({
      id: r.id, name: r.name,
      branches: (r.branches ?? []).map((br: any) => typeof br === "string" ? { id: "", name: br } : { id: br.id ?? "", name: br.name }),
    })),
  }));
  const availableRests = brandList.filter(b => selBrands.includes(b.id)).flatMap(b => b.restaurants);
  const availableBranches = availableRests.filter(r => selRests.includes(r.id)).flatMap(r => r.branches);
  const brandNameById = new Map(brandList.map(b => [b.id, b.name]));
  // A branch manager provisions a mobile login that fails closed without a company.
  // The company is the one the picked brand belongs to — derived, not chosen separately.
  const selectedBrandCompanyId = brandList.find(b => selBrands.includes(b.id))?.companyId;

  const scopeFor = (): AdminUserData["scope"] => {
    if (selBranches.length > 0) return "branch";
    if (selRests.length > 0) return "restaurant";
    if (selBrands.length > 0) return "brand";
    return "all";
  };

  const toggleArr = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const ROLES = [
    { v: "محاسب", enV: "Accountant", desc: "مراجعة عمليات المطاعم المخصصة له", enDesc: "Review operations for assigned restaurants", color: "blue" },
    { v: "رئيس حسابات", enV: "Head Accountant", desc: "الإشراف على المحاسبين والاعتماد", enDesc: "Oversee accountants and final approval", color: "amber" },
    { v: "مدير فرع", enV: "Branch Manager", desc: "رفع بيانات فرع محدد", enDesc: "Upload data for a specific branch", color: "emerald" },
    { v: "مدير مشتريات", enV: "Procurement Manager", desc: "إدارة طلبات الشراء والموردين", enDesc: "Manage purchase orders and suppliers", color: "purple" },
    { v: "مورد", enV: "Supplier", desc: "استقبال طلبات التوريد", enDesc: "Receive supply orders", color: "orange" },
    { v: "أدمن", enV: "Admin", desc: "إدارة كاملة للنظام", enDesc: "Full system management", color: "red" },
  ];
  const steps_ar = ["المعلومات الأساسية", "التخصيص والنطاق", "الموديولات والتسلسل"];
  const steps_en = ["Basic Information", "Assignment & Scope", "Modules & Hierarchy"];
  const steps = en ? steps_en : steps_ar;
  const canNext0 = name.trim() !== "";
  // Per-role scope rules (backend-enforced):
  //  • admin / procurement / supplier → no scope at all (admin is forced to "all")
  //  • branch  → a brand + exactly one branch (the company is derived from the brand)
  //  • accountant / head → at least one brand
  const canNext1 = isScopeless
    ? true
    : isBranchManager
      ? selBrands.length === 1 && selBranches.length === 1
      : selBrands.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir={dir}>
      <div className="bg-white rounded-2xl shadow-2xl w-[640px] max-w-full flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800 text-base">{t("إضافة مستخدم جديد", "Add New User")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{en ? `Step ${step + 1} of ${steps.length} — ${steps[step]}` : `الخطوة ${step + 1} من ${steps.length} — ${steps[step]}`}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-0 px-6 pt-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${i === step ? "bg-purple-600 text-white" : i < step ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === step ? "bg-white/30" : i < step ? "bg-emerald-200" : "bg-gray-200"}`}>{i < step ? "✓" : i + 1}</span>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-emerald-200" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {step === 0 && <>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("الاسم الكامل", "Full Name")} <span className="text-red-500">*</span></label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder={t("أحمد محمد السعد", "Ahmed Mohammed Al-Saad")} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("البريد الإلكتروني", "Email Address")}</label>
                <input value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="ahmed@asab.sa" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("رقم الجوال", "Mobile Number")}</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="05XXXXXXXX" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">{t("نوع الدور", "Role Type")} <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(({ v, enV, desc, enDesc, color }) => (
                  <button key={v} onClick={() => setRole(v)}
                    className={`p-3 rounded-xl border-2 ${dir === "ltr" ? "text-left" : "text-right"} transition-all ${role === v ? `border-${color}-400 bg-${color}-50` : "border-gray-100 hover:border-gray-300"}`}>
                    <p className={`text-xs font-bold ${role === v ? `text-${color}-700` : "text-gray-700"}`}>{en ? enV : v}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{en ? enDesc : desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </>}

          {step === 1 && <>
            {isScopeless
              ? <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                <p className="font-semibold">
                  {isAdminRole ? t("أدمن النظام بدون نطاق", "System admin has no scope")
                    : isProcurement ? t("مدير المشتريات حساب منصّة", "Procurement manager is a platform account")
                      : t("المورد حساب منصّة", "Supplier is a platform account")}
                </p>
                <p className="text-xs mt-1 text-amber-500">
                  {isAdminRole ? t("الأدمن يرى كل الشركات — لا يُخصَّص له علامات أو مطاعم أو فروع.", "An admin sees every company — no brands, restaurants or branches are assigned.")
                    : isProcurement ? t("لا يتبع شركة واحدة — يرى طلبات الشراء عبر كل الشركات.", "Not tied to one company — sees purchase orders across all companies.")
                      : t("لا يتبع شركة واحدة — يستقبل طلبات التوريد من كل الشركات.", "Not tied to one company — receives supply orders from all companies.")}
                </p>
              </div>
              : <>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-2">
                    {isBranchManager ? t("اختر العلامة التجارية (واحدة)", "Select Brand (one)") : t("تخصيص العلامات التجارية", "Assign Brands")}
                    <span className="text-red-500"> *</span>
                  </label>
                  {/* The company is derived from the brand — a branch manager picks one
                      brand, which resolves the company automatically at submit. */}
                  <div className="grid grid-cols-2 gap-2">
                    {brandList.map(b => (
                      <label key={b.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selBrands.includes(b.id) ? "border-purple-400 bg-purple-50" : "border-gray-100 hover:border-gray-300"}`}>
                        <input type="checkbox" checked={selBrands.includes(b.id)}
                          onChange={() => { if (isBranchManager) { setSelBrands([b.id]); } else { toggleArr(selBrands, b.id, setSelBrands); } setSelRests([]); setSelBranches([]); }} className="sr-only" />
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: b.color }}>{b.abbr}</div>
                        <span className="text-sm font-semibold text-gray-700">{b.name}</span>
                        {selBrands.includes(b.id) && <CheckCircle2 size={14} className="text-purple-500 mr-auto" />}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Restaurants are no longer assignable here — the endpoint rejects a
                    non-empty `restaurants` (422). A branch manager still drills through
                    a restaurant to reach its branches, so keep it for that role only. */}
                {availableRests.length > 0 && isBranchManager && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-2">{t("اختر المطعم (واحد فقط)", "Select Restaurant (one only)")}</label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {availableRests.map(r => (
                        <label key={r.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selRests.includes(r.id) ? "border-purple-300 bg-purple-50" : "border-gray-100 hover:border-gray-300"}`}>
                          <input type="checkbox" checked={selRests.includes(r.id)} onChange={() => { setSelRests([r.id]); setSelBranches([]); }} className="sr-only" />
                          <span className="text-sm text-gray-700">{r.name}</span>
                          {selRests.includes(r.id) && <CheckCircle2 size={13} className="text-purple-400 mr-auto" />}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {!isBranchManager && !isChief && selBrands.length > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                    {t("تخصيص المطاعم يتم من شاشة «التوزيع»، مش من هنا.", "Restaurant assignment is done from the Distribution screen, not here.")}
                  </div>
                )}

                {isBranchManager && availableBranches.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-2">{t("تخصيص الفرع (واحد فقط)", "Assign Branch (one only)")} <span className="text-red-500">*</span></label>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {availableBranches.map((br: any) => (
                        <label key={br.id || br.name} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${br.id ? "cursor-pointer" : "opacity-40 cursor-not-allowed"} ${selBranches.includes(br.id) ? "border-emerald-300 bg-emerald-50" : "border-gray-100 hover:border-gray-300"}`}>
                          <input type="radio" name="branch" disabled={!br.id} checked={selBranches.includes(br.id)} onChange={() => setSelBranches([br.id])} className="sr-only" />
                          <span className="text-sm text-gray-700">{br.name}</span>
                          {selBranches.includes(br.id) && <CheckCircle2 size={13} className="text-emerald-400 mr-auto" />}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {isChief && selBrands.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    <p className="font-semibold mb-1">{t("رئيس الحسابات — نطاق العلامات التجارية", "Head Accountant — Brand Scope")}</p>
                    <p>{t("سيتمكن من الإشراف على جميع المطاعم والمحاسبين ضمن العلامات التجارية المحددة.", "Will be able to oversee all restaurants and accountants within the selected brands.")}</p>
                  </div>
                )}
              </>
            }
          </>}

          {step === 2 && <>
            {/* Only accountants and head accountants pick modules. Branch managers,
                suppliers, procurement managers and admins work from their own surfaces
                (mobile app / supplier & procurement portals / full admin access), so
                the module grid is hidden for them. */}
            {(isBranchManager || isScopeless) ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
                <p className="font-semibold">
                  {isBranchManager ? t("مدير الفرع لا يحتاج تحديد موديولات أو مسؤول مباشر", "Branch manager needs no modules or direct supervisor")
                    : isMorrad ? t("المورد لا يحتاج موديولات", "A supplier needs no modules")
                      : isProcurement ? t("مدير المشتريات لا يحتاج موديولات", "Procurement manager needs no modules")
                        : t("الأدمن لا يحتاج موديولات", "An admin needs no modules")}
                </p>
                <p className="text-xs mt-1 text-emerald-600">
                  {isBranchManager ? t("يرفع بياناته اليومية من تطبيق الجوال وله صلاحية على جميع الموديولات تلقائياً.", "Uploads daily data from the mobile app with automatic access to all modules.")
                    : isMorrad ? t("يعمل من بوابة المورد — يستقبل طلبات التوريد ويدير الكتالوج، بلا صلاحيات موديولات.", "Works from the supplier portal — receives supply orders and manages the catalog, with no module permissions.")
                      : isProcurement ? t("يعمل من بوابة المشتريات — أوامر الشراء والموردون، بلا صلاحيات موديولات.", "Works from the procurement portal — purchase orders and suppliers, with no module permissions.")
                        : t("الأدمن له صلاحية كاملة على النظام تلقائياً.", "An admin has full access to the system automatically.")}
                </p>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">{t("الموديولات المتاحة", "Available Modules")}</label>
                <div className="grid grid-cols-4 gap-2">
                  {ALL_MODULES.map(m => {
                    const mLabel = en ? (EN_MODULE_META[m] || m) : m;
                    return (
                      <label key={m} className={`flex items-center gap-1.5 p-2.5 rounded-lg border cursor-pointer transition-all text-xs ${selModules.includes(m) ? "border-purple-300 bg-purple-50 text-purple-700 font-semibold" : "border-gray-100 text-gray-600 hover:border-gray-300"}`}>
                        <input type="checkbox" checked={selModules.includes(m)} onChange={() => toggleArr(selModules, m, setSelModules)} className="sr-only" />
                        {selModules.includes(m) && <CheckCircle2 size={12} className="text-purple-500 flex-shrink-0" />}
                        {!selModules.includes(m) && <div className="w-3 h-3 border border-gray-300 rounded flex-shrink-0" />}
                        {mLabel}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {role === "محاسب" && (
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("يرفع تقاريره إلى", "Reports To")}</label>
                {/* Must submit the head's userId — a name is rejected with 422. */}
                <select value={reportsTo} onChange={e => setReportsTo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">{t("— اختر المسؤول المباشر —", "— Select Direct Supervisor —")}</option>
                  {headOptions.map((h: any) => <option key={h.id} value={h.id}>{h.label}</option>)}
                </select>
                {headOptions.length === 0 && <p className="text-[11px] text-gray-400 mt-1">{t("لا يوجد رؤساء حسابات بعد", "No head accountants yet")}</p>}
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-600 mb-2">{t("ملخص التخصيص", "Assignment Summary")}</p>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">{t("الاسم:", "Name:")}</span><span className="font-medium">{name || "—"}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">{t("الدور:", "Role:")}</span><span className="font-medium">{en ? (ROLES.find(r => r.v === role)?.enV || role) : role}</span></div>
                {/* Selections are ids — resolve them back to names for the summary. */}
                <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">{t("العلامات:", "Brands:")}</span><span className="font-medium">{selBrands.map(id => brandNameById.get(id) ?? id).join(en ? ", " : "، ") || "—"}</span></div>
                {selRests.length > 0 && <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">{t("المطاعم:", "Restaurants:")}</span><span className="font-medium">{selRests.map(id => availableRests.find(r => r.id === id)?.name ?? id).join(en ? ", " : "، ")}</span></div>}
                {selBranches.length > 0 && <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">{t("الفرع:", "Branch:")}</span><span className="font-medium">{selBranches.map(id => (availableBranches as any[]).find(b => b.id === id)?.name ?? id).join(en ? ", " : "، ")}</span></div>}
                {!isBranchManager && !isScopeless && <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">{t("الموديولات:", "Modules:")}</span><span className="font-medium">{selModules.length} {t("موديول", "modules")}</span></div>}
                <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0">{t("النطاق:", "Scope:")}</span><span className="font-medium capitalize">{scopeFor()}</span></div>
              </div>
            </div>
          </>}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">{en ? "← Back" : "← السابق"}</button>}
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 mr-auto">{t("إلغاء", "Cancel")}</button>
          {step < 2
            ? <button onClick={() => { if ((step === 0 && canNext0) || (step === 1 && canNext1)) setStep(s => s + 1); }}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors ${(step === 0 && canNext0) || (step === 1 && canNext1) ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
              {en ? "Next →" : "التالي ←"}
            </button>
            : <button onClick={() => {
              if (!name.trim()) return;
              onAdd({
                name, email, phone, role,
                // Scopeless roles must send no scope at all — a stray array would
                // narrow an account that is meant to be unrestricted.
                brands: isScopeless ? [] : selBrands,
                restaurants: isScopeless ? [] : selRests,
                branches: isScopeless ? [] : selBranches,
                // Only accountants/heads carry modules. Branch managers, suppliers,
                // procurement managers and admins send none. Branch managers also carry
                // the company of their picked brand (derived) for the mobile-login provision.
                modules: (isBranchManager || isScopeless) ? [] : selModules,
                reportsTo: isBranchManager ? "" : reportsTo,
                companyId: isBranchManager ? (selectedBrandCompanyId || undefined) : undefined,
                scope: isScopeless ? "all" : scopeFor(), status: "active"
              });
            }} className="px-6 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700">
              ✓ {t("إضافة المستخدم", "Add User")}
            </button>
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
function Sidebar({ role, ops, page, navigate, logout, collapsed, setCollapsed, mobile = false, onClose }: {
  role: RoleId; ops: Op[]; page: PageId;
  navigate: (p: PageId) => void; logout: () => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
  mobile?: boolean; onClose?: () => void;
}) {
  const { lang, setLang, dir } = useLang();
  const { user } = useAuth();
  const tNav = (ar: string) => lang === "ar" ? ar : (EN_NAV_LABELS[ar] || ar);
  const tSection = (ar: string) => lang === "ar" ? ar : (EN_NAV_SECTIONS[ar] || ar);
  const baseProfile = lang === "ar" ? ROLE_PROFILES[role] : { ...ROLE_PROFILES[role], ...EN_ROLE_LABELS[role] };
  // Real branch name for the branch-manager role (gated so other roles never hit it).
  const { data: branchOverview } = useBranchOverviewPlatform({ enabled: role === "branch" });
  const realBranchName = (branchOverview as any)?.branch?.name as string | undefined;
  // Show the real logged-in user's name + avatar (from useAuth); use the real branch
  // name in the branch role's label. Falls back to the static demo profile otherwise.
  // A supplier login's business name lives in /auth/me `supplier.name` (≠ the
  // login person's `name`). Renaming the supplier updates it, so the header
  // reflects the change instead of a stale/static label.
  const supplierName = role === "supplier" ? (user as any)?.supplier?.name as string | undefined : undefined;
  const profile = {
    ...baseProfile,
    name: user?.name || baseProfile.name,
    avatar: user?.avatar || (user?.name ? nameInitials(user.name) : baseProfile.avatar),
    label: (role === "branch" && realBranchName)
      ? `${lang === "ar" ? "مدير فرع" : "Branch Manager —"} ${realBranchName}`
      : (supplierName || baseProfile.label),
  };
  const navEntries = NAV_CONFIG[role];
  const { drafts } = useContext(AssetDraftContext);
  const activeDraftCount = drafts.filter(d => d.status === "draft").length;

  // compute live badge per module nav item
  const pendingByModule = useMemo(() => {
    const counts: Record<string, number> = {};
    ops.filter(o => o.status === "pending").forEach(o => { counts[MODULE_TO_NAV[o.moduleKey]] = (counts[MODULE_TO_NAV[o.moduleKey]] || 0) + 1; });
    return counts;
  }, [ops]);
  const headPendingCount = useMemo(() => ops.filter(o => o.status === "approved").length, [ops]);
  const totalAccPending = useMemo(() => ops.filter(o => o.status === "pending").length, [ops]);

  // Admin sidebar badges = live "needs attention" counts (not static seeds). Gated on the
  // admin role so non-admin sidebars never hit /admin/* endpoints.
  const isAdmin = role === "admin";
  const { data: adminOverview } = useAdminOverview({ enabled: isAdmin });
  const { data: adminUsersData } = useAdminUsers({}, { enabled: isAdmin });
  const { data: adminCompaniesData } = useAdminCompanies({}, { enabled: isAdmin });
  const adminBadges = useMemo(() => {
    if (!isAdmin) return {} as Record<string, number>;
    const inactiveUsers = (Array.isArray(adminUsersData) ? adminUsersData : []).filter((u: any) => u?.status === "inactive").length;
    const brandsNeedingRenewal = Number((adminOverview as any)?.kpis?.brandsNeedingRenewal ?? 0);
    const companies = Array.isArray(adminCompaniesData) ? (adminCompaniesData as any[]) : [];
    const companiesAttention = companies.filter((c: any) => (c?.status && c.status !== "active") || (typeof c?.daysLeft === "number" && c.daysLeft <= 30)).length;
    return { "admin-users": inactiveUsers, "admin-subscriptions": brandsNeedingRenewal, "admin-companies": companiesAttention };
  }, [isAdmin, adminOverview, adminUsersData, adminCompaniesData]);

  const getBadge = (item: NavItem): number | undefined => {
    if (role === "accountant") {
      if (item.id === "acc-dashboard") return totalAccPending || undefined;
      if (item.id === "acc-assets") return activeDraftCount || undefined;
      // Shift management is a live board (live / setup / history) — it has no
      // "pending review" inbox, so a per-module pending count there is misleading.
      if (item.id === "acc-shifts") return undefined;
      return pendingByModule[item.id] || undefined;
    }
    if (role === "head" && item.id === "head-pending") return headPendingCount || undefined;
    if (isAdmin) return adminBadges[item.id] || undefined;
    return item.badge || undefined;
  };

  return (
    <aside className="flex flex-col flex-shrink-0 transition-all duration-200"
      style={{ width: mobile ? "100%" : collapsed ? 64 : 252, height: mobile ? "100%" : undefined, background: "linear-gradient(180deg,#0F1C35 0%,#1B3A6B 100%)", minHeight: mobile ? undefined : "100vh", direction: dir }}>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-white/10">
        <AsabLogo variant="sidebar" showWordmark={!collapsed} />
        <button onClick={() => mobile ? onClose?.() : setCollapsed(!collapsed)}
          aria-label={mobile ? (lang === "ar" ? "إغلاق القائمة" : "Close menu") : (lang === "ar" ? "طي القائمة أو توسيعها" : "Collapse or expand menu")}
          className="min-w-11 min-h-11 text-white/70 hover:text-white transition-colors ms-auto">
          {mobile ? <X size={18} /> : <ChevronRight size={16} className={collapsed ? "" : "rotate-180"} />}
        </button>
      </div>
      {/* Role */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-b border-white/10">
          <div className="text-[11px] px-2 py-1 rounded-full inline-block font-semibold bg-white/10 text-white/80">{profile.label}</div>
        </div>
      )}
      {/* Language toggle */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
          <span className="text-white/40 text-[10px]">{lang === "ar" ? "اللغة" : "Language"}</span>
          <div className="flex bg-white/10 rounded-lg p-0.5 gap-0.5">
            {(["ar", "en"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${lang === l ? "bg-white text-gray-800 shadow-sm" : "text-white/50 hover:text-white/80"}`}>
                {l === "ar" ? "عربي" : "EN"}
              </button>
            ))}
          </div>
        </div>
      )}
      {collapsed && (
        <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="mx-auto my-2 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors text-[9px] font-bold flex-shrink-0">
          {lang === "ar" ? "EN" : "ع"}
        </button>
      )}
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navEntries.map((entry, i) => {
          if (isSection(entry)) return !collapsed
            ? <div key={i} className="text-white/30 text-[10px] font-bold uppercase tracking-widest px-3 pt-4 pb-1">{tSection(entry.section)}</div>
            : <div key={i} className="my-2 border-t border-white/10" />;
          const active = page === entry.id || (entry.id === "acc-sales" && page === "acc-sales-detail") || (entry.id === "acc-inventory" && page === "acc-inventory-items");
          const badge = getBadge(entry);
          return (
            <button key={entry.id} onClick={() => navigate(entry.id)} aria-current={active ? "page" : undefined} aria-label={lang === "ar" ? entry.label : (EN_NAV_LABELS[entry.id] || entry.label)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${dir === "ltr" ? "text-left" : "text-right"} ${active ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/8 hover:text-white/90"}`}>
              <span className={`flex-shrink-0 ${active ? "text-[#00D9FF]" : ""}`}>{entry.icon}</span>
              {!collapsed && (<>
                <span className="text-[13px] font-medium flex-1 leading-tight">{lang === "ar" ? entry.label : (EN_NAV_LABELS[entry.id] || entry.label)}</span>
                {badge ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${entry.id === "acc-assets" ? "bg-purple-500 text-white" : (entry as NavItem).badgeColor === "yellow" ? "bg-amber-500 text-white" : "bg-red-500 text-white"}`}>{badge}</span> : null}
              </>)}
            </button>
          );
        })}
      </nav>
      {/* User */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{profile.avatar}</div>
          {!collapsed && (<>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{profile.name}</div>
              <div className="text-white/40 text-[10px] truncate">{profile.label}</div>
            </div>
            <button aria-label={lang === "ar" ? "تسجيل الخروج" : "Logout"} onClick={logout} className="text-white/30 hover:text-red-300 transition-colors"><LogOut size={14} /></button>
          </>)}
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────
function AppShell({ state, ops, period, setPeriod, approveOp, rejectOp, finalApproveOp, bulkApprove, returnForReview, addCorrectiveOp, markErpPosted, navigate, logout, setModal, setDetailId, allowedRoles, onSelectRole }: {
  state: AppState; ops: Op[];
  period: OpPeriod; setPeriod: (p: OpPeriod) => void;
  approveOp: (id: string) => void; rejectOp: (id: string, r: string) => void;
  finalApproveOp: (id: string, conditional?: { note: string }) => void; bulkApprove: (ids: string[]) => void;
  returnForReview?: (id: string, note?: string) => void;
  addCorrectiveOp?: (refId: string) => void; markErpPosted?: (ids: string[]) => Promise<string> | void;
  navigate: (p: PageId) => void; logout: () => void;
  setModal: (id: string | null) => void; setDetailId: (id: string | null) => void;
  allowedRoles: RoleId[]; onSelectRole: (role: RoleId) => void;
}) {
  const { lang, setLang, t: tL, dir } = useLang();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [state.page, state.role]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (media.matches) setMobileOpen(false); };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);
  // Seeded empty; AdminUsers syncs this from GET /admin/users (useAdminUsers).
  const [adminUsers, setAdminUsers] = useState<AdminUserData[]>([]);
  const createAdminUserMut = useCreateAdminUser();

  const role = state.role!;
  const { user } = useAuth();
  const profile = ROLE_PROFILES[role];
  // Supplier header shows the business name from /auth/me `supplier.name`.
  const supplierName = role === "supplier" ? (user as any)?.supplier?.name as string | undefined : undefined;

  const pageLabel = useMemo(() => {
    const nav = NAV_CONFIG[role];
    for (const e of nav) if (!isSection(e) && e.id === state.page) {
      return lang === "ar" ? e.label : (EN_NAV_LABELS[e.id] || e.label);
    }
    if (state.page === "acc-sales-detail") return lang === "ar" ? "تفاصيل عملية المبيعات" : "Sales Operation Details";
    if (state.page === "acc-inventory-items") return lang === "ar" ? "تحديد أصناف الجرد اليومي" : "Select Daily Inventory Items";
    return "";
  }, [role, state.page, lang]);

  const pageProps: PageProps = { role: state.role, navigate, setModal, setDetailId, detailId: state.detailId, ops, approveOp, rejectOp, finalApproveOp, bulkApprove, returnForReview, addCorrectiveOp, markErpPosted };

  const enProfile = lang === "ar" ? profile : { ...profile, ...EN_ROLE_LABELS[role] };

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F0F4FA]" dir={dir}>
      <div className="hidden md:flex"><Sidebar role={role} ops={ops} page={state.page} navigate={navigate} logout={logout}
        collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} /></div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild><button type="button" className="md:hidden fixed top-3 z-20 min-w-11 min-h-11 bg-white rounded-lg border" style={{ insetInlineStart: 8 }} aria-label={tL("فتح القائمة", "Open menu")}><Menu size={20} /></button></SheetTrigger>
        <SheetContent side={dir === "rtl" ? "right" : "left"} dir={dir} aria-describedby={undefined} className="w-[min(90vw,280px)] p-0 [&>button]:hidden">
          <SheetTitle className="sr-only">{tL("القائمة الرئيسية", "Main menu")}</SheetTitle>
          <Sidebar role={role} ops={ops} page={state.page} navigate={page => { navigate(page); setMobileOpen(false); }} logout={logout}
            collapsed={false} setCollapsed={setSidebarCollapsed} mobile onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 ps-16 md:ps-5 pe-3 py-3 flex flex-wrap items-center gap-3 flex-shrink-0 shadow-sm z-10">
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-800 font-bold text-base leading-tight">{pageLabel}</h1>
            <nav aria-label={tL("مسار الصفحة", "Breadcrumb")} className="text-gray-500 text-xs flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate(ROLE_PROFILES[role].defaultPage)}>{supplierName || enProfile.label}</button>
              <span aria-current="page">{pageLabel}</span>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {allowedRoles.length > 1 && <select aria-label={tL("الدور الممنوح", "Granted role")} value={role}
              onChange={e => onSelectRole(e.target.value as RoleId)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              {allowedRoles.map(r => <option key={r} value={r}>{ROLE_PROFILES[r].label}</option>)}
            </select>}
            <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hidden sm:block">
              {formatTodayLong(lang)}
            </div>
            {role !== "supplier" && <select aria-label={tL("فترة العمليات", "Operations period")} value={period} onChange={e => setPeriod(e.target.value as OpPeriod)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-gray-50">
              <option value="all">{tL("الكل", "All")}</option>
              <option value="month">{tL("هذا الشهر", "This Month")}</option>
              <option value="week">{tL("هذا الأسبوع", "This Week")}</option>
              <option value="today">{tL("اليوم", "Today")}</option>
            </select>
            }
            {/* ADM-F02: Guard shared search for platform admin */}
            {role === "admin" ? (
              <div
                className="opacity-60 cursor-not-allowed"
                title={tL(
                  "بحث المنصة الموحد يتطلب تحديد نطاق مستأجر (شركة) أو تفعيل نقطة نهاية إدارية مركزية",
                  "Platform search requires company tenant scope or central admin endpoint",
                )}
              >
                <div className="relative">
                  <input
                    disabled
                    type="text"
                    placeholder={tL("بحث المنصة غير متاح بدون شركة...", "Platform search unavailable...")}
                    className="text-xs bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-400 cursor-not-allowed w-44"
                  />
                </div>
              </div>
            ) : role === "supplier" ? (
              <span className="text-xs text-gray-500">{tL("بحث المورد غير متاح بعقد الخادم الحالي", "Supplier search requires an approved Backend contract")}</span>
            ) : (
              <GlobalSearch t={tL} theme="light" role={role} pages={NAV_CONFIG[role].flatMap(entry => isSection(entry) ? [] : [entry.id])} onNavigate={navigate} />
            )}
            {/* Language Globe */}
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 font-semibold transition-colors"
              title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}>
              <Globe size={13} />
              {lang === "ar" ? "EN" : "عربي"}
            </button>
            {/* ADM-F03: Guard shared notifications for platform admin */}
            {role === "admin" ? (
              <div
                className="opacity-60 cursor-not-allowed p-1.5 text-gray-400"
                title={tL(
                  "إشعارات المنصة تتطلب تفعيل مركز إشعارات النظام الإداري",
                  "Platform notifications require system admin notification center",
                )}
              >
                <Bell size={16} />
              </div>
            ) : role === "supplier" ? (
              <span className="text-xs text-gray-500">{tL("إشعارات المورد غير متاحة بعقد الخادم الحالي", "Supplier notifications require an approved Backend contract")}</span>
            ) : (
              <NotificationBell t={tL} theme="light" role={role} pages={NAV_CONFIG[role].flatMap(entry => isSection(entry) ? [] : [entry.id])} onNavigate={navigate} />
            )}
            <button onClick={logout} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1">
              <LogOut size={13} /> {tL("خروج", "Logout")}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-5">
          <PageRouter state={state} pageProps={pageProps} adminUsers={adminUsers} setAdminUsers={setAdminUsers} />
        </main>
      </div>

      {/* Reject Modal */}
      {state.modal === "reject" && state.detailId && (
        <RejectModal opId={state.detailId}
          onReject={async (id, reason) => {
            const result: unknown = rejectOp(id, reason);
            if (!result || typeof (result as Promise<unknown>).then !== "function") throw new Error("Return unavailable");
            await result; setModal(null);
          }}
          onClose={() => setModal(null)} />
      )}

      {/* Add User Modal */}
      {state.modal === "add-user" && (
        <AddUserModal
          onAdd={u => {
            const roleKey = ({ "محاسب": "accountant", "رئيس حسابات": "head", "مدير فرع": "branch", "مدير مشتريات": "procurement", "مورد": "supplier", "أدمن": "admin" } as Record<string, string>)[u.role] ?? u.role;
            // Drop empty scope arrays and `scope` itself — the backend derives scope,
            // and `restaurants` is now `prohibited` on this endpoint (422).
            const { restaurants: _r, scope: _s, ...rest } = u as any;
            const body: any = { ...rest, role: roleKey };
            if (!body.brands?.length) delete body.brands;
            if (!body.branches?.length) delete body.branches;
            if (!body.companyId) delete body.companyId;
            if (!body.reportsTo) delete body.reportsTo;
            createAdminUserMut.mutate(body, {
              onSuccess: (created: any) => {
                setAdminUsers(prev => [...prev, created ? { ...u, ...created } : u]);
                setModal(null);
                // Passwords are emailed by default now; false = the user got nothing.
                if (created?.emailSent === false) {
                  toast.warning("تم إنشاء المستخدم، لكن لم يصل بريد كلمة المرور — استخدم «إعادة تعيين كلمة المرور».");
                }
              },
            });
          }}
          onClose={() => setModal(null)} />
      )}

      {/* Contact Modal */}
      {state.modal === "contact" && (
        <div role="dialog" aria-modal="true" aria-label={tL("التواصل مع الموظف", "Contact Employee")} tabIndex={-1} onKeyDown={e => { if (e.key === "Escape") setModal(null); }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[380px]" onClick={e => e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{tL("التواصل مع الموظف", "Contact Employee")}</h3>
              <button aria-label={tL("إغلاق", "Close")} onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center mx-auto mb-2"><span className="text-white font-bold text-lg">خش</span></div>
                <p className="font-bold text-gray-800">{tL("خالد الشمري", "Khalid Al-Shamri")}</p>
                <p className="text-gray-500 text-sm">{tL("مشرف الشفت — فرع الرياض العليا", "Shift Supervisor — Riyadh Al-Olaya Branch")}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><Phone size={18} className="text-emerald-600" /></div>
                  <div><p className="font-semibold text-sm">{tL("اتصال هاتفي", "Phone Call")}</p><p className="text-xs text-gray-400">+966 51 234 5678</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#25D366" }}><span className="text-white text-lg">📱</span></div>
                  <div><p className="font-semibold text-sm">{tL("واتساب", "WhatsApp")}</p><p className="text-xs text-gray-400">{tL("فتح المحادثة في واتساب", "Open WhatsApp chat")}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────
// FILTER BAR  (shared by all ops list pages)
// ─────────────────────────────────────────────



// ─────────────────────────────────────────────
// PAGE ROUTER
// ─────────────────────────────────────────────
function PageRouter({ state, pageProps, adminUsers, setAdminUsers }: {
  state: AppState; pageProps: PageProps;
  adminUsers: AdminUserData[];
  setAdminUsers: (v: any) => void;
}) {
  const { role, page } = state;
  const p = pageProps;

  if (role === "accountant") {
    if (page === "acc-dashboard") return <AccDashboard {...p} />;
    if (page === "acc-sales") return <AccSalesPage {...p} />;
    if (page === "acc-sales-detail") return <AccSalesDetail {...p} />;
    if (page === "acc-expenses") return <AccExpensesPage {...p} />;
    if (page === "acc-purchases") return <AccPurchases {...p} />;
    if (page === "acc-inventory") return <AccInventory {...p} />;
    if (page === "acc-inventory-items") return <AccInventoryItems {...p} />;
    if (page === "acc-shifts") return <AccShifts {...p} />;
    if (page === "acc-employees") return <AccEmployees {...p} />;
    if (page === "acc-cash") return <AccCash {...p} />;
    if (page === "acc-assets") return <AccAssets {...p} />;
    if (page === "acc-waste") return <AccWaste {...p} />;
    if (page === "acc-reminders") return <AccReminders {...p} />;
    if (page === "acc-reports") return <ReportsPage {...p} />;
  }
  if (role === "head") {
    if (page === "head-dashboard") return <HeadDashboard {...p} />;
    if (page === "head-pending") return <HeadPending {...p} />;
    if (page === "head-approved") return <HeadApproved {...p} />;
    if (page === "head-rejected") return <HeadRejected {...p} />;
    if (page === "head-accountants") return <HeadAccountants {...p} />;
    if (page === "head-erp") return <HeadERP {...p} />;
    if (page === "head-reports") return <OwnerReportsPage {...p} />;
    if (page === "head-reminders") return <HeadReminders {...p} />;
    const mk = page.replace("head-", "") as ModuleKey;
    return <HeadModulePage moduleKey={mk} {...p} />;
  }
  if (role === "admin") {
    if (page === "admin-overview") return <AdminOverview {...p} />;
    if (page === "admin-users") return <AdminUsers {...p} users={adminUsers} setUsers={setAdminUsers} />;
    if (page === "admin-restaurants") return <AdminRestaurants {...p} />;
    if (page === "admin-branch-requests") return <AdminBranchRequests {...p} />;
    if (page === "admin-subscriptions") return <AdminSubscriptions {...p} />;
    if (page === "admin-packages") return <AdminPackages {...p} />;
    if (page === "admin-companies") return <AdminCompanies {...p} />;
    if (page === "admin-reports") return <AdminReports {...p} />;
    if (page === "admin-audit") return <AdminAudit {...p} />;
    if (page === "admin-permissions") return <AdminPermissions {...p} />;
    if (page === "admin-erp") return <AdminERP {...p} />;
    if (page === "admin-settings") return <AdminSettings {...p} />;
  }
  if (role === "branch") {
    if (page === "branch-overview") return <BranchOverview {...p} />;
    if (page === "branch-employees") return <BranchEmployees {...p} />;
    if (page === "branch-items") return <BranchItems {...p} />;
    if (page === "branch-suppliers") return <BranchSuppliers {...p} />;
    if (page === "branch-upload") return <BranchUpload {...p} />;
    if (page === "branch-settings") return <BranchSettings {...p} />;
  }
  if (role === "procurement") {
    if (page === "proc-overview") return <ProcOverview {...p} />;
    if (page === "proc-new") return <ProcNewOrders {...p} />;
    if (page === "proc-grouped") return <ProcGrouped {...p} />;
    if (page === "proc-sent") return <ProcSent {...p} />;
    if (page === "proc-reports") return <ProcReports {...p} />;
    if (page === "proc-items") return <ProcItems {...p} />;
    if (page === "proc-suppliers") return <ProcSuppliers {...p} />;
    return <SimplePage title={page} icon="🛒" desc="" />;
  }
  if (role === "supplier") {
    if (page === "sup-overview") return <SupOverview {...p} />;
    if (page === "sup-new") return <SupNewOrders {...p} />;
    if (page === "sup-accepted") return <SupAccepted {...p} />;
    if (page === "sup-rejected") return <SupRejected {...p} />;
    if (page === "sup-items") return <SupItems {...p} />;
    if (page === "sup-reports") return <SupReports {...p} />;
    return <SimplePage title={page} icon="🏭" desc="" />;
  }
  return <SimplePage title="قيد التطوير" icon="🚧" desc="هذه الصفحة قيد التطوير" />;
}


// ── API Operation → local Op mapping ─────────────────────────────────────────
// The platform API returns a different shape (branchName, amountHalalas in integer
// halalas, operationDate, publicId, actor objects, match = match|variance|unknown).
// Casting it straight to Op leaves display fields (e.g. timeAgo) undefined and
// crashes the dashboards (deriveExceptions calls timeAgo.includes). Map explicitly.
const OP_MODULE_LABELS: Record<string, string> = {
  sales: "مبيعات", expenses: "مصروفات", purchases: "مشتريات", inventory: "مخزون",
  shifts: "شفتات", employees: "كشف الحساب", cash: "عهدة نقدية", waste: "هالك",
};

function relativeTimeAr(dateStr?: string): string {
  if (!dateStr) return "—";
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "—";
  const hours = Math.floor((Date.now() - then) / 3_600_000);
  if (hours < 1) return "للتو";
  if (hours < 24) return `قبل ${hours} ساعات`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "أمس";
  if (days < 7) return `قبل ${days} أيام`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "قبل أسبوع";
  if (weeks < 4) return `قبل ${weeks} أسابيع`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "قبل شهر" : `قبل ${months} أشهر`;
}

function actorName(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "name" in v)
    return String((v as { name?: unknown }).name ?? "");
  return undefined;
}

function mapApiOpToOp(a: any): Op {
  // Backend (T03) now emits canonical enums directly (match: exact|review|diff,
  // origin: mobile|procurement|system). Keep the legacy aliases mapped too for
  // any not-yet-migrated rows.
  const matchMap: Record<string, MatchStatus> = {
    exact: "exact", review: "review", diff: "diff",
    match: "exact", variance: "diff", unknown: "review",
  };
  const originMap: Record<string, Op["origin"]> = {
    mobile: "mobile", procurement: "procurement", system: "system",
    "branch-upload": "mobile", manual: "procurement",
  };
  return {
    id: a.publicId ?? a.id ?? "",
    reportReview: a.reportReview,
    // Display the name only — the backend now always sends branchName ("" for a
    // deleted branch). branchId is kept below for filtering/links, never shown as
    // a label (it was the raw UUID leaking into «اسم الفرع»).
    branch: a.branchName ?? "—",
    moduleKey: a.moduleKey,
    moduleLabel: OP_MODULE_LABELS[a.moduleKey] ?? a.moduleKey ?? "",
    // Money always arrives in halalas (amountHalalas, or amount as the halalas int) —
    // HA-F11: preserve exact halalas without Math.round truncation.
    amount: typeof a.amountHalalas === "number" ? a.amountHalalas / 100 : (typeof a.amount === "number" ? a.amount / 100 : null),
    supplierName: a.supplierName ?? undefined,
    timeAgo: relativeTimeAr(a.operationDate ?? a.createdAt),
    operationDate: a.operationDate ?? a.createdAt ?? undefined,
    accountantId: a.accountantId ?? undefined,
    accountantName: a.accountantName ?? undefined,
    brandId: a.brandId ?? undefined,
    brandName: a.brandName ?? undefined,
    branchId: a.branchId ?? undefined,
    // HA-F38: unknown/missing match falls back safely to "review", never "exact"
    match: matchMap[a.match] ?? "review",
    salesBreakdown: a.salesBreakdown ?? null,
    attachments: typeof a.attachmentCount === "number" ? a.attachmentCount : (typeof a.attachments === "number" ? a.attachments : 0),
    status: a.status,
    diff: a.diff ?? undefined,
    rejectReason: a.rejectReason ?? undefined,
    isCorrection: a.isCorrection ?? undefined,
    correctiveRef: a.correctiveRefId ?? undefined,
    erpPosted: a.erpPosted ?? undefined,
    erpBatchId: a.erpBatchId ?? undefined,
    origin: originMap[a.origin] ?? "system",
    submittedBy: actorName(a.submittedBy),
    approvedBy: actorName(a.approvedBy),
    approvedAt: a.approvedAt ?? undefined,
    finalApprovedBy: actorName(a.finalApprovedBy),
    finalApprovedAt: a.finalApprovedAt ?? undefined,
    rejectedBy: actorName(a.rejectedBy),
    rejectedAt: a.rejectedAt ?? undefined,
  };
}

// Distinct {id,name} brands present in the loaded ops — powers the brand filter
// dropdowns on the sales/expenses tabs (meeting 2026-07-29 §2). The whole op set
// is fetched in the caller's scope and filtered client-side, so the options are
// simply the brands the accountant/head can actually see.
function brandOptionsFromOps(ops: Op[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const o of ops) {
    const id = o.brandId ?? "";
    const name = o.brandName ?? "";
    if (id && name && !seen.has(id)) seen.set(id, name);
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}


// ════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════
export function ASABPrototype() {
  // Seed from the site-wide language chosen on the entry screen, and keep them in sync.
  const [lang, setLangState] = useState<Lang>(() => getSiteLang());
  useDocumentLang(lang);
  const setLang = (l: Lang) => { setSiteLang(l); setLangState(l); };
  const t = <T,>(ar: T, en: T): T => lang === "ar" ? ar : en;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const { user, logout: authLogout } = useAuth();
  const queryClient = useQueryClient();
  const [switchingRole, setSwitchingRole] = useState(false);
  const switchLock = useRef(false);

  // The entry pick is only a preference among roles granted by /auth/me.
  const [appState, setAppState] = useState<AppState>(() => {
    const sel = readEntrySelection();
    const role = chooseGrantedRole(user, prototypeRoles,
      sel?.slug === "asab/ASABPrototype" ? sel.role : null) as RoleId | null;
    let initPage = role ? ROLE_PROFILES[role].defaultPage : "";
    try {
      if (typeof window !== "undefined" && window.location) {
        const sp = new URLSearchParams(window.location.search);
        const p = sp.get("page");
        if (p && /^[a-zA-Z0-9_-]{1,64}$/.test(p) && role) {
          initPage = pageForRole(role, p, initPage);
        } else {
          const hash = window.location.hash || "";
          const q = hash.indexOf("?");
          if (q !== -1) {
            const hp = new URLSearchParams(hash.slice(q)).get("page");
            if (hp && /^[a-zA-Z0-9_-]{1,64}$/.test(hp) && role) {
              initPage = pageForRole(role, hp, initPage);
            }
          }
        }
      }
    } catch { /* ignore */ }
    return { role, page: initPage, detailId: null, modal: null };
  });
  const allowedRoles = grantedRoleKeys(user).filter(r => prototypeRoles.includes(r) && (r !== "supplier" || SUPPLIER_PORTAL_ENABLED)) as RoleId[];
  const currentRole = appState.role && allowedRoles.includes(appState.role) ? appState.role : allowedRoles[0] ?? null;
  const currentPage = currentRole ? pageForRole(currentRole, appState.page, ROLE_PROFILES[currentRole].defaultPage) : "";
  const safeState = { ...appState, role: currentRole, page: currentPage };
  // Top-bar period filter (server-side dateFrom/dateTo). Default "all" → no params,
  // so nothing is hidden until the user picks a window. Applies to the operation
  // lists only (per backend §d).
  const [period, setPeriod] = useState<OpPeriod>("all");
  const opsRange = useMemo(() => periodRange(period), [period]);
  // Live operations from platform API — falls back to INITIAL_OPS when API returns empty.
  // Local setOps is preserved to drive optimistic UI for approve / reject / final-approve / ERP mutations.
  const isHead = currentRole === "head";
  const { data: apiOps } = useAccountantOperationsPlatform({ pageSize: 100, ...opsRange },
    { enabled: !switchingRole && canRunAccountantOperations(user, currentRole) });
  // B-H1: head reads from the enriched /head/operations/* queues (accountantName, brandName,
  // branchName, amountHalalas baked in) — not the thin /accountant/operations shape.
  // NOTE: no `= []` defaults — a fresh [] literal each render would make these effect deps
  // unstable and loop setOps. Leave them `undefined` until react-query yields a stable ref.
  const { data: headPendingOps } = usePendingOperations(opsRange, { enabled: !switchingRole && isHead });
  const { data: headFinalOps } = useFinalApprovedOperations(opsRange, { enabled: !switchingRole && isHead });
  const { data: headRejectedOps } = useRejectedOperations(opsRange, { enabled: !switchingRole && isHead });
  const [ops, setOps] = useState<Op[]>([]);
  const currentSalesOps = useRef(ops);
  currentSalesOps.current = ops;

  // Sync incoming live ops into local state when queries succeed. A side effect, so
  // useEffect (not useMemo); deps are the stable react-query data refs.
  useEffect(() => {
    if (switchingRole || !currentRole) return;
    if (isHead) {
      const pendingState = queryClient.getQueryState(queryKeys.platformPendingOperations(opsRange));
      const finalState = queryClient.getQueryState(queryKeys.platformFinalApprovedOperations(opsRange));
      const rejectState = queryClient.getQueryState(queryKeys.platformRejectedOperations(opsRange));

      // Only synchronize when all active queries have settled with success.
      // Do NOT clear during initial pending loading or replace an error with an empty state!
      const allSuccess = pendingState?.status === "success" && finalState?.status === "success" && rejectState?.status === "success";

      if (allSuccess) {
        const merged = [
          ...(headPendingOps ?? []),
          ...(headFinalOps ?? []),
          ...(headRejectedOps ?? []),
        ];
        const nextOps = merged.map(mapApiOpToOp);
        // HA-F22: Content-aware comparison prevents infinite render loops while clearing stale operations
        const { shouldUpdate } = shouldUpdateHeadOps(currentSalesOps.current, nextOps, allSuccess);
        if (shouldUpdate) {
          setOps(nextOps);
        }
      }
    } else if (currentRole === "accountant" && canRunAccountantOperations(user, currentRole)) {
      const accState = queryClient.getQueryState(queryKeys.platformAccountantOperations({ pageSize: 100, ...opsRange }));
      if (accState?.status === "success") {
        const nextOps = (((apiOps as any[]) ?? []).map(mapApiOpToOp));
        const { shouldUpdate } = shouldUpdateHeadOps(currentSalesOps.current, nextOps, true);
        if (shouldUpdate) {
          setOps(nextOps);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOps, headPendingOps, headFinalOps, headRejectedOps, isHead, switchingRole, currentRole, opsRange]);

  // Reconcile a changed /auth/me grant before any role-specific child mounts.
  useEffect(() => {
    if (appState.role !== currentRole) setAppState({
      role: currentRole, page: currentRole ? ROLE_PROFILES[currentRole].defaultPage : "",
      detailId: null, modal: null,
    });
  }, [appState.role, currentRole]);
  // Tag the current history entry with a page so Back/Forward can restore it and refresh preserves it.
  const tagShiftHistory = (p: string, replace = false) => {
    try {
      if (typeof window === "undefined" || !window.history || !window.location) return;
      const st = { ...(window.history.state || {}), asabPage: p };
      const url = new URL(window.location.href);
      if (url.hash.includes("?")) {
        const qIndex = url.hash.indexOf("?");
        url.hash = url.hash.slice(0, qIndex);
      }
      url.searchParams.set("page", p);
      if (replace) window.history.replaceState(st, "", url.toString());
      else window.history.pushState(st, "", url.toString());
    } catch { /* history unavailable */ }
  };
  const login = async (role: RoleId) => {
    if (!allowedRoles.includes(role) || switchLock.current || role === currentRole) return;
    switchLock.current = true;
    setSwitchingRole(true);
    try {
      await purgeFinancialQueries(queryClient);
      setOps([]);
      const p = ROLE_PROFILES[role].defaultPage;
      setAppState({ role, page: p, detailId: null, modal: null }); tagShiftHistory(p, true);
    } finally {
      setSwitchingRole(false);
      switchLock.current = false;
    }
  };
  // Full sign-out: clear the pre-login entry selection + the auth session so the user returns
  // to the entry flow (dashboard → role → login), not the in-mockup role picker.
  const logout = () => {
    // Do NOT reset appState here: clearing `role` re-renders the in-mockup role
    // picker for the moment the async sign-out is in flight, which reads as the
    // "old screen" flashing before App swaps in the entry flow. Once authLogout
    // resolves, `user` becomes null and App unmounts this mockup entirely.
    clearEntrySelection();
    void authLogout();
  };
  const navigate = (page: PageId) => {
    if (!currentRole || pageForRole(currentRole, page, "") !== page) return;
    setAppState(s => ({ ...s, page, modal: null })); tagShiftHistory(page);
  };
  const setModal = (modal: string | null) => setAppState(s => ({ ...s, modal }));
  const setDetailId = (detailId: string | null) => setAppState(s => ({ ...s, detailId }));

  // Browser Back/Forward → restore the previous internal page (URL stays on the preview hash).
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      let p: string | null | undefined = (e.state as { asabPage?: string } | null)?.asabPage;
      if (!p) {
        try {
          if (typeof window !== "undefined" && window.location) {
            const sp = new URLSearchParams(window.location.search);
            const urlP = sp.get("page");
            if (urlP && /^[a-zA-Z0-9_-]{1,64}$/.test(urlP)) p = urlP;
          }
        } catch { /* ignore */ }
      }
      if (typeof p === "string" && currentRole && pageForRole(currentRole, p, "") === p)
        setAppState(s => ({ ...s, page: p as PageId, modal: null }));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [currentRole]);

  // ─── FINANCIAL STATE MACHINE ─────────────────────────────
  // pending  → approved           (accountant, records actor + time)
  // approved → final-approved     (head accountant, records actor + time)
  // final-approved = IMMUTABLE    (state guard: no further transitions)
  // rejected = IMMUTABLE          (correction requires a NEW linked operation)
  // ERP-posted is a SEPARATE dimension (erpPosted flag, not a status)
  // ─────────────────────────────────────────────────────────
  const now = () => new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  const salesQueryClient = useQueryClient();
  const currentSalesRole = useRef(appState.role);
  currentSalesRole.current = currentRole;
  const inFlightOps = useRef<Set<string>>(new Set());
  const salesDetailFor = (op: { id: string }) => salesQueryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id));
  const salesContextFor = (id: string) => {
    const operation = currentSalesOps.current.find(op => op.id === id);
    return { operation, detail: operation ? salesDetailFor(operation) : undefined, role: currentSalesRole.current };
  };

  // ─── Live mutations (fire alongside optimistic local state) ──────────────
  const approveMut = useApproveOperation();
  const rejectMut = useRejectOperation();
  const finalMut = useFinalApprove();
  const bulkApproveMut = useBulkApprove();
  const bulkFinalMut = useBulkFinalApprove();
  const returnReviewMut = useReturnForReview();
  const erpBatchMut = useCreateERPBatch();

  const approveOp = async (id: string) => {
    const targetOp = typeof currentSalesOps !== "undefined" && currentSalesOps?.current
      ? currentSalesOps.current.find(o => o.id === id)
      : undefined;
    if (targetOp && (targetOp.moduleKey === "expenses" || (targetOp as any).module === "expenses")) {
      if (typeof toast !== "undefined") toast.error("اعتماد المصروفات من صلاحية مالك العلامة أو المدير المفوّض فقط (EXP-06)");
      return;
    }
    return runFinancialMutation(
      id,
      inFlightOps.current,
      async () => {
        if (typeof (approveMut as any).mutateAsync === "function") {
          return await (approveMut as any).mutateAsync({ id });
        }
        if (typeof (approveMut as any).mutate === "function") {
          return await new Promise((resolve, reject) => {
            (approveMut as any).mutate({ id }, { onSuccess: resolve, onError: reject });
          });
        }
        throw new Error("No mutation handler available for approval");
      },
      () => {
        setOps(p => p.map(o =>
          o.id === id && o.status === "pending"
            ? {
              ...o, status: "approved" as OpStatus,
              approvedBy: appState.role === "head" ? "رئيس الحسابات" : "المحاسب المختص",
              approvedAt: now()
            }
            : o
        ));
        if (typeof salesQueryClient !== "undefined" && typeof salesQueryClient?.invalidateQueries === "function") {
          void salesQueryClient.invalidateQueries({ queryKey: queryKeys.operations() });
        }
      }
    ).catch(err => {
      const msg = (err as any)?.response?.data?.message || (err as any)?.message || "فشل اعتماد العملية";
      if (typeof toast !== "undefined") toast.error(msg);
      throw err;
    });
  };

  const rejectOp = (id: string, reason: string) => {
    const targetOp = typeof currentSalesOps !== "undefined" && currentSalesOps?.current
      ? currentSalesOps.current.find(o => o.id === id)
      : undefined;
    if (targetOp && (targetOp.moduleKey === "expenses" || (targetOp as any).module === "expenses")) {
      if (typeof toast !== "undefined") toast.error("رفض المصروفات من صلاحية مالك العلامة أو المدير المفوّض فقط (EXP-06)");
      return;
    }
    return runSalesAction(() => salesContextFor(id), "return", async () => {
      const inFlight = typeof inFlightOps !== "undefined" ? inFlightOps.current : null;
      if (inFlight) {
        if (inFlight.has(id)) throw new Error(`Operation ${id} is already in flight`);
        inFlight.add(id);
      }
      try {
        if (typeof (rejectMut as any).mutateAsync === "function") {
          await (rejectMut as any).mutateAsync({ id, reason });
        } else if (typeof (rejectMut as any).mutate === "function") {
          (rejectMut as any).mutate({ id, reason });
        } else {
          throw new Error("No mutation handler available for rejection");
        }
        setOps(p => p.map(o =>
          o.id === id && (o.status === "pending" || o.status === "approved")
            ? {
              ...o, status: "rejected" as OpStatus, rejectReason: reason,
              rejectedBy: typeof appState !== "undefined" && appState.role === "head" ? "رئيس الحسابات" : "المحاسب المختص",
              rejectedAt: now()
            }
            : o
        ));
        if (typeof salesQueryClient !== "undefined" && typeof salesQueryClient?.invalidateQueries === "function") {
          void salesQueryClient.invalidateQueries({ queryKey: queryKeys.operations() });
        }
      } catch (err) {
        const msg = (err as any)?.response?.data?.message || (err as any)?.message || "فشل رفض العملية";
        if (typeof toast !== "undefined") toast.error(msg);
        throw err;
      } finally {
        if (inFlight) inFlight.delete(id);
      }
    });
  };

  const finalApproveOp = async (id: string, conditional?: { note: string }) => {
    const targetOp = typeof currentSalesOps !== "undefined" && currentSalesOps?.current
      ? currentSalesOps.current.find(o => o.id === id)
      : undefined;
    if (targetOp && (targetOp.moduleKey === "expenses" || (targetOp as any).module === "expenses")) {
      if (typeof toast !== "undefined") toast.error("اعتماد المصروفات من صلاحية مالك العلامة أو المدير المفوّض فقط (EXP-06)");
      return;
    }
    if (conditional) {
      const validation = validateConditionalApproval(conditional.note);
      if (!validation.ok) {
        const err = new Error(validation.error === "note_required" ? "ملاحظة الاعتماد المشروط مطلوبة" : "بيانات الاعتماد المشروط غير صالحة");
        if (typeof toast !== "undefined") toast.error(err.message);
        throw err;
      }
    }
    const fnMutation = typeof runFinancialMutation === "function"
      ? runFinancialMutation
      : async (_k: string, _l: any, fn: any, succ: any) => { const r = await fn(); succ(r); return r; };
    const inFlight = typeof inFlightOps !== "undefined" ? inFlightOps.current : new Set<string>();
    return fnMutation(
      id,
      inFlight,
      async () => {
        if (typeof (finalMut as any).mutateAsync === "function") {
          return await (finalMut as any).mutateAsync({ id, isConditional: !!conditional, conditionalNote: conditional?.note });
        }
        if (typeof (finalMut as any).mutate === "function") {
          return (finalMut as any).mutate({ id, isConditional: !!conditional, conditionalNote: conditional?.note });
        }
        throw new Error("No mutation handler available for final approval");
      },
      () => {
        setOps(p => p.map(o =>
          o.id === id && o.status === "approved"
            ? {
              ...o, status: "final-approved" as OpStatus,
              finalApprovedBy: "رئيس الحسابات",
              finalApprovedAt: now()
            }
            : o
        ));
        if (typeof salesQueryClient !== "undefined" && typeof salesQueryClient?.invalidateQueries === "function") {
          void salesQueryClient.invalidateQueries({ queryKey: queryKeys.operations() });
        }
      }
    ).catch(err => {
      const msg = (err as any)?.response?.data?.message || (err as any)?.message || "فشل الاعتماد النهائي";
      if (typeof toast !== "undefined") toast.error(msg);
      throw err;
    });
  };

  const bulkApprove = async (ids: string[]) => {
    const eligible = salesBulkApprovalIds(currentSalesOps.current, ids.filter(id =>
      currentSalesOps.current.find(op => op.id === id)?.status === "pending"), currentSalesRole.current, salesDetailFor);
    const approved = headLegacyBulkIds(currentSalesOps.current, ids.filter(id =>
      currentSalesOps.current.find(op => op.id === id)?.status === "approved"), currentSalesRole.current, salesDetailFor);
    const set = new Set([...eligible, ...approved]);
    if (set.size === 0) return;
    const ts = now();
    // Partition ids by current status so we send the right call per group.
    const pendingIds: string[] = [];
    const approvedIds: string[] = [];
    ops.forEach(o => {
      if (!set.has(o.id)) return;
      if (o.status === "pending") pendingIds.push(o.id);
      if (o.status === "approved") approvedIds.push(o.id);
    });

    // Synchronous execution path for test harnesses and synchronous mutations
    if (typeof (bulkApproveMut as any)?.mutateAsync !== "function" && typeof (bulkFinalMut as any)?.mutateAsync !== "function") {
      if (pendingIds.length > 0 && typeof (bulkApproveMut as any)?.mutate === "function") {
        (bulkApproveMut as any).mutate({ operationIds: pendingIds });
      }
      if (approvedIds.length > 0 && typeof (bulkFinalMut as any)?.mutate === "function") {
        (bulkFinalMut as any).mutate({ operationIds: approvedIds });
      }
      setOps(p => p.map(o => {
        if (pendingIds.includes(o.id) && o.status === "pending") {
          return { ...o, status: "approved" as OpStatus, approvedBy: "المحاسب المختص", approvedAt: ts };
        }
        if (approvedIds.includes(o.id) && o.status === "approved") {
          return { ...o, status: "final-approved" as OpStatus, finalApprovedBy: "رئيس الحسابات", finalApprovedAt: ts };
        }
        return o;
      }));
      return Promise.resolve({ pendingSucceeded: pendingIds.length > 0, approvedSucceeded: approvedIds.length > 0, isPartial: false });
    }

    const fnMutation = typeof runFinancialMutation === "function"
      ? runFinancialMutation
      : async (_k: string, _l: any, fn: any, succ: any) => { const r = await fn(); succ(r); return r; };
    const mixedApproval = typeof executeMixedBulkApproval === "function"
      ? executeMixedBulkApproval
      : async (plan: any) => {
          if (plan.pendingIds.length > 0) await plan.approvePendingFn(plan.pendingIds);
          if (plan.approvedIds.length > 0) await plan.approveFinalFn(plan.approvedIds);
          return { pendingSucceeded: true, approvedSucceeded: true, isPartial: false };
        };
    const inFlight = typeof inFlightOps !== "undefined" ? inFlightOps.current : new Set<string>();

    const bulkKey = `bulk-${ids.slice().sort().join(",")}`;
    return fnMutation(
      bulkKey,
      inFlight,
      async () => {
        return await mixedApproval({
          pendingIds,
          approvedIds,
          approvePendingFn: async (pIds: string[]) => {
            if (typeof (bulkApproveMut as any).mutateAsync === "function") {
              return await (bulkApproveMut as any).mutateAsync({ operationIds: pIds });
            }
            if (typeof (bulkApproveMut as any).mutate === "function") {
              return (bulkApproveMut as any).mutate({ operationIds: pIds });
            }
            throw new Error("No bulk approve mutation handler available");
          },
          approveFinalFn: async (aIds: string[]) => {
            if (typeof (bulkFinalMut as any).mutateAsync === "function") {
              return await (bulkFinalMut as any).mutateAsync({ operationIds: aIds });
            }
            if (typeof (bulkFinalMut as any).mutate === "function") {
              return (bulkFinalMut as any).mutate({ operationIds: aIds });
            }
            throw new Error("No bulk final mutation handler available");
          },
        });
      },
      () => {
        setOps(p => p.map(o => {
          if (pendingIds.includes(o.id) && o.status === "pending") {
            return { ...o, status: "approved" as OpStatus, approvedBy: "المحاسب المختص", approvedAt: ts };
          }
          if (approvedIds.includes(o.id) && o.status === "approved") {
            return { ...o, status: "final-approved" as OpStatus, finalApprovedBy: "رئيس الحسابات", finalApprovedAt: ts };
          }
          return o;
        }));
        if (typeof salesQueryClient !== "undefined" && typeof salesQueryClient?.invalidateQueries === "function") {
          void salesQueryClient.invalidateQueries({ queryKey: queryKeys.operations() });
        }
      }
    ).catch(err => {
      if (err?.isPartial) {
        setOps(p => p.map(o => {
          if (err.pendingSucceeded && pendingIds.includes(o.id) && o.status === "pending") {
            return { ...o, status: "approved" as OpStatus, approvedBy: "المحاسب المختص", approvedAt: ts };
          }
          if (err.approvedSucceeded && approvedIds.includes(o.id) && o.status === "approved") {
            return { ...o, status: "final-approved" as OpStatus, finalApprovedBy: "رئيس الحسابات", finalApprovedAt: ts };
          }
          return o;
        }));
        if (typeof salesQueryClient !== "undefined" && typeof salesQueryClient?.invalidateQueries === "function") {
          void salesQueryClient.invalidateQueries({ queryKey: queryKeys.operations() });
        }
        if (typeof toast !== "undefined") toast.error(err.message);
        throw err;
      }
      const msg = (err as any)?.response?.data?.message || (err as any)?.message || "فشل الاعتماد الجماعي";
      if (typeof toast !== "undefined") toast.error(msg);
      throw err;
    });
  };

  // T10 §A4 — return an approved op to the accountant for review (op → pending).
  const returnForReview = (id: string, note?: string) => {
    return runSalesAction(() => salesContextFor(id), "returnForReview", async () => {
      const inFlight = typeof inFlightOps !== "undefined" ? inFlightOps.current : null;
      if (inFlight) {
        if (inFlight.has(id)) throw new Error(`Operation ${id} is already in flight`);
        inFlight.add(id);
      }
      try {
        if (typeof (returnReviewMut as any).mutateAsync === "function") {
          await (returnReviewMut as any).mutateAsync({ id, note });
        } else if (typeof (returnReviewMut as any).mutate === "function") {
          (returnReviewMut as any).mutate({ id, note });
        } else {
          throw new Error("No mutation handler available for returnForReview");
        }
        setOps(p => p.map(o =>
          o.id === id && o.status === "approved"
            ? { ...o, status: "pending" as OpStatus, approvedBy: undefined, approvedAt: undefined }
            : o
        ));
        if (typeof salesQueryClient !== "undefined" && typeof salesQueryClient?.invalidateQueries === "function") {
          void salesQueryClient.invalidateQueries({ queryKey: queryKeys.operations() });
        }
      } catch (err) {
        const msg = (err as any)?.response?.data?.message || (err as any)?.message || "فشلت إعادة العملية للمراجعة";
        if (typeof toast !== "undefined") toast.error(msg);
        throw err;
      } finally {
        if (inFlight) inFlight.delete(id);
      }
    });
  };

  // Corrective operation: creates a new linked pending op referencing the original
  const addCorrectiveOp = (refId: string) => {
    runSalesAction(() => salesContextFor(refId), "correct", () => {
      const original = ops.find(o => o.id === refId);
      if (!original) return;
      const newId = `COR-${refId.replace("OPS-", "").replace("COR-", "")}`;
      const corrective: Op = {
        ...original,
        id: newId,
        status: "pending",
        isCorrection: true,
        correctiveRef: refId,
        timeAgo: "للتو",
        submittedBy: "تعديل بواسطة رئيس الحسابات",
        approvedBy: undefined, approvedAt: undefined,
        finalApprovedBy: undefined, finalApprovedAt: undefined,
        rejectedBy: undefined, rejectedAt: undefined,
        erpPosted: undefined, erpBatchId: undefined, erpPostedAt: undefined,
        rejectReason: undefined,
      };
      setOps(p => [corrective, ...p]);
    });
  };

  // ERP posting: marks ops as posted with batch ID — separate from final-approval.
  // B-H4: create the batch on the backend and adopt the server-issued batchId (uuid/human id)
  // instead of generating one on the client.
  const markErpPosted = async (ids: string[]): Promise<string> => {
    const opsToPost = ops.filter(o => ids.includes(o.id));
    if (opsToPost.some(o => o.amount == null)) {
      throw new Error("لا يمكن ترحيل عمليات ذات مبالغ مالية مفقودة أو غير محددة");
    }
    const set = new Set(ids);
    const postedAt = now();
    const erpKey = `erp-${ids.slice().sort().join(",")}`;
    return runFinancialMutation(
      erpKey,
      inFlightOps.current,
      async () => {
        const res = await erpBatchMut.mutateAsync({ operationIds: ids });
        const serverBatchId = (res as any)?.batchId ?? (res as any)?.batch_id ?? (res as any)?.id ?? "";
        if (!serverBatchId || typeof serverBatchId !== "string" || !serverBatchId.trim()) {
          throw new Error("لم يتم استلام معرّف الدفعة من الخادم");
        }
        return serverBatchId;
      },
      (serverBatchId) => {
        setOps(p => p.map(o =>
          set.has(o.id) && o.status === "final-approved" && !o.erpPosted
            ? { ...o, erpPosted: true, erpBatchId: serverBatchId, erpPostedAt: postedAt }
            : o
        ));
        if (typeof salesQueryClient !== "undefined" && typeof salesQueryClient?.invalidateQueries === "function") {
          void salesQueryClient.invalidateQueries({ queryKey: queryKeys.operations() });
        }
      }
    ).catch(err => {
      const msg = (err as any)?.response?.data?.message || (err as any)?.message || "فشل الترحيل إلى ERP";
      if (typeof toast !== "undefined") toast.error(msg);
      throw err;
    });
  };

  if (!currentRole) return (
    <LangContext.Provider value={{ lang, setLang, t, dir }}>
      <p role="alert">{t("ليس لديك صلاحية للوصول إلى هذه اللوحة", "You cannot access this dashboard")}</p>
    </LangContext.Provider>
  );
  if (switchingRole) return <p role="status">{t("جارٍ تغيير الدور…", "Switching role…")}</p>;

  const dashboard = <AppShell
    state={safeState} ops={ops} period={period} setPeriod={setPeriod}
    approveOp={approveOp} rejectOp={rejectOp} finalApproveOp={finalApproveOp} bulkApprove={bulkApprove}
    returnForReview={returnForReview} addCorrectiveOp={addCorrectiveOp} markErpPosted={markErpPosted}
    navigate={navigate} logout={logout} setModal={setModal} setDetailId={setDetailId}
    allowedRoles={allowedRoles} onSelectRole={login}
  />;
  return (
    <LangContext.Provider value={{ lang, setLang, t, dir }}>
      {currentRole === "accountant" ? <AssetDraftProvider>{dashboard}</AssetDraftProvider> : dashboard}
      {currentRole !== "admin" && currentRole !== "supplier" && <LiveChatWidget key={currentRole} t={t} />}
    </LangContext.Provider>
  );
}

export default ASABPrototype;
