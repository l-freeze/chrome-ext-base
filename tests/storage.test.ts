import { describe, expect, expectTypeOf, it } from "vitest";
import type { StorageContract, StoragePort } from "../src/application/ports/storage";
import { createMemoryStorage } from "../src/adapters/outbound/storage/memory-storage";
import { createLocalStorage } from "../src/adapters/outbound/storage/local-storage";
import { noteStorageContract } from "../src/adapters/outbound/storage/note-storage-contract";
import { createTypedStorage } from "../src/adapters/outbound/storage/typed-storage";
import { ValidationError } from "../src/validation/note-validation";

describe("ストレージの Input / Output 契約", () => {
  it("保存 Input と読み出し Output に別々の型を設定できる", async () => {
    type Input = { value: number };
    type Output = { label: string };
    const contract: StorageContract<Input, Output> = {
      key: "sample",
      input: { parse(raw) {
        if (typeof raw !== "object" || raw === null || !("value" in raw) || typeof raw.value !== "number") {
          throw new TypeError("Expected { value: number }");
        }
        return { value: raw.value };
      } },
      output: { parse(raw) {
        if (typeof raw !== "number") throw new TypeError("Expected stored number");
        return { label: String(raw) };
      } },
      encode: (input) => input.value,
    };
    const storage = createTypedStorage(createMemoryStorage(), contract);
    expectTypeOf(storage).toEqualTypeOf<StoragePort<Input, Output>>();
    await storage.save({ value: 42 });
    expect(await storage.load()).toEqual({ label: "42" });
  });
  it("Input / Output の片方だけでは型チェックも実行時の初期化も拒否する", () => {
    const { output: _output, ...inputOnly } = noteStorageContract;
    const { input: _input, ...outputOnly } = noteStorageContract;
    // @ts-expect-error 読み出し Output の設定は必須。
    expect(() => createTypedStorage(createMemoryStorage(), inputOnly)).toThrow(TypeError);
    // @ts-expect-error 保存 Input の設定は必須。
    expect(() => createTypedStorage(createMemoryStorage(), outputOnly)).toThrow(TypeError);
  });
  it("保存値が Output の契約を満たさないなら既存データを維持する", async () => {
    const storage = createTypedStorage(createMemoryStorage({ "quick-note": "既存" }), {
      ...noteStorageContract, encode: () => 42,
    });
    await expect(storage.save({ text: "新規" })).rejects.toBeInstanceOf(ValidationError);
    expect(await storage.load()).toEqual({ text: "既存" });
  });
  it("破損した保存データを Output として返さない", async () => {
    const storage = createTypedStorage(createMemoryStorage({ "quick-note": 42 }), noteStorageContract);
    await expect(storage.load()).rejects.toBeInstanceOf(ValidationError);
  });
  it("ストレージの I/O エラーをそのまま返す", async () => {
    const storage = createTypedStorage({
      get: async () => { throw new Error("Read failed"); },
      set: async () => { throw new Error("Write failed"); },
    }, noteStorageContract);
    await expect(storage.load()).rejects.toThrow("Read failed");
    await expect(storage.save({ text: "memo" })).rejects.toThrow("Write failed");
  });
  it.each(["123", "null", '"quoted"', "日本語\nメモ"])(
    "旧プレビューの文字列を読み、新形式でも保存・再読み込みできる (%#)", async (text) => {
      const data = new Map([["quick-note", text]]);
      const webStorage = {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => { data.set(key, value); },
      };
      const storage = createTypedStorage(createLocalStorage(webStorage), noteStorageContract);
      expect(await storage.load()).toEqual({ text });
      await storage.save({ text: "更新" });
      const reopened = createTypedStorage(createLocalStorage(webStorage), noteStorageContract);
      expect(await reopened.load()).toEqual({ text: "更新" });
      await reopened.save({ text: "" });
      expect(await reopened.load()).toEqual({ text: "" });
    },
  );
});
