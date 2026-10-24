# GO-10-P3 — Source/Test Cleanup Evidence

Evidence class: `DEVELOPER_REPORTED_EXECUTION`.

## Git checkpoint

- Repository: `mohameelsherbini/dashboard`
- Branch: `work/dashboard-p345-remediation-v2-20261023`
- Starting HEAD: `65d45a441387a0e4dffd712ab46ac1b1fe5b6194`
- Source commit: `2650ab5cf479a085a1505a65ac1888f8f893dd01`
- Parent: `65d45a441387a0e4dffd712ab46ac1b1fe5b6194`
- Tree: `97fdb5529e569caa0ead2e639141e959a04798d7`
- Changed files (exact): `HeadPending.tsx`, `headPendingB09.test.ts`, `phase1dBranchManager.test.ts`.
- The tests/typecheck/build ran against the same file bytes later committed; hashes are in `source-sha256-tested.txt`.

## B09 null-state correction

The value and approximation text are derived from the actual `HeadPending` JSX expressions and the actual `KpiCard` component is rendered to static markup. `totalAmt == null` keeps the pre-existing `—` and unit but produces no approximation label. Numeric zero keeps `0K` and the localized label. Other previous numeric fixtures retain the same formula, formatting, summary and unit. No API, calculation, unit, VAT, rounding policy or business rule changed.

## B07 stale static assertion correction

The old test searched for `{editAsset && (` and coupled scroll styling to an obsolete contiguous class string. The `editAsset` implementation in unmodified `CompanyDashboard.tsx` already uses Radix Dialog (`Root`, `Portal`, `Overlay`, `Content`, localized `Title`), dynamic-height scroll classes, focus restoration, seven associated field labels, and Save/Cancel handlers. The test now asserts that semantic source contract. No production editAsset code changed. This is static source evidence only, not browser interaction or accessibility runtime evidence.

## Verification

- B09 + KpiCard targeted tests: `node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap artifacts/mockup-sandbox/src/components/mockups/asab/headPendingB09.test.ts artifacts/mockup-sandbox/src/components/mockups/asab/components/KpiCard.test.ts` — 6/6 PASS, 0 skipped, exit 0. Raw TAP: `b09-and-kpicard.tap`.
- Dialog semantic regression: `node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap artifacts/mockup-sandbox/src/components/mockups/asab/phase1dBranchManager.test.ts` — 13/13 PASS, 0 skipped, exit 0. Raw TAP: `phase1d-branch-manager.tap`.
- Typecheck: `pnpm --filter @workspace/mockup-sandbox run typecheck` — PASS, exit 0 (`typecheck.log`).
- Build: `pnpm --filter @workspace/mockup-sandbox run build` — PASS, exit 0 (`build.log`); existing large-chunk warning. Build-generated `.generated/mockup-components.ts` was restored to its baseline content and is not in the commit.
- `git show --check --format=oneline 2650ab5cf479a085a1505a65ac1888f8f893dd01` and `git diff --check` — PASS, exit 0.
- Full unit suite: NOT_RUN by instruction. Browser QA: NOT_RUN by instruction for GO-10; B01–B10 browser acceptance remains pending.

## Status

`P3_SOURCE_IMPLEMENTATION_COMPLETE — BROWSER_QA_PENDING`. No item is `RUNTIME_VERIFIED`, `ACCEPTED`, or `P3_CLOSED`. No Push, PR, Merge, Deploy, Backend, or Flutter changes.
