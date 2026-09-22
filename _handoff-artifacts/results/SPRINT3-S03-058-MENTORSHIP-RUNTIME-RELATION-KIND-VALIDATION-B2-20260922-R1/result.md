# SPRINT3-S03-058-MENTORSHIP-RUNTIME-RELATION-KIND-VALIDATION-B2-20260922-R1

state: TERMINAL
terminal: SPRINT3_S03_058_MENTORSHIP_RUNTIME_RELATION_KIND_VALIDATION_B2_READY
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: B2
updatedAt: 2026-09-22T09:45:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 9eaba898cf1ab5ae8178a6ff931ce200626920fd
publication-commit: 47104c39e8d3a637e6c9e98881c1108112368eed
publication-parent: 109ac4a144c6f401ef6ab863e5ba6a5968e3fef2
origin-master-at-completion: 47104c39e8d3a637e6c9e98881c1108112368eed
pickup: SDK_EXECUTOR / PREPARED
recovery: CURSOR-B2-001 — single bounded attempt per check family; no same-case retry after exhaust
production-change: YES
documentation-change: NO

## Summary

Closed the Sprint3 persisted mentorship runtime validation gap: `validateMentorshipAssignmentEntry` now accepts `mentorshipRelationKind` only when it is one of the three canonical `MentorshipRelationKind` values (or legitimately omitted). Unknown strings are rejected at `/mentorshipByChildPersonId/{index}/mentorshipRelationKind`. Published to GitHub `master`. Did not read or edit Cursor A control files.

## Changed paths

| Path | Delta |
|------|--------|
| `packages/simulation-core/src/sprint3/types.ts` | `MENTORSHIP_RELATION_KINDS` + `isMentorshipRelationKind` guard |
| `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` | Membership validation in `validateMentorshipAssignmentEntry` |
| `packages/simulation-core/src/sprint3/sprint3-mentorship-relation-kind-runtime-validation.test.ts` | Focused regression (3 valid, absent, unknown reject, clone round-trip) |

## Verification (CURSOR-B2-001)

Worktree: `_handoff-artifacts/control-tmp/s03-058-publish-wt` @ pickup tip **`9eaba89`**.

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read B2 inbox + instruction + gap audit (control-tmp copy) | 1 | **PASS** |
| B2 ACTIVE lock before edits | 1 | **PASS** |
| `vitest run` mentorship relation-kind + entrypoint runtime tests | 1 | **PASS** (10 tests) |
| `npm run typecheck -w packages/simulation-core` | 1 | **PASS** |
| `prettier --check` (changed paths) | 1 | **PASS** (after format write on new test) |
| `eslint` (changed paths) | 1 | **PASS** |
| Canonical push + GitHub readback | 1 | **PASS** (rebase once for non-FF master; no same-case retry) |
| Full root gate | — | **not run** (lane policy: follow-up gate task) |

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\s03-058-publish-wt
npx vitest run packages/simulation-core/src/sprint3/sprint3-mentorship-relation-kind-runtime-validation.test.ts packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime.test.ts
npm run typecheck -w packages/simulation-core
git push origin HEAD:refs/heads/master  # after rebase onto 109ac4a
git fetch origin master
git rev-parse origin/master  # 47104c39e8d3a637e6c9e98881c1108112368eed
git show origin/master:packages/simulation-core/src/sprint3/sprint3-mentorship-relation-kind-runtime-validation.test.ts | Select-String S03-058
```

## Hygiene

| Item | Result |
|------|--------|
| Cursor A control files | **Not read or written** |
| Schema version | **Unchanged** (validation tightened only) |
| Reverse-disciple UI-005 contract | **Not modified** |

## Disposition

- **READY** for control consumption: validator fix + regression on canonical **`47104c3`**.
