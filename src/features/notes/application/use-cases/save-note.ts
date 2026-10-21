import type { NoteRepository } from "../ports/outbound/note-repository";
import type { SaveNoteInput } from "../contracts";

export function createSaveNote(repository: NoteRepository) {
  return async (input: SaveNoteInput) => {
    await repository.save(input);
    return repository.load();
  };
}
