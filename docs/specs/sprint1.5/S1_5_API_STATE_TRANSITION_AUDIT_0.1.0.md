# Sprint 1.5 API State Transition Audit

- Document ID: `S1.5-API-STATE-TRANSITION-AUDIT`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15` R6 preparation
- Base authority: `S1.5-SPEC-0.1.13`
- Scope: API-001～API-015
- Purpose: request validation → precedence → fixed source → commit/no-commit → response → failure → retryをendpoint単位で閉じる。

## 1. Common rules

### GET except API-001

```text
Host/security
-> session cookie
-> path/query syntax
-> fixed UiReadSnapshot
-> lifecycle
-> cursor auth/binding if applicable
-> single resource existence if applicable
-> canonical/resource integrity
-> filter/sort/page/project
-> strict DTO/serialize
```

- updating中は`operationStartReadSnapshot`だけを見る。
- every GET failure: `commitState=none`。
- GETはjournalへ保存しない。
- current-state mutation/RNG/ID allocationなし。

### API-001 bootstrap

```text
Host/security
-> non-mutating cookie inspect
-> path/query validation
-> valid request only: existing session reuse OR new empty session draft
-> DTO/schema/JSON/Set-Cookie prebuild
-> new session store registration if needed
-> transport
```

Invalid bootstrap request never creates a new session. Authentic cookie + corrupt server-side UiSession is INTERNAL_ERROR 500, not an invalid-cookie bootstrap.

### POST API-003/004/005/012/013

```text
security
-> JSON/strict DTO
-> canonical fingerprint + existing journal lookup
-> completed/running/conflict handling
-> update lock
-> expectedUiRevision
-> lifecycle
-> resource existence
-> running acceptance + updateControl + operationStart snapshot
-> canonical source/store integrity
-> domain/pre-start
-> capacity
-> simulation operation
-> response/journal/commit boundary
```

Pre-accept rejection never creates/reserves a new journal record.

Accepted failure is journalable when final response bytes can be determined.

Saved same-request response replay never re-executes the operation. Original HTTP status and response body bytes are exact; non-deterministic transport headers are excluded from equality.

Saved response/journal conflict lookup is reachable only after security and strict DTO validation; invalid requests cannot use a visible requestId string to bypass those gates.

The requestId namespace is session-global across all five mutation endpoints. Running/completed records are not evicted before UiSession/process end.

## 2. Endpoint matrix

| ST | API | Method/path | Lifecycle | Fixed source | Success state change | Main failure/retry boundary |
|---|---|---|---|---|---|---|
| ST-001 | API-001 | GET `/api/s1_5/session` | bootstrap; session optional | current UiSession control metadata + envelope revision from current/opStart | new valid bootstrap may register one empty session only | invalid request creates no session; no saved-response journal |
| ST-002 | API-002 | GET `/api/s1_5/presets` | empty/ready/updating allowed; session required | startup-frozen preset registry; envelope revision from fixed session snapshot | none | query invalid 400; no session 401; no cursor |
| ST-003 | API-003 | POST `/api/s1_5/simulation/start` | empty or ready | immutable preset registry + accepted seed; old opStart generation for rollback/read | atomic new run + run-init + validation + latest=null + revision+1 + success journal + lastOperation | preset missing pre-accept 404; accepted domain/integrity/capacity failure journalable; app failure none only |
| ST-004 | API-004 | POST `/api/s1_5/simulation/step` | ready only | accepted current runtime/run rules | one atomic week per successful week; final HTTP200 success/partial_failure updates lastOperation | 1-week domain failure 422; multiweek domain partial_failure 200 incl K=0; internal 500 none/partial/complete |
| ST-005 | API-005 | POST `/api/s1_5/simulation/reset` | ready only | saved validated RunInitializationSnapshot only | atomic reinitialized world + new validation store + latest=null + revision+1; same RunInit value | corrupt/missing saved source 500 none; app partial/complete forbidden |
| ST-006 | API-006 | GET `/api/s1_5/simulation` | ready only | one fixed UiReadSnapshot; summary + its lastOperationRequestId journal record | none | lastOperation reference corrupt/missing/non-200/wrong type => whole 500 |
| ST-007 | API-007 | GET `/api/s1_5/people` | ready only | current Sprint1 monolithic canonical Person collection/runtime | none | filter empty=200; cursor stale=409; current-source bad canonical person/source integrity => 500。将来Historical list partial-readは別versioned contract |
| ST-008 | API-008 | GET `/api/s1_5/people/:personId` | ready only | current Sprint1 monolithic Person + Sprint1 state + catalog/relationships/events from same fixed generation | none | lexical id 400; absent id 404; current-source/cross-reference corruption 500。将来Historical tolerant readerは別versioned contract |
| ST-009 | API-009 | GET `/api/s1_5/events` | ready only | fixed committed canonical Event Stream | none | empty filter=200; stale cursor=409; invalid event/stream integrity=500 |
| ST-010 | API-010 | GET `/api/s1_5/validation-results` | ready only | fixed CommittedValidationViewStore | none | empty filter=200; stale cursor=409; occurrence/schema/store corruption=500 |
| ST-011 | API-011 | GET `/api/s1_5/mock-battles/candidates` | ready only | current active-eligible canonical people + battle eligibility sources | none | legitimate ineligible excluded; current candidate input corruption=500; zero/one candidate is 200。Historical partition後はactive candidate indexから読み、死亡archive全件validationを要求しない |
| ST-012 | API-012 | POST `/api/s1_5/mock-battles` | ready only | accepted immutable current-world source snapshot | atomic latest/result/replay snapshot + revision+1 + success journal + lastOperation; canonical world unchanged | same person pre-accept 400; missing person pre-accept 404; pre-start 422 accepted; execution abort 500 none |
| ST-013 | API-013 | POST `/api/s1_5/mock-battles/replay` | ready only | saved replay checkpoint only; current world used only for concurrency/lifecycle | atomic replacement latest + revision+1 + success journal + lastOperation | latest missing pre-accept 404; saved record corruption accepted 500 none; current participant eligibility not rechecked |
| ST-014 | API-014 | GET `/api/s1_5/mock-battles/latest` | ready only | fixed snapshot latest record | none | no latest 404; corrupt latest/hash/cross-reference 500; normal step may advance envelope revision while result revision stays old |
| ST-015 | API-015 | GET `/api/s1_5/mock-battles/latest/log` | ready only | fixed snapshot latest.detailedLog.actionLogs | none | authenticated stale cursor before resource =>409 even latest=null; cursorless missing=>404; corrupt current latest/log=>500 |

## 3. ST-001 API-001 GET session

### Valid existing session

Idle:

```text
data.sessionState = committedLifecycle
data.csrfToken = current stable token
data.activeOperation = null
response.uiRevision = current committed revision
response.isUpdating = false
```

Updating:

```text
data.sessionState = "updating"
data.csrfToken = current stable token
data.activeOperation = {kind,current requestId}
response.uiRevision = operationStartReadSnapshot.uiRevision
response.isUpdating = true
```

`data` exact3. No summary/lastOperation.

### Invalid query

No valid existing session:

```text
400 INVALID_REQUEST
uiRevision=null
isUpdating=false
new session count=0
CSPRNG calls=0
```

Existing valid session uses that session's current/opStart metadata but still returns 400 and never rotates/creates session material.

Authentic cookie whose matching UiSession fails strict integrity returns 500 with `uiRevision=null/isUpdating=false`; it is not deleted or replaced by a new empty session.

### New bootstrap

For valid queryless request + missing/invalid/old cookie:

```text
draft sessionId/csrf
-> validate session
-> prebuild exact HTTP200 bytes + Set-Cookie
-> register store row once
-> transport
```

DTO/serializer/header/store-registration failure before registration => no session row/cookie.

Transport failure after registration does not roll back the registered session. If browser did not receive its cookie, later cookie-less bootstrap may create another session; this is not a simulation mutation or journal replay.

## 4. ST-002 API-002 GET presets

Source is the process-startup validated/frozen registry.

```text
items sorted presetId asc
totalCount=items.length
nextCursor=null
```

It is valid in empty/ready/updating lifecycle after session validation.

Updating affects only envelope `uiRevision/isUpdating`; preset data is not rebuilt from world/opStart state.

No query/cursor accepted.

## 5. ST-003 API-003 POST start

### Pre-accept

- strict presetId/seed/requestId/revision format => 400 when invalid
- completed same fingerprint => saved response exact
- running same fingerprint => UPDATE_IN_PROGRESS
- conflicting same requestId => REQUEST_ID_CONFLICT
- other operation lock => UPDATE_IN_PROGRESS
- stale revision => STALE_UI_REVISION
- missing preset resource => NOT_FOUND

These do not reserve a new journal record.

### Accepted

After lifecycle permits empty|ready and preset exists:

```text
running journal + updateControl + operationStart snapshot
-> source integrity/domain
-> capacity +1
-> build new run fully
-> build/validate/serialize success response
-> atomic commit:
   new runtime
   new RunInitializationSnapshot
   new initial validation store
   latest=null
   uiRevision+1
   completed HTTP200 journal
   lastOperationRequestId
```

Ready-start never reuses old run snapshot as reset input.

Application failure before atomic commit => none + old generation exact.

Transport failure after atomic commit => no 500; saved HTTP200 remains replay source.

## 6. ST-004 API-004 POST step

Ready only.

### Domain outcomes

`weeks=1` and first week cannot commit due canonical ValidationResult:

```text
422 DOMAIN_VALIDATION_FAILED
committedWeeks field absent
world/revision unchanged
lastOperation unchanged
accepted failure journal saved
```

`weeks>=2` and requested week K+1 has canonical domain failure:

```text
HTTP200 SimulationMutationView.outcome=partial_failure
committedWeeks=K
K may be 0
completedUiRevision=accepted+K
failed week not committed/stored
lastOperation becomes this HTTP200 response
```

K=0 changes journal/lastOperation metadata while canonical world and uiRevision remain unchanged. Existing cursors are not invalidated only because lastOperation changed.

This means `uiRevision` is not a unique key for the full UiReadSnapshot: `lastOperationRequestId` can change at the same revision. A revision-only read-snapshot cache is invalid.

### Internal failures

```text
K=0       -> 500 none
1<=K<N    -> 500 partial
K=N final response failure -> 500 complete
```

partial/complete expose `completedUiRevision`; lastOperation stays previous HTTP200 success.

Each successful week atomically commits world + validation store + uiRevision + journal progress before yielding.

## 7. ST-005 API-005 POST reset

Ready only.

Input does not re-resolve preset/default files.

Accepted reset uses saved `RunInitializationSnapshot` canonical value only.

```text
strict source integrity
-> capacity +1
-> build reinitialized generation
-> prebuild success bytes
-> atomic replace runtime/validation/latest/revision/journal/lastOperation
```

RunInitializationSnapshot value remains canonical-exact before/after.

Validation occurrence restarts from initialization result order.

All application failures are `commitState=none`; partial/complete reset errors do not exist.

Old journal records remain available.

## 8. ST-006 API-006 GET simulation

Ready only. No cursor/query.

Both fields must come from one fixed read generation:

```text
summary
  <- fixed world + fixed RunInitializationSnapshot

lastOperation
  <- fixed lastOperationRequestId
     -> completed journal HTTP200 body
     -> strict data revalidation
```

Because ready requires a successful start history, valid ready state has non-null `lastOperationRequestId`; `lastOperation=null` is not a fallback for corrupt state.

Updating response continues to show operation-start summary and operation-start lastOperation even if internal weekly commits have advanced current session state.

## 9. ST-007 API-007 GET people

Generic GET precedence.

- canonical query materialized before cursor binding
- filtered collection may be empty => 200
- totalCount after filters/before cursor/page
- stable sort/tie-break contract
- cursor binds simulation identity + fixed session revision + effective query
- bad/tampered cursor 400
- authenticated stale cursor 409
- canonical Person/source corruption => whole request 500, not skip

No world/session mutation.

## 10. ST-008 API-008 GET person detail

No cursor.

```text
lexical personId invalid -> 400
valid id but absent in fixed snapshot -> 404
present but any required canonical cross-reference corrupt -> 500
valid -> exact PersonDetailView
```

All detail sources — Person, Sprint1PersonState, technique catalog/state, relationships, stat/training history — must refer to the same fixed read generation or immutable run sources bound to it.

During update, a person created/removed only in current in-progress state does not affect this request.

## 11. ST-009 API-009 GET events

Only canonical committed Event Stream.

Mock `eventCandidates` are never included.

Filters apply to fixed stream; no matches => 200 empty.

Person filter uses `entities.personIds` only.

Cursor stale after committed revision change even if result page content would coincidentally match.

One invalid canonical EventEnvelope/source invariant => whole response 500.

## 12. ST-010 API-010 GET validation results

Only fixed `CommittedValidationViewStore`.

Domain/pre-start/failed-week response-only validation that was never committed is not visible here.

`validationOccurrence` is stable positive sequence per current store generation.

Reset/ready-start replace store and can reuse occurrence 1; old cursor is stale because session generation/revision changed.

Store gap/duplicate/next-counter/schema corruption => whole response 500; UI does not renumber.

## 13. ST-011 API-011 GET mock candidates

Read-only eligible-only projection.

Candidate GET:

- consumes no RNG
- reserves no MatchId
- changes no uiRevision/journal/lastOperation/latest
- does not run full pair pre-start validation

Legitimate ineligible Person => omitted.

A canonical Person/battle adapter source that is corrupt => 500, not omitted as if merely ineligible.

0 or 1 candidate is a valid 200 response; UI disables execution until two distinct choices exist.

## 14. ST-012 API-012 POST new mock

### Pre-accept structural/resource rejection

Same participant:

```text
400 conflicting_fields on both participant fields
journal create=0
requestId reservation=0
updateControl=0
eligibility/pre-start/RNG/MatchId=0
```

Syntactically valid but missing Person resource => pre-accept 404.

Candidate GET output is not trusted.

### Accepted

After both resources exist:

```text
running acceptance
-> current immutable source integrity
-> full battle pre-start validation
   failure => 422 BATTLE_PRE_START_FAILURE, saved journal
-> capacity +1
-> isolated canonical battle run
```

Post-start execution abort => accepted 500 none, no partial latest/result/events.

Completed or canonical `resolution_error` result may be persisted as successful mock result per BattleResult contract.

Success atomically commits only session mock latest + uiRevision + success journal + lastOperation. Canonical world/RNG/MatchId/Event Stream stay unchanged.

## 15. ST-013 API-013 POST replay

Pre-accept:
- same saved response rules as all POST
- ready required
- latest/replay resource must exist, otherwise 404 with no new journal record

After running acceptance, strict saved latest/replay hashes/cross-references are validated.

Corruption => accepted 500 none + exact journalable response; no self-heal/delete/current-world reconstruction.

Replay battle source is saved checkpoint only.

Current world changes in age/career/injury/techniques do not requalify or disqualify the replay.

`expectedUiRevision` remains concurrency gate.

Successful replay atomically replaces latest and increments session revision by 1; original sourceWorldUiRevision remains original source revision.

After start/reset clears latest:
- new replay requestId => 404
- old completed replay requestId + same fingerprint => old saved response exact, before current resource re-evaluation

## 16. ST-014 API-014 GET latest

Ready only, no cursor.

No latest in fixed snapshot => 404.

Corrupt latest/replay/hash/cross-reference => 500; no deletion/self-heal.

During a step:
- updating GET sees operation-start latest/revision
- after step completion latest record can remain identical while response envelope uiRevision advances

Therefore `resultUiRevision` need not equal current response `uiRevision`.

## 17. ST-015 API-015 GET battle log

Paging source is only fixed latest BattleResult `detailedLog.actionLogs`.

Response data exact4:

```text
items
totalCount
nextCursor
resultUiRevision
```

Cursor payload has no direct `resultUiRevision`; result identity is `dataIdentity=mock-result:<resultUiRevision>`.

Precedence consequence after reset/start clear:

```text
authenticated old cursor
  -> stale binding 409 before latest resource 404

no cursor
  -> latest missing 404
```

Current-binding cursor + corrupt latest => 500.

Normal step retaining latest:
- old battle-log cursor => 409 because payload.uiRevision stale
- cursorless log => 200 with same resultUiRevision but newer response uiRevision

## 18. Cross-endpoint collision matrix

| Collision | Required winner |
|---|---|
| API-001 invalid query + no valid session | 400; no session creation |
| API-001 invalid query + valid updating session | 400 with opStart revision/isUpdating=true |
| API-002 no session + malformed query | 401 session first |
| world GET valid session + malformed query + empty lifecycle | 400 query |
| world GET valid raw cursor text but invalid HMAC + empty lifecycle | 409 lifecycle before cursor decode |
| POST same request completed + current revision changed | saved response replay before revision recheck |
| POST same request running | UPDATE_IN_PROGRESS, no second execution |
| POST requestId conflict + stale current revision | REQUEST_ID_CONFLICT before revision |
| new POST other operation running + stale revision | UPDATE_IN_PROGRESS before revision |
| new POST stale revision + missing resource | STALE_UI_REVISION before resource |
| new POST resource missing + capacity exhausted | NOT_FOUND before capacity |
| accepted source corruption + capacity exhausted | source integrity INTERNAL_ERROR before capacity |
| accepted domain/pre-start failure + capacity exhausted | domain/pre-start result before capacity |
| old authenticated mock-log cursor + latest cleared | STALE_CURSOR before 404 |
| current-binding cursor + current latest corrupt | INTERNAL_ERROR 500 |
| step K=0 HTTP200 partial_failure | same uiRevision; lastOperation changes; cursors remain valid if all cursor-bound data/query identity unchanged |

## 18A. Cross-operation invariants

```text
session-global requestId namespace
running/completed journal no-evict until session/process end
saved response replay before current lock/revision/resource re-evaluation
uiRevision is not full UiReadSnapshot generation identity
K=0 partial_failure can change lastOperation at same revision
mock/replay success invalidates old pageable cursors by uiRevision
saved old response replay never mutates current cursor/read generation
```

## 19. Audit verdict

After applying R5 preparation corrections:

```text
API state rows = 15
unassigned API = 0
duplicate API = 0
known request/retry semantic ambiguity = 0
known session/lastOperation wire ownership ambiguity = 0
known atomic-start complete-error contradiction = 0
known journal lookup/running-acceptance ambiguity = 0
```

This is still pre-implementation. Real UI-000 must bind final Sprint 1/CAL public sources before UI-001.


## 20. Historical archive compatibility note

ST-007/008はcurrent API 0.2.0のmonolithic/current source state-transition契約。Historical archive subsystem導入後のpartial-list/detail semanticsを定義しない。

ST-011もcurrent candidate strictnessを定義するだけで、Historical payloadを候補生成のためにscan/validateする契約ではない。

Historical readerは`S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md` HIST-025～035に従い、1 broken historical recordをwhole-detail errorへ自動昇格させない。
