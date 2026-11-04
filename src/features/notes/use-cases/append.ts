import type { Note } from "../note";
import { appendText } from "../note";
import type { NoteRepository } from "../ports";

export type AppendNoteInput = { text: string };
export type AppendNoteOutput = Note;
export type AppendNote = (input: AppendNoteInput) => Promise<AppendNoteOutput>;

export function createAppendNote(repository: NoteRepository): AppendNote {
  return async (input) => {
    const current = await repository.load();
    await repository.save(appendText(current, input.text));
    return repository.load();
  };
}
