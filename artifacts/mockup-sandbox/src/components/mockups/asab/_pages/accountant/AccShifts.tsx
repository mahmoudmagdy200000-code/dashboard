import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  Edit3,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  Save,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  TrendingUp,
  Phone,
} from "lucide-react";
import { isApiError } from "../../../../../api/errors";
import {
  useShiftsLive,
  useShiftsHistory,
  useShiftConfigs,
  useSaveShiftConfig,
  useSaveBranchShiftConfig,
  useExportShifts,
} from "../../../../../api/queries";
import { historyBranchOptions, historyPageTarget } from "../../../../../api/queries/shifts";
import {
  formatShiftHalalas,
  formatShiftSalesTotal,
  getShiftCountEvidence,
  getShiftStatusDisplay,
} from "../../shiftCountEvidence";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { Badge } from "../../components/Badge";
import { KpiCard } from "../../components/KpiCard";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { useLang } from "../../_shared/LangContext";
import { fmtAmt } from "../../_shared/formatters";
import { BRANCHES } from "../../_shared/filterOps";
import type { PageProps } from "../../_shared/types";

// ─── Shift Setup Helpers & Types ──────────────────────────────────────────────
const SHIFT_NAMES_AR = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس"];
const S_DUR_OPTS = [4, 6, 8, 10, 12];
const sToMins = (t: string) => { const [h, m] = (t || "00:00").split(":").map(Number); return h * 60 + (m || 0); };
const sAddMins = (t: string, n: number) => { const tot = (sToMins(t) + n + 1440) % 1440; return `${String(Math.floor(tot / 60)).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`; };
const sFmtT = (t: string) => { if (!t || !t.includes(":")) return t; const [h, m] = t.split(":").map(Number); const ap = h < 12 ? "ص" : "م"; const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h; return `${h12}:${String(m).padStart(2, "0")} ${ap}`; };
type ShiftSlot = { name: string; start: string; end: string; durH: number };
type RestShiftCfg = { restId: string; restName: string; useOverride: boolean; numShifts: number; durH: number; firstStart: string; shifts: ShiftSlot[] };
type BrandShiftState = { id: string; name: string; color: string; numShifts: number; durH: number; firstStart: string; openingFloat: number; shifts: ShiftSlot[]; rests: RestShiftCfg[]; saved: boolean };
type ShiftEditState = { idx: number; tmpStart: string; tmpDurH: number } | null;
const sGenShifts = (num: number, dur: number, start: string): ShiftSlot[] =>
  Array.from({ length: num }, (_, i) => { const s = sAddMins(start, i * dur * 60); return { name: SHIFT_NAMES_AR[i], start: s, end: sAddMins(s, dur * 60), durH: dur }; });
// Map a live ShiftConfig (GET /company/me/shifts/configs, scoped to the accountant's
// brands) into the setup screen's brand-state. No per-restaurant endpoint exists, so
// `rests` stays empty and the per-restaurant override section is hidden.
const sMin = (t: string) => { const [h, m] = String(t ?? "").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const sWinDurH = (s: string, e: string) => { let d = sMin(e) - sMin(s); if (d <= 0) d += 1440; return Math.round(d / 60 * 10) / 10; };
const sApiToBrand = (cfg: any): BrandShiftState => {
  const numShifts = cfg?.numShifts ?? (Array.isArray(cfg?.shifts) ? cfg.shifts.length : 3);
  const durH = cfg?.durationHours ?? 8;
  const firstStart = String(cfg?.firstShiftStart ?? "08:00");
  const shifts: ShiftSlot[] = Array.isArray(cfg?.shifts) && cfg.shifts.length
    ? cfg.shifts.map((w: any, i: number) => { const st = String(w?.start ?? firstStart); const en = String(w?.end ?? ""); return { name: String(w?.name ?? SHIFT_NAMES_AR[i] ?? `شفت ${i + 1}`), start: st, end: en, durH: sWinDurH(st, en) || durH }; })
    : sGenShifts(numShifts, durH, firstStart);
  // scope=branch rows key their identity on branch/owner fields; brand rows on brand.
  const id = String(cfg?.branchId ?? cfg?.ownerId ?? cfg?.brandId ?? "");
  const name = String(cfg?.branchName ?? cfg?.ownerName ?? cfg?.brandName ?? id);
  const openingFloat = Number(cfg?.openingFloatHalalas ?? 0) / 100;   // stored halalas → SAR input
  return { id, name, color: "#7c3aed", numShifts, durH, firstStart, openingFloat, shifts, rests: [], saved: true };
};
const sInitBrand = (b: { id: string; name: string; color: string; restaurants: { id: string; name: string; branches: string[] }[] }): BrandShiftState => {
  const p: { [k: string]: { numShifts: number; durH: number; firstStart: string } } = {
    reem: { numShifts: 3, durH: 8, firstStart: "08:00" }, herfy: { numShifts: 2, durH: 10, firstStart: "07:00" },
    mcd: { numShifts: 4, durH: 6, firstStart: "06:00" }, broasted: { numShifts: 1, durH: 8, firstStart: "09:00" },
  };
  const cfg = p[b.id] || { numShifts: 2, durH: 8, firstStart: "08:00" };
  return {
    id: b.id, name: b.name, color: b.color, ...cfg, openingFloat: 0, shifts: sGenShifts(cfg.numShifts, cfg.durH, cfg.firstStart),
    rests: b.restaurants.map(r => ({ restId: r.id, restName: r.name, useOverride: false, ...cfg, shifts: sGenShifts(cfg.numShifts, cfg.durH, cfg.firstStart) })), saved: false
  };
};

// ─── ShiftRow (module-level, no hooks-in-component violation) ─────────────────
export function ShiftRowCmp({ slot, idx, editState, onEditOpen, onEditChange, onEditCommit, onEditCancel }: {
  slot: ShiftSlot; idx: number; editState: ShiftEditState;
  onEditOpen: (idx: number, start: string, dur: number) => void;
  onEditChange: (start: string, dur: number) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
}) {
  const isEditing = editState?.idx === idx;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${isEditing ? "bg-purple-50 border-purple-200 shadow-sm" : "bg-gray-50 border-gray-100 hover:border-gray-200"}`}>
      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center flex-shrink-0">{idx + 1}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-700">الشفت {slot.name}</p>
        {!isEditing
          ? <p className="text-[10px] text-gray-400">{sFmtT(slot.start)} ← {sFmtT(slot.end)} · {slot.durH} ساعة</p>
          : <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <div>
              <label className="text-[9px] text-purple-500 font-semibold block mb-0.5">بداية الشفت</label>
              <input type="time" value={editState!.tmpStart} onChange={e => onEditChange(e.target.value, editState!.tmpDurH)}
                className="text-xs border border-purple-200 rounded-lg px-2 py-1 w-28 font-mono bg-white" />
            </div>
            <div>
              <label className="text-[9px] text-purple-500 font-semibold block mb-0.5">مدة (ساعة)</label>
              {/* Real dropdown + number input for any custom value. */}
              <div className="flex items-center gap-1">
                <select
                  value={S_DUR_OPTS.includes(editState!.tmpDurH) ? String(editState!.tmpDurH) : "__custom"}
                  onChange={e => { if (e.target.value !== "__custom") onEditChange(editState!.tmpStart, Number(e.target.value)); }}
                  className="text-xs border border-purple-200 rounded-lg px-2 py-1 bg-white">
                  {S_DUR_OPTS.map(d => <option key={d} value={d}>{d} ساعة</option>)}
                  {!S_DUR_OPTS.includes(editState!.tmpDurH) && <option value="__custom">{editState!.tmpDurH} ساعة</option>}
                </select>
                <input type="number" min={1} max={24} step={1} value={editState!.tmpDurH} title="كتابة يدوية"
                  onChange={e => onEditChange(editState!.tmpStart, Math.min(24, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-14 text-xs border border-purple-200 rounded-lg px-2 py-1 bg-white text-center font-mono" />
              </div>
            </div>
            <div className="flex gap-1 self-end pb-px">
              <button onClick={onEditCommit} className="px-3 py-1 bg-purple-600 text-white text-[10px] rounded-lg font-bold hover:bg-purple-700">حفظ</button>
              <button onClick={onEditCancel} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] rounded-lg hover:bg-gray-200">إلغاء</button>
            </div>
          </div>
        }
      </div>
      {!isEditing && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-700">{sFmtT(slot.start)}</span>
          <span className="text-gray-300 text-[10px]">→</span>
          <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-700">{sFmtT(slot.end)}</span>
          <button onClick={() => onEditOpen(idx, slot.start, slot.durH)}
            className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 flex items-center justify-center transition-all ml-1">
            <Edit3 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SmartPanel (module-level, pure presentational) ────────────────────────────
export function ShiftSmartPanel({ cfg, onNum, onDur, onStart, onGen }: {
  cfg: { numShifts: number; durH: number; firstStart: string };
  onNum: (n: number) => void; onDur: (d: number) => void; onStart: (s: string) => void; onGen: () => void;
}) {
  return (
    <div className="bg-gradient-to-l from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">⚡</span>
        <p className="text-sm font-bold text-purple-800">الإعداد الذكي للشفتات</p>
        <span className="text-[10px] text-purple-400 mr-auto">يتحدث الجدول تلقائياً عند تغيير القيم</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-[10px] font-bold text-gray-600 block mb-1.5">عدد الشفتات</label>
          <div className="flex items-center gap-1">
            <button onClick={() => onNum(Math.max(1, cfg.numShifts - 1))} className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-lg font-bold select-none">−</button>
            <span className="w-10 h-8 rounded-lg border border-purple-200 bg-white text-center text-sm font-black text-purple-700 flex items-center justify-center">{cfg.numShifts}</span>
            <button onClick={() => onNum(Math.min(5, cfg.numShifts + 1))} className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center text-lg font-bold select-none">+</button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-600 block mb-1.5">مدة كل شفت (ساعة)</label>
          {/* Real dropdown (opens reliably) + a number input for any custom value. */}
          <div className="flex items-center gap-1.5">
            <select
              value={S_DUR_OPTS.includes(cfg.durH) ? String(cfg.durH) : "__custom"}
              onChange={e => { if (e.target.value !== "__custom") onDur(Number(e.target.value)); }}
              className="flex-1 min-w-0 text-xs border border-gray-200 bg-white rounded-lg px-2 py-2">
              {S_DUR_OPTS.map(d => <option key={d} value={d}>{d} ساعة</option>)}
              {!S_DUR_OPTS.includes(cfg.durH) && <option value="__custom">{cfg.durH} ساعة (مخصص)</option>}
            </select>
            <input type="number" min={1} max={24} step={1} value={cfg.durH} title="كتابة يدوية"
              onChange={e => onDur(Math.min(24, Math.max(0, Number(e.target.value) || 0)))}
              className="w-14 text-xs border border-gray-200 bg-white rounded-lg px-2 py-2 text-center" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-600 block mb-1.5">بداية الشفت الأول</label>
          <input type="time" value={cfg.firstStart} onChange={e => onStart(e.target.value)} className="w-full text-xs border border-gray-200 bg-white rounded-lg px-2 py-2 font-mono" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        {(() => {
          const total = cfg.numShifts * cfg.durH;
          const over = total > 24;
          const maxPerShift = Math.floor(24 / Math.max(1, cfg.numShifts));
          return (
            <p className={`text-[10px] ${over ? "text-red-500" : "text-gray-400"}`}>
              {cfg.numShifts} شفت × {cfg.durH}س = <span className={`font-semibold ${over ? "text-red-600" : "text-gray-600"}`}>{total} ساعة/يوم</span>
              {over
                ? <span className="font-bold"> · يتجاوز 24 ساعة — الحد الأقصى {maxPerShift} ساعة/شفت</span>
                : <span> · متبقٍ {24 - total} ساعة · يبدأ {sFmtT(cfg.firstStart)}</span>}
            </p>
          );
        })()}
        <button onClick={onGen} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-all shadow-sm">
          <RefreshCw size={11} /> إعادة التوليد
        </button>
      </div>
    </div>
  );
}

export function AccShifts({ navigate, setModal }: PageProps) {
  const { data: shiftsLive } = useShiftsLive();
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [historyBranchId, setHistoryBranchId] = useState("");
  const [historyPageNum, setHistoryPageNum] = useState(1);
  const historyQuery = useShiftsHistory({ dateFrom: historyDateFrom, dateTo: historyDateTo, branchId: historyBranchId, page: historyPageNum, pageSize: 20 });
  const { data: historyBranchConfigs = [] } = useShiftConfigs("branch");
  const historyBranches = historyBranchOptions(historyBranchConfigs);
  const historyBusy = historyQuery.isPending || historyQuery.isFetching;
  const shiftsHistoryPage = historyQuery.data;
  const historyMeta = historyBusy || historyQuery.isError ? undefined : shiftsHistoryPage?.meta;
  const historyShownPage = historyMeta && Number.isSafeInteger(historyMeta.page) && historyMeta.page > 0 ? historyMeta.page : historyPageNum;
  const changeHistoryPage = (direction: -1 | 1) => {
    const target = historyPageTarget(historyMeta, historyPageNum, direction);
    if (target !== historyPageNum) setHistoryPageNum(target);
  };
  // 2026-08-09 — assign shifts by BRAND or by BRANCH (a branch override wins).
  const [shiftScope, setShiftScope] = useState<"brand" | "branch">("brand");
  const { data: shiftConfigs } = useShiftConfigs(shiftScope);
  const saveShiftCfgMut = useSaveShiftConfig();
  const saveBranchShiftCfgMut = useSaveBranchShiftConfig();
  const exportShiftsMut = useExportShifts();
  const [tab, setTab] = useState<"live" | "setup" | "close" | "history">("live");

  // ─── Shift Setup state ─────────────────────────────────────────────────────
  // Real, accountant-scoped brands from GET /company/me/shifts/configs — no static seed.
  const [brandCfgs, setBrandCfgs] = useState<BrandShiftState[]>([]);
  const [selBrandId, setSelBrandId] = useState("");
  useEffect(() => {
    const list = Array.isArray(shiftConfigs) ? shiftConfigs : [];
    const mapped = list.map(sApiToBrand).filter(b => b.id);
    setBrandCfgs(mapped);
    setSelBrandId(prev => (prev && mapped.some(b => b.id === prev)) ? prev : (mapped[0]?.id ?? ""));
  }, [shiftConfigs]);
  const [expandedRest, setExpandedRest] = useState<string | null>(null);
  const [brandEdit, setBrandEdit] = useState<ShiftEditState>(null);
  const [restEdits, setRestEdits] = useState<Record<string, ShiftEditState>>({});
  const [savedBrand, setSavedBrand] = useState<string | null>(null);
  const [restSearch, setRestSearch] = useState("");

  const selBrand = brandCfgs.find(b => b.id === selBrandId)!;

  const updBrand = (id: string, patch: Partial<BrandShiftState>) =>
    setBrandCfgs(p => p.map(b => b.id === id ? { ...b, ...patch, saved: false } : b));
  const updRest = (brandId: string, restId: string, patch: Partial<RestShiftCfg>) =>
    setBrandCfgs(p => p.map(b => b.id === brandId ? { ...b, rests: b.rests.map(r => r.restId === restId ? { ...r, ...patch } : r) } : b));

  const doAutoGen = (bId: string) => { const b = brandCfgs.find(x => x.id === bId)!; updBrand(bId, { shifts: sGenShifts(b.numShifts, b.durH, b.firstStart) }); setBrandEdit(null); toast.success(`تم إعادة توليد ${b.numShifts} شفت × ${b.durH} ساعة`); };
  const doRestAutoGen = (bId: string, rId: string) => { const r = brandCfgs.find(x => x.id === bId)!.rests.find(x => x.restId === rId)!; updRest(bId, rId, { shifts: sGenShifts(r.numShifts, r.durH, r.firstStart) }); setRestEdits(p => ({ ...p, [rId]: null })); toast.success(`تم إعادة توليد ${r.numShifts} شفت × ${r.durH} ساعة`); };
  const doSave = (bId: string) => {
    const b = brandCfgs.find(x => x.id === bId); if (!b) return;
    // A schedule can't exceed a 24-hour day; the backend rejects it with
    // SHIFT_SCHEDULE_OVERFLOW. Validate client-side so the 4th window never
    // silently wraps onto the 1st ("dashboard 4 shifts, app shows 3").
    if (b.numShifts * b.durH > 24) {
      toast.error(`عدد الورديات (${b.numShifts}) × مدة الوردية (${b.durH} ساعة) = ${b.numShifts * b.durH} ساعة، وهو أكبر من اليوم (24 ساعة).`);
      return;
    }
    const config = { numShifts: b.numShifts, durationHours: b.durH, firstShiftStart: b.firstStart, openingFloatHalalas: Math.round((b.openingFloat || 0) * 100) };
    const onSuccess = () => { setBrandCfgs(p => p.map(x => x.id === bId ? { ...x, saved: true } : x)); setSavedBrand(bId); setTimeout(() => setSavedBrand(null), 2200); };
    // Route to the branch endpoint in branch scope; the brand endpoint otherwise.
    if (shiftScope === "branch") saveBranchShiftCfgMut.mutate({ branchId: bId, config }, { onSuccess });
    else saveShiftCfgMut.mutate({ brandId: bId, config }, { onSuccess });
  };

  // Brand-level shift edit handlers
  const brandEditOpen = (idx: number, s: string, d: number) => setBrandEdit({ idx, tmpStart: s, tmpDurH: d });
  const brandEditChange = (s: string, d: number) => setBrandEdit(p => p ? { ...p, tmpStart: s, tmpDurH: d } : p);
  const brandEditCommit = () => { if (!brandEdit) return; const { idx, tmpStart, tmpDurH } = brandEdit; updBrand(selBrandId, { shifts: selBrand.shifts.map((x, j) => j === idx ? { ...x, start: tmpStart, end: sAddMins(tmpStart, tmpDurH * 60), durH: tmpDurH } : x) }); setBrandEdit(null); };

  // Rest-level shift edit handlers
  const restEditOpen = (rId: string, idx: number, s: string, d: number) => setRestEdits(p => ({ ...p, [rId]: { idx, tmpStart: s, tmpDurH: d } }));
  const restEditChange = (rId: string, s: string, d: number) => setRestEdits(p => ({ ...p, [rId]: p[rId] ? { ...p[rId]!, tmpStart: s, tmpDurH: d } : null }));
  const restEditCommit = (bId: string, rId: string, slots: ShiftSlot[]) => {
    const e = restEdits[rId]; if (!e) return;
    updRest(bId, rId, { shifts: slots.map((x, j) => j === e.idx ? { ...x, start: e.tmpStart, end: sAddMins(e.tmpStart, e.tmpDurH * 60), durH: e.tmpDurH } : x) });
    setRestEdits(p => ({ ...p, [rId]: null }));
  };

  // Live board (T08 §3) — { active[], overdue[], kpis } at top level (not paginated).
  const activeShifts = shiftsLive?.active ?? [];
  const overdueShifts = shiftsLive?.overdue ?? [];
  const liveShifts = [...activeShifts, ...overdueShifts];
  const kpis = shiftsLive?.kpis;
  const shiftHistory = historyBusy || historyQuery.isError ? [] : shiftsHistoryPage?.data ?? [];

  const shiftDurHrs = (s: { startedAt: string }) => Math.max(0, (Date.now() - new Date(s.startedAt).getTime()) / 36e5);
  const fmtTime = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString("ar-SA") : "—";

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">إدارة الشفتات</h2>
          <p className="text-gray-400 text-sm mt-0.5">الوقت الفعلي · إعداد الشفتات · السجل التاريخي</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />مباشر — آخر تحديث: الآن
        </span>
      </div>

      {/* KPIs (T08 §3 — 4 tiles from live.kpis) */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="مفتوح الآن" value={String(kpis?.openNow ?? liveShifts.length)} sub="شفت نشط" icon={<span className="w-2 h-2 rounded-full bg-emerald-500" />} accent="emerald" />
        <KpiCard label="مغلقة اليوم" value={String(kpis?.closedToday ?? 0)} sub="شفت مغلق" icon={<CheckCircle2 size={18} className="text-blue-600" />} accent="blue" />
        <KpiCard label="مبيعات اليوم" value={formatShiftHalalas(kpis?.todaySalesHalalas)} sub="ر.س" icon={<TrendingUp size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label="فروق كاش للمراجعة" value={String(kpis?.cashGapsPendingReview ?? 0)} sub="تحتاج مراجعة" icon={<AlertTriangle size={18} className="text-amber-600" />} accent="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: "live" as const, label: "🟢 مباشر" },
          { id: "setup" as const, label: "⚙️ إعداد الشفتات" },
          { id: "close" as const, label: "📋 مراجعة الورديات" },
          { id: "history" as const, label: "📋 السجل التاريخي" },
        ] as { id: "live" | "setup" | "close" | "history"; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === t.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: LIVE ─────────────────────────────────────────────────────────── */}
      {tab === "live" && (
        <div className="space-y-4">
          {overdueShifts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3" dir="rtl">
              <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">⚠️ تنبيه: {overdueShifts.length} شفت متأخر — انتهى وقته ولم يُغلق الصندوق بعد</p>
                <p className="text-xs text-red-700 mt-1">
                  {overdueShifts.map(s => `${s.cashierName} (${s.branchName})`).join(" · ")} — يُرجى إغلاق الشفت فوراً.
                </p>
              </div>
            </div>
          )}
          {liveShifts.length === 0 && <p className="text-center text-gray-400 text-sm py-8">لا توجد شفتات مفتوحة حالياً</p>}
          <div className="grid grid-cols-2 gap-4">
            {liveShifts.map(sh => {
              const durHrs = shiftDurHrs(sh);
              const late = sh.status === "late" || sh.isLate;
              const evidence = getShiftCountEvidence(sh);
              const statusDisplay = getShiftStatusDisplay(sh.status);
              return (
                <div key={sh.id} className={`bg-white rounded-xl border shadow-sm p-4 ${durHrs > 8 ? "border-red-300 bg-red-50/20" : late ? "border-amber-300 bg-amber-50/20" : "border-gray-100"}`}>
                  {durHrs > 8 && <div className="flex items-center gap-2 text-red-700 text-xs font-semibold mb-3 bg-red-100 rounded-lg px-3 py-2"><AlertTriangle size={13} /> شفت متأخر — {durHrs.toFixed(0)} ساعة بدون إغلاق! يتجاوز الحد المسموح به</div>}
                  {durHrs <= 8 && late && <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-3 bg-amber-100 rounded-lg px-3 py-2"><AlertTriangle size={13} /> {sh.lateBannerAr ?? "انتهى وقت الشفت — لم يُغلق الصندوق بعد"}</div>}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">{(sh.cashierName || "؟")[0]}</div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${late ? "bg-amber-500" : "bg-emerald-500"}`} />
                    </div>
                    <div className="flex-1"><p className="font-bold text-gray-800 text-sm">{sh.cashierName}</p><p className="text-xs text-gray-500">{sh.shiftType} · {sh.branchName}</p></div>
                    <Badge className={statusDisplay.cls}>{sh.statusLabelAr ?? statusDisplay.label}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    {[{ label: "بداية الشفت", val: fmtTime(sh.startedAt) }, { label: "المدة", val: `${durHrs.toFixed(1)} ساعة` }, { label: "الطلبات", val: evidence.ordersCount }].map((s, j) => (
                      <div key={j} className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-400">{s.label}</p><p className="text-sm font-bold text-gray-800">{s.val}</p></div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-500 text-xs">مبيعات الشفت</span>
                    <span className="font-bold text-purple-700"><bdi>{evidence.sales}</bdi> ر.س</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-500 text-xs">النقد المتوقع</span>
                    <span className="font-mono font-bold text-gray-800"><bdi>{evidence.expectedCash}</bdi> ر.س</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-500 text-xs">الفرق</span>
                    <span className={`font-mono font-bold ${evidence.variance.cls}`}><bdi>{evidence.variance.text}</bdi></span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>نقد وارد معلق (خارج الفرق)</span>
                    <span className="font-mono"><bdi>{evidence.pendingIncoming}</bdi> ر.س</span>
                  </div>
                  <div className="flex gap-2">
                    {sh.cashierPhone
                      ? <a href={`tel:${sh.cashierPhone}`} className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"><Phone size={12} /> تواصل</a>
                      : <button onClick={() => setModal("contact")} className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"><Phone size={12} /> تواصل</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: SETUP ────────────────────────────────────────────────────────── */}
      {tab === "setup" && (
        <div className="space-y-4" dir="rtl">
          {/* Scope toggle: assign by brand or by branch (2026-08-09) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">التعيين حسب:</span>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {([["brand", "🏷️ العلامة التجارية"], ["branch", "🏪 الفرع"]] as const).map(([sc, label]) => (
                <button key={sc} onClick={() => { setShiftScope(sc); setSelBrandId(""); setExpandedRest(null); setBrandEdit(null); setRestEdits({}); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${shiftScope === sc ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {label}
                </button>
              ))}
            </div>
            {shiftScope === "branch" && <span className="text-[10px] text-gray-400">تخصيص الفرع يغلب جدول العلامة التجارية</span>}
          </div>
          {/* Brand / branch selector pills */}
          <div className="flex items-center gap-2 flex-wrap bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <span className="text-xs font-bold text-gray-500 ml-1">{shiftScope === "branch" ? "الفرع:" : "العلامة التجارية:"}</span>
            {brandCfgs.length === 0 && <span className="text-xs text-gray-400">{shiftScope === "branch" ? "لا توجد فروع مخصّصة لك بعد" : "لا توجد علامات تجارية مخصّصة لك بعد"}</span>}
            {brandCfgs.map(b => (
              <button key={b.id} onClick={() => { setSelBrandId(b.id); setExpandedRest(null); setBrandEdit(null); setRestEdits({}); setRestSearch(""); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selBrandId === b.id ? "text-white border-transparent shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                style={selBrandId === b.id ? { background: b.color, borderColor: b.color } : {}}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{ background: b.color }}>{b.name[0]}</span>
                {b.name}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${selBrandId === b.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>{b.numShifts} شفت</span>
                {b.saved && <span className="text-[9px] text-emerald-400">✓</span>}
              </button>
            ))}
          </div>

          {/* Selected brand configuration */}
          {selBrand && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Brand header bar */}
              <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100" style={{ background: `${selBrand.color}10` }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{ background: selBrand.color }}>{selBrand.name[0]}</div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{selBrand.name}</p>
                    <p className={`text-[10px] ${selBrand.numShifts * selBrand.durH > 24 ? "text-red-500 font-bold" : "text-gray-400"}`}>{selBrand.numShifts} شفت · {selBrand.durH} ساعة/شفت · يبدأ {sFmtT(selBrand.firstStart)}{selBrand.numShifts * selBrand.durH > 24 ? ` · يتجاوز 24 ساعة!` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {savedBrand === selBrand.id && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> تم الحفظ</span>}
                  <button onClick={() => doSave(selBrand.id)}
                    disabled={selBrand.numShifts * selBrand.durH > 24}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: selBrand.color }}>
                    <CheckCircle2 size={11} /> حفظ إعداد العلامة
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Smart auto-gen panel */}
                <ShiftSmartPanel
                  cfg={selBrand}
                  onNum={n => { updBrand(selBrand.id, { numShifts: n, shifts: sGenShifts(n, selBrand.durH, selBrand.firstStart) }); setBrandEdit(null); }}
                  onDur={d => { updBrand(selBrand.id, { durH: d, shifts: sGenShifts(selBrand.numShifts, d, selBrand.firstStart) }); setBrandEdit(null); }}
                  onStart={s => { updBrand(selBrand.id, { firstStart: s, shifts: sGenShifts(selBrand.numShifts, selBrand.durH, s) }); setBrandEdit(null); }}
                  onGen={() => doAutoGen(selBrand.id)}
                />

                {/* Opening cash float — bridged to every generated shift (T08 §2.1). */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                  <div>
                    <p className="text-xs font-bold text-gray-600">الرصيد الافتتاحي للدرج</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">المبلغ النقدي الابتدائي في درج كل شفت — يظهر للكاشير على الموبايل</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <input type="number" min={0} step="0.01" value={selBrand.openingFloat || 0}
                      onChange={e => updBrand(selBrand.id, { openingFloat: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-left font-mono outline-none focus:border-purple-400" dir="ltr" />
                    <span className="text-xs text-gray-500 font-semibold">ر.س</span>
                  </div>
                </div>

                {/* Generated shifts list */}
                {selBrand.shifts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-600">جدول شفتات العلامة التجارية</p>
                      <span className="text-[10px] text-gray-400">اضغط ✏️ لتعديل وقت أي شفت بشكل منفرد</span>
                    </div>
                    <div className="space-y-2">
                      {selBrand.shifts.map((sl, i) => (
                        <ShiftRowCmp key={i} slot={sl} idx={i} editState={brandEdit}
                          onEditOpen={brandEditOpen}
                          onEditChange={brandEditChange}
                          onEditCommit={brandEditCommit}
                          onEditCancel={() => setBrandEdit(null)}
                        />
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-500 text-center">
                        يغطي الجدول{" "}
                        <span className="font-bold text-gray-700">{selBrand.numShifts * selBrand.durH} ساعة</span> يومياً
                        {" "}·{" "}من{" "}
                        <span className="font-bold text-gray-700">{sFmtT(selBrand.firstStart)}</span>
                        {" "}إلى{" "}
                        <span className="font-bold text-gray-700">{selBrand.shifts.length > 0 ? sFmtT(selBrand.shifts[selBrand.shifts.length - 1].end) : "—"}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Per-restaurant overrides — hidden: there is no per-restaurant
                    shift-config endpoint; brand-level config is authoritative. */}
                {selBrand.rests.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-bold text-gray-600">تخصيص حسب المطعم (اختياري)</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">يمكن تجاوز إعداد العلامة لمطعم محدد</p>
                      </div>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-semibold">{selBrand.rests.filter(r => r.useOverride).length} مخصص من {selBrand.rests.length}</span>
                    </div>

                    {/* Restaurant search filter */}
                    {selBrand.rests.length > 2 && (
                      <div className="relative mb-2">
                        <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          value={restSearch}
                          onChange={e => setRestSearch(e.target.value)}
                          placeholder="بحث باسم المطعم..."
                          className="w-full text-xs border border-gray-200 rounded-xl py-2 pr-8 pl-3 bg-gray-50 focus:bg-white focus:border-purple-300 outline-none transition-all"
                        />
                        {restSearch && (
                          <button onClick={() => setRestSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      {selBrand.rests.filter(r => !restSearch.trim() || r.restName.includes(restSearch)).map(rest => (
                        <div key={rest.restId} className={`rounded-xl border transition-all ${rest.useOverride ? "border-purple-200 bg-purple-50/30" : "border-gray-100 bg-white"}`}>
                          {/* Restaurant row header */}
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">🍴</div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-gray-800">{rest.restName}</p>
                              {rest.useOverride
                                ? <p className="text-[10px] text-purple-600">{rest.numShifts} شفت مخصص · {rest.durH} ساعة · من {sFmtT(rest.firstStart)}</p>
                                : <p className="text-[10px] text-gray-400">يستخدم إعداد العلامة ({selBrand.numShifts} شفت × {selBrand.durH}س)</p>
                              }
                            </div>
                            <div className="flex items-center gap-2">
                              {rest.useOverride && (
                                <button onClick={() => setExpandedRest(expandedRest === rest.restId ? null : rest.restId)}
                                  className="text-[10px] text-purple-600 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-100">
                                  {expandedRest === rest.restId ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                  {expandedRest === rest.restId ? "طي" : "تفاصيل"}
                                </button>
                              )}
                              <button
                                onClick={() => { updRest(selBrand.id, rest.restId, { useOverride: !rest.useOverride }); if (!rest.useOverride) setExpandedRest(rest.restId); else setExpandedRest(null); }}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${rest.useOverride ? "bg-purple-100 text-purple-700 border-purple-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200" : "bg-white text-gray-500 border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"}`}>
                                {rest.useOverride ? "✓ مخصص · إلغاء" : "تخصيص"}
                              </button>
                            </div>
                          </div>

                          {/* Restaurant override config (expanded) */}
                          {rest.useOverride && expandedRest === rest.restId && (
                            <div className="px-4 pb-4 space-y-3 border-t border-purple-100 pt-3">
                              <ShiftSmartPanel
                                cfg={rest}
                                onNum={n => { updRest(selBrand.id, rest.restId, { numShifts: n, shifts: sGenShifts(n, rest.durH, rest.firstStart) }); setRestEdits(p => ({ ...p, [rest.restId]: null })); }}
                                onDur={d => { updRest(selBrand.id, rest.restId, { durH: d, shifts: sGenShifts(rest.numShifts, d, rest.firstStart) }); setRestEdits(p => ({ ...p, [rest.restId]: null })); }}
                                onStart={s => { updRest(selBrand.id, rest.restId, { firstStart: s, shifts: sGenShifts(rest.numShifts, rest.durH, s) }); setRestEdits(p => ({ ...p, [rest.restId]: null })); }}
                                onGen={() => doRestAutoGen(selBrand.id, rest.restId)}
                              />
                              {rest.shifts.length > 0 && (
                                <div className="space-y-2">
                                  {rest.shifts.map((sl, i) => (
                                    <ShiftRowCmp key={i} slot={sl} idx={i} editState={restEdits[rest.restId] ?? null}
                                      onEditOpen={(idx, s, d) => restEditOpen(rest.restId, idx, s, d)}
                                      onEditChange={(s, d) => restEditChange(rest.restId, s, d)}
                                      onEditCommit={() => restEditCommit(selBrand.id, rest.restId, rest.shifts)}
                                      onEditCancel={() => setRestEdits(p => ({ ...p, [rest.restId]: null }))}
                                    />
                                  ))}
                                </div>
                              )}
                              {rest.shifts.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-2">اضغط "إنشاء تلقائي" لتوليد الشفتات</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reserved for SHF review. */}
      {tab === "close" && (
        <p className="text-sm text-gray-500" role="note">مراجعة الورديات — التفاصيل ستتاح هنا لاحقاً</p>
      )}

      {/* ── TAB: HISTORY (T08 §3/§7 — canonical shape + Excel export) ──────────── */}
      {tab === "history" && (
        <Card title="سجل الشفتات السابقة">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-end">
            <button onClick={() => exportShiftsMut.mutate({})} disabled={exportShiftsMut.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50">
              <FileText size={11} /> {exportShiftsMut.isPending ? "جارٍ التصدير..." : "تصدير Excel"}
            </button>
          </div>
          <div className="px-4 py-3 flex flex-wrap items-end gap-3 text-xs">
            <label>من تاريخ الإغلاق<input type="date" value={historyDateFrom}
              onChange={e => { setHistoryDateFrom(e.target.value); setHistoryPageNum(1); }}
              className="block mt-1 rounded-lg border border-gray-200 px-2 py-1.5" /></label>
            <label>إلى تاريخ الإغلاق<input type="date" value={historyDateTo}
              onChange={e => { setHistoryDateTo(e.target.value); setHistoryPageNum(1); }}
              className="block mt-1 rounded-lg border border-gray-200 px-2 py-1.5" /></label>
            <label>الفرع<select value={historyBranchId}
              onChange={e => { setHistoryBranchId(e.target.value); setHistoryPageNum(1); }}
              className="block mt-1 rounded-lg border border-gray-200 px-2 py-1.5">
              <option value="">كل الفروع المعيّنة</option>
              {historyBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select></label>
          </div>
          {historyBusy && <p role="status" className="text-center text-gray-400 text-sm py-8">جارٍ تحميل السجل…</p>}
          {!historyBusy && historyQuery.isError && <p role="alert" className="text-center text-red-700 text-sm py-8">
            {isApiError(historyQuery.error) ? historyQuery.error.messageAr : "تعذر تحميل سجل الشفتات"}
          </p>}
          {!historyBusy && !historyQuery.isError && shiftHistory.length === 0 && <p className="text-center text-gray-400 text-sm py-8">لا يوجد سجل لهذه المرشحات</p>}
          {!historyBusy && !historyQuery.isError && shiftHistory.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs text-gray-500">
                    <th className="px-4 py-3 text-right">الفرع / الكاشير</th>
                    <th className="px-4 py-3 text-center">نوع الشفت</th>
                    <th className="px-4 py-3 text-center">التاريخ</th>
                    <th className="px-4 py-3 text-center">بداية → نهاية</th>
                    <th className="px-4 py-3 text-center">الطلبات</th>
                    <th className="px-4 py-3 text-center">المبيعات</th>
                    <th className="px-4 py-3 text-center">الفرق</th>
                    <th className="px-4 py-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftHistory.map(sh => {
                    const evidence = getShiftCountEvidence(sh);
                    const statusDisplay = getShiftStatusDisplay(sh.status);
                    return (
                      <tr key={sh.id} className="border-b border-gray-50 hover:bg-gray-50/60 last:border-0">
                        <td className="px-4 py-3"><p className="font-semibold text-gray-800 text-xs">{sh.branchName}</p><p className="text-[10px] text-gray-400">{sh.cashierName}</p></td>
                        <td className="px-4 py-3 text-center"><Badge className="bg-gray-100 text-gray-600 text-[10px]">{sh.shiftType}</Badge></td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{fmtDate(sh.endedAt)}</td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-gray-600">{fmtTime(sh.startedAt)} → {fmtTime(sh.endedAt)}</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-400" title="عدد الطلبات الفعلي غير متاح">{evidence.ordersCount}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-purple-700"><bdi>{evidence.sales}</bdi> ر.س</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono font-bold text-sm ${evidence.variance.cls}`}><bdi>{evidence.variance.text}</bdi></span>
                          <p className="text-[10px] text-gray-500 mt-1">نقد وارد معلق (خارج الفرق): <bdi className="font-mono">{evidence.pendingIncoming}</bdi> ر.س</p>
                        </td>
                        <td className="px-4 py-3 text-center"><Badge className={statusDisplay.cls}>{sh.statusLabelAr ?? statusDisplay.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50/80 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-2.5 font-bold text-gray-700 text-xs" colSpan={4}>إجمالي هذه الصفحة</td>
                    <td className="px-4 py-2.5 text-center font-bold text-gray-400" title="عدد الطلبات الفعلي غير متاح">—</td>
                    <td className="px-4 py-2.5 text-center font-mono font-black text-purple-700"><bdi>{formatShiftSalesTotal(shiftHistory)}</bdi> ر.س</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span>الصفحة {historyShownPage} / {historyMeta?.totalPages ?? "—"}</span>
            <div className="flex gap-2">
              <button disabled={historyBusy || historyQuery.isError || historyPageTarget(historyMeta, historyPageNum, -1) === historyPageNum}
                onClick={() => changeHistoryPage(-1)} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50">السابق</button>
              <button disabled={historyBusy || historyQuery.isError || historyPageTarget(historyMeta, historyPageNum, 1) === historyPageNum}
                onClick={() => changeHistoryPage(1)} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50">التالي</button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
