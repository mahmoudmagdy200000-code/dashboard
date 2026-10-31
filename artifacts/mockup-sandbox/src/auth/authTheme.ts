// Shared design tokens + injected stylesheet for the auth / entry screens.
// Electric Violet + GreyScale (client palette). Animations are deliberately calm:
// slow, small-travel, ease-out — no bounce/spin — and honour prefers-reduced-motion.

export const V = {
  50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD", 400: "#A78BFA",
  500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9", 800: "#5B21B6", 900: "#4C1D95",
};
export const G = {
  25: "#FCFCFD", 50: "#F9FAFB", 100: "#F2F4F7", 200: "#E4E7EC", 300: "#D0D5DD",
  400: "#98A2B3", 500: "#667085", 600: "#475467", 700: "#344054", 800: "#1D2939", 900: "#101828",
};
export const CYAN = "#22D3EE";
export const FONT = "'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif";
export const LOGO = `${import.meta.env?.BASE_URL ?? "/"}assab%20logo.png`;

const CSS = `
.asab-entry{min-height:100vh;display:flex;direction:rtl;font-family:${FONT};background:${G[50]};}
.asab-brand{position:relative;overflow:hidden;flex:0 0 44%;max-width:600px;
  background:linear-gradient(160deg,${V[900]} 0%,${V[800]} 38%,${V[700]} 72%,${V[600]} 100%);
  color:#fff;padding:56px 48px;display:flex;flex-direction:column;}
.asab-brand__grid{position:absolute;inset:0;opacity:.35;
  background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);
  background-size:48px 48px;-webkit-mask-image:radial-gradient(120% 90% at 70% 10%,#000 20%,transparent 75%);mask-image:radial-gradient(120% 90% at 70% 10%,#000 20%,transparent 75%);}
.asab-blob{position:absolute;border-radius:50%;filter:blur(64px);pointer-events:none;will-change:transform;}
.asab-blob--a{animation:asabFloat 19s ease-in-out infinite;}
.asab-blob--b{animation:asabFloat2 24s ease-in-out infinite;}
.asab-content{position:relative;flex:1;display:flex;align-items:center;justify-content:center;padding:48px 40px;background:${G[50]};}
.asab-langslot{position:absolute;top:22px;inset-inline-end:32px;z-index:5;}
@media (max-width:900px){.asab-langslot{top:14px;inset-inline-end:16px;}}
.asab-stage{width:100%;max-width:560px;animation:asabIn .5s cubic-bezier(.22,1,.36,1);}
.asab-card{cursor:pointer;background:#fff;border:1.5px solid ${G[200]};border-radius:18px;
  transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease;text-align:start;font-family:inherit;width:100%;}
.asab-card:hover{transform:translateY(-4px);border-color:${V[400]};box-shadow:0 18px 40px -12px ${V[600]}40;}
.asab-role{cursor:pointer;background:#fff;border:1.5px solid ${G[200]};border-radius:16px;padding:20px 16px;
  text-align:center;font-family:inherit;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;}
.asab-role:hover{transform:translateY(-3px);box-shadow:0 14px 30px -14px ${V[700]}55;}
.asab-feat{display:flex;align-items:center;gap:12px;color:rgba(255,255,255,.9);font-size:14px;font-weight:500;}
.asab-feat span{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.asab-back{display:inline-flex;align-items:center;gap:6px;background:transparent;border:none;
  color:${G[500]};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;padding:6px 2px;margin-bottom:18px;transition:color .15s ease;}
.asab-back:hover{color:${V[700]};}
.asab-rise{opacity:0;animation:asabRise .55s cubic-bezier(.22,1,.36,1) forwards;}
.asab-logo-in{animation:asabLogo .6s ease-out both;}
.asab-landing{position:relative;overflow:hidden;min-height:100vh;direction:rtl;font-family:${FONT};
  background:${G[50]};display:flex;flex-direction:column;}
@keyframes asabIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes asabRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes asabLogo{from{opacity:0;transform:translateY(-6px) scale(.96)}to{opacity:1;transform:none}}
@keyframes asabFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(16px,-20px)}}
@keyframes asabFloat2{0%,100%{transform:translate(0,0)}50%{transform:translate(-18px,14px)}}
@media (max-width:900px){
  .asab-entry{flex-direction:column;}
  .asab-brand{flex-basis:auto;max-width:none;padding:32px 28px;}
  .asab-brand__features{display:none;}
  .asab-content{padding:32px 20px;}
}
@media (prefers-reduced-motion: reduce){
  .asab-stage,.asab-rise,.asab-logo-in,.asab-blob--a,.asab-blob--b{animation:none!important;opacity:1!important;transform:none!important;}
}
`;

/** Inject the shared auth stylesheet once. Safe to call on every render/mount. */
export function ensureAuthStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("asab-auth-css")) return;
  const el = document.createElement("style");
  el.id = "asab-auth-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
