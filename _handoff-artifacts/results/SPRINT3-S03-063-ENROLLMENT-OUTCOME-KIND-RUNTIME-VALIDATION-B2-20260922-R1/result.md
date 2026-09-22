# SPRINT3-S03-063-ENROLLMENT-OUTCOME-KIND-RUNTIME-VALIDATION-B2-20260922-R1

state: TERMINAL
terminal: SPRINT3_S03_063_ENROLLMENT_OUTCOME_KIND_RUNTIME_VALIDATION_B2_READY
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: B2
updatedAt: 2026-09-22T11:32:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 0022658b118de1ff85c31781e962557e1a478de0
publication-commit: 46225f48b2db2f3d5e0650e1712508be209ca47b
publication-parent: f263b8b3f38f3ccc7799b94781011d9f7d6f012b
origin-master-at-completion: 46225f48b2db2f3d5e0650e1712508be209ca47b
pickup: SDK_EXECUTOR / PREPARED
recovery: CURSOR-B2-001 — single bounded attempt per check family; one rebase for non-FF push; no same-case retry after exhaust
production-change: YES
documentation-change: NO

## Summary

Closed the Sprint3 persisted mentorship runtime trust-boundary gap: `validateMentorshipAssignmentEntry` now accepts `enrollmentOutcomeKind` only when it matches the closed `EnrollmentAssignmentKind` union. Unknown strings are rejected at `/mentorshipByChildPersonId/{index}/enrollmentOutcomeKind` with expected legal kinds listed. Published to GitHub `master`. Did not read or edit Cursor A control files.

## Changed paths

| Path | Delta |
|------|--------|
| `packages/simulation-core/src/sprint3/types.ts` | `ENROLLMENT_ASSIGNMENT_KINDS` + `isEnrollmentAssignmentKind` guard |
| `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` | Closed-union validation in `validateMentorshipAssignmentEntry` |
| `packages/simulation-core/src/sprint3/sprint3-enrollment-outcome-kind-runtime-validation.test.ts` | Focused regression (all legal kinds, unknown reject, clone round-trip) |

## Verification (CURSOR-B2-001)

Worktree: `_handoff-artifacts/control-tmp/s03-063-publish-wt` @ pickup tip **`0022658`**.

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read B2 inbox + instruction | 1 | **PASS** |
| B2 ACTIVE lock before edits | 1 | **PASS** |
| `vitest run` enrollment-outcome-kind + entrypoint runtime tests | 1 | **PASS** (12 tests) |
| `npm run typecheck -w @shared-world/simulation-core` | 1 | **PASS** |
| `prettier` / `eslint` (changed paths, main worktree pre-publish) | 1 | **PASS** |
| Canonical push + GitHub readback | 1 | **PASS** (one rebase after non-FF; readback @ **`46225f4`**) |
| Full root gate | — | **not run** (lane policy: follow-up gate task) |

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\s03-063-publish-wt
npx vitest run packages/simulation-core/src/sprint3/sprint3-enrollment-outcome-kind-runtime-validation.test.ts packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime.test.ts
npm run typecheck -w @shared-world/simulation-core
git push origin HEAD:refs/heads/master  # after rebase onto f263b8b
git fetch origin master
git rev-parse origin/master  # 46225f48b2db2f3d5e0650e1712508be209ca47b
git show origin/master:packages/simulation-core/src/sprint3/sprint3-enrollment-outcome-kind-runtime-validation.test.ts | Select-String S03-063
```

## Hygiene

| Item | Result |
|------|--------|
| Cursor A control files | **Not read or written** |
| S03-062 A-owned evidence-ledger scope | **Not touched** |
| Schema version | **Unchanged** (validation tightened only) |

## Disposition

- **READY** for control consumption: validator fix + regression on canonical **`46225f4`**.
