# SPRINT3-S03-024-LIVE-TECHNIQUE-LOSS-CLOSURE-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
priority: DEADLINE_CRITICAL
mode: IMPLEMENTATION_VERIFICATION

## Authority
- GitHub canonical `thin-bt/dollworld` `master` only.
- Fresh-read protocol, A/B2 lane state, newest Sprint3 results, `docs/SPRINT_3_BACKLOG.md`, `docs/specs/15-sprint3-config-schema.md`, and product source before editing.
- Do not modify or consume ROLE3_INBOX.md.
- Preserve A ownership of S03-023 teaching-selection consumption; fetch/rebase before publication and do not overwrite its semantics.

## Product gap
Sprint3 canonical scope requires original-technique loss as a state-updating closed loop. Master now contains `derive-live-original-technique-loss-evaluation.ts`, which derives living practitioners and registered successor practitioners from live world/mentorship state, but this slice must be verified through the production weekly/world entrypoint and persisted loss history/catalog behavior rather than accepted as a helper-only implementation.

## Required execution
1. Trace from the real weekly/world production entrypoint to `buildOriginalTechniqueLossEvaluationRecord` / `evaluateOriginalTechniqueLoss` (or equivalent) and then to persisted Sprint3 runtime/world state.
2. If the derivation/evaluation is not actually called from production, add the smallest deterministic wiring needed.
3. Verify that a technique with a living practitioner is not lost; a living registered successor practitioner prevents loss; complete extinction records loss exactly once; replay/empty-slice processing is idempotent; already-lost techniques are not re-emitted; deterministic ordering is stable.
4. Verify what happens to TechniqueCatalog overlay visibility after loss. Follow existing Sprint3 spec/backlog authority; do not invent destructive catalog deletion unless explicitly required. If the intended behavior is historical loss marking while definition remains resolvable, encode that in tests/evidence.
5. Add focused regression tests at the production boundary, not only helper-unit tests.
6. Run focused tests plus the strongest feasible repository check (`npm run check` if feasible). Do not claim green without command evidence.
7. Publish product source/tests to canonical `master`, then publish `_handoff-artifacts/results/SPRINT3-S03-024-LIVE-TECHNIQUE-LOSS-CLOSURE-B2-20260921-R1/result.md` with exact commits, files, tests, and remaining blockers.
8. Only after canonical readback, set B2 inbox IDLE with terminal READY. If blocked, publish concrete BLOCKED evidence and return inbox IDLE; do not leave PREPARED/ACTIVE indefinitely.

## Non-goals
- No Sprint4 retirement/lineage schema expansion.
- No changes to A S03-023 teaching-selection semantics.
- No speculative redesign of technique catalog/history contracts.

## Acceptance
READY requires a canonical source-level proof that live world state can cause deterministic original-technique loss and that the loss is persisted/idempotent through the production entrypoint, with focused regression tests and GitHub readback.