# SPRINT3-ROOT-CHECK-TYPECHECK-RECOVERY-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: IMPLEMENTATION_VERIFICATION
priority: DEADLINE_CRITICAL

## Authority / fresh evidence
- `docs/SPRINT_3_BACKLOG.md`: Sprint3 fixed completion gate requires root `npm run check` success.
- `_handoff-artifacts/results/SPRINT3-FORMAL-ACCEPTANCE-CHECK-RECOVERY-A-20260920-R1/result.md`: focused Sprint3 93/93 and simulation-core build PASS, but root check is blocked first by ~44 strict TypeScript errors in `packages/simulation-core/tsconfig.test.json`; full tests also have 30 failures.
- B2 currently owns `SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1`; do not touch S03-009 product/control/result files.
- S03-011 is locally prepared but canonically blocked on S03-009; do not attempt S03-011 publication in this task.

## Scope — unique non-conflicting recovery slice
1. Fresh-read current `master` and run `npx tsc -p packages/simulation-core/tsconfig.test.json --noEmit` to capture the current exact error set before editing.
2. Repair the simulation-core **test-project strict typing failures only**. Prefer fixture/helper typing corrections, explicit optional-property omission under `exactOptionalPropertyTypes`, and correctly typed battle/tournament mock sources. Do not weaken tsconfig/compiler strictness, use broad `any`, or change gameplay semantics to satisfy tests.
3. Re-run the simulation-core test-project typecheck until PASS where feasible.
4. Run `npm run typecheck` root/workspaces. If another workspace becomes the first blocker, record exact command/error and stop expansion unless the fix is plainly mechanical and unrelated to B2 S03-009.
5. Run the Sprint3 focused regression bundle and `npm run build -w @shared-world/simulation-core` to prove no Sprint3 semantic regression.
6. If root typecheck becomes PASS, run `npm run check` once to expose the next canonical gate. Do not absorb the known 30-test runtime recovery into this slice; publish exact remaining failure evidence for a separate task.
7. Publish product/test-fixture changes to `master` only if verification supports them.

## Collision guard
- No edits to `packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime-state.ts` or B2 S03-009 weekly/runtime wiring.
- No edits to `_handoff-artifacts/control/CURSOR_B2_INBOX.md`, B2 task, or B2 result.
- No S03-011 battle first-use publication until S03-009 is canonical.
- No Sprint4 work.

## Completion
Publish `_handoff-artifacts/results/SPRINT3-ROOT-CHECK-TYPECHECK-RECOVERY-A-20260921-R1/result.md` with terminal READY/BLOCKED, commit SHA if product changes publish, before/after error counts, exact verification commands, and next root-check blocker if any. Return A to IDLE only after terminal result.