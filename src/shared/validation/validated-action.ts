import type { Validator } from "./validator";

export function validatedAction<Input, Output>(
  validator: Validator<Input>,
  execute: (input: Input) => Promise<Output>,
): (raw: unknown) => Promise<Output> {
  return async (raw) => execute(validator.parse(raw));
}
