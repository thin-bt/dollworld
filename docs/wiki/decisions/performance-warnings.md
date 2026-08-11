---
title: 性能警告の扱い
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/SPRINT_0_BACKLOG.md
  - tasks/S00-010.md
  - commit:504fa3cc16346dd0c6480e8328e42518e68215d3
  - tag:sprint0-complete
last_verified: 2026-08-01
related:
  - ../tasks/S00-010.md
  - sprint0.md
---

# 性能警告の扱い

## 概要

Sprint 0 性能目標と、最終 `verify:sprint0` 完了レポートの測定結果。合否は機能失敗とは分離される。

**範囲:** 本ページはSprint 0専用。S01-009 Sprint 1 population performance（存命人口 target 600／2000／5000 × years=1 baseline）へ、下記30秒／120秒／measure-only thresholdを流用しない。Sprint 1はtiming aloneでwarning／failureにせず、Sprint 0 warningはcompletion reportへimportのみする。

## 現在確定している内容

### 警告基準（バックログ）

| 条件 | 基準 | 扱い |
|---|---|---|
| 600人・100年 | 30秒以内 | 超過は warning（失敗にしない） |
| 2,000人・100年 | 120秒以内 | 超過は warning（失敗にしない） |
| 5,000人・100年 | なし | measure only |

### 最新の確定測定結果

出典: `output/sprint0-verification/sprint0-completion-report.json`（commit `504fa3cc16346dd0c6480e8328e42518e68215d3`、`workingTreeDirty=false`、`overallPassed=true`）。

| population | actualSeconds | warningSeconds | exceeded | measureOnly |
|---|---|---|---|---|
| 600 | 29.93 | 30 | false | false |
| 2000 | 171.81 | 120 | true | false |
| 5000 | 1079.818 | null | false | true |

- `warningCount`: 1
- `performanceWarnings`: `2000 people / 100 years: 171.81s exceeded 120s`
- 人口別 maxRSS は独立子プロセスで計測
- 年数別プロファイル（10／50／100／300）の `maxRssKilobytes` は `null`（`maxRssMeasurementScope=not_measured_per_run`）。単独測定していない

### 合否への影響

- 性能超過は `overallPassed` を false にしない（functional failure ではない）
- 機能側（決定性・不変条件・固定7ファイル等）が合格であることが前提

### 次フェーズへの申し送り

- 2000人100年が120秒基準を超過している（171.81s）
- boundary seed の長期性能プロファイルは notPerformed
- 年数別 maxRSS の孤立測定は notPerformed

## 関連する正本

- [`docs/SPRINT_0_BACKLOG.md`](../../SPRINT_0_BACKLOG.md)
- [`tasks/S00-010.md`](../../../tasks/S00-010.md)

## 関連するコード

- `apps/simulator/src/sprint0-verification/run-population-performance.ts`
- `apps/simulator/src/sprint0-verification/completion-report.ts`
- `config/initial-world.config.json`（performanceTargets。数値は暫定値）

## 関連するテスト

- `apps/simulator/src/sprint0-verification/sprint0-verification.long.test.ts`（任意の長時間ラッパ）
- `npm run verify:sprint0`

## 関連する判断

- [sprint0.md](sprint0.md)

## 未解決事項

- 2000人100年の性能改善は Sprint 0 完了条件外の申し送り

## 関連Wikiページ

- [../tasks/S00-010.md](../tasks/S00-010.md)
- [../sprints/sprint0.md](../sprints/sprint0.md)
