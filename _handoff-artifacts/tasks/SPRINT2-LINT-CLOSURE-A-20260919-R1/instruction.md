# SPRINT2-LINT-CLOSURE-A-20260919-R1

state: PREPARED
lane: A
sprint: Sprint2
priority: IMMEDIATE
mode: FOCUSED_LINT_CLOSURE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-POST-CONTRACT-COMPLETION-AUDIT-A-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: NO_B2_CONTROL_OR_PLAYWRIGHT_EDITS

## Objective
Close the two concrete Sprint2 lint gaps reported by the immediately preceding A completion audit without changing accepted behavior or taking B2 browser-verdict ownership.

## Required work
1. Fresh-read GitHub canonical control, this instruction, predecessor result, and current worktree before editing.
2. Claim A ACTIVE before changes.
3. Fix only the two reported lint issues in the current Sprint2 dirty slice: `prefer-const` in `apps/web/src/server/ui009/competition-auto-progression.ts` and unused `deps` in `handlePostCompetitionStep` in `apps/web/src/server/ui009/routes-competition.ts`, unless fresh inspection proves either report stale; if stale, document exact evidence instead of inventing a change.
4. Preserve all accepted Sprint2 competition behavior. Do not edit B2 control, Playwright specs, browser acceptance artifacts, or Sprint3/4 surfaces.
5. Run focused ESLint on the inspected/changed Sprint2 server files and bounded relevant Vitest regression sufficient to prove no behavior regression.
6. Publish terminal result at `_handoff-artifacts/results/SPRINT2-LINT-CLOSURE-A-20260919-R1/result.md` with changed files, commands/results, worktree binding, and READY/FIX_REQUIRED.
7. Return A to IDLE after terminal publication.

READY requires both reported lint gaps closed or proven stale, focused ESLint clean for those findings, and relevant Sprint2 regression tests passing.