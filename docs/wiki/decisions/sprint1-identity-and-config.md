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
last_verified: 2026-08-12
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
- SimulationIdentity（current new-run schemaVersion `0.5.0`、`initialWeeklyTrainingSidecarHash`必須。加えて `worldCalendarConfigHash` と `yearStartProcessorManifestHash` を必須保持）
- `specVersions` の例:
  - main: `SPEC-0.1.3`
  - sprint0: `S0-SPEC-0.1.6`
  - sprint1: `S1-SPEC-0.1.21`
- Sprint 1 新規 run へ適用する
- 旧`S1-SPEC-0.1.19`およびSimulationIdentity `0.3.0`を新規 identity の現行sprint1版として受理しない
- MatchId: `match_<12桁>`、`MatchIdGeneratorState` `0.1.0`、seedはID文字列へ不使用（00・02・11・14）
- `scriptFormatVersion`は`battle-action-script-0.1.0`のまま（14・12）。Sprint1Config SHAは不変
- 移動状態補正は`battle.actionOrder`係数を共用し、移動専用キーを新設しない（14・12／`S1-SPEC-0.1.15`）
- `BattleActionLog.movementChance`は既存`battle.movement.randomMinimum`／`randomMaximum`を参照し、configスキーマ／値／SHAは変更しない（14・12／`S1-SPEC-0.1.16`）
- 戦闘開始`sourceSnapshot` baselineにより戦闘中も`sourceSnapshotHash`を常時検証する。BattleState schema現行は`0.6.0`（14・11／`S1-SPEC-0.1.17`）。Sprint1 current new-run identity is bound to `S1-SPEC-0.1.21`; `S1-SPEC-0.1.20` remains the historical S01-008 integration-contract version
- CLI新規optionは`--sprint1-input`のみ（`Sprint1CliInput` 0.1.0）。path／mtimeはidentity材料にしない
- run-metadata Sprint1 current new-runは `0.5.0`。initial-worldは `0.5.0`、final-worldは `0.3.0` を維持する。SimulationIdentity／RunRuleSnapshotはともに `0.5.0`。
- Sprint 0 既存 `simulationId` を再計算して置換しない（保存済み／archived run）
- fresh Sprint 1 initialization promotion は transaction-local provisional のみ最終 identity へ昇格（02）。保存済みSprint 0 migrationではない
- current new-run の `validateSimulationIdentity` は SimulationIdentity `0.5.0` のみを受理する。pre-CAL-JAN の `0.4.0` は read-only 専用 `validateLegacySimulationIdentityV040` でのみ検証し、新規run writer・migration・continuation・April互換profileへ接続しない。SimulationIdentity `0.3.0` 専用legacy readerは存在せず、本変更でも新設しない
- `Sprint1RunContext`最終shapeに`initialWeeklyTrainingSidecarSnapshot`を含む。外部`initialMatchIdGeneratorState`依存なし
- 基本攻撃設定も Sprint1Config hash 対象
- 固定 7 ファイルを増減しない。RunRuleSnapshot は `initial-world.json` へ 1 件（05）。sidecarはinitial-world／final-worldへ投影し、`simulationIdentityHash`経由でもbind
- Wiki の説明から独自の hash 項目を追加しない

## 関連する正本

- [`docs/specs/02-config-schema.md`](../../specs/02-config-schema.md)
- [`docs/specs/03-event-envelope.md`](../../specs/03-event-envelope.md)
- [`docs/specs/05-statistics-output.md`](../../specs/05-statistics-output.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)
- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/`（S01-001〜005）
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
