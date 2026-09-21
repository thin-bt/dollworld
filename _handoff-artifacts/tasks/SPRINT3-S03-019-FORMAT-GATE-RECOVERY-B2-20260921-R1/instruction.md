# SPRINT3-S03-019-FORMAT-GATE-RECOVERY-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: IMPLEMENTATION_VERIFICATION
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT3-S03-018-FORMAL-CLOSE-INDEPENDENT-AUDIT-B2-20260921-R1
paired-a-task: SPRINT3-S03-017-LIVE-COMPETITIVE-RECORD-WIRING-A-20260921-R1

## Objective

Recover the canonical root format gate without conflicting with A-owned S03-017. Fresh S03-018 evidence found `npm run check` stops at `format:check` on five S03-015-touched files. Apply formatting-only fixes, verify they are semantic-neutral, publish to canonical master, and report readback evidence.

## Required fresh reads before changes

1. `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
2. `_handoff-artifacts/audit/CURSOR_B2_ACTIVE_TASK.md`
3. `_handoff-artifacts/control/CURSOR_B2_INBOX.md`
4. `_handoff-artifacts/control/CURSOR_A_INBOX.md` only to preserve non-conflict boundary
5. `_handoff-artifacts/results/SPRINT3-S03-018-FORMAL-CLOSE-INDEPENDENT-AUDIT-B2-20260921-R1/result.md`
6. current `origin/master` versions of the five target files below

## Exact product scope

Formatting-only changes are allowed in:
- `packages/simulation-core/src/sprint1/battle-detailed-log-replay.ts`
- `packages/simulation-core/src/sprint1/create-battle-state.ts`
- `packages/simulation-core/src/sprint1/finalize-battle-result.ts`
- `packages/simulation-core/src/sprint3/generated-technique-battle-consumption.test.ts`
- `packages/simulation-core/src/sprint3/generated-technique-catalog-overlay.ts`

Do not edit S03-017 competitive-record wiring surfaces unless one of the exact five paths above overlaps; if A changes a target concurrently, fetch/rebase and preserve A semantics.

## Execution

1. Claim B2 ACTIVE for this exact task.
2. Fetch latest `origin/master` immediately before edits.
3. Re-run `npm run format:check` (or repository-equivalent) once to confirm current failing set. If already green, publish verification-only terminal result and do not manufacture a diff.
4. Run repository Prettier formatting only on the still-failing target files. No hand semantic edits.
5. Prove semantic neutrality with a whitespace-insensitive diff and focused S03-015 generated-technique battle-consumption tests.
6. Run `npm run typecheck -w @shared-world/simulation-core`.
7. Run root `npm run format:check` again. If green, run root `npm run check`; if root check then fails elsewhere, record the exact next blocker without broadening scope.
8. Commit/push only the bounded formatting delta plus canonical result/control updates. Read back target files/result from GitHub `master`.
9. Return B2 lane to IDLE only after terminal result publication.

## Non-conflict / prohibitions

- A owns `SPRINT3-S03-017-LIVE-COMPETITIVE-RECORD-WIRING-A-20260921-R1`; do not duplicate or alter its implementation.
- No Sprint4 work.
- No lint-rule/tsconfig/test weakening, no skips, no gameplay/config/spec changes.
- Do not run repo-wide `prettier --write .`; only the confirmed failing target set.
- Do not modify Cursor A control state.

## READY criteria

- canonical `master` has no format failure on the bounded five-file set;
- focused S03-015 test PASS;
- simulation-core typecheck PASS;
- root `format:check` PASS;
- root `npm run check` result recorded (PASS or exact residual blocker outside this bounded slice);
- terminal result published at `_handoff-artifacts/results/SPRINT3-S03-019-FORMAT-GATE-RECOVERY-B2-20260921-R1/result.md` with commit SHA/readback evidence.
