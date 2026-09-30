# Canonical dynamic Role assignments
authority: GitHub thin-bt/dollworld/master
generation: 20260929-P0-01
state: ACTIVE
task-key: PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1
instruction-path: _handoff-artifacts/tasks/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/instruction.md
parent-result: COMPLETE / PERF_PERSON_TOURNAMENT_ORDINARY_UI_MEASURED_REPAIR_VERIFIED
scoped-followups: OPEN

Role numbers are reusable execution lanes, not permanent specialties. Only PM or an authorized fenced surrogate may supersede this file with a monotonic new generation after checking live claims. This records the current P0 scope, not a permanent mapping.

## Role1
assignment-id: 20260929-P0-01-R1
state: DISPATCHED_TO_CURSOR_A
executor-task: PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2
owner: Role1
scope: Person Detail measurement/acceptance; previously published minimal related-name batch repair 1cf2428ed5d169f7019b38116f6a26201189df6c is consumed.
next-action: Complete representative-data browser before/after request count, response bytes and >=20 cold/warm p50/p95; if runner inaccessible, produce an exact runnable measurement harness/CI handoff and route once, then advance a separate safe scoped evidence delta. Do not repeat historical repair or generic CI/P0 status.
write-boundary: Person Detail tests, measurement and own evidence; no other Role's source.
evidence-path: _handoff-artifacts/results/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/role1.md

## Role2
assignment-id: 20260929-P0-01-R2
state: UI_CORRECTION_ACTIVE
owner: Role2
scope: mock/reference-driven UI correction for production screens. The mock is a reference, not the deliverable.
goal: Make the actual production UI conform to the intended layout, hierarchy, interactions and visual quality expressed by the approved/current mocks and wireframes. Do not stop at mock creation, screenshot generation, measurement-only work, or describing differences.
next-action: Compare current production UI against the current mock/reference set screen-by-screen; implement the highest-impact concrete UI mismatches in production; verify in real browser at desktop and narrow viewport; repeat until the compared screen is materially aligned. Preserve existing product behavior/data semantics while correcting presentation. Use performance/network measurement only when it directly helps resolve a UI defect; it is not the primary Role2 objective.
completion-rule: A screen is not complete because a mock exists. Completion requires production implementation + browser verification + explicit remaining-difference review. Continue to the next screen/reference while authorized scope remains.
write-boundary: client presentation/components/styles/browser tests and Role2 evidence; do not modify Person Detail/server-projection semantics owned elsewhere unless a UI defect proves an owner-boundary issue, then route once.
evidence-path: _handoff-artifacts/results/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/role2.md

## Role3
assignment-id: 20260929-P0-01-R3
state: MEASURED_REPAIR_VERIFIED
executor-task: PERF-TOURNAMENT-SERVER-PROJECTION-MEASURE-20260930-A1
executor-terminal: PERF_TOURNAMENT_SERVER_PROJECTION_MEASURED_REPAIR_VERIFIED
owner: Role3
scope: tournament server/projection.
next-action: Measure remaining dominant schedule/history/ranking/projection/serialization cost with same-data timing/counters; preserve published round-robin reuse and name index, repair only measured cause with regression. If runner absent create exact executable handoff rather than repeat static source inspection.
write-boundary: tournament server/projection and own evidence; no Person Detail/CompetitionPage client source.
evidence-path: _handoff-artifacts/results/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/role3.md

## Integration / oversight
PM or properly fenced surrogate integrates scoped role evidence into _handoff-artifacts/results/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/result.md, owns shared acceptance and routes executor work without overriding live A/B2 claims. All Roles retain compact distributed PM score/health/terminal relay and fenced failover. Current assignment identity must be re-read on each execution boundary. Parent COMPLETE is consumed and must not be reopened by these scoped followups. Scoped followups remain open independently until their own evidence is satisfied or explicitly superseded.
