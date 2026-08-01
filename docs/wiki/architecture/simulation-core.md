---
title: simulation-core
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/TECHNICAL_DECISIONS.md
  - packages/simulation-core/package.json
  - packages/simulation-core/src/index.ts
last_verified: 2026-08-01
related:
  - world-engine.md
  - workspace.md
---

# simulation-core

## 概要

決定的シミュレーション中核パッケージ。I/O・React・HTTP・DB に依存しない。

## 現在確定している内容

- 外部実行時依存なし（手書きバリデータ、Zod 等なし）
- RNG アルゴリズム `xoshiro128ss-v1`
- `Sha256Provider` は core でインタフェース定義、`node:crypto` は `apps/simulator` から注入
- 主な領域: domain／config／names／rng／world calendar／events／initial-world／world-engine

## 関連する正本

- [`docs/TECHNICAL_DECISIONS.md`](../../TECHNICAL_DECISIONS.md)
- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md) 〜 [`07-seeded-rng.md`](../../specs/07-seeded-rng.md)

## 関連するコード

- `packages/simulation-core/src/index.ts`
- `packages/simulation-core/src/rng.ts`
- `packages/simulation-core/src/initial-world/`
- `packages/simulation-core/src/world-engine/`
- `packages/simulation-core/src/events/`

## 関連するテスト

- `packages/simulation-core/src/**/*.test.ts`

## 関連する判断

- [../decisions/sprint0.md](../decisions/sprint0.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [world-engine.md](world-engine.md)
- [../glossary/index.md](../glossary/index.md)
