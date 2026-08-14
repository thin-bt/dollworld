# Sprint 1.5 Cursor Instruction — UI-004

- Document ID: `S1.5-CURSOR-UI-004`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15`
- Common template: `S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`
- Implementation plan: `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`
- Implementability audit: `S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`

## 1. Mandatory task identity

```text
作業repo: D:\xampp\htdocs\dollworld
Task: UI-004
Predecessor gate: UI-003 accepted
Cursor commit: 禁止
git worktree add: 禁止
future task production implementation: 禁止
```

Production edit前にstatic spec auditとpredecessor/base commitを確認する。

## 2. Exact scope

API-007/011、People list、Mock candidates、People/Candidate paging/query/cursor branches。

### Owned production APIs

- `API-007` GET `/api/s1_5/people`
- `API-011` GET `/api/s1_5/mock-battles/candidates`

### Forbidden forward work

PersonDetail、new mock/replay/latest、battle execution、Event/Validation route。

## 3. Required binding/precondition evidence

Critical DB bindings: `DB-002`, `DB-004`, `DB-008`

## 3A. Required API state transitions

Source: `S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`

Required IDs:

```text
ST-007
ST-011
```

Owned API acceptance requires all listed ST paths/retry/failure boundaries PASS.

## 3B. Required cross-API scenarios

Source: `S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`

Required IDs: none.

## 3C. Long-run Historical compatibility

- UI-004でHistorical archive/list partial-read schemaを先行実装しない。
- current People list 0.2.0 strict behaviorはcurrent monolithic sourceに限定。
- mock candidate sourceへ「全deceased/historyを毎回strict validateしてからfilterする」前提を共通helperとして固定しない。
- 将来partition後はactive candidate indexからeligible sourceを読む設計へ置換可能であること。

## 4. Final evidence-owned numbered contracts

Total: **10**

### BRIDGE

- `BRIDGE-018` battle eligibility
- `BRIDGE-074` 0.1.14 §7A.1 / Mock candidate exact eligibility

### TX

- `TX-023` apiSchemaVersion / old cursor migration
- `TX-045` Mock candidate exact predicate / corruption distinction

### PAGE

- `PAGE-001` people cursor/sort/filter
- `PAGE-002` mock candidates cursor

### DET

- none

### MIG

- `MIG-018` Mock candidateで参加不可reasonを表示する余地

### FIX

- `FIX-003` population/person filter 0/1/2
- `FIX-004` mock candidates 0/1/2+
- `FIX-040` mock candidate eligibility: trainee 7/8/15/16、active 15/16/41/42、life/participation/career/injury境界

### Acceptance ownership

- `ACC-124` MockBattle候補GETがcanonical source/semantics破損を500として候補外と区別し、validated sourceに対してliving+active+mock career/age+injury閾値のexact predicateだけでmembershipを...

## 5. Required consumerEvidence for later-owner cross-cutting contracts

- PAGE-007/008/009のPeople/Candidate branch
- TX-041/043/055/058/078のPeople/Candidate branch
- BRIDGE-067/107のPeople/Candidate GET branch

consumerEvidenceはcurrent task/API branchだけ。future endpointを作ってmatrixを埋めない。

## 6. Task-specific acceptance tests

- People filtering/sort/paging
- candidate exact predicate/corruption distinction
- cursor stale/default query branches
- no mock execution assertion

加えて共通templateのstructural/success/failure/tamper/regression/full quality/static auditを実行する。

## 6A. Required fault injections

Source: `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`

Required IDs:

```text
FI-033
FI-034
FI-035
FI-036
FI-037
FI-038
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
対象タスク: UI-004
predecessor: UI-003 accepted
owned API IDs: API-007, API-011
consumerEvidence IDs/branches:
static spec audit result:
future-work violation count: 0
STOP/open blocker: none
commit: 未実施
```

## 10. Acceptance report schema

`S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`のexact field orderを使用する。
