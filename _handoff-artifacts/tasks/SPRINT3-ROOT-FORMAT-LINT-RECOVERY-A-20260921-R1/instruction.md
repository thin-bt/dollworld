# SPRINT3-ROOT-FORMAT-LINT-RECOVERY-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: IMPLEMENTATION_VERIFICATION
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor-evidence: _handoff-artifacts/results/SPRINT3-FINAL-RELEASE-GATE-A-20260921-R1/result.md

## Objective

Recover the remaining formal Sprint3 root `npm run check` gate on current canonical master. The latest final gate proves product slices S03-001..S03-011, root typecheck, root test (1848/1848), simulation-core build, and wiki check are green; the remaining executable blockers are `format:check` (109 files) and `lint` (39 errors).

## Required execution

1. Fresh-fetch/read `origin/master` and this instruction; claim ACTIVE before edits.
2. Re-run `npm run format:check` and `npm run lint` once on current master and capture the exact current failing paths/rules. Do not reuse stale counts as truth.
3. Classify failures into formatting-only vs lint-semantic. Apply only mechanical/non-gameplay fixes needed for the root gate:
   - Prettier-only normalization is allowed for files actually reported by current `format:check`, including older Sprint2/UI009 paths when they are the direct formal-gate blocker.
   - Lint fixes must preserve runtime/test semantics: remove genuinely unused imports/locals, replace unsafe test typing with existing project-safe types, or make equivalent mechanical corrections.
   - Do not disable ESLint rules, add blanket ignores, skip tests, weaken tsconfig/strictness, or change gameplay behavior.
4. Keep edits bounded to files currently reported by format/lint plus unavoidable config-neutral generated formatting. Do not alter Sprint3 feature semantics, backlog status prose, or B2 control/task/result files.
5. Verify in this order: `npm run format:check`; `npm run lint`; `npm run typecheck`; `npm run test`; `npm run wiki:check`; `npm run check`. If a later gate exposes a new mechanical defect caused by the fixes, repair it within the same bounds and rerun the affected family.
6. Commit/push product fixes to canonical master and verify GitHub/master readback. Publish terminal result under `_handoff-artifacts/results/SPRINT3-ROOT-FORMAT-LINT-RECOVERY-A-20260921-R1/result.md` with exact commands/counts and product commit SHA.

## READY condition

`npm run check` passes on the canonical product tree, with no test/strictness/rule suppression and no gameplay semantic change. If a non-mechanical or scope-authority blocker remains, publish BLOCKED with exact files/rules and the smallest next implementation slice; do not claim READY.

## Collision guard

B2 is currently IDLE after independent Sprint3 acceptance. Do not write B2 control/task/result paths. Do not consume or wait for ROLE2_INBOX.md.