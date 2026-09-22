# dollworld UI Tuning Config Protocol

authority: normative
rule-index: CONTROL_RULE_INDEX.md
rule: UI-TUNING-001
status: USER_DIRECTED / ACTIVE_FOR_NEW_UI_DESIGN / NON-RETROACTIVE_TO_FROZEN_AUTHORITY
version: 0.1
createdAt: 2026-08-15T17:57:00+09:00
scope: all current and future dollworld browser UI / developer UI / production UI presentation-control values
authority-boundary: active classification/ownership rule for new UI design work; does not silently override already-frozen Sprint/spec contracts; existing frozen contracts require versioned migration/adoption

## UI-TUNING-001 — human-tunable UI numeric/config ownership

### 1. Single decision rule

A numeric value belongs to UI tuning configuration when a human can reasonably use the screen and say:

> 「使い勝手が悪いから、この数字を変えたい」

without intending to change game rules, simulation semantics, security/integrity rules, or protocol meaning.

The classification test is UX-adjustability, not whether the value happens to appear in frontend code, backend code, a DTO, or an API query.

Examples that are UI tuning:

- list page-size options and the default page size
- visible history/log window length
- default visible range / graph window
- quick-action choices and ordering
- custom-input UI minimum/maximum/default when narrower than a server hard limit
- auto-refresh / polling interval
- debounce / throttle delay
- collapse / “more” threshold
- toast/display duration
- UI density / spacing / widths / responsive breakpoints / font sizing when they are presentation choices

### 2. Two configuration classes

### 2.1 UI_BEHAVIOR_CONFIG

Behavior and amount choices visible to the user.

Examples:

```text
listPaging.people.pageSizeOptions
listPaging.people.defaultPageSize
personDetail.trainingHistoryWindowWeeks
personDetail.statDeltaWindowWeeks
simulationControls.customStepUiMaxWeeks
simulationControls.customStepDefaultWeeks
refresh.pollIntervalMs
search.debounceMs
collapse.moreThreshold
chart.defaultVisibleWindow
```

These values must have one canonical owner and must not be independently hardcoded in components, API clients, Dev Viewer helpers, tests, and server adapters.

### 2.2 UI_DESIGN_TOKEN

Pure presentation dimensions and timing.

Examples:

```text
layout.contentMaxWidth
layout.breakpoints.*
spacing.*
control.height
list.rowHeight / density
font.size.*
radius.*
animation.duration.*
```

Prefer CSS custom properties / theme tokens / one typed design-token owner rather than scattered literal CSS numbers.

A design token is not simulation config and must not enter WorldState, SimulationIdentity, replay identity, or canonical game-state hashes.

### 3. Values that are NOT UI tuning config

Do not move the following into UI tuning merely because the UI displays or submits them:

- game/domain rules and formulas
- calendar meaning such as weeks per month/year
- age/rank/eligibility rules
- RNG range / seed semantics
- canonical identity / hash / replay rules
- transaction / commit / rollback semantics
- API schema version or wire-format meaning
- cursor authentication/binding semantics
- ID/UUID format semantics
- server security / DoS / request-size hard limits
- absolute server safety ceilings
- validation/integrity ranges derived from the domain
- test fixture sizes used only to prove scale/boundaries

A UI config value may be constrained by one of these hard contracts, but it does not own the hard contract.

Example:

```text
server hard list limit = 1..200        // API_SERVER_SAFETY
UI People choices = [5,10,25]          // UI_BEHAVIOR_CONFIG
```

Changing `[5,10,25]` must not require changing the server hard ceiling.

### 4. Derive domain-relative UI actions instead of duplicating domain numbers

When a UI choice refers to a domain unit, do not duplicate the domain conversion as an unrelated tuning literal.

Examples:

```text
quick actions = weeks(1) / weeks(4) / domain_period(one_year)
```

The UI may configure which actions are shown and their order. A convenience action that is explicitly labeled/defined as a fixed number of weeks (for example the current `4週間進める`) keeps that week count as a UI behavior value. A control that is explicitly a domain period such as `1年進める` derives its effective week count from the accepted calendar authority. Do not reinterpret an existing fixed-week control as `one_month` merely because the current calendar happens to make four weeks equal one month.

If a future control is explicitly `1か月進める`, that control may use a domain-period action and derive the month length from calendar authority. Custom numeric quick actions such as `12 weeks` may be UI config if intentionally offered as a convenience choice.

### 5. Validation and ownership

Each canonical tuning config must be schema-validated.

Minimum requirements:

- required keys explicit
- numeric values finite safe integers/numbers as applicable
- arrays non-empty where a choice set is required
- choice arrays unique
- defaults must belong to their choice set
- UI values must remain inside the relevant server/domain hard bounds
- invalid config fails fast; do not silently substitute unrelated defaults

One value = one owner.

Allowed:

- components import/read the canonical config
- tests read the canonical config or fixtures derived from it
- server compatibility fallbacks remain separate from browser UX defaults
- generated types derive from a config schema

Forbidden:

- same UX number copied into React + API client + validator + tests
- literal union type acting as the owner of a human-tunable choice set
- Dev Viewer maintaining a divergent copy
- a frozen semantic spec being edited only to change ordinary UX choices after the migration path exists

### 6. Runtime and determinism boundary

UI tuning/configuration is interaction/presentation input only unless a future spec explicitly promotes a value into game rules.

It must not affect:

- WorldState
- SimulationIdentity
- RNG seed/state/consumption
- canonical game-state hash
- replay equality
- event generation semantics
- fixed simulation outputs

Changing UI tuning must not change the same simulation operation's canonical result.

### 7. Current dollworld numeric inventory — 2026-08-15

This inventory is based on the current Sprint 1.5 base/current amendment, presentation bind, mood reference, and current Dev Viewer evidence available in Drive.

| Surface / value | Current form | Classification | Action |
|---|---|---|---|
| People page-size options | 50 / 100 / 200 | UI_BEHAVIOR_CONFIG | migrate; initial user choice 5 / 10 / 25 |
| People default page size | 50 | UI_BEHAVIOR_CONFIG | migrate; new default is not separately user-confirmed yet; choose from 5 / 10 / 25 during 0.1.16 adoption |
| Mock candidate page-size options | 50 / 100 / 200 | UI_BEHAVIOR_CONFIG | migrate owner; preserve values initially |
| Mock candidate default page size | 50 | UI_BEHAVIOR_CONFIG | migrate owner; preserve initially |
| Event page-size options | 100 / 200 | UI_BEHAVIOR_CONFIG | migrate owner; preserve initially |
| Event default page size | 100 | UI_BEHAVIOR_CONFIG | migrate owner; preserve initially |
| Validation page-size options | 100 / 200 | UI_BEHAVIOR_CONFIG | migrate owner; preserve initially |
| Validation default page size | 100 | UI_BEHAVIOR_CONFIG | migrate owner; preserve initially |
| Battle-log page-size options | 100 / 200 | UI_BEHAVIOR_CONFIG | migrate owner; preserve initially |
| Battle-log default page size | 100 | UI_BEHAVIOR_CONFIG | migrate owner; preserve initially |
| Person detail training history window | current `W-47..W` / 48 weeks | UI_BEHAVIOR_CONFIG with domain-relative default | migrate; default may resolve to one accepted game year, but user may choose another visible window |
| Person stat comparison window | DTO field `last48WeeksDelta` | UI_BEHAVIOR_CONFIG embedded in API semantic field | requires versioned DTO/API redesign; use generic `windowWeeks` + `windowDelta` (exact naming at adoption) |
| Simulation quick controls | 1 week / 4 weeks / 1 year(48) | UI choice + DOMAIN_SEMANTIC conversion | configure action presence/order; preserve fixed-week convenience values such as 4 weeks; derive only explicitly domain-relative actions such as 1 year from calendar authority |
| Custom step visible min/max | UI/spec currently exposes 1..480 | UI_BEHAVIOR_CONFIG for presented range, bounded by API hard range | separate UI range/default from server hard ceiling |
| Custom step default input | mood reference shows 12, non-normative | UI_BEHAVIOR_CONFIG if production UI provides a default | no migration claim until actual implementation is checked |
| Home “recent activity” count | mood reference shows 3 examples, no accepted count contract | UI_BEHAVIOR_CONFIG if implemented | do not promote the mock value; define config only if feature exists |
| Content max width / responsive breakpoint / gaps / paddings / row density / font sizes | mood reference includes e.g. 1440px, 900px and many literals; bind says exact dimensions are non-normative | UI_DESIGN_TOKEN | production code should centralize adopted values as design tokens, not copy mood literals as authority |
| Maximum server page size | 200 | API_SERVER_SAFETY | keep outside UI config; UI options must be <= ceiling |
| `simulation/step` absolute accepted range | 1..480 currently | API_SERVER_SAFETY / adapter contract | keep hard limit independent; UI may present a narrower configurable range |
| Name/event/code input length e.g. 100 | API validation | API_SERVER_SAFETY / validation semantics | not UI tuning owner |
| Request-target 8192 bytes | server request safety | API_SERVER_SAFETY | not UI tuning |
| 5,000-person and 200/201 fixtures | acceptance/scale fixtures | TEST_FIXTURE_ONLY | not UI tuning |
| 1 month=4 weeks / 1 year=48 weeks | game calendar | DOMAIN_SEMANTIC | never UI-owned; derive UI labels/actions from domain authority |
| age / eligibility / stat ranges / mastery ranges | game/domain integrity | DOMAIN_SEMANTIC | not UI tuning |
| seed 0..4294967295 | RNG/API semantic | DOMAIN_SEMANTIC / API contract | not UI tuning |

### 8. Required migration rule for existing UI

For existing frozen/accepted UI contracts, do not silently replace values in place.

Migration sequence:

1. inventory literal numeric values in browser/client/server adapter/specs
2. classify every candidate as one of:
   - UI_BEHAVIOR_CONFIG
   - UI_DESIGN_TOKEN
   - API_SERVER_SAFETY
   - DOMAIN_SEMANTIC
   - TEST_FIXTURE_ONLY
   - IMPLEMENTATION_INTERNAL_NON_UX
3. version/adopt semantic changes where a tunable UX number is already embedded in a DTO/API contract
4. introduce one canonical config/token owner
5. migrate consumers
6. test config validation and hard-bound rejection
7. verify changing only UI tuning does not change canonical simulation result
8. independently re-accept the affected delta when required by the current freeze/acceptance rules

### 9. Future-spec rule

New dollworld UI specifications should not introduce a literal numeric UX choice without either:

- referencing an existing canonical UI tuning/design-token owner, or
- explicitly classifying why the literal is DOMAIN_SEMANTIC / API_SERVER_SAFETY / other non-UX authority.

This avoids repeating the Sprint 1.5 `50|100|200` problem in later Sprints.
