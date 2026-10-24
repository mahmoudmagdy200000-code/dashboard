# ASSAB ERP — Dashboard Staging Smoke & Environment Audit Report (Round 2)

**Date**: 2026-10-24
**Branch**: `001-dashboard-backend-integration-review`
**Base Commit**: `7602da1cb3446354b8229fc9a87115d48a74f154` (`staging/dashboard-m9-candidate-20261016` merged PR #4)
**Evaluator**: Antigravity (under ASSAB ERP Mandatory Evidence Protocol)
**Review Target**: Mahmoud (Project Owner) & Independent Reviewer

---

## 1. Environment & Infrastructure Reality (GO-17 Round 2)

| Environment Component | Configured / Target URL | Deployed Attestation Status | Current Operational State |
|---|---|:---:|:---:|
| **Backend Staging (Coolify)** | `https://szkrjqiuo9s6d6nsy5fldc0j.62.72.19.141.sslip.io/` | **Awaiting Operator Attestation** | `BLOCKED` (Endpoint exists, but deployed SHA must be attested by Mahmoud) |
| **Frontend Staging (Vercel)** | `Pending Vercel deployment of review branch` | **Awaiting Deployment & Attested SHA** | `NOT_RUN / BLOCKED` (Branch not yet deployed to Vercel) |
| **Legacy Hostinger Server** | `https://ivory-snail-183262.hostingersite.com` | **DEPRECATED / REJECTED** | Discontinued per review directive |

> **⚠️ Governance Compliance Standard**:
> 1. The Coolify Backend Staging origin is configured as `https://szkrjqiuo9s6d6nsy5fldc0j.62.72.19.141.sslip.io/`. However, because no backend endpoint reflects the exact git commit SHA, the environment is classified as **`BLOCKED`** pending Mahmoud's written attestation.
> 2. Browser QA on Vercel is strictly **`NOT_RUN`** because the feature branch has not yet been deployed to Vercel.
> 3. Zero tests are claimed as `PASS` without verified runtime execution.

---

## 2. Credentials Hygiene & Security Notice

- **Zero Hardcoded Passwords**: All static passwords have been completely purged from `scripts/smoke-test-staging.ts`.
- **Environment Variable Enforcement**: Credentials and endpoint origins must be supplied via shell / Secret Manager:
  - `ASSAB_STAGING_API_ORIGIN` (defaults to `https://szkrjqiuo9s6d6nsy5fldc0j.62.72.19.141.sslip.io`)
  - `ASSAB_STAGING_PASSWORD` (fixture password — never in Git)
  - `ASSAB_ROLELESS_EMAIL` (authenticated account with no assigned roles)
  - `ASSAB_VERCEL_FRONTEND_URL` (Vercel staging URL)
- **Zero Token Leakage**: The smoke runner never outputs access tokens, refresh tokens, auth cookies, or personal identifiers.
- **Credential Rotation Notice to Owner**: Any test fixture credentials previously committed or tested against third-party hosts should be rotated by the project owner.

---

## 3. Honest Acceptance & Execution Matrix (GO-17 Round 2)

| Scope / Task ID | Requirement Description | Source Implementation | Automated Tests (Unit/AST) | Browser QA (Vercel) | Live Staging Runtime | Overall Item Status |
|:---:|---|:---:|:---:|:---:|:---:|:---:|
| **A1** (US1) | Company Admin Invitations Contract (`roleKey`, selectors, disabled guard) | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (6/6 tests) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **A2** (US3) | Subscription Plans Route Realignment (`GET /plans`) | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (1/1 test) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **B1** (US2) | Multi-Role Read-Only Staging Smoke & Currency Check | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` | `NOT_RUN` (Awaiting Vercel URL) | `BLOCKED` (Awaiting Attestation) | **BLOCKED_ON_ENVIRONMENT** |
| **B2** (US4) | Branch Manager Scope Compatibility Verification | `SOURCE_IMPLEMENTED` (Guard preserved) | `AUTOMATED_TEST_PASS` | `NOT_RUN` | `BLOCKED` (Compatibility hold on fixture) | **BLOCKED_ON_BACKEND** |
| **C1** (US5) | Asset Depreciation Elimination (ASSET-01 in all views) | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (Expanded AST audit) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **C2** (US6) | Employee Statement Debit Fallback (DIFF-04) | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (7/7 tests) | `NOT_RUN` (No Vercel deploy) | `BLOCKED` | **AWAITING_DEPLOYMENT** |
| **D1** (US7) | Obsolete Query Adapters Pruning & ERP Repointing | `SOURCE_IMPLEMENTED` | `AUTOMATED_TEST_PASS` (3/3 tests) | `NOT_RUN` | `BLOCKED` | **AWAITING_DEPLOYMENT** |

---

## 4. Endpoint Contract Mapping & Classification Ledger

All endpoints in `scripts/smoke-test-staging.ts` are mapped directly to actual Dashboard hooks:

| Role Tested | Endpoint | HTTP Method | Dashboard Hook Reference | Expected Classification | ACTUAL (after run) |
|---|---|:---:|---|---| --- |
| **Accountant** | `/accountant/shifts/live` | `GET` | `usePlatformLiveShifts` | `OK` (When authenticated) | `NOT_RUN` |
| **Accountant** | `/accountant/shifts/history` | `GET` | `usePlatformHistoryShifts` | `OK` | `NOT_RUN` |
| **Accountant** | `/accountant/shifts/history?dateFrom=2026-10-24&dateTo=2026-10-24` | `GET` | `usePlatformHistoryShifts` | `OK` only if `salesHalalas=11500, cashExpectedHalalas=4000, cashActualHalalas=4000, varianceHalalas=0, cashCountState=counted`; `NOT_FOUND` if the fixture shift is absent; `CONTRACT_MISMATCH` otherwise (S-1) | `NOT_RUN` |
| **Accountant** | `/accountant/operations` | `GET` | `useAccountantOperationsPlatform` | `OK` | `NOT_RUN` |
| **Accountant** | `/accountant/employees` | `GET` | `usePlatformEmployees` | `OK` | `NOT_RUN` |
| **Accountant** | `/company/me/cash-custody` | `GET` | `useCashCustody` | `OK` (Route aligned with useCashCustody) | `NOT_RUN` |
| **Accountant** | `/company/me/asset-drafts` | `GET` | `useAssetDrafts` | `CONTRACT_MISSING` (Backend item E1) | `NOT_RUN` |
| **Head Accountant** | `/plans` | `GET` | `useCompanyPlans` | `OK` (Task A2) | `NOT_RUN` |
| **Head Accountant** | `/head/erp/batches` | `GET` | `useERPBatches` | `OK` (Task D1) | `NOT_RUN` |
| **Head Accountant** | `/head/erp/eligible-operations` | `GET` | `useERPEligibleOperations` | `OK` (Task D1) | `NOT_RUN` |
| **Head Accountant** | `/operations?moduleKey=shifts&pageSize=100&page=1` | `GET` | `useOperations` | `OK` (S-2: same source the approval page reads) | `NOT_RUN` |
| **Company Admin** | `/company/me/users` | `GET` | `useCompanyUsers` | `OK` | `NOT_RUN` |
| **Company Admin** | `/company/invitations` | `GET` | `useCompanyInvitations` | `OK` (Read-only; NO POST) | `NOT_RUN` |
| **Company Admin** | `/company/me/subscription` | `GET` | `useCompanySubscription` | `OK` | `NOT_RUN` |
| **Branch Manager** | `/auth/me` | `GET` | `useAuthMe` | `OK` (Direct scope inspection) | `NOT_RUN` |
| **Branch Manager** | `/company/me/branch/overview` | `GET` | `usePlatformBranchOverview` | `OK` | `NOT_RUN` |
| **Role-less User** | `/company/me/shifts` | `GET` | `useRoleGuard` | `ROLE_MISMATCH` (Expects 403 + error.code WRONG_ROLE + messageAr) | `NOT_RUN` |

---

> **Integration note (25/10/2026):** the first column set was an *expectation*, not a result. Every ACTUAL cell stays `NOT_RUN` until `scripts/smoke-test-staging.ts` is executed against the attested backend. The smoke runner now (a) checks the 24/10 fixture shift explicitly instead of the non-existent `netSalesHalalas` field, (b) reads the head queue from `/operations`, and (c) logs out every role session after use.

## 5. Branch Manager Scope Contract Inspection (Task B2)

- **Direct Endpoint Call**: `GET /auth/me` with Bearer token.
- **Fail-Closed Guard Verification (`roleAccess.ts:25-39`)**:
  ```ts
  const isRoleKeyBranch = bRole?.key === "branch";
  const hasBranchScope = bRole?.scope === "branch";
  const isBrandIdsValid = validStringArray(bRole?.brandIds, UUID_PATTERN);
  const hasEmptyBrands = isBrandIdsValid && bRole.brandIds.length === 0;
  const isRestaurantIdsValid = validStringArray(bRole?.restaurantIds, UUID_PATTERN);
  const hasEmptyRestaurants = isRestaurantIdsValid && bRole.restaurantIds.length === 0;
  const isBranchIdsValid = validStringArray(bRole?.branchIds, UUID_PATTERN);
  const hasExactOneBranch = isBranchIdsValid && bRole.branchIds.length === 1;
  const isModuleKeysValid = validStringArray(bRole?.moduleKeys, MODULE_KEY_PATTERN);
  const guardPassed = Boolean(isRoleKeyBranch && hasBranchScope && hasExactOneBranch && hasEmptyBrands && hasEmptyRestaurants && isModuleKeysValid);
  ```
- **Policy Decision**:
  Do NOT modify or relax `roleAccess.ts:33`. Missing arrays are strictly NOT treated as empty. The compatibility hold remains logged for Mahmoud's resolution in backend tasks **E2** (`OnboardController.php`) and **E3** (`StagingHarnessProvisioner.php`).

---

## 6. Financial Halalas-to-SAR Scaling Protocol (No False Passes)

- The smoke runner validates the presence and numeric type of raw JSON halala fields (`netSalesHalalas`, `amountHalalas`, etc.).
- It computes the expected display string: $\text{SAR} = (\text{rawHalalas} / 100)\text{.toFixed(2)}$.
- **UI Comparison Status**:
  Because automated API querying cannot see rendered DOM nodes, UI comparison is honestly recorded as:
  **`NOT_RUN (Requires interactive Browser QA on deployed Vercel UI)`**.
  The runner does NOT compare the calculated value against itself to fabricate a `PASS`.
