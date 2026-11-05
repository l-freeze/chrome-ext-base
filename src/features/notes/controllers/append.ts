import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { AppendNote, AppendNoteInput } from "../use-cases/append";

const input: Validator<AppendNoteInput> = {
  parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("text" in raw) ||
        typeof raw.text !== "string") {
      throw new ValidationError("Expected { text } as a string to append.");
    }
    return { text: raw.text };
  },
};

export function createAppendController(execute: AppendNote) {
  return validatedAction(input, execute);
}
