# ROLE1-CURRENT-PRODUCT-GATE-PRECONDITION-20260922-R12

result-class: TERMINAL_EVIDENCE
role: Role1
control-authority: GitHub
repository: thin-bt/dollworld
branch: master
sprint: Sprint3 / shared Sprint2 release lineage

## Finding

At this run, canonical `master` tip is `a3776c11470e2d3c89f76ee80266625e7d985829` (`fix(web): Prettier and lint hygiene for WF-5 participant comparison gate`). That commit modifies product/test paths under `apps/web/**` and `tests/e2e/**`, including `CompetitionPage.tsx`, `competition-participant-comparison-projection.test.ts`, `competition-wireframe-observation.ts`, and `s2-wireframe-browser-acceptance-b2.spec.ts`.

Therefore the historical Sprint3 live root-gate binding S03-072 @ product `fdeed36` cannot establish a release gate for current product bytes. Sprint3 remains `REOPENED_FIX_REQUIRED`; no CLOSED inference is valid.

## Lane reconciliation

Cursor A is already PREPARED on `SPRINT3-POST-E2A9-CURRENT-PRODUCT-ROOT-GATE-A-20260922-R1`. Its canonical instruction explicitly requires pickup-time discovery of the latest `apps/**` + `packages/**` product SHA and says not to assume the product is still `e2a9e08`. Therefore `a3776c1` does not require replacing or duplicating A's task; A must bind its gate to the latest product lineage it observes at pickup/completion.

Cursor B2 is PREPARED on `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1` and remains non-conflicting browser evidence work. Role1 did not overwrite either lane.

## Release consequence

A terminal root-gate PASS may replace the stale S03-072 binding only if its tested product SHA is still the latest applicable product lineage at completion. The separate Sprint2 F-02 ordinary multi-tournament progression blocker remains governed by `_handoff-artifacts/control/SPRINT2_STATUS.md`; a root-gate PASS alone cannot close Sprint2 or Sprint3.

No transient scratch was created under `_handoff-artifacts/` by this GitHub-first Role1 task.