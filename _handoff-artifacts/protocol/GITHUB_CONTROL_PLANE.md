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
7. Sprint2 completion-first remains in force; no Sprint3/4 production before formal Sprint2 completion.

## Canonical path map

- protocol: `_handoff-artifacts/protocol/`
- lane state: `_handoff-artifacts/control/`
- task instructions: `_handoff-artifacts/tasks/<task-key>/instruction.md`
- task results: `_handoff-artifacts/results/<task-key>/result.md`

## State transition contract

For a task dispatch:
`IDLE -> PREPARED -> ACTIVE -> TERMINAL -> IDLE`

PREPARED must include task-key, lane, sprint, mode, authority ref, and exact instruction path.
ACTIVE must bind the exact task-key.
TERMINAL must include result class and evidence references.

## Migration bridge

Until the local Cursor executor is changed to poll GitHub directly, the PM may mirror GitHub PREPARED state into the old Drive/local Inbox solely as a compatibility bridge. GitHub remains canonical; a failed mirror may not invalidate or delete the GitHub task.

The bridge itself must be removed once GitHub polling/materialization is operational.

## Workspace hygiene

- The project root `_handoff-artifacts/` is for canonical top-level structure only. Do not create transient `.tmp-*`, stash/asides, verification worktrees, publish scratch, merge scratch, or recovery scratch directly under it.
- All transient local/Drive scratch must live under `_handoff-artifacts/control-tmp/` (or an explicitly task-scoped descendant). Temporary artifacts must be cleaned up or archived after use; creating another root-level temp directory is a control defect that must be corrected in the same run.
- Historical recovery bundles and obsolete verification sandboxes belong under `_handoff-artifacts/audit/archive/`, not at project root. Moving them is organizational only and does not make them canonical authority.
