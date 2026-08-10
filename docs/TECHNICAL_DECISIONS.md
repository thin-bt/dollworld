# 技術決定書

- 技術決定バージョン：`TECH-0.1.4`
- 基準日：2026-07-30

## 1. リポジトリ

- npm workspacesを使用するモノレポ構成とする。
- ルートのworkspace対象は `packages/*` と `apps/*`。
- Sprint 0開始時は `packages/simulation-core` を作成する。
- ルートpackage名は`shared-world-observation-game`、初期package名は`@shared-world/simulation-core`とし、双方を`private: true`とする。
- CLIはS00-008で `apps/simulator` として追加する。
- フロントエンドとAPIは後続Sprintで追加する。

## 2. ランタイムとパッケージ管理

- Node.js：推奨は24 LTS系列の`24.18.0`、許容範囲は`>=24.18.0 <27`（Node.js 26を含む）
- npm：Node.js 24.18.0同梱の`11.16.0`を基準とし、`>=11.16.0 <12`
- ルート`package.json`へ`packageManager: "npm@11.16.0"`を記載する。
- `package-lock.json`を必ずコミットする。
- 初回のみ、manifest作成後に`npm install --package-lock-only --ignore-scripts`でlockfileを生成し、その後`npm ci`を実行する。lockfileを手書きしない。
- CI・他端末では`npm ci`を使用する。
- `npm audit fix`、依存の自動更新、バージョン範囲への置換は個別承認なしに行わない。

Node.js 24.18.0を推奨LTSとする。Node.js 26はCurrentだが、S00-001で検証済みのため許容環境とする。`.nvmrc`は推奨LTSの`24.18.0`を示す。

2026-07-30の再確認時点で、Node.js公式配布の24系最新LTSは24.18.0である。2026-07-27付のセキュリティリリース告知はあるが、24.18.0より新しい24系バイナリはまだ公開されていないため、未公開の版番号を指定しない。新しい24系セキュリティ版が公開された場合は、S00-001へ混在させず、技術決定の更新として扱う。

## 3. TypeScript・テスト・品質ツール

初期導入バージョン：

| パッケージ | バージョン |
|---|---:|
| `typescript` | `6.0.3` |
| `vitest` | `4.1.10` |
| `eslint` | `10.7.0` |
| `@eslint/js` | `10.0.1` |
| `typescript-eslint` | `8.65.0` |
| `prettier` | `3.9.6` |
| `@types/node` | `24.13.3` |

TypeScript 7は、採用するtypescript-eslint 8.65.0の公式対応範囲外のため採用しない。依存更新は専用タスクで行う。

`@eslint/js`はESLint本体と同じマイナー番号では公開されていないため、公開済みの10系`10.0.1`を使用する。すべての開発依存は`package.json`で完全固定し、lockfileだけに解決を委ねない。

## 4. Sprint 0の実行時依存

- `packages/simulation-core`は外部の実行時依存を持たない。
- 設定検証はS00-002で手書きの明示的バリデータとして実装し、Zod等を独自追加しない。
- Seeded RNGは`xoshiro128ss-v1`をS00-003で実装する。詳細は`docs/specs/07-seeded-rng.md`。
- CLI引数解析はNode.js標準の`node:util` `parseArgs`を使用し、引数解析ライブラリを追加しない。
- `simulation-core`は正規化JSONと`Sha256Provider`インターフェースを定義するが、`node:crypto`を直接importしない。
- Node.js用SHA-256実装はS00-008で`apps/simulator`側へ置き、`node:crypto`から注入する。テストコード内ではNode標準実装を使用してよい。
- ハッシュ計算の具象、CLI、ファイルI/OなどNode固有機能はアプリ層またはアダプタへ置き、純粋ドメイン処理へ混在させない。

新しい実行時依存が必要な場合は、実装を止めて技術決定の変更案を提出する。

## 4.1 Sprint 1 CLI入力（S1-SPEC-0.1.20）

- 既存CLI option（`--years`／`--seed`／`--config`）は壊さない。`--config`は従来どおりSprint 0由来のinitial-world config pathとする。
- Sprint 1 new run向けに追加するCLI optionは`--sprint1-input <path>`のみとする。`--sprint1-config`／`--technique-catalog`／`--weekly-sidecar`／`--enable-sprint1`等を増やさない。
- `--sprint1-input`省略時は従来Sprint 0 CLI挙動を完全維持する。指定時のみSprint 1 new runとする。
- 入力ファイル形状は`Sprint1CliInput`（schemaVersion `0.1.0`）とする。必須fieldは`schemaVersion`／`sprint1Config`／`techniqueCatalog`／`initialWeeklyTrainingSidecar`のみ。未知キーは拒否する。
- `techniqueCatalog`は既存`TechniqueCatalog`正本shape（`identity`／`definitions`）をそのまま入れる。別catalog schemaを作らない。
- path／mtimeはSimulationIdentity材料にしない。検証済み内容（config hash／catalog hash／sidecar hash）とseed・既存version fieldsだけをidentity材料とする。
- `--sprint1-input`のparseArgs配線・file loader・WorldEngine登録はS01-008本体の実装範囲とする。本決定はoption契約と入力形状を固定する。
- Sprint 1 new-runのfresh initialization promotion／`Sprint1RunRuntimeState.eventStream`／`EventAllocationState`契約は02・03・10ミニ仕様を正本とする。保存済みSprint 0 runのsimulationId置換は禁止。
- 既存`WorldProcessor` interfaceは変更しない。S1-SPEC-0.1.20の production配列`[weekly-training]`はSprint1 transactional processor adapter pipelineのみを意味し、legacy `WorldProcessor`／`RunWorldOneWeekInput.processors`への登録ではない（二重実行禁止）。`WEEKLY_TRAINING_PROCESSOR_ID`はadapter ID／`EventEnvelope.sourceProcessor`である。
- immutable `Sprint1RunContext`（`sprint1Config`／`techniqueCatalog`／`initialWeeklyTrainingSidecarSnapshot`／identity／RunRuleSnapshot）とmutable `Sprint1RunRuntimeState`を`Sprint1RunSession`で束ねる。config／catalog／identity／RunRuleSnapshot／initial sidecarはrun中再読込・再構築しない。context validationは外部`initialMatchIdGeneratorState`依存を持たない。
- `Sprint1RunRuntimeState`オブジェクト自体はcheckpoint非永続。`initialWeeklyTrainingSidecarSnapshot`はinitial-world 0.4.0へ、`weeklyTrainingSidecars`および`battleResults`はfinal-world 0.3.0へ投影する。fixed7は exactly 7 files（`battle-results.json`禁止）。
- `battleResults`はrun全体commit順canonical store。`BattleResultWeekState`は同週count専用。week resetでglobal storeを削除しない。
- `processorSpecificStates.specificState`はplain JSONのみとし、WorldEngine validate／clone／export／restoreはdescriptor-safe deep cloneする（nested alias禁止）。

## 5. モジュールとビルド

- ESMを使用する。
- `package.json`は`type: module`。
- TypeScriptは`module` / `moduleResolution`ともに`NodeNext`。
- 共通設定はルート`tsconfig.base.json`に置く。
- packageごとに`tsconfig.json`を持つ。
- Sprint 0ではバンドラーを導入せず`tsc`でビルドする。

## 6. TypeScript品質設定

最低限、次を有効にする。

- `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noFallthroughCasesInSwitch`
- `noUncheckedSideEffectImports`
- `verbatimModuleSyntax`
- `forceConsistentCasingInFileNames`

## 7. ESLint・Prettier・改行

- ESLint 10のflat configを使用する。
- 設定ファイルは`eslint.config.mjs`。
- TypeScriptにはtypescript-eslintのrecommended設定を適用する。
- Prettierは整形のみを担当し、ESLintと責務を混ぜない。
- `format:check`を完了条件へ含める。
- S00-001では既存資料を改変しないため、`.prettierignore`で`**/*.md`、`docs/**`、`tasks/**`、`prompts/**`、`data/**`、`config/**`、`package-lock.json`、生成物を除外する。
- `.gitattributes`を作成し、テキストファイルをLFへ固定する。
- ルート`check`は`format:check → lint → typecheck → test → build`の順に実行する。`test`は`vitest run`としwatch待機させない。

## 8. 依存方向

`packages/simulation-core`は次へ依存してはならない。

- React / Vite
- Fastifyその他HTTPフレームワーク
- MySQLドライバー / ORM
- Node固有のファイルI/O（純粋ロジック内）
- ブラウザAPI

外部I/Oはアプリ層から注入する。

## 9. データベース

- 将来の永続化DBはMySQL 8.x。
- Sprint 0ではMySQL接続、テーブル、ORM、マイグレーションを実装しない。
- 論理モデルが安定した後に物理スキーマを決定する。

## 10. バージョン更新

- 依存更新は実装タスクへ混在させない。
- 更新時は公式対応範囲、Node対応範囲、全テストを確認する。
- `package-lock.json`の差分をレビューする。
