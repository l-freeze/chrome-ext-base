# アイコンの差し替えメモ

今のアイコンは仮のものです。アイコンは配色ごとに `src/palettes/<配色>/icons/` にあり、ビルドでは `package.json` の `palette` で選んだ配色のものだけが
配布物の `icons/` にコピーされます。本番のアイコンができたら、使う配色のフォルダーの次のファイルを同じ名前で置き換えてください。

| ファイル | 用途 | サイズ |
| --- | --- | --- |
| `src/palettes/<配色>/icons/icon.svg` | 元データ（拡張では直接は使わない） | 128 × 128 の viewBox |
| `src/palettes/<配色>/icons/icon-16.png` | ツールバー・タブの小さな表示 | 16 px |
| `src/palettes/<配色>/icons/icon-32.png` | ツールバー（高解像度の画面） | 32 px |
| `src/palettes/<配色>/icons/icon-48.png` | 拡張機能の管理画面 | 48 px |
| `src/palettes/<配色>/icons/icon-128.png` | インストール時・Chrome Web Store | 128 px（絵柄 96 px と四辺 16 px の透明な余白） |

- 登録場所は `public/manifest.json` の `icons`（16・32・48・128）と `action.default_icon`（16・32）で、パスは `icons/icon-16.png` のように配布物の中の場所です。
  ファイル名を変える場合はここも直します。サイドパネル版も `vite.config.ts` が `action.default_icon` を引き継ぐので、同じアイコンになります。
- PNG は透明な背景で作ります。16 px でも判別できるよう、小さいサイズは線を太く・少なくしてよいです。
- 置き換えたら `pnpm run check` と `pnpm run check:sidepanel` を実行します。配布物のテストが、manifest に登録したアイコンのファイルがあること、
  選んだ配色のアイコンが出力されていることを確認します。
- 使わない配色のフォルダーは削除して構いません（`purple` を消す場合は `tsconfig.json` の `paths` も残す配色に向けます）。
- アイコンはベースの一部です。`pnpm run samples:remove` では削除されません。

仮のアイコンは各配色の `icons/icon.svg` を Chromium で描画して PNG にしたものです（紫は `#6951d7`、コーヒーは `#7b4a2b`）。
SVG から作り直す場合も、各サイズで描画して透明な背景の PNG として保存すれば同じ形になります。
