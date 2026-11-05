import type { SettingsActions, SettingsRepository } from "./ports";
import { createLoadSettings } from "./use-cases/load";
import { createSaveSettings } from "./use-cases/save";
import { createResetSettings } from "./use-cases/reset";
import { createExportBackup } from "./use-cases/export";
import { createImportBackup } from "./use-cases/import";
import { createLoadController } from "./controllers/load";
import { createSaveController } from "./controllers/save";
import { createResetController } from "./controllers/reset";
import { createExportController } from "./controllers/export";
import { createImportController } from "./controllers/import";

export function createSettingsApplication(repository: SettingsRepository): SettingsActions {
  return {
    load: createLoadController(createLoadSettings(repository)),
    save: createSaveController(createSaveSettings(repository)),
    reset: createResetController(createResetSettings(repository)),
    exportBackup: createExportController(createExportBackup(repository)),
    importBackup: createImportController(createImportBackup(repository)),
  };
}
