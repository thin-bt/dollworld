# UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1

state: PREPARED
lane: B2
priority: IMMEDIATE
control-authority: GitHub
sprint: cross-sprint UI evidence
updatedAt: 2026-09-22T22:50:00+09:00

## Objective

Capture the **current origin/master user-facing UI exactly as it exists now** before any GPT-side mock redesign. These screenshots are the mandatory visual baseline for the Drive folder `_handoff-artifacts/audit/ui-page-mocks-20260922/`.

Do not redesign, fix, restyle, or normalize the UI in this task. Capture current product truth first.

## Fresh-read / setup

1. Fresh-sync `origin/master` and record exact SHA.
2. Fresh-read `PROJECT_ROADMAP.md`, `AUDIT_HANDOFF_PROTOCOL.md`, current `apps/web/src/client/main.tsx`, and `Shell.tsx`.
3. Use the real production web app/browser flow, not component snapshots or fabricated HTML.

## Required current-screen capture ledger

Capture at desktop 1440x1000 minimum. Also capture 900px and 390px for pages known to have responsive/overflow risk where practical.

Required user-facing states/pages:
1. home / simulation
2. people list
3. person detail
4. mock battle selection
5. mock battle result / latest result
6. battle log
7. competition annual schedule
8. tournament detail overview
9. tournament participants comparison
10. round-robin standings + pair matrix
11. knockout bracket / match results
12. tournament result / champion
13. tournament series/history
14. annual ranking
15. promotion result
16. person rank history
17. competition match / battle detail
18. events main tab
19. validation/developer tab
20. dev-viewer if still routable on current master

Where one route contains several distinct states, capture each distinct state as a separate PNG.

## File naming / output

Write PNG evidence under:

`_handoff-artifacts/audit/current/UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1/chrome/desktop-1440/`

Use stable names:
`01-home.png`, `02-people.png`, `03-person-detail.png`, ... in the ledger order above.

For 900/390 captures use sibling folders `app-900` and `narrow-390`.

Also publish:
`_handoff-artifacts/results/UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1/result.md`

The result must include:
- exact tested SHA
- exact PNG inventory
- any page/state that could not be captured and why
- whether each PNG is current product truth versus historical evidence
- no PASS/CLOSED/project-complete claims; this is evidence capture only.

## Critical guard

Do **not** reuse old screenshots as current truth.
Do **not** infer a page from wireframe or tests.
Do **not** alter product code just to make a screenshot possible; if a state is unreachable on current master, record that as a current-product finding and capture the nearest truthful state.

READY only when the current-screen ledger is complete or every missing capture has a concrete reproducible blocker recorded.
