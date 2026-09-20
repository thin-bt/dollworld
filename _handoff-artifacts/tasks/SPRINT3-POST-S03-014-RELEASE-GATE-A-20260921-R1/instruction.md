# SPRINT3-POST-S03-014-RELEASE-GATE-A-20260921-R1

state: PREPARED
lane: A
mode: RELEASE_GATE_EVIDENCE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Objective

Run a fresh post-S03-014 Sprint3 release-gate/evidence pass on current canonical master without colliding with B2 S03-009. This is executable now and must produce a terminal canonical result, not status-only work.

## Required work

1. Fresh-read current master and the latest Sprint3 results, including S03-014 and the Role3 scope-closure contradiction audit.
2. Claim Cursor A ACTIVE before repository changes.
3. Run root `npm run check` on clean/current master. If it fails from Sprint3-owned deterministic formatting/type/test issues that are safely repairable without touching B2 S03-009 ownership, fix them and rerun. Do not mask failures.
4. Run `npm run build -w @shared-world/simulation-core` and the current focused Sprint3 mentorship/runtime regression suite sufficient to cover S03-012 through S03-014 boundaries. Record exact commands and pass/fail counts.
5. Verify S03-010 and S03-011 remain present on canonical master; do not reimplement them. Verify S03-014 live enrollment materialization remains present.
6. Do NOT declare Sprint3 formal READY while B2 S03-009 is non-terminal or the Role3 scope contradiction remains unresolved. Instead record product/test gate health separately from scope-completeness gate.
7. Publish `_handoff-artifacts/results/SPRINT3-POST-S03-014-RELEASE-GATE-A-20260921-R1/result.md` with terminal READY if this evidence task itself completes, even if overall Sprint3 remains BLOCKED on B2/scope closure. Include master SHA, exact checks, blockers, and next bounded release action.
8. Return Cursor A to IDLE with last-terminal/result metadata after publishing the result.

## Collision guard

- Do not edit B2 control/task/result artifacts.
- Do not implement or modify S03-009 original-technique weekly runtime wiring owned by B2.
- Avoid gameplay semantic changes unless required to repair a directly observed release-gate regression and demonstrably outside B2 ownership.
