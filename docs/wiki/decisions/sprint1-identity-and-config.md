---
title: Sprint1ConfigとSimulationIdentity
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/02-config-schema.md
  - docs/specs/03-event-envelope.md
  - docs/specs/05-statistics-output.md
  - docs/specs/14-sprint1-config-schema.md
  - docs/specs/00-domain-glossary.md
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
  - commit:3b313a5ea690351d062e751bc724e5530b835872
last_verified: 2026-08-07
related:
  - sprint1-spec-baseline.md
  - ../glossary/simulation-identity.md
  - ../invariants/fixed-seven-files.md
  - ../sprints/sprint1.md
---

# Sprint1ConfigとSimulationIdentity

## 概要

Sprint 1 新規 run 向けの設定・identity・出力拡張の索引。正本は 02・03・05・14（および 00）。

## 現在確定している内容

- Sprint1Config（schema／configVersion・係数・basicAttackProfiles 等。詳細は 14）
- canonical 化と config hash（02・14）
- SimulationIdentity（schemaVersion `0.3.0`）
- `specVersions` の例:
  - main: `SPEC-0.1.2`
  - sprint0: `S0-SPEC-0.1.5`
  - sprint1: `S1-SPEC-0.1.13`
- Sprint 1 新規 run へ適用する
- 旧`S1-SPEC-0.1.12`を新規 identity の現行sprint1版として受理しない
- MatchId: `match_<12桁>`、`MatchIdGeneratorState` `0.1.0`、seedはID文字列へ不使用（00・02・11・14）
- Sprint 0 既存 `simulationId` を再計算して置換しない
- 基本攻撃設定も Sprint1Config hash 対象
- 固定 7 ファイルを増減しない。RunRuleSnapshot は `initial-world.json` へ 1 件（05）
- Wiki の説明から独自の hash 項目を追加しない

## 関連する正本

- [`docs/specs/02-config-schema.md`](../../specs/02-config-schema.md)
- [`docs/specs/03-event-envelope.md`](../../specs/03-event-envelope.md)
- [`docs/specs/05-statistics-output.md`](../../specs/05-statistics-output.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)
- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/`（S01-001〜004）
- Sprint 0 の simulationId 生成は既存実装を参照

## 関連するテスト

- `packages/simulation-core/src/sprint1-foundation.test.ts`

## 関連する判断

- [sprint1-spec-baseline.md](sprint1-spec-baseline.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../glossary/simulation-identity.md](../glossary/simulation-identity.md)
- [../invariants/fixed-seven-files.md](../invariants/fixed-seven-files.md)
- [../sprints/sprint1.md](../sprints/sprint1.md)
