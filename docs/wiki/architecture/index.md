---
title: アーキテクチャ索引
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/TECHNICAL_DECISIONS.md
  - docs/SPEC.md
  - docs/SPRINT_0_BACKLOG.md
last_verified: 2026-08-11
---

# アーキテクチャ索引

## 概要

Sprint 0・Sprint 1を横断するアーキテクチャ索引。Sprint 0は実装済み配置と責務分割、Sprint 1はS01-001〜S01-009がimplemented / accepted（S01-009実装commit `5616f5f`、status docs `5a80268`）。Sprint 1: **COMPLETE**。clean master final verify: PASSED on `5a80268`。completion tag: `sprint1-complete` (annotated) → `5a80268`。本docs更新は tag 作成後の post-completion status synchronization（tagは動かさない）。詳細はTECHNICAL_DECISIONS・正式ミニ仕様・コードを正とする。

## 現在確定している内容

### Sprint 0（実装済みアーキテクチャ）

- [ワークスペース構成](workspace.md)
- [simulation-core](simulation-core.md)
- [WorldEngine](world-engine.md)
- [ヘッドレスCLI](headless-cli.md)
- [固定出力契約](output-contract.md)

### Sprint 1（S01-001〜009 implemented / accepted）

- [Sprint 1処理の流れ](sprint1-processing-flow.md)
- [戦闘ライフサイクル](battle-lifecycle.md)

週間処理・戦闘・WorldEngine／CLI／fixed7統合はS01-004〜008でproduction実装・受入済み。S01-009総合受入検証もaccepted。Sprint 1: **COMPLETE**。clean master final verify: PASSED on `5a80268`。completion tag: `sprint1-complete` (annotated) → `5a80268`。本docs更新は tag 作成後の post-completion status synchronization（tagは動かさない）。

## 関連する正本

- [`docs/TECHNICAL_DECISIONS.md`](../../TECHNICAL_DECISIONS.md)
- [`docs/SPEC.md`](../../SPEC.md)

## 関連するコード

Sprint 0:

- `packages/simulation-core/`
- `apps/simulator/`

Sprint 1（S01-001〜009）:

- `packages/simulation-core/src/sprint1/`
- `apps/simulator/`（S01-008 CLI／fixed7統合、S01-009 `verify:sprint1`）

## 関連するテスト

Sprint 0 の各パッケージ Vitest テスト（詳細は下位ページ）。

Sprint 1:

- S01-001〜008の`packages/simulation-core`／`apps/simulator` regression・integration tests
- 総合完了ゲートはS01-009 `npm run verify:sprint1`（implemented / accepted）。Sprint 1: **COMPLETE**。clean master final verify: PASSED on `5a80268`。completion tag: `sprint1-complete` (annotated) → `5a80268`。本docs更新は tag 作成後の post-completion status synchronization（tagは動かさない）

## 関連する判断

- [../decisions/sprint0.md](../decisions/sprint0.md)
- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../invariants/index.md](../invariants/index.md)
- [../tasks/index.md](../tasks/index.md)
