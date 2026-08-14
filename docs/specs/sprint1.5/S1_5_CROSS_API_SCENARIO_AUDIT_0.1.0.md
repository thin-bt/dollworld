# Sprint 1.5 Cross-API Scenario Audit

- Document ID: `S1.5-CROSS-API-SCENARIO-AUDIT`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15` R6 preparation
- Base authority: `S1.5-SPEC-0.1.13`
- Scope: API-001～015の操作間相互作用
- Rule: 単一endpoint testがPASSしても、以下SCNがFAILならtask acceptance不可。

## 1. Scenario ownership

| SCN | Owner | Required predecessor | Purpose |
|---|---|---|---|
| SCN-001 | UI-006 | UI-005 accepted | start→step→mock→step→replay→reset→old replay response |
| SCN-002 | UI-003 | UI-002 accepted | K=0 partial_failure / same-revision lastOperation |
| SCN-003 | UI-003 | UI-002 accepted | requestId session-global namespace |
| SCN-004 | UI-003 | UI-002 accepted | concurrent mutation precedence / saved replay |
| SCN-005 | UI-006 | UI-005 accepted | world advance after mock then replay saved source |
| SCN-006 | UI-006 | UI-005 accepted | cursor contrast: mock/replay vs K=0 partial |
| SCN-007 | UI-006 | UI-005 accepted | reset clears latest but not journal |
| SCN-008 | UI-006 | UI-005 accepted | ready-start clears latest but not journal |
| SCN-009 | UI-006 | UI-005 accepted | step INTERNAL partial then replay |
| SCN-010 | UI-006 | UI-005 accepted | process restart boundary |
| SCN-011 | UI-008 | UI-007 accepted | validation occurrence/reset/cursor/journal |
| SCN-012 | UI-007 | UI-006 accepted | battle-log cursor across step/replay/reset |
| SCN-013 | UI-006 | UI-005 accepted | repeated new mock unchanged canonical world |
| SCN-014 | UI-010 | UI-009 accepted | final mixed API smoke/traceability |
| SCN-015 | UI-003 | UI-002 accepted | client disconnect/reload/AbortSignal does not cancel accepted mutation |

Each SCN has exactly one final evidence owner. Earlier tasks may provide consumer evidence for common primitives but do not mark future SCNs complete.

## 2. SCN-001 canonical revision ledger

Start with one valid empty session:

```text
uiRevision = 0
latest = null
lastOperation = null
```

Use unique requestIds `S,W1,M,W2,R,Z`.

### S start

```text
POST start expected=0
-> 200
uiRevision=1
lastOperation=S
latest=null
journal contains completed S
```

### W1 step one week

```text
POST step expected=1 weeks=1
-> 200 success
uiRevision=2
lastOperation=W1
latest=null
journal S,W1 retained
```

### M new mock

```text
POST mock expected=2 A/B distinct valid
-> 200
sourceWorldUiRevision=2
resultUiRevision=3
uiRevision=3
lastOperation=M
latest=M result
canonical world unchanged by mock
journal S,W1,M retained
```

### W2 step one week

```text
POST step expected=3 weeks=1
-> 200 success
uiRevision=4
lastOperation=W2
latest still M
latest.resultUiRevision=3
canonical world advanced
```

GET latest now:

```text
response.uiRevision=4
data.resultUiRevision=3
data.sourceWorldUiRevision=2
```

### R replay

```text
POST replay expected=4
-> 200
uiRevision=5
lastOperation=R
latest replaced by replay result
latest.resultUiRevision=5
latest.sourceWorldUiRevision=2
canonical BattleResult/eventCandidates == M canonical result
canonical current world remains post-W2 world
```

Current world at revision 4 is concurrency context only; replay battle source is M's saved revision-2 checkpoint.

### Z reset

```text
POST reset expected=5
-> 200
uiRevision=6
lastOperation=Z
latest=null
validation store rebuilt from reset initialization
RunInitializationSnapshot canonical value unchanged
journal S,W1,M,W2,R,Z retained
```

### old R resend after reset

Same exact requestId/fingerprint:

```text
POST replay R again
-> saved old 200 bytes from revision5
current uiRevision remains 6
current lastOperation remains Z
current latest remains null
current validation/world remain reset state
```

No current latest/resource/hash check is run after completed journal match.

### new replay after reset

```text
requestId=R2 expected=6
-> 404 NOT_FOUND
new journal record for R2 = none
```

Required final state equals state immediately after Z.

## 3. SCN-002 K=0 partial_failure / same revision metadata generation

Initial ready state:

```text
uiRevision=R
lastOperationRequestId=L0
```

Create a valid people/events/validation cursor at R where applicable.

Request:

```text
POST step
expectedUiRevision=R
requestedWeeks>=2
first requested week returns canonical domain failure
```

Expected:

```text
HTTP200
outcome=partial_failure
committedWeeks=0
completedUiRevision=R

world unchanged
validation store unchanged
latest unchanged
uiRevision remains R

lastOperationRequestId=L1 // this partial_failure response
```

Consequences:

1. `GET /simulation` after completion has the same top-level `uiRevision=R` but new `lastOperation=L1`.
2. full `UiReadSnapshot` before/after is not identical even though uiRevision is identical.
3. cache keyed only by uiRevision must fail.
4. a later mutation starting at R captures operationStartReadSnapshot with `lastOperationRequestId=L1`.
5. existing pageable cursor at R stays valid because lastOperation metadata is not cursor-bound data.
6. same K=0 response replay later does not change lastOperation again.
7. running->completed journal, new lastOperationRequestId, and updateControl release occur in one finalization boundary; no mixed intermediate metadata state is observable.

During the K=0 operation before completion, updating GET uses operationStartReadSnapshot and still sees L0.

## 4. SCN-003 requestId session-global namespace

Within one UiSession use requestId `X`.

Case A:

```text
POST start X -> completed
POST step X with otherwise valid current revision/input
-> REQUEST_ID_CONFLICT
```

Case B:

```text
POST step X -> completed in a fresh fixture
POST reset X
-> REQUEST_ID_CONFLICT
```

Case C:

```text
POST mock X -> completed
POST replay X
-> REQUEST_ID_CONFLICT
```

Case D same endpoint:

```text
POST step X expected=R weeks=1 -> completed
POST step X expected=R+1 weeks=1
-> REQUEST_ID_CONFLICT
```

Case E exact same fingerprint:

```text
same method + endpoint + expectedUiRevision + canonical input
-> saved completed response exact
```

Case F existing completed requestId text + invalid strict body:

```text
unknown field / wrong type / malformed body
-> 400 INVALID_REQUEST
-> no saved replay / no REQUEST_ID_CONFLICT
```

Case G existing completed requestId text + invalid security:

```text
bad Origin/CSRF/session
-> security error
-> no saved replay / no REQUEST_ID_CONFLICT
```

All valid-DTo conflict/replay cases happen before current lock/revision/lifecycle/resource evaluation, but **after security and strict DTO validation**.

Test must fail if journal storage is partitioned per endpoint or if requestId lookup bypasses security/strict DTO validation.

Case H same textual requestId in two live sessions:

```text
session A: POST step X -> normal A record
session B: POST step X -> independently evaluated B record
```

No cross-session conflict/replay. Test must also fail if journal is process-global across UiSessions.

## 5. SCN-004 concurrent operation precedence

Let operation A be a running step with:

```text
operationStartReadSnapshot.uiRevision=R
updateControl != null
```

While A is running:

### same running request / same fingerprint

```text
-> UPDATE_IN_PROGRESS
uiRevision=R
isUpdating=true
```

No second execution.

### same requestId / different fingerprint

```text
-> REQUEST_ID_CONFLICT
uiRevision=R
isUpdating=true
```

### different requestId / valid request

```text
-> UPDATE_IN_PROGRESS
uiRevision=R
isUpdating=true
```

### different requestId / invalid Origin or CSRF

Security precedes lock:

```text
-> 403 REQUEST_FORBIDDEN
uiRevision=R
isUpdating=true
```

No journal lookup/acceptance for the rejected new request beyond the permitted pre-accept path.

### different requestId / invalid strict body

```text
-> 400 INVALID_REQUEST
uiRevision=R
isUpdating=true
```

### previously completed exact request replay while A runs

Completed journal match precedes current update lock:

```text
-> saved original HTTP status + response body bytes exact
-> non-deterministic transport headers are excluded from exact replay equality
```

The saved response retains its original `uiRevision/isUpdating/refreshRequired`, even if that means `isUpdating=false` while A is currently running.

No current-state mutation and no new journal record.

## 6. SCN-005 mock -> world advance -> replay

```text
start -> R1
step -> R2
mock(A,B) -> R3, sourceWorldUiRevision=R2
step/world advance -> R4
replay -> R5
```

Before replay, deliberately change current world-visible participant facts through canonical progression where fixture allows:

- age/date
- career
- injury
- technique state

Expected replay:

```text
uses saved R2 checkpoint only
does not call current candidate eligibility as battle source
BattleResult/eventCandidates/matchId/battleSeed/finalRng == original mock
sourceWorldUiRevision remains R2
current canonical world remains R4 world
resultUiRevision=R5
```

## 7. SCN-006 cursor invalidation contrast

Create pageable cursor C at revision R.

### mock success

Mock is world-nonmutating but session revision changes:

```text
R -> R+1
```

C must become `STALE_CURSOR` even if People/Event/Validation list content is byte-identical.

### fresh cursor C2 at R+1

Run K=0 domain partial_failure:

```text
uiRevision stays R+1
lastOperation changes only
```

C2 remains valid.

### replay success

```text
R+1 -> R+2
```

C2 becomes stale again.

This test prevents both:

- data-content-based cursor reuse across revision change
- unnecessary cursor invalidation on lastOperation-only change

## 8. SCN-007 reset clears latest / journal survives

Prepare:

```text
mock M completed
replay R completed
battle-log cursor C issued
reset Z completed
```

After Z:

```text
latest=null
cursorless GET latest/log -> 404
old authenticated C -> 409 STALE_CURSOR
journal M/R/Z still present
lastOperation=Z
```

Then:

```text
same M exact resend -> old M 200 bytes
same R exact resend -> old R 200 bytes
```

Current:

```text
latest remains null
lastOperation remains Z
uiRevision unchanged from reset
world/validation unchanged
```

New replay requestId -> current latest missing 404.

## 9. SCN-008 ready-start clears latest / journal survives

Prepare old run with completed mock/replay and cursors.

Run ready-start with new requestId/new accepted start input.

Expected:

```text
new world
new RunInitializationSnapshot
new initial ValidationStore
latest=null
revision +1
lastOperation=new start
same session/CSRF/process keys
all old running/completed journal records retained
```

Old exact completed mock/replay requestId returns old bytes without restoring old run.

New requestId evaluates only the new run.

Old signed collection/log cursor is stale, not bad-HMAC.

## 10. SCN-009 step INTERNAL partial then replay

Prepare latest from mock M at revision R.

Run:

```text
POST step expected=R requestedWeeks=3
week1 commits
week2 internal failure
```

Expected failure:

```text
500
commitState=partial
committedWeeks=1
completedUiRevision=R+1
uiRevision=R+1
latest still M
lastOperation still M
step failure journal completed
```

Now replay with new requestId/expected=R+1:

```text
uses M saved source checkpoint
succeeds if checkpoint valid
result canonical battle == M
uiRevision=R+2
lastOperation=replay
```

The failed step's current-world changes do not become replay battle input.

## 11. SCN-010 process restart boundary

Before restart, create:

```text
old session cookie
old completed request journal
old pageable cursor
old latest/log cursor
```

Restart the API process. New process uses new session store/process keys.

### A. old cookie on non-bootstrap GET

```text
GET /people?cursor=<old>
Cookie: <old-process-cookie>
```

Expected:

```text
401 SESSION_REQUIRED
uiRevision=null
isUpdating=false
cursor decode/HMAC calls=0
```

Session validation precedes query/cursor semantic processing.

### B. old cookie on bootstrap

```text
GET /session
Cookie: <old-process-cookie>
```

Expected:

```text
200
new current-process empty session
new cookie / CSRF
uiRevision=0
```

Old journal/lastOperation/latest are not restored.

### C. new empty session + old cursor

Before starting a new run:

```text
GET /people?cursor=<old-process-cursor>
Cookie: <new-cookie>
```

Expected:

```text
409 SIMULATION_NOT_STARTED
```

For a syntactically valid raw cursor parameter, empty lifecycle wins before cursor authentication.

### D. new run + old cursor

Start the new session successfully, then:

```text
GET /people?cursor=<old-process-cursor>
```

Expected:

```text
400 INVALID_REQUEST
```

The old cursor cannot authenticate with the new process `cursorHmacKey`; it is not a semantically authenticated stale cursor and therefore not `STALE_CURSOR`.

### E. requestId reuse after restart

Use the same textual requestId as an old-process completed mutation, but a valid request in the new session.

Expected:

```text
no old conflict
no old saved replay
normal new-session request evaluation
```

Forbidden:

- disk/global request journal resurrection without the old UiSession
- old cursorHmacKey/sessionBindingKey reuse
- old lastOperation/latest restoration
- classifying all old-process cursors as 409 STALE_CURSOR

## 12. SCN-011 validation occurrence + reset + old journal

Before reset:

```text
validationOccurrence reaches e.g. 100
old validation cursor C
completed step response W
```

Reset:

```text
new validation store occurrence restarts at 1
old C -> STALE_CURSOR by revision
old W journal remains
```

Replay old W same fingerprint:

```text
returns old response bytes
does not append old validations
does not restore occurrence 100
does not consume nextValidationOccurrence
```

Next new weekly commit continues from the reset store's current `nextValidationOccurrence`.

## 13. SCN-012 battle-log cursor chain

```text
mock -> result revision Rm
issue log cursor C at session revision Rm
step -> session revision Rs > Rm, latest retained
C -> STALE_CURSOR
cursorless log -> 200 data.resultUiRevision=Rm, response.uiRevision=Rs
replay -> new result revision Rr
old log cursors -> stale
new log cursor binds mock-result:Rr and payload.uiRevision=Rr
reset -> latest=null
newest old cursor -> STALE_CURSOR before resource
cursorless -> 404
```

No cursor gets `resultUiRevision` as a separate top-level payload field.

## 14. SCN-013 repeated new mock unchanged canonical world

After a stable world revision R:

```text
mock M1 -> session revision R+1
mock M2 -> session revision R+2
```

No world mutation occurs between M1/M2.

Expected:

```text
M1 BattleResult/eventCandidates/matchId/battleSeed/finalRng
==
M2 same canonical fields

M1 sourceWorldUiRevision=R
M2 sourceWorldUiRevision=R+1 // adapter concurrency metadata
```

The differing sourceWorldUiRevision does not feed simulation RNG/MatchId or canonical battle input.

Old M1 cursors are stale after M2.

M1 same-request journal replay returns old response and does not replace current M2 latest.

## 15. SCN-014 final mixed API smoke

Run after UI-009 accepted.

Minimum sequence:

```text
GET session
GET presets
POST start
GET simulation
GET people page1
GET person detail
GET candidates
POST step
GET events
GET validation
POST mock
GET latest
GET log page1
POST step
POST replay
GET latest/log
POST reset
old cursor attempts
old completed request replays
new request contrasts
ready-start
process-restart fixture
```

At each point record:

```text
current uiRevision
operationStart uiRevision if updating
lastOperationRequestId
latest.resultUiRevision/sourceWorldUiRevision
validation next occurrence
request journal keys/status
cursor expected status
canonical world hash/projection
```

No transition may require undocumented self-heal, endpoint-local requestId namespace, journal eviction, revision-only snapshot cache, or current-world replay reconstruction.

## 16. SCN-015 client disconnect / reload / AbortSignal

Use a controllable long-running accepted step request `A`.

### disconnect after running acceptance

After `running journal + updateControl + operationStartReadSnapshot` exist, abort the client fetch / close the connection.

Expected server behavior:

```text
operation continues
running record retained while executing
updateControl retained while executing
canonical commit path continues
no rollback caused by client disconnect
no automatic second execution
```

### reload while still running

Using the same valid session cookie:

```text
GET /session
-> sessionState=updating
-> activeOperation.requestId=A
-> isUpdating=true

resend A same fingerprint
-> UPDATE_IN_PROGRESS
-> no second execution
```

### after server completion

Resend A same fingerprint:

```text
-> original HTTP status + response body bytes exact
```

The completed state/journal is the one produced by the original server execution.

### wrong retry

Send the same logical operation with a new requestId while original A is running:

```text
-> UPDATE_IN_PROGRESS
```

After A completes, a new requestId is a genuinely new operation evaluated against current revision; the client must not use it as transport-retry identity.

### process crash contrast

If the server process is actually terminated before A's final response/journal boundary, resume is not guaranteed. New process/session does not reconstruct the old running operation.

## 16. Acceptance summary

```text
SCN rows = 15
owner exact-one = 15
unassigned = 0
duplicate owner = 0

Required final status:
SCN-001..015 PASS
```
