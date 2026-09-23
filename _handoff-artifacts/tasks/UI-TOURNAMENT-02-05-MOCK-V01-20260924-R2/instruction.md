# UI-TOURNAMENT-02-05-MOCK-V01-20260924-R2

status: READY
owner: Role2
mode: UI_IMPLEMENTATION_BROWSER_COMPARE
visual-blueprint: `_handoff-artifacts/mocks/02-05_tournament_schedule_detail_participants_results_mock_v01.html`
blueprint-commit: `7a462293c728db6e8558b46f00cd9dcd753dfbbb`
authority: GitHub `thin-bt/dollworld` / `master`

## Objective
Revise the current tournament UI for screens 02 schedule, 03 tournament detail, 04 participants, and 05 match results using the canonical mock as the visual/layout blueprint. This is production implementation work, not a mock-only review pass.

## Existing semantic base to preserve
- `apps/web/src/client/competition/CompetitionPage.tsx`
- `apps/web/src/client/competition/competition-schedule-matrix.tsx`
- `apps/web/src/client/competition/ui009-views.ts`
- existing `CompetitionMatchPage` and shared battle presentation for match detail/log
- current tournament lifecycle, schedule entries, participant links/stats/aptitudes, round-robin matrix/history, knockout bracket, champion, promotion/rank history, annual ranking, matchId and person routes

Do not invent new tournament semantics or change DTO/schema merely to fit the mock.

## Required implementation
1. Make the annual schedule the first clear scan surface: timing, tournament name/type/rank, lifecycle state, participant certainty, and the next playable/active tournament must be visually distinguishable without opening every entry.
2. Tournament detail must establish hierarchy: identity/state -> progress/action -> latest result -> bracket/round-robin progress -> secondary historical/ranking material. Do not let every table compete at equal visual weight.
3. Preserve the existing detail/participants split, but improve participant comparison readability. Keep current six stats, aptitudes, official record/rank/age when supplied, and person-detail links.
4. Match results/history must keep chronology readable and retain a direct route to `/competition/matches/:matchId` whenever matchId exists. Battle detail/log presentation remains the already-shared battle UI; do not duplicate it inside tournament UI.
5. Preserve explicit pending/unconfirmed states. A scheduled tournament with no confirmed participants/results must not look completed or populated.
6. Improve spacing, density, headings, grouping, responsive overflow/card behavior, and weak back/navigation affordances where this follows established semantics.
7. Keep current test IDs/contracts unless a focused update is required by the presentation refactor.

## Verification
- Focused competition UI tests for touched contracts.
- web typecheck and production build.
- Start the real web app and browser-compare current implementation against the blueprint for: schedule-first state; active/playable tournament detail; participants; completed/pending match result rows; at least one match-detail route.
- Verify desktop and narrow widths. Wide participant/matrix data may use deliberate horizontal scrolling, but primary identity/state/action must remain readable without hidden context.
- Material hierarchy/layout/navigation divergence from the blueprint is FIX_REQUIRED unless canonical semantics require it; document only genuine semantic exceptions.
- Publish terminal evidence to `_handoff-artifacts/results/UI-TOURNAMENT-02-05-MOCK-V01-20260924-R2/result.md` with exact product SHA, commands, browser routes/states, viewport coverage, and blueprint path/commit.

## Guardrails
Follow `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and workspace-preservation rules. No new product semantics. No mock-only completion. No status-only terminal.

## Continuation
After implementation and browser comparison/fix, continue to the next safe UI workstream item rather than waiting for an approval phrase.