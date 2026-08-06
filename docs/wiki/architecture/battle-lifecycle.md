---
title: 戦闘ライフサイクル
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/11-battle-state.md
  - docs/specs/12-battle-turn-resolution.md
  - docs/specs/13-battle-result-and-log.md
  - docs/specs/07-seeded-rng.md
  - docs/specs/14-sprint1-config-schema.md
  - commit:3b313a5ea690351d062e751bc724e5530b835872
last_verified: 2026-08-07
related:
  - sprint1-processing-flow.md
  - ../invariants/battle-start.md
  - ../invariants/battle-turn-resolution.md
  - ../invariants/battle-result-and-log.md
---

# 戦闘ライフサイクル

## 概要

1対1戦闘の開始から結果・ログまでの境界索引。正本は 11・12・13（および関連する 07・14）。

## 現在確定している内容

### 実装状態（S1-SPEC-0.1.13時点）

- MatchId決定的生成器の**契約**は正本へ固定済み（形式・state・予約・seed役割）
- 開始stage（S01-005）・ターン以降は**未実装**
- Sprint 1全体は未完了。次はS01-005

### 主な段階

- 開始前入力検証（11）
- MatchId 予約と戦闘専用 RNG（battleSeed）（11・07）
- BattleState 生成（11）
- ターン単位の行動決定・間合い・技使用・命中・ダメージ・精神・耐久（12）
- 決着判定（戦闘不能、続行不能、降参、規定ターン到達時の判定勝ち等。詳細は 12・13）
- BattleResult（13）
- 概要ログ／詳細ログ（13）
- 戦闘後の疲労・負傷等の効果（13）

### 決定性

RNG 消費順、丸め順、canonical 順などは正本の記述をそのまま根拠にする。このページで式を再構成しない。

識別子は `MatchId` を使用し、`BattleId` を新設しない（00・11）。

## 関連する正本

- [`docs/specs/11-battle-state.md`](../../specs/11-battle-state.md)
- [`docs/specs/12-battle-turn-resolution.md`](../../specs/12-battle-turn-resolution.md)
- [`docs/specs/13-battle-result-and-log.md`](../../specs/13-battle-result-and-log.md)
- [`docs/specs/07-seeded-rng.md`](../../specs/07-seeded-rng.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)

## 関連するコード

該当なし（戦闘Processorは未実装。S01-001〜003は実装済み）。

## 関連するテスト

該当なし（戦闘Processorは未実装）。

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [sprint1-processing-flow.md](sprint1-processing-flow.md)
- [../invariants/battle-start.md](../invariants/battle-start.md)
- [../invariants/battle-turn-resolution.md](../invariants/battle-turn-resolution.md)
- [../invariants/battle-result-and-log.md](../invariants/battle-result-and-log.md)
- [../sprints/sprint1.md](../sprints/sprint1.md)
