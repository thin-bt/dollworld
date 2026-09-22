# SPRINT3-S03-070-POST-TEACH-UI-REGRESSION-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: CURRENT_MASTER_UI_REGRESSION
priority: DEADLINE_CRITICAL
authority: GitHub thin-bt/dollworld master
preparedAt: 2026-09-22T16:59:55+09:00
product-delta: 4a0a80f09faa2c4ace5a8edcbd196d9a48fc229c

## Objective

Freshly re-verify the ordinary Sprint3 player-facing UI on CURRENT MASTER after the completed-teach semantic-invariant product delta `4a0a80f`. This is intentionally parallel/non-conflicting with B2 S03-069: B2 owns the root `npm run check` release gate; A owns browser/UI regression evidence.

## Required execution

1. Fresh-read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, Sprint3 status, this instruction, current `origin/master`, and the latest Sprint3 ordinary-UI result.
2. Claim A ACTIVE before execution.
3. Verify tested current master contains `4a0a80f09faa2c4ace5a8edcbd196d9a48fc229c` as ancestor. If master advances, test the fresh current master.
4. Use `_handoff-artifacts/control-tmp/` only for transient scratch/worktrees. Preserve `_handoff-artifacts/tools/**`; no broad stash/clean.
5. Run current web production build/start as needed for real browser verification.
6. Re-run ordinary Sprint3 browser navigation through session start -> 人物 -> Person Detail -> 師弟関係, including qualified-master, formal-master, and formal-disciple surfaces. Use the existing accepted real-browser specs where applicable; do not replace real UI evidence with component-only tests.
7. Add a focused browser-visible regression only if the new completed-teach semantic invariant has a player-visible consequence already represented by accepted UI authority. Do not invent a new Sprint3 screen.
8. Record exact tested SHA, commands, browser/project, pass/fail, and any product defect. Do not mark Sprint3 CLOSED.
9. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-070-POST-TEACH-UI-REGRESSION-A-20260922-R1/result.md` and fresh-read it.

## Acceptance

PASS only if current-master production UI remains startable and the ordinary Sprint3 Person Detail mentorship/disciple flow works in a real browser after `4a0a80f`. Otherwise terminal FIX_REQUIRED with exact blocker.