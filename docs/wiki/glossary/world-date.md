---
title: 世界日時（WorldDate）
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/01-world-calendar.md
  - docs/specs/00-domain-glossary.md
  - docs/SPEC.md
last_verified: 2026-08-01
related:
  - ../invariants/calendar.md
  - ../architecture/world-engine.md
---

# 世界日時（WorldDate）

## 概要

シミュレーション内の日時表現。実時間のタイムスタンプではない。

## 現在確定している内容

正本（ミニ仕様 01・SPEC）に従う要点:

- 最小単位は1週
- 1か月は4週、1年は48週
- 年は4月第1週から翌年3月第4週
- 開始は世界1年4月第1週
- 通算世界週（absolute week）を保持する
- 全人物は4月第1週生まれとして扱い、個人誕生日フィールドはない
- 年初（4月第1週）に一斉加齢する

詳細・境界値は正本を確認すること。

## 関連する正本

- [`docs/specs/01-world-calendar.md`](../../specs/01-world-calendar.md)
- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)
- [`docs/SPEC.md`](../../SPEC.md)

## 関連するコード

- `packages/simulation-core/src/world-date.ts`
- `packages/simulation-core/src/world-calendar.ts`
- `packages/simulation-core/src/age-status.ts`

## 関連するテスト

- `packages/simulation-core/src/world-date.test.ts`
- `packages/simulation-core/src/world-calendar.test.ts`

## 関連する判断

- [../invariants/calendar.md](../invariants/calendar.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../tasks/S00-004.md](../tasks/S00-004.md)
- [../architecture/world-engine.md](../architecture/world-engine.md)
