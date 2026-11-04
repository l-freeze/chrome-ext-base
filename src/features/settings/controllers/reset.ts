import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { ResetSettings, ResetSettingsInput } from "../use-cases/reset";

const input: Validator<ResetSettingsInput> = {
  parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) ||
        !("confirmed" in raw) || raw.confirmed !== true) {
      throw new ValidationError("Reset requires { confirmed: true }.");
    }
    return { confirmed: true };
  },
};

export function createResetController(execute: ResetSettings) {
  return validatedAction(input, execute);
}
