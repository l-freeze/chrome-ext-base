/**
 * 開発者向けの参考例です。service worker のサンプル（メモの見直しリマインダー）を、
 * 実際の拡張として Chromium に読み込んで確認します。
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

describe.each<Variant>(["popup", "sidepanel"])("%s", (variant) => {
  let extension: LoadedExtension | undefined;
  afterEach(async () => { await extension?.close(); extension = undefined; });

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
