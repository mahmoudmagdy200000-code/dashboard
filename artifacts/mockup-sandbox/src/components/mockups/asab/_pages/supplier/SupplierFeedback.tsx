import type { Page } from "../../../../../api/client";
import { useLang } from "../../_shared/LangContext";

export function SupplierQueryState({ query }: { query: { isPending: boolean; isError: boolean; refetch: () => unknown } }) {
  const { t } = useLang();
  if (query.isPending) return <p role="status">{t("جارٍ التحميل…", "Loading…")}</p>;
  if (query.isError) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
    <p>{t("تعذر تحميل البيانات. لم تُعتبر القيم المفقودة أصفارًا.", "Could not load data. Missing values are not zero.")}</p>
    <button type="button" className="min-h-11 underline" onClick={() => query.refetch()}>{t("إعادة المحاولة", "Retry")}</button>
  </div>;
  return null;
}

export function SupplierPagination({ meta, page, setPage, busy }: {
  meta?: Page<unknown>["meta"]; page: number; setPage: (page: number) => void; busy: boolean;
}) {
  const { t } = useLang();
  if (!meta) return null;
  return <nav aria-label={t("صفحات الطلبات", "Order pages")} className="flex flex-wrap items-center gap-3">
    <button type="button" className="min-h-11 rounded-lg border px-3" disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>{t("السابق", "Previous")}</button>
    <span aria-live="polite">{t("الصفحة", "Page")} {meta.page} / {meta.totalPages} · {t("إجمالي الطلبات", "Total orders")} {meta.total}</span>
    <button type="button" className="min-h-11 rounded-lg border px-3" disabled={busy || page >= meta.totalPages} onClick={() => setPage(page + 1)}>{t("التالي", "Next")}</button>
  </nav>;
}
