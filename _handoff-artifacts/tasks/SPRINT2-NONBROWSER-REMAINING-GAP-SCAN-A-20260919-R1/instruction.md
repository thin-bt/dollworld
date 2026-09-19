# SPRINT2-NONBROWSER-REMAINING-GAP-SCAN-A-20260919-R1

state: PREPARED
lane: A
sprint: Sprint2
priority: IMMEDIATE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-FINAL-COMPLETION-EVIDENCE-AUDIT-A-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1

## Objective

Keep A productive while B2 owns browser-contract reconciliation/reacceptance. Fresh-read accepted Sprint2 specifications/wireframes and current master, then identify and close any remaining **unique non-browser, non-conflicting Sprint2 implementation or unit-test gap** outside B2-owned Playwright/acceptance-control surfaces.

## Required work

1. Fresh-read GitHub canonical protocol, this instruction, current A/B2 inboxes, latest Sprint2 terminal results, accepted Sprint2 spec/wireframe sources present in repository, and current master evidence.
2. Do NOT edit B2 control files, Playwright specs, browser acceptance fixtures, or the round-robin terminal contract currently owned by B2.
3. Build a bounded accepted-Sprint2 requirement-to-implementation matrix for remaining non-browser surfaces, prioritizing wireframe/UI elements that have not yet been evidenced by prior completion audits.
4. If a unique executable gap exists outside B2 ownership, implement the smallest correction and add/run focused unit/integration tests and lint as appropriate.
5. If no such gap exists, publish READY with concrete file/test evidence that non-browser Sprint2 is closed and B2 7/7 is the remaining formal gate. Do not manufacture work.
6. No Sprint3/4 work. No stash drop/apply. No unrelated cleanup. Do not bump spec version.
7. Publish terminal result to `_handoff-artifacts/results/SPRINT2-NONBROWSER-REMAINING-GAP-SCAN-A-20260919-R1/result.md`, then return A to IDLE with last-consumed-task-key/result path.

## Acceptance

- No overlap with B2 browser-contract work.
- Any discovered unique Sprint2 gap is fixed and verified, or evidence-backed READY states none remains.
- Terminal result includes HEAD/worktree evidence, changed files, commands/results, and explicit remaining gates.