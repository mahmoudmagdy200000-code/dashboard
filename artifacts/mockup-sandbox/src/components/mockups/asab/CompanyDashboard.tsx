import "./_group.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { Operation as ApiOperation } from "../../../api/types";
import { queryKeys } from "../../../api/queries/keys";
import { chooseGrantedRole, companyRoles, financialAccessFingerprint, financialAccessGeneration, grantedRoleKeys, hasRoleGrant, pageForRole, purgeFinancialQueries, registerFinancialRequest } from "../../../auth/roleAccess";
import { historyBranchOptions, historyPageTarget } from "../../../api/queries/shifts";
import { getSalesActionPolicy, hasSalesReconciliationEvidence, isPkg6SalesReport, runSalesAction, runSalesBulkApproval, salesBulkApprovalIds, SALES_RETURN_HINT } from "./salesActionGuards";
import { getShfReviewGroup, getShfReviewPolicy, runShfReviewAction, shfReviewRows, shfReviewPageTarget, type ShfReviewAction, type ShfReviewGroup } from "./shiftReviewQueue";
import { getHeadReviewPolicy, headLegacyBulkIds, runHeadFinalApproval, HEAD_DAY_EVIDENCE_HINT, HEAD_EXPENSE_EVIDENCE_HINT } from "./headReviewGuards";
import { getShfAllocationEvidence, prepareShfAllocations, remainingShfAllocationHalalas, runShfAllocationCorrection, type ShfAllocationRow } from "./shiftAllocationCorrection";
import { hasEmployeeDebitWarning } from "./_shared/formatters";
import { api, generateCommandId } from "../../../api/client";
import { toast } from "sonner";
import { useState, useMemo, useEffect, useLayoutEffect, useRef, ReactNode, createContext, useContext, type MouseEvent as ReactMouseEvent } from "react";
import {
  useOperations, useApproveOperation, useRejectOperation, useBulkApprove, useFinalApprove, useBulkFinalApprove,
  useVerifyExpenseInvoice, useUnverifyExpenseInvoice, useReviewExpenseInvoice,
  useExpensesKpis, useConvertToAssetDraft,
  useAssetDrafts, useConfirmAssetDraft, useDiscardAssetDraft, useImportAssets, useCreateAsset, usePatchAsset, useAssets, useExportAssets,
  useAssetCategories, useAssetEnums,
  useInventoryBranches, useFlagInventoryBranch,
  useFlagInventoryItems, useSendInventoryNotification, useMarkInventoryConfirmed,
  useInventoryItemsSearch, useConfigureInventoryList,
  useDailyReconciliation, useSaveDailyVarianceAllocation, useExportInventory,
  useWaste, usePatchWasteProduct, usePutWasteAllocations, useApproveWaste, useRejectWaste,
  useBulkApproveWaste, useExportWaste,
  useShiftsLive, useShiftsHistory, useShiftConfigs, useSaveShiftConfig, useExportShifts, useShiftVarianceAllocations, useAccountantShiftReportCorrection,
  useEmployees, useEmployeeMovements, useCreateEmployeeMovement, useSettleEmployeeBalance,
  useExportEmployeeStatement, useExportPayroll,
  useCashCustody, useCashTransactions, useCreateCashTransaction, useApproveCashTxn,
  useRejectCashTxn, useRequestCashSettlement, useSettleCash, useExportCash, useExportCashLedger,
  useReminders, usePatchReminder, useCreateReminder, useDeleteReminder,
  useReports, useDownloadReport,
  // Company Admin
  useCompanyAdminDashboard, useCompanyUsers, useToggleCompanyUserStatus, useCreateCompanyInvitation,
  useCompanyBrands, useCreateBranch, useCompanyModules, useToggleCompanyModule,
  useCompanySettings, useUpdateCompanySettings, useUpgradeSubscription, useContactSales,
  useCompanySubscription, useCompanyPlans,
  // Billing
  useBillingSummary, useBillingInvoices, useExportInvoices, useDownloadInvoicePDF, useExportJobStatus,
  // Support
  useSupportChannels, useCreateTicket,
  // Head
  useHeadDashboard, useAccountantsPerformance, useHeadReminders, usePatchHeadReminder,
  useMarkAllHeadRemindersDone, usePostToERP,
  // Branch Manager
  useBranchOverview, useBranchEmployees, useBranchItems, useBranchPurchaseRequests,
  useBranchSuppliers, useBranchActiveShift, useBranchSubmitItemsCount, useBranchUpload,
  useBranchRequestNewSupplier, useBranchSettings,
  useUpdateBranchSettings, useCreateBranchPurchaseRequest,
  // Procurement
  useProcurementOverview, useProcurementOrders, useGroupedOrders, useSentOrders,
  useApproveOrder, useSendGroupedOrder, useProcurementItems, useProcurementSuppliers,
  useProcurementReports, useDownloadProcurementReport,
  // Recently added
  useExportOperations, useUpdateOrder, useCreateProcurementOrder, useCreateSupplier,
  useCreateProcurementItem, useUpdateCompanyUser, useLookup,
  // T03/T04 wiring
  useAccDashboard, useOperation, useRequestClarification, useOperationAttachments,
  useSalesDetails, usePatchSalesDetails, useAssignSalesVariance,
  useSalesKpis, useSalesDayCompleteness,
  useDailyRollup, useRejectionReasons, useBranchEmployeesLookup,
  usePipelineOverview,
  // T06 purchases wiring
  usePurchasesList, usePurchaseDetail, useDocumentOperation, usePatchPurchaseLine,
  useSuppliers, usePurchaseReturns, usePurchaseEnums,
  // T14 company-portal wiring
  useTransferBranchManager, useCompanyInvitations, useResendCompanyInvitation,
  useRevokeCompanyInvitation, useResendCompanyUserInvite,
  useSsoConfig, useUpdateSso, useDisableSso,
  // T15 report builder
  useReportBuilderFields, usePreviewBuilderReport, useSaveBuilderReport,
  useSavedBuilderReports, useRunSavedBuilderReport,
} from "../../../api/queries";
import { apiOpToCOp, sumCOpAmounts, type COp, type COpStatus, type CMatch, type CModKey } from "./operationMapping";
import { formatShiftHalalas, getShiftCountEvidence, getShiftStatusDisplay } from "./shiftCountEvidence";
import { getShiftCorrectionEvidence, initialShiftCorrectionDraft, prepareShiftCorrectionRequest, runShiftReportCorrection, type ShiftCorrectionDraft, type ShiftCorrectionShareDraft } from "./shiftReportCorrection";
import type {
  Asset, ExpenseInvoiceRow,
  PurchaseLine, PurchasesBlock, Supplier, PurchaseReturn, PurchaseEnumsCatalogue,
  InventoryReviewBranch, WasteEntry, WasteProduct,
  Shift, ShiftConfig,
  Employee as ApiEmployee, EmployeeMovementCategory, CashCustodyRow,
} from "../../../api/types/company";
import { getErrorMessage, isApiError } from "../../../api/errors";
import { isUnassignedAsset, buildAssignPatch, branchPatchPart } from "./assetAssignment";
import { initialCompanySettingsState, runCompanySettingsSave, type CompanySettingsFormState } from "./companySettingsGuards";
import { SUPPORT_TICKET_CATEGORIES, runSupportTicketSubmit } from "./supportTicketGuards";
import { validateBranchCreate, validateUserEdit, parseInvoice, calculateBillingKpis, parseSupportChannel, formatPlanPrice, formatQuota, canToggleModule, DESKTOP_BREAKPOINT_PX, trapDrawerFocus } from "./companyAdminGuards";
import { NotificationBell } from "../../shared/NotificationBell";
import { RejectModal } from "../../shared/RejectModal";
import { ClarifyModal } from "../../shared/ClarifyModal";
import { SessionsList } from "../../shared/SessionsList";
import { GlobalSearch } from "../../shared/GlobalSearch";
import { ChangePasswordModal } from "../../../auth/ChangePasswordModal";
import { useLanguagePref } from "../../../auth/useLanguagePref";
import { readEntrySelection, clearEntrySelection } from "../../../auth/entrySelection";
import { useAuth } from "../../../auth/AuthContext";
import { getSiteLang, setSiteLang, useDocumentLang } from "../../../auth/siteLang";
import { V, G, CYAN, ensureAuthStyles } from "../../../auth/authTheme";
import { LangToggle } from "../../../auth/LangToggle";
import { AsabLogo } from "../../AsabLogo";
import { NotificationPreferencesPage } from "../../shared/NotificationPreferencesPage";
import { TwoFactorSetupWizard } from "../../shared/TwoFactorSetupWizard";
import { ApiKeysPage } from "../../shared/ApiKeysPage";
import { WebhooksPage } from "../../shared/WebhooksPage";
import { LiveChatWidget } from "../../shared/LiveChatWidget";
import {
  Key, Webhook,
  LayoutDashboard, Building2, Users, Settings, Bell, LogOut, ChevronRight,
  CheckCircle2, XCircle, TrendingUp, Plus, X, Edit2, FileText,
  Shield, Search, CreditCard, Package, Wallet, ShoppingCart, Clock,
  BarChart3, AlertTriangle, Star, RefreshCw, ArrowLeftRight,
  Send, Check, Download, Zap, Lock, ChevronDown, ChevronUp,
  Eye, Paperclip, ThumbsUp, ThumbsDown, Upload, Clipboard,
  Home, RotateCcw, Filter, GitMerge, ArrowRightToLine, CheckSquare, Edit3,
  Activity, Trash2, Globe, Menu
} from "lucide-react";

// ═══════════════════════════════════════════════════
// BILINGUAL SUPPORT — Arabic / English
// ═══════════════════════════════════════════════════
type CLang = "ar"|"en";
type CLangCtx = { lang:CLang; setLang:(l:CLang)=>void; t:(ar:string,en:string)=>string; dir:"rtl"|"ltr" };
const CLangContext = createContext<CLangCtx>({ lang:"ar", setLang:()=>{}, t:(ar)=>ar, dir:"rtl" });
const useCLang = () => useContext(CLangContext);

const EN_C_NAV_LABELS:Record<string,string> = {
  "ca-dashboard":"Dashboard","ca-subscription":"Plan & Subscription","ca-users":"User Management",
  "ca-branches":"Brands & Branches","ca-modules":"Active Modules","ca-billing":"Billing & Payments",
  "ca-settings":"Company Settings","ca-support":"Technical Support",
  "head-dashboard":"Dashboard","head-pending":"Awaiting Approval","head-approved":"Final Approved",
  "head-rejected":"Rejected","head-sales":"Sales","head-expenses":"Expenses",
  "head-purchases":"Purchases","head-inventory":"Inventory","head-waste":"Waste & Spoilage",
  "head-assets":"Fixed Assets","head-shifts":"Shifts","head-employees":"Employee Accounts",
  "head-cash":"Cash Custody","head-reminders":"Reminders","head-accountants":"Accountant Performance",
  "head-erp":"ERP Export","head-reports":"Financial Reports",
  "acc-dashboard":"Dashboard","acc-reminders":"Reminders","acc-sales":"Sales",
  "acc-expenses":"Expenses","acc-purchases":"Purchases","acc-inventory":"Inventory",
  "acc-waste":"Waste & Spoilage","acc-assets":"Fixed Assets","acc-shifts":"Shift Management",
  "acc-employees":"Employee Accounts","acc-cash":"Cash Custody Management","acc-reports":"Reports",
  "branch-overview":"Overview","branch-upload":"Upload Data","branch-employees":"Employees",
  "branch-items":"Items","branch-suppliers":"Suppliers","branch-settings":"Branch Settings",
  "proc-overview":"Dashboard","proc-new":"New Requests","proc-grouped":"Grouped Requests",
  "proc-sent":"Sent to Suppliers","proc-items":"Items","proc-suppliers":"Suppliers","proc-reports":"Reports",
};

const EN_C_SECTIONS:Record<string,string> = {
  "لوحة التحكم":"Control Panel","المالية":"Finance","الإعدادات":"Settings",
  "الرئيسية":"Main","الاعتماد":"Approval","الموديولات":"Modules",
  "التقارير":"Reports","الوحدات":"Modules","إدارة البيانات":"Data Management",
  "الطلبات":"Requests","الإدارة":"Management",
};

type CRoleKey = "company-admin"|"head"|"accountant"|"branch"|"procurement";
const EN_C_ROLE_META:Record<CRoleKey,{ label:string; desc:string }> = {
  "company-admin":{ label:"Company Admin",       desc:"Manage subscription and users"      },
  head:           { label:"Head Accountant",     desc:"Oversight and final approval"       },
  accountant:     { label:"Accountant",          desc:"Review financial operations"        },
  branch:         { label:"Branch Manager",      desc:"Upload daily branch data"           },
  procurement:    { label:"Procurement Manager", desc:"Purchase orders and suppliers"      },
};

// ═══════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════
const SIDEBAR_GRAD = "linear-gradient(180deg,#0F1C35 0%,#1B3A6B 100%)";
const BG_CONTENT   = "#F0F4FA";

// ═══════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════
function Btn({ children, onClick, variant="ghost", size="md", disabled=false }:{
  children:ReactNode; onClick?:(e:ReactMouseEvent<HTMLButtonElement>)=>void;
  variant?:"primary"|"success"|"danger"|"ghost"|"outline"|"amber"|"cyan";
  size?:"sm"|"md"; disabled?:boolean;
}) {
  const base  = "inline-flex items-center gap-1.5 font-semibold cursor-pointer border transition-all rounded-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm:"px-3 py-1.5 text-xs", md:"px-4 py-2 text-sm" };
  const variants = {
    primary:"bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-sm",
    success:"bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm",
    danger:"bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    amber:"bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    ghost:"bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
    outline:"bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
    cyan:"bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
  };
  return <button disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]}`}>{children}</button>;
}

function Badge({ children, className="" }:{ children:ReactNode; className?:string }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`}>{children}</span>;
}

function KpiCard({ label, value, sub, icon, accent="purple", delta }:{
  label:string; value:string; sub?:string; icon:ReactNode; accent?:string; delta?:string;
}) {
  const { t } = useCLang();
  const am:Record<string,string> = {
    purple:"bg-purple-50 text-purple-600 border-purple-100",
    emerald:"bg-emerald-50 text-emerald-600 border-emerald-100",
    amber:"bg-amber-50 text-amber-600 border-amber-100",
    red:"bg-red-50 text-red-600 border-red-100",
    blue:"bg-blue-50 text-blue-600 border-blue-100",
    cyan:"bg-cyan-50 text-cyan-600 border-cyan-100",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${am[accent]||am.purple}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      {delta && <p className={`text-[10px] font-bold mt-1 ${delta.startsWith("+")?"text-emerald-600":"text-red-500"}`}>{delta} {t("مقارنة بالأسبوع الماضي","vs last week")}</p>}
    </div>
  );
}

const fmt = (n:number|null|undefined) => n == null ? "—" : n.toLocaleString("ar-SA");
/** SAR amounts derived from halalas: fixed 2 decimals so 12.5 and 12 render consistently (review D-3). */
const fmtSar2 = (n:number|null|undefined) => n == null ? "—" : n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ═══════════════════════════════════════════════════
// COMPANY & HIERARCHY DATA
// ═══════════════════════════════════════════════════
const COMPANY = { name:"—", logo:"ع", plan:"—", city:"—" };
const PLAN_AR: Record<string,string> = { Basic:"أساسي", Professional:"احترافي", Enterprise:"مؤسسي" };

// Brand → restaurant → branch tree comes from the platform API (useCompanyBrands / dashboard
// brandSummary) at point of use. This module-level list is intentionally empty — no static seed.
// Brand filter dropdowns and color lookups read it; they degrade to "all / default" when empty.
const BRANDS: {
  id: string; name: string; color: string; abbr: string;
  restaurants: { id: string; name: string; branches: { id: string; name: string; city: string }[] }[];
}[] = [];

const ALL_BRANCHES = BRANDS.flatMap(b=>b.restaurants.flatMap(r=>r.branches.map(br=>({...br,brandId:b.id,brandName:b.name,brandColor:b.color}))));


// ═══════════════════════════════════════════════════
// ASSET DRAFT CONTEXT — تحويل المصروف إلى أصل ثابت
// ═══════════════════════════════════════════════════
type CDraftStatus = "draft"|"confirmed";
type CAssetDraft = {
  draftId:string; invNum:string; vendor:string; desc:string;
  amount:number; branch:string; date:string; expOpId:string;
  assetName:string; category:string; categoryLabelAr?:string; usefulLife:number;
  qty:number; custodian:string; targetBranches:string[]; invoiceIndex:number;
  status:CDraftStatus;
};
type CAssetDraftCtx = {
  drafts:CAssetDraft[];
  addDraft:(d:CAssetDraft)=>Promise<any>|void;
  discardDraft:(id:string)=>void;
  confirmDraft:(id:string)=>void;
  getConvertedInvNums:()=>Set<string>;
};
const CAssetDraftContext = createContext<CAssetDraftCtx>({
  drafts:[], addDraft:()=>Promise.resolve(), discardDraft:()=>{}, confirmDraft:()=>{}, getConvertedInvNums:()=>new Set(),
});
function CAssetDraftProvider({ children }:{ children:ReactNode }) {
  const { data: serverDrafts = [] } = useAssetDrafts();
  const convertMut = useConvertToAssetDraft();
  const confirmMut = useConfirmAssetDraft();
  const discardMut = useDiscardAssetDraft();

  const drafts: CAssetDraft[] = serverDrafts.map((d): CAssetDraft => ({
    draftId: d.draftId,
    invNum: d.invNum,
    vendor: d.vendor,
    desc: d.desc,
    amount: d.amountHalalas / 100,
    branch: d.expenseBranch,
    date: d.expenseDate,
    expOpId: d.expenseOpId,
    assetName: d.assetName,
    category: d.category,
    categoryLabelAr: d.categoryLabelAr,
    usefulLife: d.usefulLifeMonths,
    qty: d.qty,
    custodian: d.custodian,
    targetBranches: d.targetBranches,
    invoiceIndex: (d as any).invoiceIndex ?? 0,
    status: d.status === "draft" ? "draft" : "confirmed",
  }));

  const addDraft = (d:CAssetDraft) => {
    return convertMut.mutateAsync({
      invoiceId: d.expOpId,
      invoiceIndex: d.invoiceIndex,
      assetName: d.assetName,
      category: d.category,
      usefulLifeMonths: d.usefulLife,
      targetBranches: d.targetBranches,
      custodian: d.custodian,
      qty: d.qty,
    });
  };
  const discardDraft = (id:string) => { discardMut.mutate(id); };
  const confirmDraft = (id:string) => { confirmMut.mutate(id); };
  const getConvertedInvNums = () => new Set(drafts.map(d=>d.invNum));
  return (
    <CAssetDraftContext.Provider value={{drafts,addDraft,discardDraft,confirmDraft,getConvertedInvNums}}>
      {children}
    </CAssetDraftContext.Provider>
  );
}

function CLangProvider({ children }:{ children:ReactNode }) {
  // Seed from the site-wide language chosen on the entry screen, and keep the two in sync.
  const [lang, setLangState] = useState<CLang>(() => getSiteLang());
  useDocumentLang(lang);
  const setLang = (l:CLang) => { setSiteLang(l); setLangState(l); };
  const t   = (ar:string, en:string) => lang==="ar" ? ar : en;
  const dir = lang==="ar" ? "rtl" : "ltr";
  return (
    <CLangContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </CLangContext.Provider>
  );
}

const ASSET_CATS_CD = ["معدات مطبخ","تقنية وأجهزة","أثاث ومفروشات","مركبات","صيانة وإنشاءات","أخرى"];
const USEFUL_LIFE_CD = [
  {label:"24 شهر (سنتان)",val:24},{label:"36 شهر (3 سنوات)",val:36},
  {label:"48 شهر (4 سنوات)",val:48},{label:"60 شهر (5 سنوات)",val:60},
  {label:"72 شهر (6 سنوات)",val:72},{label:"84 شهر (7 سنوات)",val:84},
];

function ConvertToAssetModalCD({
  opId, invoiceIndex, invNum, vendor, desc, amount, preTaxHalalas, branch, branchId, date, onClose, onSuccess,
}:{
  opId:string; invoiceIndex:number; invNum:string; vendor:string; desc:string;
  amount:number; preTaxHalalas?:number; branch:string; branchId?:string; date:string;
  onClose:()=>void; onSuccess:(draftId:string)=>void;
}) {
  const { addDraft } = useContext(CAssetDraftContext);
  const { data: categories = [] } = useAssetCategories();
  const catOptions = categories.length>0 ? categories : ASSET_CATS_CD.map(c=>({ key:c, labelAr:c } as { key:string; labelAr?:string }));
  const [step,       setStep]      = useState<1|2>(1);
  const [assetName,  setAssetName] = useState(vendor||desc);
  const [cat,        setCat]       = useState<string>(catOptions[0]?.key ?? "other");
  const [usefulLife, setUseful]    = useState(60);
  const [qty,        setQty]       = useState(1);
  const [custodian,  setCustodian] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState<string|null>(null);

  // Draft value is the invoice's PRE-TAX amount (VAT is not capitalised).
  const amtBeforeVat = preTaxHalalas != null ? Math.round(preTaxHalalas/100) : Math.round(amount/1.15);
  const draftId = `cd-draft-${opId}-${invoiceIndex}`;
  const canConfirm = assetName.trim().length>0 && custodian.trim().length>0 && qty>=1 && Boolean(branchId) && !submitting;

  const handleConfirm = async () => {
    if (!canConfirm || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const catLabel = catOptions.find(c=>c.key===cat)?.labelAr;
      await addDraft({ draftId, invNum, vendor, desc, amount:amtBeforeVat, branch, date, expOpId:opId, invoiceIndex,
        assetName, category:cat, categoryLabelAr:catLabel, usefulLife, qty, custodian,
        targetBranches: branchId ? [branchId] : [], status:"draft" });
      onSuccess(draftId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "فشل تحويل المصروف إلى أصل ثابت");
    } finally {
      setSubmitting(false);
    }
  };

  const { t, dir } = useCLang();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir={dir}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-l from-purple-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <GitMerge size={18}/>
            <div>
              <p className="font-bold text-sm">تحويل مصروف إلى أصل ثابت</p>
              <p className="text-white/70 text-[11px]">الخطوة {step} من 2</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={18}/></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-purple-700">{invNum}</span>
              <span className="font-mono font-bold text-emerald-700">{fmt(amtBeforeVat)} ر.س <span className="text-gray-400 font-normal">(قبل الضريبة)</span></span>
            </div>
            <p className="text-xs text-gray-600 mt-1">{vendor} · {desc}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{branch} · {date}</p>
          </div>
          {step===1 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">اسم الأصل *</label>
                <input value={assetName} onChange={e=>setAssetName(e.target.value)}
                  className="w-full text-sm border border-purple-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400" dir={dir}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">فئة الأصل *</label>
                <div className="grid grid-cols-2 gap-2">
                  {catOptions.map(c=>(
                    <button key={c.key} onClick={()=>setCat(c.key)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-right ${cat===c.key?"bg-purple-600 text-white border-purple-600":"border-gray-200 text-gray-600 hover:border-purple-300"}`}>
                      {c.labelAr ?? c.key}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">العهدة (المسؤول) *</label>
                  <input value={custodian} onChange={e=>setCustodian(e.target.value)} placeholder="اسم المسؤول"
                    className="w-full text-sm border border-purple-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400" dir={dir}/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">الكمية *</label>
                  <input type="number" min={1} value={qty} onChange={e=>setQty(Math.max(1,+e.target.value||1))}
                    className="w-full text-sm border border-purple-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400"/>
                </div>
              </div>
              {!branchId && <p className="text-[10px] text-red-500">⚠ لا يمكن تحديد فرع الأصل — تعذّر التحويل.</p>}
            </div>
          )}
          {step===2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("العمر الإنتاجي (شهراً) — لا يُستخدم لحساب إهلاك","Useful Life (months) — not used for depreciation")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {USEFUL_LIFE_CD.map(o=>(
                    <button key={o.val} onClick={()=>setUseful(o.val)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-right ${usefulLife===o.val?"bg-purple-600 text-white border-purple-600":"border-gray-200 text-gray-600 hover:border-purple-300"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">اسم الأصل</span><span className="font-semibold text-gray-800">{assetName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الفئة</span><span className="font-semibold text-gray-800">{catOptions.find(c=>c.key===cat)?.labelAr ?? cat}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">القيمة (قبل الضريبة)</span><span className="font-mono font-bold text-purple-700">{fmt(amtBeforeVat)} ر.س</span></div>
                <div className="flex justify-between"><span className="text-gray-500">العهدة</span><span className="font-semibold text-gray-800">{custodian||"—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الكمية</span><span className="font-semibold text-gray-800">{qty}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الفرع</span><span className="font-semibold text-gray-800">{branch}</span></div>
              </div>
            </div>
          )}
          {errorMsg && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold">
              {errorMsg}
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-2 justify-end">
          {step===2 && <Btn onClick={()=>setStep(1)}>{t("→ السابق","← Back")}</Btn>}
          <Btn onClick={onClose}>{t("إلغاء","Cancel")}</Btn>
          {step===1
            ? <Btn variant="primary" onClick={()=>setStep(2)} disabled={!assetName.trim()||!custodian.trim()||!branchId}>{t("التالي ←","Next →")}</Btn>
            : <Btn variant="primary" onClick={handleConfirm} disabled={!canConfirm}><GitMerge size={13}/> {t("تأكيد التحويل","Confirm Transfer")}</Btn>
          }
        </div>
      </div>
    </div>
  );
}

const STATUS_CFG:Record<COpStatus,{label:string;cls:string;short:string}> = {
  "pending":       { label:"قيد المراجعة",    cls:"bg-amber-50 text-amber-700 border border-amber-200",       short:"معلق"     },
  "approved":      { label:"تمت الموافقة",    cls:"bg-emerald-50 text-emerald-700 border border-emerald-200", short:"مقبول"    },
  "rejected":      { label:"مرفوض",           cls:"bg-red-50 text-red-700 border border-red-200",             short:"مرفوض"    },
  "final-approved":{ label:"معتمد نهائياً",   cls:"bg-purple-50 text-purple-700 border border-purple-200",    short:"نهائي"    },
};
const EN_STATUS_CD:Record<COpStatus,{label:string;short:string}> = {
  "pending":       { label:"Under Review",     short:"Pending"  },
  "approved":      { label:"Approved",         short:"Approved" },
  "rejected":      { label:"Rejected",         short:"Rejected" },
  "final-approved":{ label:"Final Approved",   short:"Final"    },
};

const MATCH_CFG:Record<CMatch,{label:string;cls:string;dot:string}> = {
  exact:  { label:"متطابق",         cls:"bg-emerald-50 text-emerald-700 border border-emerald-200", dot:"bg-emerald-500" },
  review: { label:"يحتاج مراجعة",  cls:"bg-amber-50 text-amber-700 border border-amber-200",       dot:"bg-amber-500"   },
  diff:   { label:"فرق في الكمية", cls:"bg-red-50 text-red-700 border border-red-200",              dot:"bg-red-500"     },
};
const EN_MATCH_CD:Record<CMatch,string> = {
  exact:"Exact Match", review:"Needs Review", diff:"Qty Difference",
};
const EN_PIPELINE_CD:Record<string,{label:string;labelShort:string}> = {
  submit:  { label:"Uploaded from Branch",   labelShort:"Upload"   },
  review:  { label:"Under Review",           labelShort:"Review"   },
  approved:{ label:"Accountant Approved",    labelShort:"Approved" },
  final:   { label:"Final Approved",         labelShort:"Final"    },
  erp:     { label:"Posted to ERP",          labelShort:"ERP"      },
  reports: { label:"ERP Reports (Read)",     labelShort:"Reports"  },
};

// ═══════════════════════════════════════════════════
// PIPELINE — 6 مراحل دورة حياة العملية (مطابق للداشبورد الرئيسي)
// الفرع → المراجعة → موافقة المحاسب → اعتماد رئيس الحسابات → ERP → تقارير
// ═══════════════════════════════════════════════════
const C_PIPELINE_STAGES = [
  { id:"submit",   icon:"📱", label:"رُفع من الفرع",     labelShort:"الرفع",     bg:"bg-blue-100",    text:"text-blue-700",    border:"border-blue-300",    fill:"bg-blue-500"    },
  { id:"review",   icon:"🔍", label:"قيد المراجعة",       labelShort:"المراجعة",  bg:"bg-amber-100",   text:"text-amber-700",   border:"border-amber-300",   fill:"bg-amber-500"   },
  { id:"approved", icon:"✓",  label:"موافق عليه",         labelShort:"الموافقة",  bg:"bg-sky-100",     text:"text-sky-700",     border:"border-sky-300",     fill:"bg-sky-500"     },
  { id:"final",    icon:"🔒", label:"معتمد نهائياً",      labelShort:"الاعتماد",  bg:"bg-emerald-100", text:"text-emerald-700", border:"border-emerald-300", fill:"bg-emerald-500" },
  { id:"erp",      icon:"🔗", label:"مُرحَّل لـ ERP",     labelShort:"ERP",       bg:"bg-indigo-100",  text:"text-indigo-700",  border:"border-indigo-300",  fill:"bg-indigo-500"  },
  { id:"reports",  icon:"📊", label:"تقارير ERP (قراءة)", labelShort:"التقارير",  bg:"bg-slate-100",   text:"text-slate-700",   border:"border-slate-300",   fill:"bg-slate-500"   },
] as const;

function getCOpPipelineStage(op: COp): number {
  if (op.status === "rejected") return -1;
  if (op.status === "final-approved") return 3;
  if (op.status === "approved") return 2;
  return 1;
}

function COpStagePill({ op }: { op: COp }) {
  const { t } = useCLang();
  if (op.status === "rejected") {
    return <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px]">✕ {t("مرفوض","Rejected")}</Badge>;
  }
  const idx = getCOpPipelineStage(op);
  const s = C_PIPELINE_STAGES[idx];
  const labelShort = t(s.labelShort, EN_PIPELINE_CD[s.id]?.labelShort || s.labelShort);
  return (
    <Badge className={`${s.bg} ${s.text} border ${s.border} text-[10px] font-semibold`}>
      {s.icon} {t("م","S")}{idx+1} · {labelShort}
    </Badge>
  );
}

function CPipelineBar({ op }: { op: COp }) {
  const { t, dir } = useCLang();
  const stage = getCOpPipelineStage(op);
  const isRejected = op.status === "rejected";
  const curStage = C_PIPELINE_STAGES[stage];
  const curLabel = curStage ? t(curStage.label, EN_PIPELINE_CD[curStage.id]?.label || curStage.label) : "";
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4" dir={dir}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("دورة حياة العملية","Operation Lifecycle")}</span>
        {isRejected
          ? <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">✕ {t("مرفوض","Rejected")}</Badge>
          : <Badge className={`${curStage?.bg} ${curStage?.text} border ${curStage?.border} text-xs font-bold`}>
              {t("المرحلة","Stage")} {stage+1}/6 · {curLabel}
            </Badge>
        }
      </div>
      <div className="flex items-center gap-0">
        {C_PIPELINE_STAGES.map((s, i) => {
          const isComplete = !isRejected && i < stage;
          const isCurrent  = !isRejected && i === stage;
          const sLabel = t(s.labelShort, EN_PIPELINE_CD[s.id]?.labelShort || s.labelShort);
          return (
            <div key={s.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-all
                  ${isComplete ? `${s.fill} border-transparent text-white` :
                    isCurrent  ? `bg-white ${s.border} ${s.text} shadow-sm font-bold` :
                                 "bg-gray-50 border-gray-200 text-gray-300"}`}>
                  {isComplete ? "✓" : s.icon}
                </div>
                <span className={`text-[9px] font-medium leading-tight text-center max-w-[44px] truncate
                  ${isComplete ? "text-gray-600" : isCurrent ? `${s.text} font-bold` : "text-gray-300"}`}>
                  {sLabel}
                </span>
              </div>
              {i < C_PIPELINE_STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mt-[-10px]`}
                  style={{ backgroundColor: (!isRejected && isComplete) ? "" : "#e5e7eb",
                           background: (!isRejected && isComplete) ? `linear-gradient(90deg,${s.fill.replace("bg-","")},${s.fill.replace("bg-","")})` : undefined }}
                  >
                  {(!isRejected && isComplete) && <div className={`h-0.5 ${s.fill}`}/>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CPipelineOverview({ ops }: { ops: COp[] }) {
  const { t, dir } = useCLang();
  const { data: overview } = usePipelineOverview();
  // Map live company-wide stage counts (T03 §10) onto the 6 UI columns; the
  // "reports" column is a future stage with no API counterpart (stays "—").
  const liveByKey: Record<string, number> = {};
  overview?.stages?.forEach(s => { liveByKey[s.key] = s.count; });
  const STAGE_API_KEY: Record<string, string> = {
    submit: "submitted", review: "pending", approved: "approved",
    final: "final-approved", erp: "erp-posted",
  };
  const stageCounts = C_PIPELINE_STAGES.map((s, i) => {
    const apiKey = STAGE_API_KEY[s.id];
    const liveCount = apiKey != null ? liveByKey[apiKey] : undefined;
    return {
      ...s,
      count: liveCount ?? ops.filter(o => getCOpPipelineStage(o) === i).length,
      labelShortTr: t(s.labelShort, EN_PIPELINE_CD[s.id]?.labelShort || s.labelShort),
    };
  });
  const rejected = liveByKey["rejected"] ?? ops.filter(o => o.status === "rejected").length;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" dir={dir}>
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm tracking-tight">{t("مسار العمليات — رؤية شاملة للخط الزمني","Operations Pipeline — Full Timeline View")}</h3>
        <div className="flex items-center gap-2">
          {rejected>0 && <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px]">✕ {rejected} {t("مرفوض","Rejected")}</Badge>}
          <span className="text-xs text-gray-400">{ops.length} {t("عملية إجمالاً","total operations")}</span>
        </div>
      </div>
      <div className="grid grid-cols-6 divide-x divide-x-reverse divide-gray-100">
        {stageCounts.map((s, i) => {
          const isAspirational = i === 5;
          return (
            <div key={s.id} className={`px-3 py-4 text-center transition-colors ${isAspirational ? "bg-slate-50/60" : "hover:bg-gray-50/80"}`}>
              <div className="text-lg mb-1">{s.icon}</div>
              {isAspirational ? (
                <>
                  <p className="text-[10px] font-bold text-slate-400 font-mono">—</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{s.labelShortTr}</p>
                  <p className="text-[8px] text-slate-300 mt-1 leading-tight">{t("مرحلة مستقبلية","Future Stage")}</p>
                </>
              ) : (
                <>
                  <p className={`text-2xl font-extrabold font-mono ${s.count > 0 ? s.text : "text-gray-200"}`}>{s.count}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.labelShortTr}</p>
                  {i < 4 && (
                    <div className={`mx-auto mt-2 h-1 w-6 rounded-full ${s.count > 0 ? s.fill : "bg-gray-100"}`}/>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const INITIAL_OPS:COp[] = [
  // Sales
  { id:"O-2401",branch:"فرع العليا",   brandName:"برغر التاج",      brandColor:"#E53E3E",module:"sales",   moduleLabel:"مبيعات",  amount:18340,timeAgo:"قبل ساعة",   status:"pending",       attachments:3,match:"exact",  submittedBy:"فاطمة السالم", date:"21 مارس",refNum:"SL-2401",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:4200,  actual:4200  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:8500,  actual:8500  },
      { name:"طلبات",          icon:"🔴", pos:980,   actual:980   },
      { name:"هنقرستيشن",      icon:"🟠", pos:2800,  actual:2800  },
      { name:"جاهز",           icon:"🟡", pos:1200,  actual:1200  },
      { name:"نينجا",          icon:"⚫", pos:660,   actual:660   },
    ]},
  { id:"O-2400",branch:"فرع الحمراء", brandName:"برغر التاج",       brandColor:"#E53E3E",module:"sales",   moduleLabel:"مبيعات",  amount:22100,timeAgo:"قبل 2 ساعة",status:"pending",       attachments:2,match:"review", submittedBy:"خالد العتيبي",  date:"21 مارس",refNum:"SL-2400", diff:"فارق بسيط في الكاش",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:5200,  actual:4850  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:9800,  actual:9800  },
      { name:"طلبات",          icon:"🔴", pos:1400,  actual:1400  },
      { name:"هنقرستيشن",      icon:"🟠", pos:3800,  actual:3800  },
      { name:"جاهز",           icon:"🟡", pos:1650,  actual:1650  },
      { name:"نينجا",          icon:"⚫", pos:600,   actual:600   },
    ]},
  { id:"O-2399",branch:"فرع الملقا",  brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"sales",   moduleLabel:"مبيعات",  amount:15820,timeAgo:"قبل 4 ساعات",status:"pending",       attachments:1,match:"exact",  submittedBy:"أحمد الحربي",  date:"21 مارس",refNum:"SL-2399",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:3400,  actual:3400  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:6200,  actual:6200  },
      { name:"طلبات",          icon:"🔴", pos:1800,  actual:1800  },
      { name:"هنقرستيشن",      icon:"🟠", pos:2420,  actual:2420  },
      { name:"جاهز",           icon:"🟡", pos:1300,  actual:1300  },
      { name:"نينجا",          icon:"⚫", pos:700,   actual:700   },
    ]},
  { id:"O-2398",branch:"فرع الورود",  brandName:"مطعم التاج الراقي",brandColor:"#805AD5",module:"sales",   moduleLabel:"مبيعات",  amount:31500,timeAgo:"قبل 5 ساعات",status:"pending",       attachments:3,match:"diff",   submittedBy:"منى الزهراني", date:"21 مارس",refNum:"SL-2398", diff:"الكاش يختلف بـ 350 ر.س",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:7500,  actual:7150  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:12000, actual:12000 },
      { name:"طلبات",          icon:"🔴", pos:3200,  actual:3200  },
      { name:"هنقرستيشن",      icon:"🟠", pos:4800,  actual:4800  },
      { name:"جاهز",           icon:"🟡", pos:2500,  actual:2500  },
      { name:"نينجا",          icon:"⚫", pos:1500,  actual:1500  },
    ]},
  { id:"O-2397",branch:"فرع الكورنيش",brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"sales",   moduleLabel:"مبيعات",  amount:12400,timeAgo:"أمس",         status:"approved",      attachments:2,match:"exact",  submittedBy:"عبدالله الدوسري",date:"20 مارس",refNum:"SL-2397",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:2800,  actual:2800  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:5200,  actual:5200  },
      { name:"طلبات",          icon:"🔴", pos:1100,  actual:1100  },
      { name:"هنقرستيشن",      icon:"🟠", pos:1800,  actual:1800  },
      { name:"جاهز",           icon:"🟡", pos:900,   actual:900   },
      { name:"نينجا",          icon:"⚫", pos:600,   actual:600   },
    ]},
  { id:"O-2396",branch:"فرع الملك فهد",brandName:"مطعم التاج الراقي",brandColor:"#805AD5",module:"sales",  moduleLabel:"مبيعات",  amount:28900,timeAgo:"أمس",         status:"final-approved",attachments:3,match:"exact",  submittedBy:"وليد السبيعي", date:"20 مارس",refNum:"SL-2396",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:6500,  actual:6500  },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:11000, actual:11000 },
      { name:"طلبات",          icon:"🔴", pos:2800,  actual:2800  },
      { name:"هنقرستيشن",      icon:"🟠", pos:4800,  actual:4800  },
      { name:"جاهز",           icon:"🟡", pos:2200,  actual:2200  },
      { name:"نينجا",          icon:"⚫", pos:1600,  actual:1600  },
    ]},
  { id:"O-2395",branch:"فرع النزهة",  brandName:"برغر التاج",       brandColor:"#E53E3E",module:"sales",   moduleLabel:"مبيعات",  amount:9800, timeAgo:"قبل يومين", status:"rejected",       attachments:1,match:"diff",   submittedBy:"سامي الغامدي", date:"19 مارس",refNum:"SL-2395", diff:"فاتورة الكاشير مفقودة",
    channels:[
      { name:"كاشير (POS)",    icon:"🖥️", pos:0,     actual:0     },
      { name:"نقل بنكي (Mada)",icon:"💳", pos:4200,  actual:4200  },
      { name:"طلبات",          icon:"🔴", pos:1800,  actual:1800  },
      { name:"هنقرستيشن",      icon:"🟠", pos:2200,  actual:2200  },
      { name:"جاهز",           icon:"🟡", pos:1100,  actual:1100  },
      { name:"نينجا",          icon:"⚫", pos:500,   actual:500   },
    ]},
  // Expenses
  { id:"E-1201",branch:"فرع العليا",  brandName:"برغر التاج",       brandColor:"#E53E3E",module:"expenses",moduleLabel:"مصروفات", amount:4850, timeAgo:"قبل 3 ساعات",status:"pending",       attachments:3,match:"review", submittedBy:"فاطمة السالم", date:"21 مارس",refNum:"EX-1201",
    invoices:[
      { invNum:"INV-881",vendor:"شركة الخليج للمواد",  desc:"مواد تنظيف وصيانة", amount:1200,date:"21 مارس",verified:false },
      { invNum:"INV-882",vendor:"مستلزمات المطبخ",     desc:"أدوات خدمة وتغليف", amount:850, date:"21 مارس",verified:false },
      { invNum:"INV-883",vendor:"خدمات الصيانة السريعة",desc:"إصلاح ثلاجة",       amount:2800,date:"21 مارس",verified:false },
    ]},
  { id:"E-1200",branch:"فرع الحمراء", brandName:"برغر التاج",       brandColor:"#E53E3E",module:"expenses",moduleLabel:"مصروفات", amount:2100, timeAgo:"قبل 5 ساعات",status:"pending",       attachments:2,match:"exact",  submittedBy:"خالد العتيبي", date:"21 مارس",refNum:"EX-1200",
    invoices:[
      { invNum:"INV-871",vendor:"شركة الوقود",   desc:"وقود توصيل",  amount:900, date:"21 مارس",verified:false },
      { invNum:"INV-872",vendor:"مكيفات المنطقة",desc:"صيانة مكيف",  amount:1200,date:"21 مارس",verified:false },
    ]},
  { id:"E-1199",branch:"فرع الورود",  brandName:"مطعم التاج الراقي",brandColor:"#805AD5",module:"expenses",moduleLabel:"مصروفات", amount:6200, timeAgo:"أمس",         status:"approved",      attachments:4,match:"exact",  submittedBy:"منى الزهراني", date:"20 مارس",refNum:"EX-1199",
    invoices:[
      { invNum:"INV-861",vendor:"شركة الديكور",  desc:"ديكور مطعم",  amount:3500,date:"20 مارس",verified:true  },
      { invNum:"INV-862",vendor:"مكتب الخدمات", desc:"نظافة شهرية", amount:2700,date:"20 مارس",verified:true  },
    ]},
  { id:"E-1198",branch:"فرع الملقا",  brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"expenses",moduleLabel:"مصروفات", amount:3400, timeAgo:"قبل يومين",status:"rejected",       attachments:2,match:"diff",   submittedBy:"أحمد الحربي",  date:"19 مارس",refNum:"EX-1198", diff:"فاتورة غير مختومة",
    invoices:[
      { invNum:"INV-851",vendor:"مستلزمات الطباعة",desc:"مطبوعات قوائم",amount:1400,date:"19 مارس",verified:false },
      { invNum:"INV-852",vendor:"خدمات النظافة",   desc:"تنظيف أسبوعي", amount:2000,date:"19 مارس",verified:false },
    ]},
  // Purchases
  { id:"P-0801",branch:"فرع الملقا",  brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"purchases",moduleLabel:"مشتريات",amount:8200, timeAgo:"قبل 2 ساعة", status:"pending",       attachments:4,match:"diff",   submittedBy:"أحمد الحربي",  date:"21 مارس",refNum:"PO-0801", diff:"فرق كمية 5 كجم جبن",
    purchaseItems:[
      { item:"عجينة البيتزا",   unit:"كجم",  ordQty:60, rcvQty:60, unitPrice:28 },
      { item:"جبنة موزاريلا",   unit:"كجم",  ordQty:30, rcvQty:25, unitPrice:85 },
      { item:"صوص الطماطم",    unit:"كجم",  ordQty:20, rcvQty:20, unitPrice:32 },
      { item:"دجاج مشوي",      unit:"كجم",  ordQty:40, rcvQty:40, unitPrice:48 },
    ]},
  { id:"P-0800",branch:"فرع الكورنيش",brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"purchases",moduleLabel:"مشتريات",amount:5600, timeAgo:"قبل 6 ساعات",status:"pending",       attachments:2,match:"exact",  submittedBy:"عبدالله الدوسري",date:"21 مارس",refNum:"PO-0800",
    purchaseItems:[
      { item:"دجاج طازج",      unit:"كجم",  ordQty:80, rcvQty:80, unitPrice:38 },
      { item:"بطاطس",          unit:"كجم",  ordQty:60, rcvQty:60, unitPrice:18 },
      { item:"زيت قلي",        unit:"لتر",  ordQty:30, rcvQty:30, unitPrice:22 },
    ]},
  { id:"P-0799",branch:"فرع المحطة",  brandName:"مطعم التاج الراقي",brandColor:"#805AD5",module:"purchases",moduleLabel:"مشتريات",amount:3900, timeAgo:"أمس",         status:"approved",      attachments:3,match:"review", submittedBy:"سلطان العمري", date:"20 مارس",refNum:"PO-0799",
    purchaseItems:[
      { item:"أرز بسمتي",      unit:"كجم",  ordQty:50, rcvQty:45, unitPrice:32 },
      { item:"لحم ضأن",        unit:"كجم",  ordQty:30, rcvQty:30, unitPrice:65 },
      { item:"بهارات مشكلة",   unit:"كجم",  ordQty:10, rcvQty:10, unitPrice:90 },
    ]},
  // Inventory
  { id:"I-0601",branch:"فرع العليا",  brandName:"برغر التاج",       brandColor:"#E53E3E",module:"inventory",moduleLabel:"مخزون",  amount:0,    timeAgo:"قبل ساعة",   status:"pending",       attachments:1,match:"review", submittedBy:"فاطمة السالم", date:"21 مارس",refNum:"INV-0601" },
  { id:"I-0600",branch:"فرع الملقا",  brandName:"بيتزا التاج",      brandColor:"#2B6CB0",module:"inventory",moduleLabel:"مخزون",  amount:0,    timeAgo:"قبل 3 ساعات",status:"pending",       attachments:1,match:"diff",   submittedBy:"أحمد الحربي",  date:"21 مارس",refNum:"INV-0600", diff:"فرق 12 كجم لحم" },
  { id:"I-0599",branch:"فرع الورود",  brandName:"مطعم التاج الراقي",brandColor:"#805AD5",module:"inventory",moduleLabel:"مخزون",  amount:0,    timeAgo:"أمس",         status:"approved",      attachments:1,match:"exact",  submittedBy:"منى الزهراني", date:"20 مارس",refNum:"INV-0599" },
];

// HA-F13: Inventory branch static mocks removed. Live payload or clear unavailable status is rendered.
const INV_BRANCH_DATA: Record<string,{ name:string; unit:string; prev:number; curr:number; cat:string }[]> = {};

type CRole = "company-admin"|"head"|"accountant"|"branch"|"procurement";

type NavEntry = { section:string }|{ id:string; label:string; icon:ReactNode; badge?:number };
const isSection = (e:NavEntry): e is {section:string} => "section" in e;

const NAV:Record<CRole,NavEntry[]> = {
  "company-admin":[
    { section:"لوحة التحكم" },
    { id:"ca-dashboard",    label:"الرئيسية",           icon:<LayoutDashboard size={16}/> },
    { id:"ca-subscription", label:"الاشتراك والخطة",    icon:<CreditCard size={16}/>      },
    { id:"ca-users",        label:"إدارة المستخدمين",   icon:<Users size={16}/>           },
    { id:"ca-branches",     label:"العلامات والفروع",   icon:<Building2 size={16}/>       },
    { id:"ca-modules",      label:"الوحدات النشطة",     icon:<Package size={16}/>         },
    { section:"المالية" },
    { id:"ca-billing",      label:"الفواتير والمدفوعات",icon:<Wallet size={16}/>          },
    { section:"الإعدادات" },
    { id:"ca-settings",     label:"إعدادات الشركة",     icon:<Settings size={16}/>        },
    { id:"ca-support",      label:"الدعم الفني",        icon:<Bell size={16}/>            },
  ],
  head:[
    { section:"الرئيسية" },
    { id:"head-dashboard",  label:"لوحة التحكم",        icon:<LayoutDashboard size={16}/> },
    { section:"الاعتماد" },
    { id:"head-pending",    label:"بانتظار الاعتماد",   icon:<Clock size={16}/> },
    { id:"head-approved",   label:"المعتمدة نهائياً",   icon:<CheckCircle2 size={16}/>    },
    { id:"head-rejected",   label:"المرفوضة",            icon:<XCircle size={16}/>         },
    { section:"الموديولات" },
    { id:"head-sales",      label:"المبيعات",            icon:<TrendingUp size={16}/>      },
    { id:"head-expenses",   label:"المصروفات",           icon:<Wallet size={16}/>          },
    { id:"head-purchases",  label:"المشتريات",           icon:<ShoppingCart size={16}/>    },
    { id:"head-inventory",  label:"المخزون",             icon:<Package size={16}/>         },
    { id:"head-waste",      label:"الهدر والتالف",      icon:<AlertTriangle size={16}/>   },
    { id:"head-assets",     label:"الأصول الثابتة",     icon:<Building2 size={16}/>       },
    { id:"head-shifts",     label:"الشفتات",             icon:<Clock size={16}/>           },
    { id:"head-employees",  label:"كشف حساب الموظفين",  icon:<Users size={16}/>           },
    { id:"head-cash",       label:"العهد النقدية",       icon:<ArrowLeftRight size={16}/>  },
    { section:"التقارير" },
    { id:"head-reminders",  label:"التذكيرات",           icon:<Bell size={16}/>, badge:3   },
    { id:"head-accountants",label:"أداء المحاسبين",      icon:<Users size={16}/>           },
    { id:"head-erp",        label:"التصدير لـ ERP",      icon:<Zap size={16}/>             },
    { id:"head-reports",    label:"التقارير المالية",    icon:<FileText size={16}/>        },
  ],
  accountant:[
    { section:"الرئيسية" },
    { id:"acc-dashboard",  label:"لوحة التحكم",         icon:<LayoutDashboard size={16}/> },
    { id:"acc-reminders",  label:"التذكيرات",            icon:<Bell size={16}/>, badge:3   },
    { section:"الوحدات" },
    { id:"acc-sales",      label:"المبيعات",             icon:<TrendingUp size={16}/>      },
    { id:"acc-expenses",   label:"المصروفات",            icon:<Wallet size={16}/>          },
    { id:"acc-purchases",  label:"المشتريات",            icon:<ShoppingCart size={16}/>    },
    { id:"acc-inventory",  label:"المخزون",              icon:<Package size={16}/>         },
    { id:"acc-waste",      label:"الهدر والتالف",        icon:<AlertTriangle size={16}/>   },
    { id:"acc-assets",     label:"الأصول الثابتة",      icon:<Building2 size={16}/>       },
    { id:"acc-shifts",     label:"إدارة الشفتات",        icon:<Clock size={16}/>           },
    { id:"acc-employees",  label:"كشف حساب الموظفين",   icon:<Users size={16}/>           },
    { id:"acc-cash",       label:"إدارة العهد النقدية",  icon:<ArrowLeftRight size={16}/>  },
    { section:"التقارير" },
    { id:"acc-reports",    label:"التقارير",             icon:<BarChart3 size={16}/>       },
  ],
  branch:[
    { section:"الرئيسية" },
    { id:"branch-overview",   label:"نظرة عامة",         icon:<LayoutDashboard size={16}/> },
    { section:"إدارة البيانات" },
    { id:"branch-upload",     label:"رفع البيانات",      icon:<Upload size={16}/>          },
    { id:"branch-shifts",     label:"شفتات الفرع",        icon:<Clock size={16}/>           },
    { id:"branch-requests",   label:"طلبات الشراء",      icon:<ShoppingCart size={16}/>   },
    { id:"branch-employees",  label:"الموظفون",           icon:<Users size={16}/>           },
    { id:"branch-items",      label:"الأصناف",            icon:<Package size={16}/>         },
    { id:"branch-suppliers",  label:"الموردون",           icon:<Building2 size={16}/>       },
    { section:"الإعدادات" },
    { id:"branch-settings",   label:"إعدادات الفرع",     icon:<Settings size={16}/>        },
  ],
  procurement:[
    { section:"الرئيسية" },
    { id:"proc-overview",  label:"لوحة التحكم",          icon:<LayoutDashboard size={16}/> },
    { section:"الطلبات" },
    { id:"proc-new",       label:"الطلبات الجديدة",      icon:<ShoppingCart size={16}/>, badge:45 },
    { id:"proc-grouped",   label:"الطلبات المجمعة",      icon:<Package size={16}/>         },
    { id:"proc-sent",      label:"المرسلة للموردين",     icon:<Send size={16}/>            },
    { section:"الإدارة" },
    { id:"proc-items",     label:"الأصناف",              icon:<Package size={16}/>         },
    { id:"proc-suppliers", label:"الموردون",              icon:<Building2 size={16}/>       },
    { id:"proc-reports",   label:"التقارير",             icon:<BarChart3 size={16}/>       },
  ],
};

const ROLE_META:Record<CRole,{ label:string; icon:string; color:string; desc:string }> = {
  "company-admin":{ label:"أدمن الشركة",    icon:"🏢", color:"bg-purple-600", desc:"إدارة الاشتراك والمستخدمين" },
  head:           { label:"رئيس الحسابات", icon:"👑", color:"bg-blue-600",   desc:"الإشراف والاعتماد النهائي" },
  accountant:     { label:"محاسب",          icon:"📊", color:"bg-cyan-600",   desc:"مراجعة العمليات المالية" },
  branch:         { label:"مدير فرع",       icon:"🏪", color:"bg-emerald-600",desc:"رفع بيانات الفرع اليومية" },
  procurement:    { label:"مدير مشتريات",  icon:"🛒", color:"bg-amber-600",  desc:"أوامر الشراء والموردون" },
};

const DEFAULT_PAGE:Record<CRole,string> = {
  "company-admin":"ca-dashboard", head:"head-dashboard",
  accountant:"acc-dashboard", branch:"branch-overview", procurement:"proc-overview",
};

// ═══════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════
const C_ROLE_ACCENT: Record<CRole, string> = {
  "company-admin": V[700],
  head: "#3b82f6",
  accountant: CYAN,
  branch: "#10b981",
  procurement: "#f59e0b",
};
function CompanyLoginScreen({ onSelect }:{ onSelect:(r:CRole)=>void }) {
  const { lang, setLang, t } = useCLang();
  ensureAuthStyles();
  return (
    <div className="asab-landing" dir={lang==="ar"?"rtl":"ltr"} style={{ direction: lang==="ar"?"rtl":"ltr" }}>
      <div className="asab-blob asab-blob--a" style={{ width:340, height:340, background:V[300], opacity:0.3, top:-120, insetInlineStart:-80 }} />
      <div className="asab-blob asab-blob--b" style={{ width:320, height:320, background:CYAN, opacity:0.12, bottom:-120, insetInlineEnd:-60 }} />

      {/* Top bar: logo + language */}
      <header style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 28px", borderBottom:`1px solid ${G[200]}`, background:"rgba(255,255,255,0.75)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)" }}>
        <AsabLogo variant="header" />
        <LangToggle lang={lang} onChange={setLang} variant="light" />
      </header>

      {/* Main — role picker */}
      <main style={{ position:"relative", flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"44px 24px" }}>
        <div className="asab-rise" style={{ textAlign:"center", marginBottom:30 }}>
          <h1 style={{ fontSize:27, fontWeight:800, color:G[900], margin:0, letterSpacing:"-0.01em" }}>{t("بوابة الشركات","Enterprise Portal")}</h1>
          <p style={{ fontSize:14, color:G[500], margin:"8px 0 0" }}>{t("اختر المستخدم للمتابعة — كل دور بصلاحياته وشاشاته","Choose a user to continue — each role has its own permissions and screens")}</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16, width:"100%", maxWidth:720 }}>
          {(Object.entries(ROLE_META) as [CRole, typeof ROLE_META[CRole]][]).map(([id,meta], i)=>{
            const enMeta = EN_C_ROLE_META[id as CRoleKey];
            const accent = C_ROLE_ACCENT[id] ?? V[600];
            return (
              <button
                key={id}
                type="button"
                className="asab-role asab-rise"
                style={{ animationDelay:`${i*60}ms`, textAlign:"center" }}
                onClick={()=>onSelect(id)}
                onMouseEnter={(e)=>{ e.currentTarget.style.borderColor = accent; }}
                onMouseLeave={(e)=>{ e.currentTarget.style.borderColor = G[200]; }}
              >
                <div style={{ width:52, height:52, borderRadius:14, margin:"0 auto 12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, background:`${accent}14`, border:`1px solid ${accent}33` }}>{meta.icon}</div>
                <div style={{ color:G[900], fontWeight:700, fontSize:15, marginBottom:4 }}>{t(meta.label, enMeta.label)}</div>
                <div style={{ color:G[500], fontSize:12, lineHeight:1.6, minHeight:30 }}>{t(meta.desc, enMeta.desc)}</div>
                {id==="company-admin" && (
                  <span style={{ display:"inline-block", marginTop:10, padding:"3px 12px", borderRadius:99, fontSize:10.5, fontWeight:700, background:`${accent}14`, color:accent, border:`1px solid ${accent}33` }}>{t("مميز","Premium")}</span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      <footer style={{ position:"relative", textAlign:"center", padding:"16px 24px 28px", borderTop:`1px solid ${G[200]}` }}>
        <p style={{ fontSize:12, color:G[400], margin:0 }}>{t("عصب ASAB · الإدارة المالية لمجموعات المطاعم · النسخة التجريبية 2.0","ASAB · Financial management for restaurant groups · Beta 2.0")}</p>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════
// Notifications come from the platform API; empty until the backend returns them (no static seed).
const SHELL_NOTIFICATIONS: { id:number; title:string; body:string; time:string; icon:string; unread:boolean }[] = [];
function Shell({ role, page, navigate, onLogout, children, headPendingCount=0, allowedRoles, onSelectRole }:{
  role:CRole; page:string; navigate:(p:string)=>void; onLogout:()=>void; children:ReactNode; headPendingCount?:number;
  allowedRoles:CRole[]; onSelectRole:(role:CRole)=>void;
}) {
  const { lang, setLang, t, dir } = useCLang();
  const meta = ROLE_META[role];
  const nav  = NAV[role];
  const enMeta = EN_C_ROLE_META[role as CRoleKey];
  const activeNavItem = nav.find(e=>"id" in e && (e as any).id===page) as any;
  const pageLabelAr = activeNavItem?.label || "";
  const pageLabelEn = activeNavItem ? (EN_C_NAV_LABELS[activeNavItem.id] || pageLabelAr) : "";
  const pageLabel = t(pageLabelAr, pageLabelEn);
  const [mobileOpen, setMobileOpen] = useState(false);
  const langPrefMut = useLanguagePref();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const prevMobileOpenRef = useRef(false);

  useEffect(() => {
    if (mobileOpen) {
      closeBtnRef.current?.focus();
    } else if (prevMobileOpenRef.current) {
      // Do not attempt to focus hamburger button if hidden on desktop breakpoint (>= 768px)
      const isDesktop = typeof window !== "undefined" && window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT_PX}px)`).matches;
      if (!isDesktop && menuBtnRef.current) {
        menuBtnRef.current.focus();
      }
    }
    prevMobileOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  // Close mobile drawer and release background inert when viewport scales up to desktop (md: 768px)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT_PX}px)`);
    const onBreakpoint = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches && mobileOpen) {
        setMobileOpen(false);
      }
    };
    if (mql.matches && mobileOpen) {
      setMobileOpen(false);
    }
    mql.addEventListener("change", onBreakpoint);
    return () => mql.removeEventListener("change", onBreakpoint);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileOpen(false);
        return;
      }

      if (e.key === "Tab") {
        const drawerEl = drawerRef.current;
        if (!drawerEl) return;

        const focusable = Array.from(
          drawerEl.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        const targetEl = trapDrawerFocus(focusable, document.activeElement, e.shiftKey);
        if (targetEl) {
          e.preventDefault();
          targetEl.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const handleNav = (p: string) => {
    navigate(p);
    setMobileOpen(false);
  };

  const renderSidebarContent = (isMobile = false) => (
    <>
      <div className="px-4 py-4 sm:py-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background:"linear-gradient(135deg,#7C3AED,#00D9FF)" }}>{COMPANY.logo}</div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{COMPANY.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-cyan-400 font-semibold">{t(PLAN_AR[COMPANY.plan]||COMPANY.plan, COMPANY.plan)}</span>
              {COMPANY.plan !== "—" && <span className="w-1 h-1 rounded-full bg-emerald-400"/>}
            </div>
          </div>
        </div>
        {isMobile && (
          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => setMobileOpen(false)}
            className="text-white/60 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label={t("إغلاق القائمة", "Close menu")}
          >
            <X size={20} />
          </button>
        )}
      </div>
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10">
          <span className="text-base">{meta.icon}</span>
          <div>
            <p className="text-white text-xs font-bold">{t(meta.label, enMeta.label)}</p>
            <p className="text-white/40 text-[10px]">{t("مجموعة التاج","Al-Taj Group")}</p>
          </div>
        </div>
      </div>
      {allowedRoles.length > 1 && (
        <div className="px-4 py-2 border-b border-white/10">
          <select
            aria-label={t("الدور الممنوح","Granted role")}
            value={role}
            onChange={e => { onSelectRole(e.target.value as CRole); setMobileOpen(false); }}
            className="w-full rounded-lg bg-white text-gray-800 text-xs px-2 py-1.5 outline-none"
          >
            {allowedRoles.map(r => <option key={r} value={r}>{t(ROLE_META[r].label, EN_C_ROLE_META[r].label)}</option>)}
          </select>
        </div>
      )}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {nav.map((entry, i) => {
          if (isSection(entry)) return (
            <p key={i} className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2 mt-4 mb-1 first:mt-0">
              {t(entry.section, EN_C_SECTIONS[entry.section] || entry.section)}
            </p>
          );
          const item = entry as any;
          const active = page === item.id;
          const itemLabel = t(item.label, EN_C_NAV_LABELS[item.id] || item.label);
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${active ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/8 hover:text-white/90"}`}
            >
              <span className={active ? "text-cyan-400" : ""}>{item.icon}</span>
              <span className={`flex-1 ${dir === "rtl" ? "text-right" : "text-left"}`}>{itemLabel}</span>
              {item.id === "head-pending" && headPendingCount > 0 ? (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{headPendingCount}</span>
              ) : item.badge ? (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10 space-y-1">
        <button
          onClick={() => {
            const next = lang === "ar" ? "en" : "ar";
            setLang(next);
            langPrefMut.mutate({ language: next });
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/8 transition-all text-sm"
        >
          <Globe size={14} /> {lang === "ar" ? "English" : "عربي"}
        </button>
        <button
          onClick={() => { onLogout(); setMobileOpen(false); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/8 transition-all text-sm"
        >
          <LogOut size={14} /> {t("تسجيل الخروج", "Sign Out")}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" dir={dir}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-shrink-0 md:flex-col" style={{ background: SIDEBAR_GRAD }} aria-label={t("القائمة الجانبية", "Sidebar")}>
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop & Panel */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 ${dir === "rtl" ? "right-0" : "left-0"} z-50 w-72 max-w-[85vw] flex flex-col shadow-2xl transition-all duration-200 md:hidden ${mobileOpen ? "translate-x-0 opacity-100" : `${dir === "rtl" ? "translate-x-full" : "-translate-x-full"} opacity-0 pointer-events-none`}`}
        style={{
          background: SIDEBAR_GRAD,
          visibility: mobileOpen ? "visible" : "hidden",
        }}
        role="dialog"
        aria-modal={mobileOpen}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen ? true : undefined}
        aria-label={t("القائمة الجانبية", "Sidebar menu")}
      >
        {renderSidebarContent(true)}
      </div>

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col overflow-hidden min-w-0"
        style={{ background: BG_CONTENT }}
        inert={mobileOpen ? true : undefined}
        aria-hidden={mobileOpen ? true : undefined}
      >
        <header className="bg-white border-b border-gray-100 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex flex-wrap gap-3 items-center justify-between flex-shrink-0">
          <nav aria-label={t("مسار الصفحة", "Breadcrumb")} className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
            <button
              ref={menuBtnRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 -mx-1 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 md:hidden flex-shrink-0"
              aria-label={t("فتح القائمة", "Open menu")}
              aria-expanded={mobileOpen}
            >
              <Menu size={20} />
            </button>
            <span className="font-bold text-gray-800 truncate">{COMPANY.name}</span>
            <ChevronRight size={12} className={`text-gray-300 hidden sm:inline ${dir === "ltr" ? "rotate-180" : ""}`} />
            <span aria-current="page" className="truncate">{pageLabel}</span>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-3 w-full sm:w-auto min-w-0">
            {COMPANY.plan !== "—" && <Badge className="hidden sm:inline-flex bg-emerald-50 text-emerald-700 border border-emerald-100">● {t(PLAN_AR[COMPANY.plan] || COMPANY.plan, COMPANY.plan)}</Badge>}
            <Badge className="hidden md:inline-flex bg-purple-50 text-purple-700 border border-purple-100">{meta.icon} {t(meta.label, enMeta.label)}</Badge>
            <GlobalSearch t={t} theme="light" role={role} pages={nav.flatMap(entry => "id" in entry ? [entry.id] : [])} onNavigate={handleNav} />
            <NotificationBell t={t} theme="light" role={role} pages={nav.flatMap(entry => "id" in entry ? [entry.id] : [])} onNavigate={handleNav} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// T03/T04 NET-NEW SHARED UI (colocated)
// ═══════════════════════════════════════════════════
const fmtH = (h:number|null|undefined) => h == null ? "—" : fmt(Math.round(h)/100); // halalas → SAR display

// Branch/day state chips — GET /pipeline/daily-rollup (T03 §12).
// The 7th chip (erp_imported) is a reserved future stage → always greyed out.
const ROLLUP_CHIP_CFG: Record<string,{ label:string; cls:string }> = {
  empty:               { label:"لا بيانات",       cls:"bg-gray-100 text-gray-400 border-gray-200" },
  incomplete:          { label:"غير مكتمل",       cls:"bg-amber-50 text-amber-700 border-amber-200" },
  ready_consolidation: { label:"جاهز للتجميع",   cls:"bg-sky-50 text-sky-700 border-sky-200" },
  consolidated:        { label:"مُجمَّع",         cls:"bg-indigo-50 text-indigo-700 border-indigo-200" },
  ready_erp:           { label:"جاهز لـ ERP",     cls:"bg-purple-50 text-purple-700 border-purple-200" },
  exported:            { label:"مُصدَّر",          cls:"bg-emerald-50 text-emerald-700 border-emerald-200" },
  erp_imported:        { label:"مُستورَد في ERP ★", cls:"bg-gray-50 text-gray-300 border-gray-100" },
};
function BranchDayStateChips({ date }:{ date?:string }) {
  const { t } = useCLang();
  const { data, isLoading } = useDailyRollup(date ? { date } : {});
  const rows = data?.data ?? [];
  if (isLoading) return null;
  if (rows.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 text-sm">📊 {t("حالة الفروع اليوم","Branch Status Today")}</h3>
        <span className="text-[10px] text-gray-400">{data?.meta?.branchDays ?? rows.length} {t("فرع/يوم","branch-days")}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {rows.map(r=>{
          const cfg = ROLLUP_CHIP_CFG[r.state?.key] ?? ROLLUP_CHIP_CFG.empty;
          return (
            <div key={`${r.branchId}-${r.date}`} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">{r.branchName}</p>
                <p className="text-[10px] text-gray-400">{r.state?.subLabelAr ?? ""}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border whitespace-nowrap ${cfg.cls}`}>
                {r.state?.labelAr ?? cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Operation attachments panel — GET /operations/{id}/attachments (T04 §9).
function OperationAttachmentsPanel({ operationId }:{ operationId:string }) {
  const { t } = useCLang();
  const { data: files = [], isLoading } = useOperationAttachments(operationId);
  return (
    <div>
      <p className="text-xs font-bold text-gray-600 mb-2">📎 {t("المرفقات","Attachments")} ({files.length})</p>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading && <p className="text-[11px] text-gray-400 text-center py-3">{t("جارٍ التحميل…","Loading…")}</p>}
        {!isLoading && files.length===0 && (
          <p className="text-[11px] text-gray-400 text-center py-3">{t("لا توجد مرفقات","No attachments")}</p>
        )}
        {files.map(f=>(
          <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
            <Paperclip size={13} className="text-gray-400 flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{f.filename}</p>
              <p className="text-[10px] text-gray-400">{Math.round((f.size||0)/1024)} KB · {new Date(f.uploadedAt).toLocaleDateString("ar-SA")}</p>
            </div>
            <a href={f.publicUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-purple-600 hover:underline font-semibold">{t("عرض","View")}</a>
            <a href={f.publicUrl} download className="text-[11px] text-gray-500 hover:underline font-semibold">{t("تحميل","Download")}</a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SALES: RECONCILIATION PANEL (inside expanded OpRow)
// ═══════════════════════════════════════════════════
type VEmpCD = { empId:string; amount:string };

// One variance-allocation row — owns its own employee-name lookup by empNumber.
function VarEmpRow({ branchId, row, onField, onRemove, onQuickFill, canRemove, disabled=false, strictDecimal=false }:{
  branchId?:string; row:VEmpCD; onField:(field:keyof VEmpCD,val:string)=>void;
  onRemove:()=>void; onQuickFill?:()=>void; canRemove:boolean; disabled?:boolean; strictDecimal?:boolean;
}) {
  const { data: emp } = useBranchEmployeesLookup(branchId, row.empId.length>=3 ? row.empId : undefined);
  const empName = emp?.name ?? "";
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-0.5">
        <label className="text-[9px] text-gray-400">رقم الموظف</label>
        <input placeholder="مثال: 1001" value={row.empId} onChange={ev=>onField("empId",ev.target.value)} disabled={disabled}
          className="w-20 text-center font-mono border border-red-200 rounded-lg px-2 py-1 text-[10px] bg-white focus:outline-none focus:border-red-400"/>
      </div>
      <div className="flex flex-col gap-0.5 flex-1">
        <label className="text-[9px] text-gray-400">اسم الموظف</label>
        <div className="h-7 flex items-center px-2 rounded-lg bg-white border border-gray-100 text-[10px] text-gray-700">{empName||<span className="text-gray-300">يُعبأ تلقائياً</span>}</div>
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-[9px] text-gray-400">المبلغ (ر.س)</label>
        <input placeholder="0.00" type={strictDecimal ? "text" : "number"} inputMode="decimal" value={row.amount} onChange={ev=>onField("amount",ev.target.value)} disabled={disabled}
          className="w-24 text-center font-mono border border-red-200 rounded-lg px-2 py-1 text-[10px] bg-white focus:outline-none focus:border-red-400"/>
      </div>
      {onQuickFill && <div className="flex flex-col gap-0.5">
        <label className="text-[9px] text-gray-400 opacity-0">⚡</label>
        <button onClick={onQuickFill}
          className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-200 border border-amber-200">⚡ المتبقي</button>
      </div>}
      {canRemove && (
        <button onClick={onRemove} disabled={disabled} className="mt-3 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><X size={12}/></button>
      )}
    </div>
  );
}
function SalesReconPanel({ op, onApprove, onReject, onClarify, isPending, forHead }:{
  op:COp; onApprove:()=>void; onReject:()=>void; onClarify?:()=>void; isPending:boolean; forHead:boolean;
}) {
  const { t } = useCLang();
  const detailQ = useSalesDetails(op.id);
  const recon = detailQ.reconciliation;
  const queryClient = useQueryClient();
  const salesContext = () => {
    const detail = queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id)) ?? detailQ.data;
    return { operation: op, role: forHead ? "head" : "accountant", detail,
      locked: detail?.reconciliation?.isLocked,
      financialDataReady: hasSalesReconciliationEvidence(detail?.reconciliation) };
  };
  const salesPolicy = getSalesActionPolicy(salesContext());
  const patchMut = usePatchSalesDetails();
  const assignMut = useAssignSalesVariance();

  const [editMode, setEditMode] = useState(false);
  // Draft edits keyed by channel key (SAR strings, entered by the accountant).
  const [draft, setDraft] = useState<Record<string,string>>({});
  const [varReason, setVarReason] = useState("");
  const [varEmps, setVarEmps] = useState<VEmpCD[]>([{ empId:"", amount:"" }]);
  const [assignNotes, setAssignNotes] = useState("");
  // Remaining variance to allocate — seeded from recon, refreshed by assign response.
  const [remainingH, setRemainingH] = useState<number | null>(null);

  const channels = recon?.channels ?? [];
  const totals = recon?.totals;
  const isLocked = recon?.isLocked ?? (op.status==="final-approved");
  const varianceH = totals?.varianceHalalas ?? null;
  const isShortage = varianceH != null && varianceH < 0;
  const isSurplus = varianceH != null && varianceH > 0;
  const hasVariance = varianceH != null && varianceH !== 0;
  const effRemainingH = remainingH ?? (varianceH == null ? null : Math.abs(varianceH));
  const assignedH = varEmps.reduce((s,e)=>s + Math.round((parseFloat(e.amount)||0)*100), 0);
  const leftH = effRemainingH == null ? null : effRemainingH - assignedH;
  const [editError, setEditError] = useState<string|null>(null);

  const coreCh = channels.filter(c=>c.group==="core");
  const deliveryCh = channels.filter(c=>c.group==="delivery");

  const setVarEmpField = (i:number, field:keyof VEmpCD, val:string) =>
    setVarEmps(p=>p.map((e,j)=>j===i?{...e,[field]:val}:e));

  function beginEdit() {
    if (!recon) return;
    runSalesAction(salesContext, "edit", () => {
      const seed:Record<string,string> = {};
      channels.forEach(c=>{ seed[c.key] = String(Math.round(c.actualAmountHalalas)/100); });
      setDraft(seed);
      setVarReason(recon?.varianceReason ?? "");
      setEditMode(true);
    });
  }
  function saveEdit() {
    if (!recon) return;
    runSalesAction(salesContext, "save", () => {
      // Validate all draft amounts — blank or invalid numeric input is rejected (ACC-F03)
      for (const c of channels) {
        const raw = draft[c.key];
        if (raw !== undefined) {
          const trimmed = String(raw).trim();
          if (trimmed === "" || isNaN(Number(trimmed)) || Number(trimmed) < 0) {
            return;
          }
        }
      }
      const payloadChannels = channels.map(c=>({
        key: c.key,
        actualAmountHalalas: Math.round(Number(draft[c.key] !== undefined ? draft[c.key] : c.actualAmountHalalas / 100) * 100),
        posAmountHalalas: c.posAmountHalalas,
      }));
      patchMut.mutate(
        { operationId: op.id, payload: { channels: payloadChannels, varianceReason: varReason || undefined } },
        { onSuccess: ()=>setEditMode(false) },
      );
    });
  }
  function confirmAssign() {
    if (totals?.varianceHalalas == null || totals.varianceHalalas >= 0) return;
    runSalesAction(salesContext, "assign", () => {
      const allocations = varEmps
        .filter(e=>e.empId.trim() && (parseFloat(e.amount)||0)>0)
        .map(e=>({ empNumber: e.empId.trim(), amountHalalas: Math.round((parseFloat(e.amount)||0)*100) }));
      if (allocations.length===0) return;
      assignMut.mutate(
        { operationId: op.id, payload: { allocations, notes: assignNotes || undefined } },
        { onSuccess: (res)=>{ setRemainingH(res.remainingVarianceHalalas); if (res.remainingVarianceHalalas<=0) setVarEmps([{empId:"",amount:""}]); } },
      );
    });
  }

  const ChannelRow = ({ c }:{ c:typeof channels[number] }) => (
    <div className={`flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/60 ${c.status==="diff"?"bg-amber-50/40":""}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{c.icon}</span><span className="text-xs text-gray-700">{c.labelAr}</span>
        {c.diffHalalas != null && c.diffHalalas!==0 && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">{c.statusLabelAr} {c.diffHalalas>0?"+":""}{fmtH(c.diffHalalas)}</span>}
      </div>
      {editMode && salesPolicy.edit ? (
        <input type="number" value={draft[c.key] ?? String(c.actualAmountHalalas/100)}
          onChange={e=>setDraft(d=>({...d,[c.key]:e.target.value}))}
          className="w-32 text-center font-mono font-semibold border-2 border-purple-300 rounded-lg px-2 py-1 text-xs bg-purple-50 focus:outline-none"/>
      ) : <span className="font-mono font-semibold text-gray-800 text-xs">{fmtH(c.actualAmountHalalas)} ر.س</span>}
    </div>
  );

  return (
    <div className="space-y-3">
      {salesPolicy.pkg6 && <p role="note" className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3">{t(SALES_RETURN_HINT.ar, SALES_RETURN_HINT.en)}</p>}
      {salesPolicy.staleMembers.length > 0 && <p role="status" className="text-xs text-amber-700">{t("بانتظار إعادة اعتماد ورديات أعضاء","Awaiting reapproval of member shifts")}</p>}
      {recon && !salesPolicy.pkg6 && !hasSalesReconciliationEvidence(recon) && <p role="note" className="text-xs text-gray-500">{t("بيانات التسوية غير مكتملة — التعديل غير متاح","Reconciliation data is incomplete — editing is unavailable")}</p>}
      {/* Reconciliation Panel */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-indigo-50/40">
          <p className="text-xs font-bold text-gray-700">{t("تسوية المبيعات","Sales Reconciliation")}</p>
          {salesPolicy.edit && recon && (
            <button onClick={()=> editMode ? saveEdit() : beginEdit()} disabled={patchMut.isPending}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${editMode?"bg-purple-600 text-white border-purple-600":"bg-white text-purple-600 border-purple-200 hover:bg-purple-50"}`}>
              <Edit3 size={10}/> {editMode?(patchMut.isPending?"جارٍ الحفظ…":"💾 حفظ"):"تعديل الأرقام"}
            </button>
          )}
          {isLocked && <span className="flex items-center gap-1 text-[11px] text-slate-400"><Lock size={11}/> {t("مقفل","Locked")}</span>}
        </div>

        {editError && (
          <div className="px-4 py-2 bg-red-50 text-red-700 text-xs font-medium border-b border-red-100">
            {editError}
          </div>
        )}

        {detailQ.isLoading && <p className="text-[11px] text-gray-400 text-center py-4">{t("جارٍ تحميل التسوية…","Loading reconciliation…")}</p>}
        {!detailQ.isLoading && !recon && (
          <p className="text-[11px] text-gray-400 text-center py-4">{t("لم تتم التسوية بعد لهذه العملية","This operation has not been reconciled yet")}</p>
        )}

        {recon && (
          <div className="divide-y divide-gray-100">
            {/* إجمالي المبيعات (locked branch total) */}
            <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"/>
                <span className="text-xs font-bold text-indigo-900">{t("إجمالي المبيعات","Total Sales")}</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-md">{t("من رفع مدير الفرع — مقفل","From branch manager — locked")}</span>
              </div>
              <span className="font-mono font-black text-indigo-800 text-sm">{fmtH(totals?.expectedTotalHalalas)} ر.س</span>
            </div>

            {/* Core channels */}
            {coreCh.map(c=><ChannelRow key={c.key} c={c}/>)}

            {/* Delivery apps heading + rows */}
            {deliveryCh.length>0 && (
              <div className="px-4 py-1.5 bg-gray-50/80">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t("تطبيقات التوصيل","Delivery Apps")}</p>
              </div>
            )}
            {deliveryCh.map(c=><ChannelRow key={c.key} c={c}/>)}

            {/* Variance reason (edit mode) */}
            {editMode && salesPolicy.edit && (
              <div className="px-4 py-2.5">
                <input value={varReason} onChange={e=>setVarReason(e.target.value)} maxLength={80}
                  placeholder={t("سبب الفرق (اختياري)","Variance reason (optional)")}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-300"/>
              </div>
            )}

            {/* تحميل الفرق على موظفين — يتاح فقط في حالة العجز وليس الفائض (ACC-F04) */}
            {isShortage && salesPolicy.assign && (
              <div className="mx-4 my-2 bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100/60 border-b border-red-200">
                  <AlertTriangle size={13} className="text-red-600 flex-shrink-0"/>
                  <p className="text-xs font-bold text-red-800">{t("تحميل الفرق على موظفين","Allocate variance to employees")} — {t("العجز","Shortage")}: <span className="font-mono">{fmtH(Math.abs(varianceH))} ر.س</span></p>
                  <span className={`mr-auto text-[10px] font-bold px-2 py-0.5 rounded-lg ${leftH != null && leftH<=0?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>
                    {leftH != null && leftH<=0?"✓ محمَّل بالكامل":`${t("متبقي","Remaining")} ${fmtH(leftH)} ر.س`}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {varEmps.map((e,i)=>(
                    <VarEmpRow key={i} branchId={op.branchId} row={e} canRemove={varEmps.length>1}
                      onField={(f,v)=>setVarEmpField(i,f,v)}
                      onRemove={()=>setVarEmps(p=>p.filter((_,j)=>j!==i))}
                      onQuickFill={()=>{ if (leftH == null) return; setVarEmpField(i,"amount",String(Math.max(0,(leftH+Math.round((parseFloat(e.amount)||0)*100))/100))); }}/>
                  ))}
                  <input value={assignNotes} onChange={e=>setAssignNotes(e.target.value)}
                    placeholder={t("ملاحظات (اختياري)","Notes (optional)")}
                    className="w-full text-[10px] border border-red-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-red-400"/>
                  <div className="flex items-center justify-between pt-1">
                    <button onClick={()=>setVarEmps(p=>[...p,{empId:"",amount:""}])} className="flex items-center gap-1 text-[10px] text-red-600 hover:underline font-semibold"><Plus size={10}/> {t("إضافة موظف آخر","Add another employee")}</button>
                    <Btn size="sm" variant="success" onClick={confirmAssign} disabled={assignMut.isPending || leftH == null || leftH>0}>
                      <CheckCircle2 size={10}/> {assignMut.isPending?t("جارٍ التحميل…","Uploading…"):t("تأكيد التحميل","Confirm Upload")}
                    </Btn>
                  </div>
                </div>
              </div>
            )}

            {isSurplus && (
              <div className="mx-4 my-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0"/>
                <p className="text-xs font-bold text-emerald-800">{t("فائض في المبيعات — لا يتم تحميله كمديونية على الموظفين وفق القواعد","Sales surplus — not allocated as employee liability per rules")}: <span className="font-mono">+{fmtH(varianceH)} {t("ر.س","SAR")}</span></p>
              </div>
            )}

            {/* إجمالي التحصيل */}
            <div className={`flex items-center justify-between px-4 py-3 font-bold border-t-2 ${varianceH===0?"bg-emerald-50/70 border-emerald-200":hasVariance?"bg-red-50/70 border-red-200":"bg-gray-50 border-gray-200"}`}>
              <span className={`text-xs ${varianceH===0?"text-emerald-800":hasVariance?"text-red-800":"text-gray-500"}`}>{t("إجمالي التحصيل","Total Collection")}</span>
              <span className={`font-mono text-sm ${varianceH===0?"text-emerald-700":hasVariance?"text-red-700":"text-gray-500"}`}>{fmtH(totals?.totalCollectionHalalas)} ر.س</span>
            </div>
            {varianceH == null ? <p className="text-xs text-gray-400 px-4 py-2.5">{t("الفرق غير متاح —","Variance unavailable —")}</p> : varianceH!==0 ? (
              <div className="flex items-center justify-between px-4 py-2.5 bg-red-100 border-t border-red-200">
                <div className="flex items-center gap-2"><AlertTriangle size={12} className="text-red-600"/><span className="text-xs font-bold text-red-800">{totals?.statusLabelAr ?? t("يوجد فرق","Variance")}</span></div>
                <span className="font-mono font-black text-red-800 text-sm">{fmtH(varianceH)} ر.س</span>
              </div>
            ) : (
              <div className="flex items-center justify-center px-4 py-2.5 bg-emerald-50">
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-2"><CheckCircle2 size={13}/> {t("إجمالي التحصيل مطابق لإجمالي المبيعات","Collection matches total sales")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attachments */}
      <OperationAttachmentsPanel operationId={op.id}/>

      {/* Action buttons */}
      {isPending && !forHead && (
        <div className="flex gap-2 justify-end">
          {onClarify && (
            <button onClick={e=>{e.stopPropagation();onClarify();}} className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-100">❔ {t("طلب توضيح","Request Clarification")}</button>
          )}
          {salesPolicy.return && <button onClick={e=>{e.stopPropagation();runSalesAction(salesContext, "return", onReject);}} className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100">✕ {t("رفض","Reject")}</button>}
          <button onClick={e=>{e.stopPropagation();onApprove();}} className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600">✓ {t("موافقة — إرسال لرئيس الحسابات","Approve — send to head")}</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SHARED: OPS ROW COMPONENT
// ═══════════════════════════════════════════════════
function ShiftAllocationForm({ op, shortageHalalas }:{ op:COp; shortageHalalas:number }) {
  const { t, lang } = useCLang();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mounted = useRef(false);
  const pendingDirect = useRef(new Set<()=>void>());
  const fingerprint = financialAccessFingerprint(user);
  const currentFingerprint = useRef(fingerprint);
  currentFingerprint.current = fingerprint;
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; for (const abort of pendingDirect.current) abort(); pendingDirect.current.clear(); };
  }, []);
  const accessStillCurrent = (generation:number, expectedFingerprint:string) =>
    mounted.current && generation === financialAccessGeneration(queryClient)
    && expectedFingerprint === currentFingerprint.current && hasRoleGrant(user,"accountant");
  const allocationMut = useShiftVarianceAllocations();
  const submitLock = useRef(false);
  const [pending, setPending] = useState(false);
  const [rows, setRows] = useState<ShfAllocationRow[]>([{empNumber:"",amountSar:""}]);
  const allocations = prepareShfAllocations(rows, shortageHalalas);
  const remaining = remainingShfAllocationHalalas(rows, shortageHalalas);
  const setField = (index:number,field:keyof ShfAllocationRow,value:string) =>
    setRows(current=>current.map((row,i)=>i===index?{...row,[field]:value}:row));
  const submit = async () => {
    if (!allocations || pending || submitLock.current || !mounted.current || !hasRoleGrant(user,"accountant")) return;
    const generation = financialAccessGeneration(queryClient);
    const requestFingerprint = currentFingerprint.current;
    setPending(true);
    let postStarted = false;
    try {
      const completed = await runShfAllocationCorrection(op, "accountant", rows, async () => {
        const request = registerFinancialRequest(queryClient);
        pendingDirect.current.add(request.abort);
        try {
          const response = await api.get<ApiOperation>(`/operations/${op.id}`,{signal:request.signal});
          if (request.signal.aborted || !accessStillCurrent(generation,requestFingerprint)) throw new FinancialAccessChangedError();
          queryClient.setQueryData(queryKeys.operation(op.id), response.data);
          return response.data;
        } finally { pendingDirect.current.delete(request.abort); request.release(); }
      }, async (shiftId, currentAllocations) => {
        if (!accessStillCurrent(generation,requestFingerprint)) throw new FinancialAccessChangedError();
        postStarted = true;
        await allocationMut.mutateAsync({operationId:op.id,shiftId,allocations:currentAllocations});
      }, submitLock);
      if (completed && accessStillCurrent(generation,requestFingerprint)) setRows([{empNumber:"",amountSar:""}]);
      else if (accessStillCurrent(generation,requestFingerprint)) toast.error(t("تغير دليل الوردية؛ حدّث القائمة وأعد المراجعة","Shift evidence changed; refresh and review again"));
    } catch (error) {
      if (!postStarted && !(error instanceof FinancialAccessChangedError)) toast.error(getErrorMessage(error,"ar")); // The mutation hook translates POST errors.
    } finally { if (mounted.current) setPending(false); }
  };
  return <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/40 p-3 text-xs">
    <h4 className="font-bold text-red-800">{t("تصحيح توزيع العجز","Correct shortage allocation")}</h4>
    <p>{t("كامل العجز المطلوب توزيعه","Full shortage to allocate")}: <bdi>{formatShiftHalalas(shortageHalalas,lang)}</bdi> {t("ر.س","SAR")}</p>
    {rows.map((row,i)=><VarEmpRow key={i} branchId={op.branchId} row={{empId:row.empNumber,amount:row.amountSar}}
      disabled={pending || allocationMut.isPending} strictDecimal canRemove={rows.length>1}
      onField={(field,value)=>setField(i,field==="empId" ? "empNumber" : "amountSar",value)}
      onRemove={()=>setRows(current=>current.filter((_,index)=>index!==i))}/>)}
    <button onClick={()=>setRows(current=>[...current,{empNumber:"",amountSar:""}])} disabled={pending || allocationMut.isPending}
      className="rounded-lg border px-2 py-1.5 disabled:opacity-50">{t("إضافة موظف","Add employee")}</button>
    {remaining !== null && <p>{t("المتبقي للتحقق فقط","Remaining for validation only")}: <bdi>{formatShiftHalalas(remaining,lang)}</bdi> {t("ر.س","SAR")}</p>}
    {!allocations && <p className="text-red-700">{t("أدخل حصصًا صحيحة يساوي مجموعها كامل العجز","Enter valid shares totalling the full shortage")}</p>}
    <button onClick={submit} disabled={!allocations || pending || allocationMut.isPending}
      className="rounded-lg bg-red-700 px-3 py-1.5 font-semibold text-white disabled:opacity-50">{pending ? t("جارٍ الحفظ…","Saving…") : t("حفظ التوزيع","Save allocation")}</button>
  </div>;
}

function ShiftReportCorrectionForm({ op, detail }:{ op:COp; detail:ApiOperation }) {
  const { t, lang } = useCLang();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const correction = useAccountantShiftReportCorrection();
  const [empSearch, setEmpSearch] = useState("");
  const employeeQuery = useEmployees({ branchId: op.branchId, q: empSearch.trim() || undefined, pageSize: 100 });
  const initial = initialShiftCorrectionDraft(detail);
  const [draft,setDraft] = useState<ShiftCorrectionDraft>(()=>initial);
  const [pending,setPending] = useState(false);
  const [completed,setCompleted] = useState(false);
  const [uncertain,setUncertain] = useState(false);
  const mounted = useRef(false);
  const submitLock = useRef(false);
  const pendingDirect = useRef(new Set<()=>void>());
  const fingerprint = financialAccessFingerprint(user);
  const currentFingerprint = useRef(fingerprint);
  currentFingerprint.current = fingerprint;
  useLayoutEffect(()=>{
    mounted.current = true;
    return ()=>{mounted.current=false;for(const abort of pendingDirect.current)abort();pendingDirect.current.clear();};
  },[]);

  const evidence = getShiftCorrectionEvidence(op,detail,"accountant");
  const accessStillCurrent = (generation:number,expectedFingerprint:string) =>
    mounted.current && generation === financialAccessGeneration(queryClient)
    && expectedFingerprint === currentFingerprint.current && hasRoleGrant(user,"accountant");
  const employees = (employeeQuery.data?.data ?? []).filter(employee=>employee.status === "active");
  const hasDraftChanges = Boolean(evidence && prepareShiftCorrectionRequest(detail,draft));

  const setField = (key:"cardPaymentsSar"|"countedCashSar"|"cashCollectedSar"|"handoverNotes"|"reason",value:string) =>
    setDraft(current=>({...current,[key]:value}));
  const setShare = (index:number,key:"type"|"id"|"amountSar",value:string) =>
    setDraft(current=>({...current,shares:current.shares?.map((share,i)=>i===index?{...share,[key]:value}:share) ?? null}));
  const submit = async () => {
    if (!evidence || !hasRoleGrant(user,"accountant") || pending || completed || submitLock.current || !mounted.current) return;
    const generation = financialAccessGeneration(queryClient);
    const requestFingerprint = currentFingerprint.current;
    setPending(true);
    let postStarted = false;
    const clientCommandId = generateCommandId();
    try {
      const didComplete=await runShiftReportCorrection(op,detail,"accountant",draft,async()=>{
        const request=registerFinancialRequest(queryClient);
        pendingDirect.current.add(request.abort);
        try {
          const response=await api.get<ApiOperation>(`/operations/${encodeURIComponent(op.id)}`,{signal:request.signal});
          if(request.signal.aborted || !accessStillCurrent(generation,requestFingerprint)) throw new FinancialAccessChangedError();
          queryClient.setQueryData(queryKeys.operation(op.id),response.data);
          return response.data;
        } finally {pendingDirect.current.delete(request.abort);request.release();}
      },async(shiftId,body)=>{
        if(!accessStillCurrent(generation,requestFingerprint)) throw new FinancialAccessChangedError();
        postStarted = true;
        await correction.mutateAsync({operationId:op.id,shiftId,body,idempotencyKey:clientCommandId});
      },submitLock);
      if(didComplete && accessStillCurrent(generation,requestFingerprint)) {
        setCompleted(true);
        setUncertain(false);
      } else if(!didComplete && accessStillCurrent(generation,requestFingerprint))
        toast.error(t("تغير دليل التقرير أو نسخته؛ حدّث التفاصيل وأعد المراجعة","Report evidence or revision changed; refresh the details and review again"));
    } catch(error) {
      if(postStarted) {
        // F-COR05-02: After uncertain correction POST outcome, refetch actual operation from server
        // to reconcile screen with server truth without repeating the financial POST.
        // Requires exact command identity attribution; never use reason text or actor ID as proof of success.
        try {
          const reconciled = await api.get<ApiOperation>(`/operations/${encodeURIComponent(op.id)}`);
          if (accessStillCurrent(generation, requestFingerprint)) {
            queryClient.setQueryData(queryKeys.operation(op.id), reconciled.data);
            const freshRev = reconciled.data.reportRevision ?? reconciled.data.payload?.reportRevision;
            const expectedRev = evidence.reportRevision;
            const lastCorrection = reconciled.data.lastCorrection ?? reconciled.data.payload?.lastCorrection;
            const matchesAttribution = Boolean(
              typeof freshRev === "number" &&
              typeof expectedRev === "number" &&
              freshRev > expectedRev &&
              lastCorrection &&
              typeof lastCorrection === "object" &&
              lastCorrection.revisionNumber === freshRev &&
              clientCommandId &&
              lastCorrection.commandId === clientCommandId
            );
            if (matchesAttribution) {
              setCompleted(true);
              setUncertain(false);
              toast.success(t("تم تطبيق التصحيح على الخادم وتحديث التقرير","Correction applied on server and report updated"));
            } else {
              setUncertain(true);
              toast.error(t("حالة إرسال التصحيح غير مؤكدة؛ يتطلب التحقق اليدوي دون تكرار العملية","Correction outcome uncertain; manual verification required without repeating submission"));
            }
          }
        } catch {
          if (accessStillCurrent(generation, requestFingerprint)) {
            setUncertain(true);
            toast.error(t("تعذر التحقق من حالة الخادم بعد إرسال التصحيح؛ يتطلب التحقق اليدوي","Could not verify server state after correction submission; manual verification required"));
          }
        }
      } else if(!(error instanceof FinancialAccessChangedError) && accessStillCurrent(generation,requestFingerprint)) {
        toast.error(getErrorMessage(error,"ar"));
      }
    } finally {
      if(mounted.current) setPending(false);
    }
  };

  if(!evidence || !hasRoleGrant(user,"accountant")) return null;
  const fieldClass="w-full rounded-lg border border-violet-200 bg-white px-2.5 py-2 font-mono text-xs";
  const employeeOption=(employee:{id:string;name:string;empNumber:string})=>(
    <option key={employee.id} value={`employee:${employee.id}`}>{employee.name} · {employee.empNumber}</option>
  );
  return <section aria-label={t("تصحيح تقرير الوردية","Shift report correction")} className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3 text-xs">
    <div><h4 className="font-bold text-violet-900">{t("تصحيح تقرير المحاسب","Accountant report correction")}</h4>
      <p className="mt-1 text-gray-600">{t("يُحفظ السبب وسجل المراجعة. إجمالي المبيعات غير قابل للتعديل.","The reason and audit history are retained. Gross sales cannot be changed.")}</p>
    </div>
    {uncertain && (
      <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-amber-900">
        <p className="font-semibold">{t("حالة إرسال التصحيح غير مؤكدة","Correction submission outcome is uncertain")}</p>
        <p className="mt-0.5 text-gray-600">{t("تم التوفيق مع الخادم لمنع تكرار الإرسال المالي؛ تحقّق من نسخة التقرير أو حدّث الصفحة.","Reconciled with server to prevent duplicate financial POST; verify report revision or reload the page.")}</p>
      </div>
    )}
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="space-y-1"><span>{t("إجمالي المبيعات — للقراءة فقط","Gross sales — read only")}</span>
        <p className="rounded-lg border bg-gray-50 px-2.5 py-2 font-mono">{formatShiftHalalas(detail.payload?.salesHalalas,lang)}</p>
      </label>
      {draft.cardPaymentsSar !== null ? <label className="space-y-1"><span>{t("إجمالي الشبكة (ر.س)","Card payments (SAR)")}</span>
        <input inputMode="decimal" value={draft.cardPaymentsSar} onChange={event=>setField("cardPaymentsSar",event.target.value)} disabled={pending||correction.isPending} className={fieldClass}/>
      </label> : <p>{t("إجمالي الشبكة غير متاح للتصحيح","Card amount unavailable for correction")}</p>}
      {draft.countedCashSar !== null ? <label className="space-y-1"><span>{t("النقد المجرود (ر.س)","Counted cash (SAR)")}</span>
        <input inputMode="decimal" value={draft.countedCashSar} onChange={event=>setField("countedCashSar",event.target.value)} disabled={pending||correction.isPending} className={fieldClass}/>
      </label> : <p>{t("لا يوجد مبلغ جرد صالح قابل للتصحيح","No valid counted amount is available to correct")}</p>}
      {draft.cashCollectedSar !== null ? <label className="space-y-1"><span>{t("تحصيل النقد (ر.س)","Cash collected (SAR)")}</span>
        <input inputMode="decimal" value={draft.cashCollectedSar} onChange={event=>setField("cashCollectedSar",event.target.value)} disabled={pending||correction.isPending} className={fieldClass}/>
      </label> : <p className="text-gray-500">{t("تحصيل النقد غير متاح في تفاصيل هذه العملية","Cash collected is unavailable in this operation detail")}</p>}
      {draft.handoverNotes !== null ? <label className="space-y-1 sm:col-span-2"><span>{t("ملاحظات التسليم","Handover notes")}</span>
        <input type="text" value={draft.handoverNotes} onChange={event=>setField("handoverNotes",event.target.value)} disabled={pending||correction.isPending} className={fieldClass}/>
      </label> : <p className="text-gray-500 sm:col-span-2">{t("ملاحظات التسليم غير متاحة في تفاصيل هذه العملية","Handover notes are unavailable in this operation detail")}</p>}
    </div>
    {draft.aggregators === null ? <p className="text-gray-600">{t("تفاصيل التطبيقات غير متاحة بصيغة قابلة للتصحيح","Aggregator values are not available in a correctable contract shape")}</p>
      : draft.aggregators.length > 0 && <div className="space-y-2">
        <h5 className="font-semibold">{t("مبالغ تفاصيل التطبيقات (ر.س)","Aggregator detail amounts (SAR)")}</h5>
        {draft.aggregators.map((row,index)=><label key={`${row.aggregatorId}-${index}`} className="flex items-center gap-2">
          <span>{t("تفصيل التطبيق","Aggregator item")} {index+1}</span>
          <input inputMode="decimal" value={row.amountSar} disabled={pending||correction.isPending} className={fieldClass}
            onChange={event=>setDraft(current=>({...current,aggregators:current.aggregators?.map((item,i)=>i===index?{...item,amountSar:event.target.value}:item)??null}))}/>
        </label>)}
        <p className="text-gray-500">{t("يُعرض التفصيل بترتيبه دون ادعاء اسم التطبيق؛ لا تُعرض معرّفاته.","Items follow API order; no app name is inferred and identifiers stay hidden.")}</p>
      </div>}
    {draft.shares !== null && <div className="space-y-2 border-t border-violet-100 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="font-semibold">{t("تصحيح توزيع المسؤولية","Correct responsibility allocation")}</h5>
        <input type="search" placeholder={t("بحث في موظفي الفرع…","Search branch employees…")} value={empSearch}
          onChange={event=>setEmpSearch(event.target.value)} disabled={pending||correction.isPending}
          className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs"/>
      </div>
      {employeeQuery.isLoading && <p role="status">{t("جارٍ تحميل موظفي الفرع…","Loading branch employees…")}</p>}
      {employeeQuery.isError && <p role="alert">{t("تعذر تحميل موظفي الفرع؛ التوزيع غير متاح للتصحيح","Could not load branch employees; allocation correction is unavailable")}</p>}
      {draft.shares.map((share,index)=>{
        const currentKey=["cashier","employee","branch_manager"].includes(share.type)&&share.id?`${share.type}:${share.id}`:"";
        const changeActor=(value:string)=>{
          const [type,id]=value.split(":");
          setDraft(current=>({...current,shares:current.shares?.map((item,i)=>i===index?{...item,type,id}:item)??null}));
        };
        const selectedEmployee=employees.find(employee=>employee.id===share.id);
        const showCurrentActor=currentKey && (share.type!=="employee" || !selectedEmployee);
        return <div key={index} className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
          <label className="space-y-1"><span>{t("المسؤول","Responsible person")}</span>
            <select className={fieldClass} value={currentKey} onChange={event=>changeActor(event.target.value)} disabled={pending||correction.isPending||employeeQuery.isLoading||employeeQuery.isError}>
              <option value="">{t("اختر موظفًا","Select an employee")}</option>
              {showCurrentActor && <option value={currentKey}>{share.name ?? selectedEmployee?.name ?? t("المسؤول الحالي","Current responsible party")}</option>}
              {employees.map(employeeOption)}
            </select>
          </label>
          <label className="space-y-1"><span>{t("المبلغ (ر.س)","Amount (SAR)")}</span>
            <input inputMode="decimal" className={fieldClass} value={share.amountSar} disabled={pending||correction.isPending}
              onChange={event=>setShare(index,"amountSar",event.target.value)}/>
          </label>
          <button type="button" onClick={()=>setDraft(current=>({...current,shares:current.shares?.filter((_,i)=>i!==index)??null}))}
            disabled={pending||correction.isPending} className="self-end rounded-lg border border-red-200 px-2 py-2 text-red-700 disabled:opacity-50">{t("حذف","Remove")}</button>
        </div>;
      })}
      <button type="button" onClick={()=>setDraft(current=>({...current,shares:[...(current.shares??[]),{type:"employee",id:"",amountSar:""}]}))}
        disabled={pending||correction.isPending||employeeQuery.isLoading||employeeQuery.isError} className="rounded-lg border px-2 py-1.5 disabled:opacity-50">{t("إضافة مسؤول","Add responsible person")}</button>
      <p className="text-gray-500">{t("تُرسل حصص التوزيع كهللات صحيحة؛ يتحقق الخادم من مجموعها والفرع والنسخة، دون حساب فرق التقرير هنا.","Shares are sent as integer halalas; the server validates their total, branch and version without calculating report variance here.")}</p>
    </div>}
    <label className="block space-y-1"><span>{t("سبب التصحيح (إلزامي)","Correction reason (required)")}</span>
      <textarea rows={2} value={draft.reason} onChange={event=>setField("reason",event.target.value)} disabled={pending||correction.isPending} className={fieldClass}/>
    </label>
    <button type="button" onClick={submit} disabled={!hasDraftChanges||pending||completed||correction.isPending}
      className="rounded-lg bg-violet-700 px-3 py-2 font-semibold text-white disabled:opacity-50">
      {pending||correction.isPending?t("جارٍ حفظ التصحيح…","Saving correction…"):completed?t("تم حفظ التصحيح","Correction saved"):t("حفظ التصحيح","Save correction")}
    </button>
  </section>;
}

function ShiftOpPanel({ op, forHead, detail, loading, error }:{ op:COp; forHead:boolean; detail?:ApiOperation; loading?:boolean; error?:boolean }) {
  const { t, lang } = useCLang();
  if (loading) return <p role="status">{t("جارٍ تحميل تفاصيل الوردية…","Loading shift details…")}</p>;
  if (error) return <p role="alert">{t("تعذر تحميل تفاصيل الوردية","Could not load shift details")}</p>;
  if (!detail?.payload) return <p>{t("تفاصيل الوردية غير متاحة","Shift details are unavailable")}</p>;

  const payload = detail.payload;
  const count = payload.cashCountState;
  const money = (value:unknown) => formatShiftHalalas(value, lang);
  const line = (ar:string, en:string, value:unknown) => (
    <div className="flex justify-between gap-3 text-xs border-b border-gray-100 py-1.5">
      <span>{t(ar,en)}</span><bdi className="font-mono">{money(value)}</bdi>
    </div>
  );
  const rawReview = payload.pkg6Review ?? detail.reportReview;
  const review = rawReview && typeof rawReview === "object" ? rawReview : null;
  const phase = review?.phase;
  const phaseLabels:Record<string,[string,string]> = {
    accountant_review:["عند المحاسب","With accountant"], head_review:["عند رئيس الحسابات","With head"],
    head_returned:["أعادها رئيس الحسابات","Returned by head"], manager_returned:["أُعيدت لمدير الفرع","Returned to manager"],
  };
  const phaseText = typeof phase === "string" ? (Object.hasOwn(phaseLabels, phase) ? t(...phaseLabels[phase]) : phase) : "—";
  const returnReason = typeof review?.return_reason === "string" && review.return_reason ? review.return_reason : "—";
  const variance = payload.varianceHalalas;
  const validVariance = count === "counted" && typeof variance === "number" && Number.isSafeInteger(variance);
  const varianceLabel = validVariance && variance < 0 ? t("عجز","Shortage")
    : validVariance && variance > 0 ? t("فائض — للفرع","Surplus — branch") : t("الفرق","Variance");
  const liability = detail.liability;
  const allocationEvidence = getShfAllocationEvidence(op, detail, forHead ? "head" : "accountant");
  const confirmedOpening = (
    typeof payload.confirmedOpeningHalalas === "number" && Number.isSafeInteger(payload.confirmedOpeningHalalas)
      ? payload.confirmedOpeningHalalas
      : typeof payload.confirmed_opening_halalas === "number" && Number.isSafeInteger(payload.confirmed_opening_halalas)
      ? payload.confirmed_opening_halalas
      : typeof detail.confirmedOpeningHalalas === "number" && Number.isSafeInteger(detail.confirmedOpeningHalalas)
      ? detail.confirmedOpeningHalalas
      : null
  );
  return (
    <section aria-label={t("تفاصيل وردية الكاشير","Cashier shift details")} className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
      <div className="flex justify-between text-xs"><span>{t("حالة الجرد","Count state")}</span>
        <strong>{count === "counted" ? t("مجرود فعلياً","Physically counted") : count === "unknown" ? t("غير مجرود — لا يُعتمد كدليل","Not counted — not evidence") : "—"}</strong>
      </div>
      <div>
        {line("إجمالي المبيعات (شامل الضريبة)","Gross sales (including VAT)",payload.salesHalalas)}
        {line("إجمالي الشبكة","Card total",payload.cardTotalHalalas)}
        {line("تطبيقات التوصيل (قبل العمولة)","Aggregators (before commission)",payload.aggregatorTotalsHalalas)}
        {Array.isArray(payload.aggregatorBreakdown) && payload.aggregatorBreakdown.map((_,i) => (
          <div key={i} className="text-xs text-gray-600 py-1 flex flex-wrap gap-2">
            <span>{t("تطبيق","Aggregator")} {i+1}: {t("تفاصيل التطبيق غير متاحة","Aggregator details unavailable")}</span>
          </div>
        ))}
        {line("الافتتاحي المهيأ (ليس إثبات استلام)","Configured opening (not receipt evidence)",payload.openingFloatHalalas)}
        <div className="flex justify-between gap-3 text-xs border-b border-gray-100 py-1.5">
          <span>{t("الافتتاحي المؤكد","Confirmed opening")}</span>
          <bdi>{confirmedOpening != null ? money(confirmedOpening) : "—"}</bdi>
        </div>
        {line("النقد المتوقع","Expected cash",payload.cashExpectedHalalas)}
        {line("النقد المجرود","Counted cash",count === "counted" ? payload.cashActualHalalas : null)}
        <div className={`flex justify-between gap-3 text-xs border-b border-gray-100 py-1.5 ${validVariance ? variance < 0 ? "text-red-700" : variance > 0 ? "text-blue-700" : "" : ""}`}>
          <span>{varianceLabel}</span><bdi className="font-mono">{count === "unknown" ? t("غير مجرود","Not counted") : count === "counted" ? money(variance) : "—"}</bdi>
        </div>
        {typeof payload.pendingIncomingCountedHalalas === "number" && Number.isSafeInteger(payload.pendingIncomingCountedHalalas) && payload.pendingIncomingCountedHalalas > 0 &&
          line("نقدية واردة معلّقة (خارج الفرق)","Pending incoming cash (excluded from variance)",payload.pendingIncomingCountedHalalas)}
      </div>
      <div className="text-xs space-y-1">
        <p>{t("مرحلة المراجعة","Review phase")}: {phaseText}</p>
        <p>{t("سبب الإرجاع","Return reason")}: {returnReason}</p>
      </div>
      {Array.isArray(payload.varianceAllocations) && payload.varianceAllocations.length > 0 && (
        <div className="text-xs space-y-1">
          <h4 className="font-bold">{t("تخصيصات الفرق التاريخية من العملية","Historical operation variance allocations")}</h4>
          {payload.varianceAllocations.map((_,i) => (
            <p key={i}>{t("تخصيص","Allocation")} {i+1}: {t("تفاصيل التخصيص غير متاحة","Allocation details unavailable")}</p>
          ))}
        </div>
      )}
      {allocationEvidence && <ShiftAllocationForm op={op} shortageHalalas={allocationEvidence.shortageHalalas}/>}
      {!forHead && op?.branchId && getShiftCorrectionEvidence(op,detail,"accountant") &&
        <ShiftReportCorrectionForm key={`${detail.id}:${detail.reportRevision ?? "missing"}`} op={op} detail={detail}/>}
      <div className="text-xs space-y-1">
        <h4 className="font-bold">{t("توزيع المسؤولية الحالي","Current liability allocation")}</h4>
        {liability ? <>
          <p>{t("نسخة توزيع المسؤولية","Allocation version")}: {typeof liability.version === "number" && Number.isSafeInteger(liability.version) ? liability.version : "—"}</p>
          <p>{t("اعتماد المدير","Manager approval")}: {liability.managerApprovalStatus === "approved" ? t("معتمد من المدير","Approved by manager") : liability.managerApprovalStatus === "pending" ? t("قيد الاعتماد","Pending approval") : liability.managerApprovalStatus || "—"}</p>
          <p>{t("مصدر التوزيع","Allocation source")}: {liability.createdByType || "—"}</p>
          {Array.isArray(liability.shares) && liability.shares.length ? liability.shares.map((share,i) => (
            <p key={i}>{t("حصة","Share")} {i+1}: {share.type ?? "—"} · {share.id == null && share.name == null
              ? t("هوية المسؤول غير متاحة","Responsible party identity unavailable")
              : <>{t("المعرف","ID")}: {share.id ?? "—"} · {t("الاسم","Name")}: {share.name ?? "—"}</>} · <bdi>{money(share.amountHalalas)}</bdi></p>
          )) : <p>{t("تفاصيل الحصص غير متاحة","Share details unavailable")}</p>}
        </> : <p>{t("دليل توزيع المسؤولية غير متاح","Liability evidence unavailable")}</p>}
      </div>
      <div className="text-xs space-y-1">
        <h4 className="font-bold">{t("سجل الأحداث","Audit trail")}</h4>
        {detail.auditTrail?.length ? detail.auditTrail.map((event,i) => (
          <p key={i}>{event.action} · {event.by} · {event.time}</p>
        )) : <p>—</p>}
      </div>
    </section>
  );
}

function OpRow({ op, onApprove, onReject, onClarify, onView, expanded, onToggle, forHead=false, actionsPending=false }:{
  op:COp; onApprove:()=>void; onReject:()=>void; onClarify?:()=>void; onView:()=>void;
  expanded?:boolean; onToggle?:()=>void; forHead?:boolean; actionsPending?:boolean;
}) {
  const { t } = useCLang();
  const detailQ = useOperation(expanded && (op.module === "sales" || op.module === "shifts") ? op.id : null);
  const queryClient = useQueryClient();
  const salesContext = () => ({ operation: op, role: forHead ? "head" : "accountant",
    detail: queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id)) ?? detailQ.data });
  const salesPolicy = getSalesActionPolicy(salesContext());
  const shiftPolicy = getShfReviewPolicy(op, forHead ? "head" : "accountant",
    queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id)) ?? detailQ.data);
  const headPolicy = getHeadReviewPolicy(op, forHead ? "head" : null,
    queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id)) ?? detailQ.data);
  const isPending = op.status === "pending";
  const isApproved = op.status === "approved";
  const isLocked = op.status === "final-approved";
  const isRejected = op.status === "rejected";
  return (
    <div className={`border-b border-gray-50 last:border-0
      ${op.match==="diff"?"border-r-4 border-r-red-400":op.match==="review"?"border-r-4 border-r-amber-400":""}
      ${isLocked?"bg-slate-50/50":isRejected?"opacity-60":""}
      ${expanded?"bg-purple-50/20":""}`}>
      <div className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={onToggle}>
        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{background:op.brandColor}}/>
        <div className="flex-shrink-0 text-left">
          <p className="text-[10px] font-bold text-gray-400" dir="ltr">{op.refNum}</p>
          <p className="text-[10px] text-gray-400">{op.date}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{op.branch}</span>
            <Badge className="bg-gray-100 text-gray-600 text-[10px]">{op.brandName}</Badge>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">{op.moduleLabel}</span>
            <Badge className={`text-[10px] border ${MATCH_CFG[op.match].cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${MATCH_CFG[op.match].dot}`}/>
              {t(MATCH_CFG[op.match].label, EN_MATCH_CD[op.match])}
            </Badge>
            {op.diff && <span className="text-[10px] text-red-600 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">⚠ {op.diff}</span>}
            <Badge className={`text-[10px] border ${STATUS_CFG[op.status].cls}`}>
              {isLocked && <Lock size={9}/>}
              {t(STATUS_CFG[op.status].label, EN_STATUS_CD[op.status].label)}
            </Badge>
            <COpStagePill op={op}/>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-gray-400">{op.submittedBy}</span>
            <span className="text-[11px] text-gray-400">⏰ {op.timeAgo}</span>
            <span className="text-[11px] text-gray-400 flex items-center gap-0.5"><Paperclip size={9}/> {op.attachments} {t("مرفق","attach.")}</span>
          </div>
          {/* Sales matching breakdown (T04 §8) — cash/card/apps + collected/variance */}
          {op.module==="sales" && (
            <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
              {op.salesBreakdown ? (<>
                <span className="text-gray-500">💵 {t("نقدي","Cash")}: <span className="font-mono text-gray-700">{fmt(op.salesBreakdown.cashHalalas/100)}</span></span>
                <span className="text-gray-500">🏦 {t("كارت","Card")}: <span className="font-mono text-gray-700">{fmt(op.salesBreakdown.cardHalalas/100)}</span></span>
                <span className="text-gray-500">🛵 {t("تطبيقات","Apps")}: <span className="font-mono text-gray-700">{fmt(op.salesBreakdown.appsHalalas/100)}</span></span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{t("محصّل","Collected")}: <span className="font-mono text-gray-700">{fmt(op.salesBreakdown.collectedHalalas/100)}</span></span>
                <span className={`font-mono font-bold ${op.salesBreakdown.varianceHalalas===0?"text-emerald-600":"text-red-600"}`}>
                  {op.salesBreakdown.varianceHalalas===0?"✓ 0":`${op.salesBreakdown.varianceHalalas>0?"+":""}${fmt(op.salesBreakdown.varianceHalalas/100)}`}
                </span>
              </>) : (
                <span className="text-gray-300">{t("لم تتم التسوية بعد — لا يوجد تفصيل","Not reconciled — no breakdown")} «—»</span>
              )}
            </div>
          )}
        </div>
        <div className="text-left flex-shrink-0">
          {op.amount != null && op.amount>0 && <p className="font-mono font-bold text-gray-800 text-sm">{fmt(op.amount)} {t("ر.س","SAR")}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e=>e.stopPropagation()}>
          {!forHead && isPending && (
            op.module === "expenses" ? (
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                {t("اعتماد المالك (EXP-06)","Owner approval (EXP-06)")}
              </span>
            ) : <>
              {(op.module !== "shifts" || shiftPolicy.approve) && <button onClick={onApprove} title={t("موافقة","Approve")} className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-all"><ThumbsUp size={13}/></button>}
              {(op.module === "shifts" ? shiftPolicy.returnToManager : salesPolicy.return) && <button onClick={op.module === "shifts" ? onReject : ()=>runSalesAction(salesContext, "return", onReject)} title={op.module === "shifts" ? t("إرجاع لمدير الفرع","Return to branch manager") : t("رفض","Reject")} className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center transition-all"><ThumbsDown size={13}/></button>}
            </>
          )}
          {forHead && isApproved && (
            op.module === "expenses" ? (
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                {t("اعتماد المالك (EXP-06)","Owner approval (EXP-06)")}
              </span>
            ) : <>
              {headPolicy.finalApprove && <button disabled={actionsPending} onClick={onApprove} title={t("اعتماد نهائي","Final Approve")} className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-all disabled:opacity-50"><ThumbsUp size={13}/></button>}
              {headPolicy.returnForReview && salesPolicy.return && <button disabled={actionsPending} onClick={()=>runSalesAction(salesContext, "return", onReject)} title={op.module === "shifts" ? t("إعادة للمحاسب للتعديل","Return to accountant for changes") : t("رفض","Reject")} className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center transition-all disabled:opacity-50"><ThumbsDown size={13}/></button>}
            </>
          )}
          {isLocked && <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg"><Lock size={11}/> {t("مُغلق","Locked")}</span>}
          <button
            type="button"
            className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-all"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? t("طي التفاصيل","Collapse details") : t("توسيع التفاصيل","Expand details")}
          >
            {expanded?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
          </button>
        </div>
      </div>
      {salesPolicy.pkg6 && <p className="px-5 pb-2 text-xs text-amber-700">{t(SALES_RETURN_HINT.ar, SALES_RETURN_HINT.en)}</p>}
      {forHead && headPolicy.blockedReason === "day_evidence_missing" && <p className="px-5 pb-2 text-xs text-amber-700">{t(HEAD_DAY_EVIDENCE_HINT.ar, HEAD_DAY_EVIDENCE_HINT.en)}</p>}
      {forHead && headPolicy.blockedReason === "expense_owner_decision_required" && <p className="px-5 pb-2 text-xs text-amber-700">{t("قرار اعتماد المصروف محجوز للمالك أو مدير العلامة التجارية وفق القاعدة EXP-06","Expense approval decision is reserved for the brand owner or manager per rule EXP-06")}</p>}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 space-y-4">
          {op.module==="sales" && <SalesReconPanel op={op} onApprove={onApprove} onReject={onReject} onClarify={onClarify} isPending={isPending} forHead={forHead}/>}
          {op.module==="shifts" && <ShiftOpPanel detail={detailQ.data} op={op} forHead={forHead} loading={detailQ.isLoading} error={detailQ.isError}/>}
          {op.module==="shifts" && !forHead && shiftPolicy.clarify && onClarify && <button onClick={onClarify} className="text-xs font-semibold text-purple-700 underline">{t("طلب إيضاح","Request clarification")}</button>}
          {op.module==="expenses" && (
            forHead ? (
              <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-semibold">{t("تفاصيل المصروف","Expense Details")}</p>
                <p className="text-[11px] text-amber-700 mt-1">{t("قرار اعتماد المصروف وصلاحية التحويل مخصصة لمالك المنشأة أو مدير العلامة التجارية وفق القاعدة EXP-06","Expense approval and asset conversion decisions are reserved for the Brand Owner/Manager per rule EXP-06")}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">{t("افتح البيان لعرض الفواتير كاملاً مع خيار التحويل إلى أصل ثابت","Open statement to view full invoices with asset conversion option")}</p>
            )
          )}
          {op.module==="purchases" && (
            <PurchaseMatchPanel op={op} isPending={isPending} forHead={forHead}
              onApprove={onApprove} onReject={onReject} onClarify={onClarify}/>
          )}
          {op.module==="inventory" && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-700 mb-2">{t("تفاصيل جرد المخزون","Inventory Count Details")} — {op.branch}</p>
              {Array.isArray((op as any).payload?.items) && (op as any).payload.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] text-gray-500 font-bold border-b border-gray-100">
                        <th className="px-3 py-2 text-right">{t("الصنف","Item")}</th>
                        <th className="px-3 py-2 text-center">{t("الوحدة","Unit")}</th>
                        <th className="px-3 py-2 text-center">{t("المتوقع","Expected")}</th>
                        <th className="px-3 py-2 text-center">{t("الفعلي","Actual")}</th>
                        <th className="px-3 py-2 text-center">{t("الفرق","Diff")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(op as any).payload.items.map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-medium text-gray-800">{it.name ?? it.itemName ?? "—"}</td>
                          <td className="px-3 py-2 text-center text-gray-500">{it.unit ?? "—"}</td>
                          <td className="px-3 py-2 text-center font-mono">{it.prev ?? it.expectedQty ?? "—"}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-gray-800">{it.curr ?? it.actualQty ?? "—"}</td>
                          <td className="px-3 py-2 text-center font-mono">{it.diff ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-3 text-center">{t("تفاصيل جرد المخزون غير متاحة لهذه العملية في السجل الحالي","Inventory count details are not available for this operation in current record")}</p>
              )}
            </div>
          )}
          {(op.module!=="sales"&&op.module!=="shifts"&&op.module!=="expenses"&&op.module!=="purchases"&&op.module!=="inventory") && (
            <p className="text-xs text-gray-400 text-center">{t("انقر على زر العرض للتفاصيل الكاملة","Click view for full details")}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// COMPANY ADMIN PAGES
// ═══════════════════════════════════════════════════
function CADashboard({ navigate }:{ navigate:(p:string)=>void }) {
  const { t, dir, lang } = useCLang();
  const { data: apiDashboard } = useCompanyAdminDashboard();
  const { data: apiSub } = useCompanySubscription();
  // All figures come from GET /company/me/dashboard + /subscription. No static fallback.
  const apiKpis = (apiDashboard?.kpis ?? {}) as Record<string, number | string>;
  const apiTotals = (apiDashboard?.totals ?? {}) as Record<string, number>;
  const apiBrands = Array.isArray(apiDashboard?.brands) ? apiDashboard!.brands! : [];
  const totalSalesM = (apiKpis.totalSalesHalalas as number | undefined) != null
    ? Math.round(((apiKpis.totalSalesHalalas as number) / 100))
    : 0;
  const totalExpM   = (apiKpis.totalExpensesHalalas as number | undefined) != null
    ? Math.round(((apiKpis.totalExpensesHalalas as number) / 100))
    : 0;
  const brandsCount      = apiTotals.brandsCount      ?? apiBrands.length;
  const restaurantsCount = apiTotals.restaurantsCount ?? apiBrands.reduce((s,b)=>s+(b.restaurantsCount ?? 0),0);
  const branchesCount    = apiTotals.branchesCount    ?? apiBrands.reduce((s,b)=>s+(b.branchesCount ?? 0),0);
  const usersCount       = apiTotals.usersCount       ?? 0;
  const usage = (apiSub?.usage ?? {}) as Record<string, { used: number; max: number | null }>;
  const branchesMax = usage.branches?.max ?? 0;
  const usersMax    = usage.users?.max    ?? 0;
  const planPrice   = Math.round((((apiSub as any)?.priceHalalas as number) ?? 0) / 100);
  const daysRemaining = apiSub?.daysRemaining ?? 0;
  const branchCompletionRate = (apiKpis.branchCompletionRate as number | undefined) ?? 0;
  const branchesAboveTarget  = (apiKpis.branchesAboveTarget  as number | undefined) ?? 0;
  const statItems:[string,string,string,string][] = [
    [t("العلامات","Brands"),       `${brandsCount} / ∞`,"",""],
    [t("المطاعم","Restaurants"),   `${restaurantsCount} / ∞`,"",""],
    [t("الفروع","Branches"),        formatQuota(branchesCount, branchesMax, lang).label,"",""],
    [t("المستخدمون","Users"),       formatQuota(usersCount, usersMax, lang).label,"",""],
  ];
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("مرحباً،","Welcome,")} {apiDashboard?.company?.name ?? COMPANY.name} 🏢</h2>
          <p className="text-gray-400 text-sm mt-0.5">{t("خطة","Plan")} {t(PLAN_AR[(apiDashboard?.company?.plan ?? COMPANY.plan)]||(apiDashboard?.company?.plan ?? COMPANY.plan), (apiDashboard?.company?.plan ?? COMPANY.plan))} · {branchesCount} {t("فرع","branches")} · {brandsCount} {t("علامات تجارية","brands")}</p>
        </div>
        <button onClick={()=>navigate("ca-subscription")} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 shadow-sm">
          <CreditCard size={14}/> {t("إدارة الاشتراك","Manage Subscription")}
        </button>
      </div>
      <div className="bg-gradient-to-l from-purple-600 to-blue-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-bold text-lg">{apiSub?.planName || (apiDashboard?.company?.plan ? t(PLAN_AR[apiDashboard.company.plan]||apiDashboard.company.plan, apiDashboard.company.plan) : t("الخطة الحالية","Current Plan"))} — {t("نشطة ✅","Active ✅")}</p>
            <p className="text-white/70 text-sm mt-0.5">{((apiSub as any)?.expiresAt || apiSub?.currentPeriodEnd) ? t(`ينتهي في ${String((apiSub as any)?.expiresAt || apiSub?.currentPeriodEnd).slice(0,10)} · متبقي `, `Expires ${String((apiSub as any)?.expiresAt || apiSub?.currentPeriodEnd).slice(0,10)} · `) : t("متبقي ", "Remaining ")}<span className="text-cyan-300 font-bold">{daysRemaining}</span> {t("يوم","days remaining")}</p>
            <div className="flex items-center gap-6 mt-3 flex-wrap">
              {statItems.map(([l,v])=>(
                <div key={l}><p className="text-white/50 text-xs">{l}</p><p className="font-bold">{v}</p></div>
              ))}
            </div>
          </div>
          <div className={dir==="ltr"?"text-left":"text-right"}>
            <p className="text-3xl font-black">{fmt(planPrice)} <span className="text-base font-normal text-white/60">{t("ر.س/سنة","SAR/year")}</span></p>
            <button onClick={()=>navigate("ca-subscription")} className="mt-2 px-4 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/30">{t("ترقية الخطة ↑","Upgrade Plan ↑")}</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label={t("إجمالي المبيعات الشهرية","Monthly Total Sales")} value={`${fmt(Math.round(totalSalesM/1000))}K`} sub={t("ر.س هذا الشهر","SAR this month")} icon={<TrendingUp size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("إجمالي المصروفات","Total Expenses")}            value={`${fmt(Math.round(totalExpM/1000))}K`}   sub={t("ر.س هذا الشهر","SAR this month")} icon={<Wallet size={18} className="text-red-500"/>}      accent="red"/>
        <KpiCard label={t("صافي الربح","Net Profit")}                       value={`${fmt(Math.round((totalSalesM-totalExpM)/1000))}K`} sub={t("ر.س","SAR")} icon={<BarChart3 size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("معدل إنجاز الفروع","Branch Completion Rate")}    value={`${branchCompletionRate}%`} sub={t(`${branchesAboveTarget} من ${branchesCount} فرع فوق الهدف`,`${branchesAboveTarget} of ${branchesCount} branches above target`)} icon={<CheckCircle2 size={18} className="text-blue-600"/>} accent="blue"/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {apiBrands.length===0 && (
          <div className="col-span-1 md:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">{t("لا توجد بيانات علامات تجارية بعد","No brand data yet")}</div>
        )}
        {apiBrands.map(b=>{
          const sales=Math.round((b.monthlySalesHalalas ?? 0)/100);
          const target=Math.round((b.monthlyTargetHalalas ?? 0)/100);
          const pct=target>0?Math.round((sales/target)*100):0;
          const color=b.color ?? "#7C3AED";
          return (
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{background:color}}>{b.abbr}</div>
                <div><p className="font-bold text-gray-800 text-sm">{b.name}</p><p className="text-[10px] text-gray-400">{b.branchesCount ?? 0} {t("فروع","branches")}</p></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{t("المبيعات vs الهدف","Sales vs Target")}</span><span>{pct}%</span></div>
              <div className="w-full h-2 bg-gray-100 rounded-full mb-2"><div className="h-2 rounded-full" style={{width:`${Math.min(100,pct)}%`,background:color}}/></div>
              <div className="flex justify-between text-[11px]"><span className="text-gray-500">{fmt(sales)} {t("ر.س","SAR")}</span><span className="text-gray-400">{t("هدف:","Target:")} {fmt(target)}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CASubscription() {
  const { t, dir, lang } = useCLang();
  const upgradeMut = useUpgradeSubscription();
  const contactMut = useContactSales();
  const { data: apiSub } = useCompanySubscription();
  const { data: apiPlans = [] } = useCompanyPlans();
  const [billing,setBilling]=useState<"annual"|"monthly">("annual");
  // Driven by GET /company/plans. No static fallback.
  const plans = apiPlans.map(p => ({
    id: p.id,
    plan: p.name,
    price_m: p.priceMonthlyHalalas != null ? Math.round(p.priceMonthlyHalalas / 100) : null,
    price_a: p.priceAnnualHalalas  != null ? Math.round(p.priceAnnualHalalas  / 100) : null,
    features: p.features ?? [],
    current: p.isCurrent ?? false,
  }));
  const usage = (apiSub?.usage ?? {}) as Record<string, { used: number; max: number | null }>;
  const branchesUsed = usage.branches?.used ?? 0;
  const branchesMax  = usage.branches?.max  ?? 0;
  const usersUsed    = usage.users?.used    ?? 0;
  const usersMax     = usage.users?.max     ?? 0;
  // T14.4 — storage quota is now `usage.storage {used, max(GB)}` (max null = unlimited).
  // Fall back to the legacy `storageGB` key for older payloads.
  const storageMeter = usage.storage ?? usage.storageGB;
  const storageUsed  = storageMeter?.used ?? 0;
  const storageMax   = storageMeter?.max ?? null; // null → unlimited («∞»)
  const currentPlanName = apiSub?.planName ?? "Professional";
  const currentPlan = apiPlans.find(p => p.isCurrent);
  const currentPriceAnnualObj = formatPlanPrice(currentPlan?.priceAnnualHalalas, lang);
  const currentPriceMonthlyObj = formatPlanPrice(currentPlan?.priceMonthlyHalalas, lang);
  const currentPlanPriceAnnual = currentPriceAnnualObj.formatted;
  const currentPlanPriceMonthly = currentPriceMonthlyObj.formatted;
  const SAR = t("ر.س","SAR");
  const perYear = t("سنة","year"); const perMonth = t("شهر","mo");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الاشتراك والخطة","Subscription & Plan")}</h2></div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(["annual","monthly"] as const).map(b=>(
            <button key={b} onClick={()=>setBilling(b)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${billing===b?"bg-white text-gray-800 shadow-sm":"text-gray-500"}`}>
              {b==="annual"?t("سنوي (وفّر 17%)","Annual (save 17%)"):t("شهري","Monthly")}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-l from-purple-600 to-blue-700 text-white flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2"><span className="font-black text-xl">{t(PLAN_AR[currentPlanName]||currentPlanName, currentPlanName)}</span><Badge className="bg-white/20 text-white text-[10px]">{t("الخطة الحالية","Current Plan")}</Badge></div>
            <p className="text-white/70 text-xs mt-0.5">{((apiSub as any)?.expiresAt || apiSub?.currentPeriodEnd) ? t(`ينتهي في ${String((apiSub as any)?.expiresAt || apiSub?.currentPeriodEnd).slice(0,10)}`, `Expires ${String((apiSub as any)?.expiresAt || apiSub?.currentPeriodEnd).slice(0,10)}`) : t("تجديد سنوي تلقائي","Annual auto-renew")}</p>
          </div>
          <p className="text-2xl font-black">
            {billing==="annual"?currentPlanPriceAnnual:currentPlanPriceMonthly}
            {(!currentPriceAnnualObj.isCustom && !currentPriceMonthlyObj.isCustom) && (
              <span className="text-sm font-normal text-white/60"> {SAR}/{billing==="annual"?perYear:perMonth}</span>
            )}
          </p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {([[t("الفروع","Branches"),branchesUsed,branchesMax,"bg-blue-500"],[t("المستخدمون","Users"),usersUsed,usersMax,"bg-purple-500"],[t("التخزين (GB)","Storage (GB)"),storageUsed,storageMax,"bg-emerald-500"]] as [string,number,number|null,string][]).map(([l,u,m,c])=>{
            const unlimited = m === null || m === undefined;   // T14.4 — unlimited plan → «/∞»
            const pct = unlimited || Number(m) <= 0 ? 0 : Math.min(100, Math.round((Number(u)/Number(m))*100));
            return (
            <div key={String(l)}><div className="flex justify-between mb-1.5 text-xs font-semibold text-gray-600"><span>{l}</span><span>{u}/{unlimited?"∞":m}</span></div><div className="w-full h-2 bg-gray-100 rounded-full"><div className={`h-2 rounded-full ${c}`} style={{width:`${pct}%`}}/></div></div>
          );})}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {plans.map(p=>(
          <div key={p.id} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${p.current?"border-purple-400 shadow-purple-100":"border-gray-100"}`}>
            {p.current&&<div className="px-4 py-1.5 text-center text-xs font-bold bg-purple-600 text-white">⭐ {t("خطتك الحالية","Your Current Plan")}</div>}
            <div className="p-5">
              <p className="font-black text-gray-900 text-lg">{t(PLAN_AR[p.plan]||p.plan, p.plan)}</p>
              <div className="mt-2 mb-4">
                {p.price_m === null || p.price_a === null ? (
                  <p className="text-2xl font-black text-gray-800">{t("حسب الطلب","Custom")}</p>
                ) : (
                  <>
                    <span className="text-2xl font-black text-gray-800">
                      {billing === "annual" ? (p.price_a != null ? p.price_a.toLocaleString() : "—") : (p.price_m != null ? p.price_m.toLocaleString() : "—")}
                    </span>
                    <span className="text-gray-400 text-sm"> {SAR}/{billing==="annual"?perYear:perMonth}</span>
                  </>
                )}
              </div>
              <ul className="space-y-1.5 mb-5">{p.features.map(f=><li key={f} className="flex items-center gap-2 text-xs text-gray-600"><Check size={11} className="text-emerald-500 flex-shrink-0"/>{f}</li>)}</ul>
              {p.current?<div className="w-full py-2 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold text-center">{t("خطتك الحالية ✓","Your Current Plan ✓")}</div>:p.price_m===null?<button onClick={()=>contactMut.mutate({ message: t("استفسار عن خطة المؤسسات","Enterprise plan inquiry") })} className="w-full py-2 rounded-lg border-2 border-purple-300 text-purple-700 text-xs font-bold hover:bg-purple-50">{t("تواصل مع المبيعات","Contact Sales")}</button>:<button onClick={()=>upgradeMut.mutate({ planId: p.id, billingCycle: billing })} className="w-full py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700">{t("ترقية ↑","Upgrade ↑")}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CAUsers() {
  const { t, dir, lang } = useCLang();
  type U = { id:string;name:string;role:string;branch:string;email:string;status:"active"|"inactive";last:string };
  const { data: apiUsers = [] } = useCompanyUsers();
  const { data: apiInvites = [] } = useCompanyInvitations();
  const toggleMut = useToggleCompanyUserStatus();
  const inviteMut = useCreateCompanyInvitation();
  const updateUserMut = useUpdateCompanyUser();
  const resendInviteMut = useResendCompanyInvitation();  // T14.2 — re-email + extend expiry
  const revokeInviteMut = useRevokeCompanyInvitation();
  // T14.2 — pending invitations are email-only; no token is exposed by the API.
  const pendingInvites = (apiInvites as any[]).filter(i=>i.status==="pending");
  const ROLE_AR: Record<string,string> = { head:"رئيس الحسابات", accountant:"محاسب", branch:"مدير فرع", procurement:"مدير مشتريات" };
  // Driven by GET /company/me/users. No static seed.
  const [localUsers,setLocalUsers]=useState<U[]>([]);
  const users: U[] = apiUsers.map((u): U => ({
    id: u.id,
    name: u.name,
    role: u.roleLabel || u.roleKey,
    branch: u.branchName || "—",
    email: u.email,
    status: u.status === "active" ? "active" : "inactive",
    last: u.lastActiveAt || "",
  }));
  const { data: brandLookup = [] } = useLookup("brands");
  const { data: branchLookup = [] } = useLookup("branches");
  const [showAdd,setShowAdd]=useState(false);
  const [search,setSearch]=useState("");
  const [inviteForm,setInviteForm]=useState<{
    name: string;
    email: string;
    roleKey: "company-admin" | "head" | "accountant" | "branch" | "procurement";
    brandId: string;
    branchId: string;
  }>({ name:"", email:"", roleKey:"accountant", brandId:"", branchId:"" });
  // CA-F08 — Edit User controlled state & validation
  const [editingUser, setEditingUser] = useState<U | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserPhone, setEditUserPhone] = useState("");
  const [editUserError, setEditUserError] = useState<string | null>(null);

  const isInviteValid = Boolean(
    inviteForm.email.trim() &&
    inviteForm.roleKey &&
    (inviteForm.roleKey !== "accountant" || inviteForm.brandId) &&
    (inviteForm.roleKey !== "branch" || inviteForm.branchId)
  );

  const submitInvite=()=>{
    if(!isInviteValid)return;
    inviteMut.mutate(
      {
        name: inviteForm.name.trim() || undefined,
        email: inviteForm.email.trim(),
        roleKey: inviteForm.roleKey,
        brandId: inviteForm.roleKey === "accountant" ? inviteForm.brandId : undefined,
        branchId: inviteForm.roleKey === "branch" ? inviteForm.branchId : undefined,
      },
      {
        onSuccess: ()=>{
          setShowAdd(false);
          setInviteForm({ name:"", email:"", roleKey:"accountant", brandId:"", branchId:"" });
        },
      },
    );
  };
  const toggle=(id:string)=>{
    if (toggleMut.isPending) return;
    if (apiUsers.length > 0) {
      toggleMut.mutate(id);
    } else {
      setLocalUsers(p=>p.map(u=>u.id===id?{...u,status:u.status==="active"?"inactive":"active"}:u));
    }
  };
  const shown=users.filter(u=>!search||u.name.includes(search)||u.role.includes(search));
  const RB:Record<string,string>={"رئيس الحسابات":"bg-blue-50 text-blue-700 border border-blue-100","محاسب":"bg-purple-50 text-purple-700 border border-purple-100","مدير فرع":"bg-emerald-50 text-emerald-700 border border-emerald-100","مدير مشتريات":"bg-amber-50 text-amber-700 border border-amber-100"};
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("إدارة المستخدمين","User Management")}</h2>
          <p className="text-gray-400 text-sm">{users.filter(u=>u.status==="active").length} {t("نشط","active")} · {users.length} {t("مستخدم","users")}</p>
        </div>
        <Btn variant="primary" onClick={()=>setShowAdd(true)}><Plus size={13}/> {t("إضافة مستخدم","Add User")}</Btn>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"><div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2"><Search size={13} className="text-gray-400"/><input aria-label={t("البحث عن المستخدمين بالاسم أو الدور","Search company users by name or role")} value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("بحث...","Search...")} className="flex-1 text-sm outline-none"/></div></div>
      {pendingInvites.length>0&&(
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center gap-2"><Send size={13} className="text-amber-600"/><span className="text-xs font-bold text-amber-700">{t("دعوات معلّقة","Pending Invitations")} — {pendingInvites.length}</span></div>
          {pendingInvites.map((inv:any)=>(
            <div key={inv.id} className="px-5 py-3 flex items-center gap-4 border-b border-gray-50 last:border-0">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0"><Send size={14}/></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-semibold text-gray-800" dir="ltr">{inv.email}</span><Badge className="bg-purple-50 text-purple-700 text-[10px]">{ROLE_AR[inv.roleKey]||inv.roleKey}</Badge></div>
                <p className="text-[10px] text-gray-400 mt-0.5">{t("بانتظار القبول","Awaiting acceptance")}{inv.expiresAt&&` · ${t("تنتهي","expires")} ${String(inv.expiresAt).slice(0,10)}`}</p>
              </div>
              <button onClick={()=>resendInviteMut.mutate(inv.id)} disabled={resendInviteMut.isPending} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 flex items-center gap-1"><RefreshCw size={11}/> {t("إعادة إرسال","Resend")}</button>
              <button onClick={()=>{ if(window.confirm(t("إلغاء الدعوة؟","Revoke invitation?"))) revokeInviteMut.mutate(inv.id); }} disabled={revokeInviteMut.isPending} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-gray-50 border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600">{t("إلغاء","Revoke")}</button>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {shown.map(u=>(
          <div key={u.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{u.name[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-gray-800 text-sm">{u.name}</span><Badge className={`${RB[u.role]||"bg-gray-50 text-gray-600"} text-[10px]`}>{u.role}</Badge><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${u.status==="active"?"bg-emerald-50 text-emerald-700":"bg-gray-100 text-gray-400"}`}>{u.status==="active"?`● ${t("نشط","Active")}`:` ○ ${t("غير نشط","Inactive")}`}</span></div>
              <div className="flex gap-3 mt-0.5"><p className="text-xs text-gray-400" dir="ltr">{u.email}</p>{u.branch!=="—"&&<span className="text-[10px] text-gray-500">{u.branch}</span>}</div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={()=>toggle(u.id)}
                disabled={toggleMut.isPending}
                aria-label={u.status==="active"?t("إيقاف المستخدم","Disable user"):t("تفعيل المستخدم","Enable user")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-50 ${u.status==="active"?"bg-gray-50 border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600":"bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                {u.status==="active"?t("إيقاف","Disable"):t("تفعيل","Enable")}
              </button>
              <button
                onClick={()=>{
                  setEditingUser(u);
                  setEditUserName(u.name);
                  setEditUserPhone((u as any).phone || "");
                  setEditUserError(null);
                }}
                aria-label={t("تعديل بيانات المستخدم","Edit user details")}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Edit2 size={13}/>
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* CA-F08: Edit User Modal */}
      {editingUser&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>!updateUserMut.isPending&&setEditingUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e=>e.stopPropagation()} dir={dir} role="dialog" aria-modal="true" aria-label={t("تعديل بيانات المستخدم","Edit User")}>
            <div className="px-5 py-4 bg-purple-600 text-white flex items-center justify-between">
              <h3 className="font-bold">{t("تعديل بيانات المستخدم","Edit User")}</h3>
              <button onClick={()=>!updateUserMut.isPending&&setEditingUser(null)} disabled={updateUserMut.isPending} className="text-purple-200 hover:text-white" aria-label={t("إغلاق","Close")}><X size={18}/></button>
            </div>
            <div className="p-5 space-y-3">
              {editUserError&&(
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0"/>
                  <span>{editUserError}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("الاسم الكامل","Full Name")}</label>
                <input
                  value={editUserName}
                  onChange={e=>{ setEditUserName(e.target.value); if(editUserError) setEditUserError(null); }}
                  disabled={updateUserMut.isPending}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("رقم الهاتف (اختياري)","Phone Number (optional)")}</label>
                <input
                  value={editUserPhone}
                  onChange={e=>setEditUserPhone(e.target.value)}
                  disabled={updateUserMut.isPending}
                  dir="ltr"
                  placeholder="05xxxxxxxx"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 disabled:opacity-50"
                />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between"><span>{t("البريد الإلكتروني:","Email:")}</span><span dir="ltr" className="font-medium text-gray-700">{editingUser.email}</span></div>
                <div className="flex justify-between"><span>{t("الدور الحالي:","Current Role:")}</span><span className="font-medium text-gray-700">{editingUser.role}</span></div>
                {editingUser.branch!=="—"&&<div className="flex justify-between"><span>{t("الفرع:","Branch:")}</span><span className="font-medium text-gray-700">{editingUser.branch}</span></div>}
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Btn onClick={()=>setEditingUser(null)} disabled={updateUserMut.isPending}>{t("إلغاء","Cancel")}</Btn>
                <Btn
                  variant="primary"
                  disabled={updateUserMut.isPending}
                  onClick={()=>{
                    const validation = validateUserEdit({ id: editingUser.id, name: editUserName, phone: editUserPhone }, lang);
                    if(!validation.valid||!validation.payload){
                      setEditUserError(validation.error||t("بيانات غير صحيحة","Invalid data"));
                      return;
                    }
                    updateUserMut.mutate(
                      { id: editingUser.id, name: validation.payload.name, phone: validation.payload.phone } as any,
                      {
                        onSuccess: ()=>{
                          setEditingUser(null);
                          setEditUserError(null);
                        },
                        onError: (err)=>{
                          setEditUserError(getErrorMessage(err)||t("فشل تحديث بيانات المستخدم","Failed to update user"));
                        },
                      }
                    );
                  }}
                >
                  {updateUserMut.isPending ? <RefreshCw size={13} className="animate-spin"/> : <Check size={13}/>} {t("حفظ التعديلات","Save Changes")}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAdd&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e=>e.stopPropagation()} dir={dir} role="dialog" aria-modal="true" aria-label={t("إضافة مستخدم","Add User")}>
            <div className="px-5 py-4 bg-purple-600 text-white flex items-center justify-between"><h3 className="font-bold">{t("إضافة مستخدم","Add User")}</h3><button onClick={()=>setShowAdd(false)} className="text-purple-200 hover:text-white" aria-label={t("إغلاق","Close")}><X size={18}/></button></div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الاسم الكامل","Full Name")}</label><input value={inviteForm.name} onChange={e=>setInviteForm(f=>({...f,name:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("البريد الإلكتروني","Email")}</label><input value={inviteForm.email} onChange={e=>setInviteForm(f=>({...f,email:e.target.value}))} dir="ltr" placeholder="email@company.sa" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("الدور","Role")}</label>
                <select
                  value={inviteForm.roleKey}
                  onChange={e=>setInviteForm(f=>({...f,roleKey:e.target.value as any,brandId:"",branchId:""}))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"
                >
                  <option value="head">{t("رئيس الحسابات","Head Accountant")}</option>
                  <option value="accountant">{t("محاسب","Accountant")}</option>
                  <option value="branch">{t("مدير فرع","Branch Manager")}</option>
                  <option value="procurement">{t("مدير مشتريات","Procurement Manager")}</option>
                  <option value="company-admin">{t("مدير منشأة","Company Admin")}</option>
                </select>
              </div>
              {inviteForm.roleKey === "accountant" && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">{t("العلامة التجارية (مطلوب)","Brand (required)")}</label>
                  <select
                    value={inviteForm.brandId}
                    onChange={e=>setInviteForm(f=>({...f,brandId:e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"
                  >
                    <option value="">{t("اختر العلامة التجارية...","Select brand...")}</option>
                    {(brandLookup as any[]).map((b: any)=>(
                      <option key={b.id} value={b.id}>{b.nameAr || b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {inviteForm.roleKey === "branch" && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">{t("الفرع (مطلوب)","Branch (required)")}</label>
                  <select
                    value={inviteForm.branchId}
                    onChange={e=>setInviteForm(f=>({...f,branchId:e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"
                  >
                    <option value="">{t("اختر الفرع...","Select branch...")}</option>
                    {(branchLookup as any[]).map((br: any)=>(
                      <option key={br.id} value={br.id}>{br.nameAr || br.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-[11px] text-blue-700">{t("يُرسَل رابط الدعوة إلى بريد المدعوّ مباشرةً.","An invitation link is emailed directly to the invitee.")}</div>
              <div className="flex gap-2 justify-end">
                <Btn onClick={()=>setShowAdd(false)}>{t("إلغاء","Cancel")}</Btn>
                <Btn variant="primary" onClick={submitInvite} disabled={!isInviteValid||inviteMut.isPending}>
                  <Send size={13}/> {t("إرسال دعوة","Send Invite")}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CABranches() {
  const { t, dir, lang } = useCLang();
  const { data: apiBrandsTree = [] } = useCompanyBrands();
  const { data: members = [] } = useCompanyUsers();
  const createBranchMut = useCreateBranch();
  const transferMut = useTransferBranchManager();
  // Brand → restaurant → branch tree driven entirely by GET /company/me/brands.
  type BTBranch = { id:string; name:string; city:string; mgr:string; mgrUserId?:string; salesM:number; target:number; reviewStatus?:string };
  type BTRest = { id:string; name:string; branches:BTBranch[] };
  type BTBrand = { id:string; name:string; abbr:string; color:string; restaurants:BTRest[] };
  const brandsTree: BTBrand[] = (apiBrandsTree as any[]).map((b:any)=>({
    id: b.id, name: b.name, abbr: b.abbr ?? (b.name ?? "؟").toString().slice(0,2), color: b.color ?? "#7C3AED",
    restaurants: (b.restaurants ?? []).map((r:any):BTRest=>({
      id: r.id, name: r.name,
      branches: (r.branches ?? []).map((br:any):BTBranch=>({
        id: br.id, name: br.name, city: br.city ?? "", mgr: br.managerName ?? "—", mgrUserId: br.managerUserId,
        salesM: Math.round((br.monthlySalesHalalas ?? 0)/100),
        target: Math.round((br.monthlyTargetHalalas ?? 0)/100),
        reviewStatus: br.reviewStatus, // T14.1 — pending_review | approved | rejected
      })),
    })),
  }));
  const allBranchesTree: BTBranch[] = brandsTree.flatMap(b=>b.restaurants.flatMap(r=>r.branches));
  const activeBranchesCount = allBranchesTree.filter(b=>b.reviewStatus!=="pending_review"&&b.reviewStatus!=="rejected").length;
  const pendingCount = allBranchesTree.filter(b=>b.reviewStatus==="pending_review").length;
  const [expandedBrand,setExpandedBrand]=useState<string>("");
  const totalSales=allBranchesTree.reduce((s:number,b:any)=>s+b.salesM,0);
  const [showAddBranch,setShowAddBranch]=useState(false);
  const [newBranchName,setNewBranchName]=useState("");
  const [newBranchBrandId,setNewBranchBrandId]=useState("");
  const [newBranchRestId,setNewBranchRestId]=useState("");
  const [newBranchCity,setNewBranchCity]=useState("الرياض");
  const [branchFormError,setBranchFormError]=useState<string|null>(null);

  const selectedBrand = brandsTree.find(b=>b.id===newBranchBrandId);
  const availableRestaurants = selectedBrand?.restaurants ?? [];

  // T14.6 — transfer-manager modal state.
  const [transferFor,setTransferFor]=useState<{id:string;name:string}|null>(null);
  const [newMgrUserId,setNewMgrUserId]=useState("");
  const submitTransfer=()=>{
    if(!transferFor||!newMgrUserId)return;
    transferMut.mutate({ id: transferFor.id, newManagerUserId: newMgrUserId } as any,
      { onSuccess: ()=>{ setTransferFor(null); setNewMgrUserId(""); } });
  };
  // T14.1 — per-branch review badge.
  const reviewBadge=(rs?:string)=> rs==="pending_review"
    ? <Badge className="bg-amber-50 text-amber-700 text-[9px]">{t("قيد المراجعة","Pending review")}</Badge>
    : rs==="rejected"
    ? <Badge className="bg-red-50 text-red-700 text-[9px]">{t("مرفوض","Rejected")}</Badge>
    : null;

  const submitNewBranch = () => {
    const val = validateBranchCreate({ restaurantId: newBranchRestId, name: newBranchName, city: newBranchCity }, lang);
    if (!val.valid) {
      setBranchFormError(val.error || t("بيانات غير مكتملة", "Incomplete data"));
      return;
    }
    createBranchMut.mutate(
      { restaurantId: newBranchRestId, name: newBranchName.trim(), city: newBranchCity },
      {
        onSuccess: () => {
          setShowAddBranch(false);
          setNewBranchName("");
          setNewBranchBrandId("");
          setNewBranchRestId("");
          setBranchFormError(null);
        },
        onError: (err) => {
          setBranchFormError(getErrorMessage(err) || t("فشل إرسال طلب إنشاء الفرع", "Failed to submit branch request"));
        },
      }
    );
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("العلامات التجارية والفروع","Brands & Branches")}</h2><p className="text-gray-400 text-sm">{brandsTree.length} {t("علامات","brands")} · {allBranchesTree.length} {t("فرع","branches")}{pendingCount>0&&<span className="text-amber-600"> · {pendingCount} {t("قيد المراجعة","pending review")}</span>}</p></div>
        <Btn variant="primary" onClick={()=>{ setShowAddBranch(true); setBranchFormError(null); }}><Plus size={13}/> {t("إضافة فرع","Add Branch")}</Btn>
      </div>
      {showAddBranch&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>!createBranchMut.isPending&&setShowAddBranch(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir} role="dialog" aria-modal="true" aria-label={t("إضافة فرع جديد","Add New Branch")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{t("إضافة فرع جديد","Add New Branch")}</h3>
              <button onClick={()=>!createBranchMut.isPending&&setShowAddBranch(false)} disabled={createBranchMut.isPending} className="text-gray-400 hover:text-gray-600" aria-label={t("إغلاق","Close")}><X size={18}/></button>
            </div>
            <div className="space-y-3">
              {branchFormError&&(
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0"/>
                  <span>{branchFormError}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("العلامة التجارية","Brand")}</label>
                <select
                  value={newBranchBrandId}
                  onChange={e=>{ setNewBranchBrandId(e.target.value); setNewBranchRestId(""); if(branchFormError) setBranchFormError(null); }}
                  disabled={createBranchMut.isPending}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 disabled:opacity-50"
                >
                  <option value="">{t("اختر علامة تجارية","Select brand")}</option>
                  {brandsTree.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("المطعم التابع له","Restaurant")}</label>
                <select
                  value={newBranchRestId}
                  onChange={e=>{ setNewBranchRestId(e.target.value); if(branchFormError) setBranchFormError(null); }}
                  disabled={!newBranchBrandId||createBranchMut.isPending}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 disabled:opacity-50"
                >
                  <option value="">{t("اختر مطعماً","Select restaurant")}</option>
                  {availableRestaurants.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم الفرع","Branch Name")}</label>
                <input
                  value={newBranchName}
                  onChange={e=>{ setNewBranchName(e.target.value); if(branchFormError) setBranchFormError(null); }}
                  disabled={createBranchMut.isPending}
                  placeholder={t("مثال: فرع حي الياسمين...","e.g. Al-Yasmin district branch...")}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{t("المدينة","City")}</label>
                <select
                  value={newBranchCity}
                  onChange={e=>setNewBranchCity(e.target.value)}
                  disabled={createBranchMut.isPending}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 disabled:opacity-50"
                >
                  <option>الرياض</option><option>جدة</option><option>الدمام</option><option>مكة المكرمة</option>
                </select>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-[11px] text-amber-700">{t("يُنشأ الفرع كطلب قيد المراجعة، ويظهر بعد اعتماد الإدارة.","The branch is created as a pending request and appears after admin approval.")}</div>
              <div className="flex gap-2 justify-end pt-1">
                <Btn onClick={()=>setShowAddBranch(false)} disabled={createBranchMut.isPending}>{t("إلغاء","Cancel")}</Btn>
                <Btn variant="primary" onClick={submitNewBranch} disabled={createBranchMut.isPending}>
                  {createBranchMut.isPending ? <RefreshCw size={13} className="animate-spin"/> : <Plus size={13}/>} {t("إرسال للمراجعة","Submit for review")}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* T14.6 — transfer branch manager to another active company member. */}
      {transferFor&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setTransferFor(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir} role="dialog" aria-modal="true" aria-label={t("نقل مدير الفرع","Transfer Branch Manager")}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{t("نقل مدير الفرع","Transfer Branch Manager")} — {transferFor.name}</h3><button onClick={()=>setTransferFor(null)} className="text-gray-400 hover:text-gray-600" aria-label={t("إغلاق","Close")}><X size={18}/></button></div>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("المدير الجديد","New Manager")}</label>
                <select value={newMgrUserId} onChange={e=>setNewMgrUserId(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400">
                  <option value="">{t("— اختر عضواً —","— Select a member —")}</option>
                  {(members as any[]).filter(m=>m.status==="active").map((m:any)=><option key={m.id} value={m.id}>{m.name} · {m.roleLabel||m.roleKey}</option>)}
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-[11px] text-blue-700">{t("يجب أن يكون المدير الجديد عضواً نشطاً في الشركة؛ سيُنقل نطاق بياناته للفرع.","The new manager must be an active company member; their data scope moves to this branch.")}</div>
              <div className="flex gap-2 justify-end pt-1"><Btn onClick={()=>setTransferFor(null)}>{t("إلغاء","Cancel")}</Btn><Btn variant="primary" onClick={submitTransfer} disabled={!newMgrUserId||transferMut.isPending}><ArrowLeftRight size={13}/> {t("نقل","Transfer")}</Btn></div>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label={t("العلامات التجارية","Brands")}           value={String(brandsTree.length)} sub={t("تحت إدارة المجموعة","Under group management")} icon={<Star size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("إجمالي المطاعم","Total Restaurants")}  value={String(brandsTree.reduce((s,b)=>s+b.restaurants.length,0))} sub={t("مطعم","restaurant")} icon={<Home size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("الفروع النشطة","Active Branches")}     value={String(activeBranchesCount)} sub={pendingCount>0?`+${pendingCount} ${t("قيد المراجعة","pending")}`:t("فرع","branches")} icon={<Building2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("إجمالي مبيعات شهرية","Monthly Sales")} value={`${fmt(Math.round(totalSales/1000))}K`} sub={t("ر.س","SAR")} icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
      </div>
      <div className="space-y-3">
        {brandsTree.length===0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">{t("لا توجد علامات تجارية بعد","No brands yet")}</div>
        )}
        {brandsTree.map(brand=>(
          <div key={brand.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50" onClick={()=>setExpandedBrand(expandedBrand===brand.id?"":brand.id)}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{background:brand.color}}>{brand.abbr}</div>
              <div className={`flex-1 ${dir==="rtl"?"text-right":"text-left"}`}><p className="font-bold text-gray-800">{brand.name}</p><p className="text-xs text-gray-400">{brand.restaurants.length} {t("مطاعم","restaurants")} · {brand.restaurants.flatMap((r:any)=>r.branches).length} {t("فروع","branches")}</p></div>
              <div className={dir==="rtl"?"text-left":"text-right"}><p className="font-mono font-bold text-gray-800 text-sm">{fmt(brand.restaurants.flatMap(r=>r.branches).reduce((s,b)=>s+b.salesM,0))} {t("ر.س","SAR")}</p><p className="text-[10px] text-gray-400">{t("مبيعات شهرية","Monthly sales")}</p></div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedBrand===brand.id?"rotate-180":""}`}/>
            </button>
            {expandedBrand===brand.id&&(
              <div className="border-t border-gray-100">
                {brand.restaurants.map(rest=>(
                  <div key={rest.id} className="px-5 py-3 border-b border-gray-50">
                    <p className="text-xs font-bold text-gray-500 mb-2">{rest.name}</p>
                    <div className="space-y-2">
                      {rest.branches.map(br=>{
                        const pct=br.target>0?Math.round((br.salesM/br.target)*100):0;
                        const pending=br.reviewStatus==="pending_review"||br.reviewStatus==="rejected";
                        return (
                          <div key={br.id} className={`flex items-center gap-4 px-3 py-2.5 rounded-lg ${pending?"bg-amber-50/40":"bg-gray-50"}`}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:pending?"#d1d5db":brand.color}}>{(br.city||br.name||"?")[0]}</div>
                            <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5"><p className="font-semibold text-gray-700 text-xs truncate">{br.name}</p>{reviewBadge(br.reviewStatus)}</div><p className="text-[10px] text-gray-400">{t("م.الفرع:","Mgr:")} {br.mgr} · {br.city}</p></div>
                            {pending ? (
                              <span className="text-[10px] text-amber-600 flex-shrink-0">{br.reviewStatus==="rejected"?t("لم يُعتمد","Not approved"):t("بانتظار اعتماد الإدارة","Awaiting admin approval")}</span>
                            ) : (<>
                              <div className="w-28 flex-shrink-0"><div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>{pct}%</span></div><div className="w-full h-1.5 bg-gray-200 rounded-full"><div className={`h-1.5 rounded-full ${pct>=100?"bg-emerald-500":pct>=80?"bg-blue-500":"bg-amber-500"}`} style={{width:`${Math.min(100,pct)}%`}}/></div></div>
                              <p className="font-mono font-bold text-gray-700 text-xs flex-shrink-0">{fmt(br.salesM)} {t("ر.س","SAR")}</p>
                              <button onClick={()=>{ setTransferFor({id:br.id,name:br.name}); setNewMgrUserId(br.mgrUserId ?? ""); }} title={t("نقل مدير الفرع","Transfer manager")} className="p-1.5 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 flex-shrink-0"><ArrowLeftRight size={13}/></button>
                            </>)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CAModules() {
  const { t, dir } = useCLang();
  const { data: apiMods = [] } = useCompanyModules();
  const toggleModuleMut = useToggleCompanyModule();
  type Mod = { id:string;nameAr:string;nameEn:string;descAr:string;descEn:string;icon:string;active:boolean;inPlan:boolean };
  // Driven by GET /company/me/modules. No static seed.
  const [localMods,setLocalMods]=useState<Mod[]>([]);
  const ICONS:Record<string,string> = { sales:"💰", expenses:"💸", purchases:"🛒", inventory:"📦", assets:"🏢", shifts:"🕐", waste:"🗑", emp:"👥", cash:"💵" };
  const mods: Mod[] = apiMods.map((m): Mod => ({
    id: m.moduleKey,
    nameAr: m.nameAr || m.moduleKey,
    nameEn: m.nameEn || m.moduleKey,
    descAr: m.descAr || "",
    descEn: m.descEn || "",
    icon: ICONS[m.moduleKey] || "📦",
    active: m.isActive,
    inPlan: m.inPlan,
  }));
  const toggle = (id: string) => {
    const m = mods.find((x) => x.id === id);
    if (!m) return;
    if (!m.inPlan) {
      alert(t("يحتاج ترقية الخطة", "Plan upgrade required"));
      return;
    }
    if (!canToggleModule(m.inPlan, toggleModuleMut.isPending)) return;
    if (apiMods.length > 0) {
      toggleModuleMut.mutate({ moduleKey: id, isActive: !m.active });
    } else {
      setLocalMods((p) => p.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
    }
  };
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("الوحدات النشطة","Active Modules")}</h2></div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("مفعّلة","Active")}           value={String(mods.filter(m=>m.active).length)} sub={t("وحدات نشطة","active modules")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("متاحة للتفعيل","Available")} value={String(mods.filter(m=>!m.active&&m.inPlan).length)} sub={t("ضمن خطتك","In your plan")} icon={<Zap size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("تحتاج ترقية","Needs Upgrade")} value={String(mods.filter(m=>!m.inPlan).length)} sub={t("غير مشمولة","Not included")} icon={<Lock size={18} className="text-gray-500"/>} accent="blue"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {mods.map(m=>{
          const isAllowed = canToggleModule(m.inPlan, toggleModuleMut.isPending);
          return (
            <div key={m.id} className={`px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 ${!m.inPlan?"bg-gray-50/60":""}`}>
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">{m.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 text-sm">{t(m.nameAr,m.nameEn)}</span>
                  {!m.inPlan&&<Badge className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px]"><Lock size={9}/> {t("يحتاج ترقية","Needs upgrade")}</Badge>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{t(m.descAr,m.descEn)}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={m.active}
                aria-label={t(`تبديل تفعيل ${m.nameAr}`, `Toggle ${m.nameEn}`)}
                disabled={!isAllowed}
                onClick={()=>toggle(m.id)}
                className={`w-12 h-6 rounded-full transition-all flex-shrink-0 relative ${
                  m.active ? "bg-purple-500" : m.inPlan ? "bg-gray-300" : "bg-gray-200 cursor-not-allowed"
                } ${toggleModuleMut.isPending ? "opacity-60 cursor-wait" : ""}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${m.active?"right-0.5":"left-0.5"}`}/>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CABilling() {
  const { t, dir } = useCLang();
  const { data: apiInvoicesPage, isLoading: isInvoicesLoading, isError: isInvoicesError, refetch: refetchInvoices } = useBillingInvoices();
  const { data: billingSummary } = useBillingSummary();
  const exportMut = useExportInvoices();
  const downloadPdfMut = useDownloadInvoicePDF();
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  useExportJobStatus(exportJobId, {
    intervalMs: 4000,
    filename: "invoices.xlsx",
    onReady: () => setExportJobId(null),
  });
  const apiInvoices: any[] = Array.isArray(apiInvoicesPage)
    ? apiInvoicesPage
    : ((apiInvoicesPage as any)?.data ?? []);
  const invoices = apiInvoices.map((i: any) => parseInvoice(i));
  const totalCountMeta = (apiInvoicesPage as any)?.meta?.total ?? null;
  const kpis = calculateBillingKpis(invoices, billingSummary, totalCountMeta);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">✓ {t("مدفوع", "Paid")}</Badge>;
      case "open":
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px]">⏳ {t("معلقة", "Open")}</Badge>;
      case "overdue":
        return <Badge className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px]">⚠️ {t("متأخرة", "Overdue")}</Badge>;
      case "void":
        return <Badge className="bg-gray-50 text-gray-500 border border-gray-200 text-[10px]">✕ {t("ملغاة", "Void")}</Badge>;
      default:
        return <Badge className="bg-gray-50 text-gray-500 border border-gray-200 text-[10px]">{status || t("غير محدد", "Unknown")}</Badge>;
    }
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("الفواتير والمدفوعات","Invoices & Payments")}</h2></div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label={t("إجمالي المدفوع","Total Paid")}
          value={fmt(kpis.totalPaid)}
          sub={kpis.isSummaryBasedPaid ? t("إجمالي مدفوعات الشركة (ملخص الحساب)", "Company total (billing summary)") : t(`${kpis.paidCount} فاتورة مدفوعة بالصفحة`, `${kpis.paidCount} paid on page`)}
          icon={<Wallet size={18} className="text-emerald-600"/>}
          accent="emerald"
        />
        <KpiCard
          label={
            kpis.companyTotalDue != null
              ? t("إجمالي المستحقات (الشركة)", "Total Outstanding (Company)")
              : kpis.isMultiPage
                ? t("فواتير معلقة (الصفحة)", "Pending Invoices (Page)")
                : t("مستحقات فواتير الصفحة", "Page Invoices Due")
          }
          value={fmt(kpis.companyTotalDue != null ? kpis.companyTotalDue : kpis.pageDue)}
          sub={
            kpis.companyTotalDue != null
              ? t("مستحقات الشركة الإجمالية من ملخص الفوترة", "Company total from billing summary")
              : kpis.isMultiPage
                ? t(`${kpis.dueCount} فواتير غير مسددة بالصفحة (إجمالي المبالغ؛ إجمالي الشركة غير متوفر بالـ API)`, `${kpis.dueCount} unpaid on page (total amounts; company total unavailable in API)`)
                : kpis.isSinglePageComplete
                  ? t(`${kpis.dueCount} فواتير غير مسددة (إجمالي مبالغ فواتير الشركة)`, `${kpis.dueCount} unpaid invoices (sum of company invoice totals)`)
                  : t(`${kpis.dueCount} فواتير غير مسددة بالصفحة (إجمالي مبالغ الفواتير)`, `${kpis.dueCount} unpaid on page (sum of invoice totals)`)
          }
          icon={<CreditCard size={18} className="text-amber-600"/>}
          accent="amber"
        />
        <KpiCard
          label={t("إجمالي الفواتير","Total Invoices")}
          value={String(kpis.totalCount)}
          sub={
            kpis.isMultiPage
              ? t(`إجمالي الشركة (${invoices.length} معروضة بالصفحة)`, `Company total (${invoices.length} shown on page)`)
              : kpis.isSinglePageComplete
                ? t("سجل الفواتير الكامل", "All invoice records")
                : t(`${invoices.length} فواتير معروضة بالصفحة`, `${invoices.length} invoices shown on page`)
          }
          icon={<FileText size={18} className="text-blue-600"/>}
          accent="blue"
        />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">{t("سجل الفواتير","Invoice History")}</h3>
          <button
            onClick={() => exportMut.mutate({}, { onSuccess: (res) => res?.jobId && setExportJobId(res.jobId) })}
            disabled={Boolean(exportJobId) || invoices.length === 0}
            className="text-xs text-emerald-700 font-semibold flex items-center gap-1 hover:text-emerald-800 transition-colors disabled:opacity-50">
            <Download size={11}/> {exportJobId ? t("جاري التحضير...","Preparing...") : t("تصدير","Export")}
          </button>
        </div>

        {isInvoicesLoading ? (
          <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-purple-600" />
            <span className="text-sm">{t("جاري تحميل الفواتير...", "Loading invoices...")}</span>
          </div>
        ) : isInvoicesError ? (
          <div className="p-6 text-center bg-rose-50 border-t border-rose-100 text-rose-700 space-y-2">
            <p className="text-sm font-semibold">{t("تعذر تحميل الفواتير", "Failed to load invoices")}</p>
            <Btn size="sm" variant="outline" onClick={() => refetchInvoices()}>
              <RefreshCw size={13} /> {t("إعادة المحاولة", "Retry")}
            </Btn>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {t("لا توجد فواتير مسجلة حتى الآن", "No invoices found")}
          </div>
        ) : (
          invoices.map((inv) => (
            <div key={inv.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-emerald-600"/>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm" dir="ltr">{inv.displayId}</p>
                <p className="text-xs text-gray-400">{inv.date}</p>
              </div>
              <span className="font-mono font-bold text-gray-800">{fmt(inv.amount)} {t("ر.س","SAR")}</span>
              {renderStatusBadge(inv.status)}
              <button
                disabled={downloadPdfMut.isPending}
                onClick={() => downloadPdfMut.mutate({ id: inv.id, filename: `invoice-${inv.displayId}.pdf` })}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50"
                aria-label={t(`تحميل فاتورة ${inv.displayId}`, `Download invoice ${inv.displayId}`)}
              >
                <Download size={13}/>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// T14.5 — SSO (SAML/OIDC) config. PUT /company/me/sso is gated on the live
// subscription plan code (`enterprise`); a non-enterprise plan → 403 PLAN_REQUIRED
// (details.plan = current code). We key the upgrade prompt off that error code.
function CASsoCard({ t, dir }:{ t:(a:string,b:string)=>string; dir:string }) {
  const { data: sso } = useSsoConfig();
  const updateSsoMut = useUpdateSso();
  const disableSsoMut = useDisableSso();
  const [provider,setProvider]=useState<"oidc"|"saml">("oidc");
  const [oidcIssuer,setOidcIssuer]=useState("");
  const [oidcClientId,setOidcClientId]=useState("");
  const [oidcClientSecret,setOidcClientSecret]=useState("");
  const [metadataUrl,setMetadataUrl]=useState("");
  const [entityId,setEntityId]=useState("");
  const [defaultRole,setDefaultRole]=useState<"accountant"|"head"|"branch"|"procurement">("accountant");
  const [planBlock,setPlanBlock]=useState<string|null>(null); // current plan code when PLAN_REQUIRED
  useEffect(()=>{
    if(!sso)return;
    if(sso.provider) setProvider(sso.provider as "oidc"|"saml");
    setOidcIssuer(sso.oidcIssuer ?? "");
    setOidcClientId(sso.oidcClientId ?? "");
    setMetadataUrl(sso.metadataUrl ?? "");
    setEntityId(sso.entityId ?? "");
    if(sso.defaultRole) setDefaultRole(sso.defaultRole as any);
  },[sso]);
  const save=()=>{
    setPlanBlock(null);
    const body:any = provider==="oidc"
      ? { provider:"oidc", enabled:true, oidcIssuer, oidcClientId, oidcClientSecret: oidcClientSecret||undefined, defaultRole }
      : { provider:"saml", enabled:true, metadataUrl: metadataUrl||undefined, entityId: entityId||undefined, defaultRole };
    updateSsoMut.mutate(body, {
      onError: (e)=>{ if(isApiError(e)&&e.code==="PLAN_REQUIRED"){ setPlanBlock(String((e.details as any)?.plan ?? "current")); } },
    });
  };
  const inputCls="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400";
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4" dir={dir}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Shield size={14} className="text-purple-600"/> {t("الدخول الموحّد (SSO)","Single Sign-On (SSO)")}</h3>
        {sso?.enabled && <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">{t("مُفعّل","Enabled")}</Badge>}
      </div>
      {planBlock ? (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
          <p className="text-sm font-bold text-amber-800">{t("متاح في خطة المؤسسات فقط","Available on the Enterprise plan only")}</p>
          <p className="text-xs text-amber-700">{t("خطتك الحالية","Your current plan")}: <span className="font-mono">{planBlock}</span>. {t("رقِّ إلى المؤسسات لتفعيل الدخول الموحّد.","Upgrade to Enterprise to enable SSO.")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("المزوّد","Provider")}</label>
              <select value={provider} onChange={e=>setProvider(e.target.value as "oidc"|"saml")} className={inputCls}><option value="oidc">OIDC</option><option value="saml">SAML</option></select>
            </div>
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الدور الافتراضي","Default Role")}</label>
              <select value={defaultRole} onChange={e=>setDefaultRole(e.target.value as any)} className={inputCls}><option value="accountant">محاسب</option><option value="head">رئيس الحسابات</option><option value="branch">مدير فرع</option><option value="procurement">مدير مشتريات</option></select>
            </div>
          </div>
          {provider==="oidc" ? (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">OIDC Issuer</label><input value={oidcIssuer} onChange={e=>setOidcIssuer(e.target.value)} dir="ltr" className={inputCls}/></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">Client ID</label><input value={oidcClientId} onChange={e=>setOidcClientId(e.target.value)} dir="ltr" className={inputCls}/></div>
              <div className="col-span-2"><label className="text-xs font-semibold text-gray-600 block mb-1">Client Secret</label><input value={oidcClientSecret} onChange={e=>setOidcClientSecret(e.target.value)} dir="ltr" placeholder={t("اتركه فارغاً للإبقاء على الحالي","leave blank to keep current")} className={inputCls}/></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">Metadata URL</label><input value={metadataUrl} onChange={e=>setMetadataUrl(e.target.value)} dir="ltr" className={inputCls}/></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">Entity ID</label><input value={entityId} onChange={e=>setEntityId(e.target.value)} dir="ltr" className={inputCls}/></div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            {sso?.enabled && <Btn onClick={()=>disableSsoMut.mutate()} disabled={disableSsoMut.isPending}>{t("إيقاف","Disable")}</Btn>}
            <Btn variant="primary" onClick={save} disabled={updateSsoMut.isPending}><Shield size={13}/> {t("حفظ SSO","Save SSO")}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function CASettings() {
  const { t, dir, lang, setLang } = useCLang();
  const { data: apiSettings } = useCompanySettings();
  const updateSettingsMut = useUpdateCompanySettings();
  const langPrefMut = useLanguagePref();
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const saveLockRef = useRef(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [caView, setCaView] = useState<"home" | "notifications" | "apikeys" | "webhooks">("home");

  const [formData, setFormData] = useState<CompanySettingsFormState>({
    name: "",
    city: "",
    crNumber: "",
    email: "",
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (apiSettings && !isInitialized) {
      setFormData(initialCompanySettingsState(apiSettings));
      setIsInitialized(true);
    }
  }, [apiSettings, isInitialized]);

  if (caView === "notifications") return (<div className="space-y-4" dir={dir}><button onClick={() => setCaView("home")} className="text-sm text-purple-600 hover:underline">← {t("رجوع", "Back")}</button><NotificationPreferencesPage t={t} /></div>);
  if (caView === "apikeys") return (<div className="space-y-4" dir={dir}><button onClick={() => setCaView("home")} className="text-sm text-purple-600 hover:underline">← {t("رجوع", "Back")}</button><ApiKeysPage t={t} /></div>);
  if (caView === "webhooks") return (<div className="space-y-4" dir={dir}><button onClick={() => setCaView("home")} className="text-sm text-purple-600 hover:underline">← {t("رجوع", "Back")}</button><WebhooksPage t={t} /></div>);

  const handleSave = async () => {
    if (updateSettingsMut.isPending || saveLockRef.current) return;
    setErrorMessage(null);
    const result = await runCompanySettingsSave(
      formData,
      lang,
      (payload) => updateSettingsMut.mutateAsync(payload),
      saveLockRef
    );
    if (result.success) {
      setSaved(true);
      setErrorMessage(null);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setSaved(false);
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("إعدادات الشركة", "Company Settings")}</h2></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-3">{t("بيانات الشركة", "Company Information")}</h3>
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم المجموعة", "Group Name")}</label>
            <input
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }));
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={t("مجموعة التاج للمطاعم", "Altaj Restaurant Group")}
              disabled={updateSettingsMut.isPending}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">{t("المدينة الرئيسية", "Main City")}</label>
            <input
              value={formData.city}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, city: e.target.value }));
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={t("الرياض", "Riyadh")}
              disabled={updateSettingsMut.isPending}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">{t("رقم السجل التجاري", "CR Number")}</label>
            <input
              value={formData.crNumber}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, crNumber: e.target.value }));
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="1010XXXXXX"
              disabled={updateSettingsMut.isPending}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">{t("البريد الإلكتروني", "Email")}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, email: e.target.value }));
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="info@altaj.com"
              disabled={updateSettingsMut.isPending}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={updateSettingsMut.isPending}
            className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${saved ? "bg-emerald-500 text-white" : "bg-purple-600 text-white hover:bg-purple-700"}`}
          >
            {updateSettingsMut.isPending ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                {t("جاري الحفظ...", "Saving...")}
              </>
            ) : saved ? (
              <>
                <Check size={14} />
                {t("تم الحفظ", "Saved")}
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                {t("حفظ", "Save")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Account Settings ─────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-3">{t("إعدادات الحساب","Account Settings")}</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={()=>setShowPwd(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors">
            <Lock size={14}/> {t("تغيير كلمة المرور","Change Password")}
          </button>
          <button
            onClick={()=>setShowSessions(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
            <Activity size={14}/> {t("جلسات نشطة","Active Sessions")}
          </button>
          <button
            onClick={()=>setShow2FA(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
            <Shield size={14}/> {t("المصادقة الثنائية","Two-Factor Auth")}
          </button>
          <button
            onClick={()=>setCaView("notifications")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
            <Bell size={14}/> {t("تفضيلات الإشعارات","Notifications")}
          </button>
          <button
            onClick={()=>setCaView("apikeys")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
            <Key size={14}/> {t("مفاتيح API","API Keys")}
          </button>
          <button
            onClick={()=>setCaView("webhooks")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors">
            <Webhook size={14}/> Webhooks
          </button>
          <button
            onClick={()=>{
              const next = lang==="ar"?"en":"ar";
              setLang(next);
              langPrefMut.mutate({ language: next });
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-sm font-bold hover:bg-purple-100 transition-colors">
            <Globe size={14}/> {lang==="ar"?"English":"عربي"}
          </button>
        </div>
      </div>

      {/* T14.5 — SSO config (Enterprise-gated). */}
      <CASsoCard t={t} dir={dir}/>

      <ChangePasswordModal open={showPwd} onClose={()=>setShowPwd(false)}/>
      <TwoFactorSetupWizard open={show2FA} onClose={()=>setShow2FA(false)} t={t}/>

      {showSessions && (
        <div
          onClick={()=>setShowSessions(false)}
          style={{
            position:"fixed", inset:0, background:"rgba(15,28,53,0.7)",
            display:"flex", alignItems:"center", justifyContent:"center",
            zIndex:100, padding:16,
          }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:560 }}>
            <SessionsList t={t}/>
            <div style={{ marginTop:12, display:"flex", justifyContent:"flex-end" }}>
              <button
                onClick={()=>setShowSessions(false)}
                style={{
                  padding:"8px 16px", borderRadius:8, border:"1px solid #e2e8f0",
                  background:"white", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer",
                }}>
                {t("إغلاق","Close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CASupport() {
  const { t, dir, lang } = useCLang();
  const { data: apiChannels, isLoading: isChannelsLoading } = useSupportChannels();
  const createTicketMut = useCreateTicket();
  const submitLockRef = useRef(false);
  const [categoryKey, setCategoryKey] = useState<string>("");
  const [msgBody, setMsgBody] = useState("");
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rawChannels: any[] = Array.isArray(apiChannels)
    ? apiChannels
    : ((apiChannels as any)?.data ?? []);
  const channels = rawChannels.map((c: any) => parseSupportChannel(c, lang as "ar" | "en"));

  const handleSend = async () => {
    if (createTicketMut.isPending || submitLockRef.current) return;
    setErrorMessage(null);
    const result = await runSupportTicketSubmit(
      { category: categoryKey, body: msgBody },
      lang,
      (payload) => createTicketMut.mutateAsync(payload),
      submitLockRef
    );
    if (result.success) {
      setSent(true);
      setErrorMessage(null);
    } else {
      setSent(false);
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("الدعم الفني", "Technical Support")}</h2></div>
      {isChannelsLoading ? (
        <div className="p-6 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
          <RefreshCw size={14} className="animate-spin text-purple-600" />
          <span>{t("جاري تحميل قنوات الدعم...", "Loading support channels...")}</span>
        </div>
      ) : channels.length === 0 ? (
        <div className="p-6 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
          {t("لا توجد قنوات تواصل مباشرة مسجلة حالياً، يمكنك إرسال تذكرة دعم أدناه", "No direct support channels available right now. You can submit a support ticket below.")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {channels.map((ch) => {
            const handleClick = () => {
              if (!ch.isAvailable || ch.actionType === "none") return;
              if (ch.actionType === "url") {
                window.open(ch.value, "_blank", "noopener,noreferrer");
              } else if (ch.actionType === "tel") {
                window.location.href = `tel:${ch.value}`;
              } else if (ch.actionType === "mailto") {
                window.location.href = `mailto:${ch.value}`;
              }
            };
            return (
              <button
                key={ch.key || ch.label}
                type="button"
                onClick={handleClick}
                disabled={!ch.isAvailable || ch.actionType === "none"}
                className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-purple-200 hover:shadow-md transition-all ${
                  dir === "rtl" ? "text-right" : "text-left"
                } ${!ch.isAvailable ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="text-3xl mb-3">{ch.icon}</div>
                <p className="font-bold text-gray-800 text-sm">{ch.label}</p>
                <p className="text-xs text-gray-500 mt-1 font-mono" dir="ltr">{ch.value || "—"}</p>
                <Badge
                  className={`mt-2 text-[10px] ${
                    ch.isAvailable
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}
                >
                  {ch.isAvailable
                    ? (ch.hours || (lang === "ar" ? "متاح الآن" : "Available"))
                    : (lang === "ar" ? "غير متاح حالياً" : "Unavailable")}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-3">{t("إرسال طلب دعم", "Submit Support Request")}</h3>
        {sent ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-bold text-gray-800">{t("تم إرسال طلب الدعم", "Support request submitted")}</p>
            <p className="text-sm text-gray-400 mt-1">{t("سنتواصل معك خلال 24 ساعة", "We will contact you within 24 hours")}</p>
            <Btn
              onClick={() => {
                setSent(false);
                setMsgBody("");
                setCategoryKey("");
                setErrorMessage(null);
              }}
              variant="ghost"
              size="sm"
            >
              {t("إرسال طلب آخر", "Submit another request")}
            </Btn>
          </div>
        ) : (
          <div className="space-y-3">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <select
              value={categoryKey}
              onChange={(e) => {
                setCategoryKey(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={createTicketMut.isPending}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">{t("نوع المشكلة...", "Issue type...")}</option>
              {SUPPORT_TICKET_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {t(c.ar, c.en)}
                </option>
              ))}
            </select>
            <textarea
              rows={4}
              value={msgBody}
              onChange={(e) => {
                setMsgBody(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={t("اشرح المشكلة بالتفصيل (10 أحرف على الأقل)...", "Describe the issue in detail (at least 10 characters)...")}
              disabled={createTicketMut.isPending}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none resize-none focus:border-purple-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <Btn
              variant="primary"
              onClick={handleSend}
              disabled={createTicketMut.isPending}
            >
              {createTicketMut.isPending ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> {t("جاري الإرسال...", "Submitting...")}
                </>
              ) : (
                <>
                  <Send size={13} /> {t("إرسال الطلب", "Submit Request")}
                </>
              )}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// HEAD ACCOUNTANT PAGES
// ═══════════════════════════════════════════════════
// HEAD — PROPS TYPE
// ═══════════════════════════════════════════════════
type HeadProps = {
  navigate:(p:string)=>void;
  ops:COp[];
  finalApprove:(id:string)=>void;
  reject:(id:string)=>void;
  bulkFinalApprove:(ids:string[])=>void;
  actionsPending:boolean;
};

// ═══════════════════════════════════════════════════
// HEAD ACCOUNTANT — DASHBOARD
// ═══════════════════════════════════════════════════
function HeadDashboard({ navigate, ops, finalApprove, reject, bulkFinalApprove, actionsPending }:HeadProps) {
  const { t, dir } = useCLang();
  const queryClient = useQueryClient();
  const { data: apiHeadDash } = useHeadDashboard();
  const apiKpis = (apiHeadDash?.kpis ?? {}) as Record<string, number | string>;
  const awaitingHead  = ops.filter(o=>o.status==="approved");
  const dashboardBulkIds = awaitingHead.map(op=>op.id);
  const dashboardBulkAllowed = headLegacyBulkIds(ops, dashboardBulkIds, "head", op=>queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id))).length===dashboardBulkIds.length;
  const finalApproved = ops.filter(o=>o.status==="final-approved");
  const rejected      = ops.filter(o=>o.status==="rejected");

  // Brand performance comes from Head dashboard API (brandPerformance or brandSummary). No static fallback.
  const rawBrands = apiHeadDash?.brandPerformance ?? apiHeadDash?.brandSummary ?? [];
  const headBrands = (Array.isArray(rawBrands) ? rawBrands : []).map((b: any) => {
    const rawSales = (b.salesHalalas ?? b.monthlySalesHalalas ?? b.sales ?? 0) as number;
    const rawTarget = (b.target ?? 0) as number;
    const sales = Math.round(rawSales / 100);
    const target = rawTarget > 0 ? Math.round(rawTarget / 100) : 0;
    const pct = b.pctOfTarget != null && b.pctOfTarget > 0 ? Math.round(b.pctOfTarget) : target > 0 ? Math.round((sales / target) * 100) : 0;
    return {
      id: b.brandId ?? b.id ?? b.name,
      name: b.name,
      abbr: b.abbr ?? (b.name ?? "؟").toString().slice(0, 2),
      color: b.color ?? "#7C3AED",
      sales,
      target,
      pct,
    };
  });

  const rawMonthlyHalalas = (apiKpis.monthlySalesHalalas as number | undefined) ?? (apiKpis.totalSalesHalalas as number | undefined);
  const totalSalesM = rawMonthlyHalalas != null
    ? Math.round(rawMonthlyHalalas / 100)
    : headBrands.reduce((s, b) => s + b.sales, 0);

  const salesDelta = apiKpis.salesDeltaPct != null
    ? `${Number(apiKpis.salesDeltaPct) > 0 ? "+" : ""}${apiKpis.salesDeltaPct}%`
    : undefined;

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("لوحة رئيس الحسابات 👑","Head Accountant Dashboard 👑")}</h2>
          <p className="text-gray-400 text-sm">{COMPANY.name} · {t("الإشراف على المحاسبين · الاعتماد النهائي","Accountant Oversight · Final Approval")}</p>
        </div>
        <button onClick={()=>navigate("head-pending")} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 shadow-sm relative">
          <Clock size={14}/> {t("بانتظار اعتمادي","Awaiting My Approval")}
          {awaitingHead.length>0&&<span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{awaitingHead.length}</span>}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t("بانتظار اعتمادي","Awaiting My Approval")}  value={String(awaitingHead.length)}  sub={t("📱 من المحاسبين · م3","📱 From accountants · S3")}      icon={<Clock size={18} className="text-amber-600"/>}   accent="amber"/>
        <KpiCard label={t("معتمدة نهائياً","Final Approved")}          value={String(finalApproved.length)} sub={t("مُغلقة · تنتظر ERP · م4","Closed · Awaiting ERP · S4")} icon={<Lock size={18} className="text-emerald-600"/>}  accent="emerald"/>
        <KpiCard label={t("مرفوضة","Rejected")}                        value={String(rejected.length)}      sub={t("خارج المسار","Off Pipeline")}                           icon={<XCircle size={18} className="text-red-600"/>}    accent="red"/>
        <KpiCard label={t("إجمالي المبيعات","Total Sales")}            value={`${fmt(Math.round(totalSalesM/1000))}K`} sub={t("ر.س هذا الشهر","SAR this month")}             icon={<TrendingUp size={18} className="text-blue-600"/>} accent="blue" delta={salesDelta}/>
      </div>

      <CPipelineOverview ops={ops}/>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4">{t("أداء العلامات التجارية هذا الشهر","Brand Performance This Month")}</h3>
        <div className="space-y-4">
          {headBrands.length===0 && (
            <div className="text-center text-gray-400 text-sm py-6">{t("لا توجد بيانات علامات تجارية بعد","No brand data yet")}</div>
          )}
          {headBrands.map(b=>{
            const sales=b.sales;
            const target=b.target;
            const pct=b.pct;
            return (
              <div key={b.id} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:b.color}}>{b.abbr}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{b.name}</span>
                    <span className="text-xs text-gray-500">{pct}% {t("من الهدف","of target")}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full" style={{width:`${Math.min(100,pct)}%`,background:b.color}}/></div>
                </div>
                <div className={`flex-shrink-0 w-32 ${dir==="ltr"?"text-left":"text-right"}`}>
                  <p className="font-mono font-bold text-gray-800 text-xs">{fmt(sales)}</p>
                  <p className="text-[10px] text-gray-400">{t("الهدف:","Target:")} {fmt(target)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-amber-50/60 flex items-center justify-between">
          <h3 className="font-bold text-amber-800 text-sm">⏳ {t("بانتظار اعتمادك النهائي","Awaiting Your Final Approval")} ({awaitingHead.length})</h3>
          {awaitingHead.length>0 && (
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="success" disabled={!dashboardBulkAllowed || actionsPending} onClick={()=>bulkFinalApprove(dashboardBulkIds)}>✅ {t("اعتماد الكل","Approve All")}</Btn>
              {!dashboardBulkAllowed && <span className="text-xs text-amber-700">{t("اعتماد SHF وتقرير اليوم فرديًا بعد تحقق الدليل","Review SHF and day reports individually after evidence checks")}</span>}
              <button onClick={()=>navigate("head-pending")} className="text-xs text-purple-600 font-semibold hover:underline">{t("عرض الكل ←","View All →")}</button>
            </div>
          )}
        </div>
        {awaitingHead.length===0 && <div className="p-8 text-center text-gray-400 text-sm">✅ {t("تم اعتماد جميع العمليات الصادرة من المحاسبين","All accountant operations have been final-approved")}</div>}
        {awaitingHead.slice(0,4).map(op=>(
          <div key={op.id} className="px-5 py-3.5 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
            <div className="w-1 h-8 rounded-full flex-shrink-0" style={{background:op.brandColor}}/>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{op.moduleLabel} — {op.branch}</p>
              <p className="text-xs text-gray-400">{op.brandName} · {op.submittedBy} · {op.timeAgo}</p>
            </div>
            {op.amount != null && op.amount>0&&<span className="font-mono font-bold text-gray-800 text-sm">{fmt(op.amount)} {t("ر.س","SAR")}</span>}
            <COpStagePill op={op}/>
            <Badge className={`text-[10px] border ${MATCH_CFG[op.match].cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${MATCH_CFG[op.match].dot}`}/>
              {t(MATCH_CFG[op.match].label, EN_MATCH_CD[op.match])}
            </Badge>
            <div className="flex gap-1.5 flex-shrink-0">
              {getHeadReviewPolicy(op,"head").finalApprove && <button disabled={actionsPending} onClick={()=>finalApprove(op.id)} title={t("اعتماد نهائي","Final Approve")} className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center text-xs disabled:opacity-50"><CheckCircle2 size={12}/></button>}
              {getHeadReviewPolicy(op,"head").blockedReason === "expense_owner_decision_required" ? <span className="text-xs text-amber-700">{t(HEAD_EXPENSE_EVIDENCE_HINT.ar, HEAD_EXPENSE_EVIDENCE_HINT.en)}</span> : getHeadReviewPolicy(op,"head").blockedReason ? <span className="text-xs text-amber-700">{t(HEAD_DAY_EVIDENCE_HINT.ar, HEAD_DAY_EVIDENCE_HINT.en)}</span> : getHeadReviewPolicy(op,"head").returnForReview && !isPkg6SalesReport(op) && <button disabled={actionsPending} onClick={()=>reject(op.id)} title={op.module==="shifts"?t("إعادة للمحاسب للتعديل","Return to accountant for changes"):t("رفض","Reject")} className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center text-xs disabled:opacity-50"><XCircle size={12}/></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// HEAD — PENDING (بانتظار الاعتماد النهائي)
// يعرض العمليات التي وافق عليها المحاسب (status="approved")
// وينقلها لـ "final-approved" بدلاً من حذفها
// ═══════════════════════════════════════════════════
function HeadPending({ ops, finalApprove, reject, bulkFinalApprove, actionsPending }:HeadProps) {
  const { t, dir } = useCLang();
  const queryClient = useQueryClient();
  const [selected,setSelected]  = useState<string|null>(null);
  const [brandFilter,setBrandFilter] = useState("الكل");
  const [modFilter,setModFilter] = useState<""|CModKey>("");

  const awaitingHead = ops.filter(o=>o.status==="approved");
  const brands = ["الكل",...new Set(ops.map(o=>o.brandName))];
  const shown  = awaitingHead.filter(o=>{
    if(brandFilter!=="الكل" && o.brandName!==brandFilter) return false;
    if(modFilter && o.module!==modFilter) return false;
    return true;
  });
  const totalAmt = sumCOpAmounts(shown);
  const shownIds = shown.map(op=>op.id);
  const bulkAllowed = headLegacyBulkIds(ops, shownIds, "head", op=>queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id))).length===shownIds.length;

  const modLabels:Record<string,string>={
    sales:`💰 ${t("مبيعات","Sales")}`, expenses:`💸 ${t("مصروفات","Expenses")}`,
    purchases:`🛒 ${t("مشتريات","Purchases")}`, inventory:`📦 ${t("مخزون","Inventory")}`,
    shifts:`🕒 ${t("ورديات","Shifts")}`,
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("بانتظار الاعتماد النهائي","Awaiting Final Approval")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{awaitingHead.length} {t("عملية — موافق عليها من المحاسب · تنتظر اعتمادك (م3 → م4)","operations — accountant-approved · awaiting your final approval (S3 → S4)")}</p>
        </div>
        {awaitingHead.length>0 && (
          <div className="text-left"><Btn variant="success" disabled={!bulkAllowed || actionsPending} onClick={()=>bulkFinalApprove(shownIds)}>
            <CheckCircle2 size={13}/> {t("اعتماد المعروض","Approve displayed")} ({shownIds.length})
          </Btn>{!bulkAllowed && <p className="text-xs text-amber-700 mt-1">{t("اعتماد SHF وتقرير اليوم فرديًا بعد تحقق الدليل","Review SHF and day reports individually after evidence checks")}</p>}</div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {brands.map(b=>(
            <button key={b} onClick={()=>setBrandFilter(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${brandFilter===b?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
              {b === "الكل" ? t("الكل","All") : b}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {(["","sales","shifts","expenses","purchases","inventory"] as (""|CModKey)[]).map(m=>(
            <button key={m} onClick={()=>setModFilter(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${modFilter===m?"bg-purple-600 text-white border-purple-600":"bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
              {m===""?t("الكل","All"):modLabels[m]}
            </button>
          ))}
          {totalAmt != null && totalAmt>0 && <span className="mr-auto text-xs text-gray-500 font-mono font-semibold">{t("إجمالي العرض:","Displayed total:")} {fmt(totalAmt)} {t("ر.س","SAR")}</span>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {shown.length===0 ? (
          <div className="p-10 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-gray-600 font-semibold text-sm">{t("لا توجد عمليات بانتظار اعتمادك النهائي","No operations awaiting your final approval")}</p>
            <p className="text-gray-400 text-xs mt-1">{t("كل العمليات معتمدة نهائياً أو ما زالت قيد المراجعة لدى المحاسب","All operations are final-approved or still under accountant review")}</p>
          </div>
        ) : shown.map(op=>(
          <div key={op.id} className={`border-b border-gray-50 last:border-0 ${selected===op.id?"bg-purple-50/30":""}`}>
            <OpRow
              op={op}
              forHead={true}
              actionsPending={actionsPending}
              onApprove={()=>{ finalApprove(op.id); setSelected(null); }}
              onReject={()=>{ reject(op.id); setSelected(null); }}
              onView={()=>setSelected(selected===op.id?null:op.id)}
              expanded={selected===op.id}
              onToggle={()=>setSelected(selected===op.id?null:op.id)}
            />
            {selected===op.id && (
              <div className="px-5 pb-4 space-y-3 border-t border-gray-50 pt-3">
                <CPipelineBar op={op}/>
                <div className="flex gap-2">
                  <Btn variant="success" size="sm" disabled={actionsPending || !getHeadReviewPolicy(op,"head").finalApprove} onClick={()=>{ finalApprove(op.id); setSelected(null); }}>
                    <Lock size={12}/> {t("اعتماد نهائي (م4)","Final Approve (S4)")}
                  </Btn>
                  {getHeadReviewPolicy(op,"head").returnForReview && !isPkg6SalesReport(op) && <Btn variant="danger" size="sm" disabled={actionsPending} onClick={()=>{ reject(op.id); setSelected(null); }}>
                    <ThumbsDown size={12}/> {op.module==="shifts"?t("إعادة للمحاسب للتعديل","Return to accountant for changes"):t("رفض","Reject")}
                  </Btn>}
                  {getHeadReviewPolicy(op,"head").blockedReason === "expense_owner_decision_required" ? (
                    <p className="text-xs text-amber-700">{t(HEAD_EXPENSE_EVIDENCE_HINT.ar, HEAD_EXPENSE_EVIDENCE_HINT.en)}</p>
                  ) : getHeadReviewPolicy(op,"head").blockedReason ? (
                    <p className="text-xs text-amber-700">{t(HEAD_DAY_EVIDENCE_HINT.ar, HEAD_DAY_EVIDENCE_HINT.en)}</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// HEAD — APPROVED (المعتمدة نهائياً)
// ═══════════════════════════════════════════════════
function HeadApproved({ ops }:{ ops:COp[] }) {
  const { t, dir } = useCLang();
  const finalApproved = ops.filter(o=>o.status==="final-approved");
  const totalAmt      = sumCOpAmounts(finalApproved);
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("المعتمدة نهائياً 🔒","Final Approved 🔒")}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{finalApproved.length} {t("عملية معتمدة نهائياً — م4 في مسار الاعتماد · بانتظار الترحيل لـ ERP","final-approved operations — S4 in pipeline · awaiting ERP posting")}</p>
        </div>
        {totalAmt != null && totalAmt>0 && <span className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">{fmt(totalAmt)} {t("ر.س إجمالاً","SAR total")}</span>}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {finalApproved.length===0 && <div className="p-8 text-center text-gray-400 text-sm">{t("لا توجد عمليات معتمدة نهائياً حتى الآن","No final-approved operations yet")}</div>}
        {finalApproved.map(op=>(
          <div key={op.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 bg-slate-50/30">
            <div className="w-1 h-8 rounded-full flex-shrink-0" style={{background:op.brandColor}}/>
            <Lock size={12} className="text-emerald-600 flex-shrink-0"/>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">{op.moduleLabel} — {op.branch}</p>
              <p className="text-xs text-gray-400">{op.brandName} · {op.submittedBy} · {op.timeAgo}</p>
            </div>
            {op.amount != null && op.amount>0&&<span className="font-mono font-bold text-gray-800 text-sm">{fmt(op.amount)} {t("ر.س","SAR")}</span>}
            <COpStagePill op={op}/>
            <Badge className={`text-[10px] border ${STATUS_CFG[op.status].cls}`}>{t(STATUS_CFG[op.status].label, EN_STATUS_CD[op.status].label)}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadBrands() {
  const { t, dir } = useCLang();
  const SAR = t("ر.س","SAR");
  const { data: apiHeadDash } = useHeadDashboard();
  // Brand performance is driven by the head dashboard brandSummary API; no static seed.
  const apiBrandSummary = (apiHeadDash?.brandSummary ?? []) as any[];
  const brands = apiBrandSummary.map((b:any) => ({
    id: b.id ?? b.brandId ?? b.name,
    name: b.name ?? "—",
    color: b.color ?? "#7C3AED",
    abbr: b.abbr ?? (typeof b.name === "string" ? b.name.slice(0,2) : "—"),
    restaurants: Array.isArray(b.restaurants) ? b.restaurants.map((r:any) => ({
      id: r.id ?? r.name,
      name: r.name ?? "—",
      branches: Array.isArray(r.branches) ? r.branches.map((br:any) => ({
        id: br.id ?? br.name,
        name: br.name ?? "—",
        mgr: br.mgr ?? br.managerName ?? "—",
        salesM:  br.salesM  ?? (br.monthlySalesHalalas    != null ? Math.round(br.monthlySalesHalalas / 100)    : 0),
        expM:    br.expM    ?? (br.monthlyExpensesHalalas != null ? Math.round(br.monthlyExpensesHalalas / 100) : 0),
        target:  br.target  ?? (br.monthlyTargetHalalas   != null ? Math.round(br.monthlyTargetHalalas / 100)   : 0),
      })) : [],
    })) : [],
  }));
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("أداء العلامات التجارية","Brand Performance")}</h2></div>
      {brands.length === 0 && <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">{t("لا توجد بيانات بعد","No data yet")}</div>}
      {brands.map(b=>{
        const allBrs=b.restaurants.flatMap((r:any)=>r.branches) as any[];
        const totalS=allBrs.reduce((s:number,br:any)=>s+br.salesM,0),totalE=allBrs.reduce((s:number,br:any)=>s+br.expM,0),totalT=allBrs.reduce((s:number,br:any)=>s+br.target,0);
        return (
          <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3" style={{borderRightWidth:4,borderRightColor:b.color}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{background:b.color}}>{b.abbr}</div>
              <div className="flex-1"><p className="font-bold text-gray-800">{b.name}</p><p className="text-xs text-gray-400">{b.restaurants.length} مطاعم · {allBrs.length} فروع</p></div>
              <div className="grid grid-cols-3 gap-4 text-center">{[["المبيعات",fmt(totalS)+" ر.س"],["المصروفات",fmt(totalE)+" ر.س"],["الصافي",fmt(totalS-totalE)+" ر.س"]].map(([l,v])=><div key={l}><p className="text-[10px] text-gray-400">{l}</p><p className="font-bold text-gray-800 text-sm">{v}</p></div>)}</div>
            </div>
            <div className="divide-y divide-gray-50">
              {allBrs.map((br:any)=>{
                const pct=Math.round((br.salesM/br.target)*100);
                return (
                  <div key={br.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1"><p className="text-sm font-semibold text-gray-700">{br.name}</p><p className="text-[10px] text-gray-400">{br.mgr}</p></div>
                    <div className="w-32"><div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>{pct}%</span><span>هدف: {fmt(br.target)}</span></div><div className="w-full h-1.5 bg-gray-100 rounded-full"><div className={`h-1.5 rounded-full ${pct>=100?"bg-emerald-500":pct>=80?"bg-blue-500":"bg-amber-500"}`} style={{width:`${Math.min(100,pct)}%`}}/></div></div>
                    <span className="font-mono font-bold text-gray-800 text-xs w-24 text-left">{fmt(br.salesM)} ر.س</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HeadAccountants() {
  const { t, dir } = useCLang();
  const { data: apiAccs = [] } = useAccountantsPerformance();
  const accs = apiAccs.map(a => ({ name: a.name, brand: a.brandName || a.branchName || "—", ops: (a.approvedCount ?? 0) + (a.rejectedCount ?? 0) + (a.pendingCount ?? 0), pending: a.pendingCount ?? 0 }));
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("فريق المحاسبين","Accountants Team")}</h2></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {accs.map((a,i)=>(
          <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold">{a.name[0]}</div>
            <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{a.name}</p><p className="text-xs text-gray-400">{t("مسؤول:","Responsible:")} {a.brand}</p></div>
            <div className="flex items-center gap-4 text-center">
              <div><p className="font-bold text-gray-800">{a.ops}</p><p className="text-[10px] text-gray-400">{t("عملية هذا الشهر","ops this month")}</p></div>
              <div><p className={`font-bold ${a.pending>0?"text-amber-600":"text-emerald-600"}`}>{a.pending}</p><p className="text-[10px] text-gray-400">{t("معلقة","pending")}</p></div>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">● {t("نشط","Active")}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadReports() {
  const { t, dir } = useCLang();
  const { data: apiReports = [] } = useReports();
  const downloadReportMut = useDownloadReport();
  const reports = (Array.isArray(apiReports) ? apiReports as any[] : []).map((r: any) => ({
    ar: r.title || r.name || r.key,
    en: r.titleEn || r.title || r.name || r.key,
    dar: r.description || "",
    den: r.descriptionEn || r.description || "",
    file: r.key || r.id,
  }));
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("التقارير المالية","Financial Reports")}</h2></div>
      <div className="grid grid-cols-2 gap-4">
        {reports.map(r=>(
          <div key={r.ar} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-purple-200 hover:shadow-md transition-all cursor-default ${dir==="rtl"?"text-right":"text-left"}`}>
            <p className="font-bold text-gray-800">{t(r.ar, r.en)}</p>
            <p className="text-xs text-gray-400 mt-1">{t(r.dar, r.den)}</p>
            <div className="mt-3">
              <button onClick={()=>downloadReportMut.mutate({ key: r.file, format: "pdf" })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-purple-100 hover:text-purple-700 transition-colors">
                <Download size={11}/> {t("تحميل PDF","Download PDF")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// HEAD — REJECTED
// ═══════════════════════════════════════════════════
function HeadRejected({ ops }:{ ops:COp[] }) {
  const { t, dir } = useCLang();
  const rejected = ops.filter(o=>o.status==="rejected");
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("العمليات المرفوضة","Rejected Operations")}</h2><p className="text-gray-400 text-sm">{rejected.length} {t("عملية مرفوضة — تحتاج إعادة رفع من الفرع","rejected operations — need re-upload from branch")}</p></div>
      {rejected.length===0?(
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-bold text-gray-700 text-lg">{t("لا توجد عمليات مرفوضة","No rejected operations")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("جميع العمليات في مسارها الصحيح","All operations are on the correct pipeline")}</p>
        </div>
      ):(
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {rejected.map(op=>(
            <div key={op.id} className="px-5 py-4 border-b border-gray-50 last:border-0 border-r-4 border-r-red-400">
              <div className="flex items-center gap-3">
                <div className="w-1 h-10 rounded-full bg-red-400 flex-shrink-0"/>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{op.branch}</p>
                  <p className="text-xs text-gray-400">{op.moduleLabel} · {op.refNum} · {op.timeAgo}</p>
                  {op.diff ? (
                    <p className="text-xs text-red-600 mt-1 font-mono">⚠️ {t("سبب الرفض:","Rejection reason:")} {op.diff}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1 italic">{t("لم يتم تسجيل سبب رفض محدد","No rejection reason specified")}</p>
                  )}
                </div>
                <span className="font-mono font-bold text-gray-800">{fmt(op.amount)} {t("ر.س","SAR")}</span>
                <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">✕ {t("مرفوض","Rejected")}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// HEAD — MODULE PAGES (نفس المحاسب — اعتماد نهائي فقط)
// ═══════════════════════════════════════════════════
function HeadShiftHistory() {
  const { t, lang } = useCLang();
  const [dateFrom,setDateFrom] = useState("");
  const [dateTo,setDateTo] = useState("");
  const [branchId,setBranchId] = useState("");
  const [page,setPage] = useState(1);
  const {data:branchRows} = useQuery({
    queryKey:["shifts","assigned-branch-lookup"],
    queryFn:async()=>{
      const response = await api.get<{data:Array<{id:string;name:string}>}>("/lookups/branches");
      return response.data.data;
    },
  });
  const branches = Array.isArray(branchRows) ? branchRows.filter(branch=>
    typeof branch?.id === "string" && typeof branch?.name === "string") : [];
  const query = useShiftsHistory({dateFrom,dateTo,branchId,page,pageSize:20});
  const busy = query.isPending || query.isFetching;
  const meta = busy || query.isError ? undefined : query.data?.meta;
  const rows = busy || query.isError ? [] : query.data?.data ?? [];
  return <section className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
    <h3 className="font-bold text-gray-800 text-sm">{t("سجل الورديات — قراءة فقط","Shift history — read only")}</h3>
    <div className="flex flex-wrap gap-3 text-xs">
      <label>{t("من تاريخ الإغلاق","Closed from")}<input type="date" value={dateFrom}
        onChange={e=>{setDateFrom(e.target.value);setPage(1);}} className="block border rounded px-2 py-1"/></label>
      <label>{t("إلى تاريخ الإغلاق","Closed to")}<input type="date" value={dateTo}
        onChange={e=>{setDateTo(e.target.value);setPage(1);}} className="block border rounded px-2 py-1"/></label>
      <label>{t("الفرع","Branch")}<select value={branchId}
        onChange={e=>{setBranchId(e.target.value);setPage(1);}} className="block border rounded px-2 py-1">
        <option value="">{t("كل الفروع المعيّنة","All assigned branches")}</option>
        {branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select></label>
    </div>
    {busy && <p role="status">{t("جارٍ تحميل السجل…","Loading history…")}</p>}
    {!busy && query.isError && <p role="alert">{getErrorMessage(query.error,lang)}</p>}
    {!busy && !query.isError && rows.length===0 && <p>{t("لا توجد ورديات في هذه الصفحة","No shifts on this page")}</p>}
    {!busy && !query.isError && rows.map(shift=>{
      const evidence = getShiftCountEvidence(shift,lang);
      return <div key={shift.id} className="flex flex-wrap gap-4 border-t py-2 text-xs">
        <span>{shift.branchName}</span><span>{shift.cashierName}</span>
        <span>{shift.endedAt ? new Date(shift.endedAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US") : "—"}</span>
        <span>{t("الفرق","Variance")}: <bdi>{evidence.variance.text}</bdi></span>
      </div>;
    })}
    <div className="flex items-center justify-between text-xs">
      <span>{t("الصفحة","Page")} {meta?.page ?? page} / {meta?.totalPages ?? "—"}</span>
      <div className="flex gap-2">
        <button disabled={busy || query.isError || historyPageTarget(meta,page,-1)===page}
          onClick={()=>setPage(historyPageTarget(meta,page,-1))}>{t("السابق","Previous")}</button>
        <button disabled={busy || query.isError || historyPageTarget(meta,page,1)===page}
          onClick={()=>setPage(historyPageTarget(meta,page,1))}>{t("التالي","Next")}</button>
      </div>
    </div>
  </section>;
}

function HeadModulePage({ moduleKey, title, ops, finalApprove, reject, bulkFinalApprove, actionsPending }:{
  moduleKey:CModKey; title:string; ops:COp[];
  finalApprove:(id:string)=>void; reject:(id:string)=>void; bulkFinalApprove:(ids:string[])=>void; actionsPending:boolean;
}) {
  const { t, dir } = useCLang();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const mOps = ops.filter(o=>o.module===moduleKey);
  const awaitingHead = mOps.filter(o=>o.status==="approved");
  const moduleBulkIds = awaitingHead.map(op=>op.id);
  const moduleBulkAllowed = headLegacyBulkIds(ops, moduleBulkIds, "head", op=>queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id))).length===moduleBulkIds.length;
  const finalApproved = mOps.filter(o=>o.status==="final-approved");
  const rejected = mOps.filter(o=>o.status==="rejected");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{title}</h2><p className="text-gray-400 text-sm">{awaitingHead.length} {t("عملية بانتظار اعتمادك النهائي","operations awaiting your final approval")}</p></div>
        {awaitingHead.length>0 && (
          moduleKey === "expenses" ? (
            <div className="text-left text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
              {t("اعتماد المصروفات من صلاحية مالك العلامة أو المدير المفوّض (EXP-06)","Expense approval is reserved for Brand Owner or Manager (EXP-06)")}
            </div>
          ) : (
            <div className="text-left"><Btn variant="success" size="sm" disabled={!moduleBulkAllowed || actionsPending} onClick={()=>bulkFinalApprove(moduleBulkIds)}>🔒 {t("اعتماد الكل","Approve All")} ({awaitingHead.length})</Btn>
              {!moduleBulkAllowed && <p className="text-xs text-amber-700 mt-1">{t("اعتماد SHF وتقرير اليوم فرديًا بعد تحقق الدليل","Review SHF and day reports individually after evidence checks")}</p>}</div>
          )
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("بانتظار اعتمادي","Awaiting My Approval")} value={String(awaitingHead.length)} sub={t("موافق عليها من المحاسب","Accountant-approved")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("معتمدة نهائياً","Final Approved")}        value={String(finalApproved.length)} sub={t("اعتماد نهائي","Final approval done")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("مرفوضة","Rejected")}                      value={String(rejected.length)} sub={t("تحتاج إعادة رفع","Needs re-upload")} icon={<XCircle size={18} className="text-red-500"/>} accent="red"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60"><h3 className="font-bold text-gray-900 text-sm">{t("بانتظار الاعتماد النهائي","Awaiting Final Approval")}</h3></div>
        {awaitingHead.length===0?(
          <div className="p-8 text-center text-gray-400 text-sm">✅ {t("لا توجد عمليات معلقة في هذا الموديول","No pending operations in this module")}</div>
        ):awaitingHead.map(op=>(
          <OpRow key={op.id} op={op} forHead actionsPending={actionsPending} onApprove={()=>finalApprove(op.id)} onReject={()=>reject(op.id)}
            onView={()=>setExpandedId(expandedId===op.id?null:op.id)} expanded={expandedId===op.id} onToggle={()=>setExpandedId(expandedId===op.id?null:op.id)}/>
        ))}
      </div>
      {finalApproved.length>0&&(
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60"><h3 className="font-bold text-gray-900 text-sm">{t("معتمدة نهائياً","Final Approved")}</h3></div>
          {finalApproved.map(op=>(
            <OpRow key={op.id} op={op} forHead actionsPending={actionsPending} onApprove={()=>{}} onReject={()=>{}}
              onView={()=>setExpandedId(expandedId===op.id?null:op.id)} expanded={expandedId===op.id} onToggle={()=>setExpandedId(expandedId===op.id?null:op.id)}/>
          ))}
        </div>
      )}
      {moduleKey==="shifts" && <HeadShiftHistory/>}
    </div>
  );
}

// HEAD — REMINDERS
// ═══════════════════════════════════════════════════
function HeadReminders() {
  const { t, dir } = useCLang();
  const { data: apiReminders = [] } = useHeadReminders();
  const patchMut = usePatchHeadReminder();
  const markAllMut = useMarkAllHeadRemindersDone();
  type RemItem = { id: string | number; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string; timeAr: string; timeEn: string; type: string; done: boolean };
  // Reminders come from the platform API (apiList below); no static seed.
  const apiList: RemItem[] = apiReminders.map((r): RemItem => ({
    id: r.id,
    titleAr: r.titleAr || r.title || "",
    titleEn: r.titleEn || r.title || "",
    bodyAr: r.bodyAr || r.body || "",
    bodyEn: r.bodyEn || r.body || "",
    timeAr: r.timeAr || r.dueAt || r.createdAt,
    timeEn: (r as any).timeEn || r.dueAt || r.createdAt,
    type: r.type,
    done: Boolean(r.done ?? r.isDone),
  }));
  const [localList, setLocalList] = useState<RemItem[]>([]);
  const list: RemItem[] = apiList;
  const toggle = (id: string | number) => {
    if (apiList.length > 0) {
      const r = list.find(x => x.id === id);
      if (r) patchMut.mutate({ id: String(id), done: !r.done });
    } else {
      setLocalList(p=>p.map(r=>r.id===id?{...r,done:!r.done}:r));
    }
  };
  const markAllDone = () => {
    if (apiList.length > 0) markAllMut.mutate();
    else setLocalList(p=>p.map(r=>({...r,done:true})));
  };
  const ICONS:Record<string,string> = { urgent:"🔴", report:"📊", finance:"💰", team:"👥" };
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("التذكيرات","Reminders")}</h2><p className="text-gray-400 text-sm">{list.filter(r=>!r.done).length} {t("تذكيرات نشطة","active reminders")}</p></div>
        <Btn size="sm" onClick={markAllDone}>✓ {t("تعليم الكل كمنجز","Mark all done")}</Btn>
      </div>
      <div className="space-y-3">
        {list.map(r=>(
          <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-3 transition-all ${r.done?"opacity-50 border-gray-100":"border-gray-100 hover:border-blue-100"}`}>
            <span className="text-xl mt-0.5">{ICONS[r.type]}</span>
            <div className="flex-1"><p className={`font-semibold text-sm ${r.done?"line-through text-gray-400":"text-gray-800"}`}>{t(r.titleAr,r.titleEn)}</p><p className="text-xs text-gray-400 mt-0.5">{t(r.bodyAr,r.bodyEn)}</p><p className="text-[10px] text-gray-300 mt-1">{t(r.timeAr,r.timeEn)}</p></div>
            <button onClick={()=>toggle(r.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${r.done?"bg-emerald-500 border-emerald-500":"border-gray-300 hover:border-emerald-400"}`}>
              {r.done&&<Check size={10} className="text-white"/>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// HEAD — ERP EXPORT
// ═══════════════════════════════════════════════════
function HeadERP({ ops }:{ ops:COp[] }) {
  const { t, dir } = useCLang();
  const postMut = usePostToERP();
  const [posted, setPosted] = useState<string[]>([]);
  const [postingIds, setPostingIds] = useState<string[]>([]);
  const ready = ops.filter(o=>o.status==="final-approved");

  const postOne = async (id: string) => {
    if (postingIds.includes(id) || posted.includes(id)) return;
    setPostingIds(prev => [...prev, id]);
    try {
      await postMut.mutateAsync(id);
      setPosted(prev => Array.from(new Set([...prev, id])));
    } catch {
      // error toast is handled by postMut.onError; do NOT set as posted
    } finally {
      setPostingIds(prev => prev.filter(x => x !== id));
    }
  };

  const postAll = async () => {
    const unposted = ready.filter(o => !posted.includes(o.id) && !postingIds.includes(o.id));
    for (const op of unposted) {
      await postOne(op.id);
    }
  };

  const isPostingAny = postingIds.length > 0;

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("التصدير لـ ERP","ERP Export")}</h2><p className="text-gray-400 text-sm">{t("الترحيل يتم بعد الاعتماد النهائي","Posting occurs after final approval")}</p></div>
        {ready.length>0&&posted.length<ready.length&&(
          <Btn variant="primary" disabled={isPostingAny} onClick={postAll}><Zap size={13}/> {t("ترحيل الكل","Post All")} ({ready.filter(o=>!posted.includes(o.id)).length})</Btn>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label={t("جاهزة للترحيل","Ready to Post")}   value={String(ready.filter(o=>!posted.includes(o.id)).length)} sub={t("معتمدة نهائياً","Final approved")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("تم ترحيلها","Posted")}             value={String(posted.length)} sub={t("هذه الجلسة","This session")} icon={<Zap size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("بانتظار الاعتماد","Awaiting Approval")} value={String(ops.filter(o=>o.status==="approved").length)} sub={t("لم تُعتمد نهائياً بعد","Not yet final-approved")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60"><h3 className="font-bold text-gray-900 text-sm">{t("العمليات المعتمدة نهائياً","Final-Approved Operations")}</h3></div>
        {ready.length===0?(
          <div className="p-8 text-center text-gray-400 text-sm">{t("لا توجد عمليات معتمدة نهائياً للترحيل حتى الآن","No final-approved operations ready to post")}</div>
        ):ready.map(op=>{
          const isPosting = postingIds.includes(op.id);
          const isPosted = posted.includes(op.id);
          return (
            <div key={op.id} className="px-5 py-3.5 flex items-center gap-3 border-b border-gray-50 last:border-0">
              <div className="w-1 h-8 rounded-full flex-shrink-0" style={{background:op.brandColor}}/>
              <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{op.branch} · {op.moduleLabel}</p><p className="text-xs text-gray-400">{op.refNum}</p></div>
              <span className="font-mono font-bold text-gray-800">{fmt(op.amount)} {t("ر.س","SAR")}</span>
              {isPosting ? (
                <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] animate-pulse">⏳ {t("جارٍ الترحيل…","Posting…")}</Badge>
              ) : isPosted ? (
                <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">🔗 {t("مُرحَّل","Posted")}</Badge>
              ) : (
                <button disabled={isPostingAny} onClick={()=>postOne(op.id)} className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50"><Zap size={10}/> {t("ترحيل","Post")}</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — SHARED STATE HOOK
//
// Backed by the live API: GET /api/v1/company/me/operations and the four
// transition mutations from src/api/queries/operations.ts. While the API
// query is loading or returns empty (e.g. backend not yet seeded), we fall
// back to INITIAL_OPS so the UI stays explorable in development. Default
// rejection reason is generic; a proper rejection-reason modal can be
// added per spec §5.3 (`POST /operations/{id}/reject` body).
// ═══════════════════════════════════════════════════
const DEFAULT_REJECT_REASON = "تحتاج مراجعة";

// Distinct brand names present in the loaded ops — powers the brand filter
// dropdowns on the sales/expenses tabs (meeting 2026-07-29 §2), so the options
// reflect the real brands in scope rather than a static seed list.
function cBrandNamesFromOps(ops: COp[]): string[] {
  const seen = new Set<string>();
  for (const o of ops) { const n = o.brandName; if (n && n !== "—") seen.add(n); }
  return [...seen];
}

class FinancialAccessChangedError extends Error {}

function useSharedOps(role: CRole | null, fingerprint: string) {
  const queryClient = useQueryClient();
  const mounted = useRef(false);
  const pendingDirect = useRef(new Set<()=>void>());
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; for (const abort of pendingDirect.current) abort(); pendingDirect.current.clear(); };
  }, []);
  const financialRole = role === "accountant" || role === "head";
  const opsQuery = useQuery({
    queryKey: [...queryKeys.operations({ pageSize: 100 }), role],
    enabled: financialRole,
    queryFn: async () => {
      const res = await api.get<{ data: ApiOperation[]; meta?: { total: number; totalPages: number; page: number; pageSize: number } }>(
        "/operations",
        { params: { pageSize: 100 } },
      );
      const first = res.data;
      if (first?.meta && first.meta.totalPages > 1) {
        const remaining = await Promise.all(
          Array.from({ length: first.meta.totalPages - 1 }, (_, i) =>
            api.get<{ data: ApiOperation[] }>("/operations", {
              params: { pageSize: 100, page: i + 2 },
            }).then((r) => r.data.data ?? []),
          ),
        );
        return {
          data: [...(first.data ?? []), ...remaining.flat()],
          meta: { ...first.meta, total: first.meta.total },
        };
      }
      return first;
    },
  });
  const approveMut = useApproveOperation();
  const rejectMut  = useRejectOperation();
  const finalMut   = useFinalApprove();
  const bulkFinalMut = useBulkFinalApprove();
  const bulkMut    = useBulkApprove();
  const clarifyMut = useRequestClarification();
  const actionLock = useRef(false);
  const [actionsPending, setActionsPending] = useState(false);
  const [shiftReviewPage, setShiftReviewPage] = useState(1);

  const ops: COp[] = useMemo(() => {
    const apiOps = financialRole ? opsQuery.data?.data : undefined;
    // Driven entirely by GET /operations. No static fallback —
    // an empty list renders empty states, never mock operations.
    return Array.isArray(apiOps) ? apiOps.map(op => apiOpToCOp(op, BRANDS)) : [];
  }, [opsQuery.data, financialRole]);
  const currentOps = useRef(ops);
  currentOps.current = ops;
  const currentRole = useRef(role);
  currentRole.current = role;
  const currentFingerprint = useRef(fingerprint);
  currentFingerprint.current = fingerprint;
  const captureAccess = () => {
    const activeRole = currentRole.current;
    if (!mounted.current || (activeRole !== "accountant" && activeRole !== "head")) return null;
    return {generation:financialAccessGeneration(queryClient),role:activeRole,fingerprint:currentFingerprint.current};
  };
  const accessStillCurrent = (context:NonNullable<ReturnType<typeof captureAccess>>) =>
    mounted.current && context.generation === financialAccessGeneration(queryClient)
    && context.role === currentRole.current && context.fingerprint === currentFingerprint.current;
  const operationFor = (id: string) =>
    queryClient.getQueryData<{data:ApiOperation[]}>(queryKeys.operations({ moduleKey:"shifts", pageSize:100, page:shiftReviewPage }))?.data
      ?.find(op => op.id === id) ?? currentOps.current.find(op => op.id === id);
  const detailFor = (op: { id: string }) => queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id));
  const loadFreshDetail = async (id:string) => {
    const context = captureAccess();
    if (!context) throw new FinancialAccessChangedError();
    const request = registerFinancialRequest(queryClient);
    pendingDirect.current.add(request.abort);
    try {
      const response = await api.get<ApiOperation>(`/operations/${id}`,{signal:request.signal});
      if (request.signal.aborted || request.generation !== context.generation || !accessStillCurrent(context))
        throw new FinancialAccessChangedError();
      queryClient.setQueryData(queryKeys.operation(id), response.data);
      return response.data;
    } finally { pendingDirect.current.delete(request.abort); request.release(); }
  };
  const salesContextFor = (id: string) => {
    const operation = operationFor(id);
    return { operation, detail: operation ? detailFor(operation) : undefined, role: currentRole.current };
  };
  const runOperationAction = (id: string, action: ShfReviewAction, effect: () => void) => {
    const operation = operationFor(id);
    if (!operation) return false;
    if (("module" in operation ? operation.module : operation.moduleKey) === "shifts") {
      return runShfReviewAction(operation, currentRole.current, action, effect, detailFor(operation));
    }
    effect();
    return true;
  };

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [clarifyingId, setClarifyingId] = useState<string | null>(null);
  const clearDialogs = () => { setRejectingId(null); setClarifyingId(null); };

  // Reject reasons scoped to the module of the op being rejected (T03 §13).
  const rejectingOp = rejectingId ? operationFor(rejectingId) : undefined;
  const rejectingModule = rejectingOp && ("module" in rejectingOp ? rejectingOp.module : rejectingOp.moduleKey);
  const { data: rejectReasons } = useRejectionReasons(rejectingModule);

  const approve            = (id:string)    => {
    const op = operationFor(id);
    if (op && ("module" in op ? op.module : op.moduleKey) === "expenses") return;
    runOperationAction(id, "approve", () => approveMut.mutate({ id }));
  };
  const reject             = (id:string)    => {
    const operation = operationFor(id);
    if (operation && ("module" in operation ? operation.module : operation.moduleKey) === "expenses") return;
    if (currentRole.current === "head" && operation && ("module" in operation ? operation.module : operation.moduleKey) === "shifts") {
      if (!actionLock.current && getHeadReviewPolicy(operation, currentRole.current, detailFor(operation)).returnForReview) setRejectingId(id);
      return;
    }
    runOperationAction(id, "returnToManager", () => runSalesAction(() => salesContextFor(id), "return", () => setRejectingId(id)));
  };
  const requestClarification = (id:string)  => { runOperationAction(id, "clarify", () => setClarifyingId(id)); };
  const finalApprove       = async (id:string) => {
    if (actionLock.current) return;
    const operation = operationFor(id);
    if (!getHeadReviewPolicy(operation, currentRole.current, operation && detailFor(operation)).finalApprove) return;
    const context = captureAccess();
    if (!context) return;
    setActionsPending(true);
    let mutationStarted = false;
    try {
      const completed = await runHeadFinalApproval(operation, currentRole.current, loadFreshDetail, async operationId => {
        if (!accessStillCurrent(context)) throw new FinancialAccessChangedError();
        mutationStarted = true;
        await finalMut.mutateAsync({ id:operationId });
      }, actionLock);
      if (!completed && accessStillCurrent(context)) toast.error("تغيرت حالة العملية؛ حدّث القائمة وأعد المراجعة");
    } catch (error) {
      if (!mutationStarted && !(error instanceof FinancialAccessChangedError) && accessStillCurrent(context))
        toast.error(getErrorMessage(error, "ar")); // mutation hook already translates its errors
    } finally { if (mounted.current) setActionsPending(false); }
  };
  const bulkApprove        = (ids:string[]) => { runSalesBulkApproval(currentOps.current, ids, currentRole.current, eligible => bulkMut.mutate({ operationIds: eligible }), detailFor); };
  const bulkFinalApprove = async (ids:string[]) => {
    if (actionLock.current || ids.length===0 || headLegacyBulkIds(currentOps.current, ids, currentRole.current, detailFor).length !== new Set(ids).size) return;
    const context = captureAccess();
    if (!context) return;
    actionLock.current = true;
    setActionsPending(true);
    let mutationStarted = false;
    try {
      const fresh = await Promise.all(ids.map(id => loadFreshDetail(id)));
      if (!accessStillCurrent(context)) throw new FinancialAccessChangedError();
      const freshById = new Map(fresh.map(op => [op.id, op]));
      if (headLegacyBulkIds(currentOps.current, ids, currentRole.current, op => freshById.get(op.id)).length !== new Set(ids).size) {
        toast.error("تغيرت حالة العمليات؛ راجع القائمة قبل الاعتماد الجماعي");
        return;
      }
      if (!accessStillCurrent(context)) throw new FinancialAccessChangedError();
      mutationStarted = true;
      await bulkFinalMut.mutateAsync({ operationIds:ids });
    } catch (error) {
      if (!mutationStarted && !(error instanceof FinancialAccessChangedError) && accessStillCurrent(context)) toast.error(getErrorMessage(error, "ar"));
    } finally { actionLock.current = false; if (mounted.current) setActionsPending(false); }
  };

  const rejectModalProps = {
    open: rejectingId !== null,
    subject: rejectingOp && ("refNum" in rejectingOp ? rejectingOp.refNum : rejectingOp.publicId),
    reasons: rejectReasons?.map(r=>({ key:r.key, labelAr:r.labelAr })),
    requireReasons: rejectingModule === "shifts",
    returnToManager: rejectingModule === "shifts" && currentRole.current === "accountant",
    returnToAccountant: rejectingModule === "shifts" && currentRole.current === "head",
    onClose: () => setRejectingId(null),
    onSubmit: async ({ reason, notes }: { reason: string; notes?: string }) => {
      if (rejectingId && currentRole.current === "head") {
        const operation = operationFor(rejectingId);
        const hasReason = rejectingModule !== "shifts" || rejectReasons?.some(r => r.key === reason);
        if (!actionLock.current && operation && hasReason && getHeadReviewPolicy(operation, currentRole.current, detailFor(operation)).returnForReview &&
          getSalesActionPolicy(salesContextFor(rejectingId)).return) {
          actionLock.current = true; setActionsPending(true);
          let mutationStarted = false;
          try {
            const detail = await loadFreshDetail(rejectingId);
            if (getHeadReviewPolicy(operation, currentRole.current, detail).returnForReview &&
              getSalesActionPolicy({ operation, detail, role:currentRole.current }).return) {
              mutationStarted = true;
              if (typeof rejectMut.mutateAsync === "function") {
                await rejectMut.mutateAsync({ id:rejectingId, reason, notes });
              } else {
                await new Promise<void>((resolve, reject) => {
                  rejectMut.mutate({ id:rejectingId, reason, notes }, { onSuccess: () => resolve(), onError: reject });
                });
              }
            } else {
              const err = "تغيرت حالة العملية؛ حدّث القائمة وأعد المراجعة";
              if (typeof toast !== "undefined") toast.error(err);
              throw new Error(err);
            }
          } catch (error) {
            if (!mutationStarted && !(error instanceof FinancialAccessChangedError) && typeof toast !== "undefined") toast.error(getErrorMessage(error, "ar"));
            throw error;
          }
          finally { actionLock.current = false; setActionsPending(false); }
        } else { throw new Error("Action unavailable or operation changed"); }
      } else if (rejectingId && (rejectingModule !== "shifts" || rejectReasons?.some(r => r.key === reason))) {
        if (actionLock.current) throw new Error("Action already in progress");
        actionLock.current = true; setActionsPending(true);
        try {
          let request: unknown;
          const allowed = runOperationAction(rejectingId, "returnToManager", () => {
            request = runSalesAction(() => salesContextFor(rejectingId), "return", async () => {
              try {
                if (typeof rejectMut.mutateAsync === "function") {
                  await rejectMut.mutateAsync({ id: rejectingId, reason, notes });
                } else {
                  await new Promise<void>((resolve, reject) => {
                    rejectMut.mutate({ id: rejectingId, reason, notes }, { onSuccess: () => resolve(), onError: reject });
                  });
                }
              } catch (error) {
                if (typeof toast !== "undefined") toast.error(getErrorMessage(error, "ar"));
                throw error;
              }
            });
          });
          if (!allowed || !request || typeof (request as Promise<unknown>).then !== "function") throw new Error("Operation changed; refresh before returning it");
          await request;
        } finally { actionLock.current = false; setActionsPending(false); }
      } else { throw new Error("Action unavailable"); }
      setRejectingId(null);
    },
  };

  const clarifyingOp = clarifyingId ? operationFor(clarifyingId) : undefined;
  const clarifyModalProps = {
    open: clarifyingId !== null,
    subject: clarifyingOp && ("refNum" in clarifyingOp ? clarifyingOp.refNum : clarifyingOp.publicId),
    onClose: () => setClarifyingId(null),
    onSubmit: async ({ message }: { message: string }) => {
      if (!clarifyingId || actionLock.current) throw new Error("Action unavailable or already in progress");
      actionLock.current = true; setActionsPending(true);
      try {
        let request: Promise<unknown> | undefined;
        const allowed = runOperationAction(clarifyingId, "clarify", () => {
          request = clarifyMut.mutateAsync({ id: clarifyingId, message });
        });
        if (!allowed || !request) throw new Error("Operation changed; refresh before requesting clarification");
        await request;
        setClarifyingId(null);
      } finally { actionLock.current = false; setActionsPending(false); }
    },
  };

  return { ops, approve, reject, requestClarification, finalApprove, bulkApprove, bulkFinalApprove, actionsPending,
    shiftReviewPage, setShiftReviewPage, rejectModalProps, clarifyModalProps, clearDialogs };
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT DASHBOARD
// ═══════════════════════════════════════════════════
function AccDashboard({ navigate, ops }:{ navigate:(p:string)=>void; ops:COp[] }) {
  const { t, dir } = useCLang();
  const { data: dash } = useAccDashboard();

  // ── ops-derived fallbacks (used when the dashboard endpoint is unavailable) ──
  const pending      = ops.filter(o=>o.status==="pending");
  const approved     = ops.filter(o=>o.status==="approved");
  const finalApproved= ops.filter(o=>o.status==="final-approved");
  const rejected     = ops.filter(o=>o.status==="rejected");
  const fbApprovalRate = ops.length>0 ? Math.round((approved.length+finalApproved.length)/ops.length*100) : 0;

  // ── prefer live dashboard data, else fall back to ops ──
  const cAwaiting = dash?.counts?.awaitingReview  ?? pending.length;
  const cApproved = dash?.counts?.iApproved       ?? approved.length;
  const cFinal    = dash?.counts?.finalApproved   ?? finalApproved.length;
  const cRate     = dash?.counts?.approvalRatePct ?? fbApprovalRate;
  const rejectedReupload = dash?.rejectedReuploadNeededCount ?? rejected.length;

  const headerDate  = dash?.today ?? "";
  const branchCount = dash?.scope?.branchCount ?? new Set(ops.map(o=>o.branch)).size;
  const moduleLabels= dash?.scope?.moduleLabelsAr;

  const modIconsFb:Record<string,string> = {
    sales:"💰", expenses:"🧾", purchases:"🛒", inventory:"📦",
    waste:"🗑️", assets:"🏷️", shifts:"🕐", employees:"👥", cash:"💵",
  };
  const modLabelsFb:Record<string,string> = {
    sales:"المبيعات", expenses:"المصروفات", purchases:"المشتريات", inventory:"المخزون",
    waste:"الهدر", assets:"الأصول", shifts:"الورديات", employees:"الموظفين", cash:"النقدية",
  };
  const modPages:Record<string,string> = {
    sales:"acc-sales", expenses:"acc-expenses", purchases:"acc-purchases", inventory:"acc-inventory",
    waste:"acc-waste", assets:"acc-assets", shifts:"acc-shifts", employees:"acc-employees", cash:"acc-cash",
  };

  // 9-module grid — prefer live modules[], else derive the four main ones from ops.
  const moduleTiles = dash?.modules ?? (["sales","expenses","purchases","inventory"] as CModKey[]).map(mod=>({
    key: mod,
    labelAr: modLabelsFb[mod],
    label: modLabelsFb[mod],
    icon: modIconsFb[mod],
    pendingCount: pending.filter(o=>o.module===mod).length,
    totalCount: ops.filter(o=>o.module===mod).length,
    hasUrgent: pending.some(o=>o.module===mod && o.match==="diff"),
  }));

  // Progress bars — prefer live progressToday, else ops-derived.
  const progressBars = dash?.progressToday ? [
    {ar:"المراجعة",    en:"Review",             pct:dash.progressToday.reviewPct,            color:"bg-purple-500"},
    {ar:"الموافقة",    en:"Approval",           pct:dash.progressToday.approvalPct,          color:"bg-emerald-500"},
    {ar:"التوثيق",     en:"Documentation",      pct:dash.progressToday.documentationPct,     color:"bg-blue-500"},
    {ar:"الفروع المكتملة",en:"Completed Branches",pct:dash.progressToday.completedBranchesPct,color:"bg-cyan-500"},
  ] : [
    {ar:"المراجعة",    en:"Review",             pct:ops.length>0?Math.round(ops.filter(o=>o.status!=="pending").length/ops.length*100):0, color:"bg-purple-500"},
    {ar:"الموافقة",    en:"Approval",           pct:ops.length>0?Math.round(ops.filter(o=>o.status==="approved"||o.status==="final-approved").length/ops.length*100):0, color:"bg-emerald-500"},
    {ar:"التوثيق",     en:"Documentation",      pct:(()=>{const d=ops.filter(o=>o.status!=="pending").length;return d>0?Math.round(finalApproved.length/d*100):0;})(), color:"bg-blue-500"},
    {ar:"الفروع المكتملة",en:"Completed Branches",pct:(()=>{const tot=new Set(ops.map(o=>o.branch)).size;return tot>0?Math.round(new Set(ops.filter(o=>o.status!=="pending").map(o=>o.branch)).size/tot*100):0;})(), color:"bg-cyan-500"},
  ];

  // Needs-attention — prefer live needsAttention[], else ops match:"diff".
  const needsAttention = dash?.needsAttention ?? ops
    .filter(o=>o.status==="pending"&&o.match==="diff")
    .map(o=>({ operationId:o.id, refNum:o.refNum, branch:o.branch, moduleLabel:o.moduleLabel, match:o.match, diff:o.diff ?? "" }));

  return (
    <div className="space-y-5" dir={dir}>
      <div>
        <h2 className="text-xl font-bold text-gray-800">
          {t("ملخص اليوم","Today's Summary")}{headerDate ? ` — ${headerDate}` : ""}
        </h2>
        <p className="text-gray-400 text-sm mt-0.5">
          {COMPANY.name} · {t("مسؤول عن","Responsible for")} {branchCount} {t("فروع","branches")}
          {moduleLabels && moduleLabels.length>0 ? ` · ${t("الموديولات","Modules")}: ${moduleLabels.join("، ")}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("تنتظر مراجعتي","Awaiting My Review")}   value={String(cAwaiting)} sub={t("📱 رُفعت من الفروع","📱 Uploaded from branches")}      icon={<Clock size={18} className="text-amber-600"/>}      accent="amber"/>
        <KpiCard label={t("وافقت عليها","I Approved")}              value={String(cApproved)} sub={t("بانتظار الاعتماد النهائي","Awaiting final approval")}   icon={<CheckCircle2 size={18} className="text-sky-600"/>}  accent="blue"/>
        <KpiCard label={t("معتمدة نهائياً","Final Approved")}       value={String(cFinal)}    sub={t("مُغلقة — بانتظار ERP","Closed — awaiting ERP")}        icon={<Lock size={18} className="text-emerald-600"/>}     accent="emerald"/>
        <KpiCard label={t("معدل الموافقة","Approval Rate")}         value={`${cRate}%`}       sub={t("موافقاتي مقابل مراجعاتي","My approvals vs my reviews")} icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
      </div>

      {/* Branch/day state chips (T03 §12) */}
      <BranchDayStateChips date={dash?.today}/>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-sm">🎯 {t("تقدم اليوم","Today's Progress")}</h3>
          <span className="text-xs text-gray-400">{t("الهدف: مراجعة جميع العمليات المعلقة","Goal: Review all pending operations")}</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {progressBars.map(({ar,en,pct,color})=>{
            const p = Math.min(100,Math.max(0,pct||0));
            return (
              <div key={ar}>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="font-semibold text-gray-600">{t(ar,en)}</span>
                  <span className={`font-bold ${p===100?"text-emerald-600":"text-gray-500"}`}>{p}% {p===100?"✅":""}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${color} transition-all`} style={{width:`${p}%`}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CPipelineOverview ops={ops}/>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3">⏳ {t("العمليات بحسب الموديول","Operations by Module")}</h3>
          <div className="grid grid-cols-3 gap-2">
            {moduleTiles.map(m=>(
              <button
                key={m.key}
                onClick={()=>navigate(modPages[m.key] ?? "acc-dashboard")}
                className="relative text-right bg-gray-50 hover:bg-purple-50 border border-gray-100 rounded-lg p-3 transition-colors"
              >
                {m.hasUrgent && <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-red-500"/>}
                <div className="text-lg mb-1">{m.icon ?? modIconsFb[m.key] ?? "📄"}</div>
                <div className="text-xs font-semibold text-gray-700 truncate">{m.labelAr ?? modLabelsFb[m.key] ?? m.key}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge className={`text-[10px] ${m.pendingCount>0?"bg-amber-50 text-amber-700 border border-amber-200":"bg-gray-100 text-gray-400"}`}>{m.pendingCount} {t("معلق","pending")}</Badge>
                  <span className="text-[10px] text-gray-400">/ {m.totalCount}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3">🔴 {t("يحتاج انتباهاً فورياً","Needs Immediate Attention")}</h3>
          <div className="space-y-2">
            {needsAttention.length===0 && (
              <p className="text-xs text-gray-400 text-center py-4">✅ {t("لا توجد فروق تحتاج انتباهاً","No discrepancies requiring attention")}</p>
            )}
            {needsAttention.map(n=>(
              <div key={n.operationId} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                <AlertTriangle size={12} className="text-red-500 flex-shrink-0 mt-0.5"/>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700">{n.branch} — {n.moduleLabel}</p>
                  <p className="text-[10px] text-red-600">{n.diff}</p>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">{n.refNum}</span>
              </div>
            ))}
            {rejectedReupload>0 && (
              <div className="pt-2 border-t border-gray-50 mt-1">
                <p className="text-[11px] text-red-500 font-semibold">{rejectedReupload} {t("عملية مرفوضة — تحتاج إعادة رفع من الفرع","rejected operations — need re-upload from branch")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — SALES MODULE (Full Featured)
// ═══════════════════════════════════════════════════
function AccCompanySales({ ops, approve, reject, requestClarification, bulkApprove }:{ ops:COp[]; approve:(id:string)=>void; reject:(id:string)=>void; requestClarification?:(id:string)=>void; bulkApprove:(ids:string[])=>void }) {
  const { t, dir } = useCLang();
  const queryClient = useQueryClient();
  const exportOpsMut = useExportOperations();
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<""|COpStatus>("");
  const [matchFilter,  setMatchFilter]  = useState<""|CMatch>("");
  const [brandFilter,  setBrandFilter]  = useState("الكل");
  const [dateFilter,   setDateFilter]   = useState("الكل");
  const [search,       setSearch]       = useState("");
  const [expandedId,   setExpandedId]   = useState<string|null>(null);

  const mOps = ops.filter(o=>o.module==="sales");
  const pending = mOps.filter(o=>o.status==="pending");
  const brandNames = cBrandNamesFromOps(ops);

  // Live day-completeness pills (T04 §3) + sales KPIs (T04 §2).
  const { data: dayRows = [] } = useSalesDayCompleteness(7);
  const salesDate = dateFilter !== "الكل" ? dateFilter : undefined;
  const { data: kpis } = useSalesKpis(salesDate);
  const selectedDay = dayRows.find(r=>r.date===dateFilter);

  const shown = mOps.filter(op=>{
    if(branchFilter && !op.branch.includes(branchFilter)) return false;
    if(statusFilter && op.status!==statusFilter) return false;
    if(matchFilter && op.match!==matchFilter) return false;
    if(brandFilter!=="الكل" && op.brandName!==brandFilter) return false;
    if(salesDate && op.date.slice(0,10)!==salesDate) return false;
    if(search && !op.branch.includes(search) && !op.submittedBy.includes(search) && !op.refNum.includes(search)) return false;
    return true;
  });
  const shownPending = shown.filter(o=>o.status==="pending");
  const bulkSalesIds = salesBulkApprovalIds(shown, shownPending.map(op => op.id), "accountant",
    op => queryClient.getQueryData<ApiOperation>(queryKeys.operation(op.id)));
  const clearFilters = () => { setBranchFilter(""); setStatusFilter(""); setMatchFilter(""); setBrandFilter("الكل"); setDateFilter("الكل"); setSearch(""); };
  const hasFilters = branchFilter||statusFilter||matchFilter||brandFilter!=="الكل"||dateFilter!=="الكل"||search;
  const totalShown = sumCOpAmounts(shown.filter(o=>o.status!=="rejected"));

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول المبيعات","Sales Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{pending.length} {t("بيان معلق بانتظار مراجعتك","pending statements awaiting your review")}</p></div>
        {bulkSalesIds.length>0 && <Btn variant="success" size="sm" onClick={()=>bulkApprove(bulkSalesIds)}>✓ {t("موافقة على الكل","Approve All")} ({bulkSalesIds.length})</Btn>}
        {pending.some(isPkg6SalesReport) && <p className="text-xs text-amber-700">{t("تقارير اليوم تُعتمد فرديًا","Day reports are approved individually")}</p>}
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("إجمالي البيانات المرفوعة","Total Uploaded")} value={String(mOps.length)} sub={t("كل الحالات","All statuses")}          icon={<FileText size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("قيد المراجعة","Under Review")}               value={String(pending.length)} sub={t("رُفعت من الفروع","Uploaded from branches")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("تمت الموافقة","Approved")}                   value={String(mOps.filter(o=>o.status==="approved"||o.status==="final-approved").length)} sub={t("موافق + معتمد نهائياً","Approved + Final")} icon={<CheckCircle2 size={18} className="text-sky-600"/>} accent="blue"/>
        <KpiCard label={t("مرفوضة","Rejected")}                         value={String(mOps.filter(o=>o.status==="rejected").length)} sub={t("تحتاج إعادة رفع","Needs re-upload")} icon={<XCircle size={18} className="text-red-600"/>} accent="red"/>
      </div>

      {/* Sales financial KPIs (T04 §2) — live from GET /company/me/sales/kpis */}
      {kpis && (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label={t("إجمالي المبيعات","Total Sales")}   value={`${fmtH(kpis.totalSalesHalalas)}`}     sub={`${kpis.branchCount} ${t("فرع","branches")}`} icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
          <KpiCard label={t("إجمالي التحصيل","Total Collected")} value={`${fmtH(kpis.totalCollectedHalalas)}`}  sub={kpis.trendPct==null?t("لا مقارنة","—"):`${kpis.trendPct>0?"▲":"▼"} ${Math.abs(kpis.trendPct)}%`} icon={<CheckCircle2 size={18} className="text-sky-600"/>} accent="blue"/>
          <KpiCard label={t("الفرق","Variance")}                value={`${fmtH(kpis.totalVarianceHalalas)}`}   sub={`${kpis.varianceCaseCount} ${t("حالة فرق","variance cases")}`} icon={<AlertTriangle size={18} className="text-red-600"/>} accent={kpis.totalVarianceHalalas===0?"emerald":"red"}/>
          <KpiCard label={t("فروع بلا فرق","Zero-Variance Branches")} value={String(kpis.zeroVarianceBranchCount)} sub={t("تحصيل مطابق","Collection matches")} icon={<Lock size={18} className="text-emerald-600"/>} accent="emerald"/>
        </div>
      )}

      {/* Variance branches banner (ACC-1.5) */}
      {kpis && kpis.varianceBranches.length>0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4" dir={dir}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-red-600"/>
            <p className="text-sm font-bold text-red-800">{t("تنبيه: توجد فروق في التحصيل","Alert: collection variances detected")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {kpis.varianceBranches.map(vb=>(
              <span key={vb.branchId} className="text-[11px] bg-white border border-red-200 text-red-700 px-2 py-1 rounded-lg font-semibold">
                {vb.name}: <span className="font-mono">{fmtH(vb.varianceHalalas)} ر.س</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3" dir={dir}>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>setDateFilter("الكل")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${dateFilter==="الكل"?"bg-purple-600 text-white border-purple-600":"bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
            {t("الكل","All")}
            <span className={`text-[9px] px-1 rounded-full ${dateFilter==="الكل"?"bg-purple-500 text-purple-100":"bg-gray-100 text-gray-500"}`}>{mOps.length}</span>
          </button>
          {dayRows.map(d=>(
            <button key={d.date} onClick={()=>setDateFilter(d.date)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${dateFilter===d.date?"bg-purple-600 text-white border-purple-600":d.missingCount>0?"bg-white text-amber-700 border-amber-200 hover:border-amber-300":"bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
              {d.pillLabelAr}
              <span className={`text-[9px] px-1 rounded-full ${dateFilter===d.date?"bg-purple-500 text-purple-100":d.missingCount>0?"bg-amber-100 text-amber-700":"bg-gray-100 text-gray-500"}`}>{d.completedCount}/{d.requiredCount}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفرع","Branch")}</label>
            <select value={branchFilter} onChange={e=>setBranchFilter(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value="">{t("الكل","All")}</option>
              {ALL_BRANCHES.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحالة","Status")}</label>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value="">{t("الكل","All")}</option>
              {(Object.entries(STATUS_CFG) as [COpStatus,any][]).map(([k,v])=><option key={k} value={k}>{t(v.label, EN_STATUS_CD[k].label)}</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المطابقة","Match")}</label>
            <select value={matchFilter} onChange={e=>setMatchFilter(e.target.value as any)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value="">{t("الكل","All")}</option>
              {(Object.entries(MATCH_CFG) as [CMatch,any][]).map(([k,v])=><option key={k} value={k}>{t(v.label, EN_MATCH_CD[k])}</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("العلامة التجارية","Brand")}</label>
            <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} disabled={brandNames.length===0} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 disabled:bg-gray-50 disabled:text-gray-400">
              <option>{t("الكل","All")}</option>
              {brandNames.map(n=><option key={n}>{n}</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("بحث","Search")}</label>
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-2">
              <Search size={11} className="text-gray-400 flex-shrink-0"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("بحث...","Search...")} className="flex-1 text-xs outline-none"/>
            </div>
          </div>
        </div>
        {hasFilters && <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-purple-600 hover:underline"><RotateCcw size={10}/> {t("مسح الفلاتر","Clear filters")}</button>}
      </div>

      {selectedDay && (
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${selectedDay.missingCount>0?"bg-amber-50 border-amber-200":"bg-emerald-50 border-emerald-200"}`} dir={dir}>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">{selectedDay.pillLabelAr}</p>
            <p className="text-xs text-gray-500 mt-0.5">{selectedDay.bannerAr}</p>
            {selectedDay.missingBranches.length>0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedDay.missingBranches.map(b=>(
                  <span key={b.branchId} className="text-[10px] bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-lg">{b.name}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-6 text-center">
            <div><p className="text-lg font-black text-gray-800">{selectedDay.requiredCount}</p><p className="text-[10px] text-gray-500">{t("مطلوبة","Required")}</p></div>
            <div><p className="text-lg font-black text-emerald-600">{selectedDay.completedCount}</p><p className="text-[10px] text-gray-500">{t("مكتملة","Done")}</p></div>
            <div><p className={`text-lg font-black ${selectedDay.missingCount>0?"text-amber-600":"text-gray-300"}`}>{selectedDay.missingCount}</p><p className="text-[10px] text-gray-500">{t("ناقص","Missing")}</p></div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <div><h3 className="font-bold text-gray-900 text-sm">{t("بيانات المبيعات","Sales Statements")}</h3><p className="text-[11px] text-gray-400 mt-0.5">{shown.length} {t("بيان · إجمالي","statements · total")} {fmt(totalShown)} {t("ر.س","SAR")}</p></div>
          <div className="flex gap-2">
            <button onClick={()=>exportOpsMut.mutate({moduleKey:"sales", format:"xlsx"})} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><Download size={11}/> Excel</button>
            {bulkSalesIds.length>0 && <Btn size="sm" variant="success" onClick={()=>bulkApprove(bulkSalesIds)}>✓ موافقة جماعية ({bulkSalesIds.length})</Btn>}
          </div>
        </div>
        {shown.length===0
          ? <div className="py-10 text-center text-gray-400 text-sm">✅ لا توجد بيانات تطابق الفلاتر</div>
          : shown.map(op=>(
              <OpRow key={op.id} op={op} onApprove={()=>approve(op.id)} onReject={()=>reject(op.id)}
                onClarify={requestClarification?()=>requestClarification(op.id):undefined}
                onView={()=>setExpandedId(expandedId===op.id?null:op.id)}
                expanded={expandedId===op.id} onToggle={()=>setExpandedId(expandedId===op.id?null:op.id)}/>
            ))
        }
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — EXPENSES MODULE (Full Featured)
// ═══════════════════════════════════════════════════
// Convert-modal payload threaded from an expense invoice row.
type ConvertModalState = {
  opId:string; invoiceIndex:number; invNum:string; vendor:string; desc:string;
  amount:number; preTaxHalalas:number; branch:string; branchId?:string; date:string;
};

// ── Review modal (T05 §4) — record the paper document, side-by-side ──────────
function ExpenseReviewModal({ opId, inv, onClose }:{ opId:string; inv:ExpenseInvoiceRow; onClose:()=>void }) {
  const { t, dir } = useCLang();
  const reviewMut = useReviewExpenseInvoice();
  const [docAmount, setDocAmount] = useState(inv.documentAmountHalalas!=null ? String(inv.documentAmountHalalas/100) : "");
  const [docVendor, setDocVendor] = useState(inv.documentVendor ?? "");
  const [docInvNum, setDocInvNum] = useState(inv.documentInvNum ?? "");
  const [docDate,   setDocDate]   = useState(inv.documentDate ?? "");
  const [result, setResult] = useState<{ rows:{field:string;labelAr:string;entered:string|number|null;document:string|number|null;matches:boolean}[]; deltaNoteAr?:string|null }|null>(null);

  const save = () => {
    reviewMut.mutate(
      { invoiceId: opId, invoiceIndex: inv.index,
        documentAmountHalalas: docAmount.trim()===""? null : Math.round(parseFloat(docAmount)*100),
        documentVendor: docVendor || null, documentInvNum: docInvNum || null, documentDate: docDate || null },
      { onSuccess: (res)=>setResult({ rows: res.rows, deltaNoteAr: res.deltaNoteAr }) },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir={dir}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-l from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
          <p className="font-bold text-sm">{t("مراجعة الفاتورة","Invoice Review")} · {inv.invNum}</p>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={18}/></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-[11px] text-gray-500">{t("أدخل بيانات الفاتورة الورقية المرفقة لمطابقتها مع المُدخل.","Enter the attached paper invoice to match against the entered values.")}</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[11px] text-gray-500 block mb-1">{t("المبلغ شامل الضريبة (ر.س)","Amount incl. VAT (SAR)")}</label>
              <input type="number" value={docAmount} onChange={e=>setDocAmount(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"/></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">{t("رقم الفاتورة","Invoice No.")}</label>
              <input value={docInvNum} onChange={e=>setDocInvNum(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"/></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">{t("المورد","Vendor")}</label>
              <input value={docVendor} onChange={e=>setDocVendor(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"/></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">{t("التاريخ","Date")}</label>
              <input type="date" value={docDate?.slice(0,10) ?? ""} onChange={e=>setDocDate(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"/></div>
          </div>
          {result && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-50 text-[10px] font-bold text-gray-500 px-3 py-1.5"><span>{t("الحقل","Field")}</span><span>{t("المُدخل","Entered")}</span><span>{t("الفاتورة الأصلية","Document")}</span></div>
              {result.rows.map(r=>(
                <div key={r.field} className={`grid grid-cols-3 px-3 py-1.5 text-[11px] border-t border-gray-50 ${r.matches?"":"bg-red-50/50"}`}>
                  <span className="text-gray-600">{r.labelAr}</span>
                  <span className="font-mono text-gray-800">{String(r.entered ?? "—")}</span>
                  <span className={`font-mono ${r.matches?"text-gray-800":"text-red-600 font-bold"}`}>{String(r.document ?? "—")}</span>
                </div>
              ))}
              {result.deltaNoteAr && <p className="text-[11px] text-red-600 font-semibold px-3 py-2 bg-red-50">{result.deltaNoteAr}</p>}
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-2 justify-end">
          <Btn onClick={onClose}>{t("إغلاق","Close")}</Btn>
          <Btn variant="primary" onClick={save} disabled={reviewMut.isPending}>{reviewMut.isPending?t("جارٍ الحفظ…","Saving…"):t("مطابقة وحفظ","Match & Save")}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Expenses statement panel (T05 §1/§3/§4/§5) ──────────────────────────────
const INV_MATCH_CFG: Record<string,{cls:string}> = {
  matched:  { cls:"bg-emerald-50 text-emerald-700 border-emerald-200" },
  mismatch: { cls:"bg-amber-50 text-amber-700 border-amber-200" },
  missing:  { cls:"bg-red-50 text-red-700 border-red-200" },
};
function ExpenseStatementPanel({ op, onApprove, onReject, onConvert, convertedInvNums }:{
  op:COp; onApprove:()=>void; onReject:()=>void;
  onConvert:(s:ConvertModalState)=>void; convertedInvNums:Set<string>;
}) {
  const { t } = useCLang();
  const detailQ = useOperation(op.id);
  const exp = detailQ.data?.expenses ?? null;
  const verifyMut = useVerifyExpenseInvoice();
  const unverifyMut = useUnverifyExpenseInvoice();
  const [reviewInv, setReviewInv] = useState<ExpenseInvoiceRow|null>(null);
  const invoices = exp?.invoices ?? [];
  const isLocked = exp?.isLocked ?? (op.status==="final-approved");

  const toggleVerify = (inv:ExpenseInvoiceRow) => {
    if (isLocked) return;
    if (inv.verified) unverifyMut.mutate({ invoiceId: op.id, invoiceIndex: inv.index });
    else verifyMut.mutate({ invoiceId: op.id, invoiceIndex: inv.index });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-700">{t("الفواتير المرفقة","Attached Invoices")} ({exp?.totals.invoiceCount ?? 0})</p>
        {exp?.allVerified && invoices.length>0 && (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">{exp.allVerifiedBadgeAr ?? "✅ كل الفواتير موثّقة"}</Badge>
        )}
      </div>

      {detailQ.isLoading && <p className="text-xs text-gray-400 text-center py-4">{t("جارٍ التحميل…","Loading…")}</p>}
      {!detailQ.isLoading && invoices.length===0 && (
        <p className="text-xs text-gray-400 text-center py-4">{t("لا توجد فواتير في هذا البيان","No invoices in this statement")}</p>
      )}

      {invoices.length>0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gray-100 text-gray-600 font-semibold">
                <th className="px-3 py-2 text-right">{t("رقم الفاتورة","Invoice")}</th>
                <th className="px-3 py-2 text-right">{t("المورد","Vendor")}</th>
                <th className="px-3 py-2 text-center">{t("قبل الضريبة","Pre-tax")}</th>
                <th className="px-3 py-2 text-center bg-amber-50/80 text-amber-700">{t("ضريبة ١٥٪","VAT 15%")}</th>
                <th className="px-3 py-2 text-center bg-emerald-50/80 text-emerald-700">{t("الإجمالي","Total")}</th>
                <th className="px-3 py-2 text-center">{t("المطابقة","Match")}</th>
                <th className="px-3 py-2 text-center">{t("توثيق","Verify")}</th>
                <th className="px-3 py-2 text-center bg-purple-50/80 text-purple-700">{t("أصل ثابت","Asset")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {invoices.map(inv=>{
                const converted = inv.convertedToAsset || convertedInvNums.has(inv.invNum);
                const matchCfg = INV_MATCH_CFG[inv.matchStatus] ?? INV_MATCH_CFG.missing;
                return (
                  <tr key={inv.index} className={`${inv.verified?"bg-emerald-50/30":""} ${converted?"bg-purple-50/20":""} hover:bg-gray-50`}>
                    <td className="px-3 py-2.5 font-mono font-bold text-purple-700">{inv.invNum}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{inv.vendor}<div className="text-[10px] text-gray-400 font-normal">{inv.desc}</div></td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-600">{fmtH(inv.preTaxHalalas)}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-amber-600 bg-amber-50/20">{fmtH(inv.vat15Halalas)}</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">{fmtH(inv.inclTaxHalalas)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={()=>!isLocked && setReviewInv(inv)} disabled={isLocked}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${matchCfg.cls}`}>
                        {inv.matchIcon} {inv.matchLabelAr}
                      </button>
                      {inv.matchStatus==="mismatch" && inv.deltaNoteAr && <div className="text-[9px] text-red-600 mt-0.5">{inv.deltaNoteAr}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={()=>toggleVerify(inv)} disabled={isLocked} title={inv.verified?t("مُوثَّق","Verified"):t("اضغط للتوثيق","Verify")}
                        className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all ${inv.verified?"bg-emerald-500 text-white":"border-2 border-dashed border-gray-300 text-gray-300 hover:border-emerald-400 hover:text-emerald-400"} ${isLocked?"opacity-50 cursor-not-allowed":""}`}>
                        <CheckSquare size={12}/>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center bg-purple-50/10">
                      {converted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-[10px] font-semibold">
                          <Building2 size={9}/> {inv.convertedLabelAr ?? t("محوّل","Converted")}
                        </span>
                      ) : (
                        <button disabled={isLocked}
                          onClick={()=>onConvert({ opId:op.id, invoiceIndex:inv.index, invNum:inv.invNum, vendor:inv.vendor, desc:inv.desc,
                            amount:inv.inclTaxHalalas, preTaxHalalas:inv.preTaxHalalas, branch:op.branch, branchId:op.branchId, date:inv.date })}
                          className={`group inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 border-dashed border-purple-200 text-purple-400 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 transition-all ${isLocked?"opacity-50 cursor-not-allowed":""}`}>
                          <ArrowRightToLine size={10}/>
                          <span className="text-[10px] font-semibold hidden group-hover:inline">{t("أصل ثابت","Asset")}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {exp && (
              <tfoot className="bg-gray-100 border-t-2 border-gray-200 font-bold text-xs">
                <tr>
                  <td colSpan={2} className="px-3 py-2.5 text-right text-gray-800">{t("الإجمالي","Total")}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-gray-600">{fmtH(exp.totals.preTaxHalalas)}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-amber-600 bg-amber-50/20">{fmtH(exp.totals.vat15Halalas)}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-emerald-700 bg-emerald-50/20">{fmtH(exp.totals.inclTaxHalalas)}</td>
                  <td className="px-3 py-2.5 text-center text-[10px] text-gray-500">{exp.matchSummary.matched}✅ {exp.matchSummary.mismatch}⚠️ {exp.matchSummary.missing}❌</td>
                  <td className="px-3 py-2.5 text-center text-[10px] text-gray-500">{exp.verifiedCount}/{exp.totals.invoiceCount}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Attachments per invoice (T05 §5) */}
      {invoices.some(i=>i.attachments.length>0) && (
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-[11px] font-bold text-gray-600 mb-2">📎 {t("المرفقات","Attachments")}</p>
          <div className="space-y-1.5">
            {invoices.filter(i=>i.attachments.length>0).map(inv=>(
              <div key={inv.index} className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-purple-600">{inv.invNum}</span>
                {inv.attachments.map(att=>(
                  <a key={att.id} href={att.publicUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-lg hover:bg-blue-100">
                    <Paperclip size={9}/> {att.filename}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {op.status==="pending" && !isLocked && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          {t("اعتماد/رفض المصروفات من صلاحية مالك العلامة وفق سياسة EXP-06 — دور المحاسب يقتصر على المراجعة والمطابقة والتحويل لأصول", "Expense decision is restricted to Brand Owner per EXP-06 — Accountant role is limited to review, matching and asset conversion")}
        </div>
      )}

      {reviewInv && <ExpenseReviewModal opId={op.id} inv={reviewInv} onClose={()=>setReviewInv(null)}/>}
    </div>
  );
}

function AccCompanyExpenses({ ops, approve, reject, bulkApprove }:{ ops:COp[]; approve:(id:string)=>void; reject:(id:string)=>void; bulkApprove:(ids:string[])=>void }) {
  const { drafts, discardDraft, confirmDraft, getConvertedInvNums } = useContext(CAssetDraftContext);
  const exportOpsMut = useExportOperations();
  const { data: kpis } = useExpensesKpis();
  const [expandedId,       setExpandedId]       = useState<string|null>(null);
  const [brandFilter,      setBrandFilter]      = useState("الكل");
  const [statusFilter,     setStatusFilter]     = useState<""|COpStatus>("");
  const [search,           setSearch]           = useState("");
  const [convertModal,     setConvertModal]     = useState<ConvertModalState|null>(null);

  const convertedInvNums = getConvertedInvNums();
  const mOps = ops.filter(o=>o.module==="expenses");
  const pending = mOps.filter(o=>o.status==="pending");
  const pendingDrafts = drafts.filter(d=>d.status==="draft");
  const brandNames = cBrandNamesFromOps(ops);

  const shown = mOps.filter(op=>{
    if(brandFilter!=="الكل" && op.brandName!==brandFilter) return false;
    if(statusFilter && op.status!==statusFilter) return false;
    if(search && !op.branch.includes(search) && !op.submittedBy.includes(search)) return false;
    return true;
  });

  const totalShown = sumCOpAmounts(shown);

  const { t, dir } = useCLang();
  const SAR = t("ر.س","SAR");
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول المصروفات","Expenses Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{pending.length} {t("بيان معلق — كل بيان قد يحتوي فواتير متعددة","pending entries — each may contain multiple invoices")}</p></div>
        {pending.length>0 && <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">{t("اعتماد المصروفات من صلاحية مالك العلامة (EXP-06)","Expense approval is restricted to Brand Owner (EXP-06)")}</span>}
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("إجمالي البيانات المرفوعة","Total Entries")}  value={String(mOps.length)} sub={t("كل الحالات","all statuses")} icon={<FileText size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("قيد المراجعة","Under Review")}               value={String(pending.length)} sub={t("رُفعت من الفروع","Uploaded from branches")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("تمت الموافقة","Approved")}                   value={String(mOps.filter(o=>o.status==="approved"||o.status==="final-approved").length)} sub={t("موافق + معتمد نهائياً","approved + final")} icon={<CheckCircle2 size={18} className="text-sky-600"/>} accent="blue"/>
        <KpiCard label={t("مرفوضة","Rejected")}                         value={String(mOps.filter(o=>o.status==="rejected").length)} sub={t("تحتاج إعادة رفع","needs re-upload")} icon={<XCircle size={18} className="text-red-600"/>} accent="red"/>
      </div>

      {/* Expenses financial + invoice-match KPIs (T05 §2) — GET /company/me/expenses/kpis */}
      {kpis && (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label={t("إجمالي المصروفات","Total Expenses")} value={fmtH(kpis.totalHalalas)} sub={`${t("ضريبة","VAT")} ${fmtH(kpis.vat15Halalas)}`} icon={<FileText size={18} className="text-purple-600"/>} accent="purple"/>
          <KpiCard label={t("فواتير مطابقة","Matched")}   value={String(kpis.pendingInvoices.matched)}  sub={t("قيد المراجعة","under review")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
          <KpiCard label={t("غير مطابقة","Mismatch")}      value={String(kpis.pendingInvoices.mismatch)} sub={t("تحتاج تدقيق","needs audit")} icon={<AlertTriangle size={18} className="text-amber-600"/>} accent="amber"/>
          <KpiCard label={t("مفقودة","Missing")}           value={String(kpis.pendingInvoices.missing)}  sub={t("بلا مستند","no document")} icon={<XCircle size={18} className="text-red-600"/>} accent="red"/>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("العلامة التجارية","Brand")}</label>
            <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} disabled={brandNames.length===0} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 disabled:bg-gray-50 disabled:text-gray-400"><option>{t("الكل","All")}</option>{brandNames.map(n=><option key={n}>{n}</option>)}</select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحالة","Status")}</label>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"><option value="">{t("الكل","All")}</option>{(Object.entries(STATUS_CFG) as [COpStatus,any][]).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("بحث","Search")}</label>
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-2"><Search size={11} className="text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("بحث...","Search...")} className="flex-1 text-xs outline-none"/></div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">{t("بيانات المصروفات","Expense Entries")}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{shown.length} {t("بيان","entries")} · {fmt(totalShown)} {SAR}</span>
            <button onClick={()=>exportOpsMut.mutate({moduleKey:"expenses", format:"xlsx"})} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><Download size={11}/> Excel</button>
          </div>
        </div>
        {shown.length===0
          ? <div className="py-10 text-center text-gray-400 text-sm">✅ {t("لا توجد بيانات","No data")}</div>
          : shown.map(op=>{
            const isExpanded = expandedId===op.id;
            return (
              <div key={op.id} className="border-b border-gray-100 last:border-0">
                <OpRow op={op} onApprove={()=>approve(op.id)} onReject={()=>reject(op.id)}
                  onView={()=>setExpandedId(isExpanded?null:op.id)}
                  expanded={isExpanded} onToggle={()=>setExpandedId(isExpanded?null:op.id)}/>
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-4">
                    <ExpenseStatementPanel op={op} onApprove={()=>approve(op.id)} onReject={()=>reject(op.id)}
                      onConvert={setConvertModal} convertedInvNums={convertedInvNums}/>
                  </div>
                )}
              </div>
            );
          })
        }
      </div>

      {/* ── بانر التحويلات المعلقة إلى أصول ثابتة ── */}
      {pendingDrafts.length>0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-purple-600"/>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-800 text-sm">{pendingDrafts.length} {pendingDrafts.length===1?"فاتورة تنتظر":"فواتير تنتظر"} التحويل إلى أصول ثابتة</p>
            <div className="mt-2 space-y-2">
              {pendingDrafts.map(d=>(
                <div key={d.draftId} className="flex items-center gap-3 bg-white rounded-xl border border-purple-100 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{d.assetName}</p>
                    <p className="text-[10px] text-gray-400">{d.invNum} · {d.vendor} · {fmt(d.amount)} ر.س · {d.branch}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={()=>confirmDraft(d.draftId)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-200 transition-all flex items-center gap-1">
                      <Check size={9}/> تأكيد
                    </button>
                    <button onClick={()=>discardDraft(d.draftId)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold hover:bg-red-100 transition-all flex items-center gap-1">
                      <X size={9}/> إلغاء
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: تحويل مصروف إلى أصل ثابت */}
      {convertModal && (
        <ConvertToAssetModalCD
          {...convertModal}
          onClose={()=>setConvertModal(null)}
          onSuccess={()=>setConvertModal(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — PURCHASES MODULE
// ═══════════════════════════════════════════════════
// ── Line-match badge (T06) — uses backend-supplied icon/labelAr, never hardcoded.
const PLINE_CFG:Record<string,string> = {
  matched: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  diff:    "bg-red-50 text-red-700 border border-red-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
};

// One editable purchase line (T06 §4). ordQty / rcvQty / invoice unit-price.
function PurchaseLineRow({ operationId, line, locked }:{ operationId:string; line:PurchaseLine; locked:boolean }) {
  const { t } = useCLang();
  const patchMut = usePatchPurchaseLine();
  const [editing, setEditing] = useState(false);
  const [ord,   setOrd]   = useState(String(line.ordQty));
  const [rcv,   setRcv]   = useState(line.rcvQty==null ? "" : String(line.rcvQty));
  const [price, setPrice] = useState(String(Math.round(line.unitPriceHalalas)/100));
  const cfg = PLINE_CFG[line.lineMatch?.key] ?? PLINE_CFG.pending;

  const save = () => {
    const patch:{ ordQty?:number; rcvQty?:number|null; unitPriceHalalas?:number } = {};
    const ordN = Number(ord);   if(ord.trim()!=="" && !Number.isNaN(ordN)) patch.ordQty = ordN;
    patch.rcvQty = rcv.trim()==="" ? null : Number(rcv);          // blank ⇒ pending, never 0-shortfall
    const priceH = Math.round(Number(price)*100); if(price.trim()!=="" && !Number.isNaN(priceH)) patch.unitPriceHalalas = priceH;
    patchMut.mutate({ operationId, rowId: line.rowId, patch }, { onSuccess:()=>setEditing(false) });
  };
  const cancel = () => {
    setOrd(String(line.ordQty));
    setRcv(line.rcvQty==null ? "" : String(line.rcvQty));
    setPrice(String(Math.round(line.unitPriceHalalas)/100));
    setEditing(false);
  };

  const pending = line.rcvQty==null;
  return (
    <div className={`grid grid-cols-[1.6fr_.7fr_.8fr_.8fr_1fr_1fr_1fr_auto] gap-1 px-3 py-2.5 border-b border-gray-50 last:border-0 text-xs items-center ${line.lineMatch?.key==="diff"?"bg-red-50/40":""}`}>
      <span className="font-medium text-gray-800 truncate">{line.item}</span>
      <span className="text-center text-gray-500">{line.unit}</span>
      {/* Ordered qty */}
      {editing ? (
        <input value={ord} onChange={e=>setOrd(e.target.value)} type="number" className="w-full text-center font-mono border border-purple-200 rounded px-1 py-0.5 text-[11px]"/>
      ) : <span className="text-center font-mono text-gray-600">{line.ordQty}</span>}
      {/* Received qty */}
      {editing ? (
        <input value={rcv} onChange={e=>setRcv(e.target.value)} type="number" placeholder="—" className="w-full text-center font-mono border border-purple-200 rounded px-1 py-0.5 text-[11px]"/>
      ) : (
        <span className={`text-center font-mono font-bold ${pending?"text-amber-500":line.qtyMatched?"text-emerald-600":"text-red-600"}`}>
          {pending ? "⏳" : line.rcvQty}
        </span>
      )}
      {/* PO unit price (ordered) — read-only reference leg */}
      <span className="text-center font-mono text-gray-400" title={t("سعر أمر الشراء","PO price")}>{fmtH(line.orderedUnitPriceHalalas)}</span>
      {/* Invoice unit price (editable) */}
      {editing ? (
        <input value={price} onChange={e=>setPrice(e.target.value)} type="number" step="0.01" className="w-full text-center font-mono border border-purple-200 rounded px-1 py-0.5 text-[11px]"/>
      ) : (
        <span className={`text-center font-mono font-bold ${line.priceMatched?"text-gray-700":"text-red-600"}`}>{fmtH(line.unitPriceHalalas)}</span>
      )}
      {/* Line match badge */}
      <span className={`justify-self-center text-[9px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap ${cfg}`}>
        {line.lineMatch?.icon} {line.lineMatch?.labelAr}
      </span>
      {/* Edit / save / cancel */}
      <div className="flex items-center gap-1 justify-end">
        {!locked && !editing && (
          <button onClick={()=>setEditing(true)} title={t("تعديل","Edit")} className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"><Edit3 size={12}/></button>
        )}
        {editing && <>
          <button onClick={save} disabled={patchMut.isPending} title={t("حفظ","Save")} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-40"><Check size={13}/></button>
          <button onClick={cancel} title={t("إلغاء","Cancel")} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={13}/></button>
        </>}
      </div>
    </div>
  );
}

// 3-way match detail panel (T06 §2/§3/§4) — rides on GET /operations/{id}.purchases.
function PurchaseMatchPanel({ op, isPending, forHead, onApprove, onReject, onClarify }:{
  op:COp; isPending:boolean; forHead:boolean; onApprove:()=>void; onReject:()=>void; onClarify?:()=>void;
}) {
  const { t } = useCLang();
  const { purchases: pb, isLoading } = usePurchaseDetail(op.id);
  const docMut = useDocumentOperation();
  const [note, setNote] = useState("");
  const locked = forHead || op.status==="final-approved" || op.status==="rejected";

  if (isLoading) return <p className="text-xs text-gray-400 text-center py-3">{t("جارٍ تحميل تفاصيل الطلب…","Loading order details…")}</p>;
  if (!pb) return <p className="text-xs text-gray-400 text-center py-3">{t("لا توجد تفاصيل مشتريات لهذا الطلب","No purchase details for this order")}</p>;

  const s = pb.summary;
  return (
    <div className="space-y-4">
      {/* Header: supplier + source + delivery */}
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <span className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1"><Building2 size={12} className="text-amber-600"/> {pb.supplierName ?? t("مورد غير محدد","Unknown supplier")}</span>
        {pb.orderSource && <span className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1">🧭 {pb.orderSource.labelAr}</span>}
        {pb.deliveryDate && <span className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1"><Clock size={12} className="text-gray-400"/> {pb.deliveryDate}</span>}
        {pb.isDocumented && <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1"><CheckCircle2 size={12}/> {t("موثّق","Documented")}</span>}
      </div>

      {/* Mismatch / matched banner */}
      {s.hasMismatch ? (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700 font-semibold">
          <AlertTriangle size={14}/> {t("يوجد عدم تطابق","Mismatch found")} —
          {s.qtyDiscrepancyCount>0 && ` ${t("فروق كمية","qty diffs")}: ${s.qtyDiscrepancyCount}`}
          {s.priceDiscrepancyCount>0 && ` · ${t("فروق سعر","price diffs")}: ${s.priceDiscrepancyCount}`}
          {s.pendingReceiptCount>0 && ` · ${t("بانتظار الاستلام","pending")}: ${s.pendingReceiptCount}`}
        </div>
      ) : s.isMatched ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-700 font-semibold">
          <CheckCircle2 size={14}/> {t("مطابق تام","Fully matched")}
        </div>
      ) : null}

      {/* 3-way match table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-[1.6fr_.7fr_.8fr_.8fr_1fr_1fr_1fr_auto] gap-1 px-3 py-2 bg-gray-50 border-b border-gray-100 text-[9px] font-bold text-gray-500">
          <span>{t("الصنف","Item")}</span>
          <span className="text-center">{t("الوحدة","Unit")}</span>
          <span className="text-center">{t("مطلوب","Ord.")}</span>
          <span className="text-center">{t("مُستلم","Rcv.")}</span>
          <span className="text-center">{t("سعر الأمر","PO price")}</span>
          <span className="text-center">{t("سعر الفاتورة","Inv. price")}</span>
          <span className="text-center">{t("المطابقة","Match")}</span>
          <span></span>
        </div>
        {pb.purchaseItems.map(line=>(
          <PurchaseLineRow key={line.rowId} operationId={op.id} line={line} locked={locked}/>
        ))}
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-white rounded-lg border border-gray-100 p-2"><p className="text-[9px] text-gray-400">{t("قيمة الأمر","Ordered")}</p><p className="font-mono font-bold text-gray-700 text-xs mt-0.5">{fmtH(s.orderedValueHalalas)}</p></div>
        <div className="bg-white rounded-lg border border-gray-100 p-2"><p className="text-[9px] text-gray-400">{t("قيمة المُستلم","Received")}</p><p className="font-mono font-bold text-gray-700 text-xs mt-0.5">{fmtH(s.receivedValueHalalas)}</p></div>
        <div className="bg-white rounded-lg border border-gray-100 p-2"><p className="text-[9px] text-gray-400">{t("فروق الكمية","Qty diffs")}</p><p className={`font-mono font-bold text-xs mt-0.5 ${s.qtyDiscrepancyCount>0?"text-red-600":"text-emerald-600"}`}>{s.qtyDiscrepancyCount}</p></div>
        <div className="bg-white rounded-lg border border-gray-100 p-2"><p className="text-[9px] text-gray-400">{t("بانتظار الاستلام","Pending")}</p><p className={`font-mono font-bold text-xs mt-0.5 ${s.pendingReceiptCount>0?"text-amber-600":"text-gray-500"}`}>{s.pendingReceiptCount}</p></div>
      </div>

      {/* Attachments (T06 §2) */}
      <OperationAttachmentsPanel operationId={op.id}/>

      {/* Document + actions */}
      {(!locked || forHead) && (
        <div className="flex flex-wrap items-end gap-2 justify-between">
          {!forHead && !pb.isDocumented && (
            <div className="flex items-end gap-2 flex-1 min-w-[240px]">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">{t("ملاحظة التوثيق (اختياري)","Documentation note (optional)")}</label>
                <input value={note} onChange={e=>setNote(e.target.value)} placeholder={t("طوبقت الفاتورة","Invoice reconciled")} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"/>
              </div>
              <button onClick={()=>docMut.mutate({ id:op.id, note: note||undefined })} disabled={docMut.isPending}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold hover:bg-sky-100 disabled:opacity-50"><FileText size={12}/> {t("توثيق","Document")}</button>
            </div>
          )}
          {pb.isDocumented && pb.documentation && (
            <p className="text-[10px] text-emerald-600">✓ {t("وُثّق بواسطة","Documented by")} {pb.documentation.documentedBy}{pb.documentation.note?` — ${pb.documentation.note}`:""}</p>
          )}
          {isPending && !forHead && (
            <div className="flex gap-2">
              {onClarify && <button onClick={onClarify} className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-100">💬 {t("طلب توضيح","Clarify")}</button>}
              <button onClick={onReject} className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100">✕ {t("رفض","Reject")}</button>
              <button onClick={onApprove} className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600">✓ {t("موافقة","Approve")}</button>
            </div>
          )}
          {forHead && op.status==="approved" && (
            <div className="flex gap-2">
              <button onClick={onReject} className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100">✕ {t("رفض","Reject")}</button>
              <button onClick={onApprove} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700">✓ {t("اعتماد نهائي","Final Approve")}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// One purchase-order row (T06 §1) — supplier / receive date / item count / diff.
function PurchaseOpRow({ op, purchaseRow, isPending, forHead, onApprove, onReject, onClarify }:{
  op:COp; purchaseRow?:import("../../../api/types/company").PurchaseRow|null;
  isPending:boolean; forHead:boolean; onApprove:()=>void; onReject:()=>void; onClarify?:()=>void;
}) {
  const { t } = useCLang();
  const [expanded, setExpanded] = useState(false);
  const mcfg = MATCH_CFG[op.match] ?? MATCH_CFG.exact;
  const scfg = STATUS_CFG[op.status] ?? STATUS_CFG.pending;
  return (
    <div className="border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 cursor-pointer" onClick={()=>setExpanded(v=>!v)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-gray-400">{op.refNum}</span>
            <span className="font-semibold text-gray-800 text-sm truncate">{purchaseRow?.supplierName ?? op.branch}</span>
            {purchaseRow?.isDocumented && <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0"/>}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {op.branch}
            {purchaseRow?.receiveDate && ` · ${t("استلام","Rcv")}: ${purchaseRow.receiveDate}`}
            {purchaseRow?.itemCount!=null && ` · ${purchaseRow.itemCount} ${t("صنف","items")}`}
            {purchaseRow?.orderSource && ` · ${purchaseRow.orderSource.labelAr}`}
          </p>
        </div>
        {op.diff && <span className="text-[10px] text-red-500 max-w-[160px] truncate">{op.diff}</span>}
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${mcfg.cls}`}>{op.matchLabelAr ?? mcfg.label}</span>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${scfg.cls}`}>{op.statusLabelAr ?? scfg.label}</span>
        {op.amount != null && op.amount>0 && <span className="font-mono font-bold text-gray-800 text-sm w-24 text-left">{fmt(op.amount)}</span>}
        <button className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 flex items-center justify-center flex-shrink-0" onClick={e=>{e.stopPropagation();setExpanded(v=>!v);}}>
          {expanded?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4">
          <PurchaseMatchPanel op={op} isPending={isPending} forHead={forHead} onApprove={onApprove} onReject={onReject} onClarify={onClarify}/>
        </div>
      )}
    </div>
  );
}

function AccCompanyPurchases({ ops, approve, reject, bulkApprove, requestClarification }:{
  ops:COp[]; approve:(id:string)=>void; reject:(id:string)=>void; bulkApprove:(ids:string[])=>void;
  requestClarification?:(id:string)=>void;
}) {
  const exportOpsMut = useExportOperations();
  const { t, dir } = useCLang();
  const [matchFilter,  setMatchFilter]  = useState<""|CMatch>("");
  const [statusFilter, setStatusFilter] = useState<""|COpStatus>("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [viewMode, setViewMode] = useState<"ops"|"suppliers"|"returns">("ops");

  // Enums (labels/source options) — fetched once, never hardcoded (T06 §7).
  const { data: enums } = usePurchaseEnums();
  // Live purchases list + KPI header (T06 §1). supplierId/date are full-set; source is page-local.
  const listQuery = usePurchasesList({
    supplierId: supplierFilter || undefined,
    source: (sourceFilter || undefined) as any,
    status: (statusFilter || undefined) as any,
    match: (matchFilter || undefined) as any,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    pageSize: 100,
  });
  const rows = listQuery.data?.data ?? [];
  const summary = listQuery.data?.meta?.summary?.purchases;

  // Suppliers + returns tabs.
  const { data: suppliers = [] } = useSuppliers();
  const { data: returns = [] }   = usePurchaseReturns();

  // Rows → COp (reusing the shared mapper) so the row/detail components stay uniform.
  const cRows = useMemo(()=>rows.map(r=>({ op: apiOpToCOp(r, BRANDS), purchaseRow: r.purchaseRow ?? null })), [rows]);
  const pendingIds = rows.filter(r=>r.status==="pending").map(r=>r.id);

  // Distinct suppliers for the dropdown (prefer the suppliers endpoint, fall back to rows).
  const supplierOpts = suppliers.length>0
    ? suppliers.map(s=>({ id:s.id, name:s.name }))
    : Array.from(new Map(rows.filter(r=>r.purchaseRow?.supplierId).map(r=>[r.purchaseRow!.supplierId!, r.purchaseRow!.supplierName ?? ""])).entries()).map(([id,name])=>({ id, name }));

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول المشتريات","Purchases Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("مطابقة ثلاثية: الكمية والسعر مقابل أمر الشراء","3-way match: quantity & price vs. the purchase order")}</p></div>
        {pendingIds.length>0 && <Btn variant="success" size="sm" onClick={()=>bulkApprove(pendingIds)}>✓ {t("موافقة على الكل","Approve All")} ({pendingIds.length})</Btn>}
      </div>

      {/* KPI header (T06 §1 — meta.summary.purchases) */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("مشتريات اليوم","Today's Purchases")} value={fmtH(summary?.todayTotalHalalas ?? 0)} sub={t("ر.س — كل الحالات","SAR — all statuses")} icon={<ShoppingCart size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("قيد المراجعة","Pending Review")} value={String(summary?.pendingReview ?? pendingIds.length)} sub={t("تنتظر القرار","awaiting decision")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("فروق كميات","Qty Discrepancies")} value={String(summary?.qtyDiscrepancies ?? 0)} sub={t("طلبات مفتوحة بها فرق","open orders w/ diff")} icon={<AlertTriangle size={18} className="text-red-600"/>} accent="red"/>
        <KpiCard label={t("اعتُمد اليوم","Approved Today")} value={String(summary?.approvedToday ?? 0)} sub={t("موافقات اليوم","today's approvals")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
      </div>

      {/* Filters: supplier / date / source / match / status */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المورد","Supplier")}</label>
            <select value={supplierFilter} onChange={e=>setSupplierFilter(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value="">{t("الكل","All")}</option>{supplierOpts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المصدر","Source")}</label>
            <select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2">
              <option value="">{t("الكل","All")}</option>{(enums?.orderSource ?? []).map(o=><option key={o.key} value={o.key}>{o.labelAr}</option>)}
            </select></div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المطابقة","Match")}</label>
            <select value={matchFilter} onChange={e=>setMatchFilter(e.target.value as any)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"><option value="">{t("الكل","All")}</option>{(Object.entries(MATCH_CFG) as [CMatch,any][]).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("من تاريخ","From")}</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"/></div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("إلى تاريخ","To")}</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"/></div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الحالة","Status")}</label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"><option value="">{t("الكل","All")}</option>{(Object.entries(STATUS_CFG) as [COpStatus,any][]).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
        </div>
      </div>

      {/* Tabs: بيانات / الموردون / المرتجعات */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 self-start">
        {([["ops","بيانات المشتريات"],["suppliers","الموردون المعتمدون"],["returns","المرتجعات"]] as const).map(([v,l])=>(
          <button key={v} onClick={()=>setViewMode(v)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode===v?"bg-white text-gray-800 shadow-sm":"text-gray-500"}`}>{l}</button>
        ))}
      </div>

      {viewMode==="ops" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">{t("بيانات المشتريات","Purchase Orders")}</h3>
            <button onClick={()=>exportOpsMut.mutate({moduleKey:"purchases", format:"xlsx"})} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><Download size={11}/> Excel</button>
          </div>
          {listQuery.isLoading ? (
            <div className="py-10 text-center text-gray-400 text-sm">{t("جارٍ التحميل…","Loading…")}</div>
          ) : cRows.length===0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">✅ {t("لا توجد بيانات","No data")}</div>
          ) : cRows.map(({op,purchaseRow})=>(
            <PurchaseOpRow key={op.id} op={op} purchaseRow={purchaseRow}
              isPending={op.status==="pending"} forHead={false}
              onApprove={()=>approve(op.id)} onReject={()=>reject(op.id)}
              onClarify={requestClarification?()=>requestClarification(op.id):undefined}/>
          ))}
        </div>
      )}

      {viewMode==="suppliers" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-4">{t("الموردون المعتمدون","Approved Suppliers")}</h3>
          {suppliers.length===0 ? (
            <p className="text-xs text-gray-400 text-center py-6">{t("لا يوجد موردون","No suppliers")}</p>
          ) : (
            <div className="space-y-3">
              {suppliers.map(s=>{
                const stars = Math.round((s.rating ?? 0)/10);   // 0–50 scale → ★
                return (
                  <div key={s.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 text-lg">🏭</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{s.name} {s.category && <span className="text-[10px] text-gray-400 font-normal">· {s.category}</span>}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {s.itemsCount} {t("صنف","items")} · {s.monthlyOrderCount} {t("طلبية هذا الشهر","orders/mo")}
                          {s.contactPhone && ` · ${s.contactPhone}`}
                        </p>
                      </div>
                      <div className="text-left flex-shrink-0">
                        <div className="flex items-center gap-0.5 mb-1">{[1,2,3,4,5].map(i=><span key={i} className={`text-sm ${i<=stars?"text-amber-400":"text-gray-200"}`}>★</span>)}</div>
                        {!s.isActive && <span className="text-[9px] text-red-500 font-semibold">{t("غير نشط","inactive")}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {viewMode==="returns" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60"><h3 className="font-bold text-gray-900 text-sm">{t("المرتجعات","Returns")} <span className="text-[10px] text-gray-400 font-normal">({t("عرض فقط","read-only")})</span></h3></div>
          {returns.length===0 ? (
            <p className="text-xs text-gray-400 text-center py-8">{t("لا توجد مرتجعات","No returns")}</p>
          ) : (
            <div>
              <div className="grid grid-cols-6 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500">
                <span>{t("رقم المرتجع","Return #")}</span><span>{t("الأمر","Order")}</span><span>{t("الفرع","Branch")}</span><span className="text-center">{t("التاريخ","Date")}</span><span className="text-center">{t("الحالة","Status")}</span><span className="text-left">{t("المبلغ","Amount")}</span>
              </div>
              {returns.map(r=>(
                <div key={r.id} className="grid grid-cols-6 px-4 py-3 border-b border-gray-50 last:border-0 text-xs items-center">
                  <span className="font-mono font-semibold text-gray-700">{r.returnNumber}</span>
                  <span className="text-gray-500">{r.orderNumber ?? "—"}</span>
                  <span className="text-gray-600 truncate">{r.branchName ?? "—"}</span>
                  <span className="text-center text-gray-500">{r.returnDate}</span>
                  <span className="text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">{r.statusLabelAr}</span></span>
                  <span className="text-left font-mono font-bold text-gray-800">{fmtH(r.totalReturnAmountHalalas)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
/// ACCOUNTANT — INVENTORY MODULE (T07 §1/§2/§3/§8/§9)
// ═══════════════════════════════════════════════════
const CINV_CHIP: Record<string,string> = {
  red:    "bg-red-100 text-red-700",
  green:  "bg-emerald-100 text-emerald-700",
  neutral:"bg-amber-100 text-amber-700",
};
const CINV_STOCK: Record<string,string> = {
  critical:"bg-red-50 text-red-700 border border-red-200",
  low:     "bg-amber-50 text-amber-700 border border-amber-200",
  normal:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

// One employee allocation row for the daily-variance panel (empNumber → name lookup).
function InvVarEmpRow({ branchId, row, onField, onRemove }:{
  branchId:string; row:{empNumber:string;qty:string};
  onField:(f:"empNumber"|"qty",v:string)=>void; onRemove:()=>void;
}) {
  const { t } = useCLang();
  const { data: emp } = useBranchEmployeesLookup(branchId, row.empNumber.length>=3?row.empNumber:undefined);
  return (
    <div className="flex items-center gap-2">
      <input placeholder={t("رقم الموظف","Emp #")} value={row.empNumber} onChange={e=>onField("empNumber",e.target.value)}
        className="w-20 text-center font-mono border border-amber-200 rounded-lg px-2 py-1 text-[10px] bg-white focus:outline-none focus:border-amber-400"/>
      <div className="h-7 flex-1 flex items-center px-2 rounded-lg bg-white border border-gray-100 text-[10px] text-gray-700">{emp?.name || <span className="text-gray-300">{t("يُعبأ تلقائياً","auto")}</span>}</div>
      <input placeholder={t("كمية","Qty")} type="number" value={row.qty} onChange={e=>onField("qty",e.target.value)}
        className="w-20 text-center font-mono border border-amber-200 rounded-lg px-2 py-1 text-[10px] bg-white focus:outline-none focus:border-amber-400"/>
      <button onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><X size={12}/></button>
    </div>
  );
}

// Daily equation table + variance allocation for one branch (T07 §2/§3).
function InvDailyPanel({ branchId }:{ branchId:string }) {
  const { t } = useCLang();
  const { data: recon, isLoading } = useDailyReconciliation(branchId);
  const allocMut = useSaveDailyVarianceAllocation();
  const [rows, setRows] = useState<Record<string,{empNumber:string;qty:string}[]>>({});

  if (isLoading) return <p className="text-xs text-gray-400 text-center py-3">{t("جارٍ تحميل المعادلة…","Loading equation…")}</p>;
  if (!recon) return <p className="text-xs text-gray-400 text-center py-3">{t("لا يوجد جرد يومي لهذا الفرع","No daily count for this branch")}</p>;

  const varianceItems = recon.items.filter(it=>Math.abs(it.varianceQty ?? 0) > 0.0001);
  const addRow    = (itemId:string) => setRows(p=>({...p,[itemId]:[...(p[itemId]||[]),{empNumber:"",qty:""}]}));
  const setField  = (itemId:string,i:number,f:"empNumber"|"qty",v:string) => setRows(p=>({...p,[itemId]:(p[itemId]||[]).map((r,idx)=>idx===i?{...r,[f]:v}:r)}));
  const removeRow = (itemId:string,i:number) => setRows(p=>({...p,[itemId]:(p[itemId]||[]).filter((_,idx)=>idx!==i)}));
  const submit = () => {
    const items = Object.entries(rows).map(([itemId,rs])=>({
      itemId,
      allocations: rs.filter(r=>r.empNumber && r.qty).map(r=>({ empNumber:r.empNumber, qty:Number(r.qty) })),
    })).filter(x=>x.allocations.length>0);
    if (items.length===0) return;
    allocMut.mutate({ branchId, payload:{ date: recon.date, items } });
  };

  return (
    <div className="px-5 py-3 space-y-3">
      {/* Equation table */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[1.4fr_.7fr_.7fr_.7fr_.7fr_.7fr_.8fr_.8fr_.9fr] gap-1 px-2 py-1 bg-gray-100/60 rounded-lg text-[9px] font-semibold text-gray-500 mb-1 min-w-[640px]">
          <span>{t("الصنف","Item")}</span>
          <span className="text-center">{t("فتح","Open")}</span>
          <span className="text-center text-blue-500">+ {t("وارد","In")}</span>
          <span className="text-center text-red-500">- {t("استهلاك","Used")}</span>
          <span className="text-center text-amber-500">- {t("هدر","Waste")}</span>
          <span className="text-center">± {t("تحويل","Xfer")}</span>
          <span className="text-center">{t("متوقع","Exp.")}</span>
          <span className="text-center font-bold">{t("فعلي","Act.")}</span>
          <span className="text-center">{t("الحالة","Status")}</span>
        </div>
        {recon.items.map(it=>{
          const st = CINV_STOCK[it.stockStatus?.key] ?? CINV_STOCK.normal;
          const bad = it.equationMatch===false;
          return (
            <div key={it.itemId} className={`grid grid-cols-[1.4fr_.7fr_.7fr_.7fr_.7fr_.7fr_.8fr_.8fr_.9fr] gap-1 px-2 py-2 rounded-lg mb-1 items-center min-w-[640px] ${bad?"bg-amber-50":""}`}>
              <div className="flex items-center gap-1">
                {bad && <AlertTriangle size={10} className="text-amber-500 flex-shrink-0"/>}
                <span className="text-xs font-semibold text-gray-700 truncate">{it.itemName}</span>
              </div>
              <span className="text-center text-[10px] font-mono text-gray-600">{it.opening ?? "—"}</span>
              <span className="text-center text-[10px] font-mono text-blue-600">{it.received!=null?`+${it.received}`:"—"}</span>
              <span className="text-center text-[10px] font-mono text-red-500">{it.consumed!=null?`-${it.consumed}`:"—"}</span>
              <span className="text-center text-[10px] font-mono text-amber-600">{it.waste!=null?`-${it.waste}`:"—"}</span>
              <span className="text-center text-[10px] font-mono text-gray-500">{it.transfers!=null?it.transfers:"—"}</span>
              <span className="text-center text-[10px] font-mono text-gray-600">{it.expectedClosing ?? "—"}</span>
              <span className={`text-center text-[10px] font-mono font-bold ${it.equationMatch===false?"text-amber-700":"text-gray-800"}`}>{it.actualClosing ?? "—"}</span>
              <span className="text-center"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg ${st}`}>{it.stockStatus?.labelAr ?? "—"}</span></span>
            </div>
          );
        })}
      </div>

      {/* Variance banner + allocation */}
      {varianceItems.length>0 ? (
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-800">⚠ {t("تحميل فروق الجرد على موظفين","Assign count variance to employees")}</p>
            <span className="text-[10px] font-mono text-amber-700">{t("إجمالي الفرق","Total variance")}: {fmtH(recon.totalVarianceValueHalalas)} · {t("غير مخصص","unassigned")}: {fmtH(recon.unassignedVarianceValueHalalas)}</span>
          </div>
          {varianceItems.map(it=>(
            <div key={it.itemId} className="bg-white rounded-lg border border-amber-100 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">{it.itemName} <span className="text-[10px] text-red-500 font-mono">({it.varianceQty} · {fmtH(it.varianceValueHalalas)})</span></span>
                <button onClick={()=>addRow(it.itemId)} className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-lg font-bold hover:bg-amber-200"><Plus size={9} className="inline"/> {t("موظف","Emp")}</button>
              </div>
              {(rows[it.itemId]||[]).map((r,i)=>(
                <InvVarEmpRow key={i} branchId={branchId} row={r}
                  onField={(f,v)=>setField(it.itemId,i,f,v)} onRemove={()=>removeRow(it.itemId,i)}/>
              ))}
            </div>
          ))}
          <div className="flex justify-end">
            <button onClick={submit} disabled={allocMut.isPending}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-50">💾 {t("تأكيد التحميل","Confirm Allocation")}</button>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-emerald-600 text-center">✓ {t("لا توجد فروق تحتاج تحميل","No variance to assign")}</p>
      )}
    </div>
  );
}

function AccCompanyInventory({ navigate, ops, approve, reject }:{ navigate:(p:string)=>void; ops:COp[]; approve:(id:string)=>void; reject:(id:string)=>void }) {
  const { t, dir } = useCLang();
  const [invType,        setInvType]        = useState<"monthly"|"daily">("monthly");
  const [expandedBranch, setExpandedBranch] = useState<string|null>(null);
  const [brandFilter,    setBrandFilter]    = useState("الكل");
  const [showItemPage,   setShowItemPage]   = useState(false);
  const [draftFlag,      setDraftFlag]      = useState<Record<string,number[]>>({});

  // Live review data (T07 §1) — { branches[], summary }.
  const { data: invResp, isLoading } = useInventoryBranches({ type: invType });
  const summary  = invResp?.summary;
  const allBranches = invResp?.branches ?? [];
  const branches = brandFilter==="الكل" ? allBranches : allBranches.filter(b=>b.brandName===brandFilter);

  const flagBranchMut    = useFlagInventoryBranch();
  const markConfirmedMut = useMarkInventoryConfirmed();
  const sendNotifMut     = useSendInventoryNotification();
  const flagItemsMut     = useFlagInventoryItems();
  const exportInvMut     = useExportInventory();

  const toggleFlagged = (b:InventoryReviewBranch) => flagBranchMut.mutate({ branchId:b.branchId, flagged:!b.isFlagged });
  const toggleConfirm = (b:InventoryReviewBranch) => markConfirmedMut.mutate(b.branchId);
  const toggleDraftIndex = (branchId:string, idx:number) => setDraftFlag(p=>{ const cur=p[branchId]||[]; return {...p,[branchId]: cur.includes(idx)?cur.filter(i=>i!==idx):[...cur,idx]}; });
  const sendFlags = (branchId:string) => {
    const idx = draftFlag[branchId]||[];
    if (idx.length===0) return;
    flagItemsMut.mutate({ branchId, itemIndices: idx }, { onSuccess:()=>{ sendNotifMut.mutate({ branchId }); setDraftFlag(p=>({...p,[branchId]:[]})); } });
  };

  if (showItemPage) return <AccInventoryItemsPage onBack={()=>setShowItemPage(false)}/>;

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول المخزون","Inventory Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("مراجعة الجرد اليومي والشهري لكل فرع — مقارنة ومعادلة","Review daily and monthly stock counts per branch — compare and reconcile")}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>exportInvMut.mutate({})} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><Download size={12}/> {t("Excel — كل الفروع","Excel — all branches")}</button>
          <Btn variant="primary" size="sm" onClick={()=>setShowItemPage(true)}><Package size={13}/> {t("تحديد أصناف الجرد","Set Inventory Items")}</Btn>
        </div>
      </div>
      {/* KPI header (T07 §1 — summary) */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("أصناف منخفضة","Low Items")} value={String(summary?.lowItems ?? 0)} sub={t("تحت الحد الأدنى","below min level")} icon={<Package size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("هدر اليوم","Waste Today")} value={fmtH(summary?.totalWasteTodayHalalas ?? 0)} sub={t("ر.س","SAR")} icon={<AlertTriangle size={18} className="text-red-600"/>} accent="red"/>
        <KpiCard label={t("نسبة الهدر","Waste Rate")} value={`${(summary?.wasteRatePct ?? 0).toFixed(1)}%`} sub={t("من المبيعات","of sales")} icon={<TrendingUp size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("تنبيهات شذوذ","Anomalies")} value={String(summary?.anomalyAlerts ?? 0)} sub={`${summary?.completedBranches ?? 0} ${t("فرع مكتمل","done")} / ${summary?.totalSubmissions ?? allBranches.length}`} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
      </div>
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("العلامة التجارية","Brand")}</label>
            <select value={brandFilter} onChange={e=>setBrandFilter(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"><option>الكل</option>{BRANDS.map(b=><option key={b.id}>{b.name}</option>)}</select>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("نوع الجرد","Count Type")}</label>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {([["monthly",t("الجرد الشهري","Monthly")],["daily",t("الجرد اليومي","Daily")]] as const).map(([val,label])=>(
                <button key={val} onClick={()=>{ setInvType(val); setExpandedBranch(null); }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${invType===val?"bg-white text-gray-800 shadow-sm":"text-gray-500"}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Branch accordion */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
          <h3 className="font-bold text-gray-900 text-sm">{invType==="monthly"?t("الجرد الشهري — مقارنة الشهر الحالي بالسابق","Monthly — current vs. previous month"):t("الجرد اليومي — معادلة المخزون","Daily — stock equation")}</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">{invType==="monthly"?t("موافقة · تعليم · إرسال تأكيد لمدير الفرع","Approve · flag · send confirmation to branch manager"):t("فتح + وارد − استهلاك − هدر ± تحويلات = إغلاق","open + in − used − waste ± transfers = closing")}</p>
        </div>
        {isLoading && <div className="px-5 py-10 text-center text-gray-400 text-sm">{t("جارٍ التحميل…","Loading…")}</div>}
        {!isLoading && branches.length===0 && (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">{t("لا توجد بيانات جرد بعد","No inventory data yet")}</div>
        )}
        {branches.map(b=>{
          const isExpanded = expandedBranch===b.branchId;
          const draft = draftFlag[b.branchId]||[];
          const branchBrand = ALL_BRANCHES.find(x=>x.name===b.branchName);
          const stCfg = STATUS_CFG[(b.status as COpStatus)] ?? null;
          return (
            <div key={b.branchId} className="border-b border-gray-100 last:border-0">
              <div className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50/50">
                {branchBrand && <div className="w-1 h-10 rounded-full flex-shrink-0" style={{background:branchBrand.brandColor}}/>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{b.branchName ?? b.branchId}</span>
                    {b.anomalyCount>0 && <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">⚠ {b.anomalyCount} {t("شذوذ","anomaly")}</Badge>}
                    {stCfg && <Badge className={`text-[10px] border ${stCfg.cls}`}>{stCfg.label}</Badge>}
                    {b.isFlagged && <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">🚩 {t("مُعلَّم","Flagged")}</Badge>}
                    {b.branchConfirmed && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">✅ {t("أكّده الفرع","Confirmed")}</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{b.items.length} {t("صنف","items")}</p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  <button onClick={()=>exportInvMut.mutate({ branchId:b.branchId })} className="px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold hover:bg-emerald-100 flex items-center gap-1"><Download size={9}/> Excel</button>
                  <button onClick={()=>setExpandedBranch(isExpanded?null:b.branchId)} className="px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 text-[10px] font-semibold hover:bg-gray-100 flex items-center gap-1">
                    {isExpanded?<ChevronUp size={10}/>:<ChevronDown size={10}/>} {t("الأصناف","Items")}
                  </button>
                  {invType==="monthly" && <>
                    <button onClick={()=>toggleFlagged(b)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-all ${b.isFlagged?"bg-purple-100 text-purple-700 border-purple-300":"bg-gray-50 text-gray-500 border-gray-200 hover:bg-purple-50"}`}>
                      🚩 {b.isFlagged?t("مُعلَّم","Flagged"):t("تعليم","Flag")}
                    </button>
                    {draft.length>0 && (
                      <button onClick={()=>sendFlags(b.branchId)} className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold flex items-center gap-1 hover:bg-amber-100">
                        <Send size={9}/> {t("إرسال","Send")} ({draft.length})
                      </button>
                    )}
                    <button onClick={()=>toggleConfirm(b)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-all ${b.branchConfirmed?"bg-emerald-100 text-emerald-700 border-emerald-300":"bg-gray-50 text-gray-500 border-gray-200 hover:bg-emerald-50"}`}>
                      <CheckCircle2 size={9}/> {b.branchConfirmed?t("أكّده","Confirmed"):t("تسجيل تأكيد","Confirm")}
                    </button>
                  </>}
                  {invType==="daily" && b.operationId && b.status==="pending" && (
                    <div className="flex gap-1.5">
                      <button onClick={()=>approve(b.operationId!)} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1 hover:bg-emerald-100"><ThumbsUp size={9}/> {t("موافقة","Approve")}</button>
                      <button onClick={()=>reject(b.operationId!)}  className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[10px] font-semibold flex items-center gap-1 hover:bg-red-100"><ThumbsDown size={9}/> {t("رفض","Reject")}</button>
                    </div>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/30">
                  {invType==="monthly" ? (
                    <div className="px-5 py-3">
                      <div className="grid grid-cols-6 gap-2 px-2 py-1 bg-gray-100/60 rounded-lg text-[10px] font-semibold text-gray-500 mb-2">
                        <span className="col-span-2">{t("الصنف","Item")}</span><span>{t("الوحدة","Unit")}</span><span>{t("الشهر الماضي","Prev")}</span><span>{t("هذا الشهر","Curr")}</span><span className="text-right">{t("التغير","Change")}</span>
                      </div>
                      {b.items.map((it,idx)=>{
                        const isDraft = draft.includes(idx);
                        const chipCls = it.chip ? CINV_CHIP[it.chip] : null;
                        return (
                          <div key={it.itemId} className={`grid grid-cols-6 gap-2 px-2 py-2 rounded-lg mb-1 transition-all cursor-pointer ${isDraft?"bg-purple-50 border border-purple-200":it.isAnomaly?"bg-red-50/50":"hover:bg-gray-50"}`}
                            onClick={()=>toggleDraftIndex(b.branchId,idx)}>
                            <div className="col-span-2 flex items-center gap-1.5">
                              {isDraft&&<span className="text-purple-600">🚩</span>}
                              {it.isAnomaly&&!isDraft&&<AlertTriangle size={10} className="text-red-500 flex-shrink-0"/>}
                              {it.isLow&&<span className="text-[8px] px-1 rounded bg-amber-100 text-amber-700">{t("منخفض","low")}</span>}
                              <span className="text-xs font-semibold text-gray-700 truncate">{it.itemName}</span>
                            </div>
                            <span className="text-[10px] text-gray-500 flex items-center">{it.unit}</span>
                            <span className="text-[10px] text-gray-600 font-mono flex items-center">{it.prevQty ?? "—"}</span>
                            <span className="text-[10px] font-mono font-bold text-gray-800 flex items-center">{it.currQty}</span>
                            <div className="flex items-center justify-end gap-2">
                              {it.changePct!=null && chipCls && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${chipCls}`}>{it.changePct>0?"+":""}{it.changePct}%</span>}
                              {it.changePct==null && <span className="text-[9px] text-gray-300">—</span>}
                            </div>
                          </div>
                        );
                      })}
                      {draft.length>0 && <p className="text-[10px] text-purple-600 font-medium mt-2">✓ {draft.length} {t("أصناف محددة — اضغط إرسال لإشعار مدير الفرع","items selected — press Send to notify the branch manager")}</p>}
                    </div>
                  ) : (
                    <InvDailyPanel branchId={b.branchId}/>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// INVENTORY ITEM SELECTION PAGE (T07 §8)
// ═══════════════════════════════════════════════════
function AccInventoryItemsPage({ onBack }:{ onBack:()=>void }) {
  const { t, dir } = useCLang();
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("الكل");
  const [selBranchId,setSelBranchId]= useState<string>("");
  const [selected,   setSelected]   = useState<string[]>([]);

  const { data: invResp } = useInventoryBranches();
  const branches = invResp?.branches ?? [];
  const { data: catalog = [] } = useInventoryItemsSearch({ search: search||undefined });
  const configMut = useConfigureInventoryList();

  useEffect(()=>{ if(!selBranchId && branches.length) setSelBranchId(branches[0].branchId); }, [branches, selBranchId]);

  const cats  = ["الكل", ...Array.from(new Set(catalog.map(c=>c.category).filter(Boolean)))];
  const shown = catFilter==="الكل" ? catalog : catalog.filter(c=>c.category===catFilter);
  const toggle = (id:string) => setSelected(p=> p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const selBranchName = branches.find(b=>b.branchId===selBranchId)?.branchName ?? "—";
  const save = () => { if(!selBranchId) return; configMut.mutate({ branchId:selBranchId, items:selected }); };

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center gap-3"><button onClick={onBack} className="flex items-center gap-1.5 text-purple-600 hover:underline text-sm font-semibold"><ChevronRight size={14}/> {t("المخزون","Inventory")}</button></div>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("تحديد أصناف الجرد اليومي — حسب الفرع","Set Daily Inventory Items — by Branch")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("كل فرع له قائمة مستقلة · الأصناف المحددة تُرسل فوراً لتطبيق مدير الفرع","Each branch has its own list · Selected items are pushed to the branch manager app")}</p></div>
        <button onClick={save} disabled={configMut.isPending || !selBranchId} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
          {configMut.isSuccess?<><Check size={14}/> {t("تم الحفظ!","Saved!")}</>:<><RefreshCw size={14}/> {t("حفظ وإرسال للفرع","Save & Push to Branch")}</>}
        </button>
      </div>
      {/* Branch picker (live) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-[11px] font-semibold text-gray-500 mb-2">{t("الفرع","Branch")}</p>
        {branches.length===0 ? <p className="text-xs text-gray-400">{t("لا توجد فروع","No branches")}</p> : (
          <div className="flex flex-wrap gap-2">
            {branches.map(b=><button key={b.branchId} onClick={()=>setSelBranchId(b.branchId)} className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${selBranchId===b.branchId?"border-purple-500 bg-purple-50 text-purple-700":"border-gray-200 bg-white text-gray-600"}`}>{b.branchName ?? b.branchId}</button>)}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-gray-900 text-sm flex-1">{t("كتالوج الأصناف","Item Catalog")}</h3>
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1.5"><Search size={11} className="text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("ابحث…","Search…")} className="text-xs outline-none w-28"/></div>
            <div className="flex gap-1 flex-wrap">
              {cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${catFilter===c?"bg-purple-600 text-white":"bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{c}</button>)}
            </div>
          </div>
          {shown.length===0 ? <p className="text-xs text-gray-400 text-center py-6">{t("لا توجد أصناف","No items")}</p> : shown.map(item=>{
            const isSel = selected.includes(item.id);
            return (
              <div key={item.id} onClick={()=>toggle(item.id)} className={`px-5 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0 cursor-pointer transition-all ${isSel?"bg-purple-50":"hover:bg-gray-50"}`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all flex-shrink-0 ${isSel?"bg-purple-600 border-purple-600":"border-gray-300"}`}>{isSel&&<Check size={11} className="text-white"/>}</div>
                <div className="flex-1"><p className={`text-sm font-semibold ${isSel?"text-purple-700":"text-gray-700"}`}>{item.name}</p><p className="text-[10px] text-gray-400">{item.category} · {t("الوحدة","unit")}: {item.unit}</p></div>
                {isSel&&<Badge className="bg-purple-100 text-purple-700 text-[10px]">✓ {t("مضاف","added")}</Badge>}
              </div>
            );
          })}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3">{t("قائمة","List of")} {selBranchName} ({selected.length})</h3>
          {selected.length===0?<p className="text-gray-400 text-xs text-center py-4">{t("لم يتم تحديد أصناف بعد","No items selected yet")}</p>:(
            <div className="space-y-1.5">
              {selected.map(id=>{ const it=catalog.find(c=>c.id===id); return (
                <div key={id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-purple-50 border border-purple-100"><Check size={10} className="text-purple-500 flex-shrink-0"/><span className="text-xs font-medium text-purple-700 flex-1">{it?.name ?? id}</span><button onClick={()=>toggle(id)} className="text-purple-300 hover:text-purple-600"><X size={11}/></button></div>
              ); })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — ASSETS MODULE
// ═══════════════════════════════════════════════════
function AccCompanyAssets() {
  const { t, dir } = useCLang();
  const { drafts, confirmDraft, discardDraft } = useContext(CAssetDraftContext);
  const createAssetMut = useCreateAsset();
  const patchAssetMut = usePatchAsset();
  const exportAssetsMut = useExportAssets();
  const importAssetsMut = useImportAssets();
  const { data: categories = [] } = useAssetCategories();
  const { data: invBranchesResp } = useInventoryBranches();
  const branchOpts = invBranchesResp?.branches ?? [];
  const draftAssets = drafts;
  const SAR = t("ر.س","SAR");

  const [search,setSearch]=useState("");
  const [catFilter,setCatFilter]=useState("all");
  const [statusFilter,setStatusFilter]=useState("all");
  const { data: serverAssets } = useAssets({
    search: search || undefined,
    category: catFilter!=="all"?catFilter:undefined,
    status: statusFilter!=="all"?statusFilter:undefined,
    pageSize: 100,
  });
  const apiAssets = serverAssets?.data ?? [];
  const summary = serverAssets?.meta?.summary;
  // Pending-assignment assets come from a dedicated query so the banner stays
  // complete regardless of the register's active category/status filters.
  const { data: pendingAssetsResp } = useAssets({ assignment: "pending", pageSize: 100 });

  const catLabel = (key:string) => categories.find(c=>c.key===key)?.labelAr ?? key;
  const branchName = (id?:string|null) => ALL_BRANCHES.find(b=>b.id===id)?.name ?? id ?? "—";
  const catOptions = categories.length>0 ? categories.map(c=>({ key:c.key, labelAr:c.labelAr ?? c.name })) : ASSET_CATS_CD.map(c=>({ key:c, labelAr:c }));

  const SC:Record<string,string>={
    active:"bg-emerald-50 text-emerald-700 border border-emerald-200",
    maintenance:"bg-amber-50 text-amber-700 border border-amber-200",
    retired:"bg-gray-100 text-gray-500 border border-gray-200",
    pending_branch:"bg-sky-50 text-sky-700 border border-sky-200",
    pending_accountant:"bg-purple-50 text-purple-700 border border-purple-200",
    confirmed:"bg-blue-50 text-blue-700 border border-blue-200",
  };
  const SL:Record<string,string>={active:"نشط",maintenance:"صيانة",retired:"مستبعد",pending_branch:"بانتظار الفرع",pending_accountant:"بانتظار المحاسب",confirmed:"مؤكد"};

  const totalValue = summary ? summary.bookValueTotal/100 : apiAssets.reduce((s,a)=>s+(a.bookValueHalalas??0)/100,0);
  const activeCount = summary?.active ?? apiAssets.filter(a=>a.status==="active").length;
  const maintCount = summary?.maintenance ?? apiAssets.filter(a=>a.status==="maintenance").length;
  const totalCount = summary?.total ?? apiAssets.length;

  const [showAdd, setShowAdd] = useState(false);
  const [aForm, setAForm] = useState({ name:"", category:"", branchId:"", invNum:"", price:"", serial:"", usefulLifeMonths:"60", custodian:"" });
  const submitAsset = () => {
    const cat = aForm.category || catOptions[0]?.key || "other";
    if (!aForm.name.trim() || !aForm.branchId) return;
    createAssetMut.mutate(
      { name:aForm.name, category:cat, branchId:aForm.branchId, invNum:aForm.invNum||undefined, serial:aForm.serial||undefined,
        priceHalalas:Math.round((parseFloat(aForm.price)||0)*100), usefulLifeMonths:Number(aForm.usefulLifeMonths)||60, custodian:aForm.custodian||undefined },
      { onSuccess: () => { setShowAdd(false); setAForm({ name:"", category:"", branchId:"", invNum:"", price:"", serial:"", usefulLifeMonths:"60", custodian:"" }); } },
    );
  };
  const [editAsset, setEditAsset] = useState<Asset|null>(null);
  const editAssetTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [eForm, setEForm] = useState({ name:"", category:"", custodian:"", serial:"", bookValue:"", status:"active", branchId:"" });
  const openEdit = (a:Asset, trigger:HTMLButtonElement) => { editAssetTriggerRef.current = trigger; setEditAsset(a); setEForm({ name:a.name, category:a.category, custodian:a.custodian??"", serial:a.serial??"", bookValue:((a.bookValueHalalas??0)/100).toFixed(2), status:a.status, branchId:a.branchId??"" }); };
  const submitEdit = () => {
    if (!editAsset) return;
    patchAssetMut.mutate(
      { id: editAsset.id, patch: { name:eForm.name, category:eForm.category, custodian:eForm.custodian||null, serial:eForm.serial||null,
        bookValueHalalas:Math.round((parseFloat(eForm.bookValue)||0)*100), status:eForm.status,
        ...branchPatchPart(eForm.branchId) } },
      { onSuccess: () => setEditAsset(null) },
    );
  };

  // Brand-level uploaded assets land with branchId=null and never show in branch
  // screens until assigned. Surface them here and assign via PATCH .../assets/{id}.
  const unassignedAssets = (pendingAssetsResp?.data ?? []).filter(isUnassignedAsset);
  const pendingCount = pendingAssetsResp?.meta?.summary?.pendingAssignment ?? unassignedAssets.length;
  const [assignBranch, setAssignBranch] = useState<Record<string,string>>({});
  const assignToBranch = (a:Asset) => {
    const patch = buildAssignPatch(assignBranch[a.id] ?? "");
    if (!patch) return;
    patchAssetMut.mutate(
      { id: a.id, patch },
      { onSuccess: () => setAssignBranch(p=>{ const n={...p}; delete n[a.id]; return n; }) },
    );
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-start justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الأصول الثابتة","Fixed Assets")}</h2><p className="text-gray-400 text-sm">{totalCount} {t("أصل مسجل","registered assets")}{draftAssets.length>0?` + ${draftAssets.length} ${t("مسودة","draft")}`:""}</p></div>
        <div className="flex gap-2">
          <input type="file" id="asset-import-file" accept=".xlsx,.csv" onChange={e=>{ const f=e.target.files?.[0]; if(f) importAssetsMut.mutate(f); }} style={{display:"none"}}/>
          <Btn size="sm" onClick={()=>exportAssetsMut.mutate({format:"xlsx", category:catFilter!=="all"?catFilter:undefined})}><Download size={12}/> Excel</Btn>
          <Btn size="sm" onClick={()=>document.getElementById("asset-import-file")?.click()}><Upload size={12}/> {t("استيراد","Import")}</Btn>
          <Btn variant="primary" onClick={()=>setShowAdd(true)}><Plus size={13}/> {t("أصل جديد","New Asset")}</Btn>
        </div>
      </div>

      {importAssetsMut.data && importAssetsMut.data.errors?.length>0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs">
          <p className="font-bold text-red-800 mb-1">{t("صفوف مرفوضة في الاستيراد","Rejected import rows")} ({importAssetsMut.data.errors.length})</p>
          {importAssetsMut.data.errors.slice(0,8).map((e,i)=>(
            <p key={i} className="text-red-600">• {t("صف","Row")} {e.row}: {e.message}</p>
          ))}
        </div>
      )}

      {draftAssets.length>0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GitMerge size={16} className="text-purple-600"/>
            <p className="font-bold text-gray-800 text-sm">{t("مسودات أصول محوّلة من مصروفات","Asset drafts from expenses")} ({draftAssets.length})</p>
            <Badge className="bg-purple-100 text-purple-700 border border-purple-200 text-[10px]">{t("في انتظار التأكيد","Awaiting confirmation")}</Badge>
          </div>
          <div className="space-y-2">
            {draftAssets.map(d=>(
              <div key={d.draftId} className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3 ${d.status==="confirmed"?"border-emerald-200 bg-emerald-50/30":"border-purple-100"}`}>
                <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center flex-shrink-0"><Building2 size={15} className="text-purple-600"/></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{d.assetName}</p>
                  <p className="text-[10px] text-gray-400">{d.categoryLabelAr ?? catLabel(d.category)} · {d.branch} · {t("من","from")} {d.invNum} · ×{d.qty}</p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="font-mono font-bold text-purple-700 text-sm">{fmt(d.amount)} {SAR}</p>
                </div>
                {d.status==="draft" ? (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={()=>confirmDraft(d.draftId)} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-200 flex items-center gap-1"><Check size={9}/> {t("تأكيد","Confirm")}</button>
                    <button onClick={()=>discardDraft(d.draftId)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold hover:bg-red-100 flex items-center gap-1"><X size={9}/> {t("تجاهل","Discard")}</button>
                  </div>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] flex-shrink-0">✅ {t("مؤكد","Confirmed")}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {unassignedAssets.length>0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600"/>
            <p className="font-bold text-gray-800 text-sm">{t("أصول بانتظار التخصيص لفرع","Assets awaiting branch assignment")} ({pendingCount})</p>
            <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">{t("مرفوعة على مستوى العلامة","Uploaded at brand level")}</Badge>
          </div>
          <p className="text-[11px] text-amber-700">{t("هذه الأصول مرفوعة على مستوى العلامة التجارية ولن تظهر في شاشات الفروع حتى تُخصَّص لفرع.","These assets were uploaded at the brand level and won't appear in branch screens until assigned to a branch.")}</p>
          <div className="space-y-2">
            {unassignedAssets.map(a=>(
              <div key={a.id} className="flex items-center gap-3 bg-white rounded-xl border border-amber-100 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0"><Building2 size={15} className="text-amber-600"/></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{a.name}</p>
                  <p className="text-[10px] text-gray-400" dir="ltr">{a.publicId} · {a.categoryLabelAr ?? catLabel(a.category)} · {fmtSar2((a.bookValueHalalas ?? 0) / 100)} {SAR}</p>
                </div>
                <select value={assignBranch[a.id] ?? ""} onChange={e=>setAssignBranch(p=>({...p,[a.id]:e.target.value}))}
                  className="text-xs border border-amber-200 rounded-lg px-2 py-2 bg-white flex-shrink-0 max-w-[160px]">
                  <option value="">{t("اختر الفرع","Select branch")}</option>
                  {branchOpts.map(b=><option key={b.branchId} value={b.branchId}>{b.branchName}</option>)}
                </select>
                <button onClick={()=>assignToBranch(a)} disabled={!assignBranch[a.id]||patchAssetMut.isPending}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 flex-shrink-0">
                  <Check size={11}/> {t("تخصيص","Assign")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("القيمة المسجّلة","Registered Value")} value={fmtSar2(totalValue)} sub={SAR} icon={<Building2 size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("أصول نشطة","Active")}            value={String(activeCount)} sub={`${t("من","of")} ${totalCount}`} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={summary?t("بانتظار الفرع","Pending branch"):t("في صيانة","Maintenance")} value={String(summary?summary.pendingBranch:maintCount)} sub={t("أصول","assets")} icon={<AlertTriangle size={18} className="text-red-500"/>} accent="red"/>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 flex-1"><Search size={13} className="text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("بحث بالاسم/الرمز/العهدة...","Search name/code/custodian...")} className="flex-1 text-sm outline-none"/></div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-2">
            <option value="all">{t("كل الحالات","All statuses")}</option>
            {Object.keys(SL).map(k=><option key={k} value={k}>{SL[k]}</option>)}
          </select>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
            <button onClick={()=>setCatFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${catFilter==="all"?"bg-white text-gray-800 shadow-sm":"text-gray-500"}`}>{t("الكل","All")}</button>
            {catOptions.map(c=><button key={c.key} onClick={()=>setCatFilter(c.key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${catFilter===c.key?"bg-white text-gray-800 shadow-sm":"text-gray-500"}`}>{c.labelAr}</button>)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-6 gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-500">
          <span className="col-span-2">{t("الأصل","Asset")}</span><span>{t("الفرع","Branch")}</span><span>{t("الفئة","Category")}</span><span>{t("القيمة المسجّلة","Registered Value")}</span><span>{t("الحالة","Status")}</span>
        </div>
        {apiAssets.length===0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">✅ {t("لا توجد أصول","No assets")}</div>
        ) : apiAssets.map(a=>(
          <div key={a.id} className="grid grid-cols-6 gap-3 px-5 py-4 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/50">
            <div className="col-span-2">
              <p className="font-semibold text-gray-800 text-sm">{a.name}</p>
              <p className="text-[10px] text-gray-400" dir="ltr">{a.publicId}{a.serial?` · ${a.serial}`:""}</p>
            </div>
            <div><p className="text-xs font-medium text-gray-700">{branchName(a.branchId)}</p><p className="text-[10px] text-gray-400">{a.custodian ?? "—"}</p></div>
            <span className="text-xs text-gray-500">{a.categoryLabelAr ?? catLabel(a.category)}</span>
            <span className="font-mono font-bold text-gray-800 text-sm">{fmtSar2((a.bookValueHalalas ?? 0) / 100)}</span>
            <div className="flex items-center gap-1.5">
              <Badge className={`text-[10px] border ${SC[a.status]??SC.active}`}>{a.statusLabelAr ?? SL[a.status] ?? a.status}</Badge>
              <button onClick={e=>openEdit(a, e.currentTarget)} aria-label={t("تعديل الأصل: " + a.name, "Edit asset: " + a.name)} className="p-1 rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Edit2 size={11}/></button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{t("أصل جديد","New Asset")}</h3><button onClick={()=>setShowAdd(false)} className="text-gray-400"><X size={18}/></button></div>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم الأصل","Asset Name")}</label><input value={aForm.name} onChange={e=>setAForm(f=>({...f,name:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الفئة","Category")}</label><select value={aForm.category||catOptions[0]?.key} onChange={e=>setAForm(f=>({...f,category:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none">{catOptions.map(c=><option key={c.key} value={c.key}>{c.labelAr}</option>)}</select></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الفرع","Branch")}</label><select value={aForm.branchId} onChange={e=>setAForm(f=>({...f,branchId:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option value="">{t("اختر الفرع","Select branch")}</option>{branchOpts.map(b=><option key={b.branchId} value={b.branchId}>{b.branchName}</option>)}</select></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("رقم الفاتورة","Invoice #")}</label><input value={aForm.invNum} onChange={e=>setAForm(f=>({...f,invNum:e.target.value}))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الرقم التسلسلي","Serial")}</label><input value={aForm.serial} onChange={e=>setAForm(f=>({...f,serial:e.target.value}))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("السعر (ر.س)","Price (SAR)")}</label><input type="number" value={aForm.price} onChange={e=>setAForm(f=>({...f,price:e.target.value}))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("العمر الإنتاجي (شهر) — لا يُستخدم لحساب إهلاك","Useful Life (months) — not used for depreciation")}</label><select value={aForm.usefulLifeMonths} onChange={e=>setAForm(f=>({...f,usefulLifeMonths:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none">{USEFUL_LIFE_CD.map(o=><option key={o.val} value={String(o.val)}>{o.label}</option>)}</select></div>
                <div className="col-span-2"><label className="text-xs font-semibold text-gray-600 block mb-1">{t("العهدة","Custodian")}</label><input value={aForm.custodian} onChange={e=>setAForm(f=>({...f,custodian:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
              </div>
              <div className="flex gap-2 justify-end pt-1"><Btn onClick={()=>setShowAdd(false)}>{t("إلغاء","Cancel")}</Btn><Btn variant="primary" onClick={submitAsset} disabled={!aForm.name.trim()||!aForm.branchId||createAssetMut.isPending}><Plus size={13}/> {t("إضافة","Add")}</Btn></div>
            </div>
          </div>
        </div>
      )}

      <DialogPrimitive.Root open={Boolean(editAsset)} onOpenChange={open => { if (!open) setEditAsset(null); }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content dir={dir} onCloseAutoFocus={event => { event.preventDefault(); editAssetTriggerRef.current?.focus(); editAssetTriggerRef.current = null; }} className="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl focus:outline-none">
            <div className="flex items-center justify-between mb-4"><DialogPrimitive.Title className="font-bold text-gray-800">{t("تعديل الأصل","Edit Asset")}</DialogPrimitive.Title><DialogPrimitive.Close asChild><button type="button" aria-label={t("إغلاق تعديل الأصل", "Close asset edit")} className="text-gray-400"><X size={18}/></button></DialogPrimitive.Close></div>
            <div className="space-y-3">
              <div><label htmlFor="edit-asset-name" className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم الأصل","Asset Name")}</label><input id="edit-asset-name" value={eForm.name} onChange={e=>setEForm(f=>({...f,name:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="edit-asset-category" className="text-xs font-semibold text-gray-600 block mb-1">{t("الفئة","Category")}</label><select id="edit-asset-category" value={eForm.category} onChange={e=>setEForm(f=>({...f,category:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none">{catOptions.map(c=><option key={c.key} value={c.key}>{c.labelAr}</option>)}</select></div>
                <div><label htmlFor="edit-asset-status" className="text-xs font-semibold text-gray-600 block mb-1">{t("الحالة","Status")}</label><select id="edit-asset-status" value={eForm.status} onChange={e=>setEForm(f=>({...f,status:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none">{Object.keys(SL).map(k=><option key={k} value={k}>{SL[k]}</option>)}</select></div>
                <div className="col-span-2"><label htmlFor="edit-asset-branch" className="text-xs font-semibold text-gray-600 block mb-1">{t("الفرع","Branch")}</label><select id="edit-asset-branch" value={eForm.branchId} onChange={e=>setEForm(f=>({...f,branchId:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option value="">{t("غير مخصص","Unassigned")}</option>{branchOpts.map(b=><option key={b.branchId} value={b.branchId}>{b.branchName}</option>)}</select></div>
                <div><label htmlFor="edit-asset-book-value" className="text-xs font-semibold text-gray-600 block mb-1">{t("القيمة المسجّلة (ر.س)","Registered value (SAR)")}</label><input id="edit-asset-book-value" type="number" value={eForm.bookValue} onChange={e=>setEForm(f=>({...f,bookValue:e.target.value}))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
                <div><label htmlFor="edit-asset-serial" className="text-xs font-semibold text-gray-600 block mb-1">{t("الرقم التسلسلي","Serial")}</label><input id="edit-asset-serial" value={eForm.serial} onChange={e=>setEForm(f=>({...f,serial:e.target.value}))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
                <div className="col-span-2"><label htmlFor="edit-asset-custodian" className="text-xs font-semibold text-gray-600 block mb-1">{t("العهدة","Custodian")}</label><input id="edit-asset-custodian" value={eForm.custodian} onChange={e=>setEForm(f=>({...f,custodian:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
              </div>
              <div className="flex gap-2 justify-end pt-1"><Btn onClick={()=>setEditAsset(null)}>{t("إلغاء","Cancel")}</Btn><Btn variant="primary" onClick={submitEdit} disabled={patchAssetMut.isPending}><Check size={13}/> {t("حفظ","Save")}</Btn></div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

// ═══════════════════════════════════════════════════
/// ACCOUNTANT — SHIFTS MODULE (T08)
// ═══════════════════════════════════════════════════
// Per-brand N-shift config editor (T08 §1).
function ShiftConfigCard({ cfg }:{ cfg:ShiftConfig }) {
  const { t } = useCLang();
  const saveMut = useSaveShiftConfig();
  const [numShifts, setNumShifts] = useState(String(cfg.numShifts ?? 2));
  const [duration,  setDuration]  = useState(String(cfg.durationHours ?? 8));
  const [firstStart,setFirstStart]= useState(cfg.firstShiftStart ?? "06:00");
  const [float,     setFloat]     = useState(String(Math.round((cfg.openingFloatHalalas ?? 50000)/100)));
  const save = () => saveMut.mutate({ brandId: cfg.brandId, config: {
    numShifts: Number(numShifts), durationHours: Number(duration), firstShiftStart: firstStart,
    openingFloatHalalas: Math.round((parseFloat(float)||0)*100),
  } });
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100"><p className="font-bold text-gray-800 text-sm">{cfg.brandName}</p></div>
      <div className="p-5 grid grid-cols-4 gap-4">
        <div><label className="text-[11px] font-semibold text-gray-500 block mb-1.5">{t("عدد الشفتات","# Shifts")}</label>
          <select value={numShifts} onChange={e=>setNumShifts(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400">{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
        <div><label className="text-[11px] font-semibold text-gray-500 block mb-1.5">{t("مدة الشفت (ساعة)","Duration (h)")}</label>
          <input type="number" value={duration} onChange={e=>setDuration(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"/></div>
        <div><label className="text-[11px] font-semibold text-gray-500 block mb-1.5">{t("بداية أول شفت","First start")}</label>
          <input type="time" value={firstStart} onChange={e=>setFirstStart(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"/></div>
        <div><label className="text-[11px] font-semibold text-gray-500 block mb-1.5">{t("العهدة الافتتاحية (ر.س)","Opening float")}</label>
          <input type="number" value={float} onChange={e=>setFloat(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"/></div>
      </div>
      {cfg.shifts?.length>0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {cfg.shifts.map(s=><span key={s.no} className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 rounded-lg px-2 py-1">{s.name}: {s.window}</span>)}
        </div>
      )}
      <div className="px-5 pb-4 flex justify-end"><Btn size="sm" variant="primary" onClick={save} disabled={saveMut.isPending}><Check size={11}/> {t("حفظ الإعدادات","Save")}</Btn></div>
    </div>
  );
}

function AccCompanyShifts({ approve, reject, requestClarification, page, setPage }:{
  approve:(id:string)=>void; reject:(id:string)=>void; requestClarification?:(id:string)=>void;
  page:number; setPage:(page:number)=>void;
}) {
  const { t, dir, lang } = useCLang();
  type ShiftTab = "live"|"setup"|"close"|"history";
  const [tab,          setTab]          = useState<ShiftTab>("live");
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [contactShift, setContactShift] = useState<Shift|null>(null);
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [historyBranchId, setHistoryBranchId] = useState("");
  const [historyPageNum, setHistoryPageNum] = useState(1);
  const operationsQuery = useOperations({ moduleKey:"shifts", pageSize:100, page });
  const shiftOps = shfReviewRows(operationsQuery.data).map(op => apiOpToCOp(op, BRANDS));
  const meta = operationsQuery.data?.meta;
  const totalPages = meta && Number.isSafeInteger(meta.totalPages) && meta.totalPages > 0 ? meta.totalPages : undefined;
  const shownPage = meta && Number.isSafeInteger(meta.page) && meta.page > 0 ? meta.page : page;
  const reviewLoading = operationsQuery.isPending || operationsQuery.isFetching;
  const changeReviewPage = (direction:-1 | 1) => {
    const target = shfReviewPageTarget(shownPage, totalPages, direction);
    if (target !== page) { setExpandedId(null); setPage(target); }
  };
  const reviewGroups:{key:ShfReviewGroup;title:string}[] = [
    { key:"accountant_review", title:t("بانتظار مراجعة المحاسب","Awaiting accountant review") },
    { key:"head_returned", title:t("أُعيدت من رئيس الحسابات — تنتظر إجراء المحاسب","Returned by head — awaiting accountant action") },
    { key:"pending_unknown", title:t("مرحلة معلّقة تحتاج تحققًا — للقراءة فقط","Pending phase needs verification — read-only") },
    { key:"head_review", title:t("لدى رئيس الحسابات — لم تعتمد نهائيًا","With head — not final approved") },
    { key:"final_approved", title:t("معتمدة نهائيًا","Final approved") },
    { key:"manager_returned", title:t("أُعيدت لمدير الفرع","Returned to branch manager") },
    { key:"other", title:t("حالات أخرى للقراءة","Other read-only states") },
  ];

  const { data: live, isLoading: liveLoading } = useShiftsLive();
  const historyQuery = useShiftsHistory({dateFrom:historyDateFrom,dateTo:historyDateTo,branchId:historyBranchId,page:historyPageNum,pageSize:20});
  const { data: historyBranchConfigs = [] } = useShiftConfigs("branch");
  const historyBranches = historyBranchOptions(historyBranchConfigs);
  const { data: configs = [] } = useShiftConfigs();
  const exportMut = useExportShifts();

  const active  = live?.active ?? [];
  const overdue = live?.overdue ?? [];
  const allLive = [...active, ...overdue];
  const kpis    = live?.kpis;
  const historyBusy = historyQuery.isPending || historyQuery.isFetching;
  const historyPage = historyQuery.data;
  const history = historyBusy || historyQuery.isError ? [] : historyPage?.data ?? [];
  const historyMeta = historyBusy || historyQuery.isError ? undefined : historyPage?.meta;
  const historyShownPage = historyMeta && Number.isSafeInteger(historyMeta.page) && historyMeta.page > 0 ? historyMeta.page : historyPageNum;
  const changeHistoryPage = (direction:-1|1) => {
    const target = historyPageTarget(historyMeta,historyPageNum,direction);
    if (target !== historyPageNum) setHistoryPageNum(target);
  };

  const TABS: { key:ShiftTab; label:string; icon:React.ReactNode }[] = [
    { key:"live",    label:t("مباشر","Live"),    icon:<Activity size={13}/> },
    { key:"setup",   label:t("إعداد","Setup"),   icon:<Settings size={13}/> },
    { key:"close",   label:t("مراجعة الورديات","Shift review"), icon:<Clipboard size={13}/> },
    { key:"history", label:t("سجل","History"),   icon:<BarChart3 size={13}/> },
  ];

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول الشفتات","Shifts Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("متابعة فتح وإغلاق الشفتات — جميع العلامات والفروع","Track shift openings and closings — all brands and branches")}</p></div>
      </div>

      {/* KPIs (T08 §3) */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("مفتوح الآن","Open Now")} value={String(kpis?.openNow ?? allLive.length)} sub={t("شفت نشط","active shifts")} icon={<Activity size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("مغلقة اليوم","Closed Today")} value={String(kpis?.closedToday ?? 0)} sub={t("شفت مغلق","closed")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("مبيعات اليوم","Today's Sales")} value={formatShiftHalalas(kpis?.todaySalesHalalas, lang)} sub={t("ر.س","SAR")} icon={<Wallet size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("فروق كاش للمراجعة","Cash Gaps")} value={String(kpis?.cashGapsPendingReview ?? 0)} sub={t("تحتاج مراجعة","needs review")} icon={<AlertTriangle size={18} className="text-red-500"/>} accent="red"/>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(tb=>(
          <button key={tb.key} onClick={()=>setTab(tb.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab===tb.key?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
            {tb.icon}{tb.label}
          </button>
        ))}
      </div>

      {/* LIVE TAB */}
      {tab==="live" && (
        <div className="space-y-4">
          {overdue.length>0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle size={14} className="text-red-600 flex-shrink-0"/>
              <p className="text-red-800 text-xs font-semibold">{overdue.length} {t("شفت متأخر — انتهى وقته ولم يُغلق الصندوق بعد","shift(s) late — window ended, cash not closed")}</p>
            </div>
          )}
          {liveLoading && <p className="text-center text-gray-400 text-sm py-8">{t("جارٍ التحميل…","Loading…")}</p>}
          {!liveLoading && allLive.length===0 && <p className="text-center text-gray-400 text-sm py-8">{t("لا توجد شفتات مفتوحة حالياً","No open shifts")}</p>}
          {allLive.map(s=>{
            const sc = getShiftStatusDisplay(s.status, lang);
            const evidence = getShiftCountEvidence(s, lang);
            const late = s.status==="late" || s.isLate;
            return (
              <div key={s.id} className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden ${late?"border-red-200":"border-amber-200"}`}>
                <div className={`px-5 py-3 border-b flex items-center justify-between ${late?"bg-red-50/60 border-red-100":"bg-amber-50/60 border-amber-100"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${late?"bg-red-500":"bg-amber-500"}`}/>
                    <div><p className="font-bold text-gray-800 text-sm">{s.branchName}</p><p className="text-[10px] text-gray-500">{s.shiftType}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setContactShift(s)} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1"><Send size={9}/> {t("تواصل","Contact")}</button>
                    <Badge className={`${sc.cls} text-[10px] font-bold`}>{s.statusLabelAr ?? sc.label}</Badge>
                  </div>
                </div>
                {late && s.lateBannerAr && <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-[11px] text-red-700 font-semibold">⏰ {s.lateBannerAr}</div>}
                <div className="grid grid-cols-4 gap-0 divide-x divide-x-reverse divide-gray-100 px-5 py-4">
                  <div className="pl-4"><p className="text-[10px] text-gray-400">{t("الكاشير","Cashier")}</p><p className="font-semibold text-gray-800 text-sm mt-0.5">{s.cashierName}</p></div>
                  <div className="px-4"><p className="text-[10px] text-gray-400">{t("البداية","Start")}</p><p className="font-semibold text-gray-800 text-sm mt-0.5">{new Date(s.startedAt).toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"})}</p></div>
                  <div className="px-4"><p className="text-[10px] text-gray-400">{t("الطلبات","Orders")}</p><p className="font-bold text-gray-400 text-sm mt-0.5" title={t("عدد الطلبات الفعلي غير متاح","Actual order count is unavailable")}>{evidence.ordersCount}</p></div>
                  <div className="pr-4"><p className="text-[10px] text-gray-400">{t("المبيعات","Sales")}</p><p className="font-bold text-purple-700 text-sm mt-0.5 font-mono"><bdi>{evidence.sales}</bdi></p></div>
                </div>
                <div className="px-5 pb-4 flex items-center justify-between">
                  <div><p className="text-[10px] text-gray-400">{t("النقد المتوقع","Expected cash")}</p><p className="font-black text-gray-800 text-base font-mono"><bdi>{evidence.expectedCash}</bdi> {t("ر.س","SAR")}</p></div>
                </div>
                <div className="px-5 pb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <p>{t("الفرق","Variance")}: <span className={`font-mono font-bold ${evidence.variance.cls}`}><bdi>{evidence.variance.text}</bdi></span></p>
                  <p className="text-gray-500">{t("نقد وارد معلق (خارج الفرق)","Pending incoming (excluded from variance)")}: <bdi className="font-mono">{evidence.pendingIncoming}</bdi> {t("ر.س","SAR")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SETUP TAB */}
      {tab==="setup" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{t("عدد الشفتات ومدتها وبدايتها والعهدة الافتتاحية لكل علامة تجارية","Shift count, duration, start & opening float per brand")}</p>
          {configs.length===0 && <p className="text-center text-gray-400 text-sm py-8">{t("لا توجد إعدادات","No configs")}</p>}
          {configs.map(c=><ShiftConfigCard key={c.brandId} cfg={c}/>)}
        </div>
      )}

      {/* Accountant SHF operation review; the native close flow is not used here. */}
      {tab==="close" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
            <p>{t("الصفحة","Page")} {shownPage}{totalPages ? ` / ${totalPages}` : ""} · {t("عمليات هذه الصفحة","Operations on this page")}: {reviewLoading || operationsQuery.isError ? "—" : shiftOps.length}</p>
            <div className="flex gap-2">
              <button disabled={reviewLoading || operationsQuery.isError || shfReviewPageTarget(shownPage,totalPages,-1)===page} onClick={()=>changeReviewPage(-1)} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50">{t("السابق","Previous")}</button>
              <button disabled={reviewLoading || operationsQuery.isError || shfReviewPageTarget(shownPage,totalPages,1)===page} onClick={()=>changeReviewPage(1)} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50">{t("التالي","Next")}</button>
            </div>
          </div>
          {reviewLoading && <p role="status" className="text-sm text-gray-500">{t("جارٍ تحميل عمليات الورديات…","Loading shift operations…")}</p>}
          {operationsQuery.isError && <p role="alert" className="text-sm text-red-700">{getErrorMessage(operationsQuery.error, lang)}</p>}
          {!reviewLoading && !operationsQuery.isError && shiftOps.length===0 && <p className="text-sm text-gray-500">{t("لا توجد عمليات ورديات في هذه الصفحة","No shift operations on this page")}</p>}
          {!reviewLoading && !operationsQuery.isError && reviewGroups.map(group => {
            const rows = shiftOps.filter(op => getShfReviewGroup(op) === group.key);
            return rows.length>0 && <section key={group.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <h3 className="px-5 py-3.5 text-sm font-bold text-gray-800 bg-gray-50 border-b border-gray-100">{group.title} ({rows.length} {t("في هذه الصفحة","on this page")})</h3>
              {rows.map(op => <div key={op.id}>
                {(group.key==="pending_unknown" || group.key==="other") && <p className="px-5 pt-2 text-xs text-amber-700">{t("هذه المرحلة للقراءة فقط لدى المحاسب","This phase is read-only for the accountant")}</p>}
                <OpRow op={op} onApprove={()=>approve(op.id)} onReject={()=>reject(op.id)}
                  onClarify={requestClarification ? ()=>requestClarification(op.id) : undefined}
                  onView={()=>setExpandedId(expandedId===op.id?null:op.id)}
                  expanded={expandedId===op.id} onToggle={()=>setExpandedId(expandedId===op.id?null:op.id)}/>
              </div>)}
            </section>;
          })}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab==="history" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <p className="font-bold text-gray-900 text-sm">{t("سجل الشفتات المغلقة","Closed Shifts History")}</p>
            <button onClick={()=>exportMut.mutate({})} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11}/> Excel</button>
          </div>
          <div className="px-5 py-3 flex flex-wrap items-end gap-3 text-xs">
            <label>{t("من تاريخ الإغلاق","Closed from")}<input type="date" value={historyDateFrom}
              onChange={e=>{setHistoryDateFrom(e.target.value);setHistoryPageNum(1);}}
              className="block mt-1 rounded-lg border border-gray-200 px-2 py-1.5"/></label>
            <label>{t("إلى تاريخ الإغلاق","Closed to")}<input type="date" value={historyDateTo}
              onChange={e=>{setHistoryDateTo(e.target.value);setHistoryPageNum(1);}}
              className="block mt-1 rounded-lg border border-gray-200 px-2 py-1.5"/></label>
            <label>{t("الفرع","Branch")}<select value={historyBranchId}
              onChange={e=>{setHistoryBranchId(e.target.value);setHistoryPageNum(1);}}
              className="block mt-1 rounded-lg border border-gray-200 px-2 py-1.5">
              <option value="">{t("كل الفروع المعيّنة","All assigned branches")}</option>
              {historyBranches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select></label>
          </div>
          {historyBusy && <p role="status" className="text-center text-gray-400 text-sm py-8">{t("جارٍ تحميل السجل…","Loading history…")}</p>}
          {!historyBusy && historyQuery.isError && <p role="alert" className="text-center text-red-700 text-sm py-8">{getErrorMessage(historyQuery.error,lang)}</p>}
          {!historyBusy && !historyQuery.isError && history.length===0 && <p className="text-center text-gray-400 text-sm py-8">{t("لا يوجد سجل لهذه المرشحات","No history for these filters")}</p>}
          {!historyBusy && !historyQuery.isError && history.length>0 && (
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">{t("الفرع","Branch")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">{t("الكاشير","Cashier")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("النوع","Type")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("التاريخ","Date")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("المبيعات","Sales")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("الفرق","Variance")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map(s=>{
                  const evidence = getShiftCountEvidence(s, lang);
                  return (
                    <tr key={s.id} className={`hover:bg-gray-50 ${evidence.variance.rowCls}`}>
                      <td className="px-4 py-3 font-semibold text-gray-800">{s.branchName}</td>
                      <td className="px-4 py-3 text-gray-700">{s.cashierName}</td>
                      <td className="px-4 py-3 text-center"><Badge className="bg-gray-100 text-gray-600 text-[10px]">{s.shiftType}</Badge></td>
                      <td className="px-4 py-3 text-center text-gray-500">{s.endedAt?new Date(s.endedAt).toLocaleDateString("ar-SA"):"—"}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-gray-800"><bdi>{evidence.sales}</bdi></td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-mono font-bold ${evidence.variance.cls}`}><bdi>{evidence.variance.text}</bdi></span>
                        <p className="text-[10px] text-gray-500 mt-1">{t("نقد وارد معلق (خارج الفرق)","Pending incoming (excluded from variance)")}: <bdi className="font-mono">{evidence.pendingIncoming}</bdi> {t("ر.س","SAR")}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span>{t("الصفحة","Page")} {historyShownPage} / {historyMeta?.totalPages ?? "—"}</span>
            <div className="flex gap-2">
              <button disabled={historyBusy || historyQuery.isError || historyPageTarget(historyMeta,historyPageNum,-1)===historyPageNum}
                onClick={()=>changeHistoryPage(-1)} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50">{t("السابق","Previous")}</button>
              <button disabled={historyBusy || historyQuery.isError || historyPageTarget(historyMeta,historyPageNum,1)===historyPageNum}
                onClick={()=>changeHistoryPage(1)} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50">{t("التالي","Next")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact modal (tel / whatsapp) */}
      {contactShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setContactShift(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{t("تواصل مع","Contact")} {contactShift.cashierName}</h3><button onClick={()=>setContactShift(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button></div>
            <div className="space-y-2">
              {contactShift.cashierPhone && <a href={`tel:${contactShift.cashierPhone}`} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-sm font-semibold hover:bg-sky-100">📞 {t("اتصال","Call")}: {contactShift.cashierPhone}</a>}
              {contactShift.whatsapp && <a href={contactShift.whatsapp.startsWith("http")?contactShift.whatsapp:`https://${contactShift.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-100">💬 {t("واتساب","WhatsApp")}</a>}
              {!contactShift.cashierPhone && !contactShift.whatsapp && <p className="text-xs text-gray-400 text-center py-3">{t("لا توجد بيانات تواصل","No contact info")}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — REMINDERS
// ═══════════════════════════════════════════════════
function AccCompanyReminders() {
  type Reminder = { id:string;title:string;desc:string;due:string;priority:"high"|"medium"|"low";done:boolean };
  const { data: serverReminders } = useReminders();
  const patchMut = usePatchReminder();
  const createMut = useCreateReminder();
  const deleteMut = useDeleteReminder();
  // Driven by GET /company/me/reminders. No static fallback.
  const reminders: Reminder[] = Array.isArray(serverReminders)
    ? serverReminders.map(r => ({ id: r.id, title: r.title, desc: r.description, due: r.dueAt, priority: r.priority, done: r.done }))
    : [];
  const [showAdd,setShowAdd]=useState(false);
  const [remForm,setRemForm]=useState({ title:"", description:"", dueAt:"", priority:"medium" as "high"|"medium"|"low" });
  const submitReminder=()=>{
    if(!remForm.title.trim())return;
    createMut.mutate(
      { title:remForm.title, description:remForm.description, dueAt: remForm.dueAt ? new Date(remForm.dueAt).toISOString() : new Date().toISOString(), priority:remForm.priority } as any,
      { onSuccess: ()=>{ setShowAdd(false); setRemForm({ title:"", description:"", dueAt:"", priority:"medium" }); } },
    );
  };
  const toggleDone=(id:string)=>{
    const r = reminders.find(x=>x.id===id);
    if(r) patchMut.mutate({ id, patch: { done: !r.done } });
  };
  const remove=(id:string)=>{ deleteMut.mutate(id); };
  const P:Record<string,string>={high:"bg-red-50 text-red-700 border border-red-200",medium:"bg-amber-50 text-amber-700 border border-amber-200",low:"bg-gray-100 text-gray-600 border border-gray-200"};
  const PL:Record<string,string>={high:"عالية",medium:"متوسطة",low:"منخفضة"};
  const pending=reminders.filter(r=>!r.done);
  const { t, dir } = useCLang();
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("التذكيرات والمهام","Reminders & Tasks")}</h2><p className="text-gray-400 text-sm">{pending.length} {t("مهمة معلقة","pending tasks")}</p></div><Btn variant="primary" onClick={()=>setShowAdd(true)}><Plus size={13}/> {t("تذكير جديد","New Reminder")}</Btn></div>
      {pending.length>0&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3"><AlertTriangle size={16} className="text-amber-600 flex-shrink-0"/><p className="text-amber-800 text-sm font-semibold">{pending.filter(r=>r.priority==="high").length} {t("مهام عالية الأولوية تحتاج إنجازاً اليوم","high-priority tasks need completion today")}</p></div>}
      <div className="space-y-2">
        {reminders.map(r=>(
          <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 transition-all ${r.done?"border-gray-100 opacity-70":"border-gray-100 hover:border-purple-100"}`}>
            <button onClick={()=>toggleDone(r.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${r.done?"bg-emerald-500 border-emerald-500":"border-gray-300 hover:border-purple-400"}`}>{r.done&&<Check size={12} className="text-white"/>}</button>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${r.done?"line-through text-gray-400":"text-gray-800"}`}>{r.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`text-[10px] ${P[r.priority]}`}>{PL[r.priority]}</Badge>
              <span className="text-xs text-gray-500">⏰ {r.due}</span>
              <button onClick={()=>remove(r.id)} className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"><X size={12}/></button>
            </div>
          </div>
        ))}
      </div>
      {showAdd&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">تذكير جديد</h3><button onClick={()=>setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button></div>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">العنوان</label><input value={remForm.title} onChange={e=>setRemForm(f=>({...f,title:e.target.value}))} placeholder="عنوان التذكير..." className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">التفاصيل</label><input value={remForm.description} onChange={e=>setRemForm(f=>({...f,description:e.target.value}))} placeholder="وصف اختياري..." className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">المهلة</label><input type="date" value={remForm.dueAt} onChange={e=>setRemForm(f=>({...f,dueAt:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
                <div><label className="text-xs font-semibold text-gray-600 block mb-1">الأولوية</label><select value={remForm.priority} onChange={e=>setRemForm(f=>({...f,priority:e.target.value as "high"|"medium"|"low"}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option value="high">عالية</option><option value="medium">متوسطة</option><option value="low">منخفضة</option></select></div>
              </div>
              <div className="flex gap-2 justify-end"><Btn onClick={()=>setShowAdd(false)}>إلغاء</Btn><Btn variant="primary" onClick={submitReminder} disabled={!remForm.title.trim()||createMut.isPending}><Check size={13}/> إضافة</Btn></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
/// ACCOUNTANT — WASTE MODULE (T07 §4–§7)
// ═══════════════════════════════════════════════════
type WAllocDraft = { empNumber:string; employeeName?:string; amount:string };

// One employee allocation row for a «موظف» waste product (empNumber → name lookup).
function WasteAllocRow({ branchId, row, remainingH, onField, onQuick, onRemove, canRemove }:{
  branchId:string; row:WAllocDraft; remainingH:number;
  onField:(f:"empNumber"|"amount",v:string)=>void; onQuick:()=>void; onRemove:()=>void; canRemove:boolean;
}) {
  const { t } = useCLang();
  const { data: emp } = useBranchEmployeesLookup(branchId, row.empNumber.length>=3?row.empNumber:undefined);
  const name = emp?.name || row.employeeName || "";
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-0.5">
        <label className="text-[9px] text-orange-600">{t("رقم الموظف","Emp #")}</label>
        <input value={row.empNumber} onChange={e=>onField("empNumber",e.target.value)} placeholder="1001"
          className="w-16 text-center font-mono border border-orange-200 rounded-lg px-1.5 py-1 text-[10px] bg-white focus:outline-none"/>
      </div>
      <div className="flex flex-col gap-0.5 flex-1">
        <label className="text-[9px] text-orange-600">{t("اسم الموظف","Name")}</label>
        <div className="h-7 flex items-center px-2 rounded-lg bg-white border border-gray-100 text-[10px] text-gray-700">{name||<span className="text-gray-300">{t("يُعبأ تلقائياً","auto")}</span>}</div>
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-[9px] text-orange-600">{t("المبلغ (ر.س)","Amount")}</label>
        <input type="number" value={row.amount} onChange={e=>onField("amount",e.target.value)} placeholder="0.00"
          className="w-20 text-center font-mono border border-orange-200 rounded-lg px-1.5 py-1 text-[10px] bg-white focus:outline-none"/>
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-[9px] opacity-0">⚡</label>
        <button onClick={onQuick} title={t("المتبقي","Remaining")} className="px-1.5 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold border border-amber-200">⚡</button>
      </div>
      {canRemove && <button onClick={onRemove} className="mt-3 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><X size={10}/></button>}
    </div>
  );
}

// One waste product row: classify (هدر/تالف) · responsibility (موظف/مطعم) · employee allocation.
function WasteProductCard({ entry, product, pi, isHead }:{ entry:WasteEntry; product:WasteProduct; pi:number; isHead?:boolean }) {
  const { t } = useCLang();
  const patchMut = usePatchWasteProduct();
  const putMut   = usePutWasteAllocations();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WAllocDraft[]>(
    product.empAllocs.length>0
      ? product.empAllocs.map(a=>({ empNumber:a.empNumber ?? "", employeeName:a.employeeName, amount:String(Math.round(a.amountHalalas ?? 0)/100) }))
      : [{ empNumber:"", amount:"" }],
  );
  const isEmp   = product.responsibility==="موظف";
  const isDamage= product.classification==="تالف";
  const allocTotalH = rows.reduce((s,r)=>s+Math.round((parseFloat(r.amount)||0)*100),0);
  const remainingH  = (product.value ?? 0) - allocTotalH;
  const locked = isHead || entry.status==="final-approved" || entry.status==="rejected" || entry.status==="approved";

  const setField = (i:number,f:"empNumber"|"amount",v:string)=> setRows(p=>p.map((r,idx)=>idx===i?{...r,[f]:v}:r));
  const quick    = (i:number)=> setRows(p=>p.map((r,idx)=>idx===i?{...r,amount:String(Math.max(0,(remainingH+Math.round((parseFloat(r.amount)||0)*100))/100))}:r));
  const addRow   = ()=> setRows(p=>[...p,{empNumber:"",amount:""}]);
  const removeRow= (i:number)=> setRows(p=>p.filter((_,idx)=>idx!==i));
  const save = ()=> putMut.mutate({ entryId:entry.id, productIdx:pi,
    empAllocs: rows.filter(r=>r.empNumber && r.amount).map(r=>({ empNumber:r.empNumber, amountHalalas:Math.round((parseFloat(r.amount)||0)*100) })) });

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${isEmp?"border-orange-100":"border-gray-100"}`}>
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{product.name}</span>
            {product.qty!=null && <span className="text-[10px] text-gray-500 font-mono">{product.qty} {product.unit ?? ""}</span>}
            <span className="font-mono font-bold text-rose-600 text-xs">{fmtH(product.value ?? 0)} {t("ر.س","SAR")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={locked} onClick={()=>{ if (!isHead) patchMut.mutate({ entryId:entry.id, productIdx:pi, patch:{ classification: isDamage?"هدر":"تالف" } }); }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-50 ${isDamage?"bg-rose-100 text-rose-700 border-rose-300":"bg-amber-100 text-amber-700 border-amber-300"}`}>
            {product.classification}
          </button>
          <button disabled={locked} onClick={()=>{ if (!isHead) patchMut.mutate({ entryId:entry.id, productIdx:pi, patch:{ responsibility: isEmp?"مطعم":"موظف" } }); }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-50 ${isEmp?"bg-orange-100 text-orange-700 border-orange-300":"bg-blue-100 text-blue-700 border-blue-300"}`}>
            {isEmp?t("على موظف","On employee"):t("على المطعم","On restaurant")}
          </button>
          {isEmp && (
            <button onClick={()=>setOpen(v=>!v)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${open?"bg-purple-600 text-white border-purple-600":"bg-purple-50 text-purple-700 border-purple-200"}`}>
              {t("تحميل على موظف","Allocate")} {open?"▲":"▼"}
            </button>
          )}
        </div>
      </div>
      {isEmp && open && (
        <div className="border-t border-orange-100 bg-orange-50/40 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-orange-700">{t("توزيع قيمة الهدر على الموظفين","Allocate loss value to employees")} ({fmtH(product.value ?? 0)} {t("ر.س","SAR")})</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${remainingH<=0?"bg-emerald-100 text-emerald-700":"bg-orange-100 text-orange-700"}`}>
              {remainingH<=0?t("✓ محمَّل بالكامل","✓ fully allocated"):`${t("متبقي","remaining")}: ${fmtH(remainingH)} ${t("ر.س","SAR")}`}
            </span>
          </div>
          {rows.map((r,ai)=>(
            <WasteAllocRow key={ai} branchId={entry.branchId} row={r} remainingH={remainingH}
              onField={(f,v)=>setField(ai,f,v)} onQuick={()=>quick(ai)} onRemove={()=>removeRow(ai)} canRemove={!isHead && rows.length>1}/>
          ))}
          {!isHead && (
            <div className="flex items-center justify-between">
              <button onClick={addRow} className="flex items-center gap-1 text-[10px] text-orange-600 hover:underline font-semibold"><Plus size={10}/> {t("إضافة موظف","Add employee")}</button>
              <button onClick={save} disabled={putMut.isPending || locked}
                className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-[10px] font-bold hover:bg-orange-600 disabled:opacity-50">💾 {t("حفظ التوزيع","Save allocation")}</button>
            </div>
          )}
          <p className="text-[9px] text-orange-500">{t("يجب أن يساوي مجموع التخصيصات قيمة الهدر للمنتج «موظف».","Allocations must sum to the product value for a «موظف» product.")}</p>
        </div>
      )}
    </div>
  );
}

function AccCompanyWaste({ isHead }:{ isHead?:boolean }) {
  const { t, dir } = useCLang();
  const [filterBranch, setFilterBranch] = useState("");   // branchId
  const [expandedId,   setExpandedId]   = useState<string|null>(null);

  // Live list (T07 §4) — { data[], meta.summary }.
  const { data: wasteResp, isLoading } = useWaste({ branchId: filterBranch || undefined });
  const approveMut = useApproveWaste();
  const rejectMut  = useRejectWaste();
  const bulkMut    = useBulkApproveWaste();
  const exportMut  = useExportWaste();

  const entries = wasteResp?.data ?? [];
  const summary = wasteResp?.meta?.summary;
  const branchChips = Array.from(new Map(entries.map(e=>[e.branchId,e.branchName ?? e.branchId])).entries());
  const displayed = filterBranch ? entries.filter(e=>e.branchId===filterBranch) : entries;
  const pendingDisplayed = displayed.filter(e=>e.status==="pending");

  const bulkApprove = () => {
    if (filterBranch) bulkMut.mutate({ branchId: filterBranch });
    else bulkMut.mutate({ entryIds: pendingDisplayed.map(e=>e.id) });
  };

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{isHead ? t("موديول الهدر والتالف — تدقيق","Waste & Spoilage — Audit") : t("موديول الهدر والتالف","Waste & Spoilage Module")}</h2><p className="text-gray-400 text-sm mt-0.5">{isHead ? t("تدقيق قيود الهدر والتالف — قراءة فقط","Audit waste & spoilage records — read only") : t("مراجعة الهدر — تعديل التصنيف والمسؤولية وتوزيع التحميل على الموظفين","Review waste — adjust classification, responsibility and employee allocations")}</p></div>
        {!isHead && pendingDisplayed.length>0 && (
          <Btn variant="success" size="sm" onClick={bulkApprove}><CheckCircle2 size={12}/> {t("موافقة على الكل","Approve All")} ({pendingDisplayed.length})</Btn>
        )}
      </div>

      {/* KPI header (T07 §4 — meta.summary) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label={t("بانتظار المراجعة","Pending Review")} value={String(summary?.pendingReview ?? pendingDisplayed.length)} sub={t("من الفروع","from branches")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("معتمد هذا الشهر","Approved (month)")} value={String(summary?.approvedThisMonth ?? 0)} sub={t("سجلات","records")} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
        <KpiCard label={t("إجمالي الخسائر","Total Losses")} value={fmtH(summary?.totalLossesHalalas ?? 0)} sub={t("ر.س — هدر + تالف","SAR — waste + damage")} icon={<Trash2 size={18} className="text-rose-600"/>} accent="red"/>
        <KpiCard label={t("محمَّل على الموظفين","Charged to Employees")} value={fmtH(summary?.chargedToEmployeesHalalas ?? 0)} sub={t("ر.س","SAR")} icon={<Users size={18} className="text-orange-600"/>} accent="orange"/>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-500">{t("تصفية حسب الفرع","Filter by branch")}</p>
          <button onClick={()=>exportMut.mutate({ branchId: filterBranch || undefined })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={12}/> {t("تصدير Excel","Export Excel")}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setFilterBranch("")} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${!filterBranch?"bg-purple-600 text-white border-purple-600":"bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>{t("الكل","All")}</button>
          {branchChips.map(([id,name])=>{
            const bPend = entries.filter(e=>e.branchId===id&&e.status==="pending").length;
            return (
              <button key={id} onClick={()=>setFilterBranch(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${filterBranch===id?"bg-purple-600 text-white border-purple-600":"bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
                {name}
                {bPend>0&&<span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${filterBranch===id?"bg-white text-purple-700":"bg-amber-500 text-white"}`}>{bPend}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">{t("بيانات الهدر والتالف","Waste Records")}</h3>
          <span className="text-xs text-gray-400">{displayed.length} {t("بيان — اضغط لعرض المنتجات والتحميل","records — click to view products & allocation")}</span>
        </div>
        {isLoading && <div className="py-10 text-center text-gray-400 text-sm">{t("جارٍ التحميل…","Loading…")}</div>}
        {!isLoading && displayed.length===0 && <div className="py-10 text-center text-gray-400 text-sm">✅ {t("لا توجد بيانات هدر","No waste records")}</div>}
        {displayed.map(entry=>{
          const isExpanded = expandedId===entry.id;
          const scfg = STATUS_CFG[entry.status as COpStatus] ?? STATUS_CFG.pending;
          return (
            <div key={entry.id} className="border-b border-gray-100 last:border-0">
              <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 cursor-pointer ${isExpanded?"bg-rose-50/20":""}`} onClick={()=>setExpandedId(isExpanded?null:entry.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{entry.branchName ?? entry.branchId}</span>
                    {entry.brandName && <Badge className="bg-gray-100 text-gray-500 text-[10px]">{entry.brandName}</Badge>}
                    <span className="font-mono text-xs text-rose-600">{entry.publicId}</span>
                    <Badge className={`${scfg.cls} text-[10px]`}>{scfg.label}</Badge>
                    <Badge className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px]">{entry.productsCount ?? entry.products.length} {t("منتج","products")}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5">
                    <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString("ar-SA")}</p>
                    <span className="text-xs font-mono font-bold text-rose-700">{t("إجمالي","Total")}: {fmtH(entry.amount ?? 0)} {t("ر.س","SAR")}</span>
                    {(entry.employeeChargedHalalas ?? 0)>0 && <span className="text-[10px] text-orange-600 font-semibold">{t("منه على موظفين","charged")}: {fmtH(entry.employeeChargedHalalas)} {t("ر.س","SAR")}</span>}
                  </div>
                </div>
                {!isHead && entry.status==="pending" && (
                  <div className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
                    <Btn size="sm" variant="success" onClick={()=>approveMut.mutate(entry.id)}><ThumbsUp size={12}/></Btn>
                    <Btn size="sm" variant="danger"  onClick={()=>rejectMut.mutate({ entryId:entry.id, reason:"تحتاج مراجعة" })}><ThumbsDown size={12}/></Btn>
                  </div>
                )}
                {isExpanded?<ChevronUp size={14} className="text-gray-400 flex-shrink-0"/>:<ChevronDown size={14} className="text-gray-400 flex-shrink-0"/>}
              </div>
              {isExpanded && (
                <div className="px-5 pb-5 bg-gray-50/40 space-y-3">
                  <p className="text-xs font-bold text-gray-600 mt-3">{t("المنتجات — التصنيف والمسؤولية وتوزيع التحميل:","Products — classify, assign responsibility & allocate:")}</p>
                  {entry.products.map((p,pi)=><WasteProductCard key={pi} entry={entry} product={p} pi={pi} isHead={isHead}/>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ACCOUNTANT — EMPLOYEES
// ═══════════════════════════════════════════════════
// Manual movement categories postable via A3 (system keys are read-only, posted by ops).
const EMP_MANUAL_CATEGORIES: { key: EmployeeMovementCategory; labelAr: string; defaultType: "credit"|"debit" }[] = [
  { key:"advance",           labelAr:"سلفة",          defaultType:"debit"  },
  { key:"deduction",         labelAr:"خصم",           defaultType:"debit"  },
  { key:"absence",           labelAr:"غياب",          defaultType:"debit"  },
  { key:"receipts_shortage", labelAr:"نقص إيصالات",   defaultType:"debit"  },
  { key:"bonus",             labelAr:"مكافأة",        defaultType:"credit" },
];

// «إضافة حركة» modal (T09 §A3) — POST /accountant/employees/{id}/movements.
function EmpAddMovementModal({ employeeId, employeeName, onClose }:{ employeeId:string; employeeName:string; onClose:()=>void }) {
  const { t, dir } = useCLang();
  const createMut = useCreateEmployeeMovement();
  const [category, setCategory]   = useState<EmployeeMovementCategory>("advance");
  const [movementType, setType]   = useState<"credit"|"debit">("debit");
  const [amount, setAmount]       = useState("");
  const [description, setDesc]    = useState("");
  const [date, setDate]           = useState("");

  const pickCategory = (k:EmployeeMovementCategory) => {
    setCategory(k);
    const c = EMP_MANUAL_CATEGORIES.find(x=>x.key===k);
    if(c) setType(c.defaultType);
  };
  const amountH = Math.round((parseFloat(amount)||0)*100);
  const submit = () => {
    if(amountH < 1 || !description.trim()) return;
    createMut.mutate({ employeeId, payload:{ movementType, amount:amountH, category, description:description.trim(), date:date||undefined } },
      { onSuccess:()=>onClose() });
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">{t("إضافة حركة","Add movement")} — {employeeName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("التصنيف","Category")}</label>
            <select value={category} onChange={e=>pickCategory(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400">
              {EMP_MANUAL_CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.labelAr}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("النوع","Type")}</label>
              <select value={movementType} onChange={e=>setType(e.target.value as "credit"|"debit")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400">
                <option value="debit">{t("مدين (على الموظف)","Debit")}</option>
                <option value="credit">{t("دائن (للموظف)","Credit")}</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المبلغ (ر.س)","Amount")}</label>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-purple-400"/>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("البيان","Description")}</label>
            <input value={description} onChange={e=>setDesc(e.target.value)} placeholder={t("وصف الحركة...","Movement description...")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"/>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("التاريخ (اختياري)","Date (optional)")}</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"/>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50">{t("إلغاء","Cancel")}</button>
            <Btn variant="primary" onClick={submit} disabled={amountH<1||!description.trim()||createMut.isPending}><Plus size={11}/> {t("تسجيل الحركة","Add")}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccCompanyEmployees() {
  const { t, dir } = useCLang();
  const [selectedEmp, setSelectedEmp] = useState<string|null>(null);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [branchFilter,setBranchFilter]= useState("");
  const [month,       setMonth]       = useState("");   // YYYY-MM, empty = all history
  const [showAdd,     setShowAdd]     = useState(false);

  const { data: employeesPage } = useEmployees({ q: searchTerm || undefined, branchId: branchFilter || undefined });
  const { data: statement } = useEmployeeMovements(selectedEmp, month || undefined);
  const settleMut         = useSettleEmployeeBalance();
  const exportStatementMut= useExportEmployeeStatement();
  const exportPayrollMut  = useExportPayroll();

  const employees: ApiEmployee[] = employeesPage?.data ?? [];
  const selectedRow = selectedEmp ? employees.find(e=>e.id===selectedEmp) : null;

  // Header KPIs derived from the list contract (salary + standing balances).
  const totalSalariesH = employees.reduce((s,e)=>s+(e.monthlySalary ?? 0),0);
  const owedToCompanyH = employees.reduce((s,e)=>s+(e.balanceHalalas<0?-e.balanceHalalas:0),0);
  const owedToEmpH     = employees.reduce((s,e)=>s+(e.balanceHalalas>0? e.balanceHalalas:0),0);
  const activeCount    = employees.filter(e=>e.status==="active").length;

  const doSettle = () => {
    if(!selectedEmp) return;
    settleMut.mutate({ employeeId: selectedEmp });
  };
  const SAR = t("ر.س","SAR");

  const balColor = (h:number) => h<0 ? "text-red-600" : h>0 ? "text-emerald-600" : "text-gray-400";

  return (
    <div className="space-y-5" dir={dir}>
      {showAdd && selectedRow && (
        <EmpAddMovementModal employeeId={selectedRow.id} employeeName={selectedRow.name} onClose={()=>setShowAdd(false)}/>
      )}
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("كشف حساب الموظفين","Employee Accounts")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("الرواتب والحركات المالية للموظفين","Salaries and financial movements")}</p></div>
        <button onClick={()=>exportPayrollMut.mutate(new Date().toISOString().slice(0,7))} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><Download size={12}/> {t("كشف الرواتب Excel","Payroll Excel")}</button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("إجمالي الرواتب","Total Salaries")}      value={fmtH(totalSalariesH)} sub={t("ر.س شهرياً","SAR / month")} icon={<Users size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("مستحق على الموظفين","Owed to company")} value={fmtH(owedToCompanyH)} sub={SAR} icon={<AlertTriangle size={18} className="text-red-500"/>} accent="red"/>
        <KpiCard label={t("مستحق للموظفين","Owed to employees")}   value={fmtH(owedToEmpH)}     sub={SAR} icon={<Wallet size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("موظفون نشطون","Active Employees")}       value={String(activeCount)}  sub={`${t("من","of")} ${employees.length}`} icon={<CheckCircle2 size={18} className="text-emerald-600"/>} accent="emerald"/>
      </div>
      {/* فلاتر */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("بحث — اسم الموظف","Search — name")}</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2"><Search size={13} className="text-gray-400"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder={t("اسم الموظف...","Employee name...")} className="flex-1 text-sm outline-none"/></div>
          </div>
          <div><label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الفرع","Branch")}</label>
            <select value={branchFilter} onChange={e=>setBranchFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">{t("كل الفروع","All branches")}</option>
              {[...new Map(employees.map(e=>[e.branchId,e.branchName])).entries()].map(([id,name])=><option key={id} value={id}>{name}</option>)}
            </select>
          </div>
        </div>
      </div>
      {/* Two-panel layout */}
      <div className="grid grid-cols-5 gap-4 items-start">
        {/* Left: Employee list */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <p className="font-bold text-gray-900 text-sm">{t("قائمة الموظفين","Employees")} ({employees.length})</p>
          </div>
          {employees.length===0 && <p className="text-center text-gray-400 text-sm py-8">{t("لا يوجد موظفون","No employees")}</p>}
          {employees.map(e=>(
            <div key={e.id}
              onClick={()=>{ setSelectedEmp(selectedEmp===e.id?null:e.id); setMonth(""); }}
              className={`flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 cursor-pointer transition-all ${selectedEmp===e.id?"bg-purple-50 border-r-4 border-r-purple-500":"hover:bg-gray-50/70"} ${e.status!=="active"?"opacity-60":""}`}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{e.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-gray-800 text-sm truncate">{e.name}</p>
                  {e.status!=="active" && <Badge className="bg-red-50 text-red-700 border border-red-200 text-[9px]">{t("موقوف","inactive")}</Badge>}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{e.role} · {e.branchName}</p>
              </div>
              <div className="text-left flex-shrink-0">
                <p className={`font-mono font-bold text-xs ${balColor(e.balanceHalalas)}`}>{fmtH(e.balanceHalalas)}</p>
                <p className="text-[9px] text-gray-400">{e.balanceCaption?.labelAr ?? t("الرصيد","balance")}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Right: Employee statement */}
        <div className="col-span-3">
          {!selectedRow ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 h-64 flex flex-col items-center justify-center gap-2">
              <Users size={32} className="text-gray-300"/>
              <p className="text-gray-400 text-sm">{t("اختر موظفاً من القائمة لعرض كشف حسابه","Pick an employee to view their statement")}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-l from-purple-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold">{selectedRow.name[0]}</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{selectedRow.name}</p>
                    <p className="text-xs text-gray-500">{selectedRow.role} · {selectedRow.branchName} · {selectedRow.empNumber}</p>
                    <Badge className={`text-[10px] mt-1 ${(statement?.balanceCaption ?? selectedRow.balanceCaption)?.key==="creditor"?"bg-emerald-50 text-emerald-700 border border-emerald-200":(statement?.balanceHalalas ?? selectedRow.balanceHalalas)<0?"bg-red-50 text-red-700 border border-red-200":"bg-gray-50 text-gray-500 border border-gray-200"}`}>{(statement?.balanceCaption ?? selectedRow.balanceCaption)?.labelAr}</Badge>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={()=>setShowAdd(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold hover:bg-purple-100"><Plus size={10}/> {t("إضافة حركة","Add")}</button>
                    <button onClick={doSettle} disabled={settleMut.isPending||(statement?.balanceHalalas ?? selectedRow.balanceHalalas)===0} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 disabled:opacity-40"><Check size={10}/> {t("تسوية الرصيد","Settle")}</button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-blue-600 font-semibold">{t("الراتب","Salary")}</p>
                    <p className="font-mono font-bold text-blue-800 text-xs">{fmtH(selectedRow.monthlySalary)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-emerald-600 font-semibold">{t("إجمالي دائن","Total credit")}</p>
                    <p className="font-mono font-bold text-emerald-800 text-xs">{fmtH(statement?.totalCredit ?? 0)}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-red-600 font-semibold">{t("إجمالي مدين","Total debit")}</p>
                    <p className="font-mono font-bold text-red-800 text-xs">{fmtH(statement?.totalDebit ?? 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center border-2 border-gray-200">
                    <p className="text-[10px] text-gray-600 font-semibold">{t("الرصيد","Balance")}</p>
                    <p className={`font-mono font-black text-sm ${balColor(statement?.balanceHalalas ?? selectedRow.balanceHalalas)}`}>{fmtH(statement?.balanceHalalas ?? selectedRow.balanceHalalas)}</p>
                  </div>
                </div>
                {hasEmployeeDebitWarning(statement) && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle size={13} className="text-amber-600 flex-shrink-0"/>
                    <p className="text-[11px] text-amber-800 font-semibold">{t("رصيد مدين مسجل في كشف الحساب للتسوية وفق سياسة المنشأة","Debit balance recorded on employee statement for settlement per company policy")}</p>
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
                <p className="font-bold text-gray-700 text-xs">{t("سجل الحركات المالية","Financial movements")}</p>
                <div className="flex items-center gap-2">
                  <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"/>
                  {month && <button onClick={()=>setMonth("")} className="text-[10px] text-purple-600 hover:underline">{t("كل الفترات","All")}</button>}
                  <button onClick={()=>selectedEmp&&exportStatementMut.mutate({ employeeId:selectedEmp, month:month||undefined })} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold hover:bg-emerald-100"><FileText size={10}/> Excel</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-600">{t("التاريخ","Date")}</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-600">{t("البيان","Description")}</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-600">{t("المرجع","Ref")}</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-600">{t("دائن","Credit")}</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-600">{t("مدين","Debit")}</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-600">{t("الرصيد","Balance")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(statement?.movements ?? []).length===0 && (
                      <tr><td colSpan={6} className="text-center text-gray-400 py-6">{t("لا توجد حركات في هذه الفترة","No movements in this period")}</td></tr>
                    )}
                    {(statement?.movements ?? []).map(m=>(
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{new Date(m.movementDate).toLocaleDateString("ar-SA")}</td>
                        <td className="px-3 py-3 font-medium text-gray-800">{m.description}<span className="block text-[9px] text-gray-400">{m.categoryLabelAr}</span></td>
                        <td className="px-3 py-3 text-center font-mono text-gray-400 text-[10px]">{m.ref}</td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-emerald-600">{m.movementType==="credit"?fmtH(m.amountHalalas):"—"}</td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-red-600">{m.movementType==="debit"?fmtH(m.amountHalalas):"—"}</td>
                        <td className={`px-3 py-3 text-center font-mono font-bold ${balColor(m.runningBalanceHalalas)}`}>{fmtH(m.runningBalanceHalalas)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={2} className="px-3 py-2.5 font-bold text-gray-700">{month?t("رصيد أول المدة","Opening"):t("الرصيد الحالي","Current balance")}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-gray-500">{month?fmtH(statement?.openingBalanceHalalas ?? 0):""}</td>
                      <td colSpan={2} className="px-3 py-2.5 font-bold text-gray-700 text-left">{t("رصيد آخر المدة","Closing")}</td>
                      <td className={`px-3 py-2.5 text-center font-mono font-black ${balColor(statement?.closingBalanceHalalas ?? 0)}`}>{fmtH(statement?.closingBalanceHalalas ?? 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ACCOUNTANT — CASH CUSTODY
// ═══════════════════════════════════════════════════
// «تعزيز / صرف» modal (T09 §B3) — POST /company/me/cash-custody/{id}/transactions.
function CashTxnModal({ custodyId, custodianName, remainingHalalas, onClose }:{
  custodyId:string; custodianName:string; remainingHalalas:number; onClose:()=>void;
}) {
  const { t, dir } = useCLang();
  const createMut = useCreateCashTransaction();
  const [txnType, setTxnType] = useState<"credit"|"debit">("credit");
  const [amount,  setAmount]  = useState("");
  const [description, setDesc]= useState("");
  const [fromTreasury, setFromTreasury] = useState(true);

  const amountH = Math.round((parseFloat(amount)||0)*100);
  const overdraw = txnType==="debit" && amountH>remainingHalalas;
  const submit = () => {
    if(amountH<1 || overdraw) return;
    createMut.mutate({ custodyId, payload:{
      txnType, amount:amountH,
      description: description.trim() || undefined,
      source: txnType==="credit" && fromTreasury ? "treasury" : "manual",
    } }, { onSuccess:()=>onClose() });
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">{t("حركة عهدة","Custody transaction")} — {custodianName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={()=>setTxnType("credit")} className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${txnType==="credit"?"bg-emerald-50 border-emerald-300 text-emerald-700":"border-gray-200 text-gray-500"}`}>⬆ {t("تعزيز عهدة","Replenish")}</button>
            <button onClick={()=>setTxnType("debit")} className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${txnType==="debit"?"bg-red-50 border-red-300 text-red-700":"border-gray-200 text-gray-500"}`}>⬇ {t("صرف","Disburse")}</button>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("المبلغ (ر.س)","Amount")}</label>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-purple-400"/>
            {overdraw && <p className="text-[10px] text-red-600 mt-1">{t("المبلغ يتجاوز المتبقي","Amount exceeds remaining")} ({fmtH(remainingHalalas)} {t("ر.س","SAR")})</p>}
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("البيان (اختياري)","Description (optional)")}</label>
            <input value={description} onChange={e=>setDesc(e.target.value)} placeholder={txnType==="credit"?t("تعزيز عهدة من الخزينة","Replenish from treasury"):t("بيان الصرف...","Disbursement...")} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"/>
          </div>
          {txnType==="credit" && (
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={fromTreasury} onChange={e=>setFromTreasury(e.target.checked)}/>
              {t("تعزيز من الخزينة","From treasury")}
            </label>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50">{t("إلغاء","Cancel")}</button>
            <Btn variant="primary" onClick={submit} disabled={amountH<1||overdraw||createMut.isPending}><Check size={11}/> {t("تسجيل","Submit")}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// One expandable custody row + its monthly ledger, approve/reject + settle (T09 §B2/B4/B5).
function CashCustodyCard({ custody }:{ custody:CashCustodyRow }) {
  const { t } = useCLang();
  const [open, setOpen]   = useState(false);
  const [month, setMonth] = useState("");
  const [showTxn, setShowTxn] = useState(false);
  const { data: ledger } = useCashTransactions(open ? custody.id : null, month || undefined);
  const approveMut = useApproveCashTxn();
  const rejectMut  = useRejectCashTxn();
  const reqMut     = useRequestCashSettlement();
  const settleMut  = useSettleCash();
  const exportLedgerMut = useExportCashLedger();

  const isLow  = custody.status!=="normal";
  const pct    = Math.round(custody.usagePct ?? 0);
  const statusCls = custody.status==="critical" ? "bg-red-100 text-red-700 border-red-200"
                  : custody.status==="low"      ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200";
  const doReject = (txnId:string) => {
    const reason = window.prompt(t("سبب الرفض؟","Rejection reason?")) ?? "";
    if(reason.trim()) rejectMut.mutate({ custodyId:custody.id, txnId, reason:reason.trim() });
  };
  return (
    <div className="border-b border-gray-100 last:border-0">
      {showTxn && <CashTxnModal custodyId={custody.id} custodianName={custody.custodianName} remainingHalalas={custody.remainingHalalas} onClose={()=>setShowTxn(false)}/>}
      <div className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 ${open?"bg-orange-50/20":""} ${isLow?"border-r-4 border-r-red-400":""}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{custody.branchName}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">{custody.custodianName}</span>
            <Badge className={`${statusCls} border text-[10px] font-bold`}>{custody.statusLabelAr}</Badge>
            {custody.daysSinceSettlement>=30 && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">{custody.daysSinceSettlement} {t("يوم منذ التسوية","d since settle")}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-32">
              <div className={`h-1.5 rounded-full ${pct>85?"bg-red-400":"bg-orange-400"}`} style={{width:`${Math.min(pct,100)}%`}}/>
            </div>
            <span className="text-xs text-gray-400">{pct}% {t("مُصرَف","used")}</span>
            <span className={`text-xs font-bold font-mono ${isLow?"text-red-600":"text-emerald-600"}`}>{fmtH(custody.remainingHalalas)} {t("ر.س متبقٍ","SAR left")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setShowTxn(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold hover:bg-purple-100"><Plus size={10}/> {t("حركة","Txn")}</button>
          <Btn size="sm" onClick={()=>setOpen(!open)}>{open?<ChevronUp size={12}/>:<ChevronDown size={12}/>} {t("المعاملات","Ledger")}</Btn>
        </div>
      </div>
      {open && (
        <div className="px-5 pb-4 bg-gray-50/30">
          <div className="flex items-center justify-between mb-2 pt-2 gap-2 flex-wrap">
            <p className="text-[11px] font-bold text-gray-500">{t("سجل معاملات العهدة","Custody ledger")} — {custody.custodianName}</p>
            <div className="flex items-center gap-2">
              <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"/>
              <button onClick={()=>exportLedgerMut.mutate({ custodyId:custody.id, month:month||undefined })} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold hover:bg-emerald-100"><FileText size={10}/> Excel</button>
              {custody.daysSinceSettlement>=30 && <button onClick={()=>reqMut.mutate({ custodyId:custody.id })} disabled={reqMut.isPending} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold hover:bg-amber-100"><Clock size={10}/> {t("طلب تسوية","Request settle")}</button>}
              <button onClick={()=>settleMut.mutate({ custodyId:custody.id })} disabled={settleMut.isPending} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold hover:bg-blue-100"><Check size={10}/> {t("تسوية العهدة","Settle")}</button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">{t("التاريخ","Date")}</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">{t("البيان","Description")}</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("النوع","Type")}</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("المبلغ","Amount")}</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("الرصيد","Balance")}</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">{t("الحالة","Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(ledger?.transactions ?? []).length===0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-6">{t("لا توجد معاملات","No transactions")}</td></tr>
                )}
                {(ledger?.transactions ?? []).map(tx=>(
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(tx.txnDate).toLocaleDateString("ar-SA")}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{tx.description}</td>
                    <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.txnType==="credit"?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>{tx.typeLabelAr}</span></td>
                    <td className={`px-3 py-2 text-center font-mono font-bold ${tx.txnType==="credit"?"text-emerald-600":"text-red-600"}`}>{tx.txnType==="credit"?"+":"-"}{fmtH(tx.amountHalalas)}</td>
                    <td className="px-3 py-2 text-center font-mono text-gray-600">{fmtH(tx.runningBalanceHalalas)}</td>
                    <td className="px-3 py-2 text-center">
                      {tx.status==="pending" ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={()=>approveMut.mutate({ custodyId:custody.id, txnId:tx.id })} disabled={approveMut.isPending} className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title={t("اعتماد","Approve")}><Check size={12}/></button>
                          <button onClick={()=>doReject(tx.id)} disabled={rejectMut.isPending} className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100" title={t("رفض","Reject")}><X size={12}/></button>
                        </div>
                      ) : (
                        <Badge className={tx.status==="approved"?"bg-emerald-50 text-emerald-700 text-[10px]":"bg-red-50 text-red-700 text-[10px]"}>{tx.status==="approved"?t("معتمد","approved"):t("مرفوض","rejected")}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="px-3 py-2 font-bold text-gray-700">{t("الرصيد الحالي","Current balance")}</td>
                  <td className={`px-3 py-2 text-center font-black font-mono ${isLow?"text-red-600":"text-emerald-700"}`}>{fmtH(ledger?.custody.currentBalanceHalalas ?? custody.remainingHalalas)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AccCompanyCash() {
  const { t, dir } = useCLang();
  const [searchTerm,   setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: custodyPage } = useCashCustody({ q: searchTerm || undefined });
  const exportCashMut = useExportCash();

  const custodies = custodyPage?.data ?? [];
  const kpis = custodyPage?.meta.kpis;

  const filtered = custodies.filter(c=>{
    if(statusFilter==="قريبة من النفاد" && c.status==="normal") return false;
    if(statusFilter==="حرجة" && c.status!=="critical") return false;
    return true;
  });
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("إدارة العهد النقدية","Petty Cash Management")}</h2><p className="text-gray-400 text-sm mt-0.5">{t("متابعة صناديق النقد للفروع","Track petty cash for branches")}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t("عدد العهود النشطة","Active Custodies")}    value={String(kpis?.activeCustodies ?? custodies.length)} sub={t("فروع لديها عهدة","branches with custody")} icon={<ArrowLeftRight size={18} className="text-orange-600"/>} accent="orange"/>
        <KpiCard label={t("طلبات صرف معلقة","Pending Requests")}     value={String(kpis?.pendingRequests ?? 0)} sub={t("بانتظار المراجعة","awaiting review")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("عهود قريبة من النفاد","Near Depletion")}   value={String(kpis?.nearDepletion ?? 0)}   sub={t("أقل من 500 ر.س متبقٍ","less than 500 SAR")} icon={<AlertTriangle size={18} className="text-red-600"/>} accent="red"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("بحث — الفرع أو المسؤول","Search — branch/custodian")}</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400"/>
              <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder={t("اسم الفرع أو أمين الصندوق...","Branch or custodian...")} className="flex-1 text-sm outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">{t("حالة العهدة","Status")}</label>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل","قريبة من النفاد","حرجة"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {(searchTerm||statusFilter) && <button onClick={()=>{setSearchTerm("");setStatusFilter("");}} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RotateCcw size={11}/> {t("مسح الفلاتر","Clear")}</button>}
          <button onClick={()=>exportCashMut.mutate({})} className="mr-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"><FileText size={11}/> {t("ملخص العهد Excel","Custody Excel")}</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50/60 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">{t("كشف العهد النقدية — اضغط على فرع لعرض سجل المعاملات","Custody list — click a branch for its ledger")}</p>
        </div>
        {filtered.length===0 && <p className="text-center text-gray-400 text-sm py-8">{t("لا توجد عهد","No custodies")}</p>}
        {filtered.map(c=><CashCustodyCard key={c.id} custody={c}/>)}
      </div>
    </div>
  );
}

// ACCOUNTANT — REPORTS
// ═══════════════════════════════════════════════════
// T15.3/T15.8 — custom report builder: pick dimensions/metrics → preview → save,
// plus list + replay saved definitions. All hooks live in reportBuilder.ts.
function CAReportBuilder() {
  const { t } = useCLang();
  const { data: fields } = useReportBuilderFields();
  const previewMut = usePreviewBuilderReport();
  const saveMut = useSaveBuilderReport();
  const runMut = useRunSavedBuilderReport();
  const { data: saved = [] } = useSavedBuilderReports();
  const [open, setOpen] = useState(false);
  const [dims, setDims] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const toggle = (arr:string[], set:(v:string[])=>void, k:string) => set(arr.includes(k) ? arr.filter(x=>x!==k) : [...arr, k]);
  const definition = { dimensions: dims, metrics };
  const runPreview = () => previewMut.mutate(definition, { onSuccess: (d)=>setPreview(d) });
  const save = () => { if(!name.trim()) return; saveMut.mutate({ name: name.trim(), definition }, { onSuccess: ()=>setName("") }); };
  // Columns follow the actual result keys (handles run-saved whose def differs from the current picks).
  const cols = (preview?.rows?.[0] ? Object.keys(preview.rows[0]) : [...dims, ...metrics]);
  if (!open) return (
    <button onClick={()=>setOpen(true)} className="w-full py-2.5 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 font-semibold text-sm hover:bg-purple-50 flex items-center justify-center gap-2"><BarChart3 size={14}/> {t("منشئ التقارير المخصّصة","Custom Report Builder")}</button>
  );
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between"><h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><BarChart3 size={14} className="text-purple-600"/> {t("منشئ التقارير المخصّصة","Custom Report Builder")}</h3><button onClick={()=>setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5">{t("الأبعاد","Dimensions")}</p>
          <div className="flex flex-wrap gap-1.5">
            {(fields?.dimensions ?? []).map(d=>(
              <button key={d.key} onClick={()=>toggle(dims,setDims,d.key)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${dims.includes(d.key)?"bg-purple-600 text-white border-purple-600":"bg-white text-gray-600 border-gray-200"}`}>{d.labelAr||d.labelEn||d.key}</button>
            ))}
            {(fields?.dimensions ?? []).length===0 && <span className="text-[11px] text-gray-400">{t("لا أبعاد متاحة","No dimensions")}</span>}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5">{t("المقاييس","Metrics")}</p>
          <div className="flex flex-wrap gap-1.5">
            {(fields?.metrics ?? []).map(m=>(
              <button key={m.key} onClick={()=>toggle(metrics,setMetrics,m.key)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${metrics.includes(m.key)?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200"}`}>{m.labelAr||m.labelEn||m.key}</button>
            ))}
            {(fields?.metrics ?? []).length===0 && <span className="text-[11px] text-gray-400">{t("لا مقاييس متاحة","No metrics")}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Btn size="sm" variant="primary" onClick={runPreview} disabled={previewMut.isPending||dims.length+metrics.length===0}><Eye size={12}/> {t("معاينة","Preview")}</Btn>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder={t("اسم التقرير للحفظ","Report name to save")} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-purple-300"/>
        <Btn size="sm" onClick={save} disabled={!name.trim()||dims.length+metrics.length===0||saveMut.isPending}><Check size={12}/> {t("حفظ","Save")}</Btn>
      </div>
      {preview && (
        <div className="border border-gray-100 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs" dir="rtl">
            <thead className="bg-gray-50"><tr>{cols.map(c=><th key={c} className="px-3 py-2 text-right text-gray-500 font-semibold">{c}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {(preview.rows ?? []).slice(0,20).map((row:any,i:number)=>(
                <tr key={i}>{cols.map(c=><td key={c} className="px-3 py-1.5 text-gray-700">{String(row[c] ?? "—")}</td>)}</tr>
              ))}
              {(preview.rows ?? []).length===0 && <tr><td colSpan={Math.max(1,cols.length)} className="px-3 py-4 text-center text-gray-400">{t("لا توجد نتائج","No results")}</td></tr>}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-gray-50/60 text-[11px] text-gray-500 flex justify-between"><span>{preview.rowCount ?? (preview.rows?.length ?? 0)} {t("صف","rows")}{preview.capped?` · ${t("مقتطعة","capped")}`:""}</span></div>
        </div>
      )}
      {(saved as any[]).length>0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5">{t("تقارير محفوظة","Saved Reports")}</p>
          <div className="space-y-1.5">
            {(saved as any[]).map((s:any)=>(
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 bg-gray-50/40">
                <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-700 truncate">{s.name}</p>{s.descriptionAr&&<p className="text-[10px] text-gray-400 truncate">{s.descriptionAr}</p>}</div>
                <Btn size="sm" onClick={()=>runMut.mutate(s.id, { onSuccess:(d)=>setPreview(d) })} disabled={runMut.isPending}><RefreshCw size={11}/> {t("تشغيل","Run")}</Btn>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AccCompanyReports() {
  const { t, dir } = useCLang();
  const { data: serverReports = [] } = useReports();
  const downloadReportMut = useDownloadReport();
  const fallbackReports = [
    { title:t("تقرير P&L الشهري","Monthly P&L Report"),           date:"أكتوبر 2025", type:t("مالي","Financial"),    size:"2.4 MB", key:"pl-monthly" },
    { title:t("ملخص المبيعات اليومية","Daily Sales Summary"),      date:"14 أكت 2025", type:t("مبيعات","Sales"),      size:"1.1 MB", key:"sales-daily" },
    { title:t("تقرير المصروفات","Expenses Report"),                date:"14 أكت 2025", type:t("مصروفات","Expenses"),  size:"0.9 MB", key:"expenses" },
    { title:t("تقرير المخزون","Inventory Report"),                 date:"13 أكت 2025", type:t("مخزون","Inventory"),   size:"1.7 MB", key:"inventory" },
    { title:t("كشف الرواتب الشهري","Monthly Payroll Statement"),  date:"30 سبت 2025", type:t("موظفون","Employees"),  size:"0.5 MB", key:"payroll" },
  ];
  const reports = serverReports.map(r => ({ title: r.title, date: "", type: r.category, size: "—", key: r.key }));
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("التقارير","Reports")}</h2><p className="text-gray-400 text-sm">{t("تقارير مجموعة التاج","Al-Taj Group reports")}</p></div>
      <div className="grid grid-cols-2 gap-4">
        {reports.map((r,i)=>(
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-purple-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0"><FileText size={18} className="text-purple-600"/></div>
            <div className="flex-1 min-w-0"><p className="font-semibold text-gray-800 text-sm">{r.title}</p><p className="text-[10px] text-gray-400 mt-0.5">{r.date} · {r.type} · {r.size}</p></div>
            <button onClick={()=>downloadReportMut.mutate({ key: (r as { key?: string }).key || r.title, format: "pdf" })} className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors flex-shrink-0"><Download size={13}/></button>
          </div>
        ))}
      </div>
      <CAReportBuilder/>
    </div>
  );
}

// ACCOUNTANT ROOT (with shared state)
// ═══════════════════════════════════════════════════
type SharedOpsProps = {
  ops:COp[];
  shiftReviewPage:number;
  setShiftReviewPage:(page:number)=>void;
  actionsPending:boolean;
  approve:(id:string)=>void;
  reject:(id:string)=>void;
  requestClarification?:(id:string)=>void;
  bulkApprove:(ids:string[])=>void;
  finalApprove:(id:string)=>void;
  bulkFinalApprove:(ids:string[])=>void;
};

function AccountantRoot({ page, navigate, ops, approve, reject, requestClarification, bulkApprove, shiftReviewPage, setShiftReviewPage }:{ page:string; navigate:(p:string)=>void } & SharedOpsProps) {
  if(page==="acc-dashboard")  return <AccDashboard navigate={navigate} ops={ops}/>;
  if(page==="acc-sales")      return <AccCompanySales ops={ops} approve={approve} reject={reject} requestClarification={requestClarification} bulkApprove={bulkApprove}/>;
  if(page==="acc-expenses")   return <AccCompanyExpenses ops={ops} approve={approve} reject={reject} bulkApprove={bulkApprove}/>;
  if(page==="acc-purchases")  return <AccCompanyPurchases ops={ops} approve={approve} reject={reject} bulkApprove={bulkApprove} requestClarification={requestClarification}/>;
  if(page==="acc-inventory")  return <AccCompanyInventory navigate={navigate} ops={ops} approve={approve} reject={reject}/>;
  if(page==="acc-waste")      return <AccCompanyWaste/>;
  if(page==="acc-assets")     return <AccCompanyAssets/>;
  if(page==="acc-shifts")     return <AccCompanyShifts approve={approve} reject={reject} requestClarification={requestClarification} page={shiftReviewPage} setPage={setShiftReviewPage}/>;
  if(page==="acc-employees")  return <AccCompanyEmployees/>;
  if(page==="acc-cash")       return <AccCompanyCash/>;
  if(page==="acc-reminders")  return <AccCompanyReminders/>;
  if(page==="acc-reports")    return <AccCompanyReports/>;
  return <AccDashboard navigate={navigate} ops={ops}/>;
}

// ═══════════════════════════════════════════════════
// BRANCH MANAGER PAGES
// ═══════════════════════════════════════════════════
const MY_BRANCH = { name:"فرع العليا", brand:"برغر التاج", city:"الرياض", target:130000, salesM:128000, expM:41000 };

function BranchOverview() {
  const { t, dir } = useCLang();
  const { data: apiOverview } = useBranchOverview();
  const { data: apiEmployees = [] } = useBranchEmployees();
  const SAR = t("ر.س","SAR");
  const apiKpis = (apiOverview?.kpis ?? {}) as Record<string, number | undefined>;
  const apiBranch = apiOverview?.branch;
  const hero = apiOverview?.hero;
  // T12 §1 — hero band (halalas), falling back to legacy branch.monthly* fields.
  const apiTarget = Math.round(((hero?.targetHalalas ?? apiBranch?.monthlyTargetHalalas ?? 0)) / 100);
  const apiSalesM = Math.round(((apiKpis.monthSales ?? apiBranch?.monthlySalesHalalas ?? 0)) / 100);
  const apiExpM   = Math.round(((apiKpis.monthExpenses ?? apiBranch?.monthlyExpensesHalalas ?? 0)) / 100);
  const netProfit = Math.round(((apiKpis.netProfit ?? ((apiKpis.monthSales ?? 0) - (apiKpis.monthExpenses ?? 0))) ) / 100);
  const todaySales = Math.round(((apiKpis.todaySales ?? (apiKpis.todaySalesHalalas as number | undefined) ?? 0)) / 100);
  const branchName  = apiBranch?.name      || "";
  const branchBrand = apiBranch?.brandName || "";
  const branchCity  = apiBranch?.city      || "";
  const pct = hero?.achievementPct ?? (apiTarget > 0 ? Math.round((apiSalesM/apiTarget)*100) : 0);
  // T12 §1 — tasksOfDay (completed/pending/later) + crew from the overview payload;
  // fall back to legacy todayUploads.missing / the employees list.
  const stateCfg: Record<string,string> = { completed:"done", pending:"pending", later:"later" };
  const tasks: [string,string,string][] = apiOverview?.tasksOfDay?.length
    ? apiOverview.tasksOfDay.map(tk => [tk.label, tk.stateLabel ?? tk.state, stateCfg[tk.state] ?? "pending"])
    : (apiOverview?.todayUploads?.missing ?? []).map((m: string) => [m, t("معلق","Pending"), "pending"]);
  const crew: [string,string,string,string][] = apiOverview?.crew?.length
    ? apiOverview.crew.slice(0,6).map(c => [c.name, c.role || "—", c.shift || "", c.attendanceLabel ?? t("حاضر","Present")])
    : (apiEmployees as any[]).slice(0,4).map((e: any) => [e.name, e.role || "—", "", (e.status==="active"||e.active) ? t("نشط","Active") : t("غائب","Absent")]);
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{branchName ? `${t("لوحة الفرع","Branch Dashboard")} — ${branchName}` : t("لوحة الفرع","Branch Dashboard")}</h2><p className="text-gray-400 text-sm">{branchBrand}{branchCity ? ` · ${branchCity}` : ""}</p></div>
      <div className="bg-gradient-to-l from-emerald-600 to-teal-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3"><div><p className="font-black text-xl">{t("إنجاز الشهر","Monthly Achievement")}</p><p className="text-white/70 text-sm mt-0.5">{t("الهدف:","Target:")} {fmt(apiTarget)} {SAR}</p></div><div className={dir==="rtl"?"text-left":"text-right"}><p className="text-3xl font-black">{pct}%</p><p className="text-white/60 text-xs">{t("من الهدف","of target")}</p></div></div>
        <div className="w-full h-3 bg-white/20 rounded-full"><div className="h-3 bg-white rounded-full" style={{width:`${Math.min(100,pct)}%`}}/></div>
        <div className="flex justify-between mt-2 text-xs text-white/60"><span>0</span><span>{fmt(apiTarget)}</span></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t("مبيعات اليوم","Today's Sales")}   value={fmt(todaySales)} sub={SAR} icon={<TrendingUp size={18} className="text-emerald-600"/>} accent="emerald" delta={apiKpis.todaySalesTrendPct != null ? `${apiKpis.todaySalesTrendPct > 0 ? "+" : ""}${apiKpis.todaySalesTrendPct}%` : undefined}/>
        <KpiCard label={t("مبيعات الشهر","Monthly Sales")}   value={`${fmt(Math.round(apiSalesM/1000))}K`} sub={SAR} icon={<BarChart3 size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("مصروفات الشهر","Monthly Expenses")} value={`${fmt(Math.round(apiExpM/1000))}K`} sub={SAR} icon={<Wallet size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("صافي الربح","Net Profit")}         value={`${fmt(Math.round(netProfit/1000))}K`} sub={SAR} icon={<CheckCircle2 size={18} className="text-purple-600"/>} accent="purple"/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3">📋 {t("مهام اليوم","Today's Tasks")}</h3>
          <div className="space-y-2">
            {tasks.map(([task,status,c])=>(
              <div key={task} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 ${c==="done"?"bg-emerald-500":"bg-gray-200"}`}>{c==="done"&&<Check size={9} className="text-white"/>}</div>
                <p className={`text-sm flex-1 ${c==="done"?"line-through text-gray-400":"text-gray-700"}`}>{task}</p>
                <Badge className={`text-[10px] ${c==="done"?"bg-emerald-50 text-emerald-700":c==="pending"?"bg-amber-50 text-amber-700":"bg-gray-100 text-gray-500"}`}>{status}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-3">👥 {t("طاقم اليوم","Today's Crew")}</h3>
          <div className="space-y-2">
            {crew.map(([n,r,s,st])=>(
              <div key={n} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{n[0]}</div>
                <div className="flex-1"><p className="text-sm font-semibold text-gray-700">{n}</p><p className="text-[10px] text-gray-400">{r}{s?` · ${s}`:""}</p></div>
                <Badge className={`text-[10px] ${st===t("غائب","Absent")?"bg-gray-100 text-gray-500":"bg-emerald-50 text-emerald-700"}`}>{st}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BranchUpload() {
  const { t, dir } = useCLang();
  const uploadMut = useBranchUpload();
  const SAR = t("ر.س","SAR");
  const [salesAmt,setSalesAmt]=useState("");
  const [expAmt,setExpAmt]=useState("");
  const [shift,setShift]=useState("morning");
  const [expenseNote,setExpenseNote]=useState("");
  const [salesFile, setSalesFile]=useState<File|null>(null);
  const [invFile, setInvFile]=useState<File|null>(null);
  const [submitted,setSubmitted]=useState(false);
  const salesFileRef = useRef<HTMLInputElement|null>(null);
  const invFileRef = useRef<HTMLInputElement|null>(null);

  const submit=()=>{
    if (salesFile && invFile) {
      alert(t("يرجى اختيار مرفق واحد فقط (تقرير المبيعات أو فاتورة المصروفات) لكل عملية رفع لمنع فقدان المرفق الآخر", "Please select only one attachment (sales report or expense invoice) per upload to prevent losing the other file"));
      return;
    }
    const s = parseFloat(salesAmt);
    if (!salesAmt.trim() || isNaN(s) || s <= 0) {
      alert(t("أدخل قيمة مبيعات صحيحة أكبر من صفر","Enter a valid sales amount greater than zero"));
      return;
    }
    const exp = expAmt.trim() ? parseFloat(expAmt) : undefined;
    if (exp !== undefined && (isNaN(exp) || exp < 0)) {
      alert(t("قيمة المصروفات يجب ألا تكون سالبة","Expenses amount cannot be negative"));
      return;
    }
    uploadMut.mutate(
      {
        reportType:"sales",
        salesHalalas: Math.round(s*100),
        shift,
        expensesHalalas: exp !== undefined ? Math.round(exp*100) : undefined,
        expenseNote: expenseNote.trim() || undefined,
        file: salesFile || invFile || undefined,
      },
      { onSuccess: ()=>setSubmitted(true) },
    );
  };

  const handleResetUpload = () => {
    setSubmitted(false);
    setSalesAmt("");
    setExpAmt("");
    setShift("morning");
    setExpenseNote("");
    setSalesFile(null);
    setInvFile(null);
  };

  if(submitted) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center" dir={dir}>
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={40} className="text-emerald-600"/></div>
      <h3 className="text-xl font-bold text-gray-800">{t("تم رفع البيانات بنجاح!","Data submitted successfully!")}</h3>
      <p className="text-gray-500 text-sm">{t("سيقوم المحاسب بمراجعة البيانات وإعادة الإبلاغ","The accountant will review and respond")}</p>
      <button onClick={handleResetUpload} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700">{t("رفع جديد","Upload New")}</button>
    </div>
  );
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("الرفع اليومي","Daily Upload")}</h2><p className="text-gray-400 text-sm">{new Date().toLocaleDateString("ar-SA")}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800">💰 {t("المبيعات","Sales")}</h3>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t(`إجمالي المبيعات (${SAR}) *`,`Total Sales (${SAR}) *`)}</label><input type="number" min="0.01" step="0.01" value={salesAmt} onChange={e=>setSalesAmt(e.target.value)} placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400"/></div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("الشفت","Shift")}</label><select value={shift} onChange={e=>setShift(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option value="morning">{t("صباحي","Morning")}</option><option value="evening">{t("مسائي","Evening")}</option><option value="full">{t("كامل اليوم","Full Day")}</option></select></div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">{t("مرفق (صورة / PDF)","Attachment (image / PDF)")}</label>
            <input type="file" ref={salesFileRef} className="hidden" accept="image/*,.pdf" onChange={e=>setSalesFile(e.target.files?.[0]||null)}/>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-purple-300">
              <div onClick={()=>salesFileRef.current?.click()}>
                <Upload size={20} className="text-gray-400 mx-auto mb-1"/>
                <p className="text-xs text-gray-600 font-medium">{salesFile ? salesFile.name : t("اضغط لاختيار مرفق المبيعات","Click to select sales attachment")}</p>
              </div>
              {salesFile && (
                <button type="button" onClick={()=>setSalesFile(null)} className="mt-2 text-[11px] text-red-600 underline font-medium">
                  {t("إزالة مرفق المبيعات","Remove sales attachment")}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800">💸 {t("المصروفات","Expenses")}</h3>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t(`إجمالي المصروفات (${SAR})`,`Total Expenses (${SAR})`)}</label><input type="number" min="0" step="0.01" value={expAmt} onChange={e=>setExpAmt(e.target.value)} placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-red-400"/></div>
          <div><label className="text-xs font-semibold text-gray-600 block mb-1">{t("تفصيل المصروفات","Expense breakdown")}</label><textarea rows={3} value={expenseNote} onChange={e=>setExpenseNote(e.target.value)} placeholder={t("وصف مختصر...","Brief description...")} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none resize-none"/></div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">{t("الفاتورة","Invoice")}</label>
            <input type="file" ref={invFileRef} className="hidden" accept="image/*,.pdf" onChange={e=>setInvFile(e.target.files?.[0]||null)}/>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-red-300">
              <div onClick={()=>invFileRef.current?.click()}>
                <Paperclip size={20} className="text-gray-400 mx-auto mb-1"/>
                <p className="text-xs text-gray-600 font-medium">{invFile ? invFile.name : t("اضغط لاختيار فاتورة المصروفات","Click to select expense invoice")}</p>
              </div>
              {invFile && (
                <button type="button" onClick={()=>setInvFile(null)} className="mt-2 text-[11px] text-red-600 underline font-medium">
                  {t("إزالة فاتورة المصروفات","Remove invoice attachment")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {salesFile && invFile && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center justify-between">
          <span>{t("تنبيه: تم اختيار مرفقين معاً. يرجى إزالة أحدهما حيث يقبل النظام مرفقاً واحداً فقط لكل عملية رفع لمنع فقدان الآخر.", "Warning: Both attachments selected. Please remove one as the system only accepts one attachment per upload to prevent losing the other.")}</span>
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" onClick={()=>setSalesFile(null)} className="underline text-red-800 font-semibold">{t("إلغاء المبيعات","Clear Sales")}</button>
            <button type="button" onClick={()=>setInvFile(null)} className="underline text-red-800 font-semibold">{t("إلغاء الفاتورة","Clear Invoice")}</button>
          </div>
        </div>
      )}
      <button onClick={submit} disabled={uploadMut.isPending || !!(salesFile && invFile)} className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-base hover:bg-purple-700 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"><Send size={16}/>{uploadMut.isPending ? t("جارٍ الإرسال...","Submitting...") : t("رفع البيانات للمحاسب","Submit Data to Accountant")}</button>
    </div>
  );
}

function BranchRequests() {
  const { t, dir } = useCLang();
  const { data: apiRequests = [] } = useBranchPurchaseRequests();
  const createReqMut = useCreateBranchPurchaseRequest();
  // Driven by GET /company/me/branch/purchase-requests. Map both field contracts.
  const requests = apiRequests.map(r => ({
    id: r.publicId || r.id,
    item: (r as any).item || r.itemName || "—",
    qty: r.qty ?? 0,
    unit: r.unit || "",
    status: r.status === "submitted" ? "pending" : (r.status || "pending"),
    date: (r as any).date || r.createdAt || "",
    urgency: (((r as any).urgency || (r as any).priority) === "urgent" ? "urgent" : "normal") as "normal" | "urgent",
  }));
  const [showAdd, setShowAdd] = useState(false);
  const [reqForm, setReqForm] = useState({ itemName: "", qty: "", unit: "كجم", priority: "normal" as "normal" | "urgent" });
  const submitRequest = () => {
    const q = Number(reqForm.qty);
    if (!reqForm.itemName.trim() || isNaN(q) || q <= 0) return;
    createReqMut.mutate(
      { itemName: reqForm.itemName.trim(), qty: q, unit: reqForm.unit, priority: reqForm.priority },
      { onSuccess: () => { setShowAdd(false); setReqForm({ itemName: "", qty: "", unit: "كجم", priority: "normal" }); } },
    );
  };
  const SC: Record<string, string> = { pending: "bg-amber-50 text-amber-700 border-amber-200", approved: "bg-blue-50 text-blue-700 border-blue-200", delivered: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  const SL: Record<string, string> = { pending: t("معلق", "Pending"), approved: t("معتمد", "Approved"), delivered: t("تم التسليم", "Delivered") };
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("طلبات الشراء", "Purchase Requests")}</h2><p className="text-gray-400 text-sm">{requests.filter(r => r.status === "pending").length} {t("طلب معلق", "pending requests")}</p></div><Btn variant="primary" onClick={() => setShowAdd(true)}><Plus size={13} /> {t("طلب جديد", "New Request")}</Btn></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {requests.map(r => (
          <div key={r.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">📦</div>
            <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{r.item}</p><p className="text-xs text-gray-400">{r.qty} {r.unit} · {r.date}</p></div>
            {r.urgency === "urgent" && <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">⚡ {t("عاجل", "Urgent")}</Badge>}
            <Badge className={`text-[10px] border ${SC[r.status]}`}>{SL[r.status]}</Badge>
          </div>
        ))}
      </div>
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAdd(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("طلب شراء جديد", "New Purchase Request")}
          onKeyDown={e => { if (e.key === "Escape") setShowAdd(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{t("طلب شراء جديد", "New Purchase Request")}</h3>
              <button onClick={() => setShowAdd(false)} aria-label={t("إغلاق", "Close")} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="b-req-item" className="text-xs font-semibold text-gray-600 block mb-1">{t("الصنف", "Item")}</label>
                <input id="b-req-item" value={reqForm.itemName} onChange={e => setReqForm(f => ({ ...f, itemName: e.target.value }))} placeholder={t("اسم الصنف", "Item name")} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="b-req-qty" className="text-xs font-semibold text-gray-600 block mb-1">{t("الكمية", "Quantity")}</label>
                  <input id="b-req-qty" type="number" min="0.01" step="any" value={reqForm.qty} onChange={e => setReqForm(f => ({ ...f, qty: e.target.value }))} placeholder="0" dir="ltr" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label htmlFor="b-req-unit" className="text-xs font-semibold text-gray-600 block mb-1">{t("الوحدة", "Unit")}</label>
                  <select id="b-req-unit" value={reqForm.unit} onChange={e => setReqForm(f => ({ ...f, unit: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none">
                    <option value="كجم">{t("كجم", "kg")}</option>
                    <option value="كرتون">{t("كرتون", "carton")}</option>
                    <option value="قطعة">{t("قطعة", "piece")}</option>
                    <option value="لتر">{t("لتر", "liter")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="b-req-prio" className="text-xs font-semibold text-gray-600 block mb-1">{t("الأولوية", "Priority")}</label>
                <select id="b-req-prio" value={reqForm.priority} onChange={e => setReqForm(f => ({ ...f, priority: e.target.value as "normal" | "urgent" }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none">
                  <option value="normal">{t("عادي", "Normal")}</option>
                  <option value="urgent">{t("عاجل", "Urgent")}</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Btn onClick={() => setShowAdd(false)}>{t("إلغاء", "Cancel")}</Btn>
                <Btn variant="primary" onClick={submitRequest} disabled={!reqForm.itemName.trim() || !reqForm.qty || Number(reqForm.qty) <= 0 || createReqMut.isPending}><Send size={13} /> {t("إرسال", "Send")}</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchItems() {
  const { t, dir } = useCLang();
  const { data: apiItems = [] } = useBranchItems();
  const submitCountMut = useBranchSubmitItemsCount();
  const [showInvForm, setShowInvForm] = useState(false);
  const [invCounts, setInvCounts] = useState<Record<string, string>>({});
  const [invSubmitted, setInvSubmitted] = useState(false);
  // Driven by GET /company/me/branch/items — preserve absence vs zero.
  const items = apiItems.map(i => {
    const rawQty = (i as any).expectedQty ?? (i as any).currQty;
    const qty = rawQty != null ? Number(rawQty) : null;
    const min = i.minLevel ?? 0;
    const status = i.stockStatus ?? (min > 0 && qty != null ? (qty <= min ? "critical" : qty <= min * 1.5 ? "low" : "ok") : "ok");
    return { name: i.name, qty, unit: i.unit || "", min, status, id: i.id, statusLabel: i.stockStatusLabel };
  });
  const submitInventory = () => {
    // T12 §4 — counts keyed by inventoryItemId; require at least one valid positive count.
    const counts = Object.entries(invCounts)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)) && Number(v) >= 0)
      .map(([inventoryItemId, v]) => ({ inventoryItemId, actualQty: Number(v) }));
    if (counts.length === 0) {
      alert(t("يرجى إدخال كمية فعلية واحدة على الأقل قبل الإرسال", "Please enter at least one actual count before submitting"));
      return;
    }
    submitCountMut.mutate({ counts }, { onSuccess: () => setInvSubmitted(true) });
  };
  const SC: Record<string, string> = { ok: "bg-emerald-50 text-emerald-700", low: "bg-amber-50 text-amber-700", critical: "bg-red-50 text-red-700" };
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("الجرد اليومي", "Daily Inventory")}</h2><p className="text-gray-400 text-sm">{MY_BRANCH.name} · {new Date().toLocaleDateString("ar-SA")}</p></div><Btn variant="primary" onClick={() => setShowInvForm(true)}><Clipboard size={13} /> {t("تسجيل جرد", "Record Count")}</Btn></div>
      {showInvForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowInvForm(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("تسجيل جرد يومي", "Daily Inventory Count")}
          onKeyDown={e => { if (e.key === "Escape") setShowInvForm(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5" onClick={e => e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{t("تسجيل جرد يومي", "Daily Inventory Count")}</h3>
              <button onClick={() => setShowInvForm(false)} aria-label={t("إغلاق", "Close")} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            {invSubmitted ? (
              <div className="text-center py-6" role="status">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-bold text-gray-800">{t("تم إرسال الجرد للمحاسب", "Inventory sent to accountant")}</p>
                <p className="text-sm text-gray-400 mt-1">{t("سيتم مراجعته خلال 24 ساعة", "Will be reviewed within 24 hours")}</p>
                <Btn onClick={() => { setInvSubmitted(false); setInvCounts({}); setShowInvForm(false); }}>{t("إغلاق", "Close")}</Btn>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                      <p className="text-[11px] text-gray-400">{t("المتوقع:", "Expected:")} {item.qty != null ? item.qty : "—"} {item.unit}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={invCounts[item.id] ?? ""}
                      onChange={e => setInvCounts(p => ({ ...p, [item.id]: e.target.value }))}
                      placeholder={item.qty != null ? String(item.qty) : "0"}
                      aria-label={item.name}
                      className="w-20 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none text-center focus:border-purple-400"
                    />
                    <span className="text-xs text-gray-400 w-8">{item.unit}</span>
                  </div>
                ))}
                <div className="flex gap-2 justify-end pt-2">
                  <Btn onClick={() => setShowInvForm(false)}>{t("إلغاء", "Cancel")}</Btn>
                  <Btn variant="primary" onClick={submitInventory} disabled={submitCountMut.isPending}><Send size={13} /> {t("إرسال الجرد", "Submit Count")}</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label={t("أصناف كافية", "Sufficient")} value={String(items.filter(i => i.status === "ok").length)} sub={t("من إجمالي الأصناف", "of total items")} icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="emerald" />
        <KpiCard label={t("منخفض", "Low")} value={String(items.filter(i => i.status === "low").length)} sub={t("يحتاج طلب شراء", "needs purchase order")} icon={<AlertTriangle size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("حرج", "Critical")} value={String(items.filter(i => i.status === "critical").length)} sub={t("طلب عاجل!", "urgent order!")} icon={<XCircle size={18} className="text-red-500" />} accent="red" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <div className="min-w-[480px]">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-500">
            <span className="col-span-2">{t("الصنف", "Item")}</span><span>{t("الكمية الفعلية", "Actual Qty")}</span><span>{t("الحالة", "Status")}</span>
          </div>
          {items.map(item => (
            <div key={item.name} className="grid grid-cols-4 gap-4 px-5 py-4 border-b border-gray-50 last:border-0 items-center">
              <div className="col-span-2"><p className="font-semibold text-gray-800 text-sm">{item.name}</p><p className="text-xs text-gray-400">{t("الحد الأدنى:", "Min:")} {item.min} {item.unit}</p></div>
              <div className="flex items-center gap-2"><span className="font-mono font-bold text-gray-800">{item.qty != null ? item.qty : "—"}</span><span className="text-gray-400 text-sm">{item.unit}</span></div>
              <Badge className={`text-[10px] ${SC[item.status]}`}>{item.status === "ok" ? `✓ ${t("كافٍ", "OK")}` : item.status === "low" ? `⚠ ${t("منخفض", "Low")}` : `🔴 ${t("حرج", "Critical")}`}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BranchEmployees() {
  const { t, dir } = useCLang();
  const { data: apiStaff = [] } = useBranchEmployees();
  // Staff comes from the platform API; empty until the backend returns it (no static seed).
  // Attendance semantics: Do not infer physical attendance from active account membership.
  // Physical attendance must be an explicit status; otherwise mark as "unknown" ("Not Reported").
  const staff = apiStaff.map(s => {
    const explicitAttendance = (s as any).attendanceStatus || (s as any).attendance || (s as any).attendanceState || (s as any).status;
    const status = (explicitAttendance === "present" || explicitAttendance === "absent" || explicitAttendance === "upcoming")
      ? explicitAttendance
      : "unknown";
    return {
      name: s.name || "—",
      role: s.role || "—",
      shift: (s as any).shiftType || (s as any).shift || "",
      status,
      phone: (s as any).phone || (s as any).contactPhone || "",
    };
  });
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("طاقم الموظفين", "Staff")}</h2><p className="text-gray-400 text-sm">{staff.filter(s => s.status === "present").length} {t("حاضر اليوم", "present today")}</p></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {staff.map(s => (
          <div key={s.name} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold flex-shrink-0">{s.name[0]}</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
              <p className="text-xs text-gray-400">{s.role}{s.shift ? ` · ${t("شفت", "shift")} ${s.shift}` : ""}</p>
            </div>
            <span className="text-xs text-gray-400" dir="ltr">{s.phone}</span>
            <Badge className={`text-[10px] ${
              s.status === "present"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : s.status === "upcoming"
                ? "bg-blue-50 text-blue-700 border border-blue-100"
                : s.status === "absent"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}>
              {s.status === "present"
                ? `● ${t("حاضر", "Present")}`
                : s.status === "upcoming"
                ? t("قادم", "Incoming")
                : s.status === "absent"
                ? t("غائب", "Absent")
                : t("غير مسجل", "Not Reported")}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchShifts() {
  const { t, dir, lang } = useCLang();
  const { data: activeShift, isLoading, isError } = useBranchActiveShift();
  return (
    <div className="space-y-5" dir={dir}>
      <h2 className="text-xl font-bold text-gray-800">{t("شفتات الفرع", "Branch Shifts")}</h2>
      {isLoading ? <p role="status" className="text-sm text-gray-500">{t("جارٍ التحميل…", "Loading…")}</p>
        : isError ? <p role="alert" className="text-sm text-red-700">{t("تعذر تحميل الشفت النشط", "Could not load the active shift")}</p>
        : !activeShift ? <p className="text-sm text-gray-500">{t("لا يوجد شفت نشط حالياً", "No active shift")}</p>
        : <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
            <p className="font-semibold text-gray-800">{t("الشفت النشط", "Active shift")}: <bdi>{activeShift.id || "—"}</bdi></p>
            <p className="text-sm text-gray-600">{t("المشرف", "Supervisor")}: {activeShift.supervisorName || "—"}</p>
            <p className="text-sm text-gray-600">{t("وقت البدء", "Started at")}: {activeShift.startedAt || "—"}</p>
            <p className="text-sm text-gray-600">{t("العهدة الافتتاحية", "Opening float")}: <bdi>{formatShiftHalalas(activeShift.registerOpeningHalalas, lang)}</bdi> {t("ر.س", "SAR")}</p>
          </div>}
    </div>
  );
}

function BranchSuppliers() {
  const { t, dir } = useCLang();
  const { data: apiSuppliers = [] } = useBranchSuppliers();
  const requestNewMut = useBranchRequestNewSupplier();
  const [showReq, setShowReq] = useState(false);
  const [reqForm, setReqForm] = useState({ name: "", category: "", phone: "", reason: "" });
  const submitReq = () => {
    if (!reqForm.name.trim()) return;
    requestNewMut.mutate(
      {
        name: reqForm.name.trim(),
        category: reqForm.category || undefined,
        phone: reqForm.phone || undefined,
        notes: reqForm.reason || undefined,
        contactPhone: reqForm.phone || undefined,
        reason: reqForm.reason || undefined,
      } as any,
      { onSuccess: () => { setShowReq(false); setReqForm({ name: "", category: "", phone: "", reason: "" }); } },
    );
  };
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الموردون", "Suppliers")}</h2><p className="text-gray-400 text-sm">{t("موردو", "Suppliers of")} {MY_BRANCH.name}</p></div>
        <Btn variant="primary" size="sm" onClick={() => setShowReq(true)}><Plus size={12} /> {t("طلب مورد جديد", "Request New Supplier")}</Btn>
      </div>
      {showReq && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowReq(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("طلب مورد جديد", "Request New Supplier")}
          onKeyDown={e => { if (e.key === "Escape") setShowReq(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{t("طلب مورد جديد", "Request New Supplier")}</h3>
              <button onClick={() => setShowReq(false)} aria-label={t("إغلاق", "Close")} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="b-sup-name" className="text-[11px] font-semibold text-gray-500 block mb-1">{t("اسم المورد", "Supplier name")}</label>
                <input id="b-sup-name" value={reqForm.name} onChange={e => setReqForm(p => ({ ...p, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="b-sup-cat" className="text-[11px] font-semibold text-gray-500 block mb-1">{t("التصنيف", "Category")}</label>
                  <input id="b-sup-cat" value={reqForm.category} onChange={e => setReqForm(p => ({ ...p, category: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label htmlFor="b-sup-phone" className="text-[11px] font-semibold text-gray-500 block mb-1">{t("الهاتف", "Phone")}</label>
                  <input id="b-sup-phone" value={reqForm.phone} onChange={e => setReqForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400" />
                </div>
              </div>
              <div>
                <label htmlFor="b-sup-reason" className="text-[11px] font-semibold text-gray-500 block mb-1">{t("السبب (اختياري)", "Reason (optional)")}</label>
                <textarea id="b-sup-reason" rows={2} value={reqForm.reason} onChange={e => setReqForm(p => ({ ...p, reason: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-purple-400" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowReq(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50">{t("إلغاء", "Cancel")}</button>
                <Btn variant="primary" onClick={submitReq} disabled={!reqForm.name.trim() || requestNewMut.isPending}><Plus size={11} /> {t("إرسال الطلب", "Submit")}</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {apiSuppliers.length === 0 && <div className="px-5 py-10 text-center text-sm text-gray-400">{t("لا يوجد موردون", "No suppliers")}</div>}
        {apiSuppliers.map((s, i) => {
          const isReq = s.isRequest === true;
          const chip = s.statusLabel ?? (isReq ? t("قيد المراجعة", "Under Review") : t("معتمد", "Approved"));
          return (
            <div key={s.id ?? i} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 text-lg">🏭</div>
              <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{s.name}</p><p className="text-xs text-gray-400">{s.category || "—"}{(s.contactName || s.contactPhone || s.phone) ? ` · ${s.contactName ?? s.contactPhone ?? s.phone}` : ""}</p></div>
              <Badge className={`text-[10px] ${isReq ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>{chip}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BranchSettings() {
  const { t, dir } = useCLang();
  const { data: apiSettings } = useBranchSettings();
  const updateBranchMut = useUpdateBranchSettings();
  const [branchName, setBranchName] = useState(apiSettings?.branchName || MY_BRANCH.name);
  const [manager, setManager] = useState(apiSettings?.managerName || "فاطمة السالم");
  const [phone, setPhone] = useState(apiSettings?.phone || "+966 11 234 5678");
  useEffect(() => {
    if (apiSettings) {
      if (apiSettings.branchName) setBranchName(apiSettings.branchName);
      if (apiSettings.managerName) setManager(apiSettings.managerName);
      if (apiSettings.phone) setPhone(apiSettings.phone);
    }
  }, [apiSettings]);
  const branchBrand = apiSettings?.brandName || MY_BRANCH.brand;
  const branchCity = apiSettings?.city || MY_BRANCH.city;
  // branchName / phone / address are admin-owned now; the backend ignores edits.
  const readOnlyFields = new Set(apiSettings?.readOnlyFields ?? ["branchName", "phone", "address"]);
  const lockedInput = "w-full text-sm border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-400 cursor-not-allowed";
  const editInput = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400";
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("إعدادات الفرع", "Branch Settings")}</h2><p className="text-gray-400 text-sm">{branchBrand}</p></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-2">{t("بيانات الفرع الأساسية", "Basic Branch Info")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label htmlFor="b-sett-name" className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم الفرع", "Branch Name")}{readOnlyFields.has("branchName") && <span className="text-gray-300 font-normal"> · {t("من إدارة النظام", "set by admin")}</span>}</label><input id="b-sett-name" value={branchName} onChange={e => setBranchName(e.target.value)} readOnly={readOnlyFields.has("branchName")} className={readOnlyFields.has("branchName") ? lockedInput : editInput} /></div>
          <div><label htmlFor="b-sett-mgr" className="text-xs font-semibold text-gray-600 block mb-1">{t("مدير الفرع", "Branch Manager")}</label><input id="b-sett-mgr" value={manager} onChange={e => setManager(e.target.value)} className={editInput} /></div>
          <div><label htmlFor="b-sett-phone" className="text-xs font-semibold text-gray-600 block mb-1">{t("رقم الهاتف", "Phone")}{readOnlyFields.has("phone") && <span className="text-gray-300 font-normal"> · {t("من إدارة النظام", "set by admin")}</span>}</label><input id="b-sett-phone" value={phone} onChange={e => setPhone(e.target.value)} readOnly={readOnlyFields.has("phone")} className={readOnlyFields.has("phone") ? lockedInput : editInput} dir="ltr" /></div>
          <div><label htmlFor="b-sett-city" className="text-xs font-semibold text-gray-600 block mb-1">{t("المدينة", "City")}</label><input id="b-sett-city" value={branchCity} readOnly className="w-full text-sm border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-400" /></div>
        </div>
        <div className="flex justify-end pt-2"><Btn variant="primary" onClick={() => updateBranchMut.mutate({ manager: manager.trim(), managerName: manager.trim() } as any)}><Check size={13} /> {t("حفظ التغييرات", "Save Changes")}</Btn></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PROCUREMENT PAGES
// ═══════════════════════════════════════════════════
function ProcOverview({ navigate }:{ navigate:(p:string)=>void }) {
  const { t, dir } = useCLang();
  const { data: apiOverview } = useProcurementOverview();
  const { data: apiOrders = [] } = useProcurementOrders();
  const { data: apiSuppliers = [] } = useProcurementSuppliers();
  // All figures from GET /company/me/procurement/*. No static fallback.
  const apiKpis = (apiOverview?.kpis ?? {}) as Record<string, number | string>;
  const activeSuppliersCount = (apiKpis.activeSuppliersCount as number | undefined)
    ?? (apiSuppliers as any[]).filter((s: any) => s.isActive).length;
  const monthlyPurchasesK = (apiKpis.monthlyPurchasesHalalas as number | undefined) != null
    ? `${Math.round(((apiKpis.monthlyPurchasesHalalas as number) / 100) / 1000)}K`
    : "0";
  const SAR = t("ر.س","SAR");
  const orders = apiOrders.map(o => ({
    id: o.publicId || o.id,
    supplier: o.supplierName || "—",
    items: o.itemsCount ?? 0,
    total: o.totalHalalas != null ? o.totalHalalas / 100 : (o as any).total ?? 0,
    status: o.status === "sent" ? "sent" : o.status === "draft" ? "pending" : (o.status || "pending"),
    date: o.createdAt,
  }));
  const SC:Record<string,string>={pending:"bg-amber-50 text-amber-700 border-amber-200",approved:"bg-blue-50 text-blue-700 border-blue-200",sent:"bg-sky-50 text-sky-700 border-sky-200",delivered:"bg-emerald-50 text-emerald-700 border-emerald-200",rejected:"bg-red-50 text-red-700 border-red-200"};
  const SL:Record<string,string>={pending:t("معلق","Pending"),approved:t("معتمد","Approved"),sent:t("تم الإرسال / قيد النقل","Sent / In Transit"),delivered:t("تم التسليم","Delivered"),rejected:t("مرفوض","Rejected")};
  const totalPending=orders.filter(o=>o.status==="pending").reduce((s,o)=>s+o.total,0);
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("لوحة المشتريات","Procurement Dashboard")}</h2></div><button onClick={()=>navigate("proc-new")} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600"><Plus size={14}/> {t("أمر شراء جديد","New Purchase Order")}</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t("أوامر معلقة","Pending Orders")} value={String(orders.filter(o=>o.status==="pending").length)} sub={t("تنتظر الاعتماد","awaiting approval")} icon={<Clock size={18} className="text-amber-600"/>} accent="amber"/>
        <KpiCard label={t("قيمة المعلقة","Pending Value")} value={fmt(totalPending)} sub={SAR} icon={<Wallet size={18} className="text-red-500"/>} accent="red"/>
        <KpiCard label={t("موردون نشطون","Active Suppliers")} value={String(activeSuppliersCount)} sub={t("مورد معتمد","approved suppliers")} icon={<Building2 size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("مشتريات الشهر","Monthly Purchases")} value={monthlyPurchasesK} sub={`${SAR} ${t("إجمالي","total")}`} icon={<ShoppingCart size={18} className="text-purple-600"/>} accent="purple"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60"><h3 className="font-bold text-gray-900 text-sm">{t("أحدث أوامر الشراء","Latest Purchase Orders")}</h3></div>
        {orders.map(o=>(
          <div key={o.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 min-w-[500px]">
            <div className="text-left flex-shrink-0"><p className="text-xs font-bold text-gray-400" dir="ltr">{o.id}</p></div>
            <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{o.supplier}</p><p className="text-xs text-gray-400">{o.items} {t("أصناف","items")} · {o.date}</p></div>
            <span className="font-mono font-bold text-gray-800">{fmt(o.total)} {SAR}</span>
            <Badge className={`text-[10px] border ${SC[o.status] || "bg-gray-100 text-gray-600"}`}>{SL[o.status] || o.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcNew() {
  const { t, dir } = useCLang();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "approved" | "sent" | "rejected">("all");
  const { data: apiOrders = [] } = useProcurementOrders({
    page,
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const updateOrderMut = useUpdateOrder();
  const createOrderMut = useCreateProcurementOrder();
  const { data: supplierOpts = [] } = useProcurementSuppliers();
  const { data: itemOpts = [] } = useProcurementItems();
  const SAR = t("ر.س","SAR");
  const [draftCommandId, setDraftCommandId] = useState<string>(() => generateCommandId());
  const [lastMaterialSignature, setLastMaterialSignature] = useState<string>("");
  const [orderForm, setOrderForm] = useState({ supplierId:"", itemId:"", qty:"", unitPrice:"", notes:"" });
  const [editingOrder, setEditingOrder] = useState<any|null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const handleItemSelect = (itemId: string) => {
    const selectedItem = itemOpts.find(i => i.id === itemId);
    const defaultPrice = selectedItem
      ? (selectedItem.lastPriceHalalas ? String(selectedItem.lastPriceHalalas / 100) : (selectedItem as any).price ? String((selectedItem as any).price) : "")
      : "";
    setOrderForm(f => ({ ...f, itemId, unitPrice: f.unitPrice || defaultPrice }));
  };

  const submitOrder = () => {
    const qtyStr = orderForm.qty.trim();
    const priceStr = orderForm.unitPrice.trim();
    const normalizedNotes = orderForm.notes.trim();

    if (!orderForm.supplierId || !orderForm.itemId || !qtyStr || !priceStr) {
      alert(t("يرجى اختيار المورد والصنف وإدخال كمية وسعر صحيحين", "Please select supplier and item and enter valid quantity and price"));
      return;
    }

    const q = parseFloat(qtyStr);
    if (isNaN(q) || !Number.isFinite(q) || q <= 0) {
      alert(t("يرجى إدخال كمية صحيحة موجبة أكبر من صفر", "Please enter a valid positive quantity greater than zero"));
      return;
    }

    // Two-decimal contract validation: reject values with > 2 decimal places or non-numeric formatting
    if (!/^\d+(\.\d{1,2})?$/.test(priceStr)) {
      alert(t("سعر الوحدة غير صحيح أو يحتوي على أكثر من خانتين عشريتين", "Unit price is invalid or exceeds 2 decimal places"));
      return;
    }

    const parts = priceStr.split(".");
    const major = parseInt(parts[0], 10);
    const minorStr = parts[1] ? parts[1].padEnd(2, "0") : "00";
    const minor = parseInt(minorStr, 10);
    const unitPriceHalalas = major * 100 + minor;

    if (!Number.isSafeInteger(unitPriceHalalas) || unitPriceHalalas < 1) {
      alert(t("سعر الوحدة غير صحيح أو يقل عن هللة واحدة", "Unit price is invalid or less than 1 halala"));
      return;
    }

    const totalHalalas = Math.round(unitPriceHalalas * q);
    if (!Number.isSafeInteger(totalHalalas) || totalHalalas < 1) {
      alert(t("إجمالي المبلغ غير صحيح", "Total amount is invalid"));
      return;
    }

    // Complete effective command payload signature covering all inputs including normalized notes
    const currentSignature = `${orderForm.supplierId}|${orderForm.itemId}|${q}|${unitPriceHalalas}|${totalHalalas}|${normalizedNotes}`;
    let commandIdToUse = draftCommandId;
    if (lastMaterialSignature && lastMaterialSignature !== currentSignature) {
      commandIdToUse = generateCommandId();
      setDraftCommandId(commandIdToUse);
    }
    setLastMaterialSignature(currentSignature);

    createOrderMut.mutate(
      {
        supplierId: orderForm.supplierId,
        items: [{ itemId: orderForm.itemId, qty: q, unitPriceHalalas, totalHalalas }],
        notes: normalizedNotes || undefined,
        description: normalizedNotes || undefined,
        commandId: commandIdToUse,
      } as any,
      {
        onSuccess: () => {
          setShowAdd(false);
          setOrderForm({ supplierId:"", itemId:"", qty:"", unitPrice:"", notes:"" });
          setLastMaterialSignature("");
          setDraftCommandId(generateCommandId());
        },
      },
    );
  };

  const submitEditOrder = () => {
    if (!editingOrder) return;
    updateOrderMut.mutate(
      { id: editingOrder._apiId || editingOrder.id, notes: editNotes.trim() || undefined, description: editNotes.trim() || undefined } as any,
      { onSuccess: () => setEditingOrder(null) },
    );
  };

  const orders = apiOrders.map(o => ({
    id: o.publicId || o.id,
    supplier: o.supplierName || "—",
    brand: o.brandName || "—",
    items: o.itemsCount ?? 0,
    total: o.totalHalalas != null ? o.totalHalalas / 100 : (o as any).total ?? 0,
    status: o.status === "sent" ? "sent" : o.status === "draft" ? "pending" : (o.status || "pending"),
    date: o.createdAt,
    _apiId: o.id,
  }));

  const SC:Record<string,string>={pending:"bg-amber-50 text-amber-700 border-amber-200",approved:"bg-blue-50 text-blue-700 border-blue-200",sent:"bg-sky-50 text-sky-700 border-sky-200",delivered:"bg-emerald-50 text-emerald-700 border-emerald-200",rejected:"bg-red-50 text-red-700 border-red-200"};
  const SL:Record<string,string>={pending:t("معلق","Pending"),approved:t("معتمد","Approved"),sent:t("تم الإرسال / قيد النقل","Sent / In Transit"),delivered:t("تم التسليم","Delivered"),rejected:t("مرفوض","Rejected")};

  const parsedQty = parseFloat(orderForm.qty);
  const parsedPrice = parseFloat(orderForm.unitPrice);
  const hasValidCalculation = !isNaN(parsedQty) && parsedQty > 0 && !isNaN(parsedPrice) && parsedPrice > 0;
  const subtotalSar = hasValidCalculation ? parsedQty * parsedPrice : 0;
  const estimatedVatSar = hasValidCalculation ? subtotalSar * 0.15 : 0;
  const estimatedTotalSar = subtotalSar + estimatedVatSar;

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t("أوامر الشراء","Purchase Orders")}</h2>
          <p className="text-gray-400 text-sm">{orders.filter(o=>o.status==="pending").length} {t("معلق","pending")}</p>
        </div>
        <Btn variant="primary" onClick={()=>{ setDraftCommandId(generateCommandId()); setShowAdd(true); }}><Plus size={13}/> {t("أمر جديد","New Order")}</Btn>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { key: "all" as const, label: t("الكل", "All") },
          { key: "draft" as const, label: t("معلق", "Pending") },
          { key: "approved" as const, label: t("معتمد", "Approved") },
          { key: "sent" as const, label: t("تم الإرسال", "Sent") },
          { key: "rejected" as const, label: t("مرفوض", "Rejected") },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => { setStatusFilter(f.key); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === f.key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-6 gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-500 min-w-[580px]">
          <span>{t("رقم الأمر","Order #")}</span><span className="col-span-2">{t("المورد","Supplier")}</span><span>{t("العلامة","Brand")}</span><span>{t("الإجمالي","Total")}</span><span>{t("الإجراءات","Actions")}</span>
        </div>
        {orders.map(o=>(
          <div key={o.id} className="grid grid-cols-6 gap-3 px-5 py-4 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/50 min-w-[580px]">
            <span className="font-mono text-xs text-gray-500" dir="ltr">{o.id}</span>
            <div className="col-span-2"><p className="font-semibold text-gray-800 text-sm">{o.supplier}</p><p className="text-[10px] text-gray-400">{o.items} {t("أصناف","items")} · {o.date}</p></div>
            <span className="text-xs text-gray-600">{o.brand}</span>
            <span className="font-mono font-bold text-gray-800 text-sm">{fmt(o.total)} {SAR}</span>
            <div className="flex items-center gap-1.5">
              <Badge className={`text-[10px] border ${SC[o.status] || "bg-gray-100 text-gray-600"}`}>{SL[o.status] || o.status}</Badge>
              <button onClick={()=>{ setEditingOrder(o); setEditNotes(""); }} title={t("تعديل","Edit")} className="p-1 rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Edit2 size={11}/>
              </button>
            </div>
          </div>
        ))}
        {(apiOrders as any).meta && (apiOrders as any).meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
            <span>{t("الصفحة", "Page")} {page} {t("من", "of")} {(apiOrders as any).meta.totalPages || 1} ({(apiOrders as any).meta.total ?? orders.length} {t("طلب", "orders")})</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-gray-200 bg-white disabled:opacity-40"
              >
                {t("السابق", "Previous")}
              </button>
              <button
                disabled={page >= ((apiOrders as any).meta.totalPages || 1)}
                onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1 rounded border border-gray-200 bg-white disabled:opacity-40"
              >
                {t("التالي", "Next")}
              </button>
            </div>
          </div>
        )}
      </div>
      {showAdd&&(
        <div role="dialog" aria-modal="true" aria-label={t("أمر شراء جديد","New Purchase Order")} tabIndex={-1} onKeyDown={e => { if (e.key === "Escape") setShowAdd(false); }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{t("أمر شراء جديد","New Purchase Order")}</h3><button aria-label={t("إغلاق","Close")} onClick={()=>setShowAdd(false)} className="text-gray-400"><X size={18}/></button></div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">{t("الأسعار غير شاملة ضريبة القيمة المضافة (15% منفصلة عند الفاتورة وفق PUR-05)", "Prices exclude VAT (15% separate at invoice per PUR-05)")}</p>
            <div className="space-y-3">
              <div><label htmlFor="po-supp" className="text-xs font-semibold text-gray-600 block mb-1">{t("المورد","Supplier")} *</label><select id="po-supp" value={orderForm.supplierId} onChange={e=>setOrderForm(f=>({...f,supplierId:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option value="">{t("اختر المورد","Select supplier")}</option>{supplierOpts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label htmlFor="po-item" className="text-xs font-semibold text-gray-600 block mb-1">{t("الصنف","Item")} *</label><select id="po-item" value={orderForm.itemId} onChange={e=>handleItemSelect(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"><option value="">{t("اختر الصنف","Select item")}</option>{itemOpts.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="po-qty" className="text-xs font-semibold text-gray-600 block mb-1">{t("الكمية","Qty")} *</label><input id="po-qty" type="number" min="0.01" step="any" value={orderForm.qty} onChange={e=>setOrderForm(f=>({...f,qty:e.target.value}))} dir="ltr" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
                <div><label htmlFor="po-price" className="text-xs font-semibold text-gray-600 block mb-1">{t("سعر الوحدة (ر.س)","Unit Price (SAR)")} *</label><input id="po-price" type="number" min="0.01" step="0.01" value={orderForm.unitPrice} onChange={e=>setOrderForm(f=>({...f,unitPrice:e.target.value}))} dir="ltr" placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none"/></div>
              </div>
              {hasValidCalculation && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>{t("المجموع قبل الضريبة (ر.س)","Subtotal (SAR)")}:</span>
                    <span className="font-mono font-bold">{subtotalSar.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>{t("ضريبة القيمة المضافة التقديرية (15% منفصلة وفق PUR-05)","Estimated VAT (15% separate per PUR-05)")}:</span>
                    <span className="font-mono font-bold">{estimatedVatSar.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 border-t border-gray-200 pt-1 font-bold">
                    <span>{t("الإجمالي التقديري شامل الضريبة","Estimated Total Incl. VAT")}:</span>
                    <span className="font-mono">{estimatedTotalSar.toFixed(2)} {SAR}</span>
                  </div>
                </div>
              )}
              <div><label htmlFor="po-notes" className="text-xs font-semibold text-gray-600 block mb-1">{t("ملاحظات (اختياري)","Notes (optional)")}</label><textarea id="po-notes" rows={2} value={orderForm.notes} onChange={e=>setOrderForm(f=>({...f,notes:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none resize-none"/></div>
              <div className="flex gap-2 justify-end pt-1"><Btn onClick={()=>setShowAdd(false)}>{t("إلغاء","Cancel")}</Btn><Btn variant="primary" onClick={submitOrder} disabled={!orderForm.supplierId||!orderForm.itemId||!orderForm.qty||!orderForm.unitPrice||createOrderMut.isPending}><Send size={13}/> {createOrderMut.isPending ? t("جارٍ الحفظ...","Saving...") : t("إنشاء","Create")}</Btn></div>
            </div>
          </div>
        </div>
      )}
      {editingOrder&&(
        <div role="dialog" aria-modal="true" aria-label={t("تعديل أمر الشراء","Edit Purchase Order")} tabIndex={-1} onKeyDown={e => { if (e.key === "Escape") setEditingOrder(null); }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setEditingOrder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{t("تعديل أمر الشراء","Edit Purchase Order")} — {editingOrder.id}</h3><button aria-label={t("إغلاق","Close")} onClick={()=>setEditingOrder(null)} className="text-gray-400"><X size={18}/></button></div>
            <div className="space-y-3">
              <div><label htmlFor="po-edit-notes" className="text-xs font-semibold text-gray-600 block mb-1">{t("ملاحظات التعديل","Edit Notes / Description")}</label><textarea id="po-edit-notes" rows={3} value={editNotes} onChange={e=>setEditNotes(e.target.value)} placeholder={t("أدخل تفاصيل التعديل المطلوبة...","Enter update notes...")} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none resize-none"/></div>
              <div className="flex gap-2 justify-end pt-1"><Btn onClick={()=>setEditingOrder(null)}>{t("إلغاء","Cancel")}</Btn><Btn variant="primary" onClick={submitEditOrder} disabled={updateOrderMut.isPending}><CheckCircle2 size={13}/> {updateOrderMut.isPending ? t("جارٍ الحفظ...","Saving...") : t("حفظ التعديل","Save Changes")}</Btn></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProcSuppliers() {
  const { t, dir } = useCLang();
  const { data: apiSuppliers = [] } = useProcurementSuppliers();
  const SAR = t("ر.س","SAR");
  // Suppliers come from GET /company/me/procurement/suppliers. No static fallback.
  // PUR-04: Adding approved suppliers is restricted to Accountant role per Business Rules v3.5.
  const suppliers = apiSuppliers.map(s => {
    const rawRating = Number(s.rating ?? (s as any).ratingAvg ?? 0);
    const rating = rawRating > 5 ? rawRating / 10 : rawRating;
    const totalSpent = (s as any).lifetimeSpend ?? (s as any).totalPurchases ?? ((s as any).totalSpentHalalas ? (s as any).totalSpentHalalas / 100 : 0);
    return {
      id: s.id,
      name: s.name,
      category: s.category || "—",
      contact: (s as any).contactName || s.email || "—",
      phone: s.phone || (s as any).contactPhone || "",
      rating: isNaN(rating) ? 0 : Number(rating.toFixed(1)),
      orders: (s as any).ordersCount ?? 0,
      totalSpent: isNaN(totalSpent) ? 0 : totalSpent,
      active: s.isActive ?? ((s as any).status === "active" || (s as any).status === "نشط" || (s as any).status === undefined),
    };
  });
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الموردون","Suppliers")}</h2><p className="text-gray-400 text-sm">{suppliers.filter(s=>s.active).length} {t("مورد نشط","active suppliers")}</p></div>
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <span>📋 {t("إضافة الموردين المعتمدين من صلاحية المحاسب وفق قواعد الأعمال (PUR-04)", "Adding approved suppliers is restricted to Accountant role per Business Rules (PUR-04)")}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label={t("موردون نشطون","Active Suppliers")} value={String(suppliers.filter(s=>s.active).length)} sub={t("مورد معتمد","approved")} icon={<Building2 size={18} className="text-blue-600"/>} accent="blue"/>
        <KpiCard label={t("إجمالي المشتريات","Total Purchases")} value={fmt(suppliers.reduce((s,x)=>s+x.totalSpent,0))} sub={SAR} icon={<Wallet size={18} className="text-purple-600"/>} accent="purple"/>
        <KpiCard label={t("متوسط التقييم","Avg Rating")} value={(suppliers.length > 0 ? (suppliers.reduce((s,x)=>s+(x.rating||0),0)/suppliers.length) : 0).toFixed(1)} sub={t("من 5 نجوم","/ 5 stars")} icon={<Star size={18} className="text-amber-600"/>} accent="amber"/>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        {suppliers.map(s=>(
          <div key={s.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 min-w-[580px]">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{s.name[0]}</div>
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-bold text-gray-800 text-sm">{s.name}</span><Badge className="bg-gray-100 text-gray-600 text-[10px]">{s.category}</Badge></div><div className="flex gap-3 mt-0.5"><span className="text-xs text-gray-400">{s.contact}</span><span className="text-xs text-gray-400" dir="ltr">{s.phone}</span></div></div>
            <div className={`${dir==="rtl"?"text-left":"text-right"} flex-shrink-0`}><div className="flex items-center gap-0.5">{[1,2,3,4,5].map(i=><span key={i} className={`text-sm ${i<=Math.floor(s.rating)?"text-amber-400":"text-gray-200"}`}>★</span>)}<span className="text-xs text-gray-500 mr-1">{s.rating}</span></div><p className="text-[10px] text-gray-400">{s.orders} {t("طلب","orders")} · {fmt(s.totalSpent)} {SAR}</p></div>
            <Badge className={`text-[10px] ${s.active?"bg-emerald-50 text-emerald-700 border border-emerald-100":"bg-gray-100 text-gray-500"}`}>{s.active?`● ${t("نشط","Active")}`:`○ ${t("موقوف","Inactive")}`}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcItems() {
  const { t, dir } = useCLang();
  const { data: apiItems = [] } = useProcurementItems();
  const createItemMut = useCreateProcurementItem();
  const SAR = t("ر.س","SAR");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:"", unit:"", category:"", price:"" });
  const submitItem = () => {
    const p = parseFloat(form.price);
    if (!form.name.trim() || !form.unit.trim() || isNaN(p) || p <= 0) {
      alert(t("يرجى إدخال اسم الصنف والوحدة وسعر صحيح أكبر من صفر", "Please enter item name, unit, and a positive price"));
      return;
    }
    createItemMut.mutate(
      { name: form.name.trim(), unit: form.unit.trim(), category: form.category.trim(), lastPriceHalalas: Math.round(p * 100) } as any,
      { onSuccess: () => { setShowAdd(false); setForm({ name:"", unit:"", category:"", price:"" }); } },
    );
  };
  const items = apiItems.map(i => ({
    name: i.name,
    unit: i.unit || "",
    lastPrice: (i as any).lastPriceHalalas != null ? (i as any).lastPriceHalalas / 100 : ((i as any).price ?? 0),
    brand: i.category || "—",
    suppliers: (i as any).supplierCount ?? ((i as any).preferredSupplierName ? 1 : 0),
  }));
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-800">{t("الأصناف والأسعار","Items & Prices")}</h2><p className="text-gray-400 text-sm">{items.length} {t("صنف","items")}</p></div><Btn variant="primary" onClick={()=>setShowAdd(true)}><Plus size={13}/> {t("صنف جديد","New Item")}</Btn></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-500 min-w-[500px]">
          <span className="col-span-2">{t("الصنف","Item")}</span><span>{t("الوحدة","Unit")}</span><span>{t("السعر قبل الضريبة","Price Before VAT")}</span><span>{t("الموردون","Suppliers")}</span>
        </div>
        {items.map(i=>(
          <div key={i.name} className="grid grid-cols-5 gap-4 px-5 py-4 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/50 min-w-[500px]">
            <div className="col-span-2"><p className="font-semibold text-gray-800 text-sm">{i.name}</p><p className="text-[10px] text-gray-400">{i.brand}</p></div>
            <span className="text-gray-500 text-sm">{i.unit}</span>
            <span className="font-mono font-bold text-gray-800 text-sm">{fmt(i.lastPrice)} {SAR}</span>
            <div className="flex items-center gap-1"><span className="font-bold text-purple-700">{i.suppliers}</span><span className="text-xs text-gray-400">{t("مورد","suppliers")}</span></div>
          </div>
        ))}
      </div>
      {showAdd && (
        <div role="dialog" aria-modal="true" aria-label={t("صنف جديد","New Item")} tabIndex={-1} onKeyDown={e => { if (e.key === "Escape") setShowAdd(false); }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">{t("صنف جديد","New Item")}</h3><button aria-label={t("إغلاق","Close")} onClick={()=>setShowAdd(false)} className="text-gray-400"><X size={18}/></button></div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">{t("السعر قبل الضريبة وفق PUR-05 (تُحسب الضريبة 15% منفصلة)", "Price before VAT per PUR-05 (15% tax calculated separately)")}</p>
            <div className="space-y-3">
              <div><label htmlFor="item-name" className="text-xs font-semibold text-gray-600 block mb-1">{t("اسم الصنف","Item Name")} *</label><input id="item-name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="item-unit" className="text-xs font-semibold text-gray-600 block mb-1">{t("الوحدة","Unit")} *</label><input id="item-unit" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="كجم / حبة" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
                <div><label htmlFor="item-price" className="text-xs font-semibold text-gray-600 block mb-1">{t("السعر قبل الضريبة","Price Before VAT")} *</label><input id="item-price" type="number" min="0.01" step="0.01" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} dir="ltr" placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
              </div>
              <div><label htmlFor="item-cat" className="text-xs font-semibold text-gray-600 block mb-1">{t("الفئة","Category")}</label><input id="item-cat" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400"/></div>
              <div className="flex gap-2 justify-end pt-1"><Btn onClick={()=>setShowAdd(false)}>{t("إلغاء","Cancel")}</Btn><Btn variant="primary" onClick={submitItem} disabled={!form.name.trim()||!form.unit.trim()||!form.price||createItemMut.isPending}><Plus size={13}/> {createItemMut.isPending ? t("جارٍ الإضافة...","Adding...") : t("إضافة","Add")}</Btn></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProcReports() {
  const { t, dir } = useCLang();
  const { data: apiReports = [] } = useProcurementReports();
  const downloadMut = useDownloadProcurementReport();
  const reports: [string,string,string][] = apiReports.map(r => [r.title, r.description || "", r.key] as [string,string,string]);
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("تقارير المشتريات","Procurement Reports")}</h2><p className="text-gray-400 text-sm">{t("تصدير التقارير بصيغ PDF وExcel وفق INTG-01","Export reports in PDF and Excel formats per INTG-01")}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map(([title,desc,file])=>(
          <div key={title} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${dir==="rtl"?"text-right":"text-left"} hover:border-amber-200 hover:shadow-md transition-all`}>
            <p className="font-bold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400 mt-1">{desc}</p>
            <div className="mt-3 flex gap-2">
              <button disabled={downloadMut.isPending} onClick={()=>downloadMut.mutate({ key: file, format: "pdf" })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-amber-100 hover:text-amber-700 transition-colors">
                <Download size={11}/> PDF
              </button>
              <button disabled={downloadMut.isPending} onClick={()=>downloadMut.mutate({ key: file, format: "xlsx" })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors">
                <Download size={11}/> Excel (XLSX)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcGrouped() {
  const { t, dir } = useCLang();
  const { data: apiGroups = [] } = useGroupedOrders();
  const sendGroupedMut = useSendGroupedOrder();
  const SAR = t("ر.س","SAR");
  const groups = apiGroups.map(g => ({
    supplier: g.supplierName || "—",
    supplierId: g.supplierId,
    orders: g.ordersCount ?? (g as any).orderCount ?? (g.orders?.length ?? 0),
    total: g.totalHalalas != null ? g.totalHalalas / 100 : ((g as any).total ?? 0),
    branches: ((g as any).branches as string[] | undefined) ?? (g.orders ?? []).map(o => o.branchName || "—"),
    pending: (g as any).pending ?? (g as any).status !== "sent",
    groupId: g.groupId,
  }));
  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("الأوامر المجمّعة","Grouped Orders")}</h2><p className="text-gray-400 text-sm">{t("تجميع أوامر الشراء حسب المورد عبر كل الفروع","Group purchase orders by supplier across all branches")}</p></div>
      </div>
      <div className="space-y-4">
        {groups.map((g,i)=>(
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-lg">🏭</div>
              <div className="flex-1"><p className="font-bold text-gray-800">{g.supplier}</p><p className="text-xs text-gray-400">{g.orders} {t("أوامر","orders")} · {g.branches.length} {t("فروع","branches")}</p></div>
              <span className="font-mono font-bold text-gray-800">{fmt(g.total)} {SAR}</span>
              <Badge className={`text-[10px] ${g.pending?"bg-amber-50 text-amber-700 border border-amber-200":"bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>{g.pending?t("معلق","Pending"):t("تم الإرسال","Sent")}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {g.branches.map((b: string)=><span key={b} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">{b}</span>)}
            </div>
            <div className="flex justify-end mt-3">
              <Btn variant="primary" size="sm" disabled={!g.supplierId || sendGroupedMut.isPending}
                onClick={()=>{ if(g.supplierId) sendGroupedMut.mutate({ supplierId: g.supplierId, groupId: g.groupId }); }}>
                <Send size={12}/> {sendGroupedMut.isPending ? t("جارٍ الإرسال...","Sending...") : t("إعداد رابط واتساب للمورد","Prepare WhatsApp PO")}
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcSent() {
  const { t, dir } = useCLang();
  const { data: apiSent = [] } = useSentOrders();
  const SAR = t("ر.س","SAR");
  const sent = apiSent.map(o => ({
    id: o.publicId || o.id,
    supplier: o.supplierName || "—",
    sentDate: (o as any).sentAt || o.createdAt,
    total: o.totalHalalas != null ? o.totalHalalas / 100 : ((o as any).total ?? 0),
    inTransit: (o as any).inTransit ?? (o.status === "sent"),
    eta: (o as any).eta || (o.status === "sent" ? t("قيد النقل","In Transit") : t("تم","Done")),
    status: o.status,
  }));
  return (
    <div className="space-y-5" dir={dir}>
      <div><h2 className="text-xl font-bold text-gray-800">{t("الأوامر المُرسَلة","Sent Orders")}</h2><p className="text-gray-400 text-sm">{sent.length} {t("أوامر مُرسَلة","sent orders")}</p></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        {sent.map(s=>(
          <div key={s.id} className="px-5 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 min-w-[500px]">
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">{s.supplier}</p>
              <p className="text-xs text-gray-400">{s.id} · {s.sentDate}</p>
            </div>
            <span className="font-mono font-bold text-gray-800">{fmt(s.total)} {SAR}</span>
            <span className="text-xs text-gray-400">ETA: {s.eta}</span>
            <Badge className={`text-[10px] ${s.status === "delivered" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : s.inTransit ? "bg-sky-50 text-sky-700 border border-sky-200" : "bg-gray-100 text-gray-600"}`}>
              {s.status === "delivered" ? t("تم التسليم","Delivered") : s.inTransit ? t("قيد النقل","In Transit") : t("تم الإرسال","Sent")}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PAGE ROUTER
// ═══════════════════════════════════════════════════
function PageRouter({ role, page, navigate, ops, approve, reject, requestClarification, bulkApprove, finalApprove, bulkFinalApprove, actionsPending, shiftReviewPage, setShiftReviewPage }:{
  role:CRole; page:string; navigate:(p:string)=>void;
} & SharedOpsProps) {
  const headProps:HeadProps = { navigate, ops, finalApprove, reject, bulkFinalApprove, actionsPending };
  const headModuleProps = { ops, finalApprove, reject, bulkFinalApprove, actionsPending };

  if(role==="company-admin") {
    if(page==="ca-dashboard")    return <CADashboard navigate={navigate}/>;
    if(page==="ca-subscription") return <CASubscription/>;
    if(page==="ca-users")        return <CAUsers/>;
    if(page==="ca-branches")     return <CABranches/>;
    if(page==="ca-modules")      return <CAModules/>;
    if(page==="ca-billing")      return <CABilling/>;
    if(page==="ca-settings")     return <CASettings/>;
    if(page==="ca-support")      return <CASupport/>;
    return <CADashboard navigate={navigate}/>;
  }
  if(role==="head") {
    if(page==="head-dashboard")   return <HeadDashboard {...headProps}/>;
    if(page==="head-pending")     return <HeadPending {...headProps}/>;
    if(page==="head-approved")    return <HeadApproved ops={ops}/>;
    if(page==="head-rejected")    return <HeadRejected ops={ops}/>;
    if(page==="head-sales")       return <HeadModulePage moduleKey="sales"     title="مبيعات — اعتماد نهائي"     {...headModuleProps}/>;
    if(page==="head-expenses")    return <HeadModulePage moduleKey="expenses"  title="مصروفات — اعتماد نهائي"   {...headModuleProps}/>;
    if(page==="head-purchases")   return <HeadModulePage moduleKey="purchases" title="مشتريات — اعتماد نهائي"   {...headModuleProps}/>;
    if(page==="head-inventory")   return <HeadModulePage moduleKey="inventory" title="مخزون — اعتماد نهائي"     {...headModuleProps}/>;
    if(page==="head-waste")       return <AccCompanyWaste isHead={true}/>;
    if(page==="head-assets")      return <HeadModulePage moduleKey="assets"    title="أصول — اعتماد نهائي"      {...headModuleProps}/>;
    if(page==="head-shifts")      return <HeadModulePage moduleKey="shifts"    title="ورديات — اعتماد نهائي"    {...headModuleProps}/>;
    if(page==="head-employees")   return <HeadModulePage moduleKey="employees" title="موظفون — اعتماد نهائي"   {...headModuleProps}/>;
    if(page==="head-cash")        return <HeadModulePage moduleKey="cash"      title="صندوق — اعتماد نهائي"    {...headModuleProps}/>;
    if(page==="head-accountants") return <HeadAccountants/>;
    if(page==="head-reports")     return <HeadReports/>;
    if(page==="head-reminders")   return <HeadReminders/>;
    if(page==="head-erp")         return <HeadERP ops={ops}/>;
    return <HeadDashboard {...headProps}/>;
  }
  if(role==="accountant") {
    return <AccountantRoot page={page} navigate={navigate} ops={ops} approve={approve} reject={reject} requestClarification={requestClarification} bulkApprove={bulkApprove} finalApprove={finalApprove} bulkFinalApprove={bulkFinalApprove} actionsPending={actionsPending} shiftReviewPage={shiftReviewPage} setShiftReviewPage={setShiftReviewPage}/>;
  }
  if(role==="branch") {
    if(page==="branch-overview")   return <BranchOverview/>;
    if(page==="branch-upload")     return <BranchUpload/>;
    if(page==="branch-requests")   return <BranchRequests/>;
    if(page==="branch-items")      return <BranchItems/>;
    if(page==="branch-employees")  return <BranchEmployees/>;
    if(page==="branch-shifts")     return <BranchShifts/>;
    if(page==="branch-suppliers")  return <BranchSuppliers/>;
    if(page==="branch-settings")   return <BranchSettings/>;
    return <BranchOverview/>;
  }
  if(role==="procurement") {
    if(page==="proc-overview")  return <ProcOverview navigate={navigate}/>;
    if(page==="proc-new")       return <ProcNew/>;
    if(page==="proc-grouped")   return <ProcGrouped/>;
    if(page==="proc-sent")      return <ProcSent/>;
    if(page==="proc-suppliers") return <ProcSuppliers/>;
    if(page==="proc-items")     return <ProcItems/>;
    if(page==="proc-reports")   return <ProcReports/>;
    return <ProcOverview navigate={navigate}/>;
  }
  return null;
}

// ═══════════════════════════════════════════════════
// ROOT — الحالة المشتركة هنا (المحاسب + رئيس الحسابات يشتركان في نفس البيانات)
// ═══════════════════════════════════════════════════
function CompanyDashboardInner() {
  const { t } = useCLang();
  const { user, logout: authLogout } = useAuth();
  const queryClient = useQueryClient();
  const [switchingRole, setSwitchingRole] = useState(false);
  const switchLock = useRef(false);
  const initSel = readEntrySelection();
  const initRole = chooseGrantedRole(user,companyRoles,
    initSel?.slug === "asab/CompanyDashboard" ? initSel.role : null) as CRole | null;
  const [role, setRole] = useState<CRole|null>(initRole);
  const [page, setPage] = useState<string>(initRole ? DEFAULT_PAGE[initRole] : "");
  const allowedRoles = grantedRoleKeys(user).filter(r => companyRoles.includes(r)) as CRole[];
  const currentRole = role && allowedRoles.includes(role) ? role : allowedRoles[0] ?? null;
  const currentPage = currentRole ? pageForRole(currentRole,page,DEFAULT_PAGE[currentRole]) : "";
  const { ops, approve, reject, requestClarification, finalApprove, bulkApprove, bulkFinalApprove, actionsPending, shiftReviewPage, setShiftReviewPage, rejectModalProps, clarifyModalProps, clearDialogs } = useSharedOps(switchingRole ? null : currentRole, financialAccessFingerprint(user));

  // Tag the current history entry with a page so Back/Forward can restore it.
  const tagHistory = (p:string, replace=false) => {
    try {
      const st = { ...(window.history.state || {}), asabCoPage: p };
      if (replace) window.history.replaceState(st, "");
      else window.history.pushState(st, "");
    } catch { /* history unavailable */ }
  };
  const selectRole = async (r:CRole) => {
    if (!allowedRoles.includes(r) || switchLock.current || r === currentRole) return;
    switchLock.current = true;
    setSwitchingRole(true);
    clearDialogs();
    try {
      await purgeFinancialQueries(queryClient);
      setRole(r); setPage(DEFAULT_PAGE[r]); tagHistory(DEFAULT_PAGE[r], true);
    } finally {
      setSwitchingRole(false);
      switchLock.current = false;
    }
  };
  const navigate = (p:string) => {
    if (!currentRole || pageForRole(currentRole,p,"") !== p) return;
    setPage(p); tagHistory(p);
  };
  // Real sign-out: clear the pre-login pick + the auth session so the sidebar
  // "logout" returns to the entry flow, not the in-mockup role picker. Don't clear
  // role/page here — that flashes the picker while sign-out is in flight; App
  // unmounts this view once `user` becomes null.
  const logout     = () => { clearEntrySelection(); void authLogout(); };

  // Browser Back/Forward → restore the previous internal page (URL stays on the preview hash).
  useEffect(() => {
    const onPop = (e:PopStateEvent) => {
      const p = (e.state as { asabCoPage?: string } | null)?.asabCoPage;
      if (typeof p === "string" && currentRole && pageForRole(currentRole,p,"") === p) setPage(p);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [currentRole]);

  useEffect(() => {
    if (role !== currentRole) { setRole(currentRole); setPage(currentRole ? DEFAULT_PAGE[currentRole] : ""); }
  }, [role,currentRole]);

  if(!currentRole) return <p role="alert">{t("ليس لديك صلاحية للوصول إلى بوابة الشركات","You cannot access the company dashboard")}</p>;
  if(switchingRole) return <p role="status">{t("جارٍ تغيير الدور…","Switching role…")}</p>;

  const headPendingCount = ops.filter(o=>o.status==="approved").length;

  const dashboard = (
    <Shell role={currentRole} page={currentPage} navigate={navigate} onLogout={logout} headPendingCount={headPendingCount}
      allowedRoles={allowedRoles} onSelectRole={selectRole}>
      <PageRouter role={currentRole} page={currentPage} navigate={navigate}
        ops={ops} approve={approve} reject={reject} requestClarification={requestClarification}
        bulkApprove={bulkApprove} finalApprove={finalApprove} bulkFinalApprove={bulkFinalApprove} actionsPending={actionsPending} shiftReviewPage={shiftReviewPage} setShiftReviewPage={setShiftReviewPage}/>
      {(currentRole==="accountant" || currentRole==="head") && <RejectModal {...rejectModalProps} t={t}/>}
      {(currentRole==="accountant" || currentRole==="head") && <ClarifyModal {...clarifyModalProps} t={t}/>}
      {/* Floating live-support chat — available to every company role. */}
      <LiveChatWidget key={currentRole} t={t}/>
    </Shell>
  );
  return currentRole==="accountant"
    ? <CAssetDraftProvider>{dashboard}</CAssetDraftProvider>
    : dashboard;
}

export default function CompanyDashboard() {
  return (
    <CLangProvider>
      <CompanyDashboardInner/>
    </CLangProvider>
  );
}
