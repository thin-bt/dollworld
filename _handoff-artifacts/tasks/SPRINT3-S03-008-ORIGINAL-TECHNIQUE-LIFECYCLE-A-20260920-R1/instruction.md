# SPRINT3-S03-008-ORIGINAL-TECHNIQUE-LIFECYCLE-A-20260920-R1

state: PREPARED
lane: A
sprint: Sprint3
priority: DEADLINE_CRITICAL
mode: S03_008_ORIGINAL_TECHNIQUE_LIFECYCLE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
baseline-master-sha: 829b5e004e6d7e50ad4af48a7e3df20594c48c46
predecessor-result: _handoff-artifacts/results/SPRINT3-S03-008-PUBLISH-RECOVERY-A-20260920-R1/result.md

## Objective
Complete the remaining Sprint3 S03-008 scope explicitly left open by the published teaching-selection slice: original-technique research, generation, failure retention/cooldown, loss/history semantics. Do not enter Sprint4.

## Canonical requirements
- Fresh-read docs/SPEC.md and relevant Sprint3 config/spec before coding; SPEC is authority where wording differs.
- Preserve the already-published S03-008 teaching-selection behavior and Sprint1/2 contracts.
- Implement the backlog-declared original-technique lifecycle semantics: research thresholds 180/320/550; generation success probability bounded 20..80%; failed generation retains 80% research; 24-week cooldown; deterministic/history evidence as required by SPEC.
- Put tunable numeric policy in Sprint3 config rather than hard-coding policy values in processor logic.
- Add focused tests covering threshold boundaries, probability bounds, deterministic RNG behavior, failure retention, cooldown, successful generation, history/loss behavior, validation and regression of published S03-008 teaching selection.
- Update docs/SPRINT_3_BACKLOG.md only to the extent supported by completed product/evidence.
- Run focused Sprint3 tests and simulation-core build; run root npm run check if feasible and report any pre-existing failure separately from product failures.
- Commit product changes and publish to canonical GitHub master. Do not merely leave local/unpublished work.
- Publish terminal result to `_handoff-artifacts/results/SPRINT3-S03-008-ORIGINAL-TECHNIQUE-LIFECYCLE-A-20260920-R1/result.md` with product SHA, master SHA, changed files, commands/results, acceptance matrix, and remaining Sprint3 gaps.
- Return lane A to IDLE after terminal publication.

## Non-conflict
Cursor B2 retains independent S03-004 acceptance authority. Do not edit B2 control/task/result files and do not duplicate that acceptance work.

## Deadline recovery
Sprint3 deadline recovery is active. Claim ACTIVE and execute product work now; do not spend the run rewriting control state or waiting for another Role inbox executor.
