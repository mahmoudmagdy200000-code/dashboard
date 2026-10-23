import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { forgotPassword, resetPassword } from "../api/auth";
import { getErrorMessage } from "../api/errors";
import { V, G, FONT } from "./authTheme";
import { useSiteLang } from "./siteLang";

type Step = "request" | "reset" | "done";

interface Props {
  onDone: () => void;
}

export function ForgotPasswordPage({ onDone }: Props) {
  const [lang, , t] = useSiteLang();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const requestMut = useMutation({
    mutationFn: () => forgotPassword(email),
    onSuccess: () => {
      toast.success(t("تم إرسال كود التحقق إلى بريدك", "A verification code was sent to your email"));
      setStep("reset");
    },
    onError: (e) => toast.error(getErrorMessage(e, lang)),
  });

  const resetMut = useMutation({
    mutationFn: () => resetPassword(token, newPassword),
    onSuccess: () => {
      toast.success(t("تم تغيير كلمة المرور — يمكنك تسجيل الدخول", "Password changed — you can sign in now"));
      setStep("done");
    },
    onError: (e) => toast.error(getErrorMessage(e, lang)),
  });

  function handleRequest(e: FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error(t("أدخل البريد الإلكتروني", "Enter your email"));
      return;
    }
    requestMut.mutate();
  }

  function handleReset(e: FormEvent) {
    e.preventDefault();
    if (!token || !newPassword) {
      toast.error(t("أكمل بيانات الكود وكلمة المرور", "Complete the code and password fields"));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("كلمة المرور لازم تكون 8 خانات على الأقل", "Password must be at least 8 characters"));
      return;
    }
    resetMut.mutate();
  }

  const align = (lang === "ar" ? "right" : "left") as "right" | "left";
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 12, background: "#fff",
    border: `1.5px solid ${G[300]}`, color: G[900], fontSize: 14, marginBottom: 18,
    outline: "none", direction: "ltr", textAlign: align, fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12.5, color: G[700], marginBottom: 7, fontWeight: 600 };
  const primaryBtn = (loading: boolean): React.CSSProperties => ({
    width: "100%", padding: "13px",
    background: loading ? G[300] : `linear-gradient(135deg, ${V[600]}, ${V[800]})`,
    color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700,
    cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
    boxShadow: loading ? "none" : `0 10px 24px -10px ${V[700]}`,
  });

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ width: "100%", display: "flex", justifyContent: "center", fontFamily: FONT }}>
      <div
        style={{
          width: "100%", maxWidth: 440, background: "#fff",
          border: `1px solid ${G[200]}`, borderRadius: 20, padding: "34px 32px",
          boxShadow: "0 24px 60px -24px rgba(16,24,40,0.18)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: `linear-gradient(135deg, ${V[600]}, ${V[800]})`,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, color: "white", marginBottom: 14, boxShadow: `0 10px 24px -10px ${V[700]}`,
            }}
          >
            🔐
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: G[900], margin: 0 }}>
            {step === "done" ? t("تم بنجاح", "Done") : t("استعادة كلمة المرور", "Reset password")}
          </h1>
          <p style={{ fontSize: 13, color: G[500], margin: "6px 0 0" }}>
            {step === "request" && t("أدخل بريدك لإرسال كود التحقق", "Enter your email to receive a verification code")}
            {step === "reset" && t("أدخل الكود وكلمة المرور الجديدة", "Enter the code and your new password")}
            {step === "done" && t("تم تغيير كلمة المرور بنجاح", "Your password was changed successfully")}
          </p>
        </div>

        {step === "request" && (
          <form onSubmit={handleRequest}>
            <label htmlFor="forgot-password-email" style={labelStyle}>{t("البريد الإلكتروني", "Email")}</label>
            <input id="forgot-password-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus disabled={requestMut.isPending} style={inputStyle} />
            <button type="submit" disabled={requestMut.isPending} style={primaryBtn(requestMut.isPending)}>
              {requestMut.isPending ? t("جاري الإرسال...", "Sending...") : t("إرسال كود التحقق", "Send verification code")}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset}>
            <label htmlFor="forgot-password-token" style={labelStyle}>{t("كود التحقق", "Verification code")}</label>
            <input id="forgot-password-token" type="text" value={token} onChange={(e) => setToken(e.target.value)} required autoFocus disabled={resetMut.isPending} style={{ ...inputStyle, fontFamily: "monospace" }} />
            <label htmlFor="forgot-password-new-password" style={labelStyle}>{t("كلمة المرور الجديدة", "New password")}</label>
            <input id="forgot-password-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} disabled={resetMut.isPending} style={inputStyle} />
            <button type="submit" disabled={resetMut.isPending} style={primaryBtn(resetMut.isPending)}>
              {resetMut.isPending ? t("جاري الحفظ...", "Saving...") : t("تغيير كلمة المرور", "Change password")}
            </button>
          </form>
        )}

        {step === "done" && (
          <button onClick={onDone} style={primaryBtn(false)}>{t("رجوع لتسجيل الدخول", "Back to sign-in")}</button>
        )}

        {step !== "done" && (
          <button
            type="button"
            onClick={onDone}
            style={{ width: "100%", padding: "12px", background: "transparent", color: G[500], border: "none", fontSize: 12.5, cursor: "pointer", marginTop: 10, fontFamily: "inherit", fontWeight: 500 }}
          >
            {t("رجوع لتسجيل الدخول", "Back to sign-in")}
          </button>
        )}
      </div>
    </div>
  );
}
