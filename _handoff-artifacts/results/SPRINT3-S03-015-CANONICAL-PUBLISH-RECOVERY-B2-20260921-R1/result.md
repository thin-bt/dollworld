# SPRINT3-S03-015-CANONICAL-PUBLISH-RECOVERY-B2-20260921-R1

terminal: SPRINT3_S03_015_CANONICAL_PUBLISH_RECOVERY_B2_READY
lane: B2
updatedAt: 2026-09-21T09:13:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Summary

Reconstructed and published the bounded S03-015 generated-technique production battle lookup integration on canonical `master`. Optional `GeneratedTechniqueCatalogOverlay` now merges into real battle technique resolution while base `TechniqueCatalogIdentity` stays immutable.

## Production call chain (post-fix)

| Step | Path | Technique lookup source |
|------|------|-------------------------|
| Battle start preflight | `create-battle-state.ts` → `preflightCreateBattleRequest` | `collectKnownTechniqueIdsForBattle(baseDefinitions, optional overlay)` |
| Turn execution | `resolve-battle-turn.ts` Phase C | `buildBattleTechniqueDefinitionCatalogMap(...)` |
| Action replacement | `battle-action-replacement.ts` → `replaceIllegalBattleAction` | merged `catalogById` (overlay-aware) |
| Replay | `battle-detailed-log-replay.ts` | merged catalog via optional overlay param |
| Finalize | `finalize-battle-result.ts` | replay with optional overlay from finalize input |
| Run pipeline | `run-battle-to-completion.ts` | threads overlay from `CreateBattleRequest` through resolve + finalize |
| Commit preflight | `commit-run-battle-plan.ts` | `runtimeState.generatedTechniqueCatalogOverlay` merged into `knownTechniqueIds` |
| Tournament handoff | `tournament-battle-handoff.ts` | runtime overlay on participant validation + `createBattleRequest` |

New helper module: `packages/simulation-core/src/sprint3/generated-technique-battle-catalog.ts`.

Runtime persistence: optional `Sprint1RunRuntimeState.generatedTechniqueCatalogOverlay` (validated in run session / weekly transition).

## Verification

```text
npm run test -- packages/simulation-core/src/sprint3/generated-technique-battle-consumption.test.ts
# 6 passed (GBC-001..006)

npm run typecheck -w @shared-world/simulation-core
# exit 0
```

## Product commit SHA

`031d415d86f648b95be8bb0c9a6c7f7b088a7ce6`

## Canonical readback evidence

```text
git rev-parse origin/master
# 031d415d86f648b95be8bb0c9a6c7f7b088a7ce6

git show origin/master:packages/simulation-core/src/sprint3/generated-technique-battle-catalog.ts
# present (S03-015 merge helpers)

git show origin/master:packages/simulation-core/src/sprint3/generated-technique-battle-consumption.test.ts
# GBC-002 replaceIllegalBattleAction overlay path regression present
```

## Non-conflict guard

No edits to S03-016 live master qualification/enrollment domain or Cursor A control files.
