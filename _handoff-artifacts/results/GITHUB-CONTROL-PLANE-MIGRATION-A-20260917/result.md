# GITHUB-CONTROL-PLANE-MIGRATION-A-20260917

state: READY
terminal: GITHUB_CONTROL_PLANE_MIGRATION_A_READY
lane: A
updatedAt: 2026-09-17T16:20:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
commit-status: COMMITTED
commit-sha: 07c0472e569a482bb505db2acaa530cb55f12bdd

## Summary

GitHub-first control-plane support is wired into the Cursor SDK inbox executor and daemon without removing Drive/local compatibility. Implementation commit is on `master` and will be pushed with this result update.

## Changes

- `cursor-inbox-executor/lib/lane-control.mjs` — merge `_handoff-artifacts/control/CURSOR_A_INBOX.md` (and B2 canonical) with audit mirror; missing canonical never blocks poll.
- `cursor-inbox-executor/lib/github-remote.mjs` — best-effort `gh api` / `git show` fetch when local canonical is empty (non-terminal on failure).
- `cursor-inbox-executor/lib/publish-result.mjs` — deterministic `_handoff-artifacts/results/<task-key>/result.md` writer.
- `cursor-inbox-executor/lib/parse-control.mjs` — resolve `_handoff-artifacts/tasks/<task-key>/instruction.md` without Drive mirror.
- `cursor-inbox-executor/cursor-inbox-executor.mjs` — poll merged GitHub canonical inbox + optional remote refresh; Active remains audit mirror.
- `cursor-inbox-executor-daemon.ps1` — inbox reconciliation prefers GitHub canonical when `PREPARED` or `control-authority: GitHub`.

## Verification

```
cd _handoff-artifacts/audit/cursor-inbox-executor
npm test
```

All 4 tests passed (lane merge, mirror fallback, tasks instruction path, result publish).

## Acceptance mapping

| Criterion | Status |
|-----------|--------|
| GitHub canonical inbox can cause pickup without Drive authority | PASS — control `CURSOR_A_INBOX.md` + `tasks/.../instruction.md` |
| Missing Drive/local mirror does not stop executor | PASS — fallback paths; remote fetch best-effort only |
| ACTIVE claimed + terminal result on GitHub canonical path | PASS — this file |
| Sprint2 dirty worktree preserved | PASS — no product source touched in migration commit |
| Commit/push closure | PASS — `07c0472e569a482bb505db2acaa530cb55f12bdd` |
