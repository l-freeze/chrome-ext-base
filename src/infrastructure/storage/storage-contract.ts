import type { Validator } from "../../shared/validation/validator";

export interface StorageContract<SaveInput, LoadOutput> {
  key: string;
  input: Validator<SaveInput>;
  output: Validator<LoadOutput>;
  encode(input: SaveInput): unknown;
}
