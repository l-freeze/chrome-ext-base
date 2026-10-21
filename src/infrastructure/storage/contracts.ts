import type { Validator } from "../../lib/validation";

export interface KeyValueStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export interface StorageContract<SaveInput, LoadOutput> {
  key: string;
  input: Validator<SaveInput>;
  output: Validator<LoadOutput>;
  encode(input: SaveInput): unknown;
}
