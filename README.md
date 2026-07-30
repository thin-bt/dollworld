# 共有世界型ゲーム AI開発スターター

このフォルダは、ゲーム仕様の正本と、AIへ安全かつ小単位で実装させるための開発資料をまとめたスターターです。

## 資料の優先順位

1. `docs/SPEC.md`：ゲーム仕様の正本
2. `docs/specs/*.md`：対象システムの実装用ミニ仕様
3. `tasks/Sxx-xxx.md`：今回の実装範囲と受入条件
4. `docs/TECHNICAL_DECISIONS.md`：技術上の固定事項
5. `config/*.json`：検証用の暫定値

矛盾を見つけた場合、AIは独自判断で実装せず停止して報告します。

## 現在の構成

```text
/
├─ AGENTS.md
├─ README.md
├─ docs/
│  ├─ SPEC.md
│  ├─ SPEC_CHANGELOG.md
│  ├─ AI_DEVELOPMENT_RULES.md
│  ├─ TECHNICAL_DECISIONS.md
│  ├─ TOKEN_EFFICIENT_SPEC_WORKFLOW.md
│  ├─ SPEC_PREPARATION_PLAN.md
│  ├─ SPEC_INDEX.md
│  ├─ SPRINT_0_BACKLOG.md
│  ├─ FINAL_INTEGRITY_AUDIT.md
│  └─ specs/
│     ├─ 00-domain-glossary.md
│     ├─ 01-world-calendar.md
│     ├─ 02-config-schema.md
│     ├─ 03-event-envelope.md
│     ├─ 04-initial-world-generation.md
│     ├─ 05-statistics-output.md
│     ├─ 06-name-data.md
│     ├─ 07-seeded-rng.md
│     └─ SYSTEM_SPEC_TEMPLATE.md
├─ config/
│  └─ initial-world.config.json
├─ data/names/
├─ tasks/
│  ├─ TASK_TEMPLATE.md
│  └─ S00-001.md ～ S00-010.md
└─ prompts/
   └─ S00-001_EXECUTION_PROMPT.md
```

## Sprint 0の目的

ゲーム本体を大量に実装する前に、次を成立させます。

- npm workspacesによるTypeScript基盤
- 純粋なシミュレーションコア
- 設定検証
- Seeded RNG（`xoshiro128ss-v1`）
- 1週単位の世界暦
- 構造化イベント
- 初期世界生成
- ヘッドレスCLI
- 100年・300年実行
- 統計、スナップショット、検証、性能出力

修行、戦闘、大会、結婚、出産、寿命・死亡はSprint 0では実装しません。ただし、既存人物の年初一斉加齢と42歳強制引退は実装します。

## 正本で固定済みの暦

- 世界年は4月第1週から翌年3月第4週までの48週
- 全人物は4月第1週生まれ
- 人物ごとの誕生月・誕生週・誕生日は保持しない
- 毎年4月第1週に対象人物を一斉加齢
- その年に出生した人物は同年の加齢対象外

## データベース方針

- 将来の永続化DBはMySQL 8.x
- Sprint 0では永続DBを使用しない
- シミュレーション中核はMySQL、ORM、HTTP、Reactへ依存させない


## S00-001の固定環境

- Node.js `>=24.18.0 <27`（推奨LTSは24.18.0、Node.js 26も許容）
- npm 11.16.0（`>=11.16.0 <12`）
- TypeScript 6.0.3
- Vitest 4.1.10
- ESLint 10.7.0 + `@eslint/js` 10.0.1
- typescript-eslint 8.65.0
- Prettier 3.9.6

初回は`npm install --package-lock-only --ignore-scripts`でlockfileを生成してから`npm ci`を実行する。

## 開発開始

最初の実装は `tasks/S00-001.md` です。ローカルの実装AIへは、`prompts/S00-001_EXECUTION_PROMPT.md` をそのまま渡せます。
