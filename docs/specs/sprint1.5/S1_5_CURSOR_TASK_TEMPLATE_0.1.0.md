# Sprint 1.5 Cursor Task Template

- Document ID: `S1.5-CURSOR-TASK-TEMPLATE`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15`
- Applies to: `UI-001`～`UI-010`

## 1. Mandatory prompt header

Cursorへ各taskを渡すとき、冒頭へ必ず次を含める。

```text
作業repo:
D:\xampp\htdocs\dollworld

禁止:
- git worktree add
- 別clone/temp repo/copied development folder
- commit
- future taskのproduction実装
- spec未定義の仮実装
- alias/default/null fallbackで仕様差分吸収

基準:
- current accepted predecessor commitのみ
- P00/freezeで固定されたGit-reflected Sprint 1.5 authority
- S1.5-SPEC-0.1.14 frozen package copy（Git authority fileはbyte/hash一致必須）
- UI-000 accepted evidence
- proposal-only semantic/control input = 0
- S1_5_IMPLEMENTATION_PLAN_0.1.0.md
- S1_5_CONTRACT_OWNERSHIP_MANIFEST_0.1.0.md
- S1_5_ACCEPTANCE_OWNERSHIP_MANIFEST_0.1.0.md
```

## 2. Preflight before production edit

Cursorは最初に実行・報告する。

```text
1. git rev-parse --show-toplevel
2. git branch --show-current
3. git log -1 --oneline
4. git status --short
5. git worktree list
6. node verify-s1-5-spec-package.mjs <package-dir> <fixed-repository-root>
7. freeze record/hash一致確認
8. freezeのgitAuthorityHead == current HEAD / specMirrorManifestHead一致確認
9. proposal-adoption evidenceでproposal-only semantic/control input=0確認
10. Git-authority fileとfrozen package counterpartのbyte/hash一致確認
11. own task owner manifest抽出
12. required predecessor APIs/contractsのexistence確認
```

次を1件でも満たさない場合、production codeを変更せずSTOP:

- fixed repoでない
- predecessor未accepted
- repo-bound static audit failure
- base/amendment authority or freeze hash mismatch
- Git authority HEAD / specs.current manifest / freeze record mismatch
- proposal-only semantic/control input nonzero
- Git-authority fileとfrozen package counterpart不一致
- required DB binding unresolved
- own API/contract owner不一致
- SPEC_UNDEFINED
- planned testが現dependencyで実行不能

## 3. STOP report exact format

UI-001～010 STOP typeはexact4。

```text
dependency_blocker
environment_blocker
code_fix_required
spec_fix_required
```

report:

```text
STOP type: dependency_blocker | environment_blocker | code_fix_required | spec_fix_required
Task: UI-xxx
Blocking contract/API/FI IDs: ...
Higher authority: ...
Observed production symbol/module/environment: ...
Expected spec clause: ...
Exact mismatch: ...
Why current task cannot implement safely: ...
State changed before STOP: no
Production files changed before STOP: none | exact list
Staged files: none | exact list
Suggested next action: dependency | environment | Sprint1 code | spec
Re-run condition: ...
Commit performed: no
```

`binding_update`はUI-000専用finding classでありUI-001～010 STOP typeに使わない。

STOP後に仮実装を続けない。


## 4. Scope extraction

実装前にmanifestから:

```text
owned APIs
owned BRIDGE
owned TX
owned PAGE
owned DET
owned MIG
owned FIX
owned ACC
required ST
required SCN
required FI
```

を一覧化する。

owner外IDはsupporting evidenceとして読むだけで、production behaviorを変更しない。

## 5. Implementation rules

- public boundaryはunknown入力からstrict snapshot/validationを行う。
- accessor/unknown key/TOCTOU/input mutationを許さない。
- canonical sourceをUIで再計算しない。
- exact DTO key setを守る。
- failure/status/commit/RNG/journal/revision precedenceを変えない。
- deterministic ordering/comparison semanticsをUI独自に発明しない。verification-private helperの実装共用は必須にしない。
- browser/client値をcanonical sourceにしない。
- current task owner外endpointを実装しない。

## 5A. Long-run Historical non-regression

Source: `S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md`.

Current taskがHistorical subsystem ownerでない限り、archive実装を先行しない。ただし次の不可逆前提を新規production codeへ入れない。

```text
deceased hard-delete / PersonId reuse
weekly all-history iteration/full validation
archive-all snapshot clone
historical corruption = always global/whole-view failure
missing ancestry = unrelated
lossy historical mini-person as only retained truth
all-or-nothing historical blob that defeats partial read
normal-load/hot-path all-history fallback scan
traversal budget exhausted => unrelated
in-place historical repair across an open read generation
policy-expired history classified as corruption
historical control-plane corruption treated as empty archive
normal ID allocation scans all history or reuses IDs
cached valid trusted after content identity change
retention-pruned record IDs/sequences reused
old historical generation reclaimed while live reader exists / never reclaimed
historical paging silently switches generations
unchanged Current->Historical reference re-resolved/full-validated every week
rule-irrelevant payload corruption poisons kinship
checkpoint silently mixes another Historical generation
retained-save generation reclaimed early
unsupported schema treated as corruption
history-dependent write commits without required history record
stale/unbound relationship index proves not-related
post-death same-week mutation/RNG
ended relationship hard-delete/history loss
death transition scans/clones lifetime history
all historical payloads required resident in RAM
weekly whole-clone/full-validation of historical relationship/event/result prefixes
weekly archive-wide hash/canonicalization flatten/full-hash
physical storage layout/cache state changes gameplay determinism
historical semantic IDs reinterpreted with latest catalog only
checkpoint published before referenced history durability
live save survives after its historical durable pin is released
retained branch/fork root omitted from historical GC roots
stale UI salvage cache used as kinship/rule/ID authority
full audit implicitly mutates/repairs canonical history
relationship temporal lifecycle/current-history view collapsed
partial-read placeholder changes stable historical paging identity/order
unbounded Historical decode/decompression from corrupt lengths/counts
duplicate logical IDs silently resolved last-write-wins
semantic catalog/provenance GC while retained history still references it
stale maintenance generation overwrites concurrent committed history writes
checkpoint captures mixed Current/Historical commit boundaries
unpublished orphan segment treated as logical history by file presence
```

current API strict error behaviorとfuture Historical tolerant readerを混同しない。

## 6. Test layering

Owned APIごとに`S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`の同番号STを必須integration/state-transition testへする。

Taskへ割り当てられた`S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`のSCNも必須integration testへする。


最低順序:

```text
A. structural/exact schema tests
B. success boundary tests
C. failure/rollback/nonmutation tests
D. negative/tamper tests from owned FIX/MIG
E. paging/cursor tests when owned
F. determinism tests when owned
G. required FI from `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`
H. regression tests for accepted predecessor behavior
I. full npm.cmd run check
J. wiki/check if repository docs changed
K. static S1.5 spec audit
```

テストでproduction codeの未定義意味を決めない。

## 7. Negative/tamper rule

- 正常fixtureをcanonical constructor/validatorで作る。
- tamper fixtureは原則1 fieldだけ明示改ざん。
- invalid stateを最初から手書きして複数invariantを同時破壊しない。
- expected failure stage/status/state nonmutationをassertする。

## 8. No-forward-work audit

受入前にdiffを検索し:

```text
future owned API handler = 0
future feature page = 0
unplanned DTO/schema = 0
temporary compatibility alias = 0
required-contract TODO/TBD/skip = 0
```

を確認。

## 9. Required commands

プロジェクトに存在する範囲で最低:

```powershell
Set-Location "D:\xampp\htdocs\dollworld"

npm.cmd run check
npm.cmd run wiki:check
git diff --check
git status --short
git diff --cached --stat
git worktree list
```

static checkerも実行する。

## 10. Staging / commit

Cursor:

- task対象だけstage
- `_handoff-artifacts`はstageしない
- commitしない

working treeが「staged task files + untracked audit artifacts」以外なら明示報告。

## 11. Handoff artifacts

`_handoff-artifacts/`へ:

```text
dollworld-<TASK>-review.patch
dollworld-<TASK>-files.zip
dollworld-<TASK>-verification.zip
dollworld-<TASK>-SHA256.txt
```

fix cycle:

```text
-fix1
-fix2
...
```

以前のartifactを無断上書きしない。

## 12. Final Cursor report exact fields

最終reportは`S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`のfield順・STOP schema・FI evidenceを使用する。


```text
対象タスク:
作業ブランチ:
基準commit:
predecessor accepted commit:
仕様版:
owned API IDs:
owned contract IDs:

実装した内容:
変更ファイル:
追加・更新テスト:
negative/tamper tests:

実行command:
focused test result:
full quality gate result:
static spec audit result:

仕様との差異: なし | exact list
未解決事項: なし | exact list
future-work violation count:

staged files:
untracked artifacts:
working tree summary:
worktree list:
commit: 未実施
```

「仕様との差異なし」「未解決なし」は証跡を確認してから記載する。

## 13. UI-010 exception

UI-010は新production featureを実装しない。

必要修正を発見したら、その修正owner task/specへ戻す。UI-010内で場当たりfixしてfinal auditを通さない。

## 14. Cross-cutting contract rule

owned APIが、manifest ownerTaskが後段のcross-cutting contractを必要とする場合:

- current API scopeを正本どおり実装/testする
- `consumerEvidence`としてcontractId/API branch/test/evidenceを記録
- contract全体をimplemented扱いしない
- future endpointを先行実装しない

ownerTask時にconsumerEvidenceを再検証して全matrixを閉じる。


## 15. Task-specific instruction precedence

各taskでは本templateに加え`S1_5_CURSOR_UI_xxx_0.1.0.md`を必須使用する。

優先関係:

```text
Sprint 1.5 semantic spec
> task-specific instruction
> common Cursor template
```

task-specific instructionは意味仕様を上書きしない。矛盾時は`spec_fix_required`。

## 16. STOP taxonomy details

- `spec_fix_required`: semantic/contract/owner/test expectationの仕様矛盾・未定義
- `code_fix_required`: accepted upstream/predecessor codeのcontract違反
- `dependency_blocker`: predecessor/binding/readiness evidence未成立
- `environment_blocker`: runtime/tool/browser/build environment不足

preflight STOPではproduction filesを変更しない。
