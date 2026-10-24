import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENARIOS, expectedResults, sarToHalalas, halalasToSar } from '../../src/finance';
import { evaluateMutationGuard } from '../../src/guards';
import { financialAckPhrase, type E2EEnv } from '../../src/env';
import { redact } from '../../src/redact';
import { errorCode } from '../../src/api/client';
import { knownRuleId, traces } from '../../src/trace';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test.describe('reference arithmetic (BR v3.4 §4 approved example)', () => {
  test('115 / 50 / 25 / confirmed opening 10 / counted 30', () => {
    traces('offline', 'AC-01', 'SAL-01', 'SAL-02', 'SAL-03', 'SAL-04', 'CASH-08', 'DIFF-01');
    const r = expectedResults(SCENARIOS.confirmedOpening10);
    expect(r).toMatchObject({ grossH: 11500, netH: 10000, vatH: 1500, cashSalesH: 4000, expectedCashH: 5000, varianceH: -2000, shortageH: 2000, surplusH: 0 });
  });

  test('115 / 50 / 25 / opening 0 / counted 20 (no confirmed transfer)', () => {
    traces('offline', 'AC-10', 'CASH-01');
    const r = expectedResults(SCENARIOS.zeroOpening);
    expect(r).toMatchObject({ expectedCashH: 4000, varianceH: -2000, shortageH: 2000 });
  });

  test('surplus 40 → 45 belongs to the branch and does not change sales', () => {
    traces('offline', 'AC-03', 'DIFF-05');
    const r = expectedResults({ ...SCENARIOS.zeroOpening, countedSar: '45.00' });
    expect(r).toMatchObject({ grossH: 11500, surplusH: 500, shortageH: 0 });
  });

  test('SAR ↔ halala conversion is exact and rejects sub-halala input', () => {
    traces('offline');
    expect(sarToHalalas('115.00')).toBe(11500);
    expect(sarToHalalas('0.01')).toBe(1);
    expect(sarToHalalas('20')).toBe(2000);
    expect(halalasToSar(-2000)).toBe('-20.00');
    expect(halalasToSar(5)).toBe('0.05');
    expect(() => sarToHalalas('1.005')).toThrow();
    expect(() => sarToHalalas('-1')).toThrow();
    expect(() => halalasToSar(1.5)).toThrow();
  });
});

const base: E2EEnv = {
  mode: 'staging-financial', apiOrigin: 'https://api.staging.example', namespace: 'assab-ui-qa-20261018',
  companyId: 'c', branchId: 'b', password: 'x'.repeat(20), businessDate: '2026-10-19', openingScenario: 'zero', ui: true,
  expectedBackendSha: 'a'.repeat(40), attestedBackendSha: 'a'.repeat(40),
  financialAck: financialAckPhrase('assab-ui-qa-20261018', '2026-10-19'),
};

test.describe('financial mutation guard', () => {
  test.beforeEach(() => {
    process.env.ASSAB_E2E_ALLOWED_API_HOSTS = 'api.staging.example';
  });
  test.afterEach(() => {
    delete process.env.ASSAB_E2E_ALLOWED_API_HOSTS;
  });

  test('unit and preflight never mutate', () => {
    traces('offline');
    expect(evaluateMutationGuard({ ...base, mode: 'unit' }).allowed).toBe(false);
    expect(evaluateMutationGuard({ ...base, mode: 'preflight' }).allowed).toBe(false);
  });

  test('isolated accepts loopback only', () => {
    traces('offline');
    expect(evaluateMutationGuard({ ...base, mode: 'isolated', apiOrigin: 'http://127.0.0.1:8787' }).allowed).toBe(true);
    expect(evaluateMutationGuard({ ...base, mode: 'isolated', apiOrigin: 'https://api.staging.example' }).allowed).toBe(false);
  });

  test('staging-financial requires every safeguard', () => {
    traces('offline');
    expect(evaluateMutationGuard(base)).toEqual({ allowed: true, reasons: [] });
    expect(evaluateMutationGuard({ ...base, financialAck: undefined }).allowed).toBe(false);
    expect(evaluateMutationGuard({ ...base, financialAck: financialAckPhrase(base.namespace, '2026-10-18') }).allowed, 'ack is date-bound').toBe(false);
    expect(evaluateMutationGuard({ ...base, attestedBackendSha: 'b'.repeat(40) }).allowed, 'deployment not attested').toBe(false);
    expect(evaluateMutationGuard({ ...base, attestedBackendSha: undefined }).allowed).toBe(false);
    expect(evaluateMutationGuard({ ...base, apiOrigin: 'https://prod.example' }).allowed, 'host not allow-listed').toBe(false);
    expect(evaluateMutationGuard({ ...base, apiOrigin: 'http://localhost:8000' }).allowed).toBe(false);
    expect(evaluateMutationGuard({ ...base, namespace: 'real-company' , financialAck: financialAckPhrase('real-company', '2026-10-19') }).allowed).toBe(false);
    expect(evaluateMutationGuard({ ...base, password: undefined }).allowed).toBe(false);
  });
});

test.describe('secret hygiene', () => {
  test('redact removes passwords and tokens at any depth', () => {
    traces('offline');
    const out = JSON.stringify(redact({ email: 'a@fixture.invalid', password: 'p', nested: { accessToken: 't', list: [{ refreshToken: 'r' }] }, h: 'Bearer abc.def', s: '12|abcdefghijklmnopqrstuvwxyz' }));
    expect(out).not.toMatch(/"p"|"t"|"r"|abc\.def|abcdefghijklmnop/);
    expect(out).toContain('a@fixture.invalid');
  });

  test('built-in Playwright tracing stays OFF (it records login bodies and Bearer headers)', () => {
    traces('offline');
    const cfg = readFileSync(join(ROOT, 'playwright.config.ts'), 'utf8');
    expect(cfg).toMatch(/trace:\s*'off'/);
    expect(cfg).not.toMatch(/trace:\s*'(on|retain-on-failure|on-first-retry|on-all-retries)'/);
  });

  test('no credential-looking literal is committed in suite sources', () => {
    traces('offline');
    for (const file of walk(join(ROOT, 'src')).concat(walk(join(ROOT, 'tests')))) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/password\s*[:=]\s*['"][^'"\s]{6,}['"]/i);
      expect(text, file).not.toMatch(/\b\d+\|[A-Za-z0-9]{30,}\b/);
    }
  });
});

test.describe('error envelopes', () => {
  test('errorCode normalises the three backend shapes', () => {
    traces('offline');
    expect(errorCode({ error: { code: 'OP_NOT_PENDING', message: 'x' } })).toBe('OP_NOT_PENDING');
    expect(errorCode({ success: false, message: 'PHYSICAL_RETURN_REQUIRED', code: 'PHYSICAL_RETURN_REQUIRED' })).toBe('PHYSICAL_RETURN_REQUIRED');
    expect(errorCode({ message: 'HANDOVER_NOT_PENDING' })).toBe('HANDOVER_NOT_PENDING');
    expect(errorCode({ message: 'Validation failed' })).toBeUndefined();
  });
});

test.describe('traceability', () => {
  test('every rule id referenced by a spec exists in Business Rules v3.4 / its registry', () => {
    traces('offline');
    const ids = new Set<string>();
    for (const file of walk(join(ROOT, 'tests'))) {
      for (const m of readFileSync(file, 'utf8').matchAll(/traces\(([^)]*)\)/g)) {
        for (const id of m[1]!.matchAll(/'((?:AC|SAL|CASH|DIFF|OPS|COR|DAY|AUD|EXP|FUND|MEM)-\d{2})'/g)) ids.add(id[1]!);
      }
    }
    expect(ids.size).toBeGreaterThan(20);
    for (const id of ids) expect(knownRuleId(id), id).toBe(true);
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}
