# SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_IMPLEMENTATION
priority: DEADLINE_CRITICAL
failover: B2_RELEASED_TO_A_20260921

## Authority
- B2 canonical Inbox was explicitly RELEASED after remaining PREPARED/unclaimed while its active lock stayed IDLE. Lane A now owns this existing unique task; do not create a duplicate.
- `docs/SPEC.md` autonomous world progression and original-technique design.
- `docs/SPEC_PREPARATION_PLAN.md` Sprint 3前 includes 技継承・独自技・失伝 and requires state update/process order.
- Existing S03-008 config/pure lifecycle processor is authoritative for thresholds, RNG, retention and cooldown; do not redesign its math.
- S03-011 is locally verified but canonically blocked on these runtime surfaces. Land S03-009 first; do not fold S03-011 into this task.

## Scope
1. Define the minimal persisted per-person original-technique research state required to carry research value and generation cooldown across weekly steps. Reuse existing Sprint3/domain state surfaces where possible.
2. Add deterministic weekly research accumulation input/processor boundary compatible with the existing weekly pipeline. Autonomous progression must remain intact.
3. Wire threshold/cooldown generation attempts through existing `evaluateOriginalTechniqueGenerationAttempt` with the run's deterministic RNG surface.
4. Commit success/failure state atomically: failure retains config-defined research and starts config cooldown; success emits/records the existing founding-history outcome and clears/advances research state per current lifecycle contract.
5. Wire the processor into the production weekly/world-step adapter so it is not test-only or facade-only.
6. Add focused tests proving deterministic accumulation, below-threshold no-attempt, threshold attempt, failure retention + cooldown, cooldown decrement/no reroll, successful founding outcome, and world-step production invocation.
7. Preserve Sprint1/Sprint2 behavior when Sprint3 lifecycle is unbound/disabled.

## Required canonical unblock surfaces
The resulting canonical implementation must provide the persisted lifecycle runtime state and weekly processor needed by S03-011, including equivalent surfaces for `originalTechniqueLifecycleRuntime`, lifecycle runtime state, weekly lifecycle processing, and public exports.

## Non-goals
- generated technique stat synthesis / TechniqueCatalog registration (S03-010)
- first-use MatchId persistence implementation itself (S03-011)
- Sprint4

## Completion
- publish product changes to `master`
- run focused Sprint3 tests and simulation-core build/typecheck
- publish `_handoff-artifacts/results/SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1/result.md` with commit/evidence and READY/BLOCKED, recording lane A failover ownership
- return A to IDLE only after terminal result
- if READY, S03-011 becomes the immediate next canonical recovery task
