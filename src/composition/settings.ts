import { createChromeStorage, createChromeChanges } from "../infrastructure/storage/drivers/chrome";
import { createLocalStorage, createWebChanges } from "../infrastructure/storage/drivers/web";
import { createSettingsStorage, createSettingsChanges } from "../features/settings/gateways/storage";
import { createSettingsApplication } from "../features/settings/compose";

export function createSettingsContext() {
  const extension = !!globalThis.chrome?.storage?.local;
  const driver = extension ? createChromeStorage(chrome.storage.local) : createLocalStorage(localStorage);
  const events = extension ? createChromeChanges(chrome.storage.onChanged) : createWebChanges(window, localStorage);
  const repository = createSettingsStorage(driver);
  return { driver, repository, actions: createSettingsApplication(repository), changes: createSettingsChanges(events), extension };
}
