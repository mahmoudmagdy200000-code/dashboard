import { useState, useRef, useEffect } from "react";
import { X, RefreshCw } from "lucide-react";

/** Static fallback (Arabic labels, keyed by themselves) used when no API list is supplied. */
const PRESET_REASONS: ReasonOption[] = [
  { key: "بيانات غير مكتملة", labelAr: "بيانات غير مكتملة" },
  { key: "فاتورة مفقودة أو غير واضحة", labelAr: "فاتورة مفقودة أو غير واضحة" },
  { key: "تناقض في المبالغ", labelAr: "تناقض في المبالغ" },
  { key: "فرق في الكميات", labelAr: "فرق في الكميات" },
  { key: "مورد غير معتمد", labelAr: "مورد غير معتمد" },
  { key: "تاريخ غير صحيح", labelAr: "تاريخ غير صحيح" },
  { key: "أخرى", labelAr: "أخرى" },
];

/** The `key` is what gets submitted (T03/T04 reject contract), `labelAr` is display. */
export interface ReasonOption {
  key: string;
  labelAr: string;
}

const OTHER_KEY = "other";

interface Props {
  open: boolean;
  /** What's being rejected, e.g. operation publicId, for display only. */
  subject?: string;
  /** API-driven reason list (T03 §13). Falls back to a static list when omitted/empty. */
  reasons?: ReasonOption[];
  /** SHF requires an API reason key, and returning it does not reopen the shift. */
  requireReasons?: boolean;
  returnToManager?: boolean;
  returnToAccountant?: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason: string; notes?: string }) => void | Promise<unknown>;
  /** Optional translate function. */
  t?: (ar: string, en: string) => string;
}

export function RejectModal({
  open,
  subject,
  reasons,
  requireReasons = false,
  returnToManager = false,
  returnToAccountant = false,
  onClose,
  onSubmit,
  t = (ar) => ar,
}: Props) {
  const options = requireReasons ? (reasons ?? []) : reasons && reasons.length > 0 ? reasons : PRESET_REASONS;
  const hasOther = options.some((o) => o.key === OTHER_KEY || o.key === "أخرى");
  const [reasonKey, setReasonKey] = useState<string>(options[0]?.key ?? "");
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync reasonKey if options change
  useEffect(() => {
    if (!reasonKey && options[0]?.key) {
      setReasonKey(options[0].key);
    }
  }, [options, reasonKey]);

  // Escape key support
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isSubmitting, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusable[0];
    const lastEl = focusable[focusable.length - 1];
    firstEl?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };
    const node = modalRef.current;
    node.addEventListener("keydown", handleTab);
    return () => node.removeEventListener("keydown", handleTab);
  }, [open]);

  if (!open) return null;

  const isOther = !requireReasons && hasOther && (reasonKey === OTHER_KEY || reasonKey === "أخرى");
  const finalReason = isOther ? customReason.trim() : reasonKey;
  const canSubmit = finalReason.length > 0 && (isOther || options.some(option => option.key === reasonKey)) && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({ reason: finalReason, notes: notes.trim() || undefined });
      // HA-F21: Reset state and close modal ONLY upon confirmed success!
      setReasonKey(options[0]?.key ?? "");
      setCustomReason("");
      setNotes("");
      onClose();
    } catch (err: any) {
      // HA-F21: Retain draft on failure, do NOT wipe fields and do NOT close modal!
      setSubmitError(err?.message || t("فشل إرسال الطلب، يرجى التحقق وإعادة المحاولة", "Submission failed. Please check and try again"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      onClick={() => { if (!isSubmitting) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,28,53,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{
          width: "100%",
          maxWidth: 480,
          background: "white",
          borderRadius: 16,
          padding: 24,
          fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            <div id="reject-modal-title" style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
              {returnToManager ? t("إرجاع لمدير الفرع", "Return to branch manager") : returnToAccountant ? t("إعادة للمحاسب للتعديل", "Return to accountant for changes") : t("رفض العملية", "Reject Operation")}
            </div>
            {subject && (
              <div
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  marginTop: 4,
                  fontFamily: "monospace",
                }}
              >
                {subject}
              </div>
            )}
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              {returnToManager ? t("ستُعاد العملية إلى مدير الفرع مع سبب الإرجاع. لن يُعاد فتح الوردية ماليًا.", "The operation returns to the branch manager with a reason. This does not financially reopen the shift.") : returnToAccountant ? t("ستُعاد الوردية إلى المحاسب للتعديل مع سبب الإرجاع.", "The shift returns to the accountant for changes with the return reason.") : t("ستُعاد العملية إلى مدير الفرع مع سبب الرفض.", "The operation will be returned to the branch manager with the rejection reason.")}
            </div>
          </div>
          <button
            onClick={() => { if (!isSubmitting) onClose(); }}
            disabled={isSubmitting}
            aria-label={t("إغلاق", "Close")}
            style={{
              background: "transparent",
              border: "none",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              color: "#94a3b8",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Error alert */}
        {submitError && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              color: "#b91c1c",
              fontSize: 12,
              marginBottom: 14,
              lineHeight: 1.4,
            }}
          >
            {submitError}
          </div>
        )}

        {/* Reason select */}
        <label
          htmlFor="reject-reason-select"
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 6,
          }}
        >
          {t("سبب الرفض", "Reason")} <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <select
          id="reject-reason-select"
          value={reasonKey}
          onChange={(e) => setReasonKey(e.target.value)}
          disabled={isSubmitting}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 14,
            background: isSubmitting ? "#f8fafc" : "white",
            color: "#1e293b",
            fontFamily: "inherit",
            marginBottom: 12,
          }}
        >
          {requireReasons && <option value="">{t("اختر سببًا من القائمة", "Select an API reason")}</option>}
          {options.map((r) => (
            <option key={r.key} value={r.key}>
              {r.labelAr}
            </option>
          ))}
        </select>
        {requireReasons && options.length===0 && <p role="status" style={{ fontSize: 12, color: "#b45309", marginBottom: 12 }}>{t("أسباب الإرجاع غير متاحة حاليًا", "Return reasons are currently unavailable")}</p>}

        {isOther && (
          <div>
            <label
              htmlFor="reject-custom-reason"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 6,
              }}
            >
              {t("اكتب السبب", "Type the reason")} <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              id="reject-custom-reason"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder={t("اكتب السبب", "Type the reason")}
              autoFocus
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 14,
                fontFamily: "inherit",
                marginBottom: 12,
              }}
            />
          </div>
        )}

        {/* Notes */}
        <label
          htmlFor="reject-notes-textarea"
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 6,
          }}
        >
          {t("ملاحظات (اختياري)", "Notes (optional)")}
        </label>
        <textarea
          id="reject-notes-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
          rows={3}
          placeholder={t("تفاصيل إضافية...", "Additional details...")}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 14,
            fontFamily: "inherit",
            resize: "vertical",
            marginBottom: 16,
          }}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-start" }}>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: "10px 20px",
              background: canSubmit ? "#ef4444" : "#cbd5e1",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isSubmitting && <RefreshCw size={13} className="animate-spin" />}
            <span>{returnToManager || returnToAccountant ? t("تأكيد الإرجاع", "Confirm return") : t("تأكيد الرفض", "Confirm Reject")}</span>
          </button>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: "10px 20px",
              background: "white",
              color: isSubmitting ? "#94a3b8" : "#475569",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {t("إلغاء", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
