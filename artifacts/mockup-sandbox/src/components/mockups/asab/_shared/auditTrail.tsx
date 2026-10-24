import { Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge } from "../components/Badge";
import type { Op } from "./types";

export function LockBanner({ op }: { op?: Op }) {
  const isErpPosted = op?.erpPosted === true;
  return (
    <div className="rounded-xl overflow-hidden border-2 border-emerald-300 shadow-md" dir="rtl">
      {/* Authoritative header stripe */}
      <div className={`flex items-center justify-between px-5 py-3 ${isErpPosted ? "bg-gradient-to-l from-emerald-700 to-emerald-600" : "bg-gradient-to-l from-slate-700 to-slate-600"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Lock size={14} className="text-white" />
          </div>
          <div>
            <p className="text-white font-extrabold text-sm leading-tight">
              {isErpPosted ? "سجل مُغلق ومُرحَّل لـ ERP" : "سجل مُغلق — معتمد نهائياً"}
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              {isErpPosted
                ? `دفعة الترحيل: ${op?.erpBatchId || "—"} · ${op?.erpPostedAt || "—"}`
                : "معتمد نهائياً · في انتظار الترحيل لـ ERP"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs font-bold border ${isErpPosted ? "bg-white/20 text-white border-white/30" : "bg-white/20 text-white border-white/30"}`}>
            <CheckCircle2 size={10} />
            {isErpPosted ? "مُرحَّل لـ ERP" : "معتمد نهائياً"}
          </Badge>
        </div>
      </div>
      {/* Immutability notice */}
      <div className="bg-emerald-50 border-t border-emerald-200 px-5 py-2.5 flex items-center gap-2">
        <AlertTriangle size={12} className="text-emerald-600 flex-shrink-0" />
        <p className="text-xs text-emerald-700 font-medium">
          هذا السجل وصل للحالة النهائية ولا يمكن تعديله أو عكسه. أي تصحيح يتطلب إنشاء عملية تعديل مستقلة مرتبطة بهذا السجل.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUDIT TRAIL BUILDER  (derives lifecycle from op state)
// ─────────────────────────────────────────────
export interface AuditEvent {
  icon: string;
  cls: string;
  action: string;
  by: string;
  time: string;
  isTerminal?: boolean;
}

export function buildAuditTrail(op: Op): AuditEvent[] {
  const trail: AuditEvent[] = [];

  // Step 1: Creation (always present)
  trail.push({
    icon: "📋", cls: "bg-blue-50 text-blue-600",
    action: `أُنشئ السجل: ${op.id}${op.isCorrection ? ` (تعديل على ${op.correctiveRef})` : ""}`,
    by: op.submittedBy || "مدير الفرع",
    time: "08:00 ص"
  });

  // Step 2: Submission
  trail.push({
    icon: "📤", cls: "bg-blue-50 text-blue-600",
    action: "رُفع للمراجعة المحاسبية",
    by: op.submittedBy || "مدير الفرع",
    time: "08:15 ص"
  });

  // Step 3: Accountant review (if beyond pending)
  if (op.status !== "pending") {
    if (op.status === "rejected") {
      trail.push({
        icon: "✕", cls: "bg-red-50 text-red-600",
        action: `مرفوض — السبب: ${op.rejectReason || "لم يُذكر سبب"}`,
        by: op.rejectedBy || op.approvedBy || "المحاسب المختص",
        time: op.rejectedAt || "10:45 ص",
        isTerminal: true
      });
    } else {
      trail.push({
        icon: "✓", cls: "bg-emerald-50 text-emerald-600",
        action: "راجعه المحاسب ووافق عليه — أُرسل لرئيس الحسابات",
        by: op.approvedBy || "المحاسب المختص",
        time: op.approvedAt || "09:30 ص"
      });
    }
  }

  // Step 4: Head accountant final approval
  if (op.status === "final-approved") {
    trail.push({
      icon: "🔒", cls: "bg-emerald-100 text-emerald-700",
      action: "اعتمده رئيس الحسابات نهائياً — سجل مُغلق",
      by: op.finalApprovedBy || "رئيس الحسابات",
      time: op.finalApprovedAt || "16:42 م",
      isTerminal: !op.erpPosted
    });
  }

  // Step 5: ERP posting (if done)
  if (op.erpPosted) {
    trail.push({
      icon: "🔗", cls: "bg-indigo-50 text-indigo-600",
      action: `رُحِّل إلى نظام ERP — دفعة: ${op.erpBatchId || "—"}`,
      by: "النظام التلقائي / رئيس الحسابات",
      time: op.erpPostedAt || "17:00 م",
      isTerminal: true
    });
  }

  return trail;
}
