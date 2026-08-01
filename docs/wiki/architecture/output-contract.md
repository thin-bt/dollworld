---
title: 固定出力契約
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/05-statistics-output.md
  - tasks/S00-009.md
  - apps/simulator/src/output/fixed-files.ts
  - commit:4958ba8c841c9ad2aff00d62579e2863af54f099
last_verified: 2026-08-01
related:
  - ../invariants/fixed-seven-files.md
  - headless-cli.md
---

# 固定出力契約

## 概要

各 run ディレクトリへ出力する固定7ファイルの契約への入口（S00-009、ミニ仕様 05）。

## 現在確定している内容

固定ファイル名（実装定数と 05 より）:

1. `run-metadata.json`
2. `initial-world.json`
3. `final-world.json`
4. `yearly-statistics.csv`
5. `events.jsonl`
6. `validation-report.json`
7. `performance.json`

- 出力先は `output/<run-id>/`（実行時に生成。リポジトリ正本ではない）
- 途中失敗時に不完全な最終ディレクトリを残さない（atomic 書込）
- 100年実行で CSV は世界年1〜100の100行

厳密な検証は [../invariants/fixed-seven-files.md](../invariants/fixed-seven-files.md) を参照。

## 関連する正本

- [`docs/specs/05-statistics-output.md`](../../specs/05-statistics-output.md)
- [`docs/specs/03-event-envelope.md`](../../specs/03-event-envelope.md)
- [`tasks/S00-009.md`](../../../tasks/S00-009.md)

## 関連するコード

- `apps/simulator/src/output/fixed-files.ts`
- `apps/simulator/src/output/build-run-output.ts`
- `apps/simulator/src/output/atomic-write.ts`
- `apps/simulator/src/sprint0-verification/fixed-seven-files.ts`

## 関連するテスト

- `apps/simulator/src/output/output.test.ts`
- `apps/simulator/src/sprint0-verification/sprint0-verification.test.ts`

## 関連する判断

- [../tasks/S00-009.md](../tasks/S00-009.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../invariants/fixed-seven-files.md](../invariants/fixed-seven-files.md)
- [../tasks/S00-010.md](../tasks/S00-010.md)
