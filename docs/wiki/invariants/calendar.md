---
title: 暦・加齢の不変条件
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/01-world-calendar.md
  - tasks/S00-004.md
  - tasks/S00-007.md
last_verified: 2026-08-12
related:
  - ../glossary/world-date.md
---

# 暦・加齢の不変条件

## 概要

世界暦と年初一斉加齢に関する契約の索引。

## 現在確定している内容

タスク／ミニ仕様から確認できる例:

- 新規run既定年初は1月第1週。年初月は `worldYearStartMonth`（1..12）でrun作成時のみ変更可
- 世界1年・設定年初月第1週で余分な加齢／`world.year_started` を二重実行しない
- 初回加齢は世界2年・設定年初月第1週（既定1月）
- 16歳で `RANK_ORDER[0]` など資格更新（詳細は 01）
- 42歳到達時の強制引退
- `runYears(N)` は `N * 48` 週。既定100年後は世界101年1月第1週年初後、年次統計100行
- 年次統計確定境界は設定年初月の直前月第4週（既定12月）
- 個人誕生日フィールドなし。4月は通常月

## 関連する正本

- [`docs/specs/01-world-calendar.md`](../../specs/01-world-calendar.md)
- [`tasks/S00-004.md`](../../../tasks/S00-004.md)
- [`tasks/S00-007.md`](../../../tasks/S00-007.md)

## 関連するコード

- `packages/simulation-core/src/world-calendar.ts`
- `packages/simulation-core/src/age-status.ts`
- `packages/simulation-core/src/world-engine/`

## 関連するテスト

- `packages/simulation-core/src/world-calendar.test.ts`
- `packages/simulation-core/src/world-engine/engine.test.ts`

## 関連する判断

該当なし。

## 未解決事項

該当なし。

## 関連Wikiページ

- [../glossary/world-date.md](../glossary/world-date.md)
- [../architecture/world-engine.md](../architecture/world-engine.md)
