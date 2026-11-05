import type { Settings } from "../settings";
import type { SettingsRepository } from "../ports";

export type ImportBackupInput = Settings;
export type ImportBackupOutput = Settings;
export type ImportBackup = (input: ImportBackupInput) => Promise<ImportBackupOutput>;

// The controller has already unpacked and validated the backup; importing replaces the current settings.
export function createImportBackup(repository: SettingsRepository): ImportBackup {
  return async (input) => {
    await repository.save(input);
    return repository.load();
  };
}
