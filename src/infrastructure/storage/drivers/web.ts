import type { KeyValueStorage, StorageChanges } from "../contracts";
import type { KeyLocks } from "../locks";
import { createProcessLocks } from "../locks";

const prefix = "chrome-ext-base:";

export function createLocalStorage(storage: Pick<Storage, "getItem" | "setItem">, locks: KeyLocks = createProcessLocks()): KeyValueStorage {
  return {
    lock: (key, task) => locks.run(key, task),
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

export function createWebChanges(events: Window, storage: Storage): StorageChanges {
  return {
    subscribe(key, onValue, onError) {
      const listener = (event: StorageEvent) => {
        if (event.storageArea !== storage || (event.key !== prefix + key && event.key !== null)) return;
        let value: unknown;
        try { value = event.newValue === null ? undefined : JSON.parse(event.newValue); }
        catch (error) { onError(error); return; }
        onValue(value);
      };
      events.addEventListener("storage", listener);
      return () => events.removeEventListener("storage", listener);
    },
  };
}
