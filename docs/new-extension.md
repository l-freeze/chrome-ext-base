# このベースから拡張を作る

このリポジトリを複製して、自分の拡張を作るまでの手順と注意点です。
例として、ページを右クリックして「あとで読む」に保存し、ポップアップに一覧を出す拡張 **Read Later** を作ります。
例のコードは、サンプルを外したこのリポジトリに実際に追加し、型チェック・テスト・実際の Chromium での E2E を通したものです。

## 全体の流れ

| 段階 | やること | 主な場所 |
| --- | --- | --- |
| 1. 始める | 複製して、そのまま動くことを確かめる | リポジトリ全体 |
| 2. 名前を決める | 製品名・拡張名・パッケージ名・設定ファイルの形式名を変える | `_locales`、`package.json`、`features/settings` |
| 3. 見た目を決める | 配色とアイコンを選ぶ | `package.json` の `palette`、`src/palettes/` |
| 4. 表示方式を決める | ポップアップかサイドパネルか | ビルドのコマンド、CI |
| 5. サンプルを外す | 参考にし終えたら、サンプルを消してベースだけにする | `pnpm run samples:remove` |
| 6. 機能を作る | features → composition → 画面・worker の順に足す | `src/` |
| 7. 権限を確かめる | 使う API の権限だけを manifest に書く | `public/manifest.json` |
| 8. 確かめる | 自動テスト・E2E・実際の Chrome | `pnpm run check` など |
| 9. 公開する | バージョンを上げ、公開用の ZIP を作ってストアに出す | `pnpm run release` |

## 1. 始める

```sh
git clone <このリポジトリの URL> read-later
cd read-later
git remote rename origin base          # ベースの更新を後で取り込めるように残しておく
git remote add origin <自分のリポジトリの URL>
nvm use
pnpm install --frozen-lockfile
pnpm run check
pnpm run check:sidepanel
```

- `check` は、型チェック・必須テスト・ビルド・配布物のテストをまとめて行います。ここで通らない場合は、Node.js（`.nvmrc`）と pnpm（`packageManager`）の版を確認してください。
- `pnpm run dev` でブラウザプレビューが開きます。拡張として試すには `pnpm run build` の後、`chrome://extensions` で `dist/popup/` を読み込みます（[README](../README.md#chrome-で実行)）。

## 2. 名前を決める

製品ごとに変える値です。例は Read Later の場合です。

| 何 | 場所 | 例 |
| --- | --- | --- |
| 画面の見出し・タブの題名に出る製品名 | `public/_locales/*/messages.json` の `appName` | `"Read Later"`（日本語は `"あとで読む"`） |
| 拡張の名前（拡張機能の管理画面・ストア） | 同じく `extensionName`・`extensionNameSidepanel` | `"Read Later"`・`"Read Later — Side Panel"` |
| 拡張の説明 | 同じく `extensionDescription` | `"Save pages to read later."` |
| ツールバーのボタンの説明 | 同じく `actionTitle`・`actionTitleSidepanel` | `"Read Later"`・`"Open Read Later in the side panel"` |
| 見出しの上の一言・キャッチコピー | 同じく `shellEyebrow`・`popupIntro`・`sidepanelTagline`・`optionsEyebrow`・`optionsHeading`・`optionsIntro` | `"YOUR READING LIST"` |
| パッケージ名（公開用 ZIP のファイル名になる） | `package.json` の `name` | `"read-later"` → `release/read-later-popup-0.1.0.zip` |
| バージョン | `package.json` の `version`（manifest にはビルドで書き込まれる） | `"0.1.0"` |
| 設定のバックアップファイルの形式名 | `src/features/settings/settings.ts` の `SETTINGS_BACKUP_FORMAT` | `"read-later/settings"` |
| README・画面キャプチャー | `README.md`、`docs/screenshots/` | 自分の製品の説明と画面に差し替える |

`messages.json` は全ロケールで同じキーを持ちます。例えば `appName` を変えるときは、両方を変えます。

```json
// public/_locales/en/messages.json
"appName": { "message": "Read Later", "description": "Product name shown in headers and tab titles." }
// public/_locales/ja/messages.json
"appName": { "message": "あとで読む", "description": "Product name shown in headers and tab titles." }
```

**注意点**

- 設定のバックアップの形式名を変えないと、同じベースから作った別の製品の書き出しファイルも「正しい形式」として読み込めてしまいます。
  例えば Read Later と、同じベースから作った Tab Memo が両方とも `chrome-ext-base/settings` のままだと、Tab Memo の設定ファイルを Read Later に読み込めます。
- 次の値は変えなくて構いません。拡張ごとに分かれていて、他の拡張とぶつからないためです。
  - メッセージの印（`infrastructure/messaging/contracts.ts`）：`runtime.sendMessage` は自分の拡張の中にしか届きません。
  - Web Locks の名前（`infrastructure/storage/locks.ts`）とプレビュー用の保存キー（`infrastructure/storage/drivers/web.ts`）：拡張ごとに別のオリジンで動くため、他の拡張からは見えません。
  - ページ上の通知の要素 ID（`infrastructure/page-toast.ts`）：拡張の ID を含めて作るため、拡張ごとに別になります。

## 3. 見た目を決める

配色は `package.json` の `palette` で一つを選びます（`purple` か `coffee`）。選ばなかった配色は配布物に入りません。

```json
"palette": "coffee"
```

- 自分の配色を作るときは、`src/palettes/purple/` を複製して色を変えます。例: `cp -r src/palettes/purple src/palettes/forest`、`"palette": "forest"`。
  テーマ名（`notebook`・`notebook-dark`）と色の項目の名前は変えません。手順は [配色を選ぶ](ui.md#配色を選ぶ) にあります。
- アイコンは `src/palettes/<配色>/icons/` に、`icon-16.png`・`icon-32.png`・`icon-48.png`・`icon-128.png` を置きます（[アイコンの差し替え](icons.md)）。
- 色を変えたら、ライト・ダークの両方で、文字と背景のコントラストが 4.5:1 以上あることを確かめてください。

**注意点**

- 配色の色は CSS（`theme.css`）と TypeScript（`colors.ts`）の 2 か所にあります。ページ上の通知とバッジは拡張の CSS を読めないため、`colors.ts` の色を使います。片方だけ変えると、画面と通知の色がずれます。
- `pnpm run check` の配色のテストが、全配色で色の項目・テーマ名・アイコンのファイルが揃っていることを確認します。

## 4. 表示方式を決める

| 方式 | 向いている使い方 | ビルド | 出力 |
| --- | --- | --- | --- |
| ポップアップ（既定） | ボタンを押して短く操作する | `pnpm run build` / `release` | `dist/popup/` / `release/popup/` |
| サイドパネル | ページを見ながら開いたまま使う | `pnpm run build:sidepanel` / `release:sidepanel` | `dist/sidepanel/` / `release/sidepanel/` |

- 両方の方式はベースに残しておけます。出すのは一方だけで、ビルドのコマンドで選びます。
- 画面はそれぞれ別のファイルです（`ui/screens/popup/` と `ui/screens/sidepanel/`）。機能の部品は方式ごとに作り、features と composition は共通で使います。
- CI の既定はポップアップ版です。サイドパネル版を出す場合は [CI ガイド](ci.md) を参照してください。
- サイドパネル版の権限とタブの扱いは [サイドパネルガイド](sidepanel.md) にあります。

<!-- @sample-begin -->
## 5. サンプルを外す

メモ・ページ取得・コーヒーの新着・案内ページなどのサンプルは、書き方を参考にし終えたら消します。

```sh
git add -A && git commit -m "Start from the base"   # 未コミットの変更があると止まる
pnpm run samples:remove
pnpm run check
pnpm run check:sidepanel
git add -A && git commit -m "Remove the samples"
```

- 消えるもの・残るものは [サンプルのガイド](samples.md#ベースだけにする) にあります。
- サンプル用の権限（`activeTab`・`scripting`・`contextMenus`・`alarms`）も manifest から消えます。自分の機能で使うときは、7 で戻します。
- 機能を一つ作るまではサンプルを残しておき、似た処理の書き方を見ながら進めても構いません。
<!-- @sample-end -->

## 6. 機能を作る

機能は「features（中心の処理）→ composition（組み立て）→ 画面・worker（入口）」の順に足します。
依存の向きと各フォルダーの役割は [アーキテクチャガイド](architecture.md) にあります。Read Later では次のファイルを作ります。

```text
src/features/later/
├── later.ts                 モデルと規則（Web ページだけ、新しい順、100 件まで）
├── ports.ts                 公開する操作と、保存の口
├── use-cases/list.ts        一覧を読む
├── use-cases/add.ts         ページを足す
├── controllers/list.ts      入力がないことを確かめて list を呼ぶ
├── controllers/add.ts       { url } を確かめて add を呼ぶ
├── gateways/storage.ts      chrome.storage への保存と、変更の通知
└── compose.ts               controller と UseCase をつなぐ
src/composition/later.ts     画面用と worker 用の組み立て
src/ui/screens/popup/later.tsx  ポップアップに出す一覧
tests/features/later.test.ts    入力と保存結果のテスト
```

### 6-1. モデルと規則（`features/later/later.ts`）

規則は features に置き、Chrome の API や画面には依存させません。

```ts
import { ValidationError } from "../../lib/validation";

export const MAX_LATER_ITEMS = 100;

export interface LaterItem {
  url: string;
  savedAt: number;
}

// Only web pages can be saved. Shared by the add controller and the storage gateway.
export function laterUrl(input: unknown): string {
  if (typeof input !== "string" || !URL.canParse(input)) throw new ValidationError("A page address must be a URL.");
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ValidationError("Only http(s) pages can be saved.");
  return url.href;
}

// Newest first and without duplicates; the oldest entries drop off past the limit.
export function addItem(items: readonly LaterItem[], url: string, savedAt: number): LaterItem[] {
  return [{ url, savedAt }, ...items.filter((item) => item.url !== url)].slice(0, MAX_LATER_ITEMS);
}
```

### 6-2. 公開する操作と口（`features/later/ports.ts`）

画面が呼ぶ操作は `unknown` を受け取ります。中身は controller が確かめます。

```ts
import type { LaterItem } from "./later";

export interface LaterActions {
  listItems(input: unknown): Promise<LaterItem[]>;
  addPage(input: unknown): Promise<LaterItem[]>;
}

export interface LaterRepository {
  load(): Promise<LaterItem[]>;
  update(change: (current: LaterItem[]) => LaterItem[]): Promise<LaterItem[]>;
}

export interface LaterChanges {
  subscribe(onValue: (items: LaterItem[]) => void, onError: (error: unknown) => void): () => void;
}

export interface Clock {
  now(): number;
}
```

### 6-3. UseCase と controller

UseCase は口を呼ぶ順番だけを書きます。今の値から作る変更は `update` を使います。

```ts
// features/later/use-cases/add.ts
import type { LaterItem } from "../later";
import { addItem } from "../later";
import type { Clock, LaterRepository } from "../ports";

export type AddPageInput = { url: string };
export type AddPageOutput = LaterItem[];
export type AddPage = (input: AddPageInput) => Promise<AddPageOutput>;

export function createAddPage(repository: LaterRepository, clock: Clock): AddPage {
  return (input) => repository.update((current) => addItem(current, input.url, clock.now()));
}
```

controller はその操作の入力だけを確かめ、確かめた値を UseCase に渡します。

```ts
// features/later/controllers/add.ts
import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import { laterUrl } from "../later";
import type { AddPage, AddPageInput } from "../use-cases/add";

const input: Validator<AddPageInput> = {
  parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("url" in raw)) {
      throw new ValidationError("Expected { url }.");
    }
    return { url: laterUrl(raw.url) };
  },
};

export function createAddController(execute: AddPage) {
  return validatedAction(input, execute);
}
```

`list` も同じ形で、入力が `undefined` であることだけを確かめます（`features/settings/controllers/load.ts` と同じ書き方）。

### 6-4. 保存（`features/later/gateways/storage.ts`）

保存の形式は gateway が持ちます。保存する値と読み出した値の両方を検証します（どちらかがないと初期化で止まります）。

```ts
function parseItems(raw: unknown): LaterItem[] {
  if (raw === undefined) return [];          // まだ何も保存していない
  if (!Array.isArray(raw)) throw new ValidationError("Saved pages must be a list.");
  return raw.map((item: unknown) => {
    if (typeof item !== "object" || item === null || !("url" in item) || !("savedAt" in item) ||
        typeof item.savedAt !== "number" || !Number.isFinite(item.savedAt)) {
      throw new ValidationError("A saved page must be { url, savedAt }.");
    }
    return { url: laterUrl(item.url), savedAt: item.savedAt };
  });
}

const contract: StorageContract<LaterItem[], LaterItem[]> = {
  key: "later-items",                       // chrome.storage.local のキー。拡張の中で一意にする
  input: { parse: parseItems },
  output: { parse: parseItems },
  encode: (input) => input,
};

export function createLaterStorage(driver: KeyValueStorage): LaterRepository {
  return createTypedStorage(driver, contract);
}
```

変更の通知（`createLaterChanges`）は `features/settings/gateways/storage.ts` の `createSettingsChanges` と同じ形で、キーと検証を差し替えます。

### 6-5. 組み立て（`features/later/compose.ts` と `composition/later.ts`）

```ts
// features/later/compose.ts
export function createLaterApplication(dependencies: { repository: LaterRepository; clock: Clock }): LaterActions {
  return {
    listItems: createListController(createListItems(dependencies.repository)),
    addPage: createAddController(createAddPage(dependencies.repository, dependencies.clock)),
  };
}
```

具体的な実装（どの保存先・どの時計を使うか）は composition で選びます。画面用と worker 用の両方をここに置きます。

```ts
// composition/later.ts
function createLater(driver: KeyValueStorage) {
  return createLaterApplication({ repository: createLaterStorage(driver), clock: { now: () => Date.now() } });
}

export function createLaterScreens(environment: Environment) {
  return { later: createLater(environment.driver), laterChanges: createLaterChanges(environment.events) };
}

// Right-click on a page, "Read this page later". Needs the contextMenus permission.
export function registerLaterWorker(worker: WorkerRegistry) {
  const later = createLater(worker.environment.driver);
  const { t } = createChromeTranslator<MessageKey>(chrome.i18n);
  worker.menus.push({
    id: "later.add-page",
    title: t("laterMenuAdd"),
    contexts: ["page"],
    async onClick(click) { await later.addPage({ url: click.pageUrl }); },
  });
}
```

入口ごとの composition から呼びます。

```ts
// composition/popup.ts の return に追加
...createLaterScreens(environment),

// composition/worker.ts の worker を作った後に追加
registerLaterWorker(worker);
```

### 6-6. 画面（`ui/screens/popup/later.tsx` と起動点）

画面は port だけを受け取ります。開いている間の変更は `connectLive` で受け取り、右クリックで足したページもすぐに並びます。

```tsx
export function LaterSection(props: { later: LaterActions; changes: LaterChanges }) {
  const { t } = useI18n();
  const [items, setItems] = createSignal<LaterItem[]>([]);
  const [failed, setFailed] = createSignal(false);
  onCleanup(connectLive(() => props.later.listItems(undefined), (value, error) => props.changes.subscribe(value, error),
    (value) => { setItems(value); setFailed(false); }, () => setFailed(true)));

  return (
    <section class="card bg-base-100 later-card" aria-labelledby="later-title">
      <div class="card-body">
        <h2 id="later-title" class="later-title">{t("laterHeading")}</h2>
        <Show when={!failed()} fallback={<p role="status">{t("laterLoadFailed")}</p>}>
          <Show when={items().length > 0} fallback={<p class="later-empty">{t("laterEmpty")}</p>}>
            <ul class="later-list">
              <For each={items()}>{(item) => <li><a href={item.url} target="_blank" rel="noopener">{item.url}</a></li>}</For>
            </ul>
          </Show>
        </Show>
      </div>
    </section>
  );
}
```

起動点（`ui/entrypoints/popup.tsx`）で、画面の枠の子として置きます。

```tsx
<Popup app={application}>
  <LaterSection later={application.later} changes={application.laterChanges} />
</Popup>
```

文言は全ロケールの `messages.json` に同じキーで足します。

```json
// en
"laterHeading": { "message": "Read later" },
"laterEmpty": { "message": "Right-click a page and choose “Read this page later” to list it here." },
"laterLoadFailed": { "message": "Couldn't load your saved pages." },
"laterMenuAdd": { "message": "Read this page later" }
// ja
"laterHeading": { "message": "あとで読む" },
"laterEmpty": { "message": "ページを右クリックして「このページをあとで読む」を選ぶと、ここに並びます。" },
"laterLoadFailed": { "message": "保存したページを読み込めませんでした。" },
"laterMenuAdd": { "message": "このページをあとで読む" }
```

### 6-7. テスト（`tests/features/later.test.ts`）

入力と、保存された結果だけを確かめます。保存先はメモリの driver に差し替えます。

```ts
function application() {
  let now = 0;
  return createLaterApplication({ repository: createLaterStorage(createMemoryStorage()), clock: { now: () => ++now } });
}

it("新しいページを先頭に追加し、同じページは先頭へ移す", async () => {
  const later = application();
  await later.addPage({ url: "https://example.test/a" });
  await later.addPage({ url: "https://example.test/b" });
  expect((await later.addPage({ url: "https://example.test/a" })).map((item) => item.url))
    .toEqual(["https://example.test/a", "https://example.test/b"]);
});

it("Web ページ以外は保存しない", async () => {
  await expect(application().addPage({ url: "chrome://extensions/" })).rejects.toBeInstanceOf(ValidationError);
});
```

実際の Chromium で確かめる場合は `tests/e2e/` に足します。右クリックのメニューはヘッドレスでは開けないため、worker でクリックのイベントを発火させます。

```ts
it("右クリックで追加したページが、開いているポップアップに並ぶ", async () => {
  extension = await launchExtension({ variant: "popup" });
  const popup = await extension.open(screenPath(extension));
  await extension.worker.evaluate(() => {
    (chrome.contextMenus.onClicked as unknown as { dispatch(info: unknown, tab: unknown): void })
      .dispatch({ menuItemId: "later.add-page", pageUrl: "https://example.test/article", editable: false }, { id: 1 });
  });
  await expect.poll(() => popup.locator(".later-list a").allTextContents()).toEqual(["https://example.test/article"]);
});
```

## 7. 権限を確かめる

manifest（`public/manifest.json`）の `permissions` には、使う API の権限だけを書きます。Read Later は右クリックのメニューを使うので、`contextMenus` を足します。

```json
"permissions": ["storage", "contextMenus"]
```

| 使うもの | 権限 | インストール時の警告（英語表示の例） |
| --- | --- | --- |
| 保存（`chrome.storage`） | `storage` | なし |
| 右クリックのメニュー | `contextMenus` | なし |
| アラーム（定期実行） | `alarms` | なし |
| 操作したタブへの一時的な実行（右クリック・ショートカット・ツールバーから） | `activeTab` と `scripting` | なし |
| サイドパネル | `sidePanel`（サイドパネル版のビルドが足す） | なし |
| タブの URL・題名をいつでも読む | `tabs` | Read your browsing history |
| 特定のサイトで常に動く | `host_permissions`（例: `https://example.com/*`） | Read and change your data on example.com |
| 全サイトで常に動く | `host_permissions` の `<all_urls>`、`content_scripts` の全ページ指定 | Read and change all your data on all websites |

日本語の Chrome では同じ内容が日本語で表示されます。権限ごとの警告は [権限の一覧](https://developer.chrome.com/docs/extensions/reference/permissions-list) にあります。

**注意点**

- 警告が出る権限は、利用者がインストールをやめる理由になります。ストアの審査でも、なぜ必要かを説明する必要があります。
  まず `activeTab` で済まないかを考えます。例えば「ボタンを押したら今のページの題名を読む」なら、`tabs` や全サイトの権限は不要です。
- サイトの権限が必要な場合は、サイドパネルのサンプルのように、`optional_host_permissions` に書いて、利用者が選んだサイトだけを実行時に要求できます。
- API を使っているのに権限がないと、`chrome.contextMenus` などが `undefined` になります。ベースの worker は、項目を登録していない API には触れないので、権限を外しても起動は止まりません。

## 8. 確かめる

```sh
pnpm run check                 # 型チェック・必須テスト・ポップアップ版のビルドと配布物のテスト
pnpm run check:sidepanel       # サイドパネル版
CHROMIUM_PATH=/path/to/chromium pnpm run test:e2e   # 任意。実際の Chromium に読み込んで確かめる
```

- 画面を変えたら、ライト・ダークの両方で表示を確かめます（`pnpm run dev`、または `dist/` を拡張として読み込む）。
- ヘッドレスの Chromium では確かめられないものがあります。ツールバーから開いたときの `activeTab`、許可ダイアログ、実際のキー操作、実時間のアラームです。実際の Chrome で一度は操作してください。
- テストの方針は [テストのガイド](testing.md) にあります。

## 9. 公開する

1. `package.json` の `version` を上げます（例: `0.1.0` → `0.2.0`）。manifest のバージョンはビルドで書き込まれるので、触りません。
2. `pnpm run release`（サイドパネル版は `release:sidepanel`）で、`release/<name>-<方式>-<version>.zip` を作ります。ソースマップは含まれません。
3. Chrome Web Store のデベロッパー ダッシュボードで ZIP をアップロードし、ストアの掲載情報を用意します。
   - 128 px のアイコン（`src/palettes/<配色>/icons/icon-128.png`）
   - スクリーンショット（1280 × 800 または 640 × 400）
   - 拡張の目的（一つにまとまっていること）と、各権限が必要な理由
   - 利用者のデータを扱う場合は、その扱いの説明（プライバシーの欄）

公開の要件は変わることがあるので、提出前に [Chrome Web Store の公開ガイド](https://developer.chrome.com/docs/webstore/publish) を確認してください。
Actions で公開用 ZIP を作る方法は [CI ガイド](ci.md) にあります。

## 作るときの注意点

### service worker

- **リスナーは最上位で同期的に登録する**。`await` の後で登録すると、worker を起こしたイベントを取りこぼします。
  ベースでは `composition/worker.ts` に項目を足せば、`startWorker()` が最上位で登録します。

  ```ts
  // 悪い例: 起こしたクリックが届かないことがある
  chrome.runtime.onStartup.addListener(async () => {
    await loadSomething();
    chrome.contextMenus.onClicked.addListener(handle);
  });
  // よい例: 機能の登録関数で項目を足すだけ
  worker.menus.push({ id: "later.add-page", title: t("laterMenuAdd"), contexts: ["page"], onClick: handle });
  ```

- **状態を変数に持たない**。worker は約 30 秒操作がないと止まり、変数は消えます。

  ```ts
  // 悪い例: worker が止まると 0 に戻る
  let added = 0;
  // よい例: 残す値は storage に保存する（今の値から作るなら update）
  await counter.update((current) => current + 1);
  ```

- **時間で動かす処理は `setTimeout` ではなくアラーム**にします（[service worker ガイド](worker.md#アラーム定期的な処理と時間をおいた処理)）。
- **`src/ui` や Solid を読み込まない。動的 `import()` を使わない**。違反するとビルドが止まります。
- **通信の待ち時間は合計で 30 秒を十分に下回る**ようにします（`createRetryPolicy` の `maxElapsedMs`）。

### 保存

- **今の値から作る変更は `update`**。`load` してから `save` すると、別の画面や worker の書き込みと重なったときに片方が消えます。

  ```ts
  // 悪い例
  const items = await repository.load();
  await repository.save(addItem(items, url, now));
  // よい例
  await repository.update((items) => addItem(items, url, now));
  ```

- **保存の形式を変えるときは、古い形式も読めるようにする**。公開後に形式を変えると、既に保存された値が新しい検証で読めなくなります。
  output の検証で古い形式を読み替えるか、インストール・更新時の処理で移し替えます。

  ```ts
  worker.installs.push({
    name: "later.migrate",
    async run({ reason, previousVersion }) {
      if (reason === "update" && previousVersion?.startsWith("0.1.")) await migrateLaterItems();
    },
  });
  ```

### ページ由来の値と表示

- **ページから来た値（選択した文章、URL、題名）は信用しない**。controller と gateway で検証してから使います。
- **HTML として入れない**。画面では JSX の文字として表示し、`innerHTML` は使いません。リンクにする URL は、Read Later の `laterUrl` のように `http(s)` だけに絞ります（`javascript:` を防ぐため）。
- **content script もページの中で動く**ため、保存や判断は worker にメッセージで依頼します（[ページ上の通知と content script](worker.md#ページ上の通知と-content-script)）。

### 文言と多言語

- **画面に出す文言は全部 `_locales` に置く**。キーとプレースホルダーは全ロケールで揃えます（配布物のテストが確かめます）。
- **features は文言を返さない**。失敗の理由はコード（例: `NoteAppendError` の `reason`）で返し、画面が文言を選びます。
  例外のメッセージ（`ValidationError` など）は英語の開発者向けの診断で、画面には出しません。

### 構成

- **機能は自分の features フォルダーに閉じる**。features は他の機能や `infrastructure`・画面に依存しません。共通の仕組みが必要なら `infrastructure` に、外部サービスとのやり取りは `integrations` に置きます。
- **組み立ては composition に一か所**。画面と worker が同じ機能を使う場合も、`composition/<機能>.ts` で作り分けます。
- **設定画面の設定はベースのもの**（テーマ）。機能ごとの設定は、その機能の保存先に持たせます（例: ページ取得のサンプルの「選択テキストも取得する」）。

## ベースの更新を取り込む

1 で `base` という名前で残したリモートから、後でベースの改善を取り込めます。

```sh
git fetch base
git merge base/master
```

サンプルを外した後に取り込むと、ベースで変更されたサンプルのファイルが「削除済み」と衝突します。
その場合は、サンプルのファイルは削除のまま（`git rm`）にし、ベースの部分の変更だけを残します。
取り込んだら `pnpm run check` と `pnpm run check:sidepanel` を実行してください。
