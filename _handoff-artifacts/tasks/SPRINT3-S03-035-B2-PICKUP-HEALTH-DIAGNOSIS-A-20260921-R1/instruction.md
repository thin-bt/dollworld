# SPRINT3-S03-035-B2-PICKUP-HEALTH-DIAGNOSIS-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: DEADLINE_CRITICAL_EXECUTOR_RECOVERY
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
authority-ref: master

## Objective

Diagnose the current Cursor SDK executor/pickup health for B2 without rewriting or redispatching the already-canonical S03-034 Inbox. At PM fresh-read, B2 Inbox is PREPARED for S03-034 while canonical audit active state is IDLE. Determine whether this is normal poll latency, stale/local executor state, or a concrete pickup defect, and repair only a proven bounded executor defect.

## Required fresh reads

1. `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
2. current A/B2 Inbox state
3. `_handoff-artifacts/audit/CURSOR_B2_ACTIVE_TASK.md`
4. S03-034 instruction/result existence
5. current executor/pickup source and tests on canonical master
6. current master HEAD and recent executor/control commits

## Work

1. Do NOT rewrite timestamps or content in `CURSOR_B2_INBOX.md`; S03-034 is already the authoritative PREPARED dispatch.
2. Inspect the actual SDK executor pickup path used for B2: GitHub Inbox materialization/polling, PREPARED eligibility, ACTIVE/IDLE handling, cooldown/retrigger behavior, and task-key/result detection.
3. Use available heartbeat/log/test evidence to distinguish normal latency from an executor defect. Do not infer a daemon failure solely from historical `CURSOR_B2_ACTIVE_TASK.md`, because protocol permits transient ACTIVE state to be local/Drive compatibility state.
4. If a deterministic source defect is found, make the smallest executor-only repair, add/run focused tests, publish to canonical master, and record exact evidence. Do not touch Sprint3 product implementation.
5. If source is correct but local daemon/runtime sync is the blocker, publish the exact diagnosis and recovery command/path evidence available; do not endlessly redispatch S03-034.
6. If S03-034 becomes terminal during this task, consume that fact in the result and stop recovery work; do not duplicate its formal-close audit.
7. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-035-B2-PICKUP-HEALTH-DIAGNOSIS-A-20260921-R1/result.md`; return A to IDLE according to executor convention.

## Collision / hygiene guard

- B2 owns S03-034 formal-close audit; A must not edit its result or perform duplicate formal-close work.
- Do not edit B2 Inbox/active files.
- Do not start Sprint4.
- No transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` and clean/archive after use.
- Correct any discovered root-level transient scratch defect in the same pickup.

## Acceptance

Terminal must provide an evidence-backed pickup-health classification and either a tested bounded executor repair or proof that no canonical source repair is required. Status-only completion is forbidden.
