---
title: シミュレーション識別
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/specs/00-domain-glossary.md
  - docs/specs/02-config-schema.md
  - docs/specs/03-event-envelope.md
  - docs/specs/04-initial-world-generation.md
  - docs/specs/05-statistics-output.md
  - docs/specs/14-sprint1-config-schema.md
last_verified: 2026-08-12
related:
  - ../invariants/identity-and-reference.md
  - ../invariants/rng-and-determinism.md
  - ../decisions/sprint1-identity-and-config.md
---

# シミュレーション識別

## 概要

`simulationId`・各種エンティティ ID・`eventId` など、決定的に生成・検証される識別子の説明入口。

## 現在確定している内容

- ID・ハッシュ・並び順の規則はミニ仕様に従い、「一般的な方法」で補完しない（[`AGENTS.md`](../../../AGENTS.md)）
- `eventId` は simulationId と sequence などから決定的に導出される（詳細は 03）
- 異 seed 比較では simulationId／eventId 由来の差だけで実体差と誤認しないよう、検証器側で識別メタデータを除外する（S00-010）
- Sprint 0 の `simulationId` 材料式は legacy として維持し、再計算置換しない
- Sprint 1 pre-CAL-JAN完成snapshotの `SimulationIdentity 0.4.0` は既存run・履歴参照用として内容を変更しない。
- CAL-JAN-SYNC適用後のSprint 1新規runは `SimulationIdentity.schemaVersion = "0.5.0"`（`S1-SPEC-0.1.21`）。0.4.0の既存材料に `worldCalendarConfigHash` と `yearStartProcessorManifestHash` を追加し、calendar本文／manifest本文は `RunRuleSnapshot 0.5.0` が保持する。
- current new-run `validateSimulationIdentity` は `0.5.0`をstrict validationし、calendar hash／manifest hashをRunRuleSnapshotとcross-bindする。pre-CAL-JAN 0.4.0を新規run writerへfallback変換しない。
- fresh Sprint 1 initialization promotion で transaction-local provisional simulationId だけを最終 identity へ bindする（保存済みlegacy run migrationではない。詳細は02）。
- path／mtime は identity 材料にしない。CLI は `--sprint1-input` で `Sprint1CliInput` を渡す。
- CAL-JAN-SYNC新規runのrun-metadata文書は `0.5.0`、initial-worldは `0.5.0`、final-worldは `0.3.0`を維持する。

正本の定義をこのページへ複製しない。必ずミニ仕様を読むこと。

## 関連する正本

- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)
- [`docs/specs/02-config-schema.md`](../../specs/02-config-schema.md)
- [`docs/specs/03-event-envelope.md`](../../specs/03-event-envelope.md)
- [`docs/specs/04-initial-world-generation.md`](../../specs/04-initial-world-generation.md)
- [`docs/specs/05-statistics-output.md`](../../specs/05-statistics-output.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)

## 関連するコード

- `packages/simulation-core/src/ids.ts`
- `packages/simulation-core/src/events/event-id.ts`
- `packages/simulation-core/src/initial-world/simulation-id.ts`
- `packages/simulation-core/src/initial-world/ids.ts`
- `packages/simulation-core/src/sprint1/simulation-identity.ts`
- `packages/simulation-core/src/sprint1/constants.ts`

## 関連するテスト

- `packages/simulation-core/src/events/events.test.ts`
- `packages/simulation-core/src/initial-world/generate.test.ts`
- `packages/simulation-core/src/sprint1-foundation.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.20-s01-008-integration-contracts.test.ts`
- `apps/simulator/src/sprint0-verification/sprint0-verification.test.ts`

## 関連する判断

- [../invariants/identity-and-reference.md](../invariants/identity-and-reference.md)
- [../decisions/sprint1-identity-and-config.md](../decisions/sprint1-identity-and-config.md)
- [../tasks/S00-010.md](../tasks/S00-010.md)
- [../tasks/S01-008.md](../tasks/S01-008.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [index.md](index.md)
- [../architecture/simulation-core.md](../architecture/simulation-core.md)
