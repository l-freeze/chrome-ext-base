import type { KeyValueStorage } from "../../../application/ports/storage";

export function createLocalStorage(storage: Pick<Storage, "getItem" | "setItem">): KeyValueStorage {
  const prefix = "chrome-ext-base:";
  return {
    async get(key) {
      const json = storage.getItem(prefix + key);
      return json === null ? storage.getItem(key) ?? undefined : JSON.parse(json);
    },
    async set(key, value) {
      const json = JSON.stringify(value);
      if (json === undefined) throw new TypeError("Storage value must be JSON serializable.");
      storage.setItem(prefix + key, json);
    },
  };
}
