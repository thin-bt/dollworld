# Sprint 1.5 Cursor Instruction — UI-007

- Document ID: `S1.5-CURSOR-UI-007`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.14`
- Common template: `S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`
- Implementation plan: `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`
- Implementability audit: `S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`

## 1. Mandatory task identity

```text
作業repo: D:\xampp\htdocs\dollworld
Task: UI-007
Predecessor gate: UI-006 accepted
Cursor commit: 禁止
git worktree add: 禁止
future task production implementation: 禁止
```

Production edit前にstatic spec auditとpredecessor/base commitを確認する。

## 2. Exact scope

API-015 battle log paging/presentation。UI-006 latest/detailedLogをread-only消費。

### Owned production APIs

- `API-015` GET `/api/s1_5/mock-battles/latest/log`

### Forbidden forward work

API-009/010 Event/Validation route、new production mock semantics。

## 3. Required binding/precondition evidence

Critical DB bindings: `DB-014`

## 3A. Required API state transitions

Source: `S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`

Required IDs:

```text
ST-015
```

Owned API acceptance requires all listed ST paths/retry/failure boundaries PASS.

## 3B. Required cross-API scenarios

Source: `S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`

Required IDs:

```text
SCN-012
```

All assigned cross-operation state/retry/cursor/journal assertions must PASS.

## 4. Final evidence-owned numbered contracts

Total: **21**

### BRIDGE

- `BRIDGE-023` action log
- `BRIDGE-046` 0.1.14 §11 / BattleResult.detailedLog.actionLogs
- `BRIDGE-047` 0.1.14 §12 / BattleActionLog -> BattleLogItemView 0.2.0
- `BRIDGE-097` 0.1.14 §13C / MockBattleView raw-result prohibition
- `BRIDGE-116` 0.1.14 §10G.2 / battle-log cursor dual binding
- `BRIDGE-117` 0.1.14 §10F/§13C / Mock result/log wire boundary

### TX

- `TX-021` Battle log cursor / actionLogs revision
- `TX-087` battle-log cursor result identity + uiRevision
- `TX-088` Mock result/log wire boundary

### PAGE

- `PAGE-005` battle log sourceIndex cursor
- `PAGE-013` battle-log cursor lifetime
- `PAGE-014` BattleLog response identity

### DET

- none

### MIG

- `MIG-010` Battle log sourceをdetailedLog.length相当で扱う余地
- `MIG-011` BattleLog actionKind
- `MIG-012` BattleLog rngDisplay
- `MIG-013` BattleLog reasonText

### FIX

- `FIX-008` battle log 0/100/101/200/201
- `FIX-024` DetailedLog `{turnOrderLogs, actionLogs}`。両配列countが異なる正常fixture
- `FIX-025` `requestedAction != resolvedAction`かつ`replacementReason != null`
- `FIX-101` battle-log cursor before normal step + retained latest/new uiRevision + updating operationStart snapshot + fresh cursor + new mock/reset clear
- `FIX-102` large MockBattle detailedLog + exact34 latest view + exact4 log wrapper + normal step causing envelope uiRevision > resultUiRevision + raw-result injection

### Acceptance ownership

- `ACC-008` readable battle log
- `ACC-094` mock battle log endpointが`BattleResult.detailedLog.actionLogs`だけをpage sourceとし、turnOrderLogsを暗黙joinしない。
- `ACC-095` BattleLogItemViewがrequestedActionとresolvedActionを区別し、置換前TechniqueIdを実行技として表示しない。
- `ACC-147` MockBattleView 0.2.0はBattleResult全文をraw fieldとして返さずexact34を維持し、表示に必要なconvenience fieldはvalidated BattleResultからdirect mapping、詳細action logは`GET /mo...
- `ACC-166` battle-log cursorが0.1.13正本どおり結果revisionを`dataIdentity="mock-result:<resultUiRevision>"`の1か所だけに保持し、全cursor共通`payload.uiRevision`には発行元fixed UiReadSna...
- `ACC-167` MockBattleViewへraw BattleResult全文を埋め込む途中変更を撤回しexact34へ戻し、BattleLogListDataViewは0.1.13正本の`resultUiRevision`を保持するexact4へ復元する。これにより詳細logは専用paging endp...

## 5. Required consumerEvidence for later-owner cross-cutting contracts

- PAGE-007/008/009のBattleLog branch
- TX-041/043/055/058/078のBattleLog branch
- BRIDGE-067/107のBattleLog GET branch

consumerEvidenceはcurrent task/API branchだけ。future endpointを作ってmatrixを埋めない。

## 6. Task-specific acceptance tests

- actionLogs-only source
- BattleLog exact40
- wrapper exact4 resultUiRevision
- sourceIndex cursor
- step-retained latest old cursor stale
- large log paging

加えて共通templateのstructural/success/failure/tamper/regression/full quality/static auditを実行する。

## 6A. Required fault injections

Source: `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`

Required IDs:

```text
FI-057
FI-058
FI-059
FI-060
FI-061
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
対象タスク: UI-007
predecessor: UI-006 accepted
owned API IDs: API-015
consumerEvidence IDs/branches:
static spec audit result:
future-work violation count: 0
STOP/open blocker: none
commit: 未実施
```

## 10. Acceptance report schema

`S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`のexact field orderを使用する。
