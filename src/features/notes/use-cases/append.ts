import type { Note } from "../note";
import { appendText } from "../note";
import type { NoteRepository } from "../ports";

export type AppendNoteInput = { text: string };
export type AppendNoteOutput = Note;
export type AppendNote = (input: AppendNoteInput) => Promise<AppendNoteOutput>;

// Sample limitation: this reads, changes, and writes back without locking, so two appends (or an append
// and a save) running at the same time can lose one of them. Queue writes per key if you copy this pattern.
export function createAppendNote(repository: NoteRepository): AppendNote {
  return async (input) => {
    const current = await repository.load();
    await repository.save(appendText(current, input.text));
    return repository.load();
  };
}
