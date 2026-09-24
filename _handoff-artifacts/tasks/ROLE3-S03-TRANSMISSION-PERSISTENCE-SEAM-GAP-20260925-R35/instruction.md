# ROLE3-S03-TRANSMISSION-PERSISTENCE-SEAM-GAP-20260925-R35

state: EVIDENCE_COMPLETE
role-origin: Role3
sprint: Sprint3
mode: PRODUCT_GAP_SOURCE_BINDING
control-authority: GitHub `thin-bt/dollworld` / `master`
priority: DEADLINE_RECOVERY

## Unique gap finding

The READY implementation task `SPRINT3-TRANSMISSION-LINEAGE-PERSON-DETAIL-UI-20260924-R1` correctly requires both accepted teaching lineage and generated/original-technique provenance in ordinary Person Detail, but current source exposes two materially different persistence seams that the implementation must not conflate.

### Teaching lineage seam is directly persisted

`packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` persists `completedExplicitWeeklyTeachOutcomes`. Each completed entry binds `absoluteWeek`, `masterPersonId`, and an outcome whose `discipleOutcomes` distinguish `accepted`, `refused`, and `skipped_allocation`. This is a direct persisted source for `master -> technique -> disciple` projection. Only `accepted` disciple outcomes qualify as successful transmission.

### Generated-technique provenance is defined at generation/registration boundary, but Person Detail has no projection seam

`packages/simulation-core/src/sprint3/types.ts` defines `OriginalTechniqueFoundingHistoryRecord` with `founderPersonId`, `newTechniqueId`, `sourceTechniqueIds`, `researchTier`, `firstUseMatchId?`, and `worldWeekIndex`. `adapt-original-technique-generation-registration.ts` requires `generation_succeeded` to carry `foundingHistory` and passes that history into materialization/registration.

However, current `apps/web/src/client/person-detail/ui005-views.ts` remains exact26 and has no teaching-event or founding-provenance field. Therefore implementation must first locate the production-bound persisted runtime holder for founding history on current master and project from that holder; it must not reconstruct provenance from technique possession, display names, catalog membership, or source-technique similarity.

## Canonical implementation constraint

Before editing Person Detail for generated-technique provenance, the executor must trace `OriginalTechniqueFoundingHistoryRecord` from production S03-010 generation success through the production-bound weekly/runtime state and identify the exact persisted collection/object that survives into the server Person Detail read-model input. If no such durable holder is reachable by the Person Detail server path, report that as a concrete persistence/read-model wiring defect and add the smallest deterministic persisted/read-only seam; do not fabricate history client-side.

Teaching lineage may proceed independently from `completedExplicitWeeklyTeachOutcomes`; do not block that projection merely because the founding-history seam needs wiring.

## Acceptance impact

The existing READY task remains authoritative and should not be duplicated. Its generated-technique test must prove the Person Detail projection is sourced from actual persisted founding history, not a synthesized record. Browser acceptance must show the ordinary `技の伝承・系譜` surface without Developer Details.

Sprint3 remains `REOPENED_FIX_REQUIRED`; this evidence does not replace the live exact-lineage gate or any of the three canonical closure residuals.

## Dispatch note

A and B2 canonical inboxes are both PREPARED at this run. Their GitHub audit Active snapshots are IDLE but stale, and no fresh GitHub heartbeat proves either lane unclaimed. Do not overwrite either PREPARED assignment solely from those stale snapshots. When a lane is proven free under the PM heartbeat contract, dispatch the existing `SPRINT3-TRANSMISSION-LINEAGE-PERSON-DETAIL-UI-20260924-R1` task with this source-binding evidence as an implementation constraint.
