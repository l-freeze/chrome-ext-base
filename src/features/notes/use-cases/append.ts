import type { Note } from "../note";
import { appendText } from "../note";
import type { NoteRepository } from "../ports";

export type AppendNoteInput = { text: string };
export type AppendNoteOutput = Note;
export type AppendNote = (input: AppendNoteInput) => Promise<AppendNoteOutput>;

export function createAppendNote(repository: NoteRepository): AppendNote {
  return async (input) => repository.update((current) => appendText(current, input.text));
}
