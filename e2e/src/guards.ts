import { allowedStagingHosts, financialAckPhrase, type E2EEnv } from './env';

export interface GuardResult {
  allowed: boolean;
  reasons: string[];
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/**
 * Decides whether the suite may perform FINANCIAL mutations (shift start/end,
 * handover, approvals, …). Pure function so it can be unit-tested.
 *
 * - isolated: only a loopback API origin is accepted (disposable local backend).
 * - staging-financial: requires an allow-listed API host, the exact dated
 *   acknowledgement phrase, and operator-attested deployed backend SHA equal to
 *   the expected SHA. Otherwise the mutation tests are SKIPPED (reported BLOCKED).
 * - unit / preflight: never.
 */
export function evaluateMutationGuard(e: E2EEnv): GuardResult {
  const reasons: string[] = [];
  if (e.mode !== 'isolated' && e.mode !== 'staging-financial') {
    return { allowed: false, reasons: [`mode "${e.mode}" never mutates financial data`] };
  }
  if (!e.apiOrigin) reasons.push('ASSAB_E2E_API_ORIGIN is not set');
  if (!e.password) reasons.push('ASSAB_E2E_FIXTURE_PASSWORD is not set');
  let host = '';
  try {
    host = e.apiOrigin ? new URL(e.apiOrigin).hostname.toLowerCase() : '';
  } catch {
    reasons.push('ASSAB_E2E_API_ORIGIN is not a valid URL');
  }
  if (e.mode === 'isolated') {
    if (host && !LOOPBACK.has(host)) reasons.push(`isolated mode only targets loopback, got host "${host}"`);
  } else {
    const allow = allowedStagingHosts();
    if (allow.length === 0) reasons.push('ASSAB_E2E_ALLOWED_API_HOSTS is empty');
    else if (host && !allow.includes(host)) reasons.push(`API host "${host}" is not in ASSAB_E2E_ALLOWED_API_HOSTS`);
    if (LOOPBACK.has(host)) reasons.push('staging-financial must not target loopback');
    const expected = financialAckPhrase(e.namespace, e.businessDate);
    if (e.financialAck !== expected) reasons.push(`ASSAB_E2E_FINANCIAL_ACK must equal "${expected}"`);
    if (!e.expectedBackendSha || !/^[0-9a-f]{40}$/.test(e.expectedBackendSha)) {
      reasons.push('ASSAB_E2E_EXPECTED_BACKEND_SHA must be a full 40-hex SHA');
    } else if (e.attestedBackendSha !== e.expectedBackendSha) {
      reasons.push('operator-attested deployed backend SHA does not equal the expected SHA (deployment not verified)');
    }
    if (!e.namespace.startsWith('assab-ui-qa-') && !e.namespace.startsWith('assab-harness-')) {
      reasons.push(`namespace "${e.namespace}" is not a recognised synthetic fixture namespace`);
    }
  }
  return { allowed: reasons.length === 0, reasons };
}
