# Sprint 1.5 — S01-008 Accepted Pre-Binding Audit

- Document ID: `S1.5-S01-008-ACCEPTED-PREBINDING-AUDIT`
- Version: `0.1.0`
- Status: `HISTORICAL / SUPPLEMENTAL PREBINDING SNAPSHOT`
- Sprint 1 evidence horizon: S01-001～008 implemented/accepted; S01-008 accepted commit `7c47847`
- S01-007 accepted commit: `a39e476`
- S01-009 at snapshot creation: clarified but pending/not implemented (**historical horizon, not current project status**)
- Purpose: discovery/evidence reduction before real UI-000. This document does **not** mark any DB row `matched` and does not replace final P04 current-baseline binding.

## 1. Status vocabulary

```text
accepted_code_reference_bound
accepted_contract_bound_needs_repo_exact
accepted_s01_007_needs_repo_exact_binding
calendar_dependency_pending
```

Only real repo-bound UI-000 may convert a row to normative `matched`.

## 2. Accepted Sprint 1 facts now usable

- S01-001～008 are implemented/accepted.
- S01-008 accepted commit is `7c47847`.
- S01-008 production integration includes `createSprint1RunSession`, `runSprint1WeeklyStep`, `runSprint1Years`, `commitRunBattlePlan`, weekly-training adapter, Sprint1 CLI input, and fixed7 writers.
- Runtime architecture is immutable `Sprint1RunContext` + mutable `Sprint1RunRuntimeState`, bundled as `Sprint1RunSession`.
- `Sprint1RunRuntimeState.eventStream` and `EventAllocationState` are production integration contracts.
- `WEEKLY_TRAINING_PROCESSOR_ID` is the transactional adapter ID and `EventEnvelope.sourceProcessor` value.
- run-wide `battleResults` is canonical; same-week `BattleResultWeekState` is a resettable weekly registry only.
- S01-009 is verification-only and must not invent a new production comparator API.

## 3. DB-001～022 pre-binding result

| DB | Subject | Accepted evidence now | Pre-binding status | Remaining real UI-000 evidence |
|---|---|---|---|---|
| DB-001 | post-start battle execution abort final class/symbol/module | accepted class name `BattleExecutionAbortError`; accepted regression path candidate `packages/simulation-core/src/sprint1-spec-0.1.19-post-start-execution-abort.test.ts`; S01-007 accepted commit a39e476 | accepted_s01_007_needs_repo_exact_binding | exact class source module/export plus test binding at accepted commit |
| DB-002 | canonical committed runtime snapshot/read public API used to build UiReadSnapshot | S01-008 accepted: Sprint1RunSession{context,runtimeState}; mutable Sprint1RunRuntimeState + immutable Sprint1RunContext | accepted_contract_bound_needs_repo_exact | exact runtime root fields, public/accessible clone/read/validation path at 7c47847 |
| DB-003 | CAL-JAN-SYNC WorldDate/WorldCalendar physical fields/public symbol | not supplied by S01-008/S01-009 docs | calendar_dependency_pending | CAL-JAN-SYNC accepted code/tests |
| DB-004 | canonical Person collection final runtime physical path/read API | S01-008 accepted run-session/world integration; participant validators consume canonical Person view | accepted_contract_bound_needs_repo_exact | exact Sprint1RunRuntimeState -> WorldState -> persons path/read helper/export |
| DB-005 | start/reset/step operation receipt and four aggregate-count sources | runSprint1WeeklyStep/runSprint1Years accepted production symbols; S01-009 integrated verifier consumes production run APIs | accepted_contract_bound_needs_repo_exact | exact result/receipt type and four aggregate fields/sources in accepted repo |
| DB-006 | committed PersonTemporaryCondition integration path | S01-002 PersonTemporaryCondition accepted; S01-009 docs explicitly say current World/sidecar integration implemented/accepted in S01-008 | accepted_contract_bound_needs_repo_exact | exact runtime storage field/path and commit/update tests |
| DB-007 | canonical current-age stored field/public Person read path | accepted battle participant production validates view.currentAge and cross-checks computeCurrentAge(worldDate.year,birthYear) | accepted_contract_bound_needs_repo_exact | final canonical Person runtime read path/export at 7c47847 |
| DB-008 | mock participant eligibility public helper/facade/module | accepted source candidate `packages/simulation-core/src/sprint1/battle-participant.ts`; package-root candidates `isEligibleForBattleKind`, `validateBattleParticipantSource`, `validateBattleParticipant`, `BattleParticipantSource`; test `sprint1-battle-start.test.ts` | accepted_code_reference_bound | confirm exact symbols remain at 7c47847 and package-root boundary |
| DB-009 | TechniqueDefinition public type/module/final schemaVersion/key registry | accepted module `packages/simulation-core/src/sprint1/technique-definition.ts`; `TechniqueDefinition`; `TECHNIQUE_DEFINITION_KEYS` exact31; schema literal owned by technique enums | accepted_code_reference_bound | confirm final 7c47847 package-root export and schema literal |
| DB-010 | TechniqueDefinition nested literal union such as rangeShiftAfterUse | accepted `technique-definition.ts` imports `RANGE_SHIFT_AFTER_USE` and type `RangeShiftAfterUse` from `sprint1/types.ts`; field `rangeShiftAfterUse: RangeShiftAfterUse` | accepted_code_reference_bound | confirm exact final literal members and package/root accessibility at 7c47847 |
| DB-011 | weekly-training sourceProcessor literal/module | accepted S01-008 contract: WEEKLY_TRAINING_PROCESSOR_ID is adapter ID and EventEnvelope.sourceProcessor; transactional pipeline [weekly-training] | accepted_contract_bound_needs_repo_exact | constant declaration/module + append test at 7c47847 |
| DB-012 | run-wide committed Event Stream query public source | accepted S01-008 contract: Sprint1RunRuntimeState.eventStream is run-wide runtime source; event allocation/integration production-wired | accepted_contract_bound_needs_repo_exact | exact field/path and public read/clone path at 7c47847 |
| DB-013 | all concrete ValidationResult types/facades stored by CommittedValidationViewStore | S01-008 production weekly/battle integration accepted; S01-009 verifier relies on validation/invariant outcomes | accepted_contract_bound_needs_repo_exact | enumerate concrete result-bearing APIs/types and exact validation flow in repo |
| DB-014 | BattleActionLog replacementReason/evadeDirection/activationFailureReason exact types/modules | accepted module `packages/simulation-core/src/sprint1/battle-turn-logs.ts`; package root exports `BattleActionLog` and `validateBattleActionLog`; accepted test `sprint1-battle-turn-resolution.test.ts` | accepted_code_reference_bound | confirm exact nested field types/owner aliases at 7c47847 |
| DB-015 | BattleResult.summaryLog.judgeSummary decisiveCriterion/seededRngRoll physical path | S01-007 accepted and fix7 artifact exists; Sprint1.5 semantics already fixed | accepted_s01_007_needs_repo_exact_binding | final BattleResult/SummaryLog/JudgeSummary type path + validator/test at a39e476 |
| DB-016 | mock replay canonical runtime checkpoint exact type/module/rebuild API | accepted S01-008 has runtime/session integration, descriptor-safe clone/export/restore semantics; S01-009 hashes selected runtime checkpoints | accepted_contract_bound_needs_repo_exact | actual clone/checkpoint/rebuild callable boundary; determine whether IsolatedMockBattleRunner facade is still required |
| DB-017 | battle.started/battle.finished pre-allocation candidate exact schemas/modules | started side exact candidate: `sprint1/battle-started-event.ts`, `BattleStartedEventCandidate`, `BattleStartedEventPayload`, `BATTLE_STARTED_EVENT_TYPE`; S01-009 confirms accepted commit emits started→finished through commitRunBattlePlan | accepted_contract_bound_needs_repo_exact | locate exact battle.finished module/type/export and confirm pair ordering at 7c47847 |
| DB-018 | CLI/UI canonical runtime snapshot/export physical binding + deterministic comparison authority | S01-008 production runtime/fixed7 is accepted. 05 spec + S01-009 clarifier already fix comparison semantics; S01-009 comparator is verification-private and must not be a production dependency | accepted_contract_bound_needs_repo_exact | bind accepted S01-008 canonical runtime snapshot/export path at repo; UI-009 independently implements same 05/S01-009 rule-set |
| DB-019 | CAL-JAN-SYNC minimum N crossing year boundary/test source | not supplied by S01-008/S01-009 docs | calendar_dependency_pending | CAL-JAN-SYNC accepted boundary tests |
| DB-020 | WorldSummary identity/rule final owner/path | accepted S01-008: immutable Sprint1RunContext owns identity + RunRuleSnapshot + config/catalog/initial sidecar; no run-time reread/rebuild | accepted_contract_bound_needs_repo_exact | exact Sprint1RunContext field names/types/package access path at 7c47847 |
| DB-021 | training.action_selected exact payload/validator/forcedReason binding | S01-004 accepted training event semantics; S01-008 binds sourceProcessor=weekly-training; S01-009 integrated scenario requires at least one training.action_selected | accepted_code_reference_bound | repo-bound payload type/validator and forcedReason exact literal union/module |
| DB-022 | relationship runtime collection/read path/validator | canonical Relationship semantics pre-exist; S01-008 accepted World/run-session integration | accepted_contract_bound_needs_repo_exact | exact WorldState relationship collection/read path + validator/package access at 7c47847 |

## 4. Counts

```text
accepted_code_reference_bound = 5
accepted_contract_bound_needs_repo_exact = 13
accepted_s01_007_needs_repo_exact_binding = 2
calendar_dependency_pending = 2
total = 22
normative matched = 0
proven spec_fix_required = 0
proven code_fix_required = 0
```

## 5. Material progress from R6

- DB-008/009/010/014/021 now have accepted production-code references strong enough that semantic discovery is no longer expected.
- DB-002/004/005/006/007/011/012/013/016/017/020/022 are no longer waiting for S01-008 implementation; they need exact repository physical binding.
- DB-001/015 are accepted S01-007 evidence gaps, not implementation gaps.
- DB-018 no longer waits for S01-009 implementation. S01-008 supplies the runtime/output source; 05 + current S01-009 clarifier already supply the comparison authority. Only repo physical binding remains.
- DB-003/019 remain CAL-JAN-SYNC-only.

## 6. Highest-value real repo checks

1. DB-002 runtime/session clone/read/validation boundary.
2. DB-004 canonical persons physical path.
3. DB-005 weekly/run operation result and aggregate sources.
4. DB-012 eventStream field/read path.
5. DB-016 checkpoint clone/rebuild boundary / isolated-runner need.
6. DB-022 relationship collection/read/validator path.
7. DB-001 exact execution-abort symbol.
8. DB-015 judgeSummary path.
9. DB-017 started/finished candidate schemas.
10. DB-013 ValidationResult source inventory.

## 7. S01-009 implication

At snapshot creation, S01-009 completion was a global Sprint 1 completion/UI-000 predecessor gate. That sentence is historical; current predecessor status comes from latest roadmap/P00.
No DB row should ever wait for a production comparator/helper from S01-009, and final matched status must be confirmed against the P00-fixed current repository baseline.

DB-018 is already semantically determined by:

```text
accepted S01-008 runtime/output source
+ 05 deterministic comparison authority
+ current S01-009 clarification
```

Real UI-000 must bind the S01-008 runtime snapshot/export path. UI-009 may implement its own adapter-side comparison projection so long as it proves exact rule-set equivalence.

## 8. Pre-binding verdict

```text
PREBINDING VERDICT = MATERIAL_PROGRESS
S01-008 implementation wait rows remaining = 0
repo exact-binding rows = 20
S01-009-only evidence rows = 0
CAL-only rows = 2
real matched asserted = 0
```
