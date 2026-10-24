# Dashboard UI integration — independent local verification

Date: 2026-10-24. Status: **COMMITTED LOCALLY; NOT PUBLISHED, DEPLOYED OR ACCEPTED**.

## Source identity and composition

- Destination repository: `mahmoudmagdy200000-code/dashboard`.
- Local branch: `task/dashboard-sherbini-ui-integration-20261024`.
- Starting point: reviewed Mode C task `a5cd3b2991713daba738fe1eb67205ece39962c2` (application baseline `ce078dfde8198e24e21e639b2869f43706af5e6f`).
- Owner main inspected: `d3825e3a151c4290c22c3f6eed0fa3ce7b167b14`. Its three manual-only dispatchers were preserved in local merge `5595aae8efd0b2aee82f6f2ef8f746bd66fadbab`.
- Sherbini source: `mohameelsherbini/dashboard`, branch `work/dashboard-p4-accessibility-completion-20261024`, exact HEAD `a7b030e37ddca1348bc5a191aceff4d86253ceb1`.
- Application integration merge: `2e2c4cdd9416c38805510a2b9566ed3c317d919f`; tree `521eaf8afeb477ed725756b2f1e008825c03173f`.

Verified ancestor inclusion:

| Work | Exact commit | Included |
| --- | --- | --- |
| Company Admin 1A | `f4d3fc808f34bf946c384a0f8f3f5e7e836dc28b` | Yes |
| Head Accountant 1B | `f9936f526082a3db795edd1381c034c6c85f9ec5` | Yes |
| Modularization and phases 1A–1H | `30d3d261b83ed4b0d9fa1dc1f875ae8592484261` | Yes |
| Later responsive and logo changes | `7d09cc3b6809c25d81216ef851467a230768f62f` | Yes |
| Latest accessibility corrections/evidence | `a7b030e37ddca1348bc5a191aceff4d86253ceb1` | Yes |
| Separate Draft PR #1 / G1 workflow kind | `a3cc132b8a928a94ee2a1d4a17a3c2056c9ebe0a` | **No** |

No Git conflicts occurred. All imported application content matches the latest Sherbini source except whitespace-only cleanup in four files (`AdminUsers.tsx`, `shiftOpPanel.test.ts`, `shiftReportCorrection.test.ts`, `shiftReportCorrection.ts`). The Vite-generated import-order change produced during build was restored. No Backend, Flutter, lockfile, environment configuration or financial rule was edited by this integration.

The imported code includes authentication/session isolation, role guards, API adapters and frontend financial action guards as well as presentation. It must not be classified as a purely cosmetic change. Original approval-required and blocked findings remain unresolved unless separately proven; inherited developer evidence is not reclassified as independent acceptance.

## Actual isolated checks

| Check | Executed result |
| --- | --- |
| Frozen pnpm installation, lifecycle scripts disabled | PASS |
| All Dashboard `src/**/*.test.ts`, existing Node/tsx runner | **345 PASS; 0 FAIL; 0 SKIP** |
| Dashboard TypeScript | PASS |
| Dashboard production build | PASS; existing sourcemap/large-chunk warnings |
| Existing E2E TypeScript | PASS |
| Existing E2E unit safety project | **12 PASS; 0 FAIL; 0 SKIP** |
| Chromium local entry → accountant login, 375 and 1024 px | PASS; no JS page errors or horizontal document overflow |
| Current fixture branch-role contract reproduction | **COMPATIBILITY HOLD**, details below |
| Authenticated Dashboard/Vercel runtime | NOT_RUN |
| Staging financial tests on this merged UI | NOT_RUN |

Dashboard unit tests include source/AST assertions and mocked transports. Their passing count is not browser or Backend integration acceptance. Local browser smoke used a loopback-only static server and the production build configured with `VITE_API_BASE_URL=http://127.0.0.1:9/api/v1`. All nonlocal browser requests were blocked. No credentials were entered, no login was submitted, and no Staging API or database was contacted. This limited check does not cover authenticated role pages, drawers, full WCAG, or financial workflows.

Raw test/typecheck/build logs, two entry screenshots, the application changed-file manifest, and a machine-readable execution summary are in [the evidence directory](evidence/owner-ui-integration-20261024/). Dashboard test runner:

```sh
rg --files artifacts/mockup-sandbox/src -g '*.test.ts' -0 | sort -z | xargs -0 env TZ=UTC node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap
```

## Compatibility hold: existing synthetic Branch Manager grant

The new `roleAccess.ts` accepts a branch grant only with exactly one branch ID and empty brand/restaurant arrays. Backend harness source at `26f86c683a17a8c5ebe19771186d6b35230d62cf` defines the branch fixture with populated brand, restaurant and branch arrays; `/auth/me` serializes those arrays.

An isolated call to the real `grantedRoleKeys()` returned:

```text
CURRENT_HARNESS_BRANCH_GRANT=[]
MINIMAL_BRANCH_GRANT=["branch"]
```

This establishes a fixture/source-contract incompatibility, not the current contents of Staging role rows. The actual rows were not read in this integration task. Prior mobile Branch Manager login success does not exercise this Dashboard guard. Preserve the fail-closed guard; inspect the exact current role payload and separately approve any fixture scope normalization. Do not grant broader scopes or silently relax the guard to pass tests.

## Boundaries and next gate

- No owner main, staging candidate or Sherbini branch was changed remotely.
- No push, PR creation, merge to owner main, Vercel/Coolify action or Staging database mutation occurred.
- Existing dated Mode C dispatchers remain pinned to their previously reviewed source; they do not validate this merged UI. Do not rerun the already submitted 2026-10-24 financial fixture.
- Next authorization: publish this exact local review branch / create a review PR only, with no landing or deployment. Check Vercel branch auto-deployment behavior before publication if publication must remain deployment-free.
- Before runtime acceptance: verify current Backend and deployed Dashboard SHAs; resolve or explicitly isolate the branch-fixture compatibility hold; run authenticated read-only checks of the existing submitted report through the selected UI candidate. Any approval/handover mutations require their own defined scope.
- Release state: **COMMITTED** locally. Integration into an accepted owner target, deployment, healthy runtime, full tested state and acceptance remain pending. **G7 and Harness: NOT ACCEPTED**.
