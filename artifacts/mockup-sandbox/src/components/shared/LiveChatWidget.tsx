import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import {
  useStartChatSession,
  useChatSession,
  useSendChatMessage,
  useCloseChatSession,
} from "../../api/queries/chat";
import { getEcho } from "../../api/echo";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  t?: (ar: string, en: string) => string;
}

const FONT = "'IBM Plex Sans Arabic', system-ui, sans-serif";

export function LiveChatWidget({ t = (ar) => ar }: Props) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const startMut = useStartChatSession();
  const sendMut = useSendChatMessage();
  const closeMut = useCloseChatSession();
  const { data: session } = useChatSession(sessionId);
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to the per-session realtime channel while a session is open.
  useEffect(() => {
    if (!sessionId) return;
    const echo = getEcho();
    if (!echo) return;
    const ch = echo.private(`chat.session.${sessionId}`);
    const invalidate = () =>
      qc.invalidateQueries({ queryKey: ["support", "chat", sessionId] });
    ch.listen(".message.new", invalidate);
    ch.listen(".agent.joined", invalidate);
    ch.listen(".session.closed", invalidate);
    return () => {
      echo.leave(`chat.session.${sessionId}`);
    };
  }, [sessionId, qc]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [session?.messages?.length]);

  const handleOpen = async () => {
    setOpen(true);
    if (!sessionId) {
      try {
        const res = await startMut.mutateAsync();
        setSessionId(res.sessionId);
      } catch {
        // Start failed (e.g. 403 for a role without support access). The hook's
        // onError already toasts — just close the panel instead of hanging on
        // "Connecting…" (and don't let the rejection reach the error overlay).
        setOpen(false);
      }
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !sessionId || sendMut.isPending) return;
    const currentText = text.trim();
    try {
      await sendMut.mutateAsync({ sessionId, text: currentText });
      setText("");
    } catch {
      // Draft preserved in text state on failure!
    }
  };

  // Close the popup UI without terminating the active server session
  const handleMinimize = () => {
    setOpen(false);
  };

  // Explicitly terminate the server session upon user confirmation
  const handleEndSession = () => {
    if (window.confirm(t("هل أنت متأكد من إنهاء جلسة الدعم؟", "Are you sure you want to end this chat session?"))) {
      if (sessionId) closeMut.mutate(sessionId);
      setSessionId(null);
      setOpen(false);
    }
  };

  // Floating launcher button
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        aria-label={t("الدردشة الفورية", "Live chat")}
        style={{
          position: "fixed",
          insetInlineEnd: 24,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #7C3AED, #00D9FF)",
          color: "white",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 90,
        }}
      >
        <MessageCircle size={26} />
      </button>
    );
  }

  const queued = session?.status === "queued";
  const closed = session?.status === "closed";

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        insetInlineEnd: 24,
        bottom: 24,
        width: 360,
        maxWidth: "calc(100vw - 32px)",
        height: 520,
        maxHeight: "calc(100vh - 48px)",
        background: "white",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
        zIndex: 95,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #7C3AED, #00D9FF)",
          color: "white",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t("الدعم الفوري", "Live Support")}</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>
            {startMut.isPending || !session
              ? t("جاري الاتصال...", "Connecting...")
              : session.status === "active"
                ? t("متصل بفريق الدعم", "Connected to support")
                : queued
                  ? t("في قائمة الانتظار...", "In queue...")
                  : t("انتهت المحادثة", "Chat ended")}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {sessionId && !closed && (
            <button
              type="button"
              onClick={handleEndSession}
              style={{
                background: "rgba(239,68,68,0.2)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
                fontSize: 10,
                borderRadius: 6,
                padding: "2px 8px",
                cursor: "pointer",
                fontWeight: 600,
              }}
              title={t("إنهاء الجلسة", "End session")}
              aria-label={t("إنهاء الجلسة", "End session")}
            >
              {t("إنهاء", "End")}
            </button>
          )}
          <button
            type="button"
            onClick={handleMinimize}
            style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", padding: 4 }}
            title={t("تصغير", "Minimize")}
            aria-label={t("تصغير نافذة الدردشة", "Minimize chat window")}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, background: "#f8fafc", display: "flex", flexDirection: "column", gap: 8 }}>
        {(startMut.isPending || !session) && (
          <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
            <Loader2 size={22} className="animate-spin" style={{ color: "#7C3AED" }} />
          </div>
        )}
        {queued && (
          <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", padding: 12 }}>
            {t("سيتصل بك أحد ممثلي الدعم قريباً", "A support agent will join shortly")}
          </div>
        )}
        {session?.messages?.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.authorType === "user" ? "flex-start" : "flex-end",
              maxWidth: "78%",
              background: m.authorType === "user" ? "linear-gradient(135deg, #7C3AED, #00D9FF)" : "white",
              color: m.authorType === "user" ? "white" : "#1e293b",
              border: m.authorType === "user" ? "none" : "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "8px 12px",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {m.text}
            <div style={{ fontSize: 9, opacity: 0.7, marginTop: 3 }}>
              {new Date(m.sentAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #e2e8f0" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={closed}
          placeholder={closed ? t("انتهت المحادثة", "Chat ended") : t("اكتب رسالتك...", "Type a message...")}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            fontFamily: FONT,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={closed || !text.trim() || sendMut.isPending}
          aria-label={t("إرسال الرسالة", "Send message")}
          style={{
            width: 42,
            borderRadius: 10,
            border: "none",
            background: closed || !text.trim() || sendMut.isPending ? "#cbd5e1" : "linear-gradient(135deg, #7C3AED, #00D9FF)",
            color: "white",
            cursor: closed || !text.trim() || sendMut.isPending ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {sendMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
