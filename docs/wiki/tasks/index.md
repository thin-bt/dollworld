---
title: タスク索引
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/SPRINT_0_BACKLOG.md
  - docs/SPRINT_1_BACKLOG.md
  - tag:sprint0-complete
  - commit:530e3f88d054eec11840e2e54743bf4c9a705654
  - commit:3b313a5ea690351d062e751bc724e5530b835872
last_verified: 2026-08-07
---

# タスク索引

## 概要

Sprint 0・Sprint 1のタスク説明ページへの索引。正本はそれぞれ `docs/SPRINT_0_BACKLOG.md`／`tasks/S00-xxx.md`、および `docs/SPRINT_1_BACKLOG.md` である。本Wikiは正本ではない。

## 現在確定している内容

### Sprint 0（実装済み）

| ID | Wiki | 主な実装 commit |
|---|---|---|
| S00-001 | [S00-001.md](S00-001.md) | `2f61ebeebb54f3eef469d9dc7c749af06e658a2d` |
| S00-002 | [S00-002.md](S00-002.md) | `5bcf16627c4550c39fabe240f4f5dd0ddd85eb8b` |
| S00-003 | [S00-003.md](S00-003.md) | `1fdff3d871044d84ca6fce4957d4114a2411b40d` |
| S00-004 | [S00-004.md](S00-004.md) | `ba878b509f49a631a464b2f7743e978ecc5d3a61` |
| S00-005 | [S00-005.md](S00-005.md) | `45c7cfe7cce0ddc1df1ecef024067a6d5167efa5` |
| S00-006 | [S00-006.md](S00-006.md) | `2fcde67c92adef3fd6f913d85e442a16f6c226ac` |
| S00-007 | [S00-007.md](S00-007.md) | `7bf868e51027865fe73779ad2b21c7b83514b7af` |
| S00-008 | [S00-008.md](S00-008.md) | `2ac55e400a3374e7f41e0c009259439e672f1008` |
| S00-009 | [S00-009.md](S00-009.md) | `4958ba8c841c9ad2aff00d62579e2863af54f099` |
| S00-010 | [S00-010.md](S00-010.md) | `19161dcaa932753e07e2333d65ea464915ad85aa` / `504fa3cc16346dd0c6480e8328e42518e68215d3` |

### Sprint 1（部分実装中・全体は未完了）

正本: [`docs/SPRINT_1_BACKLOG.md`](../../SPRINT_1_BACKLOG.md)。仕様版 `S1-SPEC-0.1.13`。Sprint 1全体は未完了。S01-001〜004 implemented、次はS01-005。

共有型所有の要約（詳細は正本）:

- `TechniqueId`／`PersonTechniqueState`保存構造: S01-001（implemented）
- `Sprint1PersonState`組立: S01-002（implemented）
- TechniqueCatalogと技状態の意味的validation: S01-003（implemented）
- 週間Planner／訓練・習得・練習・休養の適用: S01-004（implemented）

| ID | Wiki | 状態 | 依存 |
|---|---|---|---|
| S01-001 | [S01-001.md](S01-001.md) | implemented | なし |
| S01-002 | [S01-002.md](S01-002.md) | implemented | S01-001 |
| S01-003 | [S01-003.md](S01-003.md) | implemented | S01-001、S01-002 |
| S01-004 | [S01-004.md](S01-004.md) | implemented | S01-002、S01-003 |
| S01-005 | [S01-005.md](S01-005.md) | pending | S01-001、S01-002、S01-003 |
| S01-006 | [S01-006.md](S01-006.md) | pending | S01-005 |
| S01-007 | [S01-007.md](S01-007.md) | pending | S01-006 |
| S01-008 | [S01-008.md](S01-008.md) | pending | S01-004、S01-007 |
| S01-009 | [S01-009.md](S01-009.md) | pending | S01-008 |

次の実装着手は S01-005。WorldEngineへの週間処理登録は S01-008。Sprint 1全体は未完了。

## 関連する正本

- [`docs/SPRINT_0_BACKLOG.md`](../../SPRINT_0_BACKLOG.md)
- [`docs/SPRINT_1_BACKLOG.md`](../../SPRINT_1_BACKLOG.md)
- [`tasks/`](../../../tasks/)（Sprint 0個別タスク）

## 関連するコード

- S01-001: `packages/simulation-core/src/sprint1/`（ドメイン型・設定基盤）
- S01-002: `packages/simulation-core/src/sprint1/`（人物状態・adapter・selector）
- S01-003: `packages/simulation-core/src/sprint1/technique-*.ts`（カタログ・意味validation・習得条件）
- S01-004: `packages/simulation-core/src/sprint1/weekly-*.ts`／`process-weekly-training-week.ts`
- S01-005以降: 未着手

## 関連するテスト

- `packages/simulation-core/src/sprint1-weekly-training.test.ts`（S01-004）

## 関連する判断

- [../sprints/sprint0.md](../sprints/sprint0.md)
- [../sprints/sprint1.md](../sprints/sprint1.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../sprints/sprint0.md](../sprints/sprint0.md)
- [../sprints/sprint1.md](../sprints/sprint1.md)
- [../index.md](../index.md)
