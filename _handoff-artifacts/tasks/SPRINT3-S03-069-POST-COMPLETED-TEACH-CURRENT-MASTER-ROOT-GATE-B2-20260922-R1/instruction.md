# SPRINT3-S03-069-POST-COMPLETED-TEACH-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: RELEASE_EVIDENCE
authority: GitHub thin-bt/dollworld master
preparedAt: 2026-09-22T16:55:00+09:00
baseline-master-readback: 602999bf2dc1e57a8d5588595630a6fb4fc3c288
product-delta: 4a0a80f09faa2c4ace5a8edcbd196d9a48fc229c
priority: DEADLINE_CRITICAL

## Why this task exists

The latest A terminal result `SPRINT3-COMPLETED-TEACH-OUTCOME-SEMANTIC-INVARIANT-A-20260922-R1` published production code at `4a0a80f09faa2c4ace5a8edcbd196d9a48fc229c` and explicitly records that full root `npm run check` was NOT RUN and a post-product fresh root/release gate is required. The historical S03-064 1925/1925 gate predates this product delta and cannot bind current master.

B2 is IDLE. This task is a unique release-evidence task and must not duplicate A product work.

## Required execution

1. Fresh-read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, both sprint status files, this instruction, and current `origin/master` before execution.
2. Claim B2 ACTIVE according to the executor contract.
3. Verify the tested GitHub master contains product commit `4a0a80f09faa2c4ace5a8edcbd196d9a48fc229c` as an ancestor. If master advanced, test the fresh current master, not the stale prepared SHA.
4. Use only `_handoff-artifacts/control-tmp/` for any transient worktree/scratch. Never create root-level transient paths under `_handoff-artifacts/`. Preserve `_handoff-artifacts/tools/**` and obey the stash/cleanup prohibitions in the protocol.
5. Run the current repository root release gate `npm run check` on a clean current-master worktree. Preserve the established S03-049/S03-064 serialization policy where needed for Vitest resource stability. Do not weaken assertions, extend product timeouts merely to force green, skip required suites, or reduce workload.
6. Record exact tested SHA, pass/fail totals, commands, duration/timeout classification, and any serialization policy used.
7. If a real product defect is found, do not paper over it in evidence. Report the exact blocker and leave Sprint3 non-closed; a separate product repair task must own code changes unless the repair is trivially safe and non-conflicting under protocol.
8. Publish terminal evidence to `_handoff-artifacts/results/SPRINT3-S03-069-POST-COMPLETED-TEACH-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1/result.md`, then fresh-read it from GitHub.
9. Do NOT assign Sprint3 `CLOSED`; status transition remains control/PM authority after all binding evidence is current.

## Acceptance

PASS only when a fresh current-master root gate covers the post-`4a0a80f` product delta and terminal GitHub evidence binds the exact tested SHA. Otherwise terminal FAIL/BLOCKED with concrete evidence.
