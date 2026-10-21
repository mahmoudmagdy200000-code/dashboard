import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { traces } from '../../src/trace';

// Guard an actual backend side effect: BranchManagerShiftController::current()
// uses firstOrCreate() even though its HTTP verb is GET.
test('Mode A A08 does not call GET /branch-manager/workday/current', () => {
  traces('offline');
  const spec = readFileSync(fileURLToPath(new URL('../preflight/preflight.spec.ts', import.meta.url)), 'utf8');
  const a08 = spec.split("test('A08 lifecycle readiness")[1];
  expect(a08, 'A08 preflight test must remain present').toBeDefined();
  expect(a08).not.toMatch(/\bmanager\.current\s*\(/);
  expect(a08).not.toMatch(/branch-manager\/workday\/current/);
});
