# SPRINT2-NONBROWSER-PUBLICATION-SLICE-A-20260919-R1

state: PREPARED
lane: A
sprint: Sprint2
priority: IMMEDIATE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-NONBROWSER-REMAINING-GAP-SCAN-A-20260919-R1
predecessor-terminal: SPRINT2_NONBROWSER_PUBLICATION_SLICE_COMPLETION_REQUIRED
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: PRODUCT_PUBLICATION_ONLY_NO_PLAYWRIGHT_OR_B2_CONTROL_EDITS

## Objective
Publish the unique Sprint2 non-browser closure gap identified by the predecessor result so a clean checkout/master build contains every ui009 module already imported by the published production slice.

## Required work
1. Fresh-read this instruction and predecessor result from GitHub master; claim A ACTIVE before product changes.
2. Reconcile the local untracked implementations against current master and publish the missing ui009 production modules required by the imports at master HEAD, specifically the predecessor-listed nine paths: `competition-bracket-match-execution.ts`, `competition-bracket-progress.ts`, `competition-bracket-runtime.ts`, `competition-group-advancers.ts`, `competition-group-composition.ts`, `competition-knockout-seed-mapping.ts`, `competition-round-robin-finalize.ts`, `competition-schedule-slot.ts`, `competition-structural-policy.ts`.
3. Include the bounded tests identified by the predecessor (`competition-bracket-progress.test.ts`, `competition-knockout-seed-mapping.test.ts`) and the verified `apps/web/src/client/competition/fetch-ui009.ts` FetchLike/decodeApiResponse correction.
4. Do not alter Playwright acceptance specs, B2 control, Sprint3/4, or unrelated product scope.
5. Re-run focused eslint, ui009 bounded vitest, simulation-core Sprint2 tests as needed, client typecheck, and `npm run build -w @shared-world/web` from a state that proves the committed tree is self-contained. Confirm the nine production module paths exist in git after publication.
6. Commit/push the coherent Sprint2 publication slice to master using the executor's existing publication authority/workflow. Do not leave required production files only untracked/local.
7. Publish a terminal GitHub canonical result. READY only if master contains the complete slice and clean-tree verification passes; otherwise FIX_REQUIRED with the first reproducible blocker and exact remaining files/commands.

## Acceptance
- master contains all production modules imported by the Sprint2 ui009 engine/routes slice;
- `fetch-ui009.ts` correction is published;
- bounded tests/typecheck/build pass from the published/clean tree;
- no B2/Playwright product-overlap edits;
- terminal result is written under `_handoff-artifacts/results/SPRINT2-NONBROWSER-PUBLICATION-SLICE-A-20260919-R1/result.md`.
