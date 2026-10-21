import type { Note } from "../note";
import type { FetchNoteInput, NoteRepository, NoteSource } from "../ports";

export type ImportNoteInput = FetchNoteInput;
export type ImportNoteOutput = Note;
export type ImportNote = (input: ImportNoteInput) => Promise<ImportNoteOutput>;

export function createImportNote(source: NoteSource, repository: NoteRepository): ImportNote {
  return async (input) => {
    const note = await source.fetchNote(input);
    await repository.save(note);
    return repository.load();
  };
}
