# SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260919-R1

state: PREPARED
priority: IMMEDIATE
lane: A
sprint: Sprint2
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-result: _handoff-artifacts/results/SPRINT2-FORMAL-COMPLETION-EVIDENCE-A-20260919-R1/result.md
paired-b2-task: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2

## Objective
Recover and publish the missing Sprint2 wireframe implementation slice and browser harness to canonical master. Do not enter Sprint3/4.

## Required work
1. Fresh-fetch origin/master and treat GitHub canonical state as authority. Missing Drive/local mirrors are non-terminal.
2. Reconcile any existing unpublished/local wireframe slice against canonical master; do not discard valid completed work.
3. Close the concrete canonical gaps identified by the formal completion audit: schedule year navigation; participant comparison; round-robin pair matrix; knockout bracket; historical tournament editions/winners; annual ranking year navigation/table; promotion results; person rank history; participant/person-detail navigation as required by Sprint2 scope.
4. Include required backing server finalize/projection logic where a UI surface cannot truthfully be projected from current canonical data.
5. Publish `tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts` with the product slice so B2 can run the canonical harness.
6. Run bounded TypeScript/build/unit regression appropriate to changed files. Do not substitute narration for implementation.
7. Commit and push the completed Sprint2 slice to canonical master. Record the published master SHA and grep/path evidence for each completion-guard row.
8. Publish terminal result to `_handoff-artifacts/results/SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260919-R1/result.md` as READY only when the implementation+harness are actually on canonical master; otherwise FIX_REQUIRED with the first executable blocker.
9. Return lane A to IDLE only after terminal result publication. Never disable/pause absent explicit user PAUSE/STOP.

## Acceptance
- canonical master contains the required Sprint2 wireframe product surfaces and browser harness;
- no completion-guard row remains MISSING because code was never published;
- focused regression passes or exact failures are terminally recorded;
- B2 R2 can execute against the published SHA without relying on local/Drive-only files.
