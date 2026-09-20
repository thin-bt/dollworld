# SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: PRODUCT_IMPLEMENTATION
priority: DEADLINE_CRITICAL

## Authority
- `docs/SPEC.md` autonomous world progression and original-technique design
- `docs/SPEC_PREPARATION_PLAN.md` Sprint 3前 includes 技継承・独自技・失伝 and requires state update/process order
- `_handoff-artifacts/results/SPRINT3-RUNTIME-WIRING-GAP-AUDIT-B2-20260920-R1/result.md`
- Existing S03-008 config/pure lifecycle processor is authoritative for thresholds, RNG, retention and cooldown; do not redesign its math.

## Scope — bounded first recovery slice
Implement the smallest production/runtime connection for original-technique research/generation:
1. Define the minimal persisted per-person original-technique research state required to carry research value and generation cooldown across weekly steps. Reuse existing Sprint3/domain state surfaces where possible; do not invent unrelated lineage schema.
2. Add deterministic weekly research accumulation input/processor boundary compatible with the existing weekly pipeline. Do not add user-controlled actions; autonomous progression must remain intact.
3. Wire threshold/cooldown generation attempts through existing `evaluateOriginalTechniqueGenerationAttempt` with the run's deterministic RNG surface.
4. Commit success/failure state atomically: failure retains config-defined research and starts config cooldown; success emits/records the existing founding-history outcome and clears/advances research state as required by the current lifecycle contract. Do not yet synthesize/register generated TechniqueCatalog stats; that is S03-010.
5. Wire the processor into the production weekly/world-step adapter so it is not test-only or facade-only.
6. Add focused tests proving deterministic accumulation, below-threshold no-attempt, threshold attempt, failure retention + cooldown, cooldown decrement/no reroll, successful founding outcome, and world-step production invocation.
7. Preserve Sprint1/Sprint2 behavior when Sprint3 lifecycle is unbound/disabled.

## Non-goals
- generated technique stat synthesis / TechniqueCatalog or school registration (S03-010)
- first-use MatchId persistence (S03-011)
- lane A root typecheck/formal recovery artifacts
- Sprint4 retirement/genetics

## Completion
- publish product changes to `master`
- run focused Sprint3 tests and simulation-core build/typecheck relevant to touched boundaries
- publish `_handoff-artifacts/results/SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1/result.md` with commit/evidence and READY/BLOCKED
- return B2 to IDLE only after terminal result
