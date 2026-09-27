# PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1 result

state: PARTIAL
product-sha: 36aa2769e471e99753ebdb20501fe7234ccb062a
product-branch: role3/p0-tournament-projection-20260928-0440
base-master: 37288e49aa217115982964d693a7e93d40555ce3

## Role3 tournament server/projection partial — 2026-09-28

Implemented request-scoped reuse in `apps/web/src/server/ui009/map-competition-view.ts`: persisted competition mapping passes its already-projected participant ids into schedule overview, eliminating the second `roundRobinProgressFromState()` computation for the same request.

Added a counter regression in `map-competition-view-lifecycle.test.ts`: persisted round-robin mapping with schedule projection must execute exactly one round-robin projection.

Participant ordering/fallback and persistence/ranking semantics are unchanged. Person Detail and CompetitionPage client/session-year-refresh files were not edited.

## Evidence status

Four dollworld loops were enabled at run start. Fresh control plane/P0 instruction/current master were read. Product commit exists on GitHub. Direct master contents mutation was blocked by the execution safety layer, so the product remains on the Role3 branch. No GitHub Actions run is associated with the commit. Production build/start, representative browser before/after payload/timing, cold/warm >=20 p50/p95, and full ordinary weekly -> schedule -> participants -> tournament -> battle -> persistence -> ranking -> UI acceptance remain unproven.

Verdict: PARTIAL / FIX_REQUIRED.
