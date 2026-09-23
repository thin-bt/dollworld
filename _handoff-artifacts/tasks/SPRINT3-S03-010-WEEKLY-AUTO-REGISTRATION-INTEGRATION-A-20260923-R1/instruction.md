# SPRINT3-S03-010-WEEKLY-AUTO-REGISTRATION-INTEGRATION-A-20260923-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: SPEC_TO_SOURCE_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Why this task exists
Fresh canonical S03-008 audit reports a concrete deferred production integration gap: OTL weekly success persists founding history, and S03-010 provides `registerGeneratedTechniqueFromGenerationSuccess` plus generated-technique catalog overlay, but automatic `runSprint1WeeklyStep` does not invoke that adapter. Therefore an autonomously generated original technique can succeed in weekly OTL state without being automatically materialized into the runtime/catalog path consumed by battle. This is a product-chain gap, not a pure-helper gap.

## Required work
1. Fresh-read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, Sprint3 status/backlog/spec, the S03-008 audit result, and current `origin/master` before editing.
2. Preserve all unrelated local/WIP changes. Never broad-stash/clean untracked content. Use `_handoff-artifacts/control-tmp/` only for scratch.
3. Trace the exact weekly OTL success output and S03-010 registration/overlay API. Implement the smallest deterministic production integration so a successful weekly OTL generation is registered/materialized exactly once into the generated-technique catalog/runtime state that subsequent battle catalog construction consumes.
4. Do not invent new product semantics. Reuse canonical generated technique IDs, founding history, materializer, registration adapter, overlay, and existing config. Ensure retries/replays/same-week processing cannot double-register; failed/ineligible/no-generation weeks must remain no-op.
5. Add focused regression coverage proving at minimum: (a) real weekly OTL success automatically creates the generated technique definition/overlay without external seeding; (b) the generated technique is visible to the downstream battle technique catalog; (c) same-week/replay does not duplicate registration; (d) no success means no registration; (e) persisted founding/runtime identity stays aligned with the registered technique ID.
6. Run focused simulation-core build/tests for OTL runtime, generated-technique registration, generated-technique battle consumption, and the new integration regression.
7. If product bytes change, publish the task-relevant delta to canonical master, then run a fresh exact-lineage pristine root `npm run check` and production web build. Update Sprint3 status/backlog live gate only when exact-lineage evidence is PASS; never reuse `bb4ed45` gate for changed product bytes.
8. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-010-WEEKLY-AUTO-REGISTRATION-INTEGRATION-A-20260923-R1/result.md`, including changed paths, exact product SHA, focused counts, root/build evidence, and remaining ordinary-flow/browser risk. Return A inbox to IDLE after terminal publication.

## Acceptance
- Weekly OTL success -> generated-technique materialization/registration -> battle-consumable catalog is automatic on production weekly path.
- Exactly-once/idempotent behavior is regression-locked.
- No unrelated product/control changes.
- Any changed product lineage has fresh root + web build evidence before becoming live Sprint3 gate.

## Non-conflict boundary
Do not edit B2 inbox/task or browser screenshot evidence work. This task owns only S03-010 weekly auto-registration production integration and its focused/release evidence.