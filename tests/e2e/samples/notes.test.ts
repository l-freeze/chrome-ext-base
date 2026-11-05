/**
 * 開発者向けの参考例です。サンプルのメモ機能を、実際の拡張として Chromium に読み込んで確認します。
 * 独自機能の開発を始める際は、拡張の読み込み・worker の操作・画面の確認の書き方を参考にしたうえで、
 * このテストを削除してください。`pnpm run samples:remove` でもサンプルと一緒に削除されます。
 * 実行: pnpm run test:e2e
 */
import { afterEach, describe, expect, it } from "vitest";
import type { Worker } from "playwright";
import type { LoadedExtension, Variant } from "../support/extension";
import { launchExtension, openTab, screenPath, serveSite, withHostPermissions } from "../support/extension";

const stored = (worker: Worker) => worker.evaluate(async () => (await chrome.storage.local.get("quick-note"))["quick-note"]);
// Headless Chromium cannot open the native menu, so the test fires the worker's click event directly.
const clickMenu = (worker: Worker, selectionText: string) => worker.evaluate((text) => {
  (chrome.contextMenus.onClicked as unknown as { dispatch(info: unknown, tab: unknown): void })
    .dispatch({ menuItemId: "notes.append-selection", selectionText: text, editable: false, pageUrl: "https://example.test/" }, { id: 1 });
}, selectionText);

describe.each<Variant>(["popup", "sidepanel"])("%s", (variant) => {
  let extension: LoadedExtension | undefined;
  afterEach(async () => { await extension?.close(); });

  async function open() {
    extension = await launchExtension({ variant });
    const screen = await extension.open(screenPath(extension));
    const editor = screen.locator("textarea");
    await expect.poll(() => editor.isEnabled()).toBe(true);
    return { extension, screen, editor };
  }

  it("保存したメモが chrome.storage に残り、開き直しても表示される", async () => {
    const { extension, screen, editor } = await open();
    await editor.fill("実機のメモ");
    await editor.press("Control+Enter");
    await expect.poll(() => stored(extension.worker)).toBe("実機のメモ");
    await screen.reload();
    await expect.poll(() => screen.locator("textarea").inputValue()).toBe("実機のメモ");
  });

  it("右クリックメニューで追加した文章に、開いている画面が追従する", async () => {
    const { extension, editor } = await open();
    await clickMenu(extension.worker, "一つ目");
    await clickMenu(extension.worker, "二つ目");
    await expect.poll(() => stored(extension.worker)).toBe("一つ目\n\n二つ目");
    await expect.poll(() => editor.inputValue()).toBe("一つ目\n\n二つ目");
  });

  it("同時に起きた右クリックの追加も、どちらも失わない", async () => {
    const { extension } = await open();
    // Both clicks are fired in the same turn, so their read-modify-writes would overlap without the key lock.
    await extension.worker.evaluate(() => {
      const clicked = chrome.contextMenus.onClicked as unknown as { dispatch(info: unknown, tab: unknown): void };
      for (const text of ["one", "two"]) clicked.dispatch({ menuItemId: "notes.append-selection", selectionText: text, editable: false }, { id: 1 });
    });
    await expect.poll(() => stored(extension.worker)).toMatch(/^(one\n\ntwo|two\n\none)$/);
  });

  it("編集中の下書きは worker の追加で上書きしない", async () => {
    const { extension, editor } = await open();
    await editor.fill("下書き");
    await clickMenu(extension.worker, "追加");
    await expect.poll(() => stored(extension.worker)).toBe("追加");
    expect(await editor.inputValue()).toBe("下書き");
  });

  it("一時的なサーバーエラーは worker が再試行して取り込みを完了する", async () => {
    const { extension, editor, screen } = await open();
    let calls = 0;
    await extension.context.route("https://api.sampleapis.com/**", (route) => ++calls === 1
      ? route.fulfill({ status: 503 })
      : route.fulfill({ json: { id: 1, title: "Second Try", description: "Hot.", ingredients: ["Coffee"], image: "https://example.test/x.jpg" } }));
    await screen.locator("summary").click();
    await screen.getByRole("button", { name: "サンプルを取得して保存" }).click();
    await expect.poll(() => editor.inputValue(), { timeout: 10_000 }).toMatch(/^Second Try/);
    expect(calls).toBe(2);
  });

  it("取り込みの失敗は種類に応じた文言を表示し、メモを変更しない", async () => {
    const { extension, editor, screen } = await open();
    await editor.fill("残すメモ");
    await editor.press("Control+Enter");
    await expect.poll(() => stored(extension.worker)).toBe("残すメモ");
    await screen.locator("summary").click();
    const importButton = screen.getByRole("button", { name: "サンプルを取得して保存" });
    const cases: Array<[(route: import("playwright").Route) => Promise<void>, string]> = [
      [(route) => route.abort("internetdisconnected"), "通信できませんでした。"],
      [(route) => route.fulfill({ status: 503 }), "サービスが一時的に利用できません。"],
      [(route) => route.fulfill({ status: 200, contentType: "application/json", body: "{" }), "取得したデータを読み取れませんでした。"],
    ];
    for (const [answer, text] of cases) {
      await extension.context.unrouteAll();
      await extension.context.route("https://api.sampleapis.com/**", answer);
      await importButton.click();
      await screen.getByText(text).waitFor({ timeout: 15_000 });
      expect(await stored(extension.worker)).toBe("残すメモ");
    }
  });

  it("取り込みは worker が行い、画面を閉じても保存まで完了する", async () => {
    const { extension, screen } = await open();
    // The public API is replaced with a fixed response; the worker's own fetch is intercepted too.
    await extension.context.route("https://api.sampleapis.com/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({ json: { id: 1, title: "Fixed Coffee", description: "Hot.", ingredients: ["Coffee"], image: "https://example.test/x.jpg" } });
    });
    await screen.locator("summary").click();
    await screen.getByRole("button", { name: "サンプルを取得して保存" }).click();
    await screen.close();
    await expect.poll(() => stored(extension.worker), { timeout: 10_000 }).toMatch(/^Fixed Coffee/);
  });
});

// The shortcut reads the selection of the tab it was pressed on and shows a notice there. A real key
// press grants activeTab; the dispatched test event does not, so the extension copy gets host access.
describe("ショートカットとページ上の通知", () => {
  let extension: LoadedExtension | undefined;
  let copy: ReturnType<typeof withHostPermissions> | undefined;
  afterEach(async () => { await extension?.close(); copy?.dispose(); extension = undefined; copy = undefined; });

  it.each<Variant>(["popup", "sidepanel"])("%s: 選択した文章を追加してページに通知し、選択がなければ失敗を通知してそのタブにバッジを付ける", async (variant) => {
    const site = await serveSite({ "/a.html": '<!doctype html><title>記事</title><p id="text">ショートカットの文章</p>' });
    copy = withHostPermissions(variant, ["http://localhost/*"]);
    extension = await launchExtension({ variant, path: copy.path });
    const screen = await extension.open(screenPath(extension));
    const tab = await openTab(screen, site.url("/a.html"));
    const press = () => extension!.worker.evaluate(async (url) => {
      const [target] = await chrome.tabs.query({ url });
      (chrome.commands.onCommand as unknown as { dispatch(name: string, tab: unknown): void }).dispatch("append-selection", target);
    }, site.url("/a.html"));
    const toastHost = () => tab.evaluate(() => !!document.getElementById("chrome-ext-base-page-toast"));
    const badges = () => extension!.worker.evaluate(async (url) => {
      const [target] = await chrome.tabs.query({ url });
      return [await chrome.action.getBadgeText({ tabId: target!.id! }), await chrome.action.getBadgeText({})];
    }, site.url("/a.html"));

    await tab.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector("#text")!); getSelection()!.addRange(range); });
    await press();
    await expect.poll(() => stored(extension!.worker)).toBe("ショートカットの文章");
    await expect.poll(toastHost).toBe(true);
    expect(await badges()).toEqual(["", ""]);

    await tab.evaluate(() => getSelection()!.removeAllRanges());
    await tab.evaluate(() => document.getElementById("chrome-ext-base-page-toast")?.remove());
    await press();
    // The failure marks only that tab; the shared badge is left for other features.
    await expect.poll(badges).toEqual(["!", ""]);
    await expect.poll(toastHost).toBe(true);
    expect(await stored(extension.worker)).toBe("ショートカットの文章");
    await site.close();
  });

  // The notice after an append is a content script; its Undo button sends a message to the worker.
  it.each<Variant>(["popup", "sidepanel"])("%s: ページの通知の「元に戻す」で、worker が追加前のメモに戻す", async (variant) => {
    const site = await serveSite({ "/a.html": '<!doctype html><title>記事</title><p id="text">取り消す文章</p>' });
    copy = withHostPermissions(variant, ["http://localhost/*"]);
    extension = await launchExtension({ variant, path: copy.path });
    await extension.worker.evaluate(() => chrome.storage.local.set({ "quick-note": "元のメモ" }));
    const screen = await extension.open(screenPath(extension));
    const tab = await openTab(screen, site.url("/a.html"));
    await tab.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector("#text")!); getSelection()!.addRange(range); });
    await extension.worker.evaluate(async (url) => {
      const [target] = await chrome.tabs.query({ url });
      (chrome.commands.onCommand as unknown as { dispatch(name: string, tab: unknown): void }).dispatch("append-selection", target);
    }, site.url("/a.html"));
    await expect.poll(() => stored(extension!.worker)).toBe("元のメモ\n\n取り消す文章");
    await expect.poll(() => tab.evaluate(() => !!document.getElementById("chrome-ext-base-page-toast"))).toBe(true);

    // The notice sits in a closed shadow root, so the test reaches its button with the keyboard, as a user can.
    await tab.bringToFront();
    await tab.keyboard.press("Tab");
    await tab.keyboard.press("Enter");
    await expect.poll(() => stored(extension!.worker)).toBe("元のメモ");
    await site.close();
  });
});
