import type { FetchNoteInput, NoteApi } from "../ports/note-api";
import type { NoteStorage } from "../ports/storage";

export function createImportNote(api: NoteApi, storage: NoteStorage) {
  return async (input: FetchNoteInput) => {
    const note = await api.fetchNote(input);
    await storage.save(note);
    return storage.load();
  };
}
