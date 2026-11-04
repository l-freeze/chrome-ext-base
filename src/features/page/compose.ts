import type { CapturePreferencesRepository, PageActions, PageReader } from "./ports";
import { createCaptureController } from "./controllers/capture";
import { createLoadPreferencesController } from "./controllers/load-preferences";
import { createSavePreferencesController } from "./controllers/save-preferences";
import { createCapturePage } from "./use-cases/capture";
import { createLoadPreferences } from "./use-cases/load-preferences";
import { createSavePreferences } from "./use-cases/save-preferences";

export function createPageApplication(reader: PageReader, preferences: CapturePreferencesRepository): PageActions {
  return {
    capture: createCaptureController(createCapturePage(reader, preferences)),
    loadPreferences: createLoadPreferencesController(createLoadPreferences(preferences)),
    savePreferences: createSavePreferencesController(createSavePreferences(preferences)),
  };
}
