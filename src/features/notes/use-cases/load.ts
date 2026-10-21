import type { Note } from "../note";
import type { NoteRepository } from "../ports";

export type LoadNoteInput = void;
export type LoadNoteOutput = Note;
export type LoadNote = (input: LoadNoteInput) => Promise<LoadNoteOutput>;

export function createLoadNote(repository: NoteRepository): LoadNote {
  return async (_input) => repository.load();
}
