# SPRINT2-WF14-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1

state: TERMINAL
terminal: SPRINT2_WF14_CANONICAL_PUBLICATION_RECOVERY_A_PASS
verificationOutcome: PASS
resultClass: CANONICAL_PUBLICATION_RECOVERY
lane: A
updatedAt: 2026-09-25T10:39:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1
origin-master-at-pickup: 2979c1bddacdb5b5b25d323d4ce82d61404d4558
publication-commit: 134d27ef5da53f73aea91fde57ddc7411cde35c0
readback-tip: 2979c1bddacdb5b5b25d323d4ce82d61404d4558
unpublished-product-delta: none
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: NO (delta already on canonical master; fresh readback + verify this run)
documentation-change: NO

## Summary

Fresh `git fetch origin master` @ **`2979c1bd`** confirms the predecessor WF-14 tournament display-name product delta remains **published** on canonical `thin-bt/dollworld` `master` at commit **`134d27ef`**. Proved **`134d27e`** and predecessor pickup **`8ec56cd`** are ancestors of tip, verified predecessor paths on readback, and ran focused post-publication checks on detached worktree @ **`2979c1bd`** (**7/7** vitest, typechecks, web build **PASS**). No additional push required. Sprint2 **CLOSED** not assigned. No Cursor B2 control files read or written.

## Publication (canonical state)

| Item | Value |
|------|--------|
| Publication commit (historical push) | `134d27ef5da53f73aea91fde57ddc7411cde35c0` |
| Readback `origin/master` @ terminal | `2979c1bddacdb5b5b25d323d4ce82d61404d4558` |
| `merge-base --is-ancestor` `134d27e` → tip | **YES** |
| `merge-base --is-ancestor` predecessor pickup `8ec56cd` → tip | **YES** |
| New push this run | **none** (delta already present) |

Publication message on canonical master: `fix(sprint2): publish WF-14 tournament display names to canonical master`.

## Readback evidence (GitHub canonical master @ `2979c1bd`)

- `packages/simulation-core/src/sprint2/tournament-display-name.ts` — `resolveTournamentDisplayName` present (blob `6c8b6a99…`).
- `packages/simulation-core/src/sprint2/sprint2-tournament-display-name.test.ts` — present (blob `e67a184d…`).
- `apps/web/src/server/ui009/competition-tournament-display-name.test.ts` — present (blob `d6b84dee…`).
- `apps/web/src/client/competition/competition-schedule-matrix.tsx` — present (blob `48424741…`).
- All other predecessor paths from `SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1` remain on `origin/master`.

## Verification (published bytes @ worktree `2979c1bd`)

| Check | Result |
|-------|--------|
| Inbox PREPARED + instruction + Sprint2/Sprint3 status fresh-read | **PASS** |
| A ACTIVE lock before work (CURSOR-START-001) | **PASS** |
| `npm run build -w @shared-world/simulation-core` | **PASS** |
| Focused `vitest run` (4 files) | **PASS** — **7/7** |
| `npm run typecheck -w @shared-world/simulation-core` | **PASS** |
| `npm run typecheck -w @shared-world/web` | **PASS** |
| `npm run build -w @shared-world/web` | **PASS** |
| Full root `npm run check` | **NOT RUN** (separate release-gate task) |

Worktree: `_handoff-artifacts/control-tmp/wf14-readback-verify-wt-20260925-r3` @ detached `2979c1bd`.

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\wf14-readback-verify-wt-20260925-r3
npm run build -w @shared-world/simulation-core
npx vitest run `
  packages/simulation-core/src/sprint2/sprint2-tournament-display-name.test.ts `
  apps/web/src/server/ui009/competition-tournament-display-name.test.ts `
  apps/web/src/server/ui009/map-competition-view-lifecycle.test.ts `
  apps/web/src/client/competition/competition-match-page.test.tsx
npm run typecheck -w @shared-world/simulation-core
npm run typecheck -w @shared-world/web
npm run build -w @shared-world/web
```

## Terminal

**SPRINT2_WF14_CANONICAL_PUBLICATION_RECOVERY_A_PASS** — WF-14 tournament display-name bytes live on GitHub canonical master; fresh readback @ `2979c1bd` and focused verification confirm publication complete; no remaining unpublished predecessor product delta.
