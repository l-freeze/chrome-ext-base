import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import { SETTINGS_BACKUP_FORMAT, settingsTheme } from "../settings";
import type { ImportBackup, ImportBackupInput } from "../use-cases/import";

// The parsed content of a backup file the user chose: anything may be in it.
const input: Validator<ImportBackupInput> = {
  parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) ||
        !("format" in raw) || raw.format !== SETTINGS_BACKUP_FORMAT || !("version" in raw) || raw.version !== 1 ||
        !("settings" in raw) || typeof raw.settings !== "object" || raw.settings === null || !("theme" in raw.settings)) {
      throw new ValidationError(`Expected a ${SETTINGS_BACKUP_FORMAT} version 1 backup.`);
    }
    return { theme: settingsTheme(raw.settings.theme) };
  },
};

export function createImportController(execute: ImportBackup) {
  return validatedAction(input, execute);
}
