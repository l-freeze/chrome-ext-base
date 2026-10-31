import { describe, expect, it } from "vitest";
import { createSettingsApplication } from "../../../src/features/settings/compose";
import { createSettingsStorage } from "../../../src/features/settings/gateways/storage";
import { createMemoryStorage } from "../../../src/infrastructure/storage/drivers/memory";
import { createNoteStorage } from "../../../src/features/notes/gateways/storage";
import { ValidationError } from "../../../src/lib/validation";

function application(initial: Record<string, unknown> = {}) {
  const driver = createMemoryStorage(initial);
  return { driver, app: createSettingsApplication(createSettingsStorage(driver)) };
}

describe("設定の Input / Output", () => {
  it("未保存なら初期設定を返す", async () => {
    expect(await application().app.load(undefined)).toEqual({ theme: "system", includeSelection: true });
  });
  it.each(["system", "light", "dark"])("テーマ %s と選択テキスト設定を永続化する", async (theme) => {
    const { app, driver } = application();
    const output = { theme, includeSelection: false };
    expect(await app.save(output)).toEqual(output);
    const reopened = createSettingsApplication(createSettingsStorage(driver));
    expect(await reopened.load(undefined)).toEqual(output);
  });
  it.each([null, [], {}, { theme: "unknown", includeSelection: true }, { theme: "dark", includeSelection: "false" }])(
    "不正な保存入力では既存設定を維持する (%#)", async (input) => {
      const { app } = application();
      await app.save({ theme: "dark", includeSelection: false });
      await expect(app.save(input)).rejects.toBeInstanceOf(ValidationError);
      expect(await app.load(undefined)).toEqual({ theme: "dark", includeSelection: false });
    },
  );
  it.each([undefined, {}, { confirmed: false }, { confirmed: "true" }])("確認なしのリセットは拒否する (%#)", async (input) => {
    const { app } = application();
    await app.save({ theme: "dark", includeSelection: false });
    await expect(app.reset(input)).rejects.toBeInstanceOf(ValidationError);
    expect(await app.load(undefined)).toEqual({ theme: "dark", includeSelection: false });
  });
  it("確認済みリセットは初期設定を保存し、メモを保持する", async () => {
    const { app, driver } = application({ "quick-note": "大切なメモ" });
    await app.save({ theme: "dark", includeSelection: false });
    expect(await app.reset({ confirmed: true })).toEqual({ theme: "system", includeSelection: true });
    expect(await createSettingsStorage(driver).load()).toEqual({ theme: "system", includeSelection: true });
    expect(await createNoteStorage(driver).load()).toEqual({ text: "大切なメモ" });
  });
  it("不明な保存形式は拒否し、確認済みリセットで復旧できる", async () => {
    const { app } = application({ settings: { version: 99, theme: "dark", includeSelection: true } });
    await expect(app.load(undefined)).rejects.toBeInstanceOf(ValidationError);
    expect(await app.reset({ confirmed: true })).toEqual({ theme: "system", includeSelection: true });
  });
  it("引数なしの読み出しも検証する", async () => {
    await expect(application().app.load({})).rejects.toBeInstanceOf(ValidationError);
  });
  it("保存失敗を成功として返さず、以前の設定を維持する", async () => {
    const repository = createSettingsStorage({
      get: async () => ({ version: 1, theme: "dark", includeSelection: false }),
      set: async () => { throw new Error("Storage unavailable"); },
    });
    const app = createSettingsApplication(repository);
    await expect(app.save({ theme: "light", includeSelection: true })).rejects.toThrow("Storage unavailable");
    await expect(app.reset({ confirmed: true })).rejects.toThrow("Storage unavailable");
    expect(await app.load(undefined)).toEqual({ theme: "dark", includeSelection: false });
  });
});
