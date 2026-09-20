# SPRINT3-ROOT-FORMAT-LINT-RECOVERY-A-20260921-R1

state: READY
terminal: SPRINT3_ROOT_FORMAT_LINT_RECOVERY_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T06:48:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: bfdb9f230f6d0eef030fd78c88f174365ff53e6b
product-commit-sha: bfdb9f230f6d0eef030fd78c88f174365ff53e6b
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-FINAL-RELEASE-GATE-A-20260921-R1
production-change: YES

## Summary

Recovered the remaining Sprint3 root **`npm run check`** gate on canonical **`origin/master`**. At pickup, fresh gates reported **`format:check`** on **109** files and **`lint`** **39** errors (mechanical unused imports/locals, prefer-const, no-useless-assignment, and Prettier drift across Sprint2/UI009/Sprint3 paths). Applied repo-wide Prettier **`--write`** for reported paths plus bounded ESLint-safe fixes (no rule disables, no tsconfig/strictness changes, no gameplay edits). **`npm run check`** is **green** after product commit **`bfdb9f2`** pushed to **`master`**; GitHub readback matches local HEAD.

## Pickup baseline (@ `30bb61e` control dispatch)

| Gate | Result | Detail |
|------|--------|--------|
| `npm run format:check` | **FAIL** | **109** files |
| `npm run lint` | **FAIL** | **39** errors |

## Verification (@ `bfdb9f2`)

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run wiki:check
npm run check
```

| Gate | Result | Detail |
|------|--------|--------|
| `npm run format:check` | **PASS** | All matched files |
| `npm run lint` | **PASS** | 0 errors |
| `npm run typecheck` | **PASS** | all workspaces |
| `npm run test` | **PASS** | **116** files, **1848/1848** |
| `npm run wiki:check` | **PASS** | 18/18 + 58 wiki files |
| `npm run check` | **PASS** | includes workspace **build** |

## Product commit

| SHA | Message |
|-----|---------|
| **`bfdb9f2`** | Recover Sprint3 root format:check and lint gate on master. |

```text
git rev-parse origin/master
# bfdb9f230f6d0eef030fd78c88f174365ff53e6b
```

## Scope / policy

- Prettier normalization on paths reported by pickup **`format:check`** (109 files).
- Lint fixes: removed unused imports/locals, prefer-const / useless-assignment cleanup, delete-based rank-field stripping in UI009 tests, `isSummaryOrResultPermanent()` arity aligned with zero call sites.
- **Not** edited: B2 control/task/result paths, ESLint rule disables, gameplay semantics.

## Collision guard

- **CURSOR_B2_INBOX.md** / **CURSOR_B2_ACTIVE_TASK.md**: not read or edited.

## Terminal

**READY** — canonical **`master`** @ **`bfdb9f2`** passes root **`npm run check`** with evidence above.
