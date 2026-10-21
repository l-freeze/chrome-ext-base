import type { KeyValueStorage } from "../contracts";

export function createChromeStorage(area: Pick<chrome.storage.StorageArea, "get" | "set">): KeyValueStorage {
  return {
    async get(key) { const items = await area.get(key); return items[key]; },
    async set(key, value) { await area.set({ [key]: value }); },
  };
}
