# SPRINT2-F02-MULTI-TOURNAMENT-YEARLY-PROGRESSION-A-20260922-R1

state: QUEUED
lane: A
sprint: Sprint2
mode: PRODUCT_FIX
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
priority: DEADLINE_CRITICAL
binding-status: _handoff-artifacts/control/SPRINT2_STATUS.md
source-review: audit/claude/claude-intent-correction-20260922-06.md

## Objective

Repair the binding Sprint2 F-02 defect: ordinary weekly progression must process every due tournament in the yearly schedule, not only the first normal F-rank tournament.

User intent:
- advancing past a tournament week may resolve that tournament automatically;
- the defect is that later tournaments remain `開催予定` forever and are never processed.

## Required work

1. Fresh-read current Sprint2 status, Claude intent correction, schedule-slot selection, competition store/lifecycle, ranking persistence/history, and existing acceptance tests.
2. Remove the single-first-F-slot limitation in `findUi009PlayableScheduleSlot` / its calling flow. Ordinary weekly progression must identify all due/unprocessed scheduled tournaments in chronological order.
3. Replace or extend the single competition-store assumption so completed tournaments remain persisted/history-addressable while later tournaments can be staged and completed.
4. Ensure each scheduled tournament is processed exactly once; no duplicate rerun after completion/reset/reload unless explicitly required by canonical lifecycle semantics.
5. Keep automatic resolution on week advancement acceptable. Do not introduce manual competition stepping as the ordinary progression dependency.
6. Remove the fixed-year-21 production planning dependency if it is part of the same participant-selection path; otherwise publish a precise remaining blocker/task split.
7. Make ranking accumulation/history derive from successive completed tournaments and support year crossing / historical-year navigation.
8. Add acceptance tests that assert values and chronology, not mere element presence:
   - every tournament week crossed leaves that tournament completed;
   - no past-week tournament remains `開催予定`;
   - at least two successive tournaments are actually processed;
   - ranking values change across tournaments where outcomes differ;
   - after year crossing, prior-year ranking is selectable and differs/retains the correct historical snapshot.
9. Do not use early-return acceptance helpers that pass merely because an existing champion/ranking table is visible.
10. Run strongest practical production/browser gates and publish exact evidence.

## Terminal

READY only if canonical master proves multi-tournament yearly progression and value-changing ranking/history through ordinary weekly user flow. Otherwise FIX_REQUIRED/BLOCKED with exact remaining defect.
