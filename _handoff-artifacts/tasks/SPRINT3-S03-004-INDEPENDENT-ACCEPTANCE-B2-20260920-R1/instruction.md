# SPRINT3-S03-004-INDEPENDENT-ACCEPTANCE-B2-20260920-R1

state: PREPARED
lane: B2
sprint: Sprint3
priority: IMMEDIATE
mode: S03_004_INDEPENDENT_ACCEPTANCE
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
required-product-sha: f01d1823c9e40f08c1129001082c9f06f25c515c

## Objective
Independently reaccept the published S03-004 master-intake implementation while lane A continues the non-conflicting S03-005 integration.

## Required work
1. Fresh-read canonical Sprint3 backlog/spec, S03-004 A terminal, and implementation/tests on canonical master.
2. Verify the S03-004 contract: per-master autonomous max, no world-global cap, deterministic accept/reject/defer behavior, S03-003 intakeAcceptance compatibility, and fail-closed behavior for missing/invalid policy.
3. Run the focused simulation-core build/tests needed to independently establish acceptance at or after required product SHA. Do not modify product code unless a concrete S03-004 defect is found.
4. If a concrete S03-004 defect is found, publish FIX_REQUIRED with exact evidence; do not conflict with A's S03-005 files.
5. Otherwise publish READY terminal at `_handoff-artifacts/results/SPRINT3-S03-004-INDEPENDENT-ACCEPTANCE-B2-20260920-R1/result.md` with exact tested SHA, commands, pass counts, and clean-tree evidence.
6. Do not start Sprint4 and do not edit Cursor A control files.

## Terminal
READY only when independent S03-004 acceptance evidence is canonical and reproducible. Otherwise FIX_REQUIRED with exact blocker/evidence.
