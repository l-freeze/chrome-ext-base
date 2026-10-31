import { afterEach, describe, expect, it, vi } from "vitest";
import { createPageApplication } from "../../../src/features/page/compose";
import { createChromePageReader } from "../../../src/features/page/gateways/chrome";
import type { PageBrowser } from "../../../src/features/page/gateways/chrome";
import { readPage } from "../../../src/content/page";
import { ValidationError } from "../../../src/lib/validation";

const info = { title: "サンプル記事", url: "https://example.test/article", selection: "選んだ文章", selectionTruncated: false };
function browser(body: unknown = info): PageBrowser {
  return { query: async () => [{ id: 7, url: info.url }], executeScript: async () => [{ frameId: 0, documentId: "sample", result: body }] };
}
function app(source = browser(), includeSelection = true) {
  return createPageApplication(createChromePageReader(source), { load: async () => ({ includeSelection }) });
}

afterEach(() => vi.unstubAllGlobals());
describe("現在のページの取得契約", () => {
  it("タイトル・URL・選択テキストを返す", async () => {
    expect(await app().capture(undefined)).toEqual(info);
  });
  it("選択テキスト OFF なら本文を返さない", async () => {
    expect(await app(browser(), false).capture(undefined)).toEqual({ ...info, selection: "", selectionTruncated: false });
  });
  it("引数ありの取得要求は拒否する", async () => {
    await expect(app().capture({ tabId: 123 })).rejects.toBeInstanceOf(ValidationError);
  });
  it.each([{ tabs: [] }, { tabs: [{ id: 1, url: "chrome://extensions" }] }, { tabs: [{ url: info.url }] }])("対象タブが不正なら取得できない (%#)", async ({ tabs }) => {
    await expect(app({ ...browser(), query: async () => tabs }).capture(undefined)).rejects.toThrow("通常の Web ページ");
  });
  it("保護ページやタブ消失による注入失敗を通知する", async () => {
    await expect(app({ ...browser(), executeScript: async () => { throw new Error("Cannot access page"); } }).capture(undefined)).rejects.toThrow("このページでは取得できません");
  });
  it.each([null, {}, { ...info, url: "javascript:alert(1)" }, { ...info, selection: 42 }, { ...info, selection: "a".repeat(2001) }])(
    "不正なページ応答は返さない (%#)", async (body) => {
      await expect(app(browser(body)).capture(undefined)).rejects.toBeInstanceOf(ValidationError);
    },
  );
  it("ページが移動して応答が消えた場合も失敗として返す", async () => {
    await expect(app({ ...browser(), executeScript: async () => [] }).capture(undefined)).rejects.toBeInstanceOf(ValidationError);
  });
  it("設定が読めなければページ取得を成功扱いしない", async () => {
    const application = createPageApplication(createChromePageReader(browser()), { load: async () => { throw new Error("Settings unavailable"); } });
    await expect(application.capture(undefined)).rejects.toThrow("Settings unavailable");
  });
  it("content script は長い選択を上限で切り、OFF では選択を読まない", () => {
    vi.stubGlobal("location", { href: info.url });
    vi.stubGlobal("document", { title: info.title, getSelection: () => ({ toString: () => "あ".repeat(2001) }) });
    expect(readPage(true)).toEqual({ ...info, selection: "あ".repeat(2000), selectionTruncated: true });
    vi.stubGlobal("document", { title: info.title, getSelection: () => { throw new Error("must not read selection"); } });
    expect(readPage(false)).toEqual({ ...info, selection: "", selectionTruncated: false });
    vi.stubGlobal("document", {
      title: info.title, activeElement: { closest: () => ({}) },
      getSelection: () => { throw new Error("must not read form selection"); },
    });
    expect(readPage(true)).toEqual({ ...info, selection: "", selectionTruncated: false });
  });
});
