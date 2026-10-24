import { useState } from "react";
import { CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
import { useLang } from "../../_shared/LangContext";
import { useAccountantOperationsPlatform } from "../../../../../api/queries";
import { applyFilters, BRANCHES } from "../../_shared/filterOps";
import { opDetailPage } from "../../_shared/formatters";
import { FilterBar } from "../../_shared/FilterBar";
import { OpRow } from "../../_shared/OpRow";
import { Card } from "../../components/Card";
import { Btn } from "../../components/Btn";
import { EmptyState } from "../../components/EmptyState";
import { KpiCard } from "../../components/KpiCard";
import type { Filters, ModuleKey, PageId, PageProps } from "../../_shared/types";

export function AccModulePage({ moduleKey, title, navigate, setModal, setDetailId, ops, approveOp, rejectOp, bulkApprove }: PageProps & { moduleKey: ModuleKey; title: string }) {
  const { t } = useLang();
  // Subscribe to live operations for this module — falls back to inline ops on empty.
  useAccountantOperationsPlatform({ moduleKey });
  const [filters, setFilters] = useState<Filters>({ branch: "", status: "", match: "", search: "" });
  const mOps = ops.filter(o => o.moduleKey === moduleKey);
  const filtered = applyFilters(ops, filters, moduleKey);
  const pending = mOps.filter(o => o.status === "pending");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">{t("موديول", "Module")} {title}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{pending.length} {t("بيان معلق بانتظار مراجعتك", "pending statements awaiting your review")}</p>
        </div>
        <div className="flex gap-2">
          {pending.length > 0 && <Btn variant="success" size="sm" onClick={() => bulkApprove(pending.map(o => o.id))}>✓ {t("موافقة على الكل", "Approve All")} ({pending.length})</Btn>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label={t("إجمالي البيانات المرفوعة", "Total Uploaded")} value={String(mOps.length)} sub={t("كل الحالات", "All statuses")} icon={<FileText size={18} className="text-purple-600" />} accent="purple" />
        <KpiCard label={t("قيد المراجعة", "Under Review")} value={String(pending.length)} sub={t("رُفعت من الفروع", "Uploaded from branches")} icon={<Clock size={18} className="text-amber-600" />} accent="amber" />
        <KpiCard label={t("تمت الموافقة", "Approved")} value={String(mOps.filter(o => o.status === "approved").length)} sub={t("بانتظار الاعتماد النهائي", "Awaiting final approval")} icon={<CheckCircle2 size={18} className="text-sky-600" />} accent="blue" />
        <KpiCard label={t("مرفوضة", "Rejected")} value={String(mOps.filter(o => o.status === "rejected").length)} sub={t("تحتاج إعادة رفع من الفرع", "Needs re-upload from branch")} icon={<XCircle size={18} className="text-red-600" />} accent="red" />
      </div>

      <FilterBar filters={filters} onChange={setFilters} branches={BRANCHES} />

      <Card title={`${t("عمليات", "Operations")} ${title}`}>
        {filtered.length === 0
          ? <EmptyState icon="✅" title={t("لا توجد عمليات", "No Operations")} desc={t("لا توجد عمليات تطابق الفلاتر المحددة", "No operations match the selected filters")} />
          : filtered.map(op => (
            <OpRow key={op.id} op={op}
              onView={() => { setDetailId(op.id); navigate(opDetailPage(op.moduleKey) as PageId); }}
              onApprove={() => approveOp(op.id)}
              onReject={() => { setDetailId(op.id); setModal("reject"); }} />
          ))
        }
      </Card>
    </div>
  );
}
