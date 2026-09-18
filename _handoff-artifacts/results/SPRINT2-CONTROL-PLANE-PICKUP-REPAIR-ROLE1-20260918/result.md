# SPRINT2-CONTROL-PLANE-PICKUP-REPAIR-ROLE1-20260918

state: READY
terminal: SPRINT2_CONTROL_PLANE_PICKUP_REPAIR_ROLE1_READY
lane: A
control-authority: GitHub
updatedAt: 2026-09-18T17:21:11+09:00
test-result: 8/8 PASS

## Summary

Fixed two CRITICAL control-plane pickup defects so GitHub-canonical PREPARED and instructions win over stale local mirrors.

## Defects repaired

1. `pollLane()` only fetched GitHub inbox when local was not PREPARED — stale local PREPARED shadowed newer GitHub PREPARED indefinitely (`NOOP_ALREADY_COMPLETE_SAME_TASK` on 20260917 while GitHub had R13).
2. Pickup required a pre-existing local instruction file — GitHub `tasks/<task-key>/instruction.md` was not materialized as the primary source.

## Changes

- `cursor-inbox-executor/lib/authoritative-inbox.mjs` — select live GitHub remote inbox as authoritative whenever remote state is present.
- `cursor-inbox-executor/lib/ensure-instruction.mjs` — fetch + materialize GitHub instruction when local file is absent.
- `cursor-inbox-executor/cursor-inbox-executor.mjs` — always attempt GitHub inbox fetch each poll; use `ensureInstructionAvailable` before INSTRUCTION_MISSING; best-effort mirror write of remote control file.
- `cursor-inbox-executor/tests/pickup-repair.test.mjs` — regression coverage for stale-local shadow, GitHub materialize, and GitHub-unavailable local fallback.

## Verification

```
cd _handoff-artifacts/audit/cursor-inbox-executor
npm test
```

Result: **8/8 PASS** (4 prior + 4 new).

### Live host check (pre-commit)

| Check | Result |
|-------|--------|
| local audit task-key | SPRINT2-BROWSER-FIX-A-20260917 (stale) |
| GitHub remote task-key | SPRINT2-BROWSER-FIX-A-20260918-R13 |
| selected after repair | **R13** / source=github-remote |
| evaluatePickup | invoke=true / ACTIVE_IDLE |
| instruction | github-materialized to tasks/...-R13/instruction.md |

## Acceptance mapping

| Criterion | Status |
|-----------|--------|
| stale local PREPARED/task A + newer GitHub PREPARED/task B => B | PASS (unit + live) |
| local instruction missing + GitHub present => pickup proceeds | PASS (unit + live materialize) |
| GitHub unavailable => local fallback | PASS (unit) |
| Sprint2 product surfaces untouched | PASS |

## Non-goals honored

No Sprint3/4. No A/B2 product implementation edits in this repair commit.
