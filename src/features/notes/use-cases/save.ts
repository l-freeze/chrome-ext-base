import type { Note } from "../note";
import type { NoteRepository } from "../ports";

export type SaveNoteInput = Note;
export type SaveNoteOutput = Note;
export type SaveNote = (input: SaveNoteInput) => Promise<SaveNoteOutput>;

export function createSaveNote(repository: NoteRepository): SaveNote {
  return async (input) => {
    await repository.save(input);
    return repository.load();
  };
}
