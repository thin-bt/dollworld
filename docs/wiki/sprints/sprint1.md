---
title: Sprint 1
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/SPEC.md
  - docs/SPEC_CHANGELOG.md
  - docs/SPEC_INDEX.md
  - docs/SPEC_PREPARATION_PLAN.md
  - docs/specs/00-domain-glossary.md
  - docs/specs/02-config-schema.md
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
  - ../glossary/abilities-and-aptitudes.md
  - ../glossary/techniques-and-mastery.md
  - ../architecture/sprint1-processing-flow.md
  - ../architecture/battle-lifecycle.md
  - ../decisions/sprint1-spec-baseline.md
  - ../decisions/sprint1-identity-and-config.md
  - sprint0.md
---

# Sprint 1

## 概要

Sprint 1 の仕様は `S1-SPEC-0.1.11` として確定済みである。正本版は `SPEC-0.1.2`。仕様確定 commit は `2800d3b959e575f57660c27b344507dd0e38ddb6`。

本ページは説明・索引である。実装や仕様判断の根拠には使わない。正本と矛盾する場合は正本を優先する。

## 現在確定している内容

### 仕様状態

- ミニ仕様版: `S1-SPEC-0.1.11`
- 正本版: `SPEC-0.1.2`
- 仕様確定 commit: `2800d3b959e575f57660c27b344507dd0e38ddb6`
- 08〜14 は作成・受入監査済み（[`docs/SPEC_PREPARATION_PLAN.md`](../../SPEC_PREPARATION_PLAN.md)）

### 対象領域

- 人物能力・成長（08, 14）
- 技定義・熟練度・習得（09, 10, 14）
- 週間行動・訓練・休養（10, 14）
- 1対1戦闘開始（11, 14）
- ターン解決（12, 14）
- 決着・結果・戦闘ログ（13, 14）
- Sprint1Config（14）
- SimulationIdentity 拡張（00, 02, 05, 14）

### 実装状態

- **実装は未着手**である
- 本Wikiの同期や `npm run check` の成功は、Sprint 1 機能の実装完了を意味しない
- Sprint 1 のコード・テストが存在するとは記載しない

### 実装タスク

- Sprint 1 実装タスク番号は、タスク定義後に別途 Wiki へ追加する
- 現時点では推測登録しない

### 今回の対象外（実装済み範囲ではない）

大会、昇格、賞金、師匠選択、恋愛、結婚、出産、Web、MySQL 永続化など。詳細な境界は各ミニ仕様の対象外節を正とする。

## 関連する正本

- [`docs/SPEC.md`](../../SPEC.md)
- [`docs/SPEC_INDEX.md`](../../SPEC_INDEX.md)
- [`docs/SPEC_PREPARATION_PLAN.md`](../../SPEC_PREPARATION_PLAN.md)
- [`docs/specs/08-character-growth.md`](../../specs/08-character-growth.md) 〜 [`14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)

## 関連するコード

該当なし（Sprint 1 実装は未着手）。

## 関連するテスト

該当なし（Sprint 1 実装は未着手）。

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)
- [../decisions/sprint1-identity-and-config.md](../decisions/sprint1-identity-and-config.md)

## 未解決事項

- 実装タスク定義後に tasks 索引へ S01 ページを追加する必要がある

## 関連Wikiページ

- [../glossary/abilities-and-aptitudes.md](../glossary/abilities-and-aptitudes.md)
- [../glossary/techniques-and-mastery.md](../glossary/techniques-and-mastery.md)
- [../architecture/sprint1-processing-flow.md](../architecture/sprint1-processing-flow.md)
- [../architecture/battle-lifecycle.md](../architecture/battle-lifecycle.md)
- [../invariants/character-growth.md](../invariants/character-growth.md)
- [../invariants/weekly-training-and-learning.md](../invariants/weekly-training-and-learning.md)
- [../invariants/battle-start.md](../invariants/battle-start.md)
- [../invariants/battle-turn-resolution.md](../invariants/battle-turn-resolution.md)
- [../invariants/battle-result-and-log.md](../invariants/battle-result-and-log.md)
- [sprint0.md](sprint0.md)
