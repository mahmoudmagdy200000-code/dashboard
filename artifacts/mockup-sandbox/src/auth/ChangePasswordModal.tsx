import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { changePassword } from "../api/auth";
import { getErrorMessage } from "../api/errors";

interface Props {
  open: boolean;
  onClose: () => void;
  required?: boolean;
}

export function ChangePasswordModal({ open, onClose, required = false }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mut = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور");
      setCurrent("");
      setNext("");
      setConfirm("");
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e, "ar")),
  });

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current || !next || !confirm) {
      toast.error("أكمل جميع الحقول");
      return;
    }
    if (next.length < 8) {
      toast.error("كلمة المرور الجديدة لازم 8 خانات على الأقل");
      return;
    }
    if (next !== confirm) {
      toast.error("كلمة المرور غير متطابقة");
      return;
    }
    mut.mutate();
  }

  return (
      <div
      onClick={required ? undefined : onClose}
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
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        dir="rtl"
        style={{
          width: "100%",
          maxWidth: 420,
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
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
            تغيير كلمة المرور
          </div>
          {!required && <button
            type="button"
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
          </button>}
        </div>

        <label style={labelStyle}>كلمة المرور الحالية</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoFocus
          required
          disabled={mut.isPending}
          style={inputStyle}
        />

        <label style={labelStyle}>كلمة المرور الجديدة</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={8}
          disabled={mut.isPending}
          style={inputStyle}
        />

        <label style={labelStyle}>تأكيد كلمة المرور</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          disabled={mut.isPending}
          style={inputStyle}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            type="submit"
            disabled={mut.isPending}
            style={{
              padding: "10px 18px",
              background: mut.isPending ? "#cbd5e1" : "#7C3AED",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: mut.isPending ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {mut.isPending ? "جاري الحفظ..." : "حفظ"}
          </button>
          {!required && <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
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
            إلغاء
          </button>}
        </div>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#475569",
  marginBottom: 6,
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  marginBottom: 14,
  fontFamily: "inherit",
};
