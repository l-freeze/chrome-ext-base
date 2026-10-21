import type { NoteStorage } from "../ports/storage";

export function createLoadNote(storage: NoteStorage) {
  return async (_input: void) => storage.load();
}
