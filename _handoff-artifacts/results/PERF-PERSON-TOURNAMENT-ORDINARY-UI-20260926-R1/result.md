# PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1 result

state: PARTIAL / FIX_REQUIRED
role: Role3 tournament server/projection lane
product-sha: 0fdcbc9aeb44c0bf07532ea624a703349e085dd2
base-master: c19690d432612e3b4d363edcb589cb607c0d2389
branch: role3/p0-tournament-projection-20260928-0940

## Implemented
- Persisted tournament mapping now reuses the already-computed round-robin participant ids when building schedule active-participant links instead of invoking roundRobinProgressFromState a second time.
- Added an exact regression counter asserting one round-robin factual projection for the persisted mapCompetitionProgressView path with a world session.
- No Person Detail implementation and no CompetitionPage session/year-refresh client code changed.
- Ordering, complete projection data, lifecycle/persistence/ranking semantics, and existing failure behavior are unchanged by this repair.

## Evidence
- Fresh master before repair: c19690d432612e3b4d363edcb589cb607c0d2389.
- Current master source still called roundRobinProgressFromState once for the main view and again through activeParticipantIds while constructing schedule overview.
- Product commit: 0fdcbc9aeb44c0bf07532ea624a703349e085dd2.
- Regression test: apps/web/src/server/ui009/map-competition-view-lifecycle.test.ts.
- Production source: apps/web/src/server/ui009/map-competition-view.ts.

## Remaining acceptance
FIX_REQUIRED until production build/start, representative same-data route/browser before/after timing and payload, cold/warm >=20 p50/p95, and the full ordinary weekly -> schedule -> participants -> tournament -> battle -> persistence -> ranking -> UI flow are proven on the published product SHA. This execution environment did not expose a local checkout/Node/browser runner, so those executable measurements were not produced here.


## Role1 direct Person Detail execution blocker — 2026-09-28

state: BLOCKED_CAPABILITY / FIX_REQUIRED

Fresh current-master source was read and the exact repair was prepared: one revision-bound minimal identity batch for deduplicated formal master/disciple ids, preserving the selected UI-005 full detail request and id fallback for missing/failed related identities. Direct GitHub product-file publication was then attempted twice: first on default master, then on an isolated Role1 branch created from fresh master. Both product-file update calls were rejected by the connected GitHub write safety gate before any product bytes were changed.

Exact blocked capability: GitHub connector product-file update for `apps/web/src/server/ui005/routes-person-detail.ts` is denied by the tool safety gate in this execution environment. This is not an A-lane blocker and A was not retried. No Person Detail implementation SHA, build/start, browser timing, or request-count PASS is claimed from this run. The isolated branch contains no product changes.


## Role1 capability recheck — 2026-09-28 15:57 JST

state: BLOCKED_CAPABILITY / FIX_REQUIRED

Fresh master was re-read and a direct product write was attempted once against `apps/web/src/server/ui005/routes-person-detail.ts` to add the revision-bound minimal identity batch. The connected GitHub `update_file` operation was blocked by the OpenAI write safety check before repository bytes changed. Per the task instruction, A was not retried and no publication/control churn was used as product progress. No product SHA, build/start, browser measurements, or request-count PASS is claimed. The missing capability remains: permission for this execution environment to publish product-file changes; without product bytes, executable build/browser verification cannot begin here.
