# ASSAB ERP — Unified Dashboard Phase 3 + Phase 4 + Phase 5 Remediation Execution Checklist (V2)
**Prepared:** 2026-10-23 · **Status:** DRAFT / PENDING PROJECT OWNER EXECUTION GO · **No repository writes performed in preparing this artifact.**

> **STOP RULE:** This checklist is an execution-control specification, **not** authorization for Git writes. The operator may perform read-only preflight until Project Owner explicitly authorizes a named repository, branch, batch and allowed operations. Any code/commit is only after that GO; push, PR, merge, deploy, financial transactions, Backend/Flutter writes and final Master update require their own explicit authorization.

## 0. Release decision and authoritative evidence
- **Phase 3:** 15 R3 IDs: 5 source-resolved, 3 partially resolved, 6 still source-open/risk, 1 display-policy decision. 176 visual language×viewport tests NOT_RUN and 14 historical BLOCKED (not 190 unique runtime claims).
- **Phase 4:** 8 new A4 IDs (2 P1, 6 P2), 12 historical revalidations, 456 scope records; 704 NOT_RUN and 8 BLOCKED, **0 browser/axe/keyboard/screen reader executions**. `A4-F03` source supports WCAG 2.1.1 keyboard failure; 2.1.2 (focus trap) should not be asserted without a separate focus-trap finding. `A4-F07` is direction/reading-order risk, not automatically WCAG 3.1.2 language-of-parts failure.
- **Phase 5:** 31 contract cases: **2 CONFIRMED_MISMATCH, 4 IMPLEMENTATION_GAP, 11 CONTRACT_UNKNOWN, 4 DECISION_REQUIRED, 10 COMPATIBLE_STATICALLY**. 21 non-compatible records including inherited finding IDs, **37 tests: 27 BLOCKED + 10 NOT_RUN, 0 cross-repository runtime tests**. No claim of exhaustive API inventory.
- **Canonical Dashboard Master:** 249 tracked original IDs at baseline. Do not numerically add 15+8+21 as unique new problems. Maintain crosswalk/root ID links; preserve old verified/pending statuses unless independent evidence supersedes them.
- **Phase 5 `.txt` issue:** uploaded `ASSAB_PHASE_5_API_BUSINESS_RULES_AUDIT_20261023.txt` contains Phase 4 summary; the **Phase 5 ZIP** contains the actual Phase 5 source audit and passes archive integrity. Source/audit packet can guide planning; independently correct the mislabeled TXT for official handoff if requested; do not replace ZIP evidence with TXT contents.
- **Phase 6:** final consolidation not evidenced as delivered here. This V2 execution plan is provisional until findings/approvals/release baselines are reconciled; no automatic Phase 6 completion asserted.

### Audited frozen baselines (verify current remote and selected target before every implementation batch)
| Repository | Audited branch | Audited SHA | Deployment / merge caveat |
|---|---|---|---|
| Dashboard `mohameelsherbini/dashboard` | `refactor/asabprototype-modularization-20261022` | `30d3d261b83ed4b0d9fa1dc1f875ae8592484261` | This is not fork main, not established as deployed |
| Backend `mohameelsherbini/Assab` | `task/g1-b01-f01-delivery-20261018` | `983db6559763855d1a8c430cd92a9f7c199cc44e` | Frozen G1 comparison only; F2 review branches and S1-12 closure distinct; no authoritative unified production SHA |
| Flutter `mohameelsherbini/AssabAPP` | `main` | `b2453481966fc1ae2cdfcac4161bbb29a3ba5828` | Demo `569eca4dfdb9faabeec3b5d16b47a4f7ae1b22cd` adds countedCash but is NOT main / not merged |

### Source files in handoff (read, CRC/SHA validate, and cross-reference)
- `ASSAB_PHASE_3_MOBILE_RESPONSIVE_AUDIT_20261023_CORRECTED_SHA30d3d261.zip`: `01_RECONCILED_15_R3_FINDINGS.csv`, `04_ALL_249_MASTER_ITEMS_CROSSWALK.csv`, `07_RUNTIME_NOT_RUN_AND_BLOCKED_BACKLOG_190.csv`.
- `ASSAB_PHASE_4_ACCESSIBILITY_AUDIT_20261023.zip`: `01_ACCESSIBILITY_NEW_FINDINGS_REGISTER.csv`, `03_ALL_249_MASTER_DEDUP_CROSSWALK.csv`, `14_KEYBOARD_SCREENREADER_AND_BROWSER_NOT_RUN_BACKLOG.csv`.
- `ASSAB_PHASE_5_API_BUSINESS_RULES_AUDIT_20261023.zip`: `01_CROSS_REPOSITORY_COMPATIBILITY_MATRIX.csv` (**all 31**), `02_API_CONTRACT_FINDINGS_REGISTER.csv` (**21**), `07_DECISION_AND_APPROVAL_BACKLOG.csv` (**11**), `08_REGRESSION_TEST_REQUIREMENTS.csv` (**37**), `09_CROSS_PHASE_DEDUPLICATION_MATRIX_249.csv`, `10_GITHUB_PINNED_SOURCE_EVIDENCE_INDEX.csv` (**74**).
- `Assab-Business-Rules-v3.5-2026-10-21.md` (verified SHA256 `f8d9b2505e4f71a1c1b6c57adde1d6271c6830282c82f4b454c4dc9387f61009`); `02_API_COMPATIBILITY_MATRIX.md` as historic hypotheses only.
- Canonical GitHub `docs/audit/ASSAB_DASHBOARD_MASTER_FINDINGS.md` at Dashboard SHA above, never edit until final approved closure.

## 1. Operator contract — ALWAYS reopen checklist
**Every time the executor resumes, begins a batch, changes a repo, prepares a commit, or proceeds to next batch, they MUST reopen Section 1 and the exact batch section and reconcile both with `02_BATCH_TRACKER.csv`.** Work is invalid for acceptance without durable marks and SHA/test evidence.

- [ ] `GLOBAL-01` Check owner-signed GO scope: repo, exact batch IDs, approved branch, whether local commits allowed; if absent, READ-ONLY ONLY.
- [x] `GLOBAL-02` Verify attached ZIP CRC + embedded SHA-256 manifests; pin exact source baseline SHA and check latest remote SHA/branch drift.
- [x] `GLOBAL-03` Inspect local working tree, remote/PR state, untracked files and other contributor edits; do not reset/rewrite/force push.
- [ ] `GLOBAL-04` Read Master 249 root IDs and all batch evidence across Phases 3,4,5; compare current code to avoid stale fixes/double counting.
- [ ] `GLOBAL-05` Check policy/decision approvals, backend and mobile target commits, tenant scope, external dependencies, and synthetic-test isolation.
- [ ] `GLOBAL-06` Update batch tracker to IN_PROGRESS with preSHA, evidence URLs, owner and start date BEFORE editing; checkpoint exact checklist row.
- [ ] `GLOBAL-07` Make smallest proven scoped change only; keep role and company/branch isolation, PUR-01 fail closed, VAT/halala rules, auth unchanged unless approved.
- [ ] `GLOBAL-08` Run targeted test, build/typecheck/tests in appropriate repo; record exit codes, tested SHA, fixture type, screenshots/axe/keyboard only if executed.
- [ ] `GLOBAL-09` If FAIL: repair or BLOCK; if test environment missing: NOT_RUN/BLOCKED (never PASS). A no-change verification/decision batch gets ZERO code commits.
- [ ] `GLOBAL-10` BEFORE code commit, mark implementation and tests in checklist + tracker and stage ONLY authorized code/test/checklist files. Verify staged diff, no secrets or unintended API/role changes.
- [ ] `GLOBAL-11` Create one atomic local commit per cohesive authorized fix/root cause, PER REPO; record commit SHA in after-commit handoff and in next separate documentation checkpoint (no circular SHA).
- [ ] `GLOBAL-12` Independent reviewer checks diff/tests/policy; keep PENDING_REVIEW until accepted; do not unlock next DEPENDENT batch without independent acceptance.
- [ ] `GLOBAL-13` Reopen this Section 1, verify unresolved NOT_RUN/BLOCKED/APPROVAL_REQUIRED, select the next authorized independent batch. STOP on any gate.

### Workflow statuses & commit rule
`NOT_STARTED → PREFLIGHT_DONE → IMPLEMENTING → TESTED / IMPLEMENTED_UNVERIFIED → READY_TO_COMMIT → COMMITTED → PENDING_REVIEW → ACCEPTED` (only with accepted proof); or `VERIFY_ONLY`, `RESOLVED_IN_SOURCE`, `BLOCKED_DECISION`, `BLOCKED_EVIDENCE`, `BLOCKED_APPROVAL`, `NOT_RUN`. **COMMITTED does not imply VERIFIED/ACCEPTED**.
**Commit rule:** One atomic code commit per cohesive root and per repository; 0 code commits for verified-unchanged items, decision-only gates, tests NOT_RUN or deployment unknowns. No need to manufacture a commit for each CSV row. Any new issue/root requires approval and new tracker record. Pre-commit checkboxes should be included with the authorized code commit; its own hash is captured afterward in next checkpoint or final docs commit, never amended solely to backfill.

### Documentation bootstrap (separate opt-in permission)
- [x] `BOOT-01` Obtain explicit Owner GO to add `docs/audit/ASSAB_P3_P4_P5_EXECUTION_CHECKLIST.md` + `docs/audit/ASSAB_P3_P4_P5_BATCH_TRACKER.csv` to a named implementation branch; not to main.
- [x] `BOOT-02` Copy exactly the approved V2 plan and tracker; version-control one documentation-only bootstrap commit (if approved), report its SHA.
- [ ] `BOOT-03` At every authorized code batch: update batch marks and tracker in that branch before commit. Keep other contributors and Master untouched.
- [ ] `BOOT-04` For blocked/no-code findings, record in tracker and approved documentation checkpoint; NEVER invent empty implementation commits.

## 2. Plan execution order and gating
| Wave | Batch IDs | Nature | Gate |
|---|---|---|---|
| G — Environment & authorization | G00 | NO CODE | Explicit Owner GO for any writes |
| A — Source-confirmed shared UX/Accessibility | A01–A11 | 11 proposed Dashboard micro-batches | Independent verified source + scoped Dashboard GO |
| B — Responsive reflow and verify-only | B01–B10 | 8 verify-conditional + 1 owner financial decision + 1 verify-only | Browser/viewport evidence or demonstrated deterministic source issue; no arbitrary rework |
| C — Phase 5 cross-repo contract & policy | C01–C20 | 2 confirmed mismatch; 4 implementation gaps; 11 unknowns; 4 decisions; 10 static matches grouped by root | Exact Backend/Flutter target + Mahmoud approvals + explicit writes **per repo** |
| D — Regression & cross-repo safety | D01–D02 | READ/TEST in authorized isolation | Required test evidence, separate no-live authorization |
| M — Canonical Master closeout | M01 | Documentation-only after reviews | Independent acceptance and separate explicit Master edit GO |

### G00 — Single preflight approval gate
- [ ] `G00-01` Owner confirms plan V2 and names allowed repositories/branches and specific batch IDs; default NO GIT WRITES.
- [x] `G00-02` All three remote HEADs verified; all unmerged/review candidate branches clearly identified; do not infer deployed SHA.
- [ ] `G00-03` Phase 5 report ZIP treated as source audit with reservations, `.txt` mismatch logged; crosswalk preserves all original 249 IDs.
- [ ] `G00-04` Backend canonical release candidate and mobile consumer branch are selected by Mahmoud before any cross-repo code work.
- [ ] `G00-05` Isolated test credentials/fixtures verified synthetic before any API state-changing requests; no personal employee devices or live operations.
- [ ] `G00-06` Link Decision Register written approvals to blocker IDs; if not approved mark blocked not PASS.
- [x] `G00-07` Only after signed GO: create isolated implementation branch and optional docs bootstrap commit as separately authorized.

## 3. Detailed Micro-Batch Checklist — Phase 3 + Phase 4
### A01 — Login & Password Reset — programmatic field labels
**Phase:** P4 · **Finding links:** `A4-F01` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** LoginPage; ForgotPasswordPage.
- [x] `A01-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [x] `A01-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [x] `A01-03` Minimal action/disposition: Associate all affected login/reset labels to controls using stable id/htmlFor; keep 2FA and auth requests unchanged; relevant filter labels are handled in A10.
- [ ] `A01-04` Targeted acceptance evidence: Inspect labels/accessible names for email/password/OTP/reset in AR+EN; form errors; tab; existing auth unit tests.
- [x] `A01-05` Gate and limits: Dashboard UI ONLY; no API / session changes
- [x] `A01-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [x] `A01-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [x] `A01-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `ae2b998a6ff115e94c8732f3a0e55aede23c5d80`; postSHA `ad7ef3fb5d897a74bf150e8ab309d582e5aa0365`; commitSHA `ad7ef3fb5d897a74bf150e8ab309d582e5aa0365`; tested SHA `ad7ef3fb5d897a74bf150e8ab309d582e5aa0365`; tests `66/66 auth regression PASS; mockup typecheck PASS; six AST associations PASS; browser/keyboard NOT_RUN`; review `PENDING`; approval ref `GO-02`.

A01 is committed as `ad7ef3fb5d897a74bf150e8ab309d582e5aa0365` and remains `PENDING_REVIEW` / `IMPLEMENTED_UNVERIFIED`; A01-04 remains open for actual keyboard/browser evidence.

### A02 — Login password reveal control — keyboard
**Phase:** P4 · **Finding links:** `A4-F02` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** LoginPage password visibility.
- [x] `A02-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [x] `A02-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [x] `A02-03` Minimal action/disposition: Remove tabIndex=-1 from show/hide button; ensure native button with clear localized state and type=button.
- [ ] `A02-04` Targeted acceptance evidence: Tab / Shift-Tab, Enter / Space toggling, button does not submit, focus remains predictable, AR+EN.
- [x] `A02-05` Gate and limits: Dashboard UI ONLY; no auth rewrite
- [x] `A02-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [x] `A02-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [x] `A02-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `ad7ef3fb5d897a74bf150e8ab309d582e5aa0365`; postSHA `b44afbdf4d741404a165330966809785148f1b0b`; commitSHA `b44afbdf4d741404a165330966809785148f1b0b`; tested SHA `b44afbdf4d741404a165330966809785148f1b0b`; tests `66/66 auth regression PASS; mockup typecheck PASS; AST reachability assertion PASS; actual keyboard/browser NOT_RUN`; review `PENDING`; approval ref `GO-02`.

A02 committed as `b44afbdf4d741404a165330966809785148f1b0b`; status remains `PENDING_REVIEW` / `IMPLEMENTED_UNVERIFIED` pending runtime keyboard interaction.

### A03 — Shared KpiCard — clickable button semantics only
**Phase:** P3+P4 · **Finding links:** `R3-F08; HA-F33; S1H-F13` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** shared KpiCard interactive usages.
- [x] `A03-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [x] `A03-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [x] `A03-03` Minimal action/disposition: Convert onClick KpiCard interactive variant to native button (or semantically equivalent), leave informational cards outside tab order, no nested interactive controls.
- [ ] `A03-04` Targeted acceptance evidence: Keyboard focus/Enter/Space; role navigation; static cards not focused; reflow 320px; AR+EN.
- [x] `A03-05` Gate and limits: Dashboard Shared Component; cross-role regression
- [x] `A03-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [x] `A03-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [x] `A03-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `b44afbdf4d741404a165330966809785148f1b0b`; postSHA `7b8eccb5971e9e2b7548c657a07b3607523284ca`; commitSHA `7b8eccb5971e9e2b7548c657a07b3607523284ca`; tested SHA `7b8eccb5971e9e2b7548c657a07b3607523284ca`; tests `Vite SSR assertions PASS; mockup typecheck PASS; keyboard/browser NOT_RUN`; review `PENDING`; approval ref `GO-02`.

A03 evidence: R3-F08 source confirms `components/KpiCard.tsx` is a clickable `div`; the audit links `HA-F33` and `S1H-F13` are retained without adding IDs. AST scan found five actual interactive call sites, all in HeadDashboard; other KpiCard uses are informational. Interactive variant is a native `type="button"` with visible focus ring; informational variant remains a `div` with no pointer/focus affordance. SSR variant assertions PASS. `pnpm --filter @workspace/mockup-sandbox run typecheck` exit 0. Keyboard activation, role navigation and 320px reflow remain NOT_RUN.

### A04 — Document language metadata
**Phase:** P4 · **Finding links:** `A4-F06; CA-F19; HA-F36; S1H-F12` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** root document and language selection.
- [x] `A04-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [x] `A04-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [x] `A04-03` Minimal action/disposition: Synchronize root <html lang> with existing locale contexts for active ASABPrototype and CompanyDashboard; preserve dir and auth semantics.
- [ ] `A04-04` Targeted acceptance evidence: AR→EN→AR, reload, route switch, inspect html.lang, no duplicate/competing locale effects.
- [x] `A04-05` Gate and limits: Dashboard shared locale; not authentication lifecycle
- [x] `A04-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [x] `A04-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [x] `A04-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `7b8eccb5971e9e2b7548c657a07b3607523284ca`; postSHA `d565129d304be4f9bb984412f3240b7d67f87a14`; commitSHA `d565129d304be4f9bb984412f3240b7d67f87a14`; tested SHA `d565129d304be4f9bb984412f3240b7d67f87a14`; tests `66/66 auth regression PASS; mockup typecheck PASS; package build PASS; static locale sync assertions PASS; browser switch/reload NOT_RUN`; review `PENDING`; approval ref `GO-02`.

A04 evidence: A4-F06 source-confirmed at the pinned baseline; `CA-F19`, `HA-F36`, `S1H-F12` are related but distinct crosswalk entries; `R3-F07` concerns RTL and is not duplicated. Default HTML language now matches Arabic default. Shared `useDocumentLang` synchronizes initial and updated locale in `useSiteLang`, ASABPrototype and CompanyDashboard without changing `dir` or auth/session behavior. `TZ=UTC node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap artifacts/mockup-sandbox/src/auth/roleAccess.test.ts artifacts/mockup-sandbox/src/api/authSession.test.ts` exit 0 (66/66). `pnpm --filter @workspace/mockup-sandbox run typecheck` exit 0. `pnpm --filter @workspace/mockup-sandbox run build` exit 0; existing sourcemap and large-chunk warnings only. Static locale wiring check exit 0. Runtime test attempt BLOCKED: Vite dev could not enumerate network interfaces (`uv_interface_addresses`); Playwright Chromium executable absent. AR→EN→AR, reload and route-switch browser checks NOT_RUN. A04-04 remains unchecked. Generated `.generated/mockup-components.ts` ordering change during build was inspected and restored; it is absent from the commit.

### A05 — AdminUsers — keyboard-operable selection
**Phase:** P4 · **Finding links:** `A4-F03; HA-F33; HA-F34` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** Admin role-distribution selectable users/heads.
- [x] `A05-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [x] `A05-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [x] `A05-03` Minimal action/disposition: Make interactive AdminUsers accountant/head selection keyboard-operable with native controls; preserve independent unlink buttons; no nested buttons.
- [ ] `A05-04` Targeted acceptance evidence: Select/deselect/assign by keyboard, focus/ARIA state, role gates, no accidental mutation, AR+EN.
- [x] `A05-05` Gate and limits: Dashboard AdminUsers; permission edits forbidden
- [x] `A05-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [x] `A05-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [x] `A05-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `d565129d304be4f9bb984412f3240b7d67f87a14`; postSHA `66fe26a9253e8f12e52c6f14b23e61445a991482`; commitSHA `66fe26a9253e8f12e52c6f14b23e61445a991482`; tested SHA `pre-commit source content equals committed AdminUsers.tsx`; tests `PARTIAL_PASS — 42/42 shared/admin tests; 66/66 Auth/session; typecheck and static AST 8/8 pass; browser NOT_RUN`; review `PENDING`; approval ref `GO-02`.


A05 evidence: A4-F03 source-confirmed in Phase 4 register at pinned AdminUsers role-distribution source (baseline lines 674/715); HA-F33/HA-F34 are related historical IDs, not duplicates. Replaced clickable accountant row with a controlled native radio group and associated label; unassignment buttons remain siblings outside the label. Removed parent-card click-to-assign and added an explicitly named native assignment button, keeping `moveAccToHead` and its API mutation unchanged. Static TypeScript-AST checks PASS 8/8 (radio semantics, label association, state setter, assignment button name/type/callback, no clickable div, unlink callbacks retained). `pnpm --filter @workspace/mockup-sandbox run typecheck` exit 0. `TZ=UTC node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap artifacts/mockup-sandbox/src/components/mockups/asab/phase1fPlatformAdmin.test.ts artifacts/mockup-sandbox/src/components/mockups/asab/phase1hShared.test.ts` exit 0 (42/42); Auth/session regression same loader command with `roleAccess.test.ts` and `authSession.test.ts` exit 0 (66/66). Real keyboard activation, AR+EN interaction, role-gate interaction, no-mutation interaction, and browser accessibility remain NOT_RUN/BLOCKED because Chromium is absent and Vite dev is blocked by `uv_interface_addresses`; A05-04 remains unchecked. No permission/API contract changes.
### A06 — ProcNewOrders — accessible expansion control
**Phase:** P4 · **Finding links:** `A4-F03; R3-F05` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** procurement order accordion rows.
- [x] `A06-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [x] `A06-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [x] `A06-03` Minimal action/disposition: Turn procurement order-row expand action into explicit named button with aria-expanded/controls if needed; retain business callbacks.
- [ ] `A06-04` Targeted acceptance evidence: Tab/Enter/Space expand-collapse; click-equivalence; filters; purchase permission & status unchanged.
- [x] `A06-05` Gate and limits: Dashboard Procurement; keep API/status flow intact
- [x] `A06-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [x] `A06-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [x] `A06-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `66fe26a9253e8f12e52c6f14b23e61445a991482`; postSHA `9db95d7445586b0adf8c2da4620a5a415107accb`; commitSHA `9db95d7445586b0adf8c2da4620a5a415107accb`; tested SHA `pre-commit source content equals committed ProcNewOrders.tsx`; tests `PARTIAL_PASS — 21/21 Phase 1E Procurement tests, typecheck, static AST 6/6; keyboard/browser NOT_RUN`; review `PENDING`; approval ref `GO-02`.


A06 evidence: A4-F03 source-confirmed at baseline `ProcNewOrders.tsx` line 193; R3-F05 is a separate responsive-table concern and is not closed by this change. Replaced the order-row clickable div with a native `type="button"` that exposes localized order-specific naming and `aria-expanded`; kept expansion and edit reset callbacks, and kept the approval button as a sibling. Approval authority and mutation code remain unchanged. `TZ=UTC node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap artifacts/mockup-sandbox/src/components/mockups/asab/phase1eProcurement.test.ts` exit 0 (21/21). `pnpm --filter @workspace/mockup-sandbox run typecheck` exit 0. Static TypeScript-AST assertions PASS 6/6 for button semantics, expanded state, localized name, preserved callback, no wrapper mutation, and existing PUR-01 gate. Actual keyboard activation, click-equivalence, and narrow viewport tests NOT_RUN because browser runtime is unavailable; A06-04 remains unchecked.
### A07 — AdminUsers — contextual icon button names
**Phase:** P4 · **Finding links:** `A4-F04` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** unlink/add/clear icons in distribution.
- [ ] `A07-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `A07-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `A07-03` Minimal action/disposition: Give admin unlink/add/clear icon controls localized contextual accessible names including target identity.
- [ ] `A07-04` Targeted acceptance evidence: Accessibility tree/role/button/name for each control; screen-reader tool only if actually run; no permission regression.
- [ ] `A07-05` Gate and limits: Dashboard AdminUsers
- [ ] `A07-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `A07-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `A07-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `9db95d7445586b0adf8c2da4620a5a415107accb`; postSHA `BLOCKED`; commitSHA `ZERO_COMMIT`; tested SHA `NOT_RUN`; review `PENDING`; approval ref `GO-02`.

A07 dependency note: This finding touches the same AdminUsers distribution controls restructured in A05. Per §1, defer this dependent file-level follow-up until A05 has independent acceptance; no code change made in this checkpoint. Continue with independent Accountant-page batch A08.

### A08 — AccAssets import selection — labelled checkboxes
**Phase:** P4 · **Finding links:** `A4-F05` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** Excel asset import table.
- [x] `A08-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [x] `A08-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [x] `A08-03` Minimal action/disposition: Add stable asset-specific label or aria-labelledby to each import-row checkbox; no selection/import logic changes.
- [ ] `A08-04` Targeted acceptance evidence: Multiple rows with distinct names; select all; AR+EN labels; keyboard; asset import mapping unchanged.
- [x] `A08-05` Gate and limits: Dashboard Accountant
- [x] `A08-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [x] `A08-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [x] `A08-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `9db95d7445586b0adf8c2da4620a5a415107accb`; postSHA `4c0ff2e106d94cf81485a950aa34370c15ca1cfb`; commitSHA `4c0ff2e106d94cf81485a950aa34370c15ca1cfb`; tested SHA `pre-commit source content equals committed AccAssets.tsx`; tests `PARTIAL_PASS — 11/11 Accountant regressions, typecheck, static AST 4/4; screen-reader and browser checks NOT_RUN`; review `PENDING`; approval ref `GO-02`.


A08 evidence: A4-F05 source-confirmed at pinned `AccAssets.tsx` lines 451/476; `R3-F15` concerns dialog context and is distinct. Added a localized row-specific `aria-label` using the asset name and row ID on the mapped import checkbox; checked state, rowId-only update logic and the select-all label remain unchanged. `TZ=UTC node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap artifacts/mockup-sandbox/src/components/mockups/asab/phase1cAccountant.test.ts` exit 0 (11/11). `pnpm --filter @workspace/mockup-sandbox run typecheck` exit 0. Static TypeScript-AST checks PASS 4/4 for localized unique label inputs, selected binding, rowId update and select-all label. Multiple-row AR/EN accessibility tree, keyboard and screen-reader/browser verification remain NOT_RUN; A08-04 stays unchecked. No import or financial behavior changed.
### A09 — AdminUsers distribution mode — state semantics
**Phase:** P4 · **Finding links:** `A4-F08` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** restaurant/module/heads mode buttons.
- [x] `A09-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [x] `A09-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [x] `A09-03` Minimal action/disposition: Expose active AdminUsers mode selection with aria-pressed on existing buttons (or audited tab pattern if necessary); avoid full UI rewrite.
- [ ] `A09-04` Targeted acceptance evidence: Switch restaurant/module/heads: name, state, arrow/tab behavior appropriate to chosen pattern, AR+EN.
- [x] `A09-05` Gate and limits: Dashboard AdminUsers
- [x] `A09-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `A09-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `A09-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `4c0ff2e106d94cf81485a950aa34370c15ca1cfb`; postSHA `PENDING`; commitSHA `PENDING / ZERO_COMMIT`; tested SHA `pending`; tests `PARTIAL_PASS — 25/25 Platform Admin regression; typecheck; static AST 3/3; browser AR/EN NOT_RUN`; review `PENDING`; approval ref `GO-02`.


A09 evidence: A4-F08 source-confirmed at pinned AdminUsers.tsx mode buttons refs 326/330/334; HA-F34 is analogous but not the same admin-mode state finding. Added `aria-pressed` derived from the existing `distModeType` state to the three existing native mode buttons; labels, callbacks, and conditional rendering are unchanged. `TZ=UTC node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap artifacts/mockup-sandbox/src/components/mockups/asab/phase1fPlatformAdmin.test.ts` exit 0 (25/25). `pnpm --filter @workspace/mockup-sandbox run typecheck` exit 0. Static TypeScript-AST assertions PASS 3/3 for pressed-state bindings, original setters and labels. Browser/keyboard AR+EN state announcements remain NOT_RUN due browser runtime block; A09-04 stays unchecked. No permission/API changes.
### A10 — Head/Proc/Company filters — accessible labels
**Phase:** P4 · **Finding links:** `A4-F01` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** HeadPending; procurement filters; Company admin searches.
- [ ] `A10-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `A10-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `A10-03` Minimal action/disposition: Apply A4-F01 to HeadPending, ProcNewOrders and CompanyDashboard filters/searches with real labels or accessible names; no API filter semantics change.
- [ ] `A10-04` Targeted acceptance evidence: Each filter announced by accessible name; keyboard; search/filter/query contract unaffected; AR+EN.
- [ ] `A10-05` Gate and limits: Dashboard multiple surfaces
- [ ] `A10-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `A10-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `A10-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

### A11 — Role-local RTL/LTR exceptions only
**Phase:** P4 · **Finding links:** `A4-F07; HA-F36; S1H-F12; R3-F07` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** ProcNewOrders; AccAssets import and direct role-specific overlays.
- [ ] `A11-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `A11-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `A11-03` Minimal action/disposition: Replace incorrect literal dir=rtl only on active role-local English-affected containers, derive dir from existing locale; keep localized numbers/text safe.
- [ ] `A11-04` Targeted acceptance evidence: AR/EN tables, filters, dialog, focus order, logical icon positioning; verify without assuming 3.1.2 is proof of dir fault.
- [ ] `A11-05` Gate and limits: Dashboard role-local; DO NOT reopen shared bidi already fixed R3-F07
- [ ] `A11-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `A11-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `A11-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

### B01 — BranchOverview & affected shared summary grids — responsive layout
**Phase:** P3 · **Finding links:** `R3-F03; HA-F30; 1D-COM-016` · **Mode:** `VERIFY_CONDITIONAL` · **Initial:** `VERIFY_FIRST` · **Repository:** Dashboard
**Scope:** BranchOverview and exact fixed grids from Phase 3 finding.
- [ ] `B01-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `B01-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `B01-03` Minimal action/disposition: Reflow BranchOverview source-confirmed fixed 4/3-column layouts with minimal responsive utility classes only if clipping is demonstrated or source clearly guarantees failure.
- [ ] `B01-04` Targeted acceptance evidence: 320/360/375/390/430/768 AR+EN, KPI label/money wrap, no horizontal page overflow.
- [ ] `B01-05` Gate and limits: Dashboard role layouts; VERIFY_FIRST
- [ ] `B01-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `B01-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B01-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

### B02 — HeadPending / AccSales KPI and filters — reflow
**Phase:** P3 · **Finding links:** `R3-F04; HA-F30; S1H-F18` · **Mode:** `VERIFY_CONDITIONAL` · **Initial:** `VERIFY_FIRST` · **Repository:** Dashboard
**Scope:** HeadPending; AccSalesPage.
- [ ] `B02-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `B02-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `B02-03` Minimal action/disposition: Address HeadPending/Accountant KPI + filter 3/4-column grid breakpoints after viewport proof; keep exact financial totals.
- [ ] `B02-04` Targeted acceptance evidence: 320→768 AR+EN, filter keyboard, money visibility, no changes to approvals/data math.
- [ ] `B02-05` Gate and limits: Dashboard finance display; VERIFY_FIRST
- [ ] `B02-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `B02-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B02-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

### B03 — Procurement tables — horizontal scroll contract
**Phase:** P3 · **Finding links:** `R3-F05` · **Mode:** `VERIFY_CONDITIONAL` · **Initial:** `VERIFY_FIRST` · **Repository:** Dashboard
**Scope:** ProcGrouped 6-column and ProcNewOrders detail tables (supplier already fixed).
- [ ] `B03-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `B03-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `B03-03` Minimal action/disposition: Verify supplier table already-scrollable; amend only unprotected procurement wide order/detail tables with minimal scroll wrapper/overflow.
- [ ] `B03-04` Targeted acceptance evidence: 320/390/768, sticky label/header readability, scroll by touch/keyboard, no hidden actions, totals visible.
- [ ] `B03-05` Gate and limits: Dashboard procurement; Supplier already resolved in source
- [ ] `B03-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `B03-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B03-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

### B04 — Prototype header — mobile priority and wrap
**Phase:** P3 · **Finding links:** `R3-F02; S1H-F14; S1H-F18` · **Mode:** `VERIFY_CONDITIONAL` · **Initial:** `VERIFY_FIRST` · **Repository:** Dashboard
**Scope:** ASABPrototype mobile topbar and role controls.
- [ ] `B04-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `B04-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `B04-03` Minimal action/disposition: Verify Prototype mobile header after flex-wrap and Sheet fixes; adjust only proven topbar collision or inaccessible controls.
- [ ] `B04-04` Targeted acceptance evidence: 320/360/430, open/close Sheet, focus return, search/notifications, role selector, AR+EN.
- [ ] `B04-05` Gate and limits: Dashboard responsive shell; VERIFY_FIRST
- [ ] `B04-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `B04-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B04-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

### B05 — CompanyDashboard header — small viewports
**Phase:** P3 · **Finding links:** `R3-F11; CA-F05; S1H-F18` · **Mode:** `VERIFY_CONDITIONAL` · **Initial:** `VERIFY_FIRST` · **Repository:** Dashboard
**Scope:** CompanyDashboard GlobalSearch and notification toolbar.
- [ ] `B05-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `B05-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `B05-03` Minimal action/disposition: Inspect CompanyDashboard toolbar/search/notification anchoring at narrow viewports; adjust only reproducible crowding.
- [ ] `B05-04` Targeted acceptance evidence: 320/375/430, keyboard and notification popover in AR+EN, no lost search.
- [ ] `B05-05` Gate and limits: Dashboard CompanyDashboard; VERIFY_FIRST
- [ ] `B05-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `B05-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B05-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

### B06 — EntryFlow role chooser — mobile width
**Phase:** P3 · **Finding links:** `R3-F10` · **Mode:** `VERIFY_CONDITIONAL` · **Initial:** `VERIFY_FIRST` · **Repository:** Dashboard
**Scope:** pre-login two-column chooser (if active).
- [ ] `B06-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `B06-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `B06-03` Minimal action/disposition: Verify reachability of EntryFlow and compact two-column chooser at 320px; add breakpoint only if text/tap issue proven.
- [ ] `B06-04` Targeted acceptance evidence: 320px, 200% zoom, tap and focus; no change to actual employee auth/roles.
- [ ] `B06-05` Gate and limits: Dashboard entry/preview if active; VERIFY_FIRST
- [ ] `B06-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `B06-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B06-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

### B07 — Company custom dialogs — focus and short-height safety
**Phase:** P3+P4 · **Finding links:** `R3-F15; CA-F15; HA-F31; S1H-F13` · **Mode:** `VERIFY_CONDITIONAL` · **Initial:** `VERIFY_FIRST` · **Repository:** Dashboard
**Scope:** CompanyDashboard custom modal(s) only; supplier Radix dialogs already fixed.
- [ ] `B07-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `B07-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `B07-03` Minimal action/disposition: Inventory only active Company custom modals and verify dialog semantics/scroll at short height; fix proven defects without touching supplier Radix dialogs.
- [ ] `B07-04` Targeted acceptance evidence: Keyboard Escape / focus trap / return; 320px short viewport; soft keyboard; AR+EN.
- [ ] `B07-05` Gate and limits: Dashboard Company dialogs; VERIFY_FIRST
- [ ] `B07-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `B07-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B07-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

### B08 — LiveChat floating overlap — viewport-safe placement
**Phase:** P3 · **Finding links:** `R3-F12; S1H-F05; S1H-F19` · **Mode:** `VERIFY_CONDITIONAL` · **Initial:** `VERIFY_FIRST` · **Repository:** Dashboard
**Scope:** chat widget, sticky bottom actions, soft keyboard.
- [ ] `B08-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `B08-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `B08-03` Minimal action/disposition: Verify LiveChat bottom-fixed placement vs CTA and virtual keyboard; use minimal safe-area/inset adjustment only if overlap reproduced.
- [ ] `B08-04` Targeted acceptance evidence: 320/390, bottom CTA reachability, soft keyboard, AR+EN, focus and z-index.
- [ ] `B08-05` Gate and limits: Dashboard floating UI; VERIFY_FIRST
- [ ] `B08-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `B08-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B08-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

### B09 — Financial total abbreviation — owner decision gate
**Phase:** P3 · **Finding links:** `R3-F14; HA-F11; HA-F36; DIFF-07` · **Mode:** `DECISION` · **Initial:** `BLOCKED_DECISION` · **Repository:** Dashboard
**Scope:** HeadPending rounded K total KPI.
- [ ] `B09-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `B09-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `B09-03` Minimal action/disposition: DO NOT alter rounded-K total presentation until Project Owner approves exact/display approximation policy; compare exact fmtAmt value already shown.
- [ ] `B09-04` Targeted acceptance evidence: Policy approval ID recorded; UI consistency, SAR halala-safe computations, AR+EN; no rounding math change without decision.
- [ ] `B09-05` Gate and limits: Dashboard financial UX, APPROVAL_REQUIRED
- [ ] `B09-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `B09-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B09-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

### B10 — No-code verification of already-resolved Phase3 findings
**Phase:** P3 · **Finding links:** `R3-F01; R3-F06; R3-F07; R3-F09; R3-F13` · **Mode:** `VERIFY_ONLY` · **Initial:** `VERIFY_ONLY` · **Repository:** Dashboard
**Scope:** mobile drawer, supplier Radix dialogs, shared bidi, supplier buttons, breadcrumb.
- [ ] `B10-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [ ] `B10-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [ ] `B10-03` Minimal action/disposition: Verify 5 already-resolved R3-F01/F06/F07/F09/F13 only; do not re-code fixed drawer, Radix dialogs, bidirectional overlays, supplier icon targets, breadcrumb.
- [ ] `B10-04` Targeted acceptance evidence: Browser/keyboard/touch checks for mobile drawer, Escape and focus, AR+EN bidi, 44px supplier action, breadcrumb wrap; log NOT_RUN if no isolated browser.
- [ ] `B10-05` Gate and limits: Dashboard verification only, ZERO implementation commits unless new evidence changes scope
- [ ] `B10-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [ ] `B10-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B10-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `____________`; postSHA `____________`; commitSHA `____________ / ZERO_COMMIT`; tested SHA `____________`; tests `PASS / FAIL / NOT_RUN / BLOCKED`; review `PENDING`; approval ref `____________`.

## 4. Detailed Micro-Batch Checklist — Phase 5 (C01–C20)
**Hard gate:** C tasks are not automatic Dashboard tasks. Work on Flutter or Backend needs distinct, explicit branch/repo write authorization; first prove contract on chosen release SHA. A security decision is not a code-fix ticket. All C batches start pending the selected release baseline and/or requisite approval. Existing Master roots (SUP-F12 etc.) are crosswalk links, never cloned as independent findings.

### C01 — Flutter shift end counted_cash — contract repair
**Contract IDs:** `P5-C01` · **Finding/root IDs:** `P5-F01`
**Audited status:** P5-C01 CONFIRMED_MISMATCH (P1). **Lead:** Flutter. **Candidate repository:** AssabAPP. **Mode:** `FIX_AFTER_GO`.
- [ ] `C01-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C01-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C01-03` Minimal action / policy boundary: On approved Flutter release branch, verify endShiftOnly vs end-with-handover payloads. Carry required counted_cash in SAR decimal (including explicit zero), preserve independent cash count and existing shortage rules; do NOT blindly cherry-pick demo branch.
- [ ] `C01-04` Required tests: RED 422 missing counted_cash; GREEN valid 0.00 and normal count; end vs handover, shortage allocations, duplicate request, exact SHA; synthetic isolated Backend only.
- [ ] `C01-05` Decision and authorization gate: Project Owner explicitly authorizes Flutter repo write; Mahmoud confirms accepted Backend contract and chosen release branch.
- [ ] `C01-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C01-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C01-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C01-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C02 — Supplier creation role discrepancy — PERM-00
**Contract IDs:** `P5-C02` · **Finding/root IDs:** `P5-F02`
**Audited status:** P5-C02 CONFIRMED_MISMATCH (P1). **Lead:** Mahmoud + Backend. **Candidate repository:** Assab. **Mode:** `DECISION_THEN_FIX`.
- [ ] `C02-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C02-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C02-03` Minimal action / policy boundary: Document PUR-04 accountant supplier-create vs G1 route asab.role:procurement,company-admin. Obtain role matrix decision first, then minimal server policy/route and related Dashboard visibility IF approved; never bypass middleware.
- [ ] `C02-04` Required tests: Authorized accountant / denied non-approved roles, cross-tenant company scope, safe 403/422; no other permission widened.
- [ ] `C02-05` Decision and authorization gate: Written Mahmoud PERM-00/PUR-04 approval and separate Backend write GO required.
- [ ] `C02-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C02-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C02-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C02-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C03 — Grouped procurement send → supplier portal visibility bridge
**Contract IDs:** `P5-C03` · **Finding/root IDs:** `SUP-F12`
**Audited status:** P5-C03 IMPLEMENTATION_GAP (P1). **Lead:** Backend. **Candidate repository:** Assab. **Mode:** `PROVE_THEN_FIX`.
- [ ] `C03-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C03-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C03-03` Minimal action / policy boundary: Trace PurchaseOrderGroup grouped-send through persistence to supplier-facing Operation purchases. Existing PurchaseOrderBridgeService covers a distinct mobile flow; do not assume absent. Implement narrow bridge only if proven missing.
- [ ] `C03-04` Required tests: Synthetic grouped-send, supplier exact tenant visibility, idempotency, reject/confirm transitions, unauthorized supplier isolation.
- [ ] `C03-05` Decision and authorization gate: Approved Backend target SHA + source/runtime bridge evidence + Backend GO.
- [ ] `C03-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C03-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C03-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C03-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C04 — Supplier invoice line before-VAT and PUR-05 evidence
**Contract IDs:** `P5-C04` · **Finding/root IDs:** `SUP-F24`
**Audited status:** P5-C04 IMPLEMENTATION_GAP (P2). **Lead:** Backend + Dashboard. **Candidate repository:** Assab + dashboard. **Mode:** `CONTRACT_GATE`.
- [ ] `C04-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C04-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C04-03` Minimal action / policy boundary: Confirm approved line-level invoice pre-tax, VAT and tax-free schema and integer halala boundary; implement only missing DTO/consumer mapping after approval; never add new accounting subsystem.
- [ ] `C04-04` Required tests: Exact halala precision, fraction/rounding, per-line VAT vs totals, AR/EN labels, mismatched receipt invalid.
- [ ] `C04-05` Decision and authorization gate: PUR-05 approved schema, chosen Backend SHA and explicit repo-specific GO.
- [ ] `C04-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C04-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C04-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C04-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C05 — Purchase receipt differences and supplier returns
**Contract IDs:** `P5-C05` · **Finding/root IDs:** `SUP-F19`
**Audited status:** P5-C05 IMPLEMENTATION_GAP (P2). **Lead:** Backend + Dashboard + Flutter. **Candidate repository:** Multi-repo. **Mode:** `CONTRACT_GATE`.
- [ ] `C05-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C05-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C05-03` Minimal action / policy boundary: Trace purchase invoice vs delivered quantities, partial receipts, returns and reviewer; define only missing endpoints/states after approved purchase workflow; do not auto-approve.
- [ ] `C05-04` Required tests: Partial receipt, incorrect quantity, return pending/rejected/approved, tenant/role denial, Flutter backward compatibility.
- [ ] `C05-05` Decision and authorization gate: Mahmoud PUR-01..05 lifecycle approvals + per-repository GO.
- [ ] `C05-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C05-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C05-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C05-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C06 — Tenant-context + admin-scope security — reconcile F2 branches
**Contract IDs:** `P5-C12; P5-C13; P5-C14` · **Finding/root IDs:** `S1H-F10; F2-A-SR-03; F2-ADMIN-SCOPE-BYPASS`
**Audited status:** P5-C12 CONTRACT_UNKNOWN (P1); P5-C13 CONTRACT_UNKNOWN (P1); P5-C14 CONTRACT_UNKNOWN (P1). **Lead:** Mahmoud Security. **Candidate repository:** Assab. **Mode:** `SECURITY_GATE`.
- [ ] `C06-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C06-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C06-03` Minimal action / policy boundary: Choose authoritative Backend candidate after comparing G1/F2-A/F2-B/F3; prove role/company/branch selection server-side. No code port based solely on alternate review branch or Dashboard guards.
- [ ] `C06-04` Required tests: Authenticated negative fixtures: conflicting grants, cross-company/branch, admin bypass, role-less, replay, 403; audit evidence on exact chosen SHA.
- [ ] `C06-05` Decision and authorization gate: Security release candidate selection, isolated test environment, Mahmoud sign-off, Backend write GO if defect proven.
- [ ] `C06-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C06-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C06-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C06-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C07 — S1-05/S1-12 Sanctum refresh/logout compatibility
**Contract IDs:** `P5-C18` · **Finding/root IDs:** `S1H-F08`
**Audited status:** P5-C18 CONTRACT_UNKNOWN (P1). **Lead:** Backend + Dashboard + Flutter. **Candidate repository:** Multi-repo. **Mode:** `VERIFY_GATE`.
- [ ] `C07-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C07-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C07-03` Minimal action / policy boundary: Verify secure access/refresh/logout contract on selected Backend SHA against both clients; do not treat 57bd prior acceptance as G1 runtime proof; no OAuth, Redis or BFF redesign.
- [ ] `C07-04` Required tests: 401 single refresh, rotation/replay denial, logout revoke, parallel requests, expired session, per-employee private phone, role/tenant scope.
- [ ] `C07-05` Decision and authorization gate: Auth security review and isolated test fixture; repo-specific GO only for proven incompatibilities.
- [ ] `C07-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C07-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C07-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C07-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C08 — Supplier support/search contract — PORTAL-01
**Contract IDs:** `P5-C19` · **Finding/root IDs:** `SUP-F13`
**Audited status:** P5-C19 CONTRACT_UNKNOWN (P2). **Lead:** Product Owner + Backend. **Candidate repository:** Assab + dashboard. **Mode:** `DECISION`.
- [ ] `C08-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C08-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C08-03` Minimal action / policy boundary: Determine if supplier-specific support/search is approved in rollout; retain company-only actions hidden and server-owned; do not invent new portal APIs.
- [ ] `C08-04` Required tests: Feature isolation and supported supplier routes only, 403 across tenants, AR+EN empty states.
- [ ] `C08-05` Decision and authorization gate: PORTAL-01 scope approval first; no automatic code commit.
- [ ] `C08-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C08-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C08-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C08-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C09 — Flutter hard-coded API/broadcast origin release configuration
**Contract IDs:** `P5-C20` · **Finding/root IDs:** `P5-F03`
**Audited status:** P5-C20 IMPLEMENTATION_GAP (P2). **Lead:** Flutter. **Candidate repository:** AssabAPP. **Mode:** `FIX_AFTER_GO`.
- [ ] `C09-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C09-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C09-03` Minimal action / policy boundary: Map current main host origins and approved environment configuration; compare demo safely without merging 23 unrelated files; minimal release-safe selection, no plaintext secrets.
- [ ] `C09-04` Required tests: Local/dev/synthetic staging config selection, API and broadcast base URLs, fail-closed production release, no real credentials.
- [ ] `C09-05` Decision and authorization gate: Release endpoint mapping approval + Flutter branch/write GO.
- [ ] `C09-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C09-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C09-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C09-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C10 — Supplier activation flags and deployment unknowns
**Contract IDs:** `P5-C22` · **Finding/root IDs:** `SUP-F01`
**Audited status:** P5-C22 CONTRACT_UNKNOWN (P2). **Lead:** Backend Release. **Candidate repository:** Assab + dashboard. **Mode:** `VERIFY_GATE`.
- [ ] `C10-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C10-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C10-03` Minimal action / policy boundary: Compare frontend build flag with server env/route cache on documented target, note deployed SHA unknown. NO toggling staging/prod flags or deployment from this work.
- [ ] `C10-04` Required tests: Synthetic enabled/disabled paths, route availability and denied unauthorized suppliers, no live toggle.
- [ ] `C10-05` Decision and authorization gate: Mahmoud release approval and isolated environment; config deployment separately authorized.
- [ ] `C10-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C10-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C10-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C10-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C11 — PUR-01 purchase financial approval role matrix
**Contract IDs:** `P5-C23` · **Finding/root IDs:** `P5-D01`
**Audited status:** P5-C23 DECISION_REQUIRED (P1). **Lead:** Mahmoud. **Candidate repository:** Assab. **Mode:** `DECISION`.
- [ ] `C11-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C11-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C11-03` Minimal action / policy boundary: Approve who can change price/partial quantities/final financial approval; preserve fail-closed existing guard until approved; avoid frontend as security boundary.
- [ ] `C11-04` Required tests: Negative role/state matrix, replay and unexpected transition 403/409, amounts immutable except approved transitions.
- [ ] `C11-05` Decision and authorization gate: Written PUR-01/PERM-00 authority matrix, separate Backend GO for any change.
- [ ] `C11-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C11-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C11-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C11-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C12 — Inventory monthly weighted average and transfer cost — INV-02
**Contract IDs:** `P5-C24` · **Finding/root IDs:** `P5-D02`
**Audited status:** P5-C24 CONTRACT_UNKNOWN (P2). **Lead:** Backend + Product Owner. **Candidate repository:** Multi-repo. **Mode:** `VERIFY_GATE`.
- [ ] `C12-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C12-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C12-03` Minimal action / policy boundary: Reconcile monthly WAC and source-branch cost cross-repo; evidence mismatch before any math change; do not infer implementation failure from lack of tests.
- [ ] `C12-04` Required tests: Synthetic monthly transactions, negative/zero stock handling as approved, transfers, rounding, Dashboard/Flutter parity.
- [ ] `C12-05` Decision and authorization gate: INV-02 business acceptance and isolated cost dataset.
- [ ] `C12-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C12-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C12-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C12-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C13 — Per-module reports — REP-00 acceptance
**Contract IDs:** `P5-C25` · **Finding/root IDs:** `P5-D03`
**Audited status:** P5-C25 DECISION_REQUIRED (P2). **Lead:** Product Owner. **Candidate repository:** dashboard + Assab. **Mode:** `DECISION`.
- [ ] `C13-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C13-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C13-03` Minimal action / policy boundary: Identify approved vs unapproved reports; keep unapproved features gated, not auto-populated or silently enabled.
- [ ] `C13-04` Required tests: Catalog listed vs allowed visibility, exports, role/tenant denial, empty/loading states.
- [ ] `C13-05` Decision and authorization gate: Signed REP-00 report-by-report acceptance; no new report building without approval.
- [ ] `C13-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C13-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C13-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C13-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C14 — Subscriptions SUB-01 without new billing
**Contract IDs:** `P5-C26` · **Finding/root IDs:** `CA-F04`
**Audited status:** P5-C26 DECISION_REQUIRED (P2). **Lead:** Product Owner + Backend. **Candidate repository:** dashboard + Assab. **Mode:** `DECISION`.
- [ ] `C14-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C14-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C14-03` Minimal action / policy boundary: Allow approved Admin add/edit subscription only; investigate unused bill/pay endpoints but DO NOT activate or build invoicing/payment.
- [ ] `C14-04` Required tests: Admin scope, non-admin denial, approved fields, billing remains disabled.
- [ ] `C14-05` Decision and authorization gate: SUB-01 scope reaffirmed; any billing change requires separate mandate.
- [ ] `C14-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C14-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C14-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C14-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C15 — Mobile SAR vs Dashboard halalas contract precision
**Contract IDs:** `P5-C27` · **Finding/root IDs:** `P5-D04`
**Audited status:** P5-C27 CONTRACT_UNKNOWN (P2). **Lead:** Backend + Flutter. **Candidate repository:** Multi-repo. **Mode:** `CONTRACT_GATE`.
- [ ] `C15-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C15-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C15-03` Minimal action / policy boundary: Document endpoint-specific money units: mobile shift SAR strings, dashboard Admin integers in halalas; map precision at boundary only; do not rewrite all money models.
- [ ] `C15-04` Required tests: 0.00, 0.01, 999999.99, half-cent invalid, DTO precision, locale separators, transaction equality.
- [ ] `C15-05` Decision and authorization gate: Exact API contracts for selected target SHA, money policy sign-off, repo-specific GO.
- [ ] `C15-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C15-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C15-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C15-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C16 — Supplier accept idempotency/replay
**Contract IDs:** `P5-C28` · **Finding/root IDs:** `SUP-F06`
**Audited status:** P5-C28 CONTRACT_UNKNOWN (P2). **Lead:** Backend. **Candidate repository:** Assab + dashboard. **Mode:** `VERIFY_GATE`.
- [ ] `C16-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C16-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C16-03` Minimal action / policy boundary: Verify concurrent submit guard and persisted idempotency on supplier acceptance, not just button lock; implement minimal key/state guard if proven missing.
- [ ] `C16-04` Required tests: Same idempotency key replay, parallel requests, double accepting, network retry, final state once.
- [ ] `C16-05` Decision and authorization gate: Synthetic concurrency environment; financial mutation endpoints only with explicit Backend GO.
- [ ] `C16-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C16-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C16-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C16-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C17 — Expense approval ownership — EXP-06
**Contract IDs:** `P5-C29` · **Finding/root IDs:** `P5-D05`
**Audited status:** P5-C29 DECISION_REQUIRED (P2). **Lead:** Mahmoud. **Candidate repository:** Assab. **Mode:** `DECISION`.
- [ ] `C17-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C17-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C17-03` Minimal action / policy boundary: Clarify reviewing accountant vs actual financial approver; generic approve operation is insufficient proof; no permissions changed until approved.
- [ ] `C17-04` Required tests: Permission negative tests, rejection/correction/approval status transitions, tenant isolation.
- [ ] `C17-05` Decision and authorization gate: Signed EXP-06/PERM-00 authority; Backend GO.
- [ ] `C17-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C17-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C17-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C17-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C18 — Shift report expected_revision concurrency
**Contract IDs:** `P5-C30` · **Finding/root IDs:** `none — contract only`
**Audited status:** P5-C30 CONTRACT_UNKNOWN (P2). **Lead:** Backend + Dashboard + Flutter. **Candidate repository:** Multi-repo. **Mode:** `CONTRACT_GATE`.
- [ ] `C18-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C18-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C18-03` Minimal action / policy boundary: Trace actual expected_revision / membership id at exact SHAs (older matrix may be stale), avoid correcting hypothetical discrepancy; adjust smallest consumer/server boundary if confirmed.
- [ ] `C18-04` Required tests: Valid revision; stale 409; double-submit; shifted reviewer and cashier; mobile compatibility.
- [ ] `C18-05` Decision and authorization gate: Complete current-path source evidence, isolated 409 test, exact branch approvals.
- [ ] `C18-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C18-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C18-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C18-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C19 — Returns and invoice review accounting
**Contract IDs:** `P5-C31` · **Finding/root IDs:** `P5-D06`
**Audited status:** P5-C31 CONTRACT_UNKNOWN (P2). **Lead:** Backend + Dashboard + Flutter. **Candidate repository:** Multi-repo. **Mode:** `CONTRACT_GATE`.
- [ ] `C19-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C19-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C19-03` Minimal action / policy boundary: Verify return value review by accountant/head vs approved policy; bridge only truly missing transitions, no new AP ledger.
- [ ] `C19-04` Required tests: Supplier return, financial status provenance, head final approval, tenant scope, negative transition.
- [ ] `C19-05` Decision and authorization gate: Mahmoud approved flow, tenant tests, repo-specific GO.
- [ ] `C19-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C19-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C19-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C19-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### C20 — 10 statically compatible contracts — regression only
**Contract IDs:** `P5-C06; P5-C07; P5-C08; P5-C09; P5-C10; P5-C11; P5-C15; P5-C16; P5-C17; P5-C21` · **Finding/root IDs:** `1D-BRM-003; SUP-F20; SUP-F04; SUP-F07; S1H-F03; S1H-F11; SUP-F11`
**Audited status:** P5-C06 COMPATIBLE_STATICALLY (P3); P5-C07 COMPATIBLE_STATICALLY (P3); P5-C08 COMPATIBLE_STATICALLY (P3); P5-C09 COMPATIBLE_STATICALLY (P3); P5-C10 COMPATIBLE_STATICALLY (P3); P5-C11 COMPATIBLE_STATICALLY (P2); P5-C15 COMPATIBLE_STATICALLY (P3); P5-C16 COMPATIBLE_STATICALLY (P3); P5-C17 COMPATIBLE_STATICALLY (P3); P5-C21 COMPATIBLE_STATICALLY (P3). **Lead:** Dashboard + Backend + Flutter. **Candidate repository:** Multi-repo. **Mode:** `VERIFY_ONLY`.
- [ ] `C20-01` Reopen §§0–1; inspect exact contract rows, evidence URLs and immutable audit SHAs; re-pin chosen current branch/target and comparison deltas.
- [ ] `C20-02` Prove status at TARGET SHA with source/fixture before proposing modifications; report STALE/UNKNOWN/BLOCKED without inventing a fix.
- [ ] `C20-03` Minimal action / policy boundary: Retest static matches on chosen SHAs (procurement requests, supplier catalog paging/delivery, operations, shared search, errors, Excel, legacy paths). No new code by default.
- [ ] `C20-04` Required tests: Response fixtures, pagination, search/filter, export, permission denial, 403/409 status and date handling; record NOT_RUN if isolation unavailable.
- [ ] `C20-05` Decision and authorization gate: Readonly source possible; live API execution only isolated and approved; no commit for PASS/NOT_RUN alone.
- [ ] `C20-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [ ] `C20-07` Record commands/exit/status and evidence at exact SHA; if runtime unavailable do not claim COMPATIBLE_RUNTIME/SECURITY_PASS.
- [ ] `C20-08` Update checked steps & tracker prior to authorized per-repo atomic commit; otherwise zero code commit; independent reviewer after each repo.
- [ ] `C20-09` Capture commit SHA(s) in delivery and later documentation checkpoint; reconcile dependencies and reopen §1 before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

## 5. D — Unified test & release-readiness, not automatic deployment
### D01 — Regression tests & source checks
- [ ] `D01-01` Re-run actual Dashboard typecheck, build, targeted/full unit tests; record exact commands, exit codes and run SHA, not historical 329/329 as fresh evidence.
- [ ] `D01-02` For P3 verify responsive AR/EN at 320/360/375/390/430/768/1024/1440 (sampled prioritized matrix); prior 176 NOT_RUN stay until ACTUALLY run.
- [ ] `D01-03` For P4 run focus/tab/dialog/reflow 320 CSS px, zoom 200/400%, axe, TalkBack/VoiceOver or other screen reader only where installed & actually executed; prior 704 NOT_RUN + 8 BLOCKED remain without proof.
- [ ] `D01-04` For P5 enumerate 37 distinct contract test IDs, execute only safe isolated synthetic tests with separate consent; keep 27 BLOCKED and 10 NOT_RUN unless real run evidence changes them.
- [ ] `D01-05` Review 1G/1H 156 prior scenarios as separate historical backlog; dedup test IDs before any unique executed-coverage total.
- [ ] `D01-06` Verify roles, tenant scope, finance transitions, halala/SAR, VAT, date/timezone, idempotency, reports, Flutter backward compatibility only against exact approved source.
- [ ] `D01-07` Compare all changed files with approved batch scopes; scan unintended secrets, permission expansion, Business Rules changes, and third-party dependencies.
- [ ] `D01-08` Produce immutable test index: test ID, phase, source SHA, target branch, device/tool, fixture, outcome, logs or screenshot, reviewer.
### D02 — Independent evidence reconciliation / acceptance gate
- [ ] `D02-01` Every code commit has batch ID, finding/root IDs, repo, branch, SHA, tests and reviewer verdict; no duplicate fixing of already source-resolved Phase3 IDs.
- [ ] `D02-02` Classify code fixed vs test verified vs runtime verified vs not-run/blocked separately; COMMITTED is not acceptance.
- [ ] `D02-03` All P5 decision/approval records including 11 original rows have owner, signed decision and target SHA; preserve APPROVAL_REQUIRED.
- [ ] `D02-04` Inventory/Source/Executed coverage denominators kept distinct per phase and deduplicated only with test-ID proof.
- [ ] `D02-05` Obtain independent acceptance for micro-batches and written Owner confirmation BEFORE final Master edit; stop if GO missing.
- [ ] `D02-06` Never push, open/edit PRs, merge, deploy, modify production/staging, or operate financially without separate explicit permissions.

## 6. M01 — Mandatory final Canonical Master Findings reconciliation (separate documentation commit)
**Path:** `docs/audit/ASSAB_DASHBOARD_MASTER_FINDINGS.md` in `mohameelsherbini/dashboard`. **This is an eventual deliverable, not authorized now.**
- [ ] `M01-01` Require separate owner GO: “Update final Master Findings on repo X / branch Y”; hold until all approved batches and independent reviews are complete.
- [ ] `M01-02` Read current remote Master and count all original 249 unique IDs; handle any new remote additions/other authors before writing.
- [ ] `M01-03` Retain all 249 original IDs, history, evidence, prior commits and 1A–1H chronology; no deletion or status inflation.
- [ ] `M01-04` Link R3 15 and A4 8 to roots/dedup and Phase5 31 contract rows (21 noncompatible, 10 compatible) without arithmetic double counting.
- [ ] `M01-05` Add new unique IDs only for proven independent roots with explicit policy; keep P5-F01/F02/F03 and R3/A4 IDs traceable; no duplicate aliases masquerading as new problems.
- [ ] `M01-06` For each fixed root record exact implementation commit, repo/branch/full SHA, scope, source evidence, tests, reviewer verdict; cross-repo commits listed separately.
- [ ] `M01-07` Label IMPLEMENTED_UNVERIFIED / VERIFIED_SOURCE / RUNTIME_VERIFIED / BLOCKED / DECISION_REQUIRED correctly, with acceptance gates and historic NOT_RUN tests intact.
- [ ] `M01-08` Carry forward 176 P3, 704 P4, 37 P5 and older 1G/1H backlogs with unique IDs/status; no universal PASS or functional 100% claims.
- [ ] `M01-09` Validate original 249 IDs unchanged, new IDs uniqueness, all R3/A4/P5 crosswalks, financial security gates, no unresolved decision silently closed.
- [ ] `M01-10` Produce read-only proposed Master diff + independent reviewer sign-off + explicit separate documentation-commit GO.
- [ ] `M01-11` After approved documentation-only commit, capture full SHA in delivery report; no merge/push/deploy absent separate permission.
- [ ] `M01-12` Publish final evidence handoff: batch ledger, all code and docs SHAs, NOT_RUN/BLOCKED items, Mahmoud decision list, residual risk and recommended final acceptance tests.

## 7. Standard batch handoff template (mandatory after each micro-batch)
```text
ASSAB P3+P4+P5 REMEDIATION — BATCH EVIDENCE REPORT
Batch ID / Mode / Finding IDs / Phase5 Contract IDs:
Authorizing Owner GO reference + scope:
Repository / branch / PRE-SHA / POST-SHA:
Changed paths + reason; no-change reason if any:
Approved policy/decision references + dependency risk:
Checks completed: IDs e.g. C01-01..09; tracker row version:
Commands / device/tools / tested SHA / exit codes:
PASS / FAIL / NOT_RUN / BLOCKED counts and evidence:
Atomic commit SHA PER REPO or ZERO_COMMIT:
Independent reviewer verdict and date:
Unresolved backlogs / pending approvals:
Master status: NOT UPDATED — FINAL M01 ONLY
Next eligible batch and its gate:
```

## 8. STOP / resumption rules
- STOP immediately on missing GO, unknown Branch/HEAD, policy contradiction, live financial/auth secrets, changed scope, failing core test, or risky nested role/tenant impact. Mark blocked and preserve evidence.
- On resume, **always restart at Section 1**, compare Git HEAD to last tracker pre/post SHA, scan `git status`, and never repeat a commit already landed.
- The executor cannot legitimately check a box just for reading this plan: each `- [x]` requires evidence fields in tracker and a committed documentation checkpoint whenever authorized.
- Distinguish `M00 FINAL COMPLETE` from `CODE_COMMITTED`: final closure requires all approved batches reviewed, tests accurately accounted, and authorized Canonical Master reconciliation.
- Explicit exclusion: Flutter UX/UI independent audit/remediation (outside Phase 5 cross-repo contract fixes); do not fold it into Dashboard UX batches without owner-approved expansion.

**END OF PLAN — EXECUTION NOT AUTHORIZED BY FILE CREATION**


## GO-01 Bootstrap Execution Evidence — documentation-only

- Authorization: GO-01 from Project Owner; scope limited to this Dashboard repository, the named local branch/worktree, and these two documentation files. No implementation batch was authorized.
- Repository: `mohameelsherbini/dashboard`; base branch `refactor/asabprototype-modularization-20261022`; verified base commit `30d3d261b83ed4b0d9fa1dc1f875ae8592484261`; base tree `f87babf6de68f483250c52e39a52c5a67a6011ce`.
- New local branch/worktree: `work/dashboard-p345-remediation-v2-20261023` at `/workspace/scratch/a7556329ed86/dashboard-p345-remediation-v2-20261023`. The new worktree started clean at the exact base SHA. The branch/path were absent locally before creation and the branch was absent from the current remote branch listing.
- Preserved prior checkout: `/workspace/scratch/a7556329ed86/dashboard-phase1gh-20261023` remains at `39bf91d90ba26831c649a27a8750989c5d046d04`, clean, with its pre-existing local commit untouched.
- Source package: the approved V2 plan SHA-256 is `6c808617125eae367b1b38a45e2b8af4817db5f4c3f038df414c6dcc4a8b4eec`; its original tracker SHA-256 is `ce917998ebd67e4f78ee747e3d82f1b916e9593c099ac23afd1cfcc89dae5b36`. Internal hashes and ZIP CRC were verified before copying. The checklist below retains the complete V2 plan, with only the checked bootstrap/preflight items above and this evidence appendix added.
- Tracker: all 45 original batch/gate IDs are retained. Only the existing G00 row records GO-01 bootstrap context; G00 remains `NOT_STARTED` for implementation because the full cross-repository implementation gate is incomplete. No A01–A11, B01–B10, or C01–C20 implementation has started.
- Completed checklist evidence: GLOBAL-02 (source/archive hashes and remote baseline), GLOBAL-03 (available local worktree/PR state inspected; no existing work altered), G00-02 (Dashboard/Backend/Flutter reference heads and relevant branch/PR state checked), G00-07 (authorized isolated branch and documentation bootstrap), BOOT-01 (explicit docs-only GO), BOOT-02 (exact V2 plan/tracker copied and included in one documentation-only commit).
- Tests/runtime: `NOT_RUN` — this was documentation/worktree setup only. No code, Backend, Flutter, financial, browser, or staging actions were performed.
- The bootstrap commit SHA is reported in the delivery handoff; it is not self-recorded in the files contained by that same commit.
