# PM executor terminal-publication recovery routing

task-key: PM-EXECUTOR-TERMINAL-PUBLICATION-RECOVERY-20260925-R1
state: READY
control-authority: GitHub
createdAt: 2026-09-25T06:00:00+09:00
owner: Role1 / executor-control recovery
scope: control-plane only; do not modify product bytes

## Fresh evidence

- B2 canonical Inbox remains PREPARED for `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`.
- B2 Active returned IDLE and records that same task as last-completed.
- B2 heartbeat records a real agent run but `lastError: githubPublish:NO_LOCAL_TERMINAL`; canonical terminal result is absent.
- Repeated invoke cycles have reproduced the same publication failure, so timestamp-only/reinvoke-only handling is not sufficient.
- A remains ACTIVE for `SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1`, with the latest canonical heartbeat still at RECOVERY_INVOKING/INVOKING; do not overwrite A while this ACTIVE state remains authoritative.

## Required recovery

1. Fresh-read protocol + A/B2 Inbox + Active + heartbeat + exact result paths.
2. For B2, recover the missing terminal-generation/publication path itself. Do not merely rewrite Inbox timestamps or perform another blind invoke.
3. Determine whether the completed agent run produced usable local evidence/output; if yes, publish an exact-task terminal result to `_handoff-artifacts/results/UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1/result.md` with evidence references. If no terminal can be reconstructed, record the concrete executor-side reason and repair the executor terminal handoff before retrying.
4. Preserve GitHub as authority; Drive/local are compatibility only.
5. For A, respect invoke-timeout behavior: reconcile the stale ACTIVE/heartbeat against subsequent executor/process/result state. Do not declare unclaimed and do not overwrite its PREPARED Inbox while ACTIVE remains matching.
6. After recovery, read back GitHub canonical state and ensure any terminal result binds the exact task-key.
7. Do not change Sprint2/Sprint3 to CLOSED from this control recovery. Completion remains governed by current-master playable UI evidence and all binding residuals.

## Completion

PASS only when the executor terminal-publication defect is concretely repaired or a canonical exact-task terminal is recovered with verifiable evidence. A new invoke timestamp alone is not PASS.
