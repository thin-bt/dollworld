# SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1

state: TERMINAL
terminal: SPRINT2_WF14_TOURNAMENT_DISPLAY_NAME_A_PASS
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: A
updatedAt: 2026-09-22T19:45:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 3b777c8ae5206c1b55e15be204fbc41827ff25a3
local-worktree-head-at-pickup: 8ec56cdc6d482ccc68e35344ed5412a324713c7d
canonical-product-sha: 8ec56cdc6d482ccc68e35344ed5412a324713c7d
publication-commit: (pending GitHub publish — local product delta on pickup HEAD)
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-074-MASTER-INTAKE-PERSISTED-SEMANTIC-INVARIANT-A-20260922-R1
production-change: YES
documentation-change: NO

## Summary

Closed wireframe blocker **WF-14-01** by adding canonical deterministic tournament display names from accepted `seriesKey` schedule identity (`resolveTournamentDisplayName`), projecting `tournamentDisplayName` through UI-009 schedule/detail/result surfaces, and rendering player-facing names without using `TournamentId` as a substitute label. Sprint2 **CLOSED** not assigned. No Cursor B2 control files read or written.

## Product change

| Layer | Behavior |
|-------|----------|
| `simulation-core` | `seriesKey` on schedule read-model entries; `resolveTournamentDisplayName(seriesKey)` stable map (e.g. `normal:F` → 春風杯) |
| UI-009 server | `CompetitionScheduleEntryView.tournamentDisplayName`, active `CompetitionProgressView.tournamentDisplayName`, history summary field |
| UI-009 client | Annual matrix cell label + aria-label; detail heading `data-testid="competition-tournament-display-name"`; finished result hero kicker includes tournament name |

## UI evidence (static / server projection)

| Surface | Evidence |
|---------|----------|
| Schedule | Matrix button shows `entry.tournamentDisplayName`; title/aria-label include name + timing |
| Detail | Overview heading renders `entry.tournamentDisplayName` (not timing/rank alone) |
| Result | Champion hero kicker `{tournamentDisplayName} — 大会結果` when finished |
| Identity | `TournamentId` unchanged as internal key; display names derived only from canonical `seriesKey` |

## Changed paths

| Path | Delta |
|------|--------|
| `packages/simulation-core/src/sprint2/tournament-display-name.ts` | **New** deterministic name resolver |
| `packages/simulation-core/src/sprint2/sprint2-tournament-display-name.test.ts` | **New** stability/mapping tests |
| `packages/simulation-core/src/sprint2/types.ts` | `seriesKey` on read-model entry |
| `packages/simulation-core/src/sprint2/tournament-schedule-read-model.ts` | Project `seriesKey` |
| `packages/simulation-core/src/index.ts` | Export resolver |
| `apps/web/src/server/ui009/competition-schedule-overview.ts` | Schedule projection field |
| `apps/web/src/server/ui009/map-competition-view.ts` | Active tournament display name |
| `apps/web/src/server/ui009/competition-engine.ts` | Idle pre-start preview name |
| `apps/web/src/server/ui009/competition-wireframe-observation.ts` | History summary display name |
| `apps/web/src/server/ui009/types.ts` | View contract fields |
| `apps/web/src/server/ui009/competition-tournament-display-name.test.ts` | **New** projection test (F → 春風杯) |
| `apps/web/src/server/ui009.competition.test.ts` | Assert schedule entries expose non-ID names |
| `apps/web/src/client/competition/ui009-views.ts` | Client types |
| `apps/web/src/client/competition/CompetitionPage.tsx` | Detail + result rendering |
| `apps/web/src/client/competition/competition-schedule-matrix.tsx` | Schedule cell labels |

## Verification

| Check | Result |
|-------|--------|
| Inbox PREPARED + instruction + Sprint2 status fresh-read | **PASS** |
| A ACTIVE lock before edits (CURSOR-START-001) | **PASS** |
| `vitest run` sprint2 display-name + ui009 projection + map lifecycle + client match page | **PASS** — **7/7** |
| `npm run typecheck -w @shared-world/simulation-core` | **PASS** |
| `npm run typecheck -w @shared-world/web` | **PASS** |
| `npm run build -w @shared-world/web` | **PASS** |
| Full root `npm run check` | **NOT RUN** — fresh post-publication root gate required before release binding |
| Real browser E2E for WF-14 | **NOT RUN** this task (server + client unit/projection evidence only) |

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

## Remaining wireframe blockers (after WF-14-01)

From `SPRINT2-WIREFRAME-CURRENT-MASTER-AUDIT-A-20260922-R1` — still open:

1. **WF-5-01** — Participant comparison lacks wireframe 6 abilities + 3 aptitudes density.
2. **WF-13-01** — Person detail rank history timeline absent.
3. **WF-12-03** — Knockout bracket not reachable on evidenced ordinary playable path.
4. **WF-9-01** — Match detail exposes internal IDs in primary meta row.
5. **WF-3-02b** — Preset-bootstrap wireframe harness guard-02/03 path.

## Post-product gate

Product bytes changed on pickup HEAD **`8ec56cd`**; a fresh bounded/full root verification is required after GitHub publication before replacing prior root-gate binding. B2 owns separate S03-075 root release gate — not duplicated here.

## Terminal

**SPRINT2_WF14_TOURNAMENT_DISPLAY_NAME_A_PASS** — Deterministic player-facing tournament display names projected and rendered on schedule/detail/result surfaces; WF-14-01 first blocker addressed on local master worktree pending canonical publish.
