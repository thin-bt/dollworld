# SPRINT2-WIREFRAME-CURRENT-MASTER-AUDIT-A-20260922-R1

state: PREPARED
lane: A
mode: CURRENT_MASTER_WIREFRAME_AUDIT
priority: IMMEDIATE
sprint: Sprint2
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Objective

Independently audit CURRENT MASTER against the actual Sprint2 UI authority, not status labels or old acceptance summaries.

Primary source:
- Google Drive `TOURNAMENT_UI_WIREFRAME_DRAFT.md` file id `1gHpjYuYWwug85_Sr4VXMSFTvqBPqBVvd`
Supporting sources:
- `SPRINT2_UI_DATA_CONTRACT_GAP_MAP.md` file id `1wmgHM6B96SN7PihbaDhy3XhI7efaCYwG`
- `S02-008_ANNUAL_EARNINGS_RANKING_USER_DECISION_20260901` file id `1G9G0MTUpuyeIhBDlKEQ7bkxgfYilj_gMMjmxASQYdf4`

## Required work

1. Fresh-read the three Drive sources above.
2. Extract every user-visible Sprint2 wireframe requirement and interaction, including states, navigation, history, ranking, tournament views, participant data, match detail/battle presentation, and any empty/pending/finished states required by the wireframe.
3. Bind the exact current `origin/master` SHA.
4. Produce a requirement-by-requirement ledger:
   `wireframe requirement -> current source/route -> real UI reachability -> browser evidence -> verdict`.
5. Do not treat Playwright names, prior PASS/CLOSED files, or implementation intent as proof. Inspect current product source and real reachable UI behavior.
6. Coordinate with B2 only by avoiding duplicate edits. B2 owns full real-UI execution; A owns the independent wireframe-to-current-master coverage audit.
7. If any wireframe item is absent, unreachable, placeholder-only, stale, or inconsistent with the ranking decision, terminal FIX_REQUIRED and name the exact first blocker plus all discovered gaps.
8. PASS is allowed only if every wireframe requirement has current-master implementation and real UI evidence.
9. Do not close Sprint2. Control decides only after both B2 full-flow reacceptance and this wireframe audit are terminal and consistent.
10. Never use broad stash/clean commands; do not delete or move local specification files.

## Terminal result

Publish:
`_handoff-artifacts/results/SPRINT2-WIREFRAME-CURRENT-MASTER-AUDIT-A-20260922-R1/result.md`

The result must include the full coverage ledger and tested master SHA.
