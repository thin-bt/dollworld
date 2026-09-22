# SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint2
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Objective

Repair the CURRENT MASTER web application so Sprint2 can satisfy the actual completion rule: production build succeeds, app starts, and the ordinary real UI/browser flow is playable end-to-end.

This task exists because current master has a reported production build failure in `apps/web` with TypeScript errors involving:

- `apps/web/src/server/routes-simulation.ts`
- `apps/web/src/server/ui009/competition-match-view.ts`

Do not treat prior CLOSED labels, historical Playwright evidence, or root test counts as proof of current playability.

## Required execution

1. Fresh-read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and current Sprint2/Sprint3 control state.
2. Reproduce the current-master web production build failure using the repository's actual web build command.
3. Capture the exact TypeScript diagnostics, identify the minimal root cause, and repair the source without weakening type checking or tests.
4. Re-run the web production build until green.
5. Start the built/current web app using the repository-supported production/dev startup path appropriate for acceptance.
6. Execute the ordinary real browser/UI flow, not test-only manual competition stepping:
   `weekly progression -> tournament schedule -> participants -> tournament -> battle -> result persistence -> ranking update -> UI reflection`.
7. Verify the Ranking screen and battle presentation screen actually render and reflect the resulting state.
8. Run the relevant targeted tests plus any required root gate, but do not substitute those for steps 4-7.
9. Publish a terminal GitHub result under:
   `_handoff-artifacts/results/SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1/result.md`

## Acceptance

Terminal PASS requires all of:
- current-master web production build PASS
- app startup PASS
- ordinary real UI/browser Sprint2 chain PASS
- ranking UI PASS
- battle presentation UI PASS
- result persistence and ranking update observed through UI-backed flow

If any of these fail, publish FIX_REQUIRED/BLOCKED with exact diagnostics and do not claim Sprint2 complete.

Do not close Sprint2 yourself; PM/control decides only after reading terminal evidence.
