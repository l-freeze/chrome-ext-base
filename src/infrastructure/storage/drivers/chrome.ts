import type { KeyValueStorage, StorageChanges } from "../contracts";
import type { KeyLocks } from "../locks";
import { createProcessLocks } from "../locks";

// Pass Web Locks (createWebLocks) so writes from pages and the worker do not interleave.
export function createChromeStorage(area: Pick<chrome.storage.StorageArea, "get" | "set">, locks: KeyLocks = createProcessLocks()): KeyValueStorage {
  return {
    async get(key) { const items = await area.get(key); return items[key]; },
    async set(key, value) { await area.set({ [key]: value }); },
    lock: (key, task) => locks.run(key, task),
  };
}

export function createChromeChanges(events: Pick<typeof chrome.storage.onChanged, "addListener" | "removeListener">): StorageChanges {
  return {
    subscribe(key, onValue) {
      const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
        if (area === "local" && Object.hasOwn(changes, key)) onValue(changes[key]?.newValue);
      };
      events.addListener(listener);
      return () => events.removeListener(listener);
    },
  };
}
