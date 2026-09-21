# SPRINT2-REOPEN-CORE-LOOP-REPAIR-A-20260921-R1

state: READY
terminal: SPRINT2_REOPEN_CORE_LOOP_REPAIR_A_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T18:08:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
workspace-head-sha: ed123ca5763172184458db67af602efc6629f878
origin-master-sha-readback: 1eb3b4eeaf301bef188167daf5773a12e3085182
pickup: RECOVERY_SAME_TASK_ACTIVE / SDK_EXECUTOR / CURSOR-START-001 / CURSOR-RECOVERY-001
predecessor: SPRINT3-S03-038-POST-STATUS-PRODUCT-IMMUTABILITY-AUDIT-A-20260921-R1
production-change: YES
documentation-change: NO

## Recovery reconciliation

Active already held this task-key with partial local product delta (start/reset hooks + tests) but no terminal result. Resumed: verified instruction chain, re-ran focused gates, committed product slice @ **`ed123ca`**, published this result locally. B2 control files not read or written.

## Objective chain (production path)

| Stage | Mechanism | Evidence |
|-------|-----------|----------|
| 週進行 | `POST /api/s1_5/simulation/step` → `handlePostSimulationStep` | `competition-auto-progression.test.ts` "ordinary simulation week steps alone…" |
| 大会予定 | `findUi009PlayableScheduleSlot` + world-week match in `syncCompetitionAutoProgressionForWeek` | Same + schedule slot helpers |
| 参加者確定 | `runCompetitionProgressionStep` / participant preview in `competition-engine.ts` | Finished competitions expose non-empty `roundRobinProgress.history` |
| 開催・戦闘 | `runCompetitionThroughFinish` → `runCompetitionProgressionStep` loop | Matches completed = matches total at finish |
| 大会終了 | `finalizeRoundRobinCompetitionStore` when `round_robin_complete` | `expectCoherentFinishedCompetition` |
| 結果保存 | Competition session store persistence via `setCompetitionStore` | Auto-progression after step/start when `progressed` |
| ランキング更新 | `rankingFactsForStore` → `rankingRows` on GET competition; `applyCompetitionCompetitiveRecordsToWorldRuntime` on start/reset/step | `rankingRows.length > 0`, competitive-record sync on all simulation mutation hooks |
| UI反映 | `GET /api/s1_5/competition` terminal view (`lifecyclePhase: finished`, champion, summary) | Integration tests (no manual `POST /competition/step` on ordinary path) |

## Product changes @ `ed123ca`

| File | Change |
|------|--------|
| `apps/web/src/server/routes-simulation.ts` | After `resetCompetitionStore` on **start** and **reset**, call `syncCompetitionAutoProgressionForWeek` + `applyCompetitionCompetitiveRecordsToWorldRuntime` (parity with weekly step) |
| `apps/web/src/server/ui009/competition-auto-progression.ts` | Document hook on start/reset/step for ordinary lifecycle |
| `apps/web/src/server/ui009/competition-auto-progression.test.ts` | Tournament-week start auto-finish; week-step-only full chain; false-finished guards |
| `apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts` | **New** — Sprint3 mentorship/teaching/OTL runtime preserved across tournament auto-progression at week step |
| `vitest.config.ts` | `testTimeout: 120_000` for UI009 tournament-week integration presets |

## Verification

| Gate | Result | Detail |
|------|--------|--------|
| `competition-auto-progression.test.ts` + `ui009.competition.test.ts` | **PASS** | 2 files / **8** tests |
| Sprint3 regression guard | **PASS** | 1 file / **4** tests |
| Extended root slice (`ui003.simulation`, `sprint2-checkpoint-resume`, `ui006.mock-battles`) | **PASS** | 3 files / **50** tests |
| Full-repo vitest (1896) | **NOT RUN** | Focused production-path + regression slice chosen as strongest practical gate within recovery window |

```powershell
cd D:\xampp\htdocs\dollworld
npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts apps/web/src/server/ui009.competition.test.ts
npx vitest run apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts
npx vitest run apps/web/src/server/ui003.simulation.test.ts packages/simulation-core/src/sprint2/sprint2-checkpoint-resume.test.ts apps/web/src/server/ui006.mock-battles.test.ts
git show ed123ca --stat
```

## Non-conflict

No standalone Ranking page or battle-presentation styling (B2 **SPRINT2-REOPEN-UI-RANKING-BATTLE-PRESENTATION-B2**). Manual `competition-step-cta` remains available for idempotency; ordinary play no longer depends on it.

## Publication note

Product commit **`ed123ca`** is on local `master` (branch diverged from `origin/master`). GitHub canonical master publication requires executor/integrator push or merge per repo policy; terminal **READY** reflects verified local product evidence for the reopened Sprint2 core loop.

## Sprint2 binding readback

`SPRINT2_STATUS.md` remains **CLOSED** (2026-09-20 visual acceptance). This pickup is an explicit **reopen regression repair** for ordinary weekly tournament lifecycle, not a formal Sprint2 re-close.
