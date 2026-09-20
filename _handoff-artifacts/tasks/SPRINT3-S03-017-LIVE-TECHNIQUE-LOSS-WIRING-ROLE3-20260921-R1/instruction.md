# SPRINT3-S03-017-LIVE-TECHNIQUE-LOSS-WIRING-ROLE3-20260921-R1

state: READY_FOR_DISPATCH
priority: DEADLINE_CRITICAL
sprint: Sprint3
owner: next-free A-or-B2 lane
authority: GitHub canonical `thin-bt/dollworld` `master`

## Product gap

Sprint3 canonical backlog explicitly includes `技継承・独自技・失伝` and requires state update / production closed-loop behavior. `packages/simulation-core/src/sprint3/evaluate-original-technique-lifecycle.ts` implements pure `evaluateOriginalTechniqueLoss(record)` from caller-supplied practitioner/successor counts, but a fresh canonical source search found no production caller of `evaluateOriginalTechniqueLoss`. Therefore loss/extinction appears pure-only: there is no demonstrated live-world derivation of practitioner/successor counts, no deterministic world-step invocation, and no demonstrated persistence of the lost/extinct state.

This task is deliberately separate from A S03-016 live master qualification and B2 S03-015 generated-technique battle consumption.

## Required execution

1. Fresh-read `master`, Sprint3 backlog/spec, protocol, lane state, and newest related results before editing.
2. Trace the complete live call chain for technique loss/extinction: live people/known-technique/successor state -> `OriginalTechniqueLossEvaluationRecord` -> `evaluateOriginalTechniqueLoss` -> persisted world/catalog/history state.
3. If a complete production chain already exists under another symbol, publish exact file/symbol/test evidence and close as `LIVE_CONNECTED`; do not duplicate it.
4. If absent (current canonical evidence), implement the smallest deterministic production wiring needed to close the Sprint3 loss lifecycle. Do not redesign lineage/retirement Sprint4 scope.
5. Required regression coverage at minimum:
   - living practitioner => not lost;
   - no living practitioner but living registered successor practitioner => not lost;
   - zero living practitioner and zero living successor practitioner => lost;
   - death/state transition can move a technique to lost exactly once;
   - deterministic replay/order independence for equivalent live state;
   - generated/base technique catalog identity is not mutated incorrectly.
6. Run focused tests and root `npm run check` when feasible. Record any unrelated pre-existing failure precisely.
7. Publish product source/tests and terminal result to canonical `master`; READY requires GitHub readback of actual product files/symbols, not local-only evidence.

## Collision guard

- Do not touch S03-016 live master qualification files/authority owned by Cursor A while active/prepared.
- Do not touch S03-015 generated-technique battle-consumption files/authority owned by Cursor B2 while active/prepared.
- Do not alter Sprint4 retirement/inheritance/lineage schema.

## Terminal result path

`_handoff-artifacts/results/SPRINT3-S03-017-LIVE-TECHNIQUE-LOSS-WIRING-ROLE3-20260921-R1/result.md`

Terminal verdict must be one of `READY`, `BLOCKED`, `SUPERSEDED`, with exact canonical master SHA and product evidence.