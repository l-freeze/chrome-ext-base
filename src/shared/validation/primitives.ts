import type { Validator } from "./validator";

export class ValidationError extends Error {
  override name = "ValidationError";
}

export function object(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError("オブジェクトを指定してください。");
  }
  return input as Record<string, unknown>;
}

export function positiveId(input: unknown): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 1) {
    throw new ValidationError("ID は正の安全な整数で指定してください。");
  }
  return input;
}

export const noInput: Validator<void> = {
  parse(input) {
    if (input !== undefined) throw new ValidationError("この操作に引数は不要です。");
  },
};
