# ASSAB shift-cycle E2E (Playwright + TypeScript)

Executable end-to-end suite for the full cashier shift lifecycle, written against
**Business Rules v3.4** and the real code at backend `289fe09` / dashboard `ce078df`.
It lives outside the pnpm workspace on purpose and does not touch the existing
backend CI (SQLite-only jobs and manual MySQL gates are unchanged).

## What is covered, and how

| Layer | Meaning |
|---|---|
| `ui-e2e` | Asserted through the real React dashboard (accountant review, head final approval, login). |
| `api-assisted` | Cashier and branch-manager steps through the real Laravel **mobile** API. The dashboard repo has no web UI for these roles, so this is the only real path. |
| `api-only` | Real Laravel API, no browser (immutability probes, negative cases). |
| `offline` | Reference arithmetic only (no network). |

The layer is attached to every test as a `coverage-layer` annotation and printed in
`traceability/TRACEABILITY.md`. Accountant/head steps switch to `api-only` when no
frontend is configured — the report says so, it is never presented as UI E2E.

Main lifecycle (`tests/lifecycle/shift-lifecycle.spec.ts`, one phase per test, ids persisted between phases, a phase whose prerequisite failed is **BLOCKED**, never PASS):

| Phase | Assertion (BR v3.4) |
|---|---|
| P01 | All actors sign in on their real surface |
| P02 | Manager day open → assignment → cashier start (AC-37). No "accept assignment" endpoint exists; start is the acceptance |
| P03 | Confirmed opening = 0 without a confirmed transfer (AC-10, CASH-01/02) |
| P04 | Server computes 115 / 50 / 25 / 0 / counted 20 → expected 40, variance −20, shortage 20; net 100, VAT 15 (AC-01/02) |
| P05 | Incomplete allocation (10 of 20) → 422 `ALLOCATION_INCOMPLETE`, shift stays open (AC-04) |
| P06 | Complete allocation + submission; handover is only **pending** (AC-13/36) |
| P07 | Presentation idempotent; confirmation once; repeat → 409 `HANDOVER_NOT_PENDING` (AC-08) |
| P08 | SHF projection values in halalas; manager liability approval; day end + daily submit (AC-05/35) |
| P08b | A role-less tenant member cannot read the submitted shift |
| P09a | Gross-sales change → 422 `GROSS_SALES_MODIFICATION_PROHIBITED` (AC-23) |
| P09b | Accountant approves SHF + day (UI when configured) |
| P09c | After approval: re-approve → `OP_NOT_PENDING`, correction → `REPORT_IN_HEAD_REVIEW` |
| P10a | Head cannot finalise the day before its shifts → `DAY_MEMBER_NOT_FINAL_CURRENT` |
| P10b | Head final approval of SHF then day (UI when configured) |
| P10c | Audit trail has actor + timestamp per stage (AUD-01) |
| P11 | Post-final: approve/final/correct/reject all refused and the payload is unchanged (AC-43) |

Regression (`tests/regression/`): surplus (AC-03), mismatched handover → reject → physical
return → correction of the same request → re-present → confirm (AC-14/15, CASH-09..12),
cashier token on a branch-manager write. Cases whose request contract was not verified are
explicit **BLOCKED** placeholders with the reason (AC-22, AC-42, AC-40/41, AC-09).

Preflight (`tests/preflight/`, read-only): attested deployed SHA, dashboard bundle API host,
every fixture role's login + authorised/forbidden probe, multi-role, restricted, wrong
password, cross-surface tokens, cross-branch reads, fixture readiness for today, UI login.

## Modes and safety

| Mode | `ASSAB_E2E_MODE` | Writes | Guard |
|---|---|---|---|
| A | `preflight` | none to business data (login tokens only, revoked) | — |
| B | `isolated` | only a throw-away SQLite DB in a temp dir | API origin must be loopback |
| C | `staging-financial` | synthetic fixture on staging | allow-listed host **and** exact phrase `MUTATE_ASSAB_STAGING_FINANCIAL_FIXTURE:<namespace>:<YYYY-MM-DD>` **and** attested deployed SHA = expected SHA **and** synthetic namespace |

`src/guards.ts` enforces this in code; mutating tests are skipped as BLOCKED when the guard refuses.
Never set Mode C without a separate, explicit authorization.

Secrets: one fixture password, `ASSAB_E2E_FIXTURE_PASSWORD`, from the environment or a CI
secret. Built-in Playwright tracing is **off** because it records API login bodies and
Bearer headers; browser-only traces start after token injection and are kept on failure.
Every session is revoked at the end. `tests/unit` fails if tracing is re-enabled or a
credential literal is committed.

One lifecycle per fixture per business date: `(cashier, shift template, date)` is unique and
the manager day is submitted once. Preflight A08 tells you whether today is still free.

## Commands

```bash
cd e2e
npm install                       # @playwright/test 1.56.0, typescript 5.9.2
npx playwright install chromium   # CI: --with-deps

npm run typecheck
npm run test:unit                 # offline

# Mode A — read-only
ASSAB_E2E_API_ORIGIN=https://<backend> ASSAB_E2E_FRONTEND_URL=https://<dashboard> \
ASSAB_E2E_FIXTURE_PASSWORD=*** \
ASSAB_E2E_EXPECTED_BACKEND_SHA=<sha> ASSAB_E2E_ATTESTED_DEPLOYED_BACKEND_SHA=<sha from Coolify> \
npm run test:preflight

# Mode B — disposable backend (needs a backend checkout with composer install done, PHP 8.3 + sqlite)
ASSAB_BACKEND_DIR=/path/to/Assab ASSAB_E2E_FIXTURE_PASSWORD="$(openssl rand -base64 24)" \
npm run test:isolated            # ASSAB_E2E_PROJECTS="preflight lifecycle regression" to choose

# Mode B with dashboard UI steps: run the dashboard locally against 127.0.0.1:8787, then add
#   ASSAB_E2E_UI=true ASSAB_E2E_FRONTEND_URL=http://127.0.0.1:5173

# Mode C — ONLY with explicit authorization
ASSAB_E2E_MODE=staging-financial ASSAB_E2E_API_ORIGIN=https://<backend> \
ASSAB_E2E_ALLOWED_API_HOSTS=<backend host> ASSAB_E2E_FIXTURE_PASSWORD=*** \
ASSAB_E2E_EXPECTED_BACKEND_SHA=<sha> ASSAB_E2E_ATTESTED_DEPLOYED_BACKEND_SHA=<sha> \
ASSAB_E2E_FINANCIAL_ACK="MUTATE_ASSAB_STAGING_FINANCIAL_FIXTURE:assab-ui-qa-20261018:<YYYY-MM-DD>" \
npm run test:staging-financial

npm run traceability              # writes traceability/TRACEABILITY.md (merges reports/**/results.json)
npx playwright show-report reports/<project>/html
```

Reports: `reports/<project>/{html,junit.xml,results.json,artifacts}` (default `reports/` when
`ASSAB_E2E_REPORT_DIR` is unset). Screenshots and UI traces are kept on failure only.

## GitHub Actions

`.github/workflows/assab-e2e-playwright.yml` — `workflow_dispatch` only.

* `unit` always runs first.
* `preflight` (Mode A) uses environment `assab-staging-readonly` and secret `ASSAB_E2E_FIXTURE_PASSWORD`.
* `isolated` (Mode B) checks out the backend at `backend_ref` (needs secret `ASSAB_BACKEND_READ_TOKEN`
  with read access to the backend repo) and generates a throw-away password in the job.
* `staging-financial` (Mode C) runs only if repository variable `ASSAB_E2E_STAGING_FINANCIAL_ENABLED=true`,
  in protected environment `assab-staging-financial` (add required reviewers), with
  `vars.ASSAB_E2E_ALLOWED_API_HOSTS`, and still passes through the code guard.

## Staging prerequisites (user/operator actions, not done by this suite)

1. Attest the deployed backend SHA from Coolify (no API exposes it) and pass it as `ASSAB_E2E_ATTESTED_DEPLOYED_BACKEND_SHA`.
2. Make sure the Vercel build's `VITE_API_BASE_URL` points to the staging backend; `.env.production` at `ce078df` still names `ivory-snail-183262.hostingersite.com` (preflight A02 detects this).
3. The fixture cashier needs its Employee mirror (`php artisan asab:mirror-mobile-cashiers`) or the SHF bridge skips the shift (`CASHIER_NOT_MIRRORED`).
4. At least one active aggregator must exist (apps 25 SAR needs `aggregator_id`).
5. The fixture branch-manager must not be stuck on a forced first-login reset (mobile login 403).
