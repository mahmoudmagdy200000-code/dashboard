import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { useHeadCashCustodyLedger, useHeadOperationalModule, type HeadOperationalModule } from "../../../../../api/queries/platform/head";
import { useExportCash, useExportOperations } from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import type { CashCustodyRow } from "../../../../../api/types/company";
import { displayDigits } from "../../_shared/displayDigits";
import { fmtAmt, formatDateLong } from "../../_shared/formatters";

type Row = Record<string, unknown>;

const moduleTitles: Record<HeadOperationalModule, [string, string]> = {
  expenses: ["سجلات المصروفات", "Expense records"],
  purchases: ["طلبات وفواتير المشتريات", "Purchase orders and invoices"],
  inventory: ["جرد الفروع", "Branch inventory"],
  cash: ["العهد النقدية وحركاتها", "Cash custody and transactions"],
  waste: ["سجلات الهدر والتالف", "Waste and damage records"],
  assets: ["الأصول الثابتة", "Fixed assets"],
};

function asObject(value: unknown): Row | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : null;
}

function recordsOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value.map(asObject).filter((row): row is Row => row !== null);
  const object = asObject(value);
  if (!object) return [];
  for (const key of ["data", "transactions", "branches", "assets", "entries", "custodies", "operations", "rows", "items", "results"]) {
    if (Array.isArray(object[key])) return recordsOf(object[key]);
  }
  return [];
}

function scalar(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

const hiddenKeys = /^(id|_id|uuid|createdat|updatedat|deletedat|companyid|brandid|branchid|operationid)$/i;
const friendlyKeys: Record<string, [string, string]> = {
  txnDate: ["التاريخ", "Date"], description: ["البيان", "Description"], typeLabelAr: ["النوع", "Type"],
  txnType: ["نوع الحركة", "Txn Type"], publicId: ["رقم العملية", "Operation ID"],
  brandName: ["العلامة", "Brand"], moduleKey: ["الوحدة", "Module"],
  custodianName: ["أمين العهدة", "Custodian"], statusLabelAr: ["الحالة", "Status"],
  remainingHalalas: ["المتبقي (ر.س)", "Remaining (SAR)"],
  approvedHalalas: ["المعتمد (ر.س)", "Approved (SAR)"],
  spentHalalas: ["المصروف (ر.س)", "Spent (SAR)"],
  amountHalalas: ["المبلغ (ر.س)", "Amount (SAR)"], runningBalanceHalalas: ["الرصيد (ر.س)", "Balance (SAR)"],
  branchName: ["الفرع", "Branch"], name: ["الاسم", "Name"], title: ["العنوان", "Title"],
  supplierName: ["المورد", "Supplier"], custodian: ["أمين العهدة", "Custodian"],
  status: ["الحالة", "Status"], amount: ["المبلغ", "Amount"], total: ["الإجمالي", "Total"],
  balance: ["الرصيد", "Balance"], used: ["المستخدم", "Used"], cost: ["التكلفة", "Cost"],
  category: ["التصنيف", "Category"], operationDate: ["التاريخ", "Date"], date: ["التاريخ", "Date"],
  invoiceNumber: ["رقم الفاتورة", "Invoice"], invoiceCount: ["عدد الفواتير", "Invoices"],
  counterpartCount: ["عمليات مرتبطة", "Linked operations"], totalSar: ["الإجمالي (ر.س)", "Total (SAR)"],
  totalHalalas: ["الإجمالي (ر.س)", "Total (SAR)"], reference: ["المرجع", "Reference"],
  anomalyCount: ["عدد الفروقات", "Anomalies"],
  isFlagged: ["معلّم للمراجعة", "Flagged"],
  branchConfirmed: ["تأكيد الفرع", "Branch confirmed"],
  lastCountDate: ["آخر جرد", "Last count"],
  totalItems: ["عدد الأصناف", "Total items"],
  itemCount: ["عدد الأصناف", "Items"],
  countType: ["نوع الجرد", "Count type"],
  revision: ["المراجعة", "Revision"],
  ownerApproval: ["موافقة المالك", "Owner approval"],
};

const enumLabels: Record<string, [string, string]> = {
  "final-approved": ["معتمدة نهائياً", "Final approved"],
  approved: ["معتمد", "Approved"],
  rejected: ["مرفوض", "Rejected"],
  pending: ["معلق", "Pending"],
  debit: ["صادر", "Debit"],
  credit: ["وارد", "Credit"],
  expenses: ["المصروفات", "Expenses"],
  cash: ["العهدة النقدية", "Cash Custody"],
  daily: ["يومي", "Daily"],
  monthly: ["شهري", "Monthly"],
  not_required: ["غير مطلوب", "Not required"],
};

function rowDetails(row: Row, lang: "ar" | "en") {
  const entries = Object.entries(row)
    .filter(([key, value]) => !hiddenKeys.test(key) && !/metadata|details|items|lines|products|attachments/i.test(key) && (!key.endsWith("Halalas") || key in friendlyKeys) && !(key === "amount" && typeof row.amountHalalas === "number") && scalar(value) !== null);
  const sliced = entries.slice(0, 5);
  const refEntry = entries.find(([key]) => key === "reference");
  if (refEntry && !sliced.some(([key]) => key === "reference")) sliced.push(refEntry);
  return sliced
    .map(([key, value]) => {
      const raw = scalar(value);
      const localizedEnum = raw && /^(status|txnType|moduleKey|countType|ownerApproval)$/.test(key)
        ? enumLabels[raw]?.[lang === "ar" ? 0 : 1] : undefined;
      const formatted = typeof value === "boolean"
        ? (value ? (lang === "ar" ? "نعم" : "Yes") : (lang === "ar" ? "لا" : "No"))
        : typeof value === "number"
        ? key.endsWith("Halalas") ? fmtAmt(value / 100, lang) : displayDigits(value, lang)
        : /^(date|operationDate|txnDate|lastCountDate)$/.test(key) ? formatDateLong(lang, raw) || "—"
        : localizedEnum ?? raw ?? "—";
      return {
        label: friendlyKeys[key]?.[lang === "ar" ? 0 : 1] ?? key,
        value: formatted,
      };
    });
}

function errorLabel(moduleKey: HeadOperationalModule, lang: "ar" | "en") {
  const messages: Record<HeadOperationalModule, [string, string]> = {
    expenses: ["تعذر تحميل المصروفات", "Could not load expenses"],
    purchases: ["تعذر تحميل المشتريات", "Could not load purchases"],
    inventory: ["تعذر تحميل بيانات المخزون", "Could not load inventory"],
    cash: ["تعذر تحميل العهد النقدية", "Could not load cash custody"],
    waste: ["تعذر تحميل بيانات الهدر والتالف", "Could not load waste records"],
    assets: ["تعذر تحميل الأصول الثابتة", "Could not load fixed assets"],
  };
  return messages[moduleKey][lang === "ar" ? 0 : 1];
}

function moduleRecords(value: unknown, moduleKey: HeadOperationalModule): Row[] {
  const records = recordsOf(value);
  if (moduleKey !== "purchases") return records;
  const invoices = records.flatMap(group => {
    if (!Array.isArray(group.invoices)) return [group];
    return group.invoices.map(invoiceValue => {
      const invoice = asObject(invoiceValue) ?? {};
      return {
        ...invoice,
        supplierName: invoice.supplierName ?? group.supplierName ?? group.supplier,
        branchName: invoice.branchName ?? group.branchName ?? group.branch,
      };
    });
  });
  return invoices;
}

export function HeadOperationalModuleData({ moduleKey }: { moduleKey: HeadOperationalModule }) {
  const { t, lang, dir } = useLang();
  const query = useHeadOperationalModule(moduleKey);
  const [selectedCustody, setSelectedCustody] = useState<string>();
  const ledgerQuery = useHeadCashCustodyLedger(moduleKey === "cash" ? selectedCustody : undefined);
  const rows = useMemo(() => moduleRecords(query.data, moduleKey), [query.data, moduleKey]);
  const ledger = useMemo(() => recordsOf(ledgerQuery.data), [ledgerQuery.data]);
  const exportCashMut = useExportCash();
  const exportOpsMut = useExportOperations();
  const titles = moduleTitles[moduleKey];

  return (
    <section dir={dir} aria-label={titles[lang === "ar" ? 0 : 1]} className="space-y-3 rounded-xl border border-purple-100 bg-purple-50/40 p-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">{titles[lang === "ar" ? 0 : 1]}</h3>
          <p className="mt-1 text-xs text-gray-500">{t("عرض قراءة فقط من بيانات المحاسب المرتبطة بالشركة والفروع المصرح بها", "Read-only view of accountant data scoped to this company and its authorized branches")}</p>
        </div>
        <div className="flex items-center gap-2">
          {(moduleKey === "cash" || moduleKey === "expenses") && (
            <button
              type="button"
              onClick={() => moduleKey === "cash" ? exportCashMut.mutate({}) : exportOpsMut.mutate({ moduleKey: "expenses", format: "xlsx" })}
              disabled={exportCashMut.isPending || exportOpsMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              <FileText size={12} /> Excel
            </button>
          )}
          {!query.isPending && !query.isError && <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-purple-700">{displayDigits(rows.length, lang)} {t("سجل محمّل", "records loaded")}</span>}
        </div>
      </header>

      {query.isPending && <p role="status" className="rounded-lg bg-white p-4 text-sm text-gray-500">{t("جارٍ تحميل البيانات...", "Loading data...")}</p>}
      {query.isError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorLabel(moduleKey, lang)}</p>}
      {!query.isPending && !query.isError && rows.length === 0 && <p className="rounded-lg bg-white p-4 text-sm text-gray-500">{t("لا توجد سجلات فعلية في نطاق الصلاحية حالياً", "No live records are currently available in this access scope")}</p>}

      {moduleKey === "cash" && rows.length > 0 && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <h4 className="px-4 py-3 text-sm font-bold text-gray-800">{t("قائمة العهد", "Custodies")}</h4>
            {rows.map((row, index) => {
              const custody = row as Row & Partial<CashCustodyRow>;
              const id = typeof custody.id === "string" ? custody.id : "";
              return <button key={id || index} type="button" onClick={() => id && setSelectedCustody(id)} aria-pressed={Boolean(id && id === selectedCustody)} className={`flex w-full flex-wrap items-center gap-2 px-4 py-3 text-start hover:bg-purple-50 ${id && id === selectedCustody ? "bg-purple-50" : ""}`}>
                <span className="min-w-0 flex-1 text-sm font-semibold text-gray-800">{custody.branchName || custody.branchId || t("فرع غير محدد", "Unspecified branch")}</span>
                <span className="text-xs text-gray-500">{custody.custodianName || "—"}</span>
                <span className="font-mono text-xs font-bold text-purple-700">{custody.remainingHalalas == null ? "—" : fmtAmt(custody.remainingHalalas / 100, lang)} {t("ر.س", "SAR")}</span>
              </button>;
            })}
          </div>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <h4 className="px-4 py-3 text-sm font-bold text-gray-800">{t("دفتر حركة العهدة", "Custody ledger")}</h4>
            {!selectedCustody && <p className="p-4 text-sm text-gray-500">{t("اختر عهدة لعرض حركاتها الفعلية", "Select a custody to view its live transactions")}</p>}
            {ledgerQuery.isPending && selectedCustody && <p role="status" className="p-4 text-sm text-gray-500">{t("جارٍ تحميل الحركات...", "Loading transactions...")}</p>}
            {ledgerQuery.isError && selectedCustody && <p role="alert" className="p-4 text-sm text-red-700">{t("تعذر تحميل دفتر العهدة", "Could not load the custody ledger")}</p>}
            {ledger.map((row, index) => <div key={String(row.id ?? index)} className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs">{rowDetails(row, lang).map(item => <span key={item.label} className="rounded-md bg-gray-50 px-2 py-1"><b className="text-gray-500">{item.label}: </b><bdi className="text-gray-800">{item.value}</bdi></span>)}</div>)}
            {selectedCustody && !ledgerQuery.isPending && !ledgerQuery.isError && ledger.length === 0 && <p className="p-4 text-sm text-gray-500">{t("لا توجد حركات مسجلة لهذه العهدة", "No transactions recorded for this custody")}</p>}
          </div>
        </div>
      )}

      {moduleKey !== "cash" && rows.length > 0 && <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        {rows.slice(0, 12).map((row, index) => <article key={String(row.id ?? row.operationId ?? index)} className="min-w-0 rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b className="min-w-0 break-words text-sm text-gray-900">{String(row.branchName ?? row.branch ?? row.name ?? row.title ?? row.supplierName ?? row.operationId ?? `#${displayDigits(index + 1, lang)}`)}</b>
            {scalar(row.status) && <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-600">{enumLabels[String(row.status)]?.[lang === "ar" ? 0 : 1] ?? scalar(row.status)}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{rowDetails(row, lang).map(item => <span key={item.label} className="max-w-full rounded-md bg-gray-50 px-2 py-1 text-[11px] text-gray-600"><b>{item.label}: </b><bdi className="break-words text-gray-800">{item.value}</bdi></span>)}</div>
        </article>)}
      </div>}
      {moduleKey !== "cash" && rows.length > 12 && <p className="text-end text-[11px] text-gray-500">{t("يعرض آخر ١٢ سجلاً من", "Showing 12 of")} {displayDigits(rows.length, lang)}</p>}
    </section>
  );
}
