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


## GPT-only runnable acceptance specification — 2026-09-30

This section resolves ambiguities in the existing capable-lane handoff without changing product semantics or reopening the consumed parent result.

### Measurement population and percentile contract

The browser measurement is four independent recorded populations, each with **at least 20 successful samples**:

| side | mode | minimum successful samples |
| --- | --- | ---: |
| before | cold | 20 |
| before | warm | 20 |
| after | cold | 20 |
| after | warm | 20 |

Therefore the acceptance floor is 80 successful recorded opens. A failed open remains in raw evidence with its failure/status and is **not** counted toward the 20 successful samples; collect a replacement sample. Do not silently delete failed samples.

Use one fixed seed/week/person and require R>0 for the measured subject. Before and after must use the same representative snapshot/subject. Record the exact baseline ref/patch identity and current product SHA; "before" must not be reconstructed from different data.

For every numeric distribution sort ascending and use nearest-rank indices:
- p50 = sorted[ceil(0.50 * n) - 1]
- p95 = sorted[ceil(0.95 * n) - 1]

Apply that rule independently to wallMs, total request count, and responseBytesTotal for each of the four populations.

### Cold / warm semantics

- **cold**: each recorded open gets a newly-created browser context/page with no retained browser cache/cookies from the prior sample. The production server remains the same fixed build/data unless restarting it is necessary to reproduce the baseline; server restart is not itself a substitute for browser coldness.
- **warm**: create one browser context/session, perform one unrecorded warm-up open, then collect >=20 recorded opens of the identical subject in that same context/session.
- Record cache-related response metadata when available. Do not mix cold and warm samples in one percentile distribution.

### Response-byte contract

The primary payload metric is the byte length of the actual response body observed by the browser harness for each relevant Person Detail/identity response. Sum those body byte lengths into responseBytesTotal per open. Keep transfer/compressed size, if available from browser/CDP, as a separate optional field; do not substitute Content-Length or compressed transfer size for response-body bytes.

Each response record must contain at least:
`{url, method, status, kind, bodyBytes}`, where `kind` is one of `selected-full-detail | related-full-detail | identity-batch | other`.

### Request classification and after-side assertions

Classify by route shape, not by response timing/order.

For the current after-side measured R>0 subject, every successful recorded open must satisfy:
- selected full-detail requests = exactly 1;
- identity-batch requests = exactly 1 on the normal successful identity path;
- related full-detail requests = exactly 0.

The broader regression invariant remains `identity-batch <= 1` because transport/failure/fallback cases may legitimately complete without a successful identity response. The normal R>0 performance population should use the successful identity path, so `=1` is the stronger measurement assertion there.

For R=0 targeted regression: selected full-detail=1, identity-batch=0, related-full-detail=0.

### Raw sample schema

```json
{
  "side": "before|after",
  "mode": "cold|warm",
  "iteration": 1,
  "success": true,
  "personId": "person_...",
  "relatedCount": 2,
  "wallMs": 0,
  "requestCount": 0,
  "responseBytesTotal": 0,
  "selectedFullDetailCount": 0,
  "identityBatchCount": 0,
  "relatedFullDetailCount": 0,
  "responses": [
    {"url":"...","method":"GET","status":200,"kind":"selected-full-detail","bodyBytes":0}
  ],
  "trace": "..."
}
```

### Exact targeted regression matrix from current source review

Current master source review shows `person-detail-request-count.test.ts` covers only helper-level R=0, duplicate-id one-batch behavior, and missing-identity absence. It does **not** prove the page-level full-detail counts and does not cover all A2-required failure/navigation cases.

Add/retain these exact cases inside Role1's Person Detail test boundary:

| case | setup | required assertions |
| --- | --- | --- |
| page R=0 | selected detail has no masters/disciples | one selected full-detail; zero identity batch; zero related full-detail |
| page R>0 duplicate | master/disciple arrays contain duplicate related id | one selected full-detail; one identity batch containing deduplicated ids; zero related full-detail; names render |
| identity transport failure | identity fetch rejects/throws | identity fetch attempt exactly once; no retry amplification; existing personId fallback remains visible |
| identity revision mismatch | detail uiRevision=7, identity envelope uiRevision=8 | returned names are not committed; personId fallback remains |
| empty displayName | identity item has empty displayName | empty value is not committed; personId fallback remains |
| stale A->B completion | A identity promise remains pending, props change to B, then A resolves | A names never commit into B; B detail/names remain authoritative |
| missing identity row | batch omits one requested id | known name renders; omitted id uses personId fallback |

Important source-level defect in the present test boundary: `person-detail-request-count.test.ts` exercises `loadRelatedPersonNames`, while `PersonDetailPage.tsx` directly calls `loadPersonIdentities`. Therefore helper tests alone cannot establish the actual page request-count/navigation contract. The new page-level tests must render `PersonDetailPage` with a fetch spy/deferred promises and assert route counts plus visible fallback/name behavior.

### Completion gate

Role1 browser/network acceptance is complete only when raw artifacts prove all four >=20 populations, computed p50/p95 under the percentile rule above, body-byte distributions, and the normal after-side R>0 exact request contract, and targeted tests cover the regression matrix. Server-projection timing or helper-only unit tests cannot substitute for these gates.
