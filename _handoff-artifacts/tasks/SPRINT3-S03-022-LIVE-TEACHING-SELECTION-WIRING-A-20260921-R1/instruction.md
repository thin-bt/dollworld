# SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_IMPLEMENTATION
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Product gap

Canonical Sprint3 backlog requires S03-008 教授技選択 to be part of the accepted Sprint3 closed loop. `packages/simulation-core/src/sprint3/evaluate-technique-teaching-selection.ts` currently exposes pure `evaluateTechniqueTeachingSelection` / `rankTeachableTechniqueCandidates`, taking a caller-built `TechniqueTeachingSelectionRecord` and `techniqueDefinitionsById`. Role3 canonical search/fresh source inspection found no proven production caller from the live weekly world step. B2 currently owns S03-021 live explicit-weekly-teach wiring; do not edit or overwrite B2-owned teach-action semantics.

## Required execution

1. Fresh-read master and B2 S03-021 authority before edits; claim A ACTIVE for this exact task.
2. Trace the production call chain from live world/mentorship/known-technique state through weekly teaching-selection reevaluation. Prove an existing caller if present; otherwise implement the smallest deterministic live wiring.
3. Derive candidate records from canonical live state, use the canonical technique catalog/overlay (including generated techniques where applicable), invoke `evaluateTechniqueTeachingSelection`, and persist only the minimum selection state needed for deterministic subsequent weekly teach processing.
4. Preserve the documented reevaluation triggers (four-week cadence/new enrollment/current acquisition completion); do not invent new game rules or hard-coded balance values.
5. Keep ownership non-conflicting with B2 S03-021. If its master publication changes an integration surface, fetch/rebase and adapt rather than overwrite its semantics.
6. Add focused regression tests covering at minimum: live eligible candidate selection; ineligible/unknown candidate exclusion/failure according to existing contract; deterministic tie order; reevaluation not-due vs due; generated-technique overlay visibility if live state can contain it; persistence/replay idempotence.
7. Run focused tests and `npm run check`.
8. Publish product source/tests to canonical master, then publish `_handoff-artifacts/results/SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1/result.md` with actual product commit/master SHA and concrete call-chain evidence.
9. READY is forbidden for local-only/unpublished work. GitHub canonical readback of product symbols/tests is required before terminal READY, then return A to IDLE.

## Scope guard

- No Sprint4 work.
- Do not modify B2 control/active-task files or claim S03-021 ownership.
- Do not weaken existing S03-007/S03-008 evaluator contracts merely to make integration pass.
