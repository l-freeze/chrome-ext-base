import type { Validator } from "../../lib/validation";

export interface KeyValueStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  // Runs a task while no other write to the same key runs. Drivers delegate to their KeyLocks.
  lock<T>(key: string, task: () => Promise<T>): Promise<T>;
}

export interface StorageContract<SaveInput, LoadOutput> {
  key: string;
  input: Validator<SaveInput>;
  output: Validator<LoadOutput>;
  encode(input: SaveInput): unknown;
}

export interface StorageChanges {
  subscribe(key: string, onValue: (value: unknown) => void, onError: (error: unknown) => void): () => void;
}
