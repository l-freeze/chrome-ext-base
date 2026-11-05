import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { LoadedExtension, Variant } from "./support/extension";
import { launchExtension, screenPath } from "./support/extension";

// Base flow: a theme saved on the options page reaches the open screen without reloading it.
describe.each<Variant>(["popup", "sidepanel"])("%s", (variant) => {
  let extension: LoadedExtension | undefined;
  afterEach(async () => { await extension?.close(); });

  it("設定画面で保存したテーマが、開いている画面に再読み込みなしで反映される", async () => {
    extension = await launchExtension({ variant });
    const screen = await extension.open(screenPath(extension));
    const optionsPath = extension.manifest.options_ui?.page;
    expect(optionsPath).toBeTruthy();
    const options = await extension.open(optionsPath!);
    const theme = options.locator("#theme");
    await expect.poll(() => theme.isEnabled()).toBe(true);
    await theme.selectOption("dark");
    await options.locator("form button[type=submit]").click();
    await expect.poll(() => screen.evaluate(() => document.documentElement.dataset.theme)).toBe("notebook-dark");
    await options.reload();
    await expect.poll(() => options.locator("#theme").inputValue()).toBe("dark");
  });

  it("書き出した設定ファイルを読み込むと、開いている画面にも反映される", async () => {
    extension = await launchExtension({ variant });
    const screen = await extension.open(screenPath(extension));
    const options = await extension.open(extension.manifest.options_ui!.page);
    const theme = options.locator("#theme");
    await expect.poll(() => theme.isEnabled()).toBe(true);
    await theme.selectOption("light");
    await options.locator("form button[type=submit]").click();
    await expect.poll(() => screen.evaluate(() => document.documentElement.dataset.theme)).toBe("notebook");

    const [download] = await Promise.all([options.waitForEvent("download"), options.locator("#export-settings").click()]);
    const exported = JSON.parse(readFileSync((await download.path())!, "utf8")) as { settings: { theme: string } };
    expect(exported.settings.theme).toBe("light");

    const dark = { ...exported, settings: { ...exported.settings, theme: "dark" } };
    await options.locator("#import-settings").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(dark)) });
    await expect.poll(() => screen.evaluate(() => document.documentElement.dataset.theme)).toBe("notebook-dark");
    await expect.poll(() => theme.inputValue()).toBe("dark");

    await options.locator("#import-settings").setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from("{ not json") });
    await options.waitForTimeout(300);
    expect(await theme.inputValue()).toBe("dark");
  });
});
