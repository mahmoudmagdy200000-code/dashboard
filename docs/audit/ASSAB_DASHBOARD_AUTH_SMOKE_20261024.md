# ASSAB ERP — Dashboard Staging Smoke & Environment Audit Report (GO-19)

**Date**: 2026-10-25
**Branch**: `001-dashboard-backend-integration-review`
**Base Commit**: `7602da1cb3446354b8229fc9a87115d48a74f154` (`staging/dashboard-m9-candidate-20261016` merged PR #4)
**Current Review Branch HEAD**: `69eb14a65eda7c6e499ac4ec30e10bd1b3277c74`
**Upstream Staging HEAD**: `cc27df879c0cb10eac9d67a25d2a4df560d5feef` (Merged PR #5)
**Evaluator**: Antigravity (under ASSAB ERP Mandatory Evidence Protocol)
**Review Decision**: `GO19_SMOKE_HARNESS_CORRECTED — STAGING_RECONCILED — RUNTIME_ACCEPTANCE_PENDING`

---

## 1. Staging Reconciliation Matrix (`69eb14a` vs `cc27df8`)

Following independent review of GO-18, Mahmoud's Staging branch (`cc27df8`) already merged PR #5 containing GO-17 and parallel review corrections. Comparison shows `DIVERGED — ahead 1 / behind 5`. The reconciliation below identifies what is present in Staging, what was remediated, and why **NO full duplicate PR** should be submitted:

| Finding / Item | Sherbini Implementation (`69eb14a`) | Staging Implementation (`cc27df8`) | Implementation Gap | Required Action / Resolution |
|---|---|---|---|---|
| **A1, A2, C1, C2, D1** | Implemented & verified | Merged via PR #5 (`8ec1786`) | Zero gap | Preserved identically |
| **D-3 (Asset Book Value 2 Decimals)** | `fmtAmt` in `CompanyDashboard.tsx` | Local `fmtSar2` in `CompanyDashboard.tsx` (`e9b3696`) | Staging has dedicated commit `e9b3696` | Adopted Staging `fmtSar2` implementation for 100% parity |
| **Mode A A08 Guard** | Not present | Commits `e9b3696` & `4e3fc73` (`shiftCycle.ts` & `preflight-readonly.spec.ts`) | Staging added guard against writing manager workday GET | Adopted Staging commits into review branch |
| **S-1 (Balanced Shift Verification)** | `verifyBalancedShift` with fallback to `candidateShifts[0]` | `evaluateFixtureShift` finding strictly by `salesHalalas===11500` | Neither had deterministic fixture ID match or ambiguity detection | Implemented deterministic fixture matching (unique `fixtureId`), ambiguity rejection (`BLOCKED / AMBIGUOUS_FIXTURE` on multiple shifts without unique ID), Asia/Riyadh timezone awareness, and 5 exact invariant validations |
| **S-2 (Head Approval Queue)** | `/operations?moduleKey=shifts&pageSize=100` | `/operations?moduleKey=shifts&pageSize=100&page=1` | Missing `&page=1` parameter | Aligned endpoint to `/operations?moduleKey=shifts&pageSize=100&page=1` |
| **S-4 & Role Isolation** | `logout` in `try/finally` per role, but unhandled exceptions could abort runner | `logout` best effort, no `try/finally` per role | Exception in one role halted subsequent roles | Wrapped each role in `try/catch/finally` with inner `try/catch` per check. Role exceptions marked `FAIL`, session terminated via `logout`, subsequent roles continue |
| **Evidence Sanitization** | Printed `Account: ${r.accountEmail}` | Printed `Account: ${r.accountEmail}` | PII (email addresses) leaked in logs | Removed all account email strings. Printed non-identifying test IDs (`SMOKE_ACC_01`, etc.). Added `sanitizeError` redacting emails, tokens, and passwords |
| **Workflow Failure Masking (P1)** | Used `|| true` on runner step; runner exited 0 on mismatch | Workflow not present on Staging | Failures masked as PASS in workflow | Removed `|| true`, set `shell: bash` with `set -o pipefail`, ensured script exits with code 1 on failed checks, kept `if: always()` for artifact upload |
| **SEC-1 (Old Branch Status)** | Old branch exists on remote `origin` | Not present on Mahmoud's repo | Old branch `001-dashboard-backend-integration` contains leaked commit `7566377` | Confirmed presence on `origin`. Zero code copied. Documented recommendation for repository owner to delete branch after credential rotation |

---

## 2. Environment & Infrastructure Reality

| Environment Component | Configured / Target URL | Deployed Attestation Status | Current Operational State |
|---|---|:---:|:---:|
| **Backend Staging (Coolify)** | `https://szkrjqiuo9s6d6nsy5fldc0j.62.72.19.141.sslip.io/` | **Confirmed Deployed SHA**: `26f86c683a17a8c5ebe19771186d6b35230d62cf` | `READY_FOR_SMOKE` (Backend SHA confirmed by Mahmoud from Coolify logs) |
| **Frontend Staging (Vercel)** | `Pending Vercel deployment of review branch` | **Awaiting Deployment & Attested SHA** | `NOT_RUN / BLOCKED` (Branch not yet deployed to Vercel) |
| **Legacy Hostinger Server** | `https://ivory-snail-183262.hostingersite.com` | **DEPRECATED / REJECTED** | Discontinued per review directive |

> **⚠️ Governance Compliance Standard**:
> 1. The Coolify Backend Staging origin is configured as `https://szkrjqiuo9s6d6nsy5fldc0j.62.72.19.141.sslip.io/`. Backend SHA `26f86c6` is confirmed from Coolify deployment logs.
> 2. Browser QA on Vercel remains strictly **`NOT_RUN`** because the review branch has not yet been deployed to Vercel.
> 3. Zero tests are claimed as `PASS` without verified runtime execution.
> 4. In-code assertions and offline unit tests are reported as `PASS` only for offline test suites.

---

## 3. Credentials Hygiene & Security Notice (SEC-1)

- **SEC-1 Status**: The deprecated branch `001-dashboard-backend-integration` still exists on remote `origin` (`mohameelsherbini/dashboard`) with commit `7566377` exposing a test fixture password.
  - Zero code has been copied from the compromised branch.
  - No login attempts are made with the exposed credentials.
  - Mahmoud has confirmed rotating the password across staging environments.
  - Repository owner (Mohamed Elsherbini) is advised to coordinate deletion of `001-dashboard-backend-integration` from GitHub after confirming no outstanding branches depend on it.
  - The authorized review branch `001-dashboard-backend-integration-review` is built cleanly from ancestor `7602da1` and contains **zero** hardcoded passwords or leaked credentials in its commit history.
- **Evidence Sanitization (P2)**:
  - Account emails have been completely excised from console logs, runner output, and report summaries.
  - `RoleSmokeResult` has replaced `accountEmail` with non-identifying test IDs (`SMOKE_ACC_01`, `SMOKE_HEAD_01`, etc.).
  - Error messages pass through `sanitizeError` which strips email addresses, bearer tokens, and passwords.

---

## 4. Honest Acceptance & Execution Matrix (GO-19)

| Scope / Task ID | Requirement Description | Source Implementation | Automated Tests (Unit/AST) | Browser QA (Vercel) | Live Staging Runtime | Overall Item Status |
|:---:|---|:---:|:---:|:---:|:---:|:---:|
| **A1** (US1) | Company Admin Invitations Contract Alignment | `SOURCE_ACCEPTED` | `AUTOMATED_TEST_PASS` (6/6 tests) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **A2** (US3) | Subscription Plans Route Realignment (`GET /plans`) | `SOURCE_ACCEPTED` | `AUTOMATED_TEST_PASS` (1/1 test) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **B1** (US2) | Multi-Role Read-Only Staging Smoke Runner | `SOURCE_ACCEPTED` | `AUTOMATED_TEST_PASS` | `NOT_RUN` (Awaiting Vercel URL) | `BLOCKED` (Awaiting Attestation) | **HARNESS_READY** |
| **B2** (US4) | Branch Manager Scope Compatibility Verification | `SOURCE_ACCEPTED` (Guard preserved) | `AUTOMATED_TEST_PASS` | `NOT_RUN` | `BLOCKED` (Compatibility hold on fixture) | **BLOCKED_ON_BACKEND** |
| **C1** (US5) | Asset Depreciation Elimination (ASSET-01 in all views) | `SOURCE_ACCEPTED` | `AUTOMATED_TEST_PASS` (Expanded AST audit) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **C2** (US6) | Employee Statement Debit Fallback (DIFF-04) | `SOURCE_ACCEPTED` | `AUTOMATED_TEST_PASS` (7/7 tests) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **D1** (US7) | Obsolete Query Adapters Pruning & ERP Repointing | `SOURCE_ACCEPTED` | `AUTOMATED_TEST_PASS` (3/3 tests) | `NOT_RUN` | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **D-3** (P3) | Fixed 2-Decimal Currency Display for Asset Book Value | `SOURCE_ACCEPTED` | `AUTOMATED_TEST_PASS` (3/3 tests) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **PARITY_WITH_STAGING** |
| **S-1** (P1) | Deterministic Balanced Shift Verification (2026-10-24) | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (MATCH, MISMATCH, NOT_FOUND, AMBIGUOUS) | `NOT_RUN` | `BLOCKED` | **HARNESS_READY** |
| **S-2** (P3) | Head Review Queue via `GET /operations?moduleKey=shifts&pageSize=100&page=1` | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` | `NOT_RUN` | `BLOCKED` | **PARITY_WITH_STAGING** |
| **S-4** (P2) | Session Cleanup & Role Isolation | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (Isolation + logout) | `NOT_RUN` | `BLOCKED` | **HARNESS_READY** |
| **P1-Workflow** | Smoke Workflow Exit Code Propagation & Failure Safety | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (T034 PASS) | `NOT_RUN` | `BLOCKED` | **WORKFLOW_READY** |

---

## 5. Result Categories & Summary Breakdown Ledger

The runner script computes explicit result categories:
`PASS` / `FAIL` / `NOT_FOUND` / `BLOCKED` / `NOT_RUN`

| Role Tested | Endpoint | HTTP Method | Dashboard Hook Reference | EXPECTED | ACTUAL |
|---|---|:---:|---|---|:---:|
| **Accountant** | `/accountant/shifts/live` | `GET` | `usePlatformLiveShifts` | `HTTP 200 (Active shifts list)` | `NOT_RUN` |
| **Accountant** | `/accountant/shifts/history?dateFrom=2026-10-24&dateTo=2026-10-24` | `GET` | `usePlatformHistoryShifts` | `MATCH (salesHalalas: 11500, cash: 4000, variance: 0, counted)` | `NOT_RUN` |
| **Accountant** | `/accountant/shifts/history` | `GET` | `usePlatformHistoryShifts` | `HTTP 200 (Shift history)` | `NOT_RUN` |
| **Accountant** | `/accountant/operations` | `GET` | `useAccountantOperationsPlatform` | `HTTP 200 (amountHalalas integer)` | `NOT_RUN` |
| **Accountant** | `/accountant/employees` | `GET` | `usePlatformEmployees` | `HTTP 200 (Employee roster)` | `NOT_RUN` |
| **Accountant** | `/company/me/cash-custody` | `GET` | `useCashCustody` | `HTTP 200 (Cash custody balances)` | `NOT_RUN` |
| **Accountant** | `/company/me/asset-drafts` | `GET` | `useAssetDrafts` | `BLOCKED: Backend E1 dependency (HTTP 404 until WP1)` | `NOT_RUN` |
| **Head Accountant** | `/plans` | `GET` | `useCompanyPlans` | `HTTP 200 (Subscription catalog)` | `NOT_RUN` |
| **Head Accountant** | `/head/erp/batches` | `GET` | `useERPBatches` | `HTTP 200 (ERP batches queue)` | `NOT_RUN` |
| **Head Accountant** | `/head/erp/eligible-operations` | `GET` | `useERPEligibleOperations` | `HTTP 200 (Eligible operations)` | `NOT_RUN` |
| **Head Accountant** | `/operations?moduleKey=shifts&pageSize=100&page=1` | `GET` | `useOperations` | `HTTP 200 (Pending head approval ops)` | `NOT_RUN` |
| **Company Admin** | `/company/me/users` | `GET` | `useCompanyUsers` | `HTTP 200 (Company users)` | `NOT_RUN` |
| **Company Admin** | `/company/invitations` | `GET` | `useCompanyInvitations` | `HTTP 200 (Pending invitations, read-only)` | `NOT_RUN` |
| **Company Admin** | `/plans` | `GET` | `useCompanyPlans` | `HTTP 200 (Subscription catalog)` | `NOT_RUN` |
| **Company Admin** | `/company/me/subscription` | `GET` | `useCompanySubscription` | `HTTP 200 (Subscription status)` | `NOT_RUN` |
| **Branch Manager** | `/auth/me` | `GET` | `useAuthMe` | `HTTP 200 (Fail-closed roleAccess guard check)` | `NOT_RUN` |
| **Branch Manager** | `/company/me/branch/overview` | `GET` | `usePlatformBranchOverview` | `HTTP 200 (Branch dashboard)` | `NOT_RUN` |
| **Role-less User** | `/company/me/shifts` | `GET` | `useRoleGuard` | `HTTP 403 + error.code: WRONG_ROLE + messageAr` | `NOT_RUN` |

### 5.1 Simulated Runner Output Ledger [ILLUSTRATIVE_SAMPLE — OFFLINE SIMULATION ONLY — STAGING RUNTIME IS NOT_RUN]

> **CRITICAL VERIFICATION NOTICE:**
> The summary block below is strictly an **illustrative sample** representing offline simulation and runner format demonstration.
> Live Staging Runtime status remains strictly **`NOT_RUN`** until manual operator attestation and dispatch by Mahmoud on Vercel/Coolify.

```
==================================================
ASSAB ERP — Staging Smoke Runner Summary
==================================================
Overall Acceptance Status: BLOCKED
Executed Checks Status: ALL_PASSED
Result Categories Breakdown:
  - PASS:     16
  - FAIL:     0
  - NOT_FOUND: 0
  - BLOCKED:  1
  - NOT_RUN:  0
--------------------------------------------------
Standing Environment / Dependency Blockers:
 * /company/me/asset-drafts returned HTTP 404: BLOCKED (Backend E1 dependency)
Operational acceptance is BLOCKED. Dashboard executed checks ALL_PASSED (16/16).
==================================================
```

---

## 6. GitHub Actions Dispatch Readiness & Operator Instructions

The workflow `.github/workflows/assab-go17-staging-smoke.yml` has been updated to remediate false success and support secure isolated cross-repo dispatch:
- **No `|| true`**: Unconditional failure masking is completely removed.
- **`shell: bash` + `set -o pipefail`**: Failure in `node ...` propagates through `tee` to the step exit code.
- **Fail-Closed Non-Zero Exit Codes (`determineSmokeExitCode`)**:
  - `0`: All acceptance checks PASSED (full operational acceptance).
  - `1`: Acceptance verification FAILED with errors or financial mismatches.
  - `2`: Staging readiness gate BLOCKED before execution (missing prerequisites/credentials).
  - `3`: Operational acceptance BLOCKED or NOT_RUN (standing backend dependencies E1/E2/E3, missing roleless account, or inconclusive branch scope).
  - Exit code 3 ensures that CI does NOT report false final acceptance when dependencies are blocked.
- **`if: always()` on Evidence Upload**: Evidence artifact `assab-smoke-evidence-${{ github.run_id }}` is always uploaded even when checks are BLOCKED or FAIL.
- **GitHub Step Summary**: Automatically produces formatted markdown tables in GitHub Actions UI.
- **Strict Fallbacks on Missing Roleless / Branch Scope**: If `ASSAB_ROLELESS_EMAIL` is not set, or `/auth/me` fails to evaluate branch scope, the runner does NOT skip them; it records `BLOCKED` and prevents false `PASS`.

### Operator Dispatch Instructions for Mahmoud
To execute this workflow safely in `mahmoudmagdy200000-code/dashboard` without merging application code:
1. **Enable Workflow UI on `main`**:
   Mahmoud only commits the single workflow YAML file `.github/workflows/assab-go17-staging-smoke.yml` to the default branch (`main`) of `mahmoudmagdy200000-code/dashboard`.
   *Zero application code, feature changes, or unverified files are merged into `main`.*
2. **Hardcoded Audited Source & Tamper Prevention**:
   The workflow checkout step is hardcoded strictly to `repository: "mohameelsherbini/dashboard"` and `ref: "4a4246b7b94153b5f34ff5f78d9095a82b1d6160"`.
   *No `workflow_dispatch` inputs are allowed to override the repository or commit SHA with an unreviewed source.*
3. **Pre-Execution Cryptographic SHA Verification**:
   Before installing dependencies or accessing any staging secrets, the workflow executes:
   `ACTUAL_SHA="$(git rev-parse HEAD)"` and fails closed if it does not match `4a4246b7b94153b5f34ff5f78d9095a82b1d6160`.
4. **Decoupling Tested Source from Vercel Deployment**:
   The tested Dashboard commit (`4a4246b7b94153b5f34ff5f78d9095a82b1d6160`) validates backend API contracts against Coolify Staging.
   It is NOT proof that Vercel is serving this SHA. `ASSAB_FRONTEND_DEPLOYED_SHA` is explicitly set to `"PENDING_VERCEL_DEPLOYMENT_ATTESTATION"`, and Browser QA remains strictly `NOT_RUN` until Vercel deployment is proven.
5. **Configure Secrets**:
   Ensure the GitHub Environment `assab-staging-smoke` in `mahmoudmagdy200000-code/dashboard` contains secrets:
   - `ASSAB_STAGING_PASSWORD` (Staging fixture password)
   - `ASSAB_ROLELESS_EMAIL` (Roleless test user email; if omitted, test safely records `BLOCKED`)
6. **Trigger Workflow via `workflow_dispatch`**:
   In GitHub Actions UI under "ASSAB ERP — Staging Read-Only Smoke & Compatibility", click "Run workflow" with operational inputs:
   - `attested_deployed_backend_sha`: `26f86c683a17a8c5ebe19771186d6b35230d62cf`
   - `attested_frontend_staging_url`: (optional Vercel Staging URL)
7. **Execution & Evidence**:
   The workflow checks out Sherbini's exact audited code with `permissions: contents: read`. If operational acceptance is held on Backend E1/E2/E3, the step exits with code 3, and `if: always()` uploads the complete sanitized artifact `assab-smoke-evidence-<run_id>`.
