# SPRINT2-NONBROWSER-REMAINING-GAP-SCAN-A-20260919-R1

state: FIX_REQUIRED
terminal: SPRINT2_NONBROWSER_PUBLICATION_SLICE_COMPLETION_REQUIRED
lane: A
updatedAt: 2026-09-19T10:10:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
commit-status: DIRTY_UNPUBLISHED_SLICE
worktree-head: e40c60f71012f6b353a9944bd1e5abd92d9308ab
required-master-head: e40c60f71012f6b353a9944bd1e5abd92d9308ab
predecessor-task: SPRINT2-FINAL-COMPLETION-EVIDENCE-AUDIT-A-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
pickup: SDK_EXECUTOR / CURSOR-START-001
production-change: YES (local; not committed)

## Summary

Fresh non-browser Sprint2 gap scan on bound master `e40c60f…` found **one unique A-owned executable gap:** the dirty-slice publication commit references ui009 engine/finalize/auto-progression modules that **are not present in the git tree at HEAD**, while complete implementations exist only as **local untracked** files. Clean checkout / CI build cannot resolve those imports. **Smallest correction applied locally:** `fetch-ui009.ts` aligned with `FetchLike` + `decodeApiResponse` (client `tsc -p tsconfig.client.json` **PASS**). **Remaining:** publish the missing ui009 module + test paths (and the fetch fix) in a follow-on publication commit—no Playwright/B2 control edits.

Mandatory browser gate: paired B2 terminal **READY 7/7** (sdk-r13 @ `e40c60f`, test-only reconciliation). Proposed wireframe **long-horizon** gaps (series history, edition ordinal, full knockout observation UI) remain **documented deferrals** in `SPRINT2_UI_DATA_CONTRACT_GAP_MAP.md`, not unique Sprint2 closure blockers evidenced by mandatory 7/7 + bounded vitest.

## Accepted Sprint2 non-browser requirement matrix (bounded)

| UI / wireframe need (TOURNAMENT_UI_WIREFRAME_DRAFT §2–3) | Implementation @ HEAD + local slice | Status |
|-----------------------------------------------------------|-------------------------------------|--------|
| Annual schedule matrix / year navigation | `competition-schedule-matrix.tsx`, `competition-schedule-overview.ts` | **READY** |
| Tournament detail / tabs (overview, participants) | `CompetitionPage.tsx`, `map-competition-view.ts` | **READY** |
| Round-robin standings / pair matrix / history | `competition-round-robin-progress.ts`, vitest + ui009 views | **READY** |
| Manual step + auto weekly progression | `routes-competition.ts`, `competition-auto-progression.ts` | **READY** (imports broken on clean tree—see gap) |
| Champion / finished / annual ranking projection | `map-competition-view.ts`, finalize path | **READY** (local untracked finalize module) |
| Browser-safe fetch binding | `fetch-ui009.ts` | **FIXED locally** (was `response.json()` vs `FetchLike`) |
| Knockout / group-knockout engine path | `competition-engine.ts` → bracket modules | **LOCAL ONLY** — modules missing @ HEAD |
| Series history / 第N回 / durable tournament summary store | gap map G-UI-S2-01/02 | **OUT OF SCOPE** — not mandatory Sprint2 7/7 evidence |

## First reproducible blocker (repository-backed)

`git cat-file -e HEAD:apps/web/src/server/ui009/<module>.ts` **fails** for:

- `competition-bracket-match-execution.ts`
- `competition-bracket-progress.ts`
- `competition-bracket-runtime.ts`
- `competition-group-advancers.ts`
- `competition-group-composition.ts`
- `competition-knockout-seed-mapping.ts`
- `competition-round-robin-finalize.ts`
- `competition-schedule-slot.ts`
- `competition-structural-policy.ts`

Yet **published** `competition-engine.ts`, `routes-competition.ts`, and `competition-auto-progression.ts` @ `e40c60f` import these paths. Local untracked copies satisfy vitest/build on this workstation only.

## Regression verification (this pickup)

```powershell
cd D:\xampp\htdocs\dollworld
npx eslint apps/web/src/server/ui009/competition-auto-progression.ts apps/web/src/server/ui009/routes-competition.ts apps/web/src/server/routes-simulation.ts apps/web/src/server/ui009/map-competition-view.ts apps/web/src/server/ui009/competition-participant-preview.ts
npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts apps/web/src/server/ui009/competition-knockout-auto-progression.test.ts apps/web/src/server/ui009/map-competition-view-lifecycle.test.ts apps/web/src/server/ui009/competition-bracket-progress.test.ts apps/web/src/server/ui009/competition-knockout-seed-mapping.test.ts apps/web/src/server/ui009/competition-round-robin-progress.test.ts apps/web/src/server/ui009/competition-payload-store.test.ts apps/web/src/server/ui009/competition-format-selection.test.ts apps/web/src/server/ui009/competition-engine.test.ts apps/web/src/server/ui009.competition.test.ts
npx vitest run packages/simulation-core/src/sprint2/sprint2-acceptance.test.ts packages/simulation-core/src/sprint2/sprint2-fixed-seven-publish.test.ts
cd apps/web; npx tsc -p tsconfig.client.json --noEmit
git rev-parse HEAD
```

| When | Result |
|------|--------|
| 2026-09-19T10:06+09:00 | **eslint exit 0** |
| 2026-09-19T10:06+09:00 | **ui009 vitest 29/29 PASS** (10 files) |
| 2026-09-19T10:06+09:00 | **simulation-core sprint2 vitest 29/29 PASS** (2 files) |
| 2026-09-19T10:10+09:00 | **client typecheck PASS** (`fetch-ui009` fix) |
| 2026-09-19T10:10+09:00 | **HEAD** `e40c60f71012f6b353a9944bd1e5abd92d9308ab` |

No Playwright run (B2 owns mandatory browser verdict; non-overlap).

## Remaining formal gates

| Gate | Owner | Status |
|------|-------|--------|
| Publish missing ui009 module slice + `fetch-ui009.ts` to `master` | A / publication follow-on | **OPEN** |
| Chrome 7/7 mandatory set | B2 | **READY** (sdk-r13; local dirty Playwright spec only) |
| Wireframe long-horizon history/series projections | Product / later sprint | **DEFERRED** (gap map) |

## Changed files (this pickup)

| File | Note |
|------|------|
| `apps/web/src/client/competition/fetch-ui009.ts` | FetchLike-safe decode (modified, uncommitted) |
| `_handoff-artifacts/audit/CURSOR_ACTIVE_TASK.md` | ACTIVE → IDLE |
| `_handoff-artifacts/results/SPRINT2-NONBROWSER-REMAINING-GAP-SCAN-A-20260919-R1/result.md` | Terminal result |

Untracked ui009 server modules listed above remain **ready to stage** for publication; not committed in this pickup (no commit authority in executor scope).

## Next action

1. **A (publication follow-on):** Single commit on `master` adding the nine missing `apps/web/src/server/ui009/*.ts` modules, their bounded tests (`competition-bracket-progress.test.ts`, `competition-knockout-seed-mapping.test.ts`), and `fetch-ui009.ts`; re-run eslint + ui009 vitest + `npm run build -w @shared-world/web` on clean tree.
2. **PM:** Sprint2 formal closure may proceed once publication slice lands; B2 7/7 already READY on product HEAD binding.
