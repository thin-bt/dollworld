---
title: ターン解決の不変条件
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/12-battle-turn-resolution.md
  - docs/specs/14-sprint1-config-schema.md
  - docs/specs/09-technique-system.md
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
last_verified: 2026-08-01
related:
  - battle-start.md
  - battle-result-and-log.md
  - ../architecture/battle-lifecycle.md
---

# ターン解決の不変条件

## 概要

12・14（および関連する 09）を根拠とするターン解決の索引。正本にない式の簡略化・再構成は禁止する。

## 現在確定している内容

- TechniqueCategory／basic_attack profile は `unarmed | sword | magic`
- Ability 参照名は `stamina` と `skill`（旧 `vitality`／Ability としての `technique` は使わない）
- 命中計算では `attackerSkill`／`effectiveAttackerSkill`
- 移動計算では `moverSkill`／`opponentSkill`（14 の `skillWeight` と一致）
- `techniqueBaseAccuracy` 等は技定義の命中率であり、旧 AbilityKey ではない
- 間合い・行動優先・命中・ダメージ・精神消費・耐久減少・継続判定の順序は 12 に従う
- floor／round／clamp 等の順序を変更しない
- 1 ターン途中失敗時の部分更新禁止条件がある場合は、12 の該当節を正とする

## 関連する正本

- [`docs/specs/12-battle-turn-resolution.md`](../../specs/12-battle-turn-resolution.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)
- [`docs/specs/09-technique-system.md`](../../specs/09-technique-system.md)

## 関連するコード

該当なし（ターン解決Processorは未実装。S01-001〜003は実装済み）。

## 関連するテスト

該当なし（ターン解決Processorは未実装）。

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [battle-start.md](battle-start.md)
- [battle-result-and-log.md](battle-result-and-log.md)
- [../glossary/abilities-and-aptitudes.md](../glossary/abilities-and-aptitudes.md)
