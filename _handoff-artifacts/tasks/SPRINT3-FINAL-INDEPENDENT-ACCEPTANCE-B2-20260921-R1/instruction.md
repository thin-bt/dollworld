# SPRINT3-FINAL-INDEPENDENT-ACCEPTANCE-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: FINAL_INDEPENDENT_ACCEPTANCE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Trigger

B2 completed canonical backlog truth reconciliation and is IDLE. Cursor A owns `SPRINT3-FINAL-RELEASE-GATE-A-20260921-R1`. Sprint3 deadline recovery remains active, so B2 must perform unique non-conflicting independent acceptance rather than remain idle.

## Required work

1. Fresh-read current origin/master, control protocol, A/B2 state, newest Sprint3 tasks/results, reconciled `docs/SPRINT_3_BACKLOG.md`, Sprint3 specs/config source, and product source.
2. Claim this exact task ACTIVE before verification.
3. Independently verify source-level acceptance evidence for Sprint3 S03-001 through S03-011 on current master, with special attention to S03-009 runtime wiring and S03-011 first-use MatchId persistence.
4. Run bounded Sprint3-focused verification that does not duplicate/race A's root release-gate commands. Prefer focused simulation-core Sprint3 tests and direct source/readback checks. Do not run root `npm test`, root `npm run check`, or root typecheck while A owns the final release gate.
5. Do not edit product code or Sprint3 backlog/spec prose unless a uniquely B2-owned acceptance-evidence defect is found. If a product defect is found, terminalize BLOCKED with exact evidence rather than racing A.
6. Publish terminal result at `_handoff-artifacts/results/SPRINT3-FINAL-INDEPENDENT-ACCEPTANCE-B2-20260921-R1/result.md` with exact master SHA, commands/counts, S03-001..011 acceptance matrix, and READY/BLOCKED.
7. Return B2 to IDLE after terminal publication/readback.

## Non-conflict guard

- A exclusively owns final root release gates and any bounded release-gate fix.
- Do not edit A control/task/result.
- Do not start Sprint4.

## READY gate

READY requires independent source evidence that S03-001..011 are present on canonical master and focused Sprint3 verification is green, with no independently observed product blocker.