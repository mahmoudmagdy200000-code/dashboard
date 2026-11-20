import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Plus, X } from "lucide-react";
import { api } from "@/api/client";
import { getErrorMessage, isApiError } from "@/api/errors";
import { queryKeys } from "@/api/queries/keys";
import { useBranchEmployeesLookup } from "@/api/queries/lookups";
import type { WorkdaySettlementData } from "@/api/types";
import { fmtAmt } from "../../_shared/formatters";

type Translate = (arabic: string, english: string) => string;
const sar = (halalas: number) => (halalas / 100).toFixed(2);
const moneyInput = (value: string) => {
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(value)) return NaN;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
};
const inputClass =
  "w-full sm:w-36 text-center font-mono font-semibold border-2 border-purple-300 rounded-xl px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:border-purple-500";

function EmployeeName({ branchId, number, t }: { branchId: string; number: string; t: Translate }) {
  const trimmed = number.trim();
  const lookup = useBranchEmployeesLookup(branchId, trimmed.length >= 1 ? trimmed : undefined);
  const isDuplicateErr = isApiError(lookup.error) && lookup.error.status === 409;
  const isNotFound = trimmed.length > 0 && !lookup.isFetching && lookup.isError && !isDuplicateErr;

  return (
    <div
      aria-live="polite"
      className={`min-h-8 flex items-center px-2.5 py-1 rounded-lg bg-white border text-xs font-medium ${
        isDuplicateErr || isNotFound ? "border-red-300 text-red-700" : "border-gray-200 text-gray-700"
      }`}
    >
      {lookup.isFetching ? (
        <span className="text-gray-400">{t("جارٍ البحث…", "Looking up…")}</span>
      ) : isDuplicateErr ? (
        <span>{t("رقم موظف مكرر في الفرع", "Duplicate employee number")}</span>
      ) : isNotFound ? (
        <span>{t("راجع رقم الموظف", "Check employee number")}</span>
      ) : lookup.data?.name ? (
        <span className="truncate">{lookup.data.name}</span>
      ) : (
        <span className="text-gray-300">{t("يُعبأ تلقائياً", "Auto-filled")}</span>
      )}
    </div>
  );
}

export function WorkdaySettlement({ id, branchId, data, editing, onSaved, t, lang }: {
  id: string; branchId: string; data: WorkdaySettlementData; editing: boolean;
  onSaved?: () => void; t: Translate; lang: "ar" | "en";
}) {
  const qc = useQueryClient();
  const [expectedRevision] = useState(data.revision);
  const [cash, setCash] = useState(sar(data.cashHalalas));
  const [cards, setCards] = useState(sar(data.cardsHalalas));
  const [delivery, setDelivery] = useState(data.delivery.map(channel => sar(channel.amountHalalas)));
  const [allocations, setAllocations] = useState(data.allocations.map(row => ({
    key: crypto.randomUUID(), empNumber: row.empNumber, amount: sar(row.amountHalalas),
  })));
  const [reason, setReason] = useState("");
  const [lastRequest, setLastRequest] = useState<{ fingerprint: string; commandId: string }>();

  const collected = editing
    ? [cash, cards, ...delivery].reduce((total, value) => total + moneyInput(value), 0)
    : data.cashHalalas + data.cardsHalalas + data.delivery.reduce((total, row) => total + row.amountHalalas, 0);
  const variance = collected - data.grossHalalas;
  const shortageHalalas = Number.isFinite(variance) ? Math.max(0, -variance) : NaN;
  const allocatedHalalas = allocations.reduce((total, row) => total + moneyInput(row.amount), 0);
  const unallocated = shortageHalalas - allocatedHalalas;

  const save = useMutation({
    mutationFn: async (body: object) => api.patch(`/operations/${id}/workday-settlement`, body),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.operation(id) }),
        qc.invalidateQueries({ queryKey: queryKeys.operationAudit(id) }),
        qc.invalidateQueries({ queryKey: ["operations"] }),
        qc.invalidateQueries({ queryKey: ["sales", "submitted-daily-workdays"] }),
        qc.invalidateQueries({ queryKey: queryKeys.accDashboard }),
      ]);
      onSaved?.();
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(collected) || unallocated !== 0 || !reason.trim() || save.isPending) return;
    const body = {
      expectedRevision, reason: reason.trim(),
      cashHalalas: moneyInput(cash), cardsHalalas: moneyInput(cards),
      delivery: data.delivery.map((row, i) => ({ id: row.id, amountHalalas: moneyInput(delivery[i]) })),
      allocations: allocations.map(row => ({ empNumber: row.empNumber.trim(), amountHalalas: moneyInput(row.amount) })),
    };
    const fingerprint = JSON.stringify(body);
    const commandId = lastRequest?.fingerprint === fingerprint ? lastRequest.commandId : crypto.randomUUID();
    setLastRequest({ fingerprint, commandId });
    save.mutate({ ...body, commandId });
  }

  const coreFields = [
    { key: "cash", icon: "💵", name: t("النقدي (صندوق)", "Cash"), value: cash, update: setCash },
    { key: "cards", icon: "💳", name: t("البطاقات البنكية", "Card Payments"), value: cards, update: setCards },
  ];
  const deliveryFields = data.delivery.map((row, i) => ({
    key: row.id, icon: "🛵", name: row.name ?? t("إجمالي التوصيل", "Delivery total"), value: delivery[i],
    update: (value: string) => setDelivery(previous => previous.map((item, at) => at === i ? value : item)),
  }));
  const currency = t("ر.س", "SAR");
  const isMatched = variance === 0;
  const isShortage = Number.isFinite(variance) && variance < 0;
  const isSurplus = Number.isFinite(variance) && variance > 0;

  return (
    <form onSubmit={submit} className="divide-y divide-gray-100 text-sm">
      {/* Locked Total Sales */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 bg-indigo-50/60">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
          <span className="text-sm font-bold text-indigo-900">{t("إجمالي المبيعات الثابت", "Locked gross sales")}</span>
          <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md font-medium">
            {t("(من رفع مدير الفرع — مقفل)", "(Branch Manager entry — locked)")}
          </span>
        </div>
        <span className="font-mono font-black text-indigo-800 text-base">
          {fmtAmt(data.grossHalalas / 100)} {currency}
        </span>
      </div>

      {/* Core channels */}
      {coreFields.map(field => (
        <div key={field.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-gray-50/60">
          <label htmlFor={`ws-${id}-${field.key}`} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
            <span className="text-base">{field.icon}</span>
            <span>{field.name}</span>
          </label>
          {editing ? (
            <input id={`ws-${id}-${field.key}`} className={inputClass} inputMode="decimal" required value={field.value}
              onChange={event => field.update(event.target.value)} />
          ) : (
            <span className="font-mono font-semibold text-gray-800 text-sm">
              {fmtAmt(Number(field.value))} {currency}
            </span>
          )}
        </div>
      ))}

      {/* Delivery apps */}
      {deliveryFields.length > 0 && (
        <div className="px-4 py-2 bg-gray-50/80">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{t("تطبيقات التوصيل", "Delivery Apps")}</p>
        </div>
      )}
      {deliveryFields.map(field => (
        <div key={field.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-gray-50/60">
          <label htmlFor={`ws-${id}-${field.key}`} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
            <span className="text-base">{field.icon}</span>
            <span>{field.name}</span>
          </label>
          {editing ? (
            <input id={`ws-${id}-${field.key}`} className={inputClass} inputMode="decimal" required value={field.value}
              onChange={event => field.update(event.target.value)} />
          ) : (
            <span className="font-mono font-semibold text-gray-800 text-sm">
              {fmtAmt(Number(field.value))} {currency}
            </span>
          )}
        </div>
      ))}

      {/* Total Collected */}
      <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 font-bold border-t-2 ${
        isMatched ? "bg-emerald-50/70 border-emerald-200" : isShortage ? "bg-red-50/70 border-red-200" : isSurplus ? "bg-blue-50/70 border-blue-200" : "bg-gray-50 border-gray-200"
      }`}>
        <span className={`text-sm ${isMatched ? "text-emerald-800" : isShortage ? "text-red-800" : isSurplus ? "text-blue-800" : "text-gray-600"}`}>
          {t("إجمالي التحصيل", "Total collected")}
        </span>
        <span className={`font-mono text-base ${isMatched ? "text-emerald-700" : isShortage ? "text-red-700" : isSurplus ? "text-blue-700" : "text-gray-600"}`}>
          {Number.isFinite(collected) ? `${fmtAmt(collected / 100)} ${currency}` : "—"}
        </span>
      </div>

      {/* Collection Variance */}
      {isMatched ? (
        <div className="flex items-center justify-center px-4 py-3 bg-emerald-50">
          <span className="text-sm text-emerald-700 font-bold flex items-center gap-2">
            <CheckCircle2 size={14} /> {t("إجمالي التحصيل مطابق لإجمالي المبيعات تماماً", "Total collected matches total sales exactly")}
          </span>
        </div>
      ) : isShortage ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-red-100 border-t border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
            <span className="text-sm font-bold text-red-800">{t("فرق التحصيل (عجز)", "Collection variance (Shortage)")}</span>
          </div>
          <span className="font-mono font-black text-red-800 text-base">
            {sar(variance)} {currency}
          </span>
        </div>
      ) : isSurplus ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-blue-100 border-t border-blue-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-blue-600 flex-shrink-0" />
            <span className="text-sm font-bold text-blue-800">{t("فرق التحصيل (فائض لصالح الفرع)", "Collection variance (Surplus)")}</span>
          </div>
          <span className="font-mono font-black text-blue-800 text-base">
            +{sar(variance)} {currency}
          </span>
        </div>
      ) : (
        <div className="px-4 py-3 text-xs text-red-600">{t("أدخل مبالغ صحيحة لحساب الفرق", "Enter valid amounts to calculate variance")}</div>
      )}

      {/* Editing: Shortage Allocation + Reason + Save */}
      {editing ? (
        <div className="p-4 space-y-4 bg-gray-50/40">
          <fieldset className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-red-100/70 border-b border-red-200">
              <legend className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-red-600" />
                {t("توزيع العجز", "Shortage allocation")}
              </legend>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                unallocated === 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}>
                {t("فرق التوزيع", "Allocation difference")}:{" "}
                {Number.isFinite(unallocated) ? `${sar(unallocated)} ${currency}` : "—"}
              </span>
            </div>
            <div className="p-3 space-y-2.5">
              {allocations.map(row => (
                <div key={row.key} className="grid grid-cols-1 gap-2 lg:grid-cols-[7rem_minmax(8.5rem,1fr)_7.5rem_auto_auto] lg:items-end">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-600">{t("رقم الموظف", "Employee number")}</span>
                    <input className="w-full text-center font-mono border border-red-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-purple-400"
                      required value={row.empNumber}
                      onChange={event => setAllocations(items => items.map(item => item.key === row.key ? { ...item, empNumber: event.target.value } : item))} />
                  </label>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] text-gray-600">{t("اسم الموظف", "Employee Name")}</span>
                    <EmployeeName branchId={branchId} number={row.empNumber} t={t} />
                  </div>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-600">{t("المبلغ", "Amount")}</span>
                    <input className="w-full text-center font-mono border border-red-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-purple-400"
                      required inputMode="decimal" value={row.amount}
                      onChange={event => setAllocations(items => items.map(item => item.key === row.key ? { ...item, amount: event.target.value } : item))} />
                  </label>
                  <button type="button"
                    disabled={!Number.isFinite(unallocated)}
                    onClick={() => {
                      const current = moneyInput(row.amount);
                      const base = Number.isFinite(current) ? current : 0;
                      const next = Math.max(0, base + unallocated);
                      setAllocations(items => items.map(item => item.key === row.key ? { ...item, amount: sar(next) } : item));
                    }}
                    className="w-full sm:w-auto px-2.5 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold hover:bg-amber-200 border border-amber-200 whitespace-nowrap disabled:opacity-50">
                    ⚡ {t("المتبقي", "Remaining")}
                  </button>
                  <button type="button" onClick={() => setAllocations(items => items.filter(item => item.key !== row.key))}
                    aria-label={t("إزالة", "Remove")}
                    className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-red-700 hover:bg-red-100 rounded-lg">
                    <X size={13} /> <span>{t("إزالة", "Remove")}</span>
                  </button>
                </div>
              ))}
              <button type="button" disabled={!isShortage || allocations.length >= 50}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline disabled:opacity-50"
                onClick={() => setAllocations(items => [...items, { key: crypto.randomUUID(), empNumber: "", amount: "" }])}>
                <Plus size={12} /> {t("إضافة موظف", "Add employee")}
              </button>
            </div>
          </fieldset>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-gray-700">{t("سبب التعديل", "Reason for the change")} <span className="text-red-500">*</span></span>
            <textarea className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-purple-500"
              rows={2} maxLength={1000} required value={reason} onChange={event => setReason(event.target.value)} />
          </label>

          {save.isError && <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{getErrorMessage(save.error, lang)}</p>}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="submit" disabled={save.isPending || unallocated !== 0 || !reason.trim()}
              className="rounded-xl bg-purple-700 hover:bg-purple-800 px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
              {save.isPending ? t("جارٍ الحفظ…", "Saving…") : t("حفظ التسوية", "Save settlement")}
            </button>
          </div>
        </div>
      ) : (data.allocations.length > 0 || data.reason) ? (
        <div className="px-4 py-3 bg-gray-50/50 space-y-1.5">
          {data.allocations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.allocations.map(row => (
                <span key={row.empNumber} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-800">
                  <span>{row.name}</span>
                  <span className="font-mono text-[11px] text-red-600">#{row.empNumber}</span>
                  <span>·</span>
                  <span className="font-mono">{fmtAmt(row.amountHalalas / 100)} {currency}</span>
                </span>
              ))}
            </div>
          )}
          {data.reason && (
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-gray-700">{t("سبب التعديل", "Reason for the change")}:</span> {data.reason}
            </p>
          )}
        </div>
      ) : null}
    </form>
  );
}
