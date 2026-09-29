# Role3 scoped evidence — PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1

assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
scope: tournament server/projection
state: CAPABLE_LANE_HANDOFF_REQUIRED
shared-gate: FIX_REQUIRED

## Fresh canonical read
Role3 next action is to measure remaining dominant schedule/history/ranking/projection/serialization cost on the same representative dataset, repair only a measured cause, and add regression coverage. Write boundary is tournament server/projection plus this evidence file. Role1 Person Detail and Role2 CompetitionPage client are out of bounds.

Current master already contains the request-scoped persisted round-robin projection reuse and request-scoped display-name resolver/index in `apps/web/src/server/ui009/map-competition-view.ts`. Do not redo those repairs.

A remaining source candidate exists in `competition-schedule-overview.ts`: the request builds `integrationSlots` once, but each schedule entry still performs `integrationSlots.find(...)`; `lifecycleLabelForScheduleEntry` separately rebuilds `listUi009PlayableScheduleSlots(entry.worldYear)`, scans it with `.find`, and scans `tournamentHistorySummaries` with `.some`. This is a measurement target only, not an authorized optimization until counters/timing prove material cost.

## Exact capable-lane execution handoff
This automation environment has GitHub contents/actions access but no repository checkout/process/browser runner, so it cannot execute npm, production server, representative-data route loops, or Playwright. Run the following on a clean/current `master` checkout without broad stash/clean:

1. Record `git rev-parse HEAD`; require Node >=24.18 <27 and npm >=11.16 <12. Run `npm ci`, then `npm run build -w @shared-world/web`.
2. Add test-only/request-scoped counters around the current UI009 GET path, not global production logging. Capture at minimum:
   - route wall ns;
   - ranking-facts wall ns;
   - progress-projection wall ns;
   - schedule-overview wall ns;
   - envelope serialization wall ns and response bytes;
   - `annualScheduleBuilds`, `playableSlotListBuilds`, `slotComparisons`, `historySummaryPredicateVisits`;
   - existing `roundRobinProjectionCalls`;
   - display-name resolver/index build count and resolution count.
   Reset counters per request.
3. Use one fixed representative persisted snapshot/session for all samples. Record its world year/date, person count, stored battle record count N, round-robin participant count Q, pair count M, schedule-entry count S, and tournament-history-summary count H. Never regenerate different worlds between before/after.
4. Start production with `npm run start -w @shared-world/web`. Exercise the same UI009 competition GET used by the browser for schedule/detail/participants/ranking. Capture one cold sample and >=20 warm samples per operation. Record p50/p95 route time, stage times and response bytes. Also run the real Chrome route with `npm run e2e:chrome -- --grep <ordinary tournament/UI009 acceptance test>` or the current equivalent test name after listing Playwright tests.
5. Attribute cost before editing. Only if schedule counters/timing are a dominant remaining server cost, repair request-scoped duplication:
   - build playable slots once per relevant viewed year and reuse them for both entry integration matching and lifecycle labeling;
   - construct an entry-equivalent indexed lookup only if it preserves exact `entryMatchesSlot` semantics;
   - construct a completion-history membership set keyed by exact `worldYear+tournamentId` only if it preserves the current predicate exactly.
   Do not change schedule ordering, lifecycle labels, participant data, persistence/ranking semantics, failure visibility, deterministic state/RNG, or response schema.
6. Add regression/counter tests proving one playable-slot-list build for the relevant schedule request (or the exact lower count justified by current behavior), bounded/indexed matching instead of per-entry rescans, semantic deep equality of the full competition projection before/after except diagnostics, and unchanged persisted/ranking state.
7. Rebuild/restart production and repeat the identical fixed snapshot with cold >=1 and warm >=20. Report before/after p50/p95, bytes, all counters, product SHA and test SHA. Do not claim PASS from counter reduction alone.
8. Publish the measured output back to this `role3.md`. PM alone integrates shared `result.md`. Keep shared gate FIX_REQUIRED until ordinary weekly -> schedule -> participants -> tournament -> battle -> persistence -> ranking -> UI acceptance is proven.

## Current evidence boundary
No elapsed-time or browser measurement was executed in this environment, therefore no new performance cause or PASS is claimed. This handoff is intentionally executable and should not be replaced by another static source/status pass if assignment generation remains unchanged.
