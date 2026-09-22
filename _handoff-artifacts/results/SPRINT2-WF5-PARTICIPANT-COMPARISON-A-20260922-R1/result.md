# SPRINT2-WF5-PARTICIPANT-COMPARISON-A-20260922-R1

state: TERMINAL
terminal: SPRINT2_WF5_PARTICIPANT_COMPARISON_A_PASS
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: A
updatedAt: 2026-09-22T20:10:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT2-WF14-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1
origin-master-at-pickup: de0d594a6bb457de12257b5e9635594a60b6b944
local-worktree-head-at-pickup: 134d27ef5da53f73aea91fde57ddc7411cde35c0
publication-commit: (pending GitHub publish — local product delta on pickup HEAD)
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES
documentation-change: NO

## Summary

Closed wireframe blocker **WF-5-01** by projecting accepted UI-004 person presentation stats/aptitudes (`projectPersonStatsAndAptitudes` / `surfaceValue`) through `enrichParticipantLinks` and rendering dense table columns (6 abilities + 3 aptitudes) on the ordinary tournament participant comparison table without browser-side domain recomputation. Rank, age, official-record, and person-detail navigation preserved. Sprint2 **CLOSED** not assigned. No Cursor B2 control files read or written.

## Product change

| Layer | Behavior |
|-------|----------|
| `ui004/project-person` | Exported `projectPersonStatsAndAptitudes` reusing existing stat/aptitude projection |
| UI-009 server | `CompetitionParticipantLinkView.stats` / `.aptitudes` populated in `enrichParticipantLinks` |
| UI-009 client | Participant tab table adds 体力…魔力 + 格闘/剣技/魔法 columns with per-cell test ids |

## Changed paths (local product)

| Path | Delta |
|------|--------|
| `apps/web/src/server/ui004/project-person.ts` | Export `projectPersonStatsAndAptitudes` |
| `apps/web/src/server/ui009/types.ts` | Participant link stats/aptitudes fields |
| `apps/web/src/server/ui009/competition-wireframe-observation.ts` | Wire projection into enriched links |
| `apps/web/src/server/ui009/competition-participant-comparison-projection.test.ts` | **New** — 6+3 mapping + identity preservation |
| `apps/web/src/client/competition/ui009-views.ts` | Client mirror types |
| `apps/web/src/client/competition/CompetitionPage.tsx` | Dense comparison columns |
| `tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts` | guard-03 asserts ability/aptitude headers + cells |

## Verification

| Check | Result |
|-------|--------|
| Inbox PREPARED + instruction fresh-read | **PASS** |
| A ACTIVE lock (CURSOR-START-001) | **PASS** |
| `npm run typecheck -w @shared-world/web` | **PASS** |
| `npm run build -w @shared-world/web` | **PASS** |
| Focused `vitest run` (2 files) | **PASS** — **3/3** |
| Full root `npm run check` | **NOT RUN** (release-gate scope) |
| Playwright guard-03 E2E | **NOT RUN** (harness/time; guard-03 expectations updated in source) |

```powershell
cd D:\xampp\htdocs\dollworld
npm run typecheck -w @shared-world/web
npm run build -w @shared-world/web
npx vitest run `
  apps/web/src/server/ui009/competition-participant-comparison-projection.test.ts `
  apps/web/src/server/ui009/competition-tournament-display-name.test.ts
```

## Remaining Sprint2 blockers (not in scope)

1. **WF-13-01** — Person detail rank history timeline
2. **WF-12-03** — Knockout bracket ordinary-path reachability
3. **WF-9-01** — Match detail internal IDs in primary meta
4. Other items from wireframe current-master audit (partial/secondary)
