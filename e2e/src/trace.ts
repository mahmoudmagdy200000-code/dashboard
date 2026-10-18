import { test } from '@playwright/test';
import registry from '../traceability/brc34_acceptance_registry.json' with { type: 'json' };
import ruleList from '../traceability/br-v3.4-rule-ids.json' with { type: 'json' };

/**
 * Coverage layer of a test. Never call an API-only test "UI E2E".
 *  - ui-e2e:      the asserted behavior is driven through the real React dashboard.
 *  - api-assisted: UI E2E where mobile-only steps (cashier/branch-manager apps) run via the real Laravel API.
 *  - api-only:    integration coverage through the real Laravel API, no browser.
 *  - offline:     pure logic (no network).
 */
export type Layer = 'ui-e2e' | 'api-assisted' | 'api-only' | 'offline';

const KNOWN_RULES = new Set((ruleList as { ruleIds: string[] }).ruleIds);
const KNOWN_AC = new Set((registry as { scenarios: Array<{ businessRuleId: string }> }).scenarios.map((s) => s.businessRuleId));

/** Business Rule IDs (v3.4 section ids like DIFF-02 or acceptance cases AC-04). */
const RULE_ID = /^(AC-\d{2}|(SAL|CASH|DIFF|OPS|COR|DAY|AUD|EXP|FUND|MEM)-\d{2})$/;

export function knownRuleId(id: string): boolean {
  return id.startsWith('AC-') ? KNOWN_AC.has(id) : KNOWN_RULES.has(id);
}

/** Annotate the current test with its Business Rule references and coverage layer. */
export function traces(layer: Layer, ...ruleIds: string[]): void {
  for (const id of ruleIds) {
    if (!RULE_ID.test(id)) throw new Error(`Unknown rule id format: ${id}`);
    if (!knownRuleId(id)) throw new Error(`${id} is not defined in Business Rules v3.4 / its acceptance registry`);
    test.info().annotations.push({ type: 'business-rule', description: id });
  }
  test.info().annotations.push({ type: 'coverage-layer', description: layer });
}

/** Mark a test BLOCKED with an exact reason (rendered as a skip + annotation, never as PASS). */
export function blocked(reason: string): void {
  test.info().annotations.push({ type: 'BLOCKED', description: reason });
  test.skip(true, `BLOCKED: ${reason}`);
}
