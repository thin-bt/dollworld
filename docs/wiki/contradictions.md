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
last_verified: 2026-08-08
---

# 矛盾記録

## 概要

Wiki作成・更新時に発見した、正本・コード・テスト間の矛盾を記録する。Sprint 0・Sprint 1 を横断する記録である。自動修正は行わない。

## 現在確定している内容

現時点で、今回の Wiki 同期後に確認されている未解決矛盾はない。

- Sprint 0 の確定実装・正本（`sprint0-complete`）
- Sprint 1 の `S1-SPEC-0.1.11` 確定 commit は `2800d3b959e575f57660c27b344507dd0e38ddb6`
- Sprint 1 の現行仕様は `S1-SPEC-0.1.15`（移動状態補正明文化）。`S1-SPEC-0.1.14` はターン入力契約明文化、`S1-SPEC-0.1.13` は MatchId generator契約明文化、`S1-SPEC-0.1.12` は週間処理契約clarificationとして履歴。`2800d3b...` を 0.1.12／0.1.13／0.1.14／0.1.15 の内容 commit として扱わない
- 実装状態: S01-001〜S01-005 実装済み、次は S01-006。Sprint 1 全体は未完了。S01-006 productionターンResolverは未実装
- コード側 `S1_SPEC_VERSION`／SimulationIdentity レジストリの現行値は `S1-SPEC-0.1.15`。旧`S1-SPEC-0.1.14`は新規 identity として受理しない

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
