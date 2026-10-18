/**
 * Environment contract for the ASSAB shift-cycle E2E suite.
 *
 * Every value is read from the process environment (or CI secrets). Nothing
 * here has a credential default. Values that identify the fixture default to
 * the provisioned staging namespace `assab-ui-qa-20261018`, whose company and
 * branch UUIDs were reproduced by the backend's deterministic provisioner.
 */

export type Mode = 'unit' | 'preflight' | 'isolated' | 'staging-financial';

export const FIXTURE_DEFAULTS = {
  namespace: 'assab-ui-qa-20261018',
  companyId: 'fbfae45c-5ad7-5511-8e94-1c93b3bea4ca',
  branchId: 'd47212bb-2ffd-55a6-98e5-92609d000238',
} as const;

/** Exact phrase an operator must provide to unlock financial mutations (Mode C). */
export function financialAckPhrase(namespace: string, isoDate: string): string {
  return `MUTATE_ASSAB_STAGING_FINANCIAL_FIXTURE:${namespace}:${isoDate}`;
}

function read(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? undefined : value.trim();
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export interface E2EEnv {
  mode: Mode;
  /** Backend origin WITHOUT /api/v1 (e.g. https://staging-api.example). */
  apiOrigin?: string;
  /** Deployed dashboard URL (Vercel) or a local dev server. Optional in Mode B. */
  frontendUrl?: string;
  namespace: string;
  companyId: string;
  branchId: string;
  /** Single runtime fixture password (harness design: one secret for all fixture identities). */
  password?: string;
  /** Operator-attested SHAs (no backend endpoint exposes the deployed commit). */
  expectedBackendSha?: string;
  attestedBackendSha?: string;
  expectedFrontendSha?: string;
  attestedFrontendSha?: string;
  financialAck?: string;
  /** Business date the server uses (Asia/Riyadh). Defaults to "today" in Riyadh. */
  businessDate: string;
  /** zero (default) or confirmed10 (requires a proven confirmed transfer — not automated). */
  openingScenario: 'zero' | 'confirmed10';
  /** When false, UI phases are skipped (reported NOT_RUN) and only API-assisted coverage runs. */
  ui: boolean;
}

export function riyadhDate(now: Date = new Date()): string {
  // en-CA yields YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function loadEnv(): E2EEnv {
  const mode = (read('ASSAB_E2E_MODE') ?? 'unit') as Mode;
  if (!['unit', 'preflight', 'isolated', 'staging-financial'].includes(mode)) {
    throw new Error(`ASSAB_E2E_MODE must be unit|preflight|isolated|staging-financial, got "${mode}"`);
  }
  const opening = (read('ASSAB_E2E_OPENING_SCENARIO') ?? 'zero') as E2EEnv['openingScenario'];
  if (!['zero', 'confirmed10'].includes(opening)) throw new Error('ASSAB_E2E_OPENING_SCENARIO must be zero|confirmed10');
  const api = read('ASSAB_E2E_API_ORIGIN');
  const fe = read('ASSAB_E2E_FRONTEND_URL');
  return {
    mode,
    apiOrigin: api ? stripSlash(api) : undefined,
    frontendUrl: fe ? stripSlash(fe) : undefined,
    namespace: read('ASSAB_E2E_NAMESPACE') ?? FIXTURE_DEFAULTS.namespace,
    companyId: read('ASSAB_E2E_COMPANY_ID') ?? FIXTURE_DEFAULTS.companyId,
    branchId: read('ASSAB_E2E_BRANCH_ID') ?? FIXTURE_DEFAULTS.branchId,
    password: read('ASSAB_E2E_FIXTURE_PASSWORD'),
    expectedBackendSha: read('ASSAB_E2E_EXPECTED_BACKEND_SHA'),
    attestedBackendSha: read('ASSAB_E2E_ATTESTED_DEPLOYED_BACKEND_SHA'),
    expectedFrontendSha: read('ASSAB_E2E_EXPECTED_FRONTEND_SHA'),
    attestedFrontendSha: read('ASSAB_E2E_ATTESTED_DEPLOYED_FRONTEND_SHA'),
    financialAck: read('ASSAB_E2E_FINANCIAL_ACK'),
    businessDate: read('ASSAB_E2E_BUSINESS_DATE') ?? riyadhDate(),
    openingScenario: opening,
    ui: (read('ASSAB_E2E_UI') ?? 'true') !== 'false',
  };
}

/** Hostnames the staging-financial mode may target. Extend only via env, never by editing tests. */
export function allowedStagingHosts(): string[] {
  return (read('ASSAB_E2E_ALLOWED_API_HOSTS') ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
}

export const env: E2EEnv = loadEnv();
