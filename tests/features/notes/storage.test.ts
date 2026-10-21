import { describe, expect, it } from "vitest";
import { createNoteStorage } from "../../../src/features/notes/gateways/storage";
import { createMemoryStorage } from "../../../src/infrastructure/storage/drivers/memory";
import { createLocalStorage } from "../../../src/infrastructure/storage/drivers/web";
import { ValidationError } from "../../../src/lib/validation";

describe("メモ保存形式の互換性", () => {
  it("破損した保存データを Output として返さない", async () => {
    const storage = createNoteStorage(createMemoryStorage({ "quick-note": 42 }));
    await expect(storage.load()).rejects.toBeInstanceOf(ValidationError);
  });
  it.each(["123", "null", '"quoted"', "日本語\nメモ"])(
    "旧プレビューの文字列を読み、新形式でも保存・再読み込みできる (%#)", async (text) => {
      const data = new Map([["quick-note", text]]);
      const webStorage = {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => { data.set(key, value); },
      };
      const storage = createNoteStorage(createLocalStorage(webStorage));
      expect(await storage.load()).toEqual({ text });
      await storage.save({ text: "更新" });
      const reopened = createNoteStorage(createLocalStorage(webStorage));
      expect(await reopened.load()).toEqual({ text: "更新" });
      await reopened.save({ text: "" });
      expect(await reopened.load()).toEqual({ text: "" });
    },
  );
});
