import { describe, expect, expectTypeOf, it } from "vitest";
import type { StorageContract } from "../../src/infrastructure/storage/storage-contract";
import type { TypedStorage } from "../../src/infrastructure/storage/typed-storage";
import { createMemoryStorage } from "../../src/infrastructure/storage/drivers/memory-storage";
import { createTypedStorage } from "../../src/infrastructure/storage/typed-storage";

const stringContract: StorageContract<string, string> = {
  key: "value",
  input: { parse(raw) {
    if (typeof raw !== "string") throw new TypeError("Expected string input");
    return raw;
  } },
  output: { parse(raw) {
    if (typeof raw !== "string") throw new TypeError("Expected stored string");
    return raw;
  } },
  encode: (input) => input,
};

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
    expectTypeOf(storage).toEqualTypeOf<TypedStorage<Input, Output>>();
    await storage.save({ value: 42 });
    expect(await storage.load()).toEqual({ label: "42" });
  });
  it("Input / Output の片方だけでは型チェックも実行時の初期化も拒否する", () => {
    const { output: _output, ...inputOnly } = stringContract;
    const { input: _input, ...outputOnly } = stringContract;
    // @ts-expect-error 読み出し Output の設定は必須。
    expect(() => createTypedStorage(createMemoryStorage(), inputOnly)).toThrow(TypeError);
    // @ts-expect-error 保存 Input の設定は必須。
    expect(() => createTypedStorage(createMemoryStorage(), outputOnly)).toThrow(TypeError);
  });
  it("保存値が Output の契約を満たさないなら既存データを維持する", async () => {
    const storage = createTypedStorage(createMemoryStorage({ "value": "既存" }), {
      ...stringContract, encode: () => 42,
    });
    await expect(storage.save("新規")).rejects.toBeInstanceOf(TypeError);
    expect(await storage.load()).toBe("既存");
  });
  it("ストレージの I/O エラーをそのまま返す", async () => {
    const storage = createTypedStorage({
      get: async () => { throw new Error("Read failed"); },
      set: async () => { throw new Error("Write failed"); },
    }, stringContract);
    await expect(storage.load()).rejects.toThrow("Read failed");
    await expect(storage.save("memo")).rejects.toThrow("Write failed");
  });
});
