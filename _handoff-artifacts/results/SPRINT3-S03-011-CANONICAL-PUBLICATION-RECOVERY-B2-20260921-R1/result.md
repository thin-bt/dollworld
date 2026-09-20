# SPRINT3-S03-011-CANONICAL-PUBLICATION-RECOVERY-B2-20260921-R1

state: READY
terminal: SPRINT3_S03_011_CANONICAL_PUBLICATION_RECOVERY_B2_READY
verificationOutcome: PASS
lane: B2
updatedAt: 2026-09-21T05:19:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
pre-publication-origin-head: bfade8d644308d8b5ff4f5e0a7f8394b2e452780
origin-master-at-pickup: bfade8d644308d8b5ff4f5e0a7f8394b2e452780
publication-commit: fbb83b1cd7691cdc7793e0b14a124a783f55a332
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES (published to `origin/master`)
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust

## Summary

Canonical **S03-009** dependency is present on `origin/master` (`b81df17` product + `bfade8d` control consume). B2 reconciled lane-A-reported S03-011 first-use MatchId persistence from evidence worktree, merged battle-commit wiring with current master (`mentorshipEntrypointRuntime` draft clone preserved), published **S03-011-only** product deltas @ **`fbb83b1`**, and verified GitHub readback.

S03-009-owned weekly runtime files were **not** modified in this publication slice.

## Product changes (simulation-core @ fbb83b1)

| Path | Role |
|------|------|
| `packages/simulation-core/src/sprint3/persist-original-technique-first-use-match-id.ts` | Collect successful battle technique uses; apply `firstUseMatchId` once on founding histories |
| `packages/simulation-core/src/sprint3/original-technique-first-use-match-id.test.ts` | FUM-001..005 |
| `packages/simulation-core/src/sprint3/constants.ts` | `ORIGINAL_TECHNIQUE_FIRST_USE_MATCH_ID_PROCESSOR_ID` |
| `packages/simulation-core/src/sprint1/commit-run-battle-plan.ts` | OTL runtime draft clone + post-commit hook via `session.context.sprint3Config` |
| `packages/simulation-core/src/index.ts` | Public exports for S03-011 helpers |

## Verification (CURSOR-B2-001)

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read `origin/master` + S03-009 presence | 1 | **PASS** — `original-technique-lifecycle-runtime-state.ts` on master; S03-011 absent pre-publish |
| Reconcile + local typecheck `@shared-world/simulation-core` | 1 | **PASS** |
| `simulation-core` build | 1 | **PASS** |
| Focused Sprint3 vitest (4 files) | 1 | **PASS** — **31/31** (incl. FUM-001..005) |
| `git push origin HEAD:master` | 1 | **PASS** — `bfade8d..fbb83b1` |
| GitHub readback `origin/master` @ post-push fetch | 1 | **PASS** — `persist-original-technique-first-use-match-id.ts` present at tip |

Commands:

```text
npm run typecheck -w @shared-world/simulation-core
npm run build -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/original-technique-first-use-match-id.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime.test.ts packages/simulation-core/src/sprint3/generated-technique-registration.test.ts
git push origin HEAD:master
git fetch origin master && git rev-parse origin/master
```

## Canonical GitHub readback

- **Tip SHA:** `fbb83b1cd7691cdc7793e0b14a124a783f55a332`
- **Evidence:** publication commit message `Publish S03-011 first-use MatchId founding-history persistence to simulation-core.`
- **Predecessor dependency:** S03-009 @ `b81df17`, S03-010 catalog surfaces unchanged by this commit

## Non-conflict guard

- **No** Cursor A control files edited.
- **No** S03-009 weekly processor / `processOriginalTechniqueLifecycleWeek` deltas in B2 commit.
- **No** bundled speculative S03-010 changes.

## Terminal

**READY** — S03-011 first-use MatchId founding-history persistence is on canonical `master` with focused verification PASS and GitHub readback confirmed.
