import { test } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redact } from './redact';

/**
 * Cross-phase state for an ordered lifecycle run.
 *
 * Phases are separate tests so every phase gets its own PASS/FAIL/SKIP in the
 * report. Playwright replaces the worker after a failure, so in-memory state is
 * lost; we persist ids (never secrets) to a JSON file. A phase whose
 * prerequisite did not complete is SKIPPED with an explicit BLOCKED reason —
 * it is never reported as PASS.
 */

const HERE = dirname(fileURLToPath(import.meta.url));

export class PhaseState<T extends Record<string, unknown>> {
  private readonly file: string;

  constructor(name: string) {
    const root = process.env.ASSAB_E2E_REPORT_DIR ? resolve(process.env.ASSAB_E2E_REPORT_DIR) : resolve(HERE, '..', 'reports');
    this.file = resolve(root, 'state', `${name}.json`);
  }

  reset(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, '{}\n');
  }

  read(): Partial<T> {
    if (!existsSync(this.file)) return {};
    return JSON.parse(readFileSync(this.file, 'utf8')) as Partial<T>;
  }

  set(patch: Partial<T>): void {
    const next = { ...this.read(), ...patch };
    mkdirSync(dirname(this.file), { recursive: true });
    // Defence in depth: the state must never contain credentials.
    writeFileSync(this.file, JSON.stringify(redact(next), null, 2) + '\n');
  }

  /** Returns the prerequisite values or skips the current test as BLOCKED. */
  need<K extends keyof T>(...keys: K[]): Pick<T, K> {
    const s = this.read();
    const missing = keys.filter((k) => s[k] === undefined);
    if (missing.length) {
      const reason = `prerequisite not established by an earlier phase: ${missing.join(', ')}`;
      test.info().annotations.push({ type: 'BLOCKED', description: reason });
      test.skip(true, `BLOCKED: ${reason}`);
    }
    return s as Pick<T, K>;
  }
}
