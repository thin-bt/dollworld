# Sprint 1.5 Cursor Instruction — UI-001

- Document ID: `S1.5-CURSOR-UI-001`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.14`
- Common template: `S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`
- Implementation plan: `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`
- Implementability audit: `S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`

## 1. Mandatory task identity

```text
作業repo: D:\xampp\htdocs\dollworld
Task: UI-001
Predecessor gate: UI-000 accepted + post-UI-000 freeze/hash一致 + exact frozen bytes package-only/repo-bound re-audit PASS
Cursor commit: 禁止
git worktree add: 禁止
future task production implementation: 禁止
```

Production edit前にcommon template §2を実行し、少なくとも次をactual evidenceで確認する。

```text
UI-000 accepted
post-UI-000 freeze record exists
frozen spec/package/base/evidence hashes match current exact files
exact frozen bytes package-only static audit PASS
exact frozen bytes repo-bound static audit PASS
```

このrelease gateのいずれかが欠ける場合、UI-001 production edit前に`dependency_blocker`でSTOPする。

## 2. Exact scope

React/Vite/Fastify scaffold、same-origin proxy、Host/Origin primitive、common transport/envelope/client primitive、static shell。live session/domain APIなし。

### Owned production APIs

none

### Forbidden forward work

session store、sessionId/CSRF生成、simulation-core adapter、API-001～015 handler、domain page。

## 3. Required binding/precondition evidence

Critical DB bindings: none

## 3A. Required API state transitions

Source: `S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`

Required IDs: none (this task owns no production API).

## 3B. Required cross-API scenarios

Source: `S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`

Required IDs: none.

## 4. Final evidence-owned numbered contracts

Total: **0**

### BRIDGE

- none

### TX

- none

### PAGE

- none

### DET

- none

### MIG

- none

### FIX

- none

### Acceptance ownership

- none

## 5. Required consumerEvidence for later-owner cross-cutting contracts

- ACC-051 Host/Origin primitive部分をsupporting evidenceとして残す（owner UI-002、implemented化しない）

consumerEvidenceはcurrent task/API branchだけ。future endpointを作ってmatrixを埋めない。

## 6. Task-specific acceptance tests

- workspace/build/lint
- Fastify loopback boot/Host-Origin primitive unit
- React shell render/build
- client transport/envelope primitive unit
- no domain route snapshot

加えて共通templateのstructural/success/failure/tamper/regression/full quality/static auditを実行する。

## 6A. Required fault injections

Source: `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`

Required IDs:

```text
FI-001
FI-002
FI-003
FI-004
FI-005
FI-006
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
対象タスク: UI-001
predecessor: UI-000 accepted + post-UI-000 freeze/hash一致 + exact frozen bytes package-only/repo-bound re-audit PASS
owned API IDs: none
consumerEvidence IDs/branches:
static spec audit result:
future-work violation count: 0
STOP/open blocker: none
commit: 未実施
```

## 10. Acceptance report schema

`S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`のexact field orderを使用する。
