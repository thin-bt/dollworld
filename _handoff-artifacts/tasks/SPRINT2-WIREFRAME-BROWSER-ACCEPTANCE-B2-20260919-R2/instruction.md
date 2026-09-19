# SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2

state: PREPARED
sprint: Sprint2
lane: B2
priority: IMMEDIATE
mode: WIREFRAME_BROWSER_ACCEPTANCE
control-authority: GitHub
updatedAt: 2026-09-20T01:20:33+09:00
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R1
paired-a-task: SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260919-R1
required-product-sha: 92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a
non-overlap: ACCEPTANCE_TESTS_ONLY_NO_PRODUCT_EDITS
recovery: ROLE2_REBIND_R2_TO_CANONICAL_WIREFRAME_PUBLICATION

## Objective
Own full Sprint2 wireframe browser acceptance against canonical published master after A's READY wireframe publication. Old reduced 7/7 remains regression evidence only. No Sprint3/4 scope is authorized.

## Required execution
1. Claim B2 ACTIVE before changes.
2. Fresh-sync canonical master. Confirm A publication `92f2a09d1e5f1da18b30ee6a4f2fb3756d980d5a` is an ancestor of the clean HEAD tested and record that exact HEAD.
3. Execute the canonical dedicated harness `tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts` in Chrome without weakening/skipping assertions. Coverage must include annual schedule/year switch/current time/rank/category/week; tournament detail; dense participants; round-robin standings + pair matrix; knockout/results; winner/placements; series history/historical winners; annual earnings ranking + multi-year switch + person navigation; promotion result; person rank history/source navigation; tournament match -> full real battle detail including detailed log; person detail navigation.
4. Do not edit production files. If any required surface is absent or any assertion fails, publish exact FIX_REQUIRED assertions and evidence rather than weakening/skipping coverage.
5. READY only when the full canonical wireframe harness passes on one clean published master HEAD.
6. Publish `_handoff-artifacts/results/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2/result.md` with exact tested HEAD, clean-tree status, command, pass count, and terminal verdict.
7. Drive/local mirror absence is never terminal and is never permission to pause/disable.
