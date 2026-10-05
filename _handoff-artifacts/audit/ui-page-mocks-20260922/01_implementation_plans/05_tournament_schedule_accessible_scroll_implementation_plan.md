# Tournament annual schedule accessible-scroll implementation plan

Status: **IMPLEMENTED_ON_MASTER / STATIC_VALIDATION_PASSED / BUNDLED_CHROMIUM_E2E_PASSED**

Repository: `thin-bt/dollworld`  
Target branch: `master`  
Fresh-read base commit: `40c3b681081f3641c4b7b1b6e0aa59faa20157c8`  
Review mock: `_handoff-artifacts/audit/ui-page-mocks-20260922/00_html_mocks/04_tournament_schedule_accessible_scroll_mock.html`  
Mock commit: `d316c1565cc91915e1ee887b493ea6acad7743fd`  
Mock blob: `4b17b276307e338949d6993e6e98b45267927490`  
Pre-implementation matrix blob: `ce6d9635c30f224600fb69a06a608250e698a245`  
Pre-implementation CSS blob: `0766da25b1c8a7c0f70afb40935682326ebcdd8a`  
Pre-implementation Playwright blob: `925c8a9c985f74c22314c559cd60bf555bd358c8`  
Production implementation commit: `08fdc4795a245c7ddadc0d15f96c140935e82b35`  
Production matrix blob: `40322979c1cd6d4225fb5d76d12b4b19dfc9ba52`  
Production CSS blob: `abb8bb82abca87087fe6ab8b530984b51fae1345`  
Production Playwright blob: `ef82b6b80828d4c585e15ae425461961f05403b0`  
Core patch: `_handoff-artifacts/audit/ui-page-mocks-20260922/01_implementation_plans/05_tournament_schedule_accessible_scroll_core.patch`  
Core patch commit: `d4ff9ef40a5eb52f75eb9a962f660c4b65470ee6`  
Core patch blob: `56f6d2aa9006892cf7833db70fa9ec7046db6099`

The core patch and its focused Playwright acceptance test were applied to production on 2026-10-05. The three intended targets were read back from `master` at the production blob SHAs above.

## Implementation outcome (2026-10-05)

- `prettier --check`: passed for the three production targets.
- ESLint: passed for `competition-schedule-matrix.tsx`.
- `npm run typecheck -w @shared-world/web`: passed.
- `npm run build -w @shared-world/web`: passed.
- `git diff --check`: passed.
- Focused Playwright acceptance: passed on the Playwright-bundled Chromium (`1 passed`).
- The configured Chrome distribution was not installed in the execution environment. Installing that distribution required unavailable OS package-manager permissions; this is recorded separately from the successful bundled-Chromium result.

## Purpose

Make the existing 48-week annual tournament matrix understandable and operable as one keyboard-scrollable region while preserving its single semantic TABLE, schedule data, selection behavior, and responsive containment.

Production already supplies horizontal overflow, a max-content table, sticky row labels, month/week headers, tournament marker buttons, and the 960px layout collapse. The missing contract is that `.competition-schedule-scroll` cannot itself receive keyboard focus and has no region name or scrolling instructions. Existing Playwright coverage does not assert schedule-region focus, keyboard scrolling, or viewport containment.

## First production patch boundary

The first patch is deliberately limited to semantic and keyboard-scroll completion. It requires changes only in:

- `apps/web/src/client/competition/competition-schedule-matrix.tsx`;
- `apps/web/src/client/presentation.css`;
- `tests/e2e/s2-ui009-round-robin-competition.spec.ts`.

No API, view model, tournament allocation, year navigation, detail pane, participant table, or mutation behavior changes belong in this task.

### JSX additions

Add one visible, concise instruction immediately before the existing scroll wrapper:

~~~tsx
<p id="competition-schedule-scroll-help" className="competition-schedule-scroll-help">
  横にスクロールして1〜12月の日程を確認できます。
  キーボードでは日程表にフォーカスして左右の矢印キーを使用します。
</p>
~~~

Complete the existing wrapper as the sole schedule scroll owner:

~~~tsx
<div
  className="competition-schedule-scroll"
  data-testid="competition-annual-schedule"
  tabIndex={0}
  role="region"
  aria-label={`${overview.worldYear}年 大会日程の横スクロール領域`}
  aria-describedby="competition-schedule-scroll-help"
>
~~~

Keep the TABLE as a TABLE. Replace its duplicated `aria-label` name with a visually hidden caption:

~~~tsx
<table className="competition-schedule-table">
  <caption className="dw-visually-hidden">
    {overview.worldYear}年 大会日程表
  </caption>
~~~

Reuse the existing global `.dw-visually-hidden` utility. Do not add another screen-reader-only utility.

For each of the existing 48 week column headers, derive its month and week-of-month from the current index and provide an unambiguous accessible name. Mark only the current-world-year/current-week column with `aria-current="date"`:

~~~tsx
const weekNumber = index + 1;
const month = Math.floor(index / 4) + 1;
const weekOfMonth = (index % 4) + 1;
const isCurrentWeek =
  overview.isViewingCurrentWorldYear &&
  weekNumber === overview.currentWeekColumn;

<th
  key={index}
  scope="col"
  className="competition-schedule-week"
  aria-label={`${month}月 第${weekOfMonth}週${isCurrentWeek ? " 現在週" : ""}`}
  aria-current={isCurrentWeek ? "date" : undefined}
>
  {weekOfMonth}
</th>
~~~

This semantic marker supplements the existing visual current-column treatment; it does not replace `.competition-schedule-cell--now`.

### CSS additions

Preserve the existing overflow, width, containment, border, background, and momentum-scroll declarations. Add:

~~~css
.competition-schedule-scroll-help {
  margin: 0 0 0.5rem;
  color: var(--dw-muted);
  font-size: 0.85rem;
  line-height: 1.5;
}

.competition-schedule-scroll:focus-visible {
  outline: 2px solid var(--dw-accent);
  outline-offset: 3px;
}
~~~

The help remains visible because horizontal scrolling is not obvious to pointer or keyboard users. At narrow widths it may wrap naturally; it must not be hidden or ellipsized.

Do not add `outline: none` at any breakpoint.

## Mock-to-production reconciliation

| Mock element | Production decision |
| --- | --- |
| Single 48-week TABLE | Required; existing production structure is preserved |
| Focusable labeled scroll region | Required in first patch |
| Visible keyboard/scroll help | Required in first patch |
| TABLE caption | Required in first patch using `.dw-visually-hidden` |
| Current-week accessible marker | Required in first patch |
| Sticky row label | Already implemented; preserve |
| Sticky month/week header rows | Review option; not included until browser overlap behavior is measured |
| Scroll-edge fades | Review option; requires measured overflow state and must not obscure marker focus |
| “4週” previous/next buttons | Review option; native keyboard/pointer scrolling remains primary in first patch |
| Live visible month-range text | Review option; avoid announcing continuously during native scroll |
| Detail-panel demo content | Illustrative only; no detail-pane change |

This split keeps the first patch state-free and avoids adding ResizeObserver, scroll listeners, smooth-motion dependencies, or a second horizontal navigation model before the core accessible-region behavior is verified.

## Preserve contracts

The implementation must retain:

- `WEEKS_PER_YEAR = 48`;
- `weekColumnIndex(month, weekOfMonth)`;
- `entriesByRowAndWeek()` and its row/week lookup;
- `overview.matrixRowOrder`;
- `ROW_LABELS`;
- empty schedule cells and current-week visual cell class;
- marker `data-testid="competition-schedule-cell"`;
- `data-selection-key`, `aria-pressed`, title, accessible marker label, and `onSelect(entry.selectionKey)`;
- playable, active, past, current-week, and selected CSS classes;
- year navigation callbacks and request behavior;
- `data-testid="competition-annual-schedule"`;
- the 960px two-column-to-one-column layout transition;
- selected tournament resetting the detail pane to overview in `CompetitionPage`.

Do not convert the schedule to cards at mobile widths. The two-dimensional month/week/competition relationship is the primary information architecture and must remain one TABLE DOM.

## Playwright acceptance

Add a focused test to `tests/e2e/s2-ui009-round-robin-competition.spec.ts`, reusing `bootstrapAcceptedCompetitionSession`.

### Semantic assertions

1. `competition-annual-schedule` has `tabindex="0"`, `role="region"`, the current year in its accessible name, and `aria-describedby="competition-schedule-scroll-help"`.
2. The referenced help exists, is visible, and includes both horizontal-scroll and keyboard instructions.
3. The region contains exactly one TABLE.
4. The TABLE caption contains the current displayed year and “大会日程表”.
5. There are 48 second-row week headers.
6. When viewing the current world year, exactly one week header has `aria-current="date"` and its accessible name includes “現在週”.
7. When viewing a non-current year through existing year navigation, no week header has `aria-current="date"`.

### Keyboard and containment assertions

At 1280px:

1. The region has `scrollWidth > clientWidth`.
2. Focus the region, perform Tab then Shift+Tab, and confirm focus returns visibly to the region.
3. Computed `outline-style` is not `none` and outline width is at least 2px.
4. Set region `scrollLeft = 0`; press ArrowRight twice; poll until region `scrollLeft > 0`.
5. `window.scrollX` remains 0.
6. `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
7. A tournament marker remains clickable after horizontal scrolling and updates the existing selected/detail state.

Repeat focus-outline and viewport-overflow assertions at 760, 520, and 360px. Do not require an exact `scrollLeft` pixel value because browser and font metrics can vary.

### Request regression

Schedule focus and native horizontal scrolling must produce zero additional:

- `GET /api/s1_5/session`;
- `GET /api/s1_5/competition`;
- `POST /api/s1_5/competition/step`.

Existing year-navigation tests remain authoritative for the one intended competition projection request caused by changing years.

## Responsive validation

| Width | Required observation |
| --- | --- |
| 1280px | Existing schedule/detail columns remain; only the schedule region scrolls horizontally |
| 960–761px | Existing grid behavior remains until its current breakpoint |
| 760px | Single-column layout; help wraps; focus outline remains fully visible |
| 520px | Year controls and help do not widen the viewport; marker targets remain operable |
| 360px | No document-level horizontal overflow; row labels remain visible during region scroll |

Browser review must also confirm that the region focus outline is not clipped by its rounded border and that sticky row labels do not cover focused tournament markers.

## Completion criteria

This task is complete only when:

- JSX and CSS changes are present on `master`;
- Playwright acceptance code is present;
- the relevant test has executed successfully;
- 1280/760/520/360 browser evidence is recorded;
- marker selection and year navigation regressions pass;
- document-level horizontal overflow remains absent.

The mock and this plan are reviewable preparation. They are not production implementation or runtime evidence.
