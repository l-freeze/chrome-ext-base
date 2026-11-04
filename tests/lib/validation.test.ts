import { expect, expectTypeOf, it } from "vitest";
import type { StandardSchemaV1 } from "../../src/lib/validation";
import { fromStandardSchema, validatedAction, ValidationError } from "../../src/lib/validation";

it("空のバリデーションでもレイヤーを明示して入力を渡せる", async () => {
  const action = validatedAction({ parse: (input: unknown) => input }, async (input) => ({ received: input }));
  expect(await action({ example: true })).toEqual({ received: { example: true } });
});

it("検証・変換済みの入力から処理結果を返す", async () => {
  const action = validatedAction({ parse: (raw: unknown) => {
    if (typeof raw !== "string") throw new ValidationError("Expected string");
    return raw.trim();
  } }, async (value) => ({ value }));
  expect(await action("  example  ")).toEqual({ value: "example" });
});

it("入力拒否時は副作用を起こさず、検証エラーを返す", async () => {
  const saved: unknown[] = [];
  const error = new ValidationError("Invalid input");
  const action = validatedAction({ parse: () => { throw error; } }, async (input) => { saved.push(input); });
  await expect(action(null)).rejects.toBe(error);
  expect(saved).toEqual([]);
});

it("処理の失敗を成功として返さない", async () => {
  const error = new Error("Operation failed");
  const action = validatedAction({ parse: (raw: unknown) => raw }, async () => { throw error; });
  await expect(action("input")).rejects.toBe(error);
});

// A library-free Standard Schema, shaped like the ones Valibot, Zod, and ArkType provide.
function schema<Output>(validate: (value: unknown) => ReturnType<StandardSchemaV1<unknown, Output>["~standard"]["validate"]>): StandardSchemaV1<unknown, Output> {
  return { "~standard": { version: 1, vendor: "example", validate } };
}
const positive = schema<{ count: number }>((value) =>
  typeof value === "object" && value !== null && "count" in value && typeof value.count === "number" && value.count > 0
    ? { value: { count: value.count } }
    : { issues: [{ message: "Expected a positive count", path: [{ key: "count" }] }] });

it("Standard Schema のスキーマを Validator として使い、変換後の値を処理に渡す", async () => {
  const validator = fromStandardSchema(positive);
  expectTypeOf(validator.parse).returns.toEqualTypeOf<{ count: number }>();
  const action = validatedAction(validator, async (input) => input.count * 2);
  expect(await action({ count: 21, extra: true })).toBe(42);
});

it("Standard Schema の検証失敗は、問題の一覧付きの ValidationError として副作用なしに拒否する", async () => {
  const saved: unknown[] = [];
  const action = validatedAction(fromStandardSchema(positive), async (input) => { saved.push(input); });
  const error = await action({ count: -1 }).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ValidationError);
  expect(error).toMatchObject({ message: "count: Expected a positive count", issues: [{ message: "Expected a positive count", path: ["count"] }] });
  expect(saved).toEqual([]);
});

it("非同期のスキーマと、スキーマでない値は拒否する", () => {
  const asynchronous = schema<string>(async () => ({ value: "late" }));
  expect(() => fromStandardSchema(asynchronous).parse("input")).toThrow(TypeError);
  expect(() => fromStandardSchema({} as StandardSchemaV1)).toThrow(TypeError);
});

export function validationTypeContract() {
  // @ts-expect-error バリデーターを省略した action は作れない。
  validatedAction(async (input: unknown) => input);
}
