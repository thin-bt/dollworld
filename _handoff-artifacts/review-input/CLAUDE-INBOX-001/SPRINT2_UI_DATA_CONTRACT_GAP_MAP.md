# Sprint 2 UI Data Contract Gap Map

- document: `SPRINT2_UI_DATA_CONTRACT_GAP_MAP.md`
- status: `PROPOSED / IMPLEMENTATION-PREFLIGHT`
- scope: Sprint 2 tournament / ranking / promotion observation UI
- source UI: `TOURNAMENT_UI_WIREFRAME_DRAFT.md`
- source implementation plan: `SPRINT2_BACKLOG-0.2.2-DRAFT.md`
- authority rule: this document does not create game rules. It identifies UI-required read data / history / projections that must be provided by accepted authority or implementation contracts before UI acceptance.
- objective: prevent "backend feature exists but UI cannot retrieve/interpret required information" failures.

## 1. Core rule

For Sprint 2 and later Sprints, implementation planning should follow:

```text
Sprint feature scope
  → UI / observation concept
  → required read data & history
  → data-contract gap check
  → backlog/task binding
  → implementation
  → UI implementation
  → browser acceptance
```

Do not treat domain implementation completion alone as proof that the feature is observable in the product.

If a UI-required value cannot be obtained from a browser-safe canonical projection without reproducing domain logic in the UI, classify it as:

`UPSTREAM_UI_DATA_CONTRACT_REQUIRED`

and bind it to an owning implementation task before Sprint completion.

---

## 2. Sprint 2 UI surfaces

Current Sprint 2 observation UI requires at least:

1. annual tournament schedule
2. tournament detail
3. participant list
4. round-robin standings / match matrix
5. knockout bracket / match results
6. tournament result
7. tournament series history / historical winners
8. annual ranking
9. promotion result
10. person rank history
11. links to person detail and battle detail

---

## 3. Gap matrix

| UI need | Expected upstream owner | Current source coverage | Gap status | Required action |
|---|---|---|---|---|
| annual schedule by year/month/week | S02-002 | annual schedule exists | VERIFY_PROJECTION | confirm browser-safe yearly schedule projection |
| tournament category / target rank | S02-001/002 | domain registry + schedule | VERIFY_PROJECTION | expose display-safe category/rank band |
| tournament current state | S02-005 | TournamentState exists | VERIFY_PROJECTION | expose display-safe state without raw state-machine parsing |
| participant list | S02-003/005 | frozen participants / entry snapshot exist | VERIFY_PROJECTION | expose final participant projection |
| participant person summary | person/shared UI projection | person data exists elsewhere | GAP_RISK | define compact person projection for tournament list |
| round-robin standings | S02-004/007 | standings + placement exist | VERIFY_PROJECTION | expose ordered standings and display-safe record |
| round-robin pair result matrix | S02-004/005/006 | match structure/results exist | GAP_RISK | confirm all pair results can be resolved without reconstructing state |
| knockout bracket | S02-004/005 | bracket + runtime slot state exist | VERIFY_PROJECTION | expose bracket rounds/slots/winners without internal slot/hash leakage |
| individual tournament match result | S02-006/009 | StoredBattleResult exists | VERIFY_PROJECTION | browser-safe tournament match summary + detail ref |
| tournament winner / placement | S02-007 | placement projection exists | COVERED_BUT_VERIFY_API | expose winner/top placements |
| tournament display name | S02-002 / domain registry | not clearly explicit | HIGH_RISK_GAP | define deterministic player-facing tournamentName/displayName |
| tournament historical editions | S02-007/009/011? | individual outcomes/log retention exist | HIGH_RISK_GAP | define searchable historical tournament summary collection |
| historical winner list | S02-007 + history store | winner exists per tournament | HIGH_RISK_GAP | expose series-history read projection |
| canonical edition number ("第N回") | none clearly explicit | not confirmed | GAP_OR_OMIT | add canonical edition ordinal only if product authority adopts it; otherwise show year/date |
| annual ranking current/history | S02-008 | AnnualRankingHistory explicit | COVERED | expose year-selectable ranking projection |
| annual ranking display facts | S02-007/008 | user-approved: position, rank, points, appearances, wins, official W/L | REQUIRED_DECISION_RESOLVED | bind canonical/projected fields in S02-008 |
| promotion result per tournament | S02-007 | RankPromotionPlan | COVERED_BUT_VERIFY_API | expose committed promotion result, not plan-only intent |
| person rank history | S02-007 | user decision: persist formally | REQUIRED_DECISION_RESOLVED | bind durable committed rank-change history to S02-007 |
| promotion source link | S02-007 | related events likely | GAP_RISK | retain tournament/qualification source reference |
| A→S qualification history | S02-007 | SQualificationState | VERIFY_HISTORY | expose committed qualification event/history |
| postponed/cancelled tournament display | S02-002/005 | postponement/merge/cancel exists | VERIFY_PROJECTION | expose user-facing state and resulting schedule reference |
| tournament detail summary | composed read model | underlying data split across tasks | HIGH_RISK_GAP | define browser-safe TournamentObservationProjection |
| UI format selector (round-robin/knockout) | S02-004 | format exists | VERIFY_PROJECTION | expose canonical format discriminator |
| person ↔ tournament navigation | IDs/references | PersonId/TournamentId exist | COVERED_BUT_BIND | ensure read APIs accept stable IDs |
| tournament ↔ battle navigation | S02-006/009 | MatchId/StoredBattleResultRef | COVERED_BUT_VERIFY_API | expose safe detail reference |
| historical retention semantics | S02-009 | battle logs retention defined | PARTIAL | tournament summary/history retention is separate and must be explicit |
| read projection freshness/cache policy | read-model/API owner | not explicit | GAP_RISK | classify projections by mutability and bind invalidation to domain version/event/hash |
| deceased person immutable projection | person/history owner | user decision: immutable after death | REQUIRED_DECISION_RESOLVED | provide reconstructable persistent historical person projection |
| battle summary vs detailed-log cache boundary | S02-009 | user direction established; existing retention must be reconciled | GAP_RISK | identify canonical reconstruction source vs materialized detail cache |

---

## 4. Highest-risk gaps

### G-UI-S2-01 Tournament series identity

`TournamentId` identifies an individual tournament instance.  
The UI concept "○○大会の歴代結果" requires a stable way to identify the same tournament series across world years.

Need one of:

- existing canonical series key, or
- accepted new stable series identity derived from an already-canonical schedule slot identity.

Do not group tournaments by display-name string in the browser.

### G-UI-S2-02 Historical tournament summary store/projection

Battle log retention is not the same as tournament-history retention.

The UI needs a lightweight durable summary such as:

```text
TournamentHistorySummary
- tournamentId
- seriesKey
- worldDate
- format
- category / rank band
- winnerPersonId
- placements or result summary
- participantCount
- status
```

Exact fields and naming are authority-owned. This is only the required information shape.

### G-UI-S2-03 Person rank history

Current rank alone cannot render:

```text
F → E
E → D
D → C
```

Need a durable committed history source.

Preferred source:
- canonical promotion/qualification events or history projection.

Do not reconstruct historical rank transitions from current state plus old rankings.

### G-UI-S2-04 Tournament observation projection

Tournament UI currently needs data owned by several tasks:
S02-002, 003, 004, 005, 006, 007, 009.

The browser should not join raw internal state-machine objects and receipts itself.

Define a read-only projection boundary for observation UI, e.g. conceptually:

```text
TournamentObservationProjection
- identity
- schedule/date
- category/rank band
- format
- state
- participants
- standings or bracket summary
- result summary
- safe navigation references
```

Exact type/name must be decided by implementation authority.

### G-UI-S2-05 Browser-safe participant summary

Tournament participant table needs person name, rank, age, and displayable abilities/aptitudes without fetching/debug-parsing unrelated internal state for every row.

Reuse the accepted person presentation projection if one already exists.
Do not create a second competing person-stat contract.

---


### G-UI-S2-06 Tournament display name

All tournaments should have a deterministic player-facing display name.

Rules:

- `TournamentId` remains the per-edition identity.
- ordinary / limited / A-S open tournaments may reuse fixed recurring names across years.
- same display name does not automatically create a canonical tournament series.
- official promotion tournaments may use a stable series identity when historical grouping is required.
- the browser must not generate tournament names randomly.
- same-seed / same schedule must preserve the same assigned display name.

This gap should be bound as early as possible to schedule/domain ownership, preferably S02-002 or the nearest accepted owner.

## 5. Existing Sprint 2 tasks that can absorb gaps

### S02-005
Before/while TournamentState progresses:
- safe tournament state discriminator
- frozen participant refs
- format/result navigation skeleton

### S02-006
- tournament match summary
- match → battle result reference

### S02-007
Best location to ensure:
- final placement
- winner
- committed promotion result
- promotion source reference
- qualification event/history semantics

### S02-008
Best location to ensure:
- year-selectable AnnualRankingHistory projection
- display-safe ranking facts

### S02-009
- match result materialization/ref resolution
- distinguish detailed battle-log retention from lightweight tournament-history retention

### S02-011
If fixed output/event projection is the product-readable source:
- tournament result events
- promotion events
- stable references required by future read models

### S02-013
Sprint final docs/acceptance must not close Sprint 2 until:
- UI-required data gaps are either implemented, or
- explicitly deferred outside Sprint 2 with user approval,
- and no UI requires browser-side domain reconstruction.

---

## 6. Sprint 2 completion guard

Before declaring Sprint 2 product-complete, verify each current UI surface can be populated from accepted data:

```text
[ ] annual schedule
[ ] tournament detail
[ ] participant list
[ ] round-robin standings
[ ] round-robin match results
[ ] knockout bracket
[ ] tournament winner / placements
[ ] historical tournament editions
[ ] historical winners
[ ] annual ranking history
[ ] promotion result
[ ] person rank history
[ ] match detail navigation
[ ] person detail navigation
```

For each item record one of:

- `DIRECT_CANONICAL_SOURCE`
- `ACCEPTED_READ_PROJECTION`
- `EXPLICITLY_DEFERRED_BY_USER`

Anything else blocks UI-ready completion.

---

## 7. Future Sprint planning rule

For every future Sprint that adds product-visible game systems:

### Before implementation starts

1. define the user-observable screens / flows at rough wireframe level;
2. identify all data visible on those screens;
3. map each datum to canonical source / read projection;
4. identify history/search/aggregation requirements;
5. add missing contracts to backlog before downstream implementation;
6. bind the UI reference artifacts into implementation handoff.

### Not sufficient

The following alone are not sufficient to start product-visible feature implementation:

- domain model exists
- algorithm is specified
- tests can verify backend output
- fixed output contains raw information somewhere

The feature must also have a credible observation/read path.

---

## 8. Immediate recommendation

Do not roll back completed Sprint 2 tasks solely because this gap map was created.

Instead:

1. preserve accepted production work;
2. bind this gap map to current Sprint 2 PM planning;
3. review S02-005 onward for affected contracts;
4. patch gaps at the earliest owning task;
5. perform a final UI-data-contract preflight before S02-013 completion.

This minimizes rework while preventing a second "UI designed after backend completion" failure.



## 9. Read projection cache / freshness policy

### 9.1 Principle

Canonical game/history data and UI read-cache are separate concerns.

- canonical data keeps the minimum authoritative facts needed to reconstruct product truth.
- UI read projections may be generated on first access and cached when their source facts are stable.
- cache must never become the only source of truth for tournament results, rankings, promotions, or histories.
- cache invalidation policy depends on whether the underlying page data can still change.

### 9.2 Suggested freshness classes

Each browser-facing read projection should be classifiable into one of the following conceptual policies.

```text
immutable
world-year-finalized
until-tournament-update
live
```

Exact enum/type names are implementation-owned.

#### immutable

Use for facts that are final and no longer change after completion.

Examples:
- completed tournament result
- finalized placements
- completed tournament winner
- finalized historical promotion result

Policy:
- first access may materialize projection
- later accesses may reuse persistent cache
- invalidate only on authority/schema/version migration or integrity repair

#### world-year-finalized

Use for projections that may change during the current year but become immutable after year finalization.

Examples:
- annual ranking history
- yearly statistics summary

Policy:
- current year remains updateable
- closed past years may be persistently cached

#### until-tournament-update

Use for tournament pages whose content changes while entry/bracket/results progress.

Examples:
- pre-start participant view
- in-progress standings
- in-progress bracket
- tournament detail during active state

Policy:
- cache is valid only until a tournament state/result update
- tournament event/receipt/version/hash change invalidates projection

#### live

Use for current mutable world/person state where stale data is undesirable.

Examples:
- current person state
- current world week
- live current-year summaries when no stable incremental cache exists

Policy:
- fetch/recompute from current source or use very short-lived cache
- do not treat as permanent history cache

### 9.3 Page-level examples

| Page / view | Suggested freshness |
|---|---|
| completed tournament result | immutable |
| historical winners list | append/update when a new qualifying tournament completes; older entries immutable |
| past annual ranking | world-year-finalized → immutable after closure |
| current annual ranking | until relevant competitive update / live |
| pre-freeze participant list | until-tournament-update |
| frozen participant list | effectively immutable for that tournament |
| in-progress round-robin standings | until-tournament-update |
| completed round-robin standings | immutable |
| in-progress knockout bracket | until-tournament-update |
| completed knockout bracket | immutable |
| current person detail | live |
| person rank history entries | append-only / historical entries immutable |

### 9.4 Cache key / invalidation source

Avoid time-based invalidation when a stable domain version/hash/event sequence is available.

Prefer cache keys/invalidation based on source identity such as conceptually:

```text
simulationId
tournamentId
worldYear
sourceVersion / resultHash / stateVersion / eventSequence
projectionSchemaVersion
```

Exact fields must come from accepted contracts.

For completed immutable results, a stable result hash/version is preferable to arbitrary TTL.

### 9.5 Historical lists

Historical overview pages do not need to eagerly store every fully-rendered page.

Recommended pattern:

```text
canonical lightweight facts
    ↓ first access / update event
materialized read projection
    ↓
persistent cache
```

When a new tournament completes:
- append/rebuild only the affected historical index/projection;
- do not recompute old immutable tournament result pages unnecessarily.

### 9.6 Completion guard

Sprint 2 product-readiness should verify that every observation projection has:

1. authoritative source;
2. freshness class;
3. cache invalidation source;
4. reconstruction path when cache is absent;
5. no browser-side domain recomputation.

A cache hit/miss must not change the logical result shown to the user.



## 10. User decisions — rank history / annual ranking

### 10.1 Person rank history

Decision: **persist rank history as formal historical data**.

Required historical facts should include, when available from accepted authority:

- personId
- world date
- previous rank
- new rank
- source tournament / qualification reference
- committed promotion / qualification result reference

Historical rank transitions are append-only after commit and should not be reconstructed from current rank.

UI expectation:

```text
世界 8年   F → E   ○○昇格大会
世界10年   E → D   ○○昇格大会
世界13年   D → C   ○○昇格大会
```

Past committed entries are immutable and suitable for long-term cached read projection.

### 10.2 Annual ranking display/history

Decision: annual ranking should retain/display, where canonical calculation supports them:

- official annual rank position
- person
- competitive rank
- annual points
- tournament appearances
- tournament wins
- official match wins / losses

These are the preferred product-facing annual record facts.

The annual ranking projection must not invent counts from UI-side log scans when a canonical annual record can own them.

Past finalized years are immutable historical data and may use persistent cached read projections.
Current year remains updateable until year finalization.

### 10.3 Implementation binding

- S02-007 should ensure committed promotion / qualification changes produce durable rank-history source facts.
- S02-008 should ensure annual ranking history includes or can safely project the approved display facts above.
- S02-013 must not close product-visible Sprint 2 with either item unresolved unless explicitly user-deferred.



## 11. Immutable person history / battle-log materialization

### 11.1 Deceased person read model

Decision: once a person is definitively deceased and no mutable game state can change, the product-facing person projection may be treated as immutable historical data.

Expected future references include:

- family tree / lineage
- technique founder / originator
- school / style founder and historical affiliation
- master-disciple history
- historical tournament participation/results
- historical ranking references
- general past-person lookup

Policy:

```text
living person   → live / mutable projection
deceased person → immutable historical projection
```

The immutable person projection may be materialized and persistently cached for long-term reuse.

Important constraints:

- cache is not the sole canonical truth unless accepted authority explicitly promotes that projection;
- a missing cache must be reconstructable from canonical historical facts;
- death-finalized historical fields must not be recomputed from unrelated current-world state;
- historical references should use stable PersonId-based links.

This is intended to reduce repeated reconstruction cost for old persons in long-running worlds.

### 11.2 Battle history layers

Decision: battle history should distinguish lightweight durable result facts from heavy rendered/detail logs.

#### Lightweight battle summary

Long-term historical summary should remain available and generally not be deleted merely because detailed logs age out.

Conceptually useful facts include, where canonical authority supports them:

- MatchId / stable battle reference
- participants
- winner / outcome
- decision type
- world date
- tournament / event source reference
- important result summary
- BattleResult hash/version reference

Exact fields remain authority-owned.

#### Detailed battle log / rendered replay

Heavy turn-by-turn presentation may be treated as a materialized cache/read artifact when the accepted stored battle facts are sufficient to reconstruct the exact logical view.

Preferred concept:

```text
authoritative battle result / replay source
        ↓ first access
materialized detailed battle view
        ↓
persistent cache
```

If cached detail is absent:
- reconstruct from accepted source data;
- logical output must match the original result;
- do not silently fabricate detail that cannot be reproduced.

### 11.3 Existing retention compatibility

Current Sprint 2 draft has explicit detailed-log retention semantics.
This decision does **not** automatically override accepted retention rules.

S02-009 must determine:

1. which battle artifacts are canonical minimum reconstruction sources;
2. which artifacts are heavy materialized/read caches;
3. whether an exact detailed view can be reconstructed after cache deletion;
4. how existing normal/important battle retention rules map to this distinction.

If exact detail cannot be deterministically reconstructed from retained canonical facts, that detail cannot be classified as disposable cache.

### 11.4 Shared history principle

The intended product-wide history principle is:

> finalized historical facts are retained; expensive presentation forms may be materialized and cached.

This principle should later be reused for:

- tournament history
- past annual rankings
- deceased persons
- lineage/family-tree views
- technique/style history
- master-disciple history
- battle detail/replay presentation

### 11.5 Completion guard

Before treating a historical projection as cache-only, verify:

```text
[ ] canonical reconstruction source exists
[ ] stable identity/reference exists
[ ] logical reconstruction is deterministic
[ ] cache miss does not lose product history
[ ] cache eviction does not break historical navigation
```
