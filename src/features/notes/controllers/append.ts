import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import { noteText } from "../note";
import type { AppendNote, AppendNoteInput } from "../use-cases/append";

const input: Validator<AppendNoteInput> = {
  parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("text" in raw) ||
        typeof raw.text !== "string" || raw.text.trim() === "") {
      throw new ValidationError("Expected { text } with non-blank text to append.");
    }
    return { text: noteText(raw.text) };
  },
};

export function createAppendController(execute: AppendNote) {
  return validatedAction(input, execute);
}
