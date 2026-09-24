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
7. Sprint status is governed by the binding canonical status artifacts, not stale historical prose. Fresh-read the status artifacts every run. As of 2026-09-22, `_handoff-artifacts/control/SPRINT2_STATUS.md` is `REOPENED_FIX_REQUIRED` because current-master web production build/start/real-UI playability has not been re-established. Historical CLOSED labels, focused/root tests, or older browser evidence never override a current-master build/start/UI failure. A sprint may be closed only after CURRENT MASTER production build succeeds, the app starts, and the ordinary real user-facing UI flow for that sprint is verified end-to-end. If a status artifact changes later, its fresh canonical value governs this rule.
8. Workspace-preservation is mandatory. Never run `git stash -u`, `git stash --include-untracked`, `git clean -fd`, `git clean -fdx`, or any equivalent command that removes untracked files from the working tree unless the exact affected paths have first been proven disposable and the command is explicitly scoped so that `_handoff-artifacts/tools/**`, local executor launchers, and other persistent operator tools are excluded.
9. Before any merge/rebase/publication recovery that needs a stash, enumerate untracked paths first. If any persistent operator/control file is untracked, preserve it in place or use a tracked-only stash. A broad untracked stash is a control defect.
10. If a stash operation makes a persistent local tool disappear, recovery is immediate and same-run: restore only the affected persistent paths from the stash, verify their local presence, leave the stash intact unless separately authorized, and record the incident. Do not require the user to restore it manually.

## Canonical path map

- protocol: `_handoff-artifacts/protocol/`
- lane state: `_handoff-artifacts/control/`
- sprint status: `_handoff-artifacts/control/SPRINT2_STATUS.md` (and equivalent future sprint status files)
- task instructions: `_handoff-artifacts/tasks/<task-key>/instruction.md`
- task results: `_handoff-artifacts/results/<task-key>/result.md`
- executor Active (diagnostic): `_handoff-artifacts/control/CURSOR_A_ACTIVE_TASK.md`, `_handoff-artifacts/control/CURSOR_B2_ACTIVE_TASK.md`
- executor heartbeat (diagnostic): `_handoff-artifacts/control/CURSOR_A_EXECUTOR_HEARTBEAT.md`, `_handoff-artifacts/control/CURSOR_B2_EXECUTOR_HEARTBEAT.md`

## Execution-state contract

Cursor execution lanes A/B2 use canonical GitHub inbox state for dispatch:
`IDLE -> PREPARED -> TERMINAL -> IDLE`.

While the compatibility executor is still in use, transient ACTIVE claim/execution state may be held in executor-local / Drive compatibility state. It is not a second source of authority. A terminal GitHub result must bind the exact task-key and evidence.

The SDK executor must also mirror Active + heartbeat into the GitHub-readable control paths above on each invoke transition (`INVOKING` / invoke-complete / invoke-error). PM/Role1 may use those diagnostic files as fresh pickup evidence. Absence of a fresh matching heartbeat with `INVOKING` / `AGENT_PROMPT_RUNNING` (or Active `ACTIVE` for the same task-key) means the PREPARED task is still treated as unclaimed for dispatch overwrite decisions. Inbox files remain the only assignment authority; diagnostic Active/heartbeat never authorize overwriting a PREPARED inbox by themselves.

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
- `_handoff-artifacts/tools/**` is persistent operator tooling, not transient scratch. It must never be removed, stashed out of the working tree, archived, or mirrored away by broad cleanup/recovery commands.
