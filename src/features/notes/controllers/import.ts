import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { ImportNote, ImportNoteInput } from "../use-cases/import";

const input: Validator<ImportNoteInput> = {
  parse(raw) {
    if (
      typeof raw !== "object" || raw === null || Array.isArray(raw) || !("id" in raw) ||
      typeof raw.id !== "number" || !Number.isSafeInteger(raw.id) || raw.id < 1
    ) {
      throw new ValidationError("Expected { id } as a positive safe integer.");
    }
    return { id: raw.id };
  },
};

export function createImportController(execute: ImportNote) {
  return validatedAction(input, execute);
}
