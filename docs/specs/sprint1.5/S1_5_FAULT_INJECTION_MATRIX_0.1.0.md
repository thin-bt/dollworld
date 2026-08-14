# Sprint 1.5 Fault Injection Matrix

- Document ID: `S1.5-FAULT-INJECTION-MATRIX`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15`
- Scope: UI-001～UI-010 acceptance-time failure injection
- Rule: fault provider/test hookはtest-only。production behaviorへdebug branchを残さない。

## 1. Coverage

```text
FI count = 76
UI-001: FI-001..FI-006 (6)
UI-002: FI-007..FI-020 (14)
UI-003: FI-021..FI-032 (12)
UI-004: FI-033..FI-038 (6)
UI-005: FI-039..FI-046 (8)
UI-006: FI-047..FI-056 (10)
UI-007: FI-057..FI-061 (5)
UI-008: FI-062..FI-066 (5)
UI-009: FI-067..FI-070 (4)
UI-010: FI-071..FI-076 (6)
```

全FIはowner task受入で最低1回実行し、expected status/state/RNG/journal/revision invariantをassertする。
UI-010ではFI実行証跡の欠落0を確認する。

## 2. Injection matrix

| FI | Owner | Target | Injection | Required result | Contract anchor |
|---|---|---|---|---|---|
| FI-001 | UI-001 | HTTP Host validation | Host header不正/非loopback | 403 REQUEST_FORBIDDEN。uiRevision=null/isUpdating=false、app/server state mutationなし | Host/Origin security primitive |
| FI-002 | UI-001 | Origin validation | state-changing POSTへmissing/foreign Origin | 403 REQUEST_FORBIDDEN。valid session確立後ならその時点のuiRevision/isUpdating metadataを使用し、body/domain処理へ進まない | Host/Origin security primitive |
| FI-003 | UI-001 | Malformed JSON framing | invalid JSON / oversized body | INVALID_REQUEST。feature handler未到達 | common request parser |
| FI-004 | UI-001 | Success serializer strictness | unknown/undefined/accessorをsuccess DTOへ注入 | commit前serializer/schema failure | common success envelope |
| FI-005 | UI-001 | Failure serializer strictness | invalid ApiError shapeをnormal failure mapperへ注入 | minimal fallbackへ移行しrecursive failureしない | common failure envelope |
| FI-006 | UI-001 | Client transport decode | malformed/non-schema API responseをbrowser clientへ注入 | UIが成功扱いせずcontrolled error。domain state推測禁止 | browser API client |
| FI-007 | UI-002 | Session ID collision attempt1 | existing sessionIdとcandidate1衝突、candidate2 unique | 2回目で成功。既存session上書きなし | TX-071 |
| FI-008 | UI-002 | Session ID collision exhaustion | 3 candidateすべて衝突 | 500 INTERNAL_ERROR none、attempt4なし | TX-071 |
| FI-009 | UI-002 | Session CSPRNG failure | sessionIdまたはCSRF generator throw | 500 none、cookie/session/journal/worldなし | TX-071 |
| FI-010 | UI-002 | Process cursor key startup failure | cursorHmacKey/sessionBindingKey生成または長さ検証失敗 | listener bind前startup failure | TX-082 |
| FI-011 | UI-002 | New-session response/registration boundary | new session DTO serializer fault、Set-Cookie builder fault、またはprebuilt response完成後store insert throwを個別注入 | serializer/header faultはstore前500・session row/Set-Cookieなし。store insert faultもpartial row/Set-Cookieなし | §4A.2 |
| FI-012 | UI-002 | Existing session bootstrap read / invalid-query with RNG provider failure | 有効idle/updating sessionのGET /session正常系と`?x=1` invalid queryでCSPRNG providerをthrow設定 | 正常GETは成功。invalid queryは400だがexisting session metadata revision/isUpdatingを保持。全case不要CSPRNG呼出し0・session/CSRF rotation0 | §4A.4 / §5A.2 |
| FI-013 | UI-002 | CSRF mismatch | valid session + invalid csrfToken | 403 REQUEST_FORBIDDEN。journal lookup/予約/domain処理なし | common POST precedence |
| FI-014 | UI-002 | Request journal lookup infrastructure failure | valid POSTでjournal lookup provider throw before acceptance | server: errorReference、journal新規recordなし | TX-077 |
| FI-015 | UI-002 | Request journal write failure before mutation | accepted requestのcompleted failure/success journal確定前にstore throw | state commit境界契約どおりnoneまたはatomic abort | request journal atomicity |
| FI-016 | UI-002 | Cursor bad HMAC with forged old schema | 署名不正payloadがold apiSchemaVersionを主張 | 400 INVALID_REQUEST。STALEへしない | TX-065 |
| FI-017 | UI-002 | Cursor noncanonical dataIdentity | valid HMAC + mock-result:01等 | 400 INVALID_REQUEST | §10G.1A |
| FI-018 | UI-002 | UiSession/UiReadSnapshot corruption boundary | authentic cookieのserver-side UiSession rowをstrict-invalid化するcaseと、snapshot生成後に元session nested objectを書換えるcaseをtest-only tamper | corrupt UiSessionは500・uiRevision=null/isUpdating=false・401/self-heal/new session化禁止。valid snapshotは元session後変更から不変、共有mutableならFAIL | §5A.1/§5A.2 / TX-081 |
| FI-019 | UI-002 | Normal failure serializer failure | normal INTERNAL_ERROR mapper/serializerを故障 | minimal fallback exact-safe primitiveのみで500 | TX-018 |
| FI-020 | UI-002 | Minimal fallback serializer fatal | fallback serializer自体を故障 | recursive envelopeを作らずprocess/runtime fatal扱い | TX-018/019 |
| FI-021 | UI-003 | Start facade precommit throw | start domain/facadeがcandidate構築中throw | 500 INTERNAL_ERROR none、old state exact | atomic start |
| FI-022 | UI-003 | Start success serializer failure | new world完成後、success DTO serialization throw before commit | 500 none、new world/revision/lastOperation未commit | TX-085 |
| FI-023 | UI-003 | Ready-start transport failure after atomic commit | success state+journal commit後socket write失敗 | rollbackなし。same requestIdでsaved 200 exact replay | TX-085 |
| FI-024 | UI-003 | Reset precommit throw | saved RunInitializationSnapshot 0.2.0（sidecar payload含む）から再構築中throw | 500 none、old world/latest/validation/revision exact | TX-079 |
| FI-025 | UI-003 | Reset transport failure after atomic commit | reset success commit後transport失敗 | reset state保持。saved 200 replay | TX-085 |
| FI-026 | UI-003 | Step first-week internal failure | week1 commit前provider throw | 500 none、committedWeeks fieldなし | TX-073 |
| FI-027 | UI-003 | Step middle-week internal failure | N>=3、week K+1でthrow | 500 partial、committedWeeks=K、revision=accepted+K | TX-073 |
| FI-028 | UI-003 | Step final-response failure after all week commits | N週全部commit後final mapper/serializer throw | 500 complete、committedWeeks=N、lastOperation旧success | TX-073/070 |
| FI-029 | UI-003 | Failed week validation draft | failed weekがValidationResultを生成後rollback | failed-week validation store非保存・occurrence非消費 | TX-028/090 |
| FI-030 | UI-003 | uiRevision capacity exhausted | MAX_SAFE_INTEGER境界でmutation | 前段validation後500 none、RNG/ID/week実行0 | TX-072 |
| FI-031 | UI-003 | Capacity + domain invalid collision | capacity不足かつdomain validation failure | domain error優先、capacity 500で上書きしない | TX-072 |
| FI-032 | UI-003 | ValidationStore commit provider fault | world/week candidate完成後validation store commit境界でthrow | atomic week commit契約どおり全体rollback/partial classification | TX-090 |
| FI-033 | UI-004 | Current-source People record corruption | archive activation前のPerson/Sprint1PersonState strict invalid | current GET people 500。Historical future partial-list testではない | TX-046 / HIST-025..030 |
| FI-034 | UI-004 | Mock candidate canonical corruption | 候補personのrequired battle adapter input破損 | 500 INTERNAL_ERROR。eligible=falseへ落とさない | TX-045 |
| FI-035 | UI-004 | Stale list cursor | valid signed old uiRevision cursor | 409 STALE_CURSOR refreshRequired=true | TX-058 |
| FI-036 | UI-004 | Invalid cursor nextPosition | signed cursorのpositionがsource/domain外 | INVALID_REQUESTまたはSTALEの正本分類。skip/clip禁止 | PAGE/TX-041 |
| FI-037 | UI-004 | Cursor query mismatch | same kind valid cursor + current effective query差 | 409 STALE_CURSOR | TX-043/058 |
| FI-038 | UI-004 | Projection serializer fault | list items完成後response serializer throw | GET 500 none。source state不変 | GET failure contract |
| FI-039 | UI-005 | Current-source relationship broken reference | archive activation前のcurrent Sprint1 sourceでparent/master counterpart不存在 | current PersonDetail全体500。Historical readerの将来local degradation testではない | TX-064 / HIST-025..030 |
| FI-040 | UI-005 | Current-source relationship duplicate/cycle corruption | archive activation前のcanonical relationship validator failure | current PersonDetail 500。Historical readerでは別versioned tolerant contractを使用 | TX-064 / HIST-025..030 |
| FI-041 | UI-005 | Technique duplicate state | 同一TechniqueId state重複 | 500。dedupe禁止 | TX-069 |
| FI-042 | UI-005 | Dangling learning focus | focus TechniqueIdがheld/catalogへ存在しない | 500。null補正禁止 | TX-069 |
| FI-043 | UI-005 | statHistory foreign producer | training.stat_growth_appliedだがDB-011以外sourceProcessor | PersonDetail 500。eventType名だけで採用禁止 | §6C/TX-074 |
| FI-044 | UI-005 | TrainingHistory missing/duplicate anchor | weekly groupにaction_selected 0件または複数 | 500。任意first選択禁止 | TX-024/060 |
| FI-045 | UI-005 | TrainingHistory foreign effect producer | 同person/weekの別processor technique/stat event | history groupへ混入しない | TX-074 |
| FI-046 | UI-005 | Temporary condition bounds corruption | fatigue/injury/condition/confidence範囲外 | 500。clamp禁止 | TX-049 |
| FI-047 | UI-006 | Mock same participant | A==B | 400 INVALID_REQUEST conflicting_fields、RNG/MatchId消費0 | TX-066 |
| FI-048 | UI-006 | Mock pre-start failure | Sprint1 facade pre_start_failure | 422 BATTLE_PRE_START_FAILURE、latest/revision不変 | mock pre-start contract |
| FI-049 | UI-006 | Post-start execution abort | prepare/resolve/finalize/build plan dependency/invariant abort | 500 INTERNAL_ERROR none、result/events/latest保存なし | TX-017 |
| FI-050 | UI-006 | Mock success serializer failure | candidate latest/result完成後success serialization throw before commit | 500 none、latest/revision/lastOperation不変 | TX-085 |
| FI-051 | UI-006 | Mock transport failure after atomic commit | latest+journal success commit後transport失敗 | rollbackなし、same request saved 200 replay | TX-085 |
| FI-052 | UI-006 | Replay checkpoint corruption | saved checkpoint/hash/cross-binding tamper | 500 INTERNAL_ERROR、self-heal/delete/reconstruct current禁止 | TX-020/033 |
| FI-053 | UI-006 | Replay after world advance/current ineligible | current person retired/deceased等へ変化 | saved checkpointだけでoriginal result exact replay | TX-076 |
| FI-054 | UI-006 | Mock latest hash mismatch | latestRecordHash/replaySnapshotHash tamper | GET latest/replay 500、latest削除禁止 | TX-025 |
| FI-055 | UI-006 | A/B swap tamper | result/event/viewのside assignment入替 | 500 integrity failure | TX-066 |
| FI-056 | UI-006 | Repeated new mock unchanged world | 同world/ordered A-Bで2回new mock | BattleResult/events/seed/matchId/finalRng exact一致 | TX-067 |
| FI-057 | UI-007 | Battle actionLogs corrupt item | actionLogs entry strict invalid | GET log 500、bad item skip禁止 | TX-021 |
| FI-058 | UI-007 | Battle log old cursor after normal step | latest保持、session uiRevision進行 | old cursor 409 STALE、cursorless logは同latestで200 | TX-087 |
| FI-059 | UI-007 | Battle log result identity mismatch | cursor dataIdentity result revision != latest | 409 STALE_CURSOR | TX-087 |
| FI-060 | UI-007 | Battle log cursor after reset/start clear | authenticated old cursor + latest=null | cursor-before-resourceで409 STALE、cursorlessは404 | TX-080/084 |
| FI-061 | UI-007 | BattleLog wrapper revision confusion | envelope uiRevision > data.resultUiRevisionとなるstep後 | 正常200。等値強制禁止 | TX-088/089 |
| FI-062 | UI-008 | EventEnvelope corruption | canonical event schema/payload invalid | GET events 500。bad event skip禁止 | TX-053 |
| FI-063 | UI-008 | Event person filter payload spoof | payloadにpersonIdあるがentities.personIdsにない/逆 | filterはentities.personIdsだけ | event filter contract |
| FI-064 | UI-008 | Validation occurrence gap | store items occurrence欠番/next不整合 | GET validation 500。sort/renumber補正禁止 | TX-090 |
| FI-065 | UI-008 | Validation issue schema corruption | issue unknown/missing key | GET validation 500 | TX-054 |
| FI-066 | UI-008 | Old event/validation cursor after reset | signed old cursor、new revision/store | 409 STALE_CURSOR | TX-080 |
| FI-067 | UI-009 | Same-seed deterministic ID drift | same-seed independent runでsimulationIdまたはEventEnvelope.eventIdだけを1箇所変更 | deterministic comparison must FAIL。IDを非決定扱いして除外しない | TX-075 |
| FI-068 | UI-009 | Deterministic payload tamper | event sequence/payload/MatchId/person/RNGを1箇所変更 | normalized projection must differ | TX-075 |
| FI-069 | UI-009 | Mock determinism adapter metadata drift | uiRevision/requestId/latest hashだけ差 | battle determinism projection exact equal | TX-067/DET-007 |
| FI-070 | UI-009 | Determinism authority rule-set drift | UI側だけauthorized exclusionを増減、またはverification-private helper実体の共用を必須化するtamper | authority rule-set差はFAIL/spec_fix_required。helper implementation identityそのものはassertしない | TX-075 |
| FI-071 | UI-010 | Ownership manifest missing row | API/contract/acceptance owner行を1件削除 | static/final audit FAIL | GATE-015 |
| FI-072 | UI-010 | Ownership duplicate | API IDまたはacceptance owner重複 | audit FAIL | GATE-015 |
| FI-073 | UI-010 | Artifact SHA mismatch | verification ZIP/fileを1byte改変 | final acceptance FAIL | artifact audit |
| FI-074 | UI-010 | Future/forbidden staged file | accepted task外production route/feature fileがstage | no-forward-work audit FAIL | UI-010 final audit |
| FI-075 | UI-010 | Migration implementationStatus incomplete | MIG rowがnot_started/ready-only | UI-010 FAIL | MIG final gate |
| FI-076 | UI-010 | Unused required FIX fixture | FIX materialized but never used | UI-010 FAIL、unused=0 requirement | FIX final gate |

## 3. Fault-hook rules

- provider injectionはconstructor/dependency parameter/test harnessで行い、environment variable隠し挙動をproductionへ残さない。
- fault発生回数をassertできるspy/counterを使用する。
- RNG/MatchId/Event allocationを「消費していない」契約ではprovider call count/state snapshotもassertする。
- transport failureはHTTP application mapperのthrowで代用せず、atomic commit後write段階を明確に故障させる。
- serializer failureは通常serializerとminimal fallbackを別hookとして故障可能にする。
- corruption FIは正規constructorを迂回したtest-only tamperで作り、production constructorへinvalid input APIを追加しない。
- same request replay FIは1回目response body bytesを保存し、2回目HTTP status + body bytes exact equalityを比較する。非決定的transport headerはexact equality対象外。stable API header contractは別assertする。

## 4. Acceptance evidence

各FIについてCursor reportへ次を記録する。

```text
FI ID
test path/name
injection point/provider
provider call count
expected result
actual result
state before hash/snapshot
state after hash/snapshot
RNG/ID/event allocation evidence when applicable
PASS|FAIL
```

UI-010: FI-001～076 evidence missing=0 / FAIL=0。
