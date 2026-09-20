# SPRINT3-S03-016-LIVE-MASTER-QUALIFICATION-PERSISTENCE-ROLE3-20260921-R1

state: QUEUED_NOT_DISPATCHED
sprint: Sprint3
priority: DEADLINE_CRITICAL
authority: GitHub thin-bt/dollworld master
owner: next free A/B2 lane

## Concrete product gap

S03-002 is marked implemented in `docs/SPRINT_3_BACKLOG.md`, but its product source `packages/simulation-core/src/sprint3/evaluate-master-qualification.ts` is a pure evaluator over a caller-supplied `MasterQualificationEvaluationRecord`. The Sprint3 live enrollment path requires master candidates to carry qualification truth derived from actual retired-character rank/official record. Canonical closure needs evidence that production world state derives and refreshes that truth at the retirement/life-status boundary rather than tests or callers injecting a pre-qualified flag/record.

This task is deliberately disjoint from B2 S03-015 generated-technique battle consumption and A PRE-S03-015 evidence-manifest work.

## Required work

1. Fresh-read protocol, A/B2 lane state, Sprint3 backlog/spec, current master and newest Sprint3 results before edits.
2. Trace `evaluateMasterQualificationEligibility` from production world-step/enrollment candidate materialization back to canonical character/career/battle-record state.
3. Prove one of these outcomes with exact source/test references:
   - LIVE_CONNECTED: qualification is deterministically derived/refreshed from persisted world state and consumed by live enrollment; or
   - PRODUCT_GAP: production currently injects/assumes qualification or never refreshes it.
4. If PRODUCT_GAP and bounded, implement the smallest deterministic adapter/wiring needed. Do not redesign domain schema unless unavoidable. Preserve no-global-disciple-limit and existing enrollment/intake semantics.
5. Add focused regression tests covering at least: qualified retired living character becomes candidate; active/non-retired is not qualified; dead/non-living is not qualified; below-threshold record is rejected; deterministic replay/input ordering; qualification changes after the relevant persisted record/status transition.
6. Run focused tests and root `npm run check` when feasible. Record exact commands/results.
7. Publish product source/test changes to canonical `master`, then read back the changed paths from GitHub. Local-only work is not READY.
8. Write terminal result under `_handoff-artifacts/results/<task-key>/result.md` with published master SHA and evidence. Return lane to IDLE only after terminal publication.

## Collision guard

- Do not edit S03-015 generated-technique battle lookup/overlay work.
- Do not take over the A release-evidence-manifest task.
- If either active lane has begun touching the same qualification/world-state files, stop with BLOCKED and name the exact collision instead of parallel editing.

## Acceptance

READY only when live qualification derivation/persistence is either proven already connected with production call-chain evidence, or the bounded missing wiring is implemented, tested, published to master, and GitHub-readback verified.