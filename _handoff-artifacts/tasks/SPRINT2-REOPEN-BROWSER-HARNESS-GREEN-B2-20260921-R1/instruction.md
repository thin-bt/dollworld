# SPRINT2-REOPEN-BROWSER-HARNESS-GREEN-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint2
mode: TEST_HARNESS_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
authority-ref: master

## Objective

Convert the already product-PASS targeted Sprint2 browser re-acceptance into a reproducible green automated gate on canonical master. The predecessor result identified one harness-only false negative: the spec expects `ranking-load-status[data-status=ready]`, while successful RankingPage rendering intentionally exposes the ranking table/year navigation instead.

## Required execution

1. Fresh-read GITHUB_CONTROL_PLANE.md, SPRINT2_STATUS.md, SPRINT3_STATUS.md, both lane inboxes, predecessor browser result, and current master.
2. Claim B2 ACTIVE through the canonical lane protocol. Do not modify A task/control state.
3. Materialize the predecessor targeted browser spec from its control-tmp/evidence source if available. Correct only the false ready-state assertion: prove success with the canonical successful ranking UI (`ranking-annual-ranking-table` plus ranking year navigation or equivalent stable accepted success surface). Do not weaken assertions for the ordinary weekly/tournament/battle/result/ranking chain.
4. Publish the corrected targeted e2e spec into the normal canonical test tree on master if consistent with repository conventions; do not leave the only copy in control-tmp.
5. Run the corrected targeted Playwright Chrome gate once under the bounded retry policy. Run any directly affected focused test/typecheck needed for the test publication. Do not modify product behavior merely to make the harness green.
6. Publish terminal evidence under `_handoff-artifacts/results/SPRINT2-REOPEN-BROWSER-HARNESS-GREEN-B2-20260921-R1/result.md` binding the exact master/product/test commit and command outcomes.
7. Set B2 TERMINAL and consume back to IDLE after canonical result readback.

## Non-conflict

A owns `SPRINT2-REOPEN-FINAL-ROOT-GATE-A-20260921-R1`; do not run or rewrite A control state. This task is test-harness publication/evidence only.

## Workspace hygiene

Never create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/`. Correct any observed root-level transient defect in the same pickup.

## Terminal classes

- READY — corrected canonical targeted browser gate exits green and evidence is published.
- BLOCKED_REAL_PRODUCT_FAILURE — corrected harness exposes a reproducible product failure; provide exact failing stage.
- BLOCKED_ENVIRONMENT — browser gate cannot execute for a concrete environment reason.
