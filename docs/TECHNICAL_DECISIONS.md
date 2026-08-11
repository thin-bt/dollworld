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
- `--sprint1-input`のparseArgs配線・file loader・Sprint1 WorldEngine／run-session統合はS01-008でproduction実装・accepted済み。本決定はoption契約と入力形状を固定する。
- Sprint 1 new-runのfresh initialization promotion／`Sprint1RunRuntimeState.eventStream`／`EventAllocationState`契約は02・03・10ミニ仕様を正本とする。保存済みSprint 0 runのsimulationId置換は禁止。
- 既存`WorldProcessor` interfaceは変更しない。S1-SPEC-0.1.20の production配列`[weekly-training]`はSprint1 transactional processor adapter pipelineのみを意味し、legacy `WorldProcessor`／`RunWorldOneWeekInput.processors`への登録ではない（二重実行禁止）。`WEEKLY_TRAINING_PROCESSOR_ID`はadapter ID／`EventEnvelope.sourceProcessor`である。
- immutable `Sprint1RunContext`（`sprint1Config`／`techniqueCatalog`／`initialWeeklyTrainingSidecarSnapshot`／identity／RunRuleSnapshot）とmutable `Sprint1RunRuntimeState`を`Sprint1RunSession`で束ねる。config／catalog／identity／RunRuleSnapshot／initial sidecarはrun中再読込・再構築しない。context validationは外部`initialMatchIdGeneratorState`依存を持たない。
- `Sprint1RunRuntimeState`オブジェクト自体はcheckpoint非永続。`initialWeeklyTrainingSidecarSnapshot`はinitial-world 0.4.0へ、`weeklyTrainingSidecars`および`battleResults`はfinal-world 0.3.0へ投影する。fixed7は exactly 7 files（`battle-results.json`禁止）。
- `battleResults`はrun全体commit順canonical store。`BattleResultWeekState`は同週count専用。week resetでglobal storeを削除しない。
- `processorSpecificStates.specificState`はplain JSONのみとし、WorldEngine validate／clone／export／restoreはdescriptor-safe deep cloneする（nested alias禁止）。
- Sprint1 validation境界（S01-008 post-acceptance performance fix）:
  - public／untrusted session境界（`createSprint1RunSession` final、`runSprint1WeeklyStep` pre/post、`commitRunBattlePlan` pre/post、fixed7 semantic）は full `validateSprint1RunSession` を維持する。
  - multi-week production loop（`runSprint1Years` および CLI yearly capture がこれを使用）は validated-session trust boundary を使用できる。開始時に session／`legacyProcessors` を full validation し、各週は transition-local validation（変更 state／appended event suffix）のみ、終了時に full session validation を必須とする。
  - unchanged validated historical `eventStream` prefix および pure weekly で変更しない global `battleResults` を毎週 full rescan する必要はない。validation semantics を弱めるものではない。
  - `runSprint1Years` の optional week observer は trusted draft `Sprint1RunSession`／runtime owner／historical eventStream を公開しない。渡してよいのは frozen narrow observation（`worldDate`／`eventCountCumulative`／当該週の validated appendedEvents suffix）のみ。observer throw は ValidationResult failure へ変換し、caller session root は不変。


## 4.2 Sprint 1完了検証（S01-009）

- Sprint 1総合完了検証の正規入口はルート`npm run verify:sprint1`とする。実装は`apps/simulator`のverification領域へ置き、`simulation-core`へNode固有I/Oを入れない。
- `verify:sprint1`のscript起動／build／Node entrypointは既存`verify:sprint0`のworkspaceパターンを踏襲し、S01-009専用に`tsx`／`ts-node`等の新runner依存を追加しない。
- 完了レポートは`output/sprint1-verification/sprint1-completion-report.json`（verification schema `0.1.0`）へ出力する。これはsimulation runの固定7ファイルではない。
- verification-owned CLI runは`output/sprint1-verification/runs/<run-key>/`をaccepted `runCli`のoutputRootとして分離し、実fixed7は既存writer layoutどおりその下の`<runId>/`に置く。`<runId>`階層をflattenしない。各run-key rootは実行前empty／nonexistent、成功後exactly 1 runId directoryを必須とする。開始時に掃除してよいのはverification-owned runs領域とcompletion report tempだけで、一般の`output/`やユーザーrunを削除しない。run key／絶対pathをSimulationIdentity材料へ入れない。
- weekly＋technique＋battle統合シナリオのfixed7も同じrun-key／runId layoutを使い、S01-008 accepted `buildAndWriteSprint1RunOutput`＋`evaluateReferenceIntegrity`経路を再利用する。verification用flat writer／別integrity計算は作らない。
- run分離はaccepted `runCli(argv, { outputRoot })`のprogrammatic optionを利用してよく、`--output-root`等のpublic CLI argv optionを追加しない。same-seed 2runはfresh invocation＋別output rootを必須とするがOS processまでは要求しない。population performanceのみSprint0方式の独立子processを維持する。
- 長期・性能検証は通常`npm test`へ暗黙追加せず、`verify:sprint1`から明示実行する。
- verification seed matrixは`baseSeed=12345`／`alternateSeed=54321`。same-seedはbase seed 100年×2、different-seedは12345 vs 54321を100年、boundary seedは0／4294967295各2回の1年run。年数profileは10／50／100／300年（base seed）。
- Sprint 1人口別性能は**存命人口 target** 600／2000／5000 × **years=1** のbaseline measurementとする（seed=12345固定、600→2000→5000逐次child）。`WorldState.persons.length`とのexact一致は要求しない。Sprint 0の30秒／120秒／5000 measure-only thresholdをSprint 1へ流用しない。elapsedSeconds aloneではfailure／warningにしない。長期100年耐久はtiny fixtureのsame-seed／year profilesで維持する。
- performance sidecar factoryのtemplate値はaccepted `apps/simulator/fixtures/sprint1/sprint1-input.json`のvalidated initial sidecar entriesをPersonId Unicode昇順に見た先頭entryへ固定し、各performance PersonIdでは`personId`だけ差し替える。performance専用balance値／production defaultを作らない。
- Sprint1独自の`SPRINT1_PERFORMANCE_WARNING`／30秒／120秒thresholdは置かない。Sprint 0 completion reportからのperformance warning import（`SPRINT0_PERFORMANCE_WARNING`）は維持する。
- population performanceの子プロセス分離・timer／maxRSS測定境界はSprint 0 verifier方式を再利用し、600→2000→5000の順で1 childずつ順次実行する。performance worker同士を並列実行しない。
- Sprint 1 performance用sidecar生成はverification fixture factoryに限定し、production default／fallbackへ流用しない。
- `verify:sprint1`は`npm run check`、独立`npm run wiki:check`、`git diff --check HEAD`相当、`npm run verify:sprint0`を総合sub-gateへ含め、各command resultをreportへ保存する。Sprint 0のperformance warningだけではSprint 1をfailureにしない。
- `verify:sprint1`は自身をsub-gateとして再帰実行しない。Sprint 0 completion reportはaccepted正規path `output/sprint0-verification/sprint0-completion-report.json`だけを読み、filesystem探索で別reportを選ばない。accepted reportの`warningCount`＋`performanceWarnings`を正本fieldとし、存在しない`warnings`配列を前提にしない。Sprint0 verification領域のaccepted report型／validatorを再利用してsource wire型を再定義せず、validated performance warning message件数と`warningCount`を一致確認する。各source warning messageをtop-level Sprint 1 `warnings`へexactly 1件ずつimportし、`warningCount`へ反映する。
- S01-009 accepted後はmaster上のclean treeで`verify:sprint1`を再実行し、`overallPassed=true`、`functionalFailureCount=0`、`workingTreeDirty=false`、reportの`gitCommit`=HEADを確認してから`Sprint 1`完了tag `sprint1-complete`を付ける。official verifierはGit worktree内のHEAD解決を必須とし、HEAD不明をnull fallbackでpassさせない。`verify:sprint1`自身はtagを作成・移動・削除せず、tagは受入後の明示的finalization操作とする。
- same-seed比較は05仕様の決定性除外規則を正とする。run-metadataはexisting schema validation後、exact `runId`／`realStartedAt`／`realEndedAt`だけを除外し、残りをproduction `toCanonicalJson`で比較する。S01-008に独立production comparator APIは存在しないため、S01-009の比較helperは`apps/simulator` verification内部に置き、simulation-coreへ公開しない。
- integrated battleは`official`＋production `default_strategy`を使用し、scripted actionsや自動battle schedulerで結果を固定しない。
- integrated weekly eventは`sourceProcessor=weekly-training`だけを対象とし、actorはS01-008 allocation後の`EventEnvelope.entities.personIds` exact 1件を正本としてpayloadから人物を推測しない。技状態更新actorをofficial participantへbindし、weekly前後の`Person.sprint1State.techniqueStates`実差と更新後source反映を確認する。
- integrated battleの入力はaccepted public境界を再利用する。参加資格は`isEligibleForBattleKind`、participant sourceは`validateBattleParticipantSource`、World hashは`computeExpectedWorldStateHash`、同週試合数は`computeMatchesCompletedThisWorldWeekBeforeBattle`、default action source identityは`createDefaultStrategyActionSourceIdentity`／`validateDefaultBattleStrategySource`を使用し、verification側でhash／count／eligibility／strategy採点を再実装しない。battle attemptは各独立scenarioで1回のみとし、completed以外をretryして隠さない。
- integrated scenarioのcheckpoint比較は`Sprint1RunRuntimeState`のdeterministic owner全体（World／両RNG系／sidecar／processor runtime／events／allocator／BattleResult global+week）を対象とし、production `toCanonicalJson`＋既存`Sha256Provider`以外のcanonical/hash方式を作らない。統合シナリオはweekly step exact 2回、`weeksExecuted=2`／`yearsExecuted=0`／`yearEnds=[]`でfixed7へ投影し、yearly CSVはheaderのみとする。
- identity/canonical検証のsidecar単一値mutationはPersonId昇順先頭entryの`motivationFactor`をrange内で±1するだけとし、key-order testは値・配列順を変えない。production `Math.random` scanはsimulation-core／simulator production sourceを対象としtests／verification-only sourceを除外する。comment／string literalの文字列一致はfailureにせず、実行コード上のcall expressionだけをAST／token-awareに判定する。
- `verify:sprint1`はexit 0=`overallPassed=true` report正常生成、exit 1=functional／harness failure。集約可能なfailureでは`overallPassed=false` reportを必ずatomic writeし、report write/read-back自体のfailureだけreport不在exit 1を許す。前回passed reportのstale残存を防ぎ、completion reportは一時file→rename→再読込validationする。
- required gateを前提failureで実行できない場合は`blocked`としてfunctional failureへ集約し、黙ってskipしない。
- S01-009受入中はdirty reportを許容していたが、受入は完了済み（commit `5616f5f`）。最終`Sprint 1` tag前はverification前後ともclean treeを必須とする。`_handoff-artifacts/`等のuntracked artifactはrepository外へ退避／削除し、tag通過目的のignore追加で隠さない。
- completion reportのSHA-256はreport生成・read-back validation後のfile bytesを外部計算し、JSON本文へ自己hashを埋め込まない。`sprint1-complete`既存tagをforce moveせず、別commitを指す場合は停止して確認する。
- verification用helper／reportは新しいゲーム仕様・public simulation API・実行時依存を追加する根拠にしない。

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
