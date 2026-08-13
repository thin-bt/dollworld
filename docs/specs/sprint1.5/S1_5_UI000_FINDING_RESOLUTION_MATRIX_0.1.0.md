# Sprint 1.5 UI-000 Finding Resolution Matrix

- Document ID: `S1.5-UI000-FINDING-RESOLUTION`
- Version: `0.1.0`
- Target: UI-000 only
- Purpose: Sprint 1完成コード照合時の「何を直すべきか」をCursorへ判断させない。

## 1. Finding classes

| Class | Meaning | UI-000内で可能な処置 | Production edit | UI-001へ進める条件 |
|---|---|---|---|---|
| `binding_update` | semanticは一致し、symbol/module/path/version/test location等の物理事実だけが想定と違う | DB/BRIDGE evidenceをactualへ更新 | 原則不要 | 更新後matched |
| `dependency_blocker` | predecessor/required artifact/bindingが未完成で判定不能 | blockerを記録して停止 | 不可 | dependency解消後UI-000再実行 |
| `environment_blocker` | Node/browser/OS/tool/runtime等の実行環境不足 | 環境条件を修復 | production code変更で回避禁止 | same auditを正常環境で再実行 |
| `code_fix_required` | higher-authority semanticは明確だがSprint 1完成コードが満たさない | exact code conflict/evidenceを報告 | UI-000から勝手に修正しない | upstream修正accepted後再実行 |
| `spec_fix_required` | semantic自体が未定義/矛盾、またはSprint 1実コードとの意味差をbindingだけで解消できない | exact conflictを報告し仕様版上げ | 仮実装禁止 | spec修正版accepted後再実行 |

`binding_update`だけはblockerではない。更新後に再検証してmatchedなら同じUI-000を継続可能。

その他4 classはSTOP。

## 2. Decision order

```text
1. semantic meaningはcurrent Sprint 1.5に完全定義済みか?
   NO -> spec_fix_required

2. required predecessor/artifact/binding sourceは存在するか?
   NO -> dependency_blocker

3. 実行/検査に必要な環境が利用可能か?
   NO -> environment_blocker

4. actual Sprint 1 public behaviorはsemantic contractと一致するか?
   NO -> code_fix_required
   YES -> continue

5. 差異はsymbol/module/path/version/test-location等のphysical bindingだけか?
   YES -> binding_update
   NO  -> spec_fix_required
```

## 3. Examples

| Finding | Class |
|---|---|
| `runBattleToCompletion`相当public facadeのexport pathが想定と違うがbehavior/typeは一致 | binding_update |
| BattleResult schemaVersion literalがactual accepted Sprint 1では別値、shape/meaning一致 | binding_update。upstream version fieldをactualへ更新 |
| 必要public facadeがprivate internalにしか存在せずUIから正規利用不能 | code_fix_required |
| post-start dependency failureをSprint 1が通常resolution_errorとして返している | code_fix_requiredまたはhigher authority再確認。binding_update禁止 |
| 「current masterだけ表示するか全履歴か」が仕様で決まっていない | spec_fix_required |
| Sprint 1受入commitがまだない | dependency_blocker |
| browser E2E runnerがインストールされていない | environment_blocker |
| test file名が想定から移動しただけ | binding_update |
| actual typeに追加required semantic fieldがありUI mapping意味が未定義 | spec_fix_required |

## 4. STOP report exact fields

```text
task: UI-000
findingId:
class: dependency_blocker | environment_blocker | code_fix_required | spec_fix_required
bindingId/bridgeId:
higher authority:
expected semantic:
actual evidence:
why binding_update is insufficient:
production files changed: none
required next action:
re-run condition:
```

## 5. binding_update record exact fields

```text
task: UI-000
findingId:
class: binding_update
bindingId/bridgeId:
expected physical fact:
actual physical fact:
semantic equivalence evidence:
updated document/evidence:
recheck command:
recheck result: matched
```

## 6. Prohibitions

- `binding_update`でsemantic差を隠さない。
- environment/dependency不足をcode/spec修正で回避しない。
- public API不足をadapterのprivate importで回避しない。
- spec_fix_required発生後に「仮決め」でUI-001へ進まない。
- code_fix_requiredをUI-000 branch内で無断修正・commitしない。
