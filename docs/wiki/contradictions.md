---
title: 矛盾記録
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/SPEC.md
  - docs/TECHNICAL_DECISIONS.md
  - docs/SPRINT_0_BACKLOG.md
  - docs/SPEC_CHANGELOG.md
  - docs/SPEC_PREPARATION_PLAN.md
  - tag:sprint0-complete
  - commit:504fa3cc16346dd0c6480e8328e42518e68215d3
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
  - commit:259a219d29b626c4678e5b248b8a8453861797f9
  - commit:3b313a5ea690351d062e751bc724e5530b835872
last_verified: 2026-08-12
---

# 矛盾記録

## 概要

Wiki作成・更新時に発見した、正本・コード・テスト間の矛盾を記録する。Sprint 0・Sprint 1 を横断する記録である。自動修正は行わない。

## 現在確定している内容

現時点で、今回の Wiki 同期後に確認されている未解決矛盾はない（正本同士）。コード追随は下記。

- Sprint 0 の確定実装・正本（`sprint0-complete`）
- Sprint 1 の `S1-SPEC-0.1.11` 確定 commit は `2800d3b959e575f57660c27b344507dd0e38ddb6`
- Sprint 1 のpre-CAL-JAN完成snapshotは `S1-SPEC-0.1.20`。CAL-JAN-SYNC適用後の新規run契約は `S1-SPEC-0.1.21` であり、`S1-SPEC-0.1.20`／SimulationIdentity `0.4.0`は既存run・履歴参照用のpre-CAL-JAN契約として内容を変更しない。
- 実装状態: S01-001〜S01-009 implemented / accepted（S01-007受入完了commit `a39e476`。S01-008受入完了commit `7c47847`。S01-009受入完了commit `5616f5f`、2026-08-11 ChatGPT再監査）
- S01-008は**implemented / accepted**（WorldEngine／CLI本統合 production実装済み）
- Sprint 1: **COMPLETE**。clean master final verify: PASSED on `5a80268`。completion tag: `sprint1-complete` (annotated) → `5a80268`。CAL-JAN-SYNCはこのcompletion snapshot後の共通暦同期であり、completion tagは動かさない。
- CAL-JAN-SYNC新規runのコード側 `S1_SPEC_VERSION` は `S1-SPEC-0.1.21`、SimulationIdentity schemaVersionは `0.5.0`、RunRuleSnapshot schemaVersionは `0.5.0`、RunMetadataDocument／InitialWorldOutputDocumentは `0.5.0`。`BattleState.schemaVersion=0.6.0`、`BattleResult.schemaVersion=0.5.0`、FinalWorldOutputDocument `0.3.0`はfield shapeを変えない限り維持する。

未来の未作成 commit hash を捏造して sources へ書かない。

## 関連する正本

- [`docs/SPEC.md`](../SPEC.md)
- [`docs/TECHNICAL_DECISIONS.md`](../TECHNICAL_DECISIONS.md)
- [`docs/SPRINT_0_BACKLOG.md`](../SPRINT_0_BACKLOG.md)
- [`docs/SPEC_CHANGELOG.md`](../SPEC_CHANGELOG.md)
- [`docs/SPEC_PREPARATION_PLAN.md`](../SPEC_PREPARATION_PLAN.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/`（S01-001〜005）

## 関連するテスト

- `packages/simulation-core/src/sprint1-foundation.test.ts`
- `packages/simulation-core/src/sprint1-person-growth.test.ts`
- `packages/simulation-core/src/sprint1-technique-catalog.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.12-contracts.test.ts`

## 関連する判断

- [governance.md](governance.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [governance.md](governance.md)
- [changelog.md](changelog.md)
