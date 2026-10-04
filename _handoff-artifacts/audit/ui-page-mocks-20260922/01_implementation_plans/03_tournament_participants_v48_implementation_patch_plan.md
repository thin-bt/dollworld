# Tournament participants v48 — production patch plan

Status: GPT-only preparation; Cursor execution intentionally paused.

## Authority
- Production: `apps/web/src/client/competition/CompetitionPage.tsx`
- Review mock: `_handoff-artifacts/audit/ui-page-mocks-20260922/00_html_mocks/03_tournament_participants_accessible_responsive_mock_v48.html`

## Patch boundary
Change only the participants presentation inside `TournamentDetailPanel` in `apps/web/src/client/competition/CompetitionPage.tsx` plus participant-specific selectors in `apps/web/src/client/presentation.css`. Do not change API, view-model, fetch/session, lifecycle, routing, mutation, tournament selection, or progression behavior.

Fresh production reconciliation: `presentation.css` currently gives `.competition-detail-body` its own `overflow-x: auto`, while `.competition-participant-table td, th` force `white-space: nowrap`. The v48 design requires one scroll owner on desktop and card wrapping on mobile, so the implementation must neutralize the outer body overflow only for the participants pane and move desktop horizontal overflow to the new focusable wrapper. Do not leave nested horizontal scroll regions.

## JSX patch
1. Keep `canShowParticipants` and the current empty state unchanged.
2. Keep the comparison TABLE as the element carrying `data-testid="competition-participant-comparison"`.
3. When participants exist, add a visually-hidden scroll instruction and wrap the existing table in a focusable overflow region using `tabIndex={0}`, `role="region"`, `aria-label="参加者比較表"`, and `aria-describedby` pointing to that instruction.
4. Add a visually-hidden caption: `大会参加者の能力・適性比較`.
5. Change only the participant-name cell from `td` to `th scope="row"`; preserve the row testid.
6. Add mobile labels to rank, age, official record, each BaseStat6 value, and each Aptitude3 value. Generate stat/aptitude labels with existing `statLabel(key)` / `aptitudeLabel(key)`; do not duplicate label dictionaries.
7. Preserve the person detail href exactly as `/people/${encodeURIComponent(link.personId)}`.
8. Preserve all `?? "—"` fallbacks and all existing row/stat/aptitude testids.

## Responsive CSS contract
Add participant-scoped classes rather than changing global `.data-table` behavior. Recommended mapping: participants body modifier (for example `competition-participants-body`), wrapper `competition-participant-scroll`, visually-hidden helper using the project's existing sr-only utility if one exists (otherwise a participant-local equivalent), per-cell `competition-participant-mobile-label`, person cell modifier, and detail cell modifier.

- Desktop: retain the 14-column comparison table; horizontal overflow belongs to the focusable wrapper, not `.competition-detail-body` and not the viewport. Override the participants body to `overflow-x: visible` while leaving overview/ranking/knockout overflow behavior untouched.
- Desktop table may keep nowrap values; the wrapper owns overflow and must expose a visible `:focus`/`:focus-visible` indicator.
- <=760px: use the same table DOM as cards, three value columns; set the participant wrapper to `overflow: visible`, hide only the visual table header, allow participant cells to wrap (`white-space: normal; min-width: 0; overflow-wrap: anywhere`), and expose per-cell mobile labels.
- <=520px: two value columns; person and detail cells span the full card width.
- <=360px: reduce spacing only; do not remove labels or values.
- Long participant names must wrap without forcing viewport overflow.
- Person-detail action must provide at least a 44px mobile target.
- Focusable desktop overflow region must have a visible focus indicator.

## Preserve exactly
`entry.participantLinks`; `STAT_KEYS`; `APTITUDE_KEYS`; `statLabel()`; `aptitudeLabel()`; `competition-participant-comparison`; row/stat/aptitude testids; `canShowParticipants`; empty-state text `参加者情報はまだありません。`; existing detail tabs; `日程表に戻る` callback and placement.

## Production CSS reconciliation guard
- Current canonical CSS blob at reconciliation: `541bfaf3a6eb97f7d2ed5b00fb582f9fb800893d`.
- Existing global `.competition-detail-body, ... { overflow-x: auto; }` must continue serving non-participant detail content.
- Existing `.competition-participant-table td, .competition-participant-table th { white-space: nowrap; }` must be overridden only inside the <=760px participant-card media rule; do not remove it globally.
- No global `.data-table`, ranking, knockout, history, or schedule responsive behavior should change as a side effect.

## Accessibility semantics guard
- The production tab buttons currently expose `role="tab"` and `aria-selected`, but there is no corresponding `role="tabpanel"` / `aria-controls` relationship. Do **not** broaden the v48 participant patch to repair the entire tab widget incidentally; keep that as a separate accessibility task so this presentation patch stays reviewable.
- The new participant scroll region must have a stable instruction id unique within `TournamentDetailPanel`; the visually-hidden instruction must be present only when the participant table is rendered.
- Prefer the existing `.dw-visually-hidden` utility already present in canonical `presentation.css`; do not add a second sr-only implementation unless production structure makes reuse impossible.
- Keep the TABLE caption inside the table and visually hidden. The wrapper's accessible name describes the scroll region; the caption describes the table, avoiding one element carrying both responsibilities.
- Mobile card styling must not use `display: contents` on rows/cells because that can weaken table semantics in accessibility trees. Use explicit grid/block layout while retaining the single TABLE DOM.

## Acceptance
- Existing competition tests pass without changing their behavioral contract.
- Browser review at >=1280px, 760px, 520px, and ~360px.
- Verify long-name wrapping, all-missing-value row, keyboard focus/scroll behavior, participant detail links, empty state, tab switching, and back-to-schedule behavior.
- No duplicate mobile participant DOM.
- Completion requires production JSX/CSS implementation and browser/test verification; mock reproduction alone is not completion.
