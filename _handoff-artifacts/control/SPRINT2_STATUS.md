# SPRINT2_STATUS

state: REOPENED_FIX_REQUIRED
sprint: Sprint2
control-authority: GitHub
updatedAt: 2026-09-23
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
| 1,2,4,5 only (build/start/ranking page opens/battle presentation) | `SPRINT23-CURRENT-MASTER-WEB-PLAYABILITY-REACCEPTANCE-B2-20260922-R1` **PARTIAL_PASS_ONLY** | Claude independent audit `claude-sprint23-pass-evidence-audit-20260922-05.md` found conditions 3 and 6 were not actually tested; latest-master recheck `claude-recheck-latest-master-20260922-04.md` reproduced the then-current product gap |
| Recovery publication chain (supersedes original B2 recovery task) | `SPRINT2-REOPEN-RECOVERY-CANONICAL-PUBLISH-B2-20260922-R1` **PASS** | product paths already on master @ `7aa8208`+ |
| F-02 publication + exact-lineage pristine root gate / web build | `SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1` **PASS** | product `ae23fb9`; root `npm run check` **1972/1972**, **137/137** files; web production build **PASS** |
| F-02 ordinary real-browser multi-tournament/yearly acceptance | `SPRINT2-F02-CURRENT-MASTER-ORDINARY-UI-ACCEPTANCE-A-20260923-R1` **PASS** | exact product `ae23fb9`; cold production start; 48 ordinary weekly steps; two distinct due tournaments completed; no past due slot remained `開催予定`; ranking earnings changed; battle log reachable; world year 1→2; prior-year ranking navigation exposed 4 persisted rows |

## Current disposition

- Sprint2: **REOPENED_FIX_REQUIRED** — formal **`CLOSED` not assigned**.
- **Superseded active recovery pointer:** `SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1` — do not treat as live work.
- **F-02 multi-tournament yearly progression is no longer an open product blocker on tested product `ae23fb9`.** Its publication/root gate and ordinary real-browser value acceptance are terminal PASS as listed above.
- The earlier independent-review finding that conditions 3 and 6 were unproven is **superseded for the F-02 flow on `ae23fb9`** by `SPRINT2-F02-CURRENT-MASTER-ORDINARY-UI-ACCEPTANCE-A-20260923-R1`. Historical audit text remains evidence of why F-02 was opened, not a current F-02 failure claim.
- **Separate acceptance/control work may still remain** (including wireframe/product gaps or later product deltas). Do not infer formal Sprint2 closure from the F-02 PASS alone; only PM/control may assign `CLOSED` after reconciling every applicable current-master acceptance surface.

## Independent-review correction — 2026-09-22 (historical trigger)

Claude independently reproduced on the then-latest master that the ordinary user flow did not perform the required multi-tournament yearly cycle and ranking evolution. User-intent correction `claude-intent-correction-20260922-06.md` clarified that a tournament resolving automatically when its week is advanced is intended behavior; therefore auto-resolution itself was not the primary defect. The binding defect was F-02: `findUi009PlayableScheduleSlot` selected only the first normal F-rank tournament from the tiny yearly schedule and the session competition store was single-instance, so after that tournament finished the remaining scheduled tournaments were never processed. Consequences included ranking values not evolving across tournaments/years, historical-year navigation remaining unavailable, promotion/rank history not progressing, and past schedule entries remaining `開催予定`. The earlier targeted Playwright acceptance could pass by detecting the already-finished first tournament and existing ranking UI, so it could not satisfy conditions 3 or 6.

This section is retained as historical defect provenance. The F-02 behavior described above is superseded by the terminal publication/root-gate and ordinary-browser acceptance on product `ae23fb9` recorded in the current evidence table.

## F-02 acceptance closure — 2026-09-23

`SPRINT2-F02-CURRENT-MASTER-ORDINARY-UI-ACCEPTANCE-A-20260923-R1` verified the repaired behavior by values, not element presence, on exact published product `ae23fb9`:

1. two distinct tournament weeks crossed through ordinary weekly progression completed their tournaments;
2. the earlier completed slot remained `終了` and no completed past slot regressed to `開催予定`;
3. ranking earnings evolved from `[100000, 50000, 25000, 25000]` after the first tournament to `[200000, 100000, 50000, 25000]` after the second;
4. ordinary progression crossed world year 1 → 2 and prior-year ranking navigation exposed persisted year-1 rows;
5. battle history/log presentation was reachable from the finished tournament UI.

Therefore F-02 itself must not be redispatched merely because the historical trigger prose exists. Any later regression must be demonstrated on a later applicable product lineage with fresh evidence.
