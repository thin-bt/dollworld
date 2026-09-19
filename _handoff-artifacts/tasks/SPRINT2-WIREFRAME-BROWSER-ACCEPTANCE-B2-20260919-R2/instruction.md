# SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2

state: PREPARED
sprint: Sprint2
lane: B2
priority: IMMEDIATE
mode: WIREFRAME_BROWSER_ACCEPTANCE
control-authority: GitHub
updatedAt: 2026-09-19T21:36:37+09:00
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R1
paired-a-task: SPRINT2-DETAILED-BATTLE-LOG-PUBLICATION-A-20260919-R2
non-overlap: ACCEPTANCE_TESTS_ONLY_NO_PRODUCT_EDITS
recovery: ROLE3_REBIND_EXISTING_R2_AFTER_STALE_R1_INBOX

## Objective
Own full Sprint2 wireframe browser acceptance against canonical published master. Old reduced 7/7 remains regression evidence only. This R2 is rebound to the current A detailed-battle-log publication task; no Sprint3/4 scope is authorized.

## Required execution
1. Claim B2 ACTIVE before changes.
2. Fresh-sync canonical master and record the exact HEAD tested.
3. Run/maintain dedicated Sprint2 wireframe browser acceptance for annual schedule/year switch/current time/rank/category/week; tournament detail; dense participants; round-robin standings + pair matrix; knockout/results; winner/placements; series history/historical winners; annual earnings ranking + multi-year switch + person navigation; promotion result; person rank history/source navigation; tournament match -> full real battle detail including detailed log once A publishes it; person detail navigation.
4. Do not edit production files. If the current A publication is not yet on master, publish exact FIX_REQUIRED assertions rather than weakening/skipping coverage.
5. READY only when all wireframe assertions pass on one clean published master HEAD.
6. Publish `_handoff-artifacts/results/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2/result.md` with exact HEAD and checks.
7. Drive/local mirror absence is never terminal.
