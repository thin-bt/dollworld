# SPRINT2-VISUAL-FIX-PUBLICATION-A-20260920-R1

state: PREPARED
lane: A
sprint: Sprint2
priority: IMMEDIATE
mode: VISUAL_FIX_PUBLICATION
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT2-VISUAL-QUALITY-REVIEW-A-20260920-R1
trigger: SPRINT2-VISUAL-BROWSER-ACCEPTANCE-B2-20260920-R1 FIX_REQUIRED

## Objective
Publish the already verified Sprint2 visual-fix product slice from A to canonical GitHub master, bind evidence to the published product SHA, and unblock independent B2 visual re-acceptance.

## Required work
1. Fresh-read GitHub canonical protocol, A R1 READY result, B2 R1 FIX_REQUIRED result, and current master before changing anything.
2. Claim lane ACTIVE before product changes.
3. Reconcile the verified A visual fixes (notably `apps/web/src/client/presentation.css`) against current canonical master. Do not discard or overwrite unrelated canonical work.
4. Include the dedicated A visual evidence harness only if required by canonical release/evidence policy; do not publish transient logs/screenshots as product code unless protocol requires them.
5. Run the relevant build and 390/900/1440 visual verification on the exact candidate to publish. Confirm document-level horizontal overflow is eliminated on annual schedule and representative Sprint2 surfaces.
6. Commit/push the visual product fix to `thin-bt/dollworld` `master`; record the published product SHA. A local-only or untracked fix is NOT completion.
7. Publish terminal result to `_handoff-artifacts/results/SPRINT2-VISUAL-FIX-PUBLICATION-A-20260920-R1/result.md` with published SHA, changed files, commands, outcomes, and any remaining defects.
8. READY only when the fix exists on canonical master and verification is bound to that published product SHA. Otherwise FIX_REQUIRED with exact blocker.
9. On READY, leave B2 eligible for immediate independent visual acceptance rerun. No Sprint3 work until Sprint2 visual/formal READY.
