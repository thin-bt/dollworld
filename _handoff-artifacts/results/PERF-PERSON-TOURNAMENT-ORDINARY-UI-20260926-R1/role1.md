# Role1 evidence — 20260929-P0-01-R1

assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R1
task-key: PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1
scope: Person Detail measurement/acceptance
shared-result-consumed: COMPLETE / PERF_PERSON_TOURNAMENT_ORDINARY_UI_MEASURED_REPAIR_VERIFIED
shared-product-lineage: a90ac02c200fff19b94691e8e0da5d2fd08c47aa

## Acceptance gap against the instruction

The shared result materially verifies server-side Person Detail projection performance and production regressions, but it does not publish the Role1 browser/network acceptance required by the current assignment.

Present in shared result:
- representative seed 4, week 720, eventStreamLen 11582, personCount 15;
- Person Detail server-projection before/after timing;
- warm 30 iterations for the after-side probe;
- production build, targeted vitest, and ordinary Playwright PASS.

Still missing for Role1 acceptance:
- same representative Person Detail browser before/after request URL/count;
- per-response and total transferred/response bytes;
- cold and warm >=20 samples on BOTH before and after sides, with p50/p95;
- explicit browser-network proof for R>0 that selected full-detail=1, identity-batch<=1, related full-detail=0;
- retained browser trace for that Person Detail measurement.

The shared result's before Person Detail timing is not documented as >=20 cold samples, and its measured operation is server projection rather than the required browser/network transaction. Therefore COMPLETE is consumed as PM-integrated evidence but does not erase this Role1-specific gap.

## Exact capable-lane harness / handoff

Use product lineage a90ac02c200fff19b94691e8e0da5d2fd08c47aa and the same deterministic representative seed/week. Select a Person Detail subject with R>0 (prefer R>1) and keep the same subject/data for baseline and current runs.

For EACH side (pre-related-name repair baseline and current):
1. Start the production web build/server from a clean process boundary.
2. Cold: run 20 independent browser contexts/process starts. For each open, record action wall ms, every Person Detail/identity request URL, HTTP status, response-body byte length, full-detail count, identity-batch count, related-full-detail count, and trace path.
3. Warm: in one already-started production server/browser session, run >=20 opens of the identical subject after one unrecorded warm-up; record the same fields.
4. Publish p50/p95 separately for cold and warm and total response bytes per open.
5. Assert current R>0 contract: full-detail=1; identity-batch<=1; related-full-detail=0. Preserve rendered related names and missing/batch-failure fallback semantics.
6. Retain raw JSON samples and Playwright traces under this task result directory. Do not substitute server projection timing for browser/action timing.

Suggested sample schema:
```json
{"side":"before|after","mode":"cold|warm","iteration":1,"personId":"...","relatedCount":2,"wallMs":0,"fullDetailCount":0,"identityBatchCount":0,"relatedFullDetailCount":0,"responseBytesTotal":0,"responses":[],"trace":"..."}
```

Acceptance table to fill from raw samples:
| side | mode | n | wall p50 ms | wall p95 ms | request count p50/p95 | bytes p50/p95 |
| --- | --- | ---: | ---: | ---: | --- | --- |
| before | cold | >=20 | | | | |
| before | warm | >=20 | | | | |
| after | cold | >=20 | | | | |
| after | warm | >=20 | | | | |

## Safe scoped evidence delta

The deterministic request-count gate is distinct from elapsed-time attribution and should be retained as a targeted Person Detail browser regression: R=0 => full-detail=1, identity-batch=0; R>0 => full-detail=1, identity-batch<=1, related-full-detail=0. Cover duplicate related ids, missing identity, identity-batch transport failure, and stale A->B navigation completion. This stays inside Role1's Person Detail test/evidence boundary and does not modify shared result.md or tournament source.

state: CAPABLE_LANE_HANDOFF_READY
next-action: capable browser lane executes the 80 recorded samples above and appends raw artifact paths plus computed p50/p95/bytes to this file.
