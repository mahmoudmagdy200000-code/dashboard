import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, ChevronsRight } from "lucide-react";
import { useLang, type Lang } from "./LangContext";
import { fmtAmt } from "./formatters";
import type { Op, PageId, ExceptionItem } from "./types";
import {
  EXCEPTION_SEV_CFG,
  EN_SEV_LABEL,
  EN_EXCEPTION_UI,
  EN_EXCEPTION_ITEMS,
} from "./displayConfig";
import { topModulePage } from "./filterOps";

export function deriveExceptions(ops: Op[], forRole: "accountant" | "head", lang: Lang = "ar"): ExceptionItem[] {
  const en = lang === "en";
  const items: ExceptionItem[] = [];

  // 1. Ops stuck too long in review (pending > 2 days)
  const stuck = ops.filter(o =>
    o.status === "pending" &&
    ((o.timeAgo ?? "").includes("3 أيام") || (o.timeAgo ?? "").includes("4 أيام") || (o.timeAgo ?? "").includes("أسبوع"))
  );
  if (stuck.length > 0) {
    const oldestAge = stuck.map(o => o.timeAgo).sort().pop() || "";
    const totalAmt = stuck.some(o => o.amount == null) ? null : stuck.reduce((s, o) => s + (o.amount ?? 0), 0);
    const navTarget = forRole === "head" ? "head-pending" as PageId : topModulePage(stuck, "acc-", "acc-sales");
    items.push({
      severity: "high", icon: "⏰",
      label: en ? EN_EXCEPTION_ITEMS.stuck.label : "بيانات معلقة منذ أكثر من يومين بدون مراجعة",
      count: stuck.length,
      owner: en
        ? (forRole === "head" ? EN_EXCEPTION_ITEMS.stuck.ownerHead : EN_EXCEPTION_ITEMS.stuck.ownerAcc)
        : (forRole === "head" ? "المحاسب المُكلَّف بالفرع" : "أنت — هذه ضمن فروعك"),
      action: en ? EN_EXCEPTION_ITEMS.stuck.action : "افتح كل عملية معلقة وأكمل المراجعة أو ارفضها بسبب واضح",
      age: en
        ? `${EN_EXCEPTION_ITEMS.stuck.agePrefix}${oldestAge}${EN_EXCEPTION_ITEMS.stuck.ageSuffix}`
        : `أطول تأخير: ${oldestAge} — تجاوز الحد المقبول`,
      impact: en
        ? `${totalAmt != null ? fmtAmt(totalAmt) : "—"}${EN_EXCEPTION_ITEMS.stuck.impactSuffix}`
        : `${fmtAmt(totalAmt)} ر.س لم تدخل دورة الاعتماد — تعطل التجميع الشهري`,
      navTarget,
      navLabel: en
        ? (forRole === "head" ? EN_EXCEPTION_ITEMS.stuck.navLabelHead : EN_EXCEPTION_ITEMS.stuck.navLabelAcc)
        : (forRole === "head" ? "عرض المعلقة" : "فتح الموديول"),
      detail: stuck.map(o => `${o.branch} · ${o.moduleLabel}`).slice(0, 3).join(" | "),
    });
  }

  // 2. Unresolved quantity/price differences — critical risk (blocks consolidation)
  const diffs = ops.filter(o => o.match === "diff" && o.status === "pending");
  if (diffs.length > 0) {
    const totalDiff = diffs.some(o => o.amount == null) ? null : diffs.reduce((s, o) => s + (o.amount ?? 0), 0);
    const navTarget = forRole === "head" ? "head-pending" as PageId : topModulePage(diffs, "acc-", "acc-purchases");
    items.push({
      severity: "critical", icon: "⚠",
      label: en ? EN_EXCEPTION_ITEMS.diffs.label : "فروق في الكميات أو الأسعار لم تُحل بعد",
      count: diffs.length,
      owner: en
        ? (forRole === "head" ? EN_EXCEPTION_ITEMS.diffs.ownerHead : EN_EXCEPTION_ITEMS.diffs.ownerAcc)
        : (forRole === "head" ? "المحاسب المُكلَّف — يتطلب تدخل رئيس الحسابات للحالات المعقدة" : "أنت — الفرق يستوجب قرارك"),
      action: en ? EN_EXCEPTION_ITEMS.diffs.action : "راجع الفرق، أصدر عملية تعديل، أو احتسب الفرق وأقفل البيان",
      age: diffs.map(o => o.timeAgo).join(" · "),
      impact: en
        ? `${fmtAmt(totalDiff)}${EN_EXCEPTION_ITEMS.diffs.impactSuffix}`
        : `${fmtAmt(totalDiff)} ر.س في بيانات مع فروق — لا يمكن تجميعها حتى تُحل`,
      navTarget,
      navLabel: en ? EN_EXCEPTION_ITEMS.diffs.navLabel : "عرض البيانات المُختلفة",
      detail: diffs.map(o => o.diff || "").filter(Boolean).slice(0, 2).join(" | "),
    });
  }

  // 3. Final-approved items still waiting ERP export — head only
  if (forRole === "head") {
    const pendingErp = ops.filter(o => o.status === "final-approved" && !o.erpPosted);
    if (pendingErp.length > 0) {
      const pendingAmt = pendingErp.some(o => o.amount == null) ? null : pendingErp.reduce((s, o) => s + (o.amount ?? 0), 0);
      items.push({
        severity: "medium", icon: "🔗",
        label: en ? EN_EXCEPTION_ITEMS.pendingErp.label : "عمليات مُعتمدة نهائياً لم تُرحَّل لـ ERP بعد",
        count: pendingErp.length,
        owner: en ? EN_EXCEPTION_ITEMS.pendingErp.owner : "رئيس الحسابات — يملك صلاحية تشغيل دفعة الترحيل",
        action: en ? EN_EXCEPTION_ITEMS.pendingErp.action : "انتقل إلى التصدير لـ ERP وأنشئ دفعة ترحيل لهذه العمليات",
        age: en ? EN_EXCEPTION_ITEMS.pendingErp.age : "مُعتمدة — في انتظار الدفعة",
        impact: en
          ? `${fmtAmt(pendingAmt)}${EN_EXCEPTION_ITEMS.pendingErp.impactSuffix}`
          : `${fmtAmt(pendingAmt)} ر.س غائبة عن ERP — تقارير المالك ناقصة`,
        navTarget: "head-erp",
        navLabel: en ? EN_EXCEPTION_ITEMS.pendingErp.navLabel : "فتح صفحة التصدير لـ ERP",
      });
    }
  }

  // 4. Corrective operations pending review
  const corrections = ops.filter(o => o.isCorrection && o.status === "pending");
  if (corrections.length > 0) {
    const navTarget = forRole === "head" ? "head-pending" as PageId : topModulePage(corrections, "acc-", "acc-sales");
    items.push({
      severity: "medium", icon: "🔄",
      label: en ? EN_EXCEPTION_ITEMS.corrections.label : "عمليات تعديل مُرتبطة بعمليات سابقة تنتظر المراجعة",
      count: corrections.length,
      owner: en
        ? (forRole === "head" ? EN_EXCEPTION_ITEMS.corrections.ownerHead : EN_EXCEPTION_ITEMS.corrections.ownerAcc)
        : (forRole === "head" ? "المحاسب المُصدِر للتعديل" : "أنت — التعديل مرتبط ببيان أصدرته"),
      action: en ? EN_EXCEPTION_ITEMS.corrections.action : "راجع عملية التعديل وتحقق من صحة المبالغ المُصحَّحة قبل الموافقة",
      age: corrections.map(o => o.timeAgo).slice(0, 2).join(" · "),
      impact: en ? EN_EXCEPTION_ITEMS.corrections.impact : "عدم الموافقة على التعديل يُبقي الرصيد الأصلي مغلوطاً في القيد المحاسبي",
      navTarget,
      navLabel: en ? EN_EXCEPTION_ITEMS.corrections.navLabel : "فتح عمليات التعديل",
      detail: corrections.map(o => `${o.id} ← ${o.correctiveRef || ""}`).slice(0, 2).join(" | "),
    });
  }

  // 5. Branches with repeated rejection patterns (≥2 rejections)
  const rejByBranch: Record<string, { count: number; total: number }> = {};
  ops.filter(o => o.status === "rejected").forEach(o => {
    if (!rejByBranch[o.branch]) rejByBranch[o.branch] = { count: 0, total: 0 };
    rejByBranch[o.branch].count++; rejByBranch[o.branch].total += (o.amount ?? 0);
  });
  const problemBranches = Object.entries(rejByBranch).filter(([, v]) => v.count >= 2);
  if (problemBranches.length > 0) {
    const totalRejected = problemBranches.reduce((s, [, v]) => s + v.total, 0);
    items.push({
      severity: "medium", icon: "📍",
      label: en ? EN_EXCEPTION_ITEMS.problemBranches.label : "فروع تظهر نمط رفض متكرر للبيانات",
      count: problemBranches.length,
      owner: en
        ? `${EN_EXCEPTION_ITEMS.problemBranches.ownerPrefix}${forRole === "head" ? EN_EXCEPTION_ITEMS.problemBranches.ownerSuffix_head : EN_EXCEPTION_ITEMS.problemBranches.ownerSuffix_acc}`
        : "مدير الفرع + " + (forRole === "head" ? "رئيس الحسابات" : "أنت"),
      action: en ? EN_EXCEPTION_ITEMS.problemBranches.action : "تواصل مع مدير الفرع لتحديد سبب الأخطاء المتكررة وتصحيح منهجية الرفع",
      age: en ? EN_EXCEPTION_ITEMS.problemBranches.age : "نمط متكرر — ليس حادثة معزولة",
      impact: en
        ? `${fmtAmt(totalRejected)}${EN_EXCEPTION_ITEMS.problemBranches.impactSuffix}`
        : `${fmtAmt(totalRejected)} ر.س في بيانات مرفوضة — مؤشر على مشكلة هيكلية`,
      navTarget: forRole === "head" ? "head-rejected" : "acc-sales" as PageId,
      navLabel: en ? EN_EXCEPTION_ITEMS.problemBranches.navLabel : "عرض المرفوضة",
      detail: problemBranches.map(([b, v]) => `${b} (${v.count} ${en ? "rejected" : "مرفوضة"})`).join(" | "),
    });
  }

  return items;
}

export function ExceptionPanel({ ops, forRole, navigate }: { ops: Op[]; forRole: "accountant" | "head"; navigate: (p: PageId) => void }) {
  const { lang, dir } = useLang();
  const eui = lang === "en" ? EN_EXCEPTION_UI : {
    noExceptions: "لا استثناءات مكتشفة — النظام يعمل بشكل طبيعي",
    panelTitle: "استثناءات تستوجب التدخل",
    responsible: "المسؤول", since: "منذ",
    requiredAction: "الإجراء المطلوب",
    financialImpact: "الأثر المالي / التشغيلي إذا لم يُحل",
    context: "السياق",
    navigateCTA: "انتقل مباشرةً إلى السجلات المُتأثرة للتدخل",
    collapse: "▲ طي", expand: "▼ توسيع",
  };
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const exceptions = deriveExceptions(ops, forRole, lang);
  const criticalCount = exceptions.filter(e => e.severity === "critical").length;
  const highCount = exceptions.filter(e => e.severity === "high").length;

  if (exceptions.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5 flex items-center gap-3" dir={dir}>
        <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-emerald-800">{eui.noExceptions}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" dir={dir}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
        <div className="flex items-center gap-3">
          <AlertTriangle size={15} className={criticalCount > 0 ? "text-red-500" : "text-amber-500"} />
          <span className="font-bold text-gray-900 text-sm">{eui.panelTitle}</span>
          <div className="flex items-center gap-1.5">
            {criticalCount > 0 && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">{criticalCount} {lang === "en" ? "Critical" : "حرج"}</span>}
            {highCount > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">{highCount} {lang === "en" ? "High" : "عالي"}</span>}
            {exceptions.filter(e => e.severity === "medium").length > 0 &&
              <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-200">{exceptions.filter(e => e.severity === "medium").length} {lang === "en" ? "Medium" : "متوسط"}</span>}
          </div>
        </div>
        <span className="text-[11px] text-gray-400 font-medium">{open ? eui.collapse : eui.expand}</span>
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {exceptions.map((ex, i) => {
            const sev = EXCEPTION_SEV_CFG[ex.severity];
            const sevLabel = lang === "en" ? (EN_SEV_LABEL[ex.severity] || sev.label) : sev.label;
            const isExp = expanded === i;
            return (
              <div key={i} className={`${sev.cls} transition-colors`}>
                <button onClick={() => setExpanded(isExp ? null : i)}
                  className={`w-full px-5 py-3.5 flex items-start gap-4 ${dir === "ltr" ? "text-left" : "text-right"} hover:brightness-95 transition-all`}>
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${sev.barCls}`} />
                  <span className="text-xl flex-shrink-0 mt-0.5">{ex.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-bold text-sm ${sev.titleCls}`}>{ex.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.badgeCls}`}>{sevLabel}</span>
                      <span className={`font-mono font-extrabold text-base ${sev.titleCls}`}>{ex.count}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-[11px]">
                      <span className="flex items-center gap-1 text-gray-600">
                        <span className="font-semibold text-gray-500">{eui.responsible}</span>
                        <span>{ex.owner}</span>
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <span className="font-semibold text-gray-500">{eui.since}</span>
                        <span>{ex.age}</span>
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 mt-1">{isExp ? "▲" : "▼"}</span>
                </button>

                {isExp && (
                  <div className="px-5 pb-4 pr-12 space-y-2.5">
                    <div className="bg-white/70 rounded-xl border border-white/80 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-amber-700">!</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">{eui.requiredAction}</p>
                          <p className="text-sm font-semibold text-gray-800">{ex.action}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-red-100 border border-red-200 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-red-700">{lang === "en" ? "R" : "ر"}</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">{eui.financialImpact}</p>
                          <p className="text-sm text-gray-700">{ex.impact}</p>
                        </div>
                      </div>
                      {ex.detail && (
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gray-500">i</span>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">{eui.context}</p>
                            <p className="text-xs text-gray-500 font-mono">{ex.detail}</p>
                          </div>
                        </div>
                      )}
                      <div className="pt-2 border-t border-white/60 flex items-center justify-between">
                        <p className="text-[10px] text-gray-400">{eui.navigateCTA}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(ex.navTarget); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sev.badgeCls} border hover:opacity-80`}>
                          <ChevronsRight size={12} />
                          {ex.navLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
