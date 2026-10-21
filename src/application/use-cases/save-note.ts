import type { NoteStorage, SaveNoteInput } from "../ports/storage";

export function createSaveNote(storage: NoteStorage) {
  return async (input: SaveNoteInput) => {
    await storage.save(input);
    return storage.load();
  };
}
