# UI-EVENTS-VALIDATION-MOCK-13-14-20260923-R2

status: READY
owner: Role2
scope: UI workstream screens 13 events / 14 system validation
source: current master `apps/web/src/client/events/**`, established project presentation/wireframe direction

## Objective
Continue the UI workstream after the battle blueprint by turning the existing Events + Validation implementation into a coherent reviewable 13/14 HTML mock and then using that mock as the implementation blueprint. Preserve current semantics and API/filter behavior; this is presentation/navigation improvement, not a new event model.

## Current-master facts to preserve
- `/events` already owns both `events` and `validation` tabs.
- Event and validation panels have independent loading/success/empty/error/stale state and pagination/query state.
- Event filters include person, event group, year, month, week.
- Validation has status filtering.
- Existing event presentation resolves person display names and groups human-facing event lifecycles; do not regress those semantics.

## Design direction
1. Treat Events and System Validation as sibling views with one clear page-level navigation model; do not visually mix validation failures into the normal event chronology.
2. Events default view should optimize for reading world history: clear chronological grouping, human-readable event type/title, actor/person link, concise outcome/context, and secondary technical metadata.
3. Put filters in a compact stable toolbar rather than letting controls dominate the content. Active filters must be obvious and removable/resettable without hunting.
4. Preserve grouped lifecycle presentation and avoid exposing raw implementation event noise as the primary reading experience.
5. Validation view should optimize triage: status/severity/result first, then concise problem identity/context; raw identifiers/details are secondary disclosure.
6. Make loading, empty, stale cursor and error states visually distinct and actionable. Stale pagination must not look like an ordinary empty result.
7. Long identifiers/technical payloads must not destroy narrow layouts. Human labels stay readable; technical detail may wrap/collapse.
8. Keep density suitable for scanning many records. Avoid oversized cards for every routine event; reserve stronger emphasis for exceptional/failed states.
9. Reuse the established global shell, spacing, typography, panels, chips/status treatment and responsive conventions rather than inventing an isolated visual system.

## Mock + implementation continuation
- Produce a browser-reviewable `13-14_events_system_validation_mock_v01.html` (or later revision if an existing artifact already exists; reuse it rather than duplicate).
- Mock representative success, filtered, empty, stale/error, and narrow responsive states sufficiently to judge hierarchy.
- Once coherent, compare current master against the mock and prepare/perform the safe presentation implementation immediately. Absence of an explicit user `approved` phrase is not a blocker for changes that follow established intent and do not change product semantics.
- Identify the exact mock revision in implementation evidence.

## Verification
- Focused events/validation UI tests.
- web typecheck + production build.
- Real-browser comparison for `/events?tab=events` and `/events?tab=validation`, desktop and narrow width.
- Material divergence from the mock is FIX_REQUIRED unless canonical semantics require it; document any intentional semantic divergence.

## Guardrails
- No event/validation DTO or persistence semantics changes.
- Preserve existing grouping, person-name resolution, filters, cursor semantics and test contracts unless a presentation-only focused update requires test adjustment.
- Follow `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and workspace-preservation rules.

## Continuation
Do not stop at the mock. Continue mock -> implementation handoff -> browser compare/fix -> screen 15 dev viewer or the next safe UI work item.