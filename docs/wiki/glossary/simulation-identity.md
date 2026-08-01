---
title: シミュレーション識別
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/00-domain-glossary.md
  - docs/specs/03-event-envelope.md
  - docs/specs/04-initial-world-generation.md
last_verified: 2026-08-01
related:
  - ../invariants/identity-and-reference.md
  - ../invariants/rng-and-determinism.md
---

# シミュレーション識別

## 概要

`simulationId`・各種エンティティ ID・`eventId` など、決定的に生成・検証される識別子の説明入口。

## 現在確定している内容

- ID・ハッシュ・並び順の規則はミニ仕様に従い、「一般的な方法」で補完しない（[`AGENTS.md`](../../../AGENTS.md)）
- `eventId` は simulationId と sequence などから決定的に導出される（詳細は 03）
- 異 seed 比較では simulationId／eventId 由来の差だけで実体差と誤認しないよう、検証器側で識別メタデータを除外する（S00-010）

正本の定義をこのページへ複製しない。必ずミニ仕様を読むこと。

## 関連する正本

- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)
- [`docs/specs/03-event-envelope.md`](../../specs/03-event-envelope.md)
- [`docs/specs/04-initial-world-generation.md`](../../specs/04-initial-world-generation.md)

## 関連するコード

- `packages/simulation-core/src/ids.ts`
- `packages/simulation-core/src/events/event-id.ts`
- `packages/simulation-core/src/initial-world/simulation-id.ts`
- `packages/simulation-core/src/initial-world/ids.ts`

## 関連するテスト

- `packages/simulation-core/src/events/events.test.ts`
- `packages/simulation-core/src/initial-world/generate.test.ts`
- `apps/simulator/src/sprint0-verification/sprint0-verification.test.ts`

## 関連する判断

- [../invariants/identity-and-reference.md](../invariants/identity-and-reference.md)
- [../tasks/S00-010.md](../tasks/S00-010.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [index.md](index.md)
- [../architecture/simulation-core.md](../architecture/simulation-core.md)
