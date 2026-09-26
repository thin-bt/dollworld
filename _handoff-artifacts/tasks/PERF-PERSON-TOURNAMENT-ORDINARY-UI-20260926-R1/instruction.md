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
