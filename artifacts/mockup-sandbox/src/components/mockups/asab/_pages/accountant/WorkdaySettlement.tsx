import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/api/queries/keys";
import { useBranchEmployeesLookup } from "@/api/queries/lookups";
import type { WorkdaySettlementData } from "@/api/types";

type Translate = (arabic: string, english: string) => string;
const sar = (halalas: number) => (halalas / 100).toFixed(2);
const moneyInput = (value: string) => {
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(value)) return NaN;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
};
const inputClass = "w-full rounded border border-gray-300 px-2 py-1 text-sm";

function EmployeeName({ branchId, number, t }: { branchId: string; number: string; t: Translate }) {
  const lookup = useBranchEmployeesLookup(branchId, number.trim() || undefined);
  return <span aria-live="polite" className="text-xs text-gray-600">
    {lookup.data?.name ?? (lookup.isError ? t("راجع رقم الموظف", "Check employee number") : "")}
  </span>;
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
  const unallocated = Math.max(0, -variance) - allocations.reduce((total, row) => total + moneyInput(row.amount), 0);
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

  const fields = [
    { key: "cash", name: t("النقدي", "Cash"), value: cash, update: setCash },
    { key: "cards", name: t("البطاقات", "Cards"), value: cards, update: setCards },
    ...data.delivery.map((row, i) => ({
      key: row.id, name: row.name ?? t("إجمالي التوصيل", "Delivery total"), value: delivery[i],
      update: (value: string) => setDelivery(previous => previous.map((item, at) => at === i ? value : item)),
    })),
  ];
  return <form onSubmit={submit} className="space-y-4 p-4 text-sm">
    <div className="grid gap-3 sm:grid-cols-2">
      <div><span className="text-gray-600">{t("إجمالي المبيعات الثابت", "Locked gross sales")}</span>
        <strong className="block text-purple-800">{sar(data.grossHalalas)}</strong></div>
      {fields.map(field => <label key={field.key} className="block">{field.name}
        {editing ? <input className={inputClass} inputMode="decimal" required value={field.value}
          onChange={event => field.update(event.target.value)} /> : <strong className="block">{field.value}</strong>}
      </label>)}
      <div>{t("إجمالي التحصيل", "Total collected")} <strong>{Number.isFinite(collected) ? sar(collected) : "—"}</strong></div>
      <div className={variance < 0 ? "text-red-700" : "text-emerald-700"}>
        {t("فرق التحصيل", "Collection variance")} <strong>{Number.isFinite(variance) ? sar(variance) : "—"}</strong>
      </div>
    </div>
    {editing ? <>
      <fieldset className="space-y-2 rounded border p-3">
        <legend>{t("توزيع العجز", "Shortage allocation")}</legend>
        {allocations.map(row => <div key={row.key} className="grid gap-2 sm:grid-cols-3">
          <label>{t("رقم الموظف", "Employee number")}
            <input className={inputClass} required value={row.empNumber} onChange={event =>
              setAllocations(items => items.map(item => item.key === row.key ? { ...item, empNumber: event.target.value } : item))} />
            <EmployeeName branchId={branchId} number={row.empNumber} t={t} />
          </label>
          <label>{t("المبلغ", "Amount")}<input className={inputClass} required inputMode="decimal" value={row.amount}
            onChange={event => setAllocations(items => items.map(item => item.key === row.key ? { ...item, amount: event.target.value } : item))} /></label>
          <button type="button" className="text-red-700" onClick={() => setAllocations(items => items.filter(item => item.key !== row.key))}>{t("إزالة", "Remove")}</button>
        </div>)}
        <button type="button" disabled={variance >= 0 || allocations.length >= 50} className="text-purple-700 disabled:opacity-50"
          onClick={() => setAllocations(items => [...items, { key: crypto.randomUUID(), empNumber: "", amount: "" }])}>{t("إضافة موظف", "Add employee")}</button>
        <p>{t("فرق التوزيع", "Allocation difference")} {Number.isFinite(unallocated) ? sar(unallocated) : "—"}</p>
      </fieldset>
      <label className="block">{t("سبب التعديل", "Reason for the change")}
        <textarea className={inputClass} maxLength={1000} required value={reason} onChange={event => setReason(event.target.value)} /></label>
      {save.isError && <p role="alert" className="text-red-700">{getErrorMessage(save.error, lang)}</p>}
      <button type="submit" disabled={save.isPending || unallocated !== 0 || !reason.trim()}
        className="rounded bg-purple-700 px-3 py-2 text-white disabled:opacity-50">{save.isPending ? t("جارٍ الحفظ…", "Saving…") : t("حفظ التسوية", "Save settlement")}</button>
    </> : <>
      {data.allocations.map(row => <div key={row.empNumber}>{row.name} · {sar(row.amountHalalas)}</div>)}
      {data.reason && <p>{t("سبب التعديل", "Reason for the change")} · {data.reason}</p>}
    </>}
  </form>;
}
