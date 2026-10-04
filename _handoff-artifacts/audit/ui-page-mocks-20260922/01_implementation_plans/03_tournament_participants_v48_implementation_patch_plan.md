# Tournament participants v48 — production patch plan

Status: GPT-only preparation; Cursor execution intentionally paused.

## Authority
- Production: `apps/web/src/client/competition/CompetitionPage.tsx`
- Review mock: `_handoff-artifacts/audit/ui-page-mocks-20260922/00_html_mocks/03_tournament_participants_accessible_responsive_mock_v48.html`

## Patch boundary
Change only the participants presentation inside `TournamentDetailPanel` plus the CSS selectors required for its responsive presentation. Do not change API, view-model, fetch/session, lifecycle, routing, mutation, tournament selection, or progression behavior.

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
- Desktop: retain the 14-column comparison table; horizontal overflow belongs to the focusable wrapper, not the viewport.
- <=760px: use the same table DOM as cards, three value columns; hide only the visual table header and expose per-cell mobile labels.
- <=520px: two value columns; person and detail cells span the full card width.
- <=360px: reduce spacing only; do not remove labels or values.
- Long participant names must wrap without forcing viewport overflow.
- Person-detail action must provide at least a 44px mobile target.
- Focusable desktop overflow region must have a visible focus indicator.

## Preserve exactly
`entry.participantLinks`; `STAT_KEYS`; `APTITUDE_KEYS`; `statLabel()`; `aptitudeLabel()`; `competition-participant-comparison`; row/stat/aptitude testids; `canShowParticipants`; empty-state text `参加者情報はまだありません。`; existing detail tabs; `日程表に戻る` callback and placement.

## Acceptance
- Existing competition tests pass without changing their behavioral contract.
- Browser review at >=1280px, 760px, 520px, and ~360px.
- Verify long-name wrapping, all-missing-value row, keyboard focus/scroll behavior, participant detail links, empty state, tab switching, and back-to-schedule behavior.
- No duplicate mobile participant DOM.
- Completion requires production JSX/CSS implementation and browser/test verification; mock reproduction alone is not completion.
