---
title: ProcessorRuntimeState
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/07-seeded-rng.md
  - docs/specs/03-event-envelope.md
  - docs/TECHNICAL_DECISIONS.md
last_verified: 2026-08-01
related:
  - ../invariants/runtime-state.md
  - ../architecture/world-engine.md
---

# ProcessorRuntimeState

## 概要

WorldEngine 実行中に保持するプロセッサ実行時状態（RNG サブストリーム状態などを含む）への入口。

## 現在確定している内容

- 世界進行は固定順の Processor パイプラインで週単位に進む（S00-007）
- RNG 状態は復元可能であり、同一入力・同一 processor 順で決定的結果を返す
- 詳細なフィールド定義と遷移規則はコードとミニ仕様を正とする

このWikiページは型定義の代替ではない。

## 関連する正本

- [`docs/specs/07-seeded-rng.md`](../../specs/07-seeded-rng.md)
- [`docs/specs/03-event-envelope.md`](../../specs/03-event-envelope.md)
- [`docs/TECHNICAL_DECISIONS.md`](../../TECHNICAL_DECISIONS.md)

## 関連するコード

- `packages/simulation-core/src/world-engine/types.ts`
- `packages/simulation-core/src/world-engine/processor-runtime.ts`
- `packages/simulation-core/src/world-engine/engine.ts`
- `packages/simulation-core/src/rng.ts`

## 関連するテスト

- `packages/simulation-core/src/world-engine/engine.test.ts`
- `packages/simulation-core/src/rng.test.ts`

## 関連する判断

- [../invariants/runtime-state.md](../invariants/runtime-state.md)
- [../invariants/rng-and-determinism.md](../invariants/rng-and-determinism.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../tasks/S00-007.md](../tasks/S00-007.md)
- [../architecture/world-engine.md](../architecture/world-engine.md)
