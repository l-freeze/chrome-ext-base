import { describe, expect, expectTypeOf, it } from "vitest";
import type { StorageContract } from "../../src/infrastructure/storage/contracts";
import type { TypedStorage } from "../../src/infrastructure/storage/typed";
import { createMemoryStorage } from "../../src/infrastructure/storage/drivers/memory";
import { createTypedStorage } from "../../src/infrastructure/storage/typed";
import { createLocalStorage } from "../../src/infrastructure/storage/drivers/web";
import type { KeyLocks } from "../../src/infrastructure/storage/locks";
import { createProcessLocks, createWebLocks } from "../../src/infrastructure/storage/locks";

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
      lock: (_key, task) => task(),
    }, stringContract);
    await expect(storage.load()).rejects.toThrow("Read failed");
    await expect(storage.save("memo")).rejects.toThrow("Write failed");
  });
});

describe("現在の値からの更新と、同じキーへの書き込みの直列化", () => {
  const counter: StorageContract<number, number> = {
    key: "counter",
    input: { parse(raw) { if (typeof raw !== "number" || !Number.isInteger(raw)) throw new TypeError("Expected integer"); return raw; } },
    output: { parse(raw) { if (raw === undefined) return 0; if (typeof raw !== "number") throw new TypeError("Expected stored number"); return raw; } },
    encode: (input) => input,
  };

  it("update は現在の値から次の値を作って保存し、保存した値を返す", async () => {
    const storage = createTypedStorage(createMemoryStorage({ counter: 41 }), counter);
    expect(await storage.update((current) => current + 1)).toBe(42);
    expect(await storage.load()).toBe(42);
  });
  it("契約を満たさない次の値は保存せず、既存の値を維持する", async () => {
    const storage = createTypedStorage(createMemoryStorage({ counter: 1 }), counter);
    await expect(storage.update(() => 1.5)).rejects.toBeInstanceOf(TypeError);
    expect(await storage.load()).toBe(1);
  });
  it("同時に走る update と save が互いの書き込みを失わない", async () => {
    // A driver whose reads and writes take time, so unserialized updates would overlap and lose increments.
    const values = new Map<string, unknown>();
    const locks = createProcessLocks();
    const slow = {
      get: async (key: string) => { await new Promise((resolve) => setTimeout(resolve, 2)); return values.get(key); },
      set: async (key: string, value: unknown) => { await new Promise((resolve) => setTimeout(resolve, 2)); values.set(key, value); },
      lock: <T>(key: string, task: () => Promise<T>) => locks.run(key, task),
    };
    const storage = createTypedStorage(slow, counter);
    await Promise.all(Array.from({ length: 10 }, () => storage.update((current) => current + 1)));
    expect(await storage.load()).toBe(10);
    await Promise.all([storage.update((current) => current + 1), storage.save(100), storage.update((current) => current + 1)]);
    expect(await storage.load()).toBe(101);
  });
  it.each<[string, () => KeyLocks]>([
    ["同じ実行環境のロック", () => createProcessLocks()],
    ["Web Locks", () => createWebLocks(navigator.locks, `test-${Math.random()}:`)],
  ])("%s は同じキーを順に、別のキーは待たずに実行し、失敗した処理の後も続ける", async (_name, create) => {
    const locks = create();
    const order: string[] = [];
    const step = (label: string, ms: number) => async () => { order.push(`${label}:start`); await new Promise((r) => setTimeout(r, ms)); order.push(`${label}:end`); };
    await Promise.all([
      locks.run("a", step("a1", 20)),
      locks.run("a", step("a2", 1)),
      locks.run("b", step("b1", 1)),
      locks.run("a", async () => { order.push("a3:failed"); throw new Error("failed"); }).catch(() => {}),
      locks.run("a", step("a4", 1)),
    ]);
    expect(order.indexOf("a2:start")).toBeGreaterThan(order.indexOf("a1:end"));
    expect(order.indexOf("b1:end")).toBeLessThan(order.indexOf("a1:end"));
    expect(order.indexOf("a4:start")).toBeGreaterThan(order.indexOf("a3:failed"));
  });
  it("Web Storage の driver も同じロックで update を直列化する", async () => {
    const backing = new Map<string, string>();
    const storage = createTypedStorage(createLocalStorage({
      getItem: (key) => backing.get(key) ?? null,
      setItem: (key, value) => { backing.set(key, value); },
    }, createWebLocks(navigator.locks, `test-${Math.random()}:`)), counter);
    await Promise.all(Array.from({ length: 5 }, () => storage.update((current) => current + 1)));
    expect(await storage.load()).toBe(5);
  });
});
