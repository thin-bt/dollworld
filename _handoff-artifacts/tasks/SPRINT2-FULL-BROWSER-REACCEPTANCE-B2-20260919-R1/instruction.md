# SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1

state: PREPARED
lane: B2
sprint: Sprint2
priority: IMMEDIATE
mode: FULL_BROWSER_REACCEPTANCE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-DIRTY-SLICE-PUBLICATION-GATE-A-20260919-R1
paired-a-terminal: SPRINT2-DIRTY-SLICE-PUBLICATION-GATE-A-20260919-R1
required-master-head: e40c60f71012f6b353a9944bd1e5abd92d9308ab
non-overlap: TEST_ACCEPTANCE_ONLY_NO_PRODUCT_EDITS
recovery: ROLE2_GITHUB_FIRST_RETARGET_AFTER_A_PUBLICATION_READY_0822

## Objective

Run the mandatory fresh full Sprint2 browser reacceptance against GitHub `master` after the accepted A production slice was committed and pushed by `SPRINT2-DIRTY-SLICE-PUBLICATION-GATE-A-20260919-R1` READY. Bind this acceptance to master commit `e40c60f71012f6b353a9944bd1e5abd92d9308ab` (or a later master commit containing it). Any B2 run predating that publication is not final acceptance.

The publication terminal reports focused ESLint exit 0 and bounded ui009 Vitest 29/29 PASS. The remaining mandatory gate is the fresh Chrome browser set below.

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
2. Fresh-run against current GitHub master containing `e40c60f`; do not reuse any pre-publication B2 verdict.
3. On failure, report the first reproducible product-visible blocker with screenshot/log path, exact assertion, current HEAD/worktree binding, and whether it overlaps A-owned surfaces.
4. Do not fabricate unsupported browser fixtures for future-reserve scope.
5. No Sprint3/4.

## Terminal output

Publish:
_handoff-artifacts/results/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/result.md

READY requires the mandatory browser set to pass. Otherwise publish FIX_REQUIRED with exact failing evidence.
