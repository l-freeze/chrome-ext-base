import { createChromeStorage } from "../infrastructure/storage/drivers/chrome";
import { createLocalStorage } from "../infrastructure/storage/drivers/web";
import { createNoteStorage } from "../features/notes/gateways/storage";
import { createSampleApisCoffeeClient } from "../integrations/sampleapis/coffee";
import { createSampleApisCoffeeSource } from "../features/notes/gateways/coffee";
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
