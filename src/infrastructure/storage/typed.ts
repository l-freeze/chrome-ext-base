import type { KeyValueStorage, StorageContract } from "./contracts";

export interface TypedStorage<SaveInput, LoadOutput> {
  // Replaces the stored value. Use it when the new value does not depend on the current one.
  save(input: SaveInput): Promise<void>;
  load(): Promise<LoadOutput>;
  // Reads, changes, and writes as one step. Use it whenever the new value is derived from the current one.
  update(change: (current: LoadOutput) => SaveInput): Promise<LoadOutput>;
}

// save and update both hold the key's lock, so they never interleave with each other.
export function createTypedStorage<SaveInput, LoadOutput>(
  driver: KeyValueStorage,
  contract: StorageContract<SaveInput, LoadOutput>,
): TypedStorage<SaveInput, LoadOutput> {
  if (typeof contract.input?.parse !== "function" || typeof contract.output?.parse !== "function") {
    throw new TypeError("Storage requires both input and output validators.");
  }
  async function write(input: SaveInput): Promise<LoadOutput> {
    const validated = contract.input.parse(input);
    const encoded = contract.encode(validated);
    const output = contract.output.parse(encoded);
    await driver.set(contract.key, encoded);
    return output;
  }
  async function load(): Promise<LoadOutput> {
    return contract.output.parse(await driver.get(contract.key));
  }
  return {
    async save(input) { await driver.lock(contract.key, () => write(input)); },
    load,
    update: (change) => driver.lock(contract.key, async () => write(change(await load()))),
  };
}
