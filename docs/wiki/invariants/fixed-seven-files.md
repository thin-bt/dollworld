---
title: 固定7ファイル検証
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/05-statistics-output.md
  - tasks/S00-009.md
  - tasks/S00-010.md
  - apps/simulator/src/sprint0-verification/fixed-seven-files.ts
last_verified: 2026-08-01
related:
  - ../architecture/output-contract.md
---

# 固定7ファイル検証

## 概要

run ディレクトリが固定7通常ファイルだけを持つことの厳密検証。

## 現在確定している内容

S00-010 検証器より:

- `readdirSync(..., { withFileTypes: true })` で全エントリを検査
- エントリ総数が7
- 各エントリが通常ファイル
- ファイル名集合が `FIXED_OUTPUT_FILE_NAMES` と完全一致
- 余計なディレクトリ・シンボリックリンク・必須名を持つディレクトリ／リンクは不合格
- yearProfile の `sevenFilesPassed` も実ディスク検証結果を反映する
- 同 seed 比較の second run（years100b）も独立に検証する

## 関連する正本

- [`docs/specs/05-statistics-output.md`](../../specs/05-statistics-output.md)
- [`tasks/S00-009.md`](../../../tasks/S00-009.md)
- [`tasks/S00-010.md`](../../../tasks/S00-010.md)

## 関連するコード

- `apps/simulator/src/output/fixed-files.ts`
- `apps/simulator/src/sprint0-verification/fixed-seven-files.ts`
- `apps/simulator/src/sprint0-verification/same-seed-verification.ts`

## 関連するテスト

- `apps/simulator/src/sprint0-verification/sprint0-verification.test.ts`
- `apps/simulator/src/output/output.test.ts`

## 関連する判断

- [../architecture/output-contract.md](../architecture/output-contract.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../tasks/S00-009.md](../tasks/S00-009.md)
- [../tasks/S00-010.md](../tasks/S00-010.md)
