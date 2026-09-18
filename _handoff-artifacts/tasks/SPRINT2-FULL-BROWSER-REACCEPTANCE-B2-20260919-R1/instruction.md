# SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1

state: PREPARED
lane: B2
sprint: Sprint2
priority: IMMEDIATE
mode: FULL_BROWSER_REACCEPTANCE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-BROWSER-REGRESSION-PREP-B2-20260918-R4
paired-a-terminal: SPRINT2-B2-ACCEPTANCE-UNBLOCK-A-20260919-R1
non-overlap: TEST_ACCEPTANCE_ONLY_NO_PRODUCT_EDITS
recovery: ROLE3_GITHUB_FIRST_RETRIGGER_0436_AFTER_A_UNBLOCK_READY

## Objective

Run the mandatory fresh full Sprint2 browser reacceptance against the current host worktree after A acceptance-unblock READY. A reproduced and fixed the false-finished 0/0 bootstrap defect and verified focused vitest 7/7 plus prep Chrome test 1 PASS on dirty HEAD aa500b60e2c041548b42909fea23a6ae59f3373e. The prior B2 R4 FIX_REQUIRED and any B2 run predating this A terminal are not final acceptance.

## Required verification

Run exactly the accepted Chrome set:

```powershell
cd D:\xampp\htdocs\dollworld
npx playwright test tests/e2e/s2-browser-regression-acceptance-prep.spec.ts tests/e2e/s2-ui009-round-robin-competition.spec.ts tests/e2e/s2-full-product-browser-closure.spec.ts --project=chrome
```

Expected accepted set: 7/7.

Verify especially:
- no false `finished` at 0/0 after accepted bootstrap
- normal simulation/week step auto-starts/progresses/finalizes scheduled competition
- standings/history/champion/finalResult become coherent only after processed matches
- competition CTA gating remains coherent through active/finished states
- post-tournament next-week simulation continues
- retry/idempotency behavior remains valid
- no INTERNAL_ERROR on the supported path

## Rules

1. Test/acceptance lane only. Do not modify A-owned product implementation.
2. Fresh-run against the current host worktree; do not reuse the old R4 FIX_REQUIRED as the new verdict.
3. On failure, report the first reproducible product-visible blocker with screenshot/log path, exact assertion, current HEAD/worktree binding, and whether it overlaps A-owned surfaces.
4. Do not fabricate unsupported browser fixtures for future-reserve scope.
5. No Sprint3/4.

## Terminal output

Publish:
_handoff-artifacts/results/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/result.md

READY requires the mandatory browser set to pass. Otherwise publish FIX_REQUIRED with exact failing evidence.
