---
title: 用語集索引
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/00-domain-glossary.md
  - docs/SPEC.md
last_verified: 2026-08-01
---

# 用語集索引

## 概要

Sprint 0で頻出する用語への入口。定義の正本はミニ仕様と SPEC である。

## 現在確定している内容

- [世界日時（WorldDate）](world-date.md)
- [シミュレーション識別（simulationId / eventId 等）](simulation-identity.md)
- [ProcessorRuntimeState](processor-runtime-state.md)

## 関連する正本

- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)
- [`docs/SPEC.md`](../../SPEC.md)

## 関連するコード

- `packages/simulation-core/src/domain.ts`
- `packages/simulation-core/src/world-date.ts`
- `packages/simulation-core/src/ids.ts`

## 関連するテスト

- `packages/simulation-core/src/domain.test.ts`
- `packages/simulation-core/src/world-date.test.ts`

## 関連する判断

該当なし。

## 未解決事項

該当なし。

## 関連Wikiページ

- [architecture/index.md](../architecture/index.md)
- [invariants/index.md](../invariants/index.md)
