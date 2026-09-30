# PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2
state: READY
lane: A
sprint: Sprint2/Sprint3 cross-cutting
mode: BROWSER_MEASUREMENT_ACCEPTANCE
control-authority: GitHub thin-bt/dollworld/master
required-branch: master
publication-head: 6058048cd46853758be10e0fcacfed8ba3e81b5d
source-generation: 20260929-P0-01
source-assignment-id: 20260929-P0-01-R1
source-evidence: _handoff-artifacts/results/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/role1.md
result-path: _handoff-artifacts/results/PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2/result.md

## Purpose
Execute Role1's one-time capable-browser handoff. The shared parent result is consumed evidence only. This task closes only the missing Person Detail browser/network measurement; it does not close Sprint2/3. Build/test PASS alone is not product completion.

## Required execution
Use product lineage a90ac02c200fff19b94691e8e0da5d2fd08c47aa and the same representative seed/week. Choose one Person Detail subject with R>0, preferably R>1, and keep identical subject/data for baseline and current.
For EACH side (pre-related-name-repair baseline and current):
1. Start the production web server from a clean process boundary.
2. Cold: 20 independent browser contexts/process starts. Record action wall ms, every Person Detail/identity request URL, HTTP status, response-body byte length, full-detail count, identity-batch count, related-full-detail count, trace path.
3. Warm: after one unrecorded warm-up, record >=20 identical-subject opens with the same fields.
4. Compute p50/p95 separately for cold/warm wall time, request count and response bytes. At least 80 recorded samples total.
5. Assert current R>0 contract: full-detail=1; identity-batch<=1; related-full-detail=0. Preserve rendered related names and missing/batch-failure fallback semantics.
6. Retain raw JSON samples and Playwright traces under this task result directory. Server projection timing is not a substitute.
7. Verify targeted request-count regression: R=0 => full-detail=1, identity-batch=0; R>0 => full-detail=1, identity-batch<=1, related-full-detail=0; include duplicate related ids, missing identity, batch transport failure and stale A->B navigation completion.

## Write boundary
Allowed: Person Detail browser tests/measurement harness and this task evidence/result. Product/client repair only if this measurement exposes a distinct dominant Person Detail defect and identical before/after evidence proves it.
Forbidden: CompetitionPage client, tournament server/projection, shared parent result.md, Role2/Role3 evidence, B2 S03-010 files/control, broad protocol/control rewrites.

## Safety
No broad stash/clean. Preserve unrelated working-tree changes. Transient scratch only under _handoff-artifacts/control-tmp.

## Output
Publish _handoff-artifacts/results/PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2/result.md with exact tested/product SHA and baseline identity; Chrome/Playwright versions; fixed seed/week/person; raw artifact/trace paths; before/after cold/warm n, p50/p95 wall ms, request-count p50/p95, bytes p50/p95; request-contract/fallback/navigation results; any scoped repair SHA; terminal PERSON_DETAIL_BROWSER_MEASUREMENT_VERIFIED or FIX_REQUIRED.
Append capable-lane outcome/paths to Role1's designated role1.md only; do not modify Role2/Role3 evidence or shared result.md.
