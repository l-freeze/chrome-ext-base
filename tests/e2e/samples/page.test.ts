/**
 * 開発者向けの参考例です。サンプルのページ取得を、実際の拡張と localhost のページで確認します。
 * 独自機能の開発を始める際は、タブの操作・権限付きのコピー・ページ内の選択の書き方を参考にしたうえで、
 * このテストを削除してください。`pnpm run samples:remove` でもサンプルと一緒に削除されます。
 * 実行: pnpm run test:e2e
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Page } from "playwright";
import type { LoadedExtension } from "../support/extension";
import { launchExtension, openTab, screenPath, serveSite, withHostPermissions } from "../support/extension";

const article = (title: string) => `<!doctype html><title>${title}</title><p id="text">選択される本文</p><textarea id="field">入力欄</textarea>`;
let site: Awaited<ReturnType<typeof serveSite>>;
beforeAll(async () => { site = await serveSite({ "/a.html": article("記事A"), "/b.html": article("記事B") }); });
afterAll(async () => { await site.close(); });

const selectText = (page: Page) => page.evaluate(() => {
  const range = document.createRange();
  range.selectNodeContents(document.querySelector("#text")!);
  getSelection()!.removeAllRanges();
  getSelection()!.addRange(range);
});

let extension: LoadedExtension | undefined;
let copy: ReturnType<typeof withHostPermissions> | undefined;
afterEach(async () => { await extension?.close(); copy?.dispose(); extension = undefined; copy = undefined; });

describe("popup", () => {
  it("選択した文章を取得し、取得の設定は画面を開き直しても残る", async () => {
    copy = withHostPermissions("popup", ["http://localhost/*"]);
    extension = await launchExtension({ variant: "popup", path: copy.path });
    const popup = await extension.open(screenPath(extension));
    const tab = await openTab(popup, site.url("/a.html"));
    await selectText(tab);
    await popup.locator("#capture-page").click();
    await expect.poll(() => popup.locator(".page-result h3").textContent()).toBe("記事A");
    expect(await popup.locator(".page-result blockquote").textContent()).toBe("選択される本文");

    await popup.locator(".page-option input").uncheck();
    expect(await popup.locator(".page-result blockquote").textContent()).toBe("選択テキストの取得は OFF です。");
    // The toggle saves asynchronously; wait for the stored preference before reopening the popup.
    await expect.poll(() => extension!.worker.evaluate(async () => (await chrome.storage.local.get("page-capture"))["page-capture"]))
      .toMatchObject({ includeSelection: false });
    await popup.reload();
    await expect.poll(() => popup.locator(".page-option input").isEnabled()).toBe(true);
    expect(await popup.locator(".page-option input").isChecked()).toBe(false);
  });

  it("ポップアップ自身のタブは取得対象にしない", async () => {
    extension = await launchExtension({ variant: "popup" });
    const popup = await extension.open(screenPath(extension));
    await popup.locator("#capture-page").click();
    await popup.getByText("通常の Web ページを開いてから取得してください。").waitFor();
  });
});

describe("sidepanel", () => {
  it("アクティブなタブに追従し、許可の要求を Chrome まで届ける", async () => {
    extension = await launchExtension({ variant: "sidepanel" });
    const panel = await extension.open(screenPath(extension));
    await openTab(panel, site.url("/a.html"));
    await expect.poll(() => panel.locator(".panel-site span").last().textContent()).toMatch(/^http:\/\/localhost:\d+$/);
    const allow = panel.getByRole("button", { name: "このサイトを許可" });
    await allow.click();
    // The prompt stays open in headless mode; a lost user gesture would have failed immediately instead.
    await expect.poll(() => allow.getAttribute("aria-busy")).toBe("true");
  });

  it("許可済みのサイトから取得し、ページを移動すると古い結果を消す", async () => {
    copy = withHostPermissions("sidepanel", ["http://localhost/*"]);
    extension = await launchExtension({ variant: "sidepanel", path: copy.path });
    const panel = await extension.open(screenPath(extension));
    const tab = await openTab(panel, site.url("/a.html"));
    await selectText(tab);
    const capture = panel.getByRole("button", { name: "ページ情報を取得" });
    await expect.poll(() => capture.isEnabled()).toBe(true);
    await capture.click();
    await expect.poll(() => panel.locator(".panel-result blockquote").textContent()).toBe("選択される本文");
    await tab.goto(site.url("/b.html"));
    await expect.poll(() => panel.locator(".panel-result").count()).toBe(0);
    await expect.poll(() => capture.isEnabled()).toBe(true);
    await capture.click();
    await expect.poll(() => panel.locator(".panel-result h3").textContent()).toBe("記事B");
  });
});
