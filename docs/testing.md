# ベースリポジトリのテスト方針

このリポジトリでは、派生機能を実装するときにも使い続ける基盤の契約を保証します。
必須テストでは、メモの文字数、設定項目・初期値、Coffee の変換結果、画面の文言などは固定しません。
サンプルを変更・削除するだけで、多数のテスト修正が発生することを避けます。

## 自動テストの範囲

| 配置 | 保証する契約 |
| --- | --- |
| `tests/lib/validation.test.ts` | 検証済みの値を処理に渡す。不正入力は副作用を起こさず拒否し、失敗を返す。検証の指定は型として必須 |
| `tests/infrastructure/storage.test.ts` | 保存 Input と復元 Output の同時指定、異なる型での保存・復元、不正な保存形式の拒否、I/O エラーの伝達 |
| `tests/infrastructure/http.test.ts` | 指定 URL への JSON GET、応答値、HTTP・通信・JSON エラーの伝達 |
| `tests/infrastructure/changes.test.ts` | 指定した local storage のキーの通知と購読解除。データは機能に依存しない任意の値 |
| `tests/extension/build.test.ts` | 出力された Manifest V3 の基本項目、登録画面・worker・content script・アイコンの存在、画面が参照する JS/CSS の存在 |

拡張の構成テストは `dist/popup/manifest.json` または `dist/sidepanel/manifest.json` から対象を読み取ります。ポップアップのファイル名、
個別のサイトの権限、設定画面の有無、サンプルの名称を期待値にしません。
選んだ表示方式の起動先が登録され、もう一方の起動先が混ざらないことも確認します。
これは Chrome の manifest 検証全体を再実装するものではなく、主要な参照漏れを検出する確認です。

API と Chrome のイベントはテスト内の代替実装を注入します。
必須テストはサンプルの `features`・`integrations`・`ui`・`content` を import しません。
内部の呼び出し回数、細かな順序、画面のスナップショットは固定しません。

## 実行

```sh
pnpm test                 # 共通基盤。dist は不要
pnpm run test:watch       # 同じテストを監視
pnpm run check            # 契約テスト → 型チェック・ビルド → 配布物確認
pnpm run check:sidepanel  # サイドパネル版のビルド・配布物を確認
```

GitHub Actions でも同じ `pnpm run check` を実行し、成功した配布物を ZIP として保存します。
実行タイミングとダウンロード手順は [Actions ガイド](ci.md) を参照してください。

配布物の確認だけを実行する場合は `pnpm run build` の後に `pnpm run test:extension` を使います。
サイドパネルは `pnpm run build:sidepanel` の後に `pnpm run test:extension:sidepanel` を使います。
既存の dist を検査するため、変更後はビルドし直してください。
`pnpm test` は `tests/extension/` と `tests/examples/` を除外し、派生プロジェクトで追加した通常のテストも検出します。
`vite-plugin-solid` は未指定なら Vitest の環境を jsdom にするため、`vite.config.ts` で `node` を明示しています。
UI コンポーネントのテストを追加する場合は、そのテストで DOM 環境を選び、必要な依存を追加してください。

## 削除して使う参考テスト

`tests/examples/` に、メモの保存・入力拒否・モックからの取り込み、設定リセット、サイトアクセス許可の例を置いています。
内部の実装手順を固定せず、公開操作の返り値・エラー・保存結果をどう検証するかを示します。
各ファイルの冒頭にも、独自機能の開発時には参考にしたうえで削除するようコメントしています。

`pnpm run test:examples` で任意に実行できます。`pnpm test`・`test:watch`・`check` では実行しません。
ただし型チェックの対象には含め、参考コード自体の不整合は検出します。
サンプルを差し替える際は、対応する参考テストも削除してください。
全て不要なら `tests/examples/` を削除し、`package.json` の `test:examples` も削除できます。
独自機能のテストはこのディレクトリに置かず、通常のテストとして追加してください。

## 派生プロジェクトで追加するもの

独自機能の仕様が決まったら、その機能の入力・出力・永続化結果について必要なテストを追加します。
例として `tests/features/<機能>/` に置けます。ベースのサンプルと同じ振る舞いに合わせる必要はありません。
共通基盤自体を変更した場合には、その契約テストも変更対象になります。

型チェックとビルドは実際のソース全体が対象です。サンプルを削除するときは composition、UI の起動点、
Vite の入力、manifest の参照も更新してください。参照が残っていれば失敗するのが期待する動作です。

## 実ブラウザで確認するもの

Chrome の権限付与、実ページへの注入、ポップアップの起動、拡張版 storage の通知は、
モックや配布物の存在確認だけでは保証できません。利用可能な Chrome で拡張を読み込み、主要操作を確認します。
ヘッドレスの Chromium では `activeTab` の付与や許可ダイアログへの応答を自動化できないため、実拡張の E2E テストは必須テストに含めていません。
通常ブラウザと、拡張として読み込んだ Chromium での確認内容は [拡張サンプルのガイド](extension.md#検証範囲) に記録しています。
