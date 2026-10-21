# Chrome Extension Base

UI フレームワークを使わない Manifest V3 の Chrome 拡張スターターです。
TypeScript + Vite + Vitest、素の HTML / DOM API と daisyUI 5 + Tailwind CSS 4 で構成しています。
メモの保存と、[SampleAPIs](https://api.sampleapis.com/) のコーヒー情報を取得して保存する例を含みます。

## デザインのプレビュー

本番ビルドのポップアップ UI を Chromium で撮影したキャプチャーです。
ライト／ダークは OS の表示設定に追従します。

| ライト | ダーク |
| --- | --- |
| ![ライトテーマのポップアップ](docs/screenshots/popup-light.png) | ![ダークテーマのポップアップ](docs/screenshots/popup-dark.png) |

画像はリポジトリに同梱しています。[撮影条件](docs/screenshots/README.md)も参照してください。

## セットアップとコマンド

Node.js 24 と npm を使用します。nvm を使う場合は `nvm use`。

```sh
npm ci
npm run check
```

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | UI プレビューと HMR |
| `npm run dev:extension` | 拡張用の監視ビルド |
| `npm run typecheck` | ブラウザコード・テスト・ビルド設定の型チェック |
| `npm test` | Vitest による Input / Output 契約テスト |
| `npm run test:watch` | テストの監視実行 |
| `npm run build` | 型チェックと `dist/` 生成 |
| `npm run check` | テスト・型チェック・ビルド |

## Chrome で実行

1. `npm run build` を実行する。
2. Chrome の `chrome://extensions` でデベロッパーモードを有効化する。
3. 「パッケージ化されていない拡張機能を読み込む」で `dist/` を選ぶ。
4. 拡張をツールバーに固定し、ポップアップを開く。
5. メモを保存し、開き直して内容が残っていることを確認する。
6. 「サンプルを取得して保存」でコーヒー情報がメモに入り、再度開いても残ることを確認する。

Chrome 124 以降に対応します。`npm run dev:extension` は変更時に再ビルドします。
変更後は拡張管理画面で再読み込みし、ポップアップを開き直してください。
公開用アイコンやストアの説明・画像は製品に合わせて追加してください。

## REST サンプル

「サンプルを取得して保存」は `GET https://api.sampleapis.com/coffee/hot/1` を呼びます。
API キーは不要です。起動時には呼ばず、ボタン操作で取得します。
レスポンスを検証し、タイトル・説明・材料をメモに変換して保存します。
現在のメモを置き換える操作です。取得や検証に失敗した場合は、保存済みのメモを維持します。

```ts
interface FetchCoffeeInput { id: number }
interface FetchCoffeeOutput {
  id: number;
  title: string;
  description: string;
  ingredients: string[];
  image: string;
}
```

型定義は `src/integrations/sampleapis/coffee/contracts.ts`、実通信は
`src/integrations/sampleapis/coffee/client.ts` にあります。
`features/notes/adapters/outbound/sources/sampleapis-coffee-source.ts` が外部の Coffee 形式をアプリの Note 形式へ変換し、
UseCase は「API 取得 → 保存 → 読み出し」のシーケンスを実行します。
`image` は受信データとして扱い、画像への追加通信はしません。

`public/manifest.json` に `https://api.sampleapis.com/*` の `host_permissions` を設定済みです。
クラウドからの実通信には環境設定でも `api.sampleapis.com` の許可が必要です。
API は公開サンプルでデータが変更される可能性があるため、テストは固定レスポンスで I/O を検証します。

## UI の開発

カード、ボタン、入力欄、ステータス表示、ローディング表示に daisyUI を使用します。
ライト／ダークのカスタムテーマは OS の設定に追従します。
文字数表示と `Ctrl + Enter` / `⌘ + Enter` による保存にも対応しています。

`npm run dev` で UI をプレビューできます。プレビューでは `localStorage` を使い、
拡張では `chrome.storage.local` を使います。保存データは共有しません。
プレビューから実 API を呼ぶ場合は通常のブラウザの CORS 制約を受けます。
拡張の権限や CSP は、ビルドした `dist/` を Chrome に読み込んで確認してください。

UI の責務分離とテーマの変更方法は [UI ガイド](docs/ui.md) を参照してください。
daisyUI に必須のフォルダー構成はなく、一般的な責務分離をこの拡張に合わせています。
CSS とアイコンはビルドに同梱し、外部 CDN やフォントサービスには依存しません。

## 構成

```text
src/
├── features/notes/          メモ機能の責務と境界
│   ├── domain/             メモの型・制約
│   ├── application/        操作の Input/Output・ports・順次実行の UseCase
│   ├── validation/         メモ操作・メモ形式の検証
│   ├── adapters/           検証付きの入口・取得元・メモ固有の保存処理
│   └── compose.ts          機能内の明示的 DI
├── integrations/           外部サービス固有の DTO・検証・client
├── infrastructure/         汎用 HTTP・型付き保存・ストレージ driver
├── shared/validation/      機能に依存しない検証の仕組み
├── composition/            環境に合わせて具体実装を選択
└── ui/
    ├── entrypoints/        ポップアップなどの起動点
    ├── screens/            画面ごとの HTML・DOM 操作・CSS
    ├── layouts/            共通の画面枠
    ├── components/         再利用する表示部品
    └── styles/             Tailwind・daisyUI 設定・テーマ
tests/                      機能・外部連携・基盤ごとの入出力契約
```

ディレクトリ名に唯一の標準はありません。`inbound/outbound` は呼び出しを起動する方向を表し、
`FetchCoffeeInput/Output` のようなデータ型名と区別します。命名の比較と参照した実装例は
[アーキテクチャガイド](docs/architecture.md) に記載しています。

application の ports はメモ機能が要求する操作だけを定義します。外部 API の DTO と
保存 driver の IF はそれぞれ integration と infrastructure が所有します。

保存 Input / 読み出し Output のバリデーターは両方必須です。片方だけでは初期化できません。
既存のメモ文字列は引き続き読み出せます。未保存は空メモ、破損データはエラーとして扱います。
API とストレージの実装は `src/composition/popup.ts` で差し替えられます。

依存関係は `package-lock.json` で固定しています。
バージョンを変更するときは `package.json` と `public/manifest.json` を揃えてください。
バックグラウンド処理やページへの注入が必要になったら、service worker / content script と
対応するビルドエントリー・権限を追加してください。

## Git

ローカルのメインブランチは `master`、このリポジトリの `user.name` は `codex-kun` です。
メールアドレスは設定していません。
作業は `codex-kun/<変更内容>` ブランチで行い、意味のある単位でコミットします。
検証後に `master` へ `--no-ff` でマージし、`master` と作業ブランチを push します。
詳しい作業ルールは [AGENTS.md](AGENTS.md) を参照してください。
