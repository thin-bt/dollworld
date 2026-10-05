# UI-010 Tournament match detail accessibility implementation plan

Status: **PLAN_PUBLISHED / PRODUCTION_UNAPPLIED / EXECUTION_EVIDENCE_PENDING**

## 1. Objective

Make the retained match-detail view usable at 1280, 760, 520, and 360 CSS pixels without page-level horizontal scrolling, while giving the wide turn-order table a keyboard-focusable, programmatically named scroll region and correct table header semantics.

This is a narrow accessibility and responsive-layout change. It does **not** redesign the match result, rewrite `BattleLogViewPanel`, or change competition API/data contracts.

## 2. Canonical references

Prepared against `thin-bt/dollworld` branch `master`.

- Preparation base: `70d8fd2799b74c6c324e0d40746fd50486b46286`
- Review mock: `_handoff-artifacts/audit/ui-page-mocks-20260922/00_html_mocks/06_tournament_match_detail_accessible_log_mock.html`
- Review mock commit: `07e75beee47021626bd847899fa07294f720f924`
- Review mock blob: `b0f8f0e01fa8048eb3467e45595e62b5ea0921b0`
- Current detailed-log component blob observed during audit:
  `apps/web/src/client/competition/CompetitionMatchDetailedLog.tsx` @
  `736d17685dd7dc31dec4e1f822bcd1d878012b27`
- Current page component blob observed during audit:
  `apps/web/src/client/competition/CompetitionMatchPage.tsx` @
  `65cbe307def54e78c0f5d1dc5311820143c67dfc`
- Current presentation stylesheet blob observed during audit:
  `apps/web/src/styles/presentation.css` @
  `c21f53b368b7585e12ee0ce5a2e996720d9c8c32`
- Current component test blob observed during audit:
  `apps/web/src/client/competition/competition-match-page.test.tsx` @
  `710950488853ccadb65c310e28ea80d864cbc80a`

Re-fetch every production target before applying. If a blob changed, reconcile the plan against the latest master instead of forcing this plan's line-level assumptions.

## 3. Audit finding

The retained-detail branch renders the turn order in
`.competition-match-turn-order` with a visible heading and a `.data-table`.
The wrapper can horizontally scroll through shared CSS, but it is not keyboard
focusable or programmatically named. The table has no caption, column headings
do not declare `scope="col"`, and the first cell of each body row is not a row
header.

The shared overflow rule also includes `.competition-match-page`. This can
make both the page container and the turn-order wrapper horizontal scroll
owners. At narrow widths the user can encounter an ambiguous nested-scroll
experience rather than a single deliberate scroll surface.

The unavailable/pruned-log branch is already explicit and must remain intact.

## 4. Screen-to-production mapping

| Review-mock element | Production owner | Required change |
|---|---|---|
| Page shell and back link | `CompetitionMatchPage.tsx` | Preserve DOM order and existing loading/error behavior; do not introduce another scroll wrapper. |
| “ターン行動順” heading | `CompetitionMatchDetailedLog.tsx` | Add a stable heading ID; retain the visible Japanese label. |
| Visible scroll instruction | `CompetitionMatchDetailedLog.tsx` | Add concise help text immediately before the wide table and give it a stable ID. |
| Focusable named table region | `CompetitionMatchDetailedLog.tsx` | Set `tabIndex={0}`, `role="region"`, `aria-labelledby`, and `aria-describedby` on the existing turn-order wrapper. |
| Caption and header associations | `CompetitionMatchDetailedLog.tsx` | Add a visually hidden caption; add `scope="col"` to header cells; render turn numbers as `<th scope="row">`. |
| Single horizontal-scroll owner | `presentation.css` | Remove page-shell ownership of horizontal overflow; retain overflow on the actual wide-data wrapper. |
| Focus indication | `presentation.css` | Add a high-contrast `:focus-visible` treatment without suppressing the global outline. |
| Existing combat-log presentation | `BattleLogViewPanel` | No intended structural or data change. |

The mock contains both retained and pruned reference states for review. Production
must keep the existing conditional branch; the two states must not render
simultaneously.

## 5. Proposed patch sequence

### Step A — semantics in `CompetitionMatchDetailedLog.tsx`

1. Give the existing section heading an ID such as
   `competition-match-turn-order-heading`.
2. Add visible help text with ID
   `competition-match-turn-order-help`: the table can be horizontally
   scrolled when it exceeds the viewport.
3. On the existing `.competition-match-turn-order` wrapper add:
   - `tabIndex={0}`
   - `role="region"`
   - `aria-labelledby="competition-match-turn-order-heading"`
   - `aria-describedby="competition-match-turn-order-help"`
4. Add a visually hidden caption that describes the table's contents rather
   than repeating only the section title.
5. Add `scope="col"` to the four current column headers.
6. Change the body cell containing the turn number from `td` to
   `th scope="row"`.
7. Preserve source order, values, `data-testid="competition-match-turn-order"`,
   and all existing retained/pruned behavior.

Do not add `aria-label` when the visible heading already supplies the region
name. Do not add a positive tab index.

### Step B — scroll ownership and styling in `presentation.css`

1. Split `.competition-match-page` out of the shared `overflow-x: auto`
   selector. The page shell keeps `min-width: 0` and `max-width: 100%`, but
   is not a horizontal scroll surface.
2. Keep `overflow-x: auto`,
   `-webkit-overflow-scrolling: touch`, and `max-width: 100%` on
   `.competition-match-turn-order`.
3. Add `overscroll-behavior-inline: contain` to the turn-order wrapper so a
   boundary gesture does not unexpectedly move the page.
4. Add spacing and muted styling for the visible help text.
5. Add a `:focus-visible` rule for the wrapper using the existing focus token
   or the nearest existing focus color. The region must remain visibly focused
   in forced-colors mode.
6. Reuse the repository's existing visually-hidden utility if one exists;
   otherwise add a standard clipping utility scoped consistently with the
   stylesheet. Do not use `display: none` for the caption.

Avoid `overflow-x: hidden` on broad ancestors if it would clip focus rings,
menus, or other positioned content. The acceptance condition is achieved by
removing the page as an overflow owner and constraining the real wide child,
not by masking an unresolved width bug.

### Step C — tests

Extend
`apps/web/src/client/competition/competition-match-page.test.tsx` in the
retained-data test to assert:

- region is discoverable by role and accessible name “ターン行動順”;
- region has `tabindex="0"`;
- region description resolves to the visible scroll instruction;
- table has a non-empty accessible caption/name;
- all column headers are `columnheader`;
- each turn number is a `rowheader`;
- pruned-log state still does not render the turn-order region.

Add or extend a browser test for 1280, 760, 520, and 360 CSS-pixel viewports:

- `document.documentElement.scrollWidth <= window.innerWidth`;
- the turn-order region has `scrollWidth > clientWidth` at the narrow
  fixture viewport;
- focusing the region produces a visible focus indicator;
- horizontal scrolling changes the region's `scrollLeft` without changing
  a page-level horizontal offset;
- the back link retains at least a 44-by-44 CSS-pixel target;
- retained and pruned fixtures remain mutually exclusive and readable.

Use bundled Chromium if that is the repository's established deterministic
lane. Record the exact command and result; do not claim browser validation from
static inspection alone.

## 6. Acceptance gates

- No API schema, route, result calculation, or battle-log data changes.
- No page-level horizontal scrollbar at 1280 / 760 / 520 / 360.
- The only new tab stop is the scrollable turn-order region, and only in the
  retained-detail branch where the table exists.
- Screen reader users receive region name, scroll instruction, table caption,
  column headers, and turn row headers without duplicate naming.
- Keyboard focus is clearly visible in normal and forced-colors modes.
- Existing loading, error, unavailable/pruned, and back-navigation behavior
  continues to pass.
- Unit/component tests and browser viewport tests pass.
- Production status is not changed from **UNAPPLIED** until the implementation
  commit is present on master and every changed file is read back from master.

## 7. Validation completed for this plan

- Fresh master source read: completed.
- Existing table semantics and shared overflow selector inspected: completed.
- Review HTML structure checked for a single named, focusable table scroll
  region, caption, column scopes, and row scopes: completed.
- Review mock exact-byte master readback: completed.
- Production code modification: not performed.
- Production tests/E2E: not run; pending implementation.
