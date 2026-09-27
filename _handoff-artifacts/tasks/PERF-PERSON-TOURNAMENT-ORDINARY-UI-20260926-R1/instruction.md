# Performance repair: Person Detail + Tournament ordinary UI

state: READY
priority: P0 USER-REPORTED PLAYABILITY DEFECT
sprint: Sprint2/Sprint3 cross-cutting
control-authority: GitHub thin-bt/dollworld master
source: User directly reports both Person Detail inspection and tournament are extremely slow; no measured root cause yet.

## Execution
Do not claim an unmeasured cause or a performance fix. First profile CURRENT MASTER with representative ordinary production UI data and a realistic population/history, including cold and warm Person Detail open, tournament schedule/detail/participants, weekly progression through due tournament and battle, ranking and return navigation. Record baseline p50/p95 wall time, server route time, DB/read/serialization, transferred payload, JS main-thread/render time, memory and world size; retain reproducible script and browser traces. Differentiate browser rendering from API, simulation, persistence and N+1 or repeated full-world scans. Inspect shared route/projection/state serialization and identify exact call paths and counts. No mock-only/test-only benchmark.

Fix the dominant measured causes, e.g. scoped indexed lookup, precomputed incremental projections, stable memoization/invalidation, bounded/paginated history, avoid redundant whole-world serialization, redundant fetch/render or repeated tournament/ranking computation, as evidence warrants. Preserve exact game semantics, complete person data access, schedule, results, persistence, ranking and lineage. Never mask cost by dropping data or silently reducing simulation scope. Keep simulation deterministic and preserve canonical spec.

## Acceptance
Repeat same baseline after changes on current product SHA and representative data. Show before/after p50/p95 for each named ordinary UI operation and no new long task or freeze. Verify web production build/start, ordinary browser end-to-end weekly progression -> schedule -> participants -> tournament -> battle -> result persistence -> ranking update -> UI reflection; Person Detail and Ranking/battle presentation. Root regression gate. Publish implementation SHA, trace locations, measurements, and canonical result. If no improvement or UI remains materially sluggish, FIX_REQUIRED not PASS. Do not close Sprint2/3 based only on focused tests or historical F-02 evidence.

## Coordination
A and B2 are currently occupied by S03-006 and S03-010; do not overwrite their PREPARED inboxes while Active/heartbeat show execution. Role1 directly profiles/gates; Role2 handles UI render/data flow; Role3 handles simulation/projection. PM consumes their outputs and dispatches a unique nonconflicting Cursor implementation task when a lane is safely free. GitHub first; no Drive dependency. No status-only response.


## Role3 server/simulation/projection source evidence — 2026-09-26 18:36 JST

Evidence baseline: fresh-read current master `439064f62efa00fbe5c7954df7bf6753ce925ac8`. These are reproducible source work/call counts, not elapsed-time root-cause claims. Measure the counters below on the same representative snapshot before selecting the dominant fix.

### Person Detail confirmed work
- Client `apps/web/src/client/person-detail/PersonDetailPage.tsx`: after the primary `loadPersonDetail(personId)`, it deduplicates `formalMasterPersonIds + formalDisciplePersonIds` and calls the same full `loadPersonDetail(relatedId)` once for every related id only to read `displayName`. For `R = unique(master ∪ disciple)`, an ordinary successful open therefore issues exactly `1 + R` full UI-005 detail requests.
- Server `apps/web/src/server/ui005/build-person-detail.ts`, per full request:
  - `persons.find(...)` scans until target and `new Set(persons.map(...))` traverses all `P` persons.
  - `projectRelationships` traverses all `L` relationships; `assertRelationshipIntegrity` separately rebuilds `childToParents` by traversing all `L` relationships again.
  - `weeklyTrainingSidecars.entries.find` is linear in sidecar entries until target.
  - `toTrainingEvents(stream)` maps all `E` events before `aggregateTrainingHistory` applies person/source/48-week filtering.
  - `toStatGrowthEvents(stream)` separately traverses all `E` events; `aggregateStatHistory` then validates the selected person's full-run stat-growth chain.
- Semantic guard: do not truncate stat-growth history to 48 weeks. `stat-history-aggregate.ts` validates adjacent before/after continuity, final-after == current, and initial + all deltas == current across the full run. Training history may expose only the last 48 weeks, but any optimization must preserve all current validation/failure behavior.

### Person Detail implementation candidates to measure
1. Highest-confidence request-amplification candidate: replace related-name `R` full-detail calls with a batch/minimal display-name projection from the same fixed read snapshot/revision. It must return exactly the same names/failure visibility and must not weaken UI-005 detail validation for actual detail requests.
2. If server scan counters are dominant, build snapshot/revision-bound indexes: `personById`; relationship adjacency plus enough duplicate/reference/cycle integrity metadata to preserve existing failure semantics; sidecar-by-person; person-keyed event references. A person-event index for stat history must retain the complete ordered stat-growth chain, not only a display window.
3. Cache/index invalidation must be tied to the exact read snapshot/session revision or immutable runtime-state identity. Invalidate/rebuild on session replacement/reset/load and every world/person/relationship/event/sidecar mutation visible to UI-005. Never permit stale cross-revision reads. Preserve canonical ordering (`compareUnicodeCodePoints` where currently used), response schema, RNG/state, and deterministic replay.

### Tournament confirmed work
- `apps/web/src/server/ui009/competition-round-robin-progress.ts`: each `projectRoundRobinProgress` first scans all `N` stored battle records to construct the tournament pair map, maps all `M` round-robin pairs for history, then for each of `Q` ordered participants scans all `M` pairs to build the matrix. Measure `storedRecordVisits=N`, `historyPairVisits=M`, and `matrixPairVisits=Q*M` per projection.
- `apps/web/src/server/ui009/competition-schedule-overview.ts`: one overview builds the annual schedule. For current-year view it also builds `integrationSlots` once, but each of `S` schedule entries does a linear `integrationSlots.find`. Then `lifecycleLabelForScheduleEntry` independently calls `listUi009PlayableScheduleSlots(entry.worldYear).find(...)` again for that entry and scans `tournamentHistorySummaries.some(...)`. Measure annual-schedule builds, playable-slot-list builds, slot comparisons, and history-summary predicate visits. Do not label this dominant until elapsed attribution confirms it.
- `apps/web/src/server/ui009/map-competition-view.ts`: persisted-state mapping computes `roundRobinProgressFromState(state)` for the main view; `activeParticipantIds(state)` also calls `roundRobinProgressFromState(state)`. Confirm the actual request-path call count with instrumentation before claiming duplicate projection as a root cause. Display-name projection repeatedly resolves names for ranking/participants/history/matrix/last-match/champion; measure lookup count and underlying person-row visits.
- `handleGetCompetition` also executes `rankingFactsForStore(store)`, `mapCompetitionProgressView`, envelope construction and `serializeEnvelope`; separately time ranking-fact build, progress projection, wireframe/history projection, envelope serialization, response bytes, and client transfer/render.

### Tournament implementation candidates to measure
1. Request-scoped reuse of a single round-robin factual projection wherever the same persisted state is mapped more than once.
2. Build matrix cells from pair adjacency while processing `roundRobinPairs` once rather than rescanning all pairs for every participant, preserving participant order, pairIndex order, outcomes and history exactly.
3. Within one schedule-overview request, reuse the playable-slot list; build a canonical entry-key -> integration-slot lookup and a `(worldYear,tournamentId)` completion-history set. Preserve `entryMatchesSlot` equivalence, schedule ordering and lifecycle labels exactly.
4. If display-name scans dominate, use a request/snapshot-bound `personId -> displayName` map rather than repeated linear person lookup. No name/data hiding.
5. Any cross-request cache must be revision/state-identity bound with explicit invalidation on competition-store/world-session mutation/replacement. Prefer request-scoped reuse when it eliminates duplicate computation without introducing invalidation risk.

### Required reproducible measurement gate before root-cause/fix claim
Use one fixed representative current-master snapshot and record:
- Person: `P` persons, `L` relationships, `E` events, sidecar count, `R` related master/disciple ids; actual UI-005 request count; per-stage visited rows.
- Tournament: `N` stored battle records, `Q` participants, `M` round-robin pairs, `S` schedule entries, history-summary count; round-robin projection call count; annual-schedule/playable-slot build counts; display-name lookup/person-row visits.
- For each named ordinary operation: route wall time plus stage timings (projection/ranking/history/serialization), response bytes; cold >= 1 and warm >= 20 runs with p50/p95. Browser/network/render measurements remain required by the parent task.
- Re-run the identical snapshot/counters after the measured dominant repair. PASS requires semantic output equality except timing/diagnostic fields, deterministic state/RNG equality, production build/start, and the parent ordinary-browser regression. A lower payload is not a valid optimization if achieved by omitting previously available data.


## Role2 UI/client source evidence and implementation-ready repair — 2026-09-27 00:56 JST

Fresh-read master confirms the client-side request amplification is still present and gives a safe first repair independent of server-side indexing work.

### Person Detail client evidence
- `apps/web/src/client/person-detail/PersonDetailPage.tsx` performs the selected person's full `loadPersonDetail(personId)`, then deduplicates `formalMasterPersonIds + formalDisciplePersonIds` and executes `Promise.all(relatedPersonIds.map(loadPersonDetail))` only to consume each related response's `displayName`.
- Therefore, for `R` unique related ids, a successful ordinary Person Detail open issues exactly `1 + R` full UI-005 requests. The parent/server evidence above establishes that each of those full-detail requests repeats expensive person/relationship/event projection work; the related requests do not need those payload fields in this page.
- Do not replace this with repeated UI-004 list-page requests: the requirement is a snapshot/revision-bound minimal identity projection, not another heavyweight projection.

### Person Detail required repair
1. Keep exactly one full UI-005 request for the selected person and preserve its complete detail/stat/training/history semantics and existing failure behavior.
2. Add/use one minimal batch identity read for the deduplicated related ids, returning only the identity needed by this surface (at minimum `personId + displayName`) and binding the result to the same session/snapshot revision so names cannot be stale relative to the selected detail. Preserve deterministic/canonical ordering and missing-person/failure visibility.
3. Request-count gate: `R=0 => 1 full detail + 0 identity batch`; `R>0 => 1 full detail + <=1 identity batch`; related-name full UI-005 calls must be `0`.
4. Add a client regression with multiple master/disciple ids that asserts the exact request pattern and rendered names, including duplicate related ids and a failed/missing identity case consistent with current visible fallback semantics.

### Tournament client evidence
- `apps/web/src/client/competition/CompetitionPage.tsx` defines `refresh` with dependencies `[props.fetchImpl, rankingViewYear, scheduleViewYear]`. Every refresh first awaits `loadUiSession()`, then awaits `loadCompetitionState()` with the selected schedule/ranking years.
- Consequently changing only schedule year or ranking year recreates `refresh` and causes a redundant session GET before the required competition projection GET. This is independent of whether server projection work is later optimized.
- The overview/participants tab switch, selecting an already-loaded schedule entry, and returning to the schedule currently mutate local React state only; preserve their zero-network behavior.
- Participant comparison already renders from `entry.participantLinks`; do not introduce per-participant detail fetches. Ranking, round-robin matrix/history, bracket, promotion/rank history and series-history data must remain available exactly as today.

### Tournament required repair
1. Separate session bootstrap/token acquisition from year-scoped competition projection refresh. Initial mount remains `session GET = 1, competition GET = 1`.
2. Schedule-year-only and ranking-year-only changes must become `session GET = 0, competition GET = 1`; preserve current CSRF token/revision semantics for step mutation. If a mutation/session-replacement path requires a new session, refresh it only on that actual invalidation path.
3. Preserve `overview <-> participants`, loaded selection, and back-to-schedule at `0` network requests.
4. Add fetch-spy regression tests for initial mount, each year change, tab round-trip, loaded selection/back, and one step mutation; assert no new per-participant/person-detail requests.

### Browser / payload measurement gate
On one fixed representative current-master snapshot, capture before and after for Person Detail with `R>1` and Tournament initial load/detail/participants/ranking-year/schedule-year transitions: request URL/count, per-response and total transferred bytes, route wall time, browser navigation/action wall time, and main-thread/render trace. Use cold >=1 and warm >=20 samples for p50/p95 where execution permits. The expected request-count reductions above are acceptance facts, but elapsed-time root-cause claims still require the measured attribution required by the parent task. Compare semantic response/render output before/after; no field/data removal is an optimization.


## Role3 delta — 2026-09-27 10:39 JST (fresh master 24c1ad4e3f18964296896ceb35e578b15d7174b3)

Fresh source adds a concrete tournament person-lookup amplification candidate. This is a reproducible source-work count, not yet an elapsed-time root-cause claim.

- `displayNameForPersonIdInSession(session, personId)` in `competition-engine.ts` performs `worldState.persons.find(...)` for every call. Let `P` be world persons. Instrument both logical lookup calls and actual person rows visited; do not infer `P` visits per lookup because `.find` short-circuits.
- One successful `roundRobinProgressFromState` with `Q` participants and `M` pairs invokes display-name resolution exactly `Q + 4M` times: history endpoints `2M`, matrix row names `Q`, matrix opponent cells `2M`. On the persisted ordinary view path, source still contains a second full `roundRobinProgressFromState` through `scheduleOverviewForSession -> activeParticipantIds`; confirm the actual route call count before attributing elapsed time.
- `enrichParticipantLinks` in `competition-wireframe-observation.ts` separately performs one linear `worldState.persons.find` per participant link before projecting rank/age/stats/aptitudes. For `A` active participant links this is exactly `A` additional logical person lookups; measure rows visited. This is independent of the round-robin name lookups above.
- `personRankHistoryEntriesFromState` resolves a display name once for every emitted rank-history entry, and therefore adds one more linear person lookup per emitted row. Measure `rankHistoryRowsEmitted`, display-name calls, and person rows visited so history growth is visible instead of being folded into route wall time.
- `buildAnnualRankingYearOptions` currently checks at most three adjacent years and does a linear `historyStore.entries.find` for each year. Record ranking-history-entry visits, but do not prioritize this bounded 3-year lookup unless timing proves material.

Implementation order after measurement: (1) eliminate the duplicate persisted round-robin projection by passing the already-computed projection/participant ids into schedule mapping; (2) construct one request/snapshot-bound `personId -> Person/displayName` index and reuse it across round-robin name enrichment, participant-link enrichment, ranking rows, last-match/champion labels and rank-history enrichment; (3) only consider cross-request caching if request-scoped reuse remains insufficient. The request-scoped index must be built from the exact isolated/world session used by the projection and must never mix worldSession with persisted isolatedSession. No cross-revision stale names/person data.

Acceptance counters for this delta: capture `personIndexBuilds`, `personIndexRowsVisited`, `linearPersonLookupCalls`, `linearPersonRowsVisited`, `roundRobinNameResolutions`, `participantLinkPersonLookups`, and `rankHistoryNameResolutions` on the same fixed snapshot before/after. A request-scoped repair should reduce repeated linear scans without changing any emitted participant/ranking/history names, ordering, stats/aptitudes, fallback `不明` behavior, lifecycle state, deterministic state/RNG, or serialized schema. Differential-deep-compare the full competition view before/after except diagnostic/timing fields.


## Role2 fresh client delta — 2026-09-27 18:56 JST

Fresh-read master blobs: `PersonDetailPage.tsx=af3af444227a9ee2ad127f5c6eaf8ad6b44b97bd`, `fetch-ui005.ts=a139db83f8ec9a0aa0c7870695589b31755cf082`, `CompetitionPage.tsx=7a47889d1b9aaaef618f78c15c8087868248d91f`. This is source evidence, not an elapsed-time performance claim.

### Person Detail exact client request evidence
- Selected person performs one `loadPersonDetail(personId)` GET. After success the page deduplicates `formalMasterPersonIds + formalDisciplePersonIds`, then `Promise.all(relatedPersonIds.map(loadPersonDetail))`.
- `fetch-ui005.ts` proves every one of those calls is the accepted full `${API_PREFIX}/people/:personId` PersonDetailView GET; the related path consumes only `data.displayName`.
- Therefore for R unique related ids, a successful open issues exactly `1+R` full UI-005 GETs. This is a deterministic request-amplification fact independent of browser timing.
- Existing cancellation prevents an old effect from committing related names after personId/fetchImpl changes; the replacement batch identity read must preserve that cancellation/latest-page behavior.

### Person Detail implementation gate
Implement one revision/snapshot-bound minimal identity batch for deduplicated related ids. Acceptance: R=0 => full-detail=1, identity-batch=0; R>0 => full-detail=1, identity-batch<=1, related full-detail=0. Selected detail must render with identical complete data and existing error semantics. Batch identity failure/missing rows must preserve current visible fallback semantics and must not turn an already-successful selected detail into page error. Add regression for duplicate ids, partial/missing identity, batch transport failure, and A->B navigation where delayed A identity success/failure cannot mutate B.

### Tournament client implementation gate
Keep session bootstrap/token acquisition independent from year-scoped competition projection refresh. Initial mount: session GET=1, competition GET=1. Schedule-year-only and ranking-year-only changes: session GET=0, competition GET=1. Overview/participants tab switch, selecting an already-loaded schedule entry, and back-to-schedule: network=0. Preserve participant rendering from existing `entry.participantLinks`; add no per-participant Person Detail requests. Preserve step mutation semantics and reuse returned competition projection without compensating GET when current behavior already supplies it.

Add latest-request-wins protection for overlapping year refreshes: if Y1 starts, Y2 starts, Y2 resolves, then delayed Y1 success or failure must not overwrite current view, selected key, uiRevision, csrf/session token, load status, or load error. Cover both stale success and stale failure in fetch-spy regression.

### Measurement still required
On a fixed representative ordinary dataset, capture before/after request URL/count and transferred bytes for Person Detail R>1 and tournament initial/schedule-year/ranking-year/detail/participants transitions, plus route/action wall time and browser main-thread/render trace. Cold >=1 and warm >=20 p50/p95 remain required before claiming elapsed-time improvement. Do not infer timing from the deterministic request-count reduction.
