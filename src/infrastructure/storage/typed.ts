import type { KeyValueStorage, StorageContract } from "./contracts";

export interface TypedStorage<SaveInput, LoadOutput> {
  save(input: SaveInput): Promise<void>;
  load(): Promise<LoadOutput>;
}

export function createTypedStorage<SaveInput, LoadOutput>(
  driver: KeyValueStorage,
  contract: StorageContract<SaveInput, LoadOutput>,
): TypedStorage<SaveInput, LoadOutput> {
  if (typeof contract.input?.parse !== "function" || typeof contract.output?.parse !== "function") {
    throw new TypeError("Storage requires both input and output validators.");
  }
  return {
    async save(input) {
      const validated = contract.input.parse(input);
      const encoded = contract.encode(validated);
      contract.output.parse(encoded);
      await driver.set(contract.key, encoded);
    },
    async load() {
      const stored = await driver.get(contract.key);
      return contract.output.parse(stored);
    },
  };
}
