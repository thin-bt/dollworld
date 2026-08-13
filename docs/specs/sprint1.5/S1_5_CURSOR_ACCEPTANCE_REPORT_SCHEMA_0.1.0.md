# Sprint 1.5 Cursor Acceptance Report Schema

- Document ID: `S1.5-CURSOR-ACCEPTANCE-REPORT`
- Version: `0.1.0`
- Applies to: UI-001～UI-010
- Cursor may stage reviewed task files, but MUST NOT commit.

## 1. Exact report order

```text
task:
branch:
base commit:
predecessor accepted commit:
spec version:
implementation plan version:
cursor instruction version:

owned API IDs:
final evidence-owned BRIDGE IDs:
final evidence-owned TX IDs:
final evidence-owned PAGE IDs:
final evidence-owned DET IDs:
final evidence-owned MIG IDs:
final evidence-owned FIX IDs:
acceptance IDs:
consumerEvidence IDs:
required ST IDs:
required SCN IDs:
required FI IDs:

preflight:
  fixed repository:
  normal branch:
  no worktree/copy repo:
  package-only static spec audit:
  repo-bound static spec audit:
  base authority:
  amendment authority:
  git authority HEAD:
  specs.current manifest HEAD:
  proposal-adoption evidence:
  proposal-only semantic/control input count:
  Git-authority/frozen-package byte-hash match:
  freeze record/hash:
  open STOP:
  SPEC_UNDEFINED:
  required DB bindings:
  historical architecture non-regression: PASS | FAIL
  isolatedRunnerDecision: n/a | required | not_required

implemented:
changed files:
added/updated tests:
fault injection tests:
negative/tamper tests:
regression tests:
consumerEvidence completed:

commands:
targeted tests:
full quality gate:
static spec audit:
no-forward-work audit:

test results:
FI results:
ST results:
SCN results:
owned contract results:
acceptance results:

git status --short:
staged files:
unstaged tracked files:
untracked artifacts:
git diff --cached --stat:
git worktree list:

artifacts:
  review patch:
  files zip:
  verification zip:
  SHA256:

spec differences: none | exact list
code differences: none | exact list
dependency blockers: none | exact list
environment blockers: none | exact list
unresolved: none | exact list

commit performed: no
```

## 2. STOP report

Task開始後にSTOPする場合も曖昧な自由文だけにしない。

```text
task:
STOP type: dependency_blocker | environment_blocker | code_fix_required | spec_fix_required
blocking contract/API/FI:
higher authority:
expected:
actual evidence:
files inspected:
production files changed before discovery:
staged files:
why safe continuation is impossible:
required next action:
re-run condition:
commit performed: no
```

`binding_update`はUI-000専用finding classでありUI-001～010 STOP typeへ使用しない。

## 3. FI results

`required FI IDs`は`S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`のowner task割当とexact一致。

各FI:

```text
FI-xxx:
  test:
  injection:
  expected:
  actual:
  provider calls:
  state/RNG/ID evidence:
  result: PASS
```

missing/skip/TODOは受入不可。

## 4. no-forward-work audit

必須0:

```text
future owned API handler count
future feature page count
unplanned endpoint/schema count
temporary compatibility alias count
required-contract TODO/TBD/skip count
worktree/copy-repo count
```

shared primitiveのconsumerEvidenceはproduction future endpoint implementationに数えない。

## 5. Artifact integrity

`_handoff-artifacts/`はstageしない。

SHA256はreview patch/files zip/verification zipへ最低限付与し、report記載値と実ファイルを再検証する。

## 6. Acceptance rule

次が1件でも成立しなければ「実装完了」と報告しない。

- required FI missing/FAIL
- owned acceptance未証明
- full quality gate FAIL
- package-only/repo-bound static audit FAIL
- base/amendment authority/freeze hash mismatch
- Git authority HEAD / specs.current manifest / freeze record mismatch
- proposal-only semantic/control input nonzero
- Git-authority/frozen-package byte-hash mismatch
- forward-work violation
- unexpected unstaged tracked change
- worktree/copy repo
- spec/code/dependency/environment blocker
- unresolved nonzero
- historical architecture non-regression FAIL
