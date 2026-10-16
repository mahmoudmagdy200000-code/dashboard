import { useState } from "react";
import { X } from "lucide-react";

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
  onClose: () => void;
  onSubmit: (payload: { reason: string; notes?: string }) => void;
  /** Optional translate function. */
  t?: (ar: string, en: string) => string;
}

export function RejectModal({
  open,
  subject,
  reasons,
  requireReasons = false,
  returnToManager = false,
  onClose,
  onSubmit,
  t = (ar) => ar,
}: Props) {
  const options = requireReasons ? (reasons ?? []) : reasons && reasons.length > 0 ? reasons : PRESET_REASONS;
  const hasOther = options.some((o) => o.key === OTHER_KEY || o.key === "أخرى");
  const [reasonKey, setReasonKey] = useState<string>(options[0]?.key ?? "");
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");

  if (!open) return null;

  const isOther = !requireReasons && hasOther && (reasonKey === OTHER_KEY || reasonKey === "أخرى");
  const finalReason = isOther ? customReason.trim() : reasonKey;
  const canSubmit = finalReason.length > 0 && (isOther || options.some(option => option.key === reasonKey));

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({ reason: finalReason, notes: notes.trim() || undefined });
    setReasonKey(options[0]?.key ?? "");
    setCustomReason("");
    setNotes("");
    onClose();
  }

  return (
    <div
      onClick={onClose}
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
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
              {returnToManager ? t("إرجاع لمدير الفرع", "Return to branch manager") : t("رفض العملية", "Reject Operation")}
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
              {returnToManager ? t("ستُعاد العملية إلى مدير الفرع مع سبب الإرجاع. لن يُعاد فتح الوردية ماليًا.", "The operation returns to the branch manager with a reason. This does not financially reopen the shift.") : t("ستُعاد العملية إلى مدير الفرع مع سبب الرفض.", "The operation will be returned to the branch manager with the rejection reason.")}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Reason select */}
        <label
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
          value={reasonKey}
          onChange={(e) => setReasonKey(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 14,
            background: "white",
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
          <input
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder={t("اكتب السبب", "Type the reason")}
            autoFocus
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
        )}

        {/* Notes */}
        <label
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
            }}
          >
            {returnToManager ? t("تأكيد الإرجاع", "Confirm return") : t("تأكيد الرفض", "Confirm Reject")}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "white",
              color: "#475569",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
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
