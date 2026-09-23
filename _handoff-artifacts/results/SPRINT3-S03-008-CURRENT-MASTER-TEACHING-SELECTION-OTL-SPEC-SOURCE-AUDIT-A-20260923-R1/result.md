# SPRINT3-S03-008-CURRENT-MASTER-TEACHING-SELECTION-OTL-SPEC-SOURCE-AUDIT-A-20260923-R1

state: TERMINAL
terminal: SPRINT3_S03_008_CURRENT_MASTER_TEACHING_SELECTION_OTL_SPEC_SOURCE_AUDIT_A_PASS
verificationOutcome: PASS
resultClass: SPEC_TO_SOURCE_CLOSURE
lane: A
task-key: SPRINT3-S03-008-CURRENT-MASTER-TEACHING-SELECTION-OTL-SPEC-SOURCE-AUDIT-A-20260923-R1
updatedAt: 2026-09-23T12:16:30+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-007-CURRENT-MASTER-EXPLICIT-TEACH-SPEC-SOURCE-AUDIT-A-20260923-R1
canonical-origin-master-product-sha: bb4ed45ca53a2c0e64eeb0649f19b98afbf48fdf
audited-local-worktree-head: 9da74a532325605a95882613f6d71aca118a990f
origin-master-head-at-pickup: 8e2bd7b12a6dc605ad80329a05aac2533bf4078c
production-change: NO
publication-commit: (none)
live-release-gate-superseded: NO
sprint3-control-state: REOPENED_FIX_REQUIRED (unchanged — formal CLOSED not assigned)
live-release-gate-binding: SPRINT3-S03-006-PTG-REGRESSION-PUBLICATION-GATE-A-20260923-R1 @ product bb4ed45 (1975/1975)

## Summary

Bounded current-master **S03-008** spec-to-source audit on canonical product lineage **`bb4ed45`**:教授技選択 pure + runtime 永続化/consumption、OTL pure + 週次研究/生成/創始履歴永続化、および受理済み downstream 境界（explicit teach consumption、生成技 overlay/battle、失伝/初使用 MatchId）。**No product gap** on master relative to accepted historical evidence; focused production-chain regressions (**67/67**) lock live wiring. **No code churn** in this run.

## Audit question findings

| Question | Finding |
|----------|---------|
| Teaching selection from real persisted master/disciple technique state (deterministic ordering/ties)? | **YES** — `processTechniqueTeachingSelectionWeek` derives pairs from live `mentorshipByChildPersonId` + `buildWeeklyTrainingPersonRecords(worldState, sidecars, mentorship)`; pure `evaluateTechniqueTeachingSelection` / rank (**TS-007**); same-week skip prevents duplicate persist |
| Persisted selection consumed by explicit weekly teach without stale/invalid ID bypass? | **YES** — `pickTechniqueIdFromPersistedSelectionSnapshot` → top ranked ID; invalid/missing definition skipped fail-closed (**TTS-L002**); falls back to live re-eval only when snapshot missing/stale per re-evaluation policy |
| OTL research uses live weekly state/config and persists once per eligible week? | **YES** — `processOriginalTechniqueLifecycleWeek` reads `worldState.persons` + config thresholds; `lastProcessedAbsoluteWeek` on runtime; cooldown decrements once per person-week (**OTR-001..007**) |
| Generation handoff materializes into catalog/runtime without double registration or pure-only dead ends? | **BOUNDED YES** — weekly OTL persists `foundingHistories` on success (**OTR-006**); S03-010 adapter `registerGeneratedTechniqueFromGenerationSuccess` + overlay (**GTR-007/008**) is published and tested; **automatic** weekly `runSprint1WeeklyStep` does **not** invoke adapter (unchanged since S03-010 READY — integration slice deferred, not a current-master regression). Battle/loss paths consume canonical IDs when overlay/runtime present (**GBC-***, **OTL-L***) |
| Loss/reset/eligibility and generated-technique battle consumption share canonical IDs/state? | **YES** — `processOriginalTechniqueLossWeek` + `derive-live-original-technique-loss-evaluation` on same runtime founding/loss histories; battle catalog merge via `buildBattleTechniqueDefinitionCatalogMap` / `generatedTechniqueCatalogOverlay` (**GBC-002/005**, **OTL-L006/L007**) |
| Disabled/ineligible/no-candidate/invalid states fail-closed and deterministic? | **YES** — **TS-002..004**, **TS-010**; OTL **OTL-002/006**, **OTR-007**; teaching-selection week no-op when feature unbound/disabled |
| Historical S03-008 evidence no longer proves live production boundary? | **NO regression** — pure **TS-001..010** / **OTL-001..009** unchanged in role; live wiring evidence **TTS-L***, **OTR-***, **OTL-L***, **GTR-***, **GBC-*** still pass on audited worktree |

## Gap finding

| Finding | Detail |
|---------|--------|
| Product gap | **None** on canonical **`bb4ed45`** for accepted S03-008 + wired consumption slices |
| Known non-regression deferral | OTL success → catalog overlay **auto-registration** in weekly step remains adapter-ready but not production-invoked (documented at S03-010 publication); outside S03-008 pure slice, not introduced by current lineage |
| Test gap | **None requiring repair** |
| Repair | **None** |

## Spec-to-source chain (canonical paths / symbols)

| Stage | Authority | Live symbol / path |
|-------|-----------|-------------------|
| Config — teaching selection | `docs/specs/15-sprint3-config-schema.md` §4; backlog S03-008 | `sprint3-balance-0.8.0`, `techniqueTeachingSelectionEnabled`, `teachingSelection` policy |
| Pure teaching selection | S03-008 | `evaluate-technique-teaching-selection.ts` → `evaluateTechniqueTeachingSelection`, `rankTeachableTechniqueCandidates`, `evaluateTeachingSelectionReEvaluationDue` |
| Runtime persist selection | S03-021/022 | `process-technique-teaching-selection-week.ts` → `processTechniqueTeachingSelectionWeek`; `technique-teaching-selection-runtime-state.ts` |
| Explicit teach consumption | S03-023 | `derive-live-explicit-weekly-teach-disciple-requests.ts` → `pickTechniqueIdFromPersistedSelectionSnapshot` |
| Config — OTL | §4 `sprint3-balance-0.9.0` | `originalTechniqueLifecycleEnabled`, `originalTechniqueLifecycle` policy |
| Pure OTL | S03-008 | `evaluate-original-technique-lifecycle.ts` → `evaluateOriginalTechniqueGenerationAttempt`, `evaluateOriginalTechniqueLoss`, `buildOriginalTechniqueFoundingHistoryRecord` |
| OTL weekly persist | S03-009 | `process-original-technique-lifecycle-week.ts` → `processOriginalTechniqueLifecycleWeek`; `original-technique-lifecycle-runtime-state.ts` |
| Materialization / overlay | S03-010 | `materialize-generated-technique-definition.ts`, `adapt-original-technique-generation-registration.ts`, `generated-technique-catalog-overlay.ts` |
| Loss weekly | S03-020/024 | `process-original-technique-loss-week.ts`, `derive-live-original-technique-loss-evaluation.ts` |
| First-use MatchId | S03-011 | `persist-original-technique-first-use-match-id.ts` (battle-commit hook) |
| Production orchestration | S01-008 | `sprint1-weekly-step.ts` — order: teaching selection → explicit teach materialize/process/apply → OTL week → OTL loss |
| Web production flags | apps/web | `production-sprint3-run-session-binding.ts` — selection + OTL enabled on balance 0.9.0 bundle |

## Prior canonical artifacts (master)

- Backlog: `docs/SPRINT_3_BACKLOG.md` — S03-008 **implemented**; S03-009/010/011 + S03-021..023/015/020 evidence **ACCEPT**
- Teaching selection wiring: `SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1`
- Selection consumption: `SPRINT3-S03-023-LIVE-TEACHING-SELECTION-CONSUMPTION-A-20260921-R1` @ `47bdb9b`
- OTL runtime: `SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1` @ `b81df17`
- Materialization: `SPRINT3-S03-010-PUBLICATION-RECOVERY-A-20260921-R1`
- Battle consumption: `SPRINT3-S03-015-GENERATED-TECHNIQUE-BATTLE-CONSUMPTION-B2-20260921-R1`

## Changed paths (this run)

| Path | Change |
|------|--------|
| (none) | Audit-only — no `apps/**` or `packages/**` delta for this task slice |

**Note:** Local worktree carries unrelated WIP (web competition, mentorship runtime validation tests, handoff artifacts) — **not** attributed to S03-008 audit.

## Verification

```powershell
cd D:\xampp\htdocs\dollworld
npm run build -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/technique-teaching-selection.test.ts packages/simulation-core/src/sprint3/live-technique-teaching-selection-wiring.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime.test.ts packages/simulation-core/src/sprint3/generated-technique-registration.test.ts packages/simulation-core/src/sprint3/generated-technique-battle-consumption.test.ts packages/simulation-core/src/sprint3/live-original-technique-loss-wiring.test.ts packages/simulation-core/src/sprint3/live-original-technique-loss-entrypoint.test.ts packages/simulation-core/src/sprint3/original-technique-first-use-match-id.test.ts
```

| Check | Result |
|-------|--------|
| Fresh-read GITHUB_CONTROL_PLANE + SPRINT3_STATUS + backlog S03-008 + spec §4 + prior S03-009/010/021-023 results | **PASS** |
| Fresh-read `origin/master` product SHA (`apps/` + `packages/`) | **PASS** — **`bb4ed45`** (tip **`8e2bd7b`** control-only ahead) |
| A ACTIVE lock (CURSOR-START-001) | **PASS** |
| `@shared-world/simulation-core` build (`tsc`) | **PASS** |
| Focused S03-008 production-chain vitest (9 files) | **PASS** — **67/67** (TS-001..010, TTS-L001/L002/L004, OTL-001..009, OTR-001..009, GTR-001..008, GBC-001..006, OTL-L001..010, first-use MatchId suite) |
| Root `npm run check` / web build | **NOT RUN** — no product change; live gate @ **`bb4ed45`** unchanged |

## Remaining ordinary-flow acceptance risk

No dedicated real-browser evidence for autonomous OTL research progression or teaching-selection UI surfacing; production wiring and focused regressions suffice for spec-to-source closure. Full weekly OTL-success → catalog overlay without external seed remains a documented integration deferral, not a blocker for this audit slice.

## Disposition

**PASS** — S03-008 teaching selection + OTL pure processors and accepted production consumption boundaries remain aligned on current-master product **`bb4ed45`** with no spec-to-source regression. Formal Sprint3 **CLOSED** not assigned. Live release gate remains **PTG-011/012** @ **`bb4ed45`** (**1975/1975**).

## Control readback

- Inbox consumed target: `SPRINT3-S03-008-CURRENT-MASTER-TEACHING-SELECTION-OTL-SPEC-SOURCE-AUDIT-A-20260923-R1`
- Active returned **IDLE** after terminal result
- B2 control files untouched

## Out of scope

No B2 inbox/active edits. No Sprint3 status/backlog publication (no product delta). No browser capture.
