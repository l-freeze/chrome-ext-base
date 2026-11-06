# UI キャプチャー

`pnpm run screenshots` で撮った画面キャプチャーです。手で撮り直す必要はありません。

```sh
pnpm run screenshots                                   # 全配色・両方式・全言語
pnpm run screenshots -- --palettes coffee --locales ja # 一部だけ撮り直す
```

## 撮り方

- ビルドした拡張を実際に Chromium に読み込み、保存データのない新しいプロファイルで各画面を開いて撮ります。
  画面は本物の拡張 API で動くため、ブラウザプレビューの固定データではなく、拡張として開いたときの表示です。
- 撮る画面は、ビルドした拡張から自動で見つけます。機能の名前はスクリプトに書いていません。

  | 画面 | 見つけ方 | 大きさ |
  | --- | --- | --- |
  | `popup` | manifest の `action.default_popup` | 文書の幅（最大 800 px）× 最大 600 px。Chrome のポップアップと同じ上限 |
  | `sidepanel` | manifest の `side_panel.default_path` | 幅 380 px、全体 |
  | `options` | manifest の `options_ui.page` | 幅 1100 px、全体 |
  | その他（例: `welcome`） | 配布物の直下にある HTML（ファイル名を使う） | 幅 1100 px、全体 |

- 配色は `src/palettes/` の全フォルダー、言語は `public/_locales/` の全フォルダー、テーマはライト・ダークです。
  配色は撮影のときだけ `EXTENSION_PALETTE` で切り替えてビルドし、`package.json` は変えません。
- 両方式にある画面（設定画面など）は、ポップアップ版のものを使います。
- ページの読み込み・フォント・`aria-busy`・読み込み中の表示（`.loading`）が終わるまで待ってから撮ります。
- 使うブラウザは E2E テストと同じで、`CHROMIUM_PATH` で指定できます。撮影時は Chromium 153.0.8010.12、デバイススケール 1。
- 取得日: 2026-11-06（日本時間）。

## ファイル

```text
docs/screenshots/<配色>/<画面>-<light|dark>-<言語>.png
例: purple/popup-light-ja.png、coffee/sidepanel-dark-en.png
```

画像は見た目を確認するためのドキュメントです。スクリーンショット比較テストには使いません。
ヘッドレスの Chromium で拡張のページをタブとして開いて撮るため、Chrome のポップアップやサイドパネルの枠は写りません。
ページ取得のように、開いているタブを対象にする画面は「取得できるページがない」状態で写ります。

このベースから作った拡張でも、画面を足したり名前を変えたりしたまま `pnpm run screenshots` を実行すれば撮れます。
使わない配色のフォルダーを消すと、その配色は撮りません。README の画像の表は、画面に合わせて直してください。
