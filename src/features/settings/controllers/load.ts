import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { LoadSettings, LoadSettingsInput } from "../use-cases/load";

const input: Validator<LoadSettingsInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("この操作に引数は不要です。");
  },
};

export function createLoadController(execute: LoadSettings) {
  return validatedAction(input, execute);
}
