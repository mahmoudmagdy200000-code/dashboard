import { useState } from "react";
import { KeyRound, Plus, Trash2, Copy, Check, Loader2, X } from "lucide-react";
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  type ApiKeyScope,
  type CreateApiKeyResponse,
} from "../../api/queries/apiKeys";

interface Props {
  t?: (ar: string, en: string) => string;
}

const FONT = "'IBM Plex Sans Arabic', system-ui, sans-serif";

const ALL_SCOPES: Array<{ key: ApiKeyScope; ar: string }> = [
  { key: "operations:read", ar: "قراءة العمليات" },
  { key: "operations:write", ar: "كتابة العمليات" },
  { key: "reports:read", ar: "قراءة التقارير" },
  { key: "inventory:read", ar: "قراءة المخزون" },
  { key: "inventory:write", ar: "كتابة المخزون" },
];

export function ApiKeysPage({ t = (ar) => ar }: Props) {
  const { data: keys = [], isLoading } = useApiKeys();
  const createMut = useCreateApiKey();
  const revokeMut = useRevokeApiKey();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiKeyScope[]>(["operations:read"]);
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [created, setCreated] = useState<CreateApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleScope = (s: ApiKeyScope) =>
    setScopes((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const handleCreate = async () => {
    if (!name.trim() || scopes.length === 0) return;
    const res = await createMut.mutateAsync({
      name: name.trim(),
      scopes,
      expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
    });
    setCreated(res);
    setName("");
    setScopes(["operations:read"]);
    setExpiresInDays("");
    setShowCreate(false);
  };

  const copyKey = async () => {
    if (!created?.key) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(created.key);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = created.key;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (success) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }
    } catch {
      setCopied(false);
    }
  };

  const card: React.CSSProperties = { background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" };
  const primaryBtn: React.CSSProperties = { padding: "10px 18px", background: "linear-gradient(135deg, #7C3AED, #00D9FF)", color: "white", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 6 };
  const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, fontFamily: FONT, marginBottom: 12 };

  return (
    <div dir="rtl" style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <KeyRound size={22} style={{ color: "#7C3AED" }} />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", margin: 0 }}>{t("مفاتيح API", "API Keys")}</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>{t("للربط مع أنظمة خارجية (POS / ERP)", "For 3rd-party integrations (POS / ERP)")}</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={primaryBtn}><Plus size={15} /> {t("مفتاح جديد", "New Key")}</button>
      </div>

      {/* One-time key reveal */}
      {created && (
        <div style={{ ...card, padding: 16, marginBottom: 16, border: "1px solid #a7f3d0", background: "#f0fdf4" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>{t("انسخ المفتاح الآن — لن يظهر مرة أخرى", "Copy now — it won't be shown again")}</span>
            <button onClick={() => setCreated(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={16} /></button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <code style={{ flex: 1, background: "white", padding: "10px 12px", borderRadius: 8, fontSize: 12, direction: "ltr", wordBreak: "break-all", border: "1px solid #d1fae5" }}>{created.key}</code>
            <button onClick={copyKey} aria-label={copied ? t("تم النسخ", "Copied") : t("نسخ المفتاح", "Copy key")} style={{ ...primaryBtn, background: "#059669" }}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div style={{ ...card, padding: 18, marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>{t("اسم المفتاح", "Key name")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("مثلاً: تكامل نقاط البيع", "e.g. POS integration")} style={input} />
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>{t("الصلاحيات", "Scopes")}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {ALL_SCOPES.map((s) => (
              <button
                key={s.key}
                type="button"
                role="switch"
                aria-checked={scopes.includes(s.key)}
                onClick={() => toggleScope(s.key)}
                style={{ padding: "6px 12px", borderRadius: 999, border: scopes.includes(s.key) ? "2px solid #7C3AED" : "1px solid #e2e8f0", background: scopes.includes(s.key) ? "rgba(124,58,237,0.06)" : "white", fontSize: 12, cursor: "pointer", fontFamily: FONT, color: "#334155" }}>
                {t(s.ar, s.key)}
              </button>
            ))}
          </div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>{t("ينتهي بعد (أيام، اختياري)", "Expires in (days, optional)")}</label>
          <input type="number" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} placeholder={t("بدون انتهاء", "Never")} style={input} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} disabled={createMut.isPending || !name.trim() || !scopes.length} style={{ ...primaryBtn, opacity: name.trim() && scopes.length ? 1 : 0.6 }}>
              {createMut.isPending ? <Loader2 size={15} className="animate-spin" /> : t("إنشاء", "Create")}
            </button>
            <button onClick={() => setShowCreate(false)} style={{ padding: "10px 18px", background: "white", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>{t("إلغاء", "Cancel")}</button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={card}>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: "#7C3AED" }} /></div>
        ) : keys.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{t("لا توجد مفاتيح بعد", "No API keys yet")}</div>
        ) : (
          keys.map((k) => (
            <div key={k.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{k.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", direction: "ltr", textAlign: "right", marginTop: 2 }}>{k.prefix}••••</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {k.scopes.map((s) => (
                    <span key={s} style={{ fontSize: 10, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 999, direction: "ltr" }}>{s}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => revokeMut.mutate(k.id)} disabled={revokeMut.isPending} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", padding: 6 }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
