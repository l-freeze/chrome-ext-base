import type { NoteSource } from "../ports/outbound/note-source";
import type { ImportNoteInput } from "../contracts";
import type { NoteRepository } from "../ports/outbound/note-repository";

export function createImportNote(source: NoteSource, repository: NoteRepository) {
  return async (input: ImportNoteInput) => {
    const note = await source.fetchNote(input);
    await repository.save(note);
    return repository.load();
  };
}
