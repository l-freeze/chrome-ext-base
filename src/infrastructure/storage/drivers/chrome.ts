import type { KeyValueStorage, StorageChanges } from "../contracts";

export function createChromeStorage(area: Pick<chrome.storage.StorageArea, "get" | "set">): KeyValueStorage {
  return {
    async get(key) { const items = await area.get(key); return items[key]; },
    async set(key, value) { await area.set({ [key]: value }); },
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
