# Tournament participants v48 — production patch plan

Status: GPT-only preparation complete; Cursor execution intentionally paused; production patch unapplied.

## Authority
- Repository/branch: `thin-bt/dollworld` / `master`
- Production JSX: `apps/web/src/client/competition/CompetitionPage.tsx`
- Production CSS: `apps/web/src/client/presentation.css`
- Review mock: `_handoff-artifacts/audit/ui-page-mocks-20260922/00_html_mocks/03_tournament_participants_accessible_responsive_mock_v48.html`
- Reconciled production JSX blob: `cd926db28fb1c56909bc7e90b265f15b026c39ee`
- Reconciled production CSS blob: `541bfaf3a6eb97f7d2ed5b00fb582f9fb800893d`

## Patch boundary
Change only the participants presentation inside `TournamentDetailPanel` in `apps/web/src/client/competition/CompetitionPage.tsx` plus participant-specific selectors in `apps/web/src/client/presentation.css`. Do not change API, view-model, fetch/session, lifecycle, routing, mutation, tournament selection, or progression behavior.

Fresh production reconciliation: `presentation.css` currently gives `.competition-detail-body` its own `overflow-x: auto`, while `.competition-participant-table td, th` force `white-space: nowrap`. The v48 design requires one scroll owner on desktop and card wrapping on mobile, so the implementation must neutralize the outer body overflow only for the participants pane and move desktop horizontal overflow to the new focusable wrapper. Do not leave nested horizontal scroll regions.

## Fixed class and id contract
Use these exact names so JSX, CSS, tests, and browser verification do not diverge:

- participants body modifier: `competition-participants-body`
- focusable scroll owner: `competition-participant-scroll`
- scroll instruction id: `competition-participant-scroll-help`
- mobile label: `competition-participant-mobile-label`
- participant name cell: `competition-participant-person`
- participant detail cell: `competition-participant-detail`

Do not introduce alternate aliases during implementation.

## JSX patch
1. Keep `canShowParticipants` and the current empty state unchanged.
2. Add `competition-participants-body` to the existing participants body only. Keep `data-testid="competition-participants"` on that body.
3. When participants exist, render `<p id="competition-participant-scroll-help" className="dw-visually-hidden">表は横方向にスクロールできます。</p>`.
4. Wrap the existing table in `<div className="competition-participant-scroll" tabIndex={0} role="region" aria-label="参加者比較表" aria-describedby="competition-participant-scroll-help">`.
5. Keep the comparison TABLE as the element carrying `data-testid="competition-participant-comparison"`.
6. Add `<caption className="dw-visually-hidden">大会参加者の能力・適性比較</caption>` as the table's first child.
7. Change only the participant-name cell from `td` to `th scope="row" className="competition-participant-person"`; preserve the row testid.
8. Add `<span className="competition-participant-mobile-label" aria-hidden="true">…</span>` before each displayed value in rank, age, official record, each BaseStat6 cell, each Aptitude3 cell, and detail. Use labels `ランク`, `年齢`, `公式戦`, `statLabel(key)`, `aptitudeLabel(key)`, and `詳細`; do not duplicate stat/aptitude dictionaries.
9. Add `competition-participant-detail` only to the final detail cell.
10. Preserve the person detail href exactly as `/people/${encodeURIComponent(link.personId)}`.
11. Preserve all `?? "—"` fallbacks and all existing row/stat/aptitude testids.

The empty state must not render the scroll instruction, wrapper, caption, or a placeholder table.

## Responsive CSS contract
All new rules must be participant-scoped. Do not change global `.data-table` behavior.

### Desktop
- `.competition-participants-body { overflow-x: visible; }`
- `.competition-participant-scroll` is the only horizontal scroll owner: `max-width:100%; min-width:0; overflow-x:auto; -webkit-overflow-scrolling:touch;`.
- Give the wrapper a visible `:focus-visible` outline using `var(--dw-focus)`.
- Keep the existing 14-column table and nowrap values.
- `.competition-participant-mobile-label { display:none; }`

### 761px and wider
- TABLE semantics and the current one-row-per-participant layout remain visually unchanged.
- The page viewport and `.competition-detail-body` must not become additional horizontal scroll owners.

### 760px and narrower
- Use the same TABLE DOM; do not render a second mobile list.
- The wrapper changes to `overflow:visible` and does not retain a redundant focus ring when no longer scrollable.
- Visually hide the table header while keeping it in the accessibility tree; do not use `display:none`.
- Set table and tbody to block layout and each tbody row to a three-column grid.
- Override participant cells locally to `white-space:normal; min-width:0; overflow-wrap:anywhere;`.
- Show `.competition-participant-mobile-label` as a muted block label above its value.
- Name and detail cells span all columns.
- Each row is a bordered card with spacing matching the v48 mock.

### 520px and narrower
- Each participant row becomes a two-column grid.
- Name and detail remain explicit `grid-column:1 / -1`.

### 360px and narrower
- Reduce gap and cell padding only.
- Do not remove labels, values, the detail link, or missing-value markers.

### Interaction sizing
- The person-detail link must be an inline-flex target with `min-height:44px`, aligned center.
- Long participant names must wrap without viewport overflow.

## Preserve exactly
`entry.participantLinks`; `STAT_KEYS`; `APTITUDE_KEYS`; `statLabel()`; `aptitudeLabel()`; `competition-participant-comparison`; row/stat/aptitude testids; `canShowParticipants`; empty-state text `参加者情報はまだありません。`; existing detail tabs; `日程表に戻る` callback and placement.

## Production CSS reconciliation guard
- Existing global `.competition-detail-body, ... { overflow-x: auto; }` must continue serving non-participant detail content.
- Existing `.competition-participant-table td, .competition-participant-table th { white-space: nowrap; }` must be overridden only inside the <=760px participant-card media rule; do not remove it globally.
- No global `.data-table`, ranking, knockout, history, or schedule responsive behavior should change as a side effect.
- Do not use `display:contents` on table rows or cells.

## Accessibility semantics guard
- The production tab buttons currently expose `role="tab"` and `aria-selected`, but there is no corresponding `role="tabpanel"` / `aria-controls` relationship. Do not broaden this participant patch to repair the entire tab widget incidentally; track that separately.
- The scroll instruction id is unique within `TournamentDetailPanel` and is present only with the participant table.
- Reuse canonical `.dw-visually-hidden`; do not add another sr-only utility.
- Keep the caption inside the table. The wrapper names the scroll region; the caption names the table.
- Mobile styling retains one TABLE DOM and must not use `display:contents`.

## Test update contract
Extend the existing competition page test at the current participant comparison scenario; do not replace behavioral fixtures.

Required structural assertions:
- `competition-participant-comparison` resolves to `TABLE`.
- `competition-participant-scroll` has `tabindex="0"`, `role="region"`, and `aria-describedby="competition-participant-scroll-help"`.
- The table contains caption text `大会参加者の能力・適性比較`.
- The first cell of every participant row is `TH[scope="row"]`.
- Existing row/stat/aptitude testids still resolve to the same participant values, including `—`.
- The detail href still encodes `personId`.
- With `canShowParticipants=false`, only the existing empty-state text is rendered and the comparison table/scroll help are absent.

Do not assert responsive CSS geometry in jsdom. Cover geometry in browser verification.

## Browser verification matrix
| Width | Expected layout | Required checks |
|---|---|---|
| >=1280px | 14-column table in one focusable horizontal scroll region | keyboard focus visible; wrapper scrolls; no nested/viewport horizontal scroll |
| 760px | 3-column cards | header visually hidden but accessible; labels visible; name/detail full width |
| 520px | 2-column cards | no clipped Japanese labels; detail target >=44px |
| ~360px | compact 2-column cards | long name wraps; no viewport overflow; all values remain present |

At every width also verify: all-missing-value row, participant link navigation, empty state, tab switching, and `日程表に戻る`.

## Completion gate
Completion requires:
1. production JSX implementation;
2. participant-scoped CSS implementation;
3. existing competition tests plus the structural assertions above;
4. browser verification at all four widths;
5. read-back or diff review proving only the declared boundary changed.

Mock reproduction or this plan alone is reviewable preparation, not completed implementation.
