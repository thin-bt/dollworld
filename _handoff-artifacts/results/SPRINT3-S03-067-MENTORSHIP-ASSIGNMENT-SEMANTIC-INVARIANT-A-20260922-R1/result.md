# SPRINT3-S03-067-MENTORSHIP-ASSIGNMENT-SEMANTIC-INVARIANT-A-20260922-R1

state: TERMINAL
terminal: SPRINT3_S03_067_MENTORSHIP_ASSIGNMENT_SEMANTIC_INVARIANT_A_READY
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: A
updatedAt: 2026-09-22T13:28:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 81d63a288bf1ef63cd8d5beea3e9381aee6d3b68
worktree-head-at-completion: 628c2a3821cf2028b58578baadb0cac22abcaeed
publication-commit: PENDING_LOCAL (product bytes uncommitted; executor publish expected)
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-066-POST064-FORMAL-CLOSE-EVIDENCE-RECONCILIATION-A-20260922-R1
production-change: YES
documentation-change: NO

## Summary

Closed the Role2 persisted `Sprint3MentorshipAssignmentEntry` semantic-invariant gap at `validateMentorshipAssignmentEntry`: cross-field coherence among `enrollmentOutcomeKind`, `selectedMasterPersonId`, and `mentorshipRelationKind` is enforced at the runtime trust boundary (aligned with `evaluate-enrollment-assignment` / intake materialization). Contradictory assignment payloads are rejected; closed-union field validation from S03-058/S03-063 is preserved. Sprint3 **CLOSED** not assigned. No Cursor B2 control files read or written. Full root gate **not run** (follow-up gate after publish).

## Product invariant (canonical names)

| `enrollmentOutcomeKind` | Required payload |
|-------------------------|------------------|
| `formal_master_assigned` | `selectedMasterPersonId` + `mentorshipRelationKind: formal_master_disciple` |
| `parent_master_assigned` | `selectedMasterPersonId` + `mentorshipRelationKind: parent_master_disciple` |
| `parent_temporary_guidance` | `selectedMasterPersonId` + `mentorshipRelationKind: parent_temporary_guidance` |
| `not_at_enrollment_boundary`, `no_eligible_or_accepted_master` | Must not carry master or relation fields |

## Changed paths

| Path | Delta |
|------|--------|
| `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` | `appendMentorshipAssignmentSemanticIssues` + call from `validateMentorshipAssignmentEntry` |
| `packages/simulation-core/src/sprint3/sprint3-mentorship-assignment-semantic-invariant.test.ts` | **New** S03-067 focused regression |
| `packages/simulation-core/src/sprint3/sprint3-enrollment-outcome-kind-runtime-validation.test.ts` | Coherent fixtures per outcome kind (S03-063 compat) |
| `packages/simulation-core/src/sprint3/sprint3-mentorship-relation-kind-runtime-validation.test.ts` | Coherent parent assignment fixtures + mismatch rejects (S03-058 compat) |
| `packages/simulation-core/src/sprint3/types.ts` | Local worktree includes S03-058/S03-063 closed-union helpers consumed by validator (publish with this slice if not already on `origin/master`) |

## Verification

Worktree: `D:\xampp\htdocs\dollworld` @ **`628c2a3`** (uncommitted product delta).

| Check | Result |
|-------|--------|
| Fresh-read inbox + instruction + Role2 gap audit (control-tmp mirror) | **PASS** |
| A ACTIVE lock before edits (CURSOR-START-001) | **PASS** |
| `vitest run` semantic-invariant + enrollment-outcome + relation-kind + entrypoint runtime | **PASS** — **30/30** |
| `npm run typecheck -w @shared-world/simulation-core` | **PASS** |
| `prettier --write` on changed sprint3 paths | **PASS** |
| Full root `npm run check` | **not run** — fresh gate required after canonical publish |

```powershell
cd D:\xampp\htdocs\dollworld
npx vitest run `
  packages/simulation-core/src/sprint3/sprint3-mentorship-assignment-semantic-invariant.test.ts `
  packages/simulation-core/src/sprint3/sprint3-enrollment-outcome-kind-runtime-validation.test.ts `
  packages/simulation-core/src/sprint3/sprint3-mentorship-relation-kind-runtime-validation.test.ts `
  packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime.test.ts
npm run typecheck -w @shared-world/simulation-core
```

## Remaining blocker

- **Canonical publish**: commit + push product paths to `thin-bt/dollworld` `master`, then run/post a current-master root gate (product bytes advance beyond last accepted gate binding per Role3 semantic-gap audit).

## Terminal

**SPRINT3_S03_067_MENTORSHIP_ASSIGNMENT_SEMANTIC_INVARIANT_A_READY** — Persisted mentorship assignment semantic invariant enforced with focused regression; publish + root gate remain for release binding.
