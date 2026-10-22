import "./_group.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Operation as ApiOperation } from "../../../api/types";
import { queryKeys } from "../../../api/queries/keys";
import { getSalesActionPolicy, hasSalesReconciliationEvidence, isPkg6SalesReport, runSalesAction, runSalesBulkApproval, salesBulkApprovalIds, SALES_RETURN_HINT } from "./salesActionGuards";
import { headLegacyBulkIds, filterErpOperations, canProceedPreflight, aggregateOpsAmount, shouldUpdateHeadOps, runFinancialMutation, validateConditionalApproval, getLocalDateString, executeMixedBulkApproval } from "./headReviewGuards";
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
import { getSiteLang, setSiteLang } from "../../../auth/siteLang";
import { V, G, CYAN, LOGO, ensureAuthStyles } from "../../../auth/authTheme";
import { LangToggle } from "../../../auth/LangToggle";
import { SUPPLIER_PORTAL_ENABLED } from "../../../featureFlags";

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
  admin: { name: "Abdullah Al-Ahmad", label: "System Admin" },
  head: { name: "Khaled Al-Omari", label: "Head Accountant" },
  accountant: { name: "Ahmed Mohammed", label: "Accountant — Branches 1–50" },
  branch: { name: "Ahmed Al-Shammari", label: "Branch Manager — Riyadh Al-Olaya" },
  procurement: { name: "Saeed Ahmed", label: "Procurement Manager" },
  supplier: { name: "Mohammed Al-Ali", label: "Al-Wataniyya Poultry Co." },
};
const EN_PAGE_LABELS: Record<string, string> = {
  "acc-sales-detail": "Sales Operation Details",
  "acc-inventory-items": "Select Daily Inventory Items",
};

// ── English for MODULE_META labels ───────────────────────────────────────────
const EN_MODULE_META: Record<string, string> = {
  "المبيعات": "Sales", "المصروفات": "Expenses", "المشتريات": "Purchases",
  "المخزون": "Inventory", "الشفتات": "Shifts", "كشف الحساب": "Employee Accounts",
  "العهد النقدية": "Cash Custody", "الأصول الثابتة": "Fixed Assets",
};
// ── English for MODULE_AGG_CFG ───────────────────────────────────────────────
const EN_MODULE_AGG: Record<string, { label: string; sublabel: string }> = {
  empty: { label: "No Data", sublabel: "No entries uploaded" },
  incomplete: { label: "Incomplete", sublabel: "Pending entries in review" },
  ready_consolidation: { label: "Ready to Consolidate", sublabel: "All entries reviewed — start consolidation" },
  consolidated: { label: "Consolidated", sublabel: "Accounting entry locked — ready to batch" },
  ready_erp: { label: "Ready for ERP", sublabel: "Batch ready to send" },
  exported: { label: "Exported", sublabel: "Posted to ERP — awaiting confirmation" },
  erp_imported: { label: "Imported in ERP ★", sublabel: "ERP acknowledged receipt — future stage" },
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
    // { id:"admin-branch-requests",label:"طلبات الفروع",      icon:<Building2 size={16}/> },  // مخفي مؤقتاً من السايد بار

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
    { id: "sup-new", label: "الطلبات الجديدة", icon: <ShoppingCart size={16} />, badge: 3 },
    { id: "sup-accepted", label: "المقبولة", icon: <CheckCircle2 size={16} /> },
    { id: "sup-rejected", label: "المرفوضة", icon: <XCircle size={16} /> },
    { section: "الكتالوج" },
    { id: "sup-items", label: "الأصناف والأسعار", icon: <Package size={16} /> },
    { id: "sup-reports", label: "تقارير المبيعات", icon: <BarChart3 size={16} /> },
  ],
};

const ROLE_PROFILES: Record<RoleId, { name: string; avatar: string; label: string; defaultPage: PageId }> = {
  admin: { name: "عبدالله الأحمد", avatar: "عب", label: "أدمن النظام", defaultPage: "admin-overview" },
  head: { name: "خالد العمري", avatar: "خع", label: "رئيس الحسابات", defaultPage: "head-dashboard" },
  accountant: { name: "أحمد محمد", avatar: "أم", label: "محاسب — الفروع 1–50", defaultPage: "acc-dashboard" },
  branch: { name: "أحمد الشمري", avatar: "أش", label: "مدير فرع الرياض - العليا", defaultPage: "branch-overview" },
  procurement: { name: "سعيد أحمد", avatar: "سأ", label: "مدير المشتريات", defaultPage: "proc-overview" },
  supplier: { name: "محمد العلي", avatar: "مع", label: "شركة الدواجن الوطنية", defaultPage: "sup-overview" },
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
        <img src={LOGO} alt="ASAB — عصب" style={{ height: 34, width: "auto" }} />
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
function RejectModal({ opId, onReject, onClose }: { opId: string; onReject: (id: string, reason: string) => void; onClose: () => void }) {
  const { t, dir, lang } = useLang();
  const REJECT_REASONS_AR = ["بيانات غير مكتملة", "فاتورة مفقودة أو غير واضحة", "تناقض في المبالغ", "فرق في الكميات", "مورد غير معتمد", "تاريخ غير صحيح", "أخرى"];
  const REJECT_REASONS_EN = ["Incomplete data", "Missing or unclear invoice", "Amount discrepancy", "Quantity difference", "Unapproved supplier", "Incorrect date", "Other"];
  const reasons = lang === "en" ? REJECT_REASONS_EN : REJECT_REASONS_AR;
  const placeholder = t("اختر السبب...", "Select reason...");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const canSubmit = reason !== "" && reason !== placeholder;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-full" dir={dir}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base">{t("رفض العملية", "Reject Operation")} {opId}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-gray-500 text-sm">{t("ستُعاد العملية إلى مدير الفرع مع سبب الرفض.", "The operation will be returned to the branch manager with the rejection reason.")}</p>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">{t("سبب الرفض", "Rejection Reason")} <span className="text-red-500">*</span></label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              <option value="">{placeholder}</option>
              {reasons.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">{t("ملاحظات إضافية", "Additional Notes")}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none" rows={3} placeholder={t("تفاصيل إضافية (اختياري)...", "Additional details (optional)...")} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => canSubmit && onReject(opId, notes ? `${reason}: ${notes}` : reason)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${canSubmit ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
              disabled={!canSubmit}>
              ✕ {t("تأكيد الرفض وإعادة للفرع", "Confirm Rejection & Return to Branch")}
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">{t("إلغاء", "Cancel")}</button>
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
function Sidebar({ role, ops, page, navigate, logout, collapsed, setCollapsed }: {
  role: RoleId; ops: Op[]; page: PageId;
  navigate: (p: PageId) => void; logout: () => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
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
      style={{ width: collapsed ? 64 : 252, background: "linear-gradient(180deg,#0F1C35 0%,#1B3A6B 100%)", minHeight: "100vh", direction: dir }}>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#7C3AED,#00D9FF)" }}>
          <span className="text-white font-black text-sm">ع</span>
        </div>
        {!collapsed && <div className="flex-1 min-w-0"><div className="text-white font-bold text-base">عصب</div><div className="text-white/40 text-[10px]">ASAB System</div></div>}
        <button onClick={() => setCollapsed(!collapsed)} className="text-white/30 hover:text-white transition-colors ml-auto">
          <ChevronRight size={16} className={collapsed ? "" : "rotate-180"} />
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
            <button key={entry.id} onClick={() => navigate(entry.id)}
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
            <button onClick={logout} className="text-white/30 hover:text-red-300 transition-colors"><LogOut size={14} /></button>
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
    <div className="flex h-screen overflow-hidden bg-[#F0F4FA]" dir={dir}>
      <Sidebar role={role} ops={ops} page={state.page} navigate={navigate} logout={logout}
        collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-4 flex-shrink-0 shadow-sm z-10">
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-800 font-bold text-base leading-tight">{pageLabel}</h1>
            <p className="text-gray-400 text-xs">{supplierName || enProfile.label}</p>
          </div>
          <div className="flex items-center gap-2">
            {allowedRoles.length > 1 && <select aria-label={tL("الدور الممنوح", "Granted role")} value={role}
              onChange={e => onSelectRole(e.target.value as RoleId)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              {allowedRoles.map(r => <option key={r} value={r}>{ROLE_PROFILES[r].label}</option>)}
            </select>}
            <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hidden sm:block">
              {formatTodayLong(lang)}
            </div>
            <select value={period} onChange={e => setPeriod(e.target.value as OpPeriod)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-gray-50">
              <option value="all">{tL("الكل", "All")}</option>
              <option value="month">{tL("هذا الشهر", "This Month")}</option>
              <option value="week">{tL("هذا الأسبوع", "This Week")}</option>
              <option value="today">{tL("اليوم", "Today")}</option>
            </select>
            <GlobalSearch t={tL} theme="light" />
            {/* Language Globe */}
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 font-semibold transition-colors"
              title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}>
              <Globe size={13} />
              {lang === "ar" ? "EN" : "عربي"}
            </button>
            <NotificationBell t={tL} theme="light" />
            <button onClick={logout} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1">
              <LogOut size={13} /> {tL("خروج", "Logout")}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5">
          <PageRouter state={state} pageProps={pageProps} adminUsers={adminUsers} setAdminUsers={setAdminUsers} />
        </main>
      </div>

      {/* Reject Modal */}
      {state.modal === "reject" && state.detailId && (
        <RejectModal opId={state.detailId}
          onReject={(id, reason) => { rejectOp(id, reason); setModal(null); }}
          onClose={() => setModal(null)} />
      )}

      {/* Add User Modal */}
      {state.modal === "add-user" && (
        <AddUserModal
          onAdd={u => {
            const roleKey = ({ "محاسب": "accountant", "رئيس حسابات": "head", "مدير فرع": "branch", "مدير مشتريات": "procurement", "مورد": "supplier", "أدمن": "admin" } as Record<string, string>)[u.role] ?? u.role;
            setAdminUsers(prev => [...prev, u]);
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
                // Passwords are emailed by default now; false = the user got nothing.
                if (created?.emailSent === false) {
                  toast.warning("تم إنشاء المستخدم، لكن لم يصل بريد كلمة المرور — استخدم «إعادة تعيين كلمة المرور».");
                }
              },
            });
            setModal(null);
          }}
          onClose={() => setModal(null)} />
      )}

      {/* Contact Modal */}
      {state.modal === "contact" && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-[380px]" dir={dir}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{tL("التواصل مع الموظف", "Contact Employee")}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
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


// ─────────────────────────────────────────────
// MODULE AGGREGATION GRID  — module-level export readiness
// ─────────────────────────────────────────────
const MODULE_META = [
  { key: "sales" as ModuleKey, label: "المبيعات", icon: "💰" },
  { key: "expenses" as ModuleKey, label: "المصروفات", icon: "💸" },
  { key: "purchases" as ModuleKey, label: "المشتريات", icon: "🛒" },
  { key: "inventory" as ModuleKey, label: "المخزون", icon: "📦" },
  { key: "shifts" as ModuleKey, label: "الشفتات", icon: "⏰" },
  { key: "employees" as ModuleKey, label: "كشف الحساب", icon: "👥" },
  { key: "cash" as ModuleKey, label: "العهد النقدية", icon: "💼" },
  { key: null, label: "الأصول الثابتة", icon: "🏢" },
];

// Pipeline step labels shown in the legend
const EXPORT_PIPELINE_STEPS: ModuleAggState[] = ["incomplete", "ready_consolidation", "consolidated", "ready_erp", "exported", "erp_imported"];

function ModuleAggregationGrid({ ops, navigate }: { ops: Op[]; navigate: (p: PageId) => void }) {
  const { lang, dir, t } = useLang();
  const en = lang === "en";
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedMeta = selectedKey ? MODULE_META.find(m => (m.key || m.label) === selectedKey) : null;
  const selectedOps = selectedMeta?.key ? ops.filter(o => o.moduleKey === selectedMeta.key) : [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" dir={dir}>
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{t("جاهزية التجميع المحاسبي — مسار التصدير لـ ERP", "Accounting Consolidation Readiness — ERP Export Pipeline")}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">{t("كل موديول يمثل حزمة قيود محاسبية · اضغط على موديول لفحص محتوى الحزمة", "Each module represents an accounting entry package · Click a module to inspect its package contents")}</p>
          </div>
        </div>
        <div className="flex items-center gap-0 overflow-x-auto">
          {EXPORT_PIPELINE_STEPS.map((s, i) => {
            const cfg = MODULE_AGG_CFG[s];
            const label = en ? (EN_MODULE_AGG[s]?.label || cfg.label) : cfg.label;
            const isLast = i === EXPORT_PIPELINE_STEPS.length - 1;
            return (
              <div key={s} className="flex items-center gap-0 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}></span>
                  <span className="text-[10px] font-semibold text-gray-600">{label}</span>
                  {s === "erp_imported" && <span className="text-[9px] text-purple-400 font-bold">★</span>}
                </div>
                {!isLast && <span className="text-gray-300 text-xs flex-shrink-0">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 grid grid-cols-4 gap-3">
        {MODULE_META.map(m => {
          const cardKey = m.key || m.label;
          const mLabel = en ? (EN_MODULE_META[m.label] || m.label) : m.label;
          const mOps = m.key ? ops.filter(o => o.moduleKey === m.key) : [];
          const state = getModuleAggState(mOps);
          const cfg = MODULE_AGG_CFG[state];
          const cfgLabel = en ? (EN_MODULE_AGG[state]?.label || cfg.label) : cfg.label;
          const cfgSublabel = en ? (EN_MODULE_AGG[state]?.sublabel || cfg.sublabel) : cfg.sublabel;
          const counts = {
            pending: mOps.filter(o => o.status === "pending").length,
            approved: mOps.filter(o => o.status === "approved").length,
            final: mOps.filter(o => o.status === "final-approved").length,
            erp: mOps.filter(o => o.erpPosted).length,
          };
          const total = mOps.some(o => o.amount == null) ? null : mOps.reduce((s, o) => s + (o.amount ?? 0), 0);
          const stepNum = cfg.step;
          const maxStep = 5;
          const isSelected = selectedKey === cardKey;

          return (
            <button key={cardKey} onClick={() => setSelectedKey(isSelected ? null : cardKey)}
              className={`rounded-xl border ${dir === "ltr" ? "text-left" : "text-right"} overflow-hidden transition-all
                ${cfg.cls} ${isSelected ? "ring-2 ring-offset-1 ring-purple-400 shadow-md" : "hover:brightness-95"}`}>
              <div className="h-1 bg-gray-200/60">
                <div className={`h-1 ${cfg.dot}`} style={{ width: `${Math.min((stepNum / maxStep) * 100, 100)}%` }} />
              </div>
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{m.icon}</span>
                  <span className={`text-[9px] font-bold ${cfg.headerCls}`}>{stepNum > 0 ? `${en ? "S" : "م"}${stepNum}/5` : ""}</span>
                </div>
                <p className="font-bold text-sm text-gray-800 mb-0.5">{mLabel}</p>
                <p className={`text-[10px] font-semibold mb-1 ${cfg.headerCls}`}>{cfgLabel}</p>
                <p className="text-[9px] text-gray-400 mb-2 leading-tight">{cfgSublabel}</p>
                {mOps.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      {counts.pending > 0 && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">{counts.pending} {t("معلق", "Pending")}</span>}
                      {counts.approved > 0 && <span className="text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-semibold">{counts.approved} {t("راجع", "Reviewed")}</span>}
                      {counts.final > 0 && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">{counts.final} {t("مُجمَّع", "Consolidated")}</span>}
                      {counts.erp > 0 && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">{counts.erp} ERP</span>}
                    </div>
                    {total != null && total > 0 && <p className="text-[10px] font-mono font-bold text-gray-600">{(total / 1000).toFixed(1)}K {t("ر.س", "SAR")}</p>}
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-300">{t("لا توجد بيانات", "No data")}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedMeta && (
        <div className="border-t border-gray-100 bg-gray-50/60 p-5" dir={dir}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedMeta.icon}</span>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{t("الحزمة المحاسبية", "Accounting Package")} — {en ? (EN_MODULE_META[selectedMeta.label] || selectedMeta.label) : selectedMeta.label}</h4>
                <p className="text-[10px] text-gray-400">{t("محتوى الحزمة: ما هو مُدرَج، ما هو مُستبعد، ما يمنع التجميع، ما هو جاهز لـ ERP", "Package contents: what is included, excluded, blocking consolidation, ready for ERP")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedMeta.key && (
                <button onClick={() => navigate(`head-${selectedMeta.key}` as PageId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[11px] font-bold hover:bg-purple-700 transition-colors">
                  <ChevronsRight size={11} />
                  {t("فتح الموديول", "Open Module")}
                </button>
              )}
              <button onClick={() => setSelectedKey(null)} className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded-lg hover:bg-white border border-transparent hover:border-gray-200">
                ✕ {t("إغلاق", "Close")}
              </button>
            </div>
          </div>

          {selectedOps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{t("لا توجد بيانات في هذا الموديول", "No data in this module")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                {selectedOps.filter(o => o.status === "final-approved").length > 0 && (
                  <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden">
                    <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-[11px] font-bold text-emerald-800">{t("مُدرَجة في الحزمة — قيود مُعتمدة نهائياً", "Included in Package — Final-approved entries")}</span>
                      <span className="text-[10px] text-emerald-600 mr-auto font-mono font-bold">
                        {fmtAmt(aggregateOpsAmount(selectedOps.filter(o => o.status === "final-approved")))} {t("ر.س", "SAR")}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {selectedOps.filter(o => o.status === "final-approved").slice(0, 4).map((o, i) => (
                        <div key={i} className="px-4 py-2 flex items-center gap-3 text-xs">
                          <span className="font-mono text-gray-400 flex-shrink-0">{o.id}</span>
                          <span className="text-gray-600 flex-shrink-0">{o.branch}</span>
                          <span className="flex-1"></span>
                          <span className="font-mono font-bold text-gray-700">{fmtAmt(o.amount)} {t("ر.س", "SAR")}</span>
                          {o.erpPosted
                            ? <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">ERP ✓</span>
                            : <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">{t("جاهز", "Ready")}</span>}
                        </div>
                      ))}
                      {selectedOps.filter(o => o.status === "final-approved").length > 4 &&
                        <p className="px-4 py-1.5 text-[10px] text-gray-400">+ {selectedOps.filter(o => o.status === "final-approved").length - 4} {t("عمليات أخرى", "more operations")}</p>}
                    </div>
                  </div>
                )}

                {selectedOps.filter(o => o.status === "pending").length > 0 && (
                  <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
                    <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-[11px] font-bold text-red-800">{t("معلقة — تمنع اكتمال التجميع", "Pending — Blocking consolidation")}</span>
                      <span className="text-[10px] text-red-600 mr-auto font-mono font-bold">
                        {fmtAmt(aggregateOpsAmount(selectedOps.filter(o => o.status === "pending")))} {t("ر.س", "SAR")}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {selectedOps.filter(o => o.status === "pending").slice(0, 3).map((o, i) => (
                        <div key={i} className="px-4 py-2 flex items-center gap-3 text-xs">
                          <span className="font-mono text-gray-400 flex-shrink-0">{o.id}</span>
                          <span className="text-gray-600 flex-shrink-0">{o.branch}</span>
                          {o.match === "diff" && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">⚠ {t("فرق", "Diff")}</span>}
                          <span className="flex-1"></span>
                          <span className="font-mono font-bold text-gray-700">{fmtAmt(o.amount)} {t("ر.س", "SAR")}</span>
                          <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{o.timeAgo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {(() => {
                  const readyForErp = selectedOps.filter(o => o.status === "final-approved" && !o.erpPosted);
                  if (readyForErp.length === 0) return null;
                  return (
                    <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
                      <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[11px] font-bold text-emerald-800">{t("جاهز للإرسال لـ ERP", "Ready to Send to ERP")}</span>
                        <span className="text-[10px] text-emerald-600 mr-auto font-mono font-bold">
                          {fmtAmt(aggregateOpsAmount(readyForErp))} {t("ر.س", "SAR")}
                        </span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-xs text-gray-500">{readyForErp.length} {t("عملية مُعتمدة نهائياً لم تُضَم لدفعة ERP بعد", "final-approved entries not yet added to an ERP batch")}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{t("ادمجها في الدفعة القادمة من صفحة التصدير لـ ERP", "Add them to the next batch from the ERP Export page")}</p>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const posted = selectedOps.filter(o => o.erpPosted);
                  if (posted.length === 0) return null;
                  const bm: Record<string, { total: number | null; count: number; ops: Op[] }> = {};
                  posted.forEach(o => { const b = o.erpBatchId || "—"; if (!bm[b]) bm[b] = { total: 0, count: 0, ops: [] }; bm[b].ops.push(o); bm[b].count++; });
                  Object.values(bm).forEach(entry => { entry.total = aggregateOpsAmount(entry.ops); });
                  return (
                    <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden">
                      <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-[11px] font-bold text-indigo-800">{t("مُرحَّلة في ERP — دفعات مُغلقة", "Posted to ERP — Closed Batches")}</span>
                        <span className="text-[10px] text-indigo-600 mr-auto font-mono font-bold">
                          {fmtAmt(aggregateOpsAmount(posted))} {t("ر.س", "SAR")}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {Object.entries(bm).map(([bid, { total, count }], i) => (
                          <div key={i} className="px-4 py-2 flex items-center gap-3">
                            <span className="font-mono text-[10px] text-indigo-700 font-bold">{bid}</span>
                            <span className="flex-1"></span>
                            <span className="text-[10px] text-gray-500">{count} {t("بيان", "entries")}</span>
                            <span className="font-mono text-xs font-bold text-indigo-800">{fmtAmt(total)} {t("ر.س", "SAR")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {selectedOps.filter(o => o.status === "rejected").length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      <span className="text-[11px] font-bold text-gray-600">{t("مُستبعدة — مرفوضة، خارج الحزمة", "Excluded — Rejected, outside the package")}</span>
                      <span className="text-[10px] text-gray-500 mr-auto font-mono">
                        {selectedOps.filter(o => o.status === "rejected").length} {t("بيانات", "entries")}
                      </span>
                    </div>
                    <div className="px-4 py-2">
                      {selectedOps.filter(o => o.status === "rejected").slice(0, 2).map((o, i) => (
                        <p key={i} className="text-[10px] text-gray-400 py-0.5">{o.id} · {o.branch} · {o.rejectReason || "—"}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// OWNER REPORTS PAGE
// Two distinct layers:
//  1. "التقارير الداخلية" — finance team operational reports
//  2. "رؤية المالك"       — executive read-only destination built on ERP-verified data only
// The owner layer has zero workflow elements, zero action buttons,
// and presents the financial position as a closed, unambiguous statement.
// ─────────────────────────────────────────────
// HA-F14: removed static fake SEPT_BASELINE and SEPT_NET.
// Previous-period comparison is derived purely from real API data when available.

function OwnerReportsPage({ ops }: PageProps) {
  const { t, lang, dir } = useLang();
  const en = lang === "en";
  const [tab, setTab] = useState<"internal" | "owner">("owner");
  // B-H5: internal report catalogue + owner headline come from the API now.
  const { data: internalReportsApi } = useReportsInternalPlatform();
  const { data: ownerApi } = useReportsOwnerPlatform();
  const dlReport = useDownloadHeadReport();
  const internalReports = (((internalReportsApi as any)?.data ?? internalReportsApi ?? []) as any[]);
  // T15.18 — HEAD-7 financial-report cards, delivered under meta.financialReports.
  const financialReports = (((internalReportsApi as any)?.meta?.financialReports ?? []) as any[]);

  // — Owner layer data source: ERP-posted only — the verified financial record
  const postedOps = ops.filter(o => o.erpPosted);
  const salesPosted = aggregateOpsAmount(postedOps.filter(o => o.moduleKey === "sales"));
  const expPosted = aggregateOpsAmount(postedOps.filter(o => o.moduleKey === "expenses"));
  const purPosted = aggregateOpsAmount(postedOps.filter(o => o.moduleKey === "purchases"));
  const netPosition = salesPosted != null && expPosted != null && purPosted != null
    ? salesPosted - expPosted - purPosted
    : null;

  // B-H5 / HA-F14: previous-month baseline + netPctChange come from /head/reports/owner without fake fallbacks
  const baselineNet = (ownerApi as any)?.previousMonthNet != null
    ? Math.round((ownerApi as any).previousMonthNet / 100)
    : null;
  const netPctChange = (ownerApi as any)?.netPctChange ?? (baselineNet != null && baselineNet > 0 && netPosition != null ? Math.round(((netPosition - baselineNet) / baselineNet) * 100) : null);

  // Branch rankings from ERP-posted ops — descending by amount, null-safe
  const branchAmts: Record<string, number | null> = {};
  postedOps.forEach(o => {
    if (!o.branch) return;
    if (branchAmts[o.branch] === null) return;
    if (o.amount == null || Number.isNaN(o.amount)) {
      branchAmts[o.branch] = null;
    } else {
      branchAmts[o.branch] = (branchAmts[o.branch] ?? 0) + o.amount;
    }
  });
  const completeBranchEntries = Object.entries(branchAmts)
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .sort(([, a], [, b]) => b - a);
  const incompleteBranches = Object.entries(branchAmts)
    .filter((entry): entry is [string, null] => entry[1] === null)
    .map(([b]) => b);
  const branchRankings = completeBranchEntries.slice(0, 5);

  // Category breakdown for owner — ERP-posted amounts only, with honest period comparison
  const ownerCategories = [
    { key: "sales" as ModuleKey, label: t("الإيرادات", "Revenue"), icon: "💰", color: "bg-emerald-500", textColor: "text-emerald-700", isIncome: true },
    { key: "expenses" as ModuleKey, label: t("المصروفات", "Expenses"), icon: "💸", color: "bg-red-500", textColor: "text-red-700", isIncome: false },
    { key: "purchases" as ModuleKey, label: t("المشتريات", "Purchases"), icon: "🛒", color: "bg-orange-500", textColor: "text-orange-700", isIncome: false },
    { key: "inventory" as ModuleKey, label: t("المخزون", "Inventory"), icon: "📦", color: "bg-amber-500", textColor: "text-amber-700", isIncome: false },
    { key: "shifts" as ModuleKey, label: t("الشفتات", "Shifts"), icon: "⏰", color: "bg-blue-500", textColor: "text-blue-700", isIncome: false },
    { key: "employees" as ModuleKey, label: t("مستحقات الموظفين", "Payroll"), icon: "👥", color: "bg-indigo-500", textColor: "text-indigo-700", isIncome: false },
    { key: "cash" as ModuleKey, label: t("العهد النقدية", "Cash Custody"), icon: "💼", color: "bg-purple-500", textColor: "text-purple-700", isIncome: false },
  ].map(c => {
    const catOps = postedOps.filter(o => o.moduleKey === c.key);
    const amt = aggregateOpsAmount(catOps);
    const hasOps = catOps.length > 0;
    const prev = (ownerApi as any)?.previousMonthByCategory?.[c.key] != null ? Math.round((ownerApi as any).previousMonthByCategory[c.key] / 100) : 0;
    const pct = amt != null && prev > 0 ? Math.round(((amt - prev) / prev) * 100) : null;
    return { ...c, amount: amt, hasOps, prev, pct };
  }).filter(c => (c.amount != null && c.amount > 0) || c.prev > 0 || c.hasOps);

  const maxCatAmt = Math.max(...ownerCategories.map(c => Math.max(c.amount ?? 0, c.prev)), 1);

  // Auto-commentary: derived from ERP-verified data only without fake September constants
  const commentary: { icon: string; text: string; color: string }[] = [];
  if (netPctChange !== null) {
    if (netPctChange >= 0) commentary.push({ icon: "✓", text: en ? `Net financial position improved ${netPctChange}% vs prior month` : `صافي المركز المالي تحسَّن ${netPctChange}% مقارنةً بالشهر السابق`, color: "text-emerald-700" });
    else commentary.push({ icon: "⚠", text: en ? `Net financial position declined ${Math.abs(netPctChange)}% vs prior month — requires attention` : `صافي المركز المالي تراجع ${Math.abs(netPctChange)}% مقارنةً بالشهر السابق — يستوجب المتابعة`, color: "text-amber-700" });
  }
  const topBranch = branchRankings[0];
  if (topBranch) commentary.push({ icon: "🏆", text: en ? `${topBranch[0]} is the highest-revenue branch in ERP at ${fmtAmt(topBranch[1])} SAR` : `${topBranch[0]} هو الفرع الأعلى إيراداً في ERP بمقدار ${fmtAmt(topBranch[1])} ر.س`, color: "text-indigo-700" });

  // ERP batch log — source of truth, null-safe batch totals
  const batchMap: Record<string, { id: string; total: number | null; modules: Set<string> }> = {};
  postedOps.forEach(o => {
    const b = o.erpBatchId || t("دفعة غير مُسمَّاة", "Unnamed batch");
    if (!batchMap[b]) batchMap[b] = { id: b, total: 0, modules: new Set() };
    if (batchMap[b].total !== null) {
      if (o.amount == null || Number.isNaN(o.amount)) {
        batchMap[b].total = null;
      } else {
        batchMap[b].total = (batchMap[b].total ?? 0) + o.amount;
      }
    }
    batchMap[b].modules.add(o.moduleLabel);
  });
  const batches = Object.values(batchMap);

  return (
    <div className="space-y-5" dir={dir}>
      {/* Page header — kept minimal, layer tabs carry the identity */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t("التقارير المالية", "Financial Reports")}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{t("طبقتان: التقارير التشغيلية الداخلية · رؤية المالك النهائية", "Two layers: Internal operational reports · Owner final view")}</p>
      </div>

      {/* Layer tabs — visually distinct to signal the boundary */}
      <div className="flex gap-0 border-b-2 border-gray-200">
        <button onClick={() => setTab("internal")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all
            ${tab === "internal" ? "border-blue-600 text-blue-700 bg-blue-50/60" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
          <span className="flex flex-col items-start gap-0.5">
            <span>📋 {t("التقارير الداخلية", "Internal Reports")}</span>
            <span className="text-[10px] font-normal text-gray-400">{t("للفريق المالي · تشغيلية", "Finance team · Operational")}</span>
          </span>
        </button>
        <button onClick={() => setTab("owner")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all
            ${tab === "owner" ? "border-indigo-600 text-indigo-700 bg-indigo-50/60" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
          <span className="flex flex-col items-start gap-0.5">
            <span>👁 {t("رؤية المالك", "Owner View")}</span>
            <span className="text-[10px] font-normal text-gray-400">{t("وجهة نهائية · بيانات ERP فقط · قراءة فقط", "Final destination · ERP data only · Read-only")}</span>
          </span>
        </button>
      </div>

      {/* ─── INTERNAL TAB — finance team operational view ─── */}
      {tab === "internal" && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3.5 flex items-start gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">📋</span>
            <div>
              <p className="text-sm font-bold text-blue-800">{t("تقارير داخلية — الطبقة التشغيلية للفريق المالي", "Internal Reports — Operational layer for the finance team")}</p>
              <p className="text-xs text-blue-600 mt-0.5">{t("تشمل البيانات في جميع مراحل المراجعة · تُستخدم لمتابعة الأداء الداخلي وليس للقرار المالي النهائي", "Includes data across all review stages · Used for internal performance tracking, not final financial decisions")}</p>
            </div>
          </div>
          {/* B-H5: catalogue from GET /head/reports/internal; buttons wired to the row downloadUrl. */}
          {/* T15.18 — HEAD-7 financial reports (endpoint catalog cards). */}
          {financialReports.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-800 text-sm mb-3">{t("التقارير المالية", "Financial Reports")}</h3>
              <div className="grid grid-cols-2 gap-3">
                {financialReports.map((f: any, i: number) => (
                  <div key={f.key ?? i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1"><BarChart3 size={15} className="text-purple-600" /><p className="font-bold text-gray-800 text-sm">{f.labelAr ?? f.key}</p></div>
                    {f.note && <p className="text-[11px] text-gray-400 mb-2">{f.note}</p>}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="bg-gray-50 text-gray-500 text-[10px] font-mono">{f.method} {f.endpoint}</Badge>
                      {(f.formats ?? []).map((fmt: string) => <Badge key={fmt} className="bg-purple-50 text-purple-700 text-[10px] uppercase">{fmt}</Badge>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {internalReports.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
              {t("لا توجد تقارير داخلية متاحة بعد", "No internal reports available yet")}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {internalReports.map((r: any, i: number) => {
                const title = (en ? r.labelEn : r.labelAr) ?? r.labelAr ?? r.labelEn ?? r.title ?? "";
                // B-H5 contract: { moduleKey, labelAr, labelEn, count, total(halalas), downloadUrl }
                const totalSar = typeof r.total === "number" ? Math.round(r.total / 100).toLocaleString() : null;
                const desc = (en ? r.descEn : r.descAr) ?? r.desc
                  ?? [r.count != null ? `${r.count} ${t("عملية", "ops")}` : null, totalSar != null ? `${totalSar} ${t("ر.س", "SAR")}` : null].filter(Boolean).join(" · ");
                const url = r.downloadUrl as string | undefined;
                const fname = `${(r.key ?? r.labelAr ?? "report")}.xlsx`;
                const doDownload = () => { if (url) dlReport.mutate({ url, filename: fname }); };
                return (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-sm transition-all shadow-sm">
                    <div className="text-2xl mb-3">{r.icon ?? "📊"}</div>
                    <p className="font-bold text-gray-800 text-sm">{title}</p>
                    <p className="text-xs text-gray-400 mt-1 mb-3">{desc}</p>
                    <div className="flex items-center gap-2">
                      <Btn size="sm" onClick={doDownload} disabled={!url}><Eye size={11} /> {t("عرض", "View")}</Btn>
                      <Btn size="sm" onClick={doDownload} disabled={!url}><Download size={11} /> {t("تحميل", "Download")}</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── OWNER TAB — executive read-only destination ─── */}
      {tab === "owner" && (
        <div className="space-y-6">

          {/* Identity header — distinct visual, communicates ERP-only data provenance */}
          <div className="rounded-2xl overflow-hidden shadow-md" style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e3a5f 100%)" }}>
            <div className="px-8 py-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <Eye size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg leading-tight">{t("التقرير المالي الموحد", "Unified Financial Report")}</p>
                    <p className="text-indigo-300 text-xs">{t("رؤية المالك — المركز المالي المُعتمد", "Owner View — Verified Financial Position")}</p>
                  </div>
                </div>
                <p className="text-indigo-200 text-xs leading-relaxed max-w-lg">
                  {t("هذه الصفحة وجهة نهائية للمالك وتُعرض بيانات مُعتمدة نهائياً ومُرحَّلة في ERP حصراً. لا تظهر هنا أي بيانات في طور المراجعة أو الاعتماد أو الانتظار.", "This page is the owner's final destination and displays only fully approved, ERP-posted data. No data under review or pending approval is shown here.")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center">
                  <p className="text-indigo-200 text-[10px] font-semibold">{t("الفترة المالية", "Financial Period")}</p>
                  <p className="text-white font-bold text-sm">{t("أكتوبر 2025", "October 2025")}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-emerald-300 font-semibold">{t("بيانات ERP مُعتمدة", "ERP Verified Data")}</span>
                </div>
              </div>
            </div>
            {/* Data provenance strip */}
            <div className="bg-black/20 border-t border-white/10 px-8 py-2.5 flex items-center gap-8 text-[11px] text-indigo-300">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{t("المصدر: ERP مُعتمد فقط", "Source: Approved ERP only")}</span>
              <span>·</span>
              <span>{t("الأرقام غير المُعتمدة نهائياً مُستبعدة", "Unapproved figures excluded")}</span>
              <span>·</span>
              <span>{t("لا توجد أزرار إجراءات في هذه الصفحة", "No action buttons on this page")}</span>
              <span>·</span>
              <span>{postedOps.length} {t("بيان مُدرَج", "records included")}</span>
            </div>
          </div>

          {postedOps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
              <div className="text-5xl mb-5">📊</div>
              <p className="font-bold text-gray-700 text-lg mb-2">{t("لا توجد بيانات ERP مُعتمدة بعد", "No approved ERP data yet")}</p>
              <p className="text-gray-400 text-sm mb-1">{t("تظهر هنا البيانات بعد الاعتماد النهائي والترحيل لـ ERP فقط", "Data appears here only after final approval and ERP posting")}</p>
              <p className="text-gray-300 text-xs">{t("الطبقة الداخلية (التبويب الأول) تُظهر جميع البيانات في مراحل المراجعة", "The internal layer (first tab) shows all data under review")}</p>
            </div>
          ) : (
            <>
              {/* Net position — the headline number for the owner */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t("صافي المركز المالي", "Net Financial Position")}</p>
                    <p className={`text-4xl font-black tabular-nums leading-none mb-2 ${netPosition != null && netPosition >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {netPosition != null ? (
                        <>
                          {netPosition >= 0 ? "+" : ""}{(netPosition / 1000).toFixed(1)}K
                          <span className="text-lg font-semibold text-gray-400 mr-1">{t("ر.س", "SAR")}</span>
                        </>
                      ) : (
                        <span className="text-2xl text-gray-400">—</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{t("إيرادات − مصروفات − مشتريات", "Revenue − Expenses − Purchases")}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                      <span>+ {t("إيرادات", "Revenue")}</span><span className="font-mono font-bold text-emerald-700">{salesPosted != null ? `${(salesPosted / 1000).toFixed(1)}K` : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                      <span>− {t("مصروفات", "Expenses")}</span><span className="font-mono font-bold text-red-600">{expPosted != null ? `${(expPosted / 1000).toFixed(1)}K` : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>− {t("مشتريات", "Purchases")}</span><span className="font-mono font-bold text-orange-600">{purPosted != null ? `${(purPosted / 1000).toFixed(1)}K` : "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Category bar chart — visual financial breakdown */}
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t("توزيع المبالغ المُعتمدة في ERP حسب الفئة", "ERP-Approved Amounts by Category")}</p>
                  <div className="space-y-3">
                    {ownerCategories.map((c, i) => {
                      const octPct = c.amount != null ? Math.round((c.amount / maxCatAmt) * 100) : 0;
                      const septPct = Math.round((c.prev / maxCatAmt) * 100);
                      const isUp = c.pct !== null && c.pct > 0;
                      const isDown = c.pct !== null && c.pct < 0;
                      const isFlat = c.pct === 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-base flex-shrink-0 w-6 text-center">{c.icon}</span>
                          <span className="text-xs font-semibold text-gray-600 w-24 flex-shrink-0 text-right">{c.label}</span>
                          <div className="flex-1 space-y-1">
                            {/* Oct bar */}
                            <div className="bg-gray-100 rounded-full h-2.5">
                              <div className={`h-2.5 rounded-full ${c.color}`} style={{ width: `${octPct}%` }} />
                            </div>
                            {/* Sep comparison bar — lighter */}
                            {c.prev > 0 && (
                              <div className="bg-gray-100 rounded-full h-1.5 opacity-50">
                                <div className={`h-1.5 rounded-full ${c.color}`} style={{ width: `${septPct}%` }} />
                              </div>
                            )}
                          </div>
                          <span className={`text-xs font-mono font-extrabold tabular-nums w-20 text-left flex-shrink-0 ${c.textColor}`}>
                            {c.amount != null ? `${(c.amount / 1000).toFixed(1)}K ر.س` : t("غير متاح", "Unavailable")}
                          </span>
                          {c.pct !== null && (
                            <span className={`text-[10px] font-bold w-10 text-left flex-shrink-0
                              ${isUp ? "text-emerald-600" : isDown ? "text-red-600" : "text-gray-400"}`}>
                              {isUp ? "↑" : isDown ? "↓" : "→"}
                              {isUp || isDown ? `${Math.abs(c.pct)}%` : "—"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-gray-300 pt-1">{t("الشريط العلوي: الفترة الحالية · الشريط السفلي: مقارنة الفترة السابقة (عند توفرها)", "Upper bar: Current period · Lower bar: Prior period (comparison when available)")}</p>
                  </div>
                </div>
              </div>

              {/* ─── Period comparison summary (HA-F14: shown only when real baselineNet exists) ─── */}
              {baselineNet !== null && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">{t("مقارنة الفترة السابقة", "Prior Period Comparison")}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{t("مبنية على بيانات ERP المُعتمدة في كلا الفترتين · أرقام غير مُعتمدة مُستبعدة", "Built on approved ERP data for both periods · Unapproved figures excluded")}</p>
                  </div>
                  <div className="px-6 py-4 grid grid-cols-4 gap-4">
                    {[
                      { label: t("صافي المركز المالي", "Net Position"), oct: netPosition, sep: baselineNet, isIncome: true },
                      { label: t("الإيرادات", "Revenue"), oct: salesPosted, sep: (ownerApi as any)?.previousMonthSales != null ? Math.round((ownerApi as any).previousMonthSales / 100) : null, isIncome: true },
                      { label: t("المصروفات", "Expenses"), oct: expPosted, sep: (ownerApi as any)?.previousMonthExpenses != null ? Math.round((ownerApi as any).previousMonthExpenses / 100) : null, isIncome: false },
                      { label: t("المشتريات", "Purchases"), oct: purPosted, sep: (ownerApi as any)?.previousMonthPurchases != null ? Math.round((ownerApi as any).previousMonthPurchases / 100) : null, isIncome: false },
                    ].map((row, i) => {
                      if (row.sep == null || row.oct == null) return null;
                      const diff = row.oct - row.sep;
                      const pct = row.sep > 0 ? Math.round((diff / row.sep) * 100) : null;
                      const isPos = diff > 0;
                      const isNeg = diff < 0;
                      const isGood = row.isIncome ? isPos : isNeg;
                      return (
                        <div key={i} className="text-center">
                          <p className="text-[10px] font-semibold text-gray-400 mb-2">{row.label}</p>
                          <p className="text-lg font-black tabular-nums text-gray-900">{(row.oct / 1000).toFixed(1)}K</p>
                          <p className="text-[10px] text-gray-400 mb-1">{t("السابق:", "Prior:")} {(row.sep / 1000).toFixed(1)}K</p>
                          {pct !== null && (
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full
                              ${isGood ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : isPos ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                              {isPos ? "↑" : "↓"} {Math.abs(pct)}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Branch comparison ─── */}
              {branchRankings.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{t("ترتيب الفروع — حسب المبالغ المُعتمدة في ERP", "Branch Rankings — By ERP-Approved Amounts")}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{t("بيانات ERP مُعتمدة فقط — فروع بدون ترحيل ERP غير مُدرجة", "Approved ERP data only — branches without ERP posting are excluded")}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                      {branchRankings.length} {t("فرع نشط", "active branches")}
                    </span>
                  </div>
                  <div className="px-6 py-3 space-y-3">
                    {branchRankings.map(([branch, total], i) => {
                      const maxBranch = branchRankings[0][1];
                      const pct = Math.round((total / maxBranch) * 100);
                      const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600", "text-gray-500", "text-gray-500"];
                      const medals = ["🥇", "🥈", "🥉", "④", "⑤"];
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`text-sm flex-shrink-0 ${medalColors[i]}`}>{medals[i]}</span>
                          <span className="text-sm font-semibold text-gray-700 w-28 flex-shrink-0">{branch}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                            <div className="h-2.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono font-extrabold text-xs text-indigo-700 tabular-nums w-24 text-left flex-shrink-0">
                            {fmtAmt(total)} {t("ر.س", "SAR")}
                          </span>
                          <span className="text-[10px] text-gray-400 w-8 text-left flex-shrink-0">{pct}%</span>
                        </div>
                      );
                    })}
                    {incompleteBranches.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 mt-2">
                        <p className="text-[11px] font-semibold text-amber-700 mb-1 flex items-center gap-1">
                          <span>⚠</span> {t("فروع بها مبالغ غير محددة (مستبعدة من الترتيب لحين اكتمال البيانات):", "Branches with undefined amounts (excluded from ranking until complete):")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {incompleteBranches.map(b => (
                            <span key={b} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
                              {b}: {t("بيانات غير مكتملة", "Incomplete Data")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Executive commentary ─── */}
              {commentary.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">{t("الملاحظات التنفيذية", "Executive Commentary")}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{t("مُشتقَّة تلقائياً من بيانات ERP المُعتمدة فقط · لا توجد بيانات تقديرية", "Auto-derived from approved ERP data only · No estimated figures")}</p>
                  </div>
                  <div className="px-6 py-4 space-y-2.5">
                    {commentary.map((c, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className={`font-bold text-base flex-shrink-0 mt-0.5 ${c.color}`}>{c.icon}</span>
                        <p className={`text-sm font-semibold ${c.color}`}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ERP batch provenance log */}
              {batches.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{t("سجل دفعات ERP", "ERP Batch Log")}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{t("مصدر البيانات المُعتمدة في هذا التقرير — كل دفعة قيد محاسبي مُغلق", "Source of approved data in this report — each batch is a closed accounting entry")}</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs">🔒 {t("مُغلق", "Closed")}</Badge>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {batches.map((b, i) => (
                      <div key={i} className="px-6 py-4 flex items-center gap-5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                          <ChevronsRight size={14} className="text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900 font-mono">{b.id}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{[...b.modules].join(" · ")}</p>
                        </div>
                        <p className="font-black text-gray-900 font-mono tabular-nums text-base">
                          {b.total != null ? `${(b.total / 1000).toFixed(1)}K` : "—"}
                          <span className="text-xs font-semibold text-gray-400 mr-0.5">{t("ر.س", "SAR")}</span>
                        </p>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">✓ {t("مُعتمد", "Approved")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provenance footer */}
              <div className="flex items-center justify-center gap-4 py-3 text-[11px] text-gray-300 border-t border-gray-100">
                <span>{t("جميع الأرقام من ERP المُعتمد حصراً", "All figures from approved ERP only")}</span>
                <span>·</span>
                <span>{t("الأرقام الأولية أو غير المُجمَّعة غير مُدرجة", "Preliminary or unaggregated figures excluded")}</span>
                <span>·</span>
                <span>{t("لا توجد إجراءات في هذه الصفحة", "No actions on this page")}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// HEAD ACCOUNTANT PAGES
// ════════════════════════════════════════════════════════════

// B-H6: head reminders are now a real platform surface (/head/reminders). This replaces the
// previous reuse of the accountant page whose send-buttons were local-only and whose list
// came from the wrong (accountant) endpoint.
function HeadReminders({ }: PageProps) {
  const { t, dir } = useLang();
  const { data: apiReminders } = useHeadRemindersPlatform();
  const patchReminderMut = usePatchHeadReminderPlatform();
  const markAllDoneMut = useMarkAllHeadRemindersDonePlatform();
  const list = (((apiReminders as any)?.data ?? apiReminders ?? []) as any[]);
  const isDone = (r: any) => r.done ?? r.isDone ?? false;
  const open = list.filter(r => !isDone(r));
  const done = list.filter(r => isDone(r));
  const titleOf = (r: any) => r.titleAr ?? r.title ?? "";
  const bodyOf = (r: any) => r.bodyAr ?? r.body ?? "";
  const timeOf = (r: any) => r.timeAr ?? (r.dueAt ?? r.createdAt ? new Date(r.dueAt ?? r.createdAt).toLocaleString("ar-SA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

  const Row = ({ r }: { r: any }) => (
    <div className={`px-5 py-3.5 flex items-center gap-3 border-b border-gray-50 last:border-0 ${isDone(r) ? "opacity-60" : ""}`}>
      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-base flex-shrink-0">{r.icon ?? "🔔"}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isDone(r) ? "text-gray-400 line-through" : "text-gray-800"}`}>{titleOf(r)}</p>
        {bodyOf(r) && <p className="text-xs text-gray-400 mt-0.5">{bodyOf(r)}</p>}
      </div>
      <span className="text-[11px] text-gray-400 flex-shrink-0">{timeOf(r)}</span>
      {!isDone(r) && (
        <button onClick={() => patchReminderMut.mutate({ id: r.id, done: true } as any)} disabled={patchReminderMut.isPending}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 disabled:opacity-60">
          <CheckCircle2 size={12} /> {t("تم", "Done")}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("التذكيرات", "Reminders")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{open.length} {t("تذكير مفتوح", "open reminders")} · {done.length} {t("منجز", "done")}</p>
        </div>
        {open.length > 0 && (
          <Btn variant="success" size="sm" onClick={() => markAllDoneMut.mutate()} disabled={markAllDoneMut.isPending}>
            <CheckCircle2 size={13} /> {t("تعليم الكل كمنجز", "Mark all done")}
          </Btn>
        )}
      </div>
      {list.length === 0
        ? <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10"><EmptyState icon="🔔" title={t("لا توجد تذكيرات", "No Reminders")} desc={t("ستظهر تذكيراتك هنا", "Your reminders will appear here")} /></div>
        : (
          <>
            <Card title={`${t("مفتوحة", "Open")} (${open.length})`}>
              {open.length === 0 ? <div className="px-5 py-6 text-center text-gray-400 text-sm">{t("لا توجد تذكيرات مفتوحة", "No open reminders")}</div> : open.map(r => <Row key={r.id} r={r} />)}
            </Card>
            {done.length > 0 && (
              <Card title={`${t("منجزة", "Done")} (${done.length})`}>
                {done.map(r => <Row key={r.id} r={r} />)}
              </Card>
            )}
          </>
        )
      }
    </div>
  );
}

function HeadDashboard({ navigate, setModal, setDetailId, ops, finalApproveOp, rejectOp, bulkApprove, markErpPosted }: PageProps) {
  const { data: apiHead } = useHeadDashboardPlatform();
  useHeadRemindersPlatform();
  const { t } = useLang();
  const [tab, setTab] = useState<"approval" | "performance" | "erp">("approval");
  const awaitingHead = ops.filter(o => o.status === "approved");
  const finalApproved = ops.filter(o => o.status === "final-approved");
  const rejected = ops.filter(o => o.status === "rejected");
  // B-H2: bind KPIs to GET /head/dashboard (kpis.awaiting/finalApproved/erpPosted/rejected/
  // performanceRatePct), falling back to ops-derived counts only if the payload is absent.
  const headKpis = (apiHead as any)?.kpis ?? {};
  const kpiAwaiting = headKpis.awaiting ?? awaitingHead.length;
  const kpiFinalErp = headKpis.finalApproved ?? finalApproved.filter(o => !o.erpPosted).length;
  const kpiErpPosted = headKpis.erpPosted ?? finalApproved.filter(o => o.erpPosted).length;
  const kpiRejected = headKpis.rejected ?? rejected.length;
  const performanceRate = headKpis.performanceRatePct ?? 0;
  // B-H2: weeklyPerformance now ships day/thisW/lastW — no static fallback. Scale bars dynamically.
  const weekly = (((apiHead as any)?.weeklyPerformance ?? []) as { day?: string; dayAr?: string; thisW: number; lastW: number }[]);
  const weeklyMax = Math.max(1, ...weekly.flatMap(d => [d.thisW, d.lastW]));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t("لوحة رئيس الحسابات 👑", "Head Accountant Dashboard 👑")}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{t("الإشراف على 4 محاسبين · 100 فرع · الاعتماد النهائي وترحيل ERP", "Supervising 4 accountants · 100 branches · Final approval & ERP posting")}</p>
      </div>
      <div className="grid grid-cols-5 gap-4">
        <KpiCard label={t("بانتظار اعتمادي", "Awaiting My Approval")} value={String(kpiAwaiting)} sub={t("📱 من المحاسبين · م3", "📱 From accountants · S3")} icon={<Clock size={18} className="text-amber-600" />} accent="amber" onClick={() => setTab("approval")} />
        <KpiCard label={t("معتمدة نهائياً", "Final Approved")} value={String(kpiFinalErp)} sub={t("مُغلقة · تنتظر ERP · م4", "Closed · Awaiting ERP · S4")} icon={<Lock size={18} className="text-emerald-600" />} accent="emerald" onClick={() => setTab("erp")} />
        <KpiCard label={t("مُرحَّلة لـ ERP", "Posted to ERP")} value={String(kpiErpPosted)} sub={t("مُعالَجة · م5", "Processed · S5")} icon={<ChevronsRight size={18} className="text-indigo-600" />} accent="blue" onClick={() => setTab("erp")} />
        <KpiCard label={t("مرفوضة", "Rejected")} value={String(kpiRejected)} sub={t("خارج المسار", "Off pipeline")} icon={<XCircle size={18} className="text-red-600" />} accent="red" onClick={() => setTab("approval")} />
        <KpiCard label={t("معدل الأداء", "Performance Rate")} value={`${performanceRate}%`} sub={t("هذا الشهر", "This Month")} icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" onClick={() => setTab("performance")} />
      </div>
      {/* Weekly performance chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-sm">📈 {t("الأداء الأسبوعي — عمليات مكتملة", "Weekly Performance — Completed Operations")}</h3>
          <span className="text-xs text-gray-400">{t("الأسبوع الماضي مقارنةً بهذا الأسبوع", "Last week vs this week")}</span>
        </div>
        <div className="flex items-end gap-3 h-28">
          {weekly.length === 0
            ? <div className="w-full text-center text-xs text-gray-400 self-center">{t("لا توجد بيانات أداء أسبوعية بعد", "No weekly performance data yet")}</div>
            : weekly.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-20">
                  <div className="flex-1 bg-gray-200 rounded-t" style={{ height: `${(d.lastW / weeklyMax) * 100}%` }} />
                  <div className="flex-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t" style={{ height: `${(d.thisW / weeklyMax) * 100}%` }} />
                </div>
                <p className="text-[9px] text-gray-400 text-center leading-tight">{d.dayAr ?? d.day}</p>
              </div>
            ))}
        </div>
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500 flex-shrink-0" /><span className="text-[11px] text-gray-600">{t("هذا الأسبوع", "This Week")}</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 flex-shrink-0" /><span className="text-[11px] text-gray-600">{t("الأسبوع الماضي", "Last Week")}</span></div>
          <div className="mr-auto text-[11px] text-emerald-600 font-semibold">↑ +18% {t("مقارنة بالأسبوع الماضي", "vs last week")}</div>
        </div>
      </div>

      <PipelineOverview ops={ops} navigate={navigate} />
      <ExceptionPanel ops={ops} forRole="head" navigate={navigate} />
      <ModuleAggregationGrid ops={ops} navigate={navigate} />
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: "approval" as const, label: `✅ ${t("الاعتماد النهائي", "Final Approval")}` },
          { id: "performance" as const, label: `👥 ${t("أداء المحاسبين", "Accountants")}` },
          { id: "erp" as const, label: `🔗 ${t("الترحيل لـ ERP", "ERP Posting")}` },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === tb.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{tb.label}</button>
        ))}
      </div>
      {tab === "approval" && <HeadApprovalTab ops={ops} finalApproveOp={finalApproveOp} rejectOp={rejectOp} setModal={setModal} setDetailId={setDetailId} bulkApprove={bulkApprove} />}
      {tab === "performance" && <HeadAccountants navigate={navigate} setModal={setModal} setDetailId={setDetailId} detailId={null} ops={ops} approveOp={() => { }} rejectOp={() => { }} finalApproveOp={() => { }} bulkApprove={() => { }} />}
      {tab === "erp" && <HeadERP navigate={navigate} setModal={setModal} setDetailId={setDetailId} detailId={null} ops={ops} approveOp={() => { }} rejectOp={() => { }} finalApproveOp={() => { }} bulkApprove={() => { }} markErpPosted={markErpPosted} />}
    </div>
  );
}

function HeadApprovalTab({ ops, finalApproveOp, rejectOp, setModal, setDetailId, bulkApprove }: {
  ops: Op[]; finalApproveOp: (id: string) => void; rejectOp: (id: string, r: string) => void;
  setModal: (id: string | null) => void; setDetailId: (id: string | null) => void;
  bulkApprove: (ids: string[]) => void;
}) {
  const { t, lang } = useLang();
  const exportHeadOpsMut = useExportHeadOperations();
  const en = lang === "en";
  usePendingOperations();
  const awaitingHead = ops.filter(o => o.status === "approved");
  const [expanded, setExpanded] = useState<string | null>("g0");

  // B-H1: group by the real reviewing accountant (accountantName from /head/operations/pending).
  const groupMap = new Map<string, Op[]>();
  awaitingHead.forEach(op => {
    const acc = op.accountantName ?? t("غير محدد", "Unassigned");
    if (!groupMap.has(acc)) groupMap.set(acc, []);
    groupMap.get(acc)!.push(op);
  });
  const groups = Array.from(groupMap.entries()).map(([accountant, gops], i) => ({
    key: `g${i}`,
    accountant,
    module: [...new Set(gops.map(o => o.moduleLabel))].join(" · "),
    ops: gops,
  })).filter(g => g.ops.length > 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{t("العمليات مجمعة حسب المحاسب · اعتماد دفعة واحدة أو فردي", "Operations grouped by accountant · Bulk or individual approval")}</p>
        {awaitingHead.length > 0 && <Btn variant="success" onClick={() => bulkApprove(awaitingHead.map(o => o.id))}>✅ {t("اعتماد الكل", "Approve All")} ({awaitingHead.length})</Btn>}
      </div>
      {awaitingHead.length === 0 && <EmptyState icon="✅" title={t("تم اعتماد جميع العمليات", "All Operations Approved")} desc={t("لا توجد عمليات بانتظار اعتمادك النهائي", "No operations awaiting your final approval")} />}
      {groups.map(g => (
        <div key={g.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100" onClick={() => setExpanded(expanded === g.key ? null : g.key)}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{g.accountant[0]}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 text-sm">{g.accountant}</span>
                <Badge className="bg-blue-50 text-blue-700">{g.module}</Badge>
                {g.ops.some(o => o.match === "diff") && <Badge className="bg-red-50 text-red-700">⚠ {t("يوجد فروق", "Differences Found")}</Badge>}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{g.ops.length} {t("عمليات موافق عليها", "approved operations")}</p>
            </div>
            <span className="font-mono font-bold text-purple-700">{fmtAmt(g.ops.reduce((s, o) => s + (o.amount ?? 0), 0))} {t("ر.س", "SAR")}</span>
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="success" onClick={e => { e.stopPropagation(); bulkApprove(g.ops.map(o => o.id)); }}><CheckCircle2 size={13} /> {t("اعتماد الكل", "Approve All")}</Btn>
              {expanded === g.key ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </div>
          {expanded === g.key && (
            <div>
              {g.ops.map(op => (
                <div key={op.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <span className="font-mono text-xs text-purple-600 font-semibold w-24 flex-shrink-0">{op.id}</span>
                  <span className="text-sm text-gray-700 flex-1">{op.branch}</span>
                  <Badge className={`${MATCH_CFG[op.match].cls} border`}>{en ? (op.match === "exact" ? "Exact" : "Diff") : MATCH_CFG[op.match].label}</Badge>
                  <Badge className={STATUS_CFG[op.status].cls}>{en ? (EN_STATUS_CFG[op.status] || STATUS_CFG[op.status].label) : STATUS_CFG[op.status].label}</Badge>
                  <span className="font-mono font-semibold text-gray-800">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</span>
                  <div className="flex gap-1">
                    <button onClick={() => finalApproveOp(op.id)} className="p-1.5 rounded hover:bg-emerald-50"><CheckCircle2 size={13} className="text-emerald-600" /></button>
                    {isPkg6SalesReport(op) ? <span className="text-xs text-amber-700">{t(SALES_RETURN_HINT.ar, SALES_RETURN_HINT.en)}</span> : <button onClick={() => { setDetailId(op.id); setModal("reject"); }} className="p-1.5 rounded hover:bg-red-50"><XCircle size={13} className="text-red-500" /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HeadPending({ navigate, setModal, setDetailId, ops, finalApproveOp, rejectOp, bulkApprove, returnForReview }: PageProps) {
  const { t, lang, dir } = useLang();
  const en = lang === "en";
  usePendingOperations();
  const exportHeadOpsMut = useExportHeadOperations();
  const [filters, setFilters] = useState<Filters>({ branch: "", status: "approved", match: "", search: "" });
  const [accFilter, setAccFilter] = useState(t("الكل", "All"));
  const [brandFilter, setBrandFilter] = useState(t("الكل", "All"));
  const [groupBy, setGroupBy] = useState<"flat" | "module" | "accountant">("module");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [conditionalId, setConditionalId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [conditionalApproved, setConditionalApproved] = useState<Set<string>>(new Set());
  const [isSubmittingCond, setIsSubmittingCond] = useState(false);
  const REJECT_REASONS = [t("يوجد فرق في المبالغ", "Amount discrepancy"), t("مستندات ناقصة", "Missing documents"), t("يحتاج مراجعة المورد", "Needs supplier review"), t("تكرار في القيد", "Duplicate entry"), t("خطأ في الفرع", "Wrong branch"), t("أخرى", "Other")];
  const [selectedRejectReason, setSelectedRejectReason] = useState("");
  // HA-F15: Real accountant names from the API only; display "غير متاح" when missing without fake placeholders.
  const getAcc = (op: Op) => op.accountantName || t("غير متاح", "Unavailable");
  const realAccs = [...new Set(ops.map(o => o.accountantName).filter(Boolean))] as string[];
  const HEAD_ACCS = realAccs;
  // B-H1: brand & branch filter options come from the enriched ops rows.
  const BRAND_OPTS = [...new Set(ops.map(o => o.brandName).filter(Boolean))] as string[];
  const BRANCH_OPTS = [...new Set(ops.map(o => o.branch).filter(Boolean))] as string[];
  let filtered = applyFilters(ops, filters).filter(o => o.status === "approved");
  const allVal = t("الكل", "All");
  if (accFilter !== allVal) filtered = filtered.filter(o => getAcc(o) === accFilter);
  if (brandFilter !== allVal) filtered = filtered.filter(o => o.brandName === brandFilter);
  const totalAmt = filtered.some(o => o.amount == null) ? null : filtered.reduce((s, o) => s + (o.amount ?? 0), 0);
  const hasFilters = accFilter !== allVal || brandFilter !== allVal || !!filters.branch || !!filters.match || !!filters.search;

  const toggleGroup = (key: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const buildGroups = () => {
    if (groupBy === "flat") return [{ key: "all", label: "جميع العمليات", ops: filtered }];
    const map = new Map<string, Op[]>();
    filtered.forEach(op => {
      const key = groupBy === "module" ? op.moduleLabel : getAcc(op);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(op);
    });
    return Array.from(map.entries()).map(([key, ops]) => ({ key, label: key, ops })).sort((a, b) => b.ops.length - a.ops.length);
  };

  const groups = buildGroups();

  const OpRow = ({ op }: { op: Op }) => {
    const accountant = getAcc(op);
    const isCond = conditionalId === op.id;
    const wasCond = conditionalApproved.has(op.id);
    return (
      <div key={op.id} className={`border-b border-gray-100 last:border-0 ${op.match === "diff" ? "border-r-4 border-r-red-400" : ""}`}>
        <div className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{accountant[0]}</div>
          {groupBy !== "module" && <Badge className="bg-purple-50 text-purple-700 border border-purple-100 text-xs flex-shrink-0">{op.moduleLabel}</Badge>}
          {groupBy !== "accountant" && <Badge className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] flex-shrink-0">{accountant}</Badge>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-800">{op.branch}</span>
              <span className="text-xs font-mono text-gray-400">{op.id}</span>
              <Badge className={`${MATCH_CFG[op.match].cls} border text-[10px]`}>{en ? (op.match === "exact" ? "Exact" : "Diff") : MATCH_CFG[op.match].label}</Badge>
              {wasCond && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">⚡ {t("اعتماد مشروط", "Conditional Approval")}</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">⏰ {op.timeAgo}</p>
          </div>
          <span className="font-mono font-bold text-gray-800 tabular-nums">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</span>
          <div className="flex gap-1.5 flex-shrink-0">
            <Btn size="sm" variant="success" onClick={() => finalApproveOp(op.id)}><CheckCircle2 size={12} /> {t("اعتماد", "Approve")}</Btn>
            <button onClick={() => { setConditionalId(isCond ? null : op.id); setApprovalComment(""); }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${isCond ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"}`}>
              <AlertTriangle size={11} /> {t("مشروط", "Conditional")}
            </button>
            {isPkg6SalesReport(op) && <span className="text-xs text-amber-700">{t(SALES_RETURN_HINT.ar, SALES_RETURN_HINT.en)}</span>}
            {returnForReview && !isPkg6SalesReport(op) && (
              <button onClick={() => { const note = window.prompt(t("ملاحظة الإرجاع (اختياري)", "Return note (optional)")); if (note === null) return; void returnForReview(op.id, note.trim() || undefined); }}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100">
                <RotateCcw size={11} /> {t("إرجاع للمراجعة", "Return")}
              </button>
            )}
            <div className="relative group" hidden={isPkg6SalesReport(op)}>
              <button className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 font-semibold hover:bg-red-100">
                <XCircle size={11} /> {t("رفض", "Reject")}
              </button>
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-20 hidden group-hover:block w-56">
                <p className="text-[10px] font-bold text-gray-500 mb-1.5 px-1">{t("سبب الرفض", "Reject Reason")}</p>
                {REJECT_REASONS.map(r => (
                  <button key={r} onClick={() => { setDetailId?.(op.id); rejectOp?.(op.id, r); }}
                    className={`w-full ${dir === "ltr" ? "text-left" : "text-right"} text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 text-red-700 hover:font-semibold transition-colors`}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {isCond && (
          <div className="px-5 pb-4 bg-amber-50/40 border-t border-amber-100">
            <p className="text-[11px] font-bold text-amber-800 mb-2 pt-2">{t("تفاصيل الاعتماد المشروط", "Conditional Approval Details")}</p>
            <textarea value={approvalComment} onChange={e => setApprovalComment(e.target.value)}
              placeholder={t("اكتب الشروط أو الملاحظات المطلوبة من الفرع قبل التنفيذ النهائي...", "Write conditions or notes required from the branch before final execution...")}
              className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 resize-none h-20 bg-white focus:outline-none focus:border-amber-400" />
            <div className="flex gap-2 mt-2">
              <button disabled={isSubmittingCond || !approvalComment.trim()}
                onClick={async () => {
                  const trimmed = approvalComment.trim();
                  if (!trimmed || isSubmittingCond) return;
                  setIsSubmittingCond(true);
                  try {
                    await finalApproveOp(op.id, { note: trimmed });
                    setConditionalApproved(p => new Set(p).add(op.id));
                    setConditionalId(null);
                    setApprovalComment("");
                  } catch {
                    // Do not mark conditional approved if server call fails
                  } finally {
                    setIsSubmittingCond(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50 transition-all">
                <CheckCircle2 size={11} /> {isSubmittingCond ? t("جارٍ الحفظ...", "Saving...") : t("تأكيد الاعتماد المشروط", "Confirm Conditional Approval")}
              </button>
              <button disabled={isSubmittingCond} onClick={() => { setConditionalId(null); setApprovalComment(""); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">{t("إلغاء", "Cancel")}</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("بانتظار الاعتماد النهائي", "Awaiting Final Approval")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} {t("عملية وافق عليها المحاسبون", "operations approved by accountants")} · {fmtAmt(totalAmt)} {t("ر.س إجمالياً", "SAR total")}</p>
        </div>
        <div className="flex gap-2">
          {/* HA-F23: Export matches head queue status (approved) */}
          <button onClick={() => exportHeadOpsMut.mutate({ status: "approved", format: "xlsx" })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
            <FileText size={11} /> Excel
          </button>
          {filtered.length > 0 && <Btn variant="success" onClick={() => bulkApprove(filtered.map(o => o.id))}>✅ {t("اعتماد الكل", "Approve All")} ({filtered.length})</Btn>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("بانتظار الاعتماد", "Awaiting Approval")} value={String(filtered.length)} sub={t("جميع الموديولات", "All modules")} icon={<Clock size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("الإجمالي", "Total")} value={totalAmt != null ? `${(totalAmt / 1000).toFixed(0)}K` : "—"} sub={t("ر.س", "SAR")} icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("يوجد فروقات", "Has Differences")} value={String(filtered.filter(o => o.match === "diff").length)} sub={t("تحتاج مراجعة إضافية", "Needs further review")} icon={<AlertTriangle size={18} className="text-red-600" />} accent="red" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir={dir}>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المحاسب المراجع", "Reviewing Accountant")}</label>
            <select value={accFilter} onChange={e => setAccFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option>{t("الكل", "All")}</option>
              {HEAD_ACCS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("العلامة التجارية", "Brand")}</label>
            <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option>{allVal}</option>
              {BRAND_OPTS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفرع", "Branch")}</label>
            <select value={filters.branch} onChange={e => setFilters({ ...filters, branch: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">{t("الكل", "All")}</option>
              {BRANCH_OPTS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المطابقة", "Match")}</label>
            <select value={filters.match} onChange={e => setFilters({ ...filters, match: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">{t("كل المطابقات", "All Matches")}</option>
              <option value="exact">{t("متطابق تاماً", "Exact Match")}</option>
              <option value="review">{t("يحتاج مراجعة", "Needs Review")}</option>
              <option value="diff">{t("يوجد فرق", "Has Difference")}</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder={t("بحث بالفرع أو المطعم أو رقم العملية...", "Search by branch, restaurant or operation ID...")} className="flex-1 text-sm outline-none" />
          </div>
          {hasFilters && (
            <button onClick={() => { setAccFilter(allVal); setBrandFilter(allVal); setFilters({ branch: "", status: "approved", match: "", search: "" }); }}
              className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11} /> {t("مسح الفلاتر", "Clear Filters")}</button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">{t("تجميع حسب:", "Group by:")}</span>
        {([["flat", t("بدون تجميع", "No grouping")], ["module", t("الموديول", "Module")], ["accountant", t("المحاسب", "Accountant")]] as [typeof groupBy, string][]).map(([val, lbl]) => (
          <button key={val} onClick={() => setGroupBy(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${groupBy === val ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
            {lbl}
          </button>
        ))}
        {groupBy !== "flat" && (
          <button onClick={() => setCollapsedGroups(new Set(groups.map(g => g.key)))} className="text-xs text-gray-400 hover:text-gray-600 mr-2">{t("طي الكل", "Collapse All")}</button>
        )}
        {collapsedGroups.size > 0 && (
          <button onClick={() => setCollapsedGroups(new Set())} className="text-xs text-purple-600 hover:underline">{t("فتح الكل", "Expand All")}</button>
        )}
      </div>

      {filtered.length === 0
        ? <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10"><EmptyState icon="✅" title={t("لا توجد عمليات", "No Operations")} desc={t("تم اعتماد الكل أو لا تطابق الفلاتر", "All approved or no filters match")} /></div>
        : groupBy === "flat"
          ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">{t("العمليات المعلقة", "Pending Operations")}</h3>
                <span className="text-xs text-gray-400">{filtered.length} {t("عملية", "operations")} · {fmtAmt(totalAmt)} {t("ر.س", "SAR")}</span>
              </div>
              {filtered.map(op => <OpRow key={op.id} op={op} />)}
            </div>
          )
          : (
            <div className="space-y-3">
              {groups.map(grp => {
                const grpAmt = grp.ops.reduce((s, o) => s + (o.amount ?? 0), 0);
                const isCollapsed = collapsedGroups.has(grp.key);
                const diffCount = grp.ops.filter(o => o.match === "diff").length;
                return (
                  <div key={grp.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <button onClick={() => toggleGroup(grp.key)} className="w-full px-5 py-3.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <ChevronRight size={14} className={`text-gray-400 transition-transform ${isCollapsed ? "rotate-0" : "-rotate-90"}`} />
                        <span className="font-bold text-gray-900 text-sm">{grp.label}</span>
                        <Badge className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px]">{grp.ops.length} {t("عملية", "ops")}</Badge>
                        {diffCount > 0 && <Badge className="bg-red-50 text-red-700 border border-red-100 text-[10px]">⚠️ {diffCount} {t("فروقات", "diffs")}</Badge>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-gray-700">{fmtAmt(grpAmt)} {t("ر.س", "SAR")}</span>
                        <Btn size="sm" variant="success" onClick={e => { e.stopPropagation(); bulkApprove(grp.ops.map(o => o.id)); }}>
                          <CheckCircle2 size={11} /> {t("اعتماد المجموعة", "Approve Group")}
                        </Btn>
                      </div>
                    </button>
                    {!isCollapsed && grp.ops.map(op => <OpRow key={op.id} op={op} />)}
                  </div>
                );
              })}
              <div className="bg-gradient-to-l from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-4 flex items-center justify-between">
                <span className="font-bold text-purple-800 text-sm">{t("إجمالي العمليات المعلقة", "Total Pending Operations")}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{filtered.length} {t("عملية في", "operations in")} {groups.length} {groupBy === "module" ? t("موديول", "module") : t("محاسب", "accountant")}</span>
                  <span className="font-mono font-bold text-purple-700 text-base">{fmtAmt(totalAmt)} {t("ر.س", "SAR")}</span>
                </div>
              </div>
            </div>
          )
      }
    </div>
  );
}

function HeadApproved({ ops }: PageProps) {
  useFinalApprovedOperations();
  const { t, dir } = useLang();
  const exportHeadOpsMut = useExportHeadOperations();
  const approved = ops.filter(o => o.status === "final-approved");
  const erpPostedCount = approved.filter(o => o.erpPosted).length;
  const pendingErp = approved.filter(o => !o.erpPosted).length;
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("المعتمدة نهائياً", "Final Approved")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{approved.length} {t("سجل", "records")} · {erpPostedCount} {t("مُرحَّل لـ ERP", "Posted to ERP")} · {pendingErp} {t("في الانتظار", "pending")}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0" />
          <div><p className="font-extrabold text-emerald-700 text-2xl font-mono">{approved.length}</p><p className="text-emerald-600 text-xs">{t("معتمد نهائياً", "Final Approved")}</p></div>
        </div>
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${erpPostedCount > 0 ? "bg-indigo-50 border-indigo-200" : "bg-amber-50 border-amber-200"}`}>
          <ChevronsRight size={24} className={erpPostedCount > 0 ? "text-indigo-600 flex-shrink-0" : "text-amber-500 flex-shrink-0"} />
          <div>
            <p className={`font-extrabold text-2xl font-mono ${erpPostedCount > 0 ? "text-indigo-700" : "text-amber-600"}`}>{erpPostedCount}</p>
            <p className={`text-xs ${erpPostedCount > 0 ? "text-indigo-600" : "text-amber-500"}`}>{t("مُرحَّل لـ ERP", "Posted to ERP")} {pendingErp > 0 ? `· ${pendingErp} ${t("انتظار", "pending")}` : `· ${t("اكتمل", "done")}`}</p>
          </div>
        </div>
      </div>
      <Card title={`${approved.length} ${t("عملية معتمدة نهائياً", "final approved operations")}`}>
        {approved.length === 0
          ? <EmptyState icon="📋" title={t("لا توجد عمليات معتمدة", "No Approved Operations")} desc={t("بعد اعتماد العمليات تظهر هنا", "Approved operations will appear here")} />
          : approved.map(op => (
            <div key={op.id} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${op.erpPosted ? "bg-indigo-50/30" : ""}`}>
              <Badge className="bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold">{op.moduleLabel}</Badge>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">{op.branch}</span>
                  <span className="text-xs font-mono text-gray-400">{op.id}</span>
                  {op.isCorrection && <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs">{t("تعديل على", "Correction on")} {op.correctiveRef}</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs"><Lock size={9} /> {t("معتمد نهائياً", "Final Approved")}</Badge>
                  {op.erpPosted
                    ? <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs"><ChevronsRight size={9} /> {t("مُرحَّل لـ ERP", "Posted to ERP")} · {op.erpBatchId || "—"}</Badge>
                    : <Badge className="bg-amber-50 text-amber-600 border border-amber-200 text-xs">⏳ {t("في انتظار الترحيل لـ ERP", "Awaiting ERP Posting")}</Badge>
                  }
                </div>
              </div>
              <span className="font-mono font-extrabold text-gray-800 tabular-nums">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</span>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

function HeadRejected({ ops }: PageProps) {
  useRejectedOperations();
  const { t, dir } = useLang();
  const exportHeadOpsMut = useExportHeadOperations();
  const rejected = ops.filter(o => o.status === "rejected");
  return (
    <div className="space-y-5" dir={dir}>
      <h2 className="text-xl font-bold text-gray-800">{t("المرفوضة", "Rejected")}</h2>
      <Card title={`${rejected.length} ${t("عملية مرفوضة", "rejected operations")}`}>
        {rejected.length === 0
          ? <EmptyState icon="📋" title={t("لا توجد عمليات مرفوضة", "No Rejected Operations")} desc="" />
          : rejected.map(op => (
            <div key={op.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 border-r-4 border-r-red-400">
              <Badge className="bg-purple-50 text-purple-700">{op.moduleLabel}</Badge>
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-800">{op.branch}</span><span className="text-xs font-mono text-gray-400">{op.id}</span></div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-red-50 text-red-700">✕ {t("مرفوض", "Rejected")}</Badge>
                  {op.rejectReason && <span className="text-xs text-red-500">{op.rejectReason}</span>}
                </div>
              </div>
              <span className="font-mono font-bold text-gray-800">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</span>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

function HeadShiftHistory() {
  const { t } = useLang();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(1);
  const { data: branchRows } = useQuery({
    queryKey: ["shifts", "assigned-branch-lookup"],
    queryFn: async () => {
      const response = await api.get<{ data: Array<{ id: string; name: string }> }>("/lookups/branches");
      return response.data.data;
    },
  });
  const branches = Array.isArray(branchRows) ? branchRows.filter(branch =>
    typeof branch?.id === "string" && typeof branch?.name === "string") : [];
  const query = useShiftsHistory({ dateFrom, dateTo, branchId, page, pageSize: 20 });
  const busy = query.isPending || query.isFetching;
  const meta = busy || query.isError ? undefined : query.data?.meta;
  const rows = busy || query.isError ? [] : query.data?.data ?? [];
  return <section className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
    <h3 className="font-bold text-gray-800 text-sm">{t("سجل الورديات — قراءة فقط", "Shift history — read only")}</h3>
    <div className="flex flex-wrap gap-3 text-xs">
      <label>{t("من تاريخ الإغلاق", "Closed from")}<input type="date" value={dateFrom}
        onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="block border rounded px-2 py-1" /></label>
      <label>{t("إلى تاريخ الإغلاق", "Closed to")}<input type="date" value={dateTo}
        onChange={e => { setDateTo(e.target.value); setPage(1); }} className="block border rounded px-2 py-1" /></label>
      <label>{t("الفرع", "Branch")}<select value={branchId}
        onChange={e => { setBranchId(e.target.value); setPage(1); }} className="block border rounded px-2 py-1">
        <option value="">{t("كل الفروع المعيّنة", "All assigned branches")}</option>
        {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select></label>
    </div>
    {busy && <p role="status">{t("جارٍ تحميل السجل…", "Loading history…")}</p>}
    {!busy && query.isError && <p role="alert">{isApiError(query.error) ? query.error.messageAr : t("تعذر تحميل سجل الورديات", "Could not load shift history")}</p>}
    {!busy && !query.isError && rows.length === 0 && <p>{t("لا توجد ورديات في هذه الصفحة", "No shifts on this page")}</p>}
    {!busy && !query.isError && rows.map(shift => {
      const evidence = getShiftCountEvidence(shift);
      return <div key={shift.id} className="flex flex-wrap gap-4 border-t py-2 text-xs">
        <span>{shift.branchName}</span><span>{shift.cashierName}</span>
        <span>{shift.endedAt ? new Date(shift.endedAt).toLocaleDateString("ar-SA") : "—"}</span>
        <span>{t("الفرق", "Variance")}: <bdi>{evidence.variance.text}</bdi></span>
      </div>;
    })}
    <div className="flex items-center justify-between text-xs">
      <span>{t("الصفحة", "Page")} {meta?.page ?? page} / {meta?.totalPages ?? "—"}</span>
      <div className="flex gap-2">
        <button disabled={busy || query.isError || historyPageTarget(meta, page, -1) === page}
          onClick={() => setPage(historyPageTarget(meta, page, -1))}>{t("السابق", "Previous")}</button>
        <button disabled={busy || query.isError || historyPageTarget(meta, page, 1) === page}
          onClick={() => setPage(historyPageTarget(meta, page, 1))}>{t("التالي", "Next")}</button>
      </div>
    </div>
  </section>;
}

function HeadModulePage({ moduleKey, navigate, setModal, setDetailId, ops, finalApproveOp, rejectOp, bulkApprove }: PageProps & { moduleKey: string }) {
  const { t, lang, dir } = useLang();
  const en = lang === "en";
  usePendingOperations({ moduleKey: moduleKey as never });
  const exportHeadOpsMut = useExportHeadOperations();
  const [filters, setFilters] = useState<Filters>({ branch: "", status: "", match: "", search: "" });
  const allVal = t("الكل", "All");
  const [accFilter, setAccFilter] = useState(allVal);
  const [brandFilter, setBrandFilter] = useState(allVal);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const mk = moduleKey as ModuleKey;
  const labels: Record<string, string> = { sales: t("المبيعات", "Sales"), expenses: t("المصروفات", "Expenses"), purchases: t("المشتريات", "Purchases"), inventory: t("المخزون", "Inventory"), shifts: t("الشفتات", "Shifts"), employees: t("كشف الحساب", "Employees"), cash: t("العهد النقدية", "Petty Cash"), waste: t("الهدر والتالف", "Waste"), assets: t("الأصول الثابتة", "Assets") };
  const moduleEmoji: Record<string, string> = { sales: "💰", expenses: "🧾", purchases: "🛒", inventory: "📦", shifts: "🕐", employees: "👥", cash: "💵", waste: "🗑️", assets: "🏢" };
  const label = labels[moduleKey] || moduleKey;
  // HA-F15: Real accountant names from the API only; display "غير متاح" when missing without fake placeholders.
  const getAcc = (op: Op) => op.accountantName || t("غير متاح", "Unavailable");
  const realAccs = [...new Set(ops.map(o => o.accountantName).filter(Boolean))] as string[];
  const HEAD_ACCS = realAccs;
  // B-H1: brand & branch filter options from the enriched ops rows.
  const BRAND_OPTS = [...new Set(ops.map(o => o.brandName).filter(Boolean))] as string[];
  const BRANCH_OPTS = [...new Set(ops.map(o => o.branch).filter(Boolean))] as string[];
  let filtered = applyFilters(ops, filters, mk).filter(o => o.status === "approved");
  if (accFilter !== allVal) filtered = filtered.filter(o => getAcc(o) === accFilter);
  if (brandFilter !== allVal) filtered = filtered.filter(o => o.brandName === brandFilter);
  // B-H3: apply the from/to date range (was previously dead UI — applyFilters ignores dates).
  if (dateFrom) filtered = filtered.filter(o => (o.operationDate ?? "").slice(0, 10) >= dateFrom);
  if (dateTo) filtered = filtered.filter(o => (o.operationDate ?? "").slice(0, 10) <= dateTo);
  const totalAmt = filtered.some(o => o.amount == null) ? null : filtered.reduce((s, o) => s + (o.amount ?? 0), 0);
  const diffCount = filtered.filter(o => o.match === "diff").length;
  const exactCount = filtered.filter(o => o.match === "exact").length;
  const hasFilters = accFilter !== allVal || brandFilter !== allVal || !!filters.branch || !!filters.match || !!filters.search || !!dateFrom || !!dateTo;

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <button onClick={() => navigate("head-dashboard")} className="hover:text-purple-600 transition-colors">{t("لوحة التحكم", "Dashboard")}</button>
        <ChevronRight size={12} />
        <span className="text-gray-500">{t("الموديولات", "Modules")}</span>
        <ChevronRight size={12} />
        <span className="text-gray-800 font-semibold">{moduleEmoji[moduleKey] || "📋"} {label}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{label} — {t("الاعتماد النهائي", "Final Approval")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("العمليات الموافق عليها من المحاسبين — تنتظر اعتمادك النهائي", "Operations approved by accountants — awaiting your final approval")}</p>
        </div>
        <div className="flex gap-2">
          {/* HA-F23: Export matches head module queue status (approved) */}
          <button onClick={() => exportHeadOpsMut.mutate({ status: "approved", moduleKey, format: "xlsx" })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all">
            <FileText size={11} /> Excel
          </button>
          {filtered.length > 0 && <Btn variant="success" onClick={() => bulkApprove(filtered.map(o => o.id))}>✅ {t("اعتماد الكل", "Approve All")} ({filtered.length})</Btn>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiCard label={t("بانتظار الاعتماد", "Awaiting Approval")} value={String(filtered.length)} sub={t("عملية موافق عليها", "approved operations")} icon={<Clock size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("الإجمالي", "Total")} value={totalAmt != null ? `${(totalAmt / 1000).toFixed(0)}K` : "—"} sub={t("ر.س", "SAR")} icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("يوجد فروقات", "Has Differences")} value={String(diffCount)} sub={t("تحتاج مراجعة", "Needs review")} icon={<AlertTriangle size={18} className="text-red-600" />} accent="red" />
        <KpiCard label={t("متطابقة", "Matched")} value={String(exactCount)} sub={t("مطابقة تامة", "Exact match")} icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" dir={dir}>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المحاسب المراجع", "Reviewing Accountant")}</label>
            <select value={accFilter} onChange={e => setAccFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option>{allVal}</option>
              {HEAD_ACCS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("العلامة التجارية", "Brand")}</label>
            <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option>{allVal}</option>
              {BRAND_OPTS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفرع", "Branch")}</label>
            <select value={filters.branch} onChange={e => setFilters({ ...filters, branch: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">{allVal}</option>
              {BRANCH_OPTS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المطابقة", "Match")}</label>
            <select value={filters.match} onChange={e => setFilters({ ...filters, match: e.target.value })} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">{t("كل المطابقات", "All Matches")}</option>
              <option value="exact">{t("متطابق تاماً", "Exact Match")}</option>
              <option value="review">{t("يحتاج مراجعة", "Needs Review")}</option>
              <option value="diff">{t("يوجد فرق", "Has Difference")}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("من تاريخ", "From Date")}</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" dir="ltr" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("إلى تاريخ", "To Date")}</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" dir="ltr" />
          </div>
          <div className="flex items-end gap-2">
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-2"><RotateCcw size={10} /> {t("مسح التاريخ", "Clear Dates")}</button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder={t("بحث بالفرع أو المطعم أو رقم العملية...", "Search by branch, restaurant or operation ID...")} className="flex-1 text-sm outline-none" />
          </div>
          {hasFilters && (
            <button onClick={() => { setAccFilter(allVal); setBrandFilter(allVal); setFilters({ branch: "", status: "", match: "", search: "" }); setDateFrom(""); setDateTo(""); }}
              className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11} /> {t("مسح الكل", "Clear All")}</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">{t("عمليات", "Operations")} {label}</h3>
          <span className="text-xs text-gray-400">{filtered.length} {t("عملية", "operations")} · {fmtAmt(totalAmt)} {t("ر.س", "SAR")}</span>
        </div>
        {filtered.length === 0
          ? <EmptyState icon="✅" title={t("لا توجد عمليات", "No Operations")} desc={t("لا توجد عمليات بانتظار الاعتماد في هذا الموديول", "No operations awaiting approval in this module")} />
          : filtered.map(op => {
            const accountant = getAcc(op);
            return (
              <div key={op.id} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 ${op.match === "diff" ? "border-r-4 border-r-red-400" : ""}`}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{accountant[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-800">{op.branch}</span>
                    <span className="text-xs font-mono text-gray-400">{op.id}</span>
                    <Badge className={`${MATCH_CFG[op.match].cls} border text-[10px]`}>{en ? (op.match === "exact" ? "Exact" : "Diff") : MATCH_CFG[op.match].label}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{t("راجعه:", "Reviewed by:")} <span className="text-purple-600 font-medium">{accountant}</span> · <span>⏰ {op.timeAgo}</span></p>
                </div>
                <span className="font-mono font-bold text-gray-800 tabular-nums">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</span>
                <div className="flex gap-1.5">
                  <Btn size="sm" variant="success" onClick={() => finalApproveOp(op.id)}><CheckCircle2 size={12} /> {t("اعتماد", "Approve")}</Btn>
                  {isPkg6SalesReport(op) ? <span className="text-xs text-amber-700">{t(SALES_RETURN_HINT.ar, SALES_RETURN_HINT.en)}</span> : <Btn size="sm" variant="danger" onClick={() => { setDetailId(op.id); setModal("reject"); }}><XCircle size={12} /> {t("رفض", "Reject")}</Btn>}
                </div>
              </div>
            );
          })
        }
        {filtered.length > 0 && (
          <div className="px-5 py-3 bg-gradient-to-r from-purple-50/80 to-cyan-50/60 border-t border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-600">{t("الإجمالي الكلي", "Grand Total")}</span>
              <Badge className="bg-purple-100 text-purple-700">{filtered.length} {t("عملية", "ops")}</Badge>
              {diffCount > 0 && <Badge className="bg-red-50 text-red-700">{diffCount} {t("فروقات", "diffs")}</Badge>}
              {exactCount > 0 && <Badge className="bg-emerald-50 text-emerald-700">{exactCount} {t("مطابقة", "matched")}</Badge>}
            </div>
            <span className="font-mono font-black text-xl text-purple-700">{fmtAmt(totalAmt)} {t("ر.س", "SAR")}</span>
          </div>
        )}
      </div>
      {moduleKey === "shifts" && <HeadShiftHistory />}
    </div>
  );
}

function HeadAccountants({ }: PageProps) {
  const { data: apiPerf } = useAccountantsPerformancePlatform();
  const exportHeadOpsMut = useExportHeadOperations();
  const { t, dir } = useLang();
  const [expandedAcc, setExpandedAcc] = useState<number | null>(null);
  // B-H3: per-accountant performance from /head/accountants/performance.
  const accountants = ((apiPerf as any)?.length > 0 ? (apiPerf as any) : []) as any[];
  // B-H3: guard the summary average against an empty list (was NaN on divide-by-zero).
  const avgReviewTime = accountants.length
    ? (accountants.reduce((s, a) => s + (a.avgTime ?? 0), 0) / accountants.length).toFixed(1)
    : "0";

  return (
    <div className="space-y-4" dir={dir}>
      <div className="flex items-center justify-between">
        {/* HA-F23: Honest label - this exports accountant operations, not performance breakdown */}
        <Btn size="sm" onClick={() => exportHeadOpsMut.mutate({ format: "xlsx" })}><Download size={12} /> {t("تصدير عمليات المحاسبين", "Export Accountant Operations")}</Btn>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-gray-800">{accountants.reduce((s, a) => s + a.reviewed, 0)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t("إجمالي العمليات المراجعة", "Total Reviewed")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-emerald-700">{accountants.reduce((s, a) => s + a.approved, 0)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t("معتمدة", "Approved")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-amber-600">{accountants.reduce((s, a) => s + a.pending, 0)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t("معلقة", "Pending")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-extrabold font-mono text-purple-700">{avgReviewTime} {t("د", "m")}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t("متوسط وقت المراجعة", "Avg Review Time")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {accountants.map((acc, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold">{acc.name[0]}</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">{acc.name}</p>
                  <p className="text-xs text-gray-400">{acc.branches} {t("فرع مخصص", "branches assigned")}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${acc.levelCls}`}>{acc.levelLabelAr ?? acc.level}</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} fill={s <= Math.round(acc.rating) ? "#F59E0B" : "none"} className={s <= Math.round(acc.rating) ? "text-amber-400" : "text-gray-200"} />)}
                    <span className="text-[10px] text-gray-500 mr-0.5">{acc.rating}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center mb-3">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">{t("المراجَعة", "Reviewed")}</p>
                  <p className="font-bold text-gray-700 text-sm">{acc.reviewed}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">{t("معتمدة", "Approved")}</p>
                  <p className="font-bold text-emerald-700 text-sm">{acc.approved}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">{t("معلقة", "Pending")}</p>
                  <p className={`font-bold text-sm ${acc.pending > 5 ? "text-red-600" : "text-amber-600"}`}>{acc.pending}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">{t("معدل", "Rate")}</p>
                  <p className={`font-bold text-sm ${acc.rate >= 90 ? "text-emerald-600" : acc.rate >= 70 ? "text-amber-600" : "text-red-600"}`}>{acc.rate}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-blue-50 rounded-lg px-3 py-2 mb-3">
                <span className="text-blue-600 font-medium">⏱ {t("متوسط وقت المراجعة", "Avg Review Time")}</span>
                <span className="font-bold text-blue-700 font-mono">{acc.avgTime} {t("دقيقة", "min")}</span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                <div className={`h-1.5 rounded-full ${acc.rate >= 90 ? "bg-emerald-500" : acc.rate >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${acc.rate}%` }}></div>
              </div>

              {(() => {
                const diff = acc.rate - acc.prevRate; return (
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`flex items-center gap-0.5 text-[11px] font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-gray-500"}`}>
                      {diff > 0 ? "↑" : diff < 0 ? "↓" : "→"} {Math.abs(diff)}% {t("مقارنة بالشهر الماضي", "vs last month")}
                    </span>
                    <span className="text-[10px] text-gray-400">({t("كان", "was")} {acc.prevRate}%)</span>
                  </div>
                );
              })()}

              <button onClick={() => setExpandedAcc(expandedAcc === i ? null : i)}
                className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-gray-200 text-purple-600 hover:bg-purple-50 font-medium transition-colors">
                <Eye size={12} />
                {expandedAcc === i ? t("إخفاء التفاصيل", "Hide Details") : t("عرض التفاصيل", "Show Details")}
                {expandedAcc === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {expandedAcc === i && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-3">
                <p className="text-[10px] font-bold text-gray-500 mb-2">{t("آخر النشاطات", "Recent Activities")}</p>
                <div className="space-y-1.5">
                  {/* B-H3: recentMovements is now per-accountant. Tolerate tuple or object shape. */}
                  {((acc.recentMovements ?? []) as any[]).map((mv: any, j: number) => {
                    // B-H3 contract: { id, actionAr, timeAr, module, moduleLabelAr } (tuple-tolerant).
                    const mtext = Array.isArray(mv) ? mv[0] : (mv.actionAr ?? mv.text ?? mv.label ?? mv.descriptionAr ?? "");
                    const mtime = Array.isArray(mv) ? mv[1] : (mv.timeAr ?? mv.time ?? mv.at ?? "");
                    const mtype = Array.isArray(mv) ? mv[2] : (mv.moduleLabelAr ?? mv.module ?? mv.type ?? mv.kind ?? "");
                    return (
                      <div key={j} className="flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0"></span>
                        <span className="text-gray-700 flex-1">{mtext}</span>
                        <span className="text-gray-400 text-[10px]">{mtime}</span>
                        <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">{mtype}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h4 className="font-bold text-gray-800 text-sm mb-3">📊 {t("مقارنة الأداء — معدل الاعتماد هذا الشهر", "Performance Comparison — Approval Rate This Month")}</h4>
        <div className="space-y-2.5">
          {[...accountants].sort((a, b) => b.rate - a.rate).map((acc, rank) => {
            const diff = acc.rate - acc.prevRate;
            return (
              <div key={acc.name} className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${rank === 0 ? "bg-amber-400 text-white" : rank === 1 ? "bg-gray-300 text-gray-700" : rank === 2 ? "bg-orange-300 text-white" : "bg-gray-100 text-gray-500"}`}>{rank + 1}</span>
                <span className="text-xs font-medium text-gray-700 w-28 truncate flex-shrink-0">{acc.name.split(" ")[0]} {acc.name.split(" ")[1]}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                  <div className={`h-3 rounded-full ${acc.rate >= 90 ? "bg-emerald-500" : acc.rate >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${acc.rate}%` }} />
                </div>
                <span className="font-mono font-bold text-sm text-gray-800 w-10 text-center flex-shrink-0">{acc.rate}%</span>
                <span className={`text-[11px] font-bold w-14 flex-shrink-0 ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-gray-400"}`}>
                  {diff > 0 ? "↑" : diff < 0 ? "↓" : "→"}{Math.abs(diff)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HeadERP({ ops, markErpPosted }: PageProps) {
  useErpEligibleOperationsPlatform();
  // B-H4: preflight checklist + previous batches log now come from the API.
  const { data: erpPreflight } = useErpPreflightPlatform();
  const { data: erpBatches } = useErpBatchesPlatform();
  const retryBatchMut = useRetryERPBatch();     // T10 §B3 — retry a failed batch
  const downloadBatchMut = useDownloadERPBatch();  // T10 §B4 — json/csv/xlsx
  const { t, dir, lang } = useLang();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [tab, setTab] = useState<"export" | "reports">("export");
  const [postedBatchId, setPostedBatchId] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // Filters connected to reactive state (HA-F07)
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("day");
  const [restaurantFilter, setRestaurantFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("approved_only");

  // Only show ops that are final-approved but NOT yet ERP-posted
  const pendingErp = ops.filter(o => o.status === "final-approved" && !o.erpPosted);
  const postedOps = ops.filter(o => o.erpPosted);
  const finalApproved = ops.filter(o => o.status === "final-approved");

  // Real dynamic counts from operations, no hardcoded counts
  const availableRestaurants = [...new Set(pendingErp.map(o => o.brandName || o.branch).filter(Boolean))];
  const availableBranches = [...new Set(pendingErp.map(o => o.branch).filter(Boolean))];

  // Derive toPost from reactive filters and exclude unknown money (HA-F07, HA-F11)
  const toPost = useMemo(() => {
    return filterErpOperations(ops, {
      moduleFilter,
      periodFilter,
      restaurantFilter,
      branchFilter,
      statusFilter,
    });
  }, [ops, moduleFilter, periodFilter, restaurantFilter, branchFilter, statusFilter]);

  const totalAmt = toPost.some(o => o.amount == null) ? null : toPost.reduce((s, o) => s + (o.amount ?? 0), 0);
  // B-H4: preflight shape { checks:[{ok,labelAr,labelEn,severity}], canProceed, warningCount }
  const preflightChecks = (((erpPreflight as any)?.checks ?? []) as { ok: boolean; labelAr?: string; labelEn?: string; severity?: string }[]);
  const preflightWarnings = (erpPreflight as any)?.warningCount ?? preflightChecks.filter(c => !c.ok).length;
  const erpBatchRows = (((erpBatches as any)?.data ?? erpBatches ?? []) as any[]);

  // ERP Reports: group posted ops by module (HA-F11: null-safe module totals)
  const reportsByModule = postedOps.reduce<Record<string, { label: string; count: number; total: number | null; batchIds: string[] }>>((acc, op) => {
    if (!acc[op.moduleKey]) { acc[op.moduleKey] = { label: op.moduleLabel, count: 0, total: 0, batchIds: [] }; }
    acc[op.moduleKey].count++;
    if (acc[op.moduleKey].total !== null) {
      if (op.amount == null || Number.isNaN(op.amount)) {
        acc[op.moduleKey].total = null;
      } else {
        acc[op.moduleKey].total = (acc[op.moduleKey].total ?? 0) + op.amount;
      }
    }
    if (op.erpBatchId && !acc[op.moduleKey].batchIds.includes(op.erpBatchId)) acc[op.moduleKey].batchIds.push(op.erpBatchId);
    return acc;
  }, {});
  const reportRows = Object.values(reportsByModule);

  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("نظام ERP — التصدير والتقارير", "ERP System — Export & Reports")}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{t("ترحيل العمليات المعتمدة نهائياً · تقارير ERP المُستوردة (قراءة فقط)", "Post final-approved operations · Imported ERP reports (read-only)")}</p></div>
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: "export" as const, label: `🔗 ${t("التصدير لـ ERP", "Export to ERP")}`, count: toPost.length },
          { id: "reports" as const, label: `📊 ${t("تقارير ERP المُستوردة", "Imported ERP Reports")}`, count: postedOps.length },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px flex items-center gap-2
              ${tab === tb.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tb.label}
            {tb.count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === tb.id ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>{tb.count}</span>}
          </button>
        ))}
      </div>
      {tab === "reports" && (
        <div className="space-y-5">
          <div className="rounded-xl overflow-hidden border border-slate-300 shadow-sm">
            <div className="bg-slate-700 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📊</span>
                <div>
                  <p className="font-bold text-white text-sm">{t("طبقة التقارير المرجعية — خارج سير العمل التشغيلي", "Reference Reports Layer — Outside Operational Workflow")}</p>
                  <p className="text-slate-300 text-xs mt-0.5">{t("هذه البيانات استُوردت من نظام ERP بعد معالجتها · المرحلة 6 من دورة الحياة", "This data was imported from ERP after processing · Stage 6 of lifecycle")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-slate-600 text-slate-200 border border-slate-500 text-xs">🔒 {t("قراءة فقط", "Read Only")}</Badge>
                <Badge className="bg-red-900/40 text-red-300 border border-red-700/50 text-xs">{t("لا تعديل · لا إجراء", "No edits · No actions")}</Badge>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-2.5 flex items-center gap-6 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> {t("هذه السجلات لا تمثل عمليات تشغيلية نشطة", "These records don't represent active operational transactions")}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> {t("ASAB يعمل كطبقة تشغيلية قبل ERP · وطبقة تقارير مرجعية بعده", "ASAB works as operational layer before ERP · and reference layer after")}</span>
            </div>
          </div>
          {postedOps.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-semibold text-gray-700">{t("لا توجد تقارير مستوردة بعد", "No imported reports yet")}</p>
              <p className="text-gray-400 text-sm mt-1">{t("بعد ترحيل العمليات لـ ERP ومعالجتها، تظهر التقارير هنا", "After posting operations to ERP and processing, reports appear here")}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-3xl font-extrabold font-mono text-slate-800">{postedOps.length}</p>
                  <p className="text-xs text-slate-500 mt-1">{t("عملية مُعالَجة في ERP", "Operations processed in ERP")}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-3xl font-extrabold font-mono text-indigo-700">{(postedOps.reduce((s, o) => s + (o.amount ?? 0), 0) / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-slate-500 mt-1">{t("ر.س إجمالي المُرحَّل", "SAR total posted")}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-3xl font-extrabold font-mono text-slate-800">{new Set(postedOps.map(o => o.erpBatchId)).size}</p>
                  <p className="text-xs text-slate-500 mt-1">{t("دفعة ترحيل", "Posting batches")}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">{t("التقرير المالي الموحد — مُستورد من ERP", "Consolidated Financial Report — Imported from ERP")}</h3>
                  <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-xs">🔒 {t("قراءة فقط", "Read Only")}</Badge>
                </div>
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-xs text-slate-500 font-semibold text-right">
                      <th className="px-5 py-3">{t("الموديول", "Module")}</th>
                      <th className="px-5 py-3 text-center">{t("المصدر الأصلي", "Origin")}</th>
                      <th className="px-5 py-3 text-center">{t("عدد العمليات", "Count")}</th>
                      <th className="px-5 py-3 text-center">{t("الإجمالي", "Total")}</th>
                      <th className="px-5 py-3 text-center">{t("دفعة ERP", "ERP Batch")}</th>
                      <th className="px-5 py-3 text-center">{t("الحالة", "Status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportRows.map((r, i) => {
                      const moduleOps = postedOps.filter(o => o.moduleLabel === r.label);
                      const originCounts = moduleOps.reduce<Record<string, number>>((a, o) => { a[o.origin] = (a[o.origin] || 0) + 1; return a; }, {});
                      const dominantOrigin = (Object.entries(originCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "mobile") as Op["origin"];
                      const originInfo = ORIGIN_CFG[dominantOrigin];
                      return (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3.5 font-semibold text-sm text-slate-800">{r.label}</td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge className={`${originInfo.cls} border text-[10px]`}>{originInfo.icon} {originInfo.label}</Badge>
                          </td>
                          <td className="px-5 py-3.5 text-center text-slate-600 font-mono font-bold">{r.count}</td>
                          <td className="px-5 py-3.5 text-center font-mono font-extrabold text-slate-800 tabular-nums">{r.total != null ? `${(r.total / 1000).toFixed(1)}K ${t("ر.س", "SAR")}` : "—"}</td>
                          <td className="px-5 py-3.5 text-center">
                            {r.batchIds.map(b => <span key={b} className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mr-1">{b}</span>)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge className="bg-slate-100 text-slate-600 border border-slate-300 text-xs">✓ {t("مرجعي", "Reference")}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td className="px-5 py-3 font-bold text-slate-700 text-sm">{t("الإجمالي الكلي", "Grand Total")}</td>
                      <td></td>
                      <td className="px-5 py-3 text-center font-bold text-slate-700 font-mono">{postedOps.length}</td>
                      <td className="px-5 py-3 text-center font-extrabold text-slate-900 font-mono tabular-nums">
                        {postedOps.some(o => o.amount == null) ? "—" : `${(postedOps.reduce((s, o) => s + (o.amount ?? 0), 0) / 1000).toFixed(1)}K ${t("ر.س", "SAR")}`}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="text-xs text-slate-400 text-center py-2">
                📱 {t("هذه البيانات رُفعت أصلاً من مديري الفروع عبر التطبيق · مرت بمراجعة المحاسبين والاعتماد النهائي · ومُرحَّلة الآن في ERP", "This data was originally uploaded by branch managers via app · went through accountant review and final approval · and is now posted in ERP")}
              </div>
            </>
          )}
        </div>
      )}
      {tab === "export" && (<>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-500" /> {t("قائمة التحقق قبل التصدير", "Pre-Export Validation Checklist")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {/* B-H4: checks from GET /head/erp/preflight */}
            {preflightChecks.length === 0
              ? <div className="col-span-2 text-xs text-gray-400 px-3 py-2">{t("لا توجد فحوصات متاحة", "No checks available")}</div>
              : preflightChecks.map((c, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${c.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {c.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  <span>{(lang === "ar" ? c.labelAr : c.labelEn) ?? c.labelAr ?? c.labelEn}</span>
                </div>
              ))}
          </div>
          {preflightWarnings > 0 && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <AlertTriangle size={11} /> {t(`يوجد ${preflightWarnings} بنود تحتاج مراجعة — يمكنك المتابعة أو تأجيل التصدير`, `${preflightWarnings} items need review — you can proceed or defer export`)}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><Clock size={15} className="text-purple-500" /> {t("سجل دفعات التصدير السابقة", "Previous Export Batches Log")}</h3>
          <div className="space-y-2">
            {/* B-H4: previous batches from GET /head/erp/batches (createdAt/completedAt). */}
            {erpBatchRows.length === 0
              ? <div className="text-xs text-gray-400 px-3 py-2">{t("لا توجد دفعات ترحيل سابقة", "No previous export batches")}</div>
              : erpBatchRows.map((h: any, i: number) => {
                const bid = h.batchId ?? h.id ?? "—";
                const bdate = h.createdAt ?? h.completedAt ?? "";
                const bcount = h.operationCount ?? h.operationsCount ?? h.count ?? (Array.isArray(h.operationIds) ? h.operationIds.length : 0);
                const bamtHalalas = typeof h.totalAmount === "number" ? h.totalAmount : (typeof h.totalHalalas === "number" ? h.totalHalalas : null);
                const bamt = bamtHalalas != null ? Math.round(bamtHalalas / 100).toLocaleString() : (h.total ?? h.amount ?? "—");
                // T10 §B status enum: ready/exported/failed (legacy success/completed → exported).
                const bstatus = h.status ?? "exported";
                const isExported = bstatus === "exported" || bstatus === "success" || bstatus === "completed";
                const isFailed = bstatus === "failed";
                const statusLabel = h.statusLabelAr ?? (isExported ? t("تم التصدير لـ ERP", "Exported") : isFailed ? t("فشل التصدير", "Failed") : t("جاهز للتصدير", "Ready"));
                const statusCls = isExported ? "bg-emerald-100 text-emerald-700" : isFailed ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
                const bby = h.createdByName ?? h.by ?? "";
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="font-mono text-xs text-purple-600 flex-1">{bid}</span>
                    <span className="text-[11px] text-gray-400">{bdate ? new Date(bdate).toLocaleDateString("ar-SA") : ""}</span>
                    <span className="text-xs font-mono font-bold text-gray-700">{bcount} {t("عملية", "ops")}</span>
                    <span className="text-xs font-mono font-bold text-gray-800">{bamt} {t("ر.س", "SAR")}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusCls}`}>{isExported ? "✓ " : isFailed ? "✕ " : "● "}{statusLabel}</span>
                    {bby && <span className="text-[11px] text-gray-500">{bby}</span>}
                    <div className="flex items-center gap-1">
                      {isExported && (
                        <>
                          <button onClick={() => downloadBatchMut.mutate({ batchId: bid, format: "xlsx" })} title={t("تنزيل Excel", "Download Excel")} className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><FileText size={12} /></button>
                          <button onClick={() => downloadBatchMut.mutate({ batchId: bid, format: "json" })} title={t("تنزيل JSON", "Download JSON")} className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"><Download size={12} /></button>
                        </>
                      )}
                      {isFailed && (
                        <button onClick={() => retryBatchMut.mutate(bid)} disabled={retryBatchMut.isPending} title={t("إعادة المحاولة", "Retry")} className="p-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100"><RefreshCw size={12} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-0 mb-6">
            {[{ n: 1, label: `1. ${t("اختيار الفترة", "Select Period")}`, icon: "📅" }, { n: 2, label: `2. ${t("معاينة البيانات", "Preview Data")}`, icon: "👁" }, { n: 3, label: `3. ${t("تأكيد الإرسال", "Confirm Send")}`, icon: "✅" }].map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <button
                  disabled={(s.n === 3 && !postedBatchId) || (s.n === 2 && (toPost.length === 0 || !canProceedPreflight(erpPreflight)) && !postedBatchId)}
                  onClick={() => {
                    if (s.n === 3 && !postedBatchId) return;
                    if (s.n === 2 && (toPost.length === 0 || !canProceedPreflight(erpPreflight)) && !postedBatchId) return;
                    setStep((s.n - 1) as 0 | 1 | 2);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${step === s.n - 1 ? "bg-purple-600 text-white" : step > s.n - 1 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"} ${((s.n === 3 && !postedBatchId) || (s.n === 2 && (toPost.length === 0 || !canProceedPreflight(erpPreflight)) && !postedBatchId)) ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <span>{step >= s.n ? "✓" : s.icon}</span>
                  <span className="text-xs font-semibold whitespace-nowrap">{s.label}</span>
                </button>
                {i < 2 && <div className={`flex-1 h-0.5 mx-1 ${step > i ? "bg-emerald-300" : "bg-gray-200"}`}></div>}
              </div>
            ))}
          </div>
          {step === 0 && (
            <div className="space-y-4">
              {/* ── Advanced export filters per document ── */}
              <div className="grid grid-cols-2 gap-4">

                {/* Module filter */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-600 mb-3">📦 {t("الموديول", "Module")}</p>
                  <div className="space-y-2">
                    {[{ k: "all", l: t("الكل", "All") }, { k: "sales", l: t("المبيعات", "Sales") }, { k: "expenses", l: t("المصروفات", "Expenses") }, { k: "purchases", l: t("المشتريات", "Purchases") }, { k: "inventory", l: t("المخزون", "Inventory") }].map(m => (
                      <label key={m.k} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="erp-module" checked={moduleFilter === m.k} onChange={() => setModuleFilter(m.k)} className="accent-purple-600" />
                        <span className="text-sm text-gray-700">{m.l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                    <p className="text-xs font-bold text-gray-600 mb-2">📅 {t("الفترة الزمنية", "Time Period")}</p>
                    <div className="space-y-1.5">
                      {[{ k: "day", l: t("يوم محدد", "Specific day") }, { k: "week", l: t("الأسبوع الحالي", "Current week") }, { k: "month", l: t("الشهر الحالي", "Current month") }].map((p) => (
                        <label key={p.k} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="erp-period" checked={periodFilter === p.k} onChange={() => setPeriodFilter(p.k)} className="accent-purple-600" />
                          <span className="text-xs text-gray-700">{p.l}</span>
                        </label>
                      ))}
                      <div className="w-full text-xs border border-gray-200 bg-gray-100/70 rounded-lg px-2.5 py-1.5 mt-1 text-gray-600 font-mono flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">{t("نطاق تاريخ العمليات (اليوم):", "Operations Date Scope (Today):")}</span>
                        <span className="font-semibold text-purple-700">{getLocalDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2">
                    <div>
                      <p className="text-xs font-bold text-gray-600 mb-1.5">🏢 {t("المطعم", "Restaurant")}</p>
                      <div className="flex gap-3 flex-wrap">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="erp-rest" checked={restaurantFilter === "all"} onChange={() => setRestaurantFilter("all")} className="accent-purple-600" />
                          <span className="text-xs text-gray-700">{t("الكل", "All")} ({availableRestaurants.length})</span>
                        </label>
                        {availableRestaurants.map(r => (
                          <label key={r} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="erp-rest" checked={restaurantFilter === r} onChange={() => setRestaurantFilter(r)} className="accent-purple-600" />
                            <span className="text-xs text-gray-700">{r}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-600 mb-1.5">🏪 {t("الفرع", "Branch")}</p>
                      <div className="flex gap-3 flex-wrap">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="erp-branch" checked={branchFilter === "all"} onChange={() => setBranchFilter("all")} className="accent-purple-600" />
                          <span className="text-xs text-gray-700">{t("الكل", "All")} ({availableBranches.length})</span>
                        </label>
                        {availableBranches.map(b => (
                          <label key={b} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="erp-branch" checked={branchFilter === b} onChange={() => setBranchFilter(b)} className="accent-purple-600" />
                            <span className="text-xs text-gray-700">{b}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-600 mb-1.5">🔄 {t("الحالة", "Status")}</p>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="erp-status" checked={statusFilter === "approved_only"} onChange={() => setStatusFilter("approved_only")} className="accent-purple-600" />
                          <span className="text-xs text-gray-700">{t("معتمدة فقط", "Approved only")}</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="erp-status" checked={statusFilter === "all"} onChange={() => setStatusFilter("all")} className="accent-purple-600" />
                          <span className="text-xs text-gray-700">{t("الكل", "All")}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center border border-blue-100">
                <div><p className="text-2xl font-bold text-blue-700 font-mono">{toPost.length}</p><p className="text-xs text-blue-600">{t("تنتظر الترحيل", "Awaiting posting")}</p></div>
                <div><p className="text-2xl font-bold text-blue-700 font-mono">{totalAmt != null ? (totalAmt / 1000).toFixed(1) + "K" : "—"}</p><p className="text-xs text-blue-600">{t("ر.س إجمالي", "SAR total")}</p></div>
                <div><p className="text-2xl font-bold text-blue-700 font-mono">{new Set(toPost.map(o => o.branch)).size}</p><p className="text-xs text-blue-600">{t("فرع مشارك", "branches")}</p></div>
              </div>
              {finalApproved.length !== toPost.length && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 text-xs text-indigo-700 font-medium">
                  ✓ {finalApproved.length - toPost.length} {t("عملية سبق ترحيلها في دفعات سابقة", "operations already posted in previous batches")}
                </div>
              )}
              <Btn
                variant="primary"
                disabled={toPost.length === 0 || !canProceedPreflight(erpPreflight)}
                onClick={() => setStep(1)}
                className="justify-center"
              >
                {t("معاينة البيانات", "Preview Data")} →
              </Btn>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <table className="w-full" dir={dir}>
                <thead className="bg-gray-50"><tr className="text-xs text-gray-500 font-semibold">
                  <th className="px-4 py-3 text-right">{t("رقم العملية", "Op ID")}</th><th className="px-4 py-3 text-right">{t("الموديول", "Module")}</th>
                  <th className="px-4 py-3 text-right">{t("الفرع", "Branch")}</th><th className="px-4 py-3 text-center">{t("المبلغ", "Amount")}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {toPost.length === 0
                    ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">{t("لا توجد عمليات معتمدة نهائياً تنتظر الترحيل", "No final-approved operations awaiting posting")}</td></tr>
                    : toPost.map(op => (
                      <tr key={op.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-purple-700 font-bold">{op.id}</td>
                        <td className="px-4 py-3 text-sm">{op.moduleLabel}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{op.branch}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold tabular-nums">{fmtAmt(op.amount)} {t("ر.س", "SAR")}</td>
                        <td className="px-4 py-3 text-center"><Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs"><Lock size={9} /> {t("معتمد", "Approved")}</Badge></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
              <div className="flex gap-3">
                <Btn onClick={() => setStep(0)}>← {t("رجوع", "Back")}</Btn>
                <Btn variant="primary"
                  disabled={toPost.length === 0 || isPosting || !canProceedPreflight(erpPreflight)}
                  onClick={async () => {
                    if (toPost.length === 0 || isPosting || !canProceedPreflight(erpPreflight)) return;
                    setIsPosting(true);
                    try {
                      if (markErpPosted) {
                        const serverId = await markErpPosted(toPost.map(o => o.id));
                        if (typeof serverId === "string" && serverId.trim().length > 0) {
                          setPostedBatchId(serverId);
                          setStep(2);
                        } else {
                          toast.error(t("لم يتم استلام معرّف الدفعة من الخادم", "No batch ID received from server"));
                        }
                      }
                    } catch (err) {
                      const msg = (err as any)?.response?.data?.message || (err as any)?.message || t("فشل الترحيل إلى ERP", "ERP posting failed");
                      toast.error(msg);
                      // Posting failed — do NOT advance to step 2!
                    } finally {
                      setIsPosting(false);
                    }
                  }}
                  className="flex-1 justify-center">
                  {isPosting ? t("جارٍ الترحيل...", "Posting...") : `${t("تأكيد وإرسال للـ ERP", "Confirm & Send to ERP")} →`}
                </Btn>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto border-2 border-indigo-200">
                <ChevronsRight size={36} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{t("تم الترحيل بنجاح!", "Posted Successfully!")}</h3>
                <p className="text-gray-500 text-sm">{t("تم إرسال", "Sent")} {toPost.length} {t("عملية بإجمالي", "operations totaling")} {fmtAmt(totalAmt)} {t("ر.س إلى نظام ERP", "SAR to ERP")}</p>
                <p className="text-gray-400 text-xs mt-1 font-mono">{t("رقم دفعة الترحيل:", "Batch ID:")} {postedBatchId || "—"}</p>
                <div className="mt-3 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2">
                  <Lock size={13} className="text-indigo-600" />
                  <span className="text-sm text-indigo-700 font-semibold">{t("السجلات مُرحَّلة ومُغلقة نهائياً", "Records posted and permanently closed")}</span>
                </div>
              </div>
              <Btn onClick={() => setStep(0)} className="mx-auto">{t("ترحيل دفعة جديدة", "Post New Batch")}</Btn>
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}


// ════════════════════════════════════════════════════════════
// BRANCH MANAGER PAGES
// ════════════════════════════════════════════════════════════
function BranchOverview({ navigate }: PageProps) {
  const { t, dir } = useLang();
  const { data: apiOverview } = useBranchOverviewPlatform();
  const kpis = (apiOverview as any)?.kpis ?? {};
  const hero = (apiOverview as any)?.hero;
  const todaySales = Math.round(((kpis.todaySales ?? kpis.todaySalesHalalas ?? 0)) / 100);
  const orders = kpis.todayOrders ?? kpis.ordersCount ?? 0;
  const empsActive = kpis.activeEmployees ?? 0;
  const reqReports = kpis.requiredReportsCount ?? 0;
  const targetSar = Math.round((hero?.targetHalalas ?? 0) / 100);
  const pct = hero?.achievementPct ?? 0;
  // T12 §1 — tasksOfDay / crew from the overview payload; empty states when absent.
  const tasks = ((apiOverview as any)?.tasksOfDay ?? []) as Array<{ id: string; label: string; state: string; stateLabel?: string }>;
  const crew = ((apiOverview as any)?.crew ?? []) as Array<{ id: string; name: string; role?: string; shift?: string; attendanceLabel?: string }>;
  const stateChip = (s: string) => s === "completed" ? "bg-emerald-50 text-emerald-700" : s === "pending" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500";
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("نظرة عامة", "Overview")} — {(apiOverview as any)?.branch?.name ?? ""}</h2><p className="text-gray-400 text-sm mt-0.5">{new Date().toLocaleDateString("ar-SA")}</p></div>
      {/* Hero achievement band (T12 §1) */}
      <div className="bg-gradient-to-l from-emerald-600 to-teal-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div><p className="font-black text-xl">{t("إنجاز الشهر", "Monthly Achievement")}</p><p className="text-white/70 text-sm mt-0.5">{t("الهدف:", "Target:")} {targetSar.toLocaleString()} {t("ر.س", "SAR")}</p></div>
          <div className={dir === "rtl" ? "text-left" : "text-right"}><p className="text-3xl font-black">{pct}%</p><p className="text-white/60 text-xs">{t("من الهدف", "of target")}</p></div>
        </div>
        <div className="w-full h-3 bg-white/20 rounded-full"><div className="h-3 bg-white rounded-full" style={{ width: `${Math.min(100, pct)}%` }} /></div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("مبيعات اليوم", "Today's Sales")} value={`${todaySales.toLocaleString()} ${t("ر.س", "SAR")}`} icon={<TrendingUp size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("الطلبات", "Orders")} value={String(orders)} sub={t("اليوم", "Today")} icon={<ShoppingCart size={18} className="text-blue-600" />} accent="blue" />
        <KpiCard label={t("الموظفون", "Employees")} value={String(empsActive)} sub={t("نشطون الآن", "Active Now")} icon={<Users size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("التقارير المطلوبة", "Required Reports")} value={String(reqReports)} sub={t("تنتظر الرفع", "Awaiting Upload")} icon={<AlertTriangle size={18} className="text-amber-600" />} accent="amber" />
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Card title={t("مهام اليوم", "Today's Tasks")}>
            {tasks.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400">{t("لا توجد مهام", "No tasks")}</div>}
            {tasks.map((tk) => (
              <div key={tk.id} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 ${tk.state === "pending" ? "bg-amber-50/20" : ""}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tk.state === "completed" ? "bg-emerald-500" : tk.state === "pending" ? "bg-amber-500" : "bg-gray-300"}`}></div>
                <div className="flex-1"><p className={`font-semibold text-sm ${tk.state === "completed" ? "text-gray-400 line-through" : "text-gray-800"}`}>{tk.label}</p></div>
                <Badge className={`text-[10px] ${stateChip(tk.state)}`}>{tk.stateLabel ?? tk.state}</Badge>
                {tk.state !== "completed" && <Btn size="sm" variant="primary" onClick={() => navigate("branch-upload")}><Upload size={12} /> {t("رفع", "Upload")}</Btn>}
              </div>
            ))}
          </Card>
        </div>
        <Card title={t("طاقم اليوم", "Today's Crew")}>
          <div className="p-4 space-y-2">
            {crew.length === 0 && <p className="text-center text-sm text-gray-400 py-4">{t("لا يوجد طاقم", "No crew")}</p>}
            {crew.map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{(c.name || "?")[0]}</div>
                <div className="flex-1"><p className="text-sm font-semibold text-gray-700">{c.name}</p><p className="text-[10px] text-gray-400">{c.role || "—"}{c.shift ? ` · ${c.shift}` : ""}</p></div>
                <Badge className="text-[10px] bg-emerald-50 text-emerald-700">{c.attendanceLabel ?? t("حاضر", "Present")}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Roles that provision a real mobile login account on the backend.
const CASHIER_ROLES = ["كاشير", "أمين صندوق", "cashier"];
const isCashierRole = (role: string) =>
  CASHIER_ROLES.some((r) => r.toLowerCase() === role.trim().toLowerCase());

function BranchEmployees({ }: PageProps) {
  const { t } = useLang();
  const { data: apiEmps = [] } = useBranchEmployeesPlatform();
  const { data: apiOverview } = useBranchOverviewPlatform();
  const addEmpMut = useAddBranchEmployeePlatform();
  const emps = ((apiEmps as any[]).length > 0 ? (apiEmps as any) : []) as any[];
  // The backend derives the branch from the manager's assignment; a manager created
  // without a branch (e.g. via CSV import) can't add employees (422 NO_BRANCH_ASSIGNED).
  // Detect it once the overview loads and block the flow with a clear message instead.
  const noBranch = !!apiOverview && !((apiOverview as any)?.branch?.id);
  const [showAdd, setShowAdd] = useState(false);
  // Cashiers are added from the mobile app by the branch manager — the dashboard
  // only creates non-cashier roles, and no longer collects an email.
  const emptyForm = { name: "", empNumber: "", role: "مشرف", salary: "", shift: "صباحي", phone: "" };
  const [form, setForm] = useState(emptyForm);
  const [addErr, setAddErr] = useState<string | null>(null);
  const canSubmit = form.name.trim() && form.empNumber.trim() && !addEmpMut.isPending;
  const submit = () => {
    if (!canSubmit) return;
    setAddErr(null);
    addEmpMut.mutate(
      {
        name: form.name.trim(),
        empNumber: form.empNumber.trim(),
        role: form.role,
        salaryHalalas: Math.round((parseFloat(form.salary) || 0) * 100),
        shift: form.shift,
        phone: form.phone.trim() || undefined,
      },
      {
        onSuccess: () => { setShowAdd(false); setForm(emptyForm); },
        onError: (e) => {
          // A cashier role should be impossible from the dropdown, but a cached
          // form / free-text role can still trip the 422 — show it inline.
          if (isApiError(e) && e.code === "CASHIER_MOBILE_ONLY") {
            setAddErr(e.messageAr || t("يُضاف الكاشير من تطبيق الموبايل بواسطة مدير الفرع.", "Cashiers are added from the mobile app by the branch manager."));
          } else {
            setAddErr(isApiError(e) ? (e.messageAr || e.message) : t("تعذّر إضافة الموظف", "Could not add the employee"));
          }
        },
      },
    );
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-gray-800">{t("الموظفون", "Employees")}</h2></div>
      {noBranch && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">{t("لم يتم تعيين فرع لحسابك بعد", "No branch is assigned to your account yet")}</p>
            <p className="text-xs text-amber-700 mt-0.5">{t("لا يمكن إضافة موظفين قبل أن يعيّن لك أدمن النظام فرعاً. تواصل مع الإدارة لتعيين الفرع.", "You can't add employees until a system admin assigns you a branch. Contact your administrator to set it.")}</p>
          </div>
        </div>
      )}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="px-5 py-4 bg-gradient-to-l from-purple-700 to-purple-600 text-white flex items-center justify-between">
              <h3 className="font-bold">{t("إضافة موظف", "Add Employee")}</h3>
              <button onClick={() => setShowAdd(false)} className="text-purple-200 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الاسم", "Name")} <span className="text-red-500">*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الرقم الوظيفي", "Emp. No.")} <span className="text-red-500">*</span></label><input value={form.empNumber} onChange={e => setForm(f => ({ ...f, empNumber: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الدور", "Role")}</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"><option>مشرف</option><option>عامل</option><option>محاسب</option><option>مسؤول مخزن</option></select></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الشفت", "Shift")}</label>
                  <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"><option>صباحي</option><option>مسائي</option><option>كامل</option></select></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الراتب (ر.س)", "Salary (SAR)")}</label><input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الهاتف", "Phone")}</label><input dir="ltr" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" /></div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-start gap-2">
                <Bell size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-600">{t("يُضاف الكاشير من تطبيق الموبايل بواسطة مدير الفرع، ويظهر هنا للاطلاع فقط.", "Cashiers are added from the mobile app by the branch manager and appear here for reference only.")}</p>
              </div>
              {addErr && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-start gap-2">
                  <AlertTriangle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-600 font-medium">{addErr}</p>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <Btn onClick={() => setShowAdd(false)}>{t("إلغاء", "Cancel")}</Btn>
                <Btn variant="primary" disabled={!canSubmit} onClick={submit}><Plus size={13} /> {t("إضافة", "Add")}</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
      <Card title={(apiOverview as any)?.branch?.name ?? t("موظفو الفرع", "Branch Employees")}>
        {emps.length === 0 && !noBranch && <div className="px-5 py-8 text-center text-sm text-gray-400">{t("لا يوجد موظفون بعد", "No employees yet")}</div>}
        {emps.length > 0 && <table className="w-full" dir="rtl">
          <thead className="bg-gray-50"><tr className="text-xs text-gray-500 font-semibold"><th className="px-4 py-3 text-right">{t("الموظف", "Employee")}</th><th className="px-4 py-3 text-right">{t("الدور", "Role")}</th><th className="px-4 py-3 text-center">{t("الشفت", "Shift")}</th><th className="px-4 py-3 text-center">{t("الحالة", "Status")}</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {emps.map((e, i) => {
              // API shape: { name, role, shiftType, status, source,
              // workingShifts[], addedBy, addedAt } — cashiers come from the
              // mobile app (source "mobile") and carry their own shift windows.
              const isMobile = e.source === "mobile";
              const workingShifts = Array.isArray(e.workingShifts) ? e.workingShifts : [];
              const shift = e.shiftType ?? e.shift ?? "—";
              const active = (e.status ?? (e.active ? "active" : "")) === "active";
              return (
                <tr key={e.id ?? e.cashierId ?? i} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{(e.name || "?")[0]}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-gray-800">{e.name || "—"}</span>
                          {isMobile && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold inline-flex items-center gap-0.5"><Smartphone size={9} /> {t("من التطبيق", "From App")}</span>}
                        </div>
                        {(e.addedBy || e.addedAt) && <p className="text-[10px] text-gray-400 mt-0.5">{[e.addedBy, e.addedAt ? String(e.addedAt).slice(0, 10) : null].filter(Boolean).join(" · ")}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.role || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {workingShifts.length > 0
                      ? <div className="flex flex-col items-center gap-1">{workingShifts.map((w: any, wi: number) => (
                        <span key={w.id ?? wi} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-medium whitespace-nowrap">{w.name}{(w.startTime || w.endTime) ? ` · ${w.startTime ?? ""}–${w.endTime ?? ""}` : ""}</span>
                      ))}</div>
                      : <Badge className="bg-gray-50 text-gray-600">{shift}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-center"><Badge className={active ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"}>{active ? t("نشط", "Active") : t("إجازة", "On Leave")}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>}
      </Card>
    </div>
  );
}

function BranchItems({ }: PageProps) {
  const { t } = useLang();
  const { data: apiItems } = useBranchInventoryItemsPlatform();
  const items = (((apiItems as any)?.items ?? []) as any[]);   // T12 §4 rows w/ stock status
  const configuredBy = (apiItems as any)?.configuredBy;
  const SC: Record<string, { cls: string; label: string }> = {
    ok: { cls: "bg-emerald-50 text-emerald-700", label: t("كافٍ", "OK") },
    low: { cls: "bg-amber-50 text-amber-700", label: t("منخفض", "Low") },
    critical: { cls: "bg-red-50 text-red-700", label: t("حرج", "Critical") },
  };
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">{t("الأصناف المحددة للجرد", "Items for Inventory")}</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
        <Bell size={14} className="text-blue-600 flex-shrink-0" />
        <p className="text-blue-700 text-xs">{configuredBy ? `${t("القائمة محددة بواسطة", "List configured by")} ${configuredBy}` : t("قائمة كتالوج العلامة التجارية.", "Brand catalog list.")}</p>
      </div>
      <Card title={`${t("الأصناف —", "Items —")} ${items.length} ${t("أصناف", "items")}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-right">{t("الصنف", "Item")}</th>
                <th className="px-4 py-2.5 text-center">{t("الوحدة", "Unit")}</th>
                <th className="px-4 py-2.5 text-center">{t("المتوقع", "Expected")}</th>
                <th className="px-4 py-2.5 text-center">{t("الحد الأدنى", "Min")}</th>
                <th className="px-4 py-2.5 text-center">{t("السعر", "Price")}</th>
                <th className="px-4 py-2.5 text-center">{t("الحالة", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t("لا توجد أصناف", "No items")}</td></tr>}
              {items.map((it, i) => {
                const sc = SC[it.stockStatus] ?? SC.ok; return (
                  <tr key={it.id ?? i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{it.name}{it.code ? <span className="block text-[10px] font-mono text-gray-400">{it.code}</span> : null}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{it.unit ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-mono text-gray-700">{it.expectedQty ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-mono text-gray-500">{it.minLevel ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-mono text-gray-700">{it.priceHalalas != null ? `${fmtAmt(it.priceHalalas / 100)}` : "—"}</td>
                    <td className="px-4 py-3 text-center"><Badge className={`text-[10px] ${sc.cls}`}>{it.stockStatusLabel ?? sc.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function BranchSuppliers({ }: PageProps) {
  const { t } = useLang();
  const { data: apiSuppliers } = useBranchSuppliersPlatform();
  const suppliers = ((apiSuppliers as any[]) ?? []) as any[];
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">{t("الموردون", "Suppliers")}</h2>
      <Card title={t("الموردون + طلبات الإضافة", "Suppliers + Requests")}>
        {suppliers.length === 0 && <div className="px-5 py-10 text-center text-sm text-gray-400">{t("لا يوجد موردون", "No suppliers")}</div>}
        {suppliers.map((s, i) => {
          const isReq = s.isRequest === true;
          const chip = s.statusLabel ?? (isReq ? t("قيد المراجعة", "Under Review") : t("معتمد", "Approved"));
          return (
            <div key={s.id ?? i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold flex-shrink-0">{(s.name || "?")[0]}</div>
              <div className="flex-1"><p className="font-semibold text-sm text-gray-800">{s.name}</p><p className="text-xs text-gray-400">{s.category ?? s.cat ?? "—"}{(s.contactName || s.contactPhone) ? ` · ${s.contactName ?? s.contactPhone}` : ""}</p></div>
              {s.contactPhone && <span className="text-xs text-emerald-600 flex items-center gap-1"><Phone size={11} /> {s.contactPhone}</span>}
              <Badge className={`text-[10px] ${isReq ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>{chip}</Badge>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function BranchUpload({ }: PageProps) {
  const { t, dir } = useLang();
  const { data: apiUploadStatus } = useBranchUploadStatusPlatform();
  // Real submit — POST /company/me/branch/upload — the same endpoint the company
  // branch surface uses. Each submit creates an operation routed to the branch's
  // accountant, who reviews it before forwarding to the head accountant.
  const uploadMut = useBranchUpload();
  const SAR = t("ر.س", "SAR");
  const today = new Date().toISOString().slice(0, 10);

  const [salesAmt, setSalesAmt] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [shift, setShift] = useState("morning");
  const [expenseNote, setExpenseNote] = useState("");
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [invFile, setInvFile] = useState<File | null>(null);
  // Report types submitted this session — drives the "sent" acknowledgment.
  const [sent, setSent] = useState<Record<string, boolean>>({});

  // Optional server-provided checklist (status per report type for today).
  const reports = (((apiUploadStatus as any)?.reports?.length > 0 ? (apiUploadStatus as any).reports : [])) as any[];
  const statusOf = (type: string) => reports.find((r) => r.id === type || r.type === type);
  const isDone = (type: string) => sent[type] || statusOf(type)?.uploadedToday || statusOf(type)?.lastStatus === "success";

  const submitSales = async () => {
    if (!salesAmt.trim()) { toast.error(t("أدخل قيمة المبيعات أولاً", "Enter the sales amount first")); return; }
    try {
      // Sales and expenses are SEPARATE report types on the backend (each has its own
      // checklist entry), so submit them as two operations rather than one bundled call.
      await uploadMut.mutateAsync({
        reportType: "sales", date: today,
        salesHalalas: Math.round((parseFloat(salesAmt) || 0) * 100), shift,
        file: salesFile ?? undefined,
      });
      setSent((p) => ({ ...p, sales: true }));
      if (expAmt.trim()) {
        await uploadMut.mutateAsync({
          reportType: "expenses", date: today,
          expensesHalalas: Math.round((parseFloat(expAmt) || 0) * 100),
          expenseNote: expenseNote || undefined,
        });
        setSent((p) => ({ ...p, expenses: true }));
      }
      setSalesAmt(""); setExpAmt(""); setExpenseNote(""); setSalesFile(null);
    } catch { /* the hook's onError already surfaced the message */ }
  };
  const submitFile = (reportType: string, file: File | null) => {
    uploadMut.mutate(
      { reportType, date: today, file: file ?? undefined },
      { onSuccess: () => { setSent((p) => ({ ...p, [reportType]: true })); if (reportType === "inventory") setInvFile(null); } },
    );
  };

  const DoneChip = () => (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle2 size={12} />{t("تم الإرسال للمحاسب", "Sent to accountant")}</span>
  );

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("رفع البيانات اليومية", "Daily Data Upload")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("البيانات تُرسَل للمحاسب المسؤول لمراجعتها ثم رفعها لمدير الحسابات.", "Data is sent to the responsible accountant for review, then to the head accountant.")}</p>
        </div>
        <span className="text-sm text-gray-400">{new Date().toLocaleDateString("ar-SA")}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Sales + expenses — the daily figures the accountant reviews. */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /> {t("المبيعات والمصروفات", "Sales & Expenses")}</h3>
            {isDone("sales") && <DoneChip />}
          </div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t(`إجمالي المبيعات (${SAR})`, `Total Sales (${SAR})`)} <span className="text-red-500">*</span></label><input type="number" value={salesAmt} onChange={e => setSalesAmt(e.target.value)} placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الشفت", "Shift")}</label><select value={shift} onChange={e => setShift(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option value="morning">{t("صباحي", "Morning")}</option><option value="evening">{t("مسائي", "Evening")}</option><option value="full">{t("كامل اليوم", "Full Day")}</option></select></div>
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t(`المصروفات (${SAR})`, `Expenses (${SAR})`)}</label><input type="number" value={expAmt} onChange={e => setExpAmt(e.target.value)} placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-red-400" /></div>
          </div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("تفصيل المصروفات (اختياري)", "Expense note (optional)")}</label><textarea rows={2} value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder={t("وصف مختصر...", "Brief description...")} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none resize-none" /></div>
          <label className="block border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-emerald-300">
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => { setSalesFile(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
            <Paperclip size={16} className="text-gray-400 mx-auto mb-1" />
            <p className="text-[11px] text-gray-400">{salesFile ? salesFile.name : t("مرفق Z-report (اختياري)", "Z-report attachment (optional)")}</p>
          </label>
          <Btn variant="primary" className="w-full justify-center" disabled={uploadMut.isPending} onClick={submitSales}><Send size={14} /> {uploadMut.isPending ? t("جارٍ الإرسال…", "Sending…") : t("رفع البيانات للمحاسب", "Submit to Accountant")}</Btn>
        </div>

        {/* Inventory + shift-close — file / confirmation reports. */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Package size={16} className="text-blue-600" /> {t("جرد المخزون اليومي", "Daily Inventory Count")}</h3>
              {isDone("inventory") && <DoneChip />}
            </div>
            <label className="block border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-blue-300">
              <input type="file" accept=".xlsx,.xls,.csv,image/*,.pdf" className="hidden" onChange={e => { setInvFile(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
              <Upload size={16} className="text-gray-400 mx-auto mb-1" />
              <p className="text-[11px] text-gray-400">{invFile ? invFile.name : t("ملف الجرد (Excel / صورة)", "Inventory file (Excel / image)")}</p>
            </label>
            <Btn className="w-full justify-center" disabled={uploadMut.isPending} onClick={() => submitFile("inventory", invFile)}><Send size={13} /> {t("إرسال الجرد للمحاسب", "Send Inventory")}</Btn>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Wallet size={16} className="text-purple-600" /> {t("إغلاق الوردية المسائية", "Evening Shift Close")}</h3>
              {isDone("shift-close") && <DoneChip />}
            </div>
            <p className="text-xs text-gray-400">{t("يؤكد إغلاق وردية اليوم ويرسل ملخصها للمحاسب.", "Confirms the day's shift close and sends its summary to the accountant.")}</p>
            <Btn className="w-full justify-center" disabled={uploadMut.isPending} onClick={() => submitFile("shift-close", null)}><CheckCircle2 size={13} /> {t("تأكيد إغلاق الوردية", "Confirm Shift Close")}</Btn>
          </div>
        </div>
      </div>

      {/* Server-provided checklist / status for the day, when available. */}
      {reports.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-600 mb-3">{t("حالة تقارير اليوم", "Today's Report Status")}</p>
          <div className="grid grid-cols-2 gap-2">
            {reports.map((rep) => {
              const good = rep.uploadedToday || rep.lastStatus === "success" || sent[rep.id] || sent[rep.type];
              return (
                <div key={rep.id ?? rep.type} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${good ? "border-emerald-200 bg-emerald-50/40" : rep.lastStatus === "late" ? "border-amber-200 bg-amber-50/40" : "border-gray-100"}`}>
                  <span className="font-medium text-gray-700">{rep.name}{rep.required && <span className="text-red-400"> *</span>}</span>
                  <span className={good ? "text-emerald-600" : rep.lastStatus === "late" ? "text-amber-600" : "text-gray-400"}>
                    {good ? t("تم", "Done") : rep.lastStatus === "late" ? t("متأخر", "Late") : `${t("الموعد", "Due")} ${rep.todayDeadline ?? "—"}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PROCUREMENT PAGES
// ════════════════════════════════════════════════════════════





// ════════════════════════════════════════════════════════════
// SUPPLIER PAGES
// ════════════════════════════════════════════════════════════
// T13 §1 — GET /asab/supplier/overview. Money is integer halalas (÷100 → SAR).
function SupOverview({ navigate }: PageProps) {
  const { data: apiOverview } = useSupplierOverview();
  const { t } = useLang();
  const kpis = (apiOverview as any)?.kpis ?? {};
  const newOrders = kpis.newOrders ?? 0;
  const accepted = kpis.acceptedThisMonth ?? 0;
  const salesSar = kpis.totalSalesThisMonth != null ? kpis.totalSalesThisMonth / 100 : 0;
  const trendPct = kpis.totalSalesTrendPct;
  const activeItems = kpis.activeItems ?? 0;
  const totalItems = kpis.totalItems ?? 0;
  const recent = ((apiOverview as any)?.recentOrders ?? []) as any[];
  const statusChip = (k?: string) => k === "delivered" ? "bg-emerald-50 text-emerald-700" : k === "accepted" ? "bg-blue-50 text-blue-700" : k === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">{t("لوحة تحكم المورد", "Supplier Dashboard")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("شركة الدواجن الوطنية", "National Poultry Company")}</p></div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("طلبات جديدة", "New Orders")} value={String(newOrders)} sub={t("تنتظر ردك", "awaiting your response")} icon={<ShoppingCart size={18} className="text-red-600" />} accent="red" />
        <KpiCard label={t("مقبولة هذا الشهر", "Accepted This Month")} value={String(accepted)} sub={t("هذا الشهر", "this month")} icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("إجمالي مبيعاتي", "Total Sales")} value={`${fmtAmt(salesSar)} ${t("ر.س", "SAR")}`} sub={trendPct != null ? `${trendPct >= 0 ? "▲" : "▼"} ${Math.abs(trendPct)}% ${t("عن الشهر السابق", "vs last month")}` : t("هذا الشهر", "this month")} icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("أصناف نشطة", "Active Items")} value={`${activeItems}/${totalItems}`} sub={t("من كتالوجك", "of your catalog")} icon={<Package size={18} className="text-blue-600" />} accent="blue" />
      </div>
      <Card title={`${t("آخر الطلبات", "Recent Orders")} — ${recent.length}`} actions={<button onClick={() => navigate?.("sup-new")} className="text-xs text-purple-600 font-semibold hover:underline">{t("عرض الطلبات الجديدة", "View new orders")}</button>}>
        {recent.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400">{t("لا توجد طلبات", "No orders yet")}</div>}
        {recent.map((o, i) => (
          <div key={o.id ?? i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><p className="font-semibold text-sm text-gray-800 truncate">{o.from ?? "—"}</p>{o.publicId && <span className="font-mono text-[10px] text-gray-400">{o.publicId}</span>}</div>
              <p className="text-xs text-gray-400 mt-1 truncate">{o.itemsText ?? "—"}{o.deliveryDate ? ` · ${t("التسليم:", "Delivery:")} ${String(o.deliveryDate).slice(0, 10)}` : ""}</p>
            </div>
            <span className="font-mono font-bold text-gray-800 flex-shrink-0">{fmtAmt((o.total ?? 0) / 100)} {t("ر.س", "SAR")}</span>
            <Badge className={`${statusChip(o.statusKey)} flex-shrink-0`}>{o.statusLabel ?? o.statusKey ?? o.status}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

// T13 §2-4 — GET /asab/supplier/orders?status=pending + accept/reject.
// The hook already unwraps the page to an array. Order rows carry itemsText
// (a summary string) + total (halalas) — there is no per-line item array.
function SupNewOrders({ }: PageProps) {
  const { data: apiOrders } = useSupplierOrders({ status: "pending" });
  const { t } = useLang();
  const acceptMut = useAcceptSupplierOrder();
  const rejectMut = useRejectSupplierOrder();
  const orders = (Array.isArray(apiOrders) ? apiOrders : []) as any[];
  // T13 §4 — reason is required (≤500). Collect it before submitting.
  const [rejectFor, setRejectFor] = useState<{ id: string; from: string } | null>(null);
  const [reason, setReason] = useState("");
  const accept = (id: string) => acceptMut.mutate({ id });
  const submitReject = () => {
    if (!rejectFor || !reason.trim()) return;
    rejectMut.mutate({ id: rejectFor.id, reason: reason.trim() }, { onSuccess: () => { setRejectFor(null); setReason(""); } });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">{t("الطلبات الجديدة", "New Orders")}</h2>
      {orders.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات جديدة", "No new orders")}</div>}
      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.id} title={`${order.from ?? "—"}${order.publicId ? ` · ${order.publicId}` : ""}`} actions={
            <div className="flex gap-2">
              <Btn size="sm" variant="success" disabled={acceptMut.isPending} onClick={() => accept(order.id)}><CheckCircle2 size={12} /> {t("قبول الطلب", "Accept Order")}</Btn>
              <Btn size="sm" variant="danger" onClick={() => { setRejectFor({ id: order.id, from: order.from ?? "—" }); setReason(""); }}><XCircle size={12} /> {t("رفض", "Reject")}</Btn>
            </div>
          }>
            <div className="p-4">
              <p className="text-sm text-gray-700">{order.itemsText ?? t("تفاصيل غير متوفرة", "Details unavailable")}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">{t("موعد التسليم:", "Delivery:")} <strong className="text-gray-800">{order.deliveryDate ? String(order.deliveryDate).slice(0, 10) : "—"}</strong>{order.orderDate && <span className="text-xs text-gray-400"> · {t("بتاريخ", "ordered")} {String(order.orderDate).slice(0, 10)}</span>}</span>
                <span className="font-mono font-bold text-lg text-purple-700">{fmtAmt((order.total ?? 0) / 100)} {t("ر.س", "SAR")}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {rejectFor && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setRejectFor(null)} dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-gray-800">{t("رفض طلب", "Reject Order")} — {rejectFor.from}</h3><button onClick={() => setRejectFor(null)} className="text-gray-400"><XCircle size={18} /></button></div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("سبب الرفض (إلزامي)", "Rejection reason (required)")}</label>
            <textarea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} placeholder={t("مثال: السعر مرتفع...", "e.g. price too high...")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300 h-24 resize-none" />
            <div className="flex gap-2 justify-end pt-3"><Btn size="sm" onClick={() => setRejectFor(null)}>{t("إلغاء", "Cancel")}</Btn><Btn size="sm" variant="danger" onClick={submitReject} disabled={!reason.trim() || rejectMut.isPending}><XCircle size={12} /> {t("تأكيد الرفض", "Confirm Reject")}</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BRANCH SETTINGS PAGE
// ════════════════════════════════════════════════════════════
function BranchSettings({ navigate }: PageProps) {
  const { t } = useLang();
  const { data: apiSettings } = useBranchSettingsPlatform();
  const updateSettingsMut = useUpdateBranchSettingsPlatform();
  const [saved, setSaved] = useState(false);
  // Empty defaults — every value comes from GET /company/me/branch/settings, so the
  // form reflects real data and shows saved edits after a reload (no fake seed).
  const [form, setForm] = useState({
    branchName: "", manager: "",
    phone: "", address: "",
    openTime: "", closeTime: "", shiftDuration: "",
    taxNumber: "", bankAccount: "",
    cashLimit: "", wasteThreshold: "", autoReminders: false, requireImages: false
  });
  // branchName / phone / address are owned by the admin record now — the backend
  // ignores edits to them. Lock whatever it reports (default to those three).
  const readOnlyFields = new Set(apiSettings?.readOnlyFields ?? ["branchName", "phone", "address"]);
  // Seed EVERY field from the settings payload (read defensively — the contract is
  // loosely typed). Editable fields must be seeded too, or edits appear not to persist.
  useEffect(() => {
    if (!apiSettings) return;
    const s = apiSettings as any;
    const cashLimitSar = s.cashLimitHalalas != null ? String(Math.round(s.cashLimitHalalas / 100))
      : s.cashAlertThreshold != null ? String(s.cashAlertThreshold) : "";
    setForm(p => ({
      ...p,
      branchName: s.branchName ?? p.branchName,
      manager: s.manager ?? s.managerName ?? p.manager,
      phone: s.phone ?? p.phone,
      address: s.address ?? p.address,
      openTime: s.workingHours?.open ?? s.openTime ?? p.openTime,
      closeTime: s.workingHours?.close ?? s.closeTime ?? p.closeTime,
      shiftDuration: s.shiftDurationHours != null ? String(s.shiftDurationHours) : (s.shiftDuration ?? p.shiftDuration),
      taxNumber: s.taxNumber ?? s.vatNumber ?? p.taxNumber,
      bankAccount: s.bankAccount ?? s.iban ?? p.bankAccount,
      cashLimit: cashLimitSar || p.cashLimit,
      wasteThreshold: s.wasteThreshold != null ? String(s.wasteThreshold) : p.wasteThreshold,
      autoReminders: s.autoReminders ?? s.notificationPrefs?.newReminders ?? p.autoReminders,
      requireImages: s.requireImages ?? p.requireImages,
    }));
  }, [apiSettings]);
  // T12 §8 — shift timings are admin-owned (read-only); default locked.
  const shiftLocked = ((apiSettings as any)?.shiftConfig?.readOnly ?? true) as boolean;
  // PUT /company/me/branch/settings — only the editable fields (identity + shift
  // timings are silently ignored server-side, so we don't send them).
  const save = () => {
    // Only send fields that actually have a value — sending null for an empty text
    // field would wipe an existing value on the server. Toggles are always explicit.
    const patch: any = { autoReminders: form.autoReminders, requireImages: form.requireImages };
    if (form.manager.trim()) patch.manager = form.manager.trim();
    if (form.taxNumber.trim()) patch.taxNumber = form.taxNumber.trim();
    if (form.bankAccount.trim()) patch.bankAccount = form.bankAccount.trim();
    if (form.wasteThreshold !== "") patch.wasteThreshold = Number(form.wasteThreshold);
    if (form.cashLimit !== "") patch.cashLimitHalalas = Math.round((parseFloat(form.cashLimit) || 0) * 100);
    updateSettingsMut.mutate(patch, { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("إعدادات الفرع", "Branch Settings")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{form.branchName}</p>
        </div>
        <Btn variant="success" onClick={save}><CheckCircle2 size={14} /> {saved ? `✅ ${t("تم الحفظ", "Saved")}` : t("حفظ الإعدادات", "Save Settings")}</Btn>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Card title={`📋 ${t("البيانات الأساسية", "Basic Information")}`}>
          <div className="p-4 space-y-3">
            {[{ label: t("اسم الفرع", "Branch Name"), field: "branchName" }, { label: t("مدير الفرع", "Branch Manager"), field: "manager" }, { label: t("رقم الهاتف", "Phone"), field: "phone" }, { label: t("العنوان", "Address"), field: "address" }].map(({ label, field }) => {
              const locked = readOnlyFields.has(field);
              return (
                <div key={field}>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">{label}{locked && <span className="text-gray-300 font-normal"> · {t("من إدارة النظام", "set by admin")}</span>}</label>
                  <input value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} disabled={locked}
                    className={`w-full text-sm border rounded-lg px-3 py-2 outline-none ${locked ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 focus:border-purple-300"}`} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card title={`⏰ ${t("أوقات العمل والشفتات", "Working Hours & Shifts")}`}>
          <div className="p-4 space-y-3">
            {[{ label: t("وقت الفتح", "Opening Time"), field: "openTime", type: "time" }, { label: t("وقت الإغلاق", "Closing Time"), field: "closeTime", type: "time" }, { label: t("مدة الشفت (ساعات)", "Shift Duration (hrs)"), field: "shiftDuration", type: "number" }].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">{label}{shiftLocked && <span className="text-gray-300 font-normal"> · {t("من إدارة النظام", "set by admin")}</span>}</label>
                <input type={type} value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} disabled={shiftLocked}
                  className={`w-full text-sm border rounded-lg px-3 py-2 outline-none ${shiftLocked ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 focus:border-purple-300"}`} />
              </div>
            ))}
            {(() => {
              const openH = parseInt(form.openTime), closeH = parseInt(form.closeTime), dur = parseInt(form.shiftDuration);
              if (!Number.isFinite(openH) || !Number.isFinite(closeH)) return null;
              const hrs = closeH - openH;
              return (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-700 font-medium">⏱ {t("ساعات العمل اليومية:", "Daily working hours:")} <strong>{hrs} {t("ساعة", "hrs")}</strong>{Number.isFinite(dur) && dur > 0 ? ` · ${Math.floor(hrs / dur)} ${t("شفتات", "shifts")}` : ""}</p>
                </div>
              );
            })()}
          </div>
        </Card>
        <Card title={`💳 ${t("البيانات المالية والضريبية", "Financial & Tax Information")}`}>
          <div className="p-4 space-y-3">
            {[{ label: t("الرقم الضريبي", "Tax Number"), field: "taxNumber" }, { label: t("رقم الحساب البنكي (IBAN)", "Bank Account (IBAN)"), field: "bankAccount" }, { label: t("سقف العهدة النقدية (ر.س)", "Cash Limit (SAR)"), field: "cashLimit", type: "number" }].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">{label}</label>
                <input type={type || "text"} value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300 font-mono" dir="ltr" />
              </div>
            ))}
          </div>
        </Card>
        <Card title={`⚙️ ${t("خيارات التشغيل", "Operation Options")}`}>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("حد التنبيه للهدر (%)", "Waste Alert Threshold (%)")}</label>
              <input type="number" value={form.wasteThreshold} onChange={e => setForm(p => ({ ...p, wasteThreshold: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" />
            </div>
            <div className="space-y-3">
              {[{ label: t("إرسال التذكيرات تلقائياً", "Send Reminders Automatically"), field: "autoReminders", desc: t("إرسال تذكير للمحاسب عند غياب تقرير الفرع", "Send a reminder to the accountant when a branch report is missing") },
              { label: t("إلزامية إرفاق الصور", "Require Photo Attachments"), field: "requireImages", desc: t("يجب إرفاق صور مع كل عملية مشتريات أو هدر", "Photos must be attached with every purchase or waste entry") }].map(({ label, field, desc }) => (
                <div key={field} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="pt-0.5">
                    <button onClick={() => setForm(p => ({ ...p, [field]: !(p as any)[field] }))}
                      className={`w-10 h-5 rounded-full transition-all ${(form as any)[field] ? "bg-purple-500" : "bg-gray-300"}`}>
                      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${(form as any)[field] ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PROCUREMENT EXTRA PAGES
// ════════════════════════════════════════════════════════════




// ════════════════════════════════════════════════════════════
// SUPPLIER EXTRA PAGES
// ════════════════════════════════════════════════════════════
// T13 §2/§5 — GET orders?status=accepted + mark-delivered (accepted → delivered).
function SupAccepted({ }: PageProps) {
  const { data: apiAccepted } = useSupplierOrders({ status: "accepted" });
  const { t } = useLang();
  const exportSupOrdersMut = useExportSupplierOrders();
  const deliverMut = useMarkSupplierOrderDelivered();
  const orders = (Array.isArray(apiAccepted) ? apiAccepted : []) as any[];
  const totalRunning = orders.reduce((s, o) => s + (o.total ?? 0), 0); // halalas
  const statusChip = (k?: string) => k === "delivered" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الطلبات المقبولة", "Accepted Orders")}</h2><p className="text-gray-400 text-sm mt-0.5">{orders.length} {t("طلب", "orders")} · {t("إجمالي:", "Total:")} {fmtAmt(totalRunning / 100)} {t("ر.س", "SAR")}</p></div>
        <button onClick={() => exportSupOrdersMut.mutate({ status: "accepted", format: "xlsx" })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11} /> Excel</button>
      </div>
      {orders.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات مقبولة", "No accepted orders")}</div>}
      {orders.length > 0 && (
        <Card title={t("سجل الطلبات المقبولة", "Accepted Orders Log")}>
          {orders.map((o, i) => (
            <div key={o.id ?? i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"><CheckCircle2 size={16} className="text-emerald-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-800 truncate">{o.from ?? "—"}</span>{o.publicId && <span className="font-mono text-xs text-gray-400">{o.publicId}</span>}</div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{o.itemsText ?? "—"}</p>
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-[10px] text-gray-400">{t("التسليم", "Delivery")}</p>
                <p className="text-xs font-semibold text-gray-700">{o.deliveryDate ? String(o.deliveryDate).slice(0, 10) : "—"}</p>
              </div>
              <Badge className={`${statusChip(o.statusKey)} flex-shrink-0`}>{o.statusLabel ?? o.statusKey ?? o.status}</Badge>
              <span className="font-mono font-bold text-gray-800 flex-shrink-0">{fmtAmt((o.total ?? 0) / 100)} {t("ر.س", "SAR")}</span>
              {o.statusKey !== "delivered" && (
                <Btn size="sm" variant="success" disabled={deliverMut.isPending} onClick={() => deliverMut.mutate({ id: o.id })}><Truck size={12} /> {t("تم التسليم", "Delivered")}</Btn>
              )}
            </div>
          ))}
          <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600">{t("الإجمالي", "Total")}</span>
            <span className="font-mono font-black text-purple-700 text-lg">{fmtAmt(totalRunning / 100)} {t("ر.س", "SAR")}</span>
          </div>
        </Card>
      )}
    </div>
  );
}

// T13 §2 — GET orders?status=rejected. The order row does not carry the
// rejection reason back, so we render the summary + amount only.
function SupRejected({ }: PageProps) {
  const { data: apiRejected } = useSupplierOrders({ status: "rejected" });
  const { t } = useLang();
  const orders = (Array.isArray(apiRejected) ? apiRejected : []) as any[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الطلبات المرفوضة", "Rejected Orders")}</h2><p className="text-gray-400 text-sm mt-0.5">{orders.length} {t("طلب مرفوض", "rejected orders")}</p></div>
      </div>
      {orders.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-10 text-center text-sm text-gray-400">{t("لا توجد طلبات مرفوضة", "No rejected orders")}</div>}
      {orders.length > 0 && (
        <Card title={t("سجل الرفض", "Rejection Log")}>
          {orders.map((o, i) => (
            <div key={o.id ?? i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0"><XCircle size={16} className="text-red-500" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-800 truncate">{o.from ?? "—"}</span>{o.publicId && <span className="font-mono text-xs text-gray-400">{o.publicId}</span>}</div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{o.itemsText ?? "—"}{o.orderDate ? ` · ${String(o.orderDate).slice(0, 10)}` : ""}</p>
              </div>
              <Badge className="bg-red-50 text-red-700 flex-shrink-0">{o.statusLabel ?? t("مرفوض", "Rejected")}</Badge>
              <span className="font-mono font-bold text-gray-800 flex-shrink-0">{fmtAmt((o.total ?? 0) / 100)} {t("ر.س", "SAR")}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// T13 §7-12 — supplier catalog CRUD. Prices are integer halalas end-to-end:
// display priceHalalas÷100, and submit priceHalalas = SAR×100.
function SupItems({ }: PageProps) {
  const { data: apiItems } = useSupplierItems();
  const { t } = useLang();
  const exportSupItemsMut = useExportSupplierItems();
  const importSupItemsMut = useImportSupplierItems();
  const supTemplateMut = useSupplierItemsTemplate();
  const createItemMut = useCreateSupplierItem();
  const updateItemMut = useUpdateSupplierItem();
  const deleteItemMut = useDeleteSupplierItem();
  const toggleItemMut = useToggleSupplierItemActive();
  const items = (Array.isArray(apiItems) ? apiItems : []) as any[];
  // Prefer the server's riyal field; fall back to halalas÷100 for older payloads.
  const priceSar = (it: any) => { if (it.priceSar != null) return it.priceSar; const h = it.priceHalalas ?? it.price; return h != null ? h / 100 : null; };
  const isAvailable = (it: any) => it.available ?? (it.status === "active");
  const blank = { name: "", code: "", unit: "", minQty: "", maxQty: "", price: "", leadTimeDays: "", available: true };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(blank);
  // 409 SUPPLIER_RECORD_AMBIGUOUS → the supplier login maps to >1 record; let the
  // user pick which supplierId to attach the item to, then resubmit.
  const [ambigSuppliers, setAmbigSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [pickedSupplierId, setPickedSupplierId] = useState("");
  const supWarnLabel = (w: string): string => ({
    ITEM_NAME_TAKEN: t("اسم الصنف مستخدم من قبل", "Item name already taken"),
    NO_BRANCH_AVAILABILITY: t("لا توجد فروع متاحة لعرض الصنف في التطبيق", "No branches available to show the item in the app"),
    NO_MOBILE_SUPPLIER_LOGIN: t("المورد ليس له حساب دخول على التطبيق — الصنف لن يظهر لموظف المشتريات", "Supplier has no mobile login — the item won't appear for the procurement officer"),
  } as Record<string, string>)[w] ?? w;
  // Build the write body from a form; only send priceHalalas when a price is typed.
  const bodyOf = (f: typeof blank) => ({
    name: f.name.trim(),
    code: f.code.trim() || undefined,
    unit: f.unit.trim() || undefined,
    minQty: f.minQty !== "" ? Number(f.minQty) : undefined,
    maxQty: f.maxQty !== "" ? Number(f.maxQty) : undefined,
    // Field is «السعر (ر.س)» → send riyals via priceSar (backend converts to halalas).
    priceSar: f.price !== "" ? (parseFloat(f.price) || 0) : undefined,
    leadTimeDays: f.leadTimeDays !== "" ? Number(f.leadTimeDays) : undefined,
    available: f.available,
  });
  const submitItem = () => {
    if (!form.name.trim()) return;
    const body: any = bodyOf(form);
    if (pickedSupplierId) body.supplierId = pickedSupplierId;
    createItemMut.mutate(body, {
      onSuccess: (created: any) => {
        setShowAdd(false); setForm(blank); setAmbigSuppliers([]); setPickedSupplierId("");
        // BUG-9 bridge visibility: the item is saved, but tell the supplier whether
        // it actually reached the procurement app + surface any soft warnings.
        if (created?.publishedToApp === false)
          toast.warning(t("تم الحفظ لكن الصنف لسه مش ظاهر في تطبيق المشتريات", "Saved, but the item isn't visible in the procurement app yet"));
        (Array.isArray(created?.warnings) ? created.warnings : []).forEach((w: string) => toast.warning(supWarnLabel(w)));
      },
      onError: (e: any) => {
        if (e?.code === "SUPPLIER_RECORD_AMBIGUOUS") {
          const cands = (e?.details?.suppliers ?? e?.details?.candidates ?? []) as any[];
          setAmbigSuppliers(cands.map((c: any) => ({ id: c.id ?? c.supplierId, name: c.name ?? c.supplierName ?? c.id })).filter((c: any) => c.id));
          toast.info(t("فيه أكتر من سجل مورد مرتبط بحسابك — اختر المورد وأعد الإضافة", "Multiple supplier records match your account — pick one and add again"));
        }
        // Other errors are toasted by the mutation hook itself.
      },
    });
  };
  const openEdit = (it: any) => { setEditId(it.id); setEditForm({ name: it.name ?? "", code: it.code ?? "", unit: it.unit ?? "", minQty: it.minQty != null ? String(it.minQty) : "", maxQty: it.maxQty != null ? String(it.maxQty) : "", price: priceSar(it) != null ? String(priceSar(it)) : "", leadTimeDays: it.leadTimeDays != null ? String(it.leadTimeDays) : "", available: isAvailable(it) }); };
  const submitEdit = () => {
    if (!editId || !editForm.name.trim()) return;
    updateItemMut.mutate({ id: editId, ...bodyOf(editForm) } as any, { onSuccess: () => setEditId(null) });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("قائمة الأصناف", "Item List")}</h2><p className="text-gray-400 text-sm mt-0.5">{items.length} {t("صنف", "items")} · {t("المنتجات التي يوفرها المورد", "Products offered by this supplier")}</p></div>
        <div className="flex gap-2">
          <button onClick={() => supTemplateMut.mutate("xlsx")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold hover:bg-gray-100"><Download size={11} /> {t("نموذج", "Template")}</button>
          <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${importSupItemsMut.isPending ? "bg-purple-100 text-purple-400 border-purple-100" : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"}`}>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={importSupItemsMut.isPending}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importSupItemsMut.mutate(f); }} />
            <Upload size={11} /> {importSupItemsMut.isPending ? t("جارٍ…", "…") : t("رفع Excel", "Import Excel")}
          </label>
          <button onClick={() => exportSupItemsMut.mutate("xlsx")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11} /> {t("تصدير", "Export")}</button>
          <Btn variant="primary" onClick={() => { setForm(blank); setShowAdd(true); }}><Plus size={13} /> {t("إضافة صنف", "Add Item")}</Btn>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs text-gray-500">
              <th className="px-4 py-3 text-right">{t("الصنف", "Item")}</th>
              <th className="px-4 py-3 text-center">{t("الرمز", "Code")}</th>
              <th className="px-4 py-3 text-center">{t("الوحدة", "Unit")}</th>
              <th className="px-4 py-3 text-center">{t("الحد الأدنى", "Min Qty")}</th>
              <th className="px-4 py-3 text-center">{t("الحد الأقصى", "Max Qty")}</th>
              <th className="px-4 py-3 text-center">{t("السعر (ر.س)", "Price (SAR)")}</th>
              <th className="px-4 py-3 text-center">{t("مدة التحضير", "Lead Time")}</th>
              <th className="px-4 py-3 text-center">{t("الحالة", "Status")}</th>
              <th className="px-4 py-3 text-center">{t("إجراءات", "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">{t("لا توجد أصناف", "No items")}</td></tr>}
            {items.map((item, i) => {
              const p = priceSar(item); const av = isAvailable(item); return (
                <tr key={item.id ?? i} className="border-b border-gray-50 hover:bg-gray-50/60 last:border-0">
                  <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                  <td className="px-4 py-3 text-center font-mono text-[11px] text-gray-400">{item.code ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.unit ?? "—"}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.minQty ?? "—"}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.maxQty ?? "—"}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-purple-700">{p != null ? fmtAmt(p) : "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">{item.leadTimeDays != null ? `${item.leadTimeDays} ${t("يوم", "d")}` : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={av ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>{av ? t("نشط", "Active") : t("موقوف", "Inactive")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => toggleItemMut.mutate(item.id)} disabled={toggleItemMut.isPending} title={av ? t("إيقاف", "Deactivate") : t("تفعيل", "Activate")} className={av ? "text-emerald-600 hover:text-emerald-800" : "text-gray-400 hover:text-gray-600"}>{av ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}</button>
                      <button onClick={() => openEdit(item)} title={t("تعديل", "Edit")} className="text-gray-500 hover:text-gray-800"><Edit2 size={14} /></button>
                      <button onClick={() => { if (window.confirm(t("حذف الصنف؟", "Delete item?"))) deleteItemMut.mutate(item.id); }} title={t("حذف", "Delete")} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(showAdd || editId) && (() => {
        const isEdit = !!editId; const f = isEdit ? editForm : form; const setF = isEdit ? setEditForm : setForm; const close = () => isEdit ? setEditId(null) : setShowAdd(false); const busy = isEdit ? updateItemMut.isPending : createItemMut.isPending; return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={close} dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{isEdit ? t("تعديل صنف", "Edit Item") : t("إضافة صنف", "Add Item")}</h3><button onClick={close} className="text-gray-400"><XCircle size={18} /></button></div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("اسم الصنف", "Item Name")}</label><input value={f.name} onChange={e => setF(v => ({ ...v, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الرمز (اختياري)", "Code (optional)")}</label><input value={f.code} onChange={e => setF(v => ({ ...v, code: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الوحدة", "Unit")}</label><input value={f.unit} onChange={e => setF(v => ({ ...v, unit: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("السعر (ر.س)", "Price (SAR)")}</label><input type="number" value={f.price} onChange={e => setF(v => ({ ...v, price: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحد الأدنى", "Min Qty")}</label><input type="number" value={f.minQty} onChange={e => setF(v => ({ ...v, minQty: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحد الأقصى", "Max Qty")}</label><input type="number" value={f.maxQty} onChange={e => setF(v => ({ ...v, maxQty: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("مدة التحضير (يوم)", "Lead Time (days)")}</label><input type="number" value={f.leadTimeDays} onChange={e => setF(v => ({ ...v, leadTimeDays: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-300" /></div>
                  <div className="flex items-end gap-2"><label className="text-[11px] font-semibold text-gray-500">{t("متاح", "Available")}</label><input type="checkbox" checked={f.available} onChange={e => setF(v => ({ ...v, available: e.target.checked }))} className="w-4 h-4 mb-2" /></div>
                </div>
                {!isEdit && ambigSuppliers.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1.5">
                    <p className="text-[11px] font-bold text-amber-800">{t("اختر سجل المورد", "Choose supplier record")}</p>
                    <select value={pickedSupplierId} onChange={e => setPickedSupplierId(e.target.value)} className="w-full text-sm border border-amber-200 rounded-lg px-2 py-2 bg-white outline-none">
                      <option value="">{t("— اختر —", "— select —")}</option>
                      {ambigSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-1"><Btn size="sm" onClick={close}>{t("إلغاء", "Cancel")}</Btn><Btn size="sm" variant="primary" onClick={isEdit ? submitEdit : submitItem} disabled={!f.name.trim() || busy || (!isEdit && ambigSuppliers.length > 0 && !pickedSupplierId)}><Plus size={12} /> {isEdit ? t("حفظ", "Save") : t("إضافة", "Add")}</Btn></div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// T13 §13 — GET /asab/supplier/reports. Flat aggregates over fulfilled
// (accepted + delivered) orders only; money in halalas. SUP-3 breakdowns
// (topItems / topBranches / monthly) are DEFERRED — no placeholders rendered.
function SupReports({ }: PageProps) {
  const { data: apiReports } = useSupplierReports();
  const { t } = useLang();
  const r = (apiReports as any) ?? {};
  const totalRevenue = r.totalRevenue != null ? r.totalRevenue / 100 : 0;
  const orderCount = r.orderCount ?? 0;
  const avgOrderValue = r.averageOrderValue != null ? r.averageOrderValue / 100 : 0;

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">{t("التقارير", "Reports")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("ملخص أداء المبيعات (الطلبات المنفَّذة)", "Sales performance summary (fulfilled orders)")}</p></div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("إجمالي الإيرادات", "Total Revenue")} value={`${fmtAmt(totalRevenue)} ${t("ر.س", "SAR")}`} sub={t("الطلبات المنفَّذة", "fulfilled orders")} icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("عدد الطلبات", "Order Count")} value={String(orderCount)} sub={t("مقبولة + مسلَّمة", "accepted + delivered")} icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("متوسط قيمة الطلب", "Avg Order Value")} value={`${fmtAmt(avgOrderValue)} ${t("ر.س", "SAR")}`} sub={t("لكل طلب", "per order")} icon={<BarChart3 size={18} className="text-blue-600" />} accent="blue" />
      </div>
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        {t("التقارير التفصيلية (أفضل الأصناف والعملاء والاتجاه الشهري) قيد التطوير.", "Detailed reports (top items, top clients, monthly trend) are under development.")}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════
export function ASABPrototype() {
  // Seed from the site-wide language chosen on the entry screen, and keep them in sync.
  const [lang, setLangState] = useState<Lang>(() => getSiteLang());
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
    return { role, page: role ? ROLE_PROFILES[role].defaultPage : "", detailId: null, modal: null };
  });
  const allowedRoles = grantedRoleKeys(user).filter(r => prototypeRoles.includes(r)) as RoleId[];
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
  // Tag the current history entry with a page so Back/Forward can restore it.
  const tagShiftHistory = (p: string, replace = false) => {
    try {
      const st = { ...(window.history.state || {}), asabPage: p };
      if (replace) window.history.replaceState(st, "");
      else window.history.pushState(st, "");
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
      const p = (e.state as { asabPage?: string } | null)?.asabPage;
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
      toast.error(msg);
      throw err;
    });
  };

  const rejectOp = (id: string, reason: string) => {
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
      {currentRole !== "admin" && <LiveChatWidget t={t} />}
    </LangContext.Provider>
  );
}

export default ASABPrototype;
