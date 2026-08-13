# Cursor Task — Sprint 1.5 UI-000 Repo Physical Binding

対象:
Sprint 1.5 **historical/supplemental pre-binding** / accepted S01-008 physical evidence collection

Status:
`NOT FINAL UI-000 P04`

重要:
このtaskは`7c47847`のcandidate/provenance evidence収集専用であり、T01/T02/T03前提完了後のfixed repositoryへ行うfinal P04 bindingを置き換えない。
これはproduction実装タスクではない。
コード修正・commit・checkout・reset・stash・apply・別worktree作成を行わない。

## 入力

Sprint 1.5 R8 execution bundle内:

```text
S1_5_REPO_PHYSICAL_BINDING_AUDIT_0.1.0.md
S1_5_S01_008_ACCEPTED_PREBINDING_AUDIT_0.1.0.md
SPRINT_1_5_SIMPLE_SIMULATION_UI_S1.5-SPEC-0.1.14_AMENDMENT.md
UI_000_BRIDGE_AUDIT_CHECKLIST_0.2.5_AMENDMENT.md
audit-s1-5-repo-bindings.mjs
audit-s1-5-repo-bindings.ps1
```

repo:

```text
D:\xampp\htdocs\dollworld
```

accepted evidence targets:

```text
S01-008 = 7c47847
S01-007 = a39e476
```

## 実行

bundleをrepo外の任意directoryへ展開し、そのdirectoryから:

```powershell
powershell -ExecutionPolicy Bypass -File ".\audit-s1-5-repo-bindings.ps1" `
  -RepoRoot "D:\xampp\htdocs\dollworld"
```

を実行する。

このtask作成時はcurrent worktreeでS01-009作業が並行可能という前提だった。現在のproject statusを表す文ではない。
7c47847 Git objectを直接読むためcheckoutしない。final UI-000では別途P00-fixed current repository baselineへ再照合する。

## 監査

生成された:

```text
s1-5-repo-binding-evidence.json
s1-5-repo-binding-evidence.md
```

を読み、DB-001～022を1件ずつ監査する。

`machine_evidence_complete`をそのまま`matched`へ変換してはいけない。

各DBについて最低限:

```text
bindingId
semanticContractSection
actualSymbol
actualModule
actualTypeOrSchema
actualTestEvidence
actualCompletionCommit
status
notes
```

を確定する。

### matched条件

```text
exact symbol/path確認
exact type/schema確認
semantic contract一致
必要なpublic/package boundary一致
accepted test evidenceあり
accepted commit full hashあり
```

を全部満たすこと。

### DB-003 / DB-019

CAL-JAN-SYNCがacceptedでなければ:

```text
dependency_blocker
```

のままとし、推測で埋めない。

### S01-009

S01-009 comparator/helperはverification-private。

DB-018のためにproduction comparator APIを探したり新設したりしない。

DB-018ではaccepted S01-008のcanonical runtime snapshot/export sourceだけを物理bindingする。

## STOP

次の場合はproduction editを行わずSTOP report:

```text
spec_fix_required
code_fix_required
dependency_blocker
environment_blocker
```

ただし単なるmodule/pathの発見は`binding_update`でありSTOPではない。

## 禁止

```text
git checkout 7c47847
git reset
git stash
git stash drop
git apply
git commit
git worktree add
別repo/別worktreeへの実装
production source edit
spec意味論のその場発明
```

## 最終報告

```text
repo HEAD
S01-008 full commit hash
S01-007 full commit hash
worktree before/after exact equality
DB matched count
DB spec_fix_required count
DB code_fix_required count
DB dependency_blocker count
DB unresolved count

DB-001..022:
  actualSymbol
  actualModule
  actualTypeOrSchema
  actualTestEvidence
  actualCompletionCommit
  status
  notes
```

production files changedは0であること。
