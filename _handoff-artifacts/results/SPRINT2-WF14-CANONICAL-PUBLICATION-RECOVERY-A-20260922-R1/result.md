# SPRINT2-WF14-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1

state: TERMINAL
terminal: SPRINT2_WF14_CANONICAL_PUBLICATION_RECOVERY_A_PASS
verificationOutcome: PASS
resultClass: CANONICAL_PUBLICATION_RECOVERY
lane: A
updatedAt: 2026-09-22T20:02:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1
origin-master-at-pickup: b6498808beb03b834eb9f02347281acb6a78b403
publication-commit: 134d27ef5da53f73aea91fde57ddc7411cde35c0
readback-tip: 134d27ef5da53f73aea91fde57ddc7411cde35c0
unpublished-product-delta: none
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES (published)
documentation-change: NO

## Summary

Published the verified predecessor WF-14 tournament display-name product delta to canonical `thin-bt/dollworld` `master`, then fetched and read back `origin/master` to prove the publication commit is tip and ancestor. Focused post-publication verification passed on published bytes. Sprint2 **CLOSED** not assigned. No Cursor B2 control files read or written.

## Publication

| Item | Value |
|------|--------|
| Pre-publish `origin/master` | `b6498808beb03b834eb9f02347281acb6a78b403` |
| Publication commit | `134d27ef5da53f73aea91fde57ddc7411cde35c0` |
| Push ref | `master -> master` (`b649880..134d27e`) |
| Readback `origin/master` @ terminal | `134d27ef5da53f73aea91fde57ddc7411cde35c0` |
| `merge-base --is-ancestor` publication → tip | **YES** |

Predecessor delta was local-only (uncommitted on pickup worktree atop historical `8ec56cd`); after fast-forward to `b649880`, committed **15 paths / +212 −15** matching predecessor `SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1` scope only. Unrelated local deletion of `sprint3-completed-master-intake-outcome-semantic-invariant.test.ts` was **not** published.

## Readback evidence (GitHub canonical master)

- `packages/simulation-core/src/sprint2/tournament-display-name.ts` present on `origin/master` with `resolveTournamentDisplayName` and `normal:F` → `春風杯` mapping.
- `apps/web/src/server/ui009/competition-tournament-display-name.test.ts` present on `origin/master`.
- Publication commit message: `fix(sprint2): publish WF-14 tournament display names to canonical master`.

## Changed paths (published)

| Path | Delta |
|------|--------|
| `packages/simulation-core/src/sprint2/tournament-display-name.ts` | **New** |
| `packages/simulation-core/src/sprint2/sprint2-tournament-display-name.test.ts` | **New** |
| `packages/simulation-core/src/sprint2/types.ts` | `seriesKey` on read-model entry |
| `packages/simulation-core/src/sprint2/tournament-schedule-read-model.ts` | Project `seriesKey` |
| `packages/simulation-core/src/index.ts` | Export resolver |
| `apps/web/src/server/ui009/competition-schedule-overview.ts` | Schedule projection |
| `apps/web/src/server/ui009/map-competition-view.ts` | Active tournament display name |
| `apps/web/src/server/ui009/competition-engine.ts` | Idle pre-start preview |
| `apps/web/src/server/ui009/competition-wireframe-observation.ts` | History summary |
| `apps/web/src/server/ui009/types.ts` | View contract |
| `apps/web/src/server/ui009/competition-tournament-display-name.test.ts` | **New** |
| `apps/web/src/server/ui009.competition.test.ts` | Non-ID name assertion |
| `apps/web/src/client/competition/ui009-views.ts` | Client types |
| `apps/web/src/client/competition/CompetitionPage.tsx` | Detail + result rendering |
| `apps/web/src/client/competition/competition-schedule-matrix.tsx` | Schedule cell labels |

## Verification (post-publication @ `134d27e`)

| Check | Result |
|-------|--------|
| Inbox PREPARED + instruction + status fresh-read | **PASS** |
| A ACTIVE lock (CURSOR-START-001) | **PASS** |
| `npm run build -w @shared-world/simulation-core` | **PASS** |
| Focused `vitest run` (4 files) | **PASS** — **7/7** |
| `npm run typecheck -w @shared-world/simulation-core` | **PASS** |
| `npm run typecheck -w @shared-world/web` | **PASS** |
| `npm run build -w @shared-world/web` | **PASS** |
| Full root `npm run check` | **NOT RUN** (separate release-gate task) |

```powershell
cd D:\xampp\htdocs\dollworld
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

## Workspace hygiene

- Root control defect `_handoff-artifacts/.tmp.driveupload/` moved to `_handoff-artifacts/control-tmp/.tmp.driveupload-migrated-20260922/` (same run).
- Conflicting untracked handoff mirrors backed up under `_handoff-artifacts/control-tmp/wf14-publish-untracked-backup-20260922/` before fast-forward to canonical master.

## Terminal

**SPRINT2_WF14_CANONICAL_PUBLICATION_RECOVERY_A_PASS** — WF-14 tournament display-name bytes live on GitHub canonical master @ `134d27e`; readback and focused verification confirm publication complete; no remaining unpublished predecessor product delta.
