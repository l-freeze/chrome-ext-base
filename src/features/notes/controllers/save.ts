import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import { noteText } from "../note";
import type { SaveNote, SaveNoteInput } from "../use-cases/save";

const input: Validator<SaveNoteInput> = {
  parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("text" in raw)) {
      throw new ValidationError("Expected { text } for the note to save.");
    }
    return { text: noteText(raw.text) };
  },
};

export function createSaveController(execute: SaveNote) {
  return validatedAction(input, execute);
}
