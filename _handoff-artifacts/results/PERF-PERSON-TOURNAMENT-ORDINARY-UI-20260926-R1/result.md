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


## Role1 Person Detail product repair — 2026-09-28 17:48 JST

state: PARTIAL / FIX_REQUIRED
product-sha: 1cf2428ed5d169f7019b38116f6a26201189df6c

Earlier Role1 publication-blocker notes are superseded: product writes succeeded.

Implemented: revision-bound minimal identity batch for formal master/disciple display names; selected Person Detail remains one full UI-005 request; R>0 uses one deduplicated identity batch and zero related full-detail requests; R=0 uses no identity batch. Missing identities remain absent from the name map so existing personId fallback stays visible. Full UI-005 detail projection and validation semantics are unchanged.

Product commits: 57d77fa826c296922a4b540774a5cc8d8cd12ae8, 29e8203f241278b1f2a3bbc924516af7855fefd1, b9acf3fc3399a42e6f6d3f92081bd1ed3efd0e2f, 675325917d50d63c81e6cc0db9398b6a287fcf10, 865396f7a21e74c1fdb2ff1484b409bb8763a8a0, 1cf2428ed5d169f7019b38116f6a26201189df6c.

Regression source: apps/web/src/client/person-detail/person-detail-request-count.test.ts covers R=0 no batch, R>0 duplicate ids with exactly one minimal batch/no related full-detail URL, and missing identity fallback data.

Remaining: this environment has GitHub read/write but no dollworld Node/browser checkout and the product SHA has no attached CI status, so production build/start, executable tests, same-data browser before/after bytes, and cold/warm >=20 p50/p95 are not claimed. Tournament and full ordinary-flow acceptance also remain required.


## Role3 persisted display-name index — 2026-09-28

state: PARTIAL / FIX_REQUIRED
product-sha: 70945f97ec2231f62734b81b16a6441c4903a0a0
format-followup-sha: cdd0c2999d3c97685c18e7cef769d482ac977544
fresh-master-observed: 3945584aa69d786562890f8006e1407cd494c81a

Implemented on canonical master: persisted tournament mapping now builds one request-scoped `personId -> displayName` Map from the exact isolated persisted session and reuses that resolver for current/historical ranking rows, round-robin history/matrix, knockout projection, participant display names, last-match labels, and champion label. Missing/empty names preserve the existing `不明` fallback. This is request-scoped only; no cross-revision cache was introduced. The earlier round-robin projection reuse at `0fdcbc9aeb44c0bf07532ea624a703349e085dd2` remains present on current master.

Evidence: product commit `70945f97ec2231f62734b81b16a6441c4903a0a0`; formatting-only follow-up `cdd0c2999d3c97685c18e7cef769d482ac977544`; production source `apps/web/src/server/ui009/map-competition-view.ts`. The commit replaces repeated isolated-session linear display-name scans on these persisted projection surfaces with the shared request-local indexed resolver without changing emitted ordering/schema or persistence/ranking semantics.

Remaining acceptance is unchanged: this connector execution surface does not expose the repository checkout/Node/browser process needed for production build/start, same representative-data route/browser before/after timing/payload, cold/warm >=20 p50/p95, or full ordinary weekly -> schedule -> participants -> tournament -> battle -> persistence -> ranking -> UI acceptance. Schedule playable-slot/history scan repair is intentionally not applied here because the P0 instruction requires measured cost before that optimization and executable timing evidence is unavailable in this surface. Full PASS remains forbidden.


## Role1 verification advance — 2026-09-28 23:55 JST

state: PARTIAL / FIX_REQUIRED
verified-lineage-sha: 675fb53d147bc23544afb31f59212fbd65060d2f

Fresh canonical master is 20 commits ahead of Person Detail product SHA `1cf2428ed5d169f7019b38116f6a26201189df6c` with that SHA as the merge base. The compare contains no changes to the Person Detail production/request-count files, so the published N+1 repair remains in this current lineage.

New executable evidence now exists on current master: GitHub Actions run 36439421779 completed SUCCESS for `675fb53d147bc23544afb31f59212fbd65060d2f`. The workflow gate requires successful repository typecheck, UI009 targeted tests, production builds for `@shared-world/simulation-core` and `@shared-world/web`, Chrome availability, UI009 Chrome acceptance, and the full configured `npm run e2e:chrome` suite. This supersedes the earlier statement that no build/browser CI existed for a current lineage containing the Person Detail repair.

This does **not** establish the requested Person Detail same-representative-data before/after request bytes or cold/warm >=20 p50/p95, because the current workflow does not collect those measurements. No unmeasured optimization is applied. Full P0 remains FIX_REQUIRED pending those performance measurements and the explicitly required complete tournament/ordinary acceptance proof.
