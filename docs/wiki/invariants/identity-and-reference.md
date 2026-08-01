---
title: 識別と参照整合
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/00-domain-glossary.md
  - docs/specs/04-initial-world-generation.md
  - docs/specs/03-event-envelope.md
  - docs/SPRINT_0_BACKLOG.md
last_verified: 2026-08-01
related:
  - ../glossary/simulation-identity.md
---

# 識別と参照整合

## 概要

ID一意性・参照整合・循環禁止などへの入口。

## 現在確定している内容

Sprint 0 固定完了条件およびタスクより:

- 壊れた参照・不変条件違反は0
- 初期世界で自己参照・循環0（親子・師弟など、詳細は 04）
- イベント列の欠番・重複・壊参照を検出できること（03／S00-005）
- ID規則はミニ仕様に従い独自補完しない

## 関連する正本

- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)
- [`docs/specs/04-initial-world-generation.md`](../../specs/04-initial-world-generation.md)
- [`docs/specs/03-event-envelope.md`](../../specs/03-event-envelope.md)
- [`docs/SPRINT_0_BACKLOG.md`](../../SPRINT_0_BACKLOG.md)

## 関連するコード

- `packages/simulation-core/src/initial-world/validate-snapshot.ts`
- `packages/simulation-core/src/events/validate.ts`
- `apps/simulator/src/output/world-integrity.ts`
- `apps/simulator/src/sprint0-verification/invariant-verification.ts`

## 関連するテスト

- `packages/simulation-core/src/initial-world/validate-snapshot.test.ts`
- `packages/simulation-core/src/initial-world/generate.test.ts`
- `apps/simulator/src/sprint0-verification/sprint0-verification.test.ts`

## 関連する判断

該当なし。

## 未解決事項

該当なし。

## 関連Wikiページ

- [../glossary/simulation-identity.md](../glossary/simulation-identity.md)
- [../tasks/S00-006.md](../tasks/S00-006.md)
- [../tasks/S00-010.md](../tasks/S00-010.md)
