# サイドパネル版

ページ上で文章を選びながら使うための、独立した HTML・CSS のサンプルです。
メモ・REST 取得・設定・ページ取得の UseCase はポップアップ版と共有します。
ポップアップ版の画面ソースと既定の動作は維持します。

## ビルドを選ぶ

| 方式 | ビルド | 確認 | Chrome に読み込むフォルダー |
| --- | --- | --- | --- |
| ポップアップ（既定） | `pnpm run build` または `pnpm run build:popup` | `pnpm run check` | `dist/popup/` |
| サイドパネル | `pnpm run build:sidepanel` | `pnpm run check:sidepanel` | `dist/sidepanel/` |

出力先を分けているため、片方のビルドがもう片方を削除しません。
旧構成の `dist/` 直下にビルド結果が残っていても、それを読み込まず、上記のフォルダーを選んでください。
各フォルダーの manifest には選択した方式の起動先だけを登録します。
`public/manifest.json` を共通の元にし、Vite がサイドパネル用の差分を出力時に適用します。

画面だけなら `pnpm run dev:sidepanel` で `/sidepanel.html` をプレビューできます。
拡張としての監視ビルドは `pnpm run dev:extension:sidepanel` です。変更後に拡張を再読み込みしてください。

## Actions で ZIP を作る

**Actions → Extension CI → Run workflow** で、ブランチと `variant: sidepanel` を選択します。
成功すると `chrome-extension-sidepanel-<コミット先頭12桁>.zip` が Artifacts に保存されます。
通常の push・PR・タグと、手動実行の既定値は `popup` です。
サイドパネルを変更したときは、ローカルの `check:sidepanel` または手動 Actions でも確認してください。

## 実際の Chrome で使う

1. ZIP を展開するか、`pnpm run build:sidepanel` を実行する。
2. `chrome://extensions` のデベロッパーモードを有効にし、`manifest.json` のあるフォルダーを読み込む。
3. 拡張をツールバーに固定し、アイコンを押してサイドパネルを開く。
4. 通常の HTTP(S) ページを開き、パネルに表示されたサイトを確認する。
5. 初回は「このサイトを許可」を押し、Chrome の確認で許可する。
6. ページ上で文章を選択し、パネルの「ページ情報を取得」を押す。
7. ページを操作しながらメモを書く。保存・REST サンプル・設定の操作はポップアップ版と同じ役割。

選択テキストは取得ボタンを押した時点で読みます。選択の自動監視・自動取得はしません。
入力フォームや編集領域の選択は取得対象外です。PDF・iframe・Chrome Web Store 等の保護ページも対応対象外です。
取得結果は表示だけで、保存・外部送信はしません。メモ保存や REST 取得は別のボタン操作です。

## 権限とタブ切り替え

- `sidePanel`: Chrome のサイドパネルを使う。
- `tabs`: 許可前にも、対象タブの URL を確認して許可するサイトを表示する。
- `scripting`: 許可されたページで、タイトル・URL・選択テキストを取得する関数を実行する。
- `storage`: メモ・設定を保存する。
- `optional_host_permissions`: HTTP(S) サイトを候補として宣言し、利用者が選んだサイトだけを実行時に要求する。

パネルを開き続けて別タブに移れるため、ポップアップ版の一時的な `activeTab` 許可には依存しません。
全サイトへの常時アクセスをまとめて要求せず、「このサイトを許可」から現在の scheme/hostname を要求します。
Chrome の host permission はその組み合わせの全パス・全ポートを対象とします。
許可は後から Chrome の拡張設定で取り消せます。拒否した場合は取得ボタンを有効にしません。
SampleAPIs への固定の host permission は REST サンプル用として両形式に残ります。

パネルを開いたウィンドウのアクティブタブを対象にします。別ウィンドウにフォーカスが移っても追いかけません。
タブ切り替え・ページ移動・権限変更では古い取得結果を消し、アクセス状態を読み直します。
遅れて戻った以前の取得結果も表示しません。編集中のメモは保持します。

出力フォルダーをそれぞれ読み込むと、通常は別の拡張 ID になります。その場合、メモ・設定・許可も別管理です。
両形式のインストール間でデータを同期する実装はありません。

## ソースの配置

| 配置 | 責務 |
| --- | --- |
| `sidepanel.html` / `ui/entrypoints/sidepanel.tsx` | サイドパネルの起動 |
| `ui/screens/sidepanel/` | 専用の画面コンポーネントと CSS |
| `ui/styles/sidepanel.css` | ポップアップ CSS を読まない独立した CSS 入口 |
| `sidepanel-options.html` / `ui/entrypoints/sidepanel-options.tsx` | 共有の設定画面にサイドパネル用の文言・リンクを渡す入口 |
| `ui/styles/sidepanel-options.css` | 設定画面の CSS。ポップアップ用 CSS は含めない |
| `composition/sidepanel.ts` | 既存機能とサイトアクセス機能の明示的 DI |
| `features/site-access/` | サイト確認・許可の入力検証、UseCase、Chrome gateway、通知 |
| `background/sidepanel.ts` | ツールバー操作でパネルを開く設定のみ |

Chrome API は composition / gateway / background に置き、画面は port を通して操作します。
worker は起動設定だけを担当し、メモや DOM の状態を保持しません。ページ取得用の独自メッセージ通信は不要です。
ポップアップの起動点・画面・CSS はサイドパネルの画面から参照しません。

## 確認済みの範囲

両形式の型チェック・ビルド・配布物の参照確認と、参考テストを実行しています。
Chromium の通常ブラウザでは、両テーマ、幅 240 / 320 / 380 / 640 px、メモ保存・再読み込み、
REST の固定応答、設定反映・リセットを確認しています。
Chrome API の代替実装を使い、許可／拒否、タブ切り替え、古い応答の破棄、保護ページの失敗も確認しています。

拡張として Chromium に読み込み、パネルの起動設定、アクティブタブへの追従、許可要求が Chrome まで届くこと、
host permission を加えた検証用コピーでの実ページ取得とページ移動時の結果破棄を確認しています。
実際のサイドパネル枠と、許可ダイアログで許可した後の流れは未検証です。詳細は [拡張サンプルのガイド](extension.md#検証範囲) にあります。
ブラウザプレビューは固定データで、その旨を画面に表示します。

公式リファレンス: [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)、
[Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions)。
