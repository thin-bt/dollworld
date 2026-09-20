# SPRINT3-SCOPE-AUTHORITY-RECONCILIATION-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: SPEC_TO_SOURCE_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Purpose
Resolve the canonical Sprint3 scope contradiction without touching B2-owned S03-009 implementation.

## Fresh canonical facts
- `docs/SPEC_PREPARATION_PLAN.md` Sprint 3前 explicitly includes `技継承・独自技・失伝`, and its mini-spec completion rule requires input/output/state update/order/config/invariants/out-of-scope/acceptance tests.
- `docs/SPRINT_3_BACKLOG.md` S03-008 purpose likewise says original-technique research/generation/loss is Sprint3 implementation remainder, but its tail currently labels WeeklyAction research accumulation/world-step wiring and generated-technique/first-use runtime persistence as `Sprint 3 外・後続 wiring`.
- Post-S03-014 release-gate evidence says canonical master still lacks B2 S03-009 and S03-011 and formal Sprint3 is BLOCKED.

## Required work
1. Fresh-read current master, protocol, A/B2 controls, newest Sprint3 task/results, `docs/SPEC_PREPARATION_PLAN.md`, `docs/SPRINT_3_BACKLOG.md`, `docs/specs/15-sprint3-config-schema.md`, and relevant Sprint3 source/tests.
2. Claim lane A ACTIVE for this exact task before writes.
3. Reconcile the contradiction in canonical docs using existing authority only: do not invent a scope reduction. Unless a newer explicit canonical authority exists, treat runtime wiring needed to make `技継承・独自技・失伝` state-changing/live as Sprint3 closure work.
4. Update `docs/SPRINT_3_BACKLOG.md` so remaining S03-009/S03-010/S03-011 (or their canonical current equivalents) and dependencies/status are explicit; remove/replace the contradictory `Sprint 3 外` classification where unsupported. Preserve already-published S03-010 evidence and do not claim S03-009/S03-011 complete unless present on master.
5. If needed, minimally update the Sprint3 config/spec doc to make the closure boundary unambiguous, without changing game semantics or bumping the user-fixed main SPEC version.
6. Run bounded docs/source consistency checks and publish a terminal result with exact master SHA and remaining blockers.
7. Publish all docs/result changes to canonical master and verify readback before READY.

## Collision guard
- Do NOT edit B2 control/task/result artifacts.
- Do NOT implement or modify B2-owned S03-009 product source.
- Do NOT implement S03-011 while its S03-009 dependency is absent from canonical master.
- Do NOT change Sprint2 product/UI scope.

## READY condition
Canonical master no longer contains an unsupported Sprint3 scope contradiction for original-technique runtime closure; backlog truthfully names what remains and terminal evidence is published/read back.
