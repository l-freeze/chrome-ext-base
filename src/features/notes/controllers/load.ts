import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { LoadNote, LoadNoteInput } from "../use-cases/load";

const input: Validator<LoadNoteInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("この操作に引数は不要です。");
  },
};

export function createLoadController(execute: LoadNote) {
  return validatedAction(input, execute);
}
