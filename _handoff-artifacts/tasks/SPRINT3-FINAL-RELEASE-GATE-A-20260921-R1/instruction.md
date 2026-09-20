# SPRINT3-FINAL-RELEASE-GATE-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: FINAL_RELEASE_GATE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Trigger

A is IDLE after `SPRINT3-ROOT-TEST-RECOVERY-A-20260921-R1` reached READY. That result reports canonical root `npm run test` PASS (1848/1848), root typecheck PASS, and simulation-core build PASS on published master. B2 currently owns only bounded Sprint3 backlog/source truth reconciliation for stale S03-009/S03-011 status text.

## Required work

1. Fresh-read current `origin/master`, GitHub control protocol, A/B2 lane state, latest Sprint3 task/results, `docs/SPRINT_3_BACKLOG.md`, Sprint3 spec/config source, and current product source.
2. Claim this exact task ACTIVE in A control before changes.
3. Verify current master contains the canonical S03-009 runtime wiring and S03-011 first-use MatchId persistence; do not rely only on result prose.
4. Run the final product gates on current master: root `npm run check` (or its exact constituent commands if the script is unavailable), root tests, root typecheck, and simulation-core build. Preserve exact counts/errors.
5. Verify Sprint3 implementation evidence for S03-001 through S03-011 against current source/results. Do not duplicate B2's bounded backlog wording edit; if B2 has published its reconciliation, consume the corrected backlog truth. If B2 is still active/prepared, release-gate the product independently and record docs reconciliation as the only dependency if that is truly all that remains.
6. If a bounded release-gate defect is found and can be safely fixed without colliding with B2, fix it, rerun affected gates, publish to master, and read back. Do not weaken tests or alter gameplay semantics merely to make a gate green.
7. Publish a terminal canonical result at `_handoff-artifacts/results/SPRINT3-FINAL-RELEASE-GATE-A-20260921-R1/result.md` with exact master SHA, gate commands/results, remaining blockers (if any), and one of READY or BLOCKED. READY requires source truth plus green release gates and no unresolved Sprint3 product blocker.
8. After terminal publication, return A control to IDLE with this task recorded as last-consumed and read back both control and result from GitHub.

## Non-conflict guard

- Do not edit B2 control/task/result.
- Do not race B2 on `docs/SPRINT_3_BACKLOG.md` while its reconciliation task is PREPARED/ACTIVE.
- Do not start Sprint4 production in this task.

## READY gate

Formal Sprint3 READY may be declared only when current canonical master product source, S03-001..011 evidence, and final root release gates agree. Stale prose alone is not a product blocker, but it must be identified precisely if B2 has not yet reconciled it.