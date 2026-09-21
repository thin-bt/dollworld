# PM pickup health diagnosis — 2026-09-21 18:03 JST

control-authority: GitHub `thin-bt/dollworld` / `master`
status: RUNTIME_PICKUP_STALLED

## Fresh-read facts

- Cursor A canonical Inbox remains `PREPARED` for `SPRINT2-REOPEN-CORE-LOOP-REPAIR-A-20260921-R1`, dispatched 17:03:50 JST.
- Cursor B2 canonical Inbox remains `PREPARED` for `SPRINT3-S03-039-SPRINT2-REPAIR-REGRESSION-GUARD-B2-20260921-R1`, dispatched 17:39:22 JST.
- Historical GitHub Active mirrors are both `IDLE`; neither binds the current task-key.
- Current canonical `pickup.mjs` evaluates `PREPARED + Active IDLE` as `invoke: true / ACTIVE_IDLE`.
- Current canonical executor source fetches the GitHub canonical Inbox first and lets `github-remote` drive pickup even if local mirror writing fails.
- Therefore neither current task should require a PM timestamp rewrite or REDISPATCH marker to be eligible.
- `_handoff-artifacts/` root contains only canonical top-level structure; no root transient scratch defect was found.

## Diagnosis

The canonical dispatch and canonical pickup logic are internally consistent. The prolonged unclaimed PREPARED states are therefore not explained by task-key completion suppression, cooldown eligibility, or missing canonical dispatch.

The remaining fault domain is executor runtime health / deployed-code freshness / daemon tick execution / API-key or instruction-materialization runtime state. Canonical GitHub source alone cannot prove which of those local runtime conditions is failing.

## PM action

- Do **not** rewrite either Inbox timestamp merely to retrigger pickup.
- Preserve A and B2 task keys as-is.
- Treat the next executor-side observation as a runtime-health incident: verify daemon alive/tick output, the local executor revision contains GitHub-first `fetchGitHubFileText` pickup, `CURSOR_API_KEY` is present, and instruction materialization succeeds.
- If the runtime is on current source and healthy, it must claim these tasks on the next poll; otherwise repair the executor/runtime path rather than redispatching work.
