import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Send,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  Package,
  Plus,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  useDailyReconciliation,
  usePlatformInventory,
  useExportInventory,
  useSaveDailyVarianceAllocation,
} from "../../../../../api/queries";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { KpiCard } from "../../components/KpiCard";
import { EmptyState } from "../../components/EmptyState";
import { OpRow } from "../../_shared/OpRow";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt, opDetailPage } from "../../_shared/formatters";
import { STATUS_CFG, EN_STATUS_CFG } from "../../_shared/displayConfig";
import { applyFilters, BRANCHES } from "../../_shared/filterOps";
import type {
  PageProps,
  Op,
  Filters,
  PageId,
  OpStatus,
} from "../../_shared/types";

// Simulated per-branch inventory data: current month vs previous month
// Per-branch inventory rows come from the platform API; empty until the backend returns them.
export const INV_BRANCH_DATA: Record<
  string,
  { item: string; cat: string; unit: string; prev: number; curr: number }[]
> = {};

// Real daily reconciliation for a branch — GET /accountant/inventory/branches/{id}/
// daily-reconciliation?date=. Terms are QUANTITIES (opening/received/consumed/waste/
// transfers/expected/actual); money only in the variance value. Shows an honest
// empty state when there's no data for that date — NEVER fabricated numbers.
export function DailyInvEquation({
  branchId,
  date,
}: {
  branchId?: string;
  date?: string;
}) {
  const { t } = useLang();
  const { data, isLoading } = useDailyReconciliation(branchId, date);
  const items: any[] = Array.isArray((data as any)?.items)
    ? (data as any).items
    : [];
  if (items.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-gray-400">
        {isLoading
          ? t("جارٍ التحميل...", "Loading...")
          : t(
              "لا توجد بيانات جرد يومي لهذا اليوم",
              "No daily reconciliation data for this date",
            )}
      </div>
    );
  }
  const q = (v: any) =>
    typeof v === "number"
      ? v.toLocaleString(undefined, { maximumFractionDigits: 3 })
      : "—";
  const totalVarVal = (data as any)?.totalVarianceValueHalalas;
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-[11px] border border-indigo-100 rounded-lg overflow-hidden"
        dir="rtl"
      >
        <thead className="bg-indigo-50/60 text-indigo-700">
          <tr>
            <th className="px-2 py-1.5 text-right">{t("الصنف", "Item")}</th>
            <th className="px-2 py-1.5 text-center">{t("فتح", "Open")}</th>
            <th className="px-2 py-1.5 text-center">{t("وارد", "Recv")}</th>
            <th className="px-2 py-1.5 text-center">{t("مستهلك", "Used")}</th>
            <th className="px-2 py-1.5 text-center">{t("هدر", "Waste")}</th>
            <th className="px-2 py-1.5 text-center">{t("تحويلات", "Xfer")}</th>
            <th className="px-2 py-1.5 text-center">{t("متوقع", "Exp.")}</th>
            <th className="px-2 py-1.5 text-center">{t("فعلي", "Act.")}</th>
            <th className="px-2 py-1.5 text-center">{t("فرق", "Var")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
          {items.map((it: any, k: number) => {
            const flagged =
              it.status === "flagged" || it.equationMatch === false;
            const vq = typeof it.varianceQty === "number" ? it.varianceQty : 0;
            return (
              <tr
                key={it.itemId ?? k}
                className={flagged ? "bg-red-50/40" : ""}
              >
                <td className="px-2 py-1.5 font-semibold text-gray-700">
                  {it.itemName ?? it.name ?? "—"}
                  {it.unit ? (
                    <span className="text-gray-400 font-normal">
                      {" "}
                      ({it.unit})
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-1.5 text-center font-mono">
                  {q(it.opening)}
                </td>
                <td className="px-2 py-1.5 text-center font-mono text-emerald-700">
                  {q(it.received)}
                </td>
                <td className="px-2 py-1.5 text-center font-mono">
                  {q(it.consumed)}
                </td>
                <td className="px-2 py-1.5 text-center font-mono text-rose-600">
                  {q(it.waste)}
                </td>
                <td className="px-2 py-1.5 text-center font-mono text-blue-700">
                  {q(it.transfers)}
                </td>
                <td className="px-2 py-1.5 text-center font-mono text-indigo-700">
                  {q(it.expectedClosing ?? it.expectedQty)}
                </td>
                <td className="px-2 py-1.5 text-center font-mono">
                  {q(it.actualClosing ?? it.actualQty)}
                </td>
                <td
                  className={`px-2 py-1.5 text-center font-mono font-bold ${vq > 0 ? "text-red-600" : vq < 0 ? "text-emerald-600" : "text-gray-400"}`}
                >
                  {q(it.varianceQty)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {typeof totalVarVal === "number" && (
        <p className="text-[11px] text-gray-600 mt-2 text-left">
          {t("إجمالي قيمة الفرق:", "Total variance value:")}{" "}
          <span className="font-mono font-bold text-red-700">
            {fmtAmt(Math.abs(totalVarVal) / 100)} {t("ر.س", "SAR")}
          </span>
        </p>
      )}
    </div>
  );
}

export function AccInventory({
  navigate,
  ops,
  approveOp,
  rejectOp,
  setModal,
  setDetailId,
  bulkApprove,
}: PageProps) {
  const { t, lang, dir } = useLang();
  const en = lang === "en";
  const { data: inventoryApi } = usePlatformInventory();
  const exportInvMut = useExportInventory();
  const saveDailyVarMut = useSaveDailyVarianceAllocation();
  // GET /accountant/inventory → { branches:[{branchName, branchId, items[], …}], summary }.
  // Derive the branch list + a name→items map + name→id map from the real array (the
  // module-level BRANCHES is empty, which is why the review used to show zero branches).
  const invBranchesArr: any[] = Array.isArray((inventoryApi as any)?.branches)
    ? (inventoryApi as any).branches
    : [];
  const branchNames: string[] = invBranchesArr.length
    ? invBranchesArr.map((b) => String(b?.branchName ?? "—"))
    : BRANCHES;
  const branchIdByName: Record<string, string> = Object.fromEntries(
    invBranchesArr.map((b) => [
      String(b?.branchName ?? ""),
      String(b?.branchId ?? ""),
    ]),
  );
  const apiBranchInventory: Record<string, any[]> = Object.fromEntries(
    invBranchesArr.map((b) => [
      String(b?.branchName ?? ""),
      Array.isArray(b?.items) ? b.items : [],
    ]),
  );
  const EFFECTIVE_INV_BRANCH_DATA = (
    invBranchesArr.length > 0 ? apiBranchInventory : INV_BRANCH_DATA
  ) as typeof INV_BRANCH_DATA;
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [dailyBranch, setDailyBranch] = useState<string | null>(null);
  const [invType, setInvType] = useState<"monthly" | "daily">("monthly");
  const [flaggedBranches, setFlaggedBranches] = useState<Set<string>>(
    new Set(),
  );
  const [branchConfirmed, setBranchConfirmed] = useState<Set<string>>(
    new Set(),
  );
  const [sentToConfirm, setSentToConfirm] = useState<Set<string>>(new Set());

  const toggleFlagged = (b: string) =>
    setFlaggedBranches((p) => {
      const s = new Set(p);
      s.has(b) ? s.delete(b) : s.add(b);
      return s;
    });
  const toggleConfirm = (b: string) =>
    setBranchConfirmed((p) => {
      const s = new Set(p);
      s.has(b) ? s.delete(b) : s.add(b);
      return s;
    });
  const sendConfirm = (b: string) =>
    setSentToConfirm((p) => new Set([...p, b]));

  /* ── Per-item flagging (monthly: accountant doubts specific items) ── */
  const [flaggedItems, setFlaggedItems] = useState<Record<string, number[]>>(
    {},
  );
  const [sentItemsBranch, setSentItemsBranch] = useState<Set<string>>(
    new Set(),
  );
  const toggleFlagItem = (branch: string, idx: number) =>
    setFlaggedItems((p) => {
      const cur = p[branch] || [];
      return {
        ...p,
        [branch]: cur.includes(idx)
          ? cur.filter((i) => i !== idx)
          : [...cur, idx],
      };
    });
  const sendFlaggedItems = (branch: string) =>
    setSentItemsBranch((p) => new Set([...p, branch]));

  /* ── Daily inventory — multi-employee variance assignment (per branch) ── */
  type DVEmp = { empId: string; empName: string; amount: string };
  const FALLBACK_INV_EMP: Record<string, string> = {
    "1001": "أحمد الشمري",
    "1002": "محمد العبدلي",
    "1003": "خالد النجار",
    "1004": "سعد الغامدي",
    "1005": "عبدالرحمن السيف",
    "1006": "فيصل الحربي",
  };
  const apiInvEmp = (inventoryApi as any)?.employees;
  const INV_EMP: Record<string, string> = (
    apiInvEmp && Object.keys(apiInvEmp).length > 0
      ? apiInvEmp
      : FALLBACK_INV_EMP
  ) as any;
  const [dailyVarEmps, setDailyVarEmps] = useState<Record<string, DVEmp[]>>({});
  const getDailyEmps = (b: string): DVEmp[] =>
    dailyVarEmps[b] || [{ empId: "", empName: "", amount: "" }];
  const setDailyEmps = (b: string, fn: (p: DVEmp[]) => DVEmp[]) =>
    setDailyVarEmps((p) => ({ ...p, [b]: fn(getDailyEmps(b)) }));
  const setDailyEmpField = (
    b: string,
    i: number,
    field: keyof DVEmp,
    val: string,
  ) =>
    setDailyEmps(b, (p) =>
      p.map((e, j) =>
        j === i
          ? {
              ...e,
              [field]: val,
              ...(field === "empId" ? { empName: INV_EMP[val] || "" } : {}),
            }
          : e,
      ),
    );

  const invOps = ops.filter((o) => o.moduleKey === "inventory");
  const pendingInv = invOps.filter((o) => o.status === "pending");

  // Real inventory export (T07 §10) — branch-scoped when a branch id is supplied.
  const exportExcel = (branch?: string) =>
    exportInvMut.mutate(branch ? { branchId: branch } : {});

  // Count anomalies across all branches (change > 200% or < -50%)
  const anomalyCount = (
    Object.values(EFFECTIVE_INV_BRANCH_DATA).flat() as any[]
  ).filter((it: any) => {
    if (it.prev === 0) return false;
    const pct = ((it.curr - it.prev) / it.prev) * 100;
    return Math.abs(pct) > 100;
  }).length;

  // Which branches submitted inventory ops
  const branchesWithOps = [...new Set(invOps.map((o) => o.branch))];

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {t("موديول المخزون", "Inventory Module")}
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {t(
              "مراجعة الجرد اليومي والشهري لكل فرع — مقارنة ومعادلة مخزون",
              "Review daily and monthly inventory per branch — comparison and reconciliation",
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => exportExcel()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all"
          >
            <FileText size={12} /> Excel — كل المطاعم
          </button>
          <Btn
            variant="primary"
            size="sm"
            onClick={() => navigate("acc-inventory-items")}
          >
            <Package size={13} />{" "}
            {t("تحديد أصناف الجرد", "Select Inventory Items")}
          </Btn>
        </div>
      </div>

      {/* Brand/Restaurant search + Daily/Monthly toggle */}
      <div
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
        dir={dir}
      >
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              بحث بالمطعم أو البراند
            </label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input
                placeholder="اسم المطعم أو العلامة التجارية..."
                className="flex-1 text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              العلامة التجارية
            </label>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {["الكل"].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              نوع الجرد
            </label>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(
                [
                  ["monthly", "الجرد الشهري"],
                  ["daily", "الجرد اليومي"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setInvType(val)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${invType === val ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="بيانات الجرد المرفوعة"
          value={String(invOps.length)}
          sub="كل الفروع"
          icon={<Package size={18} className="text-amber-600" />}
          accent="amber"
        />
        <KpiCard
          label="قيد المراجعة"
          value={String(pendingInv.length)}
          sub="رُفعت من الفروع"
          icon={<Clock size={18} className="text-amber-600" />}
          accent="amber"
        />
        <KpiCard
          label="تنبيهات شذوذ"
          value={String(anomalyCount)}
          sub="تغيير > 100% عن الشهر السابق"
          icon={<AlertTriangle size={18} className="text-red-600" />}
          accent="red"
        />
        <KpiCard
          label="فروع مكتملة"
          value={String(branchesWithOps.length)}
          sub={`من أصل ${BRANCHES.length} فروع`}
          icon={<CheckCircle2 size={18} className="text-emerald-600" />}
          accent="emerald"
        />
      </div>

      {/* Branch-level inventory rows — Monthly or Daily view */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              {invType === "monthly"
                ? "الجرد الشهري — مقارنة الشهر الحالي بالسابق"
                : "الجرد اليومي — معادلة الجرد المخزوني"}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {invType === "monthly"
                ? "موافقة · رفض · تعليم · إرسال تأكيد لمدير الفرع"
                : "رصيد الفتح + مشتريات − مبيعات ± تحويلات − هدر = رصيد الإغلاق"}
            </p>
          </div>
        </div>
        {branchNames.slice(0, 8).map((branch, bi) => {
          const branchOp = invOps.find((o) => o.branch === branch);
          const items = (EFFECTIVE_INV_BRANCH_DATA as any)[branch] || [];
          const isExpanded = expandedBranch === branch;
          const isDailyOpen = dailyBranch === branch;
          const isFlagged = flaggedBranches.has(branch);
          const isConfirmed = branchConfirmed.has(branch);
          const isSent = sentToConfirm.has(branch);
          const branchAnomalies = items.filter((it: any) => {
            if (it.prev === 0) return false;
            return Math.abs(((it.curr - it.prev) / it.prev) * 100) > 100;
          });
          return (
            <div key={bi} className="border-b border-gray-100 last:border-0">
              {/* Branch row */}
              <div className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">
                      {branch}
                    </span>
                    {branchAnomalies.length > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">
                        ⚠ {branchAnomalies.length} شذوذ
                      </span>
                    )}
                    {branchOp && (
                      <Badge className={STATUS_CFG[branchOp.status].cls}>
                        {en
                          ? EN_STATUS_CFG[branchOp.status] ||
                            STATUS_CFG[branchOp.status].label
                          : STATUS_CFG[branchOp.status].label}
                      </Badge>
                    )}
                    {!branchOp && (
                      <Badge className="bg-gray-100 text-gray-500">
                        {t("لم يُرفع بعد", "Not submitted yet")}
                      </Badge>
                    )}
                    {/* Monthly: flagged/confirmed indicators */}
                    {invType === "monthly" && isFlagged && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold border border-purple-200 flex items-center gap-0.5">
                        🚩 علّمه المحاسب
                      </span>
                    )}
                    {invType === "monthly" && isConfirmed && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200 flex items-center gap-0.5">
                        ✅ أكّده مدير الفرع
                      </span>
                    )}
                    {invType === "monthly" && isSent && !isConfirmed && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                        📤 إشعار أُرسل
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {items.length} صنف · أُرسل {branchOp?.timeAgo || "—"}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    onClick={() => exportExcel(branch)}
                    title={`تحميل Excel لـ ${branch}`}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all flex items-center gap-1"
                  >
                    <FileText size={10} /> Excel
                  </button>
                  <Btn
                    size="sm"
                    onClick={() =>
                      setExpandedBranch(isExpanded ? null : branch)
                    }
                  >
                    {isExpanded ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}{" "}
                    الأصناف
                  </Btn>
                  {invType === "daily" && (
                    <Btn
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        setDailyBranch(isDailyOpen ? null : branch)
                      }
                    >
                      <RefreshCw size={12} /> معادلة الجرد
                    </Btn>
                  )}
                  {invType === "monthly" &&
                    (() => {
                      const bFlagged = flaggedItems[branch] || [];
                      const bSent = sentItemsBranch.has(branch);
                      return (
                        <>
                          <button
                            onClick={() => toggleFlagged(branch)}
                            title={
                              isFlagged
                                ? "إلغاء التعليم"
                                : "تعليم بواسطة المحاسب"
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${isFlagged ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-purple-50"}`}
                          >
                            🚩 {isFlagged ? "مُعلَّم" : "تعليم"}
                          </button>
                          {bFlagged.length > 0 && !bSent && (
                            <Btn
                              size="sm"
                              onClick={() => sendFlaggedItems(branch)}
                            >
                              <Send size={11} /> إرسال تأكيد ({bFlagged.length}{" "}
                              أصناف)
                            </Btn>
                          )}
                          {bSent && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg border border-amber-200 font-semibold">
                              📤 أُرسل (
                              {sentItemsBranch.has(branch)
                                ? (flaggedItems[branch] || []).length
                                : 0}{" "}
                              أصناف)
                            </span>
                          )}
                          <button
                            onClick={() => toggleConfirm(branch)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${isConfirmed ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-emerald-50"}`}
                          >
                            <CheckCircle2 size={11} />{" "}
                            {isConfirmed ? "أكّده الفرع" : "تسجيل تأكيد"}
                          </button>
                        </>
                      );
                    })()}
                  {branchOp?.status === "pending" && (
                    <>
                      <Btn
                        size="sm"
                        variant="success"
                        onClick={() => approveOp(branchOp.id)}
                      >
                        <ThumbsUp size={12} />
                      </Btn>
                      <Btn
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setDetailId(branchOp.id);
                          setModal("reject");
                        }}
                      >
                        <ThumbsDown size={12} />
                      </Btn>
                    </>
                  )}
                </div>
              </div>

              {/* Inventory items drill-down — month comparison + anomaly detection */}
              {isExpanded && items.length > 0 && (
                <div className="px-5 pb-4 bg-gray-50/50">
                  <table
                    className="w-full border border-gray-100 rounded-xl overflow-hidden text-xs mt-2"
                    dir={dir}
                  >
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-right">الصنف</th>
                        <th className="px-3 py-2 text-center">الفئة</th>
                        <th className="px-3 py-2 text-center">الشهر السابق</th>
                        <th className="px-3 py-2 text-center">الشهر الحالي</th>
                        <th className="px-3 py-2 text-center">الفرق</th>
                        <th className="px-3 py-2 text-center">الحالة</th>
                        {invType === "monthly" && (
                          <th className="px-3 py-2 text-center bg-amber-50/60 text-amber-700">
                            🚩 شك
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {items.map((it: any, j: number) => {
                        const diff = it.curr - it.prev;
                        const pct =
                          it.prev > 0 ? Math.round((diff / it.prev) * 100) : 0;
                        const isAnomaly = Math.abs(pct) > 100;
                        const isFlaggedItem = (
                          flaggedItems[branch] || []
                        ).includes(j);
                        return (
                          <tr
                            key={j}
                            className={`${isAnomaly ? "bg-red-50/40" : ""} ${isFlaggedItem ? "bg-amber-50/30" : ""}`}
                          >
                            <td className="px-3 py-2 font-semibold text-gray-800">
                              {it.item}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-500">
                              {it.cat}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-gray-500">
                              {it.prev} {it.unit}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-gray-800">
                              {it.curr} {it.unit}
                            </td>
                            <td
                              className={`px-3 py-2 text-center font-mono font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-gray-400"}`}
                            >
                              {diff > 0 ? "+" : ""}
                              {diff} ({pct > 0 ? "+" : ""}
                              {pct}%)
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isAnomaly ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">
                                  ⚠ شذوذ محتمل
                                </span>
                              ) : (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                                  طبيعي
                                </span>
                              )}
                            </td>
                            {invType === "monthly" && (
                              <td className="px-3 py-2 text-center bg-amber-50/20">
                                <button
                                  onClick={() => toggleFlagItem(branch, j)}
                                  title={
                                    isFlaggedItem
                                      ? "إلغاء التعليم"
                                      : "علّم هذا الصنف للتأكيد"
                                  }
                                  className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all text-sm ${
                                    isFlaggedItem
                                      ? "bg-amber-500 text-white shadow-sm"
                                      : "border-2 border-dashed border-gray-300 text-gray-300 hover:border-amber-400 hover:text-amber-400"
                                  }`}
                                >
                                  🚩
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {branchAnomalies.length > 0 && (
                    <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                      <p className="text-xs text-red-700 font-semibold">
                        ⚠ تنبيه شذوذ — {branchAnomalies.length} أصناف تجاوزت
                        100% تغيير عن الشهر السابق. يُوصى بالمراجعة قبل
                        الموافقة.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Daily inventory formula — only in daily mode */}
              {isDailyOpen &&
                invType === "daily" &&
                (() => {
                  const DEFICIT = 360;
                  const ACTUAL = 6340;
                  const empList = getDailyEmps(branch);
                  const assignedTotal = empList.reduce(
                    (s, e) => s + (parseFloat(e.amount) || 0),
                    0,
                  );
                  const remaining = DEFICIT - assignedTotal;
                  return (
                    <div className="px-5 pb-4 bg-indigo-50/30">
                      <p className="text-[11px] font-bold text-indigo-700 mb-2 pt-2">
                        {t(
                          "معادلة الجرد اليومي",
                          "Daily Inventory Reconciliation",
                        )}{" "}
                        — {branch}
                      </p>
                      <div
                        className="bg-white rounded-xl border border-indigo-100 p-4"
                        dir={dir}
                      >
                        <DailyInvEquation
                          branchId={
                            branchIdByName[branch] || branchOp?.branchId
                          }
                          date={
                            branchOp?.operationDate
                              ? String(branchOp.operationDate).slice(0, 10)
                              : undefined
                          }
                        />

                        {/* Multi-employee variance assignment */}
                        <div className="mt-4 pt-3 border-t border-indigo-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-gray-700">
                              تحميل العجز على الموظفين
                            </p>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${remaining === 0 ? "bg-emerald-100 text-emerald-700" : remaining < 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              {remaining === 0
                                ? "متوازن"
                                : remaining > 0
                                  ? `متبقٍّ: ${fmtAmt(remaining)} ر.س`
                                  : `زيادة: ${fmtAmt(Math.abs(remaining))} ر.س`}
                            </span>
                          </div>

                          {/* Pre-reported from branch manager (read-only) */}
                          <div className="mb-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                            <p className="text-[10px] text-blue-600 font-semibold mb-1">
                              📋 ورد من مدير الفرع
                            </p>
                            <div className="flex items-center justify-between text-xs text-blue-800 bg-white/70 px-2 py-1 rounded-lg">
                              <span>خالد النجار (1003)</span>
                              <span className="font-mono font-bold">
                                −220 ر.س
                              </span>
                            </div>
                          </div>

                          {/* Editable employee rows */}
                          <div className="space-y-2">
                            {empList.map((emp, ei) => (
                              <div key={ei} className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-rose-700">
                                  {ei + 1}
                                </div>
                                <input
                                  value={emp.empId}
                                  onChange={(e) =>
                                    setDailyEmpField(
                                      branch,
                                      ei,
                                      "empId",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="رقم الموظف"
                                  className="w-28 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-center font-mono"
                                />
                                <input
                                  value={emp.empName}
                                  readOnly
                                  placeholder="الاسم تلقائياً"
                                  className="flex-1 text-xs border border-gray-100 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-600"
                                />
                                <input
                                  value={emp.amount}
                                  onChange={(e) =>
                                    setDailyEmpField(
                                      branch,
                                      ei,
                                      "amount",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="المبلغ"
                                  type="number"
                                  className="w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-center font-mono"
                                />
                                <span className="text-[10px] text-gray-400 flex-shrink-0">
                                  ر.س
                                </span>
                                {empList.length > 1 && (
                                  <button
                                    onClick={() =>
                                      setDailyEmps(branch, (p) =>
                                        p.filter((_, j) => j !== ei),
                                      )
                                    }
                                    className="text-gray-300 hover:text-red-400 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                                {ei === empList.length - 1 && remaining > 0 && (
                                  <button
                                    onClick={() =>
                                      setDailyEmpField(
                                        branch,
                                        ei,
                                        "amount",
                                        String(remaining),
                                      )
                                    }
                                    title="تعبئة المتبقي"
                                    className="text-[10px] px-1.5 py-1 bg-rose-100 text-rose-600 rounded font-bold hover:bg-rose-200 flex-shrink-0"
                                  >
                                    ⚡
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() =>
                                setDailyEmps(branch, (p) => [
                                  ...p,
                                  { empId: "", empName: "", amount: "" },
                                ])
                              }
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                            >
                              <Plus size={11} /> إضافة موظف آخر
                            </button>
                            <div className="flex-1" />
                            <Btn
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                const targetBranchId =
                                  branchIdByName[branch] || branchOp?.branchId;
                                const targetDate = branchOp?.operationDate
                                  ? String(branchOp.operationDate).slice(0, 10)
                                  : new Date().toISOString().slice(0, 10);
                                if (!targetBranchId) return;
                                saveDailyVarMut.mutate({
                                  branchId: targetBranchId,
                                  payload: {
                                    date: targetDate,
                                    items: [
                                      {
                                        itemId: "daily-deficit",
                                        allocations: empList
                                          .filter((e) => e.empId && e.amount)
                                          .map((e) => ({
                                            empNumber: e.empId,
                                            qty: parseFloat(e.amount) || 0,
                                          })),
                                      },
                                    ],
                                  },
                                });
                              }}
                              disabled={
                                remaining !== 0 ||
                                !(
                                  branchIdByName[branch] || branchOp?.branchId
                                ) ||
                                saveDailyVarMut.isPending
                              }
                              className={
                                remaining !== 0 ||
                                !(branchIdByName[branch] || branchOp?.branchId)
                                  ? "opacity-40 cursor-not-allowed"
                                  : ""
                              }
                            >
                              {saveDailyVarMut.isPending
                                ? t("جارٍ الحفظ...", "Saving...")
                                : t("تأكيد التحميل", "Confirm Allocation")}
                            </Btn>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
