# SPRINT2-REOPEN-UI-RANKING-BATTLE-PRESENTATION-B2-20260921-R1

state: READY_FOR_PICKUP
lane: B2
sprint: Sprint2
mode: PRODUCT_IMPLEMENTATION
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
binding-status: _handoff-artifacts/control/SPRINT2_STATUS.md

## Objective
Repair the reopened Sprint2 user-facing UI completion gaps without duplicating A's core lifecycle work.

## Required work
1. Fresh-read SPRINT2_STATUS.md, accepted wire/UI authority, current master web UI, and existing battle/mock-battle presentation.
2. Implement the standalone Ranking screen as a real user-facing ranking view; it must not merely delegate users back to Tournament.
3. Make official tournament match presentation reuse/inherit the accepted common battle presentation/UX from mock-battle/battle-log unless explicit canonical product authority requires a difference.
4. Remove/replace user-facing manual competition-step controls where they conflict with ordinary automatic world progression, while coordinating only through existing runtime state/API and not duplicating A-owned lifecycle logic.
5. Add focused UI/browser/component tests and run the strongest practical relevant gate.
6. Publish implementation to canonical master and write terminal result to `_handoff-artifacts/results/SPRINT2-REOPEN-UI-RANKING-BATTLE-PRESENTATION-B2-20260921-R1/result.md`.

## Non-conflict
Do not reimplement tournament schedule/participant/battle/completion/ranking-state engine progression owned by A. Consume its existing/current contracts and keep changes merge-safe.

## Terminal
READY only when Ranking is genuinely implemented and official tournament matches use the accepted battle presentation path. Otherwise FIX_REQUIRED/BLOCKED with exact remaining gap.
