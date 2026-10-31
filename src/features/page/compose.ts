import type { CapturePreferences, PageActions, PageReader } from "./ports";
import { createCaptureController } from "./controllers/capture";
import { createCapturePage } from "./use-cases/capture";

export function createPageApplication(reader: PageReader, preferences: CapturePreferences): PageActions {
  return { capture: createCaptureController(createCapturePage(reader, preferences)) };
}
