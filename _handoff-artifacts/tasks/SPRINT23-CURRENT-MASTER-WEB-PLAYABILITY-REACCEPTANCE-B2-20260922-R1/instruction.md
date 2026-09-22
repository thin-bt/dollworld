# SPRINT23-CURRENT-MASTER-WEB-PLAYABILITY-REACCEPTANCE-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint2+Sprint3
mode: RELEASE_EVIDENCE
priority: DEADLINE_CRITICAL
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Why now

Binding Sprint2 and Sprint3 status artifacts remain `REOPENED_FIX_REQUIRED` because current-master production build/start/ordinary real-UI playability is not yet terminally re-established. Since the previous recovery work, canonical master has advanced again with Sprint3 completed-history runtime validation publication `788342efb644623c2101e7aa7a3c410a3f79b627`, and B2 is now IDLE. Historical root/focused tests do not satisfy the binding completion rule.

## Task

On a fresh current GitHub `master` descendant of `788342efb644623c2101e7aa7a3c410a3f79b627`, produce terminal current-master release evidence, repairing only defects actually encountered and publishing any required repair before final verification.

1. Fresh-read protocol, both sprint status artifacts, this instruction, current A inbox, and current master before work. Claim B2 ACTIVE using the executor contract.
2. Preserve A ownership of `SPRINT3-MENTORSHIP-REAL-UI-GAP-CLOSURE-A-20260922-R1`; do not edit A control files and do not duplicate its mentorship-specific product work.
3. Run the actual web production build on current master. If it fails, repair the concrete build defect without weakening validation/tests, publish the repair to canonical master, then restart verification from the published tip.
4. Start the production web app from the verified build.
5. Verify the ordinary real browser/UI Sprint2 competition flow end-to-end: `週進行 -> 大会予定 -> 参加者確定 -> 開催 -> 戦闘 -> 大会終了 -> 結果保存 -> ランキング更新 -> UI反映`. Explicitly verify Ranking screen, battle presentation, and persistence/ranking update visible through the ordinary UI-backed flow.
6. Verify that the production app still exposes the applicable Sprint3 user-facing surface without startup/runtime regression. Do not claim A's mentorship-specific acceptance unless A's terminal evidence is already canonical and independently read back.
7. If production bytes change during repair, all terminal build/start/UI evidence must be rerun against the published current-master tip containing that repair.
8. Publish a canonical terminal result with exact tested GitHub SHA, commands, browser route/actions, observed UI evidence, changed paths/commit if any, and PASS/FAIL per binding condition. Read back the result from GitHub.

## Constraints

- No timeout inflation, assertion weakening, workload reduction, fake/mock-only substitute for ordinary UI, or status-label closure by inference.
- Do not run a broad destructive stash/clean. Obey protocol workspace-preservation rules.
- Transient scratch/worktrees must be under `_handoff-artifacts/control-tmp/`, never directly under `_handoff-artifacts/`.
- Do not mark Sprint2 or Sprint3 CLOSED yourself unless a separate binding control instruction explicitly authorizes that status transition.
