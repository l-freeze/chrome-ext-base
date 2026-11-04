/**
 * 開発者向けの参考例です。サンプルのメモ機能を、実際の拡張として Chromium に読み込んで確認します。
 * 独自機能の開発を始める際は、拡張の読み込み・worker の操作・画面の確認の書き方を参考にしたうえで、
 * このテストを削除してください。`pnpm run samples:remove` でもサンプルと一緒に削除されます。
 * 実行: pnpm run test:e2e
 */
import { afterEach, describe, expect, it } from "vitest";
import type { Worker } from "playwright";
import type { LoadedExtension, Variant } from "../support/extension";
import { launchExtension, screenPath } from "../support/extension";

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

  it("編集中の下書きは worker の追加で上書きしない", async () => {
    const { extension, editor } = await open();
    await editor.fill("下書き");
    await clickMenu(extension.worker, "追加");
    await expect.poll(() => stored(extension.worker)).toBe("追加");
    expect(await editor.inputValue()).toBe("下書き");
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
