# S00-001 実行プロンプト

以下を、ローカルの実装AIへリポジトリルートでそのまま渡してください。

---

このリポジトリで `S00-001` だけを実装してください。

## 最初に読むファイル

1. `AGENTS.md`
2. `docs/TECHNICAL_DECISIONS.md`
3. `tasks/S00-001.md`
4. `docs/SPEC.md` の「Webアプリの技術構成」「推奨リポジトリ構成」だけ

今回、ゲーム仕様書全文の再解釈は不要です。S00-001にゲームロジックは含まれません。

## 作業前

- `git status --short --branch` を確認してください。
- 既存の未コミット変更を破棄・上書きしないでください。
- Gitリポジトリかつ安全に作成できる場合だけ `task/S00-001-workspace-foundation` ブランチを作成してください。作れない場合はその理由を報告し、作業自体は続行して構いません。
- コード変更前に、対象タスク、参照資料、変更予定ファイル、実装方針、対象外を短く提示してください。

## 実装指示

- `tasks/S00-001.md` の範囲だけを実装してください。
- npm workspacesを使い、workspace対象は `packages/*` と `apps/*` にしてください。
- Sprint 0では `packages/simulation-core` だけを実装してください。
- Node.jsは`>=24.18.0 <25`、npmは`>=11.16.0 <12`、`packageManager`は`npm@11.16.0`、ESM、TypeScript strictを使用してください。
- 依存バージョンは `docs/TECHNICAL_DECISIONS.md` に固定されたものを使用してください。
- ESLint 10のflat config、Vitest、Prettierを設定し、`.gitattributes`でテキスト改行をLFへ固定してください。
- ルートpackage名を`shared-world-observation-game`、初期workspace package名を`@shared-world/simulation-core`にし、双方を`private: true`にしてください。
- `package-lock.json`がまだ存在しない初回だけ、設定ファイル作成後に`npm install --package-lock-only --ignore-scripts`で生成し、その後`npm ci`を実行してください。lockfileを手書きしないでください。
- 既存の `docs/`、`config/`、`data/`、`tasks/`、`prompts/` の内容を変更しないでください。`.prettierignore`で既存Markdown・データ・設定・lockfileを整形対象から除外してください。
- React、Vite、Fastify、MySQL、ORM、CLI、RNG、世界暦、ドメイン型は実装しないでください。
- `packages/simulation-core` には、packageをimportできることだけを確認する最小exportとsmoke testを置いてください。ゲームロジックを先行実装しないでください。
- `npm audit fix`を実行しないでください。依存インストールに失敗した場合、registry設定とエラーを報告し、別バージョン・別ライブラリへ勝手に置き換えないでください。

## 必須確認

次を実行し、失敗した場合は修正してください。

```text
node --version
npm --version
npm config get registry
npm install --package-lock-only --ignore-scripts
npm ci
npm run check
```

さらに、次を確認してください。

- `package-lock.json` が存在する。
- TypeScript strictが有効。
- ESMでbuildできる。
- Vitestが`vitest run`でwatch待機せず終了する。
- `npm run check`が`format:check → lint → typecheck → test → build`の順で実行される。
- `packages/simulation-core` がReact、HTTP、DB、ORMに依存していない。
- タスク外の差分がない。

## Git

全チェック成功後、Gitリポジトリでブランチ作成済みの場合は、`S00-001 TypeScript workspace foundation` というメッセージで1コミット作成してください。pushはしないでください。

## 完了報告

コード全文は貼らず、次の形式で報告してください。

```text
対象タスク:
実装した内容:
変更ファイル:
導入した依存バージョン:
追加・更新したテスト:
実行したコマンド:
テスト・型チェック・lint・format・build結果:
Gitブランチ・コミット:
仕様との差異:
未解決事項:
次タスクへの影響:
```

仕様との差異や未解決事項がない場合も「なし」と明記してください。

---
