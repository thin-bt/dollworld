---
title: 不変条件索引
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/AI_DEVELOPMENT_RULES.md
  - docs/SPRINT_0_BACKLOG.md
  - tasks/S00-010.md
  - commit:3b313a5ea690351d062e751bc724e5530b835872
last_verified: 2026-08-08
---

# 不変条件索引

## 概要

Sprint 0・Sprint 1を横断する不変条件索引。正本はミニ仕様である。検証状態は Sprint ごとに異なる。

## 現在確定している内容

### Sprint 0（コード・自動テストで実装・検証済み）

- [暦・加齢](calendar.md)
- [識別と参照整合](identity-and-reference.md)
- [RNGと決定性](rng-and-determinism.md)
- [実行時状態](runtime-state.md)
- [固定7ファイル](fixed-seven-files.md)

AI開発ルールに列挙される Sprint 0 不変条件の例: 年齢非負、死亡者非処理、16歳未満ランクなし、42歳以上引退、参照整合、親子・師弟循環なし、同一シード一致。詳細は正本と検証器を確認すること。

### Sprint 1（`S1-SPEC-0.1.20` で確定した仕様不変条件。S01-001〜008 implemented / accepted、S01-009 pending）

- [人物成長](character-growth.md)
- [週間訓練・習得](weekly-training-and-learning.md)
- [戦闘開始](battle-start.md)
- [ターン解決](battle-turn-resolution.md)（0.1.14のreplacementReason／script／use-count契約、0.1.15の移動状態補正契約、0.1.16のmovementChance契約、0.1.17のsourceSnapshot baseline契約、詳細ログ履歴契約を含む）
- [戦闘結果・ログ](battle-result-and-log.md)

Sprint 1 不変条件を既存の Sprint 0 自動テストで検証済みとは扱わない。S01-001〜008はimplemented / accepted（S01-007受入完了commit `a39e476`。S01-008受入完了）。
S01-009 pending／未着手。Sprint 1全体は未完了。次の実装着手は S01-009。

## 関連する正本

- [`docs/AI_DEVELOPMENT_RULES.md`](../../AI_DEVELOPMENT_RULES.md)
- [`docs/SPRINT_0_BACKLOG.md`](../../SPRINT_0_BACKLOG.md)
- [`tasks/S00-010.md`](../../../tasks/S00-010.md)

## 関連するコード

Sprint 0:

- `apps/simulator/src/sprint0-verification/invariant-verification.ts`
- `apps/simulator/src/output/world-integrity.ts`

Sprint 1（S01-001〜005）:

- `packages/simulation-core/src/sprint1/`

## 関連するテスト

Sprint 0:

- `apps/simulator/src/sprint0-verification/sprint0-verification.test.ts`
- `packages/simulation-core` 各領域のテスト

Sprint 1（S01-001〜005）:

- `packages/simulation-core/src/sprint1-foundation.test.ts`
- `packages/simulation-core/src/sprint1-person-growth.test.ts`
- `packages/simulation-core/src/sprint1-technique-catalog.test.ts`
- `packages/simulation-core/src/sprint1-weekly-training.test.ts`
- `packages/simulation-core/src/sprint1-battle-start.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.12-contracts.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.13-match-id-generator-contracts.test.ts`

## 関連する判断

- [../decisions/sprint0.md](../decisions/sprint0.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../tasks/S00-010.md](../tasks/S00-010.md)
- [../architecture/index.md](../architecture/index.md)
