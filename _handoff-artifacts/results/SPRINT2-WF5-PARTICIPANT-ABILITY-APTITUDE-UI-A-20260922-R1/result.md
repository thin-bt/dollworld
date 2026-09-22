# SPRINT2-WF5-PARTICIPANT-ABILITY-APTITUDE-UI-A-20260922-R1

state: TERMINAL
terminal: SPRINT2_WF5_PARTICIPANT_ABILITY_APTITUDE_UI_A_PASS
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: A
updatedAt: 2026-09-22T21:38:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT3-WF14-PRETTIER-HYGIENE-REPAIR-A-20260922-R1
origin-master-at-pickup: 6bf733576a0751f8d3d56fb06e1a57f8bf55d967
origin-master-at-completion: e2a9e0855dfa8bc5e50b6e84133424416f7b6541
publication-commit: e2a9e0855dfa8bc5e50b6e84133424416f7b6541
product-file-sha: cffea1f59ae15a48a961e28d6e9c8192de497de0
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES
documentation-change: NO
blocker-closed: WF-5-01

## Summary

Closed wireframe blocker **WF-5-01** on current master: ordinary tournament participant comparison now projects accepted UI-004 person stats and aptitudes (`projectPersonStatsAndAptitudes` / `surfaceValue`) through `enrichParticipantLinks` and renders dense **6 abilities + 3 aptitudes** columns on the participant tab without browser-side domain reconstruction. Rank, age, official-record labels, and person-detail navigation preserved. Out-of-scope auto-progression deltas were **not** published. Sprint2 **CLOSED** not assigned. No Cursor B2 control files read or written.

## Product change

| Layer | Behavior |
|-------|----------|
| `ui004/project-person` | Exported `projectPersonStatsAndAptitudes` reusing existing stat/aptitude projection |
| UI-009 server | `CompetitionParticipantLinkView.stats` / `.aptitudes` populated in `enrichParticipantLinks` |
| UI-009 client | Participant table adds 体力…魔力 + 格闘/剣技/魔法 columns with per-cell test ids |
| E2E guard-03 | Asserts ability/aptitude headers and first-row stat/aptitude cells |

## Changed paths (published @ `e2a9e08`)

| Path | Delta |
|------|--------|
| `apps/web/src/server/ui004/project-person.ts` | Export `projectPersonStatsAndAptitudes` |
| `apps/web/src/server/ui009/types.ts` | Participant link stats/aptitudes fields |
| `apps/web/src/server/ui009/competition-wireframe-observation.ts` | Wire projection into enriched links |
| `apps/web/src/server/ui009/competition-participant-comparison-projection.test.ts` | **New** — 6+3 mapping + identity preservation |
| `apps/web/src/client/competition/ui009-views.ts` | Client mirror types |
| `apps/web/src/client/competition/CompetitionPage.tsx` | Dense comparison columns |
| `tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts` | guard-03 ability/aptitude expectations |

## Verification

| Check | Result |
|-------|--------|
| Inbox PREPARED + instruction fresh-read | **PASS** |
| A ACTIVE lock (CURSOR-START-001) | **PASS** |
| `npm run typecheck -w @shared-world/web` (publish worktree) | **PASS** |
| `npm run build -w @shared-world/web` (publish worktree) | **PASS** |
| Focused `vitest run` (projection test) | **PASS** — **2/2** |
| GitHub push `e2a9e08` → `origin/master` | **PASS** |
| GitHub readback: tip `e2a9e08`, blob `cffea1f` for new projection test | **PASS** |
| Playwright guard-03 E2E | **NOT RUN** (harness/time; guard-03 source updated) |
| Full root `npm run check` | **NOT RUN** (separate B2 gate scope) |

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\wf5-ability-aptitude-publish-wt
npm run typecheck -w @shared-world/web
npm run build -w @shared-world/web
npx vitest run apps/web/src/server/ui009/competition-participant-comparison-projection.test.ts
```

Publish worktree: `_handoff-artifacts/control-tmp/wf5-ability-aptitude-publish-wt` @ detached **`e2a9e08`**.

## Terminal

**SPRINT2_WF5_PARTICIPANT_ABILITY_APTITUDE_UI_A_PASS** — WF-5-01 participant ability/aptitude comparison published @ **`e2a9e08`**.
