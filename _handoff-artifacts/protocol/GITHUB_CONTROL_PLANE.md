# GITHUB_CONTROL_PLANE

status: ACTIVE
authority: GitHub `thin-bt/dollworld` / `master`

## Operational rule

1. PM/Role/GPT reads GitHub canonical files first.
2. New instructions, lane state, results, and protocol changes are written to GitHub canonical paths.
3. Drive/local mirrors are compatibility surfaces only during migration.
4. A mirror failure is recovery work, not a terminal state.
5. Do not disable or stop any dollworld automation because a local/Drive folder is absent.
6. Only explicit user PAUSE/STOP authorizes disabling a loop.
7. Sprint status is governed by the binding canonical status artifacts, not stale historical prose. `_handoff-artifacts/control/SPRINT2_STATUS.md` is currently `CLOSED` after reopen re-acceptance; `_handoff-artifacts/control/SPRINT3_STATUS.md` is currently `READY_FOR_FORMAL_CLOSE`. Sprint3 must not be labeled `CLOSED` except by the explicit PM/control transition required by that status artifact and `docs/SPRINT_3_BACKLOG.md`. If a status artifact changes later, its fresh canonical value governs this rule.

## Canonical path map

- protocol: `_handoff-artifacts/protocol/`
- lane state: `_handoff-artifacts/control/`
- sprint status: `_handoff-artifacts/control/SPRINT2_STATUS.md` (and equivalent future sprint status files)
- task instructions: `_handoff-artifacts/tasks/<task-key>/instruction.md`
- task results: `_handoff-artifacts/results/<task-key>/result.md`

## Execution-state contract

Cursor execution lanes A/B2 use canonical GitHub inbox state for dispatch:
`IDLE -> PREPARED -> TERMINAL -> IDLE`.

While the compatibility executor is still in use, transient ACTIVE claim/execution state may be held in executor-local / Drive compatibility state. It is not a second source of authority. A terminal GitHub result must bind the exact task-key and evidence.

Role1/Role2/Role3 are direct-execution automation roles. They have no canonical ROLE*_INBOX queue and must not wait on one. Historical ROLE*_INBOX files are retired and removed from the live control directory.

PREPARED must include task-key, lane, sprint, mode, authority ref, and exact instruction path.
TERMINAL must include result class and evidence references.

## Migration bridge

Until the local Cursor executor is changed to poll GitHub directly, the PM may mirror GitHub PREPARED state into old Drive/local Cursor Inbox surfaces solely as a compatibility bridge. GitHub remains canonical; a failed mirror may not invalidate or delete the GitHub task.

The bridge itself must be removed once GitHub polling/materialization is operational.

## Workspace hygiene

- The project root `_handoff-artifacts/` is for canonical top-level structure only. Do not create transient `.tmp-*`, stash/asides, verification worktrees, publish scratch, merge scratch, or recovery scratch directly under it.
- All transient local/Drive scratch must live under `_handoff-artifacts/control-tmp/` (or an explicitly task-scoped descendant). Temporary artifacts must be cleaned up or archived after use; creating another root-level temp directory is a control defect that must be corrected in the same run.
- Historical recovery bundles and obsolete verification sandboxes belong under `_handoff-artifacts/audit/archive/`, not at project root. Moving them is organizational only and does not make them canonical authority.
