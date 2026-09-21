# SPRINT3-FINAL-FORMAT-BLOCKER-REPAIR-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: PRODUCT_REPAIR_AND_GATE_UNBLOCK
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Objective

Remove the sole known fresh-root-gate blocker reported by `SPRINT2-SPRINT3-STATUS-AUTHORITY-RECONCILIATION-B2-20260921-R1`: Prettier failure in `sprint3-ordinary-session-activation.test.ts`, without changing production behavior. Then publish the minimal formatting-only repair to canonical `master` and produce terminal evidence.

## Required fresh reads

1. `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
2. `_handoff-artifacts/control/SPRINT2_STATUS.md`
3. `_handoff-artifacts/control/SPRINT3_STATUS.md`
4. `_handoff-artifacts/results/SPRINT2-SPRINT3-STATUS-AUTHORITY-RECONCILIATION-B2-20260921-R1/result.md`
5. `_handoff-artifacts/results/SPRINT3-S03-043-ORDINARY-SESSION-ACTIVATION-CANONICAL-PUBLISH-B2-20260921-R1/result.md`
6. current canonical `master` version of the failing test and formatting config/scripts.

Do not read or write Cursor A control files. A owns the separate full root-gate evidence task; avoid conflicting edits.

## Work

- Claim B2 ACTIVE through the SDK executor path before changes.
- Reproduce the formatting failure once on fresh canonical `master` using the narrowest relevant formatter/check command.
- Apply only the formatter-equivalent change required to make `sprint3-ordinary-session-activation.test.ts` compliant. No semantic/product/test-expectation changes.
- Run the narrow formatting verification and `npm run format:check` once each. If either exposes a different product defect, stop and report the exact blocker rather than broadening scope.
- If green, publish the minimal formatting-only commit to canonical `master` without dropping later master changes.
- Write terminal result to `_handoff-artifacts/results/SPRINT3-FINAL-FORMAT-BLOCKER-REPAIR-B2-20260922-R1/result.md`, binding origin master, publication commit, commands, exits, and changed files.
- Return B2 Inbox to IDLE only after canonical terminal publication.

## Workspace hygiene

Any transient worktree/scratch must be under `_handoff-artifacts/control-tmp/`; never create root-level transient directories under `_handoff-artifacts/`. Clean task scratch when finished.

## Acceptance

READY only if the known Prettier blocker is removed on canonical master, formatting checks are green, the change is formatting-only, and terminal evidence is published. Otherwise BLOCKED with exact evidence.