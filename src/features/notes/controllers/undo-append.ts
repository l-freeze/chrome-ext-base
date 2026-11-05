import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { UndoAppend, UndoAppendInput } from "../use-cases/undo-append";

const input: Validator<UndoAppendInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("This operation takes no input.");
  },
};

export function createUndoAppendController(execute: UndoAppend) {
  return validatedAction(input, execute);
}
