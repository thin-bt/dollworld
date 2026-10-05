# Tournament annual schedule scroll-affordance implementation plan

Status: **PLAN_PUBLISHED / PRODUCTION_UNAPPLIED / EXECUTION_EVIDENCE_PENDING**

Repository: `thin-bt/dollworld`  
Target branch: `master`  
Fresh-read implementation commit: `08fdc4795a245c7ddadc0d15f96c140935e82b35`  
Production matrix blob: `40322979c1cd6d4225fb5d76d12b4b19dfc9ba52`  
Production CSS blob: `abb8bb82abca87087fe6ab8b530984b51fae1345`  
Production Playwright blob: `ef82b6b80828d4c585e15ae425461961f05403b0`  
Review mock: `_handoff-artifacts/audit/ui-page-mocks-20260922/00_html_mocks/05_tournament_schedule_scroll_affordance_mock.html`  
Mock commit: `f4fbd53cf2d37582f976108915699d8d7d6c7081`  
Mock blob: `619e24bb5bdc6f8169dea6a92ba1706780a70e5d`

## Purpose

Add discoverable pointer/touch controls and visual overflow cues to the implemented 48-week annual schedule without replacing its semantic TABLE, focusable scroll region, native keyboard behavior, year navigation, or tournament selection.

The current production implementation already passes its focused bundled-Chromium acceptance for region semantics, caption, current-week metadata, keyboard scrolling, responsive containment, selection, and zero unintended API traffic. This is an independent enhancement, not a correction to that implementation.

## Included boundary

The first affordance patch is limited to:

- “4週戻る” and “4週進む” buttons associated with the existing scroll region;
- disabled button state at the left and right boundaries;
- decorative left/right edge gradients shown only when more content exists in that direction;
- reduced-motion-safe scrolling;
- Playwright coverage at 1280, 760, 520, and 360px.

Expected production targets:

- `apps/web/src/client/competition/competition-schedule-matrix.tsx`;
- `apps/web/src/client/presentation.css`;
- `tests/e2e/s2-ui009-round-robin-competition.spec.ts`.

No API, view-model, schedule allocation, year-navigation request, detail-tab, participant-table, or mutation changes belong in this patch.

## Explicitly deferred

Do not include these mock concepts in the first affordance patch:

- sticky month/week header rows;
- visible month-range text;
- `aria-live` updates during scroll;
- scroll snapping;
- drag-to-scroll handlers;
- wheel-event interception;
- replacement of native ArrowLeft/ArrowRight behavior.

Continuous live announcements are specifically excluded because native scrolling may emit many intermediate positions and create noisy assistive-technology output.

## Production DOM mapping

Keep the existing visible help and controls adjacent:

~~~tsx
<div className="competition-schedule-tools">
  <p id="competition-schedule-scroll-help" className="competition-schedule-scroll-help">
    ...
  </p>
  <div className="competition-schedule-scroll-actions" aria-label="日程表の横移動">
    <button
      type="button"
      aria-controls="competition-annual-schedule-region"
      aria-label="4週間戻る"
      disabled={atScrollStart}
      onClick={() => scrollByWeeks(-4)}
    >
      ← 4週戻る
    </button>
    <button
      type="button"
      aria-controls="competition-annual-schedule-region"
      aria-label="4週間進む"
      disabled={atScrollEnd}
      onClick={() => scrollByWeeks(4)}
    >
      4週進む →
    </button>
  </div>
</div>
~~~

Add a non-scrollable frame around the existing sole scroll owner:

~~~tsx
<div
  className="competition-schedule-frame"
  data-at-start={atScrollStart}
  data-at-end={atScrollEnd}
>
  <div
    id="competition-annual-schedule-region"
    ref={scheduleScrollRef}
    className="competition-schedule-scroll"
    data-testid="competition-annual-schedule"
    tabIndex={0}
    role="region"
    aria-label={...}
    aria-describedby="competition-schedule-scroll-help"
    onScroll={syncScrollEdges}
  >
    <table className="competition-schedule-table">...</table>
  </div>
</div>
~~~

The frame owns only the decorative gradients. The existing `.competition-schedule-scroll` remains the only element with horizontal overflow, focus, region semantics, and keyboard scrolling.

## State and measurement contract

Use a ref for the existing scroll owner and two booleans:

~~~ts
const scheduleScrollRef = useRef<HTMLDivElement>(null);
const [atScrollStart, setAtScrollStart] = useState(true);
const [atScrollEnd, setAtScrollEnd] = useState(false);
~~~

`syncScrollEdges` must derive state from the element, using a small tolerance for fractional pixels:

~~~ts
const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
setAtScrollStart(element.scrollLeft <= 2);
setAtScrollEnd(element.scrollLeft >= maxScrollLeft - 2);
~~~

Run the initial measurement after layout and repeat it when:

- the region scrolls;
- its size changes;
- `overview.worldYear` changes;
- schedule entries change.

A `ResizeObserver` scoped to the scroll owner is acceptable. Disconnect it during effect cleanup. Do not attach a document-level scroll listener.

## Four-week distance

Derive the distance from rendered week headers rather than hardcoding pixels:

1. Query the existing `.competition-schedule-week` headers inside the scroll owner.
2. Prefer `headers[4].offsetLeft - headers[0].offsetLeft`.
3. Fall back to four times the first header width only if fewer than five headers exist.
4. Use `scrollBy({ left: direction * distance, behavior })`.
5. Use `"auto"` when `prefers-reduced-motion: reduce` matches; otherwise use `"smooth"`.

Do not focus the schedule region after a button click. Focus remains on the activating control so repeated four-week movement is efficient and predictable.

## CSS contract

- `.competition-schedule-tools`: flexible row, help grows, actions do not shrink below their labels.
- At 760px and below, stack help above a two-column action grid.
- Action buttons have at least 44px block size at 760, 520, and 360px.
- `.competition-schedule-frame`: `position: relative; min-width: 0`.
- Frame pseudo-elements use `pointer-events: none`; they are decoration and receive no ARIA.
- Hide the left gradient when `data-at-start="true"`.
- Hide the right gradient when `data-at-end="true"`.
- Place the left gradient after the sticky row-label width so it does not dim the persistent row heading.
- Preserve the current focus outline on `.competition-schedule-scroll:focus-visible`.
- Do not introduce a second `overflow-x` owner.
- Disable fade transitions under `prefers-reduced-motion: reduce`.

## Preserve contracts

The patch must retain:

- exactly one 48-week TABLE;
- the TABLE caption;
- all month `scope="colgroup"` and week `scope="col"` headers;
- current-week `aria-current="date"`;
- sticky row headings;
- existing empty and tournament cells;
- marker `aria-pressed`, labels, test IDs, selection callbacks, and visual state classes;
- region `tabIndex={0}`, role, accessible name, description, and native keyboard scrolling;
- year-navigation callbacks and request behavior;
- document-level horizontal containment;
- existing schedule test expectations.

## Playwright acceptance

Extend the existing annual-schedule test or add one adjacent focused test.

At 1280px:

1. The region remains the only horizontally scrollable schedule element.
2. Previous is disabled and next is enabled at `scrollLeft = 0`.
3. Left edge decoration is hidden and right edge decoration is visible.
4. Clicking next keeps focus on next, moves `scrollLeft` by approximately four week-column widths, and causes no API request.
5. After the first move, previous becomes enabled.
6. Repeated next activation reaches the right boundary; next becomes disabled and the right decoration is hidden.
7. Previous moves back without changing selected tournament state.
8. Native ArrowLeft/ArrowRight behavior still moves the same region when it has focus.
9. `window.scrollX === 0` and the document has no horizontal overflow.

Repeat the button target-size, focus visibility, boundary-state, and viewport-overflow assertions at 760, 520, and 360px. Avoid exact pixel equality; compare against the measured four-week header distance with a small tolerance.

Request counters must continue to observe the real production paths:

- `GET /api/s1_5/session`;
- `GET /api/s1_5/competition`;
- `POST /api/s1_5/competition/step`.

Scrolling and the two affordance buttons must add zero requests. Existing year navigation remains the only action in this area expected to reload the competition projection.

## Completion criteria

This phase is complete only when:

- the JSX/CSS/test changes are present on `master`;
- the focused Playwright test executes successfully;
- 1280/760/520/360 evidence confirms button sizing, edge state, keyboard preservation, and no viewport overflow;
- no unintended API request occurs;
- marker selection and year navigation remain functional.

This plan and its review mock are canonical preparation. They are not production implementation or runtime evidence.
