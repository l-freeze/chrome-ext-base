# daisyUI を使う UI の構成

## 採用した構成

daisyUI は CSS のコンポーネントライブラリで、ディレクトリ構成を指定しません。
`components`・`layouts`・`styles` は React などでも使われる、フレームワークに依存しない責務名です。
ここでは画面を `screens`、Chrome 拡張の起動点を `entrypoints` に分けています。
この組み合わせが唯一の標準という意味ではありません。

```text
src/ui/
├── entrypoints/
│   └── popup.ts                  CSS 読み込み・DI・画面の組み立て
├── screens/popup/
│   ├── popup.html                画面の固定マークアップ
│   ├── popup.ts                  UI イベントと表示状態
│   └── popup.css                 この画面だけの調整
├── layouts/
│   ├── extension-shell.html      ヘッダー・コンテンツ領域・フッター
│   ├── extension-shell.ts        固定テンプレートの配置
│   └── extension-shell.css       共通レイアウトの見た目
├── components/
│   ├── action-button.ts          disabled・ローディング・aria-busy
│   ├── feedback.ts               状態に応じたメッセージ表示
│   └── feedback.css              状態表示の見た目
└── styles/
    ├── app.css                   CSS エントリーと Tailwind / daisyUI 登録
    └── themes.css                ライト／ダークのデザイントークン
```

`index.html` は拡張のエントリー HTML としてリポジトリ直下に残し、
`src/ui/entrypoints/popup.ts` を読み込みます。ビルド結果の `dist/index.html` も変わりません。
新しい画面を作るときは `screens/<画面名>/` を追加し、必要なら entrypoint と Vite の入力を追加します。
画面内でしか使わない UI を、無理に共有 components へ移す必要はありません。

## 依存方向

entrypoint は composition から検証付き controller を受け取り、レイアウトと画面を組み立てます。
画面は `features/notes/ports.ts` の `NoteActions` に依存し、
注入された検証付き操作を通して保存・読み出し・API 取得を実行します。
controller の具体型や UseCase・gateway は参照しません。
共有部品は表示だけを担当し、UseCase・fetch・Chrome Storage を呼びません。
ボタンやキーボードの入力は画面で受け、取り出した値を操作別の controller に渡します。
`controllers/load.ts`・`save.ts`・`import.ts` がそれぞれ入力を検証してから対応する UseCase を呼びます。

HTML は Vite の `?raw` で取り込んだ固定テンプレートです。
テンプレートの配置だけに `innerHTML` を使い、メモや API の内容は `value` / `textContent` で表示します。
外部入力を HTML 文字列に連結しないでください。

## daisyUI と Tailwind の使い分け

- `card`、`btn`、`badge`、`textarea`、`alert`、`loading`、`kbd` は daisyUI の基本部品。
- `size-4`、`hidden`、`text-primary` などの小さな調整は Tailwind のユーティリティ。
- 画面の寸法や独自の見た目は、各画面・レイアウト・部品に併置した CSS。

Tailwind 4 の `@tailwindcss/vite` を Vite プラグインとして登録しています。
`styles/app.css` で `tailwindcss` を import し、`daisyui` とカスタムテーマを登録します。
この構成では JS の `tailwind.config.js` や PostCSS 設定は不要です。

独自スタイルは `@layer utilities` に置き、同じ utilities 層内でネストされた
daisyUI のスタイルより優先されるようにします。`!important` による上書きは行いません。
CSS の検出範囲は `@source "../"` で `src/ui` に限定しています。
状態ごとのクラス名は `feedback.ts` のように完全な文字列で記載し、
`"alert-" + state` のような実行時の連結で CSS の生成漏れを起こさないようにします。

## テーマを変更する

`styles/themes.css` に `notebook` と `notebook-dark` の 2 テーマを定義しています。
ライトを既定にし、ダークは `prefers-color-scheme` に追従します。
ブランド色は `--color-primary` と `--color-primary-content`、
カードや背景は `--color-base-*`、角丸は `--radius-*` を変更します。
独自の紙・コーヒーカードの色は `--ui-paper` と `--ui-coffee*` です。

特定のテーマを固定して確認する場合は HTML に `data-theme="notebook"` または
`data-theme="notebook-dark"` を設定できます。属性がないときに OS の設定へ追従します。
色を変更したら両テーマで文字・フォーカス・エラー表示のコントラストを確認してください。

## 状態とアクセシビリティ

保存・取得中は両方の操作ボタンを無効化し、操作中のボタンにスピナーと `aria-busy` を付けます。
状態メッセージは `role="status"` / `aria-live="polite"` で通知し、色だけで成否を表しません。
文字数は読み上げが連続しないよう `aria-live="off"` にしています。
装飾 SVG は `aria-hidden`、入力には label と説明、キーボードにはフォーカス表示を用意しています。
`Ctrl + Enter` / `⌘ + Enter` は通常の submit と同じ経路を通します。IME 変換中には実行しません。

## 確認と参考資料

`npm run check` で既存の I/O 契約テスト・型チェック・CSS を含むビルドを確認できます。
見た目はライト／ダーク、未保存・保存中・成功・失敗、狭い幅で確認します。
拡張の権限や API の実通信は Chrome にビルド済み `dist/` を読み込んで確認してください。

- [daisyUI の Vite 導入手順](https://daisyui.com/docs/install/vite/)
- [daisyUI のテーマ](https://daisyui.com/docs/themes/)
- [Tailwind CSS の Vite 導入手順](https://tailwindcss.com/docs/installation/using-vite)

これらは導入とテーマの仕様の参照先です。このプロジェクトのフォルダー構成を公式標準として示すものではありません。
