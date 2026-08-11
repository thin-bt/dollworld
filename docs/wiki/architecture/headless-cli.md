---
title: ヘッドレスCLI
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/TECHNICAL_DECISIONS.md
  - tasks/S00-008.md
  - package.json
  - commit:2ac55e400a3374e7f41e0c009259439e672f1008
last_verified: 2026-08-01
related:
  - output-contract.md
  - world-engine.md
---

# ヘッドレスCLI

## 概要

`apps/simulator` から years／seed／config を指定してシミュレーションを実行する CLI（S00-008）。

## 現在確定している内容

- 引数解析は `node:util` の `parseArgs`
- 代表コマンド: `npm run simulate -- --years 100 --seed 12345 --config config/initial-world.config.json`
- Sprint 0 完了検証: `npm run verify:sprint0`
- core は `node:crypto` を直接 import しない（Sha256 は CLI 側注入）
- Sprint 1（`S1-SPEC-0.1.20`）: 新規optionは`--sprint1-input`のみ（`Sprint1CliInput` 0.1.0）。省略時はSprint 0挙動維持。S01-008でproduction配線済み／accepted
- Sprint 1 完了検証: S01-009でルート`npm run verify:sprint1`を実装済み（accepted）。simulation CLI optionは増やさず、verification entrypointを別scriptとする。残作業は clean master 再実行と `sprint1-complete` tag 作成

## 関連する正本

- [`tasks/S00-008.md`](../../../tasks/S00-008.md)
- [`docs/TECHNICAL_DECISIONS.md`](../../TECHNICAL_DECISIONS.md)
- [`docs/specs/02-config-schema.md`](../../specs/02-config-schema.md)
- [`docs/specs/05-statistics-output.md`](../../specs/05-statistics-output.md)

## 関連するコード

- `apps/simulator/src/main.ts`
- `apps/simulator/src/cli.ts`
- `apps/simulator/src/file-loader.ts`
- `apps/simulator/src/node-sha256-provider.ts`
- `apps/simulator/src/verify-sprint0-main.ts`

## 関連するテスト

- `apps/simulator/src/cli.test.ts`

## 関連する判断

- [../tasks/S00-008.md](../tasks/S00-008.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [output-contract.md](output-contract.md)
- [../tasks/S00-010.md](../tasks/S00-010.md)
