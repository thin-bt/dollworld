---
title: Sprint 1処理の流れ
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/08-character-growth.md
  - docs/specs/09-technique-system.md
  - docs/specs/10-training-and-learning.md
  - docs/specs/11-battle-state.md
  - docs/specs/12-battle-turn-resolution.md
  - docs/specs/13-battle-result-and-log.md
  - docs/specs/14-sprint1-config-schema.md
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
last_verified: 2026-08-01
related:
  - battle-lifecycle.md
  - ../sprints/sprint1.md
  - ../invariants/weekly-training-and-learning.md
---

# Sprint 1処理の流れ

## 概要

08〜14 の責務関係を索引する説明ページ。正本にない processor 名、クラス名、モジュール名、フォルダ構成は作らない。

## 現在確定している内容

### 責務の流れ（概念）

```text
人物状態・能力
  ↓
週間Planner
  ↓
訓練／技習得／休養
  ↓
戦闘入力adapter
  ↓
BattleState生成
  ↓
ターン解決
  ↓
BattleResult・ログ
  ↓
戦闘後効果
```

### 区別する状態

| 概念 | 意味の入口 |
|---|---|
| World人物状態 | 08 の人物一時状態・能力など |
| 戦闘入力 | 11 の入力人物・RunRuleSnapshot 等 |
| BattleParticipantSnapshot | 11 の戦闘用スナップショット |
| BattleState | 11・12 の試合中状態 |
| BattleResult | 13 の試合結果 |
| 戦闘後効果 | 13 の World へ反映する効果（疲労・負傷等） |

World 人物を戦闘中に直接書き換えず、snapshot と結果経由で扱う境界は 11・13 を正とする。

## 関連する正本

- [`docs/specs/08-character-growth.md`](../../specs/08-character-growth.md) 〜 [`14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/`（S01-001〜003）
- 週間Processor（S01-004）以降は未実装

## 関連するテスト

- `packages/simulation-core/src/sprint1-foundation.test.ts`
- `packages/simulation-core/src/sprint1-person-growth.test.ts`
- `packages/simulation-core/src/sprint1-technique-catalog.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.12-contracts.test.ts`

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [battle-lifecycle.md](battle-lifecycle.md)
- [../invariants/battle-start.md](../invariants/battle-start.md)
- [../invariants/battle-turn-resolution.md](../invariants/battle-turn-resolution.md)
- [../invariants/battle-result-and-log.md](../invariants/battle-result-and-log.md)
