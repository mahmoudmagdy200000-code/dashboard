import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { getErrorMessage } from "../api/errors";
import { isTwoFactorChallenge } from "../api/auth";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { V, G, FONT } from "./authTheme";
import { useSiteLang } from "./siteLang";

export function LoginPage() {
  const { login, loginWith2fa, loggingIn } = useAuth();
  const [lang, , t] = useSiteLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotting, setForgotting] = useState(false);
  // 2FA step-up state.
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  if (forgotting) return <ForgotPasswordPage onDone={() => setForgotting(false)} />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Step 2 of 2FA — submit the OTP against the step-up token.
    if (twoFactorToken) {
      if (!otpCode) {
        toast.error(t("من فضلك أدخل رمز التحقق", "Please enter the verification code"));
        return;
      }
      try {
        await loginWith2fa(twoFactorToken, otpCode);
        toast.success(t("تم تسجيل الدخول بنجاح", "Signed in successfully"));
      } catch (err) {
        toast.error(getErrorMessage(err, lang));
      }
      return;
    }
    if (!email || !password) {
      toast.error(t("من فضلك أدخل البريد وكلمة المرور", "Please enter your email and password"));
      return;
    }
    try {
      const res = await login(email, password);
      if (isTwoFactorChallenge(res)) {
        setTwoFactorToken(res.twoFactorToken);
        toast(t("أدخل رمز التحقق الثنائي", "Enter your two-factor code"));
        return;
      }
      toast.success(t("تم تسجيل الدخول بنجاح", "Signed in successfully"));
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    }
  }

  const inputBase = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    background: "#fff",
    border: `1.5px solid ${G[300]}`,
    color: G[900],
    fontSize: 14,
    outline: "none",
    direction: "ltr" as const,
    textAlign: (lang === "ar" ? "right" : "left") as "right" | "left",
    fontFamily: "inherit",
    transition: "border-color .15s ease, box-shadow .15s ease",
  };
  const focusOn = (e: { currentTarget: HTMLInputElement }) => {
    e.currentTarget.style.borderColor = V[600];
    e.currentTarget.style.boxShadow = `0 0 0 4px ${V[600]}1f`;
  };
  const focusOff = (e: { currentTarget: HTMLInputElement }) => {
    e.currentTarget.style.borderColor = G[300];
    e.currentTarget.style.boxShadow = "none";
  };
  const labelStyle = { display: "block", fontSize: 12.5, color: G[700], marginBottom: 7, fontWeight: 600 } as const;

  return (
    <form
      onSubmit={handleSubmit}
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{
        width: "100%",
        maxWidth: 440,
        margin: "0 auto",
        background: "#fff",
        border: `1px solid ${G[200]}`,
        borderRadius: 20,
        padding: "34px 32px",
        boxShadow: "0 24px 60px -24px rgba(16,24,40,0.18)",
        fontFamily: FONT,
      }}
    >
      <h1 style={{ fontSize: 22, color: G[900], fontWeight: 800, margin: "0 0 6px" }}>{t("تسجيل الدخول", "Sign in")}</h1>
      <p style={{ fontSize: 13.5, color: G[500], margin: "0 0 26px" }}>{t("أدخل بياناتك للوصول إلى لوحة التحكم", "Enter your credentials to access the dashboard")}</p>

      {/* Email */}
      <label htmlFor="login-email" style={labelStyle}>{t("البريد الإلكتروني", "Email")}</label>
      <input
        id="login-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onFocus={focusOn}
        onBlur={focusOff}
        autoComplete="email"
        autoFocus
        required
        disabled={loggingIn}
        placeholder="name@example.com"
        style={{ ...inputBase, marginBottom: 18 }}
      />

      {/* Password */}
      <label htmlFor="login-password" style={labelStyle}>{t("كلمة المرور", "Password")}</label>
      <div style={{ position: "relative", marginBottom: 24 }}>
        <input
          id="login-password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={focusOn}
          onBlur={focusOff}
          autoComplete="current-password"
          required
          disabled={loggingIn}
          style={{
            ...inputBase,
            paddingLeft: lang === "ar" ? 52 : 14,
            paddingRight: lang === "ar" ? 14 : 52,
          }}
        />
        <button
          type="button"
          aria-label={showPassword ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}
          onClick={() => setShowPassword((v) => !v)}
          style={{
            position: "absolute",
            insetInlineEnd: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            color: G[400],
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 8px",
            fontFamily: "inherit",
          }}
        >
          {showPassword ? t("إخفاء", "Hide") : t("إظهار", "Show")}
        </button>
      </div>

      {/* 2FA OTP — shown only after a step-up challenge */}
      {twoFactorToken && (
        <>
          <label htmlFor="login-two-factor-code" style={labelStyle}>{t("رمز التحقق الثنائي", "Two-factor code")}</label>
          <input
            id="login-two-factor-code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            onFocus={focusOn}
            onBlur={focusOff}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="------"
            disabled={loggingIn}
            style={{ ...inputBase, borderColor: V[600], fontSize: 20, letterSpacing: 8, textAlign: "center", marginBottom: 24 }}
          />
        </>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loggingIn}
        style={{
          width: "100%",
          padding: "13px",
          background: loggingIn ? G[300] : `linear-gradient(135deg, ${V[600]}, ${V[800]})`,
          color: "white",
          border: "none",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          cursor: loggingIn ? "wait" : "pointer",
          fontFamily: "inherit",
          boxShadow: loggingIn ? "none" : `0 10px 24px -10px ${V[700]}`,
          transition: "transform .15s ease, box-shadow .15s ease",
        }}
        onMouseEnter={(e) => { if (!loggingIn) e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
      >
        {loggingIn ? t("جاري الدخول...", "Signing in...") : twoFactorToken ? t("تأكيد الرمز", "Verify code") : t("تسجيل الدخول", "Sign in")}
      </button>

      <button
        type="button"
        onClick={() => setForgotting(true)}
        style={{ display: "block", width: "100%", background: "transparent", border: "none", color: G[500], fontSize: 12.5, cursor: "pointer", marginTop: 16, fontFamily: "inherit", fontWeight: 500 }}
      >
        {t("نسيت كلمة المرور؟", "Forgot password?")}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
        <div style={{ flex: 1, height: 1, background: G[200] }} />
        <span style={{ fontSize: 11, color: G[400] }}>{t("أو", "or")}</span>
        <div style={{ flex: 1, height: 1, background: G[200] }} />
      </div>

      <button
        type="button"
        onClick={() => (window.location.hash = "#/onboarding")}
        style={{ display: "block", width: "100%", background: "#fff", border: `1.5px solid ${V[600]}33`, color: V[700], fontSize: 13, cursor: "pointer", padding: "11px", borderRadius: 12, fontFamily: "inherit", fontWeight: 700 }}
        onMouseEnter={(e) => { e.currentTarget.style.background = V[50]; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
      >
        {t("تسجيل شركة جديدة", "Register a new company")}
      </button>

      <p style={{ fontSize: 11, color: G[400], textAlign: "center", marginTop: 22, marginBottom: 0 }}>
        {t("عصب ASAB · نظام إدارة مالية المطاعم", "ASAB · Restaurant financial management")}
      </p>
    </form>
  );
}
