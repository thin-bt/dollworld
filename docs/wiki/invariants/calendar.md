---
title: 暦・加齢の不変条件
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/01-world-calendar.md
  - tasks/S00-004.md
  - tasks/S00-007.md
last_verified: 2026-08-01
related:
  - ../glossary/world-date.md
---

# 暦・加齢の不変条件

## 概要

世界暦と年初一斉加齢に関する契約の索引。

## 現在確定している内容

タスク／ミニ仕様から確認できる例:

- 世界1年4月第1週で余分な加齢を行わない
- 初回加齢は世界2年4月第1週
- 16歳で `RANK_ORDER[0]` など資格更新（詳細は 01）
- 42歳到達時の強制引退
- 100年=4800週進行後、世界101年4月第1週年初後で終了（S00-007）
- 個人誕生日フィールドなし

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
