# SPRINT3-RYUHA-LINEAGE-SCOPE-RECONCILIATION-20260924-R1

state: READY_FOR_DISPATCH_WHEN_LANE_FREE
sprint: Sprint3
mode: SPEC_TO_SOURCE_PRODUCT_GAP_RECONCILIATION
authority: GitHub `thin-bt/dollworld` / `master`

## Why this task exists

Role3 result `ROLE3-S03-ROADMAP-RYUHA-LINEAGE-SCOPE-GAP-20260923-R16` confirmed a scope-accounting gap: roadmap-level Sprint3 wording names `流派・系譜`, while the canonical Sprint3 backlog main table S03-001..011 covers mentorship, teaching, OTL runtime/materialization and first-use MatchId, and explicitly keeps retirement/genetics/family-lineage schema in Sprint4.

Do not infer either that a new family-lineage system is required or that the roadmap objective is already satisfied. Reconcile it against current source/product behavior.

## Required work

1. Fresh-read `docs/SPEC_PREPARATION_PLAN.md`, `docs/SPRINT_3_BACKLOG.md`, relevant Sprint3 mini-specs, current Sprint3 status, and current `master` source/UI.
2. Trace the intended Sprint3 meaning of `流派` / `系譜` to concrete existing semantics, including mentorship relations, taught-technique provenance, OTL founding history, generated-technique catalog registration, loss, and any ordinary UI surface that exposes those relationships.
3. Produce an explicit matrix: roadmap objective -> spec/backlog contract -> persisted/runtime source -> ordinary user-facing UI -> acceptance evidence.
4. If existing product fully satisfies the objective, update canonical Sprint3 backlog wording so the mapping is explicit and no new product semantics are invented.
5. If a user-visible/product semantic is genuinely absent, implement only the smallest Sprint3 slice required to expose the existing mentorship/technique lineage meaning. Do NOT introduce Sprint4 retirement, genetics, marriage/birth, family-lineage schema, or inheritance semantics.
6. Add focused regression coverage for any product/source change. If product bytes change, obtain a fresh exact-lineage root gate and production web build before proposing replacement of the current live gate.
7. Preserve `SPRINT3_STATUS.md` as `REOPENED_FIX_REQUIRED` unless PM/control separately establishes all formal closure requirements. Do not erase the S03-010 long-run browser residual or S03-006 ordinary-flow residual.
8. Publish a terminal canonical result under `_handoff-artifacts/results/SPRINT3-RYUHA-LINEAGE-SCOPE-RECONCILIATION-20260924-R1/result.md` with exact files/source/UI/evidence and final classification: `SATISFIED_BY_EXISTING_PRODUCT`, `PRODUCT_FIX_PUBLISHED`, or `FIX_REQUIRED`.

## Acceptance

- No Sprint4 family/genetic lineage scope is pulled into Sprint3.
- `流派・系譜` is no longer an unaccounted roadmap phrase: it has an exact accepted mapping or a concrete minimal product repair.
- Any product repair is tested and gated on its exact product lineage.
- Existing A/B2 work is not overwritten; dispatch only when a lane is genuinely free under the control-plane lane contract.
