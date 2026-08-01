---
title: 実行時状態の不変条件
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/07-seeded-rng.md
  - tasks/S00-007.md
last_verified: 2026-08-01
related:
  - ../glossary/processor-runtime-state.md
  - rng-and-determinism.md
---

# 実行時状態の不変条件

## 概要

Processor 実行時状態（RNG サブストリーム等）の保持・復元に関する入口。

## 現在確定している内容

- 同一入力・同一 processor 順で完全一致する結果を返す
- RNG 状態は復元可能（07／S00-003／S00-007）
- フィールド詳細はこのWikiではなく型とテストを正とする

## 関連する正本

- [`docs/specs/07-seeded-rng.md`](../../specs/07-seeded-rng.md)
- [`tasks/S00-007.md`](../../../tasks/S00-007.md)

## 関連するコード

- `packages/simulation-core/src/world-engine/processor-runtime.ts`
- `packages/simulation-core/src/world-engine/types.ts`
- `packages/simulation-core/src/rng.ts`

## 関連するテスト

- `packages/simulation-core/src/world-engine/engine.test.ts`
- `packages/simulation-core/src/rng.test.ts`

## 関連する判断

該当なし。

## 未解決事項

該当なし。

## 関連Wikiページ

- [../glossary/processor-runtime-state.md](../glossary/processor-runtime-state.md)
- [../architecture/world-engine.md](../architecture/world-engine.md)
