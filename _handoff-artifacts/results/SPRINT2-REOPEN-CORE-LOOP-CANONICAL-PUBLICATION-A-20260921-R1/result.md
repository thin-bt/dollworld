# SPRINT2-REOPEN-CORE-LOOP-CANONICAL-PUBLICATION-A-20260921-R1

state: TERMINAL
terminal: SPRINT2_REOPEN_CORE_LOOP_CANONICAL_PUBLICATION_A_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T19:10:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 250d356d1c49c2dc1e6d1ee9a5f036efe0e62505
publication-commit: 5b5103a7ccdeb2514c56cfd95cd9fb272962378b
publication-parent: 09bf962 (rebased stack; product parent chain includes S03-040 guard @ 2fc1643)
local-product-source: ed123ca5763172184458db67af602efc6629f878
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES
documentation-change: NO
predecessor: SPRINT2-REOPEN-CORE-LOOP-REPAIR-A-20260921-R1

## Summary

Closed the **canonical-publication gap** from Sprint2 core-loop repair: verified product delta @ `ed123ca` was local-only while GitHub `master` retained intervening control/S03-040 history without the repair seam. Reconciled via cherry-pick on detached `origin/master` worktree, resolved guard **add/add** by binding the post-repair guard from `ed123ca`, rebased onto fresh `origin/master` after concurrent control commits, pushed product commit @ **`5b5103a`**, and read back hooks + guard on canonical tip.

## Reconciliation

| Step | Evidence |
|------|----------|
| Worktree @ `origin/master` pickup | `_handoff-artifacts/control-tmp/sprint2-core-loop-publish-wt` @ `250d356` |
| Cherry-pick `ed123ca` | Product paths staged; guard conflict |
| Guard resolution | `ed123ca` tournament-week / `finished`+champion seam (replaces pre-repair B2 guard assertions) |
| Rebase before push | `250d356..09bf962` control dispatch landed during pickup → rebase 1/1 clean |
| Push | `09bf962..5b5103a` `HEAD -> master` |

## Changed paths (canonical @ `5b5103a`)

| Path | Role |
|------|------|
| `apps/web/src/server/routes-simulation.ts` | Auto-progression + competitive-record sync on simulation **start** and **reset** |
| `apps/web/src/server/ui009/competition-auto-progression.ts` | Ordinary lifecycle hook documentation |
| `apps/web/src/server/ui009/competition-auto-progression.test.ts` | Tournament-week start + week-step-only chain |
| `apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts` | S03-040 guard retained, post-repair binding |
| `vitest.config.ts` | UI009 tournament-week integration timeout |

## Verification

| Gate | Result | Detail |
|------|--------|--------|
| `competition-auto-progression.test.ts` + `ui009.competition.test.ts` | **PASS** | 2 files / **8** tests |
| `sprint2-repair-sprint3-weekly-regression-guard.test.ts` | **PASS** | 1 file / **4** tests |
| Extended slice (`ui003.simulation`, `sprint2-checkpoint-resume`, `ui006.mock-battles`) | **PASS** | 3 files / **50** tests |
| **Focused total** | **PASS** | **6** files / **62** tests @ worktree pre-push |

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\sprint2-core-loop-publish-wt
npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts apps/web/src/server/ui009.competition.test.ts apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts apps/web/src/server/ui003.simulation.test.ts packages/simulation-core/src/sprint2/sprint2-checkpoint-resume.test.ts apps/web/src/server/ui006.mock-battles.test.ts
git push origin HEAD:master
cd D:\xampp\htdocs\dollworld
git fetch origin master
git rev-parse origin/master
git ls-tree origin/master -- apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts
```

## GitHub canonical readback

```text
origin/master @ pickup: 250d356d1c49c2dc1e6d1ee9a5f036efe0e62505
publication commit: 5b5103a7ccdeb2514c56cfd95cd9fb272962378b
readback tip: 5b5103a7ccdeb2514c56cfd95cd9fb272962378b
routes-simulation: syncCompetitionAutoProgressionForWeek on start/reset/step (canonical blob)
guard path: apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts (blob 5fd028b)
push evidence: 09bf962..5b5103a  HEAD -> master
```

## Non-conflict guard

- B2 control files not read or written.
- No force-push; intervening `origin/master` history preserved (including S03-040 guard lineage).
- `SPRINT2_STATUS.md` not changed to CLOSED; publication-only pickup per instruction.

## Terminal

**READY** — Sprint2 ordinary tournament core-loop repair is on GitHub canonical `master` @ **`5b5103a`**, focused gates **PASS**, S03-040 guard path retained with post-repair seam, readback matches published SHA.
