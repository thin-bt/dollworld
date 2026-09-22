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
| 1,2,4,5 only (build/start/ranking page opens/battle presentation) | `SPRINT23-CURRENT-MASTER-WEB-PLAYABILITY-REACCEPTANCE-B2-20260922-R1` **PARTIAL_PASS_ONLY** | Claude independent audit `claude-sprint23-pass-evidence-audit-20260922-05.md` found conditions 3 and 6 were not actually tested; latest-master recheck `claude-recheck-latest-master-20260922-04.md` reproduces the product gap |
| Recovery publication chain (supersedes original B2 recovery task) | `SPRINT2-REOPEN-RECOVERY-CANONICAL-PUBLISH-B2-20260922-R1` **PASS** | product paths already on master @ `7aa8208`+ |

## Current disposition

- Sprint2: **REOPENED_FIX_REQUIRED** — formal **`CLOSED` not assigned**. The prior `conditions 1–6 PASS` claim is invalidated: conditions 3 and 6 are explicitly OPEN/FIX_REQUIRED after Claude independent review.
- **Superseded active recovery pointer:** `SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1` — do not treat as live work; terminal playability + recovery publish evidence governs web/UI binding.
- **Separate product/acceptance gap (not the reopen web-build driver):** `SPRINT2-WIREFRAME-CURRENT-MASTER-AUDIT-A-20260922-R1` **FIX_REQUIRED** (e.g. WF-14-01 tournament display name) @ audited `fc65e02`.
- Do not return Sprint2 to **CLOSED** until PM/control binds every applicable acceptance surface, including wireframe/product gaps outside the superseded web-build recovery chain.


## Independent-review correction — 2026-09-22

Claude independently reproduced on latest master that the ordinary user flow does not yet perform the required multi-tournament yearly cycle and ranking evolution. User-intent correction `claude-intent-correction-20260922-06.md` clarifies that a tournament resolving automatically when its week is advanced is intended behavior; therefore auto-resolution itself is not the primary defect. The binding defect is F-02: `findUi009PlayableScheduleSlot` selects only the first normal F-rank tournament from the tiny yearly schedule and the session competition store is single-instance, so after that tournament finishes the remaining scheduled tournaments are never processed. Consequences include ranking values not evolving across tournaments/years, historical-year navigation remaining unavailable, promotion/rank history not progressing, and past schedule entries remaining `開催予定`. Additional independent gaps remain around fixed-year-21 participant planning and contradictory scheduled/finished presentation. The earlier targeted Playwright acceptance could pass by detecting the already-finished first tournament and existing ranking UI, so it cannot satisfy conditions 3 or 6.


## Binding repair target — F-02 multi-tournament yearly progression

Highest-priority Sprint2 product blocker: replace the single-playable-slot/single-finished-store behavior so every scheduled tournament that becomes due is processed exactly once through the ordinary weekly progression path. Acceptance must prove, by values rather than element presence: (1) every tournament week crossed leaves that tournament completed, (2) no past-week tournament remains `開催予定`, (3) ranking values change across successive tournaments where results differ, and (4) year crossing exposes valid historical-year ranking navigation. Session-start resolution of the first-week tournament is a lower-priority timing detail and must not distract from F-02.
