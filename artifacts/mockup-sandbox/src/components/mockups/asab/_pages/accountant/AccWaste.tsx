import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Eye,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Check,
  Plus,
  Clock,
  Trash2,
  Users,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
} from "lucide-react";
import {
  usePlatformWaste,
  useExportWaste,
  useApproveWaste,
  useRejectWaste,
  useBulkApproveWaste,
  usePatchWasteProduct,
  usePutWasteAllocations,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import { BRANCHES } from "../../_shared/filterOps";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { KpiCard } from "../../components/KpiCard";
import type { PageProps } from "../../_shared/types";

export function AccWaste({}: PageProps) {
  const { t, lang, dir } = useLang();
  const { data: apiWaste } = usePlatformWaste();
  const exportWasteMut = useExportWaste();
  // T07 real mutations — same handlers as the company surface; keyed by entry id + product index.
  const approveWasteMut = useApproveWaste();
  const rejectWasteMut = useRejectWaste();
  const bulkWasteMut = useBulkApproveWaste();
  const patchProductMut = usePatchWasteProduct();
  const putAllocsMut = usePutWasteAllocations();
  type WasteClass = "هدر" | "تالف";
  type Resp = "موظف" | "مطعم";
  type EmpAlloc = { empId: string; empName: string; amount: string };
  interface WasteProduct {
    name: string;
    qty: number;
    unit: string;
    unitPrice: number;
    class_: WasteClass;
    resp: Resp;
    hasImg: boolean;
    empAllocs: EmpAlloc[];
  }
  interface WasteEntry {
    id: string;
    branch: string;
    date: string;
    status: "pending" | "approved" | "rejected";
    products: WasteProduct[];
  }

  const WASTE_EMP: Record<string, string> = {
    "1001": "أحمد العمري",
    "1002": "سارة الزهراني",
    "1003": "فهد القحطاني",
    "1004": "نورة المطيري",
    "1005": "خالد السالم",
    "1006": "طارق الرشيدي",
  };

  const [filterBranch, setFilterBranch] = useState("الكل");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedProd, setExpandedProd] = useState<
    Record<string, number | null>
  >({});

  // Waste entries come from the platform API; empty until the backend returns them (no static seed).
  const apiWasteList = (apiWaste as any)?.data ?? (apiWaste as any);
  const [entries, setEntries] = useState<WasteEntry[]>([]);
  useEffect(() => {
    if (!Array.isArray(apiWasteList)) return;
    // Normalize each product to the internal shape. The canonical payload carries
    // `value` (loss value in halalas) + `classification`/`responsibility` and NO
    // `unitPrice`/`class_`/`resp`, so derive a per-unit price such that
    // qty×unitPrice === value/100 (SAR) — this keeps every existing qty×unitPrice
    // total/display correct without touching the dozen call-sites.
    const mapped: WasteEntry[] = apiWasteList.map((e: any) => ({
      ...e,
      // GET /accountant/waste now sends branchName (+ brandName); the row shape
      // keys the label as `branch`, so map it — never fall back to a raw id.
      branch: e?.branchName ?? e?.branch ?? "—",
      products: (e?.products ?? []).map((p: any) => {
        const valueSar = p?.value != null ? p.value / 100 : undefined;
        const qty = typeof p?.qty === "number" ? p.qty : Number(p?.qty) || 0;
        const unitPrice =
          typeof p?.unitPrice === "number"
            ? p.unitPrice
            : valueSar != null
              ? qty
                ? valueSar / qty
                : valueSar
              : 0;
        return {
          name: p?.name ?? "—",
          qty,
          unit: p?.unit ?? "",
          unitPrice,
          class_: (p?.class_ ?? p?.classification ?? "هدر") as WasteClass,
          resp: (p?.resp ?? p?.responsibility ?? "مطعم") as Resp,
          hasImg: p?.hasImg ?? false,
          empAllocs: Array.isArray(p?.empAllocs) ? p.empAllocs : [],
        };
      }),
    }));
    setEntries(mapped);
  }, [apiWasteList]);

  const updProd = (
    eid: string,
    pi: number,
    fn: (p: WasteProduct) => WasteProduct,
  ) =>
    setEntries((prev) =>
      prev.map((e) =>
        e.id === eid
          ? { ...e, products: e.products.map((p, i) => (i === pi ? fn(p) : p)) }
          : e,
      ),
    );

  const toggleClass = (eid: string, pi: number) => {
    const next =
      entries.find((e) => e.id === eid)?.products[pi]?.class_ === "هدر"
        ? "تالف"
        : "هدر";
    updProd(eid, pi, (p) => ({ ...p, class_: next as WasteClass }));
    patchProductMut.mutate({
      entryId: eid,
      productIdx: pi,
      patch: { classification: next },
    });
  };
  const toggleResp = (eid: string, pi: number) => {
    const next =
      entries.find((e) => e.id === eid)?.products[pi]?.resp === "موظف"
        ? "مطعم"
        : "موظف";
    updProd(eid, pi, (p) => ({ ...p, resp: next as Resp }));
    patchProductMut.mutate({
      entryId: eid,
      productIdx: pi,
      patch: { responsibility: next },
    });
  };

  // Persist a product's allocations to the server (empNumber + amountHalalas).
  const persistAllocs = (eid: string, pi: number) => {
    const prod = entries.find((e) => e.id === eid)?.products[pi];
    if (!prod) return;
    putAllocsMut.mutate({
      entryId: eid,
      productIdx: pi,
      empAllocs: prod.empAllocs
        .filter((a) => a.empId && a.amount)
        .map((a) => ({
          empNumber: a.empId,
          amountHalalas: Math.round((parseFloat(a.amount) || 0) * 100),
        })),
    });
  };
  const setAllocField = (
    eid: string,
    pi: number,
    ai: number,
    field: keyof EmpAlloc,
    val: string,
  ) => {
    let nextAllocs: EmpAlloc[] = [];
    updProd(eid, pi, (p) => {
      nextAllocs = p.empAllocs.map((a, k) =>
        k === ai
          ? {
              ...a,
              [field]: val,
              ...(field === "empId" ? { empName: WASTE_EMP[val] || "" } : {}),
            }
          : a,
      );
      return { ...p, empAllocs: nextAllocs };
    });
    // Persist the freshly-computed set (server resolves empNumber, sums to product value).
    putAllocsMut.mutate({
      entryId: eid,
      productIdx: pi,
      empAllocs: nextAllocs
        .filter((a) => a.empId && a.amount)
        .map((a) => ({
          empNumber: a.empId,
          amountHalalas: Math.round((parseFloat(a.amount) || 0) * 100),
        })),
    });
  };
  const addAlloc = (eid: string, pi: number) =>
    updProd(eid, pi, (p) => ({
      ...p,
      empAllocs: [...p.empAllocs, { empId: "", empName: "", amount: "" }],
    }));
  const removeAlloc = (eid: string, pi: number, ai: number) => {
    let nextAllocs: EmpAlloc[] = [];
    updProd(eid, pi, (p) => {
      nextAllocs = p.empAllocs.filter((_, k) => k !== ai);
      return { ...p, empAllocs: nextAllocs };
    });
    putAllocsMut.mutate({
      entryId: eid,
      productIdx: pi,
      empAllocs: nextAllocs
        .filter((a) => a.empId && a.amount)
        .map((a) => ({
          empNumber: a.empId,
          amountHalalas: Math.round((parseFloat(a.amount) || 0) * 100),
        })),
    });
  };

  const approve = (id: string) => {
    setEntries((p) =>
      p.map((e) => (e.id === id ? { ...e, status: "approved" as const } : e)),
    );
    approveWasteMut.mutate(id);
  };
  const reject = (id: string) => {
    setEntries((p) =>
      p.map((e) => (e.id === id ? { ...e, status: "rejected" as const } : e)),
    );
    rejectWasteMut.mutate({ entryId: id, reason: "تحتاج مراجعة" });
  };

  const pending = entries.filter((e) => e.status === "pending");
  const approved = entries.filter((e) => e.status === "approved");
  const displayed =
    filterBranch === "الكل"
      ? entries
      : entries.filter((e) => e.branch === filterBranch);
  const displayedPending = displayed.filter((e) => e.status === "pending");
  const WASTE_BRANCHES = [...new Set(entries.map((e) => e.branch))];

  const totalWasteAmt = entries
    .flatMap((e) => e.products)
    .reduce((s, p) => s + p.qty * p.unitPrice, 0);
  const empChargedAmt = entries
    .flatMap((e) => e.products)
    .filter((p) => p.resp === "موظف")
    .flatMap((p) => p.empAllocs)
    .reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

  const approveAllDisplayed = () => {
    const ids = displayedPending.map((e) => e.id);
    const idSet = new Set(ids);
    setEntries((p) =>
      p.map((e) =>
        idSet.has(e.id) ? { ...e, status: "approved" as const } : e,
      ),
    );
    bulkWasteMut.mutate({ entryIds: ids });
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            موديول الهدر والتالف
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            مراجعة بيانات الهدر — تعديل التصنيف والقيمة المالية وتوزيع التحميل
            على الموظفين
          </p>
        </div>
        {displayedPending.length > 0 && (
          <Btn variant="success" size="sm" onClick={approveAllDisplayed}>
            <CheckCircle2 size={12} />
            {filterBranch === "الكل"
              ? `موافقة على الكل (${displayedPending.length})`
              : `موافقة على ${filterBranch} (${displayedPending.length})`}
          </Btn>
        )}
      </div>

      {/* Filters: brand dropdown + Excel + chips */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">
              بحث بالفرع أو المطعم
            </label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input
                placeholder="اسم الفرع أو المطعم..."
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
          <div className="flex items-end">
            <button
              onClick={() => exportWasteMut.mutate({})}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold hover:bg-emerald-100 transition-all"
            >
              <FileText size={13} /> تصدير Excel
            </button>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 mb-2">
            تصفية حسب الفرع
          </p>
          <div className="flex flex-wrap gap-2">
            {["الكل", ...WASTE_BRANCHES].map((b) => {
              const bPend =
                b === "الكل"
                  ? pending.length
                  : entries.filter(
                      (e) => e.branch === b && e.status === "pending",
                    ).length;
              return (
                <button
                  key={b}
                  onClick={() => setFilterBranch(b)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${filterBranch === b ? "bg-purple-600 text-white border-purple-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600"}`}
                >
                  {b}
                  {bPend > 0 && (
                    <span
                      className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${filterBranch === b ? "bg-white text-purple-700" : "bg-amber-500 text-white"}`}
                    >
                      {bPend}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {displayed.length} بيان
            {filterBranch !== "الكل" ? ` — ${filterBranch}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="بانتظار المراجعة"
          value={String(pending.length)}
          sub="من الفروع"
          icon={<Clock size={18} className="text-amber-600" />}
          accent="amber"
        />
        <KpiCard
          label="معتمد"
          value={String(approved.length)}
          sub="هذا الشهر"
          icon={<CheckCircle2 size={18} className="text-emerald-600" />}
          accent="emerald"
        />
        <KpiCard
          label="إجمالي الخسائر"
          value={`${fmtAmt(totalWasteAmt)} ر.س`}
          sub="هدر + تالف"
          icon={<Trash2 size={18} className="text-rose-600" />}
          accent="red"
        />
        <KpiCard
          label="محمَّل على الموظفين"
          value={`${fmtAmt(empChargedAmt)} ر.س`}
          sub="مُعيَّن فعلياً"
          icon={<Users size={18} className="text-orange-600" />}
          accent="orange"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">
            بيانات الهدر والتالف
          </h3>
          <span className="text-xs text-gray-400">
            {displayed.length} بيان — اضغط لعرض المنتجات والتحميل
          </span>
        </div>
        {displayed.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const entryTotal = entry.products.reduce(
            (s, p) => s + p.qty * p.unitPrice,
            0,
          );
          const empTotal = entry.products
            .filter((p) => p.resp === "موظف")
            .flatMap((p) => p.empAllocs)
            .reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
          const statusCls =
            entry.status === "pending"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : entry.status === "approved"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200";
          const statusLbl =
            entry.status === "pending"
              ? "معلق"
              : entry.status === "approved"
                ? "معتمد"
                : "مرفوض";
          return (
            <div
              key={entry.id}
              className="border-b border-gray-100 last:border-0"
            >
              <div
                className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 cursor-pointer ${isExpanded ? "bg-rose-50/20" : ""}`}
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">
                      {entry.branch}
                    </span>
                    <span className="font-mono text-xs text-rose-600">
                      {entry.id}
                    </span>
                    <Badge className={`${statusCls} text-[10px]`}>
                      {statusLbl}
                    </Badge>
                    <Badge className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px]">
                      {entry.products.length} منتج
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5">
                    <p className="text-xs text-gray-400">{entry.date}</p>
                    <span className="text-xs font-mono font-bold text-rose-700">
                      إجمالي: {fmtAmt(entryTotal)} ر.س
                    </span>
                    {empTotal > 0 && (
                      <span className="text-[10px] text-orange-600 font-semibold">
                        منه على موظفين: {fmtAmt(empTotal)} ر.س
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {entry.status === "pending" && (
                    <>
                      <Btn
                        size="sm"
                        variant="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          approve(entry.id);
                        }}
                      >
                        <ThumbsUp size={12} />
                      </Btn>
                      <Btn
                        size="sm"
                        variant="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          reject(entry.id);
                        }}
                      >
                        <ThumbsDown size={12} />
                      </Btn>
                    </>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp
                    size={14}
                    className="text-gray-400 flex-shrink-0"
                  />
                ) : (
                  <ChevronDown
                    size={14}
                    className="text-gray-400 flex-shrink-0"
                  />
                )}
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 bg-gray-50/40 space-y-3">
                  <p className="text-xs font-bold text-gray-600 mt-3">
                    المنتجات المشمولة — يمكن تعديل التصنيف والمسؤولية وتوزيع
                    التحميل المالي:
                  </p>

                  {entry.products.map((prod, pi) => {
                    const prodValue = prod.qty * prod.unitPrice;
                    const allocTotal = prod.empAllocs.reduce(
                      (s, a) => s + (parseFloat(a.amount) || 0),
                      0,
                    );
                    const remaining = prodValue - allocTotal;
                    const prodKey = `${entry.id}-${pi}`;
                    const isAllocOpen = expandedProd[entry.id] === pi;

                    return (
                      <div
                        key={pi}
                        className={`bg-white rounded-xl border overflow-hidden ${prod.resp === "موظف" ? "border-orange-100" : "border-gray-100"}`}
                      >
                        {/* Product summary row */}
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-800 text-sm">
                                {prod.name}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                {prod.qty} {prod.unit} ×{" "}
                                {fmtAmt(prod.unitPrice)} ر.س
                              </span>
                              <span className="font-mono font-black text-rose-700 text-sm">
                                {fmtAmt(prodValue)} ر.س
                              </span>
                              {prod.hasImg && (
                                <button className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px]">
                                  <Eye size={9} /> صورة
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Class toggle */}
                            {entry.status === "pending" ? (
                              <button
                                onClick={() => toggleClass(entry.id, pi)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${prod.class_ === "تالف" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                              >
                                {prod.class_ === "تالف" ? "🔴 تالف" : "🟡 هدر"}
                              </button>
                            ) : (
                              <Badge
                                className={
                                  prod.class_ === "تالف"
                                    ? "bg-red-50 text-red-700 text-[10px]"
                                    : "bg-amber-50 text-amber-700 text-[10px]"
                                }
                              >
                                {prod.class_}
                              </Badge>
                            )}
                            {/* Resp toggle */}
                            {entry.status === "pending" ? (
                              <button
                                onClick={() => toggleResp(entry.id, pi)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${prod.resp === "موظف" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}
                              >
                                {prod.resp === "موظف" ? "👤 موظف" : "🏪 مطعم"}
                              </button>
                            ) : (
                              <Badge
                                className={
                                  prod.resp === "موظف"
                                    ? "bg-orange-50 text-orange-700 text-[10px]"
                                    : "bg-gray-50 text-gray-600 text-[10px]"
                                }
                              >
                                {prod.resp}
                              </Badge>
                            )}
                            {/* Expand allocation */}
                            {prod.resp === "موظف" && (
                              <button
                                onClick={() =>
                                  setExpandedProd((p) => ({
                                    ...p,
                                    [entry.id]: isAllocOpen ? null : pi,
                                  }))
                                }
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${isAllocOpen ? "bg-orange-100 text-orange-700 border-orange-300" : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"}`}
                              >
                                <Users size={10} /> تحميل مالي
                                {prod.empAllocs.some((a) => a.empId) && (
                                  <span className="bg-orange-500 text-white rounded-full w-3.5 h-3.5 text-[8px] flex items-center justify-center">
                                    {
                                      prod.empAllocs.filter((a) => a.empId)
                                        .length
                                    }
                                  </span>
                                )}
                                {isAllocOpen ? (
                                  <ChevronUp size={9} />
                                ) : (
                                  <ChevronDown size={9} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Employee allocation panel */}
                        {prod.resp === "موظف" && isAllocOpen && (
                          <div className="px-4 pb-4 pt-1 bg-orange-50/40 border-t border-orange-100">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] font-bold text-orange-800">
                                توزيع التحميل المالي — قيمة المنتج:{" "}
                                <span className="font-mono">
                                  {fmtAmt(prodValue)} ر.س
                                </span>
                              </p>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${remaining === 0 ? "bg-emerald-100 text-emerald-700" : remaining < 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                              >
                                {remaining === 0
                                  ? "✅ مكتمل"
                                  : remaining > 0
                                    ? `متبقٍّ: ${fmtAmt(remaining)} ر.س`
                                    : `زيادة: ${fmtAmt(Math.abs(remaining))} ر.س`}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {prod.empAllocs.map((alloc, ai) => (
                                <div
                                  key={ai}
                                  className="flex items-center gap-2"
                                >
                                  <div className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                    {ai + 1}
                                  </div>
                                  <input
                                    value={alloc.empId}
                                    onChange={(e) =>
                                      setAllocField(
                                        entry.id,
                                        pi,
                                        ai,
                                        "empId",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="رقم الموظف"
                                    className="w-24 text-[11px] border border-orange-200 rounded-lg px-2 py-1.5 text-center font-mono bg-white"
                                  />
                                  <input
                                    value={alloc.empName}
                                    readOnly
                                    placeholder="الاسم تلقائياً"
                                    className="flex-1 text-[11px] border border-gray-100 rounded-lg px-2 py-1.5 bg-white/70 text-gray-600"
                                  />
                                  <input
                                    value={alloc.amount}
                                    onChange={(e) =>
                                      setAllocField(
                                        entry.id,
                                        pi,
                                        ai,
                                        "amount",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="المبلغ"
                                    type="number"
                                    className="w-24 text-[11px] border border-orange-200 rounded-lg px-2 py-1.5 text-center font-mono bg-white"
                                  />
                                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                                    ر.س
                                  </span>
                                  {prod.empAllocs.length > 1 && (
                                    <button
                                      onClick={() =>
                                        removeAlloc(entry.id, pi, ai)
                                      }
                                      className="text-gray-300 hover:text-red-400"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                  {ai === prod.empAllocs.length - 1 &&
                                    remaining > 0 && (
                                      <button
                                        onClick={() =>
                                          setAllocField(
                                            entry.id,
                                            pi,
                                            ai,
                                            "amount",
                                            String(remaining),
                                          )
                                        }
                                        title="تعبئة المتبقي"
                                        className="px-1.5 py-1 text-[9px] bg-orange-100 text-orange-700 rounded font-bold hover:bg-orange-200 flex-shrink-0"
                                      >
                                        ⚡
                                      </button>
                                    )}
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => addAlloc(entry.id, pi)}
                              className="mt-2 inline-flex items-center gap-1 text-[11px] text-orange-600 hover:underline"
                            >
                              <Plus size={10} /> إضافة موظف آخر
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {entry.status === "pending" && (
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                      <p className="text-[11px] text-blue-700 font-medium">
                        💡 <strong>{t("تالف", "Damaged")}</strong> ={" "}
                        {t(
                          "يُحمَّل بالقيمة المالية على الموظف (يمكن توزيعه على أكثر من موظف)",
                          "Charged financially to the employee (can be split across multiple employees)",
                        )}{" "}
                        · <strong>{t("هدر", "Waste")}</strong> ={" "}
                        {t(
                          "خسارة تشغيلية تُحمَّل على المطعم",
                          "Operational loss charged to the restaurant",
                        )}
                      </p>
                    </div>
                  )}

                  {/* Entry financial summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">
                        إجمالي الخسائر
                      </p>
                      <p className="font-mono font-black text-rose-700 text-sm">
                        {fmtAmt(entryTotal)} ر.س
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">
                        محمَّل على موظفين
                      </p>
                      <p className="font-mono font-black text-orange-700 text-sm">
                        {fmtAmt(empTotal)} ر.س
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">
                        على المطعم
                      </p>
                      <p className="font-mono font-black text-gray-700 text-sm">
                        {fmtAmt(entryTotal - empTotal)} ر.س
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Branch Waste Comparison */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <BarChart3 size={15} className="text-rose-500" /> مقارنة نسبة الهدر
            بين الفروع
          </h3>
          <span className="text-[11px] text-gray-400">
            نسبة الهدر = إجمالي الهدر ÷ المبيعات المقدّرة
          </span>
        </div>
        <div className="p-5 space-y-3">
          {WASTE_BRANCHES.map((br, i) => {
            const brTotal = entries
              .filter((e) => e.branch === br)
              .reduce(
                (s, e) =>
                  s +
                  e.products.reduce((p, pr) => p + pr.qty * pr.unitPrice, 0),
                0,
              );
            const brSales =
              [1200000, 980000, 750000, 850000, 600000][i] || 700000;
            const pct = Math.round((brTotal / brSales) * 100 * 10) / 10;
            const barColor =
              pct > 3
                ? "bg-red-500"
                : pct > 1.5
                  ? "bg-amber-400"
                  : "bg-emerald-500";
            return (
              <div key={br} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-44 text-right flex-shrink-0 truncate">
                  {br}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${barColor} h-3 rounded-full transition-all`}
                    style={{ width: `${Math.min(pct * 15, 100)}%` }}
                  ></div>
                </div>
                <span
                  className={`text-xs font-bold font-mono w-14 flex-shrink-0 ${pct > 3 ? "text-red-600" : pct > 1.5 ? "text-amber-600" : "text-emerald-600"}`}
                >
                  {pct}%
                </span>
                <span className="text-[10px] text-gray-400 w-28 flex-shrink-0 font-mono">
                  {fmtAmt(brTotal)} ر.س هدر
                </span>
                {pct > 3 && (
                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                    ⚠ مرتفع
                  </span>
                )}
              </div>
            );
          })}
          <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400">
            المعيار المقبول: أقل من 1.5% ✅ · تحذير: 1.5–3% 🟡 · مرتفع: أكثر من
            3% 🔴
          </div>
        </div>
      </div>
    </div>
  );
}
