# Tournament detail tabs accessibility implementation plan

Status: **IMPLEMENTED_AND_TEST_CODE_PRESENT / REQUEST_COUNTER_CORRECTION_UNAPPLIED / EXECUTION_EVIDENCE_PENDING**

Repository: `thin-bt/dollworld`  
Target branch: `master`  
Original planning base commit: `d0e0ca6bc9ad9e7f458e6d9c9caf67f241df2f5c`  
Latest production reconciliation base: `c1a2def310fe142ce7904f9044631c46c576bfbe`  
Production JSX blob: `811f149dc7f9de1dbdf076297f53e00a3f2b7b99`  
Current Playwright blob: `ecdfddf39fa660de9fdf09ae174c3b22433f1188`

## Implementation reconciliation (2026-10-04)

The planned JSX and primary Playwright coverage are now present on `master`:

- production implementation commit: `da62fba01dc55425d09b98bcf61dab4b9ca8a04f`;
- deterministic disabled-tab test commit: `c7c5f893b358b88e281f720a3a401853f7c87c32`;
- current JSX includes stable tab/panel IDs, `aria-controls`, `role="tabpanel"`, roving tab stops, automatic Arrow/Home/End activation, the availability-reset effect, and stable hidden panels;
- current tests cover semantics, enabled keyboard navigation, focus transfer, wrapping, participant-region Tab movement, and unavailable-participant behavior.

A fresh audit found one false-positive gap in the new no-request assertion. The test listens for `/api/s2/competition` and `/api/s2/competition/step`, while production builds both URLs from `API_PREFIX = "/api/s1_5"` (shared contract blob `9253a85ea9d7c565cb0db01db3f54054706bae1e`; fetch implementation blob `e64866454182ed72a6722f95fc7ba8979b19d357`). The counters therefore remain zero even if real competition requests occur.

Prepared correction artifact:

- `_handoff-artifacts/audit/ui-page-mocks-20260922/01_implementation_plans/04_tournament_detail_tabs_request_counter_correction.patch`
- original artifact create commit: `60ce73fb08aebb615a1687ffab45061ef4eb03fd`
- apply-ready artifact revision commit: `9bf1b0c6f797f230c17fa8d885aa15660650280a`
- current artifact blob: `d66537614d05cde5a4160862f89533fa847bbbe8`
- validation: the invalid placeholder `index ...CORRECTED` header was removed; the current production test blob contains exactly one matching GET line and one matching POST line for this two-line hunk
- production application status: **UNAPPLIED**

The correction changes only the two monitored paths to `/api/s1_5/competition` and `/api/s1_5/competition/step`. Until that patch is applied and executed, do not treat the no-request condition as verified runtime evidence.

## Purpose

Complete the WAI-ARIA tab relationship and keyboard interaction for the tournament detail switcher without changing competition data, routing, participant presentation, or mutation behavior.

The current production UI already renders a labeled `role="tablist"` and two buttons with `role="tab"` plus `aria-selected`. It does not yet provide stable tab/panel ID relationships, `role="tabpanel"`, roving tab stops, or Arrow/Home/End behavior. This is a separate accessibility task from the completed participant-table v48 work.

## Production scope

| Concern | Production location | Planned change |
| --- | --- | --- |
| Tab state and refs | `apps/web/src/client/competition/CompetitionPage.tsx` → `TournamentDetailPanel` | Add one ref per tab, a guarded tab activation helper, and one keyboard handler |
| Tab semantics | Existing `.competition-detail-tabs` buttons | Add stable `id`, `aria-controls`, and selected-only `tabIndex` |
| Panel semantics | Existing overview and participants bodies | Keep both panel containers mounted; add stable `id`, `role="tabpanel"`, `aria-labelledby`, and `hidden` |
| State invariant | `canShowParticipants` / `detailPane` | Reset to overview if participants becomes unavailable |
| Regression coverage | `tests/e2e/s2-ui009-round-robin-competition.spec.ts` | Add semantic, focus, keyboard, disabled-state, and no-request checks |
| Styling | `apps/web/src/client/presentation.css` | No planned change; native `hidden` behavior and existing focus treatment remain authoritative |

## Stable identifiers

| Element | ID | Existing test ID retained |
| --- | --- | --- |
| Overview tab | `competition-detail-tab-overview-control` | `competition-detail-tab-overview` |
| Participants tab | `competition-detail-tab-participants-control` | `competition-detail-tab-participants` |
| Overview panel | `competition-detail-panel-overview` | `competition-detail-overview` |
| Participants panel | `competition-detail-panel-participants` | `competition-participants` |

The existing test IDs are regression contracts and must not be renamed. IDs are added only for ARIA relationships.

## Interaction contract

1. Use automatic activation: moving focus with a supported arrow key also selects and displays the destination panel.
2. Exactly one enabled tab has `tabIndex={0}`; every other enabled tab has `tabIndex={-1}`.
3. `ArrowRight` and `ArrowDown` move to the next enabled tab and wrap.
4. `ArrowLeft` and `ArrowUp` move to the previous enabled tab and wrap.
5. `Home` moves to the first enabled tab.
6. `End` moves to the last enabled tab.
7. The handled keys call `preventDefault()`; `Tab`, `Shift+Tab`, Enter, Space, and unrelated keys retain native behavior.
8. Click activation remains supported. A mouse/pointer click updates the selected pane without any network request.
9. The participants button remains a native `disabled` button when `canShowParticipants === false`; keyboard navigation skips it.
10. If projection data changes while participants is selected and `canShowParticipants` becomes false, selection returns to overview before exposing an unavailable panel.

## JSX implementation boundary

Declare both tab refs and the availability-reset effect before the existing `entry === null` early return so hook order remains stable.

The handler should derive the enabled sequence from `canShowParticipants`, compute the next pane from the currently selected pane, update `onDetailPane`, then focus the corresponding existing button ref. Do not query the document by ID and do not introduce a second source of selected-tab state.

Required tab attributes:

~~~tsx
<button
  ref={overviewTabRef}
  id="competition-detail-tab-overview-control"
  role="tab"
  aria-selected={detailPane === "overview"}
  aria-controls="competition-detail-panel-overview"
  tabIndex={detailPane === "overview" ? 0 : -1}
  ...
/>

<button
  ref={participantsTabRef}
  id="competition-detail-tab-participants-control"
  role="tab"
  aria-selected={detailPane === "participants"}
  aria-controls="competition-detail-panel-participants"
  tabIndex={detailPane === "participants" ? 0 : -1}
  disabled={!canShowParticipants}
  ...
/>
~~~

Attach the same `onKeyDown` handler to both buttons. Preserve their text, click callbacks, disabled rule, and existing test IDs.

Replace the overview/participants ternary at the panel-container level with two stable sibling containers:

~~~tsx
<div
  id="competition-detail-panel-overview"
  role="tabpanel"
  aria-labelledby="competition-detail-tab-overview-control"
  hidden={detailPane !== "overview"}
  tabIndex={0}
  className="competition-detail-body"
  data-testid="competition-detail-overview"
>
  {/* existing overview subtree unchanged */}
</div>

<div
  id="competition-detail-panel-participants"
  role="tabpanel"
  aria-labelledby="competition-detail-tab-participants-control"
  hidden={detailPane !== "participants"}
  className="competition-detail-body competition-participants-body"
  data-testid="competition-participants"
>
  {/* existing participants subtree unchanged */}
</div>
~~~

The overview panel receives `tabIndex={0}` because its first meaningful content is a heading rather than an interactive element. The participants panel does not receive another tab stop because its existing `.competition-participant-scroll` region already has `tabIndex={0}`. From the selected participants tab, normal Tab movement therefore reaches the comparison region directly.

Keeping both panel containers mounted ensures every `aria-controls` reference resolves at all times. The inactive subtree is excluded from rendering and accessibility interaction by native `hidden`; do not emulate this with CSS visibility or `aria-hidden`.

## Preserve contracts

The patch must not change:

- `detailPane` values or the parent `setDetailPane` ownership;
- schedule selection resetting the pane to overview;
- `canShowParticipants` eligibility;
- `entry.participantLinks` as the participant row source;
- any participant table markup, caption, row-header, mobile-label, scroll-region, or test ID from v48;
- `statLabel()`, `aptitudeLabel()`, or the `"—"` fallbacks;
- person URLs or `encodeURIComponent(link.personId)`;
- the participants empty-state copy;
- overview result, ranking, history, or progression content;
- the “日程表に戻る” action;
- competition fetch, session, mutation, or projection behavior.

No API, view-model, CSS-token, or route change belongs in this patch.

## Playwright acceptance

Extend the existing accepted-session competition spec with a focused tab test. Reuse `bootstrapAcceptedCompetitionSession` and the first accepted competition step rather than adding a second fixture path.

### Enabled-state assertions

1. The tablist has accessible name “大会詳細タブ”.
2. Both controls have `role="tab"`, stable IDs, and the expected `aria-controls`.
3. On initial detail display, overview is selected with `tabindex="0"`; participants is unselected with `tabindex="-1"`.
4. Both referenced panel IDs exist in the DOM; only overview is visible.
5. Overview panel has `role="tabpanel"`, is labeled by the overview tab, and is focusable.
6. Focus overview, press `ArrowRight`; participants becomes selected, focused, and `tabindex="0"`; overview becomes `tabindex="-1"`.
7. The participants panel becomes visible and is labeled by its tab; overview is hidden.
8. From participants, `ArrowRight` wraps to overview. `ArrowLeft` wraps in the opposite direction.
9. `Home` selects overview and `End` selects participants.
10. With participants selected, pressing Tab focuses the existing participant scroll region.
11. Enter and Space still use native button activation.
12. Count requests to `/api/s1_5/session`, `/api/s1_5/competition`, and `/api/s1_5/competition/step` after the bootstrap/step baseline; tab navigation adds zero requests.

### Disabled-state assertions

Using an existing schedule entry for which `canShowParticipants === false` (or the narrowest existing component fixture if no deterministic schedule row exists):

1. Participants retains the native `disabled` attribute and is not in the roving sequence.
2. Overview is selected and is the only tab stop.
3. ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Home, and End all leave focus and selection on overview.
4. The unavailable participants panel stays hidden.
5. Existing empty-state behavior remains covered when the participants subtree is inspected through a component-level fixture; do not make a disabled native tab user-activatable merely to test the message.

## Responsive and visual validation

This task should not introduce layout changes. Verify at 1280, 760, 520, and 360 CSS pixels:

- selected/unselected tab appearance is unchanged;
- keyboard focus remains visible on both tab controls;
- hidden panels create no blank height or duplicate scroll owner;
- selecting participants retains the v48 desktop horizontal region and mobile card layout;
- viewport horizontal overflow remains absent;
- Back-to-schedule placement is unchanged.

## Completion criteria

Production completion requires all of the following:

- JSX implementation is present on `master`;
- the existing click-based participant test still passes;
- new semantic and keyboard Playwright assertions pass;
- disabled-state behavior is covered deterministically;
- 1280/760/520/360 browser validation is recorded;
- no competition API request is caused by tab-only navigation.

The JSX implementation and test code are present, but the request-counter correction is not yet applied and no executed browser evidence has been observed. Report the status as **IMPLEMENTED_AND_TEST_CODE_PRESENT / REQUEST_COUNTER_CORRECTION_UNAPPLIED / EXECUTION_EVIDENCE_PENDING**.
