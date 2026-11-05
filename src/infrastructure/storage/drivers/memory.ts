import type { KeyValueStorage } from "../contracts";
import { createProcessLocks } from "../locks";

export function createMemoryStorage(initial: Record<string, unknown> = {}): KeyValueStorage {
  const values = new Map(Object.entries(structuredClone(initial)));
  const locks = createProcessLocks();
  return {
    lock: (key, task) => locks.run(key, task),
    async get(key) { return structuredClone(values.get(key)); },
    async set(key, value) { values.set(key, structuredClone(value)); },
  };
}
