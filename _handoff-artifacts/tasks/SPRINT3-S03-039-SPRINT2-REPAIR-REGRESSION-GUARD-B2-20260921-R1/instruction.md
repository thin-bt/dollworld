# SPRINT3-S03-039-SPRINT2-REPAIR-REGRESSION-GUARD-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: PRODUCT_REGRESSION_GUARD
priority: DEADLINE_CRITICAL
authority: GitHub thin-bt/dollworld master
binding-status: _handoff-artifacts/control/SPRINT3_STATUS.md

## Why this task exists
Sprint3 is currently BLOCKED_BY_SPRINT2_REOPEN. A is actively repairing the ordinary weekly tournament lifecycle. Sprint3's accepted production work must be preserved while that predecessor repair changes the same weekly/world progression boundary. The canonical Sprint3 backlog explicitly requires weekly runtime closure and preservation of the Sprint2 visual/tournament baseline.

## Objective
Add/strengthen a narrow non-conflicting regression boundary proving that ordinary weekly/world progression can execute the accepted Sprint3 mentorship/teaching/OTL runtime without being skipped, duplicated, reset, or made manual by the reopened Sprint2 tournament lifecycle repair.

## Required fresh reads
1. _handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md
2. _handoff-artifacts/control/SPRINT2_STATUS.md
3. _handoff-artifacts/control/SPRINT3_STATUS.md
4. docs/SPRINT_3_BACKLOG.md and docs/specs/15-sprint3-config-schema.md
5. A's current task SPRINT2-REOPEN-CORE-LOOP-REPAIR-A-20260921-R1; do not edit A-owned implementation surfaces unless strictly necessary for a test seam.
6. Current master weekly/world progression source and Sprint3 runtime integration tests.

## Work
- Trace the production call order at the ordinary week-advance boundary: weekly training/mentorship/teaching/OTL work versus tournament schedule/staging/battle/completion/ranking work.
- Identify a concrete regression risk introduced by the reopened Sprint2 repair (skip, double-run, state overwrite, ordering drift, replay nondeterminism, or manual-only path).
- Where feasible, implement the smallest regression test/guard on B2-owned or neutral test surfaces. Prefer a production-boundary integration test over another pure-unit test.
- Prove at minimum: a normal week with tournament work still executes Sprint3 weekly state exactly once; a non-tournament week remains unchanged; repeated/replay execution remains deterministic/idempotent according to existing contracts.
- Do not invent new Sprint3 semantics, reopen accepted S03-001..030 scope, or alter formal-close state.
- Do not duplicate B2's completed ranking/battle-presentation work and do not compete with A's core-loop implementation.
- Run the narrow relevant tests/checks. If A's in-flight implementation means the guard cannot yet pass, publish precise BLOCKED evidence naming the missing production seam and expected assertion; do not fake READY.

## Terminal result
Publish _handoff-artifacts/results/SPRINT3-S03-039-SPRINT2-REPAIR-REGRESSION-GUARD-B2-20260921-R1/result.md with exact changed paths, tests, master SHA/evidence, and READY or BLOCKED. GitHub master publication/readback is required for READY.
