---
title: アーキテクチャ索引
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/TECHNICAL_DECISIONS.md
  - docs/SPEC.md
  - docs/SPRINT_0_BACKLOG.md
last_verified: 2026-08-05
---

# アーキテクチャ索引

## 概要

Sprint 0・Sprint 1を横断するアーキテクチャ索引。Sprint 0は実装済み配置と責務分割、Sprint 1は仕様確定済みの処理境界と戦闘ライフサイクルを区別する（S01-001〜004実装済み、次はS01-005）。詳細は TECHNICAL_DECISIONS・正式ミニ仕様・コードを正とする。

## 現在確定している内容

### Sprint 0（実装済みアーキテクチャ）

- [ワークスペース構成](workspace.md)
- [simulation-core](simulation-core.md)
- [WorldEngine](world-engine.md)
- [ヘッドレスCLI](headless-cli.md)
- [固定出力契約](output-contract.md)

### Sprint 1（仕様確定済み、S01-001〜003実装済み）

- [Sprint 1処理の流れ](sprint1-processing-flow.md)
- [戦闘ライフサイクル](battle-lifecycle.md)

週間Processor（S01-004）・戦闘Processor以降は未実装。下位ページを全体完了と扱わない。

## 関連する正本

- [`docs/TECHNICAL_DECISIONS.md`](../../TECHNICAL_DECISIONS.md)
- [`docs/SPEC.md`](../../SPEC.md)

## 関連するコード

Sprint 0:

- `packages/simulation-core/`
- `apps/simulator/`

Sprint 1（S01-001〜003）:

- `packages/simulation-core/src/sprint1/`

## 関連するテスト

Sprint 0 の各パッケージ Vitest テスト（詳細は下位ページ）。

Sprint 1（S01-001〜003）:

- `packages/simulation-core/src/sprint1-foundation.test.ts`
- `packages/simulation-core/src/sprint1-person-growth.test.ts`
- `packages/simulation-core/src/sprint1-technique-catalog.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.12-contracts.test.ts`

## 関連する判断

- [../decisions/sprint0.md](../decisions/sprint0.md)
- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../invariants/index.md](../invariants/index.md)
- [../tasks/index.md](../tasks/index.md)
