import { expect, it } from "vitest";
import { validatedAction, ValidationError } from "../../src/lib/validation";

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

export function validationTypeContract() {
  // @ts-expect-error バリデーターを省略した action は作れない。
  validatedAction(async (input: unknown) => input);
}
