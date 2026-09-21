# CONTROL-RECOVER-STASHED-HANDOFF-UNTRACKED-A-20260922-R1

state: PREPARED
lane: A
mode: CONTROL_RECOVERY
priority: IMMEDIATE
sprint: Sprint3
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Objective

Recover dollworld local handoff files that disappeared from the working tree solely because Cursor A ran:

`git stash push -u -m "wip all before S03-052 merge"`

around 2026-09-22 06:25 JST.

This is recovery of accidentally stashed untracked operational files, not cleanup.

## Hard constraints

- Do NOT run `git stash apply`, `git stash pop`, or `git stash drop`.
- Do NOT commit recovered local-only files unless they were already tracked/canonical by existing authority.
- Preserve current tracked worktree and current Sprint3 product changes.
- Do NOT restore unrelated historical junk blindly.
- Do NOT delete anything.
- `_handoff-artifacts/tools/start-dollworld-ui.bat` has already been individually restored by the prior operator; verify it exists and do not overwrite it unless its current content differs from the stash copy and the stash copy is demonstrably the intended version.

## Required recovery procedure

1. Inspect current `git status --short`.
2. Inspect `git stash list` and identify the exact stash with message `wip all before S03-052 merge`.
3. Enumerate the untracked tree captured by that stash (normally the stash third parent) under `_handoff-artifacts/`.
4. Compare each captured path against the current working tree and GitHub canonical paths.
5. Restore only files that:
   - were present as untracked operational handoff files immediately before the S03-052 stash,
   - are currently absent from the working tree,
   - and are not superseded by a current GitHub canonical replacement.
6. Restoration must be path-by-path from the stash's untracked tree without apply/pop/drop and without clobbering current files.
7. In particular inspect all affected `instruction.md` and `_handoff-artifacts/tools/*` paths from the stash event; do not assume they are disposable.
8. After restoration, verify current working tree presence and report exactly which paths were restored, skipped as superseded, or already present.
9. Publish terminal result to:
   `_handoff-artifacts/results/CONTROL-RECOVER-STASHED-HANDOFF-UNTRACKED-A-20260922-R1/result.md`

## Acceptance

READY only if:
- no stash was applied/popped/dropped,
- no current tracked work was overwritten,
- every affected stash-captured handoff path has been classified,
- all still-needed missing operational files are restored,
- start-dollworld-ui.bat remains present,
- exact restored/skipped path list is in the result.
