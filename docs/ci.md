# GitHub Actions と拡張 ZIP

[Extension CI](../.github/workflows/extension.yml) が、依存関係のインストール、
ベースの必須テスト、型チェック、ビルド、配布物の構成確認を実行します。
成功したビルドだけを ZIP にして、Actions の Artifact に保存します。

## 実行タイミング

- `master` 向けの Pull Request 作成・更新。
- `master` への push。
- `v*` タグへの push。
- Actions 画面からの手動実行（`Run workflow`）。

既定は全て `popup` です。手動実行時だけ `variant` を `sidepanel` に変更できます。
方式ごとの実行は別の concurrency group にし、互いの実行をキャンセルしません。

Node.js は `.nvmrc`、pnpm は `package.json` の `packageManager` に合わせます。
`pnpm install --frozen-lockfile` の後に、既定では `pnpm run check`、
サイドパネル選択時は `pnpm run check:sidepanel` を実行します。
`tests/examples/` の参考テストは実行しませんが、残っているファイルの型はチェックします。

## ZIP を取得して Chrome で確認する

1. GitHub のリポジトリで **Actions → Extension CI** を開く。
2. 対象のコミットで成功した実行を開く。手動なら **Run workflow → master → variant** で `popup` / `sidepanel` を選ぶ。
3. 実行サマリーのダウンロードリンク、または **Artifacts** の `chrome-extension-<popup または sidepanel>-<コミット先頭12桁>.zip` を選ぶ。
4. ZIP をローカルのフォルダーに展開する。
5. Chrome の `chrome://extensions` でデベロッパーモードを有効にする。
6. 「パッケージ化されていない拡張機能を読み込む」で、展開した `manifest.json` があるフォルダーを選ぶ。
7. ツールバーに固定し、メモ・REST 取得・設定・ページ取得を試す。

ZIP の直下には `manifest.json` とビルド済み HTML・assets があり、`dist/popup/` / `dist/sidepanel/` の親フォルダーは入りません。
動作確認時に調査しやすいよう、ビルドで生成した source map も含めています。
ZIP を二重に圧縮しないよう `upload-artifact` の `archive: false` を指定しています。
Node.js や pnpm を手元に導入しなくても、ZIP の展開だけでサンプルを読み込めます。

更新時は同じフォルダーの内容を新しい ZIP で置き換え、拡張管理画面で再読み込みしてください。
必要に応じて対象の Web ページも再読み込みします。
詳細な操作は [拡張サンプル](extension.md) と [README](../README.md#chrome-で実行) を参照してください。

Artifact は 30 日で期限切れになるため、必要なら再実行して生成します。
ダウンロードには GitHub へのログインが必要です。
タグでも同じ ZIP を生成しますが、GitHub Release の作成や Chrome Web Store への公開は行いません。
この ZIP は、署名付きの `.crx` ではなく、展開して読み込むビルド成果物です。

## 検証範囲と運用

CI は配布物を生成できることを確認します。実際の権限付与、ページへの注入、
Chrome のポップアップやサイドパネルの動作は、ダウンロードした拡張で確認してください。

ワークフローの権限は `contents: read` に限定し、第三者の Action はコミット SHA で固定しています。
このリポジトリの専用 secret は不要です。派生リポジトリでも Actions が有効なら利用できます。
fork からの PR などは、GitHub の設定により管理者の実行承認が必要な場合があります。

失敗した PR のマージ自体も禁止したい場合は、リポジトリの Rulesets / Branch protection で
`Verify and package` を必須チェックに指定してください。ワークフローを置くだけではマージ制限は付きません。
