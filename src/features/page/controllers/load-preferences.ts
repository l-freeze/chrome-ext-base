import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { LoadPreferences, LoadPreferencesInput } from "../use-cases/load-preferences";

const input: Validator<LoadPreferencesInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("この操作に引数は不要です。");
  },
};

export function createLoadPreferencesController(execute: LoadPreferences) {
  return validatedAction(input, execute);
}
