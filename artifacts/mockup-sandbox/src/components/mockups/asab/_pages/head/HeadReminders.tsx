import { CheckCircle2 } from "lucide-react";
import {
  useHeadRemindersPlatform,
  usePatchHeadReminderPlatform,
  useMarkAllHeadRemindersDonePlatform,
} from "../../../../../api/queries";
import { useLang } from "../../_shared/LangContext";
import type { PageProps } from "../../_shared/types";
import { Btn } from "../../components/Btn";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";

// B-H6: head reminders are now a real platform surface (/head/reminders). This replaces the
// previous reuse of the accountant page whose send-buttons were local-only and whose list
// came from the wrong (accountant) endpoint.
export function HeadReminders({ }: PageProps) {
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
