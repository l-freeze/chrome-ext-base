import { createChromeStorage } from "../infrastructure/storage/drivers/chrome-storage";
import { createLocalStorage } from "../infrastructure/storage/drivers/local-storage";
import { createNoteStorage } from "../features/notes/adapters/outbound/persistence/note-storage";
import { createSampleApisCoffeeClient } from "../integrations/sampleapis/coffee/client";
import { createSampleApisCoffeeSource } from "../features/notes/adapters/outbound/sources/sampleapis-coffee-source";
import { createNoteApplication } from "../features/notes/compose";

export function createPopupApplication() {
  const driver = globalThis.chrome?.storage?.local
    ? createChromeStorage(chrome.storage.local)
    : createLocalStorage(localStorage);
  const coffeeClient = createSampleApisCoffeeClient((url, init) => globalThis.fetch(url, init));
  return createNoteApplication({
    repository: createNoteStorage(driver),
    source: createSampleApisCoffeeSource(coffeeClient),
  });
}
