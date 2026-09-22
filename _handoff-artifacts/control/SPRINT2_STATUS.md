# SPRINT2_STATUS

state: REOPENED_FIX_REQUIRED
sprint: Sprint2
control-authority: GitHub
updatedAt: 2026-09-22
previous-state: CLOSED
reopen-trigger: CURRENT_MASTER_WEB_BUILD_FAILURE
reopen-trigger-status: SUPERSEDED_BY_TERMINAL_EVIDENCE
superseded-assigned-recovery-task: SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1

## Reopen reason (historical)

The prior CLOSED state was invalidated when **current master** was reported failing web production build before startup/UI acceptance. Reported failing scope at reopen time:

- `apps/web/src/server/routes-simulation.ts`
- `apps/web/src/server/ui009/competition-match-view.ts`

That driver is **no longer the active shared blocker**. Terminal current-master evidence below satisfies the binding web build/start/ordinary real-UI completion rule on applicable product lineage; historical CLOSED labels and older subsets do not re-open that specific failure mode.

## Binding completion rule

Sprint2 may return to CLOSED only after current-master evidence proves all of:

1. web production build succeeds;
2. web app starts;
3. ordinary real browser/UI flow works end-to-end:
   `週進行 -> 大会予定 -> 参加者確定 -> 開催 -> 戦闘 -> 大会終了 -> 結果保存 -> ランキング更新 -> UI反映`;
4. Ranking screen works;
5. battle presentation works;
6. persistence and ranking update are visible through the ordinary UI-backed flow.

## Terminal evidence (current-master web / ordinary UI)

| Condition | Terminal result | Tested SHA / note |
|-----------|-----------------|-------------------|
| 1–6 (Sprint2 ordinary real UI + build/start) | `SPRINT23-CURRENT-MASTER-WEB-PLAYABILITY-REACCEPTANCE-B2-20260922-R1` **PASS** | `5fad321` on canonical `origin/master` worktree |
| Recovery publication chain (supersedes original B2 recovery task) | `SPRINT2-REOPEN-RECOVERY-CANONICAL-PUBLISH-B2-20260922-R1` **PASS** | product paths already on master @ `7aa8208`+ |

## Current disposition

- Sprint2: **REOPENED_FIX_REQUIRED** — formal **`CLOSED` not assigned** (PM/control authority; no inference from historical gates alone).
- **Superseded active recovery pointer:** `SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1` — do not treat as live work; terminal playability + recovery publish evidence governs web/UI binding.
- **Separate product/acceptance gap (not the reopen web-build driver):** `SPRINT2-WIREFRAME-CURRENT-MASTER-AUDIT-A-20260922-R1` **FIX_REQUIRED** (e.g. WF-14-01 tournament display name) @ audited `fc65e02`.
- Do not return Sprint2 to **CLOSED** until PM/control binds every applicable acceptance surface, including wireframe/product gaps outside the superseded web-build recovery chain.
