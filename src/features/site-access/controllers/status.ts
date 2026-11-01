import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { ReadStatus, StatusInput } from "../use-cases/status";

const input: Validator<StatusInput> = { parse(raw) {
  if (raw !== undefined) throw new ValidationError("サイト確認に引数は不要です。");
  return undefined;
} };
export const createStatusController = (execute: ReadStatus) => validatedAction(input, execute);
