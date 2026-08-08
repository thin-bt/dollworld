---
title: ターン解決の不変条件
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/12-battle-turn-resolution.md
  - docs/specs/14-sprint1-config-schema.md
  - docs/specs/09-technique-system.md
  - docs/specs/11-battle-state.md
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
last_verified: 2026-08-08
related:
  - battle-start.md
  - battle-result-and-log.md
  - ../architecture/battle-lifecycle.md
  - ../tasks/S01-006.md
---

# ターン解決の不変条件

## 概要

12・14（および関連する 09・11）を根拠とするターン解決の索引。正本にない式の簡略化・再構成は禁止する。

S01-006 productionターンResolverは**未実装**。本ページは `S1-SPEC-0.1.16` で明文化された`movementChance`、`S1-SPEC-0.1.15` で明文化された移動状態補正、および `S1-SPEC-0.1.14` で明文化された入力契約の索引である。次はS01-006。Sprint 1全体は未完了。

## 現在確定している内容

### 既存の計算契約

- TechniqueCategory／basic_attack profile は `unarmed | sword | magic`
- Ability 参照名は `stamina` と `skill`（旧 `vitality`／Ability としての `technique` は使わない）
- 命中計算では `attackerSkill`／`effectiveAttackerSkill`
- 移動計算では `moverSkill`／`opponentSkill`（14 の `skillWeight` と一致）
- `techniqueBaseAccuracy` 等は技定義の命中率であり、旧 AbilityKey ではない
- 間合い・行動優先・命中・ダメージ・精神消費・耐久減少・継続判定の順序は 12 に従う
- floor／round／clamp 等の順序を変更しない
- 1 ターン途中失敗時の部分更新禁止条件がある場合は、12 の該当節を正とする

### S1-SPEC-0.1.16 movementChance契約

- approach／retreat比較判定時は`movementChance`と`movementRoll`が双方non-null、非movement時は双方null
- `movementChance`はfloor整数パーセント（0..100）。算出はRNG消費0
- 移動のRNG消費数・判定式自体は変更なし
- 詳細は 12 §13

### S1-SPEC-0.1.15 移動状態補正契約

```text
moverStateModifier
= mover.condition * battle.actionOrder.conditionPerPoint
- mover.fatigue * battle.actionOrder.fatiguePenaltyPerPoint
- mover.injury * battle.actionOrder.injuryPenaltyPerPoint

opponentStateModifier
= opponent.condition * battle.actionOrder.conditionPerPoint
- opponent.fatigue * battle.actionOrder.fatiguePenaltyPerPoint
- opponent.injury * battle.actionOrder.injuryPenaltyPerPoint
```

- 移動専用の状態補正configキーは新設しない（`battle.actionOrder`係数を共用）
- state modifierへ`consumptionPerformanceFactor`を掛けない
- `nextHitModifier`／`nextActivationModifier`は移動に影響せず、移動では消費しない
- 移動は解決時点の最新battle-local condition／fatigue／injuryを使う（ターン開始スナップショットではない）
- 対比: `ActionOrderScore`はターン開始値を使用する
- golden cases: `0/0/0→0`、`20/0/0→+5`、`-20/100/100→-30`、mover／opponent独立
- RNG消費順・回数は不変。詳細は 12 §13

### S1-SPEC-0.1.14 ターン入力契約

#### BattleActionReplacementReason

完全enum（これ以外を使わない）:

```text
unknown_technique | unlearned_technique | requirements_not_met
| insufficient_mental | unusable_range | unable_to_act | opponent_ended_battle
```

- 置換なしは `replacementReason = null`（空文字禁止）
- `invalidActionCountDelta = 1`（上記6理由のうち opponent_ended_battle 以外）
- `opponent_ended_battle` は `invalidActionCountDelta = 0`
- `actor.canAct=false` は即 `unable_to_act`。それ以外は unknown → unlearned → requirements → mental → range の優先順
- 詳細は 12 §7

#### battle-action-script-0.1.0

- 1試合全体・全turn・両sideの BattleAction を保持
- root: `scriptFormatVersion`／`turns`、turn: `turnNumber`／`sideA`／`sideB`
- `turns.length = maxTurns`（Sprint 1現行20）、turnNumber は 1..maxTurns 完全連番（枯渇禁止）
- `canonicalScript` は validated script の `toCanonicalJson` 文字列。再canonical一致必須
- `actionScriptHash` = SHA-256(UTF-8 bytes of canonicalScript)
- Resolve時 scripted mode は両side同一 script／hash／format 必須。混在は未commit failure
- 詳細は 12 §2.1

#### 技使用回数

- `attemptedUseCount`: 技実行開始時（置換完了後・精神消費前）に +1
- `successfulUseCount`: activation 成功で +1（命中は問わない）
- 常に `successfulUseCount <= attemptedUseCount`
- S01-006 は battle-local 更新のみ。persistent 反映は S01-007
- 詳細は 09・12 §8.1

## 関連する正本

- [`docs/specs/12-battle-turn-resolution.md`](../../specs/12-battle-turn-resolution.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)
- [`docs/specs/09-technique-system.md`](../../specs/09-technique-system.md)
- [`docs/specs/11-battle-state.md`](../../specs/11-battle-state.md)

## 関連するコード

該当なし（ターン解決Processorは未実装。S01-001〜005は実装済み）。

## 関連するテスト

該当なし（ターン解決Processorは未実装）。

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

該当なし。次は S01-006 実装。Sprint 1全体は未完了。S01-006は未着手。

## 関連Wikiページ

- [battle-start.md](battle-start.md)
- [battle-result-and-log.md](battle-result-and-log.md)
- [../glossary/abilities-and-aptitudes.md](../glossary/abilities-and-aptitudes.md)
- [../glossary/techniques-and-mastery.md](../glossary/techniques-and-mastery.md)
- [../tasks/S01-006.md](../tasks/S01-006.md)
