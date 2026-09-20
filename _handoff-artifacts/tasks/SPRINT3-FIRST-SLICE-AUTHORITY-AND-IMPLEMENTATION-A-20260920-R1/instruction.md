# SPRINT3-FIRST-SLICE-AUTHORITY-AND-IMPLEMENTATION-A-20260920-R1

state: PREPARED
priority: IMMEDIATE
lane: A
sprint: Sprint3
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT3-KICKOFF-IMPLEMENTATION-A-20260920-R1
predecessor-terminal: FIX_REQUIRED / SPRINT3_KICKOFF_AUTHORITY_GAP

## Binding PM authority

The prior FIX_REQUIRED is accepted as an authority gap. This task closes that gap and immediately resumes implementation; do not stop merely because `docs/SPRINT_3_BACKLOG.md` or a root `CHANGELOG.md` was previously absent.

Sprint3 first-slice ordering is now fixed as follows:

1. **S03-001 — Sprint3 mentorship/config foundation**: establish the smallest typed Sprint3 configuration/domain validation shell needed by later mentorship, enrollment, and teaching work.
2. Do **not** invent balance thresholds for 師匠資格. Any threshold explicitly deferred by `docs/SPEC.md` remains configurable/deferred rather than hard-coded.
3. Do **not** implement the explicit weekly `teach` action, enrollment AI, or Sprint4 scope in S03-001 unless required only as a type/interface boundary with no speculative behavior.
4. Preserve Sprint2 visual/product baseline and all accepted behavior.

## Required work

- Fresh-read `docs/SPEC.md`, `docs/SPEC_PREPARATION_PLAN.md`, `docs/specs/09-technique-system.md`, `docs/specs/10-training-and-learning.md`, and existing Sprint1/Sprint2 configuration/validation patterns.
- Create `docs/SPRINT_3_BACKLOG.md` with S03-001 first and the remaining accepted Sprint3 themes ordered after it. Record scope, inputs/outputs, non-goals, and acceptance checks. This task itself is the PM authority for that ordering.
- Add the minimal versioned Sprint3 mini-spec/config contract needed for S03-001, referencing existing accepted SPEC material rather than inventing gameplay rules.
- Implement S03-001 in production code using the repository's established config/domain validation conventions.
- Add focused tests for defaults/validation/serialization or equivalent public contract behavior.
- Run the relevant typecheck/tests/build checks and publish the implementation to canonical `master`.
- Publish terminal result at `_handoff-artifacts/results/SPRINT3-FIRST-SLICE-AUTHORITY-AND-IMPLEMENTATION-A-20260920-R1/result.md`, including product SHA, files changed, checks, and the next unique Sprint3 product gap.

## Acceptance

READY only if canonical master contains both the planning authority/backlog and a tested S03-001 implementation. FIX_REQUIRED must name a concrete implementation blocker and the next executable action. No status-only terminal.

## Collision rules

A owns S03-001 product/planning publication for this task. Do not edit Cursor B2 control files. Do not undo Sprint2 accepted fixes. No Sprint4 work.
