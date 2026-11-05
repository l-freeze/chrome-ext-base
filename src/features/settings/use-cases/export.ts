import type { SettingsBackup } from "../settings";
import { toBackup } from "../settings";
import type { SettingsRepository } from "../ports";

export type ExportBackupInput = void;
export type ExportBackupOutput = SettingsBackup;
export type ExportBackup = (input: ExportBackupInput) => Promise<ExportBackupOutput>;

export function createExportBackup(repository: SettingsRepository): ExportBackup {
  return async (_input) => toBackup(await repository.load());
}
