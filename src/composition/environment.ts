import type { KeyValueStorage, StorageChanges } from "../infrastructure/storage/contracts";
import { createChromeStorage, createChromeChanges } from "../infrastructure/storage/drivers/chrome";
import { createLocalStorage, createWebChanges } from "../infrastructure/storage/drivers/web";
import { createProcessLocks, createWebLocks } from "../infrastructure/storage/locks";

// Where this code runs and the storage every feature shares there. Each entry point (screen or
// worker) creates one environment and hands it to the feature compositions.
export interface Environment {
  // true inside the extension; false in the browser preview, which has no extension APIs.
  extension: boolean;
  driver: KeyValueStorage;
  // Change notifications for writes made by other screens or the worker.
  events: StorageChanges;
}

export function createEnvironment(): Environment {
  const extension = !!globalThis.chrome?.storage?.local;
  // Web Locks coordinate writes across the popup, side panel, options page, and worker.
  const locks = globalThis.navigator?.locks ? createWebLocks(navigator.locks) : createProcessLocks();
  const driver = extension ? createChromeStorage(chrome.storage.local, locks) : createLocalStorage(localStorage, locks);
  const events = extension ? createChromeChanges(chrome.storage.onChanged) : createWebChanges(window, localStorage);
  return { extension, driver, events };
}
