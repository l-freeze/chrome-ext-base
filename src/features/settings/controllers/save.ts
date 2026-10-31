import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { SaveSettings, SaveSettingsInput } from "../use-cases/save";
import { settingsTheme } from "../settings";

const input: Validator<SaveSettingsInput> = {
  parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) ||
        !("theme" in raw) || !("includeSelection" in raw) || typeof raw.includeSelection !== "boolean") {
      throw new ValidationError("設定の形式が不正です。");
    }
    return { theme: settingsTheme(raw.theme), includeSelection: raw.includeSelection };
  },
};

export function createSaveController(execute: SaveSettings) {
  return validatedAction(input, execute);
}
