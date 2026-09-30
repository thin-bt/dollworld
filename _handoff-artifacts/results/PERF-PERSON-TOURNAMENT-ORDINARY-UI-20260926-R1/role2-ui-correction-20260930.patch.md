# Role2 tournament production UI correction patch
generation: 20260929-P0-01
assignment: 20260929-P0-01-R2
reference: _handoff-artifacts/audit/ui-page-mocks-20260922/00_html_mocks/02-05_tournament_schedule_detail_participants_results_mock_v03.html
reference-blob: a77cf2c69604a4fe2a3c3f9b9d76eb51f0f2ad78
production-component-blob: 48424741a4718cf4ee7654befd3760a567ebd30f
state: EXECUTABLE_PATCH_DIRECT_WRITE_REJECTED

## Patch A: production annual schedule

Target: apps/web/src/client/competition/competition-schedule-matrix.tsx

Replace only the 48-week matrix presentation. Preserve the existing empty state, year navigation, world-time label, overview.entries, selectedKey, onSelect, onViewYear and selectionKey values.

Remove ROW_LABELS, WEEKS_PER_YEAR, weekColumnIndex, entriesByRowAndWeek and the month/week table construction.

Inside data-testid="competition-annual-schedule", render a div className="competition-schedule-cards". Map overview.entries to article elements retaining data-testid="competition-schedule-cell", data-selection-key, and state classes for past/current/playable/active/selected. Each card must render, in this order:
1. badge: entry.timingLabel
2. heading: entry.tournamentDisplayName
3. meta: entry.lifecycleStateLabel plus entry.participantCountLabel when non-null
4. kind: entry.rankOrCategoryLabel plus entry.kindLabel
5. visible button "詳細を見る", retaining aria-pressed and onClick={() => onSelect(entry.selectionKey)}

Target: apps/web/src/client/presentation.css

Make competition-schedule-cards a four-column grid, two columns <=1100px, one column <=600px. Cards use the existing panel/line/accent variables, rounded border and readable padding. Playable uses accent emphasis; active/selected uses accent border. The 詳細を見る button is pushed to the card bottom and uses the accent treatment for playable entries. Remove matrix width/max-content/sticky/week-cell rules so narrow layout has no horizontal schedule scrolling.

## Patch B: selected tournament detail hierarchy

Target: apps/web/src/client/competition/CompetitionPage.tsx

Reference v03 places selected tournament status/name/progress and the primary next-match action in one hero. Production currently detaches the mutation CTA into the page footer. Move presentation of the existing single step CTA adjacent to the selected detail hero when overview is shown and entry is playable/active. Keep exactly the same onStep, canStep, actionPending, actionError, csrf/revision and mutation semantics; do not create a second mutation button. Footer guidance remains but duplicate CTA does not.

## Required real-browser verification

Use existing accepted seed=42 session and production server. Capture:
- schedule desktop 1440x1000
- schedule narrow 390x844
- selected detail desktop 1440x1000
- selected detail narrow 390x844

Assert documentElement.scrollWidth <= documentElement.clientWidth at 390px; every schedule entry remains selectable by the same selectionKey; year navigation works; detail/participants tabs and participant links remain functional; step mutation behavior is unchanged. Record explicit residual differences against mock v03 before marking tournament complete.

Expected artifacts: four screenshots, Playwright report, trace on failure, tested SHA, residual-difference list.

## Routing

Fresh lane read: Cursor A is ACTIVE on Role1 PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2; B2 is ACTIVE on SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1. Neither may be displaced. Route this file once when a collision-safe browser-capable lane becomes free.
