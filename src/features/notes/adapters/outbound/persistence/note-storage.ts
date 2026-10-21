import type { NoteRepository } from "../../../application/ports/outbound/note-repository";
import type { KeyValueStorage } from "../../../../../infrastructure/storage/key-value-storage";
import { createTypedStorage } from "../../../../../infrastructure/storage/typed-storage";
import { noteStorageContract } from "./note-storage-contract";

export function createNoteStorage(driver: KeyValueStorage): NoteRepository {
  return createTypedStorage(driver, noteStorageContract);
}
