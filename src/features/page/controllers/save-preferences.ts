import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { SavePreferences, SavePreferencesInput } from "../use-cases/save-preferences";

const input: Validator<SavePreferencesInput> = {
  parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) ||
        !("includeSelection" in raw) || typeof raw.includeSelection !== "boolean") {
      throw new ValidationError("Expected { includeSelection: boolean }.");
    }
    return { includeSelection: raw.includeSelection };
  },
};

export function createSavePreferencesController(execute: SavePreferences) {
  return validatedAction(input, execute);
}
