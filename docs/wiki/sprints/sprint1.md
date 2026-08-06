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
  - commit:259a219d29b626c4678e5b248b8a8453861797f9
  - commit:530e3f88d054eec11840e2e54743bf4c9a705654
last_verified: 2026-08-06
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

Sprint 1 の仕様は `S1-SPEC-0.1.12` が現行である。正本版は `SPEC-0.1.2`。`S1-SPEC-0.1.11` 確定 commit は `2800d3b959e575f57660c27b344507dd0e38ddb6`。`0.1.12` は週間処理契約のclarificationであり、Sprint1Config balance／hashは不変。

本ページは説明・索引である。実装や仕様判断の根拠には使わない。正本と矛盾する場合は正本を優先する。

## 現在確定している内容

### 仕様状態

- ミニ仕様版: `S1-SPEC-0.1.12`
- 正本版: `SPEC-0.1.2`
- `S1-SPEC-0.1.11` 確定 commit: `2800d3b959e575f57660c27b344507dd0e38ddb6`
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

- Sprint 1全体は**未完了**
- S01-001〜S01-004は実装済み。次の実装着手はS01-005
- 週間処理のWorldEngine登録はS01-008（S01-004では未実施）
- 本Wikiの同期や `npm run check` の成功は、Sprint 1全体の実装完了を意味しない

### 実装タスク

- タスク索引: [`../tasks/index.md`](../tasks/index.md)
- 正本バックログ: [`docs/SPRINT_1_BACKLOG.md`](../../SPRINT_1_BACKLOG.md)

### 今回の対象外（実装済み範囲ではない）

大会、昇格、賞金、師匠選択、恋愛、結婚、出産、Web、MySQL 永続化など。詳細な境界は各ミニ仕様の対象外節を正とする。

## 関連する正本

- [`docs/SPEC.md`](../../SPEC.md)
- [`docs/SPEC_INDEX.md`](../../SPEC_INDEX.md)
- [`docs/SPEC_PREPARATION_PLAN.md`](../../SPEC_PREPARATION_PLAN.md)
- [`docs/specs/08-character-growth.md`](../../specs/08-character-growth.md) 〜 [`14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/`（S01-001〜004の公開型・validation・カタログ／成長API・週間Processor）
- `packages/simulation-core/src/sprint1/constants.ts`（`S1_SPEC_VERSION`）
- `packages/simulation-core/src/index.ts`（package root export）

## 関連するテスト

- `packages/simulation-core/src/sprint1-foundation.test.ts`
- `packages/simulation-core/src/sprint1-person-growth.test.ts`
- `packages/simulation-core/src/sprint1-technique-catalog.test.ts`
- `packages/simulation-core/src/sprint1-weekly-training.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.12-contracts.test.ts`

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)
- [../decisions/sprint1-identity-and-config.md](../decisions/sprint1-identity-and-config.md)

## 未解決事項

- 次の実装着手は S01-005（戦闘開始入力adapter）。週間ProcessorのWorldEngine登録は S01-008。Sprint 1全体は未完了

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
