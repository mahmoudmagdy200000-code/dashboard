import { useDialogFocus } from "./useDialogFocus";
import { useState, useRef } from "react";
import { X, HelpCircle } from "lucide-react";

interface Props {
  open: boolean;
  /** What's being clarified, e.g. operation publicId, for display only. */
  subject?: string;
  onClose: () => void;
  onSubmit: (payload: { message: string }) => void | Promise<unknown>;
  /** Optional translate function. */
  t?: (ar: string, en: string) => string;
}

/**
 * Request-clarification modal (T03 §6) — non-terminal: sends a message to the
 * submitter without changing the operation's status. Mirrors RejectModal's look.
 */
export function ClarifyModal({
  open,
  subject,
  onClose,
  onSubmit,
  t = (ar) => ar,
}: Props) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const submitLock = useRef(false);
  const dir = t("rtl", "ltr") as "rtl" | "ltr";
  useDialogFocus(open, modalRef, onClose, isSubmitting);

  if (!open) return null;

  const canSubmit = message.trim().length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit || submitLock.current) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({ message: message.trim() });
      setMessage("");
      onClose();
    } catch (err: any) {
      setSubmitError(
        err?.message ||
          t(
            "فشل إرسال طلب الإيضاح، يرجى المحاولة مرة أخرى",
            "Failed to send clarification request. Please try again.",
          ),
      );
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div
      onClick={() => { if (!submitLock.current) onClose(); }}
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
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clarify-modal-title"
        aria-busy={isSubmitting}
        dir={dir}
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "90dvh",
          overflowY: "auto",
          background: "white",
          borderRadius: 16,
          padding: 24,
          fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            <div id="clarify-modal-title"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <HelpCircle size={18} style={{ color: "#f59e0b" }} />
              {t("طلب توضيح", "Request Clarification")}
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
              {t(
                "سيُرسل الطلب إلى من رفع العملية دون تغيير حالتها.",
                "The request is sent to the submitter without changing the operation's status.",
              )}
            </div>
          </div>
          <button
            disabled={isSubmitting}
            aria-label={t("إغلاق", "Close")}
            onClick={() => { if (!submitLock.current) onClose(); }}
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

        <label htmlFor="clarify-message"
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            marginBottom: 6,
          }}
        >
          {t("الرسالة", "Message")} <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <textarea id="clarify-message" disabled={isSubmitting}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          autoFocus
          placeholder={t("مثال: أرفق تقرير POS", "e.g. Attach the POS report")}
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

        {submitError && (
          <div role="alert"
            style={{
              padding: "8px 12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              color: "#b91c1c",
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            {submitError}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-start" }}>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: "10px 20px",
              background: canSubmit ? "#f59e0b" : "#cbd5e1",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            {t("إرسال الطلب", "Send Request")}
          </button>
          <button
            disabled={isSubmitting}
            aria-label={t("إغلاق", "Close")}
            onClick={() => { if (!submitLock.current) onClose(); }}
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
