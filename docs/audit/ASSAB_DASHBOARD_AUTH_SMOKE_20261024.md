# ASSAB ERP — Dashboard Staging Smoke & Environment Audit Report

**Date**: 2026-10-24  
**Branch**: `001-dashboard-backend-integration-review`  
**Base Commit**: `7602da1cb3446354b8229fc9a87115d48a74f154` (`staging/dashboard-m9-candidate-20261016` merged PR #4)  
**Evaluator**: Antigravity (under ASSAB ERP Mandatory Evidence Protocol)  
**Review Target**: Mahmoud (Project Owner) & Independent Reviewer  

---

## 1. Environment & Infrastructure Attestation Status

| Environment Component | Expected Reference | Deployed Attestation Status | Current Operational State |
|---|---|:---:|:---:|
| **Backend Staging (Coolify)** | `integration/shift-cycle-staging-candidate-20261016` @ `26f86c6` | **Awaiting URL & Operator Attestation** | `BLOCKED` (No unverified fallback allowed) |
| **Frontend Staging (Vercel)** | `001-dashboard-backend-integration-review` | **Awaiting Deployment & Attested SHA** | `BLOCKED` (Branch not yet deployed to Vercel) |
| **Legacy Hostinger Server** | `https://ivory-snail-183262.hostingersite.com` | **DEPRECATED / REJECTED** | Discontinued per review directive |

> **⚠️ Governance Compliance Note (Rule 2 & Blocker 2)**:
> In accordance with Independent Review instructions, the legacy Hostinger endpoint has been completely disconnected. No smoke tests may be marked `PASS` against unverified staging infrastructure. Staging runtime verification remains strictly `BLOCKED` pending Mahmoud's attestation of the Coolify Staging URL and Vercel Staging deployment.

---

## 2. Credentials Hygiene & Security Notice (Blocker 3)

- **Zero Hardcoded Passwords**: All static passwords have been removed from `scripts/smoke-test-staging.ts`.
- **Environment Variable Enforcement**: Credentials and endpoint origins must be supplied via shell / Secret Manager:
  - `ASSAB_STAGING_API_ORIGIN`
  - `ASSAB_STAGING_PASSWORD`
  - `ASSAB_ROLELESS_EMAIL`
  - `ASSAB_VERCEL_FRONTEND_URL`
- **Zero Token Leakage**: The smoke runner and test logs contain zero authorization tokens, cookies, or personal identifiers.
- **Credential Rotation Notice to Owner**: Any test fixture credentials previously committed or tested against third-party hosts should be rotated by the project owner.

---

## 3. Honest Acceptance & Execution Matrix (Blocker 4)

| Scope / Task ID | Requirement Description | Source Implementation | Automated Tests (Unit/AST) | Browser QA (Vercel) | Live Staging Runtime | Overall Item Status |
|:---:|---|:---:|:---:|:---:|:---:|:---:|
| **A1** (US1) | Company Admin Invitations Contract (`roleKey`, selectors, disabled guard) | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (6/6 tests) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **A2** (US3) | Subscription Plans Route Realignment (`GET /plans`) | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (1/1 test) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **B1** (US2) | Multi-Role Read-Only Staging Smoke & Currency Check | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` | `BLOCKED` (Awaiting Vercel URL) | `BLOCKED` (Awaiting Coolify URL) | **BLOCKED_ON_ENVIRONMENT** |
| **B2** (US4) | Branch Manager Scope Compatibility Verification | `SOURCE_IMPLEMENTED` (Guard preserved) | `AUTOMATED_TEST_PASS` | `NOT_RUN` | `BLOCKED` (Compatibility hold on fixture) | **BLOCKED_ON_BACKEND** |
| **C1** (US5) | Asset Depreciation Elimination (ASSET-01) | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (AST audit) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **C2** (US6) | Employee Statement Debit Fallback (DIFF-04) | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (7/7 tests) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **D1** (US7) | Obsolete Query Adapters Pruning & ERP Repointing | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (3/3 tests) | `NOT_RUN` | `BLOCKED` | **AWAITING_DEPLOYMENT** |

---

## 4. Endpoint Root Cause & Classification Ledger

When the environment is provisioned, endpoint responses must be classified under these strict criteria:

| Endpoint Tested | Expected HTTP Status | Root Cause Category | Explanation & Responsibility |
|---|:---:|---|---|
| `/plans` | 200 OK | `OK` | Task A2 points to active backend plans catalog. |
| `/head/erp/batches` | 200 OK | `OK` | Task D1 repointed from dead `/company/me/erp/batches`. |
| `/head/erp/eligible-operations` | 200 OK | `OK` | Task D1 repointed from dead `/company/me/erp/eligible-operations`. |
| `/company/me/cash/custody` | 404 Not Found | `URL_NOT_FOUND` | Unmounted route on backend; frontend safely renders empty/unavailable state without crash. |
| `/company/me/asset-drafts` | 404 Not Found | `CONTRACT_MISSING` | Backend item **E1** (reserved for Mahmoud). Frontend handles gracefully. |
| `/company/me/shifts` (by roleless user) | 403 Forbidden | `ROLE_MISMATCH` | Expected fail-closed behavior emitting Arabic error message. |

---

## 5. Compatibility Hold: Branch Manager Single-Branch Scope (Task B2)

- **Frontend Security Contract (`roleAccess.ts:33`)**:
  Requires `roles[0].scope === "branch"` with `branchIds.length === 1` and `brandIds.length === 0` and `restaurantIds.length === 0`.
- **Backend Fixture Reality**:
  `StagingHarnessProvisioner.php:510` seeds branch users with populated brand and restaurant arrays, which fails closed on the frontend.
- **Policy Decision**:
  Do NOT modify or relax `roleAccess.ts:33`. The compatibility hold remains logged for Mahmoud's resolution in backend tasks **E2** (`OnboardController.php`) and **E3** (`StagingHarnessProvisioner.php`).

---

## 6. Financial Halalas-to-SAR Scaling Protocol

The dashboard frontend performs zero mathematical calculations (0% tax or margin logic). Formatting is strictly:
$$\text{SAR Display} = \frac{\text{rawHalalas}}{100}$$

Dynamic validation rule:
When live staging JSON is received, the smoke runner inspects actual response fields (`netSalesHalalas`, `amountHalalas`, `priceHalalas`) and verifies exact match against the UI display value, rejecting any pre-calculated hardcoded string comparisons.
