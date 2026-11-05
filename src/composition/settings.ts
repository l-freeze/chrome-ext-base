import { createChromeStorage, createChromeChanges } from "../infrastructure/storage/drivers/chrome";
import { createLocalStorage, createWebChanges } from "../infrastructure/storage/drivers/web";
import { createProcessLocks, createWebLocks } from "../infrastructure/storage/locks";
import { createSettingsStorage, createSettingsChanges } from "../features/settings/gateways/storage";
import { createSettingsApplication } from "../features/settings/compose";

export function createSettingsContext() {
  const extension = !!globalThis.chrome?.storage?.local;
  // Web Locks coordinate writes across the popup, side panel, options page, and worker.
  const locks = globalThis.navigator?.locks ? createWebLocks(navigator.locks) : createProcessLocks();
  const driver = extension ? createChromeStorage(chrome.storage.local, locks) : createLocalStorage(localStorage, locks);
  const events = extension ? createChromeChanges(chrome.storage.onChanged) : createWebChanges(window, localStorage);
  const repository = createSettingsStorage(driver);
  return { driver, events, repository, actions: createSettingsApplication(repository), changes: createSettingsChanges(events), extension };
}
