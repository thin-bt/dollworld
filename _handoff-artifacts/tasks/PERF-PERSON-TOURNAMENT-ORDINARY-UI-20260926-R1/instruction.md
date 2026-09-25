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
