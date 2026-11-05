# サンプルと、ベースだけにする手順

このリポジトリは、拡張開発のベースに参考用のサンプルを載せた構成です。
サンプルは仕組みの使い方を示すためのもので、派生製品では消してから自分の機能を作る想定です。

## ベースとサンプルの分担

| 区分 | 内容 |
| --- | --- |
| ベース | 起動点と画面の枠（ポップアップ・サイドパネル・設定画面）、テーマの設定、service worker の起動と登録の仕組み、メッセージ通信・右クリックメニュー・多言語化・保存・HTTP の基盤、検証の仕組み、ビルドと配布物のテスト、E2E の補助 |
| サンプル | メモ（保存・REST の取り込み・右クリックからの追加・他画面への追従）、ページ取得（選択テキストの取得の設定を含む）、サイドパネルのサイト単位の許可、`tests/examples/` と `tests/e2e/samples/` の参考テスト |

画面の枠は、起動点が配置した機能の部品を表示します。部品が一つもないときは「ここに機能を追加します」と表示します。
機能の組み立ては `composition/<機能>.ts` にまとめ、画面と worker の両方から使います。

## サンプルの印

サンプルだけのファイルは `scripts/samples.ts` の `SAMPLE_PATHS` に一覧があります。
ベースのファイルの中でサンプルを接続している部分は、次の印で囲んでいます。

```ts
// @sample-begin
import { createNoteScreens } from "./notes";
// @sample-end
```

JSX では `{/* @sample-begin */}`、CSS では `/* @sample-begin */`、YAML では `# @sample-begin`、Markdown では `<!-- @sample-begin -->` の形です。
コメントの記号で始まる行だけを印として扱うため、文章中で印の名前に触れても削除されません。
印は行単位で扱い、`@sample-begin` の行から `@sample-end` の行までを削除します。入れ子にはできません。
印の外だけでビルドと型チェックが通るように、import・プロパティ・文を丸ごと囲んでください。

## ベースだけにする

```sh
pnpm run samples:remove
pnpm run check
pnpm run check:sidepanel
```

`samples:remove` は次を行います。未コミットの変更があるとき、または git の管理下にないフォルダー（ZIP で取得した場合など）では
止まります。`--force` を付けると確認せずに続行します。ZIP で取得した場合は、`git init` してコミットしてから実行するのが安全です。

- サンプルのファイルと、印で囲んだ部分を削除する。
- manifest からサンプル用の権限（`activeTab`・`scripting`・`contextMenus`）と SampleAPIs の host permission を削除する。
  サイドパネル版の `tabs`・`optional_host_permissions` は `vite.config.ts` の印の中にあり、一緒に消えます。
- `package.json` からサンプル用のスクリプト（`test:examples`・`samples:remove`・`samples:verify`）を削除する。
- 残ったコードと manifest が参照しない文言を `_locales` から削除する。
- CI の「サンプルなしの検証」の手順と、このスクリプト自身を削除する。
- README・ドキュメントのうち、サンプル専用のコマンドや参考テスト、このガイドへの案内を削除する。

削除後に残るのは、テーマを切り替えられる空の画面、何も登録していない worker、ベースのテストです。
ドキュメントのうち印で囲んだ部分は消えますが、サンプルを例にした説明の文章は残るので、必要に応じて整理してください。
製品名は `_locales` の `appName`（画面の見出しとタブの題名）と、`extensionName*`・`actionTitle*`（manifest）で変えます。
`docs/screenshots/` もサンプル入りの画面なので、自分の画面で撮り直してください。

## サンプルを変更するときの確認

```sh
pnpm run samples:verify
```

作業ツリーを一時フォルダーに複製し、そこでサンプルを削除してから `check` と `check:sidepanel` を実行します。
git の管理下にない場合は、`node_modules`・`dist`・`release` を除くファイルを複製します。
元の作業ツリーは変更しません。CI もポップアップ版の実行でこの確認を行い、サンプルを消してもベースが壊れないことを保証します。
サンプルを足すときは、ファイルを `SAMPLE_PATHS` に加えるか、ベースとの接続部分を印で囲んでください。
