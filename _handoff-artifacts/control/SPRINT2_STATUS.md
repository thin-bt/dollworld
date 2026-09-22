# SPRINT2_STATUS

state: REOPENED_FIX_REQUIRED
sprint: Sprint2
control-authority: GitHub
updatedAt: 2026-09-22
previous-state: CLOSED
reopen-trigger: CURRENT_MASTER_WEB_BUILD_FAILURE
assigned-recovery-task: SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1

## Reopen reason

The prior CLOSED state is invalid for the current master because the actual completion rule requires the CURRENT MASTER to be playable through the real UI, and the current web production build has been reported failing before startup/UI acceptance can even begin.

Reported failing production build scope:
- `apps/web/src/server/routes-simulation.ts`
- `apps/web/src/server/ui009/competition-match-view.ts`

Historical CLOSED labels, focused tests, Playwright subsets, root test counts, and older acceptance evidence do not override a current-master build/start/UI failure.

## Binding completion rule

Sprint2 may return to CLOSED only after current-master evidence proves all of:

1. web production build succeeds;
2. web app starts;
3. ordinary real browser/UI flow works end-to-end:
   `週進行 -> 大会予定 -> 参加者確定 -> 開催 -> 戦闘 -> 大会終了 -> 結果保存 -> ランキング更新 -> UI反映`;
4. Ranking screen works;
5. battle presentation works;
6. persistence and ranking update are visible through the ordinary UI-backed flow.

## Current disposition

- Sprint2: **REOPENED_FIX_REQUIRED**
- Active recovery task: `SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1`
- Assigned lane: Cursor B2
- Do not assert completion until terminal current-master build/start/real-UI evidence satisfies every binding condition above.
