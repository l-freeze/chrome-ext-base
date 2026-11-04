import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { ReadStatus, StatusInput } from "../use-cases/status";

const input: Validator<StatusInput> = { parse(raw) {
  if (raw !== undefined) throw new ValidationError("This operation takes no input.");
  return undefined;
} };
export const createStatusController = (execute: ReadStatus) => validatedAction(input, execute);
