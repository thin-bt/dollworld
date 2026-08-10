---
title: 用語集索引
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/specs/00-domain-glossary.md
  - docs/SPEC.md
last_verified: 2026-08-08
---

# 用語集索引

## 概要

Sprint 0・Sprint 1を横断する用語索引。定義の正本はミニ仕様と SPEC である。

## 現在確定している内容

### Sprint 0（実装済み）

- [世界日時（WorldDate）](world-date.md)
- [シミュレーション識別（simulationId / eventId 等）](simulation-identity.md)
- [ProcessorRuntimeState](processor-runtime-state.md)

### Sprint 1（S01-001〜008 implemented / accepted、S01-009 pending）

- [能力と適性（AbilityKey／AptitudeKey）](abilities-and-aptitudes.md)
- [技と熟練度](techniques-and-mastery.md)（0.1.14の使用回数契約を含む）
- `BattleActionReplacementReason`／`battle-action-script-0.1.0` の用語は [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md) および [ターン解決不変条件](../invariants/battle-turn-resolution.md) を参照

## 関連する正本

- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)
- [`docs/SPEC.md`](../../SPEC.md)

## 関連するコード

Sprint 0 用語に対応する実装:

- `packages/simulation-core/src/domain.ts`
- `packages/simulation-core/src/world-date.ts`
- `packages/simulation-core/src/ids.ts`

Sprint 1（S01-001〜008）:

- `packages/simulation-core/src/sprint1/`
- `apps/simulator/`（S01-008 CLI／fixed7統合）

## 関連するテスト

Sprint 0 用語に対応するテスト:

- `packages/simulation-core/src/domain.test.ts`
- `packages/simulation-core/src/world-date.test.ts`

Sprint 1:

- S01-001〜008のSprint 1 regression／integration tests
- Sprint 1全体の完了ゲートはS01-009 `npm run verify:sprint1`（pending）

## 関連する判断

該当なし。

## 未解決事項

該当なし。

## 関連Wikiページ

- [architecture/index.md](../architecture/index.md)
- [invariants/index.md](../invariants/index.md)
