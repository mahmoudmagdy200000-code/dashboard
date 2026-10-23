# ASSAB ERP — Unified Dashboard Phase 3 + Phase 4 + Phase 5 Remediation Execution Checklist (V2)
**Prepared:** 2026-10-23 · **Status:** ACTIVE LOCAL EXECUTION UNDER GO-02 · **Scope:** Dashboard-only local worktree; no push/PR/merge/deploy.

> **GO-02 AUTHORIZATION NOTE (2026-10-23):** Project Owner explicitly authorized continuous local implementation and atomic local commits for eligible Dashboard batches A01–A11, B01–B10, C01–C20, D01–D02, plus M01 under its stated final-evidence gate. This supersedes GO-01's stop-after-bootstrap condition. Push, PR, merge, deploy, Backend/Flutter writes and live financial transactions remain prohibited. Follow each batch's approval and dependency gates; unresolved or unverified work stays BLOCKED/NOT_RUN/PENDING_REVIEW.

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

- [x] `GLOBAL-01` Check owner-signed GO scope: GO-02 authorizes eligible Dashboard batches A01–A11, B01–B10, C01–C20, D01–D02 and final M01 in the isolated branch `work/dashboard-p345-remediation-v2-20261023`; local commits only; no push/PR/merge/deploy.
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

GO-04 A03 correction checkpoint: preSHA `94d02dd2824cb8faea7fd346bf66160c9acb9189`; scope was limited to `KpiCard.tsx`, its focused semantic test, and checklist/tracker evidence. RED reproduced invalid flow descendants; the component correction is already committed in `fc20ec75af1ab2fe370c695a7b17dfe4e301e7ad`.
GO-06 A03 follow-up is test-helper-only: `jsxTag` now handles paired and self-closing JSX nodes; its regression covers both. GREEN is included in the 60/60 targeted GO-06 P4 suite. Keyboard activation, 320px reflow, AR/EN visual behavior, and browser checks remain NOT_RUN.

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

GO-04 A05 result: RED exposed invalid `div`/`p` descendants in the accountant radio label (focused TAP exit 1); after replacing those descendants with phrasing spans, the focused AST regression passes 1/1, Admin/platform/shared regressions pass 43/43, Auth/session regressions pass 66/66, typecheck passes, and `git diff --check` passes. Radio `checked` and `onChange`, separate unlink button, and assignment callback remain covered by static assertions. Real keyboard, role-gate, AR/EN and no-mutation browser checks remain NOT_RUN. GO-04 A05 correction commit: `97e0c6b800b7b560f11ca601e502c19d67c616a6`; independent review remains PENDING.

GO-04 A05 correction checkpoint: reopened Section 1 and A05 on clean preSHA `fc20ec75af1ab2fe370c695a7b17dfe4e301e7ad`. Only the AdminUsers label markup and its existing Platform Admin regression file are in scope. Radio `checked`/`onChange` selection, assignment callback, and separate unlink button must remain unchanged.
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
- [x] `A07-01` Reload §§0–1, inspect the A4 source evidence and current AdminUsers controls; verify GO-06 scope. PreSHA `77cb19291f0f2a6543f184f1eca5c143016138f4`.
- [x] `A07-02` Recorded preSHA, branch, files, role/tenant risk and browser availability in the tracker before implementation.
- [x] `A07-03` Added localized contextual accessible names to distribution add/remove/clear/module/unassign icon controls; existing callbacks and role gates are unchanged.
- [ ] `A07-04` Targeted acceptance evidence: Accessibility tree/role/button/name for each control; screen-reader tool only if actually run; no permission regression.
- [x] `A07-05` Gate and limits: Dashboard AdminUsers only; no roles, permissions, API or assignment behavior changed.
- [x] `A07-06` Targeted source/unit regressions PASS 60/60 and TypeScript typecheck PASS. Accessibility-tree, keyboard and AR/EN runtime checks remain NOT_RUN.
- [x] `A07-07` Staged only the approved AdminUsers/test/checklist/tracker/evidence scope and included it in the single P4 atomic commit.
- [x] `A07-08` Captured P4 commit `e4e921309ff28abc8ca5fd2d5b5c4d58c34541c3`; accessibility-tree and keyboard runtime checks remain NOT_RUN; independent review PENDING.
**Implementation fields:** preSHA `77cb19291f0f2a6543f184f1eca5c143016138f4`; postSHA/commitSHA `e4e921309ff28abc8ca5fd2d5b5c4d58c34541c3`; focused P4 tests 60/60 and typecheck pass; runtime accessibility checks `NOT_RUN`; independent review `PENDING`; approval reference `GO-06`.

A07 dependency note: A07 contextual names are distinct from A09 mode-selection state (`aria-pressed`); A09 does not resolve A07. GO-06 explicitly authorized A07 despite A05's pending independent review. Source and AST regression are implemented; accessibility-tree, keyboard, AR/EN and role-gate runtime checks remain NOT_RUN, with independent review PENDING.

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
- [x] `A09-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [x] `A09-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `4c0ff2e106d94cf81485a950aa34370c15ca1cfb`; postSHA `dd084c12dc380ae737039e4565b118731c83cb0e`; commitSHA `dd084c12dc380ae737039e4565b118731c83cb0e`; tested SHA `pre-commit source content equals committed AdminUsers.tsx`; tests `PARTIAL_PASS — 25/25 Platform Admin regression; typecheck; static AST 3/3; browser AR/EN NOT_RUN`; review `PENDING`; approval ref `GO-02`.


A09 evidence: A4-F08 source-confirmed at pinned AdminUsers.tsx mode buttons refs 326/330/334; HA-F34 is analogous but not the same admin-mode state finding. Added `aria-pressed` derived from the existing `distModeType` state to the three existing native mode buttons; labels, callbacks, and conditional rendering are unchanged. `TZ=UTC node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap artifacts/mockup-sandbox/src/components/mockups/asab/phase1fPlatformAdmin.test.ts` exit 0 (25/25). `pnpm --filter @workspace/mockup-sandbox run typecheck` exit 0. Static TypeScript-AST assertions PASS 3/3 for pressed-state bindings, original setters and labels. Browser/keyboard AR+EN state announcements remain NOT_RUN due browser runtime block; A09-04 stays unchecked. No permission/API changes.
### A10 — Head/Proc/Company filters — accessible labels
**Phase:** P4 · **Finding links:** `A4-F01` · **Mode:** `IMPLEMENT` · **Initial:** `NOT_STARTED` · **Repository:** Dashboard
**Scope:** HeadPending; procurement filters; Company admin searches.
- [x] `A10-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [x] `A10-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code.
- [x] `A10-03` Minimal action/disposition: Apply A4-F01 to HeadPending, ProcNewOrders and CompanyDashboard filters/searches with real labels or accessible names; no API filter semantics change.
- [ ] `A10-04` Targeted acceptance evidence: Each filter announced by accessible name; keyboard; search/filter/query contract unaffected; AR+EN.
- [x] `A10-05` Gate and limits: Dashboard multiple surfaces
- [x] `A10-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS.
- [x] `A10-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [x] `A10-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `dd084c12dc380ae737039e4565b118731c83cb0e`; postSHA `67b0c15a34ce17f526ca7e45a7e69db4174e0cdd`; commitSHA `67b0c15a34ce17f526ca7e45a7e69db4174e0cdd`; tested SHA `67b0c15a34ce17f526ca7e45a7e69db4174e0cdd`; tests `51/51 Head/Proc/Company Admin regressions PASS; typecheck PASS; static AST 9/9 PASS; browser NOT_RUN`; review `PENDING`; approval ref `GO-02`.


A10 evidence: A4-F01 source-confirmed; original active pages HeadPending.tsx and ProcNewOrders.tsx plus the Company Admin user search in CompanyDashboard.tsx. Added htmlFor/id pairs to four HeadPending selects and two ProcNewOrders selects; added localized accessible names to the HeadPending operation search and Company Admin user search. Filter/search state setters, query behavior and API contracts are unchanged. `TZ=UTC node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts artifacts/mockup-sandbox/src/components/mockups/asab/phase1eProcurement.test.ts artifacts/mockup-sandbox/src/components/mockups/asab/companyAdminGuards.test.ts` exit 0 (51/51). `pnpm --filter @workspace/mockup-sandbox run typecheck` exit 0. Static TypeScript-AST assertions PASS 9/9 for label associations, local search labels, unique control identity and preserved state setters. Keyboard and AR/EN browser name announcement NOT_RUN; A10-04 remains unchecked.
Post-commit checkpoint: A10 local commit `67b0c15a34ce17f526ca7e45a7e69db4174e0cdd`; current branch was reopened at this SHA before A11.
### A11 — Role-local RTL/LTR exceptions only
**Phase:** P4 · **Finding links:** `A4-F07; HA-F36; S1H-F12; R3-F07` · **Mode:** `IMPLEMENT` · **Current:** `PENDING_REVIEW` · **Repository:** Dashboard
**Scope:** ProcNewOrders; AccAssets import and direct role-specific overlays.
- [x] `A11-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch. Evidence: GO-02; Phase 4 `A4-F07`; Phase 3 `R3-F07` disposition; crosswalk `HA-F36`/`S1H-F12`; GitHub base still `30d3d261b83ed4b0d9fa1dc1f875ae8592484261`; worktree HEAD `67b0c15a34ce17f526ca7e45a7e69db4174e0cdd`, clean.
- [x] `A11-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code. Evidence: tracker A11 IN_PROGRESS, preSHA `67b0c15a34ce17f526ca7e45a7e69db4174e0cdd`; files `ProcNewOrders.tsx`, `AccAssets.tsx`, Checklist, Tracker; no role/tenant/API logic changes; browser unavailable, visual/focus verification NOT_RUN.
- [x] `A11-03` Minimal action/disposition: Replaced hard-coded RTL direction in ProcNewOrders page/filter/group/detail table/approval editors and AccAssets page/table/direct overlays with the existing locale `dir`; retained explicitly LTR number/value fragments and all locale text, API and financial behavior.
- [ ] `A11-04` Targeted acceptance evidence: AR/EN tables, filters, dialog, focus order, logical icon positioning; verify without assuming 3.1.2 is proof of dir fault.
- [x] `A11-05` Gate and limits: Dashboard role-local; DO NOT reopen shared bidi already fixed R3-F07. No API/permission/business logic change; PUR-01 fail-closed code remains unchanged.
- [x] `A11-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS. Focused 1E/1C tests 32/32, exit 0; typecheck exit 0; static source assertions 6/6; browser/viewport/keyboard/screen-reader NOT_RUN.
- [x] `A11-07` Code and checklist/tracker changes were staged and committed atomically as `aeeb06705836f11e7affbb10e1f6fd9ee86b9ded`; browser evidence remains NOT_RUN.
- [x] `A11-08` Captured local commit SHA and test/review state: `aeeb06705836f11e7affbb10e1f6fd9ee86b9ded`. A11-04 remains NOT_RUN and A11 remains PENDING_REVIEW, not accepted; independent B01 may proceed.
**Implementation fields:** preSHA `67b0c15a34ce17f526ca7e45a7e69db4174e0cdd`; postSHA `aeeb06705836f11e7affbb10e1f6fd9ee86b9ded`; commitSHA `aeeb06705836f11e7affbb10e1f6fd9ee86b9ded`; tested SHA `67b0c15a34ce17f526ca7e45a7e69db4174e0cdd`; tests `PARTIAL_PASS — 32/32 focused 1E/1C tests; typecheck PASS; static 6/6; browser NOT_RUN`; review `PENDING`; approval ref `GO-02`.

### B01 — BranchOverview & affected shared summary grids — responsive layout
**Phase:** P3 · **Finding links:** `R3-F03; HA-F30; 1D-COM-016` · **Mode:** `VERIFY_CONDITIONAL` · **Initial:** `VERIFY_FIRST` · **Repository:** Dashboard
**Scope:** BranchOverview and exact fixed grids from Phase 3 finding.
- [x] `B01-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck related Master cross-links and current SHA; owner approves batch. Evidence: GO-02; R3-F03 source row and crosswalk HA-F30/1D-COM-016; current local HEAD `aeeb06705836f11e7affbb10e1f6fd9ee86b9ded`, clean; remote audited base unchanged at `30d3d261b83ed4b0d9fa1dc1f875ae8592484261`.
- [x] `B01-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code. Evidence: BranchOverview only; no financial/auth/tenant logic changes; browser viewport proof unavailable. The fixed four-column grid plus KpiCard 40px icon + 16px gap + padding establishes deterministic content compression at 320px, meeting source-guaranteed trigger for a minimal reflow.
- [x] `B01-03` Minimal action/disposition: Reflowed source-confirmed fixed 4/3-column layouts with minimal responsive utility classes. KPI cards use 1/2/4 columns; content stacks to one column below large breakpoint. Values, calculations, data sources and actions unchanged.
- [ ] `B01-04` Targeted acceptance evidence: 320/360/375/390/430/768 AR+EN, KPI label/money wrap, no horizontal page overflow.
- [x] `B01-05` Gate and limits: Dashboard role layouts; VERIFY_FIRST. No financial calculation, API, permission or tenant change.
- [x] `B01-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS. Phase 1D Branch Manager regression 13/13, exit 0; typecheck exit 0; viewport test NOT_RUN.
- [x] `B01-07` Code and checklist/tracker changes were staged and committed atomically as `0e95364e09a784204df40da5d79d763137d72c5b`; viewport evidence remains NOT_RUN.
- [x] `B01-08` Captured commit SHA `0e95364e09a784204df40da5d79d763137d72c5b`; review remains PENDING and viewport acceptance NOT_RUN.
**Implementation fields:** preSHA `aeeb06705836f11e7affbb10e1f6fd9ee86b9ded`; postSHA `0e95364e09a784204df40da5d79d763137d72c5b`; commitSHA `0e95364e09a784204df40da5d79d763137d72c5b`; tested SHA `aeeb06705836f11e7affbb10e1f6fd9ee86b9ded`; tests `PARTIAL_PASS — 13/13 Phase 1D tests; typecheck PASS; browser viewports NOT_RUN`; review `PENDING`; approval ref `GO-02`.

### B02 — HeadPending / AccSales KPI and filters — reflow
**Phase:** P3 · **Finding links:** `R3-F04; HA-F30; S1H-F18` · **Mode:** `VERIFY_CONDITIONAL` · **Current:** `BLOCKED_EVIDENCE` · **Repository:** Dashboard
**Scope:** HeadPending; AccSalesPage.
- [x] `B02-01` Reload §§0–1, find exact R3 source row and current sources; recheck related cross-links/current SHA; owner approves eligible work. Evidence: GO-02; R3-F04 source row at pinned `30d3d261b83ed4b0d9fa1dc1f875ae8592484261`; branch base unchanged; worktree HEAD `0e95364e09a784204df40da5d79d763137d72c5b`.
- [x] `B02-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker BEFORE any code. Evidence: `B02` tracker records preSHA and both source files; browser unavailable; B02 remains verify-first.
- [ ] `B02-03` Minimal action/disposition: Address HeadPending/Accountant KPI + filter 3/4-column grid breakpoints after viewport proof; keep exact financial totals.
- [ ] `B02-04` Targeted acceptance evidence: 320→768 AR+EN, filter keyboard, money visibility, no changes to approvals/data math.
- [x] `B02-05` Gate and limits: Dashboard finance display; VERIFY_FIRST. No source edits without viewport evidence; no financial value/layout behavior claimed.
- [x] `B02-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS. No test executed; viewport/keyboard browser acceptance BLOCKED because this environment lacks Playwright Chromium.
- [ ] `B02-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B02-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `0e95364e09a784204df40da5d79d763137d72c5b`; postSHA `0e95364e09a784204df40da5d79d763137d72c5b`; commitSHA `ZERO_CODE_COMMIT`; tested SHA `NOT_RUN`; tests `NOT_RUN`; review `PENDING`; approval ref `GO-02`.

### B03 — Procurement tables — horizontal scroll contract
**Phase:** P3 · **Finding links:** `R3-F05` · **Mode:** `VERIFY_CONDITIONAL` · **Current:** `BLOCKED_EVIDENCE` · **Repository:** Dashboard
**Scope:** ProcGrouped 6-column and ProcNewOrders detail tables (supplier already fixed).
- [x] `B03-01` Reload §§0–1, inspect exact R3-F05 source row and source wrappers; recheck related cross-links/current SHA; owner authorized the verification batch. Evidence: remote baseline unchanged; local HEAD `0e95364e09a784204df40da5d79d763137d72c5b`.
- [x] `B03-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker before any code. Evidence: B03 tracker records source files, supplier scope, browser unavailability; no code changes made.
- [ ] `B03-03` Minimal action/disposition: Verify supplier table already-scrollable; amend only unprotected procurement wide order/detail tables with minimal scroll wrapper/overflow.
- [ ] `B03-04` Targeted acceptance evidence: 320/390/768, sticky label/header readability, scroll by touch/keyboard, no hidden actions, totals visible.
- [x] `B03-05` Gate and limits: Dashboard procurement; Supplier already resolved in source. Per R3-F05 only change procurement scroll behavior after narrow-viewport clipping/scroll contract is confirmed; source alone does not satisfy this gate.
- [x] `B03-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS. No tests run; viewport touch/keyboard checks BLOCKED because browser runtime is unavailable.
- [ ] `B03-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B03-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `0e95364e09a784204df40da5d79d763137d72c5b`; postSHA `0e95364e09a784204df40da5d79d763137d72c5b`; commitSHA `ZERO_CODE_COMMIT`; tested SHA `NOT_RUN`; tests `NOT_RUN`; review `PENDING`; approval ref `GO-02`.

### B04 — Prototype header — mobile priority and wrap
**Phase:** P3 · **Finding links:** `R3-F02; S1H-F14; S1H-F18` · **Mode:** `VERIFY_CONDITIONAL` · **Current:** `BLOCKED_EVIDENCE` · **Repository:** Dashboard
**Scope:** ASABPrototype mobile topbar and role controls.
- [x] `B04-01` Reload §§0–1, inspect R3-F02 source row and current topbar/Sheet code; verify current SHA and remote base; owner authorization is GO-02. Evidence: local HEAD `0e95364e09a784204df40da5d79d763137d72c5b`; remote base unchanged.
- [x] `B04-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker. Evidence: B04 tracker; no source changes; Chromium/browser absent.
- [ ] `B04-03` Minimal action/disposition: Verify Prototype mobile header after flex-wrap and Sheet fixes; adjust only proven topbar collision or inaccessible controls.
- [ ] `B04-04` Targeted acceptance evidence: 320/360/430, open/close Sheet, focus return, search/notifications, role selector, AR+EN.
- [x] `B04-05` Gate and limits: Dashboard responsive shell; VERIFY_FIRST. Flex-wrap and responsive Sheet are already in source; no change unless collision or lost controls is reproduced.
- [x] `B04-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS. No tests run; actual 320/360/430 layout, open/close, focus return and AR/EN remain BLOCKED.
- [ ] `B04-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B04-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `0e95364e09a784204df40da5d79d763137d72c5b`; postSHA `0e95364e09a784204df40da5d79d763137d72c5b`; commitSHA `ZERO_CODE_COMMIT`; tested SHA `NOT_RUN`; tests `NOT_RUN`; review `PENDING`; approval ref `GO-02`.

### B05 — CompanyDashboard header — small viewports
**Phase:** P3 · **Finding links:** `R3-F11; CA-F05; S1H-F18` · **Mode:** `VERIFY_CONDITIONAL` · **Current:** `BLOCKED_EVIDENCE` · **Repository:** Dashboard
**Scope:** CompanyDashboard GlobalSearch and notification toolbar.
- [x] `B05-01` Reload §§0–1, inspect R3-F11 source and toolbar components; verify SHA/remote base and cross-links; owner authorized under GO-02. Evidence: local HEAD `0e95364e09a784204df40da5d79d763137d72c5b`, remote base unchanged.
- [x] `B05-02` Record preSHA, branch, expected files, scope, role/tenant risks and screenshots/tools availability in tracker. Evidence: B05 tracker; browser/viewport evidence unavailable; no code change.
- [ ] `B05-03` Minimal action/disposition: Inspect CompanyDashboard toolbar/search/notification anchoring at narrow viewports; adjust only reproducible crowding.
- [ ] `B05-04` Targeted acceptance evidence: 320/375/430, keyboard and notification popover in AR+EN, no lost search.
- [x] `B05-05` Gate and limits: Dashboard CompanyDashboard; VERIFY_FIRST. Existing source already uses flex-wrap and makes search/notifications full width on narrow screens; only reproducible crowding may be changed.
- [x] `B05-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS. No tests run; actual toolbar, notification anchoring, keyboard and AR/EN remain NOT_RUN/BLOCKED.
- [ ] `B05-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B05-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `0e95364e09a784204df40da5d79d763137d72c5b`; postSHA `0e95364e09a784204df40da5d79d763137d72c5b`; commitSHA `ZERO_CODE_COMMIT`; tested SHA `NOT_RUN`; tests `NOT_RUN`; review `PENDING`; approval ref `GO-02`.

### B06 — EntryFlow role chooser — mobile width
**Phase:** P3 · **Finding links:** `R3-F10` · **Mode:** `VERIFY_CONDITIONAL` · **Current:** `BLOCKED_EVIDENCE` · **Repository:** Dashboard
**Scope:** pre-login two-column chooser (if active).
- [x] `B06-01` Reload §§0–1, inspect R3-F10, App route and EntryFlow source; recheck current HEAD and remote base; owner authorization is GO-02. Evidence: `App.tsx` routes unauthenticated users to `EntryFlow`; remote base unchanged; current local HEAD `0e95364e09a784204df40da5d79d763137d72c5b`.
- [x] `B06-02` Record preSHA, branch, scope, auth boundaries and browser availability in tracker before any code. No source changes; chooser is pre-login; credentials/auth flows remain out of scope.
- [ ] `B06-03` Minimal action/disposition: Verify reachability of EntryFlow and compact two-column chooser at 320px; add breakpoint only if text/tap issue proven.
- [ ] `B06-04` Targeted acceptance evidence: 320px, 200% zoom, tap and focus; no change to actual employee auth/roles.
- [x] `B06-05` Gate and limits: Dashboard entry/preview if active; VERIFY_FIRST. This route is active, but breakpoint changes require proven text/tap/zoom defect.
- [x] `B06-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS. No tests run; 320px/200% zoom and touch/focus remain BLOCKED.
- [ ] `B06-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B06-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `0e95364e09a784204df40da5d79d763137d72c5b`; postSHA `0e95364e09a784204df40da5d79d763137d72c5b`; commitSHA `ZERO_CODE_COMMIT`; tested SHA `NOT_RUN`; tests `NOT_RUN`; review `PENDING`; approval ref `GO-02`.

### B07 — Company custom dialogs — focus and short-height safety
**Phase:** P3+P4 · **Finding links:** `R3-F15; CA-F15; HA-F31; S1H-F13` · **Mode:** `VERIFY_CONDITIONAL` · **Current:** `IN_PROGRESS` · **Repository:** Dashboard
**Scope:** CompanyDashboard custom modal(s) only; supplier Radix dialogs already fixed.
- [x] `B07-01` Reload §§0–1, inspect R3-F15 source and active CompanyDashboard modal code; verify current/remote SHA and related Master links; owner authorization is GO-02. Evidence: current HEAD `0e95364e09a784204df40da5d79d763137d72c5b`, remote baseline unchanged.
- [x] `B07-02` Record preSHA, branch, scoped modal/test files and browser availability in tracker before code. No API/tenant/financial logic changes; only the identified asset-edit modal and its source regression test are in scope.
- [x] `B07-03` Minimal action/disposition: Inventory confirmed `editAsset` is a tall CompanyDashboard custom form with no viewport cap/scroll, while adjacent `showAdd` already has one; added only `max-h-[90dvh] overflow-y-auto` to the edit form container. No modal API/state/financial behavior change.
- [ ] `B07-04` Targeted acceptance evidence: Keyboard Escape / focus trap / return; 320px short viewport; soft keyboard; AR+EN.
- [x] `B07-05` Gate and limits: Dashboard Company dialogs; VERIFY_FIRST. Add only a dynamic viewport height cap and internal vertical scrolling to the confirmed long edit form; supplier Radix dialogs untouched.
- [x] `B07-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS. Phase 1D tests 13/13 exit 0; mockup typecheck exit 0; diff check exit 0. Browser short-height, Escape, focus trap/return, soft keyboard and AR/EN NOT_RUN.
- [x] `B07-07` Scroll-cap code and checklist/tracker changes were staged and committed atomically as `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`; dialog accessibility gaps remain open.
- [x] `B07-08` Captured commit SHA `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`; R3-F15/CA-F15 remain partial and runtime NOT_RUN.
**Implementation fields:** Original scroll-cap commit `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`. GO-06 source commit `e4e921309ff28abc8ca5fd2d5b5c4d58c34541c3` (parent `77cb19291f0f2a6543f184f1eca5c143016138f4`, tree `702be589b72a22032e8fb3359d088f976c1e7b93`); dialog semantics/title/close name/focus return and short-viewport source constraints are implemented, with a static source test. Focused suite 60/60, typecheck/build pass; browser behavior `NOT_RUN`; independent review `PENDING`; approval ref `GO-06`.

GO-04 identified that `editAsset` lacked dialog semantics/title, Escape handling, focus containment and focus return; the prior height cap/scroll fix remains. GO-06 P4 replaces only this overlay with the installed Radix Dialog primitive, adds a localized title and close name, retains the viewport cap/internal scrolling, and explicitly restores focus to the opener on close. Save/cancel state and API callbacks are unchanged. The static source regression passes in the 60/60 targeted suite. Escape, focus entry/containment/return, short-height and AR/EN behavior remain NOT_RUN in a real browser; R3-F15/CA-F15 stay open pending runtime and independent review.

### B08 — LiveChat floating overlap — viewport-safe placement
**Phase:** P3 · **Finding links:** `R3-F12; S1H-F05; S1H-F19` · **Mode:** `VERIFY_CONDITIONAL` · **Current:** `BLOCKED_EVIDENCE` · **Repository:** Dashboard
**Scope:** chat widget, sticky bottom actions, soft keyboard.
- [x] `B08-01` Reload §§0–1, inspect R3-F12 and LiveChatWidget source; verify current/remote base and cross-links; owner authorized under GO-02. Evidence: local HEAD `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`, remote base unchanged.
- [x] `B08-02` Record preSHA, branch, scope, risks and browser/tool availability in tracker before any code. No live chat calls or Backend interactions were run.
- [ ] `B08-03` Minimal action/disposition: Verify LiveChat bottom-fixed placement vs CTA and virtual keyboard; use minimal safe-area/inset adjustment only if overlap reproduced.
- [ ] `B08-04` Targeted acceptance evidence: 320/390, bottom CTA reachability, soft keyboard, AR+EN, focus and z-index.
- [x] `B08-05` Gate and limits: Dashboard floating UI; VERIFY_FIRST. Source has fixed bottom 24px and maxHeight 100vh; only reproduced overlap may be changed.
- [x] `B08-06` Record actual test commands, exit codes, evidence URLs, NOT_RUN/BLOCKED and rerun after change; no unearned PASS. No tests run; 320/390 CTA, visualViewport, soft keyboard, focus and z-index verification BLOCKED.
- [ ] `B08-07` If code changed & authorized: check staged diff, stage checklist+tracker and cohesive code/tests, make ONE local atomic commit; otherwise record ZERO_COMMIT/blocked.
- [ ] `B08-08` Capture full SHA in delivery log, reviewer decision and latest checklist checkpoint; CLOSE only at evidenced acceptance; reopen §1 before next batch.
**Implementation fields:** preSHA `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`; postSHA `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`; commitSHA `ZERO_CODE_COMMIT`; tested SHA `NOT_RUN`; tests `NOT_RUN`; review `PENDING`; approval ref `GO-02`.

### B09 — Financial total abbreviation — approved approximation label
**Phase:** P3 · **Finding links:** `R3-F14; HA-F11; HA-F36; DIFF-07` · **Mode:** `IMPLEMENT` · **Initial:** `BLOCKED_DECISION` · **Repository:** Dashboard
**Scope:** HeadPending rounded K total KPI; GO-09-P3 authorizes a visible localized approximation label only.
- [x] `B09-01` Reopened §§0–1 and B09; verified source formulas in `HeadPending.tsx`, current branch/HEAD and clean working tree. GO-09-P3 authorizes Dashboard Phase 3 only.
- [x] `B09-02` PreSHA recorded as `2c0f7ecc3b695a41f646e0af1184a7f71e2dfacd`; branch `work/dashboard-p345-remediation-v2-20261023`; expected scope is HeadPending/KpiCard and focused test only.
- [x] `B09-03` Preserve exact subtitle `fmtAmt(totalAmt)`, KPI calculation `(totalAmt / 1000).toFixed(0) + "K"`, and existing SAR unit; add visible label beside the number using project translations. No financial rule, API or payload change.
- [x] `B09-04` Test frozen numeric fixtures (0, 499, 500, 999, 1000, 1499, 1500 and large values) against the unchanged pre-change K expression; exact summary formatting unchanged; verify AR/EN label and no duplicate assistive announcement. Browser viewport check is separate.
- [x] `B09-05` Owner decision approved in GO-09-P3: Arabic `تقريبي`; English `Approximate`.
- [x] `B09-06` Record focused test commands/exit codes and browser runtime status; do not claim `RUNTIME_VERIFIED` without Browser QA.
- [x] `B09-07` Source/test changes committed atomically as `b7e23e509970ec978586ed8d728caaf45407f805`; no empty commit.
- [x] `B09-08` Recorded source commit `b7e23e509970ec978586ed8d728caaf45407f805`, parent `2c0f7ecc3b695a41f646e0af1184a7f71e2dfacd`, tree `cf0637695811d49b9bcab45a1a7b3ac47f9fa7a4`; tested source is identical. Independent review remains pending.
**Approval:** GO-09-P3. **Status before implementation:** `IN_PROGRESS`; Browser QA `NOT_RUN` pending Chromium recovery.

### B10 — No-code verification of already-resolved Phase3 findings
**Phase:** P3 · **Finding links:** `R3-F01; R3-F06; R3-F07; R3-F09; R3-F13` · **Mode:** `VERIFY_ONLY` · **Initial:** `VERIFY_ONLY` · **Repository:** Dashboard
**Scope:** mobile drawer, supplier Radix dialogs, shared bidi, supplier buttons, breadcrumb.
- [ ] `B10-01` Reload §§0–1, find exact R3/A4 audit rows/lines and current source; recheck 249 Master cross-links and current SHA; owner approves batch.
- [x] `B10-02` Recorded preSHA `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`, branch, verify-only scope, no expected files, role/security scope and browser unavailable in tracker.
- [x] `B10-03` Static source disposition: R3-F01/F06/F07/F09/F13 appear resolved in source; no re-code. Exact source refs and original phase audit rows recorded in tracker.
- [x] `B10-04` Browser/keyboard/touch checks are NOT_RUN; isolated browser unavailable. This is a recorded limitation, not a pass.
- [x] `B10-05` Verify-only gate observed; ZERO implementation commits.
- [x] `B10-06` No tests executed; runtime NOT_RUN/BLOCKED recorded with evidence references; no PASS claimed.
- [x] `B10-07` No code change; ZERO_CODE_COMMIT recorded; no empty commit.
- [x] `B10-08` Pre/post SHA `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`; no commit; reviewer PENDING and runtime evidence remains open.
**Implementation fields:** preSHA `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`; postSHA `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`; commitSHA `ZERO_COMMIT`; tested SHA `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`; tests `NOT_RUN`; review `PENDING`; approval ref `GO-02 verify-only scope`.

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
- [x] `C20-05` No live API was called; only read-only source review and local Dashboard tests were used. No commit for PASS/NOT_RUN alone.
- [ ] `C20-06` For each affected repo independently: secure GO; minimum scoped code+tests; negative tenant/role/financial invariants; no cross-repo combined commit.
- [x] `C20-07` Recorded focused Dashboard commands, exit 0, 221/221 tests (0 skipped) at SHA `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`; cross-repo runtime remains NOT_RUN.
- [x] `C20-08` No source change; ZERO_CODE_COMMIT recorded; independent review PENDING.
- [x] `C20-09` No commit created; current Dashboard SHA and test evidence recorded in tracker. Dependencies remain blocked; §1 reopened before next batch.
**Per-repo commit slots:** Dashboard `____________/N/A`; Backend `____________/N/A`; Flutter `____________/N/A`; test evidence `____________`; owner sign-off `____________`; review `PENDING`.

### GO-02 Phase 5 preflight checkpoint (Dashboard-local authorization only; no cross-repo writes)

At Dashboard SHA `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`, C01–C19 were reconciled against their gates in this checklist and the Phase 5 audit matrix. None authorized a Dashboard source change that could safely complete the contract: required Flutter/Backend target branches and write GO, isolated HTTP/concurrency environments, or signed business/security decisions are missing. Per-contract blockers and NOT_RUN status are recorded in the tracker; no code files changed and no cross-repo contract is marked runtime verified. C20 ran 221 focused Dashboard unit checks (221 PASS, 0 failures, 0 skipped; both commands exit 0). Backend/Flutter HTTP, tenant isolation, financial mutation, and cross-client behavior remain NOT_RUN. C20 remains `BLOCKED_EVIDENCE`, not accepted.

## 5. D — Unified test & release-readiness, not automatic deployment
### D01 — Regression tests & source checks
- [x] `D01-01` Historical run at SHA `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`: 24 Dashboard test files, 329/329 (0 skipped, exit 0), typecheck and build exit 0 with existing warnings. GO-04 rerun at source SHA `97e0c6b800b7b560f11ca601e502c19d67c616a6`: 25 test files, 332/332 (0 skipped, exit 0); typecheck/build exit 0. Evidence is indexed as developer-executed only.
- [ ] `D01-02` For P3 verify responsive AR/EN at 320/360/375/390/430/768/1024/1440 (sampled prioritized matrix); prior 176 NOT_RUN stay until ACTUALLY run.
- `D01 status remains BLOCKED_EVIDENCE`: GO-04 local checks do not satisfy browser/viewport/accessibility or cross-repository runtime acceptance; keep those cases NOT_RUN/BLOCKED.
- [ ] `D01-03` For P4 run focus/tab/dialog/reflow 320 CSS px, zoom 200/400%, axe, TalkBack/VoiceOver or other screen reader only where installed & actually executed; prior 704 NOT_RUN + 8 BLOCKED remain without proof.
- [x] `D01-04` Test index enumerates all 37 original P5 IDs and preserves the audit status split (27 BLOCKED / 10 NOT_RUN). No cross-repo test ran because no authorized isolated service/DB target was available; Dashboard unit tests are not counted as these IDs.
- [x] `D01-05` Recounted historical 1G/1H runtime backlog: 43 + 113 = 156 unique IDs, with no overlap; retained as historical NOT_RUN backlog, separate from GO-02 test totals.
- [ ] `D01-06` Verify roles, tenant scope, finance transitions, halala/SAR, VAT, date/timezone, idempotency, reports, Flutter backward compatibility only against exact approved source.
- [x] `D01-07` Compared 15 changed source/test paths against A/B batch scopes after GO-04 A03/A05 corrections; no Backend/Flutter/Auth/permission/API/schema/dependency files changed. Added-line credential-pattern scan: 0 matches. No Business Rules file modified.
- [x] `D01-08` Updated `docs/audit/ASSAB_P3_P4_P5_TEST_INDEX.md` with historical, GO-04 and GO-06 source SHAs, commands, outcomes and pending reviewer; historical logs and SHA256SUMS, GO-04 TAP, and GO-06 focused/typecheck/build logs plus SHA256SUMS are indexed under `docs/audit/evidence/p3-p5-go02/`. GO-06 full suite was not rerun.
### D02 — Independent evidence reconciliation / acceptance gate
- [x] `D02-01` Verified the 12 original source-fix commits plus GO-04 A03/A05 correction commits map to A01–A06/A08–A11/B01/B07 and the two scoped corrections in tracker, checklist, local commit history and changed paths. All review remains PENDING; no duplicate implementation was made for other batches.
- [x] `D02-02` Tracker and Master addendum separate implemented source, local unit/type/build evidence, runtime NOT_RUN/BLOCKED, decision gates and independent review PENDING; no `ACCEPTED` or `RUNTIME_VERIFIED` promotion.
- [ ] `D02-03` All P5 decision/approval records including 11 original rows have owner, signed decision and target SHA; preserve APPROVAL_REQUIRED.
- [x] `D02-04` Distinct denominators recorded: P3 176 viewport cases; P4 704 NOT_RUN + 8 BLOCKED; P5 37 runtime IDs; 1G/1H 156 historical IDs; local Dashboard 329 historical unit tests and GO-04 332/332 across 25 test files; C20 221 subset. Phase 3/4/5 crosswalks each retain 249 unique canonical IDs.
- [ ] `D02-05` Obtain independent acceptance for micro-batches and written Owner confirmation BEFORE final Master edit; stop if GO missing.
- [x] `D02-06` No push/PR/merge/deploy, Backend/Flutter write, production/staging access, migration, or financial operation was performed.

## 6. M01 — Mandatory final Canonical Master Findings reconciliation (separate documentation commit)
**Path:** `docs/audit/ASSAB_DASHBOARD_MASTER_FINDINGS.md` in `mohameelsherbini/dashboard`. GO-02 explicitly pre-authorizes this local documentation update and commit after eligible work; no remote write. Independent review remains PENDING and must be recorded rather than treated as acceptance.
- [x] `M01-01` GO-02 is the Project Owner authorization for local Master reconciliation on `mohameelsherbini/dashboard`, branch `work/dashboard-p345-remediation-v2-20261023`; independent review is still pending and recorded.
- [x] `M01-02` Verified remote audited branch remained at `30d3d261...`; Master blob equals base blob `bb1a1191...`; the three audit crosswalks each contain the same 249 unique IDs and all are present in current Master.
- [x] `M01-03` Append-only reconciliation retains original Master content/history/249 IDs; no old status inflated and no IDs removed.
- [x] `M01-04` Added crosswalk tables for R3 15, A4 8 and P5 31 contracts (21 noncompatible / 10 statically compatible), without adding IDs to the 249-item Master set.
- [x] `M01-05` Added zero new finding IDs; kept P5 roots, R3/A4 IDs and existing Master cross-links distinct and traceable.
- [x] `M01-06` Added per-batch local commit and test/reviewer status table; C/D and cross-repository work remain separate and have zero cross-repo commits.
- [x] `M01-07` Statuses use implemented/source/blocked/decision distinctions; browser/integration cases remain NOT_RUN and independent review PENDING.
- [x] `M01-08` Carried 176 P3, 704+8 P4, 37 P5 and 156 historical 1G/1H runtime scenarios separately; no 100%/universal PASS claim.
- [x] `M01-09` Revalidated canonical 249 ID membership and crosswalk equality; preserved open finance/security decisions and no new IDs.
- [ ] `M01-10` Master delta is prepared under GO-02, but independent reviewer sign-off is not available. Record `PENDING_REVIEW`; do not describe the update as accepted.
- [x] `M01-11` Local documentation commit `b348bda3b0b010b8d27196e34b4a0c41c3607598` recorded in the final handoff; no merge/push/deploy.
- [x] `M01-12` Final handoff includes batch ledger, local code/docs SHAs, NOT_RUN/BLOCKED items, unresolved owner decisions, residual risk and recommended acceptance tests.
- M01 current status: `PENDING_REVIEW`, not accepted. Original reconciliation commit `b348bda3b0b010b8d27196e34b4a0c41c3607598`; metadata checkpoint `94d02dd2824cb8faea7fd346bf66160c9acb9189`; GO-04 documentation corrections and GO-06 current-status reconciliation are separate local documentation checkpoints. The final GO-06 documentation commit SHA is reported in the delivery report/evidence package. All remain local and unpushed.

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

## GO-06 Phase checkpoint — source and documentation evidence

- Recovered from the original worktree at branch `work/dashboard-p345-remediation-v2-20261023`, HEAD `77cb19291f0f2a6543f184f1eca5c143016138f4`, clean before GO-06 edits. Earlier local commits were preserved; no history rewrite or remote write.
- **Phase 3:** B01 and prior responsive source fixes were not repeated. B02–B06/B08 verify-first viewport checks and B10 browser verification remain `NOT_RUN/BLOCKED`; B09 remains `BLOCKED_DECISION`; R3-F10 remains B06 and R3-F15 remains B07. No P3 commit was justified.
- **Phase 4:** GO-06 completed the A03 test-helper follow-up, A07 contextual labels, and B07 `editAsset` dialog source correction. Focused P4 regressions: 60/60, zero skipped; mockup TypeScript typecheck and build pass. Evidence is in `docs/audit/evidence/p3-p5-go02/GO06/PHASE4_RESULT.md`. This source/test evidence is not browser or accessibility-runtime acceptance. P4 atomic local commit: `e4e921309ff28abc8ca5fd2d5b5c4d58c34541c3`.
- **Phase 5:** No Dashboard fix met all target-SHA, business-policy, repository authorization and isolated-test gates. No Backend/Flutter source or test was modified or run. All 31 contract cases retain their audit disposition; see `ASSAB_P3_P4_P5_GO06_BLOCKER_REGISTER.md`. No P5 code commit.
- **Runtime boundary:** no Playwright/browser package or browser executable is available; do not install one under this GO-06 run. Dialog keyboard/focus/viewport, AdminUsers accessibility tree/keyboard/AR-EN, responsive viewport, Backend/Flutter HTTP and financial tests remain `NOT_RUN/BLOCKED`.
- **Generated file:** Vite build changed only `artifacts/mockup-sandbox/src/.generated/mockup-components.ts`; it was restored from the verified HEAD blob (SHA-256 `28f22d4ae3e1196e2c7cfe055466685ff5c2fc88384ea8f3985d9605527065a1`).
- Independent review is `PENDING_REVIEW`; no finding is marked accepted or runtime verified.

### GO-06 P4 source checkpoint

- PreSHA: `77cb19291f0f2a6543f184f1eca5c143016138f4`; branch: `work/dashboard-p345-remediation-v2-20261023`.
- Exact P4 source/test paths: `artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx`; `artifacts/mockup-sandbox/src/components/mockups/asab/_pages/admin/AdminUsers.tsx`; `artifacts/mockup-sandbox/src/components/mockups/asab/companyAdminGuards.test.ts`; `artifacts/mockup-sandbox/src/components/mockups/asab/components/KpiCard.test.ts`; `artifacts/mockup-sandbox/src/components/mockups/asab/phase1fPlatformAdmin.test.ts`.
- Evidence paths: `docs/audit/evidence/p3-p5-go02/GO06/PHASE4_RESULT.md` and the focused TAP, typecheck, and build logs. Focused tests: 60/60 pass, 0 skipped, exit 0; typecheck exit 0; production build exit 0 with existing >500 kB chunk warning; `git diff --check` exit 0.
- Browser/keyboard/accessibility-tree, viewport/soft-keyboard, axe and screen-reader checks: `NOT_RUN`; no Playwright/browser executable was found, and none was installed.
- P4 source commit: `e4e921309ff28abc8ca5fd2d5b5c4d58c34541c3`; parent `77cb19291f0f2a6543f184f1eca5c143016138f4`; tree `702be589b72a22032e8fb3359d088f976c1e7b93`. Independent review remains `PENDING`; no amend or remote update.

The original V2 plan's final line “EXECUTION NOT AUTHORIZED BY FILE CREATION” describes the plan file alone. GO-02 explicitly authorized the local eligible Dashboard execution; remote delivery remains prohibited.

### GO-06 documentation closeout checkpoint

- Local source HEAD before documentation closeout: `e4e921309ff28abc8ca5fd2d5b5c4d58c34541c3`; P4 source parent/tree remain as recorded above.
- P3: no additional source commit; verify-first browser work remains NOT_RUN/BLOCKED and B09 remains BLOCKED_DECISION.
- P4: one GO-06 atomic source commit; A03/A07/B07 current source status is recorded in the append-only Master reconciliation. No findings are ACCEPTED or RUNTIME_VERIFIED.
- P5: zero source commits; 31 contracts retain the five audited disposition groups and blockers in the GO-06 register.
- D01: focused 60/60 (zero skipped), typecheck and build PASS at P4 source SHA. Full suite, Playwright, accessibility runtime and cross-repository tests remain NOT_RUN/BLOCKED; D01 remains BLOCKED_EVIDENCE.
- D02: independent review is required and remains BLOCKED_APPROVAL/PENDING.
- M01: local append-only Master reconciliation is prepared; its independent acceptance and Windows mirror synchronization remain PENDING/NOT_RUN. Final documentation commit SHA is captured in the separate GO-06 delivery report because a commit cannot contain its own SHA.
- Local only: no push, PR, merge, deploy, Backend/Flutter write, staging/production access, migration, or financial operation.

## GO-07 targeted B07 closeout — 2026-10-23

**Scope:** Dashboard `CompanyDashboard.tsx` + the existing `companyAdminGuards.test.ts` only for source/test changes. No Backend, Flutter, API, permission, business-rule, or financial behavior changes.

- [x] `GO07-01` Verified isolated worktree, branch `work/dashboard-p345-remediation-v2-20261023`, expected pre-SHA `ed836185b0a2cebcf850367d85f0ce2af17bea18`, clean pre-state, and previous source commit `e4e921309ff28abc8ca5fd2d5b5c4d58c34541c3`.
- [x] `GO07-02` Read the B07 acceptance scope and current source. The edit icon trigger had no accessible name; seven labels in `editAsset` had no programmatic control association.
- [x] `GO07-03` Added a contextual Arabic/English `aria-label` to the existing Edit Asset button; `openEdit(a, e.currentTarget)` remains unchanged.
- [x] `GO07-04` Added unique `id`/`htmlFor` pairs for all seven existing `editAsset` controls. Values, state setters, API callbacks, Save and Cancel behavior remain unchanged.
- [x] `GO07-05` Added targeted source regressions. TDD RED on the pre-change source: 13 pass, 2 GO-07 failures, 0 skipped, exit 1. GREEN after correction: `companyAdminGuards.test.ts` 15/15 pass, 0 skipped, exit 0. Evidence: `docs/audit/evidence/p3-p5-go02/GO07/`.
- [x] `GO07-06` Mockup TypeScript typecheck and `git diff --check` exit 0. Full unit suite/build were not run for this targeted correction.
- [ ] `GO07-07` Browser QA for B07/A07/Phase 3 responsive runtime: `NOT_RUN / BLOCKED_ENVIRONMENT`. Playwright package is resolvable, but its Chromium executable path does not exist; no system Chromium/Chrome command is available. No browser or dependencies were installed.
- [ ] `GO07-08` Independent review and runtime acceptance remain pending. B07/R3-F15 and linked CA-F15/HA-F31/S1H-F13 remain open; no status is `ACCEPTED` or `RUNTIME_VERIFIED`.

**GO-07 source files:**
- `artifacts/mockup-sandbox/src/components/mockups/asab/CompanyDashboard.tsx`
- `artifacts/mockup-sandbox/src/components/mockups/asab/companyAdminGuards.test.ts`

**Evidence classification:** `DEVELOPER_REPORTED_EXECUTION`. See the GO-07 delivery report and raw focused test/typecheck logs in `docs/audit/evidence/p3-p5-go02/GO07/`. No browser, Staging, Backend, Flutter, or financial runtime test was executed. Phase 5 remains read-only and blocked on the owner decisions in `ASSAB_P3_P4_P5_GO06_BLOCKER_REGISTER.md`.

### GO-07 source commit and current status

The GO-07 source/test correction is committed locally as `5313b6f5bde200d2ce021c4833614647f7e20e4c` (parent `ed836185b0a2cebcf850367d85f0ce2af17bea18`; tree `278fb20cc54469c76bebb3a451faf5ec49cde128`). The exact source delta is two files: `CompanyDashboard.tsx` and `companyAdminGuards.test.ts`. Focused regression 15/15, typecheck, and diff check pass. Browser QA remains NOT_RUN/BLOCKED; no browser was installed. B07 remains PENDING_REVIEW, D01 BLOCKED_EVIDENCE, and no runtime acceptance is claimed.


## GO-08-P3 Responsive verification checkpoint — 2026-10-23

- [x] `GO08-01` Reopened Section 1 and B01–B10 criteria; verified branch `work/dashboard-p345-remediation-v2-20261023`, pre-documentation HEAD `92b8198fed73c043ed171061272cd1309ec29a0f`, tree `99d67b62e755fc91a71e1330ad9734a3b1a36cbc`, and clean worktree.
- [x] `GO08-02` Confirmed the review branch is not currently present on GitHub; pinned Base `30d3d261b83ed4b0d9fa1dc1f875ae8592484261` is accessible.
- [x] `GO08-03` Checked Playwright 1.62.1 and system browser availability; authorized managed Chromium setup had failed (invalid archive/stale lock). No repo dependency files changed.
- [x] `GO08-04` Reconciled B01–B10 against existing source commits and original verification gates; preserved R3-F10 → B06 and R3-F15 → B07. See `docs/audit/evidence/p3-p5-go02/GO08/GO08_P3_RESPONSIVE_RESULT.md`.
- [x] `GO08-05` Kept source unchanged because all pending responsive corrections are VERIFY_FIRST and browser reproduction was unavailable.
- [ ] `GO08-06` Run real Playwright viewport checks for B01–B08 and B10 across required widths, languages, keyboard/touch, short-height and soft-keyboard states. `NOT_RUN / BLOCKED_ENVIRONMENT`.
- [ ] `GO08-07` Obtain owner decision for B09; no financial display change made. Decision request: `docs/audit/evidence/p3-p5-go02/GO08/B09_OWNER_DECISION_REQUEST.md`.
- [x] `GO08-08` Updated tracker, Master Findings, Test Index and Final Handoff with evidence-limited statuses; no finding promoted to CLOSED/ACCEPTED/RUNTIME_VERIFIED.
- [ ] `GO08-09` Final source build and tests after code edits. No GO-08 source edit occurred; no build/test rerun is claimed.
- [x] `GO08-10` Scanned the complete Base-to-worktree delta (all 24 local commits through `0ca0b941f82704745af73b4712d80e66fac8bef6`): no known token/secret/email/IBAN/card-like match, no sensitive config/key filenames, and no changed file over 1 MB; dedicated gitleaks/trufflehog unavailable. Evidence: `docs/audit/evidence/p3-p5-go02/GO08/pre-push-sensitive-content-scan.log`.

### Finding-level GO-08 disposition

| Batch | GO-08 status | Source changes | Browser evidence | Existing commit / note |
|---|---|---|---|---|
| B01 | `PARTIAL_PASS / PENDING_REVIEW` | None; existing reflow retained | `NOT_RUN` | `0e95364e09a784204df40da5d79d763137d72c5b` |
| B02 | `BLOCKED_EVIDENCE` | None | `NOT_RUN` | VERIFY_FIRST; exact finance/KPI viewport acceptance pending |
| B03 | `BLOCKED_EVIDENCE` | None | `NOT_RUN` | VERIFY_FIRST; procurement scroll/touch proof pending |
| B04 | `BLOCKED_EVIDENCE` | None | `NOT_RUN` | Responsive header/Sheet runtime pending |
| B05 | `BLOCKED_EVIDENCE` | None | `NOT_RUN` | Toolbar/search/notification runtime pending |
| B06 | `BLOCKED_EVIDENCE` | None | `NOT_RUN` | R3-F10 remains assigned to B06; 320px/200% zoom pending |
| B07 | `PENDING_REVIEW` | None; no Accessibility reimplementation | `NOT_RUN` | R3-F15 remains assigned to B07; responsive short-viewport scrolling pending |
| B08 | `BLOCKED_EVIDENCE` | None | `NOT_RUN` | Soft-keyboard/visualViewport overlap not reproduced |
| B09 | `BLOCKED_DECISION` | None | `NOT_RUN` | Owner must decide approximate-vs-exact display policy |
| B10 | `BLOCKED_EVIDENCE` | None | `NOT_RUN` | Source-only verification is not runtime acceptance |

No Phase 3 finding is closed by this checkpoint. No browser test, staging test or live API request was run.
- [ ] `GO08-11` Normal push dry-run exited 128 because GitHub HTTPS credentials were unavailable (`could not read Username` with terminal prompts disabled). The authorized branch is absent; direct `git ls-remote` timed out. No actual push, force push, API ref update, or alternate target. Evidence and exact command: `docs/audit/evidence/p3-p5-go02/GO08/GO08_P3_RESPONSIVE_RESULT.md` and `pre-push-sensitive-content-scan.log`.


## GO-09-P3 current execution checkpoint — 2026-10-23

Section 1 and the B01–B10 records were reopened before work. Starting branch/HEAD/clean state matched GO-09 exactly. B09 owner option 1 was approved; the original financial calculation, amount formatting, unit, API and payload are unchanged.

- B09 code/test changes are limited to HeadPending, optional KpiCard valueLabel and a focused regression test. RED found the missing approximation label (1 pass / 1 fail, exit 1); GREEN focused test is 5/5, zero skipped, exit 0. Typecheck and final mockup build exit 0; CRLF-aware diff check exit 0. See `docs/audit/evidence/p3-p5-go02/GO09/`.
- Chromium setup was attempted once in a fresh isolated path after confirming no installer process. CDN returned a truncated/invalid 0 MiB archive and Playwright exited 1. Browser QA B01–B10 remains NOT_RUN/BLOCKED_ENVIRONMENT; no viewport finding is closed.
- B01–B08/B10 were not altered without reproduced browser defects. R3-F10 → B06 and R3-F15 → B07 remain unchanged.
- A combined related diagnostic had one unrelated stale test assertion in `phase1dBranchManager.test.ts:263`; raw TAP and explanation are in GO09 evidence. The test was not weakened.
- B09 current source state: `SOURCE_FIXED — TARGETED_TEST_PASS`; source commit `b7e23e509970ec978586ed8d728caaf45407f805` (parent `2c0f7ecc3b695a41f646e0af1184a7f71e2dfacd`, tree `cf0637695811d49b9bcab45a1a7b3ac47f9fa7a4`). Browser/mobile fit and independent review remain pending. Phase 3 final state: `P3_IMPLEMENTATION_COMPLETED_WITH_BLOCKERS`.

- GO-09 review publishing gate: origin verified as `mohameelsherbini/dashboard`; GitHub review branch search returned absent; normal `git push --dry-run` exit 128 due unavailable HTTPS username. `BLOCKED_AUTHENTICATION`; no push or alternative API write.


## GO-10-P3 source/test checkpoint — 2026-10-23

The GO-10 source correction is committed at `2650ab5cf479a085a1505a65ac1888f8f893dd01` (parent `65d45a441387a0e4dffd712ab46ac1b1fe5b6194`; tree `97fdb5529e569caa0ead2e639141e959a04798d7`). It changes only `HeadPending.tsx`, `headPendingB09.test.ts`, and `phase1dBranchManager.test.ts`.

B09 now passes the approximation label only when `totalAmt != null`: `null` keeps `—` and SAR without the label; numeric zero remains `0K` with the localized label. Existing K formula, exact `fmtAmt(totalAmt)` summary, unit and API behavior are unchanged. B09 + KpiCard targeted tests: 6/6 PASS, 0 skipped, exit 0. `phase1dBranchManager.test.ts`: 13/13 PASS, 0 skipped, exit 0. The stale JSX matcher was replaced with assertions against the actual Radix Dialog structure, title, scroll constraints, focus return, all seven label/id pairs, and Save/Cancel handlers. `CompanyDashboard.tsx` was not changed. Typecheck, one final build, and diff check passed; full suite was not run.

B07 remains `PENDING_REVIEW`; static contract tests pass, but Browser QA remains `NOT_RUN`. B09 remains source-fixed with targeted tests passing, but B01–B10 Browser QA and independent acceptance remain pending. Current checkpoint: `P3_SOURCE_IMPLEMENTATION_COMPLETE — BROWSER_QA_PENDING`; no finding is `RUNTIME_VERIFIED`, `ACCEPTED`, or `P3_CLOSED`. Detailed report and checksums: `docs/audit/evidence/p3-p5-go02/GO10/`.
