import { createChromeStorage } from "../adapters/outbound/storage/chrome-storage";
import { createLocalStorage } from "../adapters/outbound/storage/local-storage";
import { noteStorageContract } from "../adapters/outbound/storage/note-storage-contract";
import { createTypedStorage } from "../adapters/outbound/storage/typed-storage";
import { createSampleApisCoffeeApi } from "../adapters/outbound/http/sampleapis-coffee-api";
import { createCoffeeNoteApi } from "../adapters/outbound/http/coffee-note-api";
import { createApplication } from "./create-application";

export function createPopupApplication() {
  const driver = globalThis.chrome?.storage?.local
    ? createChromeStorage(chrome.storage.local)
    : createLocalStorage(localStorage);
  const coffeeApi = createSampleApisCoffeeApi((url, init) => globalThis.fetch(url, init));
  return createApplication({
    storage: createTypedStorage(driver, noteStorageContract),
    api: createCoffeeNoteApi(coffeeApi),
  });
}
