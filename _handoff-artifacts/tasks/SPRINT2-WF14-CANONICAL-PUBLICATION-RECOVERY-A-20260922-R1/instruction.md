# SPRINT2-WF14-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1

state: READY
lane: A
sprint: Sprint2
mode: CANONICAL_PUBLICATION_RECOVERY
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
authority-ref: current GitHub master
predecessor: SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1

## Objective

The predecessor is TERMINAL PASS but explicitly records its WF-14 product delta as pending GitHub publication. Recover and publish that exact verified tournament-display-name product delta to canonical `thin-bt/dollworld` `master`, then verify GitHub readback in this same task. Do not treat local/Drive state as authority.

## Required first reads

1. `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
2. `_handoff-artifacts/control/SPRINT2_STATUS.md`
3. `_handoff-artifacts/control/SPRINT3_STATUS.md`
4. predecessor instruction/result
5. current `origin/master` and relevant source paths before applying anything

## Execution contract

- Claim lane A ACTIVE before product/publication work.
- Preserve all unrelated current-master changes. Rebase/cherry-pick/manual application is allowed only after comparing the predecessor delta against fresh `origin/master`.
- Publish only the predecessor WF-14 tournament-display-name change set that is not already present on canonical master. Do not broaden scope into WF-5/WF-13/WF-12/WF-9/WF-3.
- Never use broad untracked stash/clean. Obey protocol workspace-preservation rules.
- Any transient scratch/worktree must be under `_handoff-artifacts/control-tmp/`; correct any root-level transient defect encountered in this task.
- After publication, fetch/read back canonical master and prove the publication commit is an ancestor of `origin/master` and the expected WF-14 paths/behavior are present.
- Run focused verification sufficient to prove the published bytes: simulation-core display-name tests, UI009 projection/client tests, affected workspace typechecks, and web build. Do not duplicate B2/root `npm run check` unless explicitly reassigned; a fresh post-publication root gate is a separate release-evidence task.
- Publish canonical terminal result at `_handoff-artifacts/results/SPRINT2-WF14-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1/result.md` with exact publication SHA, tests, changed paths, readback evidence, and whether any product delta remains unpublished.
- Return lane A to IDLE only after terminal result is canonical.
- Do not assign Sprint2 or Sprint3 CLOSED.

## Acceptance

PASS requires the verified WF-14 tournament display-name product bytes to exist on GitHub canonical master, focused verification to pass on those published bytes, and fresh GitHub readback to prove publication. If safe publication cannot be completed, terminate FAIL/BLOCKED with the exact conflicting paths/SHAs; do not silently leave a local-only PASS.