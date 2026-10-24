# GO-06 Phase 5 — Consolidated Decision and Blocker Register

**Evidence class:** `DEVELOPER_REPORTED_EXECUTION` (read-only source/plan reconciliation; no cross-repository runtime tests)
**Dashboard reference:** `mohameelsherbini/dashboard` at GO-06 source branch `work/dashboard-p345-remediation-v2-20261023`; base checkpoint `30d3d261b83ed4b0d9fa1dc1f875ae8592484261`.
**Backend / Flutter references:** only the frozen audit references in Checklist V2 §0; they are not selected release targets or write authorization.

No Phase 5 code change passed every mandatory target, contract, decision, repository authorization and isolated-test gate. Therefore Phase 5 has **zero code commits**. The audited 31 contract cases remain in the five original disposition groups: 2 `CONFIRMED_MISMATCH`, 4 `IMPLEMENTATION_GAP`, 11 `CONTRACT_UNKNOWN`, 4 `DECISION_REQUIRED`, and 10 `COMPATIBLE_STATICALLY`. Static compatibility is not runtime compatibility.

The detailed original current/expected behavior, Business Rules references and acceptance scenarios remain in the Phase 5 audit packet and Checklist V2 §§0 and 4 (C01–C20). This register summarizes the exact missing gate; it does not replace those source rows or create finding IDs.

| Batch / contract IDs | Existing linked root(s) | Repositories / target | Current audited disposition | Missing evidence / decision | Minimum next action and acceptance evidence |
|---|---|---|---|---|---|
| C01 / P5-C01 | P5-F01 | Flutter `AssabAPP`; no selected release target | Confirmed mismatch, P1 | Mahmoud confirmation of Backend contract, Flutter branch and Flutter write GO | Verify counted_cash payload and preserve explicit zero; isolated RED 422 / GREEN valid 0.00 and normal count, handover, shortage, duplicate request |
| C02 / P5-C02 | P5-F02 | Backend `Assab`; no selected target | Confirmed mismatch, P1 | Written PUR-04/PERM-00 role matrix and Backend write GO | Keep middleware authoritative; test approved accountant and denied roles, company scope, 403/422 |
| C03 / P5-C03 | SUP-F12 | Backend `Assab`; no selected target | Implementation gap, P1 | Exact release SHA, persistence/portal bridge proof, isolated synthetic Backend test and Backend GO | Trace grouped send to supplier operation; test exact supplier/tenant visibility, idempotency, reject/confirm and unauthorized supplier isolation |
| C04 / P5-C04 | SUP-F24 | Backend + Dashboard; no approved contract target | Implementation gap, P2 | PUR-05 approved invoice schema, VAT and integer-halalah boundary, per-repo GO | Confirm DTO mapping; test exact halalas, fractional rounding, per-line VAT and receipt mismatch |
| C05 / P5-C05 | SUP-F19 | Backend + Dashboard + Flutter; no selected targets | Implementation gap, P2 | PUR-01..05 receiving/returns lifecycle and repo-specific GO | Approve receipt/return states first; test partial receipt, quantity mismatch, return transitions, tenant/role denial and Flutter compatibility |
| C06 / P5-C12,C13,C14 | S1H-F10; F2-A-SR-03; F2-ADMIN-SCOPE-BYPASS | Backend `Assab`; no selected security release candidate | Contract unknown, P1 | Reconcile F2-A/F2-B and security branches; select exact Backend target, isolated negative fixtures and Mahmoud security approval | Prove server-side role/company/branch scope; negative cross-company, roleless, conflicting grant, admin-bypass, replay and 403 tests |
| C07 / P5-C18 | S1H-F08 | Backend + Dashboard + Flutter; no exact targets | Contract unknown, P1 | Exact Backend SHA, isolated auth fixture and security review; no auth architecture change authorized | Test single refresh after 401, rotation/replay denial, logout revoke, parallel requests, expiry, private phone and scope |
| C08 / P5-C19 | SUP-F13 | Backend + Dashboard; no approved portal scope | Contract unknown, P2 | PORTAL-01 decision on supplier support/search and approved endpoints | If approved, validate only established supplier routes, cross-tenant 403 and localized empty state |
| C09 / P5-C20 | P5-F03 | Flutter `AssabAPP`; no approved release branch | Implementation gap, P2 | Endpoint mapping/release configuration decision and Flutter write GO | Compare main/demo without merging unrelated files; test dev/synthetic config, API+broadcast origins and fail-closed production config |
| C10 / P5-C22 | SUP-F01 | Backend release + Dashboard; deployed target unknown | Contract unknown, P2 | Mahmoud release approval and proven isolated environment; no flag/route-cache change authorized | Verify enabled/disabled routes and unauthorized supplier denial without live toggles |
| C11 / P5-C23 | P5-D01 | Backend `Assab`; no signed policy | Decision required, P1 | Written PUR-01/PERM-00 approval authority matrix | Preserve fail-closed behavior; test negative role/state/replay transitions and amount immutability |
| C12 / P5-C24 | P5-D02 | Backend + client targets not selected | Contract unknown, P2 | INV-02 business acceptance and isolated cost dataset | Test synthetic monthly WAC, approved zero/negative-stock rules, transfers, rounding and client parity |
| C13 / P5-C25 | P5-D03 | Dashboard + Backend; no approved report catalog | Decision required, P2 | Signed REP-00 report-by-report scope | Keep unapproved reports gated; test visible catalog, export, role/tenant denial and empty/loading states |
| C14 / P5-C26 | CA-F04 | Dashboard + Backend; no SUB-01 scope confirmation | Decision required, P2 | Product/Owner confirmation; billing changes remain separately gated | Keep subscription management limited to approved fields; verify admin scope and non-admin denial; billing remains disabled |
| C15 / P5-C27 | P5-D04 | Backend + Flutter; no exact money-unit contract | Contract unknown, P2 | Endpoint-level money units, money-policy approval, exact targets and per-repo GO | Test 0.00, 0.01, 999999.99, invalid half-cent, DTO precision, locale separators and transaction equality |
| C16 / P5-C28 | SUP-F06 | Backend + Dashboard; no authorized mutation runtime | Contract unknown, P2 | Synthetic concurrency environment and explicit Backend mutation-test GO | Verify same-key replay, parallel requests, double accept, retry, one final state; frontend lock alone is insufficient |
| C17 / P5-C29 | P5-D05 | Backend `Assab`; no signed authority | Decision required, P2 | EXP-06/PERM-00 decision and Backend GO | Preserve current permissions; test negative role, rejection/correction/approval transitions and tenant isolation |
| C18 / P5-C30 | Contract-only | Backend + Dashboard + Flutter; exact revision path unresolved | Contract unknown, P2 | Current path evidence, isolated 409 test, exact branch approvals | Verify valid revision, stale 409, duplicate submit and reviewer/cashier compatibility |
| C19 / P5-C31 | P5-D06 | Backend + Dashboard + Flutter; no approved workflow/targets | Contract unknown, P2 | Approved return/invoice review lifecycle, tenant tests and per-repo GO | Test supplier return provenance, accountant/head approval, tenant scope and forbidden transitions |
| C20 / P5-C06–C11,C15–C17,C21 | Existing linked roots in Checklist V2 §4 | All three repositories; targets not selected | Compatible statically (10 contracts; mixed P2/P3) | Exact target SHAs and HTTP/tenant/export/date runtime evidence | Retain current 221/221 Dashboard unit result as Dashboard-only; later test real fixtures for pagination, search/filter, exports, permission denials, 403/409 and dates |

## Phase 5 status

- Dashboard-only changes: **none**; no unverified workaround was introduced.
- Backend and Flutter: **read-only**; no source writes or commits.
- Live HTTP, database, financial, cross-tenant and cross-client tests: **NOT_RUN**.
- Owner decisions and target branches: **BLOCKED** as listed above; do not infer approval from GO-02's Dashboard-only authorization.
- Independent review: `PENDING_REVIEW`.
