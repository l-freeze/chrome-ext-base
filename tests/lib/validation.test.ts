import { expect, it } from "vitest";
import { validatedAction } from "../../src/lib/validation";

it("空のバリデーションでもレイヤーを明示して入力を渡せる", async () => {
  const action = validatedAction({ parse: (input: unknown) => input }, async (input) => ({ received: input }));
  expect(await action({ example: true })).toEqual({ received: { example: true } });
});

export function validationTypeContract() {
  // @ts-expect-error バリデーターを省略した action は作れない。
  validatedAction(async (input: unknown) => input);
}
