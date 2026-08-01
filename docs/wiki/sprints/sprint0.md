---
title: Sprint 0
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/SPRINT_0_BACKLOG.md
  - tag:sprint0-complete
  - commit:504fa3cc16346dd0c6480e8328e42518e68215d3
last_verified: 2026-08-01
related:
  - ../tasks/index.md
  - ../decisions/performance-warnings.md
---

# Sprint 0

## 概要

再現可能な世界時間・乱数・設定・イベント・初期世界・長期実行・統計出力の基盤を成立させる Sprint。タグ `sprint0-complete` で完了が示される。

## 現在確定している内容

### 固定完了条件（バックログ）

- `npm run simulate -- --years 100 --seed 12345 --config config/initial-world.config.json`
- 4800週、固定7ファイル、同一条件の決定的一致、壊参照・不変違反0、42歳強制引退、MySQLなし、`npm run check` 成功

### タスク

S00-001〜S00-010。詳細は [../tasks/index.md](../tasks/index.md)。

### 実装しないもの（バックログ）

能力成長、技習得、戦闘、大会、昇格、師匠選択、恋愛・新規結婚、出産・遺伝、新規死亡、Web、MySQL永続化。

### 完了証跡

- タグ: `sprint0-complete`
- commit: `504fa3cc16346dd0c6480e8328e42518e68215d3`
- 検証: `npm run verify:sprint0`（最終レポート `overallPassed=true`）

## 関連する正本

- [`docs/SPRINT_0_BACKLOG.md`](../../SPRINT_0_BACKLOG.md)
- [`docs/TECHNICAL_DECISIONS.md`](../../TECHNICAL_DECISIONS.md)
- [`docs/SPEC.md`](../../SPEC.md)
- [`docs/specs/`](../../specs/)

## 関連するコード

- `packages/simulation-core/`
- `apps/simulator/`

## 関連するテスト

- `npm run check`
- `npm run verify:sprint0`

## 関連する判断

- [../decisions/sprint0.md](../decisions/sprint0.md)
- [../decisions/performance-warnings.md](../decisions/performance-warnings.md)

## 未解決事項

- 性能申し送りは [../decisions/performance-warnings.md](../decisions/performance-warnings.md) を参照

## 関連Wikiページ

- [../tasks/S00-010.md](../tasks/S00-010.md)
- [sprint1-pending.md](sprint1-pending.md)
