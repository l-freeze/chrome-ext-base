import type { Note } from "../../domain/note";
import type { Validator } from "./validation";

export interface StoragePort<SaveInput, LoadOutput> {
  save(input: SaveInput): Promise<void>;
  load(): Promise<LoadOutput>;
}

export interface StorageContract<SaveInput, LoadOutput> {
  key: string;
  input: Validator<SaveInput>;
  output: Validator<LoadOutput>;
  encode(input: SaveInput): unknown;
}

export type SaveNoteInput = Note;
export type LoadNoteOutput = Note;
export type NoteStorage = StoragePort<SaveNoteInput, LoadNoteOutput>;

export interface KeyValueStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}
