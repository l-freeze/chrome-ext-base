import type { KeyValueStorage } from "../contracts";

export function createMemoryStorage(initial: Record<string, unknown> = {}): KeyValueStorage {
  const values = new Map(Object.entries(structuredClone(initial)));
  return {
    async get(key) { return structuredClone(values.get(key)); },
    async set(key, value) { values.set(key, structuredClone(value)); },
  };
}
