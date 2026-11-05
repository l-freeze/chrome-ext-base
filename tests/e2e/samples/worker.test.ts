/**
 * 開発者向けの参考例です。service worker のサンプル（アラームによる定期確認とバッジの件数、
 * メモの見直しリマインダー）を、実際の拡張として Chromium に読み込んで確認します。
 * 独自機能の開発を始める際は、イベントの発火・バッジやアラームの確認の書き方を参考にしたうえで、
 * このテストを削除してください。`pnpm run samples:remove` でもサンプルと一緒に削除されます。
 * 実行: pnpm run test:e2e
 */
import { afterEach, describe, expect, it } from "vitest";
import type { Worker } from "playwright";
import type { LoadedExtension, Variant } from "../support/extension";
import { launchExtension, screenPath } from "../support/extension";

// Waiting for real alarms would take minutes, so the tests fire the worker's alarm event directly.
const ring = (worker: Worker, name: string) => worker.evaluate((alarm) => {
  (chrome.alarms.onAlarm as unknown as { dispatch(alarm: unknown): void }).dispatch({ name: alarm, scheduledTime: Date.now(), persistAcrossSessions: false });
}, name);
const badge = (worker: Worker) => worker.evaluate(() => chrome.action.getBadgeText({}));
const coffees = (...ids: number[]) => ids.map((id) => ({ id, title: `Coffee ${id}`, description: "", ingredients: [], image: "" }));

describe.each<Variant>(["popup", "sidepanel"])("%s", (variant) => {
  let extension: LoadedExtension | undefined;
  afterEach(async () => { await extension?.close(); extension = undefined; });

  it("定期確認は初回に一覧を記録し、増えた件数をバッジに出し、画面で開くと既読にする", async () => {
    extension = await launchExtension({ variant });
    // The alarm is created by the install event, which may still be running when the worker appears.
    await expect.poll(() => extension!.worker.evaluate(async () => (await chrome.alarms.get("arrivals.check"))?.periodInMinutes)).toBe(30);
    const lists = [coffees(1, 2), coffees(1, 2, 3, 4), coffees(1, 2, 3, 4, 5)];
    await extension.context.route("https://api.sampleapis.com/coffee/hot", (route) => route.fulfill({ json: lists.shift() ?? [] }));

    await ring(extension.worker, "arrivals.check");
    const known = () => extension!.worker.evaluate(async () => ((await chrome.storage.local.get("coffee-arrivals"))["coffee-arrivals"] as { known?: number[] } | undefined)?.known);
    await expect.poll(known).toEqual([1, 2]);
    expect(await badge(extension.worker)).toBe("");
    await ring(extension.worker, "arrivals.check");
    await expect.poll(() => badge(extension!.worker)).toBe("2");

    const screen = await extension.open(screenPath(extension));
    const section = screen.locator("details", { hasText: "コーヒーの新着" });
    await expect.poll(() => section.locator("summary").textContent()).toContain("2 件");
    await section.locator("summary").click();
    await expect.poll(() => section.locator("li").allTextContents()).toEqual(["Coffee 3", "Coffee 4"]);
    await expect.poll(() => badge(extension!.worker)).toBe("");

    // "Check now" asks the worker (a message without input) and adds what it found to the list on screen.
    await section.getByRole("button", { name: "今すぐ確認" }).click();
    await expect.poll(() => section.locator("li").allTextContents()).toEqual(["Coffee 3", "Coffee 4", "Coffee 5"]);
    expect(await badge(extension.worker)).toBe("");
  });

  it("メモを保存すると見直しのアラームを予約し、鳴るとバッジで知らせ、画面を開くと消える", async () => {
    extension = await launchExtension({ variant });
    const screen = await extension.open(screenPath(extension));
    const editor = screen.locator("textarea");
    await expect.poll(() => editor.isEnabled()).toBe(true);
    await editor.fill("見直すメモ");
    await editor.press("Control+Enter");
    const scheduled = () => extension!.worker.evaluate(async () => (await chrome.alarms.get("notes.reminder"))?.scheduledTime ?? 0);
    await expect.poll(scheduled).toBeGreaterThan(Date.now() + 59 * 60_000);
    await screen.close();

    await ring(extension.worker, "notes.reminder");
    await expect.poll(() => badge(extension!.worker)).toBe("●");
    await extension.open(screenPath(extension));
    await expect.poll(() => badge(extension!.worker)).toBe("");
  });
});
