import { createNoteChanges, createNoteStorage } from "../features/notes/gateways/storage";
import { delegateImportToWorker } from "../features/notes/gateways/worker";
import { createMessageClient } from "../infrastructure/messaging/client";
import { createChromeTransport } from "../infrastructure/messaging/drivers/chrome";
import { createSampleApisCoffeeClient } from "../integrations/sampleapis/coffee";
import { createSampleApisCoffeeSource } from "../features/notes/gateways/coffee";
import { createNoteApplication } from "../features/notes/compose";
import { createPageApplication } from "../features/page/compose";
import { createChromePageReader } from "../features/page/gateways/chrome";
import { createMockPageReader } from "../features/page/gateways/mock";
import { createSettingsContext } from "./settings";

export function createPopupApplication() {
  const settings = createSettingsContext();
  const coffeeClient = createSampleApisCoffeeClient((url, init) => globalThis.fetch(url, init));
  const reader = settings.extension ? createChromePageReader({
    query: (query) => chrome.tabs.query(query),
    executeScript: (injection) => chrome.scripting.executeScript(injection),
  }) : createMockPageReader();
  const notes = createNoteApplication({ repository: createNoteStorage(settings.driver), source: createSampleApisCoffeeSource(coffeeClient) });
  return {
    // In the extension the worker runs the import; the browser preview has no worker and runs it here.
    notes: settings.extension ? delegateImportToWorker(notes, createMessageClient(createChromeTransport(chrome.runtime))) : notes,
    noteChanges: createNoteChanges(settings.events),
    settings: settings.actions,
    settingsChanges: settings.changes,
    page: createPageApplication(reader, settings.repository),
    preview: !settings.extension,
  };
}
