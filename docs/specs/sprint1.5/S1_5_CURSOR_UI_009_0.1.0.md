# Sprint 1.5 Cursor Instruction — UI-009

- Document ID: `S1.5-CURSOR-UI-009`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.14`
- Common template: `S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`
- Implementation plan: `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`
- Implementability audit: `S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`

## 1. Mandatory task identity

```text
作業repo: D:\xampp\htdocs\dollworld
Task: UI-009
Predecessor gate: UI-008 accepted
Cursor commit: 禁止
git worktree add: 禁止
future task production implementation: 禁止
```

Production edit前にstatic spec auditとpredecessor/base commitを確認する。

## 2. Exact scope

DET-001～007 test harness、CLI/UI determinism。production endpoint/schema変更なし。

### Owned production APIs

none

### Forbidden forward work

production endpoint/schema/normalization exception。

## 3. Required binding/precondition evidence

Critical DB bindings: `DB-018`, `DB-019`

Production code rule: このtaskではproduction feature/schema/endpointを追加しない。

## 3A. Required API state transitions

Source: `S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`

Required IDs: none (this task owns no production API).

## 3B. Required cross-API scenarios

Source: `S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`

Required IDs: none.

## 4. Final evidence-owned numbered contracts

Total: **14**

### BRIDGE

- `BRIDGE-056` 0.1.14 §16A / UI-009 canonical comparison projection
- `BRIDGE-104` 0.1.14 §16A / DB-018 / CLI/UI deterministic normalization

### TX

- `TX-075` deterministic comparison authority exact

### PAGE

- none

### DET

- `DET-001` UI 1週×N vs N週
- `DET-002` UI vs CLI
- `DET-003` same seed independent sessions
- `DET-004` boundary seeds
- `DET-005` mock replay
- `DET-006` mock before/after world unchanged
- `DET-007` repeated new mock unchanged world

### MIG

- none

### FIX

- `FIX-001` seed=0
- `FIX-002` seed=4294967295
- `FIX-035` canonical simulation state同一だがsessionId/requestId/uiRevision/durationMs等が異なる2 UI session
- `FIX-089` same-seed simulationId/eventId deterministic-ID-only tamper + sequence/payload/MatchId tamper + authorized nondeterministic metadata-only difference + authority rule-set drift

### Acceptance ownership

- `ACC-011` same seed reproducibility
- `ACC-012` CLI/UI same simulation-core result
- `ACC-013` mock world unchanged determinism
- `ACC-018` 1week×N vs Nweeks
- `ACC-019` year-boundary/calendar progression
- `ACC-103` UI-009がtest-only canonical comparison projectionを使用し、UI 1週×N対N週、CLI対UI、same-seed、boundary-seed、模擬戦replay、模擬戦前後を明示projectionのcanonical JSON全文で比較し、ui...
- `ACC-104` 模擬戦replayでwire MockBattleView全文を比較せず、canonical BattleResult + pre-allocation eventCandidatesだけのMockBattleDeterminismProjectionを元実行とexact比較する。
- `ACC-154` DB-018でS01-008 canonical snapshot/exportをbindし、05/S01-009 deterministic comparison rule-setを実装。verification-private helper共用は要求せず、same-seed simulationId/EventEnvelope.eventId/sequence/payload/MatchId等を保持し、正本非決定metadataだけ除外する。

## 5. Required consumerEvidence for later-owner cross-cutting contracts

- なし。production behaviorを変更せずDET evidenceだけ追加

consumerEvidenceはcurrent task/API branchだけ。future endpointを作ってmatrixを埋めない。

## 6. Task-specific acceptance tests

- DET-001～007
- CLI/UI normalized canonical comparison
- boundary seed
- year boundary
- same-source mock replay/new mock determinism
- no production diff

加えて共通templateのstructural/success/failure/tamper/regression/full quality/static auditを実行する。

## 6A. Required fault injections

Source: `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`

Required IDs:

```text
FI-067
FI-068
FI-069
FI-070
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
対象タスク: UI-009
predecessor: UI-008 accepted
owned API IDs: none
consumerEvidence IDs/branches:
static spec audit result:
future-work violation count: 0
STOP/open blocker: none
commit: 未実施
```

## 10. Acceptance report schema

`S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`のexact field orderを使用する。
