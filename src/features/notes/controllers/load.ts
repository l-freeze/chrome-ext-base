import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { LoadNote, LoadNoteInput } from "../use-cases/load";

const input: Validator<LoadNoteInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("This operation takes no input.");
  },
};

export function createLoadController(execute: LoadNote) {
  return validatedAction(input, execute);
}
