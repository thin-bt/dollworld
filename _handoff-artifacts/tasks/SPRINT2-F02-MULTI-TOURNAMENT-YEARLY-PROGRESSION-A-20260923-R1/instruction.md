# SPRINT2-F02-MULTI-TOURNAMENT-YEARLY-PROGRESSION-A-20260923-R1

state: PREPARED
lane: A
sprint: Sprint2
mode: PRODUCT_FIX
priority: DEADLINE_CRITICAL
authority: GitHub `thin-bt/dollworld` / `master`

## Binding authority
Fresh-read and obey `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and `_handoff-artifacts/control/SPRINT2_STATUS.md` before work. Work only from fresh canonical `master`. Do not infer CLOSED from historical evidence.

## Objective
Close the binding Sprint2 F-02 blocker: ordinary weekly progression must process every scheduled tournament that becomes due, exactly once, instead of selecting only the first normal F-rank tournament / retaining only a single finished competition instance.

## Required product behavior
1. Every tournament week crossed by ordinary weekly progression leaves that tournament completed exactly once.
2. No tournament whose scheduled week is in the past remains `開催予定`.
3. Ranking values evolve across successive tournaments when results differ; prove values, not merely UI element presence.
4. Crossing a year boundary exposes valid historical-year ranking navigation/data.
5. Preserve intended automatic resolution when advancing through a tournament week; do not turn F-02 into a manual-start requirement.
6. Preserve existing Sprint3 mentorship/teaching behavior and current release-gate lineage.

## Execution
- Inspect current source before editing; identify the current equivalents of `findUi009PlayableScheduleSlot` and the session competition persistence/store.
- Implement the smallest coherent production repair that supports multiple scheduled tournament instances/results through the ordinary weekly path.
- Add/update focused deterministic tests proving the four value/temporal invariants above, including at least two distinct tournaments and a year crossing.
- Run focused tests, relevant typecheck, and production web build. If feasible in the same run, perform ordinary UI/browser acceptance that advances through multiple tournament weeks and the year boundary.
- Do not weaken assertions, skip suites, or loosen timeouts to manufacture PASS.
- If product bytes are published, record the exact product SHA. A later fresh root gate may be separate; do not claim it unless actually executed on that product SHA.

## Ownership / non-conflict
B2 currently owns `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`; do not modify or consume that task or its browser-evidence artifacts. Avoid unrelated UI screenshot work.

## Terminal publication
Publish `_handoff-artifacts/results/SPRINT2-F02-MULTI-TOURNAMENT-YEARLY-PROGRESSION-A-20260923-R1/result.md` with PASS / FIX_REQUIRED, exact changed paths, commands/tests and counts, product SHA if any, browser evidence if run, and remaining blockers. Then set A terminal according to protocol so control can consume it. Never assign Sprint2 or Sprint3 CLOSED yourself.