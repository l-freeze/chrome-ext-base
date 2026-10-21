// Mechanism only. Each boundary owns its validation rules.
export interface Validator<Output> {
  parse(input: unknown): Output;
}

export class ValidationError extends Error {
  override name = "ValidationError";
}

export function validatedAction<Input, Output>(
  validator: Validator<Input>,
  execute: (input: Input) => Promise<Output>,
): (raw: unknown) => Promise<Output> {
  return async (raw) => execute(validator.parse(raw));
}
