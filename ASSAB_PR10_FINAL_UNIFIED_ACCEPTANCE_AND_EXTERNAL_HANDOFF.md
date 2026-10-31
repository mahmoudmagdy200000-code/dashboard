# ASSAB ERP — PR #10 Final Unified Acceptance & External Handoff (Final Verification Delta)

**Task ID:** `ASSAB-PR10-FINAL-UNIFIED-CLOSURE`
**Execution Policy:** ONE FIXED ACCEPTANCE GATE → ONE COMPLETE EXECUTION → ONE FINAL DELIVERY
**Target Repository:** `mahmoudmagdy200000-code/dashboard`
**Authorized Remote:** `origin` (`https://github.com/mohameelsherbini/dashboard.git`)
**Authorized Branch:** `review/dashboard-full-handoff-20261031`
**Base Commit SHA:** `cc219bb22ebb7c9ab050e36e77738627ed29c979`
**Base Tree SHA:** `531d8baabdb90624f6016f9c72c7dd8db38ebc1f`
**Current Review Commit SHA:** `e3f88d85eaa4fed89e5f8899c07374f0b41860e0`
**Current Review Tree SHA:** `a04aa734d59380fce9374abf5b1a4ef7b62c5c04`
**GitHub Pull Request:** [PR #10](https://github.com/mahmoudmagdy200000-code/dashboard/pull/10)
**Canonical Package:** `ASSAB_DASHBOARD_HANDOFF_1c484bd0_2026-10-30.zip` (SHA-256: `f8ac54f90e9dce2ddc5c05623f702b678d383958decf0bf44102a427edb5f70d`)
**Frozen Acceptance Register:** `ASSAB_PR10_FROZEN_ACCEPTANCE_REGISTER.csv` (22 canonical rows, 24 original fields)
**Raw Test Evidence Log:** `ASSAB_PR10_TEST_EVIDENCE.log` (125,127 bytes, 510/510 PASS)
**Working Tree Status:** Clean

---

## 1. Executive Summary & Delivery Status

This document represents the final, authoritative acceptance and evidence package for Dashboard PR #10, resolving all remaining evidence and reporting discrepancies identified during independent verification without reopening previously accepted production code.

### Core Accepted Achievements (Preserved Intact):
1. **Late Callback Session Guard:** Financial mutation callbacks in `AccCash.tsx`, `AccEmployees.tsx`, and `CompanyDashboard.tsx` are bound to `financialAccessGeneration(queryClient)` and live `isFinancialSessionActive(queryClient, startGen, actorId, companyId)` in `roleAccess.ts`. Late responses arriving after logout or company switch cannot mutate UI state, pollute cache, or resurrect defunct intents.
2. **Tenant Isolation:** Un-scoped `default_company` auto-migration was eradicated from `financialIntentStore.ts`. Financial intents require authenticated tenant scoping and fail closed upon cross-company mismatches.
3. **Funding Retry Safety:** Status reconciliation in `fundingExecutionContract.ts` strictly permits retrying only confirmed `approved` requests without execution timestamps, triggering zero additional HTTP mutations for unapproved or terminal states.
4. **Canonical D01–D22 Matrix:** Extracted directly from `ASSAB_PR10_FROZEN_ACCEPTANCE_REGISTER.csv` with original scenarios, exact 11 P0 / 10 P1 / 1 P2 distribution, and accurate test mapping. D09 remaining risk is decoupled from Backend BE-01.
5. **Source-Grounded Synthetic Fixture Manifest:** Reconstructed strictly from `ASSAB_SHARED_API_CONTRACT_AND_FIXTURE_PLAN.md` with `/api/v1/` routes, exact 115/50/25/10/30 SAR reconciliation figures, `data.financiallyPosted=false` execution semantics, and accounts marked `TO_BE_ATTESTED`.
6. **Verifiable Test Artifacts:** The raw test execution log `ASSAB_PR10_TEST_EVIDENCE.log` (510/510 PASS) and this handoff document are committed and delivered as text artifacts at the repository root.

---

## 2. Complete Traceable Checklist

### Preflight & Scope Freeze Rules
- [x] **اعتماد القرارات الفنية المرجعية:** الحفاظ على القرارات المؤكدة كمرجع محدث للحالة الخارجية.
- [x] **تجميد النطاق البرمجي (Scope Freeze):** عدم فتح الإصلاحات المقبولة سابقًا، وعدم بدء دورة تطوير أو Refactoring جديدة.
- [x] **تطابق مصفوفة D01–D22:** استخراج المصفوفة مباشرة من الـ Canonical CSV مع الحفاظ على أسماء الـ Scenarios الأصلية والأولويات (11 P0 / 10 P1 / 1 P2).
- [x] **فصل D09 عن BE-01:** تصحيح مخاطر D09 بعدم ربطها بـ BE-01؛ الإبقاء على BE-01 كاختبار Backend مستقل لسقف النقد.
- [x] **تصحيح وثيقة الـ Fixtures المقترحة:** استخدام `ASSAB_SHARED_API_CONTRACT_AND_FIXTURE_PLAN.md` مصدرًا وحيدًا، وتصحيح المبالغ (115/50/25/10/30 SAR)، وإثبات `financiallyPosted=false`، واشتراط تأكيد الاستلام من مدير الفرع لزيادة الرصيد، ووضع الحسابات تحت `TO_BE_ATTESTED`.
- [x] **تصنيف أدلة الاختبارات بدقة:** تصنيف اختبار Late Callback كـ Contract/Guard Logic Test، واختبارات D11/D14 كـ Source/Helper & Workflow Logic، مع تقديم Call-Site Evidence صريح والإقرار بعدم تشغيل Ledger Posting فعلي.
- [x] **تسليم السجل الخام الفعلي:** إتاحة ملف السجل الخام `ASSAB_PR10_TEST_EVIDENCE.log` بحجمه الكامل (125,127 بايت) وتقرير التسليم الشامل كملفات نصية قابلة للتحقق داخل المستودع.
- [x] **تطابق التقرير ووصف PR #10:** تحديث وصف الـ PR على GitHub ليتطابق كلياً مع هذا التقرير.
- [x] **الحفاظ على حالة PR #10:** مسودة (Draft) مفتوحة دون Merge أو Force Push أو تعديل على Backend أو Flutter.

---

## 3. Production Protections & Test Evidence Classification

### 3.1 P0 Late Callback Session Guard
- **Root Cause:** In React, passing arrow functions to `mutate(..., { onSuccess, onError })` binds variables (`user`, `companyId`) to the render closure. If a user logs out or switches companies while an HTTP request is in-flight, the callback executes in the context of the defunct session, risking intent recreation, cache contamination, and unauthorized toasts.
- **Implementation Mechanism (`roleAccess.ts` & `AuthContext.tsx`):**
  - `activeFinancialSession` tracks `{ actorId: string | null; companyId: string | null }`.
  - `financialAccessGeneration(queryClient)` provides a strictly monotonic counter incremented on every session teardown (`clearRetiredQueryClient`, `purgeFinancialQueries`).
  - `isFinancialSessionActive(queryClient, startGen, actorId, companyId)` validates both generation equality and session identity.
  - Callbacks in `AccCash.tsx`, `AccEmployees.tsx`, and `CompanyDashboard.tsx` evaluate `isFinancialSessionActive` before performing any state change or storage write.
- **Accurate Test Classification:**
  - **Classification:** `Contract / Guard Logic Test (Isolated Unit/Integration Runner)`.
  - **Scope of Proof:** Verifies that when a callback resolves after `clearRetiredQueryClient(queryClient)`, the guard predicate evaluates to `false`, completely suppressing toast notifications, UI dismissals, and storage recreation.
  - **Truthful Disclosure:** This test executes within the Node.js test environment using an isolated React Query client and simulated closure capture; it does *not* mount the full React component tree with live browser DOM events or simulated network latency.

### 3.2 Production Call-Site Evidence
- **[`AccCash.tsx`](file:///d:/claude/ASSAB%20ERP%20GITHUB%20BACKEND%20ANTIGRAVITY/worktree_dashboard_p0_recon_20261030/artifacts/mockup-sandbox/src/components/mockups/asab/_pages/accountant/AccCash.tsx):**
  - Lines 134–142: `FundingExecution` mutation callback captures generation and verifies `isFinancialSessionActive` before dismissing modal or showing toast.
  - Lines 236–244: `AsabCashTxnModal` direct custody debit callback evaluates `isFinancialSessionActive`.
- **[`AccEmployees.tsx`](file:///d:/claude/ASSAB%20ERP%20GITHUB%20BACKEND%20ANTIGRAVITY/worktree_dashboard_p0_recon_20261030/artifacts/mockup-sandbox/src/components/mockups/asab/_pages/accountant/AccEmployees.tsx):**
  - Lines 112–120: `settleMut.mutate` callback for employee custody settlements evaluates `isFinancialSessionActive`.
- **[`CompanyDashboard.tsx`](file:///d:/claude/ASSAB%20ERP%20GITHUB%20BACKEND%20ANTIGRAVITY/worktree_dashboard_p0_recon_20261030/artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx):**
  - Lines 348–356: `EmpSettleModal` settlement callback evaluates `isFinancialSessionActive`.
  - Lines 412–420: `CashTxnModal` transaction callback evaluates `isFinancialSessionActive`.
  - Lines 480–488: `CompanyFundingExecution` callback evaluates `isFinancialSessionActive`.

### 3.3 D11 Shift Review & D14 Expense Approval Evidence
- **D11 Shift Review (`shiftReviewIntegration.test.ts`, `shiftReportFinality.test.ts`):**
  - **Classification:** `Source / Helper & Workflow Logic Verification`.
  - **Scope of Proof:** Verifies that clarification returns preserve the original immutable `workday` ID, increment the report `revision`, require a mandatory explanation, and enforce absolute immutability post Head Final Approval.
  - **Call-Site:** `HeadAccountantDashboard.tsx`, `shiftReportFinalityContract.ts`.
- **D14 Expense Approval (`expenseLifecycle.test.ts`, `expenseLifecycleIntegration.test.ts`):**
  - **Classification:** `Source / Helper & Business Rule Verification`.
  - **Scope of Proof:** Verifies that accountants are denied approval execution under rule EXP-06, restricts approval to Owner/Manager, isolates the cashier sales drawer from disbursement debits, and prevents duplicate reversal movements.
  - **Call-Site:** `AccExpensesPage.tsx`, `expenseAccountingContract.ts`.
- **Truthful Ledger Disclosure:** Zero live database ledger postings were executed. Full End-to-End browser UI automation and database verification remain classified as `RUNTIME_E2E_NOT_RUN (AUTHORIZATION_PENDING)`.

---

## 4. Canonical D01–D22 Master Acceptance Register

*Extracted directly from `ASSAB_PR10_FROZEN_ACCEPTANCE_REGISTER.csv` (22 rows, 24 original fields, 11 P0 / 10 P1 / 1 P2).*

| ID | Priority | Canonical Scenario (Original CSV) | Final Verdict | Call-Site / Component | Verified Test Suite | Remaining Risk & Scope |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **D01** | **P0** | Login and role-based landing/access | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/auth/AuthContext.tsx; roleAccess.ts` | `authSession.test.ts; roleAccess.test.ts` | None locally; requires valid production JWT on staging deployment. |
| **D02** | **P0** | F5/session restoration and safe page/back state | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/auth/AuthContext.tsx; financialIntentStore.ts` | `authSession.test.ts; financialIntentStore.test.ts; financialRecoveryAndUiIntegration.test.ts` | None locally; session recovered via sessionStorage without duplicate intent keys. |
| **D03** | **P0** | Company, brand and branch scoping | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx; financialIntentStore.ts` | `companyAdminGuards.test.ts; financialIntentStore.test.ts` | None locally; strict company scoping enforced with zero default_company orphans. |
| **D04** | **P0** | List approved funding requests and execute transfer evidence | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/components/mockups/asab/_pages/accountant/AccCash.tsx; fundingExecutionContract.ts` | `fundingExecutionContract.test.ts; productionFinancialFlows.test.ts; financialRecoveryAndUiIntegration.test.ts` | None locally; transfer evidence requires valid PDF/image before accountant submit. |
| **D05** | **P0** | Direct credit must not bypass funding receipt chain | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/api/queries/cashTransactionContract.ts; AccCash.tsx` | `cashTransactionContract.test.ts` | None locally; direct credit blocked in contract and UI. |
| **D06** | **P1** | Direct debit authorization is narrower than visible accountant actions | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/api/queries/cashTransactionContract.ts:checkCustodyWriteAuthorization; AccCash.tsx` | `cashTransactionContract.test.ts; productionFinancialFlows.test.ts` | None locally; plain accountant fails closed without explicit brand custody authority. |
| **D07** | **P0** | Employee settlement request requires a reason; does not settle immediately | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/api/queries/employeeSettlementContract.ts; AccEmployees.tsx` | `employeeSettlementContract.test.ts; financialRecoveryAndUiIntegration.test.ts` | None locally; reason validated >= 3 chars, balance unchanged before Head Accountant approval. |
| **D08** | **P1** | Show pending settlement and line review status | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/components/mockups/asab/_pages/accountant/AccEmployees.tsx; CompanyDashboard.tsx` | `employeeSettlementContract.test.ts; employeeStatementFallback.test.ts` | None locally; UI renders under_review badge without optimistic balance reduction. |
| **D09** | **P1** | Explicit settlement approve/reject UI | `DEPENDS_BACKEND_MIGRATION` | `artifacts/mockup-sandbox/src/components/mockups/asab/HeadAccountantDashboard.tsx; headReviewGuards.test.ts` | `headReviewGuards.test.ts; productionFinancialFlows.test.ts` | Local contract aligned; Head Accountant multi-user settlement approval UI requires live multi-user staging execution; independent of BE-01 (shift cash ceiling regression). |
| **D10** | **P0** | Shift live/history and correction source surface | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/api/queries/shiftsHistory.ts; shiftAllocationCorrection.ts` | `shiftsHistory.test.ts; shiftAllocationCorrection.test.ts; shiftReportCorrection.test.ts` | None locally; shift history revision conflict 409 handled gracefully. |
| **D11** | **P0** | Report review and final approval chain | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/components/mockups/asab/shiftReportFinalityContract.ts; HeadAccountantDashboard.tsx` | `shiftReviewIntegration.test.ts; shiftReportFinality.test.ts; financialRecoveryAndUiIntegration.test.ts` | None locally; clarification return increments revision and preserves workday. |
| **D12** | **P1** | Branch Dashboard is not the mobile manager daily-close client | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/components/mockups/asab/BranchManagerDashboard.tsx; shiftControls.ts` | `phase1dBranchManager.test.ts; shiftControls.test.ts` | None locally; web branch role cannot masquerade as mobile manager. |
| **D13** | **P2** | Wave3 debt repayment and two-party reversal support | `DEFERRED_WAVE3_SCOPE` | `artifacts/mockup-sandbox/src/api/queries/wave3Contract.ts; SalesModule.tsx` | `wave3Contract.test.ts` | Wave 3 feature; contracts verified locally, full live two-party workflow deferred per canonical plan. |
| **D14** | **P1** | Paid expense, preapproval and rejection accounting | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/api/queries/expenseAccountingContract.ts; AccExpensesPage.tsx` | `expenseLifecycle.test.ts; expenseLifecycleIntegration.test.ts; financialRecoveryAndUiIntegration.test.ts` | None locally; EXP-06 accountant permission denial active; sales drawer protected. |
| **D15** | **P0** | Money conversion, cents and VAT | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/components/mockups/asab/halalasPrecision.ts; vatDisplay.ts; purchaseOrderVat.ts` | `halalasPrecision.test.ts; vatDisplay.test.ts; purchaseOrderVat.test.ts` | None locally; exact halala integer conversions; zero division-by-1.15 fabrication. |
| **D16** | **P1** | API envelopes, lists and missing subscription | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/api/responseContracts.ts; missingSubscription.ts; errors.ts` | `responseContracts.test.ts; missingSubscription.test.ts; errors.test.ts` | None locally; null subscription and empty list render truthful state. |
| **D17** | **P0** | Idempotency on transport retry versus a second UI mutation | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/api/idempotencyIntent.ts; financialIntentStore.ts; fundingExecutionContract.ts; cashTransactionContract.ts; employeeSettlementContract.ts; AccCash.tsx; CompanyDashboard.tsx; AccEmployees.tsx` | `idempotencyIntent.test.ts; financialIntentStore.test.ts; fundingExecutionContract.test.ts; cashTransactionContract.test.ts; employeeSettlementContract.test.ts; financialRecoveryAndUiIntegration.test.ts` | None locally; RFC 4122 v4 UUID, F5 recovery, file hash verification, payload modification 409 conflict, company scoping without default_company orphans. |
| **D18** | **P0** | Unauthorized navigation and financial-cache purging | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/auth/roleAccess.ts; financialIntentStore.ts; AuthContext.tsx` | `roleAccess.test.ts; financialIntentStore.test.ts` | None locally; clearAllFinancialIntents() purges memory and sessionStorage upon role/tenant switch. |
| **D19** | **P1** | React runtime recovery donor, hook ordering and error containment | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/components/ErrorBoundary.tsx; companyLoadingTransitions.ts` | `ErrorBoundary.test.ts; companyLoadingTransitions.test.ts` | None locally; error boundary isolates crashes and prevents mutation replay. |
| **D20** | **P1** | Close custody is metadata; new deposit is separate approved funding | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/api/queries/cash.ts; cashTransactionContract.ts; AccCash.tsx` | `cashTransactionContract.test.ts` | None locally; custody closure preserves metadata; new deposit requires funding chain. |
| **D21** | **P1** | Funding approval authority versus financial execution role | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/api/queries/fundingExecutionContract.ts; fundingRequests.ts; AccCash.tsx` | `fundingExecutionContract.test.ts` | None locally; accountant cannot approve/reject as owner; executes approved request only. |
| **D22** | **P1** | Finance/report visibility and ledger freshness | `PASS_LOCAL` | `artifacts/mockup-sandbox/src/api/queries/fundingRequests.ts; shiftReportFinalityContract.ts; AccCash.tsx` | `fundingExecutionContract.test.ts; shiftReportFinality.test.ts` | None locally; pending request is not cash; branch balance unchanged before manager receipt. |

---

## 5. Source-Grounded Synthetic Fixture Manifest

> ### **STATUS: PROPOSED / NOT AUTHORIZED / NOT EXECUTED**
> **Mandatory Policy:**
> - Source of Truth: `ASSAB_SHARED_API_CONTRACT_AND_FIXTURE_PLAN.md` (from `ASSAB_DASHBOARD_HANDOFF_1c484bd0_2026-10-30.zip`).
> - No test accounts or fixtures have been created.
> - No database seeding, migrations, or resets have been or will be run.
> - Zero financial mutating HTTP requests are authorized on Staging without Mahmoud's separate explicit approval.
> - Database reset, backdating, deleting, or unapproved reversal are strictly prohibited as test cleanup.
> - Unresolved FUND-01 sales-cash conversion remains excluded from P0 acceptance.

### 5.1 Endpoint Contracts (All Relative to Verified `/api/v1/` Base)

| Flow / Action | Endpoint Request Path | Response & Server State | Actor / Money / Key Semantics |
| :--- | :--- | :--- | :--- |
| **Cashier Start** | `POST cashier/shifts/{cashier_shift_id}/start` | Status `started`; today only; tomorrow 400 | No money payload; Cashier token |
| **Manager Start** | `POST branch-manager/shifts/start-by-manager/{cashier_shift_id}` | Assigned same-branch manager only; today required | BranchManager token |
| **Preview Cash** | `POST cashier/shifts/{id}/cash-reconciliation/preview` | `data.cash_reconciliation(expected_cash, cash_variance...)` | SAR ≤ 2 decimals; read-only server computation |
| **End Cashier Shift** | `POST cashier/shifts/{id}/end` (or `/end-with-handover`) | Persisted report revision and count | Gross VAT-inclusive SAR; preserve intent key |
| **Daily Close Select** | `GET branch-manager/workday/daily-close?manager_workday_id=UUID` | `data.manager_workday_id`, status, totals | Read-only selector; no new day created |
| **Daily Close Correct** | `POST branch-manager/workday/end` or `PUT branch-manager/workday/daily-close` | Pinned business date, actual event time | Expected revision; meaningful reason |
| **Manager Daily Submission** | `POST branch-manager/workday/daily-close/submit` | Status `daily_submitted` | **Required UUID Idempotency-Key**; `expected_revision` is manager report revision |
| **Accountant Funding Execute** | `POST custody/requests/{requestId}/execute` | `data.financiallyPosted=false`, `data.executedAt` | Multipart `transferReference` (2..120) + `proof` (PDF/JPG/PNG ≤ 5MB); **NO branch credit** |
| **Funding Receipt Confirm** | `POST custody/requests/{requestId}/confirm-receipt` | `data.receivedAt`, status `received` | BranchManager token; **branch custody credited ONCE**; duplicate refuses |
| **Employee Settlement Request** | `POST company/me/employees/{employeeId}/settle-balance` | 201 pending request; balance unchanged | AsabUser accountant; stable key supported |
| **Employee Settlement Review** | `POST company/me/employee-settlements/{id}/approve` (or `/reject`) | Approval posts opposing movement once; reject posts no money | Head Accountant token; exact pending request ID |
| **Manual Custody Disbursement** | `POST company/me/cash-custody/{id}/transactions` | Integer halalas balance reduction | Direct treasury replenishment prohibited (422) |
| **Custody Close / Settle** | `POST company/me/cash-custody/{id}/settle` | Metadata update; preserves amount/used | Reset usage/zero liability prohibited (422) |
| **Wave3 Debt Repayment** | `POST shifts/repayments` | Pending repayment, requires manager confirmation | Uses integer **halalas**, unlike normal shift SAR |

### 5.2 Canonical Reconciliation Scenario (115 / 50 / 25 / 10 / 30 SAR)
- **Gross Sales:** 115 SAR (VAT-inclusive: net 100 SAR, VAT 15 SAR).
- **Card Payments:** 50 SAR (full customer gross, not net of merchant fees).
- **Aggregators / Apps:** 25 SAR (full customer gross, not net of app commission).
- **Derived Cash Sales:** $115 - 50 - 25 = 40\text{ SAR}$.
- **Confirmed Opening Cash:** 10 SAR (confirmed via authorized physical receipt; pending opening cannot be confirmed).
- **Expected Cash:** $\text{Gross} - \text{Card} - \text{Apps} + \text{Confirmed Opening} = 115 - 50 - 25 + 10 = 50\text{ SAR}$.
- **Counted Cash:** 30 SAR (independent physical count).
- **Variance (Shortage):** $\text{Counted} - \text{Expected} = 30 - 50 = -20\text{ SAR}$ (Shortage of 20 SAR).
- **Allocation Rule:** Shortage of 20 SAR must be allocated completely with an accountable reason; surplus remains separate branch evidence, not new sales.

### 5.3 Staging Identities (Marked `TO_BE_ATTESTED`)
All account credentials and IDs remain un-attested pending explicit authorization:

| Role Label | Target Model | Expected Scope | Staging Identity ID | Credential Status |
| :--- | :--- | :--- | :--- | :--- |
| **Cashier C1** | Cashier | Branch A | `TO_BE_ATTESTED` | Authorization required |
| **Cashier C2** | Cashier | Branch A | `TO_BE_ATTESTED` | Authorization required |
| **Branch Manager M1** | BranchManager | Branch A | `TO_BE_ATTESTED` | Authorization required |
| **Unauthorized Manager** | BranchManager | Branch B | `TO_BE_ATTESTED` | Authorization required |
| **Accountant** | AsabUser | Branch A / Brand A | `TO_BE_ATTESTED` | Authorization required |
| **Head Accountant** | AsabUser | Company Wide | `TO_BE_ATTESTED` | Separate authorization required |
| **Brand Owner** | BrandOwner | Brand A | `TO_BE_ATTESTED` | Separate authorization required |

### 5.4 Environment & Build Pinning
- **Backend Pinned SHA:** `1c484bd0ad89eabeda50a480a98019210ff74ae1`
- **Dashboard Review SHA:** `e3f88d85eaa4fed89e5f8899c07374f0b41860e0`
- **Flutter Pinned SHA:** `56c73f03311e5ff838801a6f27247c02b2beb3a4`
- **Staging Database:** `assab_staging` (Not disposable; zero mutating tests permitted).

---

## 6. Test Execution Evidence & Commands

### 6.1 Targeted Suite (Scoping, Status Retries & Late Callbacks)
- **Command:** `npx tsx --test artifacts/mockup-sandbox/src/api/queries/financialIntentStore.test.ts artifacts/mockup-sandbox/src/api/queries/fundingExecutionContract.test.ts artifacts/mockup-sandbox/src/api/queries/financialRecoveryAndUiIntegration.test.ts`
- **Exit Code:** `0`
- **Result:** `PASS` (32 passed, 0 failed, 0 skipped, 0 cancelled).
- **Duration:** 1,919.35 ms (~1.92s).

### 6.2 Auth Session Suite
- **Command:** `npx tsx --test artifacts/mockup-sandbox/src/api/authSession.test.ts`
- **Exit Code:** `0`
- **Result:** `PASS` (43 passed, 0 failed, 0 skipped, 0 cancelled).
- **Duration:** 10,781.42 ms (~10.78s).

### 6.3 Full Dashboard Regression Suite
- **Command:** `npx tsx --test artifacts/mockup-sandbox/src/**/*.test.ts`
- **Exit Code:** `0`
- **Result:** `PASS` (510 passed, 0 failed, 0 skipped, 0 cancelled across 56 test files).
- **Duration:** 63,454.80 ms (~63.5s).
- **Raw Deliverable:** `ASSAB_PR10_TEST_EVIDENCE.log` (125,127 bytes, committed at repository root).

### 6.4 Static Typecheck
- **Command:** `pnpm run typecheck` (`tsc --build && pnpm -r --filter "./artifacts/**" --filter "./scripts" --if-present run typecheck`)
- **Exit Code:** `0`
- **Result:** Clean compilation across all 8 workspace projects (0 errors, 0 warnings).

### 6.5 Production Build
- **Command:** `cd artifacts/mockup-sandbox && npx vite build`
- **Exit Code:** `0`
- **Result:** Clean build in 28.16s (`dist/assets/ASABPrototype-*.js`: 941.71 kB).

### 6.6 Git Whitespace & Syntax Diff Check
- **Command:** `git diff --check`
- **Exit Code:** `0`
- **Result:** Clean (no trailing whitespace, no merge conflict markers).

---

## 7. External Release Dependencies & Gated Decisions

1. **Flutter Mobile App (A9 & A15):**
   - *Status:* `SOURCE_IMPLEMENTED_LOCAL_TESTED` (Mahmoud/Codex Commit `56c73f03311e5ff838801a6f27247c02b2beb3a4`, 217 tests PASS).
   - *Next Action:* Push to remote feature branch and execute runtime Staging E2E.
   - *Owner:* Mahmoud / Codex.
2. **Backend BE-01 (Cash Ceiling Regression):**
   - *Status:* `PROPOSED_ISOLATED_LOCAL_REGRESSION` under FR-04.
   - *Next Action:* Isolated local regression test on pinned Backend `1c484bd0`.
   - *Owner:* Backend Engineer / Mahmoud.
3. **Coolify Staging Runtime Attestation:**
   - *Status:* `ATTESTED_STAGING_EVIDENCE` (Backend `1c484bd0` deployed healthy, PHP 8.3.36 build attested; live read-only `php -v` check pending).
   - *Owner:* Mahmoud.
4. **Staging Financial E2E Authorization:**
   - *Status:* `RUNTIME_E2E_NOT_RUN (AUTHORIZATION_PENDING)`.
   - *Next Action:* Formal review and written approval of Section 5 Synthetic Fixture Manifest.
   - *Owner:* Mahmoud.
5. **FUND-01 Policy Decision:**
   - *Status:* `CONSERVATIVE_RULE_CONFIRMED` (Restrictive rule maintained, sales-cash conversion excluded from P0).
   - *Owner:* Mahmoud / Business Authority.
6. **PR #10 Final Merge Acceptance:**
   - *Status:* Draft PR open with verified commit and clean working tree.
   - *Next Action:* Technical review and gated merge decision by Mahmoud.
   - *Owner:* Mahmoud.
