# GO-02 P3/P4/P5 Test Evidence Index

- Evidence class: `DEVELOPER_REPORTED_EXECUTION` (local only; not independent acceptance).
- Repository: `mohameelsherbini/dashboard`
- Branch: `work/dashboard-p345-remediation-v2-20261023`
- Historical tested source HEAD: `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702`
- Latest GO-04 source HEAD tested: `97e0c6b800b7b560f11ca601e502c19d67c616a6`
- Device: none (Node/unit/typecheck/build only). Browser, viewport and screen-reader checks were not run.

## Executed checks

| Evidence ID | Phase | Command / tool | Fixture | Outcome | Log | Reviewer |
|---|---|---|---|---|---|---|
| C20-DASH-UNIT | P5 Dashboard-only regression subset | `TZ=UTC node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap [11 named files]` | Existing local unit fixtures; no HTTP/server/database | PASS 208/208, 0 skipped, exit 0 | [C20 log](evidence/p3-p5-go02/C20_dashboard_focused_208.tap) | Pending |
| C20-BRANCH-UNIT | P5 Dashboard-only branch request regression | same runner with `phase1dBranchManager.test.ts` | Existing local unit fixtures; no HTTP/server/database | PASS 13/13, 0 skipped, exit 0 | [Branch log](evidence/p3-p5-go02/C20_branch_manager_focused_13.tap) | Pending |
| D01-ALL-UNIT | D01 | runner discovers all `*.test.ts` under `artifacts/mockup-sandbox/src` (24 files), same runner/flags | Existing local unit fixtures; no external service/database | PASS 329/329, 0 skipped, exit 0 | [Full test log](evidence/p3-p5-go02/D01_full_dashboard_unit_329.tap) | Pending |
| D01-TYPECHECK | D01 | `pnpm --filter @workspace/mockup-sandbox run typecheck` | N/A | PASS, exit 0 | [Typecheck log](evidence/p3-p5-go02/D01_typecheck.log) | Pending |
| D01-BUILD | D01 | `pnpm --filter @workspace/mockup-sandbox run build` | N/A | PASS, exit 0; existing chunk-size/sourcemap warnings | [Build log](evidence/p3-p5-go02/D01_build.log) | Pending |
| D01-GO04-ALL-UNIT | D01 / GO-04 | `find artifacts/mockup-sandbox/src -name '*.test.ts' -print0 | sort -z | xargs -0 env TZ=UTC node --import ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs --test --test-force-exit --test-reporter=tap` | Existing local unit fixtures; no HTTP/server/database | PASS 332/332, 0 skipped, exit 0 at `97e0c6b800b7b560f11ca601e502c19d67c616a6` (25 test files) | [GO-04 full TAP log](evidence/p3-p5-go02/D01_go04_full_dashboard_unit_332.tap) | Pending |
| D01-GO04-TYPECHECK | D01 / GO-04 | `pnpm --filter @workspace/mockup-sandbox run typecheck` | N/A | PASS, exit 0 at `97e0c6b800b7b560f11ca601e502c19d67c616a6`; separate raw log not retained | Execution result record | Pending |
| D01-GO04-BUILD | D01 / GO-04 | `pnpm --filter @workspace/mockup-sandbox run build` | N/A | PASS, exit 0; existing sourcemap/large-chunk warnings; generated file restored to pre-build SHA `28f22d4ae3e1196e2c7cfe055466685ff5c2fc88384ea8f3985d9605527065a1` | Execution result record | Pending |

### Historical full-suite test files at `79dc938d7d9bbdcc1f5441245e9b9f5ec4757702` (24 files)

- `artifacts/mockup-sandbox/src/api/authSession.test.ts`
- `artifacts/mockup-sandbox/src/api/errors.test.ts`
- `artifacts/mockup-sandbox/src/api/queries/shiftsHistory.test.ts`
- `artifacts/mockup-sandbox/src/auth/roleAccess.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/companyAdminGuards.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/companySettingsGuards.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/headReviewGuards.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/operationMapping.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/phase1cAccountant.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/phase1dBranchManager.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/phase1eProcurement.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/phase1fPlatformAdmin.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/phase1gSupplier.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/phase1hShared.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/procurementPages.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/salesActionGuards.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/sharedOperationWidgets.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/shiftAllocationCorrection.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/shiftControls.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/shiftCountEvidence.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/shiftOpPanel.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/shiftReportCorrection.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/shiftReviewQueue.test.ts`
- `artifacts/mockup-sandbox/src/components/mockups/asab/supportTicketGuards.test.ts`

### GO-04 full-suite addition

- `artifacts/mockup-sandbox/src/components/mockups/asab/components/KpiCard.test.ts` was added in GO-04 and is the 25th discovered test file for the 332/332 rerun.

## GO-04 targeted correction test record

- A03 commit `fc20ec75af1ab2fe370c695a7b17dfe4e301e7ad`: TDD RED exit 1 specifically detected flow-content descendants under the native button; GREEN focused semantic tests 2/2, typecheck and `git diff --check` exit 0.
- A05 commit `97e0c6b800b7b560f11ca601e502c19d67c616a6`: TDD RED exit 1 specifically detected div/p within the radio label; GREEN targeted regression 1/1, Platform Admin/shared regression 43/43, Auth/session 66/66, typecheck and `git diff --check` exit 0.
- Combined D01 GO-04 rerun: 332/332 across 25 `*.test.ts` files, 0 skipped, exit 0; typecheck and build exit 0. Only the full TAP log is retained as a raw log; focused, typecheck and build outcomes are execution records.
- All outcomes are `DEVELOPER_REPORTED_EXECUTION`; no browser, axe, keyboard, screen-reader, Backend, Flutter or financial runtime check was run.

## Not executed / blocked

- P3 viewport checks: NOT_RUN at 320/360/375/390/430/768/1024/1440; browser executable unavailable.
- P4 keyboard/focus/dialog/reflow at 320 CSS px and 200%/400% zoom, axe, TalkBack/VoiceOver: NOT_RUN/BLOCKED; no browser/screen-reader runtime.
- P5 synthetic cross-repo API/database checks: NOT_RUN. No Backend/Flutter target runtime or separate live HTTP test authorization was available. The 221 Dashboard unit tests do not substitute for these.
- Flutter compatibility, cross-tenant behavior, financial postings and Backend 403/409/422 are NOT_RUN.
- Build regenerated `src/.generated/mockup-components.ts` with import reordering only; restored it to pre-build SHA-256 `28f22d4ae3e1196e2c7cfe055466685ff5c2fc88384ea8f3985d9605527065a1` and verified clean relative to HEAD.

## Original Phase 5 runtime test backlog (not rerun)

- Imported from Phase 5 audit `08_REGRESSION_TEST_REQUIREMENTS.csv`: 37 rows; status totals `{'BLOCKED': 27, 'NOT_RUN': 10}`. Original test IDs are preserved below. Dashboard unit tests above are not counted as any of these runtime IDs.

- `P5-T001` — `P5-C01` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T002` — `P5-C02` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T003` — `P5-C03` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T004` — `P5-C04` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T005` — `P5-C05` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T006` — `P5-C06` — original audit status `NOT_RUN`; no runtime execution in this task.
- `P5-T007` — `P5-C07` — original audit status `NOT_RUN`; no runtime execution in this task.
- `P5-T008` — `P5-C08` — original audit status `NOT_RUN`; no runtime execution in this task.
- `P5-T009` — `P5-C09` — original audit status `NOT_RUN`; no runtime execution in this task.
- `P5-T010` — `P5-C10` — original audit status `NOT_RUN`; no runtime execution in this task.
- `P5-T011` — `P5-C11` — original audit status `NOT_RUN`; no runtime execution in this task.
- `P5-T012` — `P5-C12` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T013` — `P5-C13` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T014` — `P5-C14` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T015` — `P5-C15` — original audit status `NOT_RUN`; no runtime execution in this task.
- `P5-T016` — `P5-C16` — original audit status `NOT_RUN`; no runtime execution in this task.
- `P5-T017` — `P5-C17` — original audit status `NOT_RUN`; no runtime execution in this task.
- `P5-T018` — `P5-C18` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T019` — `P5-C19` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T020` — `P5-C20` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T021` — `P5-C21` — original audit status `NOT_RUN`; no runtime execution in this task.
- `P5-T022` — `P5-C22` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T023` — `P5-C23` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T024` — `P5-C24` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T025` — `P5-C25` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T026` — `P5-C26` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T027` — `P5-C27` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T028` — `P5-C28` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T029` — `P5-C29` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T030` — `P5-C30` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T031` — `P5-C31` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T032` — `P5-C13` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T033` — `P5-C14` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T034` — `P5-C01` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T035` — `P5-C03` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T036` — `P5-C28` — original audit status `BLOCKED`; no runtime execution in this task.
- `P5-T037` — `P5-C18` — original audit status `BLOCKED`; no runtime execution in this task.

## Integrity

Raw logs are stored alongside this index. SHA-256 values are recorded in `evidence/p3-p5-go02/SHA256SUMS.txt`. The recorded test source SHA is the repository HEAD above; checklist/tracker documentation was uncommitted and does not alter tested source code.
