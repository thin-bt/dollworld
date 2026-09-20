# SPRINT3-S03-015-GENERATED-TECHNIQUE-BATTLE-CONSUMPTION-B2-20260921-R1

terminal: SPRINT3_S03_015_GENERATED_TECHNIQUE_BATTLE_CONSUMPTION_B2_BLOCKED
lane: B2
updatedAt: 2026-09-21T08:42:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Summary

Pre-implementation audit on current checkout (`HEAD` `c6ca72178d6c3f30314f6fddf0f437fa01b2634b`) confirms **S03-010 overlay is not consumed by the production battle/action-definition path**. Only helper-level `lookupTechniqueDefinitionWithOverlay` exists; battle turn resolution still builds its catalog exclusively from `RunRuleSnapshot.techniqueDefinitions` (immutable base catalog).

B2 implemented the bounded integration design locally during this run (runtime overlay on `Sprint1RunRuntimeState`, optional overlay on `CreateBattleRequest` / `BattleState`, merged catalog in `resolveBattleTurn` / detailed-log replay / commit preflight / tournament handoff, GBC regression tests). **Those product edits did not remain in the working tree at terminalization** (workspace sync reset `packages/simulation-core` to canonical HEAD mid-run; only handoff/control artifacts retained ACTIVE lock). No product commit was published to canonical master in this run.

## Production call chain (pre-fix canonical master)

| Step | Path | Technique lookup source |
|------|------|-------------------------|
| Battle start | `create-battle-state.ts` → `preflightCreateBattleRequest` | `knownTechniqueIds` from `runRuleSnapshot.techniqueDefinitions` only |
| Turn execution | `resolve-battle-turn.ts` Phase C | `catalog` built by iterating `snapshot.techniqueDefinitions` only |
| Action replacement | `battle-action-replacement.ts` → `replaceIllegalBattleAction` | `context.catalogById.get(techniqueId)` — missing overlay ⇒ `unknown_technique` |
| Replay | `battle-detailed-log-replay.ts` | base `techniqueDefinitions` map only |
| Commit preflight | `commit-run-battle-plan.ts` | `knownTechniqueIds` from `context.techniqueCatalog.definitions` only |
| Tournament handoff | `tournament-battle-handoff.ts` → `runBattleToCompletion` | same base-only `knownTechniqueIds` / `createBattleRequest` |

S03-010 overlay registration (`generated-technique-catalog-overlay.ts`, `registerGeneratedTechniqueInOverlay`) is **not referenced** by any of the above production paths on canonical master.

## Intended integration (not landed on master this run)

- `generated-technique-battle-catalog.ts`: `buildBattleTechniqueDefinitionCatalogMap`, `collectKnownTechniqueIdsForBattle`
- Thread optional `generatedTechniqueCatalogOverlay` through runtime session, create-battle request, battle state, and handoff
- Regression: `generated-technique-battle-consumption.test.ts` (GBC-002/003 on `replaceIllegalBattleAction` path)

## Verification

```text
# Canonical readback (no overlay battle wiring)
git show HEAD:packages/simulation-core/src/sprint1/resolve-battle-turn.ts
# → catalog built only from snapshot.value.techniqueDefinitions (no overlay merge)

git rev-parse HEAD
# c6ca72178d6c3f30314f6fddf0f437fa01b2634b
```

Focused tests were green when integration files were present locally during the run; they are **not** reproducible from the current tree because product sources reverted.

## Product commit SHA

(none — workspace did not retain publishable product diff; `git diff --stat packages/simulation-core/src` empty at terminal lock aside from unrelated churn)

## Terminal reason (CURSOR-B2-001 bounded recovery)

Bounded implementation attempt exhausted by **workspace sync loss** before canonical master publish/readback. Outcome finalized as **BLOCKED** (not a same-case retry ladder). Re-dispatch required on a stable worktree to land product commit + GBC tests + master readback for READY.
