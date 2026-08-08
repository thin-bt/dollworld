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
  - commit:60d5b6b821983b047debd51bccc43389d363f953
last_verified: 2026-08-08
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

### 実装状態（S1-SPEC-0.1.18時点）

- MatchId決定的生成器はproduction実装済み（S01-005）
- 開始stage（入力検証・MatchId予約・battleSeed・BattleState生成・`beginBattle`）は**実装済み**（S01-005）
- ターン入力契約（replacementReason／battle-action-script-0.1.0／技使用回数）は `S1-SPEC-0.1.14` で明文化済み（S01-006で実装）
- 移動状態補正（`moverStateModifier`／`opponentStateModifier`）は `S1-SPEC-0.1.15` で明文化済み（S01-006で実装）
- `BattleActionLog.movementChance`は `S1-SPEC-0.1.16` で明文化済み（S01-006で**production**実装）
- 戦闘開始`sourceSnapshot` baseline（常時hash検証・BattleState schema `0.6.0`）は `S1-SPEC-0.1.17` で明文化済み
- BattleResult決定的契約（summary下位型／同点比較／RNG／mastery）は `S1-SPEC-0.1.18` で明文化済み（productionはS01-007）
- ターン解決（12）のproduction実装は**実装済み**（S01-006）
- BattleResult（13）のproduction実装は**未着手**（S01-007）
- Sprint 1全体は未完了。次はS01-007。BattleResultは未実装

### 主な段階

- 開始前入力検証（11）— 実装済み
- MatchId 予約と戦闘専用 RNG（battleSeed）（11・07）— 実装済み
- BattleState 生成と ready → in_progress 遷移（11・12）— 実装済み
- ターン単位の行動決定・間合い・技使用・命中・ダメージ・精神・耐久（12）— 実装済み
- 決着判定（戦闘不能、続行不能、降参、規定ターン到達時の判定勝ち等。詳細は 12・13）— ターン内候補までS01-006、最終BattleResultはS01-007
- BattleResult（13）— 未実装
- 概要ログ／詳細ログ（13）— 未実装
- 戦闘後の疲労・負傷等の効果（13）— 未実装

### 決定性

RNG 消費順、丸め順、canonical 順などは正本の記述をそのまま根拠にする。このページで式を再構成しない。

識別子は `MatchId` を使用し、`BattleId` を新設しない（00・11）。

### 未commit開始計画

`startBattleTransaction` は未commitの開始計画を返す純粋関数であり、package rootへ公開しない。進行後のWorld RNG状態とMatchIdGeneratorStateは1つの `StartBattleRuntimeTransition` に封入し、実際の置換は12仕様の `commitRunBattlePlan` でのみ行う。runtime transitionだけを適用する公開APIは設けない。

## 関連する正本

- [`docs/specs/11-battle-state.md`](../../specs/11-battle-state.md)
- [`docs/specs/12-battle-turn-resolution.md`](../../specs/12-battle-turn-resolution.md)
- [`docs/specs/13-battle-result-and-log.md`](../../specs/13-battle-result-and-log.md)
- [`docs/specs/07-seeded-rng.md`](../../specs/07-seeded-rng.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/start-battle-transaction.ts`（開始トランザクション、内部）
- `packages/simulation-core/src/sprint1/create-battle-state.ts`／`begin-battle.ts`（内部stage）
- `packages/simulation-core/src/sprint1/battle-state.ts`／`battle-participant.ts`／`battle-started-event.ts`
- `packages/simulation-core/src/sprint1/prepare-battle-turn.ts`／`resolve-battle-turn.ts`／`default-battle-strategy.ts`
- `packages/simulation-core/src/sprint1/battle-turn-logs.ts`／`movement-chance.ts`／`battle-movement.ts`
- BattleResult／WorldEngine登録は未実装。

## 関連するテスト

- `packages/simulation-core/src/sprint1-battle-start.test.ts`（開始stage）
- `packages/simulation-core/src/sprint1-battle-turn-resolution.test.ts`（ターン解決）

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

該当なし。次はS01-007。BattleResultは未実装。Sprint 1全体は未完了。

## 関連Wikiページ

- [sprint1-processing-flow.md](sprint1-processing-flow.md)
- [../invariants/battle-start.md](../invariants/battle-start.md)
- [../invariants/battle-turn-resolution.md](../invariants/battle-turn-resolution.md)
- [../invariants/battle-result-and-log.md](../invariants/battle-result-and-log.md)
- [../sprints/sprint1.md](../sprints/sprint1.md)
