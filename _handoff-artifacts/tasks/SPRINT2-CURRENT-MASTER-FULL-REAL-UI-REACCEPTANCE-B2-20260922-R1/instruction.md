# SPRINT2-CURRENT-MASTER-FULL-REAL-UI-REACCEPTANCE-B2-20260922-R1

state: PREPARED
lane: B2
mode: CURRENT_MASTER_FULL_REAL_UI_REACCEPTANCE
priority: IMMEDIATE
sprint: Sprint2
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Objective

Do not close Sprint2 from the prior targeted browser test alone. Fresh current-master evidence must prove the complete ordinary user-facing Sprint2 flow required by `SPRINT2_STATUS.md` and `GITHUB_CONTROL_PLANE.md`.

Verify on a clean/current `origin/master` worktree, without broad untracked stash/clean operations:

1. `apps/web` production build succeeds.
2. Web app starts successfully.
3. Through the real browser/UI path, exercise the ordinary flow end-to-end:
   `週進行 -> 大会予定 -> 参加者確定 -> 開催 -> 戦闘 -> 大会終了 -> 結果保存 -> ランキング更新 -> UI反映`.
4. Verify Ranking screen through ordinary navigation.
5. Verify battle presentation screen through ordinary navigation.
6. Verify persisted tournament result and ranking update are observable after the flow through UI-backed reads/navigation, not only direct unit/API assertions.

## Evidence requirements

- Bind exact tested current-master SHA.
- Record exact production build command/result.
- Record exact startup command/result and reachable URL/route.
- Record browser test/spec or manual browser evidence for every stage above; identify any stage not actually exercised.
- Historical Playwright subsets or prior CLOSED labels are not sufficient.
- If any required stage fails or is not reachable, terminal must be FIX_REQUIRED with the first concrete blocker and source/route evidence; do not call Sprint2 complete.
- If a missing browser harness prevents proving a required stage, add/repair the smallest production-faithful E2E coverage needed and publish it with implementation evidence.
- Do not modify Sprint3 semantics except where a shared current-master defect necessarily blocks Sprint2 flow.

## Workspace constraints

- Never run `git stash -u`, `git stash --include-untracked`, `git clean -fd`, or equivalent broad removal.
- All transient scratch/worktrees must be under `_handoff-artifacts/control-tmp/`.
- Do not create transient root-level `_handoff-artifacts/.tmp-*` directories.

## Terminal result

Publish `_handoff-artifacts/results/SPRINT2-CURRENT-MASTER-FULL-REAL-UI-REACCEPTANCE-B2-20260922-R1/result.md` with PASS only if every binding stage is demonstrated on the exact current master; otherwise FIX_REQUIRED with actionable blocker evidence.