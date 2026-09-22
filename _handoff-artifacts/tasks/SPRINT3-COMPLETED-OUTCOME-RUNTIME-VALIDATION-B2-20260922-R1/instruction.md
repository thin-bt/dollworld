# SPRINT3-COMPLETED-OUTCOME-RUNTIME-VALIDATION-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Source gap

Fresh current-master inspection of `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` shows that `validateSprint3MentorshipEntrypointRuntimeState()` validates `mentorshipByChildPersonId` entries structurally/semantically, but the three completed-history arrays are only passed through `snapshotDenseArrayOrFail()` and then `cloneValidatedPlainJson()`:

- `completedEnrollmentOutcomes`
- `completedMasterIntakeOutcomes`
- `completedExplicitWeeklyTeachOutcomes`

The public runtime type promises strongly typed entries, while persisted untrusted JSON can therefore carry arbitrary dense JSON objects/scalars in these arrays and still be returned as a successful `Sprint3MentorshipEntrypointRuntimeState`. `processSprint3EnrollmentIntakeBoundary()` subsequently spreads completed enrollment/intake entries as typed history, so the persisted-runtime trust boundary is incomplete.

## Required implementation

1. Add entry-level persisted validators for all three completed-history entry kinds. Reject unknown keys and validate required IDs, safe non-negative `absoluteWeek`, optional child ID where applicable, and the nested outcome shape/closed unions using the existing Sprint3 processor contracts or equivalent explicit validation.
2. Do not merely cast nested outcomes to their TypeScript types. Unknown outcome kinds and malformed required fields must fail validation.
3. Preserve deterministic cloning/freezing and existing schema compatibility unless an actual serialized schema change requires a version change.
4. Add focused regression tests proving malformed scalar/object entries, unknown nested outcome kinds, malformed IDs/weeks, and unknown keys are rejected, while valid completed histories round-trip.
5. Run the focused test slice and the bounded root gate feasible for this lane. Publish exact commands/results and product commit SHA in the canonical result.
6. Do not alter Sprint2/Sprint3 status labels as part of this task.

## Non-conflict / hygiene

- A is occupied by the current-master Sprint2 wireframe audit; do not touch its task/control files.
- Any transient scratch must be under `_handoff-artifacts/control-tmp/`, never directly under `_handoff-artifacts/`.
- Obey `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, including workspace-preservation rules.

## Terminal

Publish `_handoff-artifacts/results/SPRINT3-COMPLETED-OUTCOME-RUNTIME-VALIDATION-B2-20260922-R1/result.md` with TERMINAL result class, exact source/test evidence, and canonical publication SHA.