---
title: 週間訓練・習得の不変条件
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/10-training-and-learning.md
  - docs/specs/14-sprint1-config-schema.md
  - docs/specs/09-technique-system.md
  - commit:efd5ee1fcf1149d755778a031f08a9f7bba377d5
last_verified: 2026-08-05
related:
  - character-growth.md
  - ../glossary/techniques-and-mastery.md
  - ../architecture/sprint1-processing-flow.md
---

# 週間訓練・習得の不変条件

## 概要

10・14（および関連する 09）を根拠とする週間行動の索引。

## 現在確定している内容

- 週間行動の対象と種類（訓練・技習得・技練習・休養など。列挙の正本は 10）
- 行動選択と処理の順序は 10 に従う
- 同一入力・同一 RNG 状態で決定的に一致する
- 入力改ざんや不正値を暗黙補正しない
- Sprint 1 で扱わない大会日程等を週間処理へ混入しない（10 の対象外）

詳細なスコア式・係数は 10・14 を読むこと。

## 関連する正本

- [`docs/specs/10-training-and-learning.md`](../../specs/10-training-and-learning.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)
- [`docs/specs/09-technique-system.md`](../../specs/09-technique-system.md)

## 関連するコード

S01-003の純粋候補判定入口（週間更新・RNG・イベントは未実装）:

- `evaluateTechniqueAcquisitionConditions`
- `deriveLearningTargetStatus`
- `deriveRequiredStatsFactor`
- `selectMasteryCurrentValueFactor`
- `teacherCanTeach`

実装ファイル: `packages/simulation-core/src/sprint1/technique-*.ts`

S01-004で週間Planner・progress／mastery実更新・RNG・訓練イベントを扱う。

## 関連するテスト

- `packages/simulation-core/src/sprint1-technique-catalog.test.ts`（習得条件・derived status 等）

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

週間更新・RNG・EventEnvelope は S01-004 未実装。Sprint 1全体は未完了。

## 関連Wikiページ

- [character-growth.md](character-growth.md)
- [../glossary/techniques-and-mastery.md](../glossary/techniques-and-mastery.md)
- [../architecture/sprint1-processing-flow.md](../architecture/sprint1-processing-flow.md)
