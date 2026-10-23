// ─────────────────────────────────────────────────────────────────────────────
// Build-time feature flags (read from Vite `VITE_`-prefixed env, evaluated once).
// Mirrors the codebase's existing "empty/unset = default" env convention.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads a boolean-ish env var. Returns `fallback` when the var is unset/empty;
 * otherwise treats "false"/"0"/"off"/"no" (any case) as false, everything else true.
 */
function envFlag(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined || raw === null || raw === "") return fallback;
  return !["false", "0", "off", "no"].includes(String(raw).toLowerCase());
}

/**
 * T13 — «بوابة المورد» (Supplier Portal). The backend registers the whole
 * `/api/v1/asab/supplier/*` group only when `FEATURE_ASAB_SUPPLIER_PORTAL=true`
 * (disabled → paths return 404). The frozen Backend config defaults ON; effective
 * deployment configuration must be verified separately. The FE must gate the
 * ENTIRE supplier section on a single build flag — not per-screen. That single
 * gate lives here and is applied at every role-selection entry point, so when it
 * is off the supplier role is unreachable and none of the supplier endpoints are
 * ever called.
 *
 * Default in this sandbox is ENABLED (the demo ships the supplier role); set
 * `VITE_FEATURE_ASAB_SUPPLIER_PORTAL=false` to hide the whole section, matching
 * a deliberately disabled Backend rollout. This flag never proves server access.
 */
export const SUPPLIER_PORTAL_ENABLED = envFlag(
  import.meta.env?.VITE_FEATURE_ASAB_SUPPLIER_PORTAL,
  true,
);
