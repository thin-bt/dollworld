# Sprint 1.5 Cursor Instruction — UI-002

- Document ID: `S1.5-CURSOR-UI-002`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15`
- Common template: `S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`
- Implementation plan: `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`
- Implementability audit: `S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`

## 1. Mandatory task identity

```text
作業repo: D:\xampp\htdocs\dollworld
Task: UI-002
Predecessor gate: UI-001 accepted
Cursor commit: 禁止
git worktree add: 禁止
future task production implementation: 禁止
```

Production edit前にstatic spec auditとpredecessor/base commitを確認する。

## 2. Exact scope

API-001/002、session cookie/CSRF、process keys、UiSession/UiReadSnapshot、journal/updateControl/uiRevision、common adapter/cursor codec、presets。

### Owned production APIs

- `API-001` GET `/api/s1_5/session`
- `API-002` GET `/api/s1_5/presets`

### Forbidden forward work

API-003以降、world mutation、People/Mock/Event feature route、IsolatedMockBattleRunner。

## 3. Required binding/precondition evidence

Critical DB bindings: `DB-002`

Cursor primitive rule:

- cursor HMAC/schema/query codecはunit testで完結させる。
- People/Event/BattleLog endpointをテスト用に先行実装しない。

## 3A. Required API state transitions

Source: `S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`

Required IDs:

```text
ST-001
ST-002
```

Owned API acceptance requires all listed ST paths/retry/failure boundaries PASS.

## 3B. Required cross-API scenarios

Source: `S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`

Required IDs: none.

## 4. Final evidence-owned numbered contracts

Total: **25**

### BRIDGE

- `BRIDGE-002` preset registry
- `BRIDGE-037` request journal/lastOperation
- `BRIDGE-039` UiSessionState/UiReadSnapshot
- `BRIDGE-041` 0.1.14 §3 / normal response serializerとminimal fallback serializer
- `BRIDGE-042` 0.1.14 §4 / errorReference generator
- `BRIDGE-052` 0.1.14 §1A / apiSchemaVersion / CursorPayload schema binding
- `BRIDGE-076` 0.1.14 §4.2 / server errorReference allocator
- `BRIDGE-085` 0.1.14 §3C / API envelope complete types
- `BRIDGE-088` 0.1.14 §1C.6 / StableErrorCode binding
- `BRIDGE-094` 0.1.14 §10G.4 / cursor authentication precedence
- `BRIDGE-100` 0.1.14 §4A / UiSession CSPRNG lifecycle
- `BRIDGE-111` 0.1.14 §4B / process cursor security keys

### TX

- `TX-059` StableErrorCode exact binding
- `TX-065` cursor HMAC-before-schema classification
- `TX-071` UiSession CSPRNG failure / atomic registration
- `TX-082` process cursor security keys

### PAGE

- `PAGE-010` cursor HMAC/auth precedence

### DET

- none

### MIG

- `MIG-001` API apiSchemaVersion="0.1.0"
- `MIG-002` CursorPayload 0.1.0
- `MIG-035` API envelopeを旧0.1.0 shapeのまま一部拡張
- `MIG-036` UiReadSnapshot 0.1.0がRunInitializationSnapshotを保持しない

### FIX

- `FIX-031` current HMAC keyで正しく署名された旧CursorPayload 0.1.0。schema binding mismatch専用
- `FIX-079` bad-HMAC payloads claiming old/current/unknown schema + valid-HMAC old/current/incompatible/stale variants
- `FIX-085` session ID attempt1/2/3 collision patterns + retry exhaustion + CSRF fault + existing-session no-rotation + transport fault
- `FIX-096` process cursorHmac/binding key independent generation + purpose swap/reuse + startup failure + reset/new-session no-rotation

### Acceptance ownership

- `ACC-051` session cookie/CSRF/Host/Origin/no-store
- `ACC-052` strict body/query validation
- `ACC-059` preset immutable registry
- `ACC-083` 通常response serializer失敗時に独立minimal fallback serializerが使用され、秘密情報・stack・任意Error.messageを返さない。
- `ACC-085` `errorReference`がPOSTではrequestId、GET等ではsimulation非依存process-local sourceから生成され、simulation RNGを消費しない。
- `ACC-086` failure responseの`refreshRequired`がtop-level必須、ApiError内禁止、success responseではfield自体禁止である。
- `ACC-099` S1.5-SPEC-0.1.14の全success/failure responseおよびCursorPayloadが`apiSchemaVersion="0.2.0"`へ同期し、署名済み旧0.1.0 cursorをcurrent 0.2.0 processへ渡した場合は改ざん400ではなく4...
- `ACC-126` GET等の`server:` errorReference用serverInstanceIdがHTTP bind前にOS CSPRNGから1回だけ生成・検証され、生成失敗はprocess startup failure、counter枯渇はwrap/fallbackなしのprocess-fat...
- `ACC-135` API success/failure envelopeが0.2.0 exact5/exact6へ固定され、ApiError allowed8 keyのpresence matrix、uiRevision/isUpdating、refreshRequired、errorReference、co...
- `ACC-144` Cursor検証が第1base64url segmentのASCII bytesそのものをHMAC-SHA-256署名対象とし、constant-time認証成功後にだけpayload decode/canonical JSON/schema/semantic分類を行う。known-old 0...
- `ACC-150` 新規UiSessionがsession IDをOS CSPRNG 32 bytesから最大3 attemptsでunique確定し、既存ID衝突時は保存前に再生成、3回全衝突で500 INTERNAL_ERROR noneとなる。unique ID確定後に独立CSRF 32 bytesを生成し...
- `ACC-161` cursorHmacKeyとsessionBindingKeyがprocess起動時に別purposeのOS CSPRNG 256bit以上keyとして生成され、cursor署名とsessionBindingHashへ用途分離され、per-session生成・reset時rotation・CS...

## 5. Required consumerEvidence for later-owner cross-cutting contracts

- TX-078/BRIDGE-107のAPI-001/002 GET failure=none branchをconsumerEvidence化
- BRIDGE-115のsession/common envelopeに関係するbranchだけconsumerEvidence化

consumerEvidenceはcurrent task/API branchだけ。future endpointを作ってmatrixを埋めない。

## 6. Task-specific acceptance tests

- session create/reuse/CSPRNG collision
- CSRF/Origin/Host/no-store
- journal/updateControl/uiRevision unit
- cursor HMAC/schema unit（future endpoint不要）
- API-001/002 integration

加えて共通templateのstructural/success/failure/tamper/regression/full quality/static auditを実行する。

## 6A. Required fault injections

Source: `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`

Required IDs:

```text
FI-007
FI-008
FI-009
FI-010
FI-011
FI-012
FI-013
FI-014
FI-015
FI-016
FI-017
FI-018
FI-019
FI-020
```

受入条件:

```text
required FI missing = 0
required FI FAIL = 0
```

各FIについてtest path / injection point / expected / actual / provider call count / state-RNG-ID evidenceをreportへ記録する。

## 7. STOP conditions

次のいずれかならproduction code変更前/追加変更前にSTOP:

- `spec_fix_required`: semantic/owner/acceptance/test expectationが矛盾または未定義
- `code_fix_required`: accepted upstream/predecessor codeがhigher-authority contract違反
- `dependency_blocker`: predecessor、required DB binding、UI-000 readiness evidenceが未成立
- `environment_blocker`: fixed repo、Node/npm/browser/tool/build環境不足で証明不能

STOP後に仮実装・alias・fallback・future endpoint追加で回避しない。


STOP exact4:

```text
dependency_blocker
environment_blocker
code_fix_required
spec_fix_required
```

## 8. No-forward-work assertions

```text
future owned API handler count = 0
future feature page count = 0
unplanned endpoint/schema count = 0
temporary compatibility alias count = 0
required-contract TODO/TBD/skip count = 0
```

## 9. Handoff

共通templateのfinal report fieldsを全件埋める。特に:

```text
対象タスク: UI-002
predecessor: UI-001 accepted
owned API IDs: API-001, API-002
consumerEvidence IDs/branches:
static spec audit result:
future-work violation count: 0
STOP/open blocker: none
commit: 未実施
```

## 10. Acceptance report schema

`S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`のexact field orderを使用する。
